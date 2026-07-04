/**
 * Unit tests: Review Gate
 * Covers logicReview, qualityReview, and the full runReviewGate pipeline
 */
import { describe, expect, it } from 'vitest';

import { REVIEW_STATUS, REVIEW_TARGET_TYPE, REVIEWER_KIND } from '../domain/review';
import type { TicketDraft } from '../domain/discussion';
import type { Pipeline, PipelineStep } from '../domain/delivery';
import type { RuntimeSession } from '../domain/runtime';
import { logicReview } from '../review/logicReview';
import { qualityReview } from '../review/qualityReview';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeSession = (overrides: Partial<RuntimeSession['runtimePlan']> = {}): RuntimeSession => ({
	sessionId: 'session-001' as RuntimeSession['sessionId'],
	status: 'running',
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-01T00:00:00Z',
	runtimePlan: {
		team: {
			schemaVersion: '1.0',
			teamId: 'team-001' as any,
			departments: [],
			agents: [],
			discussionPolicy: {
				mode: 'sequential_handoff',
				maxRounds: 3,
				conflictResolution: 'supervisor_decision',
				requiredOutputs: [],
			},
		},
		departmentsById: new Map(),
		agentsById: new Map([
			['agent-001' as any, {
				agentId: 'agent-001' as any,
				departmentId: 'dept-001' as any,
				role: 'Backend Engineer',
				model: 'gpt-4o',
				responsibilities: [],
				inputContract: '',
				outputContract: '',
				skillIds: [],
				mcpServerIds: [],
				toolIds: [],
			}],
		]),
		discussionPolicy: {
			mode: 'sequential_handoff',
			maxRounds: 3,
			conflictResolution: 'supervisor_decision',
			requiredOutputs: [],
		},
		...overrides,
	},
	state: {
		context: {
			runtimeId: 'session-001' as any,
			traceId: 'trace-001',
			task: { title: 'Build API', goal: 'Create REST endpoints', constraints: [] },
			auditTrail: [],
			currentMode: 'discussion',
		},
		reviewResults: [],
		completedTickets: [],
		pendingTickets: [],
		completedStepResults: [],
		generatedHandoffs: [],
	},
} as unknown as RuntimeSession);

const makeTicketDraft = (overrides: Partial<TicketDraft> = {}): TicketDraft => ({
	ticketDraftId: 'draft-001' as any,
	topicId: 'topic-001' as any,
	ownerAgentId: 'agent-001' as any,
	title: 'Implement user authentication',
	goal: 'Create a secure login system',
	inputContract: 'requirements document',
	outputContract: 'working auth module',
	acceptanceCriteria: ['Users can log in', 'Passwords are hashed'],
	failurePolicy: 'return_to_discussion',
	derivedFromDecisionIds: ['decision-001' as any],
	requiredCapabilities: [],
	...overrides,
});

const makePipeline = (overrides: Partial<Pipeline> = {}): Pipeline => ({
	pipelineId: 'pipeline-001' as any,
	ticketId: 'ticket-001' as any,
	steps: [
		{
			stepId: 'step-001' as any,
			ticketId: 'ticket-001' as any,
			ownerAgentId: 'agent-001' as any,
			title: 'Step One',
			dependsOn: [],
			inputContract: 'task description',
			outputContract: 'pull request',
			allowedCapabilities: [],
			reviewRequired: false,
			failurePolicy: 'return_to_discussion',
		},
	],
	...overrides,
});

// ---------------------------------------------------------------------------
// logicReview - TicketDraft
// ---------------------------------------------------------------------------

describe('logicReview - TicketDraft', () => {
	it('returns no issues for a valid ticket draft', () => {
		const issues = logicReview(makeSession(), REVIEW_TARGET_TYPE.Ticket, makeTicketDraft());

		expect(issues).toHaveLength(0);
	});

	it('BLOCK when ownerAgentId is not in RuntimePlan', () => {
		const issues = logicReview(
			makeSession(),
			REVIEW_TARGET_TYPE.Ticket,
			makeTicketDraft({ ownerAgentId: 'agent-unknown' as any }),
		);

		expect(issues.some((i) => i.severity === REVIEW_STATUS.Block && i.field === 'owner_agent_id')).toBe(true);
	});

	it('BLOCK when derivedFromDecisionIds is empty', () => {
		const issues = logicReview(
			makeSession(),
			REVIEW_TARGET_TYPE.Ticket,
			makeTicketDraft({ derivedFromDecisionIds: [] }),
		);

		expect(issues.some((i) => i.severity === REVIEW_STATUS.Block && i.field === 'derived_from_decision_ids')).toBe(true);
	});

	it('BLOCK when acceptanceCriteria is empty', () => {
		const issues = logicReview(
			makeSession(),
			REVIEW_TARGET_TYPE.Ticket,
			makeTicketDraft({ acceptanceCriteria: [] }),
		);

		expect(issues.some((i) => i.severity === REVIEW_STATUS.Block && i.field === 'acceptance_criteria')).toBe(true);
	});

	it('BLOCK on owner uniqueness conflict within same topic', () => {
		const session = makeSession();
		const draft1 = makeTicketDraft({ ticketDraftId: 'draft-001' as any });
		const draft2 = makeTicketDraft({ ticketDraftId: 'draft-002' as any });
		// Inject discussionResult with sibling draft sharing same ownerAgentId
		(session as any).state.discussionResult = {
			ticketDrafts: [draft1, draft2],
			decisions: [],
			turns: [],
			conflicts: [],
			pendingItems: [],
		};

		const issues = logicReview(session, REVIEW_TARGET_TYPE.Ticket, draft2);

		expect(issues.some((i) => i.severity === REVIEW_STATUS.Block && i.field === 'owner_agent_id')).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// logicReview - Pipeline
// ---------------------------------------------------------------------------

describe('logicReview - Pipeline', () => {
	it('returns no issues for a valid pipeline', () => {
		const issues = logicReview(makeSession(), REVIEW_TARGET_TYPE.Pipeline, makePipeline());

		expect(issues).toHaveLength(0);
	});

	it('BLOCK when steps array is empty', () => {
		const issues = logicReview(
			makeSession(),
			REVIEW_TARGET_TYPE.Pipeline,
			makePipeline({ steps: [] }),
		);

		expect(issues.some((i) => i.severity === REVIEW_STATUS.Block && i.field === 'steps')).toBe(true);
	});

	it('BLOCK when pipeline has a cycle', () => {
		const cyclicPipeline = makePipeline({
			steps: [
				{ stepId: 'step-A' as any, ticketId: 'ticket-001' as any, ownerAgentId: 'agent-001' as any, title: 'A', dependsOn: ['step-B' as any], inputContract: '', outputContract: '', allowedCapabilities: [], reviewRequired: false, failurePolicy: '' },
				{ stepId: 'step-B' as any, ticketId: 'ticket-001' as any, ownerAgentId: 'agent-001' as any, title: 'B', dependsOn: ['step-A' as any], inputContract: '', outputContract: '', allowedCapabilities: [], reviewRequired: false, failurePolicy: '' },
			],
		});

		const issues = logicReview(makeSession(), REVIEW_TARGET_TYPE.Pipeline, cyclicPipeline);

		expect(issues.some((i) => i.severity === REVIEW_STATUS.Block && i.message.includes('cycle'))).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// qualityReview - TicketDraft
// ---------------------------------------------------------------------------

describe('qualityReview - TicketDraft', () => {
	it('returns no issues for a complete ticket draft', () => {
		const issues = qualityReview(makeSession(), REVIEW_TARGET_TYPE.Ticket, makeTicketDraft(), []);

		expect(issues).toHaveLength(0);
	});

	it('BLOCK when title is empty', () => {
		const issues = qualityReview(
			makeSession(),
			REVIEW_TARGET_TYPE.Ticket,
			makeTicketDraft({ title: '' }),
			[],
		);

		expect(issues.some((i) => i.severity === REVIEW_STATUS.Block)).toBe(true);
	});

	it('BLOCK when goal is empty', () => {
		const issues = qualityReview(
			makeSession(),
			REVIEW_TARGET_TYPE.Ticket,
			makeTicketDraft({ goal: '' }),
			[],
		);

		expect(issues.some((i) => i.severity === REVIEW_STATUS.Block)).toBe(true);
	});
});
