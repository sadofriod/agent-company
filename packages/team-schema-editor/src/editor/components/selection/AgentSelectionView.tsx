import type { ReactElement } from 'react';
import { Button, Divider, Stack, Typography } from '@mui/material';
import type { UseFormReturn } from 'react-hook-form';

import { SelectionFormField } from './SelectionFormField';
import type { SelectionFormValues } from './selectionFormValues';
import type { AgentDocument } from '../../model/types';
import { AgentField, AgentListField, AgentMetadataField, AgentMetadataListField } from '../../state/core/editorShared';

type AgentSelectionViewProps = {
  form: UseFormReturn<SelectionFormValues>;
  agent: AgentDocument;
  removeAgent: (agentId: string) => void;
  updateAgentField: (agentId: string, field: AgentField, value: string) => void;
  updateAgentList: (agentId: string, field: AgentListField, value: string) => void;
  updateAgentMetadataField: (agentId: string, field: AgentMetadataField, value: string) => void;
  updateAgentMetadataList: (agentId: string, field: AgentMetadataListField, value: string) => void;
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
      <SelectionFormField form={form} name="role" label="Role" onValueChange={(value) => updateAgentField(agent.agent_id, AgentField.Role, value)} />
      <SelectionFormField form={form} name="model" label="Model" onValueChange={(value) => updateAgentField(agent.agent_id, AgentField.Model, value)} />
      <SelectionFormField form={form} name="description" label="Description" multiline onValueChange={(value) => updateAgentField(agent.agent_id, AgentField.Description, value)} />
      <SelectionFormField form={form} name="responsibilities" label="Responsibilities" multiline onValueChange={(value) => updateAgentList(agent.agent_id, AgentListField.Responsibilities, value)} />
      <SelectionFormField form={form} name="skills" label="Skills" multiline onValueChange={(value) => updateAgentList(agent.agent_id, AgentListField.Skills, value)} />
      <SelectionFormField form={form} name="tools" label="Tools" multiline onValueChange={(value) => updateAgentList(agent.agent_id, AgentListField.Tools, value)} />
      <SelectionFormField form={form} name="mcp_servers" label="MCP Servers" multiline onValueChange={(value) => updateAgentList(agent.agent_id, AgentListField.McpServers, value)} />
      <SelectionFormField form={form} name="memory_access_policy" label="Memory Profile" onValueChange={(value) => updateAgentField(agent.agent_id, AgentField.MemoryAccessPolicy, value)} />

      <Divider />
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 850, letterSpacing: 0 }}>
        Agent Metadata
      </Typography>
      <SelectionFormField form={form} name="metadata_name" label="Metadata Name" onValueChange={(value) => updateAgentMetadataField(agent.agent_id, AgentMetadataField.Name, value)} />
      <SelectionFormField form={form} name="metadata_description" label="Metadata Description" multiline onValueChange={(value) => updateAgentMetadataField(agent.agent_id, AgentMetadataField.Description, value)} />
      <SelectionFormField form={form} name="metadata_profile" label="Profile" onValueChange={(value) => updateAgentMetadataField(agent.agent_id, AgentMetadataField.Profile, value)} />
      <SelectionFormField form={form} name="metadata_tool_policy" label="Tool Policy" onValueChange={(value) => updateAgentMetadataField(agent.agent_id, AgentMetadataField.ToolPolicy, value)} />
      <SelectionFormField form={form} name="metadata_partials" label="Partials" multiline onValueChange={(value) => updateAgentMetadataList(agent.agent_id, AgentMetadataListField.Partials, value)} />
      <SelectionFormField form={form} name="metadata_tools" label="Metadata Tools" multiline onValueChange={(value) => updateAgentMetadataList(agent.agent_id, AgentMetadataListField.Tools, value)} />
      <SelectionFormField form={form} name="metadata_allowed_commands" label="Allowed Commands" multiline onValueChange={(value) => updateAgentMetadataList(agent.agent_id, AgentMetadataListField.AllowedCommands, value)} />
      <SelectionFormField form={form} name="metadata_required_commands" label="Required Commands" multiline onValueChange={(value) => updateAgentMetadataList(agent.agent_id, AgentMetadataListField.RequiredCommands, value)} />
    </Stack>
  );
};