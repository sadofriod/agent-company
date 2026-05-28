import type { ReactElement } from 'react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';

import type { RuntimeStatus, TeamSchemaDocument } from '../model/types';

const runtimeStatusLabels: Record<RuntimeStatus, string> = {
  idle: 'Idle',
  running: 'Running',
  paused: 'Paused',
  terminated: 'Terminated',
};

type RuntimePanelProps = {
  readonly schema: TeamSchemaDocument;
  readonly runtimeStatus: RuntimeStatus;
  readonly onStart: () => void;
  readonly onPause: () => void;
  readonly onTerminate: () => void;
};

export const RuntimePanel = ({ schema, runtimeStatus, onStart, onPause, onTerminate }: RuntimePanelProps): ReactElement => {
  const schemeName = schema.team_name ?? schema.team_id;
  const canPause = runtimeStatus === 'running';
  const canTerminate = runtimeStatus === 'running' || runtimeStatus === 'paused';

  return (
    <Paper sx={{ p: 2.25 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
        <Stack spacing={0.75}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
            Current Team Scheme
          </Typography>
          <Typography variant="h5" sx={{ lineHeight: 1.2, wordBreak: 'break-word' }}>
            {schemeName}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            <Chip label={`v${schema.schema_version}`} color="secondary" variant="outlined" />
            <Chip label={runtimeStatusLabels[runtimeStatus]} variant="outlined" />
            <Chip label={`${schema.agents.length} agents`} variant="outlined" />
          </Box>
        </Stack>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Button variant="contained" color="secondary" onClick={onStart} disabled={runtimeStatus === 'running'}>
            Start
          </Button>
          <Button variant="outlined" color="secondary" onClick={onPause} disabled={!canPause}>
            Pause
          </Button>
          <Button variant="outlined" color="error" onClick={onTerminate} disabled={!canTerminate}>
            Terminate
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};