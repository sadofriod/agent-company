import type { ReactElement } from 'react';
import { Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material';

import type { TeamSchemaDocument } from '../model/types';
import type { RuntimeSessionModel } from '../hooks/useRuntimeSession';

type RuntimePanelProps = {
  readonly schema: TeamSchemaDocument;
  readonly runtime: RuntimeSessionModel;
  readonly onCreateSession: () => Promise<void>;
};

export const RuntimePanel = ({ schema, runtime, onCreateSession }: RuntimePanelProps): ReactElement => {
  const schemeName = schema.team_name ?? schema.team_id;
  const canInteract = runtime.session !== null;
  const isBusy = runtime.status !== 'idle';
  const runtimeStatusLabel = runtime.session?.status ?? 'idle';
  const nextAction = runtime.session?.state.nextAction ?? 'Start a runtime session to inspect execution state.';

  return (
    <Paper sx={{ p: 2.25 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
        <Stack spacing={0.75}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
            Current Team Schema
          </Typography>
          <Typography variant="h5" sx={{ lineHeight: 1.2, wordBreak: 'break-word' }}>
            {schemeName}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            <Chip label={`v${schema.schema_version}`} color="secondary" variant="outlined" />
            <Chip label={runtimeStatusLabel} variant="outlined" />
            <Chip label={`${schema.agents.length} agents`} variant="outlined" />
          </Box>
          {runtime.message === null ? null : <Typography color="text.secondary">{runtime.message}</Typography>}
          {runtime.error === null ? null : <Typography color="error" sx={{ whiteSpace: 'pre-wrap' }}>{runtime.error}</Typography>}
        </Stack>

        <Stack spacing={1} sx={{ minWidth: { xs: '100%', md: 360 } }}>
          <TextField label="Task title" value={runtime.taskDraft.title} onChange={(event) => runtime.setTaskTitle(event.target.value)} size="small" />
          <TextField label="Task goal" value={runtime.taskDraft.goal} onChange={(event) => runtime.setTaskGoal(event.target.value)} size="small" multiline minRows={2} />
          <TextField label="Task constraints" value={runtime.taskDraft.constraints} onChange={(event) => runtime.setTaskConstraints(event.target.value)} size="small" multiline minRows={3} />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
            <Button variant="contained" color="secondary" onClick={onCreateSession} disabled={isBusy}>
              Start Session
            </Button>
            <Button variant="outlined" color="secondary" onClick={runtime.refreshSession} disabled={!canInteract || isBusy}>
              Refresh
            </Button>
            <Button variant="outlined" color="secondary" onClick={runtime.advanceSession} disabled={!canInteract || isBusy || runtime.session?.status !== 'running'}>
              Advance
            </Button>
            <Button variant="outlined" color="secondary" onClick={runtime.pauseSession} disabled={!canInteract || isBusy || runtime.session?.status !== 'running'}>
              Pause
            </Button>
            <Button variant="outlined" color="secondary" onClick={runtime.resumeSession} disabled={!canInteract || isBusy || runtime.session?.status !== 'paused'}>
              Resume
            </Button>
            <Button variant="outlined" color="error" onClick={runtime.terminateSession} disabled={!canInteract || isBusy || runtime.session?.status === 'terminated'}>
              Terminate
            </Button>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ display: 'grid', gap: 1.25, mt: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.35)' }}>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.14em' }}>Session</Typography>
            <Typography sx={{ wordBreak: 'break-all' }}>{runtime.session?.sessionId ?? 'No session yet'}</Typography>
            <Typography color="text.secondary">Status: {runtimeStatusLabel}</Typography>
            <Typography color="text.secondary">Created: {runtime.session?.createdAt ?? '—'}</Typography>
            <Typography color="text.secondary">Updated: {runtime.session?.updatedAt ?? '—'}</Typography>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.35)' }}>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.14em' }}>Next Action</Typography>
            <Typography color="text.secondary" sx={{ lineHeight: 1.5 }}>{nextAction}</Typography>
            <Typography color="text.secondary">Current mode: {runtime.session?.state.context?.currentMode ?? 'discussion'}</Typography>
            <Typography color="text.secondary">Team id: {runtime.session?.state.context?.teamId ?? schema.team_id}</Typography>
          </Stack>
        </Paper>
      </Box>
    </Paper>
  );
};