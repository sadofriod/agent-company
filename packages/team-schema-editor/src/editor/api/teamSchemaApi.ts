import { editorApi } from './baseApi';
import {
  AGENT_GATEWAY_ENDPOINT,
  RUNTIME_PLAN_ENDPOINT,
  TEAM_SCHEMA_BASE,
  TEAM_VALIDATE_ENDPOINT,
  formatFailurePayload,
  isRecord,
  isValidationIssue,
  unwrapEnvelope,
} from './shared';
import type { TeamSchemaDocument, TeamSchemaRecord, ValidationIssue } from '../model/types';

export const teamSchemaApi = editorApi.injectEndpoints({
  endpoints: (builder) => ({
    listTeamSchemaRecords: builder.query<readonly TeamSchemaRecord[], void>({
      query: () => TEAM_SCHEMA_BASE,
      transformResponse: (payload: unknown) => unwrapEnvelope<readonly TeamSchemaRecord[]>(payload),
      providesTags: (result) => {
        if (result === undefined) {
          return [{ type: 'TeamSchemaRecord' as const, id: 'LIST' }];
        }

        return [
          { type: 'TeamSchemaRecord' as const, id: 'LIST' },
          ...result.map((record) => ({ type: 'TeamSchemaRecord' as const, id: record.key })),
        ];
      },
    }),
    getTeamSchema: builder.query<TeamSchemaDocument, string>({
      query: (key) => `${TEAM_SCHEMA_BASE}/${key}`,
      transformResponse: (payload: unknown) => {
        const data = unwrapEnvelope<unknown>(payload);

        if (!isRecord(data) || !isRecord(data.schema)) {
          throw new Error(formatFailurePayload(payload, 'Unable to load team schema.'));
        }

        return data.schema as TeamSchemaDocument;
      },
      providesTags: (_result, _error, key) => [{ type: 'TeamSchema', id: key }],
    }),
    validateTeamSchema: builder.mutation<{ readonly ok: true } | { readonly ok: false; readonly issues: readonly ValidationIssue[] }, TeamSchemaDocument>({
      async queryFn(schema, _api, _extraOptions, fetchWithBQ) {
        const result = await fetchWithBQ({
          url: TEAM_VALIDATE_ENDPOINT,
          method: 'POST',
          body: schema,
        });

        if ('error' in result) {
          const payload = isRecord(result.error) && 'data' in result.error ? result.error.data : null;

          if (isRecord(payload) && isRecord(payload.error) && Array.isArray(payload.error.issues)) {
            return {
              data: {
                ok: false,
                issues: payload.error.issues.filter(isValidationIssue),
              },
            };
          }

          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: formatFailurePayload(payload, 'Unable to validate team schema.'),
              data: payload,
            },
          };
        }

        return { data: { ok: true } };
      },
    }),
    saveTeamSchema: builder.mutation<TeamSchemaDocument, { readonly key: string; readonly schema: TeamSchemaDocument; readonly method: 'POST' | 'PUT' }>({
      query: ({ key, schema, method }) => ({
        url: `${TEAM_SCHEMA_BASE}/${key}`,
        method,
        body: schema,
      }),
      transformResponse: (payload: unknown) => {
        const data = unwrapEnvelope<unknown>(payload);

        if (!isRecord(data) || !isRecord(data.schema)) {
          throw new Error(formatFailurePayload(payload, 'Unable to save team schema.'));
        }

        return data.schema as TeamSchemaDocument;
      },
      invalidatesTags: (_result, _error, { key }) => [
        { type: 'TeamSchemaRecord', id: 'LIST' },
        { type: 'TeamSchema', id: key },
      ],
    }),
    deleteTeamSchema: builder.mutation<void, string>({
      query: (key) => ({
        url: `${TEAM_SCHEMA_BASE}/${key}`,
        method: 'DELETE',
      }),
      transformResponse: () => undefined,
      invalidatesTags: (_result, _error, key) => [
        { type: 'TeamSchemaRecord', id: 'LIST' },
        { type: 'TeamSchema', id: key },
      ],
    }),
    buildRuntimePlan: builder.mutation<unknown, TeamSchemaDocument>({
      query: (schema) => ({
        url: RUNTIME_PLAN_ENDPOINT,
        method: 'POST',
        body: schema,
      }),
      transformResponse: (payload: unknown) => unwrapEnvelope<unknown>(payload),
    }),
    buildAgentGateway: builder.mutation<unknown, TeamSchemaDocument>({
      query: (schema) => ({
        url: AGENT_GATEWAY_ENDPOINT,
        method: 'POST',
        body: schema,
      }),
      transformResponse: (payload: unknown) => unwrapEnvelope<unknown>(payload),
    }),
  }),
});

export const {
  useBuildAgentGatewayMutation,
  useBuildRuntimePlanMutation,
  useDeleteTeamSchemaMutation,
  useGetTeamSchemaQuery,
  useListTeamSchemaRecordsQuery,
  useSaveTeamSchemaMutation,
  useValidateTeamSchemaMutation,
} = teamSchemaApi;
