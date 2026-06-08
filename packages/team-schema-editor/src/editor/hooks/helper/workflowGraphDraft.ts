import type { Connection, Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';

import { GraphNodeKind, WorkflowEdgeMode, WorkflowNodeType } from '../../model/types';
import type { TeamSchemaDocument, WorkflowGraphNode } from '../../model/types';

export const WORKFLOW_AGENT_NODE_PREFIX = 'workflow-agent:';
export const WORKFLOW_PART_NODE_PREFIX = 'workflow-part:';
const WORKFLOW_EDGE_PREFIX = 'workflow-link:';

const isWorkflowDraftNode = (node: WorkflowGraphNode): boolean =>
  node.id.startsWith(WORKFLOW_AGENT_NODE_PREFIX) || node.id.startsWith(WORKFLOW_PART_NODE_PREFIX);

export const isWorkflowDraftEdge = (edge: Edge): boolean => edge.id.startsWith(WORKFLOW_EDGE_PREFIX);

export const pickWorkflowDraftNodes = (nodes: WorkflowGraphNode[]): WorkflowGraphNode[] => nodes.filter(isWorkflowDraftNode);

export const pickWorkflowDraftEdges = (edges: Edge[]): Edge[] => edges.filter(isWorkflowDraftEdge);

const createUniqueWorkflowNodeId = (prefix: string, existingNodes: WorkflowGraphNode[]): string => {
  let suffix = existingNodes.filter((node) => node.id.startsWith(prefix)).length + 1;
  let candidate = `${prefix}${suffix}`;

  while (existingNodes.some((node) => node.id === candidate)) {
    suffix += 1;
    candidate = `${prefix}${suffix}`;
  }

  return candidate;
};

const createUniqueWorkflowEdgeId = (existingEdges: Edge[]): string => {
  let suffix = existingEdges.filter(isWorkflowDraftEdge).length + 1;
  let candidate = `${WORKFLOW_EDGE_PREFIX}${suffix}`;

  while (existingEdges.some((edge) => edge.id === candidate)) {
    suffix += 1;
    candidate = `${WORKFLOW_EDGE_PREFIX}${suffix}`;
  }

  return candidate;
};

export const createWorkflowAgentNode = (
  schema: TeamSchemaDocument,
  agentId: string,
  existingNodes: WorkflowGraphNode[],
): WorkflowGraphNode | null => {
  const agent = schema.agents.find((candidate) => candidate.agent_id === agentId);

  if (agent === undefined) {
    return null;
  }

  const department = schema.departments.find((candidate) => candidate.department_id === agent.department_id);
  const workflowNodeCount = pickWorkflowDraftNodes(existingNodes).length;

  return {
    id: createUniqueWorkflowNodeId(`${WORKFLOW_AGENT_NODE_PREFIX}${agentId}:`, existingNodes),
    position: { x: 980, y: 80 + workflowNodeCount * 130 },
    data: {
      kind: GraphNodeKind.Agent,
      nodeName: agent.metadata?.name ?? agent.agent_id,
      roleName: agent.role,
      departmentName: department?.name,
      detail: `Workflow agent / ${agent.agent_id}`,
      accent: 'var(--agent-accent)',
      workflowNodeType: WorkflowNodeType.Agent,
    },
    type: 'workflow',
  };
};

export const createWorkflowPartNode = (existingNodes: WorkflowGraphNode[]): WorkflowGraphNode => {
  const workflowNodeCount = pickWorkflowDraftNodes(existingNodes).length;
  const nodeId = createUniqueWorkflowNodeId(WORKFLOW_PART_NODE_PREFIX, existingNodes);
  const partNumber = nodeId.replace(WORKFLOW_PART_NODE_PREFIX, '');

  return {
    id: nodeId,
    position: { x: 980, y: 80 + workflowNodeCount * 130 },
    data: {
      kind: GraphNodeKind.Part,
      nodeName: `Part ${partNumber}`,
      roleName: 'Workflow Part',
      detail: 'Reusable step or handoff segment',
      accent: 'var(--part-accent)',
      workflowNodeType: WorkflowNodeType.Part,
    },
    type: 'workflow',
  };
};

const isCompleteConnection = (connection: Connection): connection is Connection & { source: string; target: string } =>
  typeof connection.source === 'string' && typeof connection.target === 'string';

export const createWorkflowEdge = (connection: Connection, mode: WorkflowEdgeMode, existingEdges: Edge[]): Edge | null => {
  if (!isCompleteConnection(connection)) {
    return null;
  }

  const edgeColor = mode === WorkflowEdgeMode.Discuss ? '#2f7b6d' : '#d96c3f';
  const marker = { type: MarkerType.ArrowClosed, color: edgeColor };
  const edge: Edge = {
    id: createUniqueWorkflowEdgeId(existingEdges),
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    type: 'smoothstep',
    label: mode,
    animated: mode === WorkflowEdgeMode.Discuss,
    data: { mode },
    markerEnd: marker,
    style: { stroke: edgeColor, strokeWidth: 2.2 },
  };

  if (mode === WorkflowEdgeMode.Discuss) {
    return { ...edge, markerStart: marker };
  }

  return edge;
};
