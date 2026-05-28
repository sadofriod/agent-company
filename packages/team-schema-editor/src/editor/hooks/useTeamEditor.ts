import { useEffect, useState } from 'react';
import type { Connection, Edge, OnNodesChange } from '@xyflow/react';
import { applyNodeChanges, MarkerType } from '@xyflow/react';

import { loadTeamSchemaFromService } from '../teamSchema/teamSchemaApi';
import { buildGraph } from '../model/graphLayout';
import {
  addAgent as addAgentAction,
  addDepartment as addDepartmentAction,
  removeAgent as removeAgentAction,
  removeDepartment as removeDepartmentAction,
  schemaLoadFailed,
  schemaLoadSucceeded,
  selectNode,
  startSchemaLoad,
  updateAgentField as updateAgentFieldAction,
  updateAgentList as updateAgentListAction,
  updateDepartmentField as updateDepartmentFieldAction,
  updateDepartmentList as updateDepartmentListAction,
  updateDiscussionField as updateDiscussionFieldAction,
  updateDiscussionNumber as updateDiscussionNumberAction,
  updateTeamField as updateTeamFieldAction,
} from '../state/core/editorSlice';
import { useAppDispatch, useAppSelector } from '../state/core/editorHooks';
import type { Selection, TeamSchemaDocument, ValidationIssue, WorkflowEdgeMode, WorkflowGraphNode } from '../model/types';
import type { SchemaLoadStatus } from '../state/core/editorShared';

const toErrorMessage = (error: unknown): string => error instanceof Error ? error.message : 'Unable to load team schema.';

const WORKFLOW_AGENT_NODE_PREFIX = 'workflow-agent:';
const WORKFLOW_PART_NODE_PREFIX = 'workflow-part:';
const WORKFLOW_EDGE_PREFIX = 'workflow-link:';

const isWorkflowDraftNode = (node: WorkflowGraphNode): boolean =>
  node.id.startsWith(WORKFLOW_AGENT_NODE_PREFIX) || node.id.startsWith(WORKFLOW_PART_NODE_PREFIX);

const isWorkflowDraftEdge = (edge: Edge): boolean => edge.id.startsWith(WORKFLOW_EDGE_PREFIX);

const createUniqueWorkflowNodeId = (prefix: string, existingNodes: readonly WorkflowGraphNode[]): string => {
  let suffix = existingNodes.filter((node) => node.id.startsWith(prefix)).length + 1;
  let candidate = `${prefix}${suffix}`;

  while (existingNodes.some((node) => node.id === candidate)) {
    suffix += 1;
    candidate = `${prefix}${suffix}`;
  }

  return candidate;
};

const createUniqueWorkflowEdgeId = (existingEdges: readonly Edge[]): string => {
  let suffix = existingEdges.filter(isWorkflowDraftEdge).length + 1;
  let candidate = `${WORKFLOW_EDGE_PREFIX}${suffix}`;

  while (existingEdges.some((edge) => edge.id === candidate)) {
    suffix += 1;
    candidate = `${WORKFLOW_EDGE_PREFIX}${suffix}`;
  }

  return candidate;
};

const createWorkflowAgentNode = (
  schema: TeamSchemaDocument,
  agentId: string,
  existingNodes: readonly WorkflowGraphNode[],
): WorkflowGraphNode | null => {
  const agent = schema.agents.find((candidate) => candidate.agent_id === agentId);

  if (agent === undefined) {
    return null;
  }

  const department = schema.departments.find((candidate) => candidate.department_id === agent.department_id);
  const workflowNodeCount = existingNodes.filter(isWorkflowDraftNode).length;

  return {
    id: createUniqueWorkflowNodeId(`${WORKFLOW_AGENT_NODE_PREFIX}${agentId}:`, existingNodes),
    position: { x: 980, y: 80 + workflowNodeCount * 130 },
    data: {
      kind: 'agent',
      nodeName: agent.metadata?.name ?? agent.agent_id,
      roleName: agent.role,
      departmentName: department?.name,
      detail: `Workflow agent / ${agent.agent_id}`,
      accent: 'var(--agent-accent)',
      workflowNodeType: 'agent',
    },
    type: 'workflow',
  };
};

const createWorkflowPartNode = (existingNodes: readonly WorkflowGraphNode[]): WorkflowGraphNode => {
  const workflowNodeCount = existingNodes.filter(isWorkflowDraftNode).length;
  const nodeId = createUniqueWorkflowNodeId(WORKFLOW_PART_NODE_PREFIX, existingNodes);
  const partNumber = nodeId.replace(WORKFLOW_PART_NODE_PREFIX, '');

  return {
    id: nodeId,
    position: { x: 980, y: 80 + workflowNodeCount * 130 },
    data: {
      kind: 'part',
      nodeName: `Part ${partNumber}`,
      roleName: 'Workflow Part',
      detail: 'Reusable step or handoff segment',
      accent: 'var(--part-accent)',
      workflowNodeType: 'part',
    },
    type: 'workflow',
  };
};

const isCompleteConnection = (connection: Connection): connection is Connection & { readonly source: string; readonly target: string } =>
  typeof connection.source === 'string' && typeof connection.target === 'string';

const createWorkflowEdge = (
  connection: Connection & { readonly source: string; readonly target: string },
  mode: WorkflowEdgeMode,
  existingEdges: readonly Edge[],
): Edge => {
  const edgeColor = mode === 'discuss' ? '#2f7b6d' : '#d96c3f';
  const marker = { type: MarkerType.ArrowClosed, color: edgeColor };
  const edge: Edge = {
    id: createUniqueWorkflowEdgeId(existingEdges),
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    type: 'smoothstep',
    label: mode,
    animated: mode === 'discuss',
    data: { mode },
    markerEnd: marker,
    style: { stroke: edgeColor, strokeWidth: 2.2 },
  };

  if (mode === 'discuss') {
    return {
      ...edge,
      markerStart: marker,
    };
  }

  return edge;
};

export const useTeamEditor = (): {
  readonly schema: TeamSchemaDocument;
  readonly schemaLoadStatus: SchemaLoadStatus;
  readonly schemaLoadError: string | null;
  readonly validationIssues: readonly ValidationIssue[];
  readonly nodes: WorkflowGraphNode[];
  readonly edges: Edge[];
  readonly selection: Selection;
  readonly onNodesChange: OnNodesChange<WorkflowGraphNode>;
  readonly onNodeSelect: (nodeId: string | null) => void;
  readonly addWorkflowAgentNode: (agentId: string) => void;
  readonly addWorkflowPartNode: () => void;
  readonly addWorkflowEdge: (connection: Connection, mode: WorkflowEdgeMode) => void;
  readonly reloadSchema: () => void;
  readonly updateTeamField: (field: 'team_name' | 'team_id' | 'schema_version', value: string) => void;
  readonly updateDepartmentField: (departmentId: string, field: 'name' | 'mission', value: string) => void;
  readonly updateDepartmentList: (departmentId: string, field: 'decision_scope' | 'handoff_contracts', value: string) => void;
  readonly updateAgentField: (agentId: string, field: 'role' | 'model' | 'description', value: string) => void;
  readonly updateAgentList: (agentId: string, field: 'responsibilities' | 'skills' | 'tools' | 'mcp_servers', value: string) => void;
  readonly updateDiscussionField: (field: 'mode' | 'conflict_resolution' | 'supervisor_agent_id', value: string) => void;
  readonly updateDiscussionNumber: (field: 'max_rounds', value: number) => void;
  readonly addDepartment: () => void;
  readonly removeDepartment: (departmentId: string) => void;
  readonly addAgent: (departmentId: string) => void;
  readonly removeAgent: (agentId: string) => void;
} => {
  const dispatch = useAppDispatch();
  const schema = useAppSelector((state) => state.editor.schema);
  const schemaLoadStatus = useAppSelector((state) => state.editor.schemaLoadStatus);
  const schemaLoadError = useAppSelector((state) => state.editor.schemaLoadError);
  const validationIssues = useAppSelector((state) => state.editor.validationIssues);
  const selection = useAppSelector((state) => state.editor.selection);
  const [nodes, setNodes] = useState<WorkflowGraphNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    if (schemaLoadStatus !== 'idle') {
      return;
    }

    dispatch(startSchemaLoad());
    void loadTeamSchemaFromService()
      .then((nextSchema) => dispatch(schemaLoadSucceeded(nextSchema)))
      .catch((error: unknown) => dispatch(schemaLoadFailed(toErrorMessage(error))));
  }, [dispatch, schemaLoadStatus]);

  useEffect(() => {
    const graph = buildGraph(schema);
    setNodes((currentNodes) => {
      const workflowDraftNodes = currentNodes.filter(isWorkflowDraftNode);

      return graph.nodes.map((node) => {
        const existingNode = currentNodes.find((candidate) => candidate.id === node.id);

        return existingNode === undefined
          ? node
          : {
              ...node,
              position: existingNode.position,
            };
      }).concat(workflowDraftNodes);
    });
    setEdges((currentEdges) => graph.edges.concat(currentEdges.filter(isWorkflowDraftEdge)));
  }, [schema]);

  const onNodesChange: OnNodesChange<WorkflowGraphNode> = (changes) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  };

  const onNodeSelect = (nodeId: string | null): void => {
    if (nodeId?.startsWith(WORKFLOW_AGENT_NODE_PREFIX) === true) {
      const agentId = nodeId.replace(WORKFLOW_AGENT_NODE_PREFIX, '').split(':')[0];

      if (agentId !== undefined && agentId.length > 0) {
        dispatch(selectNode(`agent:${agentId}`));
      }

      return;
    }

    dispatch(selectNode(nodeId));
  };

  const addWorkflowAgentNode = (agentId: string): void => {
    setNodes((currentNodes) => {
      const workflowNode = createWorkflowAgentNode(schema, agentId, currentNodes);

      if (workflowNode === null) {
        return currentNodes;
      }

      return currentNodes.concat(workflowNode);
    });
  };

  const addWorkflowPartNode = (): void => {
    setNodes((currentNodes) => currentNodes.concat(createWorkflowPartNode(currentNodes)));
  };

  const addWorkflowEdge = (connection: Connection, mode: WorkflowEdgeMode): void => {
    if (!isCompleteConnection(connection)) {
      return;
    }

    setEdges((currentEdges) => currentEdges.concat(createWorkflowEdge(connection, mode, currentEdges)));
  };

  const reloadSchema = (): void => {
    dispatch(startSchemaLoad());
    void loadTeamSchemaFromService()
      .then((nextSchema) => dispatch(schemaLoadSucceeded(nextSchema)))
      .catch((error: unknown) => dispatch(schemaLoadFailed(toErrorMessage(error))));
  };

  const addDepartment = (): void => {
    dispatch(addDepartmentAction());
  };

  const removeDepartment = (departmentId: string): void => {
    dispatch(removeDepartmentAction(departmentId));
  };

  const addAgent = (departmentId: string): void => {
    dispatch(addAgentAction(departmentId));
  };

  const removeAgent = (agentId: string): void => {
    dispatch(removeAgentAction(agentId));
  };

  const updateTeamField = (field: 'team_name' | 'team_id' | 'schema_version', value: string): void => {
    dispatch(updateTeamFieldAction({ field, value }));
  };

  const updateDepartmentField = (departmentId: string, field: 'name' | 'mission', value: string): void => {
    dispatch(updateDepartmentFieldAction({ departmentId, field, value }));
  };

  const updateDepartmentList = (departmentId: string, field: 'decision_scope' | 'handoff_contracts', value: string): void => {
    dispatch(updateDepartmentListAction({ departmentId, field, value }));
  };

  const updateAgentField = (agentId: string, field: 'role' | 'model' | 'description', value: string): void => {
    dispatch(updateAgentFieldAction({ agentId, field, value }));
  };

  const updateAgentList = (agentId: string, field: 'responsibilities' | 'skills' | 'tools' | 'mcp_servers', value: string): void => {
    dispatch(updateAgentListAction({ agentId, field, value }));
  };

  const updateDiscussionField = (field: 'mode' | 'conflict_resolution' | 'supervisor_agent_id', value: string): void => {
    dispatch(updateDiscussionFieldAction({ field, value }));
  };

  const updateDiscussionNumber = (field: 'max_rounds', value: number): void => {
    dispatch(updateDiscussionNumberAction({ field, value }));
  };

  return {
    schema,
    schemaLoadStatus,
    schemaLoadError,
    validationIssues,
    nodes,
    edges,
    selection,
    onNodesChange,
    onNodeSelect,
    addWorkflowAgentNode,
    addWorkflowPartNode,
    addWorkflowEdge,
    reloadSchema,
    updateTeamField,
    updateDepartmentField,
    updateDepartmentList,
    updateAgentField,
    updateAgentList,
    updateDiscussionField,
    updateDiscussionNumber,
    addDepartment,
    removeDepartment,
    addAgent,
    removeAgent,
  };
};