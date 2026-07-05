import type { Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';

import { GraphNodeKind, MemoryScope, SchemaEdgeTone, WorkflowEdgeType } from './types';
import type { AgentDocument, DepartmentDocument, GraphNodeData, SchemaEdgeData, TeamSchemaDocument, WorkflowGraphNode } from './types';

export const GOAL_NODE_ID = 'goal';
const DISCUSSION_NODE_ID = 'discussion';
const DISCUSSION_MEMORY_NODE_ID = 'memory:discussion';
const SESSION_MEMORY_NODE_ID = 'memory:session';

const GOAL_X = -300;
const DEPARTMENT_X = 40;
const AGENT_X = 380;
const GOVERNANCE_X = 760;
const MEMORY_X = 1080;
const START_Y = 40;
const AGENT_GAP_Y = 140;
const MIN_DEPARTMENT_GROUP_HEIGHT = 190;
const GOVERNANCE_GAP_Y = 160;

const createNode = (
  id: string,
  x: number,
  y: number,
  data: GraphNodeData,
): WorkflowGraphNode => ({
  id,
  position: { x, y },
  data,
  type: 'workflow',
});

const schemaEdgeColors: Record<SchemaEdgeTone, string> = {
  [SchemaEdgeTone.Structure]: '#667085',
  [SchemaEdgeTone.Governance]: '#a8558f',
  [SchemaEdgeTone.Memory]: '#3b8290',
};

const createEdge = (
  id: string,
  source: string,
  target: string,
  label?: string,
  tone: SchemaEdgeTone = SchemaEdgeTone.Structure,
  animated = false,
): Edge => {
  const edgeData: SchemaEdgeData = { label, tone };
  const color = schemaEdgeColors[tone];

  return {
    id,
    source,
    target,
    type: WorkflowEdgeType.SchemaRelation,
    animated,
    data: edgeData,
    markerEnd: { type: MarkerType.ArrowClosed, color },
    style: { stroke: color, strokeWidth: animated ? 2 : 1.8 },
  };
};

type GraphAccumulator = {
  readonly nodes: readonly WorkflowGraphNode[];
  readonly edges: readonly Edge[];
  readonly cursorY: number;
};

const buildDepartmentGraph = (
  acc: GraphAccumulator,
  department: DepartmentDocument,
  schema: TeamSchemaDocument,
): GraphAccumulator => {
  const departmentNodeId = `department:${department.department_id}`;
  const resolvedAgents = department.agents
    .map((agentId) => schema.agents.find((candidate) => candidate.agent_id === agentId))
    .filter((agent): agent is AgentDocument => agent !== undefined);
  const groupHeight = Math.max(MIN_DEPARTMENT_GROUP_HEIGHT, resolvedAgents.length * AGENT_GAP_Y);
  const departmentY = acc.cursorY + Math.max(0, (resolvedAgents.length - 1) * (AGENT_GAP_Y / 2));

  const departmentNode = createNode(departmentNodeId, DEPARTMENT_X, departmentY, {
    kind: GraphNodeKind.Department,
    nodeName: department.name,
    roleName: 'Department',
    detail: department.department_id,
    accent: 'var(--department-accent)',
    department,
  });

  const agentNodes = resolvedAgents.map((agent, agentIndex) =>
    createNode(`agent:${agent.agent_id}`, AGENT_X, acc.cursorY + agentIndex * AGENT_GAP_Y, {
      kind: GraphNodeKind.Agent,
      nodeName: agent.metadata?.name ?? agent.agent_id,
      roleName: agent.role,
      departmentName: department.name,
      detail: agent.agent_id,
      accent: 'var(--agent-accent)',
      agent,
    }),
  );

  const agentEdges = resolvedAgents.map((agent) =>
    createEdge(
      `department-agent:${department.department_id}:${agent.agent_id}`,
      departmentNodeId,
      `agent:${agent.agent_id}`,
      agent.role,
    ),
  );

  const goalDepartmentEdge = createEdge(`goal-department:${department.department_id}`, GOAL_NODE_ID, departmentNodeId, 'input');

  return {
    nodes: [...acc.nodes, departmentNode, ...agentNodes],
    edges: [...acc.edges, goalDepartmentEdge, ...agentEdges],
    cursorY: acc.cursorY + groupHeight,
  };
};

export const buildGraph = (schema: TeamSchemaDocument): { nodes: WorkflowGraphNode[]; edges: Edge[] } => {
  const goalNode = createNode(GOAL_NODE_ID, GOAL_X, START_Y, {
    kind: GraphNodeKind.Goal,
    nodeName: 'Goal Input',
    roleName: 'Team Schema Input',
    detail: schema.team_name ?? schema.team_id,
    accent: 'var(--goal-accent)',
  });

  const initial: GraphAccumulator = {
    nodes: [goalNode],
    edges: [],
    cursorY: START_Y,
  };

  const { nodes: orgNodes, edges: orgEdges, cursorY: finalCursorY } = schema.departments.reduce(
    (acc, department) => buildDepartmentGraph(acc, department, schema),
    initial,
  );

  const governanceY = Math.max(START_Y, Math.round((finalCursorY - START_Y - GOVERNANCE_GAP_Y * 2) / 2));

  const discussionNode = createNode(DISCUSSION_NODE_ID, GOVERNANCE_X, governanceY, {
    kind: GraphNodeKind.Discussion,
    nodeName: 'Discussion Policy',
    roleName: 'Governance',
    detail: `${schema.discussion_policy?.mode ?? 'none'} / ${schema.discussion_policy?.max_rounds ?? 0} rounds`,
    accent: 'var(--discussion-accent)',
    discussionPolicy: schema.discussion_policy,
  });

  const goalDiscussionEdge = createEdge('goal-discussion', GOAL_NODE_ID, DISCUSSION_NODE_ID, 'clarify', SchemaEdgeTone.Governance);

  const memoryNodes: WorkflowGraphNode[] = [];
  const memoryEdges: Edge[] = [];

  if (schema.memory_policy !== undefined) {
    memoryNodes.push(
      createNode(DISCUSSION_MEMORY_NODE_ID, MEMORY_X, governanceY, {
        kind: GraphNodeKind.Memory,
        nodeName: 'Discussion Memory',
        roleName: 'Retriever',
        detail: 'Discussion retrieval and conflict routing',
        memoryScope: MemoryScope.Discussion,
        memoryPolicy: schema.memory_policy,
        accent: 'var(--memory-accent)',
      }),
    );

    memoryNodes.push(
      createNode(SESSION_MEMORY_NODE_ID, MEMORY_X, governanceY + GOVERNANCE_GAP_Y, {
        kind: GraphNodeKind.Memory,
        nodeName: 'Session Memory',
        roleName: 'Retriever',
        detail: 'Execution retrieval and evidence packaging',
        memoryScope: MemoryScope.Session,
        memoryPolicy: schema.memory_policy,
        accent: 'var(--memory-accent)',
      }),
    );

    memoryEdges.push(createEdge('discussion-memory-discussion', DISCUSSION_NODE_ID, DISCUSSION_MEMORY_NODE_ID, 'retrieve', SchemaEdgeTone.Memory));
    memoryEdges.push(createEdge('discussion-memory-session', DISCUSSION_NODE_ID, SESSION_MEMORY_NODE_ID, 'retrieve', SchemaEdgeTone.Memory));
  }

  const supervisorEdges: Edge[] = [];
  if (schema.discussion_policy.supervisor_agent_id !== undefined) {
    const supervisorNodeId = `agent:${schema.discussion_policy.supervisor_agent_id}`;
    const allNodes = [...orgNodes, discussionNode, ...memoryNodes];
    const hasSupervisorNode = allNodes.some((node) => node.id === supervisorNodeId);

    if (hasSupervisorNode) {
      supervisorEdges.push(
        createEdge('discussion-supervisor', DISCUSSION_NODE_ID, supervisorNodeId, 'supervisor', SchemaEdgeTone.Governance, true),
      );
    }
  }

  return {
    nodes: [...orgNodes, discussionNode, ...memoryNodes] as WorkflowGraphNode[],
    edges: [...orgEdges, goalDiscussionEdge, ...memoryEdges, ...supervisorEdges],
  };
};
