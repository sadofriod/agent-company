import { useState } from 'react';
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
import type { RuntimeSessionModel, RuntimeSessionOperationStatus } from './helper/runtimeSession.types';

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
      setStatus('idle');
      setMessage(successMessage);
    } catch (mutationError: unknown) {
      setStatus('error');
      setError(formatError(mutationError));
    }
  };
};

const useSessionOperations = (
  session: RuntimeSessionSnapshot | null,
  taskDraft: RuntimeTaskDraft,
  setMessage: Dispatch<SetStateAction<string | null>>,
  runMutation: (
    nextStatus: RuntimeSessionOperationStatus,
    mutation: () => Promise<RuntimeSessionSnapshot>,
    successMessage: string,
  ) => Promise<void>,
): Pick<RuntimeSessionModel, 'createSession' | 'refreshSession' | 'advanceSession' | 'pauseSession' | 'resumeSession' | 'terminateSession'> => {
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
    createSession: async (team: TeamSchemaDocument) =>
      runMutation('starting', () => startRuntimeSession({ task: taskDraft, team }).unwrap(), 'Runtime session created.'),
    refreshSession: async () => runIfSessionExists('refreshing', (sessionId) => loadRuntimeSession(sessionId).unwrap(), 'Runtime session refreshed.'),
    advanceSession: async () => runIfSessionExists('advancing', (sessionId) => advanceRuntimeSession(sessionId).unwrap(), 'Runtime session advanced.'),
    pauseSession: async () => runIfSessionExists('pausing', (sessionId) => pauseRuntimeSession(sessionId).unwrap(), 'Runtime session paused.'),
    resumeSession: async () => runIfSessionExists('resuming', (sessionId) => resumeRuntimeSession(sessionId).unwrap(), 'Runtime session resumed.'),
    terminateSession: async () => runIfSessionExists('terminating', (sessionId) => terminateRuntimeSession(sessionId).unwrap(), 'Runtime session terminated.'),
  };
};

export const useRuntimeSession = (): RuntimeSessionModel => {
  const [session, setSession] = useState<RuntimeSessionSnapshot | null>(null);
  const [taskDraft, setTaskDraft] = useState<RuntimeTaskDraft>({
    title: 'Deliver onboarding flow',
    goal: 'Ship MVP onboarding in this sprint',
    constraints: 'Keep current database schema',
  });
  const [status, setStatus] = useState<RuntimeSessionOperationStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const taskDraftEditors = useTaskDraftEditors(setTaskDraft);
  const runMutation = useSessionMutationRunner(setSession, setStatus, setMessage, setError);
  const operations = useSessionOperations(session, taskDraft, setMessage, runMutation);

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
