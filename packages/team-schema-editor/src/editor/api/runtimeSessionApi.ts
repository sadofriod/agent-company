import { editorApi } from './baseApi';
import { RUNTIME_SESSION_BASE, toRuntimeTaskPayload, unwrapEnvelope } from './shared';
import type { RuntimeSessionListResponse, RuntimeSessionSnapshot, RuntimeTaskDraft, TeamSchemaDocument } from '../model/types';

const RUNTIME_SESSIONS_LIST = '/runtime/sessions';

export const runtimeSessionApi = editorApi.injectEndpoints({
  endpoints: (builder) => ({
    listRuntimeSessions: builder.query<RuntimeSessionListResponse, { status?: string; cursor?: string; limit?: number }>({
      query: ({ status, cursor, limit = 20 } = {}) => {
        const params = new URLSearchParams();
        if (status !== undefined) params.set('status', status);
        if (cursor !== undefined) params.set('cursor', cursor);
        params.set('limit', String(limit));
        return `${RUNTIME_SESSIONS_LIST}?${params.toString()}`;
      },
      transformResponse: (payload: unknown) => unwrapEnvelope<RuntimeSessionListResponse>(payload),
      providesTags: ['RuntimeSession'],
    }),
    getRuntimeSession: builder.query<RuntimeSessionSnapshot, string>({
      query: (sessionId) => `${RUNTIME_SESSION_BASE}/${sessionId}`,
      transformResponse: (payload: unknown) => unwrapEnvelope<RuntimeSessionSnapshot>(payload),
      providesTags: (_result, _error, sessionId) => [{ type: 'RuntimeSession', id: sessionId }],
    }),
    startRuntimeSession: builder.mutation<RuntimeSessionSnapshot, { task: RuntimeTaskDraft; team: TeamSchemaDocument }>({
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
  useListRuntimeSessionsQuery,
  useAdvanceRuntimeSessionMutation,
  useGetRuntimeSessionQuery,
  useLazyGetRuntimeSessionQuery,
  usePauseRuntimeSessionMutation,
  useResumeRuntimeSessionMutation,
  useStartRuntimeSessionMutation,
  useTerminateRuntimeSessionMutation,
} = runtimeSessionApi;
