import type { CaseReducer, PayloadAction } from '@reduxjs/toolkit';

import { sampleTeamSchema } from '../../model/sampleTeamSchema';
import type { TeamSchemaDocument } from '../../model/types';
import { formatIssues, type EditorState, validateSchemaDocument, withSchema } from '../core/editorShared';

export const setJsonValue: CaseReducer<EditorState, PayloadAction<string>> = (state, action): void => {
  state.jsonValue = action.payload;
};

export const applyJson: CaseReducer<EditorState> = (state): EditorState => {
  try {
    const nextSchema = JSON.parse(state.jsonValue) as unknown;
    const validation = validateSchemaDocument(nextSchema);

    if (!validation.ok) {
      return {
        ...state,
        parseError: formatIssues(validation.issues),
        validationIssues: [...validation.issues],
      };
    }

    const typedSchema = nextSchema as TeamSchemaDocument;
    return withSchema(state, typedSchema);
  } catch (error) {
    return {
      ...state,
      parseError: error instanceof Error ? error.message : 'Invalid JSON',
      validationIssues: [],
    };
  }
};

export const resetSample: CaseReducer<EditorState> = (state): EditorState => ({
  ...withSchema(state, sampleTeamSchema),
  selection: { kind: 'team' },
});