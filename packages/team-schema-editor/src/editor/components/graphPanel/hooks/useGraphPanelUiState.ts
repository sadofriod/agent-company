import type { Connection } from '@xyflow/react';

import { WorkflowEdgeMode } from '../../../model/types';
import { useAppDispatch, useAppSelector } from '../../../state/core/editorHooks';
import {
  setLinkMode,
  setLinkSourceId,
  setLinkTargetId,
  setPendingConnection,
} from '../../../state/graphPanel/graphPanelUiSlice';

type GraphPanelUiStateModel = {
  pendingConnection: Connection | null;
  linkSourceId: string;
  linkTargetId: string;
  linkMode: WorkflowEdgeMode;
  updatePendingConnection: (connection: Connection | null) => void;
  updateLinkSourceId: (nodeId: string) => void;
  updateLinkTargetId: (nodeId: string) => void;
  updateLinkMode: (mode: WorkflowEdgeMode) => void;
};

export const useGraphPanelUiState = (): GraphPanelUiStateModel => {
  const dispatch = useAppDispatch();
  const pendingConnection = useAppSelector((state) => state.graphPanelUi.pendingConnection);
  const linkSourceId = useAppSelector((state) => state.graphPanelUi.linkSourceId);
  const linkTargetId = useAppSelector((state) => state.graphPanelUi.linkTargetId);
  const linkMode = useAppSelector((state) => state.graphPanelUi.linkMode);

  return {
    pendingConnection,
    linkSourceId,
    linkTargetId,
    linkMode,
    updatePendingConnection: (connection) => {
      dispatch(setPendingConnection(connection));
    },
    updateLinkSourceId: (nodeId) => {
      dispatch(setLinkSourceId(nodeId));
    },
    updateLinkTargetId: (nodeId) => {
      dispatch(setLinkTargetId(nodeId));
    },
    updateLinkMode: (mode) => {
      dispatch(setLinkMode(mode));
    },
  };
};