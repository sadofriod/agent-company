import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { formatApiErrorMessage } from '../api/shared';
import {
  useAdvanceRuntimeSessionMutation,
  useLazyGetRuntimeSessionQuery,
  usePauseRuntimeSessionMutation,
  useResumeRuntimeSessionMutation,
  useStartRuntimeSessionMutation,
  useTerminateRuntimeSessionMutation,
} from '../api/runtimeSessionApi';
import type { RuntimeSessionSnapshot, RuntimeTaskDraft, TeamSchemaDocument } from '../model/types';
import { RuntimeSessionOperationStatus, type RuntimeSessionModel } from './helper/runtimeSession.types';

export type { RuntimeSessionModel } from './helper/runtimeSession.types';

const formatError = (error: unknown): string => formatApiErrorMessage(error, 'Runtime session request failed.');

const useTaskDraftEditors = (
  setTaskDraft: Dispatch<SetStateAction<RuntimeTaskDraft>>,
): Pick<RuntimeSessionModel, 'setTaskTitle' | 'setTaskGoal' | 'setTaskConstraints'> => {
  const setTaskTitle = (value: string): void => setTaskDraft((current) => ({ ...current, title: value }));
  const setTaskGoal = (value: string): void => setTaskDraft((current) => ({ ...current, goal: value }));
  const setTaskConstraints = (value: string): void => setTaskDraft((current) => ({ ...current, constraints: value }));

  return { setTaskTitle, setTaskGoal, setTaskConstraints };
};

const useSessionMutationRunner = (
  setSession: Dispatch<SetStateAction<RuntimeSessionSnapshot | null>>,
  setStatus: Dispatch<SetStateAction<RuntimeSessionOperationStatus>>,
  setMessage: Dispatch<SetStateAction<string | null>>,
  setError: Dispatch<SetStateAction<string | null>>,
) => {
  return async (
    nextStatus: RuntimeSessionOperationStatus,
    mutation: () => Promise<RuntimeSessionSnapshot>,
    successMessage: string,
  ): Promise<void> => {
    setStatus(nextStatus);
    setError(null);
    setMessage(null);

    try {
      const nextSession = await mutation();
      setSession(nextSession);
      setStatus(RuntimeSessionOperationStatus.Idle);
      setMessage(successMessage);
    } catch (mutationError: unknown) {
      setStatus(RuntimeSessionOperationStatus.Error);
      setError(formatError(mutationError));
    }
  };
};

const MAX_GOAL_ADVANCE_STEPS = 20;

const isSessionFinished = (session: RuntimeSessionSnapshot): boolean => {
  if (session.status !== 'running') {
    return true;
  }

  if (session.state.interruption !== undefined) {
    return true;
  }

  return session.state.nextAction?.toLowerCase().includes('completed') === true;
};

type RuntimeEventEnvelope<TPayload = Record<string, unknown>> = {
  eventId: string;
  traceId: string;
  sessionId: string;
  sequence: number;
  eventType: string;
  ts: string;
  level: 'info' | 'warn' | 'error';
  payload: TPayload;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isRuntimeSessionSnapshot = (value: unknown): value is RuntimeSessionSnapshot => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.sessionId === 'string'
    && typeof value.status === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && isRecord(value.state)
    && isRecord(value.runtimePlan);
};

const parseRuntimeEvent = (raw: string): RuntimeEventEnvelope | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed) || typeof parsed.eventType !== 'string' || !isRecord(parsed.payload)) {
      return null;
    }

    return parsed as RuntimeEventEnvelope;
  } catch {
    return null;
  }
};

const useSessionOperations = (
  session: RuntimeSessionSnapshot | null,
  taskDraft: RuntimeTaskDraft,
  setSession: Dispatch<SetStateAction<RuntimeSessionSnapshot | null>>,
  setStatus: Dispatch<SetStateAction<RuntimeSessionOperationStatus>>,
  setMessage: Dispatch<SetStateAction<string | null>>,
  setError: Dispatch<SetStateAction<string | null>>,
  runMutation: (
    nextStatus: RuntimeSessionOperationStatus,
    mutation: () => Promise<RuntimeSessionSnapshot>,
    successMessage: string,
  ) => Promise<void>,
): Pick<RuntimeSessionModel, 'runGoal' | 'refreshSession' | 'pauseSession' | 'resumeSession' | 'terminateSession'> => {
  const [startRuntimeSession] = useStartRuntimeSessionMutation();
  const [loadRuntimeSession] = useLazyGetRuntimeSessionQuery();
  const [advanceRuntimeSession] = useAdvanceRuntimeSessionMutation();
  const [pauseRuntimeSession] = usePauseRuntimeSessionMutation();
  const [resumeRuntimeSession] = useResumeRuntimeSessionMutation();
  const [terminateRuntimeSession] = useTerminateRuntimeSessionMutation();

  const runIfSessionExists = async (
    status: RuntimeSessionOperationStatus,
    operation: (sessionId: string) => Promise<RuntimeSessionSnapshot>,
    successMessage: string,
  ): Promise<void> => {
    if (session === null) {
      setMessage('Start a runtime session first.');
      return;
    }

    await runMutation(status, () => operation(session.sessionId), successMessage);
  };

  return {
    runGoal: async (team: TeamSchemaDocument): Promise<void> => {
      setStatus(RuntimeSessionOperationStatus.RunningGoal);
      setError(null);
      setMessage(null);

      try {
        let nextSession = await startRuntimeSession({ task: taskDraft, team }).unwrap();
        let advanceCount = 0;

        while (!isSessionFinished(nextSession) && advanceCount < MAX_GOAL_ADVANCE_STEPS) {
          nextSession = await advanceRuntimeSession(nextSession.sessionId).unwrap();
          advanceCount += 1;
        }

        setSession(nextSession);
        setStatus(RuntimeSessionOperationStatus.Idle);

        if (nextSession.state.interruption !== undefined) {
          setMessage(`Goal run paused with runtime interruption after ${advanceCount} execution step(s).`);
          return;
        }

        if (advanceCount >= MAX_GOAL_ADVANCE_STEPS && !isSessionFinished(nextSession)) {
          setMessage(`Goal run paused after ${MAX_GOAL_ADVANCE_STEPS} execution step(s).`);
          return;
        }

        setMessage(`Goal completed after ${advanceCount} execution step(s).`);
      } catch (mutationError: unknown) {
        setStatus(RuntimeSessionOperationStatus.Error);
        setError(formatError(mutationError));
      }
    },
    refreshSession: async () =>
      runIfSessionExists(RuntimeSessionOperationStatus.Refreshing, (sessionId) => loadRuntimeSession(sessionId).unwrap(), 'Runtime session refreshed.'),
    pauseSession: async () =>
      runIfSessionExists(RuntimeSessionOperationStatus.Pausing, (sessionId) => pauseRuntimeSession(sessionId).unwrap(), 'Runtime session paused.'),
    resumeSession: async () =>
      runIfSessionExists(RuntimeSessionOperationStatus.Resuming, (sessionId) => resumeRuntimeSession(sessionId).unwrap(), 'Runtime session resumed.'),
    terminateSession: async () =>
      runIfSessionExists(RuntimeSessionOperationStatus.Terminating, (sessionId) => terminateRuntimeSession(sessionId).unwrap(), 'Runtime session terminated.'),
  };
};

export const useRuntimeSession = (): RuntimeSessionModel => {
  const [session, setSession] = useState<RuntimeSessionSnapshot | null>(null);
  const [taskDraft, setTaskDraft] = useState<RuntimeTaskDraft>({
    title: 'Deliver onboarding flow',
    goal: 'Ship MVP onboarding in this sprint',
    constraints: 'Keep current database schema',
  });
  const [status, setStatus] = useState<RuntimeSessionOperationStatus>(RuntimeSessionOperationStatus.Idle);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRefs = useRef<{
    sessionId: string | null;
    close: () => void;
  }>({
    sessionId: null,
    close: () => undefined,
  });
  const taskDraftEditors = useTaskDraftEditors(setTaskDraft);
  const runMutation = useSessionMutationRunner(setSession, setStatus, setMessage, setError);
  const operations = useSessionOperations(session, taskDraft, setSession, setStatus, setMessage, setError, runMutation);

  useEffect(() => {
    const sessionId = session?.sessionId ?? null;

    if (streamRefs.current.sessionId === sessionId) {
      return;
    }

    streamRefs.current.close();

    if (sessionId === null) {
      streamRefs.current = { sessionId: null, close: () => undefined };
      return;
    }

    const sources = [
      new EventSource(`/runtime/session/${sessionId}/stream/snapshot`),
      new EventSource(`/runtime/session/${sessionId}/stream/timeline`),
      new EventSource(`/runtime/session/${sessionId}/stream/interruption`),
      new EventSource(`/runtime/session/${sessionId}/stream/review`),
      new EventSource('/runtime/stream/metrics'),
    ];

    const onEvent = (event: MessageEvent<string>): void => {
      const runtimeEvent = parseRuntimeEvent(event.data);

      if (runtimeEvent === null) {
        return;
      }

      if (runtimeEvent.eventType === 'snapshot' && isRuntimeSessionSnapshot(runtimeEvent.payload)) {
        setSession(runtimeEvent.payload);
      }

      if (runtimeEvent.eventType === 'snapshot_reset') {
        setMessage('Stream replay reset to latest snapshot.');
      }
    };

    const onError = (): void => {
      setError('Realtime runtime stream disconnected. The browser will retry automatically.');
    };

    const eventTypes = [
      'snapshot',
      'snapshot_reset',
      'metrics.updated',
      'runtime.session_started',
      'runtime.work_mode_routed',
      'runtime.interrupted',
      'runtime.session_completed',
      'runtime.session_terminated',
      'discussion.started',
      'discussion.turn_recorded',
      'discussion.completed',
      'discussion.conflict_detected',
      'review.ticket_admission_completed',
      'review.step_completed',
      'review.blocked',
      'review.revise_required',
      'pipeline.created',
      'pipeline.step_started',
      'pipeline.step_completed',
      'pipeline.step_runner_completed',
      'pipeline.handoff_generated',
      'pipeline.completed',
      'capability.loaded',
      'capability.denied',
      'memory.retrieved',
      'memory.conflict_detected',
    ] as const;

    for (const source of sources) {
      for (const eventType of eventTypes) {
        source.addEventListener(eventType, onEvent as EventListener);
      }
      source.onerror = onError;
    }

    streamRefs.current = {
      sessionId,
      close: () => {
        for (const source of sources) {
          source.close();
        }
      },
    };

    return () => {
      streamRefs.current.close();
      streamRefs.current = { sessionId: null, close: () => undefined };
    };
  }, [session?.sessionId]);

  return {
    session,
    taskDraft,
    status,
    message,
    error,
    ...taskDraftEditors,
    ...operations,
  };
};
