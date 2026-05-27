import type { ReactElement } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import type { UseFormReturn } from 'react-hook-form';

import { SelectionFormField } from './SelectionFormField';
import type { SelectionFormValues } from './selectionFormValues';
import type { AgentDocument } from '../../model/types';

type AgentSelectionViewProps = {
  readonly form: UseFormReturn<SelectionFormValues>;
  readonly agent: AgentDocument;
  readonly removeAgent: (agentId: string) => void;
  readonly updateAgentField: (agentId: string, field: 'role' | 'model' | 'description', value: string) => void;
  readonly updateAgentList: (agentId: string, field: 'responsibilities' | 'skills' | 'tools' | 'mcp_servers', value: string) => void;
};

export const AgentSelectionView = ({ form, agent, removeAgent, updateAgentField, updateAgentList }: AgentSelectionViewProps): ReactElement => {
  return (
    <Stack spacing={2}>
      <Typography variant="h5">{agent.metadata?.name ?? agent.agent_id}</Typography>
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
    </Stack>
  );
};