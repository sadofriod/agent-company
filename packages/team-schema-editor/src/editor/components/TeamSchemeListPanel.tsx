import type { ReactElement } from 'react';
import { Chip, Divider, List, ListItemButton, ListItemText, Paper, Stack, Typography } from '@mui/material';

import type { AgentDocument, EditorMode, TeamSchemaDocument, TeamSchemaRecord } from '../model/types';

type TeamSchemeListPanelProps = {
  readonly schema: TeamSchemaDocument;
  readonly schemaRecords: readonly TeamSchemaRecord[];
  readonly mode: EditorMode;
  readonly selectedSchemaKey: string;
  readonly selectedAgentId: string | null;
  readonly onSelectTeam: () => void;
  readonly onSelectSchemaKey: (key: string) => void;
  readonly onSelectAgent: (agentId: string) => void;
};

const findAgent = (agents: readonly AgentDocument[], agentId: string): AgentDocument | undefined =>
  agents.find((agent) => agent.agent_id === agentId);

export const TeamSchemeListPanel = ({
  schema,
  schemaRecords,
  mode,
  selectedSchemaKey,
  selectedAgentId,
  onSelectTeam,
  onSelectSchemaKey,
  onSelectAgent,
}: TeamSchemeListPanelProps): ReactElement => {
  const schemeName = schema.team_name ?? schema.team_id;
  const versionItems = schemaRecords.map((record) => (
    <ListItemButton
      key={record.key}
      selected={selectedSchemaKey === record.key}
      onClick={() => onSelectSchemaKey(record.key)}
      sx={{ ml: 2, borderRadius: 2 }}
    >
      <ListItemText
        primary={record.key}
        secondary={`${record.schema.agents.length} agents · ${new Date(record.updatedAt).toLocaleString()}`}
        slotProps={{ primary: { sx: { fontWeight: 800 } }, secondary: { sx: { fontSize: '0.78rem' } } }}
      />
    </ListItemButton>
  ));
  const agentItems = schema.departments.flatMap((department) => {
    const departmentAgentItems = department.agents
      .map((agentId) => findAgent(schema.agents, agentId))
      .filter((agent): agent is AgentDocument => agent !== undefined)
      .map((agent) => (
        <ListItemButton
          key={agent.agent_id}
          selected={selectedAgentId === agent.agent_id}
          onClick={() => onSelectAgent(agent.agent_id)}
          sx={{ ml: 2, borderRadius: 2 }}
        >
          <ListItemText
            primary={agent.metadata?.name ?? agent.agent_id}
            secondary={agent.role}
            slotProps={{ primary: { sx: { fontWeight: 700, fontSize: '0.92rem' } }, secondary: { sx: { fontSize: '0.78rem' } } }}
          />
        </ListItemButton>
      ));

    return [
      <Typography key={`${department.department_id}:label`} color="text.secondary" sx={{ px: 1, pt: 1.25, fontSize: '0.78rem', fontWeight: 800 }}>
        {department.name}
      </Typography>,
      ...departmentAgentItems,
    ];
  });

  return (
    <Paper sx={{ p: 2, minHeight: { xs: 'auto', xl: 640 } }}>
      <Stack spacing={1.5}>
        <Stack spacing={0.75}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
            Team Schema List
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, wordBreak: 'break-word' }}>
            {schemeName}
          </Typography>
          <Chip size="small" label={mode === 'edit' ? 'Edit mode' : 'Run mode'} color="secondary" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
        </Stack>

        <List dense sx={{ display: 'grid', gap: 0.75, p: 0 }}>
          <ListItemButton selected onClick={onSelectTeam} sx={{ borderRadius: 2 }}>
            <ListItemText
              primary={schemeName}
              secondary={schema.team_id}
              slotProps={{ primary: { sx: { fontWeight: 800 } }, secondary: { sx: { wordBreak: 'break-all', fontSize: '0.78rem' } } }}
            />
          </ListItemButton>
          {versionItems}
          {schemaRecords.length === 0 ? (
            <Typography color="text.secondary" sx={{ px: 1, fontSize: '0.82rem' }}>
              No saved schema records found.
            </Typography>
          ) : null}
        </List>

        {mode === 'edit' ? (
          <>
            <Divider />
            <Stack spacing={0.75}>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.14em' }}>
                Agents
              </Typography>
              <List dense sx={{ maxHeight: 420, overflow: 'auto', display: 'grid', gap: 0.35, p: 0 }}>
                {agentItems}
              </List>
            </Stack>
          </>
        ) : null}
      </Stack>
    </Paper>
  );
};