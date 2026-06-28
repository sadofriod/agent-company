import type { MouseEvent, ReactElement } from 'react';
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { BrainCog, Cpu, FileText, Pencil, Play, RefreshCw, RotateCw, Save, ServerCog, ShieldCheck, Trash2, Wrench } from 'lucide-react';

import type { EditorMode } from '../model/types';
import { SchemaLoadStatus } from '../state/core/editorShared';
import { SchemaServiceStatus } from '../hooks/helper/teamEditor.types';

type EditorHeroProps = {
  mode: EditorMode;
  reloadSchema: () => void;
  refreshSchemaRecords: () => void;
  validateSchema: () => void;
  saveSchema: () => void;
  deleteSchema: () => void;
  schemaLoadStatus: SchemaLoadStatus;
  schemaServiceStatus: SchemaServiceStatus;
  onModeChange: (mode: EditorMode) => void;
  onOpenAgentMarkdown: () => void;
  onOpenLlmGateway: () => void;
  onOpenMcpServers: () => void;
  onOpenTools: () => void;
  onOpenSkills: () => void;
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
  onOpenLlmGateway,
  onOpenMcpServers,
  onOpenTools,
  onOpenSkills,
}: EditorHeroProps): ReactElement => {
  const isSchemaReady = schemaLoadStatus === SchemaLoadStatus.Ready;
  const isSchemaLoading = schemaLoadStatus === SchemaLoadStatus.Loading;
  const isBusy = schemaServiceStatus !== SchemaServiceStatus.Idle;
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
            <Pencil size={17} />
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Run mode">
          <ToggleButton value="run" aria-label="Run mode">
            <Play size={17} />
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
      <Tooltip title="LLM gateway">
        <span>
          <IconButton color="secondary" onClick={onOpenLlmGateway} aria-label="LLM gateway">
            <Cpu size={18} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="MCP servers">
        <span>
          <IconButton color="secondary" onClick={onOpenMcpServers} aria-label="MCP servers">
            <ServerCog size={18} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Tools">
        <span>
          <IconButton color="secondary" onClick={onOpenTools} aria-label="Tools">
            <Wrench size={18} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Skills">
        <span>
          <IconButton color="secondary" onClick={onOpenSkills} aria-label="Skills">
            <BrainCog size={18} />
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