import type { Node } from '@xyflow/react';

import type {
  AgentDocument,
  DepartmentDocument,
  DiscussionPolicyDocument,
  MemoryPolicyDocument,
  WorkflowNodeMetadata,
} from './documentTypes';

export const enum WorkflowEdgeMode {
  Discuss = 'discuss',
  DiscussBroadcast = 'discuss_broadcast',
  Pipeline = 'pipeline',
}

export const enum WorkflowEdgeType {
  SchemaRelation = 'schema-relation',
  DiscussAgents = 'discuss-agents',
  DiscussBroadcast = 'discuss-broadcast',
  PipelineHandoff = 'pipeline-handoff',
}

export const enum WorkflowNodeType {
  Agent = 'agent',
  Part = 'part',
  Pipeline = 'pipeline',
}

export type WorkflowEdgeData = {
  mode: WorkflowEdgeMode;
  runtimeHighlighted?: boolean;
  runtimeDimmed?: boolean;
};

export enum SchemaEdgeTone {
  Structure = 'structure',
  Governance = 'governance',
  Memory = 'memory',
}

export enum MemoryScope {
  Discussion = 'discussion',
  Session = 'session',
}

export type SchemaEdgeData = {
  label?: string;
  tone: SchemaEdgeTone;
  runtimeHighlighted?: boolean;
  runtimeDimmed?: boolean;
};

export const enum GraphNodeKind {
  Goal = 'goal',
  Department = 'department',
  Agent = 'agent',
  Part = 'part',
  Discussion = 'discussion',
  Pipeline = 'pipeline',
  Review = 'review',
  Memory = 'memory',
}

export type GraphNodeData = {
  kind: GraphNodeKind;
  nodeName: string;
  roleName?: string;
  departmentName?: string;
  detail?: string;
  accent: string;
  workflowNodeType?: WorkflowNodeType;
  workflowAgentId?: string;
  workflowMetadata?: WorkflowNodeMetadata;
  memoryScope?: MemoryScope;
  department?: DepartmentDocument;
  agent?: AgentDocument;
  discussionPolicy?: DiscussionPolicyDocument;
  memoryPolicy?: MemoryPolicyDocument;
  runtimeHighlighted?: boolean;
  runtimeDimmed?: boolean;
};

export type WorkflowGraphNode = Node<GraphNodeData, 'workflow'>;

export type WorkflowLayoutJsonPrimitive = string | number | boolean | null;

export type WorkflowLayoutJsonValue =
  | WorkflowLayoutJsonPrimitive
  | WorkflowLayoutJsonValue[]
  | { [key: string]: WorkflowLayoutJsonValue };

export type WorkflowLayoutJsonObject = { [key: string]: WorkflowLayoutJsonValue };

export type WorkflowLayoutPositionDocument = {
  x: number;
  y: number;
};

export type WorkflowLayoutNodeDataDocument = {
  kind: GraphNodeKind;
  nodeName: string;
  roleName?: string;
  departmentName?: string;
  detail?: string;
  accent: string;
  workflowNodeType?: WorkflowNodeType;
  workflowAgentId?: string;
  workflowMetadata?: WorkflowNodeMetadata;
  memoryScope?: MemoryScope;
};

export type WorkflowLayoutNodeDocument = {
  id: string;
  type?: string;
  position: WorkflowLayoutPositionDocument;
  data?: WorkflowLayoutNodeDataDocument;
  style?: WorkflowLayoutJsonObject;
};

export type WorkflowLayoutEdgeDocument = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  animated?: boolean;
  data?: WorkflowLayoutJsonObject;
  markerStart?: WorkflowLayoutJsonValue;
  markerEnd?: WorkflowLayoutJsonValue;
  style?: WorkflowLayoutJsonObject;
};

export type WorkflowLayoutDocument = {
  nodes: WorkflowLayoutNodeDocument[];
  edges: WorkflowLayoutEdgeDocument[];
};

export type Selection =
  | { kind: 'team' }
  | { kind: 'department'; departmentId: string }
  | { kind: 'agent'; agentId: string }
  | { kind: 'workflowNode'; nodeId: string }
  | { kind: 'discussion' }
  | { kind: 'memory' };

export type ValidationIssue = {
  code: string;
  path: readonly string[];
  message: string;
  suggestion?: string;
};
