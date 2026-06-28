import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ChevronDown } from 'lucide-react';

import { CAPABILITY_CATALOG_KIND } from '../../../app/capabilityCatalog/types';
import {
  CAPABILITY_CATALOG_STORAGE_EVENT,
  listCapabilityCatalogConfigs,
} from '../../../app/capabilityCatalog/storage';
import { LLM_GATEWAY_STORAGE_EVENT, listLlmGatewayConfigs } from '../../../app/llmGateway/llmGatewayStorage';
import { createAgentLlmDocumentFromGateway, type LlmGatewayConfig } from '../../../app/llmGateway/types';
import { WorkflowNodeType } from '../../model/types';
import type { AgentDocument, AgentLlmDocument, TeamSchemaDocument, WorkflowGraphNode } from '../../model/types';
import { MemoryPolicyView } from './MemoryPolicyView';
import {
  AgentField,
  AgentListField,
  AgentMetadataField,
  AgentMetadataListField,
  MemoryPolicyField,
  MemoryPolicyListField,
  MemoryRetrievalProfileBooleanField,
  MemoryRetrievalProfileField,
  MemoryRetrievalProfileListField,
  MemoryRetrievalProfileNumberField,
} from '../../state/core/editorShared';
import { WorkflowMetadataField } from '../../hooks/helper/teamEditor.types';

type WorkflowNodeSelectionViewProps = {
  schema: TeamSchemaDocument;
  workflowNode: WorkflowGraphNode;
  updateWorkflowAgentNode: (nodeId: string, agentId: string) => void;
  updateWorkflowNodeMetadata: (nodeId: string, field: WorkflowMetadataField, value: string) => void;
  removeWorkflowDraftNode: (nodeId: string) => void;
  updateAgentField: (agentId: string, field: AgentField, value: string) => void;
  updateAgentLlmBinding: (agentId: string, llm: AgentLlmDocument | null) => void;
  updateAgentList: (agentId: string, field: AgentListField, value: string) => void;
  updateAgentMetadataField: (agentId: string, field: AgentMetadataField, value: string) => void;
  updateAgentMetadataList: (agentId: string, field: AgentMetadataListField, value: string) => void;
  updateMemoryPolicyField: (field: MemoryPolicyField, value: string) => void;
  updateMemoryPolicyList: (field: MemoryPolicyListField, value: string) => void;
  addMemoryRetrievalProfile: () => void;
  removeMemoryRetrievalProfile: (profileId: string) => void;
  updateMemoryRetrievalProfileField: (profileId: string, field: MemoryRetrievalProfileField, value: string) => void;
  updateMemoryRetrievalProfileList: (profileId: string, field: MemoryRetrievalProfileListField, value: string) => void;
  updateMemoryRetrievalProfileNumber: (profileId: string, field: MemoryRetrievalProfileNumberField, value: number) => void;
  updateMemoryRetrievalProfileBoolean: (profileId: string, field: MemoryRetrievalProfileBooleanField, value: boolean) => void;
};

type ConfigSectionProps = {
  title: string;
  defaultExpanded?: boolean;
  children: ReactNode;
};

const renderListValue = (items: readonly string[] | undefined): string => (items ?? []).join('\n');

const findAgent = (schema: TeamSchemaDocument, agentId: string | undefined): AgentDocument | undefined =>
  schema.agents.find((agent) => agent.agent_id === agentId);

const normalizeOptional = (value: string | undefined): string => value?.trim() ?? '';

const stripBearerPrefix = (value: string): string => {
  const match = value.match(/^bearer\s+(.+)$/i);
  return match === null ? value.trim() : match[1]?.trim() ?? '';
};

const resolveApiKeyFromHeaders = (headers: AgentLlmDocument['headers'] | undefined): string => {
  if (headers === undefined) {
    return '';
  }

  const authorization = headers.Authorization ?? headers.authorization;
  if (typeof authorization === 'string' && authorization.trim().length > 0) {
    return stripBearerPrefix(authorization);
  }

  const xApiKey = headers['x-api-key'] ?? headers['X-API-Key'];
  return typeof xApiKey === 'string' ? xApiKey.trim() : '';
};

const resolveApiKeyFromLlm = (llm: AgentLlmDocument): string => {
  const headerApiKey = resolveApiKeyFromHeaders(llm.headers);
  if (headerApiKey.length > 0) {
    return headerApiKey;
  }

  return normalizeOptional(llm.api_key_env);
};

const isGatewayMatchLlm = (gateway: LlmGatewayConfig, llm: AgentLlmDocument): boolean => (
  gateway.provider === llm.provider
  && gateway.model === normalizeOptional(llm.model)
  && normalizeOptional(gateway.apiFormat) === normalizeOptional(llm.api_format)
  && normalizeOptional(gateway.baseUrl) === normalizeOptional(llm.base_url)
  && normalizeOptional(gateway.apiKey) === resolveApiKeyFromLlm(llm)
);

const resolveSelectedGatewayId = (agent: AgentDocument, gateways: readonly LlmGatewayConfig[]): string => {
  const llm = agent.metadata?.llm;
  if (llm === undefined) {
    return '';
  }

  const matchedGateway = gateways.find((gateway) => isGatewayMatchLlm(gateway, llm));
  return matchedGateway?.id ?? '';
};

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

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string') {
    return [value];
  }

  return [];
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

const createSection = ({ title, defaultExpanded = false, children }: ConfigSectionProps): ReactElement => (
  <Accordion disableGutters defaultExpanded={defaultExpanded} sx={{ border: '1px solid #d7dde5', borderRadius: '8px !important', boxShadow: 'none' }}>
    <AccordionSummary expandIcon={<ChevronDown size={16} />}>
      <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Stack spacing={1.5}>{children}</Stack>
    </AccordionDetails>
  </Accordion>
);

export const WorkflowNodeSelectionView = ({
  schema,
  workflowNode,
  updateWorkflowAgentNode,
  updateWorkflowNodeMetadata,
  removeWorkflowDraftNode,
  updateAgentField,
  updateAgentLlmBinding,
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

  const selectedAgentId = workflowNode.data.workflowAgentId ?? '';
  const agent = findAgent(schema, workflowNode.data.workflowAgentId);
  const agentOptions = createAgentOptions(schema);
  const memoryProfileOptions = createMemoryProfileOptions(schema);
  const isAgentWorkflowNode = workflowNode.data.workflowNodeType === WorkflowNodeType.Agent;
  const selectedGatewayId = agent === undefined ? '' : resolveSelectedGatewayId(agent, llmGateways);
  const selectedGateway = llmGateways.find((item) => item.id === selectedGatewayId);

  const skillOptions = mergeUnique(skillCatalog.map((item) => item.key), agent?.skills ?? []);
  const toolOptions = mergeUnique(toolCatalog.map((item) => item.key), agent?.tools ?? [], agent?.metadata?.tools ?? []);
  const mcpOptions = mergeUnique(mcpCatalog.map((item) => item.key), agent?.mcp_servers ?? []);
  const modelOptions = mergeUnique(
    llmGateways.map((item) => item.model),
    selectedGateway === undefined ? [] : [selectedGateway.model],
    agent === undefined ? [] : [agent.metadata?.llm?.model ?? agent.model],
  );

  const onGatewayChange = (agentId: string, gatewayId: string): void => {
    if (gatewayId.length === 0) {
      updateAgentLlmBinding(agentId, null);
      return;
    }

    const gateway = llmGateways.find((item) => item.id === gatewayId);
    if (gateway === undefined) {
      return;
    }

    updateAgentLlmBinding(agentId, createAgentLlmDocumentFromGateway(gateway));
  };

  const onModelChange = (agentDocument: AgentDocument, modelValue: string): void => {
    const currentLlm = agentDocument.metadata?.llm;
    if (currentLlm !== undefined) {
      updateAgentLlmBinding(agentDocument.agent_id, { ...currentLlm, model: modelValue });
      return;
    }

    updateAgentField(agentDocument.agent_id, AgentField.Model, modelValue);
  };

  return (
    <Stack spacing={1.5} sx={{ minHeight: 0, maxHeight: { xs: 'none', lg: 'calc(100vh - 210px)' }, overflowY: 'auto', pr: 0.5 }}>
      <Stack spacing={0.5}>
        <Typography variant="h6">{workflowNode.data.workflowMetadata?.name ?? workflowNode.data.nodeName}</Typography>
        <Typography color="text.secondary" sx={{ fontSize: '0.86rem', wordBreak: 'break-all' }}>
          {toWorkflowNodeTitle(workflowNode)} · {workflowNode.id}
        </Typography>
      </Stack>

      {createSection({
        title: 'Node Basics',
        defaultExpanded: true,
        children: (
          <>
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

            <TextField
              fullWidth
              label="Node Name"
              value={workflowNode.data.workflowMetadata?.name ?? workflowNode.data.nodeName}
              onChange={(event) => updateWorkflowNodeMetadata(workflowNode.id, WorkflowMetadataField.Name, event.target.value)}
            />
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Node Description"
              value={workflowNode.data.workflowMetadata?.description ?? workflowNode.data.detail ?? ''}
              onChange={(event) => updateWorkflowNodeMetadata(workflowNode.id, WorkflowMetadataField.Description, event.target.value)}
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
          </>
        ),
      })}

      {agent === undefined ? null : createSection({
        title: 'Agent Runtime',
        defaultExpanded: true,
        children: (
          <>
            <TextField
              fullWidth
              label="Role"
              value={agent.role}
              onChange={(event) => updateAgentField(agent.agent_id, AgentField.Role, event.target.value)}
            />
            <TextField
              select
              fullWidth
              label="LLM API"
              value={selectedGatewayId}
              onChange={(event) => onGatewayChange(agent.agent_id, event.target.value)}
              helperText={llmGateways.length === 0 ? 'No LLM API configured. Add one in the LLM Gateway page.' : 'Select an LLM API entry for this workflow agent.'}
            >
              <MenuItem value="">Use agent default model</MenuItem>
              {llmGateways.map((gateway) => (
                <MenuItem key={gateway.id} value={gateway.id}>
                  {gateway.name} ({gateway.provider}/{gateway.model})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Model"
              value={agent.metadata?.llm?.model ?? agent.model}
              onChange={(event) => onModelChange(agent, event.target.value)}
              helperText={
                agent.metadata?.llm === undefined
                  ? 'Used when no LLM API is selected.'
                  : 'Overrides model for the selected LLM API.'
              }
            >
              {modelOptions.length === 0 ? (
                <MenuItem value="" disabled>No model options available</MenuItem>
              ) : null}
              {modelOptions.map((modelName) => (
                <MenuItem key={modelName} value={modelName}>{modelName}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Description"
              value={agent.description ?? ''}
              onChange={(event) => updateAgentField(agent.agent_id, AgentField.Description, event.target.value)}
            />
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Responsibilities"
              value={renderListValue(agent.responsibilities)}
              onChange={(event) => updateAgentList(agent.agent_id, AgentListField.Responsibilities, event.target.value)}
            />
          </>
        ),
      })}

      {agent === undefined ? null : createSection({
        title: 'Agent Capabilities',
        defaultExpanded: true,
        children: (
          <>
            <TextField
              select
              fullWidth
              label="Skills"
              value={agent.skills}
              onChange={(event) => updateAgentList(agent.agent_id, AgentListField.Skills, toStringArray(event.target.value).join('\n'))}
              slotProps={{
                select: {
                  multiple: true,
                },
              }}
              helperText={skillOptions.length === 0 ? 'No skills configured yet. Add entries in Skills page.' : 'Multi-select from configured skills.'}
            >
              {skillOptions.map((item) => (
                <MenuItem key={item} value={item}>{item}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Tools"
              value={agent.tools}
              onChange={(event) => updateAgentList(agent.agent_id, AgentListField.Tools, toStringArray(event.target.value).join('\n'))}
              slotProps={{
                select: {
                  multiple: true,
                },
              }}
              helperText={toolOptions.length === 0 ? 'No tools configured yet. Add entries in Tools page.' : 'Multi-select from configured tools.'}
            >
              {toolOptions.map((item) => (
                <MenuItem key={item} value={item}>{item}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="MCP Servers"
              value={agent.mcp_servers}
              onChange={(event) => updateAgentList(agent.agent_id, AgentListField.McpServers, toStringArray(event.target.value).join('\n'))}
              slotProps={{
                select: {
                  multiple: true,
                },
              }}
              helperText={mcpOptions.length === 0 ? 'No MCP servers configured yet. Add entries in MCP page.' : 'Multi-select from configured MCP servers.'}
            >
              {mcpOptions.map((item) => (
                <MenuItem key={item} value={item}>{item}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Memory Profile"
              value={agent.memory_access_policy ?? ''}
              onChange={(event) => updateAgentField(agent.agent_id, AgentField.MemoryAccessPolicy, event.target.value)}
            >
              {memoryProfileOptions}
            </TextField>
          </>
        ),
      })}

      {agent === undefined ? null : createSection({
        title: 'Agent Metadata',
        children: (
          <>
            <TextField
              fullWidth
              label="Metadata Name"
              value={agent.metadata?.name ?? agent.agent_id}
              onChange={(event) => updateAgentMetadataField(agent.agent_id, AgentMetadataField.Name, event.target.value)}
            />
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Metadata Description"
              value={agent.metadata?.description ?? ''}
              onChange={(event) => updateAgentMetadataField(agent.agent_id, AgentMetadataField.Description, event.target.value)}
            />
            <TextField
              fullWidth
              label="Profile"
              value={agent.metadata?.profile ?? ''}
              onChange={(event) => updateAgentMetadataField(agent.agent_id, AgentMetadataField.Profile, event.target.value)}
            />
            <TextField
              fullWidth
              label="Tool Policy"
              value={agent.metadata?.tool_policy ?? ''}
              onChange={(event) => updateAgentMetadataField(agent.agent_id, AgentMetadataField.ToolPolicy, event.target.value)}
            />
            <Divider />
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Partials"
              value={renderListValue(agent.metadata?.partials)}
              onChange={(event) => updateAgentMetadataList(agent.agent_id, AgentMetadataListField.Partials, event.target.value)}
            />
            <TextField
              select
              fullWidth
              label="Metadata Tools"
              value={agent.metadata?.tools ?? []}
              onChange={(event) => updateAgentMetadataList(agent.agent_id, AgentMetadataListField.Tools, toStringArray(event.target.value).join('\n'))}
              slotProps={{
                select: {
                  multiple: true,
                },
              }}
            >
              {toolOptions.map((item) => (
                <MenuItem key={item} value={item}>{item}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Allowed Commands"
              value={renderListValue(agent.metadata?.allowed_commands)}
              onChange={(event) => updateAgentMetadataList(agent.agent_id, AgentMetadataListField.AllowedCommands, event.target.value)}
            />
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Required Commands"
              value={renderListValue(agent.metadata?.required_commands)}
              onChange={(event) => updateAgentMetadataList(agent.agent_id, AgentMetadataListField.RequiredCommands, event.target.value)}
            />
          </>
        ),
      })}

      {isAgentWorkflowNode ? createSection({
        title: 'Memory Policy',
        children: (
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
        ),
      }) : null}
    </Stack>
  );
};
