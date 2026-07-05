import type { ReactElement } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import type { UseFormReturn } from 'react-hook-form';

import { SelectionFormField } from './SelectionFormField';
import type { SelectionFormValues } from './selectionFormValues';
import { SchemaField } from '../../state/core/editorShared';

type TeamSelectionViewProps = {
  form: UseFormReturn<SelectionFormValues>;
  addDepartment: () => void;
  updateTeamField: (field: SchemaField, value: string) => void;
};

export const TeamSelectionView = ({ form, addDepartment, updateTeamField }: TeamSelectionViewProps): ReactElement => {
  return (
    <Stack spacing={2}>
      <Typography variant="h6">Team</Typography>
      <Button variant="contained" onClick={addDepartment} sx={{ alignSelf: 'flex-start' }}>
        Add Department
      </Button>
      <SelectionFormField form={form} name="schema_version" label="Schema Version" onValueChange={(value) => updateTeamField(SchemaField.SchemaVersion, value)} />
      <SelectionFormField form={form} name="team_id" label="Team Id" onValueChange={(value) => updateTeamField(SchemaField.TeamId, value)} />
      <SelectionFormField form={form} name="team_name" label="Team Name" onValueChange={(value) => updateTeamField(SchemaField.TeamName, value)} />
    </Stack>
  );
};