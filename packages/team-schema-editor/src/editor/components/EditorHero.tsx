import type { MouseEvent, ReactElement } from 'react';
import { Box, Button, Chip, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';

import type { EditorMode } from '../model/types';
import type { SchemaLoadStatus } from '../state/core/editorShared';

const schemaStatusLabels: Record<SchemaLoadStatus, string> = {
  idle: 'Schema idle',
  loading: 'Loading schema',
  ready: 'Schema loaded',
  error: 'Schema error',
};

type EditorHeroProps = {
  readonly mode: EditorMode;
  readonly addDepartment: () => void;
  readonly reloadSchema: () => void;
  readonly refreshSchemaRecords: () => void;
  readonly validateSchema: () => void;
  readonly saveSchema: () => void;
  readonly deleteSchema: () => void;
  readonly schemaLoadStatus: SchemaLoadStatus;
  readonly schemaServiceStatus: 'idle' | 'loading' | 'saving' | 'deleting' | 'validating' | 'error';
  readonly schemaServiceMessage: string | null;
  readonly schemaServiceError: string | null;
  readonly onModeChange: (mode: EditorMode) => void;
};

export const EditorHero = ({
  mode,
  addDepartment,
  reloadSchema,
  refreshSchemaRecords,
  validateSchema,
  saveSchema,
  deleteSchema,
  schemaLoadStatus,
  schemaServiceStatus,
  schemaServiceMessage,
  schemaServiceError,
  onModeChange,
}: EditorHeroProps): ReactElement => {
  const isSchemaReady = schemaLoadStatus === 'ready';
  const isSchemaLoading = schemaLoadStatus === 'loading';
  const isBusy = schemaServiceStatus !== 'idle';
  const handleModeChange = (_event: MouseEvent<HTMLElement>, nextMode: EditorMode | null): void => {
    if (nextMode !== null) {
      onModeChange(nextMode);
    }
  };

  return (
    <Paper
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', md: 'flex-end' },
        justifyContent: 'space-between',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 3,
        p: { xs: 2.75, md: 4 },
      }}
    >
      <Stack spacing={1}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
          React Flow Team Schema Editor
        </Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '3.6rem' }, maxWidth: 720 }}>
          Build Team Schemas, edit workflows and run them.
        </Typography>
        <Box>
          <Chip label={schemaStatusLabels[schemaLoadStatus]} color={schemaLoadStatus === 'error' ? 'error' : 'secondary'} variant="outlined" />
        </Box>
      </Stack>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
        <ToggleButtonGroup value={mode} exclusive onChange={handleModeChange} size="small" color="secondary" aria-label="Editor mode">
          <ToggleButton value="edit">Edit</ToggleButton>
          <ToggleButton value="run">Run</ToggleButton>
        </ToggleButtonGroup>
        <Button variant="contained" onClick={addDepartment} disabled={!isSchemaReady || mode !== 'edit'}>Add Department</Button>
        <Button variant="outlined" color="secondary" onClick={reloadSchema} disabled={isSchemaLoading}>Reload Schema</Button>
        <Button variant="outlined" color="secondary" onClick={refreshSchemaRecords} disabled={isBusy}>Refresh Schemas</Button>
        <Button variant="outlined" color="secondary" onClick={validateSchema} disabled={!isSchemaReady || isBusy}>Validate</Button>
        <Button variant="contained" color="secondary" onClick={saveSchema} disabled={!isSchemaReady || isBusy}>Save</Button>
        <Button variant="outlined" color="error" onClick={deleteSchema} disabled={!isSchemaReady || isBusy}>Delete</Button>
      </Box>
      {schemaServiceMessage === null ? null : (
        <Typography color="text.secondary" sx={{ width: '100%', textAlign: { xs: 'left', md: 'right' } }}>
          {schemaServiceMessage}
        </Typography>
      )}
      {schemaServiceError === null ? null : (
        <Typography color="error" sx={{ width: '100%', whiteSpace: 'pre-wrap', textAlign: { xs: 'left', md: 'right' } }}>
          {schemaServiceError}
        </Typography>
      )}
    </Paper>
  );
};