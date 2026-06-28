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
import type { AgentLlmDocument, Selection, TeamSchemaDocument, WorkflowGraphNode } from '../model/types';
import { useSelectionForm } from './selection/useSelectionForm';
import type {
  AgentField,
  AgentListField,
  AgentMetadataField,
  AgentMetadataListField,
  DepartmentField,
  DepartmentListField,
  DiscussionField,
  MemoryPolicyField,
  MemoryPolicyListField,
  MemoryRetrievalProfileBooleanField,
  MemoryRetrievalProfileField,
  MemoryRetrievalProfileListField,
  MemoryRetrievalProfileNumberField,
  SchemaField,
} from '../state/core/editorShared';
import type { WorkflowMetadataField } from '../hooks/helper/teamEditor.types';

const inspectorPanelSx = { p: 1.5, minHeight: { xs: 'auto', lg: '100%' } } as const;
const inspectorKickerSx = { letterSpacing: 0 } as const;

type SelectionPanelProps = {
  schema: TeamSchemaDocument;
  nodes: WorkflowGraphNode[];
  selection: Selection;
  addDepartment: () => void;
  removeDepartment: (departmentId: string) => void;
  addAgent: (departmentId: string) => void;
  removeAgent: (agentId: string) => void;
  updateWorkflowAgentNode: (nodeId: string, agentId: string) => void;
  updateWorkflowNodeMetadata: (nodeId: string, field: WorkflowMetadataField, value: string) => void;
  removeWorkflowDraftNode: (nodeId: string) => void;
  updateTeamField: (field: SchemaField, value: string) => void;
  updateDepartmentField: (departmentId: string, field: DepartmentField, value: string) => void;
  updateDepartmentList: (departmentId: string, field: DepartmentListField, value: string) => void;
  updateAgentField: (agentId: string, field: AgentField, value: string) => void;
  updateAgentLlmBinding: (agentId: string, llm: AgentLlmDocument | null) => void;
  updateAgentList: (agentId: string, field: AgentListField, value: string) => void;
  updateAgentMetadataField: (agentId: string, field: AgentMetadataField, value: string) => void;
  updateAgentMetadataList: (agentId: string, field: AgentMetadataListField, value: string) => void;
  updateDiscussionField: (field: DiscussionField, value: string) => void;
  updateDiscussionNumber: (field: 'max_rounds', value: number) => void;
  updateMemoryPolicyField: (field: MemoryPolicyField, value: string) => void;
  updateMemoryPolicyList: (field: MemoryPolicyListField, value: string) => void;
  addMemoryRetrievalProfile: () => void;
  removeMemoryRetrievalProfile: (profileId: string) => void;
  updateMemoryRetrievalProfileField: (profileId: string, field: MemoryRetrievalProfileField, value: string) => void;
  updateMemoryRetrievalProfileList: (profileId: string, field: MemoryRetrievalProfileListField, value: string) => void;
  updateMemoryRetrievalProfileNumber: (profileId: string, field: MemoryRetrievalProfileNumberField, value: number) => void;
  updateMemoryRetrievalProfileBoolean: (profileId: string, field: MemoryRetrievalProfileBooleanField, value: boolean) => void;
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
  updateAgentLlmBinding,
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
      <Box sx={inspectorPanelSx}>
        <Stack spacing={1.5}>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary" sx={inspectorKickerSx}>
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
        <Box sx={inspectorPanelSx}>
          <Stack spacing={1.5}>
            <Typography variant="h6">Department</Typography>
            <Typography color="text.secondary">Department not found.</Typography>
          </Stack>
        </Box>
      );
    }

    return (
      <Box sx={inspectorPanelSx}>
        <Stack spacing={1.5}>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary" sx={inspectorKickerSx}>
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
        <Box sx={inspectorPanelSx}>
          <Stack spacing={1.5}>
            <Typography variant="h6">Agent</Typography>
            <Typography color="text.secondary">Agent not found.</Typography>
          </Stack>
        </Box>
      );
    }

    return (
      <Box sx={inspectorPanelSx}>
        <Stack spacing={1.5}>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary" sx={inspectorKickerSx}>
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
        <Box sx={inspectorPanelSx}>
          <Stack spacing={1.5}>
            <Typography variant="h6">Workflow Node</Typography>
            <Typography color="text.secondary">Workflow node not found.</Typography>
          </Stack>
        </Box>
      );
    }

    return (
      <Box sx={inspectorPanelSx}>
        <Stack spacing={1.5}>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary" sx={inspectorKickerSx}>
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
            updateAgentLlmBinding={updateAgentLlmBinding}
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
      <Box sx={inspectorPanelSx}>
        <Stack spacing={1.5}>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary" sx={inspectorKickerSx}>
              Inspector
            </Typography>
            <Typography variant="h5">Selection</Typography>
          </Stack>
          <DiscussionSelectionView
            schema={schema}
            updateDiscussionField={updateDiscussionField}
            updateDiscussionNumber={updateDiscussionNumber}
          />
        </Stack>
      </Box>
    );
  }

  if (selection.kind === 'pipeline') {
    return (
      <Box sx={inspectorPanelSx}>
        <Stack spacing={1.5}>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary" sx={inspectorKickerSx}>
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
      <Box sx={inspectorPanelSx}>
        <Stack spacing={1.5}>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary" sx={inspectorKickerSx}>
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
    <Box sx={inspectorPanelSx}>
      <Stack spacing={1.5}>
        <Stack spacing={0.5}>
          <Typography variant="overline" color="text.secondary" sx={inspectorKickerSx}>
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