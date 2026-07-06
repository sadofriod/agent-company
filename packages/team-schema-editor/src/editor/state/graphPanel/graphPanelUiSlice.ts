import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Connection } from '@xyflow/react';

import { WorkflowEdgeMode } from '../../model/types';

type GraphPanelUiState = {
  pendingConnection: Connection | null;
  linkSourceId: string;
  linkTargetId: string;
  linkMode: WorkflowEdgeMode;
  edgeConnectionError: string | null;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
};

const initialState: GraphPanelUiState = {
  pendingConnection: null,
  linkSourceId: '',
  linkTargetId: '',
  linkMode: WorkflowEdgeMode.Pipeline,
  edgeConnectionError: null,
  selectedNodeIds: [],
  selectedEdgeIds: [],
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
    setEdgeConnectionError: (state, action: PayloadAction<string | null>) => {
      state.edgeConnectionError = action.payload;
    },
    setSelectedNodeIds: (state, action: PayloadAction<string[]>) => {
      state.selectedNodeIds = action.payload;
    },
    setSelectedEdgeIds: (state, action: PayloadAction<string[]>) => {
      state.selectedEdgeIds = action.payload;
    },
  },
});

export const {
  setEdgeConnectionError,
  setPendingConnection,
  setLinkMode,
  setLinkSourceId,
  setLinkTargetId,
  setSelectedNodeIds,
  setSelectedEdgeIds,
} = graphPanelUiSlice.actions;
export const graphPanelUiReducer = graphPanelUiSlice.reducer;