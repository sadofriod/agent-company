import type { CaseReducer, PayloadAction } from '@reduxjs/toolkit';

import { type DiscussionField, type EditorState, withSchema } from '../core/editorShared';

export const updateDiscussionField: CaseReducer<
  EditorState,
  PayloadAction<{ field: DiscussionField; value: string }>
> = (state, action): void => {
  const schema = {
    ...state.schema,
    discussion_policy: {
      ...state.schema.discussion_policy,
      [action.payload.field]: action.payload.value,
    },
  };

  Object.assign(state, withSchema(state, schema));
};

export const updateDiscussionNumber: CaseReducer<
  EditorState,
  PayloadAction<{ field: 'max_rounds'; value: number }>
> = (state, action): void => {
  const schema = {
    ...state.schema,
    discussion_policy: {
      ...state.schema.discussion_policy,
      [action.payload.field]: Number.isFinite(action.payload.value)
        ? Math.max(1, Math.floor(action.payload.value))
        : state.schema.discussion_policy[action.payload.field],
    },
  };

  Object.assign(state, withSchema(state, schema));
};

export const clearDiscussionSupervisor: CaseReducer<EditorState> = (state): void => {
  const { supervisor_agent_id, ...discussionPolicyWithoutSupervisor } = state.schema.discussion_policy;
  void supervisor_agent_id;

  const schema = {
    ...state.schema,
    discussion_policy: discussionPolicyWithoutSupervisor,
  };

  Object.assign(state, withSchema(state, schema));
  state.selection = { kind: 'team' };
};