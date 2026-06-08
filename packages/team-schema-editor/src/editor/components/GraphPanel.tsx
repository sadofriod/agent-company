import { useState, type ReactElement } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { Background, Controls, MiniMap, ReactFlow } from '@xyflow/react';
import type { Connection, Edge, NodeTypes, OnNodesChange } from '@xyflow/react';

import { EditorMode, WorkflowEdgeMode } from '../model/types';
import type { TeamSchemaDocument, WorkflowGraphNode } from '../model/types';
import { WorkflowNode } from './WorkflowNode';

const nodeTypes: NodeTypes = {
  workflow: WorkflowNode,
};

type GraphPanelProps = {
  schema: TeamSchemaDocument;
  mode: EditorMode;
  nodes: WorkflowGraphNode[];
  edges: Edge[];
  selectedWorkflowAgentId: string;
  onNodesChange: OnNodesChange<WorkflowGraphNode>;
  onNodeSelect: (nodeId: string | null) => void;
  onWorkflowAgentChange: (agentId: string) => void;
  onAddWorkflowAgentNode: (agentId: string) => void;
  onAddWorkflowPartNode: () => void;
  onWorkflowConnect: (connection: Connection, mode: WorkflowEdgeMode) => void;
};

export const GraphPanel = ({
  schema,
  mode,
  nodes,
  edges,
  selectedWorkflowAgentId,
  onNodesChange,
  onNodeSelect,
  onWorkflowAgentChange,
  onAddWorkflowAgentNode,
  onAddWorkflowPartNode,
  onWorkflowConnect,
}: GraphPanelProps): ReactElement => {
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const isEditing = mode === EditorMode.Edit;
  const firstAgentId = schema.agents[0]?.agent_id ?? '';
  const selectedWorkflowAgentExists = schema.agents.some((agent) => agent.agent_id === selectedWorkflowAgentId);
  const activeWorkflowAgentId = selectedWorkflowAgentExists ? selectedWorkflowAgentId : firstAgentId;
  const hasSelectedAgent = activeWorkflowAgentId.length > 0 && schema.agents.some((agent) => agent.agent_id === activeWorkflowAgentId);
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
    <Paper sx={{ p: 2.25, minHeight: 640 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Stack spacing={0.75}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
            Graph
          </Typography>
          <Typography variant="h5">{schema.team_name ?? schema.team_id}</Typography>
        </Stack>
        {isEditing ? (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', md: 'flex-end' }, maxWidth: 520 }}>
            <TextField
              select
              size="small"
              label="Workflow agent"
              value={activeWorkflowAgentId}
              onChange={(event) => onWorkflowAgentChange(event.target.value)}
              sx={{ minWidth: 220 }}
            >
              {agentOptions}
            </TextField>
            <Button variant="outlined" color="secondary" onClick={() => onAddWorkflowAgentNode(activeWorkflowAgentId)} disabled={!hasSelectedAgent}>
              Add Agent Node
            </Button>
            <Button variant="contained" color="secondary" onClick={onAddWorkflowPartNode}>
              Add Part Node
            </Button>
          </Box>
        ) : (
          <Typography color="text.secondary" sx={{ maxWidth: 420, lineHeight: 1.5 }}>
            Execution view is locked to the selected Team Schema.
          </Typography>
        )}
      </Box>

      <Paper
        variant="outlined"
        sx={{
          height: { xs: 460, md: 560 },
          overflow: 'hidden',
          borderRadius: 1,
          borderColor: 'rgba(46, 61, 54, 0.08)',
          bgcolor: 'rgba(255,255,255,0.45)',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_event, node) => onNodeSelect(node.id)}
          onConnect={handleConnect}
          nodesConnectable={isEditing}
          nodesDraggable={isEditing}
          fitView
        >
          <MiniMap pannable zoomable />
          <Controls />
          <Background gap={20} size={1} />
        </ReactFlow>
      </Paper>

      <Dialog open={pendingConnection !== null} onClose={() => setPendingConnection(null)} fullWidth maxWidth="xs">
        <DialogTitle>Choose link mode</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ lineHeight: 1.5 }}>
            Discuss links use two arrowheads. Pipeline links use one arrowhead.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingConnection(null)}>Cancel</Button>
          <Button color="secondary" onClick={() => handleConnectionModeSelect(WorkflowEdgeMode.Discuss)}>Discuss</Button>
          <Button variant="contained" color="secondary" onClick={() => handleConnectionModeSelect(WorkflowEdgeMode.Pipeline)}>Pipeline</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};