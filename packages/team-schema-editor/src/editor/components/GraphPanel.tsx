import { useState, type ReactElement } from 'react';
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
import type { Connection, Edge, EdgeTypes, NodeTypes, OnNodesChange } from '@xyflow/react';

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
  selectedWorkflowAgentId: string;
  edgeConnectionError: string | null;
  onNodesChange: OnNodesChange<WorkflowGraphNode>;
  onNodeSelect: (nodeId: string | null) => void;
  onWorkflowAgentChange: (agentId: string) => void;
  onAddWorkflowAgentNode: (agentId: string) => void;
  onAddWorkflowPartNode: () => void;
  onAddWorkflowPipelineNode: () => void;
  onWorkflowConnect: (connection: Connection, mode: WorkflowEdgeMode) => void;
  onClearEdgeConnectionError: () => void;
};

export const GraphPanel = ({
  schema,
  mode,
  nodes,
  edges,
  selectedWorkflowAgentId,
  edgeConnectionError,
  onNodesChange,
  onNodeSelect,
  onWorkflowAgentChange,
  onAddWorkflowAgentNode,
  onAddWorkflowPartNode,
  onAddWorkflowPipelineNode,
  onWorkflowConnect,
  onClearEdgeConnectionError,
}: GraphPanelProps): ReactElement => {
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const isEditing = mode === EditorMode.Edit;
  const firstAgentId = schema.agents[0]?.agent_id ?? '';
  const selectedWorkflowAgentExists = schema.agents.some((agent) => agent.agent_id === selectedWorkflowAgentId);
  const activeWorkflowAgentId = selectedWorkflowAgentExists ? selectedWorkflowAgentId : firstAgentId;
  const hasSelectedAgent = activeWorkflowAgentId.length > 0 && schema.agents.some((agent) => agent.agent_id === activeWorkflowAgentId);
  const workflowDraftNodeCount = nodes.filter((node) => node.data.workflowNodeType !== undefined).length;
  const graphStats = [
    <Chip key="departments" size="small" label={`${schema.departments.length} departments`} sx={{ borderRadius: 0.75, fontWeight: 750 }} />,
    <Chip key="agents" size="small" label={`${schema.agents.length} agents`} sx={{ borderRadius: 0.75, fontWeight: 750 }} />,
    <Chip key="links" size="small" label={`${edges.length} links`} sx={{ borderRadius: 0.75, fontWeight: 750 }} />,
    <Chip key="draft" size="small" color="secondary" variant="outlined" label={`${workflowDraftNodeCount} draft nodes`} sx={{ borderRadius: 0.75, fontWeight: 750 }} />,
  ];
  const agentOptions = schema.agents.map((agent) => (
    <MenuItem key={agent.agent_id} value={agent.agent_id}>
      {agent.metadata?.name ?? agent.agent_id}
    </MenuItem>
  ));
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
          gridTemplateColumns: { xs: '1fr', lg: isEditing ? '260px minmax(0, 1fr)' : '1fr' },
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
            <TextField
              select
              size="small"
              label="Agent"
              value={activeWorkflowAgentId}
              onChange={(event) => onWorkflowAgentChange(event.target.value)}
              fullWidth
            >
              {agentOptions}
            </TextField>
            <Stack spacing={0.75}>
              <Button variant="outlined" color="secondary" onClick={() => onAddWorkflowAgentNode(activeWorkflowAgentId)} disabled={!hasSelectedAgent} fullWidth>
                Agent node
              </Button>
              <Button variant="outlined" color="secondary" onClick={onAddWorkflowPartNode} fullWidth>
                Part node
              </Button>
              <Button variant="contained" color="warning" onClick={onAddWorkflowPipelineNode} fullWidth>
                Pipeline node
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