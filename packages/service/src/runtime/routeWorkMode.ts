import { WORK_MODE, type RuntimeState, type WorkModeDecision } from '../domain/runtime';

export const routeWorkMode = (state: RuntimeState): WorkModeDecision => {
	if (
		state.discussionResult === undefined ||
		state.interruption?.kind === 'return_to_discussion' ||
		state.interruption?.kind === 'ticket_admission_failed'
	) {
		return {
			mode: WORK_MODE.Discussion,
			reason: 'Discussion artifacts are missing or execution requested a return to discussion.',
			requiredObjects: ['topic', 'decision', 'ticket_draft'],
		};
	}

	if (
		state.activePipeline !== undefined ||
		state.activeTicket !== undefined ||
		state.pendingTickets.length > 0 ||
		state.interruption?.kind === 'revise_upstream' ||
		state.interruption?.kind === 'reload_capability'
	) {
		return {
			mode: WORK_MODE.Pipeline,
			reason: 'Admitted tickets exist and runtime can continue pipeline execution.',
			requiredObjects: ['ticket', 'pipeline'],
		};
	}

	if (
		state.discussionResult.pendingItems.length > 0 ||
		state.discussionResult.conflicts.length > 0 ||
		state.discussionResult.maxRoundsReached
	) {
		return {
			mode: WORK_MODE.Discussion,
			reason: 'Discussion still has unresolved conflicts, pending items, or exhausted rounds.',
			requiredObjects: ['topic', 'decision', 'ticket_draft'],
		};
	}

	return {
		mode: WORK_MODE.Pipeline,
		reason: 'Discussion artifacts are ready for pipeline execution.',
		requiredObjects: ['ticket', 'pipeline'],
	};
};