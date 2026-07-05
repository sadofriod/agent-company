import type { SchemaIssue } from '@agents-team/service/domain/base';
import type {
  AgentMarkdownFile,
  AgentMarkdownFileSummary,
  AgentMarkdownValidationResponse,
} from '@agents-team/service/agent/markdown';

export enum OperationStatus {
  Idle = 'idle',
  Loading = 'loading',
  Reading = 'reading',
  Validating = 'validating',
  Writing = 'writing',
  Deleting = 'deleting',
}

export type ValidatedDraft = {
  path: string;
  content: string;
};

export type AgentMarkdownEditorState = {
  files: readonly AgentMarkdownFileSummary[];
  selectedPath: string | null;
  draftPath: string;
  content: string;
  status: OperationStatus;
  message: string | null;
  error: string | null;
  validation: AgentMarkdownValidationResponse | null;
  validatedDraft: ValidatedDraft | null;
  hasLocalDraft: boolean;
  draftPaths: readonly string[];
};

export type AgentMarkdownEditorAction =
  | { type: 'filesLoading' }
  | { type: 'filesLoaded'; files: readonly AgentMarkdownFileSummary[]; draftPaths: readonly string[] }
  | { type: 'fileSelected'; path: string }
  | { type: 'fileReading' }
  | { type: 'fileLoaded'; file: AgentMarkdownFile; content: string; hasLocalDraft: boolean; draftPaths: readonly string[] }
  | { type: 'newDraftStarted'; path: string; content: string; draftPaths: readonly string[] }
  | { type: 'pathChanged'; path: string; draftPaths: readonly string[] }
  | { type: 'contentChanged'; content: string; draftPaths: readonly string[] }
  | { type: 'validationStarted' }
  | { type: 'validationFinished'; validation: AgentMarkdownValidationResponse; validatedDraft: ValidatedDraft | null }
  | { type: 'writeStarted' }
  | { type: 'writeFinished'; file: AgentMarkdownFile; files: readonly AgentMarkdownFileSummary[]; draftPaths: readonly string[] }
  | { type: 'deleteStarted' }
  | { type: 'deleteFinished'; files: readonly AgentMarkdownFileSummary[]; selectedPath: string | null; draftPaths: readonly string[] }
  | { type: 'draftDiscarded'; content: string; hasLocalDraft: boolean; draftPaths: readonly string[] }
  | { type: 'operationFailed'; error: string };

export type AgentMarkdownEditorModel = {
  files: readonly AgentMarkdownFileSummary[];
  selectedPath: string | null;
  draftPath: string;
  content: string;
  status: OperationStatus;
  message: string | null;
  error: string | null;
  validation: AgentMarkdownValidationResponse | null;
  validationIssues: readonly SchemaIssue[];
  currentFileValidationIssues: readonly SchemaIssue[];
  hasLocalDraft: boolean;
  draftPaths: readonly string[];
  canWrite: boolean;
  isExistingPath: boolean;
  isBusy: boolean;
  selectFile: (path: string) => void;
  startNewDraft: () => void;
  updateDraftPath: (path: string) => void;
  updateContent: (content: string) => void;
  validateDraft: () => Promise<void>;
  writeDraft: () => Promise<void>;
  deleteFile: () => Promise<void>;
  discardDraft: () => Promise<void>;
  reloadFiles: () => Promise<void>;
};

export const initialState: AgentMarkdownEditorState = {
  files: [],
  selectedPath: null,
  draftPath: '',
  content: '',
  status: OperationStatus.Idle,
  message: null,
  error: null,
  validation: null,
  validatedDraft: null,
  hasLocalDraft: false,
  draftPaths: [],
};

const findDefaultDraftSuffix = (existingPaths: ReadonlySet<string>, suffix: number): number =>
  existingPaths.has(`engineering/NewAgent${suffix}.md`)
    ? findDefaultDraftSuffix(existingPaths, suffix + 1)
    : suffix;

export const createDefaultDraftPath = (files: readonly AgentMarkdownFileSummary[]): string => {
  const existingPaths = new Set(files.map((file) => file.path));
  const suffix = findDefaultDraftSuffix(existingPaths, 1);
  return `engineering/NewAgent${suffix}.md`;
};

export const createDraftTemplate = (draftPath: string): string => {
  const baseName = draftPath.split('/').at(-1)?.replace(/\.md$/, '') ?? 'NewAgent';

  return `---
name: ${baseName}
description: Describe this agent.
profile: code
tool_policy: execution_write
partials: []
tools: []
allowed_commands: []
required_commands: []
---

You are the ${baseName} Agent.
`;
};

export const chooseSelectedPath = (
  files: readonly AgentMarkdownFileSummary[],
  currentPath: string | null,
): string | null => {
  if (currentPath !== null && files.some((file) => file.path === currentPath)) {
    return currentPath;
  }

  return files[0]?.path ?? null;
};

export const toValidationFailure = (issues: readonly SchemaIssue[]): AgentMarkdownValidationResponse => ({
  ok: false,
  issues,
});

export const reducer = (
  state: AgentMarkdownEditorState,
  action: AgentMarkdownEditorAction,
): AgentMarkdownEditorState => {
  if (action.type === 'filesLoading') {
    return { ...state, status: OperationStatus.Loading, error: null, message: null };
  }

  if (action.type === 'filesLoaded') {
    return {
      ...state,
      files: action.files,
      selectedPath: chooseSelectedPath(action.files, state.selectedPath),
      status: OperationStatus.Idle,
      error: null,
      draftPaths: action.draftPaths,
    };
  }

  if (action.type === 'fileSelected') {
    return { ...state, selectedPath: action.path, status: OperationStatus.Reading, message: null, error: null };
  }

  if (action.type === 'fileReading') {
    return { ...state, status: OperationStatus.Reading, error: null, message: null };
  }

  if (action.type === 'fileLoaded') {
    return {
      ...state,
      selectedPath: action.file.path,
      draftPath: action.file.path,
      content: action.content,
      status: OperationStatus.Idle,
      message: action.hasLocalDraft ? 'Loaded local draft.' : null,
      error: null,
      validation: null,
      validatedDraft: null,
      hasLocalDraft: action.hasLocalDraft,
      draftPaths: action.draftPaths,
    };
  }

  if (action.type === 'newDraftStarted') {
    return {
      ...state,
      selectedPath: null,
      draftPath: action.path,
      content: action.content,
      status: OperationStatus.Idle,
      message: 'New draft saved locally.',
      error: null,
      validation: null,
      validatedDraft: null,
      hasLocalDraft: true,
      draftPaths: action.draftPaths,
    };
  }

  if (action.type === 'pathChanged') {
    return {
      ...state,
      draftPath: action.path,
      message: 'Draft saved locally.',
      error: null,
      validation: null,
      validatedDraft: null,
      hasLocalDraft: action.path.length > 0,
      draftPaths: action.draftPaths,
    };
  }

  if (action.type === 'contentChanged') {
    return {
      ...state,
      content: action.content,
      message: 'Draft saved locally.',
      error: null,
      validation: null,
      validatedDraft: null,
      hasLocalDraft: state.draftPath.length > 0,
      draftPaths: action.draftPaths,
    };
  }

  if (action.type === 'validationStarted') {
    return { ...state, status: OperationStatus.Validating, error: null, message: null };
  }

  if (action.type === 'validationFinished') {
    return {
      ...state,
      status: OperationStatus.Idle,
      validation: action.validation,
      validatedDraft: action.validatedDraft,
      message: action.validation.ok ? 'Draft validated.' : null,
      error: action.validation.ok ? null : 'Draft validation failed.',
    };
  }

  if (action.type === 'writeStarted') {
    return { ...state, status: OperationStatus.Writing, error: null, message: null };
  }

  if (action.type === 'writeFinished') {
    return {
      ...state,
      files: action.files,
      selectedPath: action.file.path,
      draftPath: action.file.path,
      content: action.file.content,
      status: OperationStatus.Idle,
      message: 'Markdown written.',
      error: null,
      validation: action.file.validation.ok ? action.file.validation : null,
      validatedDraft: null,
      hasLocalDraft: false,
      draftPaths: action.draftPaths,
    };
  }

  if (action.type === 'deleteStarted') {
    return { ...state, status: OperationStatus.Deleting, error: null, message: null };
  }

  if (action.type === 'deleteFinished') {
    return {
      ...state,
      files: action.files,
      selectedPath: action.selectedPath,
      draftPath: '',
      content: '',
      status: OperationStatus.Idle,
      message: 'Markdown deleted.',
      error: null,
      validation: null,
      validatedDraft: null,
      hasLocalDraft: false,
      draftPaths: action.draftPaths,
    };
  }

  if (action.type === 'draftDiscarded') {
    return {
      ...state,
      content: action.content,
      status: OperationStatus.Idle,
      message: 'Local draft discarded.',
      error: null,
      validation: null,
      validatedDraft: null,
      hasLocalDraft: action.hasLocalDraft,
      draftPaths: action.draftPaths,
    };
  }

  return { ...state, status: OperationStatus.Idle, error: action.error, message: null };
};
