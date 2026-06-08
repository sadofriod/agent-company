import type { CaseReducer, PayloadAction } from '@reduxjs/toolkit';

import { parseList, type DepartmentField, type DepartmentListField, type EditorState, updateDepartment, withSchema } from '../core/editorShared';

export const updateDepartmentField: CaseReducer<
  EditorState,
  PayloadAction<{ departmentId: string; field: DepartmentField; value: string }>
> = (state, action): void => {
  const schema = updateDepartment(state.schema, action.payload.departmentId, (department) => ({
    ...department,
    [action.payload.field]: action.payload.value,
  }));

  Object.assign(state, withSchema(state, schema));
};

export const updateDepartmentList: CaseReducer<
  EditorState,
  PayloadAction<{ departmentId: string; field: DepartmentListField; value: string }>
> = (state, action): void => {
  const schema = updateDepartment(state.schema, action.payload.departmentId, (department) => ({
    ...department,
    [action.payload.field]: parseList(action.payload.value),
  }));

  Object.assign(state, withSchema(state, schema));
};