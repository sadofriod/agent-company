import type { RuntimeSessionSnapshot, RuntimeTaskDraft, TeamSchemaDocument } from '../../model/types';

export type RuntimeSessionOperationStatus = 'idle' | 'starting' | 'refreshing' | 'advancing' | 'pausing' | 'resuming' | 'terminating' | 'error';

export type RuntimeSessionModel = {
  session: RuntimeSessionSnapshot | null;
  taskDraft: RuntimeTaskDraft;
  status: RuntimeSessionOperationStatus;
  message: string | null;
  error: string | null;
  setTaskTitle: (value: string) => void;
  setTaskGoal: (value: string) => void;
  setTaskConstraints: (value: string) => void;
  createSession: (team: TeamSchemaDocument) => Promise<void>;
  refreshSession: () => Promise<void>;
  advanceSession: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  terminateSession: () => Promise<void>;
};
