import type { ValidationResult } from '../domain/base';
import { WORK_MODE, type RuntimeSession } from '../domain/runtime';
import { RUNTIME_EVENT_TYPE } from '../domain/runtimeEvent';

import { executeDiscussionStage } from './advanceRuntimeSession/discussion';
import { executePipelineStage } from './advanceRuntimeSession/pipeline';
import {
	SESSION_COMPLETE_MESSAGE,
	createNotRunningIssues,
	updateRuntimeSession,
} from './advanceRuntimeSession/shared';
import type { AgentStepRunner } from './agentStepRunner';
import { routeWorkMode } from './routeWorkMode';

export type AdvanceRuntimeSessionOptions = {
	readonly stepRunner?: AgentStepRunner;
};

export const advanceRuntimeSession = (
	session: RuntimeSession,
	options: AdvanceRuntimeSessionOptions = {},
): ValidationResult<RuntimeSession> => {
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
			eventType: RUNTIME_EVENT_TYPE.RuntimeWorkModeRouted,
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
		nextSession = updateRuntimeSession(
			nextSession,
			{
				nextAction: SESSION_COMPLETE_MESSAGE,
			},
			{
				eventType: RUNTIME_EVENT_TYPE.RuntimeSessionCompleted,
				reason: SESSION_COMPLETE_MESSAGE,
			},
		);
		return { ok: true, value: nextSession };
	}

	return workModeDecision.mode === WORK_MODE.Discussion
		? executeDiscussionStage(nextSession)
		: executePipelineStage(nextSession, { stepRunner: options.stepRunner });
};