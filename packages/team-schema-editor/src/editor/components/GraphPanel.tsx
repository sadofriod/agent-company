import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Background, Controls, MiniMap, ReactFlow } from '@xyflow/react';
import type { Connection, Edge, EdgeTypes, NodeTypes, OnEdgesChange, OnNodesChange } from '@xyflow/react';
import { Bot, GitBranch, Layers } from 'lucide-react';

import { EditorMode, WorkflowEdgeMode, WorkflowEdgeType } from '../model/types';
import type { TeamSchemaDocument, WorkflowGraphNode } from '../model/types';
import { SchemaRelationEdge } from '../customEdges/SchemaRelationEdge';
import { WithAgentsEdge } from '../customEdges/WithAgents';
import { WithDepartmentsEdge } from '../customEdges/WithDepartments';
import { WithDepartmentsAndDiscussEdge } from '../customEdges/WithDepartmentsAndDiscuss';
import { WorkflowNode } from './WorkflowNode';

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
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [linkSourceId, setLinkSourceId] = useState('');
  const [linkTargetId, setLinkTargetId] = useState('');
  const [linkMode, setLinkMode] = useState<WorkflowEdgeMode>(WorkflowEdgeMode.Pipeline);
  const isEditing = mode === EditorMode.Edit;
  const hasInspectorPanel = isEditing && inspectorPanel !== undefined && inspectorPanel !== null;
  const workflowDraftNodeCount = nodes.filter((node) => node.data.workflowNodeType !== undefined).length;
  const connectableNodeOptions = nodes.map((node) => (
    <MenuItem key={node.id} value={node.id}>
      {node.data.nodeName}
    </MenuItem>
  ));
  const graphStats = [
    <Chip key="departments" size="small" label={`${schema.departments.length} departments`} sx={{ borderRadius: 0.75, fontWeight: 750 }} />,
    <Chip key="agents" size="small" label={`${schema.agents.length} agents`} sx={{ borderRadius: 0.75, fontWeight: 750 }} />,
    <Chip key="links" size="small" label={`${edges.length} links`} sx={{ borderRadius: 0.75, fontWeight: 750 }} />,
    <Chip key="draft" size="small" color="secondary" variant="outlined" label={`${workflowDraftNodeCount} draft nodes`} sx={{ borderRadius: 0.75, fontWeight: 750 }} />,
  ];
  const handleConnect = (connection: Connection): void => {
    if (!isEditing) {
      return;
    }

    setPendingConnection(connection);
  };
  const handleConnectionModeSelect = (connectionMode: WorkflowEdgeMode): void => {
    if (pendingConnection !== null) {
      onWorkflowConnect(pendingConnection, connectionMode);
    }

    setPendingConnection(null);
  };
  const handleManualWorkflowConnect = (): void => {
    if (linkSourceId.length === 0 || linkTargetId.length === 0) {
      return;
    }

    onWorkflowConnect({ source: linkSourceId, target: linkTargetId, sourceHandle: null, targetHandle: null }, linkMode);
  };

  useEffect(() => {
    if (linkSourceId.length > 0 && nodes.some((node) => node.id === linkSourceId)) {
      return;
    }

    setLinkSourceId(nodes[0]?.id ?? '');
  }, [linkSourceId, nodes]);

  useEffect(() => {
    if (linkTargetId.length > 0 && nodes.some((node) => node.id === linkTargetId)) {
      return;
    }

    setLinkTargetId(nodes[1]?.id ?? nodes[0]?.id ?? '');
  }, [linkTargetId, nodes]);

  return (
    <Paper sx={{ minHeight: { xs: 640, xl: 'calc(100vh - 122px)' }, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', lg: 'center' },
          flexDirection: { xs: 'column', lg: 'row' },
          justifyContent: 'space-between',
          gap: 1.5,
          px: 1.5,
          py: 1.25,
          borderBottom: '1px solid #d7dde5',
          bgcolor: '#ffffff',
        }}
      >
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.68rem', fontWeight: 850, letterSpacing: 0 }}>
            Flow Editor
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 850, lineHeight: 1.15, wordBreak: 'break-word' }}>
            {schema.team_name ?? schema.team_id}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: { xs: 'flex-start', lg: 'flex-end' } }}>
          {graphStats}
        </Stack>
      </Box>

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
        {isEditing ? (
          <Box
            sx={{
              borderRight: { xs: 0, lg: '1px solid #d7dde5' },
              borderBottom: { xs: '1px solid #d7dde5', lg: 0 },
              bgcolor: '#fbfcfe',
              p: 1.25,
              display: 'grid',
              alignContent: 'start',
              gap: 1.25,
            }}
          >
            <Stack spacing={0.5}>
              <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.68rem', fontWeight: 850, letterSpacing: 0 }}>
                Palette
              </Typography>
              <Typography sx={{ color: '#344054', fontSize: '0.82rem', fontWeight: 750 }}>Workflow blocks</Typography>
            </Stack>
            <Stack spacing={0.75}>
              <Button variant="outlined" color="secondary" startIcon={<Bot size={16} />} onClick={onAddWorkflowAgentNode} fullWidth>
                Agent node
              </Button>
              <Button variant="outlined" color="secondary" startIcon={<Layers size={16} />} onClick={onAddWorkflowPartNode} fullWidth>
                Part node
              </Button>
              <Button variant="contained" color="warning" startIcon={<GitBranch size={16} />} onClick={onAddWorkflowPipelineNode} fullWidth>
                Pipeline node
              </Button>
            </Stack>
            <Stack spacing={0.75}>
              <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.68rem', fontWeight: 850, letterSpacing: 0 }}>
                Link
              </Typography>
              <TextField select fullWidth size="small" label="Source" value={linkSourceId} onChange={(event) => setLinkSourceId(event.target.value)}>
                {connectableNodeOptions}
              </TextField>
              <TextField select fullWidth size="small" label="Target" value={linkTargetId} onChange={(event) => setLinkTargetId(event.target.value)}>
                {connectableNodeOptions}
              </TextField>
              <TextField select fullWidth size="small" label="Edge Type" value={linkMode} onChange={(event) => setLinkMode(event.target.value as WorkflowEdgeMode)}>
                <MenuItem value={WorkflowEdgeMode.Discuss}>Discuss · peers</MenuItem>
                <MenuItem value={WorkflowEdgeMode.DiscussBroadcast}>Discuss · broadcast</MenuItem>
                <MenuItem value={WorkflowEdgeMode.Pipeline}>Pipeline</MenuItem>
              </TextField>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<GitBranch size={16} />}
                onClick={handleManualWorkflowConnect}
                disabled={linkSourceId.length === 0 || linkTargetId.length === 0}
                fullWidth
              >
                Create edge
              </Button>
            </Stack>
          </Box>
        ) : null}

        <Box sx={{ position: 'relative', minHeight: { xs: 520, md: 620 }, overflow: 'hidden' }}>
          {!isEditing ? (
            <Box
              sx={{
                position: 'absolute',
                zIndex: 5,
                top: 12,
                left: 12,
                border: '1px solid #d7dde5',
                borderRadius: 1,
                bgcolor: 'rgba(255, 255, 255, 0.92)',
                color: '#344054',
                fontSize: '0.76rem',
                fontWeight: 750,
                px: 1,
                py: 0.65,
              }}
            >
              Run view
            </Box>
          ) : null}
          <ReactFlow
            className="flow-workbench"
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_event, node) => onNodeSelect(node.id)}
            onConnect={handleConnect}
            nodesConnectable={isEditing}
            nodesDraggable={isEditing}
            elementsSelectable
            panOnScroll
            snapToGrid
            snapGrid={[16, 16]}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.35}
            maxZoom={1.35}
            connectionLineStyle={{ stroke: '#d96c3f', strokeWidth: 2, strokeDasharray: '6 4' }}
          >
            <MiniMap pannable zoomable maskColor="rgba(238, 242, 246, 0.72)" />
            <Controls />
            <Background gap={24} size={1} color="#cfd7e3" />
          </ReactFlow>
        </Box>

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

      <Dialog open={pendingConnection !== null} onClose={() => setPendingConnection(null)} fullWidth maxWidth="xs">
        <DialogTitle>Choose link mode</DialogTitle>
        <DialogContent>
          <Stack spacing={1}>
            <Typography color="text.secondary" sx={{ lineHeight: 1.5 }}>
              Pick how this connection should be interpreted by the runtime.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              <strong>Discuss · peers</strong> — multi-agent peer discussion (bidirectional, both ends speak).
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              <strong>Discuss · broadcast</strong> — emit a discussion's resolved output to an Agent or Pipeline.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              <strong>Pipeline</strong> — directed handoff. Pipeline children must form a DAG; cycles are rejected.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          <Button onClick={() => setPendingConnection(null)}>Cancel</Button>
          <Button color="secondary" onClick={() => handleConnectionModeSelect(WorkflowEdgeMode.Discuss)}>Discuss · peers</Button>
          <Button color="secondary" onClick={() => handleConnectionModeSelect(WorkflowEdgeMode.DiscussBroadcast)}>Discuss · broadcast</Button>
          <Button variant="contained" color="warning" onClick={() => handleConnectionModeSelect(WorkflowEdgeMode.Pipeline)}>Pipeline</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={edgeConnectionError !== null}
        autoHideDuration={5000}
        onClose={onClearEdgeConnectionError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={onClearEdgeConnectionError} severity="warning" variant="filled" sx={{ width: '100%' }}>
          {edgeConnectionError ?? ''}
        </Alert>
      </Snackbar>
    </Paper>
  );
};