import { useEffect, useState, type ReactElement } from 'react';
import { Button, Divider, MenuItem, Stack, Typography } from '@mui/material';
import type { UseFormReturn } from 'react-hook-form';

import { SelectionFormField } from './SelectionFormField';
import type { SelectionFormValues } from './selectionFormValues';
import type { AgentDocument, TeamSchemaDocument } from '../../model/types';
import { AgentField, AgentListField } from '../../state/core/editorShared';
import { listLlmGatewayConfigs } from '../../../app/llmGateway/llmGatewayStorage';
import { listCapabilityCatalogConfigs, CAPABILITY_CATALOG_STORAGE_EVENT } from '../../../app/capabilityCatalog/storage';
import { CAPABILITY_CATALOG_KIND } from '../../../app/capabilityCatalog/types';
import { LLM_GATEWAY_STORAGE_EVENT } from '../../../app/llmGateway/llmGatewayStorage';

type AgentSelectionViewProps = {
  form: UseFormReturn<SelectionFormValues>;
  agent: AgentDocument;
  schema: TeamSchemaDocument;
  removeAgent: (agentId: string) => void;
  updateAgentField: (agentId: string, field: AgentField, value: string) => void;
  updateAgentList: (agentId: string, field: AgentListField, value: string) => void;
};

const mergeUnique = (...groups: readonly string[][]): string[] => {
  const values = new Set<string>();

  for (const group of groups) {
    for (const item of group) {
      const normalized = item.trim();
      if (normalized.length > 0) {
        values.add(normalized);
      }
    }
  }

  return [...values];
};

export const AgentSelectionView = ({
  form,
  agent,
  schema,
  removeAgent,
  updateAgentField,
  updateAgentList,
}: AgentSelectionViewProps): ReactElement => {
  const [llmGateways, setLlmGateways] = useState(() => listLlmGatewayConfigs());
  const [skillCatalog, setSkillCatalog] = useState(() => listCapabilityCatalogConfigs(CAPABILITY_CATALOG_KIND.Skills));
  const [toolCatalog, setToolCatalog] = useState(() => listCapabilityCatalogConfigs(CAPABILITY_CATALOG_KIND.Tools));
  const [mcpCatalog, setMcpCatalog] = useState(() => listCapabilityCatalogConfigs(CAPABILITY_CATALOG_KIND.McpServers));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const refreshCatalogs = (): void => {
      setLlmGateways(listLlmGatewayConfigs());
      setSkillCatalog(listCapabilityCatalogConfigs(CAPABILITY_CATALOG_KIND.Skills));
      setToolCatalog(listCapabilityCatalogConfigs(CAPABILITY_CATALOG_KIND.Tools));
      setMcpCatalog(listCapabilityCatalogConfigs(CAPABILITY_CATALOG_KIND.McpServers));
    };

    window.addEventListener('storage', refreshCatalogs);
    window.addEventListener(LLM_GATEWAY_STORAGE_EVENT, refreshCatalogs);
    window.addEventListener(CAPABILITY_CATALOG_STORAGE_EVENT, refreshCatalogs);

    return () => {
      window.removeEventListener('storage', refreshCatalogs);
      window.removeEventListener(LLM_GATEWAY_STORAGE_EVENT, refreshCatalogs);
      window.removeEventListener(CAPABILITY_CATALOG_STORAGE_EVENT, refreshCatalogs);
    };
  }, []);

  const modelOptions = mergeUnique(
    llmGateways.map((item) => item.model),
    agent === undefined ? [] : [agent.metadata?.llm?.model ?? agent.model],
  );

  const memoryProfileOptions = [
    <MenuItem key="none" value="">
      None
    </MenuItem>,
    ...(schema.memory_policy?.retrieval_profiles ?? []).map((profile) => (
      <MenuItem key={profile.profile_id} value={profile.profile_id}>
        {profile.profile_id}
      </MenuItem>
    )),
  ];

  const skillOptions = mergeUnique(skillCatalog.map((item) => item.key), agent?.skills ?? []);
  const toolOptions = mergeUnique(toolCatalog.map((item) => item.key), agent?.tools ?? [], agent?.metadata?.tools ?? []);
  const mcpOptions = mergeUnique(mcpCatalog.map((item) => item.key), agent?.mcp_servers ?? []);

  return (
    <Stack spacing={2}>
      <Typography variant="h6">{agent.metadata?.name ?? agent.agent_id}</Typography>
      <Button color="error" variant="outlined" onClick={() => removeAgent(agent.agent_id)} sx={{ alignSelf: 'flex-start' }}>
        Delete Agent
      </Button>
      <SelectionFormField form={form} name="role" label="Role" onValueChange={(value) => updateAgentField(agent.agent_id, AgentField.Role, value)} />
      
      <SelectionFormField
        form={form}
        name="model"
        label="Model"
        select
        options={modelOptions}
        onValueChange={(value) => updateAgentField(agent.agent_id, AgentField.Model, value)}
      />

      <SelectionFormField form={form} name="description" label="Description" multiline onValueChange={(value) => updateAgentField(agent.agent_id, AgentField.Description, value)} />

      <SelectionFormField
        form={form}
        name="responsibilities"
        label="Responsibilities"
        multiline
        onValueChange={(value) => updateAgentList(agent.agent_id, AgentListField.Responsibilities, value)}
      />

      <SelectionFormField
        form={form}
        name="skills"
        label="Skills"
        select
        multiple
        options={skillOptions}
        helperText={skillOptions.length === 0 ? 'No skills configured yet. Add entries in Skills page.' : 'Multi-select from configured skills.'}
        onValueChange={(value) => updateAgentList(agent.agent_id, AgentListField.Skills, value)}
      />

      <SelectionFormField
        form={form}
        name="tools"
        label="Tools"
        select
        multiple
        options={toolOptions}
        helperText={toolOptions.length === 0 ? 'No tools configured yet. Add entries in Tools page.' : 'Multi-select from configured tools.'}
        onValueChange={(value) => updateAgentList(agent.agent_id, AgentListField.Tools, value)}
      />

      <SelectionFormField
        form={form}
        name="mcp_servers"
        label="MCP Servers"
        select
        multiple
        options={mcpOptions}
        helperText={mcpOptions.length === 0 ? 'No MCP servers configured yet. Add entries in MCP page.' : 'Multi-select from configured MCP servers.'}
        onValueChange={(value) => updateAgentList(agent.agent_id, AgentListField.McpServers, value)}
      />

      <SelectionFormField
        form={form}
        name="memory_access_policy"
        label="Memory Profile"
        select
        onValueChange={(value) => updateAgentField(agent.agent_id, AgentField.MemoryAccessPolicy, value)}
      >
        {memoryProfileOptions}
      </SelectionFormField>

      <Divider />
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 850, letterSpacing: 0 }}>
        Agent Metadata (Read-Only)
      </Typography>
      <Stack spacing={1} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="body2"><strong>Name:</strong> {agent.metadata?.name ?? agent.agent_id}</Typography>
        <Typography variant="body2"><strong>Description:</strong> {agent.metadata?.description ?? 'No metadata description.'}</Typography>
        <Typography variant="body2"><strong>Profile:</strong> {agent.metadata?.profile ?? 'None'}</Typography>
        <Typography variant="body2"><strong>Tool Policy:</strong> {agent.metadata?.tool_policy ?? 'None'}</Typography>
        <Typography variant="body2"><strong>Partials:</strong> {agent.metadata?.partials?.join(', ') || 'None'}</Typography>
        <Typography variant="body2"><strong>Tools:</strong> {agent.metadata?.tools?.join(', ') || 'None'}</Typography>
        <Typography variant="body2"><strong>Allowed Commands:</strong> {agent.metadata?.allowed_commands?.join(', ') || 'None'}</Typography>
        <Typography variant="body2"><strong>Required Commands:</strong> {agent.metadata?.required_commands?.join(', ') || 'None'}</Typography>
      </Stack>
    </Stack>
  );
};