import { useEffect } from 'react';
import type { Dispatch } from 'react';

import { formatApiErrorMessage } from '../api/shared';
import { listAgentMarkdownDraftPaths, readAgentMarkdownDraft } from '../agentMarkdown/agentMarkdownDraftStorage';
import { toValidationFailure } from './helper/agentMarkdownEditor.state';
import type { AgentMarkdownEditorAction, AgentMarkdownEditorState } from './helper/agentMarkdownEditor.state';

const formatUnknownError = (error: unknown): string => formatApiErrorMessage(error, 'Unexpected error.');

type EffectsDeps = {
  state: AgentMarkdownEditorState;
  dispatch: Dispatch<AgentMarkdownEditorAction>;
  filesQuery: ReturnType<typeof import('../api/agentMarkdownApi').useListAgentMarkdownFilesQuery>;
  readAgentMarkdownFile: ReturnType<typeof import('../api/agentMarkdownApi').useLazyReadAgentMarkdownFileQuery>[0];
};

export const useAgentMarkdownEditorEffects = ({
  state,
  dispatch,
  filesQuery,
  readAgentMarkdownFile,
}: EffectsDeps): { reloadFiles: () => Promise<void> } => {
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
  }, [dispatch, filesQuery.isLoading]);

  useEffect(() => {
    if (filesQuery.data !== undefined) {
      dispatch({ type: 'filesLoaded', files: filesQuery.data.files, draftPaths: listAgentMarkdownDraftPaths() });
    }
  }, [dispatch, filesQuery.data]);

  useEffect(() => {
    if (filesQuery.error !== undefined) {
      dispatch({ type: 'operationFailed', error: formatUnknownError(filesQuery.error) });
    }
  }, [dispatch, filesQuery.error]);

  useEffect(() => {
    const selectedPath = state.selectedPath;

    if (selectedPath === null) {
      return;
    }

    let isActive = true;

    const loadFile = async (): Promise<void> => {
      dispatch({ type: 'fileReading' });

      try {
        const response = await readAgentMarkdownFile(selectedPath).unwrap();

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
  }, [dispatch, readAgentMarkdownFile, state.selectedPath]);

  return { reloadFiles };
};
