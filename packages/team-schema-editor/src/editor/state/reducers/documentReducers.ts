import type { CaseReducer, PayloadAction } from '@reduxjs/toolkit';

import type { TeamSchemaDocument } from '../../model/types';
import { SchemaLoadStatus, type EditorState, withSchema } from '../core/editorShared';

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