import type { ReactElement } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import type { UseFormReturn } from 'react-hook-form';

import { SelectionFormField } from './SelectionFormField';
import type { SelectionFormValues } from './selectionFormValues';
import type { DepartmentDocument } from '../../model/types';
import { DepartmentField, DepartmentListField } from '../../state/core/editorShared';

type DepartmentSelectionViewProps = {
  form: UseFormReturn<SelectionFormValues>;
  department: DepartmentDocument;
  addAgent: (departmentId: string) => void;
  removeDepartment: (departmentId: string) => void;
  updateDepartmentField: (departmentId: string, field: DepartmentField, value: string) => void;
  updateDepartmentList: (departmentId: string, field: DepartmentListField, value: string) => void;
};

export const DepartmentSelectionView = ({
  form,
  department,
  addAgent,
  removeDepartment,
  updateDepartmentField,
  updateDepartmentList,
}: DepartmentSelectionViewProps): ReactElement => {
  return (
    <Stack spacing={2}>
      <Typography variant="h6">{department.name}</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={() => addAgent(department.department_id)}>Add Agent</Button>
        <Button color="error" variant="outlined" onClick={() => removeDepartment(department.department_id)}>Delete Department</Button>
      </Box>
      <SelectionFormField form={form} name="name" label="Name" onValueChange={(value) => updateDepartmentField(department.department_id, DepartmentField.Name, value)} />
      <SelectionFormField form={form} name="mission" label="Mission" multiline onValueChange={(value) => updateDepartmentField(department.department_id, DepartmentField.Mission, value)} />
      <SelectionFormField form={form} name="decision_scope" label="Decision Scope" multiline onValueChange={(value) => updateDepartmentList(department.department_id, DepartmentListField.DecisionScope, value)} />
      <SelectionFormField form={form} name="handoff_contracts" label="Handoff Contracts" multiline onValueChange={(value) => updateDepartmentList(department.department_id, DepartmentListField.HandoffContracts, value)} />
    </Stack>
  );
};