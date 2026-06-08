import { useState } from 'react';

import type { RuntimeSessionSnapshot, RuntimeTaskDraft, TeamSchemaDocument } from '../model/types';
import {
  formatApiErrorMessage,
} from '../api/shared';
import {
  useAdvanceRuntimeSessionMutation,
  useLazyGetRuntimeSessionQuery,
  usePauseRuntimeSessionMutation,
  useResumeRuntimeSessionMutation,
  useStartRuntimeSessionMutation,
  useTerminateRuntimeSessionMutation,
} from '../api/runtimeSessionApi';

export type RuntimeSessionOperationStatus = 'idle' | 'starting' | 'refreshing' | 'advancing' | 'pausing' | 'resuming' | 'terminating' | 'error';

export type RuntimeSessionModel = {
  readonly session: RuntimeSessionSnapshot | null;
  readonly taskDraft: RuntimeTaskDraft;
  readonly status: RuntimeSessionOperationStatus;
  readonly message: string | null;
  readonly error: string | null;
  readonly setTaskTitle: (value: string) => void;
  readonly setTaskGoal: (value: string) => void;
  readonly setTaskConstraints: (value: string) => void;
  readonly createSession: (team: TeamSchemaDocument) => Promise<void>;
  readonly refreshSession: () => Promise<void>;
  readonly advanceSession: () => Promise<void>;
  readonly pauseSession: () => Promise<void>;
  readonly resumeSession: () => Promise<void>;
  readonly terminateSession: () => Promise<void>;
};

const formatError = (error: unknown): string => formatApiErrorMessage(error, 'Runtime session request failed.');

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
  const [startRuntimeSession] = useStartRuntimeSessionMutation();
  const [loadRuntimeSession] = useLazyGetRuntimeSessionQuery();
  const [advanceRuntimeSession] = useAdvanceRuntimeSessionMutation();
  const [pauseRuntimeSession] = usePauseRuntimeSessionMutation();
  const [resumeRuntimeSession] = useResumeRuntimeSessionMutation();
  const [terminateRuntimeSession] = useTerminateRuntimeSessionMutation();

  const setTaskTitle = (value: string): void => {
    setTaskDraft((current) => ({ ...current, title: value }));
  };

  const setTaskGoal = (value: string): void => {
    setTaskDraft((current) => ({ ...current, goal: value }));
  };

  const setTaskConstraints = (value: string): void => {
    setTaskDraft((current) => ({ ...current, constraints: value }));
  };

  const withSessionMutation = async (
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

  const createSession = async (team: TeamSchemaDocument): Promise<void> => {
    await withSessionMutation('starting', () => startRuntimeSession({ task: taskDraft, team }).unwrap(), 'Runtime session created.');
  };

  const refreshSession = async (): Promise<void> => {
    if (session === null) {
      setMessage('Start a runtime session first.');
      return;
    }

    await withSessionMutation('refreshing', () => loadRuntimeSession(session.sessionId).unwrap(), 'Runtime session refreshed.');
  };

  const advance = async (): Promise<void> => {
    if (session === null) {
      setMessage('Start a runtime session first.');
      return;
    }

    await withSessionMutation('advancing', () => advanceRuntimeSession(session.sessionId).unwrap(), 'Runtime session advanced.');
  };

  const pause = async (): Promise<void> => {
    if (session === null) {
      setMessage('Start a runtime session first.');
      return;
    }

    await withSessionMutation('pausing', () => pauseRuntimeSession(session.sessionId).unwrap(), 'Runtime session paused.');
  };

  const resume = async (): Promise<void> => {
    if (session === null) {
      setMessage('Start a runtime session first.');
      return;
    }

    await withSessionMutation('resuming', () => resumeRuntimeSession(session.sessionId).unwrap(), 'Runtime session resumed.');
  };

  const terminate = async (): Promise<void> => {
    if (session === null) {
      setMessage('Start a runtime session first.');
      return;
    }

    await withSessionMutation('terminating', () => terminateRuntimeSession(session.sessionId).unwrap(), 'Runtime session terminated.');
  };

  return {
    session,
    taskDraft,
    status,
    message,
    error,
    setTaskTitle,
    setTaskGoal,
    setTaskConstraints,
    createSession,
    refreshSession,
    advanceSession: advance,
    pauseSession: pause,
    resumeSession: resume,
    terminateSession: terminate,
  };
};