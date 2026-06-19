import type { Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';

import { GraphNodeKind, MemoryScope, SchemaEdgeTone, WorkflowEdgeType } from './types';
import type { AgentDocument, GraphNodeData, SchemaEdgeData, TeamSchemaDocument, WorkflowGraphNode } from './types';

export const GOAL_NODE_ID = 'goal';
const DISCUSSION_NODE_ID = 'discussion';
export const PIPELINE_NODE_ID = 'pipeline';
const REVIEW_NODE_ID = 'review';
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

export const buildGraph = (schema: TeamSchemaDocument): { nodes: WorkflowGraphNode[]; edges: Edge[] } => {
  const nodes: WorkflowGraphNode[] = [];
  const edges: Edge[] = [];
  let organizationCursorY = START_Y;

  nodes.push(
    createNode(GOAL_NODE_ID, GOAL_X, START_Y, {
      kind: GraphNodeKind.Goal,
      nodeName: 'Goal Input',
      roleName: 'Team Schema Input',
      detail: schema.team_name ?? schema.team_id,
      accent: 'var(--goal-accent)',
    }),
  );

  schema.departments.forEach((department) => {
    const departmentNodeId = `department:${department.department_id}`;
    const resolvedAgents = department.agents
      .map((agentId) => schema.agents.find((candidate) => candidate.agent_id === agentId))
      .filter((agent): agent is AgentDocument => agent !== undefined);
    const groupHeight = Math.max(MIN_DEPARTMENT_GROUP_HEIGHT, resolvedAgents.length * AGENT_GAP_Y);
    const departmentY = organizationCursorY + Math.max(0, (resolvedAgents.length - 1) * (AGENT_GAP_Y / 2));

    nodes.push(
      createNode(departmentNodeId, DEPARTMENT_X, departmentY, {
        kind: GraphNodeKind.Department,
        nodeName: department.name,
        roleName: 'Department',
        detail: department.department_id,
        accent: 'var(--department-accent)',
        department,
      }),
    );

    resolvedAgents.forEach((agent, agentIndex) => {
      const agentNodeId = `agent:${agent.agent_id}`;

      nodes.push(
        createNode(agentNodeId, AGENT_X, organizationCursorY + agentIndex * AGENT_GAP_Y, {
          kind: GraphNodeKind.Agent,
          nodeName: agent.metadata?.name ?? agent.agent_id,
          roleName: agent.role,
          departmentName: department.name,
          detail: agent.agent_id,
          accent: 'var(--agent-accent)',
          agent,
        }),
      );

      edges.push(createEdge(`department-agent:${department.department_id}:${agent.agent_id}`, departmentNodeId, agentNodeId, agent.role));
    });

    organizationCursorY += groupHeight;

    edges.push(createEdge(`goal-department:${department.department_id}`, GOAL_NODE_ID, departmentNodeId, 'input'));
  });

  const governanceY = Math.max(START_Y, Math.round((organizationCursorY - START_Y - GOVERNANCE_GAP_Y * 2) / 2));

  nodes.push(
    createNode(DISCUSSION_NODE_ID, GOVERNANCE_X, governanceY, {
      kind: GraphNodeKind.Discussion,
      nodeName: 'Discussion Policy',
      roleName: 'Governance',
      detail: `${schema.discussion_policy?.mode ?? 'none'} / ${schema.discussion_policy?.max_rounds ?? 0} rounds`,
      accent: 'var(--discussion-accent)',
      discussionPolicy: schema.discussion_policy,
    }),
  );

  nodes.push(
    createNode(PIPELINE_NODE_ID, GOVERNANCE_X, governanceY + GOVERNANCE_GAP_Y, {
      kind: GraphNodeKind.Pipeline,
      nodeName: 'Pipeline Policy',
      roleName: 'Workflow',
      detail: schema.pipeline_policy?.review_before_handoff ? 'review before handoff' : 'direct handoff',
      accent: 'var(--pipeline-accent)',
    }),
  );

  nodes.push(
    createNode(REVIEW_NODE_ID, GOVERNANCE_X, governanceY + GOVERNANCE_GAP_Y * 2, {
      kind: GraphNodeKind.Review,
      nodeName: 'Review Policy',
      roleName: 'Quality Gate',
      detail: schema.review_policy?.allowed_results?.join(' / ') ?? '',
      accent: 'var(--review-accent)',
    }),
  );

  edges.push(createEdge('goal-discussion', GOAL_NODE_ID, DISCUSSION_NODE_ID, 'clarify', SchemaEdgeTone.Governance));
  edges.push(createEdge('goal-pipeline', GOAL_NODE_ID, PIPELINE_NODE_ID, 'execute', SchemaEdgeTone.Governance));

  if (schema.memory_policy !== undefined) {
    nodes.push(
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

    nodes.push(
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

    edges.push(createEdge('discussion-memory-discussion', DISCUSSION_NODE_ID, DISCUSSION_MEMORY_NODE_ID, 'retrieve', SchemaEdgeTone.Memory));
    edges.push(createEdge('pipeline-memory-session', PIPELINE_NODE_ID, SESSION_MEMORY_NODE_ID, 'retrieve', SchemaEdgeTone.Memory));
  }

  if (schema.discussion_policy.supervisor_agent_id !== undefined) {
    const supervisorNodeId = `agent:${schema.discussion_policy.supervisor_agent_id}`;
    const hasSupervisorNode = nodes.some((node) => node.id === supervisorNodeId);

    if (hasSupervisorNode) {
      edges.push(createEdge('discussion-supervisor', DISCUSSION_NODE_ID, supervisorNodeId, 'supervisor', SchemaEdgeTone.Governance, true));
    }
  }

  return { nodes, edges };
};