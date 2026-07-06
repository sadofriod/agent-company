import type { RuntimeSessionSnapshot, RuntimeTaskDraft, TeamSchemaDocument } from '../../model/types';

export enum RuntimeSessionOperationStatus {
  Idle = 'idle',
  RunningGoal = 'runningGoal',
  Refreshing = 'refreshing',
  Pausing = 'pausing',
  Resuming = 'resuming',
  Terminating = 'terminating',
  Error = 'error',
}

export type RuntimeEventToolCall = {
  callId?: string;
  capabilityId: string;
  status: string;
  inputSummary?: string;
  outputSummary?: string;
};

export type RuntimeEventEnvelope<TPayload = Record<string, unknown>> = {
  eventId: string;
  traceId: string;
  sessionId: string;
  sequence: number;
  eventType: string;
  ts: string;
  level: 'info' | 'warn' | 'error';
  payload: TPayload;
  actor?: {
    agentId?: string;
    departmentId?: string;
    reviewer?: string;
  };
  target?: {
    type?: string;
    id?: string;
  };
  metrics?: {
    latencyMs?: number;
    tokensIn?: number;
    tokensOut?: number;
    costUsd?: number;
  };
};

export type RuntimeNodeInsight = {
  nodeId: string;
  eventType: string;
  updatedAt: string;
  summary: string;
  conclusion?: string;
  readTargetIds: readonly string[];
  writeTargetIds: readonly string[];
  toolCalls: readonly RuntimeEventToolCall[];
};

export type RuntimeEventFeedItem = {
  eventId: string;
  eventType: string;
  ts: string;
  level: 'info' | 'warn' | 'error';
  summary: string;
  nodeIds: readonly string[];
  edgeIds: readonly string[];
  conclusion?: string;
  readTargetIds: readonly string[];
  writeTargetIds: readonly string[];
  toolCalls: readonly RuntimeEventToolCall[];
};

export type RuntimeSessionModel = {
  session: RuntimeSessionSnapshot | null;
  taskDraft: RuntimeTaskDraft;
  status: RuntimeSessionOperationStatus;
  message: string | null;
  error: string | null;
  runtimeActiveNodeIds: readonly string[];
  runtimeActiveEdgeIds: readonly string[];
  runtimeNodeInsights: Readonly<Record<string, RuntimeNodeInsight>>;
  runtimeEventFeed: readonly RuntimeEventFeedItem[];
  setTaskTitle: (value: string) => void;
  setTaskGoal: (value: string) => void;
  setTaskConstraints: (value: string) => void;
  runGoal: (team: TeamSchemaDocument) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  terminateSession: () => Promise<void>;
};
