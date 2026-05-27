import type { CaseReducer, PayloadAction } from '@reduxjs/toolkit';

import type { EditorState } from '../core/editorShared';

export const selectNode: CaseReducer<EditorState, PayloadAction<string | null>> = (state, action): void => {
  const nodeId = action.payload;

  if (nodeId === null) {
    return;
  }

  if (nodeId === 'team') {
    state.selection = { kind: 'team' };
    return;
  }

  if (nodeId.startsWith('department:')) {
    state.selection = { kind: 'department', departmentId: nodeId.replace('department:', '') };
    return;
  }

  if (nodeId.startsWith('agent:')) {
    state.selection = { kind: 'agent', agentId: nodeId.replace('agent:', '') };
    return;
  }

  if (nodeId === 'discussion') {
    state.selection = { kind: 'discussion' };
    return;
  }

  if (nodeId === 'pipeline') {
    state.selection = { kind: 'pipeline' };
    return;
  }

  if (nodeId === 'review') {
    state.selection = { kind: 'review' };
    return;
  }

  if (nodeId === 'memory') {
    state.selection = { kind: 'memory' };
  }
};