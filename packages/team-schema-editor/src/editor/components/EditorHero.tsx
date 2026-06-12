import type { MouseEvent, ReactElement } from 'react';
import { Box, Button, Paper, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { EditorMode } from '../model/types';
import type { SchemaLoadStatus } from '../state/core/editorShared';

type EditorHeroProps = {
  mode: EditorMode;
  draftSchemaKey: string;
  addDepartment: () => void;
  updateDraftSchemaKey: (key: string) => void;
  createSchema: () => void;
  reloadSchema: () => void;
  refreshSchemaRecords: () => void;
  validateSchema: () => void;
  saveSchema: () => void;
  deleteSchema: () => void;
  schemaLoadStatus: SchemaLoadStatus;
  schemaServiceStatus: 'idle' | 'loading' | 'saving' | 'deleting' | 'validating' | 'error';
  onModeChange: (mode: EditorMode) => void;
};

export const EditorHero = ({
  mode,
  draftSchemaKey,
  addDepartment,
  updateDraftSchemaKey,
  createSchema,
  reloadSchema,
  refreshSchemaRecords,
  validateSchema,
  saveSchema,
  deleteSchema,
  schemaLoadStatus,
  schemaServiceStatus,
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
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
        <ToggleButtonGroup value={mode} exclusive onChange={handleModeChange} size="small" color="secondary" aria-label="Editor mode">
          <ToggleButton value="edit">Edit</ToggleButton>
          <ToggleButton value="run">Run</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          label="Schema key"
          value={draftSchemaKey}
          onChange={(event) => updateDraftSchemaKey(event.target.value)}
          size="small"
          disabled={isBusy}
          sx={{ minWidth: { xs: '100%', sm: 180 } }}
        />
        <Button variant="outlined" color="secondary" onClick={createSchema} disabled={!isSchemaReady || isBusy}>Create Schema</Button>
        <Button variant="contained" onClick={addDepartment} disabled={!isSchemaReady || mode !== 'edit'}>Add Department</Button>
        <Button variant="outlined" color="secondary" onClick={reloadSchema} disabled={isSchemaLoading}>Reload Schema</Button>
        <Button variant="outlined" color="secondary" onClick={refreshSchemaRecords} disabled={isBusy}>Refresh Schemas</Button>
        <Button variant="outlined" color="secondary" onClick={validateSchema} disabled={!isSchemaReady || isBusy}>Validate</Button>
        <Button variant="contained" color="secondary" onClick={saveSchema} disabled={!isSchemaReady || isBusy}>Save</Button>
        <Button variant="outlined" color="error" onClick={deleteSchema} disabled={!isSchemaReady || isBusy}>Delete</Button>
      </Box>
    </Paper>
  );
};