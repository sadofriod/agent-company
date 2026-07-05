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

export const advanceRuntimeSession = async (
	session: RuntimeSession,
	options: AdvanceRuntimeSessionOptions = {},
): Promise<ValidationResult<RuntimeSession>> => {
	if (session.status !== 'running') {
		return { ok: false, issues: createNotRunningIssues(session.status) };
	}

	const workModeDecision = routeWorkMode(session.state);
	const sessionWithMode = updateRuntimeSession(
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

	const isComplete =
		sessionWithMode.state.activePipeline === undefined &&
		sessionWithMode.state.pendingTickets.length === 0 &&
		sessionWithMode.state.discussionResult !== undefined &&
		sessionWithMode.state.interruption === undefined &&
		sessionWithMode.state.completedTickets.length > 0;

	if (isComplete) {
		const completedSession = updateRuntimeSession(
			sessionWithMode,
			{
				nextAction: SESSION_COMPLETE_MESSAGE,
			},
			{
				eventType: RUNTIME_EVENT_TYPE.RuntimeSessionCompleted,
				reason: SESSION_COMPLETE_MESSAGE,
			},
		);
		return { ok: true, value: completedSession };
	}

	return workModeDecision.mode === WORK_MODE.Discussion
		? await executeDiscussionStage(sessionWithMode)
		: await executePipelineStage(sessionWithMode, { stepRunner: options.stepRunner });
};