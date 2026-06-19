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
  onAddWorkflowAgentNode: () => void;
  onAddWorkflowPartNode: () => void;
  onAddWorkflowPipelineNode: () => void;
  onWorkflowConnect: (connection: Connection, mode: WorkflowEdgeMode) => void;
  onClearEdgeConnectionError: () => void;
  inspectorPanel?: ReactNode;
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
  onAddWorkflowAgentNode,
  onAddWorkflowPartNode,
  onAddWorkflowPipelineNode,
  onWorkflowConnect,
  onClearEdgeConnectionError,
  inspectorPanel,
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
  const hasInspectorPanel = isEditing && inspectorPanel !== undefined && inspectorPanel !== null;
  const workflowDraftNodeCount = nodes.filter((node) => node.data.workflowNodeType !== undefined).length;
  const {
    onConnect,
    onCreateEdge,
    onDialogClose,
    onSelectConnectionMode,
    onWorkflowEditorKeyDown,
    isTextInputTarget,
  } = useGraphPanelActions({
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
  });

  const contextValue = useMemo(() => ({
    isEditing,
    nodes,
    edges,
    linkSourceId,
    linkTargetId,
    linkMode,
    pendingConnection,
    edgeConnectionError,
    onNodesChange,
    onEdgesChange,
    onNodeSelect,
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
    edges,
    isEditing,
    isTextInputTarget,
    linkMode,
    linkSourceId,
    linkTargetId,
    nodes,
    onAddWorkflowAgentNode,
    onAddWorkflowPartNode,
    onAddWorkflowPipelineNode,
    onClearEdgeConnectionError,
    onConnect,
    onCreateEdge,
    onDialogClose,
    onEdgesChange,
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
      <Box sx={{ flex: '1 1 auto', minHeight: { xs: 640, xl: 'calc(100vh - 84px)' }, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <GraphPanelHeader
          teamName={schema.team_name ?? schema.team_id}
          departmentCount={schema.departments.length}
          agentCount={schema.agents.length}
          linkCount={edges.length}
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