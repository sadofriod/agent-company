import type { Edge } from '@xyflow/react';

import type {
  GraphNodeData,
  TeamSchemaDocument,
  WorkflowGraphNode,
  WorkflowLayoutDocument,
  WorkflowLayoutEdgeDocument,
  WorkflowLayoutJsonObject,
  WorkflowLayoutJsonValue,
  WorkflowLayoutNodeDataDocument,
  WorkflowLayoutNodeDocument,
} from './types';

type WorkflowGraph = {
  nodes: WorkflowGraphNode[];
  edges: Edge[];
};

const WORKFLOW_EDGE_PREFIX = 'workflow-link:';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toJsonValue = (value: unknown): WorkflowLayoutJsonValue | undefined => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => toJsonValue(item))
      .filter((item): item is WorkflowLayoutJsonValue => item !== undefined);
  }

  if (!isRecord(value)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, toJsonValue(item)] as const)
      .filter((entry): entry is readonly [string, WorkflowLayoutJsonValue] => entry[1] !== undefined),
  );
};

const toJsonObject = (value: unknown): WorkflowLayoutJsonObject | undefined => {
  const jsonValue = toJsonValue(value);

  return isRecord(jsonValue) ? jsonValue as WorkflowLayoutJsonObject : undefined;
};

const serializeWorkflowNodeData = (data: GraphNodeData): WorkflowLayoutNodeDataDocument => ({
  kind: data.kind,
  nodeName: data.nodeName,
  accent: data.accent,
  ...(data.roleName === undefined ? {} : { roleName: data.roleName }),
  ...(data.departmentName === undefined ? {} : { departmentName: data.departmentName }),
  ...(data.detail === undefined ? {} : { detail: data.detail }),
  ...(data.workflowNodeType === undefined ? {} : { workflowNodeType: data.workflowNodeType }),
  ...(data.workflowAgentId === undefined ? {} : { workflowAgentId: data.workflowAgentId }),
  ...(data.workflowMetadata === undefined ? {} : { workflowMetadata: { ...data.workflowMetadata } }),
  ...(data.memoryScope === undefined ? {} : { memoryScope: data.memoryScope }),
});

const serializeLayoutNode = (node: WorkflowGraphNode): WorkflowLayoutNodeDocument => {
  const style = toJsonObject(node.style);
  const data = node.data.workflowNodeType === undefined ? undefined : serializeWorkflowNodeData(node.data);

  return {
    id: node.id,
    position: { x: node.position.x, y: node.position.y },
    ...(node.type === undefined ? {} : { type: node.type }),
    ...(data === undefined ? {} : { data }),
    ...(style === undefined ? {} : { style }),
  };
};

const serializeLayoutEdge = (edge: Edge): WorkflowLayoutEdgeDocument => {
  const data = toJsonObject(edge.data);
  const markerStart = toJsonValue(edge.markerStart);
  const markerEnd = toJsonValue(edge.markerEnd);
  const style = toJsonObject(edge.style);

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    ...(edge.sourceHandle === undefined ? {} : { sourceHandle: edge.sourceHandle }),
    ...(edge.targetHandle === undefined ? {} : { targetHandle: edge.targetHandle }),
    ...(edge.type === undefined ? {} : { type: edge.type }),
    ...(edge.animated === undefined ? {} : { animated: edge.animated }),
    ...(data === undefined ? {} : { data }),
    ...(markerStart === undefined ? {} : { markerStart }),
    ...(markerEnd === undefined ? {} : { markerEnd }),
    ...(style === undefined ? {} : { style }),
  };
};

const applyLayoutToNode = (node: WorkflowGraphNode, layoutNode: WorkflowLayoutNodeDocument): WorkflowGraphNode => ({
  ...node,
  position: { ...layoutNode.position },
  type: 'workflow',
  ...(layoutNode.style === undefined ? {} : { style: layoutNode.style as WorkflowGraphNode['style'] }),
});

const createNodeFromLayout = (layoutNode: WorkflowLayoutNodeDocument): WorkflowGraphNode | null => {
  if (layoutNode.data === undefined) {
    return null;
  }

  return {
    id: layoutNode.id,
    position: { ...layoutNode.position },
    data: layoutNode.data as GraphNodeData,
    type: 'workflow',
    ...(layoutNode.style === undefined ? {} : { style: layoutNode.style as WorkflowGraphNode['style'] }),
  };
};

const applyLayoutToEdge = (edge: Edge, layoutEdge: WorkflowLayoutEdgeDocument): Edge => ({
  ...edge,
  ...(layoutEdge.type === undefined ? {} : { type: layoutEdge.type }),
  ...(layoutEdge.animated === undefined ? {} : { animated: layoutEdge.animated }),
  ...(layoutEdge.data === undefined ? {} : { data: layoutEdge.data as Edge['data'] }),
  ...(layoutEdge.markerStart === undefined ? {} : { markerStart: layoutEdge.markerStart as Edge['markerStart'] }),
  ...(layoutEdge.markerEnd === undefined ? {} : { markerEnd: layoutEdge.markerEnd as Edge['markerEnd'] }),
  ...(layoutEdge.style === undefined ? {} : { style: layoutEdge.style as Edge['style'] }),
});

const createEdgeFromLayout = (layoutEdge: WorkflowLayoutEdgeDocument): Edge => ({
  id: layoutEdge.id,
  source: layoutEdge.source,
  target: layoutEdge.target,
  ...(layoutEdge.sourceHandle === undefined ? {} : { sourceHandle: layoutEdge.sourceHandle }),
  ...(layoutEdge.targetHandle === undefined ? {} : { targetHandle: layoutEdge.targetHandle }),
  ...(layoutEdge.type === undefined ? {} : { type: layoutEdge.type }),
  ...(layoutEdge.animated === undefined ? {} : { animated: layoutEdge.animated }),
  ...(layoutEdge.data === undefined ? {} : { data: layoutEdge.data as Edge['data'] }),
  ...(layoutEdge.markerStart === undefined ? {} : { markerStart: layoutEdge.markerStart as Edge['markerStart'] }),
  ...(layoutEdge.markerEnd === undefined ? {} : { markerEnd: layoutEdge.markerEnd as Edge['markerEnd'] }),
  ...(layoutEdge.style === undefined ? {} : { style: layoutEdge.style as Edge['style'] }),
});

export const createWorkflowLayoutDocument = (nodes: WorkflowGraphNode[], edges: Edge[]): WorkflowLayoutDocument => ({
  nodes: nodes.map(serializeLayoutNode),
  edges: edges.map(serializeLayoutEdge),
});

export const withWorkflowLayoutDocument = (
  schema: TeamSchemaDocument,
  nodes: WorkflowGraphNode[],
  edges: Edge[],
): TeamSchemaDocument => ({
  ...schema,
  layout: createWorkflowLayoutDocument(nodes, edges),
});

export const applyWorkflowLayoutDocument = (graph: WorkflowGraph, layout: WorkflowLayoutDocument | undefined): WorkflowGraph => {
  if (layout === undefined) {
    return graph;
  }

  const layoutNodesById = new Map(layout.nodes.map((node) => [node.id, node]));
  const layoutEdgesById = new Map(layout.edges.map((edge) => [edge.id, edge]));
  const graphNodeIds = new Set(graph.nodes.map((node) => node.id));
  const graphEdgeIds = new Set(graph.edges.map((edge) => edge.id));
  const nodes = graph.nodes
    .map((node) => {
      const layoutNode = layoutNodesById.get(node.id);

      return layoutNode === undefined ? node : applyLayoutToNode(node, layoutNode);
    })
    .concat(
      layout.nodes
        .filter((node) => !graphNodeIds.has(node.id))
        .map(createNodeFromLayout)
        .filter((node): node is WorkflowGraphNode => node !== null),
    );
  const availableNodeIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges
    .map((edge) => {
      const layoutEdge = layoutEdgesById.get(edge.id);

      return layoutEdge === undefined ? edge : applyLayoutToEdge(edge, layoutEdge);
    })
    .concat(
      layout.edges
        .filter((edge) => edge.id.startsWith(WORKFLOW_EDGE_PREFIX) && !graphEdgeIds.has(edge.id))
        .filter((edge) => availableNodeIds.has(edge.source) && availableNodeIds.has(edge.target))
        .map(createEdgeFromLayout),
    );

  return { nodes, edges };
};