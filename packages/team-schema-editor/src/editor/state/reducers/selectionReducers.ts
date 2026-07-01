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

  if (nodeId === 'goal') {
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

  if (nodeId.startsWith('workflow-agent:') || nodeId.startsWith('workflow-part:') || nodeId.startsWith('workflow-pipeline:')) {
    state.selection = { kind: 'workflowNode', nodeId };
    return;
  }

  if (nodeId === 'discussion') {
    state.selection = { kind: 'discussion' };
    return;
  }

  if (nodeId === 'memory' || nodeId.startsWith('memory:')) {
    state.selection = { kind: 'memory' };
  }
};