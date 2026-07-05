import type { ReactElement } from 'react';
import { Stack, Typography } from '@mui/material';
import type { NodeProps } from '@xyflow/react';

import { MemoryScope, type GraphNodeKind, type WorkflowGraphNode } from '../model/types';
import { AgentNode } from '../customNodes/AgentNode';
import { DepartmentNode } from '../customNodes/DepartmentNode';
import { DiscussionMemoryNode } from '../customNodes/DiscussionMemoryNode';
import { DiscussionNode } from '../customNodes/DiscussionNode';
import { NodeShell } from '../customNodes/NodeShell';
import { PipelineNode } from '../customNodes/PipelineNode';
import { SessionMemoryNode } from '../customNodes/SessionMemoryNode';
import { nodeTextSx } from '../customNodes/nodeStyles';

const nodeKindLabels: Record<GraphNodeKind, string> = {
  goal: 'Goal',
  department: 'Department',
  agent: 'Agent',
  part: 'Part',
  discussion: 'Discussion',
  pipeline: 'Pipeline',
  review: 'Review',
  memory: 'Memory',
};

export const WorkflowNode = (props: NodeProps<WorkflowGraphNode>): ReactElement => {
  const { data, selected } = props;

  if (data.kind === 'goal') {
    return (
      <NodeShell eyebrow="Goal" title={data.nodeName} accent={data.accent} selected={selected} runtimeHighlighted={data.runtimeHighlighted} runtimeDimmed={data.runtimeDimmed}>
        <Stack spacing={0.65}>
          {data.roleName === undefined ? null : (
            <Typography sx={nodeTextSx}>
              {data.roleName}
            </Typography>
          )}
          {data.detail === undefined ? null : (
            <Typography sx={nodeTextSx}>
              {data.detail}
            </Typography>
          )}
        </Stack>
      </NodeShell>
    );
  }

  if (data.kind === 'department') {
    return <DepartmentNode {...props} />;
  }

  if (data.kind === 'agent') {
    return <AgentNode {...props} />;
  }

  if (data.kind === 'discussion') {
    return <DiscussionNode {...props} />;
  }

  if (data.kind === 'pipeline') {
    return <PipelineNode {...props} />;
  }

  if (data.kind === 'memory') {
    if (data.memoryScope === MemoryScope.Discussion) {
      return <DiscussionMemoryNode {...props} />;
    }

    return <SessionMemoryNode {...props} />;
  }

  return (
    <NodeShell
      eyebrow={nodeKindLabels[data.kind]}
      title={data.nodeName}
      accent={data.accent}
      selected={selected}
      runtimeHighlighted={data.runtimeHighlighted}
      runtimeDimmed={data.runtimeDimmed}
      workflowNodeType={data.workflowNodeType}
    >
      <Stack spacing={0.65}>
        {data.roleName === undefined ? null : (
          <Typography sx={nodeTextSx}>
            Role: {data.roleName}
          </Typography>
        )}
        {data.departmentName === undefined ? null : (
          <Typography sx={nodeTextSx}>
            Department: {data.departmentName}
          </Typography>
        )}
        {data.detail === undefined ? null : (
          <Typography sx={nodeTextSx}>
            {data.detail}
          </Typography>
        )}
      </Stack>
    </NodeShell>
  );
};