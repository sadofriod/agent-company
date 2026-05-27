import type { ReactElement } from 'react';
import { Stack, Typography } from '@mui/material';
import type { UseFormReturn } from 'react-hook-form';

import { SelectionFormField } from './SelectionFormField';
import type { SelectionFormValues } from './selectionFormValues';

type DiscussionSelectionViewProps = {
  readonly form: UseFormReturn<SelectionFormValues>;
  readonly updateDiscussionField: (field: 'mode' | 'conflict_resolution' | 'supervisor_agent_id', value: string) => void;
  readonly updateDiscussionNumber: (field: 'max_rounds', value: number) => void;
};

export const DiscussionSelectionView = ({ form, updateDiscussionField, updateDiscussionNumber }: DiscussionSelectionViewProps): ReactElement => {
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Discussion Policy</Typography>
      <SelectionFormField form={form} name="mode" label="Mode" onValueChange={(value) => updateDiscussionField('mode', value)} />
      <SelectionFormField form={form} name="max_rounds" label="Max Rounds" type="number" onValueChange={(value) => updateDiscussionNumber('max_rounds', Number.parseInt(value, 10))} />
      <SelectionFormField form={form} name="supervisor_agent_id" label="Supervisor Agent Id" onValueChange={(value) => updateDiscussionField('supervisor_agent_id', value)} />
      <SelectionFormField form={form} name="conflict_resolution" label="Conflict Resolution" onValueChange={(value) => updateDiscussionField('conflict_resolution', value)} />
    </Stack>
  );
};