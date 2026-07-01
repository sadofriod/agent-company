import type { ReactElement } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import type { UseFormReturn } from 'react-hook-form';

import { SelectionFormField } from './SelectionFormField';
import type { SelectionFormValues } from './selectionFormValues';
import type { DepartmentDocument, TeamSchemaDocument } from '../../model/types';
import { DepartmentField, DepartmentListField } from '../../state/core/editorShared';

type DepartmentSelectionViewProps = {
  form: UseFormReturn<SelectionFormValues>;
  department: DepartmentDocument;
  schema: TeamSchemaDocument;
  addAgent: (departmentId: string) => void;
  removeDepartment: (departmentId: string) => void;
  updateDepartmentField: (departmentId: string, field: DepartmentField, value: string) => void;
  updateDepartmentList: (departmentId: string, field: DepartmentListField, value: string) => void;
};

const mergeUnique = (...groups: readonly string[][]): string[] => {
  const values = new Set<string>();

  for (const group of groups) {
    for (const item of group) {
      const normalized = item.trim();
      if (normalized.length > 0) {
        values.add(normalized);
      }
    }
  }

  return [...values];
};

export const DepartmentSelectionView = ({
  form,
  department,
  schema,
  addAgent,
  removeDepartment,
  updateDepartmentField,
  updateDepartmentList,
}: DepartmentSelectionViewProps): ReactElement => {
  // 从当前的全部 departments 获取已有的 decision_scope 和 handoff_contracts 自定义或已有枚举列表作为选择。
  const allDecisionScopes = mergeUnique(
    ['requirements', 'topic', 'decision', 'ticket_draft', 'priority', 'delivery', 'engineering', 'implementation', 'rag', 'tool_call', 'verification', 'logic_review', 'quality_review', 'memory_governance', 'acceptance'],
    ...(schema.departments.map((dept) => dept.decision_scope ?? []))
  );

  const allHandoffContracts = mergeUnique(
    ['topic_brief', 'decision_record', 'ticket_draft', 'implementation_plan', 'memory_context_package', 'verified_deliverable', 'review_result', 'block_or_revise_reason', 'acceptance_summary', 'acceptance_criteria', 'pipeline_result'],
    ...(schema.departments.map((dept) => dept.handoff_contracts ?? []))
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h6">{department.name}</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={() => addAgent(department.department_id)}>Add Agent</Button>
        <Button color="error" variant="outlined" onClick={() => removeDepartment(department.department_id)}>Delete Department</Button>
      </Box>
      <SelectionFormField form={form} name="name" label="Name" onValueChange={(value) => updateDepartmentField(department.department_id, DepartmentField.Name, value)} />
      <SelectionFormField form={form} name="mission" label="Mission" multiline onValueChange={(value) => updateDepartmentField(department.department_id, DepartmentField.Mission, value)} />
      
      <SelectionFormField
        form={form}
        name="decision_scope"
        label="Decision Scope"
        select
        multiple
        options={allDecisionScopes}
        onValueChange={(value) => updateDepartmentList(department.department_id, DepartmentListField.DecisionScope, value)}
      />

      <SelectionFormField
        form={form}
        name="handoff_contracts"
        label="Handoff Contracts"
        select
        multiple
        options={allHandoffContracts}
        onValueChange={(value) => updateDepartmentList(department.department_id, DepartmentListField.HandoffContracts, value)}
      />
    </Stack>
  );
};