import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const editorApi = createApi({
  reducerPath: 'editorApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '',
  }),
  tagTypes: ['TeamSchema', 'TeamSchemaRecord', 'RuntimeSession', 'AgentMarkdownFile'],
  endpoints: () => ({}),
});
