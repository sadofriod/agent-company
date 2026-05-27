import type { ReactElement } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { Background, Controls, MiniMap, ReactFlow } from '@xyflow/react';
import type { Edge, Node, OnNodesChange } from '@xyflow/react';

import type { GraphNodeData, TeamSchemaDocument } from '../model/types';

type GraphPanelProps = {
  readonly schema: TeamSchemaDocument;
  readonly nodes: Node<GraphNodeData>[];
  readonly edges: Edge[];
  readonly onNodesChange: OnNodesChange<Node<GraphNodeData>>;
  readonly onNodeSelect: (nodeId: string | null) => void;
};

export const GraphPanel = ({ schema, nodes, edges, onNodesChange, onNodeSelect }: GraphPanelProps): ReactElement => {
  return (
    <Paper sx={{ p: 2.25, minHeight: 640 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Stack spacing={0.75}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
            Graph
          </Typography>
          <Typography variant="h5">{schema.team_name ?? schema.team_id}</Typography>
        </Stack>
        <Typography color="text.secondary" sx={{ maxWidth: 420, lineHeight: 1.5 }}>
          Drag nodes to explore relationships. Selecting a node opens contextual editing on the right.
        </Typography>
      </Box>

      <Paper
        variant="outlined"
        sx={{
          height: { xs: 460, md: 560 },
          overflow: 'hidden',
          borderRadius: 3,
          borderColor: 'rgba(46, 61, 54, 0.08)',
          bgcolor: 'rgba(255,255,255,0.45)',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodeClick={(_event, node) => onNodeSelect(node.id)}
          fitView
        >
          <MiniMap pannable zoomable />
          <Controls />
          <Background gap={20} size={1} />
        </ReactFlow>
      </Paper>
    </Paper>
  );
};