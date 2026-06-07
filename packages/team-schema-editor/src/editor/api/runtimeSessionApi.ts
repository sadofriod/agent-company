import { editorApi } from './baseApi';
import { RUNTIME_SESSION_BASE, toRuntimeTaskPayload, unwrapEnvelope } from './shared';
import type { RuntimeSessionSnapshot, RuntimeTaskDraft, TeamSchemaDocument } from '../model/types';

export const runtimeSessionApi = editorApi.injectEndpoints({
  endpoints: (builder) => ({
    getRuntimeSession: builder.query<RuntimeSessionSnapshot, string>({
      query: (sessionId) => `${RUNTIME_SESSION_BASE}/${sessionId}`,
      transformResponse: (payload: unknown) => unwrapEnvelope<RuntimeSessionSnapshot>(payload),
      providesTags: (_result, _error, sessionId) => [{ type: 'RuntimeSession', id: sessionId }],
    }),
    startRuntimeSession: builder.mutation<RuntimeSessionSnapshot, { readonly task: RuntimeTaskDraft; readonly team: TeamSchemaDocument }>({
      query: ({ task, team }) => ({
        url: RUNTIME_SESSION_BASE,
        method: 'POST',
        body: {
          task: toRuntimeTaskPayload(task),
          team,
        },
      }),
      transformResponse: (payload: unknown) => unwrapEnvelope<RuntimeSessionSnapshot>(payload),
      invalidatesTags: (result) => result === undefined ? [] : [{ type: 'RuntimeSession', id: result.sessionId }],
    }),
    advanceRuntimeSession: builder.mutation<RuntimeSessionSnapshot, string>({
      query: (sessionId) => ({
        url: `${RUNTIME_SESSION_BASE}/${sessionId}/advance`,
        method: 'POST',
      }),
      transformResponse: (payload: unknown) => unwrapEnvelope<RuntimeSessionSnapshot>(payload),
      invalidatesTags: (_result, _error, sessionId) => [{ type: 'RuntimeSession', id: sessionId }],
    }),
    pauseRuntimeSession: builder.mutation<RuntimeSessionSnapshot, string>({
      query: (sessionId) => ({
        url: `${RUNTIME_SESSION_BASE}/${sessionId}/pause`,
        method: 'POST',
      }),
      transformResponse: (payload: unknown) => unwrapEnvelope<RuntimeSessionSnapshot>(payload),
      invalidatesTags: (_result, _error, sessionId) => [{ type: 'RuntimeSession', id: sessionId }],
    }),
    resumeRuntimeSession: builder.mutation<RuntimeSessionSnapshot, string>({
      query: (sessionId) => ({
        url: `${RUNTIME_SESSION_BASE}/${sessionId}/resume`,
        method: 'POST',
      }),
      transformResponse: (payload: unknown) => unwrapEnvelope<RuntimeSessionSnapshot>(payload),
      invalidatesTags: (_result, _error, sessionId) => [{ type: 'RuntimeSession', id: sessionId }],
    }),
    terminateRuntimeSession: builder.mutation<RuntimeSessionSnapshot, string>({
      query: (sessionId) => ({
        url: `${RUNTIME_SESSION_BASE}/${sessionId}/terminate`,
        method: 'POST',
      }),
      transformResponse: (payload: unknown) => unwrapEnvelope<RuntimeSessionSnapshot>(payload),
      invalidatesTags: (_result, _error, sessionId) => [{ type: 'RuntimeSession', id: sessionId }],
    }),
  }),
});

export const {
  useAdvanceRuntimeSessionMutation,
  useGetRuntimeSessionQuery,
  useLazyGetRuntimeSessionQuery,
  usePauseRuntimeSessionMutation,
  useResumeRuntimeSessionMutation,
  useStartRuntimeSessionMutation,
  useTerminateRuntimeSessionMutation,
} = runtimeSessionApi;
