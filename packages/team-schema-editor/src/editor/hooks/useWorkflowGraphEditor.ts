import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Connection, Edge, NodeChange, NodePositionChange, OnEdgesChange, OnNodesChange, XYPosition } from '@xyflow/react';
import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react';

import { GOAL_NODE_ID, PIPELINE_NODE_ID, buildGraph } from '../model/graphLayout';
import { WorkflowEdgeMode, WorkflowNodeType } from '../model/types';
import type { AgentDocument, TeamSchemaDocument, WorkflowGraphNode } from '../model/types';
import { applyWorkflowLayoutDocument } from '../model/workflowLayout';
import { selectNode } from '../state/core/editorSlice';
import type { AppDispatch } from '../state/core/editorStore';
import { type WorkflowGraphEditorModel, WorkflowMetadataField } from './helper/teamEditor.types';
import {
  CreateWorkflowEdgeRejectionReason,
  CreateWorkflowEdgeStatus,
  WORKFLOW_AGENT_NODE_PREFIX,
  WORKFLOW_PIPELINE_NODE_PREFIX,
  createWorkflowAgentNode,
  createWorkflowEdge,
  createWorkflowPartNode,
  createWorkflowPipelineNode,
  pickWorkflowDraftEdges,
  pickWorkflowDraftNodes,
} from './helper/workflowGraphDraft';

type SetWorkflowNodes = Dispatch<SetStateAction<WorkflowGraphNode[]>>;
type SetWorkflowEdges = Dispatch<SetStateAction<Edge[]>>;
type SetEdgeConnectionError = Dispatch<SetStateAction<string | null>>;
type SchemaDocumentRevisionRef = { current: number | null };
type CreateWorkflowNode = (currentNodes: WorkflowGraphNode[]) => WorkflowGraphNode;
type NodePositionDelta = { readonly x: number; readonly y: number };
type ParentNodeDelta = { readonly parentId: string; readonly delta: NodePositionDelta };
type PositionedNodeChange = NodePositionChange & { readonly position: XYPosition };

const mergeLayoutNodes = (layoutNodes: WorkflowGraphNode[], currentNodes: WorkflowGraphNode[]): WorkflowGraphNode[] =>
  layoutNodes.map((node) => {
    const existingNode = currentNodes.find((candidate) => candidate.id === node.id);

    return existingNode === undefined ? node : { ...node, position: existingNode.position };
  });

const isDepartmentNodeId = (nodeId: string): boolean => nodeId.startsWith('department:');

const toDepartmentId = (nodeId: string): string => nodeId.replace('department:', '');

const getEdgeMode = (edge: Edge): WorkflowEdgeMode | null => {
  const data = edge.data as { mode?: WorkflowEdgeMode } | undefined;

  return data?.mode ?? null;
};

const isPipelineNode = (node: WorkflowGraphNode): boolean =>
  node.id === PIPELINE_NODE_ID || node.id.startsWith(WORKFLOW_PIPELINE_NODE_PREFIX);

const collectPipelineChildIds = (parentId: string, edges: Edge[]): Set<string> => {
  const pipelineEdges = edges.filter((edge) => getEdgeMode(edge) === WorkflowEdgeMode.Pipeline);
  const childIds = new Set<string>();
  const pendingIds = pipelineEdges
    .filter((edge) => edge.source === parentId)
    .map((edge) => edge.target);

  while (pendingIds.length > 0) {
    const childId = pendingIds.pop();

    if (childId === undefined) {
      continue;
    }

    if (childId === parentId || childIds.has(childId)) {
      continue;
    }

    childIds.add(childId);
    pipelineEdges
      .filter((edge) => edge.source === childId)
      .forEach((edge) => pendingIds.push(edge.target));
  }

  return childIds;
};

const collectUiChildNodeIds = (parent: WorkflowGraphNode, nodes: WorkflowGraphNode[], edges: Edge[]): Set<string> => {
  if (parent.id === GOAL_NODE_ID) {
    return new Set(nodes.filter((node) => node.id !== parent.id).map((node) => node.id));
  }

  if (isDepartmentNodeId(parent.id)) {
    const departmentId = toDepartmentId(parent.id);

    return new Set(nodes
      .filter((node) => node.data.agent?.department_id === departmentId)
      .map((node) => node.id));
  }

  if (isPipelineNode(parent)) {
    return collectPipelineChildIds(parent.id, edges);
  }

  return new Set<string>();
};

const isPositionedNodeChange = (change: NodeChange<WorkflowGraphNode>): change is PositionedNodeChange =>
  change.type === 'position' && change.position !== undefined;

const toParentNodeDeltas = (
  changes: NodeChange<WorkflowGraphNode>[],
  currentNodes: WorkflowGraphNode[],
): ParentNodeDelta[] => changes
  .filter(isPositionedNodeChange)
  .map((change) => {
    const currentNode = currentNodes.find((node) => node.id === change.id);

    if (currentNode === undefined) {
      return null;
    }

    const delta = {
      x: change.position.x - currentNode.position.x,
      y: change.position.y - currentNode.position.y,
    };

    if (delta.x === 0 && delta.y === 0) {
      return null;
    }

    return { parentId: change.id, delta };
  })
  .filter((change): change is ParentNodeDelta => change !== null);

const applyUiParentNodeMovement = (
  nodes: WorkflowGraphNode[],
  edges: Edge[],
  parentDeltas: ParentNodeDelta[],
): WorkflowGraphNode[] => {
  if (parentDeltas.length === 0) {
    return nodes;
  }

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const directPositionChangeIds = new Set(parentDeltas.map((change) => change.parentId));
  const childDeltas = new Map<string, NodePositionDelta>();

  parentDeltas.forEach((parentDelta) => {
    const parent = nodesById.get(parentDelta.parentId);

    if (parent === undefined) {
      return;
    }

    collectUiChildNodeIds(parent, nodes, edges).forEach((childId) => {
      if (directPositionChangeIds.has(childId)) {
        return;
      }

      const currentDelta = childDeltas.get(childId) ?? { x: 0, y: 0 };
      childDeltas.set(childId, {
        x: currentDelta.x + parentDelta.delta.x,
        y: currentDelta.y + parentDelta.delta.y,
      });
    });
  });

  if (childDeltas.size === 0) {
    return nodes;
  }

  return nodes.map((node) => {
    const delta = childDeltas.get(node.id);

    if (delta === undefined) {
      return node;
    }

    return {
      ...node,
      position: {
        x: node.position.x + delta.x,
        y: node.position.y + delta.y,
      },
    };
  });
};

const createNodeSelectHandler = (dispatch: AppDispatch) => (nodeId: string | null): void => {
  dispatch(selectNode(nodeId));
};

const findAgentDepartmentName = (schema: TeamSchemaDocument, agent: AgentDocument | undefined): string | undefined => {
  if (agent === undefined) {
    return undefined;
  }

  return schema.departments.find((department) => department.department_id === agent.department_id)?.name;
};

const refreshWorkflowDraftNodeData = (schema: TeamSchemaDocument, node: WorkflowGraphNode): WorkflowGraphNode => {
  if (node.id.startsWith(WORKFLOW_AGENT_NODE_PREFIX) && node.data.workflowNodeType === WorkflowNodeType.Agent) {
    const agent = schema.agents.find((candidate) => candidate.agent_id === node.data.workflowAgentId);
    const workflowMetadata = node.data.workflowMetadata;

    return {
      ...node,
      data: {
        ...node.data,
        nodeName: workflowMetadata?.name ?? agent?.metadata?.name ?? node.data.nodeName,
        roleName: agent?.role ?? 'Unassigned Agent',
        departmentName: findAgentDepartmentName(schema, agent),
        detail: agent === undefined ? 'Select an agent in Inspector' : `Loads ${agent.agent_id}`,
        agent,
      },
    };
  }

  return node;
};

const syncWorkflowGraph = (
  schema: TeamSchemaDocument,
  schemaDocumentRevision: number,
  appliedDocumentRevision: SchemaDocumentRevisionRef,
  setNodes: SetWorkflowNodes,
  setEdges: SetWorkflowEdges,
): void => {
  const graph = buildGraph(schema);
  const shouldApplyStoredLayout = appliedDocumentRevision.current !== schemaDocumentRevision;
  appliedDocumentRevision.current = schemaDocumentRevision;

  if (shouldApplyStoredLayout) {
    const graphWithLayout = applyWorkflowLayoutDocument(graph, schema.layout);
    setNodes(graphWithLayout.nodes.map((node) => refreshWorkflowDraftNodeData(schema, node)));
    setEdges(graphWithLayout.edges);
    return;
  }

  setNodes((currentNodes) => mergeLayoutNodes(graph.nodes, currentNodes).concat(
    pickWorkflowDraftNodes(currentNodes).map((node) => refreshWorkflowDraftNodeData(schema, node)),
  ));
  setEdges((currentEdges) => graph.edges.concat(pickWorkflowDraftEdges(currentEdges)));
};

const createNodesChangeHandler = (setNodes: SetWorkflowNodes, edges: Edge[]): OnNodesChange<WorkflowGraphNode> => (changes) => {
  setNodes((currentNodes) => {
    const parentDeltas = toParentNodeDeltas(changes, currentNodes);
    const changedNodes = applyNodeChanges(changes, currentNodes);

    return applyUiParentNodeMovement(changedNodes, edges, parentDeltas);
  });
};

const createEdgesChangeHandler = (setEdges: SetWorkflowEdges): OnEdgesChange<Edge> => (changes) => {
  setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges));
};

const createWorkflowNodeAppender = (
  dispatch: AppDispatch,
  setNodes: SetWorkflowNodes,
) => (createNode: CreateWorkflowNode): void => {
  setNodes((currentNodes) => {
    const node = createNode(currentNodes);
    dispatch(selectNode(node.id));

    return currentNodes.concat(node);
  });
};

const removeWorkflowAgentId = (data: WorkflowGraphNode['data']): WorkflowGraphNode['data'] => {
  const { workflowAgentId, ...dataWithoutWorkflowAgentId } = data;
  void workflowAgentId;

  return dataWithoutWorkflowAgentId;
};

const withWorkflowAgentId = (data: WorkflowGraphNode['data'], agentId: string): WorkflowGraphNode['data'] => {
  if (agentId.length === 0) {
    return removeWorkflowAgentId(data);
  }

  return { ...data, workflowAgentId: agentId };
};

const updateWorkflowAgentNodeData = (
  schema: TeamSchemaDocument,
  node: WorkflowGraphNode,
  agentId: string,
): WorkflowGraphNode => {
  if (node.data.workflowNodeType !== WorkflowNodeType.Agent) {
    return node;
  }

  const agent = schema.agents.find((candidate) => candidate.agent_id === agentId);
  const workflowMetadata = node.data.workflowMetadata ?? {
    name: agent?.metadata?.name ?? node.data.nodeName,
    description: agent?.metadata?.description ?? node.data.detail ?? 'Workflow-local node metadata.',
  };

  return refreshWorkflowDraftNodeData(schema, {
    ...node,
    data: {
      ...withWorkflowAgentId(node.data, agentId),
      workflowMetadata,
    },
  });
};

const createWorkflowAgentNodeUpdater = (
  schema: TeamSchemaDocument,
  setNodes: SetWorkflowNodes,
) => (nodeId: string, agentId: string): void => {
  setNodes((currentNodes) => currentNodes.map((node) => (
    node.id === nodeId ? updateWorkflowAgentNodeData(schema, node, agentId) : node
  )));
};

const updateWorkflowNodeMetadataData = (
  schema: TeamSchemaDocument,
  node: WorkflowGraphNode,
  field: WorkflowMetadataField,
  value: string,
): WorkflowGraphNode => {
  if (node.data.workflowNodeType === undefined) {
    return node;
  }

  const workflowMetadata = {
    name: node.data.workflowMetadata?.name ?? node.data.nodeName,
    description: node.data.workflowMetadata?.description ?? node.data.detail ?? '',
    [field]: value,
  };

  return refreshWorkflowDraftNodeData(schema, {
    ...node,
    data: {
      ...node.data,
      workflowMetadata,
      nodeName: workflowMetadata.name,
      detail: workflowMetadata.description,
    },
  });
};

const createWorkflowNodeMetadataUpdater = (
  schema: TeamSchemaDocument,
  setNodes: SetWorkflowNodes,
) => (nodeId: string, field: WorkflowMetadataField, value: string): void => {
  setNodes((currentNodes) => currentNodes.map((node) => (
    node.id === nodeId ? updateWorkflowNodeMetadataData(schema, node, field, value) : node
  )));
};

const createWorkflowDraftNodeRemover = (
  dispatch: AppDispatch,
  setNodes: SetWorkflowNodes,
  setEdges: SetWorkflowEdges,
) => (nodeId: string): void => {
  setNodes((currentNodes) => currentNodes.filter((node) => node.id !== nodeId));
  setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  dispatch(selectNode('team'));
};

const createWorkflowEdgeAdder = (
  setEdges: SetWorkflowEdges,
  setEdgeConnectionError: SetEdgeConnectionError,
) => (connection: Connection, mode: WorkflowEdgeMode): void => {
  setEdges((currentEdges) => {
    const result = createWorkflowEdge(connection, mode, currentEdges);

    if (result.status === CreateWorkflowEdgeStatus.Rejected) {
      setEdgeConnectionError(
        result.reason === CreateWorkflowEdgeRejectionReason.PipelineCycle
          ? 'Pipeline edge rejected: it would create a cycle. Pipeline children must form a DAG.'
          : 'Connection rejected: missing source or target.',
      );
      return currentEdges;
    }

    setEdgeConnectionError(null);
    return currentEdges.concat(result.edge);
  });
};

export const useWorkflowGraphEditor = (
  schema: TeamSchemaDocument,
  dispatch: AppDispatch,
  schemaDocumentRevision: number,
): WorkflowGraphEditorModel => {
  const [nodes, setNodes] = useState<WorkflowGraphNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [edgeConnectionError, setEdgeConnectionError] = useState<string | null>(null);
  const appliedDocumentRevision = useRef<number | null>(null);

  useEffect(() => {
    syncWorkflowGraph(schema, schemaDocumentRevision, appliedDocumentRevision, setNodes, setEdges);
  }, [schema, schemaDocumentRevision]);

  const onNodesChange = createNodesChangeHandler(setNodes, edges);
  const onEdgesChange = createEdgesChangeHandler(setEdges);
  const onNodeSelect = createNodeSelectHandler(dispatch);
  const appendWorkflowNode = createWorkflowNodeAppender(dispatch, setNodes);
  const updateWorkflowAgentNode = createWorkflowAgentNodeUpdater(schema, setNodes);
  const updateWorkflowNodeMetadata = createWorkflowNodeMetadataUpdater(schema, setNodes);
  const removeWorkflowDraftNode = createWorkflowDraftNodeRemover(dispatch, setNodes, setEdges);
  const addWorkflowEdge = createWorkflowEdgeAdder(setEdges, setEdgeConnectionError);

  const addWorkflowAgentNode = (): void => {
    appendWorkflowNode(createWorkflowAgentNode);
  };

  const addWorkflowPartNode = (): void => {
    appendWorkflowNode(createWorkflowPartNode);
  };

  const addWorkflowPipelineNode = (): void => {
    appendWorkflowNode(createWorkflowPipelineNode);
  };

  const clearEdgeConnectionError = (): void => setEdgeConnectionError(null);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onNodeSelect,
    addWorkflowAgentNode,
    addWorkflowPartNode,
    addWorkflowPipelineNode,
    updateWorkflowAgentNode,
    updateWorkflowNodeMetadata,
    removeWorkflowDraftNode,
    addWorkflowEdge,
    edgeConnectionError,
    clearEdgeConnectionError,
  };
};
