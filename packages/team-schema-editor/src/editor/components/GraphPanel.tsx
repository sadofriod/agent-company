import { useMemo, type ReactElement, type ReactNode } from 'react';
import { Box } from '@mui/material';
import type { Connection, Edge, EdgeTypes, NodeTypes, OnEdgesChange, OnNodesChange } from '@xyflow/react';

import { EditorMode, WorkflowEdgeMode, WorkflowEdgeType } from '../model/types';
import type { TeamSchemaDocument, WorkflowGraphNode } from '../model/types';
import { SchemaRelationEdge } from '../customEdges/SchemaRelationEdge';
import { WithAgentsEdge } from '../customEdges/WithAgents';
import { WithDepartmentsEdge } from '../customEdges/WithDepartments';
import { WithDepartmentsAndDiscussEdge } from '../customEdges/WithDepartmentsAndDiscuss';
import { WorkflowNode } from './WorkflowNode';
import { EdgeConnectionSnackbar } from './graphPanel/EdgeConnectionSnackbar';
import { GraphPanelHeader } from './graphPanel/GraphPanelHeader';
import { LinkModeDialog } from './graphPanel/LinkModeDialog';
import { WorkflowCanvas } from './graphPanel/WorkflowCanvas';
import { WorkflowPalettePanel } from './graphPanel/WorkflowPalettePanel';
import { useGraphPanelActions } from './graphPanel/hooks/useGraphPanelActions';
import { GraphPanelProvider } from './graphPanel/hooks/useGraphPanelContext';
import { useGraphPanelUiState } from './graphPanel/hooks/useGraphPanelUiState';

const nodeTypes: NodeTypes = {
  workflow: WorkflowNode,
};

const edgeTypes: EdgeTypes = {
  [WorkflowEdgeType.SchemaRelation]: SchemaRelationEdge,
  [WorkflowEdgeType.DiscussAgents]: WithAgentsEdge,
  [WorkflowEdgeType.DiscussBroadcast]: WithDepartmentsAndDiscussEdge,
  [WorkflowEdgeType.PipelineHandoff]: WithDepartmentsEdge,
};

type GraphPanelProps = {
  schema: TeamSchemaDocument;
  mode: EditorMode;
  nodes: WorkflowGraphNode[];
  edges: Edge[];
  edgeConnectionError: string | null;
  onNodesChange: OnNodesChange<WorkflowGraphNode>;
  onEdgesChange: OnEdgesChange<Edge>;
  onNodeSelect: (nodeId: string | null) => void;
  onEdgeSelect: (edgeId: string | null) => void;
  onAddWorkflowAgentNode: () => void;
  onAddWorkflowPartNode: () => void;
  onAddWorkflowPipelineNode: () => void;
  onWorkflowConnect: (connection: Connection, mode: WorkflowEdgeMode) => void;
  onClearEdgeConnectionError: () => void;
  highlightedNodeIds?: readonly string[];
  highlightedEdgeIds?: readonly string[];
  inspectorPanel?: ReactNode;
  fillAvailableHeight?: boolean;
};

export const GraphPanel = ({
  schema,
  mode,
  nodes,
  edges,
  edgeConnectionError,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  onEdgeSelect,
  onAddWorkflowAgentNode,
  onAddWorkflowPartNode,
  onAddWorkflowPipelineNode,
  onWorkflowConnect,
  onClearEdgeConnectionError,
  highlightedNodeIds = [],
  highlightedEdgeIds = [],
  inspectorPanel,
  fillAvailableHeight = false,
}: GraphPanelProps): ReactElement => {
  const {
    pendingConnection,
    linkSourceId,
    linkTargetId,
    linkMode,
    updatePendingConnection,
    updateLinkSourceId,
    updateLinkTargetId,
    updateLinkMode,
  } = useGraphPanelUiState();
  const isEditing = mode === EditorMode.Edit;
  const hasRuntimeHighlights = !isEditing && (highlightedNodeIds.length > 0 || highlightedEdgeIds.length > 0);
  const highlightedNodeIdSet = useMemo(() => new Set(highlightedNodeIds), [highlightedNodeIds]);
  const highlightedEdgeIdSet = useMemo(() => new Set(highlightedEdgeIds), [highlightedEdgeIds]);
  const graphNodes = useMemo(() => nodes.map((node) => {
    const runtimeHighlighted = highlightedNodeIdSet.has(node.id);
    const runtimeDimmed = hasRuntimeHighlights && !runtimeHighlighted;

    if (node.data.runtimeHighlighted === runtimeHighlighted && node.data.runtimeDimmed === runtimeDimmed) {
      return node;
    }

    return {
      ...node,
      data: {
        ...node.data,
        runtimeHighlighted,
        runtimeDimmed,
      },
    };
  }), [hasRuntimeHighlights, highlightedNodeIdSet, nodes]);
  const graphEdges = useMemo(() => edges.map((edge) => {
    const runtimeHighlighted = highlightedEdgeIdSet.has(edge.id);
    const runtimeDimmed = hasRuntimeHighlights && !runtimeHighlighted;
    const currentData = (edge.data as Record<string, unknown> | undefined) ?? {};

    if (currentData.runtimeHighlighted === runtimeHighlighted && currentData.runtimeDimmed === runtimeDimmed) {
      return edge;
    }

    return {
      ...edge,
      data: {
        ...currentData,
        runtimeHighlighted,
        runtimeDimmed,
      },
    };
  }), [edges, hasRuntimeHighlights, highlightedEdgeIdSet]);
  const hasInspectorPanel = isEditing && inspectorPanel !== undefined && inspectorPanel !== null;
  const workflowDraftNodeCount = graphNodes.filter((node) => node.data.workflowNodeType !== undefined).length;
  const {
    onConnect,
    onCreateEdge,
    onDialogClose,
    onSelectConnectionMode,
    onWorkflowEditorKeyDown,
    isTextInputTarget,
  } = useGraphPanelActions({
    isEditing,
    nodes: graphNodes,
    edges: graphEdges,
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
  });
  const contextValue = useMemo(() => ({
    isEditing,
    nodes: graphNodes,
    edges: graphEdges,
    linkSourceId,
    linkTargetId,
    linkMode,
    pendingConnection,
    edgeConnectionError,
    onNodesChange,
    onEdgesChange,
    onNodeSelect,
    onEdgeSelect,
    onAddWorkflowAgentNode,
    onAddWorkflowPartNode,
    onAddWorkflowPipelineNode,
    onLinkSourceIdChange: updateLinkSourceId,
    onLinkTargetIdChange: updateLinkTargetId,
    onLinkModeChange: updateLinkMode,
    onConnect,
    onCreateEdge,
    onWorkflowEditorKeyDown,
    isTextInputTarget,
    onDialogClose,
    onSelectConnectionMode,
    onClearEdgeConnectionError,
  }), [
    edgeConnectionError,
    graphEdges,
    graphNodes,
    isEditing,
    isTextInputTarget,
    linkMode,
    linkSourceId,
    linkTargetId,
    onAddWorkflowAgentNode,
    onAddWorkflowPartNode,
    onAddWorkflowPipelineNode,
    onClearEdgeConnectionError,
    onConnect,
    onCreateEdge,
    onDialogClose,
    onEdgesChange,
    onEdgeSelect,
    onNodeSelect,
    onNodesChange,
    onSelectConnectionMode,
    onWorkflowEditorKeyDown,
    pendingConnection,
    updateLinkMode,
    updateLinkSourceId,
    updateLinkTargetId,
  ]);

  return (
    <GraphPanelProvider value={contextValue}>
      <Box
        sx={{
          flex: '1 1 auto',
          minHeight: fillAvailableHeight ? 0 : { xs: 640, xl: 'calc(100vh - 84px)' },
          height: fillAvailableHeight ? '100%' : undefined,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <GraphPanelHeader
          teamName={schema.team_name ?? schema.team_id}
          departmentCount={schema.departments.length}
          agentCount={schema.agents.length}
          linkCount={graphEdges.length}
          draftNodeCount={workflowDraftNodeCount}
        />

        <Box
          sx={{
            flex: '1 1 auto',
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: hasInspectorPanel ? '260px minmax(0, 1fr) minmax(320px, 0.52fr)' : isEditing ? '260px minmax(0, 1fr)' : '1fr',
            },
            bgcolor: '#eef2f6',
          }}
        >
          {isEditing ? <WorkflowPalettePanel /> : null}

          <WorkflowCanvas nodeTypes={nodeTypes} edgeTypes={edgeTypes} />

          {hasInspectorPanel ? (
            <Box
              sx={{
                minWidth: 0,
                minHeight: 0,
                overflow: 'auto',
                borderLeft: { xs: 0, lg: '1px solid #d7dde5' },
                borderTop: { xs: '1px solid #d7dde5', lg: 0 },
                bgcolor: '#fbfcfe',
              }}
            >
              {inspectorPanel}
            </Box>
          ) : null}
        </Box>

        <LinkModeDialog />

        <EdgeConnectionSnackbar />
      </Box>
    </GraphPanelProvider>
  );
};