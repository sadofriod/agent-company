import { createContext, useContext, type ReactNode } from 'react';
import type { Connection, Edge, OnEdgesChange, OnNodesChange } from '@xyflow/react';

import { WorkflowEdgeMode } from '../../../model/types';
import type { WorkflowGraphNode } from '../../../model/types';

type GraphPanelContextValue = {
  isEditing: boolean;
  nodes: WorkflowGraphNode[];
  edges: Edge[];
  linkSourceId: string;
  linkTargetId: string;
  linkMode: WorkflowEdgeMode;
  pendingConnection: Connection | null;
  edgeConnectionError: string | null;
  onNodesChange: OnNodesChange<WorkflowGraphNode>;
  onEdgesChange: OnEdgesChange<Edge>;
  onNodeSelect: (nodeId: string | null) => void;
  onAddWorkflowAgentNode: () => void;
  onAddWorkflowPartNode: () => void;
  onAddWorkflowPipelineNode: () => void;
  onLinkSourceIdChange: (value: string) => void;
  onLinkTargetIdChange: (value: string) => void;
  onLinkModeChange: (value: WorkflowEdgeMode) => void;
  onConnect: (connection: Connection) => void;
  onCreateEdge: () => void;
  onWorkflowEditorKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  isTextInputTarget: (target: EventTarget | null) => boolean;
  onDialogClose: () => void;
  onSelectConnectionMode: (mode: WorkflowEdgeMode) => void;
  onClearEdgeConnectionError: () => void;
};

const GraphPanelContext = createContext<GraphPanelContextValue | null>(null);

type GraphPanelProviderProps = {
  value: GraphPanelContextValue;
  children: ReactNode;
};

export const GraphPanelProvider = ({ value, children }: GraphPanelProviderProps): ReactNode => (
  <GraphPanelContext.Provider value={value}>{children}</GraphPanelContext.Provider>
);

export const useGraphPanelContext = (): GraphPanelContextValue => {
  const context = useContext(GraphPanelContext);

  if (context === null) {
    throw new Error('useGraphPanelContext must be used inside GraphPanelProvider');
  }

  return context;
};