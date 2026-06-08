import { useReducer } from 'react';

import {
  useCreateAgentMarkdownFileMutation,
  useDeleteAgentMarkdownFileMutation,
  useLazyReadAgentMarkdownFileQuery,
  useListAgentMarkdownFilesQuery,
  useUpdateAgentMarkdownFileMutation,
  useValidateAgentMarkdownDraftMutation,
} from '../api/agentMarkdownApi';
import { initialState, reducer } from './helper/agentMarkdownEditor.state';
import type { AgentMarkdownEditorModel } from './helper/agentMarkdownEditor.state';
import { useAgentMarkdownEditorActions } from './useAgentMarkdownEditorActions';
import { useAgentMarkdownEditorEffects } from './useAgentMarkdownEditorEffects';

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
  const canWrite = state.validation?.ok === true
    && state.validatedDraft?.path === state.draftPath
    && state.validatedDraft?.content === state.content
    && !isBusy;

  const { reloadFiles } = useAgentMarkdownEditorEffects({ state, dispatch, filesQuery, readAgentMarkdownFile });
  const actions = useAgentMarkdownEditorActions({
    state,
    dispatch,
    filesQuery,
    readAgentMarkdownFile,
    validateAgentMarkdownDraft,
    createAgentMarkdownFile,
    updateAgentMarkdownFile,
    deleteAgentMarkdownFile,
    isExistingPath,
    canWrite,
  });

  const validationIssues = state.validation?.ok === false ? state.validation.issues : [];
  const currentFile = state.files.find((file) => file.path === state.selectedPath);
  const currentFileValidationIssues = currentFile?.validation.ok === false ? currentFile.validation.issues : [];

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
    ...actions,
    reloadFiles,
  };
};
