import type { ReactElement } from 'react';
import { Paper, Stack, Typography } from '@mui/material';

import { AgentSelectionView } from './selection/AgentSelectionView';
import { DepartmentSelectionView } from './selection/DepartmentSelectionView';
import { DiscussionSelectionView } from './selection/DiscussionSelectionView';
import { MemoryPolicyView } from './selection/MemoryPolicyView';
import { PipelinePolicyView } from './selection/PipelinePolicyView';
import { ReviewPolicyView } from './selection/ReviewPolicyView';
import { TeamSelectionView } from './selection/TeamSelectionView';
import type { Selection, TeamSchemaDocument } from '../model/types';
import { useSelectionForm } from './selection/useSelectionForm';

type SelectionPanelProps = {
  readonly schema: TeamSchemaDocument;
  readonly selection: Selection;
  readonly addDepartment: () => void;
  readonly removeDepartment: (departmentId: string) => void;
  readonly addAgent: (departmentId: string) => void;
  readonly removeAgent: (agentId: string) => void;
  readonly updateTeamField: (field: 'team_name' | 'team_id' | 'schema_version', value: string) => void;
  readonly updateDepartmentField: (departmentId: string, field: 'name' | 'mission', value: string) => void;
  readonly updateDepartmentList: (departmentId: string, field: 'decision_scope' | 'handoff_contracts', value: string) => void;
  readonly updateAgentField: (agentId: string, field: 'role' | 'model' | 'description', value: string) => void;
  readonly updateAgentList: (agentId: string, field: 'responsibilities' | 'skills' | 'tools' | 'mcp_servers', value: string) => void;
  readonly updateDiscussionField: (field: 'mode' | 'conflict_resolution' | 'supervisor_agent_id', value: string) => void;
  readonly updateDiscussionNumber: (field: 'max_rounds', value: number) => void;
};

export const SelectionPanel = ({
  schema,
  selection,
  addDepartment,
  removeDepartment,
  addAgent,
  removeAgent,
  updateTeamField,
  updateDepartmentField,
  updateDepartmentList,
  updateAgentField,
  updateAgentList,
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