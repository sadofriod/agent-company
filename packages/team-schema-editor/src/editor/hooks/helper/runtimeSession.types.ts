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

export type RuntimeSessionModel = {
  session: RuntimeSessionSnapshot | null;
  taskDraft: RuntimeTaskDraft;
  status: RuntimeSessionOperationStatus;
  message: string | null;
  error: string | null;
  setTaskTitle: (value: string) => void;
  setTaskGoal: (value: string) => void;
  setTaskConstraints: (value: string) => void;
  runGoal: (team: TeamSchemaDocument) => Promise<void>;
  refreshSession: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  terminateSession: () => Promise<void>;
};
