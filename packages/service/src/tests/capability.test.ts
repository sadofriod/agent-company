/**
 * Unit tests: Capability module
 * Covers resolveCapabilities, authorizeCapabilities, createCapabilityLoadPlan
 */
import { describe, expect, it } from 'vitest';

import { CAPABILITY_SCOPE, CAPABILITY_TYPE } from '../domain/capability';
import type { AgentDefinition, Department } from '../domain/organization';
import { resolveCapabilities } from '../capability/resolveCapabilities';
import { authorizeCapabilities } from '../capability/authorizeCapability';
import { createCapabilityLoadPlan } from '../capability/createCapabilityLoadPlan';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeAgent = (overrides: Partial<AgentDefinition> = {}): AgentDefinition => ({
	agentId: 'agent-001' as AgentDefinition['agentId'],
	departmentId: 'dept-001' as AgentDefinition['departmentId'],
	role: 'Software Engineer',
	model: 'gpt-4o',
	responsibilities: ['implement features', 'write tests'],
	inputContract: 'task description',
	outputContract: 'pull request',
	skillIds: ['skill-code-review', 'skill-testing'],
	mcpServerIds: ['mcp-github'],
	toolIds: ['tool-browser'],
	...overrides,
});

const makeDept = (overrides: Partial<Department> = {}): Department => ({
	departmentId: 'dept-001' as Department['departmentId'],
	name: 'Engineering',
	mission: 'Build reliable software',
	decisionScope: ['code review', 'testing', 'deployment'],
	agentIds: ['agent-001' as AgentDefinition['agentId']],
	handoffContracts: ['pull request', 'artifact'],
	...overrides,
});

// ---------------------------------------------------------------------------
// resolveCapabilities
// ---------------------------------------------------------------------------

describe('resolveCapabilities', () => {
	it('includes capabilities declared on the agent', () => {
		const candidates = resolveCapabilities({
			agent: makeAgent(),
			department: makeDept(),
			scope: CAPABILITY_SCOPE.PipelineStep,
			requestedCapabilityIds: ['skill-code-review'],
		});

		expect(candidates.get('skill-code-review')?.agentHas).toBe(true);
	});

	it('marks capabilities not on the agent as agentHas=false', () => {
		const candidates = resolveCapabilities({
			agent: makeAgent(),
			department: makeDept(),
			scope: CAPABILITY_SCOPE.PipelineStep,
			requestedCapabilityIds: ['tool-unknown'],
		});

		expect(candidates.get('tool-unknown')?.agentHas).toBe(false);
	});

	it('sets modeAllows=false for Tool in Discussion scope', () => {
		const candidates = resolveCapabilities({
			agent: makeAgent(),
			department: makeDept(),
			scope: CAPABILITY_SCOPE.Discussion,
			requestedCapabilityIds: ['tool-browser'],
		});

		expect(candidates.get('tool-browser')?.modeAllows).toBe(false);
	});

	it('sets modeAllows=true for Skill in Discussion scope', () => {
		const candidates = resolveCapabilities({
			agent: makeAgent(),
			department: makeDept(),
			scope: CAPABILITY_SCOPE.Discussion,
			requestedCapabilityIds: ['skill-code-review'],
		});

		expect(candidates.get('skill-code-review')?.modeAllows).toBe(true);
	});

	it('sets modeAllows=false for Tool in Review scope', () => {
		const candidates = resolveCapabilities({
			agent: makeAgent(),
			department: makeDept(),
			scope: CAPABILITY_SCOPE.Review,
			requestedCapabilityIds: ['tool-browser'],
		});

		expect(candidates.get('tool-browser')?.modeAllows).toBe(false);
	});

	it('sets modeAllows=true for all types in PipelineStep scope', () => {
		const candidates = resolveCapabilities({
			agent: makeAgent(),
			department: makeDept(),
			scope: CAPABILITY_SCOPE.PipelineStep,
			requestedCapabilityIds: ['skill-code-review', 'mcp-github', 'tool-browser'],
		});

		expect(candidates.get('skill-code-review')?.modeAllows).toBe(true);
		expect(candidates.get('mcp-github')?.modeAllows).toBe(true);
		expect(candidates.get('tool-browser')?.modeAllows).toBe(true);
	});

	it('sets deptAllows=true when capability token appears in decisionScope', () => {
		const candidates = resolveCapabilities({
			agent: makeAgent(),
			department: makeDept({ decisionScope: ['code review automation'] }),
			scope: CAPABILITY_SCOPE.PipelineStep,
			requestedCapabilityIds: ['skill-code-review'],
		});

		// 'code' and 'review' tokens appear in the scope text
		expect(candidates.get('skill-code-review')?.deptAllows).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// authorizeCapabilities
// ---------------------------------------------------------------------------

describe('authorizeCapabilities', () => {
	it('grants capability when all four sources allow it', () => {
		const candidates = resolveCapabilities({
			agent: makeAgent(),
			department: makeDept(),
			scope: CAPABILITY_SCOPE.PipelineStep,
			requestedCapabilityIds: ['skill-code-review'],
		});

		const result = authorizeCapabilities({
			agentId: 'agent-001' as AgentDefinition['agentId'],
			scope: CAPABILITY_SCOPE.PipelineStep,
			targetId: 'step-001',
			departmentHasDecisionScope: true,
			candidates,
		});

		expect(result.grants.some((g) => g.capabilityId === 'skill-code-review')).toBe(true);
		expect(result.deniedCapabilityIds).not.toContain('skill-code-review');
	});

	it('denies capability not declared on the agent', () => {
		const candidates = resolveCapabilities({
			agent: makeAgent({ toolIds: [] }),
			department: makeDept(),
			scope: CAPABILITY_SCOPE.PipelineStep,
			requestedCapabilityIds: ['tool-browser'],
		});

		const result = authorizeCapabilities({
			agentId: 'agent-001' as AgentDefinition['agentId'],
			scope: CAPABILITY_SCOPE.PipelineStep,
			targetId: 'step-001',
			departmentHasDecisionScope: true,
			candidates,
		});

		expect(result.deniedCapabilityIds.includes('tool-browser' as typeof result.deniedCapabilityIds[number])).toBe(true);
	});

	it('denies Tool capability in Discussion scope', () => {
		const candidates = resolveCapabilities({
			agent: makeAgent(),
			department: makeDept(),
			scope: CAPABILITY_SCOPE.Discussion,
			requestedCapabilityIds: ['tool-browser'],
		});

		const result = authorizeCapabilities({
			agentId: 'agent-001' as AgentDefinition['agentId'],
			scope: CAPABILITY_SCOPE.Discussion,
			targetId: 'discussion-001',
			departmentHasDecisionScope: false,
			candidates,
		});

		expect(result.deniedCapabilityIds.includes('tool-browser' as typeof result.deniedCapabilityIds[number])).toBe(true);
	});

	it('denies Tool capability in Review scope', () => {
		const candidates = resolveCapabilities({
			agent: makeAgent(),
			department: makeDept(),
			scope: CAPABILITY_SCOPE.Review,
			requestedCapabilityIds: ['tool-browser'],
		});

		const result = authorizeCapabilities({
			agentId: 'agent-001' as AgentDefinition['agentId'],
			scope: CAPABILITY_SCOPE.Review,
			targetId: 'review-001',
			departmentHasDecisionScope: false,
			candidates,
		});

		expect(result.deniedCapabilityIds.includes('tool-browser' as typeof result.deniedCapabilityIds[number])).toBe(true);
	});

	it('grants agent-declared pipeline capabilities even when department scope text does not match capability ids', () => {
		const candidates = resolveCapabilities({
			agent: makeAgent({
				skillIds: ['requirements_breakdown'],
				mcpServerIds: [],
				toolIds: ['ticket_router', 'memory_policy_check'],
			}),
			department: makeDept({
				decisionScope: ['requirements', 'topic', 'decision', 'ticket_draft', 'priority'],
			}),
			scope: CAPABILITY_SCOPE.PipelineStep,
			requestedCapabilityIds: ['requirements_breakdown', 'ticket_router', 'memory_policy_check'],
		});

		const result = authorizeCapabilities({
			agentId: 'agent-001' as AgentDefinition['agentId'],
			scope: CAPABILITY_SCOPE.PipelineStep,
			targetId: 'step-001',
			departmentHasDecisionScope: true,
			candidates,
		});

		expect(result.deniedCapabilityIds).toHaveLength(0);
		expect(result.grants.map((grant) => grant.capabilityId)).toEqual([
			'requirements_breakdown',
			'ticket_router',
			'memory_policy_check',
		]);
	});
});

// ---------------------------------------------------------------------------
// createCapabilityLoadPlan
// ---------------------------------------------------------------------------

describe('createCapabilityLoadPlan', () => {
	it('returns a CapabilityLoadPlan with grants and denials', () => {
		const plan = createCapabilityLoadPlan({
			agent: makeAgent(),
			department: makeDept(),
			scope: CAPABILITY_SCOPE.PipelineStep,
			targetId: 'step-001',
			requestedCapabilityIds: ['skill-code-review', 'tool-unknown'],
			agentId: 'agent-001' as AgentDefinition['agentId'],
		});

		// skill-code-review declared on agent and in step → granted
		expect(plan.grants.some((g) => g.capabilityId === 'skill-code-review')).toBe(true);
		// tool-unknown not on agent → denied
		expect(plan.deniedCapabilityIds.includes('tool-unknown' as typeof plan.deniedCapabilityIds[number])).toBe(true);
	});

	it('has correct scope on grants', () => {
		const plan = createCapabilityLoadPlan({
			agent: makeAgent(),
			department: makeDept(),
			scope: CAPABILITY_SCOPE.Discussion,
			targetId: 'disc-001',
			requestedCapabilityIds: ['skill-code-review'],
			agentId: 'agent-001' as AgentDefinition['agentId'],
		});

		expect(plan.scope).toBe(CAPABILITY_SCOPE.Discussion);
		for (const grant of plan.grants) {
			expect(grant.scope).toBe(CAPABILITY_SCOPE.Discussion);
		}
	});
});
