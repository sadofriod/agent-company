import type { ReactElement } from 'react';
import { Stack, Typography } from '@mui/material';
import type { UseFormReturn } from 'react-hook-form';

import { SelectionFieldType, SelectionFormField } from './SelectionFormField';
import type { SelectionFormValues } from './selectionFormValues';
import { DiscussionField } from '../../state/core/editorShared';

type DiscussionSelectionViewProps = {
  form: UseFormReturn<SelectionFormValues>;
  updateDiscussionField: (field: DiscussionField, value: string) => void;
  updateDiscussionNumber: (field: 'max_rounds', value: number) => void;
};

export const DiscussionSelectionView = ({ form, updateDiscussionField, updateDiscussionNumber }: DiscussionSelectionViewProps): ReactElement => {
  return (
    <Stack spacing={2}>
      <Typography variant="h6">Discussion Policy</Typography>
      <SelectionFormField form={form} name="mode" label="Mode" onValueChange={(value) => updateDiscussionField(DiscussionField.Mode, value)} />
      <SelectionFormField form={form} name="max_rounds" label="Max Rounds" type={SelectionFieldType.Number} onValueChange={(value) => updateDiscussionNumber('max_rounds', Number.parseInt(value, 10))} />
      <SelectionFormField form={form} name="supervisor_agent_id" label="Supervisor Agent Id" onValueChange={(value) => updateDiscussionField(DiscussionField.SupervisorAgentId, value)} />
      <SelectionFormField form={form} name="conflict_resolution" label="Conflict Resolution" onValueChange={(value) => updateDiscussionField(DiscussionField.ConflictResolution, value)} />
    </Stack>
  );
};