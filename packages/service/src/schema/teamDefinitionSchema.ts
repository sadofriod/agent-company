import { z } from 'zod';

import { LLM_API_FORMAT } from '../domain/organization';
import type {
  AgentDefinition,
  AgentLlmBinding,
  AgentMetadata,
  Department,
  DiscussionPolicy,
  EvidenceRequiredOutputType,
  MemoryPolicy,
  MemoryRetrievalProfile,
  TeamDefinition,
} from '../domain/organization';
import {
  conflictResolutionSchema,
  discussionModeSchema,
  evidenceRequiredOutputSchema,
  indexedObjectTypeSchema,
  integerSchema,
  memoryConflictStrategySchema,
  memoryScopeSchema,
  nonEmptyStringSchema,
  retrievalModeSchema,
  reviewerKindSchema,
  reviewStatusSchema,
  stringArraySchema,
} from './teamSchemaShared';

const llmApiFormatSchema = z.enum([
  LLM_API_FORMAT.OpenAIChat,
  LLM_API_FORMAT.OpenAIResponses,
  LLM_API_FORMAT.AnthropicMessages,
  LLM_API_FORMAT.GoogleGenerateContent,
  LLM_API_FORMAT.Custom,
]);

const llmHeadersSchema = z.record(nonEmptyStringSchema).default({});

const agentLlmBindingSchema = z
  .object({
    provider: nonEmptyStringSchema,
    model: nonEmptyStringSchema.optional(),
    api_format: llmApiFormatSchema.optional(),
    base_url: nonEmptyStringSchema.optional(),
    api_key_env: nonEmptyStringSchema.optional(),
    headers: llmHeadersSchema,
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: integerSchema.min(1).optional(),
    top_p: z.number().gt(0).max(1).optional(),
  })
  .strict()
  .transform(
    (value): AgentLlmBinding => ({
      provider: value.provider,
      model: value.model,
      apiFormat: value.api_format,
      baseUrl: value.base_url,
      apiKeyEnv: value.api_key_env,
      headers: value.headers,
      temperature: value.temperature,
      maxTokens: value.max_tokens,
      topP: value.top_p,
    }),
  );

const agentMetadataSchema = z
  .object({
    name: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    profile: nonEmptyStringSchema.optional(),
    tool_policy: nonEmptyStringSchema.optional(),
    partials: stringArraySchema.default([]),
    tools: stringArraySchema.default([]),
    allowed_commands: stringArraySchema.default([]),
    required_commands: stringArraySchema.default([]),
    llm: agentLlmBindingSchema.optional(),
  })
  .strict()
  .transform(
    (value): AgentMetadata => ({
      name: value.name,
      description: value.description,
      profile: value.profile,
      toolPolicy: value.tool_policy,
      partials: value.partials,
      tools: value.tools,
      allowedCommands: value.allowed_commands,
      requiredCommands: value.required_commands,
      llm: value.llm,
    }),
  );

const departmentSchema = z
  .object({
    department_id: nonEmptyStringSchema,
    name: nonEmptyStringSchema,
    mission: nonEmptyStringSchema,
    decision_scope: stringArraySchema,
    agents: stringArraySchema.min(1),
    handoff_contracts: stringArraySchema.default([]),
  })
  .strict()
  .transform(
    (value): Department => ({
      departmentId: value.department_id as Department['departmentId'],
      name: value.name,
      mission: value.mission,
      decisionScope: value.decision_scope,
      agentIds: value.agents as unknown as Department['agentIds'],
      handoffContracts: value.handoff_contracts,
    }),
  );

const agentSchema = z
  .object({
    agent_id: nonEmptyStringSchema,
    department_id: nonEmptyStringSchema,
    role: nonEmptyStringSchema,
    model: nonEmptyStringSchema,
    responsibilities: stringArraySchema.min(1),
    input_contract: nonEmptyStringSchema,
    output_contract: nonEmptyStringSchema,
    skills: stringArraySchema.default([]),
    mcp_servers: stringArraySchema.default([]),
    tools: stringArraySchema.default([]),
    memory_access_policy: nonEmptyStringSchema.optional(),
    metadata: agentMetadataSchema.optional(),
    description: nonEmptyStringSchema.optional(),
  })
  .strict()
  .transform(
    (value): AgentDefinition => ({
      agentId: value.agent_id as AgentDefinition['agentId'],
      departmentId: value.department_id as AgentDefinition['departmentId'],
      role: value.role,
      model: value.model,
      responsibilities: value.responsibilities,
      inputContract: value.input_contract,
      outputContract: value.output_contract,
      skillIds: value.skills,
      mcpServerIds: value.mcp_servers,
      toolIds: value.tools,
      memoryAccessProfileId: value.memory_access_policy as AgentDefinition['memoryAccessProfileId'],
      metadata: value.metadata,
      description: value.description,
    }),
  );

const discussionPolicySchema = z
  .object({
    mode: discussionModeSchema,
    max_rounds: integerSchema.min(1).max(10),
    supervisor_agent_id: nonEmptyStringSchema.optional(),
    conflict_resolution: conflictResolutionSchema,
    required_outputs: stringArraySchema.min(1),
  })
  .strict()
  .transform(
    (value): DiscussionPolicy => ({
      mode: value.mode,
      maxRounds: value.max_rounds,
      supervisorAgentId: value.supervisor_agent_id as DiscussionPolicy['supervisorAgentId'],
      conflictResolution: value.conflict_resolution,
      requiredOutputs: value.required_outputs,
    }),
  );

const memoryRetrievalProfileSchema = z
  .object({
    profile_id: nonEmptyStringSchema,
    allowed_scopes: z.array(memoryScopeSchema).min(1),
    max_results: integerSchema.min(1).max(50),
    max_graph_hops: integerSchema.min(0).max(3),
    require_reviewed_memory: z.boolean(),
  })
  .strict()
  .transform(
    (value): MemoryRetrievalProfile => ({
      profileId: value.profile_id as MemoryRetrievalProfile['profileId'],
      allowedScopes: value.allowed_scopes,
      maxResults: value.max_results,
      maxGraphHops: value.max_graph_hops,
      requireReviewedMemory: value.require_reviewed_memory,
    }),
  );

const memoryPolicySchema = z
  .object({
    retrieval_mode: retrievalModeSchema,
    vector_store: nonEmptyStringSchema.optional(),
    graph_store: nonEmptyStringSchema.optional(),
    indexed_object_types: z.array(indexedObjectTypeSchema).min(1),
    retrieval_profiles: z.array(memoryRetrievalProfileSchema).min(1),
    evidence_required_for_outputs: z.array(evidenceRequiredOutputSchema),
    conflict_strategy: memoryConflictStrategySchema,
  })
  .strict()
  .transform(
    (value): MemoryPolicy => ({
      retrievalMode: value.retrieval_mode,
      vectorStore: value.vector_store,
      graphStore: value.graph_store,
      indexedObjectTypes: value.indexed_object_types,
      retrievalProfiles: value.retrieval_profiles,
      evidenceRequiredForOutputs: value.evidence_required_for_outputs as readonly EvidenceRequiredOutputType[],
      conflictStrategy: value.conflict_strategy,
    }),
  );

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(jsonValueSchema),
  z.record(jsonValueSchema),
]));

const workflowLayoutPositionSchema = z
  .object({
    x: z.number(),
    y: z.number(),
  })
  .strict();

const workflowLayoutNodeSchema = z
  .object({
    id: nonEmptyStringSchema,
    type: nonEmptyStringSchema.optional(),
    position: workflowLayoutPositionSchema,
    data: z.record(jsonValueSchema).optional(),
    style: z.record(jsonValueSchema).optional(),
  })
  .strict();

const workflowLayoutEdgeSchema = z
  .object({
    id: nonEmptyStringSchema,
    source: nonEmptyStringSchema,
    target: nonEmptyStringSchema,
    sourceHandle: z.string().nullable().optional(),
    targetHandle: z.string().nullable().optional(),
    type: nonEmptyStringSchema.optional(),
    animated: z.boolean().optional(),
    data: z.record(jsonValueSchema).optional(),
    markerStart: jsonValueSchema.optional(),
    markerEnd: jsonValueSchema.optional(),
    style: z.record(jsonValueSchema).optional(),
  })
  .strict();

const workflowLayoutSchema = z
  .object({
    nodes: z.array(workflowLayoutNodeSchema),
    edges: z.array(workflowLayoutEdgeSchema),
  })
  .strict();

export const teamSchema = z
  .object({
    schema_version: nonEmptyStringSchema,
    team_id: nonEmptyStringSchema,
    team_name: nonEmptyStringSchema.optional(),
    departments: z.array(departmentSchema).min(1),
    agents: z.array(agentSchema).min(1),
    discussion_policy: discussionPolicySchema,
    memory_policy: memoryPolicySchema.optional(),
    layout: workflowLayoutSchema.optional(),
  })
  .strict()
  .transform(
    (value): TeamDefinition => ({
      schemaVersion: value.schema_version,
      teamId: value.team_id as TeamDefinition['teamId'],
      teamName: value.team_name,
      departments: value.departments,
      agents: value.agents,
      discussionPolicy: value.discussion_policy,
      memoryPolicy: value.memory_policy,
			layout: value.layout as TeamDefinition['layout'],
    }),
  );