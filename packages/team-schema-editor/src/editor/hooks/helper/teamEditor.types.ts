import type { Connection, Edge, OnEdgesChange, OnNodesChange } from '@xyflow/react';

import type {
  Selection,
  TeamSchemaDocument,
  TeamSchemaRecord,
  ValidationIssue,
  WorkflowGraphNode,
  WorkflowEdgeMode,
} from '../../model/types';
import type { SchemaLoadStatus } from '../../state/core/editorShared';

export type SchemaServiceStatus = 'idle' | 'loading' | 'saving' | 'deleting' | 'validating' | 'error';

export type TeamSchemaServiceModel = {
  schemaServiceStatus: SchemaServiceStatus;
  schemaServiceError: string | null;
  schemaServiceMessage: string | null;
  schemaRecords: TeamSchemaRecord[];
  selectedSchemaKey: string;
  draftSchemaKey: string;
  updateDraftSchemaKey: (key: string) => void;
  createSchema: (schema: TeamSchemaDocument) => Promise<void>;
  refreshSchemaRecords: () => Promise<void>;
  reloadSchema: () => Promise<void>;
  selectSchemaKey: (key: string) => Promise<void>;
  validateSchema: (schema: TeamSchemaDocument) => Promise<void>;
  saveSchema: (schema: TeamSchemaDocument) => Promise<void>;
  deleteSchema: () => Promise<void>;
};

export type WorkflowGraphEditorModel = {
  nodes: WorkflowGraphNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<WorkflowGraphNode>;
  onEdgesChange: OnEdgesChange<Edge>;
  onNodeSelect: (nodeId: string | null) => void;
  addWorkflowAgentNode: () => void;
  addWorkflowPartNode: () => void;
  addWorkflowPipelineNode: () => void;
  updateWorkflowAgentNode: (nodeId: string, agentId: string) => void;
  updateWorkflowNodeMetadata: (nodeId: string, field: 'name' | 'description', value: string) => void;
  removeWorkflowDraftNode: (nodeId: string) => void;
  addWorkflowEdge: (connection: Connection, mode: WorkflowEdgeMode) => void;
  edgeConnectionError: string | null;
  clearEdgeConnectionError: () => void;
};

export type TeamEditorModel = {
  schema: TeamSchemaDocument;
  schemaLoadStatus: SchemaLoadStatus;
  schemaLoadError: string | null;
  schemaServiceStatus: SchemaServiceStatus;
  schemaServiceError: string | null;
  schemaServiceMessage: string | null;
  schemaRecords: TeamSchemaRecord[];
  selectedSchemaKey: string;
  draftSchemaKey: string;
  validationIssues: readonly ValidationIssue[];
  nodes: WorkflowGraphNode[];
  edges: Edge[];
  selection: Selection;
  onNodesChange: OnNodesChange<WorkflowGraphNode>;
  onEdgesChange: OnEdgesChange<Edge>;
  onNodeSelect: (nodeId: string | null) => void;
  addWorkflowAgentNode: () => void;
  addWorkflowPartNode: () => void;
  addWorkflowPipelineNode: () => void;
  updateWorkflowAgentNode: (nodeId: string, agentId: string) => void;
  updateWorkflowNodeMetadata: (nodeId: string, field: 'name' | 'description', value: string) => void;
  removeWorkflowDraftNode: (nodeId: string) => void;
  addWorkflowEdge: (connection: Connection, mode: WorkflowEdgeMode) => void;
  edgeConnectionError: string | null;
  clearEdgeConnectionError: () => void;
  updateTeamField: (field: 'team_name' | 'team_id' | 'schema_version', value: string) => void;
  updateDepartmentField: (departmentId: string, field: 'name' | 'mission', value: string) => void;
  updateDepartmentList: (departmentId: string, field: 'decision_scope' | 'handoff_contracts', value: string) => void;
  updateAgentField: (agentId: string, field: 'role' | 'model' | 'description' | 'memory_access_policy', value: string) => void;
  updateAgentList: (agentId: string, field: 'responsibilities' | 'skills' | 'tools' | 'mcp_servers', value: string) => void;
  updateAgentMetadataField: (agentId: string, field: 'name' | 'description' | 'profile' | 'tool_policy', value: string) => void;
  updateAgentMetadataList: (agentId: string, field: 'partials' | 'tools' | 'allowed_commands' | 'required_commands', value: string) => void;
  updateDiscussionField: (field: 'mode' | 'conflict_resolution' | 'supervisor_agent_id', value: string) => void;
  updateDiscussionNumber: (field: 'max_rounds', value: number) => void;
  updateMemoryPolicyField: (field: 'retrieval_mode' | 'vector_store' | 'graph_store' | 'conflict_strategy', value: string) => void;
  updateMemoryPolicyList: (field: 'indexed_object_types' | 'evidence_required_for_outputs', value: string) => void;
  addMemoryRetrievalProfile: () => void;
  removeMemoryRetrievalProfile: (profileId: string) => void;
  updateMemoryRetrievalProfileField: (profileId: string, field: 'profile_id', value: string) => void;
  updateMemoryRetrievalProfileList: (profileId: string, field: 'allowed_scopes', value: string) => void;
  updateMemoryRetrievalProfileNumber: (profileId: string, field: 'max_results' | 'max_graph_hops', value: number) => void;
  updateMemoryRetrievalProfileBoolean: (profileId: string, field: 'require_reviewed_memory', value: boolean) => void;
  addDepartment: () => void;
  removeDepartment: (departmentId: string) => void;
  addAgent: (departmentId: string) => void;
  removeAgent: (agentId: string) => void;
  updateDraftSchemaKey: (key: string) => void;
  createSchema: () => Promise<void>;
  refreshSchemaRecords: () => Promise<void>;
  reloadSchema: () => Promise<void>;
  selectSchemaKey: (key: string) => Promise<void>;
  validateSchema: () => Promise<void>;
  saveSchema: () => Promise<void>;
  deleteSchema: () => Promise<void>;
};
