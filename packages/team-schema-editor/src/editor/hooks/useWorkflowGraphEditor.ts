import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Connection, Edge, OnEdgesChange, OnNodesChange } from '@xyflow/react';
import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react';

import { buildGraph } from '../model/graphLayout';
import { WorkflowNodeType } from '../model/types';
import type { AgentDocument, TeamSchemaDocument, WorkflowEdgeMode, WorkflowGraphNode } from '../model/types';
import { applyWorkflowLayoutDocument } from '../model/workflowLayout';
import { selectNode } from '../state/core/editorSlice';
import type { AppDispatch } from '../state/core/editorStore';
import type { WorkflowGraphEditorModel } from './helper/teamEditor.types';
import {
  WORKFLOW_AGENT_NODE_PREFIX,
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
type WorkflowMetadataField = 'name' | 'description';

const mergeLayoutNodes = (layoutNodes: WorkflowGraphNode[], currentNodes: WorkflowGraphNode[]): WorkflowGraphNode[] =>
  layoutNodes.map((node) => {
    const existingNode = currentNodes.find((candidate) => candidate.id === node.id);

    return existingNode === undefined ? node : { ...node, position: existingNode.position };
  });

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

const createNodesChangeHandler = (setNodes: SetWorkflowNodes): OnNodesChange<WorkflowGraphNode> => (changes) => {
  setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
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

    if (result.status === 'rejected') {
      setEdgeConnectionError(
        result.reason === 'pipeline_cycle'
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

  const onNodesChange = createNodesChangeHandler(setNodes);
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
