import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Connection } from '@xyflow/react';

import { WorkflowEdgeMode } from '../../model/types';

type GraphPanelUiState = {
  pendingConnection: Connection | null;
  linkSourceId: string;
  linkTargetId: string;
  linkMode: WorkflowEdgeMode;
};

const initialState: GraphPanelUiState = {
  pendingConnection: null,
  linkSourceId: '',
  linkTargetId: '',
  linkMode: WorkflowEdgeMode.Pipeline,
};

const graphPanelUiSlice = createSlice({
  name: 'graphPanelUi',
  initialState,
  reducers: {
    setPendingConnection: (state, action: PayloadAction<Connection | null>) => {
      state.pendingConnection = action.payload;
    },
    setLinkSourceId: (state, action: PayloadAction<string>) => {
      state.linkSourceId = action.payload;
    },
    setLinkTargetId: (state, action: PayloadAction<string>) => {
      state.linkTargetId = action.payload;
    },
    setLinkMode: (state, action: PayloadAction<WorkflowEdgeMode>) => {
      state.linkMode = action.payload;
    },
  },
});

export const { setPendingConnection, setLinkMode, setLinkSourceId, setLinkTargetId } = graphPanelUiSlice.actions;
export const graphPanelUiReducer = graphPanelUiSlice.reducer;