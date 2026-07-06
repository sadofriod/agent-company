import type { CaseReducer, PayloadAction } from '@reduxjs/toolkit';

import type { TeamSchemaDocument } from '../../model/types';
import type { WorkflowLayoutDocument } from '../../model/types';
import { SchemaLoadStatus, SchemaServiceStatus, type EditorState, withSchema } from '../core/editorShared';

type SchemaServiceKeysPayload = {
  selectedSchemaKey: string | null;
  draftSchemaKey: string;
  resolvedInitialSchema?: boolean;
};

export const startSchemaLoad: CaseReducer<EditorState> = (state): void => {
  state.schemaLoadStatus = SchemaLoadStatus.Loading;
  state.schemaLoadError = null;
};

export const schemaLoadSucceeded: CaseReducer<EditorState, PayloadAction<TeamSchemaDocument>> = (state, action): void => {
  Object.assign(state, withSchema(state, action.payload));
  state.schemaLoadStatus = SchemaLoadStatus.Ready;
  state.schemaLoadError = null;
  state.selection = { kind: 'team' };
  state.schemaDocumentRevision += 1;
};

export const schemaLoadFailed: CaseReducer<EditorState, PayloadAction<string>> = (state, action): void => {
  state.schemaLoadStatus = SchemaLoadStatus.Error;
  state.schemaLoadError = action.payload;
};

export const setSchemaServiceKeys: CaseReducer<EditorState, PayloadAction<SchemaServiceKeysPayload>> = (state, action): void => {
  state.selectedSchemaKey = action.payload.selectedSchemaKey;
  state.draftSchemaKey = action.payload.draftSchemaKey;
  state.resolvedInitialSchema = action.payload.resolvedInitialSchema ?? true;
  state.schemaServiceStatus = SchemaServiceStatus.Idle;
  state.schemaServiceError = null;
  state.schemaServiceMessage = null;
};

export const setDraftSchemaKey: CaseReducer<EditorState, PayloadAction<string>> = (state, action): void => {
  state.draftSchemaKey = action.payload;
  state.schemaServiceStatus = SchemaServiceStatus.Idle;
  state.schemaServiceError = null;
  state.schemaServiceMessage = null;
};

export const setSchemaServiceStatus: CaseReducer<EditorState, PayloadAction<SchemaServiceStatus>> = (state, action): void => {
  state.schemaServiceStatus = action.payload;
  state.schemaServiceError = null;
  state.schemaServiceMessage = null;
};

export const setSchemaServiceError: CaseReducer<EditorState, PayloadAction<string>> = (state, action): void => {
  state.schemaServiceStatus = SchemaServiceStatus.Error;
  state.schemaServiceError = action.payload;
  state.schemaServiceMessage = null;
};

export const setSchemaServiceMessage: CaseReducer<EditorState, PayloadAction<string>> = (state, action): void => {
  state.schemaServiceStatus = SchemaServiceStatus.Idle;
  state.schemaServiceMessage = action.payload;
  state.schemaServiceError = null;
};

export const clearSchemaServiceFeedback: CaseReducer<EditorState> = (state): void => {
  state.schemaServiceStatus = SchemaServiceStatus.Idle;
  state.schemaServiceError = null;
  state.schemaServiceMessage = null;
};

export const updateWorkflowLayout: CaseReducer<EditorState, PayloadAction<WorkflowLayoutDocument>> = (state, action): void => {
  state.schema = {
    ...state.schema,
    layout: action.payload,
  };
};