import type { EvidenceRef } from '../../domain/base';
import type { TicketDraft } from '../../domain/discussion';
import { PipelineInterruptionKind } from '../../domain/delivery';
import type {
	Pipeline,
	PipelineInterruption,
	StepResult,
	Ticket,
} from '../../domain/delivery';
import { EvidenceRequiredOutputType } from '../../domain/organization';
import {
	REVIEW_STATUS,
	REVIEW_TARGET_TYPE,
	REVIEWER_KIND,
	type ReviewIssue,
	type ReviewResult,
	type ReviewStatus,
	type ReviewerKind,
} from '../../domain/review';
import type { RuntimeSession } from '../../domain/runtime';

import { createStructuredSourceRef, createRuntimeScopedId, toReviewId, toTicketId } from '../runtimeEngineShared';
import { createEvidenceRef } from './shared';

type ReviewTarget = TicketDraft | Pipeline | StepResult;
type ReviewTargetType = typeof REVIEW_TARGET_TYPE[keyof typeof REVIEW_TARGET_TYPE];

const createReviewIssues = (
	session: RuntimeSession,
	reviewer: ReviewerKind,
	targetType: ReviewTargetType,
	target: ReviewTarget,
	evidenceRefs: readonly EvidenceRef[],
): readonly ReviewIssue[] => {
	if (targetType === REVIEW_TARGET_TYPE.Ticket) {
		const ticketDraft = target as TicketDraft;
		const issues: ReviewIssue[] = [];

		if (!session.runtimePlan.agentsById.has(ticketDraft.ownerAgentId)) {
			issues.push({
				field: 'owner_agent_id',
				severity: REVIEW_STATUS.Block,
				message: 'Ticket draft owner agent is not declared in the current Team Schema.',
			});
		}

		if (ticketDraft.derivedFromDecisionIds.length === 0) {
			issues.push({
				field: 'derived_from_decision_ids',
				severity: REVIEW_STATUS.Block,
				message: 'Ticket draft must derive from at least one discussion decision.',
			});
		}

		if (reviewer === REVIEWER_KIND.LogicReview && ticketDraft.acceptanceCriteria.length === 0) {
			issues.push({
				field: 'acceptance_criteria',
				severity: REVIEW_STATUS.Revise,
				message: 'Ticket draft requires at least one acceptance criterion.',
			});
		}

		if (
			reviewer === REVIEWER_KIND.QualityReview &&
			(ticketDraft.title.length === 0 || ticketDraft.goal.length === 0 || ticketDraft.failurePolicy.length === 0)
		) {
			issues.push({
				field: 'ticket_draft',
				severity: REVIEW_STATUS.Block,
				message: 'Ticket draft title, goal, and failure policy must all be non-empty.',
			});
		}

		return issues;
	}

	if (targetType === REVIEW_TARGET_TYPE.StepOutput) {
		const stepResult = target as StepResult;
		const issues: ReviewIssue[] = [];

		if (reviewer === REVIEWER_KIND.LogicReview && stepResult.output.summary === undefined) {
			issues.push({
				field: 'output.summary',
				severity: REVIEW_STATUS.Revise,
				message: 'Step output must include a summary for downstream consumers.',
			});
		}

		if (
			reviewer === REVIEWER_KIND.QualityReview &&
			evidenceRefs.length === 0 &&
			session.runtimePlan.memoryPolicy?.evidenceRequiredForOutputs.includes(EvidenceRequiredOutputType.Handoff)
		) {
			issues.push({
				field: 'evidence_refs',
				severity: REVIEW_STATUS.Revise,
				message: 'Step output should include evidence before handoff generation.',
			});
		}

		return issues;
	}

	if (targetType === REVIEW_TARGET_TYPE.Pipeline) {
		const pipeline = target as Pipeline;

		if (pipeline.steps.length === 0) {
			return [
				{
					field: 'steps',
					severity: REVIEW_STATUS.Block,
					message: 'Pipeline must contain at least one step.',
				},
			];
		}
	}

	return [];
};

const deriveReviewStatus = (issues: readonly ReviewIssue[]): ReviewStatus => {
	if (issues.some((issue) => issue.severity === REVIEW_STATUS.Block)) {
		return REVIEW_STATUS.Block;
	}

	if (issues.some((issue) => issue.severity === REVIEW_STATUS.Revise)) {
		return REVIEW_STATUS.Revise;
	}

	return REVIEW_STATUS.Pass;
};

export const runReviewGate = (
	session: RuntimeSession,
	options: {
		readonly reviewers: readonly ReviewerKind[];
		readonly targetType: ReviewTargetType;
		readonly targetId: string;
		readonly target: ReviewTarget;
		readonly evidenceRefs: readonly EvidenceRef[];
	},
): readonly ReviewResult[] =>
	options.reviewers.map((reviewer) => {
		const issues = createReviewIssues(
			session,
			reviewer,
			options.targetType,
			options.target,
			options.evidenceRefs,
		);
		const status = deriveReviewStatus(issues);

		return {
			reviewId: toReviewId(createRuntimeScopedId('review')),
			status: [REVIEW_STATUS.Pass, REVIEW_STATUS.Revise, REVIEW_STATUS.Block].includes(status)
				? status
				: REVIEW_STATUS.Block,
			reviewer,
			issues,
			evidenceRefs: options.evidenceRefs.map((entry) => entry.source),
			targetId: options.targetId,
			targetType: options.targetType,
		};
	});

export const admitTicketDraft = (
	session: RuntimeSession,
	ticketDraft: TicketDraft,
): {
	readonly ticket?: Ticket;
	readonly reviewResults: readonly ReviewResult[];
	readonly interruption?: PipelineInterruption;
} => {
	const evidenceRefs = [
		createEvidenceRef(createStructuredSourceRef(ticketDraft.ticketDraftId, 'ticket draft'), ticketDraft.goal),
		createEvidenceRef(createStructuredSourceRef(ticketDraft.topicId, 'discussion topic'), session.state.context.task.goal),
	];
	const reviewResults = runReviewGate(session, {
		reviewers: [REVIEWER_KIND.LogicReview, REVIEWER_KIND.QualityReview],
		targetType: REVIEW_TARGET_TYPE.Ticket,
		targetId: ticketDraft.ticketDraftId,
		target: ticketDraft,
		evidenceRefs,
	});
	const statuses = reviewResults.map((result) => result.status);

	if (statuses.includes(REVIEW_STATUS.Block)) {
		return {
			reviewResults,
			interruption: {
				kind: PipelineInterruptionKind.TicketAdmissionFailed,
				message: 'Ticket admission review blocked the draft.',
				suggestedAction: 'return_to_discussion',
			},
		};
	}

	if (statuses.includes(REVIEW_STATUS.Revise)) {
		return {
			reviewResults,
			interruption: {
				kind: PipelineInterruptionKind.TicketAdmissionFailed,
				message: 'Ticket admission review requires draft revision.',
				suggestedAction: 'revise_upstream',
			},
		};
	}

	return {
		reviewResults,
		ticket: {
			ticketId: toTicketId(createRuntimeScopedId('ticket')),
			ownerAgentId: ticketDraft.ownerAgentId,
			title: ticketDraft.title,
			goal: ticketDraft.goal,
			inputContract: ticketDraft.inputContract,
			outputContract: ticketDraft.outputContract,
			acceptanceCriteria: ticketDraft.acceptanceCriteria,
			failurePolicy: ticketDraft.failurePolicy,
			derivedFromDecisionIds: ticketDraft.derivedFromDecisionIds,
		},
	};
};