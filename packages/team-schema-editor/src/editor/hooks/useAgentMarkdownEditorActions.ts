import { formatApiErrorMessage } from '../api/shared';
import type { Dispatch } from 'react';
import {
  listAgentMarkdownDraftPaths,
  moveAgentMarkdownDraft,
  removeAgentMarkdownDraft,
  writeAgentMarkdownDraft,
} from '../agentMarkdown/agentMarkdownDraftStorage';
import {
  chooseSelectedPath,
  createDefaultDraftPath,
  createDraftTemplate,
  toValidationFailure,
} from './helper/agentMarkdownEditor.state';
import type { AgentMarkdownEditorAction, AgentMarkdownEditorState } from './helper/agentMarkdownEditor.state';

const formatUnknownError = (error: unknown): string => formatApiErrorMessage(error, 'Unexpected error.');

type ActionDeps = {
  state: AgentMarkdownEditorState;
  dispatch: Dispatch<AgentMarkdownEditorAction>;
  filesQuery: ReturnType<typeof import('../api/agentMarkdownApi').useListAgentMarkdownFilesQuery>;
  readAgentMarkdownFile: ReturnType<typeof import('../api/agentMarkdownApi').useLazyReadAgentMarkdownFileQuery>[0];
  validateAgentMarkdownDraft: ReturnType<typeof import('../api/agentMarkdownApi').useValidateAgentMarkdownDraftMutation>[0];
  createAgentMarkdownFile: ReturnType<typeof import('../api/agentMarkdownApi').useCreateAgentMarkdownFileMutation>[0];
  updateAgentMarkdownFile: ReturnType<typeof import('../api/agentMarkdownApi').useUpdateAgentMarkdownFileMutation>[0];
  deleteAgentMarkdownFile: ReturnType<typeof import('../api/agentMarkdownApi').useDeleteAgentMarkdownFileMutation>[0];
  isExistingPath: boolean;
  canWrite: boolean;
};

const useLocalActions = ({ state, dispatch }: Pick<ActionDeps, 'state' | 'dispatch'>) => {
  const selectFile = (path: string): void => dispatch({ type: 'fileSelected', path });

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

  return { selectFile, startNewDraft, updateDraftPath, updateContent };
};

const buildValidateDraft = ({ state, dispatch, validateAgentMarkdownDraft }: ActionDeps) => async (): Promise<void> => {
  dispatch({ type: 'validationStarted' });

  try {
    const validation = await validateAgentMarkdownDraft({ path: state.draftPath, content: state.content }).unwrap();
    const validatedDraft = validation.ok ? { path: state.draftPath, content: state.content } : null;
    dispatch({ type: 'validationFinished', validation, validatedDraft });
  } catch (error) {
    dispatch({ type: 'operationFailed', error: formatUnknownError(error) });
  }
};

const buildWriteDraft = ({
  state,
  dispatch,
  filesQuery,
  createAgentMarkdownFile,
  updateAgentMarkdownFile,
  isExistingPath,
  canWrite,
}: ActionDeps) => async (): Promise<void> => {
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
    dispatch({ type: 'writeFinished', file: response.value, files: filesResponse.files, draftPaths: listAgentMarkdownDraftPaths() });
  } catch (error) {
    dispatch({ type: 'operationFailed', error: formatUnknownError(error) });
  }
};

const buildDeleteFile = ({ state, dispatch, filesQuery, deleteAgentMarkdownFile, isExistingPath }: ActionDeps) => async (): Promise<void> => {
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
    dispatch({ type: 'deleteFinished', files: filesResponse.files, selectedPath, draftPaths: listAgentMarkdownDraftPaths() });
  } catch (error) {
    dispatch({ type: 'operationFailed', error: formatUnknownError(error) });
  }
};

const buildDiscardDraft = ({ state, dispatch, readAgentMarkdownFile }: ActionDeps) => async (): Promise<void> => {
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

const useRemoteActions = ({
  ...deps
}: ActionDeps) => {
  const validateDraft = buildValidateDraft(deps);
  const writeDraft = buildWriteDraft(deps);
  const deleteFile = buildDeleteFile(deps);
  const discardDraft = buildDiscardDraft(deps);

  return { validateDraft, writeDraft, deleteFile, discardDraft };
};

export const useAgentMarkdownEditorActions = (deps: ActionDeps) => {
  const localActions = useLocalActions(deps);
  const remoteActions = useRemoteActions(deps);

  return { ...localActions, ...remoteActions };
};
