import type { ReactElement } from 'react';
import { Paper, Stack, Typography } from '@mui/material';

import { AgentSelectionView } from './selection/AgentSelectionView';
import { DepartmentSelectionView } from './selection/DepartmentSelectionView';
import { DiscussionSelectionView } from './selection/DiscussionSelectionView';
import { MemoryPolicyView } from './selection/MemoryPolicyView';
import { PipelinePolicyView } from './selection/PipelinePolicyView';
import { ReviewPolicyView } from './selection/ReviewPolicyView';
import { TeamSelectionView } from './selection/TeamSelectionView';
import { WorkflowAgentSelectionView } from './selection/WorkflowAgentSelectionView';
import type { Selection, TeamSchemaDocument, WorkflowGraphNode } from '../model/types';
import { useSelectionForm } from './selection/useSelectionForm';

type SelectionPanelProps = {
  schema: TeamSchemaDocument;
  nodes: WorkflowGraphNode[];
  selection: Selection;
  addDepartment: () => void;
  removeDepartment: (departmentId: string) => void;
  addAgent: (departmentId: string) => void;
  removeAgent: (agentId: string) => void;
  updateWorkflowAgentNode: (nodeId: string, agentId: string) => void;
  updateWorkflowNodeMetadata: (nodeId: string, field: 'name' | 'description', value: string) => void;
  removeWorkflowDraftNode: (nodeId: string) => void;
  updateTeamField: (field: 'team_name' | 'team_id' | 'schema_version', value: string) => void;
  updateDepartmentField: (departmentId: string, field: 'name' | 'mission', value: string) => void;
  updateDepartmentList: (departmentId: string, field: 'decision_scope' | 'handoff_contracts', value: string) => void;
  updateAgentField: (agentId: string, field: 'role' | 'model' | 'description', value: string) => void;
  updateAgentList: (agentId: string, field: 'responsibilities' | 'skills' | 'tools' | 'mcp_servers', value: string) => void;
  updateAgentMetadataField: (agentId: string, field: 'name' | 'description' | 'profile' | 'tool_policy', value: string) => void;
  updateAgentMetadataList: (agentId: string, field: 'partials' | 'tools' | 'allowed_commands' | 'required_commands', value: string) => void;
  updateDiscussionField: (field: 'mode' | 'conflict_resolution' | 'supervisor_agent_id', value: string) => void;
  updateDiscussionNumber: (field: 'max_rounds', value: number) => void;
};

export const SelectionPanel = ({
  schema,
  nodes,
  selection,
  addDepartment,
  removeDepartment,
  addAgent,
  removeAgent,
  updateWorkflowAgentNode,
  updateWorkflowNodeMetadata,
  removeWorkflowDraftNode,
  updateTeamField,
  updateDepartmentField,
  updateDepartmentList,
  updateAgentField,
  updateAgentList,
  updateAgentMetadataField,
  updateAgentMetadataList,
  updateDiscussionField,
  updateDiscussionNumber,
}: SelectionPanelProps): ReactElement => {
  const form = useSelectionForm(schema, selection);

  const department = selection.kind === 'department'
    ? schema.departments.find((candidate) => candidate.department_id === selection.departmentId)
    : undefined;
  const agent = selection.kind === 'agent'
    ? schema.agents.find((candidate) => candidate.agent_id === selection.agentId)
    : undefined;
  const workflowNode = selection.kind === 'workflowAgent'
    ? nodes.find((candidate) => candidate.id === selection.nodeId)
    : undefined;

  if (selection.kind === 'team') {
    return (
      <Paper sx={{ p: 2.25, minHeight: { xs: 'auto', xl: 900 } }}>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
              Inspector
            </Typography>
            <Typography variant="h5">Selection</Typography>
          </Stack>
          <TeamSelectionView form={form} addDepartment={addDepartment} updateTeamField={updateTeamField} />
        </Stack>
      </Paper>
    );
  }

  if (selection.kind === 'department') {
    if (department === undefined) {
      return (
        <Paper sx={{ p: 2.25, minHeight: { xs: 'auto', xl: 900 } }}>
          <Stack spacing={2}>
            <Typography variant="h5">Department</Typography>
            <Typography color="text.secondary">Department not found.</Typography>
          </Stack>
        </Paper>
      );
    }

    return (
      <Paper sx={{ p: 2.25, minHeight: { xs: 'auto', xl: 900 } }}>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
              Inspector
            </Typography>
            <Typography variant="h5">Selection</Typography>
          </Stack>
          <DepartmentSelectionView
            form={form}
            department={department}
            addAgent={addAgent}
            removeDepartment={removeDepartment}
            updateDepartmentField={updateDepartmentField}
            updateDepartmentList={updateDepartmentList}
          />
        </Stack>
      </Paper>
    );
  }

  if (selection.kind === 'agent') {
    if (agent === undefined) {
      return (
        <Paper sx={{ p: 2.25, minHeight: { xs: 'auto', xl: 900 } }}>
          <Stack spacing={2}>
            <Typography variant="h5">Agent</Typography>
            <Typography color="text.secondary">Agent not found.</Typography>
          </Stack>
        </Paper>
      );
    }

    return (
      <Paper sx={{ p: 2.25, minHeight: { xs: 'auto', xl: 900 } }}>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
              Inspector
            </Typography>
            <Typography variant="h5">Selection</Typography>
          </Stack>
          <AgentSelectionView
            form={form}
            agent={agent}
            removeAgent={removeAgent}
            updateAgentField={updateAgentField}
            updateAgentList={updateAgentList}
            updateAgentMetadataField={updateAgentMetadataField}
            updateAgentMetadataList={updateAgentMetadataList}
          />
        </Stack>
      </Paper>
    );
  }

  if (selection.kind === 'workflowAgent') {
    if (workflowNode === undefined) {
      return (
        <Paper sx={{ p: 2.25, minHeight: { xs: 'auto', xl: 900 } }}>
          <Stack spacing={2}>
            <Typography variant="h5">Workflow Agent</Typography>
            <Typography color="text.secondary">Workflow node not found.</Typography>
          </Stack>
        </Paper>
      );
    }

    return (
      <Paper sx={{ p: 2.25, minHeight: { xs: 'auto', xl: 900 } }}>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
              Inspector
            </Typography>
            <Typography variant="h5">Workflow Agent</Typography>
          </Stack>
          <WorkflowAgentSelectionView
            schema={schema}
            workflowNode={workflowNode}
            updateWorkflowAgentNode={updateWorkflowAgentNode}
            updateWorkflowNodeMetadata={updateWorkflowNodeMetadata}
            removeWorkflowDraftNode={removeWorkflowDraftNode}
            updateAgentField={updateAgentField}
            updateAgentList={updateAgentList}
            updateAgentMetadataField={updateAgentMetadataField}
            updateAgentMetadataList={updateAgentMetadataList}
          />
        </Stack>
      </Paper>
    );
  }

  if (selection.kind === 'discussion') {
    return (
      <Paper sx={{ p: 2.25, minHeight: { xs: 'auto', xl: 900 } }}>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
              Inspector
            </Typography>
            <Typography variant="h5">Selection</Typography>
          </Stack>
          <DiscussionSelectionView
            form={form}
            updateDiscussionField={updateDiscussionField}
            updateDiscussionNumber={updateDiscussionNumber}
          />
        </Stack>
      </Paper>
    );
  }

  if (selection.kind === 'pipeline') {
    return (
      <Paper sx={{ p: 2.25, minHeight: { xs: 'auto', xl: 900 } }}>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
              Inspector
            </Typography>
            <Typography variant="h5">Selection</Typography>
          </Stack>
          <PipelinePolicyView />
        </Stack>
      </Paper>
    );
  }

  if (selection.kind === 'review') {
    return (
      <Paper sx={{ p: 2.25, minHeight: { xs: 'auto', xl: 900 } }}>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
              Inspector
            </Typography>
            <Typography variant="h5">Selection</Typography>
          </Stack>
          <ReviewPolicyView schema={schema} />
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2.25, minHeight: { xs: 'auto', xl: 900 } }}>
      <Stack spacing={2}>
        <Stack spacing={0.75}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
            Inspector
          </Typography>
          <Typography variant="h5">Selection</Typography>
        </Stack>
        <MemoryPolicyView schema={schema} />
      </Stack>
    </Paper>
  );
};