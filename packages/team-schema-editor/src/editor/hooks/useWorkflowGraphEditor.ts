import { useEffect, useState } from 'react';
import type { Connection, Edge, OnNodesChange } from '@xyflow/react';
import { applyNodeChanges } from '@xyflow/react';

import { buildGraph } from '../model/graphLayout';
import type { TeamSchemaDocument, WorkflowEdgeMode, WorkflowGraphNode } from '../model/types';
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
  if (nodeId?.startsWith(WORKFLOW_AGENT_NODE_PREFIX) !== true) {
    dispatch(selectNode(nodeId));
    return;
  }

  const agentId = nodeId.replace(WORKFLOW_AGENT_NODE_PREFIX, '').split(':')[0];

  if (agentId !== undefined && agentId.length > 0) {
    dispatch(selectNode(`agent:${agentId}`));
  }
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
    setNodes((currentNodes) => mergeLayoutNodes(graph.nodes, currentNodes).concat(pickWorkflowDraftNodes(currentNodes)));
    setEdges((currentEdges) => graph.edges.concat(pickWorkflowDraftEdges(currentEdges)));
  }, [schema]);

  const onNodesChange: OnNodesChange<WorkflowGraphNode> = (changes) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  };

  const onNodeSelect = createNodeSelectHandler(dispatch);
  const addWorkflowAgentNode = (agentId: string): void => {
    setNodes((currentNodes) => {
      const nextNode = createWorkflowAgentNode(schema, agentId, currentNodes);
      return nextNode === null ? currentNodes : currentNodes.concat(nextNode);
    });
  };

  const addWorkflowPartNode = (): void => {
    setNodes((currentNodes) => currentNodes.concat(createWorkflowPartNode(currentNodes)));
  };

  const addWorkflowPipelineNode = (): void => {
    setNodes((currentNodes) => currentNodes.concat(createWorkflowPipelineNode(currentNodes)));
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
    addWorkflowEdge,
    edgeConnectionError,
    clearEdgeConnectionError,
  };
};
