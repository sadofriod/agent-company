import type { ReactElement } from 'react';
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Bot, GitBranch, Layers } from 'lucide-react';

import { WorkflowEdgeMode } from '../../model/types';
import { useGraphPanelContext } from './hooks/useGraphPanelContext';

export const WorkflowPalettePanel = (): ReactElement => {
  const {
    nodes,
    linkSourceId,
    linkTargetId,
    linkMode,
    onLinkSourceIdChange,
    onLinkTargetIdChange,
    onLinkModeChange,
    onCreateEdge,
    onAddWorkflowAgentNode,
    onAddWorkflowPartNode,
    onAddWorkflowPipelineNode,
  } = useGraphPanelContext();

  const connectableNodeOptions = nodes.map((node) => (
    <MenuItem key={node.id} value={node.id}>
      {node.data.nodeName}
    </MenuItem>
  ));

  return (
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
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 850, letterSpacing: 0 }}>
          Palette
        </Typography>
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
      <Stack spacing={2}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 850, letterSpacing: 0 }}>
          Link
        </Typography>
        <TextField select fullWidth size="small" label="Source" value={linkSourceId} onChange={(event) => onLinkSourceIdChange(event.target.value)}>
          {connectableNodeOptions}
        </TextField>
        <TextField select fullWidth size="small" label="Target" value={linkTargetId} onChange={(event) => onLinkTargetIdChange(event.target.value)}>
          {connectableNodeOptions}
        </TextField>
        <TextField
          select
          fullWidth
          size="small"
          label="Edge Type"
          value={linkMode}
          onChange={(event) => onLinkModeChange(event.target.value as WorkflowEdgeMode)}
        >
          <MenuItem value={WorkflowEdgeMode.Discuss}>Discuss · peers</MenuItem>
          <MenuItem value={WorkflowEdgeMode.DiscussBroadcast}>Discuss · broadcast</MenuItem>
          <MenuItem value={WorkflowEdgeMode.Pipeline}>Pipeline</MenuItem>
        </TextField>
        <Button
          variant="outlined"
          color="warning"
          startIcon={<GitBranch size={16} />}
          onClick={onCreateEdge}
          disabled={linkSourceId.length === 0 || linkTargetId.length === 0}
          fullWidth
        >
          Create edge
        </Button>
      </Stack>
    </Box>
  );
};