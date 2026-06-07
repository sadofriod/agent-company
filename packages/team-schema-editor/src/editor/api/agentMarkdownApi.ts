import type {
  AgentMarkdownDeleteResponse,
  AgentMarkdownFileResponse,
  AgentMarkdownFileSummary,
  AgentMarkdownListResponse,
  AgentMarkdownValidationResponse,
} from '@agents-team/service/agent/markdown';

import { editorApi } from './baseApi';
import {
  AGENT_MARKDOWN_ENDPOINT,
  createCustomError,
  getErrorPayload,
  toAgentMarkdownDeleteResponse,
  toAgentMarkdownFileResponse,
  toAgentMarkdownValidationFailure,
  toAgentMarkdownValidationResponse,
} from './shared';

export const agentMarkdownApi = editorApi.injectEndpoints({
  endpoints: (builder) => ({
    listAgentMarkdownFiles: builder.query<AgentMarkdownListResponse, void>({
      query: () => AGENT_MARKDOWN_ENDPOINT,
      transformResponse: (payload: unknown) => {
        if (
          typeof payload === 'object'
          && payload !== null
          && 'ok' in payload
          && payload.ok === true
          && 'data' in payload
        ) {
          return payload.data as AgentMarkdownListResponse;
        }

        return payload as AgentMarkdownListResponse;
      },
      providesTags: (result) => {
        const fileTags = (result?.files ?? []).map((file: AgentMarkdownFileSummary) => ({
          type: 'AgentMarkdownFile' as const,
          id: file.path,
        }));

        return [{ type: 'AgentMarkdownFile' as const, id: 'LIST' }, ...fileTags];
      },
    }),
    readAgentMarkdownFile: builder.query<AgentMarkdownFileResponse, string>({
      async queryFn(path, _api, _extraOptions, fetchWithBQ) {
        const result = await fetchWithBQ({
          url: `${AGENT_MARKDOWN_ENDPOINT}/read`,
          method: 'POST',
          body: { path },
        });

        if ('error' in result) {
          const errorPayload = getErrorPayload(result);
          const validationFailure = toAgentMarkdownValidationFailure<AgentMarkdownFileResponse>(errorPayload);

          if (validationFailure !== null) {
            return { data: validationFailure };
          }

          return { error: createCustomError(errorPayload, 'Agent Markdown request failed.') };
        }

        return { data: toAgentMarkdownFileResponse(result.data) };
      },
      providesTags: (_result, _error, path) => [{ type: 'AgentMarkdownFile', id: path }],
    }),
    validateAgentMarkdownDraft: builder.mutation<AgentMarkdownValidationResponse, { readonly path: string; readonly content: string }>({
      async queryFn(body, _api, _extraOptions, fetchWithBQ) {
        const result = await fetchWithBQ({
          url: `${AGENT_MARKDOWN_ENDPOINT}/validate`,
          method: 'POST',
          body,
        });

        if ('error' in result) {
          const errorPayload = getErrorPayload(result);
          const validationFailure = toAgentMarkdownValidationFailure<AgentMarkdownValidationResponse>(errorPayload);

          if (validationFailure !== null) {
            return { data: validationFailure };
          }

          return { error: createCustomError(errorPayload, 'Agent Markdown request failed.') };
        }

        return { data: toAgentMarkdownValidationResponse(result.data) };
      },
    }),
    createAgentMarkdownFile: builder.mutation<AgentMarkdownFileResponse, { readonly path: string; readonly content: string }>({
      async queryFn(body, _api, _extraOptions, fetchWithBQ) {
        const result = await fetchWithBQ({
          url: AGENT_MARKDOWN_ENDPOINT,
          method: 'POST',
          body,
        });

        if ('error' in result) {
          const errorPayload = getErrorPayload(result);
          const validationFailure = toAgentMarkdownValidationFailure<AgentMarkdownFileResponse>(errorPayload);

          if (validationFailure !== null) {
            return { data: validationFailure };
          }

          return { error: createCustomError(errorPayload, 'Agent Markdown request failed.') };
        }

        return { data: toAgentMarkdownFileResponse(result.data) };
      },
      invalidatesTags: (_result, _error, { path }) => [
        { type: 'AgentMarkdownFile', id: 'LIST' },
        { type: 'AgentMarkdownFile', id: path },
      ],
    }),
    updateAgentMarkdownFile: builder.mutation<AgentMarkdownFileResponse, { readonly path: string; readonly content: string }>({
      async queryFn(body, _api, _extraOptions, fetchWithBQ) {
        const result = await fetchWithBQ({
          url: AGENT_MARKDOWN_ENDPOINT,
          method: 'PUT',
          body,
        });

        if ('error' in result) {
          const errorPayload = getErrorPayload(result);
          const validationFailure = toAgentMarkdownValidationFailure<AgentMarkdownFileResponse>(errorPayload);

          if (validationFailure !== null) {
            return { data: validationFailure };
          }

          return { error: createCustomError(errorPayload, 'Agent Markdown request failed.') };
        }

        return { data: toAgentMarkdownFileResponse(result.data) };
      },
      invalidatesTags: (_result, _error, { path }) => [
        { type: 'AgentMarkdownFile', id: 'LIST' },
        { type: 'AgentMarkdownFile', id: path },
      ],
    }),
    deleteAgentMarkdownFile: builder.mutation<AgentMarkdownDeleteResponse, { readonly path: string }>({
      async queryFn(body, _api, _extraOptions, fetchWithBQ) {
        const result = await fetchWithBQ({
          url: AGENT_MARKDOWN_ENDPOINT,
          method: 'DELETE',
          body,
        });

        if ('error' in result) {
          const errorPayload = getErrorPayload(result);
          const validationFailure = toAgentMarkdownValidationFailure<AgentMarkdownDeleteResponse>(errorPayload);

          if (validationFailure !== null) {
            return { data: validationFailure };
          }

          return { error: createCustomError(errorPayload, 'Agent Markdown request failed.') };
        }

        return { data: toAgentMarkdownDeleteResponse(result.data) };
      },
      invalidatesTags: (_result, _error, { path }) => [
        { type: 'AgentMarkdownFile', id: 'LIST' },
        { type: 'AgentMarkdownFile', id: path },
      ],
    }),
  }),
});

export const {
  useCreateAgentMarkdownFileMutation,
  useDeleteAgentMarkdownFileMutation,
  useLazyReadAgentMarkdownFileQuery,
  useListAgentMarkdownFilesQuery,
  useReadAgentMarkdownFileQuery,
  useUpdateAgentMarkdownFileMutation,
  useValidateAgentMarkdownDraftMutation,
} = agentMarkdownApi;
