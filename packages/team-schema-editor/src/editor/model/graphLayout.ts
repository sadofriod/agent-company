import type { Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';

import { GraphNodeKind, WorkflowEdgeType } from './types';
import type { GraphNodeData, SchemaEdgeData, SchemaEdgeTone, TeamSchemaDocument, WorkflowGraphNode } from './types';

const DISCUSSION_NODE_ID = 'discussion';
const PIPELINE_NODE_ID = 'pipeline';
const REVIEW_NODE_ID = 'review';
const DISCUSSION_MEMORY_NODE_ID = 'memory:discussion';
const SESSION_MEMORY_NODE_ID = 'memory:session';

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
  structure: '#667085',
  governance: '#a8558f',
  memory: '#3b8290',
};

const createEdge = (
  id: string,
  source: string,
  target: string,
  label?: string,
  tone: SchemaEdgeTone = 'structure',
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

  schema.departments.forEach((department, departmentIndex) => {
    const departmentNodeId = `department:${department.department_id}`;
    const departmentY = 40 + departmentIndex * 180;

    nodes.push(
      createNode(departmentNodeId, 40, departmentY, {
        kind: GraphNodeKind.Department,
        nodeName: department.name,
        roleName: 'Department',
        detail: department.department_id,
        accent: 'var(--department-accent)',
        department,
      }),
    );

    department.agents.forEach((agentId, agentIndex) => {
      const agent = schema.agents.find((candidate) => candidate.agent_id === agentId);

      if (agent === undefined) {
        return;
      }

      const agentNodeId = `agent:${agent.agent_id}`;

      nodes.push(
        createNode(agentNodeId, 380, departmentY + agentIndex * 140, {
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
  });

  nodes.push(
    createNode(DISCUSSION_NODE_ID, 40, 520, {
      kind: GraphNodeKind.Discussion,
      nodeName: 'Discussion Policy',
      roleName: 'Governance',
      detail: `${schema.discussion_policy.mode} / ${schema.discussion_policy.max_rounds} rounds`,
      accent: 'var(--discussion-accent)',
      discussionPolicy: schema.discussion_policy,
    }),
  );

  nodes.push(
    createNode(PIPELINE_NODE_ID, 40, 660, {
      kind: GraphNodeKind.Pipeline,
      nodeName: 'Pipeline Policy',
      roleName: 'Workflow',
      detail: schema.pipeline_policy.review_before_handoff ? 'review before handoff' : 'direct handoff',
      accent: 'var(--pipeline-accent)',
    }),
  );

  nodes.push(
    createNode(REVIEW_NODE_ID, 40, 800, {
      kind: GraphNodeKind.Review,
      nodeName: 'Review Policy',
      roleName: 'Quality Gate',
      detail: schema.review_policy.allowed_results.join(' / '),
      accent: 'var(--review-accent)',
    }),
  );

  if (schema.memory_policy !== undefined) {
    nodes.push(
      createNode(DISCUSSION_MEMORY_NODE_ID, 380, 800, {
        kind: GraphNodeKind.Memory,
        nodeName: 'Discussion Memory',
        roleName: 'Retriever',
        detail: 'Discussion retrieval and conflict routing',
        memoryScope: 'discussion',
        memoryPolicy: schema.memory_policy,
        accent: 'var(--memory-accent)',
      }),
    );

    nodes.push(
      createNode(SESSION_MEMORY_NODE_ID, 680, 800, {
        kind: GraphNodeKind.Memory,
        nodeName: 'Session Memory',
        roleName: 'Retriever',
        detail: 'Execution retrieval and evidence packaging',
        memoryScope: 'session',
        memoryPolicy: schema.memory_policy,
        accent: 'var(--memory-accent)',
      }),
    );

    edges.push(createEdge('discussion-memory-discussion', DISCUSSION_NODE_ID, DISCUSSION_MEMORY_NODE_ID, 'retrieve', 'memory'));
    edges.push(createEdge('pipeline-memory-session', PIPELINE_NODE_ID, SESSION_MEMORY_NODE_ID, 'retrieve', 'memory'));
  }

  if (schema.discussion_policy.supervisor_agent_id !== undefined) {
    const supervisorNodeId = `agent:${schema.discussion_policy.supervisor_agent_id}`;
    const hasSupervisorNode = nodes.some((node) => node.id === supervisorNodeId);

    if (hasSupervisorNode) {
      edges.push(createEdge('discussion-supervisor', DISCUSSION_NODE_ID, supervisorNodeId, 'supervisor', 'governance', true));
    }
  }

  return { nodes, edges };
};