import type { Connection, Edge, OnEdgesChange, OnNodesChange } from '@xyflow/react';

import type {
  Selection,
  TeamSchemaDocument,
  TeamSchemaRecord,
  ValidationIssue,
  WorkflowGraphNode,
  WorkflowEdgeMode,
} from '../../model/types';
import type {
  AgentField,
  AgentListField,
  AgentMetadataField,
  AgentMetadataListField,
  DepartmentField,
  DepartmentListField,
  DiscussionField,
  MemoryPolicyField,
  MemoryPolicyListField,
  MemoryRetrievalProfileBooleanField,
  MemoryRetrievalProfileField,
  MemoryRetrievalProfileListField,
  MemoryRetrievalProfileNumberField,
  SchemaField,
  SchemaLoadStatus,
} from '../../state/core/editorShared';

export enum SchemaServiceStatus {
  Idle = 'idle',
  Loading = 'loading',
  Saving = 'saving',
  Deleting = 'deleting',
  Validating = 'validating',
  Error = 'error',
}

export type TeamSchemaServiceModel = {
  schemaServiceStatus: SchemaServiceStatus;
  schemaServiceError: string | null;
  schemaServiceMessage: string | null;
  schemaRecords: TeamSchemaRecord[];
  selectedSchemaKey: string | null;
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
  updateWorkflowNodeMetadata: (nodeId: string, field: WorkflowMetadataField, value: string) => void;
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
  selectedSchemaKey: string | null;
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
  updateWorkflowNodeMetadata: (nodeId: string, field: WorkflowMetadataField, value: string) => void;
  removeWorkflowDraftNode: (nodeId: string) => void;
  addWorkflowEdge: (connection: Connection, mode: WorkflowEdgeMode) => void;
  edgeConnectionError: string | null;
  clearEdgeConnectionError: () => void;
  updateTeamField: (field: SchemaField, value: string) => void;
  updateDepartmentField: (departmentId: string, field: DepartmentField, value: string) => void;
  updateDepartmentList: (departmentId: string, field: DepartmentListField, value: string) => void;
  updateAgentField: (agentId: string, field: AgentField, value: string) => void;
  updateAgentList: (agentId: string, field: AgentListField, value: string) => void;
  updateAgentMetadataField: (agentId: string, field: AgentMetadataField, value: string) => void;
  updateAgentMetadataList: (agentId: string, field: AgentMetadataListField, value: string) => void;
  updateDiscussionField: (field: DiscussionField, value: string) => void;
  updateDiscussionNumber: (field: 'max_rounds', value: number) => void;
  updateMemoryPolicyField: (field: MemoryPolicyField, value: string) => void;
  updateMemoryPolicyList: (field: MemoryPolicyListField, value: string) => void;
  addMemoryRetrievalProfile: () => void;
  removeMemoryRetrievalProfile: (profileId: string) => void;
  updateMemoryRetrievalProfileField: (profileId: string, field: MemoryRetrievalProfileField, value: string) => void;
  updateMemoryRetrievalProfileList: (profileId: string, field: MemoryRetrievalProfileListField, value: string) => void;
  updateMemoryRetrievalProfileNumber: (profileId: string, field: MemoryRetrievalProfileNumberField, value: number) => void;
  updateMemoryRetrievalProfileBoolean: (profileId: string, field: MemoryRetrievalProfileBooleanField, value: boolean) => void;
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

export enum WorkflowMetadataField {
  Name = 'name',
  Description = 'description',
}
