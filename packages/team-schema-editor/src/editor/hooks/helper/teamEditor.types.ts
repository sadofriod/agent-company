import type { Connection, Edge, OnNodesChange } from '@xyflow/react';

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
  createSchema: () => Promise<void>;
  refreshSchemaRecords: () => Promise<void>;
  reloadSchema: () => Promise<void>;
  selectSchemaKey: (key: string) => Promise<void>;
  validateSchema: () => Promise<void>;
  saveSchema: () => Promise<void>;
  deleteSchema: () => Promise<void>;
};

export type WorkflowGraphEditorModel = {
  nodes: WorkflowGraphNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<WorkflowGraphNode>;
  onNodeSelect: (nodeId: string | null) => void;
  addWorkflowAgentNode: (agentId: string) => void;
  addWorkflowPartNode: () => void;
  addWorkflowPipelineNode: () => void;
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
  onNodeSelect: (nodeId: string | null) => void;
  addWorkflowAgentNode: (agentId: string) => void;
  addWorkflowPartNode: () => void;
  addWorkflowPipelineNode: () => void;
  addWorkflowEdge: (connection: Connection, mode: WorkflowEdgeMode) => void;
  edgeConnectionError: string | null;
  clearEdgeConnectionError: () => void;
  updateTeamField: (field: 'team_name' | 'team_id' | 'schema_version', value: string) => void;
  updateDepartmentField: (departmentId: string, field: 'name' | 'mission', value: string) => void;
  updateDepartmentList: (departmentId: string, field: 'decision_scope' | 'handoff_contracts', value: string) => void;
  updateAgentField: (agentId: string, field: 'role' | 'model' | 'description', value: string) => void;
  updateAgentList: (agentId: string, field: 'responsibilities' | 'skills' | 'tools' | 'mcp_servers', value: string) => void;
  updateDiscussionField: (field: 'mode' | 'conflict_resolution' | 'supervisor_agent_id', value: string) => void;
  updateDiscussionNumber: (field: 'max_rounds', value: number) => void;
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
