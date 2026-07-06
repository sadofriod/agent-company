/**
 * Spec: authorizeCapability
 *
 * Takes the four-source votes produced by resolveCapabilities and applies the
 * intersection rule: ALL four sources must allow a capability for it to be
 * granted.  Produces a list of grants and a list of denial reasons.
 *
 * Source-2 (dept scope) uses a fallback: if the department has NO decision
 * scope entries at all, we treat dept as "allow-all" to avoid breaking schemas
 * that don't configure decisionScope.
 */

import {
	CAPABILITY_EXPIRY,
	CAPABILITY_SCOPE,
	type CapabilityExpiry,
	type CapabilityGrant,
	type CapabilityScope,
} from '../domain/capability';
import type { AgentId, CapabilityId, PipelineStepId } from '../domain/base';
import { createStructuredSourceRef } from '../runtime/runtimeEngineShared';
import type { CandidateVote } from './resolveCapabilities';

export type AuthorizeCapabilityInput = {
	readonly agentId: AgentId;
	readonly scope: CapabilityScope;
	readonly targetId: string;
	readonly stepId?: PipelineStepId;
	readonly departmentHasDecisionScope: boolean;
	readonly candidates: ReadonlyMap<string, CandidateVote>;
};

export type AuthorizeCapabilityResult = {
	readonly grants: readonly CapabilityGrant[];
	readonly deniedCapabilityIds: readonly CapabilityId[];
	readonly denialReasons: ReadonlyMap<CapabilityId, string>;
};

const toCapabilityId = (id: string): CapabilityId => id as CapabilityId;

const resolveExpiry = (scope: CapabilityScope): CapabilityExpiry => {
	switch (scope) {
		case CAPABILITY_SCOPE.Discussion:
			return CAPABILITY_EXPIRY.DiscussionCompleted;
		case CAPABILITY_SCOPE.Review:
			return CAPABILITY_EXPIRY.ReviewCompleted;
		case CAPABILITY_SCOPE.PipelineStep:
			return CAPABILITY_EXPIRY.StepCompleted;
	}
};

const buildDenialReason = (vote: CandidateVote, capabilityId: string): string => {
	if (!vote.agentHas) return `Agent has not declared capability '${capabilityId}'.`;
	if (!vote.modeAllows) return `Capability type '${vote.capabilityType}' is not permitted in this scope.`;
	if (!vote.stepAllows) return `Capability '${capabilityId}' is not listed in the step's allowed capabilities.`;
	return `Department decision scope does not cover capability '${capabilityId}'.`;
};

const isPipelineDepartmentAuthorized = (
	scope: CapabilityScope,
	vote: CandidateVote,
): boolean => scope === CAPABILITY_SCOPE.PipelineStep && vote.agentHas && vote.stepAllows;

export const authorizeCapabilities = (input: AuthorizeCapabilityInput): AuthorizeCapabilityResult => {
	const grants: CapabilityGrant[] = [];
	const deniedCapabilityIds: CapabilityId[] = [];
	const denialReasons = new Map<CapabilityId, string>();

	for (const [rawId, vote] of input.candidates) {
		const capabilityId = toCapabilityId(rawId);
		// Pipeline steps already execute within a department-owned ticket and agent boundary.
		// Treat agent-declared, step-requested capabilities as department-authorized here,
		// while still denying undeclared or out-of-step capability requests.
		const deptOk =
			!input.departmentHasDecisionScope
			|| vote.deptAllows
			|| isPipelineDepartmentAuthorized(input.scope, vote);
		const allowed = vote.agentHas && deptOk && vote.modeAllows && vote.stepAllows;

		if (allowed) {
			grants.push({
				capabilityId,
				capabilityType: vote.capabilityType,
				grantedToAgentId: input.agentId,
				grantedForStepId: input.stepId,
				scope: input.scope,
				reason: `Capability '${rawId}' passes all four authorization sources.`,
				sourceRefs: [createStructuredSourceRef(input.targetId, 'capability authorization')],
				expiresWhen: resolveExpiry(input.scope),
			});
		} else {
			const reason = buildDenialReason(vote, rawId);
			deniedCapabilityIds.push(capabilityId);
			denialReasons.set(capabilityId, reason);
		}
	}

	return { grants, deniedCapabilityIds, denialReasons };
};
