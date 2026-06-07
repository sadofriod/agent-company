import type { ValidationResult } from '../domain/base';
import { WORK_MODE, type RuntimeSession } from '../domain/runtime';

import { executeDiscussionStage } from './advanceRuntimeSession/discussion';
import { executePipelineStage } from './advanceRuntimeSession/pipeline';
import {
	SESSION_COMPLETE_MESSAGE,
	createNotRunningIssues,
	updateRuntimeSession,
} from './advanceRuntimeSession/shared';
import { routeWorkMode } from './routeWorkMode';

export const advanceRuntimeSession = (session: RuntimeSession): ValidationResult<RuntimeSession> => {
	if (session.status !== 'running') {
		return { ok: false, issues: createNotRunningIssues(session.status) };
	}

	const workModeDecision = routeWorkMode(session.state);
	let nextSession = updateRuntimeSession(
		session,
		{
			workModeDecision,
			context: {
				currentMode: workModeDecision.mode,
			},
		},
		{
			eventType: 'runtime.work_mode_routed',
			reason: workModeDecision.reason,
			metadata: {
				mode: workModeDecision.mode,
				requiredObjects: workModeDecision.requiredObjects,
			},
		},
	);

	if (
		nextSession.state.activePipeline === undefined &&
		nextSession.state.pendingTickets.length === 0 &&
		nextSession.state.discussionResult !== undefined &&
		nextSession.state.interruption === undefined &&
		nextSession.state.completedTickets.length > 0
	) {
		nextSession = updateRuntimeSession(nextSession, {
			nextAction: SESSION_COMPLETE_MESSAGE,
		});
		return { ok: true, value: nextSession };
	}

	return workModeDecision.mode === WORK_MODE.Discussion
		? executeDiscussionStage(nextSession)
		: executePipelineStage(nextSession);
};