import { useEffect, useState } from 'react';
import type { Connection, Edge, OnNodesChange } from '@xyflow/react';
import { applyNodeChanges } from '@xyflow/react';

import { buildGraph } from '../model/graphLayout';
import { WorkflowNodeType } from '../model/types';
import type { AgentDocument, TeamSchemaDocument, WorkflowEdgeMode, WorkflowGraphNode } from '../model/types';
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

export const useWorkflowGraphEditor = (
  schema: TeamSchemaDocument,
  dispatch: AppDispatch,
): WorkflowGraphEditorModel => {
  const [nodes, setNodes] = useState<WorkflowGraphNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [edgeConnectionError, setEdgeConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const graph = buildGraph(schema);
    setNodes((currentNodes) => mergeLayoutNodes(graph.nodes, currentNodes).concat(pickWorkflowDraftNodes(currentNodes).map((node) => refreshWorkflowDraftNodeData(schema, node))));
    setEdges((currentEdges) => graph.edges.concat(pickWorkflowDraftEdges(currentEdges)));
  }, [schema]);

  const onNodesChange: OnNodesChange<WorkflowGraphNode> = (changes) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  };

  const onNodeSelect = createNodeSelectHandler(dispatch);
  const addWorkflowAgentNode = (): void => {
    setNodes((currentNodes) => currentNodes.concat(createWorkflowAgentNode(currentNodes)));
  };

  const addWorkflowPartNode = (): void => {
    setNodes((currentNodes) => currentNodes.concat(createWorkflowPartNode(currentNodes)));
  };

  const addWorkflowPipelineNode = (): void => {
    setNodes((currentNodes) => currentNodes.concat(createWorkflowPipelineNode(currentNodes)));
  };

  const updateWorkflowAgentNode = (nodeId: string, agentId: string): void => {
    setNodes((currentNodes) => currentNodes.map((node) => {
      if (node.id !== nodeId || node.data.workflowNodeType !== WorkflowNodeType.Agent) {
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
          ...node.data,
          workflowAgentId: agentId.length === 0 ? undefined : agentId,
          workflowMetadata,
        },
      });
    }));
  };

  const updateWorkflowNodeMetadata = (nodeId: string, field: 'name' | 'description', value: string): void => {
    setNodes((currentNodes) => currentNodes.map((node) => {
      if (node.id !== nodeId || node.data.workflowNodeType === undefined) {
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
    }));
  };

  const removeWorkflowDraftNode = (nodeId: string): void => {
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== nodeId));
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    dispatch(selectNode('team'));
  };

  const addWorkflowEdge = (connection: Connection, mode: WorkflowEdgeMode): void => {
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

  const clearEdgeConnectionError = (): void => setEdgeConnectionError(null);

  return {
    nodes,
    edges,
    onNodesChange,
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
