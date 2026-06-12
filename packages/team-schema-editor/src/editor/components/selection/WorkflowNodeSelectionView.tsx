import type { ReactElement } from 'react';
import { Button, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material';

import { WorkflowNodeType } from '../../model/types';
import type { AgentDocument, TeamSchemaDocument, WorkflowGraphNode } from '../../model/types';
import { MemoryPolicyView } from './MemoryPolicyView';

type WorkflowNodeSelectionViewProps = {
  schema: TeamSchemaDocument;
  workflowNode: WorkflowGraphNode;
  updateWorkflowAgentNode: (nodeId: string, agentId: string) => void;
  updateWorkflowNodeMetadata: (nodeId: string, field: 'name' | 'description', value: string) => void;
  removeWorkflowDraftNode: (nodeId: string) => void;
  updateAgentField: (agentId: string, field: 'role' | 'model' | 'description' | 'memory_access_policy', value: string) => void;
  updateAgentList: (agentId: string, field: 'responsibilities' | 'skills' | 'tools' | 'mcp_servers', value: string) => void;
  updateAgentMetadataField: (agentId: string, field: 'name' | 'description' | 'profile' | 'tool_policy', value: string) => void;
  updateAgentMetadataList: (agentId: string, field: 'partials' | 'tools' | 'allowed_commands' | 'required_commands', value: string) => void;
  updateMemoryPolicyField: (field: 'retrieval_mode' | 'vector_store' | 'graph_store' | 'conflict_strategy', value: string) => void;
  updateMemoryPolicyList: (field: 'indexed_object_types' | 'evidence_required_for_outputs', value: string) => void;
  addMemoryRetrievalProfile: () => void;
  removeMemoryRetrievalProfile: (profileId: string) => void;
  updateMemoryRetrievalProfileField: (profileId: string, field: 'profile_id', value: string) => void;
  updateMemoryRetrievalProfileList: (profileId: string, field: 'allowed_scopes', value: string) => void;
  updateMemoryRetrievalProfileNumber: (profileId: string, field: 'max_results' | 'max_graph_hops', value: number) => void;
  updateMemoryRetrievalProfileBoolean: (profileId: string, field: 'require_reviewed_memory', value: boolean) => void;
};

const renderListValue = (items: readonly string[] | undefined): string => (items ?? []).join('\n');

const findAgent = (schema: TeamSchemaDocument, agentId: string | undefined): AgentDocument | undefined =>
  schema.agents.find((agent) => agent.agent_id === agentId);

const createAgentOptions = (schema: TeamSchemaDocument): ReactElement[] => [
  <MenuItem key="unassigned" value="">
    Unassigned
  </MenuItem>,
  ...schema.agents.map((agent) => (
    <MenuItem key={agent.agent_id} value={agent.agent_id}>
      {agent.metadata?.name ?? agent.agent_id}
    </MenuItem>
  )),
];

const createMemoryProfileOptions = (schema: TeamSchemaDocument): ReactElement[] => [
  <MenuItem key="none" value="">
    None
  </MenuItem>,
  ...(schema.memory_policy?.retrieval_profiles ?? []).map((profile) => (
    <MenuItem key={profile.profile_id} value={profile.profile_id}>
      {profile.profile_id}
    </MenuItem>
  )),
];

const toWorkflowNodeTitle = (workflowNode: WorkflowGraphNode): string => {
  if (workflowNode.data.workflowNodeType === WorkflowNodeType.Agent) {
    return 'Workflow Agent';
  }

  if (workflowNode.data.workflowNodeType === WorkflowNodeType.Pipeline) {
    return 'Workflow Pipeline';
  }

  return 'Workflow Part';
};

export const WorkflowNodeSelectionView = ({
  schema,
  workflowNode,
  updateWorkflowAgentNode,
  updateWorkflowNodeMetadata,
  removeWorkflowDraftNode,
  updateAgentField,
  updateAgentList,
  updateAgentMetadataField,
  updateAgentMetadataList,
  updateMemoryPolicyField,
  updateMemoryPolicyList,
  addMemoryRetrievalProfile,
  removeMemoryRetrievalProfile,
  updateMemoryRetrievalProfileField,
  updateMemoryRetrievalProfileList,
  updateMemoryRetrievalProfileNumber,
  updateMemoryRetrievalProfileBoolean,
}: WorkflowNodeSelectionViewProps): ReactElement => {
  const selectedAgentId = workflowNode.data.workflowAgentId ?? '';
  const agent = findAgent(schema, workflowNode.data.workflowAgentId);
  const agentOptions = createAgentOptions(schema);
  const memoryProfileOptions = createMemoryProfileOptions(schema);
  const isAgentWorkflowNode = workflowNode.data.workflowNodeType === WorkflowNodeType.Agent;

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h6">{workflowNode.data.workflowMetadata?.name ?? workflowNode.data.nodeName}</Typography>
        <Typography color="text.secondary" sx={{ fontSize: '0.86rem', wordBreak: 'break-all' }}>
          {toWorkflowNodeTitle(workflowNode)} · {workflowNode.id}
        </Typography>
      </Stack>

      <Button color="error" variant="outlined" onClick={() => removeWorkflowDraftNode(workflowNode.id)} sx={{ alignSelf: 'flex-start' }}>
        Delete Workflow Node
      </Button>

      {isAgentWorkflowNode ? (
        <TextField
          select
          fullWidth
          label="Loaded Agent"
          value={selectedAgentId}
          onChange={(event) => updateWorkflowAgentNode(workflowNode.id, event.target.value)}
        >
          {agentOptions}
        </TextField>
      ) : null}

      <Divider />
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 850, letterSpacing: 0 }}>
        Node Metadata
      </Typography>
      <TextField
        fullWidth
        label="Node Name"
        value={workflowNode.data.workflowMetadata?.name ?? workflowNode.data.nodeName}
        onChange={(event) => updateWorkflowNodeMetadata(workflowNode.id, 'name', event.target.value)}
      />
      <TextField
        fullWidth
        multiline
        minRows={3}
        label="Node Description"
        value={workflowNode.data.workflowMetadata?.description ?? workflowNode.data.detail ?? ''}
        onChange={(event) => updateWorkflowNodeMetadata(workflowNode.id, 'description', event.target.value)}
      />

      {!isAgentWorkflowNode ? (
        <Typography color="text.secondary" sx={{ lineHeight: 1.5 }}>
          This workflow node stores local orchestration metadata and can be connected with custom workflow edges.
        </Typography>
      ) : null}

      {isAgentWorkflowNode && agent === undefined ? (
        <Typography color="text.secondary" sx={{ lineHeight: 1.5 }}>
          Select a schema agent to edit its runtime configuration from this workflow node.
        </Typography>
      ) : null}

      {agent === undefined ? null : (
        <>
          <Divider />
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 850, letterSpacing: 0 }}>
            Agent Runtime
          </Typography>
          <TextField fullWidth label="Role" value={agent.role} onChange={(event) => updateAgentField(agent.agent_id, 'role', event.target.value)} />
          <TextField fullWidth label="Model" value={agent.model} onChange={(event) => updateAgentField(agent.agent_id, 'model', event.target.value)} />
          <TextField fullWidth multiline minRows={3} label="Description" value={agent.description ?? ''} onChange={(event) => updateAgentField(agent.agent_id, 'description', event.target.value)} />
          <TextField fullWidth multiline minRows={3} label="Responsibilities" value={renderListValue(agent.responsibilities)} onChange={(event) => updateAgentList(agent.agent_id, 'responsibilities', event.target.value)} />
          <TextField fullWidth multiline minRows={3} label="Skills" value={renderListValue(agent.skills)} onChange={(event) => updateAgentList(agent.agent_id, 'skills', event.target.value)} />
          <TextField fullWidth multiline minRows={3} label="Tools" value={renderListValue(agent.tools)} onChange={(event) => updateAgentList(agent.agent_id, 'tools', event.target.value)} />
          <TextField fullWidth multiline minRows={3} label="MCP Servers" value={renderListValue(agent.mcp_servers)} onChange={(event) => updateAgentList(agent.agent_id, 'mcp_servers', event.target.value)} />
          <TextField
            select
            fullWidth
            label="Memory Profile"
            value={agent.memory_access_policy ?? ''}
            onChange={(event) => updateAgentField(agent.agent_id, 'memory_access_policy', event.target.value)}
          >
            {memoryProfileOptions}
          </TextField>

          <Divider />
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 850, letterSpacing: 0 }}>
            Agent Metadata
          </Typography>
          <TextField fullWidth label="Metadata Name" value={agent.metadata?.name ?? agent.agent_id} onChange={(event) => updateAgentMetadataField(agent.agent_id, 'name', event.target.value)} />
          <TextField fullWidth multiline minRows={3} label="Metadata Description" value={agent.metadata?.description ?? ''} onChange={(event) => updateAgentMetadataField(agent.agent_id, 'description', event.target.value)} />
          <TextField fullWidth label="Profile" value={agent.metadata?.profile ?? ''} onChange={(event) => updateAgentMetadataField(agent.agent_id, 'profile', event.target.value)} />
          <TextField fullWidth label="Tool Policy" value={agent.metadata?.tool_policy ?? ''} onChange={(event) => updateAgentMetadataField(agent.agent_id, 'tool_policy', event.target.value)} />
          <TextField fullWidth multiline minRows={3} label="Partials" value={renderListValue(agent.metadata?.partials)} onChange={(event) => updateAgentMetadataList(agent.agent_id, 'partials', event.target.value)} />
          <TextField fullWidth multiline minRows={3} label="Metadata Tools" value={renderListValue(agent.metadata?.tools)} onChange={(event) => updateAgentMetadataList(agent.agent_id, 'tools', event.target.value)} />
          <TextField fullWidth multiline minRows={3} label="Allowed Commands" value={renderListValue(agent.metadata?.allowed_commands)} onChange={(event) => updateAgentMetadataList(agent.agent_id, 'allowed_commands', event.target.value)} />
          <TextField fullWidth multiline minRows={3} label="Required Commands" value={renderListValue(agent.metadata?.required_commands)} onChange={(event) => updateAgentMetadataList(agent.agent_id, 'required_commands', event.target.value)} />
        </>
      )}

      {isAgentWorkflowNode ? (
        <>
          <Divider />
          <MemoryPolicyView
            schema={schema}
            updateMemoryPolicyField={updateMemoryPolicyField}
            updateMemoryPolicyList={updateMemoryPolicyList}
            addMemoryRetrievalProfile={addMemoryRetrievalProfile}
            removeMemoryRetrievalProfile={removeMemoryRetrievalProfile}
            updateMemoryRetrievalProfileField={updateMemoryRetrievalProfileField}
            updateMemoryRetrievalProfileList={updateMemoryRetrievalProfileList}
            updateMemoryRetrievalProfileNumber={updateMemoryRetrievalProfileNumber}
            updateMemoryRetrievalProfileBoolean={updateMemoryRetrievalProfileBoolean}
          />
        </>
      ) : null}
    </Stack>
  );
};