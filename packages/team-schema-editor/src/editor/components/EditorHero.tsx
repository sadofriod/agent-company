import type { MouseEvent, ReactElement } from 'react';
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { FileText, RefreshCw, RotateCw, Save, ShieldCheck, Trash2 } from 'lucide-react';

import type { EditorMode } from '../model/types';
import type { SchemaLoadStatus } from '../state/core/editorShared';

type EditorHeroProps = {
  mode: EditorMode;
  reloadSchema: () => void;
  refreshSchemaRecords: () => void;
  validateSchema: () => void;
  saveSchema: () => void;
  deleteSchema: () => void;
  schemaLoadStatus: SchemaLoadStatus;
  schemaServiceStatus: 'idle' | 'loading' | 'saving' | 'deleting' | 'validating' | 'error';
  onModeChange: (mode: EditorMode) => void;
  onOpenAgentMarkdown: () => void;
};

export const EditorHero = ({
  mode,
  reloadSchema,
  refreshSchemaRecords,
  validateSchema,
  saveSchema,
  deleteSchema,
  schemaLoadStatus,
  schemaServiceStatus,
  onModeChange,
  onOpenAgentMarkdown,
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
    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
      <ToggleButtonGroup value={mode} exclusive onChange={handleModeChange} size="small" color="secondary" aria-label="Editor mode">
        <Tooltip title="Edit mode">
          <ToggleButton value="edit" aria-label="Edit mode">
            <ShieldCheck size={17} />
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Run mode">
          <ToggleButton value="run" aria-label="Run mode">
            <RotateCw size={17} />
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>

      <Tooltip title="Agent markdown">
        <span>
          <IconButton color="secondary" onClick={onOpenAgentMarkdown} aria-label="Agent markdown">
            <FileText size={18} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Reload workspace">
        <span>
          <IconButton color="secondary" onClick={reloadSchema} disabled={isSchemaLoading} aria-label="Reload workspace">
            <RefreshCw size={18} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Refresh workspace list">
        <span>
          <IconButton color="secondary" onClick={refreshSchemaRecords} disabled={isBusy} aria-label="Refresh workspace list">
            <RotateCw size={18} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Validate schema">
        <span>
          <IconButton color="secondary" onClick={validateSchema} disabled={!isSchemaReady || isBusy} aria-label="Validate schema">
            <ShieldCheck size={18} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Save workspace">
        <span>
          <IconButton color="primary" onClick={saveSchema} disabled={!isSchemaReady || isBusy} aria-label="Save workspace">
            <Save size={18} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Delete workspace">
        <span>
          <IconButton color="error" onClick={deleteSchema} disabled={!isSchemaReady || isBusy} aria-label="Delete workspace">
            <Trash2 size={18} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};