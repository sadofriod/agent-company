import type { ReactElement } from 'react';
import { MenuItem, Stack, Typography } from '@mui/material';

import { CONFLICT_RESOLUTION, DISCUSSION_MODE } from '@agents-team/service/domain/organization';
import { SelectionFormField } from './SelectionFormField';
import { SelectionFieldType } from './SelectionFormField';
import type { UseFormReturn } from 'react-hook-form';
import type { SelectionFormValues } from './selectionFormValues';
import type { TeamSchemaDocument } from '../../model/types';
import { DiscussionField } from '../../state/core/editorShared';

type DiscussionSelectionViewProps = {
  form: UseFormReturn<SelectionFormValues>;
  schema: TeamSchemaDocument;
  updateDiscussionField: (field: DiscussionField, value: string) => void;
  updateDiscussionNumber: (field: 'max_rounds', value: number) => void;
};

export const DiscussionSelectionView = ({ form, schema, updateDiscussionField, updateDiscussionNumber }: DiscussionSelectionViewProps): ReactElement => {
  const modeOptions = Object.values(DISCUSSION_MODE);
  const conflictResolutionOptions = Object.values(CONFLICT_RESOLUTION);

  const supervisorAgentOptions = [
    <MenuItem key="none" value="">
      None
    </MenuItem>,
    ...schema.agents.map((agent) => (
      <MenuItem key={agent.agent_id} value={agent.agent_id}>
        {agent.metadata?.name ?? agent.agent_id}
      </MenuItem>
    )),
  ];

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Discussion Policy</Typography>
      
      <SelectionFormField
        form={form}
        name="mode"
        label="Mode"
        select
        options={modeOptions}
        onValueChange={(value) => updateDiscussionField(DiscussionField.Mode, value)}
      />

      <SelectionFormField
        form={form}
        name="max_rounds"
        label="Max Rounds"
        type={SelectionFieldType.Number}
        onValueChange={(value) => updateDiscussionNumber('max_rounds', Number.parseInt(value, 10))}
      />

      <SelectionFormField
        form={form}
        name="supervisor_agent_id"
        label="Supervisor Agent Id"
        select
        onValueChange={(value) => updateDiscussionField(DiscussionField.SupervisorAgentId, value)}
      >
        {supervisorAgentOptions}
      </SelectionFormField>

      <SelectionFormField
        form={form}
        name="conflict_resolution"
        label="Conflict Resolution"
        select
        options={conflictResolutionOptions}
        onValueChange={(value) => updateDiscussionField(DiscussionField.ConflictResolution, value)}
      />
    </Stack>
  );
};