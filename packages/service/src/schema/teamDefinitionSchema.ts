import { z } from 'zod';

import type {
  AgentDefinition,
  AgentMetadata,
  Department,
  DiscussionPolicy,
  MemoryPolicy,
  MemoryRetrievalProfile,
  PipelinePolicy,
  TeamDefinition,
} from '../domain/organization';
import type { ReviewPolicy } from '../domain/review';
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
  })
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
    }),
  );

const departmentSchema = z
  .object({
    department_id: nonEmptyStringSchema,
    name: nonEmptyStringSchema,
    mission: nonEmptyStringSchema,
    decision_scope: stringArraySchema,
    agents: stringArraySchema,
    handoff_contracts: stringArraySchema.default([]),
  })
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
    responsibilities: stringArraySchema,
    input_contract: nonEmptyStringSchema,
    output_contract: nonEmptyStringSchema,
    skills: stringArraySchema.default([]),
    mcp_servers: stringArraySchema.default([]),
    tools: stringArraySchema.default([]),
    memory_access_policy: nonEmptyStringSchema.optional(),
    metadata: agentMetadataSchema.optional(),
    description: nonEmptyStringSchema.optional(),
  })
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
    max_rounds: integerSchema,
    supervisor_agent_id: nonEmptyStringSchema.optional(),
    conflict_resolution: conflictResolutionSchema,
    required_outputs: stringArraySchema,
  })
  .transform(
    (value): DiscussionPolicy => ({
      mode: value.mode,
      maxRounds: value.max_rounds,
      supervisorAgentId: value.supervisor_agent_id as DiscussionPolicy['supervisorAgentId'],
      conflictResolution: value.conflict_resolution,
      requiredOutputs: value.required_outputs,
    }),
  );

const pipelinePolicySchema = z
  .object({
    one_pipeline_per_ticket: z.literal(true),
    dag_required: z.literal(true),
    step_owner_required: z.boolean(),
    review_before_handoff: z.boolean(),
  })
  .transform(
    (value): PipelinePolicy => ({
      onePipelinePerTicket: value.one_pipeline_per_ticket,
      dagRequired: value.dag_required,
      stepOwnerRequired: value.step_owner_required,
      reviewBeforeHandoff: value.review_before_handoff,
    }),
  );

const memoryRetrievalProfileSchema = z
  .object({
    profile_id: nonEmptyStringSchema,
    allowed_scopes: z.array(memoryScopeSchema),
    max_results: integerSchema,
    max_graph_hops: integerSchema,
    require_reviewed_memory: z.boolean(),
  })
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
    indexed_object_types: z.array(indexedObjectTypeSchema),
    retrieval_profiles: z.array(memoryRetrievalProfileSchema),
    evidence_required_for_outputs: z.array(evidenceRequiredOutputSchema),
    conflict_strategy: memoryConflictStrategySchema,
  })
  .transform(
    (value): MemoryPolicy => ({
      retrievalMode: value.retrieval_mode,
      vectorStore: value.vector_store,
      graphStore: value.graph_store,
      indexedObjectTypes: value.indexed_object_types,
      retrievalProfiles: value.retrieval_profiles,
      evidenceRequiredForOutputs: value.evidence_required_for_outputs,
      conflictStrategy: value.conflict_strategy,
    }),
  );

const reviewPolicySchema = z
  .object({
    ticket_admission: z.array(reviewerKindSchema),
    step_completion: z.array(reviewerKindSchema),
    allowed_results: z.array(reviewStatusSchema),
  })
  .transform(
    (value): ReviewPolicy => ({
      ticketAdmission: value.ticket_admission,
      stepCompletion: value.step_completion,
      allowedResults: value.allowed_results,
    }),
  );

export const teamSchema = z
  .object({
    schema_version: nonEmptyStringSchema,
    team_id: nonEmptyStringSchema,
    team_name: nonEmptyStringSchema.optional(),
    departments: z.array(departmentSchema),
    agents: z.array(agentSchema),
    discussion_policy: discussionPolicySchema,
    pipeline_policy: pipelinePolicySchema,
    memory_policy: memoryPolicySchema.optional(),
    review_policy: reviewPolicySchema,
  })
  .transform(
    (value): TeamDefinition => ({
      schemaVersion: value.schema_version,
      teamId: value.team_id as TeamDefinition['teamId'],
      teamName: value.team_name,
      departments: value.departments,
      agents: value.agents,
      discussionPolicy: value.discussion_policy,
      pipelinePolicy: value.pipeline_policy,
      memoryPolicy: value.memory_policy,
      reviewPolicy: value.review_policy,
    }),
  );