import type { ReactElement } from 'react';
import { Button, Divider, Stack, Typography } from '@mui/material';
import type { UseFormReturn } from 'react-hook-form';

import { SelectionFormField } from './SelectionFormField';
import type { SelectionFormValues } from './selectionFormValues';
import type { AgentDocument } from '../../model/types';

type AgentSelectionViewProps = {
  form: UseFormReturn<SelectionFormValues>;
  agent: AgentDocument;
  removeAgent: (agentId: string) => void;
  updateAgentField: (agentId: string, field: 'role' | 'model' | 'description' | 'memory_access_policy', value: string) => void;
  updateAgentList: (agentId: string, field: 'responsibilities' | 'skills' | 'tools' | 'mcp_servers', value: string) => void;
  updateAgentMetadataField: (agentId: string, field: 'name' | 'description' | 'profile' | 'tool_policy', value: string) => void;
  updateAgentMetadataList: (agentId: string, field: 'partials' | 'tools' | 'allowed_commands' | 'required_commands', value: string) => void;
};

export const AgentSelectionView = ({
  form,
  agent,
  removeAgent,
  updateAgentField,
  updateAgentList,
  updateAgentMetadataField,
  updateAgentMetadataList,
}: AgentSelectionViewProps): ReactElement => {
  return (
    <Stack spacing={2}>
      <Typography variant="h6">{agent.metadata?.name ?? agent.agent_id}</Typography>
      <Button color="error" variant="outlined" onClick={() => removeAgent(agent.agent_id)} sx={{ alignSelf: 'flex-start' }}>
        Delete Agent
      </Button>
      <SelectionFormField form={form} name="role" label="Role" onValueChange={(value) => updateAgentField(agent.agent_id, 'role', value)} />
      <SelectionFormField form={form} name="model" label="Model" onValueChange={(value) => updateAgentField(agent.agent_id, 'model', value)} />
      <SelectionFormField form={form} name="description" label="Description" multiline onValueChange={(value) => updateAgentField(agent.agent_id, 'description', value)} />
      <SelectionFormField form={form} name="responsibilities" label="Responsibilities" multiline onValueChange={(value) => updateAgentList(agent.agent_id, 'responsibilities', value)} />
      <SelectionFormField form={form} name="skills" label="Skills" multiline onValueChange={(value) => updateAgentList(agent.agent_id, 'skills', value)} />
      <SelectionFormField form={form} name="tools" label="Tools" multiline onValueChange={(value) => updateAgentList(agent.agent_id, 'tools', value)} />
      <SelectionFormField form={form} name="mcp_servers" label="MCP Servers" multiline onValueChange={(value) => updateAgentList(agent.agent_id, 'mcp_servers', value)} />
      <SelectionFormField form={form} name="memory_access_policy" label="Memory Profile" onValueChange={(value) => updateAgentField(agent.agent_id, 'memory_access_policy', value)} />

      <Divider />
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 850, letterSpacing: 0 }}>
        Agent Metadata
      </Typography>
      <SelectionFormField form={form} name="metadata_name" label="Metadata Name" onValueChange={(value) => updateAgentMetadataField(agent.agent_id, 'name', value)} />
      <SelectionFormField form={form} name="metadata_description" label="Metadata Description" multiline onValueChange={(value) => updateAgentMetadataField(agent.agent_id, 'description', value)} />
      <SelectionFormField form={form} name="metadata_profile" label="Profile" onValueChange={(value) => updateAgentMetadataField(agent.agent_id, 'profile', value)} />
      <SelectionFormField form={form} name="metadata_tool_policy" label="Tool Policy" onValueChange={(value) => updateAgentMetadataField(agent.agent_id, 'tool_policy', value)} />
      <SelectionFormField form={form} name="metadata_partials" label="Partials" multiline onValueChange={(value) => updateAgentMetadataList(agent.agent_id, 'partials', value)} />
      <SelectionFormField form={form} name="metadata_tools" label="Metadata Tools" multiline onValueChange={(value) => updateAgentMetadataList(agent.agent_id, 'tools', value)} />
      <SelectionFormField form={form} name="metadata_allowed_commands" label="Allowed Commands" multiline onValueChange={(value) => updateAgentMetadataList(agent.agent_id, 'allowed_commands', value)} />
      <SelectionFormField form={form} name="metadata_required_commands" label="Required Commands" multiline onValueChange={(value) => updateAgentMetadataList(agent.agent_id, 'required_commands', value)} />
    </Stack>
  );
};