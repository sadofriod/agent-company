import { useCallback, useEffect } from 'react';
import type { Connection, Edge, OnEdgesChange, OnNodesChange } from '@xyflow/react';

import { WorkflowEdgeMode } from '../../../model/types';
import type { WorkflowGraphNode } from '../../../model/types';

type UseGraphPanelActionsParams = {
  isEditing: boolean;
  nodes: WorkflowGraphNode[];
  edges: Edge[];
  pendingConnection: Connection | null;
  linkSourceId: string;
  linkTargetId: string;
  linkMode: WorkflowEdgeMode;
  onNodesChange: OnNodesChange<WorkflowGraphNode>;
  onEdgesChange: OnEdgesChange<Edge>;
  onWorkflowConnect: (connection: Connection, mode: WorkflowEdgeMode) => void;
  updatePendingConnection: (connection: Connection | null) => void;
  updateLinkSourceId: (nodeId: string) => void;
  updateLinkTargetId: (nodeId: string) => void;
};

type GraphPanelActionsModel = {
  onConnect: (connection: Connection) => void;
  onCreateEdge: () => void;
  onDialogClose: () => void;
  onSelectConnectionMode: (mode: WorkflowEdgeMode) => void;
  onWorkflowEditorKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  isTextInputTarget: (target: EventTarget | null) => boolean;
};

export const useGraphPanelActions = ({
  isEditing,
  nodes,
  edges,
  pendingConnection,
  linkSourceId,
  linkTargetId,
  linkMode,
  onNodesChange,
  onEdgesChange,
  onWorkflowConnect,
  updatePendingConnection,
  updateLinkSourceId,
  updateLinkTargetId,
}: UseGraphPanelActionsParams): GraphPanelActionsModel => {
  useEffect(() => {
    if (linkSourceId.length > 0 && nodes.some((node) => node.id === linkSourceId)) {
      return;
    }

    updateLinkSourceId(nodes[0]?.id ?? '');
  }, [linkSourceId, nodes, updateLinkSourceId]);

  useEffect(() => {
    if (linkTargetId.length > 0 && nodes.some((node) => node.id === linkTargetId)) {
      return;
    }

    updateLinkTargetId(nodes[1]?.id ?? nodes[0]?.id ?? '');
  }, [linkTargetId, nodes, updateLinkTargetId]);

  const isTextInputTarget = useCallback((target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]') !== null;
  }, []);

  const onConnect = useCallback((connection: Connection): void => {
    if (!isEditing) {
      return;
    }

    updatePendingConnection(connection);
  }, [isEditing, updatePendingConnection]);

  const onDialogClose = useCallback((): void => {
    updatePendingConnection(null);
  }, [updatePendingConnection]);

  const onSelectConnectionMode = useCallback((mode: WorkflowEdgeMode): void => {
    if (pendingConnection !== null) {
      onWorkflowConnect(pendingConnection, mode);
    }

    updatePendingConnection(null);
  }, [onWorkflowConnect, pendingConnection, updatePendingConnection]);

  const onCreateEdge = useCallback((): void => {
    if (linkSourceId.length === 0 || linkTargetId.length === 0) {
      return;
    }

    onWorkflowConnect({ source: linkSourceId, target: linkTargetId, sourceHandle: null, targetHandle: null }, linkMode);
  }, [linkMode, linkSourceId, linkTargetId, onWorkflowConnect]);

  const onWorkflowEditorKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!isEditing || isTextInputTarget(event.target)) {
      return;
    }

    const isSelectAll = (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'a';

    if (isSelectAll) {
      event.preventDefault();
      onNodesChange(nodes.map((node) => ({ id: node.id, type: 'select', selected: true })));
      onEdgesChange(edges.map((edge) => ({ id: edge.id, type: 'select', selected: true })));
      return;
    }

    const isDeleteKey = event.key === 'Delete' || event.key === 'Backspace';

    if (!isDeleteKey || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const selectedNodeIds = nodes.filter((node) => node.selected).map((node) => node.id);
    const selectedEdgeIds = edges.filter((edge) => edge.selected).map((edge) => edge.id);

    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) {
      return;
    }

    event.preventDefault();

    if (selectedNodeIds.length > 0) {
      onNodesChange(selectedNodeIds.map((nodeId) => ({ id: nodeId, type: 'remove' })));
    }

    if (selectedEdgeIds.length > 0) {
      onEdgesChange(selectedEdgeIds.map((edgeId) => ({ id: edgeId, type: 'remove' })));
    }
  }, [edges, isEditing, isTextInputTarget, nodes, onEdgesChange, onNodesChange]);

  return {
    onConnect,
    onCreateEdge,
    onDialogClose,
    onSelectConnectionMode,
    onWorkflowEditorKeyDown,
    isTextInputTarget,
  };
};