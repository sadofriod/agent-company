import type { ReactElement } from 'react';
import { Box, Button, Chip, List, ListItemButton, ListItemText, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { FolderOpen, Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { SchemaServiceStatus, type TeamEditorModel } from '../../editor/hooks/helper/teamEditor.types';
import { SchemaLoadStatus } from '../../editor/state/core/editorShared';

type WorkspaceListPageProps = {
  editor: TeamEditorModel;
};

export const WorkspaceListPage = ({ editor }: WorkspaceListPageProps): ReactElement => {
  const navigate = useNavigate();
  const isBusy = editor.schemaServiceStatus !== SchemaServiceStatus.Idle;
  const workspaceItems = editor.schemaRecords.map((record) => (
    <ListItemButton
      key={record.key}
      selected={editor.selectedSchemaKey === record.key}
      onClick={() => {
        void editor.selectSchemaKey(record.key);
        navigate(`/workspaces/${encodeURIComponent(record.key)}`);
      }}
      sx={{ borderRadius: 1, border: '1px solid #d7dde5', bgcolor: '#ffffff' }}
    >
      <ListItemText
        primary={record.key}
        secondary={`${record.schema.agents.length} agents · ${record.schema.departments.length} departments · ${new Date(record.updatedAt).toLocaleString()}`}
        slotProps={{ primary: { sx: { fontWeight: 850 } }, secondary: { sx: { fontSize: '0.82rem' } } }}
      />
      <FolderOpen size={18} />
    </ListItemButton>
  ));

  return (
    <Box component="main" sx={{ minHeight: '100vh', p: { xs: 1.75, md: 3 }, display: 'grid', alignContent: 'start', gap: 2.5 }}>
      <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Stack spacing={0.75}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0, fontWeight: 850 }}>
              Workspaces
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 850 }}>
              Team Schema List
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <Chip size="small" label={`${editor.schemaRecords.length} workspaces`} variant="outlined" />
              <Chip size="small" label={editor.schemaServiceStatus} variant="outlined" />
            </Stack>
          </Stack>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <TextField
              label="Workspace key"
              value={editor.draftSchemaKey}
              onChange={(event) => editor.updateDraftSchemaKey(event.target.value)}
              size="small"
              disabled={isBusy}
              sx={{ minWidth: { xs: '100%', sm: 220 } }}
            />
            <Tooltip title="Create workspace">
              <span>
                <Button
                  variant="contained"
                  startIcon={<Plus size={16} />}
                  onClick={() => {
                    const nextKey = editor.draftSchemaKey.trim();
                    void editor.createSchema().then(() => {
                      if (nextKey.length > 0) {
                        navigate(`/workspaces/${encodeURIComponent(nextKey)}`);
                      }
                    });
                  }}
                  disabled={editor.schemaLoadStatus !== SchemaLoadStatus.Ready || isBusy}
                >
                  Create
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Refresh workspaces">
              <span>
                <Button variant="outlined" color="secondary" startIcon={<RefreshCw size={16} />} onClick={editor.refreshSchemaRecords} disabled={isBusy}>
                  Refresh
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {editor.schemaServiceError === null ? null : (
        <Paper sx={{ p: 1.5, borderColor: 'error.main' }}>
          <Typography color="error" sx={{ whiteSpace: 'pre-wrap' }}>{editor.schemaServiceError}</Typography>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        <List dense sx={{ display: 'grid', gap: 1, p: 0 }}>
          {workspaceItems}
        </List>
        {workspaceItems.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 1 }}>
            No saved workspaces found.
          </Typography>
        ) : null}
      </Paper>
    </Box>
  );
};
