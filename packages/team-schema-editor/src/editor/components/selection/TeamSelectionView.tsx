import type { ReactElement } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import type { UseFormReturn } from 'react-hook-form';

import { SelectionFormField } from './SelectionFormField';
import type { SelectionFormValues } from './selectionFormValues';

type TeamSelectionViewProps = {
  readonly form: UseFormReturn<SelectionFormValues>;
  readonly addDepartment: () => void;
  readonly updateTeamField: (field: 'team_name' | 'team_id' | 'schema_version', value: string) => void;
};

export const TeamSelectionView = ({ form, addDepartment, updateTeamField }: TeamSelectionViewProps): ReactElement => {
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Team</Typography>
      <Button variant="contained" onClick={addDepartment} sx={{ alignSelf: 'flex-start' }}>
        Add Department
      </Button>
      <SelectionFormField form={form} name="schema_version" label="Schema Version" onValueChange={(value) => updateTeamField('schema_version', value)} />
      <SelectionFormField form={form} name="team_id" label="Team Id" onValueChange={(value) => updateTeamField('team_id', value)} />
      <SelectionFormField form={form} name="team_name" label="Team Name" onValueChange={(value) => updateTeamField('team_name', value)} />
    </Stack>
  );
};