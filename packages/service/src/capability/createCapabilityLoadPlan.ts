/**
 * Spec: createCapabilityLoadPlan
 *
 * Orchestrates resolveCapabilities → authorizeCapabilities → CapabilityLoadPlan.
 * This is the single entry point that pipeline, discussion, and review advance
 * functions should call instead of the inlined loadStepCapabilities.
 */

import type { CapabilityLoadPlan, CapabilityScope } from '../domain/capability';
import type { AgentId, PipelineStepId } from '../domain/base';
import type { AgentDefinition, Department } from '../domain/organization';
import { resolveCapabilities } from './resolveCapabilities';
import { authorizeCapabilities } from './authorizeCapability';

export type CreateCapabilityLoadPlanInput = {
	readonly agent: AgentDefinition;
	readonly department: Department;
	readonly scope: CapabilityScope;
	readonly targetId: string;
	/** Step's allowedCapabilities (empty [] for Discussion / Review scopes). */
	readonly requestedCapabilityIds: readonly string[];
	readonly stepId?: PipelineStepId;
	readonly agentId: AgentId;
};

export const createCapabilityLoadPlan = (input: CreateCapabilityLoadPlanInput): CapabilityLoadPlan => {
	const candidates = resolveCapabilities({
		agent: input.agent,
		department: input.department,
		scope: input.scope,
		requestedCapabilityIds: input.requestedCapabilityIds,
	});

	const { grants, deniedCapabilityIds } = authorizeCapabilities({
		agentId: input.agentId,
		scope: input.scope,
		targetId: input.targetId,
		stepId: input.stepId,
		departmentHasDecisionScope: input.department.decisionScope.length > 0,
		candidates,
	});

	return {
		scope: input.scope,
		targetId: input.targetId,
		grants,
		deniedCapabilityIds,
	};
};
