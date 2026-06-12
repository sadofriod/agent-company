import type { Connection, Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';

import { GraphNodeKind, WorkflowEdgeMode, WorkflowEdgeType, WorkflowNodeType } from '../../model/types';
import type { WorkflowEdgeData, WorkflowGraphNode } from '../../model/types';

export const WORKFLOW_AGENT_NODE_PREFIX = 'workflow-agent:';
export const WORKFLOW_PART_NODE_PREFIX = 'workflow-part:';
export const WORKFLOW_PIPELINE_NODE_PREFIX = 'workflow-pipeline:';
const WORKFLOW_EDGE_PREFIX = 'workflow-link:';

const isWorkflowDraftNode = (node: WorkflowGraphNode): boolean =>
  node.id.startsWith(WORKFLOW_AGENT_NODE_PREFIX)
  || node.id.startsWith(WORKFLOW_PART_NODE_PREFIX)
  || node.id.startsWith(WORKFLOW_PIPELINE_NODE_PREFIX);

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

export const createWorkflowAgentNode = (existingNodes: WorkflowGraphNode[]): WorkflowGraphNode => {
  const workflowNodeCount = pickWorkflowDraftNodes(existingNodes).length;
  const nodeId = createUniqueWorkflowNodeId(WORKFLOW_AGENT_NODE_PREFIX, existingNodes);
  const agentNumber = nodeId.replace(WORKFLOW_AGENT_NODE_PREFIX, '');
  const nodeName = `Agent Node ${agentNumber}`;

  return {
    id: nodeId,
    position: { x: 980, y: 80 + workflowNodeCount * 130 },
    data: {
      kind: GraphNodeKind.Agent,
      nodeName,
      roleName: 'Unassigned Agent',
      detail: 'Select an agent in Inspector',
      accent: 'var(--agent-accent)',
      workflowNodeType: WorkflowNodeType.Agent,
      workflowMetadata: {
        name: nodeName,
        description: 'Workflow-local node metadata.',
      },
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

export const createWorkflowPipelineNode = (existingNodes: WorkflowGraphNode[]): WorkflowGraphNode => {
  const workflowNodeCount = pickWorkflowDraftNodes(existingNodes).length;
  const nodeId = createUniqueWorkflowNodeId(WORKFLOW_PIPELINE_NODE_PREFIX, existingNodes);
  const pipelineNumber = nodeId.replace(WORKFLOW_PIPELINE_NODE_PREFIX, '');

  return {
    id: nodeId,
    position: { x: 980, y: 80 + workflowNodeCount * 130 },
    data: {
      kind: GraphNodeKind.Pipeline,
      nodeName: `Pipeline ${pipelineNumber}`,
      roleName: 'Workflow Pipeline',
      detail: 'Single-ticket DAG container — child agents must form a DAG.',
      accent: 'var(--pipeline-accent)',
      workflowNodeType: WorkflowNodeType.Pipeline,
    },
    type: 'workflow',
  };
};

const isCompleteConnection = (connection: Connection): connection is Connection & { source: string; target: string } =>
  typeof connection.source === 'string' && typeof connection.target === 'string';

const getEdgeMode = (edge: Edge): WorkflowEdgeMode | null => {
  const data = edge.data as WorkflowEdgeData | undefined;
  return data?.mode ?? null;
};

/**
 * Returns true when adding a directed `source -> target` Pipeline edge would
 * close a cycle on the existing Pipeline-mode subgraph. Discuss-mode peer edges
 * are intentionally ignored because they are bidirectional discussion links.
 *
 * MVP constraint: once an Agent is wired into a Pipeline's children, that
 * subgraph must remain a DAG.
 */
export const wouldCreatePipelineCycle = (
  source: string,
  target: string,
  existingEdges: Edge[],
): boolean => {
  if (source === target) {
    return true;
  }

  const adjacency = new Map<string, Set<string>>();

  existingEdges.forEach((edge) => {
    if (getEdgeMode(edge) !== WorkflowEdgeMode.Pipeline) {
      return;
    }

    const neighbours = adjacency.get(edge.source) ?? new Set<string>();
    neighbours.add(edge.target);
    adjacency.set(edge.source, neighbours);
  });

  const visited = new Set<string>();
  const stack: string[] = [target];

  while (stack.length > 0) {
    const node = stack.pop() as string;

    if (node === source) {
      return true;
    }

    if (visited.has(node)) {
      continue;
    }

    visited.add(node);
    adjacency.get(node)?.forEach((next) => stack.push(next));
  }

  return false;
};

type EdgeVisual = {
  type: WorkflowEdgeType;
  color: string;
  animated: boolean;
  bidirectional: boolean;
};

const resolveEdgeVisual = (mode: WorkflowEdgeMode): EdgeVisual => {
  if (mode === WorkflowEdgeMode.Discuss) {
    return { type: WorkflowEdgeType.DiscussAgents, color: '#2f7b6d', animated: true, bidirectional: true };
  }

  if (mode === WorkflowEdgeMode.DiscussBroadcast) {
    return { type: WorkflowEdgeType.DiscussBroadcast, color: '#5d4ed1', animated: true, bidirectional: false };
  }

  return { type: WorkflowEdgeType.PipelineHandoff, color: '#d96c3f', animated: false, bidirectional: false };
};

export type CreateWorkflowEdgeResult =
  | { status: 'ok'; edge: Edge }
  | { status: 'rejected'; reason: 'invalid_connection' | 'pipeline_cycle' };

export const createWorkflowEdge = (
  connection: Connection,
  mode: WorkflowEdgeMode,
  existingEdges: Edge[],
): CreateWorkflowEdgeResult => {
  if (!isCompleteConnection(connection)) {
    return { status: 'rejected', reason: 'invalid_connection' };
  }

  if (mode === WorkflowEdgeMode.Pipeline && wouldCreatePipelineCycle(connection.source, connection.target, existingEdges)) {
    return { status: 'rejected', reason: 'pipeline_cycle' };
  }

  const visual = resolveEdgeVisual(mode);
  const marker = { type: MarkerType.ArrowClosed, color: visual.color };
  const edgeData: WorkflowEdgeData = { mode };
  const edge: Edge = {
    id: createUniqueWorkflowEdgeId(existingEdges),
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    type: visual.type,
    animated: visual.animated,
    data: edgeData,
    markerEnd: marker,
    style: { stroke: visual.color, strokeWidth: 2.2 },
  };

  if (visual.bidirectional) {
    return { status: 'ok', edge: { ...edge, markerStart: marker } };
  }

  return { status: 'ok', edge };
};
