/**
 * Spec: logicReview
 *
 * Logic Review checks structural and ownership invariants on a target object.
 * It does NOT check quality/completeness (that's qualityReview).
 *
 * Rules enforced per target type:
 *
 * TicketDraft:
 *   - BLOCK if ownerAgentId is not declared in the current RuntimePlan
 *   - BLOCK if derivedFromDecisionIds is empty
 *   - BLOCK if another TicketDraft in the session shares the same ownerAgentId
 *     for the same topic (owner uniqueness per topic)
 *   - BLOCK if acceptanceCriteria is empty
 *   - REVISE if requiredCapabilities lists an ID not declared on the owner agent
 *
 * Pipeline:
 *   - BLOCK if steps array is empty
 *   - BLOCK if a cycle exists in step.dependsOn graph
 *   - BLOCK if any step references an ownerAgentId not in the RuntimePlan
 *
 * StepResult:
 *   - REVISE if output.summary is undefined
 *   - REVISE if handoffFieldMissing scenario injected via testScenarios
 */

import { REVIEW_STATUS, REVIEWER_KIND, type ReviewIssue, type ReviewerKind } from '../domain/review';
import { REVIEW_TARGET_TYPE, type ReviewTargetType } from '../domain/review';
import type { TicketDraft } from '../domain/discussion';
import type { Pipeline, PipelineStep, StepResult } from '../domain/delivery';
import type { RuntimeSession } from '../domain/runtime';

type ReviewTarget = TicketDraft | Pipeline | StepResult;

// ---------------------------------------------------------------------------
// Cycle detection for Pipeline DAG
// ---------------------------------------------------------------------------

const hasCycle = (steps: readonly PipelineStep[]): boolean => {
	const inDegree = new Map<string, number>(steps.map((s) => [s.stepId, 0]));
	const adj = new Map<string, string[]>(steps.map((s) => [s.stepId, []]));

	for (const step of steps) {
		for (const dep of step.dependsOn) {
			const neighbors = adj.get(dep);
			if (neighbors !== undefined) neighbors.push(step.stepId);
			inDegree.set(step.stepId, (inDegree.get(step.stepId) ?? 0) + 1);
		}
	}

	const queue: string[] = [...inDegree.entries()].filter(([, v]) => v === 0).map(([k]) => k);
	let visited = 0;

	while (queue.length > 0) {
		const node = queue.shift()!;
		visited++;
		for (const neighbor of adj.get(node) ?? []) {
			const next = (inDegree.get(neighbor) ?? 1) - 1;
			inDegree.set(neighbor, next);
			if (next === 0) queue.push(neighbor);
		}
	}

	return visited < steps.length;
};

// ---------------------------------------------------------------------------
// Per-target checks
// ---------------------------------------------------------------------------

const checkTicketDraft = (session: RuntimeSession, ticket: TicketDraft): readonly ReviewIssue[] => {
	const issues: ReviewIssue[] = [];

	if (!session.runtimePlan.agentsById.has(ticket.ownerAgentId)) {
		issues.push({
			field: 'owner_agent_id',
			severity: REVIEW_STATUS.Block,
			message: 'Ticket draft owner agent is not declared in the current Team Schema.',
		});
	}

	if (ticket.derivedFromDecisionIds.length === 0) {
		issues.push({
			field: 'derived_from_decision_ids',
			severity: REVIEW_STATUS.Block,
			message: 'Ticket draft must derive from at least one discussion decision.',
		});
	}

	if (ticket.acceptanceCriteria.length === 0) {
		issues.push({
			field: 'acceptance_criteria',
			severity: REVIEW_STATUS.Block,
			message: 'Ticket draft requires at least one acceptance criterion.',
		});
	}

	// Owner uniqueness per topic: no two ticket drafts in the session should have
	// the same ownerAgentId for the same topicId.
	if (session.state.discussionResult !== undefined) {
		const sibling = session.state.discussionResult.ticketDrafts.find(
			(t) =>
				t.ticketDraftId !== ticket.ticketDraftId &&
				t.topicId === ticket.topicId &&
				t.ownerAgentId === ticket.ownerAgentId,
		);
		if (sibling !== undefined) {
			issues.push({
				field: 'owner_agent_id',
				severity: REVIEW_STATUS.Block,
				message: `Agent '${ticket.ownerAgentId}' already owns another ticket draft in topic '${ticket.topicId}'. Owners must be unique per topic.`,
				suggestedOwnerAgentId: session.runtimePlan.discussionPolicy.supervisorAgentId,
			});
		}
	}

	// Capability coverage: warn if requiredCapabilities are not on the owner agent
	if (ticket.requiredCapabilities.length > 0) {
		const ownerAgent = session.runtimePlan.agentsById.get(ticket.ownerAgentId);
		if (ownerAgent !== undefined) {
			const agentCapabilities = new Set([
				...ownerAgent.skillIds,
				...ownerAgent.mcpServerIds,
				...ownerAgent.toolIds,
			]);
			const missing = ticket.requiredCapabilities.filter((c) => !agentCapabilities.has(c));
			if (missing.length > 0) {
				issues.push({
					field: 'required_capabilities',
					severity: REVIEW_STATUS.Revise,
					message: `Owner agent '${ticket.ownerAgentId}' does not declare required capabilities: ${missing.join(', ')}.`,
					suggestedOwnerAgentId: ticket.ownerAgentId,
				});
			}
		}
	}

	return issues;
};

const checkPipeline = (session: RuntimeSession, pipeline: Pipeline): readonly ReviewIssue[] => {
	const issues: ReviewIssue[] = [];

	if (pipeline.steps.length === 0) {
		issues.push({ field: 'steps', severity: REVIEW_STATUS.Block, message: 'Pipeline must contain at least one step.' });
	}

	if (hasCycle(pipeline.steps)) {
		issues.push({ field: 'steps', severity: REVIEW_STATUS.Block, message: 'Pipeline step dependency graph contains a cycle.' });
	}

	for (const step of pipeline.steps) {
		if (!session.runtimePlan.agentsById.has(step.ownerAgentId)) {
			issues.push({
				field: `steps.${step.stepId}.owner_agent_id`,
				severity: REVIEW_STATUS.Block,
				message: `Step '${step.stepId}' owner agent '${step.ownerAgentId}' is not declared in the Team Schema.`,
			});
		}
	}

	return issues;
};

const checkStepResult = (session: RuntimeSession, stepResult: StepResult): readonly ReviewIssue[] => {
	const issues: ReviewIssue[] = [];

	if (stepResult.output.summary === undefined) {
		issues.push({
			field: 'output.summary',
			severity: REVIEW_STATUS.Revise,
			message: 'Step output must include a summary for downstream consumers.',
		});
	}

	// testScenarios injection kept for E2E backward compatibility
	if (session.state.context.testScenarios?.handoffFieldMissing === true) {
		issues.push({
			field: 'payload.missingRequiredField',
			severity: REVIEW_STATUS.Revise,
			message: 'Quality check failed: Upstream handoff is missing the required output fields.',
		});
	}

	return issues;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const logicReview = (
	session: RuntimeSession,
	targetType: ReviewTargetType,
	target: ReviewTarget,
): readonly ReviewIssue[] => {
	switch (targetType) {
		case REVIEW_TARGET_TYPE.Ticket:
			return checkTicketDraft(session, target as TicketDraft);
		case REVIEW_TARGET_TYPE.Pipeline:
			return checkPipeline(session, target as Pipeline);
		case REVIEW_TARGET_TYPE.StepOutput:
			return checkStepResult(session, target as StepResult);
		default:
			return [];
	}
};
