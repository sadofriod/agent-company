import { useMemo } from 'react';
import type { Connection, Edge, EdgeChange, NodeChange, NodePositionChange, OnEdgesChange, OnNodesChange, XYPosition } from '@xyflow/react';
import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react';

import { GOAL_NODE_ID, buildGraph } from '../model/graphLayout';
import { WorkflowEdgeMode, WorkflowNodeType } from '../model/types';
import type { AgentDocument, TeamSchemaDocument, WorkflowGraphNode } from '../model/types';
import { applyWorkflowLayoutDocument, createWorkflowLayoutDocument } from '../model/workflowLayout';
import { useAppSelector } from '../state/core/editorHooks';
import { validateSchemaDocument } from '../state/core/editorShared';
import {
  clearDiscussionSupervisor,
  removeAgent,
  removeDepartment,
  removeMemoryPolicy,
  selectNode,
  updateWorkflowLayout,
} from '../state/core/editorSlice';
import { editorStore, type AppDispatch } from '../state/core/editorStore';
import {
  setEdgeConnectionError as setGraphPanelEdgeConnectionError,
  setSelectedEdgeIds,
  setSelectedNodeIds,
} from '../state/graphPanel/graphPanelUiSlice';
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
  isWorkflowDraftEdge,
} from './helper/workflowGraphDraft';

type CreateWorkflowNode = (currentNodes: WorkflowGraphNode[]) => WorkflowGraphNode;
type NodePositionDelta = { readonly x: number; readonly y: number };
type ParentNodeDelta = { readonly parentId: string; readonly delta: NodePositionDelta };
type PositionedNodeChange = NodePositionChange & { readonly position: XYPosition };
type SelectChange = { readonly id: string; readonly type: 'select'; readonly selected: boolean };
type SchemaDeletionPlan = {
  workflowNodeIds: string[];
  workflowEdgeIds: string[];
  departmentIds: Set<string>;
  agentIds: Set<string>;
  clearDiscussionSupervisor: boolean;
  removeMemoryPolicy: boolean;
};

const DISCUSSION_NODE_ID = 'discussion';
const DISCUSSION_MEMORY_NODE_ID = 'memory:discussion';
const SESSION_MEMORY_NODE_ID = 'memory:session';
const GOAL_DISCUSSION_EDGE_ID = 'goal-discussion';
const GOAL_DEPARTMENT_EDGE_PREFIX = 'goal-department:';
const DEPARTMENT_AGENT_EDGE_PREFIX = 'department-agent:';
const DISCUSSION_MEMORY_EDGE_IDS = new Set(['discussion-memory-discussion', 'discussion-memory-session']);
const DISCUSSION_SUPERVISOR_EDGE_ID = 'discussion-supervisor';

const isPersistableNodeChange = (change: NodeChange<WorkflowGraphNode>): boolean =>
  change.type !== 'dimensions' && change.type !== 'select';

const isPersistableEdgeChange = (change: EdgeChange<Edge>): boolean =>
  change.type !== 'select';

const isDepartmentNodeId = (nodeId: string): boolean => nodeId.startsWith('department:');

const toDepartmentId = (nodeId: string): string => nodeId.replace('department:', '');

const isWorkflowDraftNodeId = (nodeId: string): boolean =>
  nodeId.startsWith(WORKFLOW_AGENT_NODE_PREFIX)
  || nodeId.startsWith('workflow-part:')
  || nodeId.startsWith(WORKFLOW_PIPELINE_NODE_PREFIX);

const isAgentNodeId = (nodeId: string): boolean => nodeId.startsWith('agent:');

const toAgentId = (nodeId: string): string => nodeId.replace('agent:', '');

const isSelectChange = <T extends { readonly type: string }>(change: T): change is T & SelectChange =>
  change.type === 'select';

const isNodeRemoveChange = (
  change: NodeChange<WorkflowGraphNode>,
): change is Extract<NodeChange<WorkflowGraphNode>, { type: 'remove' }> => change.type === 'remove';

const isEdgeRemoveChange = (change: EdgeChange<Edge>): change is Extract<EdgeChange<Edge>, { type: 'remove' }> =>
  change.type === 'remove';

const getEdgeMode = (edge: Edge): WorkflowEdgeMode | null => {
  const data = edge.data as { mode?: WorkflowEdgeMode } | undefined;

  return data?.mode ?? null;
};

const isPipelineNode = (node: WorkflowGraphNode): boolean =>
  node.id.startsWith(WORKFLOW_PIPELINE_NODE_PREFIX);

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

const pruneDisconnectedEdges = (edges: Edge[], nodes: WorkflowGraphNode[]): Edge[] => {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const nextEdges = edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));

  return nextEdges.length === edges.length ? edges : nextEdges;
};

const createSchemaDeletionPlan = (): SchemaDeletionPlan => ({
  workflowNodeIds: [],
  workflowEdgeIds: [],
  departmentIds: new Set<string>(),
  agentIds: new Set<string>(),
  clearDiscussionSupervisor: false,
  removeMemoryPolicy: false,
});

const hasSchemaDeletion = (plan: SchemaDeletionPlan): boolean =>
  plan.departmentIds.size > 0
  || plan.agentIds.size > 0
  || plan.clearDiscussionSupervisor
  || plan.removeMemoryPolicy;

const hasExecutableDeletion = (plan: SchemaDeletionPlan): boolean =>
  plan.workflowNodeIds.length > 0
  || plan.workflowEdgeIds.length > 0
  || hasSchemaDeletion(plan);

const removeAgentMemoryAccessPolicy = (agent: TeamSchemaDocument['agents'][number]): TeamSchemaDocument['agents'][number] => {
  const { memory_access_policy, ...agentWithoutMemoryPolicy } = agent;
  void memory_access_policy;

  return agentWithoutMemoryPolicy;
};

const clearDiscussionSupervisorInSchema = (schema: TeamSchemaDocument): TeamSchemaDocument => {
  const { supervisor_agent_id, ...discussionPolicyWithoutSupervisor } = schema.discussion_policy;
  void supervisor_agent_id;

  return {
    ...schema,
    discussion_policy: discussionPolicyWithoutSupervisor,
  };
};

const removeMemoryPolicyFromSchema = (schema: TeamSchemaDocument): TeamSchemaDocument => {
  if (schema.memory_policy === undefined) {
    return schema;
  }

  const { memory_policy, ...schemaWithoutMemoryPolicy } = schema;
  void memory_policy;

  return {
    ...schemaWithoutMemoryPolicy,
    agents: schema.agents.map(removeAgentMemoryAccessPolicy),
  };
};

const removeAgentFromSchema = (schema: TeamSchemaDocument, agentId: string): TeamSchemaDocument => ({
  ...schema,
  departments: schema.departments.map((department) => ({
    ...department,
    agents: department.agents.filter((currentAgentId) => currentAgentId !== agentId),
  })),
  agents: schema.agents.filter((agent) => agent.agent_id !== agentId),
  discussion_policy:
    schema.discussion_policy.supervisor_agent_id === agentId
      ? (() => {
          const { supervisor_agent_id, ...discussionPolicyWithoutSupervisor } = schema.discussion_policy;
          void supervisor_agent_id;
          return discussionPolicyWithoutSupervisor;
        })()
      : schema.discussion_policy,
});

const removeDepartmentFromSchema = (schema: TeamSchemaDocument, departmentId: string): TeamSchemaDocument => {
  const removedAgentIds = schema.agents
    .filter((agent) => agent.department_id === departmentId)
    .map((agent) => agent.agent_id);

  const nextDiscussionPolicy = removedAgentIds.includes(schema.discussion_policy.supervisor_agent_id ?? '')
    ? (() => {
        const { supervisor_agent_id, ...discussionPolicyWithoutSupervisor } = schema.discussion_policy;
        void supervisor_agent_id;
        return discussionPolicyWithoutSupervisor;
      })()
    : schema.discussion_policy;

  return {
    ...schema,
    departments: schema.departments.filter((department) => department.department_id !== departmentId),
    agents: schema.agents.filter((agent) => agent.department_id !== departmentId),
    discussion_policy: nextDiscussionPolicy,
  };
};

const applySchemaDeletionPlanToSchema = (schema: TeamSchemaDocument, plan: SchemaDeletionPlan): TeamSchemaDocument => {
  let nextSchema = schema;

  if (plan.removeMemoryPolicy) {
    nextSchema = removeMemoryPolicyFromSchema(nextSchema);
  }

  if (plan.clearDiscussionSupervisor) {
    nextSchema = clearDiscussionSupervisorInSchema(nextSchema);
  }

  plan.departmentIds.forEach((departmentId) => {
    nextSchema = removeDepartmentFromSchema(nextSchema, departmentId);
  });

  plan.agentIds.forEach((agentId) => {
    nextSchema = removeAgentFromSchema(nextSchema, agentId);
  });

  return nextSchema;
};

const buildDeletionBlockedMessage = (nextSchema: TeamSchemaDocument): string => {
  const validation = validateSchemaDocument(nextSchema);

  if (validation.ok) {
    return 'Deletion blocked: the selected graph element cannot be removed.';
  }

  const firstIssue = validation.issues[0];

  if (firstIssue === undefined) {
    return 'Deletion blocked: the resulting schema would be invalid.';
  }

  const path = firstIssue.path.length > 0 ? firstIssue.path.join('.') : 'root';

  return `Deletion blocked: ${path} ${firstIssue.message}`;
};

const appendNodeDeletion = (plan: SchemaDeletionPlan, nodeId: string): void => {
  if (isWorkflowDraftNodeId(nodeId)) {
    plan.workflowNodeIds.push(nodeId);
    return;
  }

  if (isDepartmentNodeId(nodeId)) {
    plan.departmentIds.add(toDepartmentId(nodeId));
    return;
  }

  if (isAgentNodeId(nodeId)) {
    plan.agentIds.add(toAgentId(nodeId));
    return;
  }

  if (nodeId === DISCUSSION_MEMORY_NODE_ID || nodeId === SESSION_MEMORY_NODE_ID) {
    plan.removeMemoryPolicy = true;
  }
};

const appendEdgeDeletion = (plan: SchemaDeletionPlan, edgeId: string): void => {
  if (edgeId.startsWith('workflow-link:')) {
    plan.workflowEdgeIds.push(edgeId);
    return;
  }

  if (edgeId.startsWith(GOAL_DEPARTMENT_EDGE_PREFIX)) {
    plan.departmentIds.add(edgeId.slice(GOAL_DEPARTMENT_EDGE_PREFIX.length));
    return;
  }

  if (edgeId.startsWith(DEPARTMENT_AGENT_EDGE_PREFIX)) {
    const edgeParts = edgeId.split(':');
    const agentId = edgeParts.at(-1);

    if (agentId !== undefined) {
      plan.agentIds.add(agentId);
    }
    return;
  }

  if (edgeId === DISCUSSION_SUPERVISOR_EDGE_ID) {
    plan.clearDiscussionSupervisor = true;
    return;
  }

  if (DISCUSSION_MEMORY_EDGE_IDS.has(edgeId)) {
    plan.removeMemoryPolicy = true;
  }
};

const dispatchSchemaDeletionPlan = (dispatch: AppDispatch, plan: SchemaDeletionPlan): void => {
  if (plan.removeMemoryPolicy) {
    dispatch(removeMemoryPolicy());
  }

  if (plan.clearDiscussionSupervisor) {
    dispatch(clearDiscussionSupervisor());
  }

  plan.departmentIds.forEach((departmentId) => {
    dispatch(removeDepartment(departmentId));
  });

  plan.agentIds.forEach((agentId) => {
    dispatch(removeAgent(agentId));
  });
};

const createWorkflowNodeRemoveChange = (nodeId: string): Extract<NodeChange<WorkflowGraphNode>, { type: 'remove' }> => ({
  id: nodeId,
  type: 'remove',
});

const createWorkflowEdgeRemoveChange = (edgeId: string): Extract<EdgeChange<Edge>, { type: 'remove' }> => ({
  id: edgeId,
  type: 'remove',
});

const applySelectChanges = (
  currentSelectedIds: readonly string[],
  changes: readonly SelectChange[],
  availableIds: ReadonlySet<string>,
): string[] => {
  const nextSelectedIds = new Set(currentSelectedIds);

  changes.forEach((change) => {
    if (change.selected) {
      nextSelectedIds.add(change.id);
      return;
    }

    nextSelectedIds.delete(change.id);
  });

  return Array.from(nextSelectedIds).filter((id) => availableIds.has(id));
};

const retainAvailableIds = (currentSelectedIds: readonly string[], availableIds: ReadonlySet<string>): string[] =>
  currentSelectedIds.filter((id) => availableIds.has(id));

const commitGraphSelection = (
  dispatch: AppDispatch,
  nextSelectedNodeIds: string[],
  nextSelectedEdgeIds: string[],
): void => {
  dispatch(setSelectedNodeIds(nextSelectedNodeIds));
  dispatch(setSelectedEdgeIds(nextSelectedEdgeIds));
};

const getCurrentGraphSelection = (): { selectedNodeIds: string[]; selectedEdgeIds: string[] } => {
  const { selectedNodeIds, selectedEdgeIds } = editorStore.getState().graphPanelUi;

  return { selectedNodeIds, selectedEdgeIds };
};

const syncSelectionAfterGraphChange = (
  dispatch: AppDispatch,
  nextNodes: WorkflowGraphNode[],
  nextEdges: Edge[],
  nodeSelectChanges: readonly SelectChange[],
  edgeSelectChanges: readonly SelectChange[],
): void => {
  const { selectedNodeIds, selectedEdgeIds } = getCurrentGraphSelection();
  const availableNodeIds = new Set(nextNodes.map((node) => node.id));
  const availableEdgeIds = new Set(nextEdges.map((edge) => edge.id));

  commitGraphSelection(
    dispatch,
    applySelectChanges(selectedNodeIds, nodeSelectChanges, availableNodeIds),
    applySelectChanges(selectedEdgeIds, edgeSelectChanges, availableEdgeIds),
  );
};

const createNodeSelectHandler = (dispatch: AppDispatch) => (nodeId: string | null): void => {
  dispatch(selectNode(nodeId));

  if (nodeId === null) {
    commitGraphSelection(dispatch, [], []);
    return;
  }

  commitGraphSelection(dispatch, [nodeId], []);
};

const createEdgeSelectHandler = (dispatch: AppDispatch) => (edgeId: string | null): void => {
  if (edgeId === null) {
    commitGraphSelection(dispatch, [], []);
    return;
  }

  commitGraphSelection(dispatch, [], [edgeId]);
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

const getWorkflowGraph = (schema: TeamSchemaDocument): { nodes: WorkflowGraphNode[]; edges: Edge[] } => {
  const graphWithLayout = applyWorkflowLayoutDocument(buildGraph(schema), schema.layout);

  return {
    nodes: graphWithLayout.nodes.map((node) => refreshWorkflowDraftNodeData(schema, node)),
    edges: graphWithLayout.edges,
  };
};

const getCurrentWorkflowGraph = (): { nodes: WorkflowGraphNode[]; edges: Edge[] } =>
  getWorkflowGraph(editorStore.getState().editor.schema);

const getSelectedWorkflowGraph = (schema: TeamSchemaDocument): { nodes: WorkflowGraphNode[]; edges: Edge[] } => {
  const graph = getWorkflowGraph(schema);
  const { selectedNodeIds, selectedEdgeIds } = editorStore.getState().graphPanelUi;
  const selectedNodeIdSet = new Set(selectedNodeIds);
  const selectedEdgeIdSet = new Set(selectedEdgeIds);

  return {
    nodes: graph.nodes.map((node) => ({ ...node, selected: selectedNodeIdSet.has(node.id) })),
    edges: graph.edges.map((edge) => ({ ...edge, selected: selectedEdgeIdSet.has(edge.id) })),
  };
};

const commitWorkflowLayout = (
  dispatch: AppDispatch,
  nextNodes: WorkflowGraphNode[],
  nextEdges: Edge[],
): void => {
  dispatch(updateWorkflowLayout(createWorkflowLayoutDocument(nextNodes, nextEdges)));
};

const createNodesChangeHandler = (
  dispatch: AppDispatch,
): OnNodesChange<WorkflowGraphNode> => (changes) => {
  const persistedChanges = changes.filter(isPersistableNodeChange);
  const selectChanges = changes.filter(isSelectChange);
  const removeChanges = persistedChanges.filter(isNodeRemoveChange);
  const nonRemovePersistedChanges = persistedChanges.filter((change) => change.type !== 'remove');

  if (persistedChanges.length === 0 && selectChanges.length === 0) {
    return;
  }

  const deletionPlan = createSchemaDeletionPlan();
  removeChanges.forEach((change) => appendNodeDeletion(deletionPlan, change.id));

  if (removeChanges.length > 0 && !hasExecutableDeletion(deletionPlan)) {
    dispatch(setGraphPanelEdgeConnectionError('Selected graph node cannot be deleted from the canvas.'));
    return;
  }

  if (hasSchemaDeletion(deletionPlan)) {
    const nextSchema = applySchemaDeletionPlanToSchema(editorStore.getState().editor.schema, deletionPlan);
    const validation = validateSchemaDocument(nextSchema);

    if (!validation.ok) {
      dispatch(setGraphPanelEdgeConnectionError(buildDeletionBlockedMessage(nextSchema)));
      return;
    }
  }

  if (hasExecutableDeletion(deletionPlan)) {
    dispatch(setGraphPanelEdgeConnectionError(null));
    dispatchSchemaDeletionPlan(dispatch, deletionPlan);
  }

  const { nodes: currentNodes, edges: currentEdges } = getCurrentWorkflowGraph();
  const workflowRemoveChanges = deletionPlan.workflowNodeIds.map(createWorkflowNodeRemoveChange);
  const graphChanges: NodeChange<WorkflowGraphNode>[] = [...nonRemovePersistedChanges, ...workflowRemoveChanges];

  const nextGraph = (() => {
    if (graphChanges.length === 0) {
      return { nextNodes: currentNodes, nextEdges: currentEdges };
    }

    const parentDeltas = toParentNodeDeltas(graphChanges, currentNodes);
    const changedNodes = applyNodeChanges(graphChanges, currentNodes);
    const nextNodes = applyUiParentNodeMovement(changedNodes, currentEdges, parentDeltas);
    const nextEdges = pruneDisconnectedEdges(currentEdges, nextNodes);

    commitWorkflowLayout(dispatch, nextNodes, nextEdges);

    return { nextNodes, nextEdges };
  })();

  syncSelectionAfterGraphChange(dispatch, nextGraph.nextNodes, nextGraph.nextEdges, selectChanges, []);

  const { selection } = editorStore.getState().editor;

  if (
    selection.kind === 'workflowNode'
    && !nextGraph.nextNodes.some((node) => node.id === selection.nodeId)
  ) {
    dispatch(selectNode('team'));
  }
};

const createEdgesChangeHandler = (
  dispatch: AppDispatch,
): OnEdgesChange<Edge> => (changes) => {
  const persistedChanges = changes.filter(isPersistableEdgeChange);
  const selectChanges = changes.filter(isSelectChange);
  const removeChanges = persistedChanges.filter(isEdgeRemoveChange);
  const nonRemovePersistedChanges = persistedChanges.filter((change) => change.type !== 'remove');

  if (persistedChanges.length === 0 && selectChanges.length === 0) {
    return;
  }

  const deletionPlan = createSchemaDeletionPlan();
  removeChanges.forEach((change) => appendEdgeDeletion(deletionPlan, change.id));

  if (removeChanges.length > 0 && !hasExecutableDeletion(deletionPlan)) {
    dispatch(setGraphPanelEdgeConnectionError(
      removeChanges.some((change) => change.id === GOAL_DISCUSSION_EDGE_ID)
        ? 'The discussion root edge is required by the schema and cannot be deleted from the canvas.'
        : 'Selected graph edge cannot be deleted from the canvas.',
    ));
    return;
  }

  if (hasSchemaDeletion(deletionPlan)) {
    const nextSchema = applySchemaDeletionPlanToSchema(editorStore.getState().editor.schema, deletionPlan);
    const validation = validateSchemaDocument(nextSchema);

    if (!validation.ok) {
      dispatch(setGraphPanelEdgeConnectionError(buildDeletionBlockedMessage(nextSchema)));
      return;
    }
  }

  if (hasExecutableDeletion(deletionPlan)) {
    dispatch(setGraphPanelEdgeConnectionError(null));
    dispatchSchemaDeletionPlan(dispatch, deletionPlan);
  }

  const { nodes: currentNodes, edges: currentEdges } = getCurrentWorkflowGraph();
  const workflowRemoveChanges = deletionPlan.workflowEdgeIds.map(createWorkflowEdgeRemoveChange);
  const graphChanges: EdgeChange<Edge>[] = [...nonRemovePersistedChanges, ...workflowRemoveChanges];

  const nextEdges = graphChanges.length === 0
    ? currentEdges
    : applyEdgeChanges(graphChanges, currentEdges);

  if (graphChanges.length > 0) {
    commitWorkflowLayout(dispatch, currentNodes, nextEdges);
  }

  syncSelectionAfterGraphChange(dispatch, currentNodes, nextEdges, [], selectChanges);
};

const createWorkflowNodeAppender = (
  dispatch: AppDispatch,
) => (createNode: CreateWorkflowNode): void => {
  const { nodes: currentNodes, edges: currentEdges } = getCurrentWorkflowGraph();
  const node = createNode(currentNodes);
  const nextNodes = currentNodes.concat(node);

  commitWorkflowLayout(dispatch, nextNodes, currentEdges);
  commitGraphSelection(dispatch, [node.id], []);
  dispatch(selectNode(node.id));
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
  dispatch: AppDispatch,
) => (nodeId: string, agentId: string): void => {
  const currentSchema = editorStore.getState().editor.schema;
  const { nodes: currentNodes, edges: currentEdges } = getCurrentWorkflowGraph();
  const nextNodes = currentNodes.map((node) => (
    node.id === nodeId ? updateWorkflowAgentNodeData(currentSchema, node, agentId) : node
  ));

  commitWorkflowLayout(dispatch, nextNodes, currentEdges);
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
  dispatch: AppDispatch,
) => (nodeId: string, field: WorkflowMetadataField, value: string): void => {
  const currentSchema = editorStore.getState().editor.schema;
  const { nodes: currentNodes, edges: currentEdges } = getCurrentWorkflowGraph();
  const nextNodes = currentNodes.map((node) => (
    node.id === nodeId ? updateWorkflowNodeMetadataData(currentSchema, node, field, value) : node
  ));

  commitWorkflowLayout(dispatch, nextNodes, currentEdges);
};

const createWorkflowDraftNodeRemover = (
  dispatch: AppDispatch,
) => (nodeId: string): void => {
  const { nodes: currentNodes, edges: currentEdges } = getCurrentWorkflowGraph();
  const nextNodes = currentNodes.filter((node) => node.id !== nodeId);
  const nextEdges = currentEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);

  commitWorkflowLayout(dispatch, nextNodes, nextEdges);
  commitGraphSelection(dispatch, [], []);
  dispatch(selectNode('team'));
};

const createWorkflowEdgeAdder = (
  dispatch: AppDispatch,
) => (connection: Connection, mode: WorkflowEdgeMode): void => {
  const { nodes: currentNodes, edges: currentEdges } = getCurrentWorkflowGraph();
  const result = createWorkflowEdge(connection, mode, currentEdges);

  if (result.status === CreateWorkflowEdgeStatus.Rejected) {
    dispatch(setGraphPanelEdgeConnectionError(
      result.reason === CreateWorkflowEdgeRejectionReason.PipelineCycle
        ? 'Pipeline edge rejected: it would create a cycle. Pipeline children must form a DAG.'
        : 'Connection rejected: missing source or target.',
    ));
    return;
  }

  dispatch(setGraphPanelEdgeConnectionError(null));
  commitWorkflowLayout(dispatch, currentNodes, currentEdges.concat(result.edge));
};

export const useWorkflowGraphEditor = (
  schema: TeamSchemaDocument,
  dispatch: AppDispatch,
): WorkflowGraphEditorModel => {
  const selectedNodeIds = useAppSelector((state) => state.graphPanelUi.selectedNodeIds);
  const selectedEdgeIds = useAppSelector((state) => state.graphPanelUi.selectedEdgeIds);
  const { nodes, edges } = useMemo(
    () => getSelectedWorkflowGraph(schema),
    [schema, selectedEdgeIds, selectedNodeIds],
  );
  const edgeConnectionError = useAppSelector((state) => state.graphPanelUi.edgeConnectionError);

  const onNodesChange = useMemo(() => createNodesChangeHandler(dispatch), [dispatch]);
  const onEdgesChange = useMemo(() => createEdgesChangeHandler(dispatch), [dispatch]);
  const onNodeSelect = useMemo(() => createNodeSelectHandler(dispatch), [dispatch]);
  const onEdgeSelect = useMemo(() => createEdgeSelectHandler(dispatch), [dispatch]);
  const appendWorkflowNode = useMemo(() => createWorkflowNodeAppender(dispatch), [dispatch]);
  const updateWorkflowAgentNode = useMemo(() => createWorkflowAgentNodeUpdater(dispatch), [dispatch]);
  const updateWorkflowNodeMetadata = useMemo(() => createWorkflowNodeMetadataUpdater(dispatch), [dispatch]);
  const removeWorkflowDraftNode = useMemo(() => createWorkflowDraftNodeRemover(dispatch), [dispatch]);
  const addWorkflowEdge = useMemo(() => createWorkflowEdgeAdder(dispatch), [dispatch]);

  const addWorkflowAgentNode = (): void => {
    appendWorkflowNode(createWorkflowAgentNode);
  };

  const addWorkflowPartNode = (): void => {
    appendWorkflowNode(createWorkflowPartNode);
  };

  const addWorkflowPipelineNode = (): void => {
    appendWorkflowNode(createWorkflowPipelineNode);
  };

  const clearEdgeConnectionError = (): void => {
    dispatch(setGraphPanelEdgeConnectionError(null));
  };

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onNodeSelect,
    onEdgeSelect,
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
