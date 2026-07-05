import { useEffect, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { formatApiErrorMessage } from '../api/shared';
import {
  useAdvanceRuntimeSessionMutation,
  useLazyGetRuntimeSessionQuery,
  usePauseRuntimeSessionMutation,
  useResumeRuntimeSessionMutation,
  useStartRuntimeSessionMutation,
  useTerminateRuntimeSessionMutation,
} from '../api/runtimeSessionApi';
import {
  WorkflowNodeType,
  type AgentDocument,
  type RuntimeSessionSnapshot,
  type RuntimeTaskDraft,
  type TeamSchemaDocument,
  type WorkflowLayoutNodeDocument,
} from '../model/types';
import {
  RuntimeSessionOperationStatus,
  type RuntimeSessionModel,
  type RuntimeNodeInsight,
} from './helper/runtimeSession.types';
import {
  appendRuntimeEventFeed,
  deriveRuntimeObservabilityState,
  parseRuntimeEvent,
} from './helper/runtimeSessionObservability';

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
const RUNTIME_STREAM_CLOSED_ERROR = 'Realtime runtime stream closed. Refresh the session to reconnect.';

type WorkflowNodeLlmValidationFailure = {
  readonly nodeId: string;
  readonly nodeName: string;
  readonly reason: string;
};

const hasConfiguredLlmBinding = (agent: AgentDocument): boolean =>
  typeof agent.metadata?.llm?.provider === 'string' && agent.metadata.llm.provider.trim().length > 0;

const getWorkflowNodeDisplayName = (node: WorkflowLayoutNodeDocument): string =>
  node.data?.workflowMetadata?.name ?? node.data?.nodeName ?? node.id;

const collectWorkflowNodeLlmValidationFailures = (
  team: TeamSchemaDocument,
): readonly WorkflowNodeLlmValidationFailure[] => {
  const workflowNodes = team.layout?.nodes ?? [];

  return workflowNodes.flatMap((node) => {
    if (node.data?.workflowNodeType !== WorkflowNodeType.Agent) {
      return [];
    }

    const nodeName = getWorkflowNodeDisplayName(node);
    const agentId = node.data.workflowAgentId?.trim();

    if (agentId === undefined || agentId.length === 0) {
      return [{ nodeId: node.id, nodeName, reason: 'no agent is assigned to this workflow node' }];
    }

    const agent = team.agents.find((candidate) => candidate.agent_id === agentId);

    if (agent === undefined) {
      return [{ nodeId: node.id, nodeName, reason: `assigned agent \"${agentId}\" was not found in the schema` }];
    }

    if (!hasConfiguredLlmBinding(agent)) {
      return [{ nodeId: node.id, nodeName, reason: `assigned agent \"${agent.metadata?.name ?? agent.agent_id}\" has no configured LLM` }];
    }

    return [];
  });
};

const createWorkflowNodeLlmValidationError = (
  failures: readonly WorkflowNodeLlmValidationFailure[],
): Error => new Error([
  'Cannot run goal because these workflow nodes are missing LLM configuration:',
  ...failures.map((failure) => `- ${failure.nodeName} (${failure.nodeId}): ${failure.reason}`),
].join('\n'));

const isSessionFinished = (session: RuntimeSessionSnapshot): boolean => {
  if (session.status !== 'running') {
    return true;
  }

  if (session.state.interruption !== undefined) {
    return true;
  }

  return session.state.nextAction?.toLowerCase().includes('completed') === true;
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

const parseAgentDepartmentMap = (
  session: RuntimeSessionSnapshot | null,
): ReadonlyMap<string, string> => {
  if (session === null || !isRecord(session.runtimePlan)) {
    return new Map<string, string>();
  }

  const runtimePlanTeam = session.runtimePlan['team'];

  if (!isRecord(runtimePlanTeam) || !Array.isArray(runtimePlanTeam.agents)) {
    return new Map<string, string>();
  }

  const result = new Map<string, string>();

  for (const entry of runtimePlanTeam.agents) {
    if (!isRecord(entry)) {
      continue;
    }

    const agentId = typeof entry.agentId === 'string'
      ? entry.agentId
      : typeof entry.agent_id === 'string'
        ? entry.agent_id
        : undefined;
    const departmentId = typeof entry.departmentId === 'string'
      ? entry.departmentId
      : typeof entry.department_id === 'string'
        ? entry.department_id
        : undefined;

    if (agentId === undefined || departmentId === undefined) {
      continue;
    }

    result.set(agentId, departmentId);
  }

  return result;
};

const STREAM_EVENT_TYPES = [
  'snapshot',
  'snapshot_reset',
  'metrics.updated',
  'runtime.session_started',
  'runtime.session_paused',
  'runtime.session_resumed',
  'runtime.session_advanced',
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
  'observability.degraded',
  'heartbeat',
] as const;

type RuntimeObservabilityState = Pick<
  RuntimeSessionModel,
  'runtimeActiveNodeIds' | 'runtimeActiveEdgeIds' | 'runtimeNodeInsights' | 'runtimeEventFeed'
>;

const createRuntimeEventHandler = (input: {
  sessionRef: MutableRefObject<RuntimeSessionSnapshot | null>;
  setSession: Dispatch<SetStateAction<RuntimeSessionSnapshot | null>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
  setRuntimeActiveNodeIds: Dispatch<SetStateAction<readonly string[]>>;
  setRuntimeActiveEdgeIds: Dispatch<SetStateAction<readonly string[]>>;
  setRuntimeNodeInsights: Dispatch<SetStateAction<Readonly<Record<string, RuntimeNodeInsight>>>>;
  setRuntimeEventFeed: Dispatch<SetStateAction<RuntimeSessionModel['runtimeEventFeed']>>;
}) => (event: MessageEvent<string>): void => {
  const runtimeEvent = parseRuntimeEvent(event.data);

  if (runtimeEvent === null) {
    return;
  }

  if (runtimeEvent.eventType === 'snapshot' && isRuntimeSessionSnapshot(runtimeEvent.payload)) {
    input.setSession(runtimeEvent.payload);
  }

  if (runtimeEvent.eventType === 'snapshot_reset') {
    input.setMessage('Stream replay reset to latest snapshot.');
  }

  const agentDepartmentMap = parseAgentDepartmentMap(input.sessionRef.current);
  const observabilityState = deriveRuntimeObservabilityState(
    runtimeEvent,
    (agentId) => agentDepartmentMap.get(agentId),
  );

  input.setRuntimeActiveNodeIds(observabilityState.nodeIds);
  input.setRuntimeActiveEdgeIds(observabilityState.edgeIds);
  input.setRuntimeNodeInsights((current) => ({
    ...current,
    ...observabilityState.nodeInsights,
  }));
  input.setRuntimeEventFeed((current) => appendRuntimeEventFeed(current, observabilityState.feedItem));
};

const connectRuntimeStreams = (
  sessionId: string,
  onEvent: EventListener,
  onOpen: () => void,
  onError: () => void,
): (() => void) => {
  const sources = [
    new EventSource(`/runtime/session/${sessionId}/stream/snapshot`),
    new EventSource(`/runtime/session/${sessionId}/stream/timeline`),
    new EventSource(`/runtime/session/${sessionId}/stream/interruption`),
    new EventSource(`/runtime/session/${sessionId}/stream/review`),
    new EventSource('/runtime/stream/metrics'),
  ];

  for (const source of sources) {
    for (const eventType of STREAM_EVENT_TYPES) {
      source.addEventListener(eventType, onEvent);
    }

    source.onopen = onOpen;
    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        onError();
      }
    };
  }

  return () => {
    for (const source of sources) {
      source.onopen = null;
      source.onerror = null;
      source.close();
    }
  };
};

const useRuntimeObservability = (
  session: RuntimeSessionSnapshot | null,
  setSession: Dispatch<SetStateAction<RuntimeSessionSnapshot | null>>,
  setMessage: Dispatch<SetStateAction<string | null>>,
  setError: Dispatch<SetStateAction<string | null>>,
): RuntimeObservabilityState => {
  const [runtimeActiveNodeIds, setRuntimeActiveNodeIds] = useState<readonly string[]>([]);
  const [runtimeActiveEdgeIds, setRuntimeActiveEdgeIds] = useState<readonly string[]>([]);
  const [runtimeNodeInsights, setRuntimeNodeInsights] = useState<Readonly<Record<string, RuntimeNodeInsight>>>({});
  const [runtimeEventFeed, setRuntimeEventFeed] = useState<RuntimeSessionModel['runtimeEventFeed']>([]);
  const streamRefs = useRef<{ sessionId: string | null; close: () => void }>({ sessionId: null, close: () => undefined });
  const sessionRef = useRef<RuntimeSessionSnapshot | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const sessionId = session?.sessionId ?? null;

    if (streamRefs.current.sessionId === sessionId) {
      return;
    }

    streamRefs.current.close();

    if (sessionId === null) {
      setRuntimeActiveNodeIds([]);
      setRuntimeActiveEdgeIds([]);
      setRuntimeNodeInsights({});
      setRuntimeEventFeed([]);
      streamRefs.current = { sessionId: null, close: () => undefined };
      return;
    }

    const close = connectRuntimeStreams(
      sessionId,
      createRuntimeEventHandler({
        sessionRef,
        setSession,
        setMessage,
        setRuntimeActiveNodeIds,
        setRuntimeActiveEdgeIds,
        setRuntimeNodeInsights,
        setRuntimeEventFeed,
      }) as EventListener,
      () => setError((current) => (current === RUNTIME_STREAM_CLOSED_ERROR ? null : current)),
      () => setError(RUNTIME_STREAM_CLOSED_ERROR),
    );
    streamRefs.current = { sessionId, close };

    return () => {
      streamRefs.current.close();
      streamRefs.current = { sessionId: null, close: () => undefined };
    };
  }, [session?.sessionId, setError, setMessage, setSession]);

  return { runtimeActiveNodeIds, runtimeActiveEdgeIds, runtimeNodeInsights, runtimeEventFeed };
};

const runGoalAdvanceLoop = async (
  currentSession: RuntimeSessionSnapshot,
  count: number,
  setSession: Dispatch<SetStateAction<RuntimeSessionSnapshot | null>>,
  advanceRuntimeSession: ReturnType<typeof useAdvanceRuntimeSessionMutation>[0],
): Promise<{ session: RuntimeSessionSnapshot; count: number }> => {
  if (isSessionFinished(currentSession) || count >= MAX_GOAL_ADVANCE_STEPS) {
    return { session: currentSession, count };
  }

  const nextSession = await advanceRuntimeSession(currentSession.sessionId).unwrap();
  setSession(nextSession);
  return runGoalAdvanceLoop(nextSession, count + 1, setSession, advanceRuntimeSession);
};

const executeGoalRun = async (
  team: TeamSchemaDocument,
  taskDraft: RuntimeTaskDraft,
  setStatus: Dispatch<SetStateAction<RuntimeSessionOperationStatus>>,
  setError: Dispatch<SetStateAction<string | null>>,
  setMessage: Dispatch<SetStateAction<string | null>>,
  setSession: Dispatch<SetStateAction<RuntimeSessionSnapshot | null>>,
  startRuntimeSession: ReturnType<typeof useStartRuntimeSessionMutation>[0],
  advanceRuntimeSession: ReturnType<typeof useAdvanceRuntimeSessionMutation>[0],
): Promise<void> => {
  setStatus(RuntimeSessionOperationStatus.RunningGoal);
  setError(null);
  setMessage(null);

  try {
    const llmValidationFailures = collectWorkflowNodeLlmValidationFailures(team);

    if (llmValidationFailures.length > 0) {
      throw createWorkflowNodeLlmValidationError(llmValidationFailures);
    }

    const initialSession = await startRuntimeSession({ task: taskDraft, team }).unwrap();
    setSession(initialSession);
    const { session: finalSession, count: advanceCount } = await runGoalAdvanceLoop(
      initialSession,
      0,
      setSession,
      advanceRuntimeSession,
    );

    setStatus(RuntimeSessionOperationStatus.Idle);

    if (finalSession.state.interruption !== undefined) {
      setMessage(`Goal run paused with runtime interruption after ${advanceCount} execution step(s).`);
      return;
    }

    if (advanceCount >= MAX_GOAL_ADVANCE_STEPS && !isSessionFinished(finalSession)) {
      setMessage(`Goal run paused after ${MAX_GOAL_ADVANCE_STEPS} execution step(s).`);
      return;
    }

    setMessage(`Goal completed after ${advanceCount} execution step(s).`);
  } catch (mutationError: unknown) {
    setStatus(RuntimeSessionOperationStatus.Error);
    setError(formatError(mutationError));
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
): Pick<RuntimeSessionModel, 'runGoal' | 'loadSession' | 'refreshSession' | 'pauseSession' | 'resumeSession' | 'terminateSession'> => {
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
    runGoal: async (team: TeamSchemaDocument): Promise<void> =>
      executeGoalRun(team, taskDraft, setStatus, setError, setMessage, setSession, startRuntimeSession, advanceRuntimeSession),
    loadSession: async (sessionId: string) =>
      runMutation(RuntimeSessionOperationStatus.Refreshing, () => loadRuntimeSession(sessionId).unwrap(), 'Runtime session loaded.'),
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
  const taskDraftEditors = useTaskDraftEditors(setTaskDraft);
  const runMutation = useSessionMutationRunner(setSession, setStatus, setMessage, setError);
  const operations = useSessionOperations(session, taskDraft, setSession, setStatus, setMessage, setError, runMutation);
  const runtimeObservability = useRuntimeObservability(session, setSession, setMessage, setError);

  return {
    session,
    taskDraft,
    status,
    message,
    error,
    ...runtimeObservability,
    ...taskDraftEditors,
    ...operations,
  };
};
