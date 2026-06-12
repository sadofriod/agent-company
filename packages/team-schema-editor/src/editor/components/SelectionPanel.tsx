import type { ReactElement } from 'react';
import { Box, Stack, Typography } from '@mui/material';

import { AgentSelectionView } from './selection/AgentSelectionView';
import { DepartmentSelectionView } from './selection/DepartmentSelectionView';
import { DiscussionSelectionView } from './selection/DiscussionSelectionView';
import { MemoryPolicyView } from './selection/MemoryPolicyView';
import { PipelinePolicyView } from './selection/PipelinePolicyView';
import { ReviewPolicyView } from './selection/ReviewPolicyView';
import { TeamSelectionView } from './selection/TeamSelectionView';
import { WorkflowNodeSelectionView } from './selection/WorkflowNodeSelectionView';
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
  updateAgentField: (agentId: string, field: 'role' | 'model' | 'description' | 'memory_access_policy', value: string) => void;
  updateAgentList: (agentId: string, field: 'responsibilities' | 'skills' | 'tools' | 'mcp_servers', value: string) => void;
  updateAgentMetadataField: (agentId: string, field: 'name' | 'description' | 'profile' | 'tool_policy', value: string) => void;
  updateAgentMetadataList: (agentId: string, field: 'partials' | 'tools' | 'allowed_commands' | 'required_commands', value: string) => void;
  updateDiscussionField: (field: 'mode' | 'conflict_resolution' | 'supervisor_agent_id', value: string) => void;
  updateDiscussionNumber: (field: 'max_rounds', value: number) => void;
  updateMemoryPolicyField: (field: 'retrieval_mode' | 'vector_store' | 'graph_store' | 'conflict_strategy', value: string) => void;
  updateMemoryPolicyList: (field: 'indexed_object_types' | 'evidence_required_for_outputs', value: string) => void;
  addMemoryRetrievalProfile: () => void;
  removeMemoryRetrievalProfile: (profileId: string) => void;
  updateMemoryRetrievalProfileField: (profileId: string, field: 'profile_id', value: string) => void;
  updateMemoryRetrievalProfileList: (profileId: string, field: 'allowed_scopes', value: string) => void;
  updateMemoryRetrievalProfileNumber: (profileId: string, field: 'max_results' | 'max_graph_hops', value: number) => void;
  updateMemoryRetrievalProfileBoolean: (profileId: string, field: 'require_reviewed_memory', value: boolean) => void;
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
  updateMemoryPolicyField,
  updateMemoryPolicyList,
  addMemoryRetrievalProfile,
  removeMemoryRetrievalProfile,
  updateMemoryRetrievalProfileField,
  updateMemoryRetrievalProfileList,
  updateMemoryRetrievalProfileNumber,
  updateMemoryRetrievalProfileBoolean,
}: SelectionPanelProps): ReactElement => {
  const form = useSelectionForm(schema, selection);

  const department = selection.kind === 'department'
    ? schema.departments.find((candidate) => candidate.department_id === selection.departmentId)
    : undefined;
  const agent = selection.kind === 'agent'
    ? schema.agents.find((candidate) => candidate.agent_id === selection.agentId)
    : undefined;
  const workflowNode = selection.kind === 'workflowNode'
    ? nodes.find((candidate) => candidate.id === selection.nodeId)
    : undefined;

  if (selection.kind === 'team') {
    return (
      <Box sx={{ p: 2.25, minHeight: { xs: 'auto', lg: '100%' } }}>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
              Inspector
            </Typography>
            <Typography variant="h5">Selection</Typography>
          </Stack>
          <TeamSelectionView form={form} addDepartment={addDepartment} updateTeamField={updateTeamField} />
        </Stack>
      </Box>
    );
  }

  if (selection.kind === 'department') {
    if (department === undefined) {
      return (
        <Box sx={{ p: 2.25, minHeight: { xs: 'auto', lg: '100%' } }}>
          <Stack spacing={2}>
            <Typography variant="h5">Department</Typography>
            <Typography color="text.secondary">Department not found.</Typography>
          </Stack>
        </Box>
      );
    }

    return (
      <Box sx={{ p: 2.25, minHeight: { xs: 'auto', lg: '100%' } }}>
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
      </Box>
    );
  }

  if (selection.kind === 'agent') {
    if (agent === undefined) {
      return (
        <Box sx={{ p: 2.25, minHeight: { xs: 'auto', lg: '100%' } }}>
          <Stack spacing={2}>
            <Typography variant="h5">Agent</Typography>
            <Typography color="text.secondary">Agent not found.</Typography>
          </Stack>
        </Box>
      );
    }

    return (
      <Box sx={{ p: 2.25, minHeight: { xs: 'auto', lg: '100%' } }}>
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
      </Box>
    );
  }

  if (selection.kind === 'workflowNode') {
    if (workflowNode === undefined) {
      return (
        <Box sx={{ p: 2.25, minHeight: { xs: 'auto', lg: '100%' } }}>
          <Stack spacing={2}>
            <Typography variant="h5">Workflow Node</Typography>
            <Typography color="text.secondary">Workflow node not found.</Typography>
          </Stack>
        </Box>
      );
    }

    return (
      <Box sx={{ p: 2.25, minHeight: { xs: 'auto', lg: '100%' } }}>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
              Inspector
            </Typography>
            <Typography variant="h5">Workflow Node</Typography>
          </Stack>
          <WorkflowNodeSelectionView
            schema={schema}
            workflowNode={workflowNode}
            updateWorkflowAgentNode={updateWorkflowAgentNode}
            updateWorkflowNodeMetadata={updateWorkflowNodeMetadata}
            removeWorkflowDraftNode={removeWorkflowDraftNode}
            updateAgentField={updateAgentField}
            updateAgentList={updateAgentList}
            updateAgentMetadataField={updateAgentMetadataField}
            updateAgentMetadataList={updateAgentMetadataList}
            updateMemoryPolicyField={updateMemoryPolicyField}
            updateMemoryPolicyList={updateMemoryPolicyList}
            addMemoryRetrievalProfile={addMemoryRetrievalProfile}
            removeMemoryRetrievalProfile={removeMemoryRetrievalProfile}
            updateMemoryRetrievalProfileField={updateMemoryRetrievalProfileField}
            updateMemoryRetrievalProfileList={updateMemoryRetrievalProfileList}
            updateMemoryRetrievalProfileNumber={updateMemoryRetrievalProfileNumber}
            updateMemoryRetrievalProfileBoolean={updateMemoryRetrievalProfileBoolean}
          />
        </Stack>
      </Box>
    );
  }

  if (selection.kind === 'discussion') {
    return (
      <Box sx={{ p: 2.25, minHeight: { xs: 'auto', lg: '100%' } }}>
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
      </Box>
    );
  }

  if (selection.kind === 'pipeline') {
    return (
      <Box sx={{ p: 2.25, minHeight: { xs: 'auto', lg: '100%' } }}>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
              Inspector
            </Typography>
            <Typography variant="h5">Selection</Typography>
          </Stack>
          <PipelinePolicyView />
        </Stack>
      </Box>
    );
  }

  if (selection.kind === 'review') {
    return (
      <Box sx={{ p: 2.25, minHeight: { xs: 'auto', lg: '100%' } }}>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
              Inspector
            </Typography>
            <Typography variant="h5">Selection</Typography>
          </Stack>
          <ReviewPolicyView schema={schema} />
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2.25, minHeight: { xs: 'auto', lg: '100%' } }}>
      <Stack spacing={2}>
        <Stack spacing={0.75}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
            Inspector
          </Typography>
          <Typography variant="h5">Selection</Typography>
        </Stack>
        <MemoryPolicyView
          schema={schema}
          updateMemoryPolicyField={updateMemoryPolicyField}
          updateMemoryPolicyList={updateMemoryPolicyList}
          addMemoryRetrievalProfile={addMemoryRetrievalProfile}
          removeMemoryRetrievalProfile={removeMemoryRetrievalProfile}
          updateMemoryRetrievalProfileField={updateMemoryRetrievalProfileField}
          updateMemoryRetrievalProfileList={updateMemoryRetrievalProfileList}
          updateMemoryRetrievalProfileNumber={updateMemoryRetrievalProfileNumber}
          updateMemoryRetrievalProfileBoolean={updateMemoryRetrievalProfileBoolean}
        />
      </Stack>
    </Box>
  );
};