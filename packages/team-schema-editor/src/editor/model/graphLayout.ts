import type { Edge } from '@xyflow/react';

import { GraphNodeKind } from './types';
import type { GraphNodeData, TeamSchemaDocument, WorkflowGraphNode } from './types';

const TEAM_NODE_ID = 'team';
const DISCUSSION_NODE_ID = 'discussion';
const PIPELINE_NODE_ID = 'pipeline';
const REVIEW_NODE_ID = 'review';
const MEMORY_NODE_ID = 'memory';

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

const createEdge = (id: string, source: string, target: string, label?: string, animated = false): Edge => ({
  id,
  source,
  target,
  label,
  animated,
});

export const buildGraph = (schema: TeamSchemaDocument): { nodes: WorkflowGraphNode[]; edges: Edge[] } => {
  const nodes: WorkflowGraphNode[] = [];
  const edges: Edge[] = [];

  nodes.push(
    createNode(TEAM_NODE_ID, 40, 120, {
      kind: GraphNodeKind.Team,
      nodeName: schema.team_name ?? schema.team_id,
      roleName: 'Team',
      detail: schema.team_id,
      accent: 'var(--team-accent)',
    }),
  );

  schema.departments.forEach((department, departmentIndex) => {
    const departmentNodeId = `department:${department.department_id}`;
    const departmentY = 40 + departmentIndex * 180;

    nodes.push(
      createNode(departmentNodeId, 340, departmentY, {
        kind: GraphNodeKind.Department,
        nodeName: department.name,
        roleName: 'Department',
        detail: department.department_id,
        accent: 'var(--department-accent)',
      }),
    );

    edges.push(createEdge(`team-department:${department.department_id}`, TEAM_NODE_ID, departmentNodeId, 'owns'));

    department.agents.forEach((agentId, agentIndex) => {
      const agent = schema.agents.find((candidate) => candidate.agent_id === agentId);

      if (agent === undefined) {
        return;
      }

      const agentNodeId = `agent:${agent.agent_id}`;

      nodes.push(
        createNode(agentNodeId, 680, departmentY + agentIndex * 140, {
          kind: GraphNodeKind.Agent,
          nodeName: agent.metadata?.name ?? agent.agent_id,
          roleName: agent.role,
          departmentName: department.name,
          detail: agent.agent_id,
          accent: 'var(--agent-accent)',
        }),
      );

      edges.push(createEdge(`department-agent:${department.department_id}:${agent.agent_id}`, departmentNodeId, agentNodeId, agent.role));
    });
  });

  nodes.push(
    createNode(DISCUSSION_NODE_ID, 340, 520, {
      kind: GraphNodeKind.Discussion,
      nodeName: 'Discussion Policy',
      roleName: 'Governance',
      detail: `${schema.discussion_policy.mode} / ${schema.discussion_policy.max_rounds} rounds`,
      accent: 'var(--discussion-accent)',
    }),
  );
  edges.push(createEdge('team-discussion', TEAM_NODE_ID, DISCUSSION_NODE_ID, 'governs'));

  nodes.push(
    createNode(PIPELINE_NODE_ID, 340, 660, {
      kind: GraphNodeKind.Pipeline,
      nodeName: 'Pipeline Policy',
      roleName: 'Workflow',
      detail: schema.pipeline_policy.review_before_handoff ? 'review before handoff' : 'direct handoff',
      accent: 'var(--pipeline-accent)',
    }),
  );
  edges.push(createEdge('team-pipeline', TEAM_NODE_ID, PIPELINE_NODE_ID, 'executes'));

  nodes.push(
    createNode(REVIEW_NODE_ID, 340, 800, {
      kind: GraphNodeKind.Review,
      nodeName: 'Review Policy',
      roleName: 'Quality Gate',
      detail: schema.review_policy.allowed_results.join(' / '),
      accent: 'var(--review-accent)',
    }),
  );
  edges.push(createEdge('team-review', TEAM_NODE_ID, REVIEW_NODE_ID, 'checks'));

  if (schema.memory_policy !== undefined) {
    nodes.push(
      createNode(MEMORY_NODE_ID, 680, 800, {
        kind: GraphNodeKind.Memory,
        nodeName: 'Memory Policy',
        roleName: 'Retrieval',
        detail: schema.memory_policy.retrieval_mode,
        accent: 'var(--memory-accent)',
      }),
    );
    edges.push(createEdge('team-memory', TEAM_NODE_ID, MEMORY_NODE_ID, 'retrieves'));
  }

  if (schema.discussion_policy.supervisor_agent_id !== undefined) {
    const supervisorNodeId = `agent:${schema.discussion_policy.supervisor_agent_id}`;
    const hasSupervisorNode = nodes.some((node) => node.id === supervisorNodeId);

    if (hasSupervisorNode) {
      edges.push(createEdge('discussion-supervisor', DISCUSSION_NODE_ID, supervisorNodeId, 'supervisor', true));
    }
  }

  return { nodes, edges };
};