import type { ReactElement } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';

import { WorkflowEdgeMode } from '../../model/types';
import { useGraphPanelContext } from './hooks/useGraphPanelContext';

export const LinkModeDialog = (): ReactElement => {
  const { pendingConnection, onDialogClose, onSelectConnectionMode } = useGraphPanelContext();

  return (
  <Dialog open={pendingConnection !== null} onClose={onDialogClose} fullWidth maxWidth="xs">
    <DialogTitle>Choose link mode</DialogTitle>
    <DialogContent>
      <Stack spacing={1}>
        <Typography color="text.secondary" sx={{ lineHeight: 1.5 }}>
          Pick how this connection should be interpreted by the runtime.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
          <strong>Discuss · peers</strong> - multi-agent peer discussion (bidirectional, both ends speak).
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
          <strong>Discuss · broadcast</strong> - emit a discussion's resolved output to an Agent or Pipeline.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
          <strong>Pipeline</strong> - directed handoff. Pipeline children must form a DAG; cycles are rejected.
        </Typography>
      </Stack>
    </DialogContent>
    <DialogActions sx={{ flexWrap: 'wrap', gap: 0.5 }}>
      <Button onClick={onDialogClose}>Cancel</Button>
      <Button color="secondary" onClick={() => onSelectConnectionMode(WorkflowEdgeMode.Discuss)}>
        Discuss · peers
      </Button>
      <Button color="secondary" onClick={() => onSelectConnectionMode(WorkflowEdgeMode.DiscussBroadcast)}>
        Discuss · broadcast
      </Button>
      <Button variant="contained" color="warning" onClick={() => onSelectConnectionMode(WorkflowEdgeMode.Pipeline)}>
        Pipeline
      </Button>
    </DialogActions>
  </Dialog>
);
};