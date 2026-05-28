import type { ReactElement } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Handle, Position, type NodeProps } from '@xyflow/react';

import type { GraphNodeKind, WorkflowGraphNode } from '../model/types';

const nodeKindLabels: Record<GraphNodeKind, string> = {
  team: 'Team',
  department: 'Department',
  agent: 'Agent',
  part: 'Part',
  discussion: 'Discussion',
  pipeline: 'Pipeline',
  review: 'Review',
  memory: 'Memory',
};

export const WorkflowNode = ({ data, selected }: NodeProps<WorkflowGraphNode>): ReactElement => {
  return (
    <Box
      sx={{
        position: 'relative',
        minWidth: 220,
        maxWidth: 260,
        p: 1.5,
        borderRadius: 2.25,
        border: '1px solid rgba(28, 42, 35, 0.12)',
        borderTop: `4px solid ${data.accent}`,
        bgcolor: '#fffdf8',
        boxShadow: selected
          ? '0 0 0 2px rgba(217, 108, 63, 0.28), 0 18px 40px rgba(38, 49, 44, 0.08)'
          : '0 18px 40px rgba(38, 49, 44, 0.08)',
        outline: data.workflowNodeType === undefined ? 'none' : '1px dashed rgba(47, 123, 109, 0.42)',
        outlineOffset: 4,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ width: 8, height: 8, background: data.accent, border: 0 }} />
      <Handle type="source" position={Position.Right} style={{ width: 8, height: 8, background: data.accent, border: 0 }} />
      <Stack spacing={0.5}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
          {nodeKindLabels[data.kind]}
        </Typography>
        <Typography sx={{ fontWeight: 800, lineHeight: 1.15, wordBreak: 'break-word' }}>{data.nodeName}</Typography>
        {data.roleName === undefined ? null : (
          <Typography color="text.secondary" sx={{ fontSize: '0.82rem', lineHeight: 1.35, wordBreak: 'break-word' }}>
            Role: {data.roleName}
          </Typography>
        )}
        {data.departmentName === undefined ? null : (
          <Typography color="text.secondary" sx={{ fontSize: '0.82rem', lineHeight: 1.35, wordBreak: 'break-word' }}>
            Department: {data.departmentName}
          </Typography>
        )}
        {data.detail === undefined ? null : (
          <Typography color="text.secondary" sx={{ fontSize: '0.76rem', lineHeight: 1.35, wordBreak: 'break-word' }}>
            {data.detail}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};