import { createSlice } from '@reduxjs/toolkit';

import {
  addAgent as addAgentReducer,
  removeAgent as removeAgentReducer,
  updateAgentField as updateAgentFieldReducer,
  updateAgentList as updateAgentListReducer,
  updateAgentMetadataField as updateAgentMetadataFieldReducer,
  updateAgentMetadataList as updateAgentMetadataListReducer,
} from '../reducers/agentReducers';
import {
  schemaLoadFailed as schemaLoadFailedReducer,
  schemaLoadSucceeded as schemaLoadSucceededReducer,
  startSchemaLoad as startSchemaLoadReducer,
} from '../reducers/documentReducers';
import {
  updateDiscussionField as updateDiscussionFieldReducer,
  updateDiscussionNumber as updateDiscussionNumberReducer,
} from '../reducers/discussionReducers';
import {
  updateDepartmentField as updateDepartmentFieldReducer,
  updateDepartmentList as updateDepartmentListReducer,
} from '../reducers/departmentReducers';
import { selectNode as selectNodeReducer } from '../reducers/selectionReducers';
import {
  addDepartment as addDepartmentReducer,
  removeDepartment as removeDepartmentReducer,
  updateTeamField as updateTeamFieldReducer,
} from '../reducers/teamReducers';
import { initialState } from './editorShared';

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    selectNode: selectNodeReducer,
    startSchemaLoad: startSchemaLoadReducer,
    schemaLoadSucceeded: schemaLoadSucceededReducer,
    schemaLoadFailed: schemaLoadFailedReducer,
    updateTeamField: updateTeamFieldReducer,
    updateDepartmentField: updateDepartmentFieldReducer,
    updateDepartmentList: updateDepartmentListReducer,
    updateAgentField: updateAgentFieldReducer,
    updateAgentList: updateAgentListReducer,
    updateAgentMetadataField: updateAgentMetadataFieldReducer,
    updateAgentMetadataList: updateAgentMetadataListReducer,
    updateDiscussionField: updateDiscussionFieldReducer,
    updateDiscussionNumber: updateDiscussionNumberReducer,
    addDepartment: addDepartmentReducer,
    removeDepartment: removeDepartmentReducer,
    addAgent: addAgentReducer,
    removeAgent: removeAgentReducer,
  },
});

export const {
  addAgent,
  addDepartment,
  removeAgent,
  removeDepartment,
  schemaLoadFailed,
  schemaLoadSucceeded,
  selectNode,
  startSchemaLoad,
  updateAgentField,
  updateAgentList,
  updateAgentMetadataField,
  updateAgentMetadataList,
  updateDepartmentField,
  updateDepartmentList,
  updateDiscussionField,
  updateDiscussionNumber,
  updateTeamField,
} = editorSlice.actions;

export const editorReducer = editorSlice.reducer;