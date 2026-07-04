/**
 * Spec: resolveCapabilities
 *
 * Collects capability candidates from four authorization sources:
 *   1. Agent-declared capabilities (skillIds / mcpServerIds / toolIds)
 *   2. Department decision scope (text-token match against capability ID)
 *   3. Current work-mode scope (Discussion/Review → Skill only; PipelineStep → all types)
 *   4. Step-level allowedCapabilities list
 *
 * Returns a ReadonlyMap of <capabilityId → CandidateVote> for every capability
 * that appears in at least one source.  `createCapabilityLoadPlan` calls this
 * function and takes the intersection.
 */

import {
	CAPABILITY_SCOPE,
	CAPABILITY_TYPE,
	type CapabilityScope,
	type CapabilityType,
} from '../domain/capability';
import type { AgentDefinition, Department } from '../domain/organization';

/** Per-capability vote from each of the four sources. */
export type CandidateVote = {
	readonly capabilityType: CapabilityType;
	/** Source-1: agent has declared this capability. */
	readonly agentHas: boolean;
	/** Source-2: department decision scope covers this capability. */
	readonly deptAllows: boolean;
	/** Source-3: current work-mode scope permits this capability type. */
	readonly modeAllows: boolean;
	/** Source-4: step (or caller) explicitly listed this capability. */
	readonly stepAllows: boolean;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const tokenize = (value: string): readonly string[] =>
	value
		.toLowerCase()
		.replace(/[_-]/g, ' ')
		.split(/[^a-z0-9\u4e00-\u9fa5]+/)
		.filter((t) => t.length > 1);

/** Returns true if any token from the capability ID appears in the dept scopes. */
const departmentAllowsCapability = (
	capabilityId: string,
	decisionScope: readonly string[],
): boolean => {
	const capTokens = new Set(tokenize(capabilityId));
	const scopeTokens = decisionScope.flatMap(tokenize);
	return scopeTokens.some((t) => capTokens.has(t));
};

/**
 * Returns true if the capability TYPE is permitted in the given scope.
 *
 * - Discussion: Skill + McpServer (readonly read/reasoning), no Tool execution
 * - PipelineStep: all types
 * - Review: Skill only (analysis)
 */
const modeAllowsCapabilityType = (
	capabilityType: CapabilityType,
	scope: CapabilityScope,
): boolean => {
	switch (scope) {
		case CAPABILITY_SCOPE.Discussion:
			return capabilityType === CAPABILITY_TYPE.Skill || capabilityType === CAPABILITY_TYPE.McpServer;
		case CAPABILITY_SCOPE.PipelineStep:
			return true;
		case CAPABILITY_SCOPE.Review:
			return capabilityType === CAPABILITY_TYPE.Skill;
	}
};

const toTypeMap = (agent: AgentDefinition): ReadonlyMap<string, CapabilityType> =>
	new Map<string, CapabilityType>([
		...agent.skillIds.map((id) => [id, CAPABILITY_TYPE.Skill] as const),
		...agent.mcpServerIds.map((id) => [id, CAPABILITY_TYPE.McpServer] as const),
		...agent.toolIds.map((id) => [id, CAPABILITY_TYPE.Tool] as const),
	]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type ResolveCandidatesInput = {
	readonly agent: AgentDefinition;
	readonly department: Department;
	readonly scope: CapabilityScope;
	/** Step.allowedCapabilities or an empty array for Discussion/Review scope. */
	readonly requestedCapabilityIds: readonly string[];
};

/**
 * Resolves all capability candidates and their four-source votes.
 * Only capabilities appearing in either the agent declaration OR the request are included.
 */
export const resolveCapabilities = (input: ResolveCandidatesInput): ReadonlyMap<string, CandidateVote> => {
	const agentTypeMap = toTypeMap(input.agent);

	// Union of agent-declared + step-requested IDs is the full candidate set.
	const allIds = new Set([...agentTypeMap.keys(), ...input.requestedCapabilityIds]);

	const result = new Map<string, CandidateVote>();

	for (const capabilityId of allIds) {
		const capabilityType = agentTypeMap.get(capabilityId) ?? CAPABILITY_TYPE.Tool;

		result.set(capabilityId, {
			capabilityType,
			agentHas: agentTypeMap.has(capabilityId),
			deptAllows: departmentAllowsCapability(capabilityId, input.department.decisionScope),
			modeAllows: modeAllowsCapabilityType(capabilityType, input.scope),
			stepAllows: input.requestedCapabilityIds.includes(capabilityId),
		});
	}

	return result;
};
