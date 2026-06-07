import { useEffect, useReducer } from 'react';

import type { SchemaIssue } from '@agents-team/service/domain/base';
import type {
  AgentMarkdownFile,
  AgentMarkdownFileSummary,
  AgentMarkdownValidationResponse,
} from '@agents-team/service/agent/markdown';
import {
  formatApiErrorMessage,
} from '../api/shared';
import {
  useCreateAgentMarkdownFileMutation,
  useDeleteAgentMarkdownFileMutation,
  useLazyReadAgentMarkdownFileQuery,
  useListAgentMarkdownFilesQuery,
  useUpdateAgentMarkdownFileMutation,
  useValidateAgentMarkdownDraftMutation,
} from '../api/agentMarkdownApi';
import {
  listAgentMarkdownDraftPaths,
  moveAgentMarkdownDraft,
  readAgentMarkdownDraft,
  removeAgentMarkdownDraft,
  writeAgentMarkdownDraft,
} from '../agentMarkdown/agentMarkdownDraftStorage';

type OperationStatus = 'idle' | 'loading' | 'reading' | 'validating' | 'writing' | 'deleting';

type ValidatedDraft = {
  readonly path: string;
  readonly content: string;
};

type AgentMarkdownEditorState = {
  readonly files: readonly AgentMarkdownFileSummary[];
  readonly selectedPath: string | null;
  readonly draftPath: string;
  readonly content: string;
  readonly status: OperationStatus;
  readonly message: string | null;
  readonly error: string | null;
  readonly validation: AgentMarkdownValidationResponse | null;
  readonly validatedDraft: ValidatedDraft | null;
  readonly hasLocalDraft: boolean;
  readonly draftPaths: readonly string[];
};

type AgentMarkdownEditorAction =
  | { readonly type: 'filesLoading' }
  | { readonly type: 'filesLoaded'; readonly files: readonly AgentMarkdownFileSummary[]; readonly draftPaths: readonly string[] }
  | { readonly type: 'fileSelected'; readonly path: string }
  | { readonly type: 'fileReading' }
  | { readonly type: 'fileLoaded'; readonly file: AgentMarkdownFile; readonly content: string; readonly hasLocalDraft: boolean; readonly draftPaths: readonly string[] }
  | { readonly type: 'newDraftStarted'; readonly path: string; readonly content: string; readonly draftPaths: readonly string[] }
  | { readonly type: 'pathChanged'; readonly path: string; readonly draftPaths: readonly string[] }
  | { readonly type: 'contentChanged'; readonly content: string; readonly draftPaths: readonly string[] }
  | { readonly type: 'validationStarted' }
  | { readonly type: 'validationFinished'; readonly validation: AgentMarkdownValidationResponse; readonly validatedDraft: ValidatedDraft | null }
  | { readonly type: 'writeStarted' }
  | { readonly type: 'writeFinished'; readonly file: AgentMarkdownFile; readonly files: readonly AgentMarkdownFileSummary[]; readonly draftPaths: readonly string[] }
  | { readonly type: 'deleteStarted' }
  | { readonly type: 'deleteFinished'; readonly files: readonly AgentMarkdownFileSummary[]; readonly selectedPath: string | null; readonly draftPaths: readonly string[] }
  | { readonly type: 'draftDiscarded'; readonly content: string; readonly hasLocalDraft: boolean; readonly draftPaths: readonly string[] }
  | { readonly type: 'operationFailed'; readonly error: string };

export type AgentMarkdownEditorModel = {
  readonly files: readonly AgentMarkdownFileSummary[];
  readonly selectedPath: string | null;
  readonly draftPath: string;
  readonly content: string;
  readonly status: OperationStatus;
  readonly message: string | null;
  readonly error: string | null;
  readonly validation: AgentMarkdownValidationResponse | null;
  readonly validationIssues: readonly SchemaIssue[];
  readonly currentFileValidationIssues: readonly SchemaIssue[];
  readonly hasLocalDraft: boolean;
  readonly draftPaths: readonly string[];
  readonly canWrite: boolean;
  readonly isExistingPath: boolean;
  readonly isBusy: boolean;
  readonly selectFile: (path: string) => void;
  readonly startNewDraft: () => void;
  readonly updateDraftPath: (path: string) => void;
  readonly updateContent: (content: string) => void;
  readonly validateDraft: () => Promise<void>;
  readonly writeDraft: () => Promise<void>;
  readonly deleteFile: () => Promise<void>;
  readonly discardDraft: () => Promise<void>;
  readonly reloadFiles: () => Promise<void>;
};

const initialState: AgentMarkdownEditorState = {
  files: [],
  selectedPath: null,
  draftPath: '',
  content: '',
  status: 'idle',
  message: null,
  error: null,
  validation: null,
  validatedDraft: null,
  hasLocalDraft: false,
  draftPaths: [],
};

const formatUnknownError = (error: unknown): string => formatApiErrorMessage(error, 'Unexpected error.');

const createDefaultDraftPath = (files: readonly AgentMarkdownFileSummary[]): string => {
  const existingPaths = new Set(files.map((file) => file.path));
  let suffix = 1;

  while (existingPaths.has(`engineering/NewAgent${suffix}.md`)) {
    suffix += 1;
  }

  return `engineering/NewAgent${suffix}.md`;
};

const createDraftTemplate = (draftPath: string): string => {
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

const chooseSelectedPath = (
  files: readonly AgentMarkdownFileSummary[],
  currentPath: string | null,
): string | null => {
  if (currentPath !== null && files.some((file) => file.path === currentPath)) {
    return currentPath;
  }

  return files[0]?.path ?? null;
};

const reducer = (
  state: AgentMarkdownEditorState,
  action: AgentMarkdownEditorAction,
): AgentMarkdownEditorState => {
  if (action.type === 'filesLoading') {
    return { ...state, status: 'loading', error: null, message: null };
  }

  if (action.type === 'filesLoaded') {
    return {
      ...state,
      files: action.files,
      selectedPath: chooseSelectedPath(action.files, state.selectedPath),
      status: 'idle',
      error: null,
      draftPaths: action.draftPaths,
    };
  }

  if (action.type === 'fileSelected') {
    return {
      ...state,
      selectedPath: action.path,
      status: 'reading',
      message: null,
      error: null,
    };
  }

  if (action.type === 'fileReading') {
    return { ...state, status: 'reading', error: null, message: null };
  }

  if (action.type === 'fileLoaded') {
    return {
      ...state,
      selectedPath: action.file.path,
      draftPath: action.file.path,
      content: action.content,
      status: 'idle',
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
      status: 'idle',
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
    return { ...state, status: 'validating', error: null, message: null };
  }

  if (action.type === 'validationFinished') {
    return {
      ...state,
      status: 'idle',
      validation: action.validation,
      validatedDraft: action.validatedDraft,
      message: action.validation.ok ? 'Draft validated.' : null,
      error: action.validation.ok ? null : 'Draft validation failed.',
    };
  }

  if (action.type === 'writeStarted') {
    return { ...state, status: 'writing', error: null, message: null };
  }

  if (action.type === 'writeFinished') {
    return {
      ...state,
      files: action.files,
      selectedPath: action.file.path,
      draftPath: action.file.path,
      content: action.file.content,
      status: 'idle',
      message: 'Markdown written.',
      error: null,
      validation: action.file.validation.ok ? action.file.validation : null,
      validatedDraft: null,
      hasLocalDraft: false,
      draftPaths: action.draftPaths,
    };
  }

  if (action.type === 'deleteStarted') {
    return { ...state, status: 'deleting', error: null, message: null };
  }

  if (action.type === 'deleteFinished') {
    return {
      ...state,
      files: action.files,
      selectedPath: action.selectedPath,
      draftPath: '',
      content: '',
      status: 'idle',
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
      status: 'idle',
      message: 'Local draft discarded.',
      error: null,
      validation: null,
      validatedDraft: null,
      hasLocalDraft: action.hasLocalDraft,
      draftPaths: action.draftPaths,
    };
  }

  return {
    ...state,
    status: 'idle',
    error: action.error,
    message: null,
  };
};

const toValidationFailure = (issues: readonly SchemaIssue[]): AgentMarkdownValidationResponse => ({
  ok: false,
  issues,
});

export const useAgentMarkdownEditor = (): AgentMarkdownEditorModel => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const filesQuery = useListAgentMarkdownFilesQuery();
  const [readAgentMarkdownFile] = useLazyReadAgentMarkdownFileQuery();
  const [validateAgentMarkdownDraft] = useValidateAgentMarkdownDraftMutation();
  const [createAgentMarkdownFile] = useCreateAgentMarkdownFileMutation();
  const [updateAgentMarkdownFile] = useUpdateAgentMarkdownFileMutation();
  const [deleteAgentMarkdownFile] = useDeleteAgentMarkdownFileMutation();
  const isBusy = state.status !== 'idle';
  const isExistingPath = state.files.some((file) => file.path === state.draftPath);
  const canWrite =
    state.validation?.ok === true
    && state.validatedDraft?.path === state.draftPath
    && state.validatedDraft?.content === state.content
    && !isBusy;
  const validationIssues = state.validation?.ok === false ? state.validation.issues : [];
  const currentFile = state.files.find((file) => file.path === state.selectedPath);
  const currentFileValidationIssues = currentFile?.validation.ok === false ? currentFile.validation.issues : [];

  const reloadFiles = async (): Promise<void> => {
    dispatch({ type: 'filesLoading' });

    try {
      const response = await filesQuery.refetch().unwrap();
      dispatch({ type: 'filesLoaded', files: response.files, draftPaths: listAgentMarkdownDraftPaths() });
    } catch (error) {
      dispatch({ type: 'operationFailed', error: formatUnknownError(error) });
    }
  };

  useEffect(() => {
    if (filesQuery.isLoading) {
      dispatch({ type: 'filesLoading' });
    }
  }, [filesQuery.isLoading]);

  useEffect(() => {
    if (filesQuery.data !== undefined) {
      dispatch({ type: 'filesLoaded', files: filesQuery.data.files, draftPaths: listAgentMarkdownDraftPaths() });
    }
  }, [filesQuery.data]);

  useEffect(() => {
    if (filesQuery.error !== undefined) {
      dispatch({ type: 'operationFailed', error: formatUnknownError(filesQuery.error) });
    }
  }, [filesQuery.error]);

  useEffect(() => {
    if (state.selectedPath === null) {
      return;
    }

    let isActive = true;

    const loadFile = async (): Promise<void> => {
      dispatch({ type: 'fileReading' });

      try {
        const response = await readAgentMarkdownFile(state.selectedPath ?? '').unwrap();

        if (!isActive) {
          return;
        }

        if (!response.ok) {
          dispatch({ type: 'validationFinished', validation: toValidationFailure(response.issues), validatedDraft: null });
          return;
        }

        const draft = readAgentMarkdownDraft(response.value.path);

        dispatch({
          type: 'fileLoaded',
          file: response.value,
          content: draft?.content ?? response.value.content,
          hasLocalDraft: draft !== null,
          draftPaths: listAgentMarkdownDraftPaths(),
        });
      } catch (error) {
        if (isActive) {
          dispatch({ type: 'operationFailed', error: formatUnknownError(error) });
        }
      }
    };

    void loadFile();

    return () => {
      isActive = false;
    };
  }, [state.selectedPath]);

  const selectFile = (path: string): void => {
    dispatch({ type: 'fileSelected', path });
  };

  const startNewDraft = (): void => {
    const path = createDefaultDraftPath(state.files);
    const content = createDraftTemplate(path);

    writeAgentMarkdownDraft(path, content);
    dispatch({ type: 'newDraftStarted', path, content, draftPaths: listAgentMarkdownDraftPaths() });
  };

  const updateDraftPath = (path: string): void => {
    if (state.draftPath.length > 0 && path.length > 0 && state.draftPath !== path) {
      moveAgentMarkdownDraft(state.draftPath, path, state.content);
    } else if (state.draftPath.length > 0 && path.length === 0) {
      removeAgentMarkdownDraft(state.draftPath);
    } else if (path.length > 0) {
      writeAgentMarkdownDraft(path, state.content);
    }

    dispatch({ type: 'pathChanged', path, draftPaths: listAgentMarkdownDraftPaths() });
  };

  const updateContent = (content: string): void => {
    if (state.draftPath.length > 0) {
      writeAgentMarkdownDraft(state.draftPath, content);
    }

    dispatch({ type: 'contentChanged', content, draftPaths: listAgentMarkdownDraftPaths() });
  };

  const validateDraft = async (): Promise<void> => {
    dispatch({ type: 'validationStarted' });

    try {
      const validation = await validateAgentMarkdownDraft({ path: state.draftPath, content: state.content }).unwrap();
      const validatedDraft = validation.ok ? { path: state.draftPath, content: state.content } : null;

      dispatch({ type: 'validationFinished', validation, validatedDraft });
    } catch (error) {
      dispatch({ type: 'operationFailed', error: formatUnknownError(error) });
    }
  };

  const writeDraft = async (): Promise<void> => {
    if (!canWrite) {
      dispatch({ type: 'operationFailed', error: 'Validate the current draft before writing.' });
      return;
    }

    if (!window.confirm(`Write ${state.draftPath} to packages/agents?`)) {
      return;
    }

    dispatch({ type: 'writeStarted' });

    try {
      const response = isExistingPath
        ? await updateAgentMarkdownFile({ path: state.draftPath, content: state.content }).unwrap()
        : await createAgentMarkdownFile({ path: state.draftPath, content: state.content }).unwrap();

      if (!response.ok) {
        dispatch({ type: 'validationFinished', validation: toValidationFailure(response.issues), validatedDraft: null });
        return;
      }

      removeAgentMarkdownDraft(response.value.path);
      const filesResponse = await filesQuery.refetch().unwrap();

      dispatch({
        type: 'writeFinished',
        file: response.value,
        files: filesResponse.files,
        draftPaths: listAgentMarkdownDraftPaths(),
      });
    } catch (error) {
      dispatch({ type: 'operationFailed', error: formatUnknownError(error) });
    }
  };

  const deleteFile = async (): Promise<void> => {
    if (!isExistingPath) {
      dispatch({ type: 'operationFailed', error: 'Only existing markdown files can be deleted.' });
      return;
    }

    if (!window.confirm(`Delete ${state.draftPath} from packages/agents?`)) {
      return;
    }

    dispatch({ type: 'deleteStarted' });

    try {
      const response = await deleteAgentMarkdownFile({ path: state.draftPath }).unwrap();

      if (!response.ok) {
        dispatch({ type: 'validationFinished', validation: toValidationFailure(response.issues), validatedDraft: null });
        return;
      }

      removeAgentMarkdownDraft(response.value.path);
  const filesResponse = await filesQuery.refetch().unwrap();
      const selectedPath = chooseSelectedPath(filesResponse.files, null);

      dispatch({
        type: 'deleteFinished',
        files: filesResponse.files,
        selectedPath,
        draftPaths: listAgentMarkdownDraftPaths(),
      });
    } catch (error) {
      dispatch({ type: 'operationFailed', error: formatUnknownError(error) });
    }
  };

  const discardDraft = async (): Promise<void> => {
    if (state.draftPath.length === 0) {
      return;
    }

    removeAgentMarkdownDraft(state.draftPath);

    if (state.selectedPath === null) {
      dispatch({ type: 'draftDiscarded', content: '', hasLocalDraft: false, draftPaths: listAgentMarkdownDraftPaths() });
      return;
    }

    dispatch({ type: 'fileReading' });

    try {
      const response = await readAgentMarkdownFile(state.selectedPath).unwrap();

      if (!response.ok) {
        dispatch({ type: 'validationFinished', validation: toValidationFailure(response.issues), validatedDraft: null });
        return;
      }

      dispatch({ type: 'draftDiscarded', content: response.value.content, hasLocalDraft: false, draftPaths: listAgentMarkdownDraftPaths() });
    } catch (error) {
      dispatch({ type: 'operationFailed', error: formatUnknownError(error) });
    }
  };

  return {
    files: state.files,
    selectedPath: state.selectedPath,
    draftPath: state.draftPath,
    content: state.content,
    status: state.status,
    message: state.message,
    error: state.error,
    validation: state.validation,
    validationIssues,
    currentFileValidationIssues,
    hasLocalDraft: state.hasLocalDraft,
    draftPaths: state.draftPaths,
    canWrite,
    isExistingPath,
    isBusy,
    selectFile,
    startNewDraft,
    updateDraftPath,
    updateContent,
    validateDraft,
    writeDraft,
    deleteFile,
    discardDraft,
    reloadFiles,
  };
};