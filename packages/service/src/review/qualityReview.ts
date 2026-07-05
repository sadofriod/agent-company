/**
 * Spec: qualityReview
 *
 * Quality Review checks completeness, schema conformance, evidence coverage,
 * and Handoff consumability.  It runs after logicReview passes.
 *
 * Rules enforced per target type:
 *
 * TicketDraft:
 *   - BLOCK if title, goal, or failurePolicy is empty
 *   - REVISE if evidenceRequiredForOutputs includes 'ticket' and evidenceRefs
 *     is empty
 *
 * Pipeline / StepResult:
 *   - REVISE if evidenceRequiredForOutputs includes 'handoff' and evidenceRefs
 *     is empty
 *
 * Handoff (downstream contract validation):
 *   - REVISE if handoff.payload is missing a field required by
 *     downstreamStep.inputContract (simple keyword match for MVP)
 */

import { REVIEW_STATUS, type ReviewIssue } from '../domain/review';
import { REVIEW_TARGET_TYPE, type ReviewTargetType } from '../domain/review';
import { EvidenceRequiredOutputType } from '../domain/organization';
import type { TicketDraft } from '../domain/discussion';
import type { Handoff, Pipeline, PipelineStep, StepResult } from '../domain/delivery';
import type { EvidenceRef } from '../domain/base';
import type { RuntimeSession } from '../domain/runtime';

type ReviewTarget = TicketDraft | Pipeline | StepResult | Handoff;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const evidenceRequiredFor = (
	session: RuntimeSession,
	outputType: EvidenceRequiredOutputType,
): boolean =>
	session.runtimePlan.memoryPolicy?.evidenceRequiredForOutputs.includes(outputType) ?? false;

/**
 * Simple keyword-based Handoff contract validation.
 * The inputContract is a short description like "{ summary: string, items: array }".
 * We check that the payload object has keys matching the words in the contract.
 */
const validateHandoffContract = (handoff: Handoff, downstreamInputContract: string): readonly ReviewIssue[] => {
	if (!downstreamInputContract || Object.keys(handoff.payload).length === 0) return [];

	// Extract expected field names (lowercase words, length > 2) from the contract string
	const expectedFields = downstreamInputContract
		.toLowerCase()
		.replace(/[^a-z0-9_ ]/g, ' ')
		.split(/\s+/)
		.filter((token) => token.length > 2 && !/^(string|number|array|object|boolean|required|optional)$/.test(token));

	const payloadKeys = new Set(Object.keys(handoff.payload).map((k) => k.toLowerCase()));
	const missingFields = expectedFields.filter((f) => !payloadKeys.has(f));

	if (missingFields.length === 0) return [];

	return [
		{
			field: 'payload',
			severity: REVIEW_STATUS.Revise,
			message: `Handoff payload is missing fields implied by downstream input contract: ${missingFields.join(', ')}.`,
		},
	];
};

// ---------------------------------------------------------------------------
// Per-target checks
// ---------------------------------------------------------------------------

const checkTicketDraftQuality = (
	session: RuntimeSession,
	ticket: TicketDraft,
	evidenceRefs: readonly EvidenceRef[],
): readonly ReviewIssue[] => {
	const issues: ReviewIssue[] = [];

	if (ticket.title.length === 0 || ticket.goal.length === 0 || ticket.failurePolicy.length === 0) {
		issues.push({
			field: 'ticket_draft',
			severity: REVIEW_STATUS.Block,
			message: 'Ticket draft title, goal, and failure policy must all be non-empty.',
		});
	}

	if (evidenceRequiredFor(session, EvidenceRequiredOutputType.Ticket) && evidenceRefs.length === 0) {
		issues.push({
			field: 'evidence_refs',
			severity: REVIEW_STATUS.Revise,
			message: 'Ticket draft requires evidence references when evidenceRequiredForOutputs includes ticket.',
		});
	}

	return issues;
};

const checkStepResultQuality = (
	session: RuntimeSession,
	stepResult: StepResult,
	evidenceRefs: readonly EvidenceRef[],
): readonly ReviewIssue[] => {
	const issues: ReviewIssue[] = [];

	if (
		evidenceRequiredFor(session, EvidenceRequiredOutputType.Handoff) &&
		evidenceRefs.length === 0
	) {
		issues.push({
			field: 'evidence_refs',
			severity: REVIEW_STATUS.Revise,
			message: 'Step output should include evidence before handoff generation.',
		});
	}

	return issues;
};

const checkHandoffQuality = (
	session: RuntimeSession,
	handoff: Handoff,
): readonly ReviewIssue[] => {
	// Find the downstream step to validate contract against
	const downstreamStep = handoff.toStepId === undefined
		? undefined
		: session.state.activePipeline?.steps.find((s) => s.stepId === handoff.toStepId);

	if (downstreamStep === undefined) return [];

	return validateHandoffContract(handoff, downstreamStep.inputContract);
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const qualityReview = (
	session: RuntimeSession,
	targetType: ReviewTargetType,
	target: ReviewTarget,
	evidenceRefs: readonly EvidenceRef[],
): readonly ReviewIssue[] => {
	switch (targetType) {
		case REVIEW_TARGET_TYPE.Ticket:
			return checkTicketDraftQuality(session, target as TicketDraft, evidenceRefs);
		case REVIEW_TARGET_TYPE.StepOutput:
			return checkStepResultQuality(session, target as StepResult, evidenceRefs);
		case REVIEW_TARGET_TYPE.Handoff:
			return checkHandoffQuality(session, target as Handoff);
		default:
			return [];
	}
};
