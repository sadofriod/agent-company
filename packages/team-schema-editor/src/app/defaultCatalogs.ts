import type { CapabilityCatalogConfig } from './capabilityCatalog/types';
import { CAPABILITY_CATALOG_KIND, type CapabilityCatalogKind } from './capabilityCatalog/types';
import type { LlmGatewayConfig } from './llmGateway/types';

const DEFAULT_TIMESTAMP = '2026-07-05T00:00:00.000Z';

const createCapabilityConfig = (
  id: string,
  key: string,
  name: string,
  description: string,
): CapabilityCatalogConfig => ({
  id,
  key,
  name,
  description,
  createdAt: DEFAULT_TIMESTAMP,
  updatedAt: DEFAULT_TIMESTAMP,
});

const createGatewayConfig = (
  id: string,
  name: string,
  model: string,
  apiFormat: LlmGatewayConfig['apiFormat'],
): LlmGatewayConfig => ({
  id,
  name,
  provider: 'openai-compatible',
  model,
  apiFormat,
  baseUrl: 'https://gateway.internal.example/v1',
  createdAt: DEFAULT_TIMESTAMP,
  updatedAt: DEFAULT_TIMESTAMP,
});

export const DEFAULT_CAPABILITY_CATALOGS: Record<CapabilityCatalogKind, readonly CapabilityCatalogConfig[]> = {
  [CAPABILITY_CATALOG_KIND.Skills]: [
    createCapabilityConfig('default-skill-requirements-breakdown', 'requirements_breakdown', 'Requirements Breakdown', 'Clarify goals and decompose user requests into structured tickets.'),
    createCapabilityConfig('default-skill-owner-routing', 'owner_routing', 'Owner Routing', 'Assign the right owner and escalation path for a topic or ticket.'),
    createCapabilityConfig('default-skill-technical-planning', 'technical_planning', 'Technical Planning', 'Design implementation plans, contracts, and execution sequencing.'),
    createCapabilityConfig('default-skill-risk-review', 'risk_review', 'Risk Review', 'Identify delivery risks, blockers, and mitigation plans before execution.'),
    createCapabilityConfig('default-skill-rag-query-design', 'rag_query_design', 'RAG Query Design', 'Design memory retrieval queries and context assembly strategy.'),
    createCapabilityConfig('default-skill-evidence-summarization', 'evidence_summarization', 'Evidence Summarization', 'Summarize retrieved evidence into downstream handoff context.'),
    createCapabilityConfig('default-skill-implementation', 'implementation', 'Implementation', 'Produce code or other deliverables for the active pipeline step.'),
    createCapabilityConfig('default-skill-test-execution', 'test_execution', 'Test Execution', 'Run focused verification steps and report the result.'),
    createCapabilityConfig('default-skill-logic-review', 'logic_review', 'Logic Review', 'Check ownership, dependency, and orchestration correctness.'),
    createCapabilityConfig('default-skill-quality-review', 'quality_review', 'Quality Review', 'Review output quality, evidence completeness, and handoff consumability.'),
  ],
  [CAPABILITY_CATALOG_KIND.Tools]: [
    createCapabilityConfig('default-tool-ticket-router', 'ticket_router', 'Ticket Router', 'Route a topic into the correct ownership and ticket lane.'),
    createCapabilityConfig('default-tool-memory-policy-check', 'memory_policy_check', 'Memory Policy Check', 'Verify memory scope and governance constraints before retrieval.'),
    createCapabilityConfig('default-tool-ticket-context-lookup', 'ticket_context_lookup', 'Ticket Context Lookup', 'Read existing ticket context, status, and dependencies.'),
    createCapabilityConfig('default-tool-repository-search', 'repository_search', 'Repository Search', 'Search repository context before planning or execution.'),
    createCapabilityConfig('default-tool-vector-search', 'vector_search', 'Vector Search', 'Query the vector store for semantically similar memory.'),
    createCapabilityConfig('default-tool-graph-expand', 'graph_expand', 'Graph Expand', 'Traverse graph-linked memory and related evidence.'),
    createCapabilityConfig('default-tool-memory-conflict-scan', 'memory_conflict_scan', 'Memory Conflict Scan', 'Detect conflicting memory candidates before packaging context.'),
    createCapabilityConfig('default-tool-read-file', 'read_file', 'Read File', 'Read source files or generated artifacts during execution.'),
    createCapabilityConfig('default-tool-edit-file', 'edit_file', 'Edit File', 'Modify source files as part of implementation delivery.'),
    createCapabilityConfig('default-tool-run-tests', 'run_tests', 'Run Tests', 'Execute targeted tests or verification commands for the change.'),
    createCapabilityConfig('default-tool-emit-artifact-manifest', 'emit_artifact_manifest', 'Emit Artifact Manifest', 'Publish the structured deliverable and handoff manifest.'),
    createCapabilityConfig('default-tool-evidence-trace', 'evidence_trace', 'Evidence Trace', 'Inspect upstream evidence and citations for review decisions.'),
    createCapabilityConfig('default-tool-schema-lint', 'schema_lint', 'Schema Lint', 'Validate schema shape and review gate readiness.'),
  ],
  [CAPABILITY_CATALOG_KIND.McpServers]: [
    createCapabilityConfig('default-mcp-repository', 'repository_mcp', 'Repository MCP', 'Repository context server for planning and execution.'),
    createCapabilityConfig('default-mcp-pgvector', 'pgvector_mcp', 'PGVector MCP', 'Vector retrieval server for memory similarity search.'),
    createCapabilityConfig('default-mcp-graph-memory', 'graph_memory_mcp', 'Graph Memory MCP', 'Graph traversal server for related memory expansion.'),
    createCapabilityConfig('default-mcp-test-runner', 'test_runner_mcp', 'Test Runner MCP', 'Execution server for focused validation and test runs.'),
  ],
};

export const DEFAULT_LLM_GATEWAYS: readonly LlmGatewayConfig[] = [
  createGatewayConfig('default-gateway-reasoning-small', 'Example Reasoning Small', 'reasoning-small', 'openai_chat'),
  createGatewayConfig('default-gateway-reasoning-medium', 'Example Reasoning Medium', 'reasoning-medium', 'openai_chat'),
  createGatewayConfig('default-gateway-coding-medium', 'Example Coding Medium', 'coding-medium', 'openai_responses'),
];
