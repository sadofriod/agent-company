import { useAppDispatch, useAppSelector } from '../state/core/editorHooks';
import type { TeamEditorModel } from './helper/teamEditor.types';
import { useTeamSchemaMutations } from './useTeamSchemaMutations';
import { useTeamSchemaService } from './useTeamSchemaService';
import { useWorkflowGraphEditor } from './useWorkflowGraphEditor';

export const useTeamEditor = (): TeamEditorModel => {
  const dispatch = useAppDispatch();
  const schema = useAppSelector((state) => state.editor.schema);
  const schemaLoadStatus = useAppSelector((state) => state.editor.schemaLoadStatus);
  const schemaLoadError = useAppSelector((state) => state.editor.schemaLoadError);
  const validationIssues = useAppSelector((state) => state.editor.validationIssues);
  const selection = useAppSelector((state) => state.editor.selection);
  const schemaService = useTeamSchemaService(schema, dispatch);
  const workflowGraph = useWorkflowGraphEditor(schema, dispatch);
  const schemaMutations = useTeamSchemaMutations(dispatch);

  return {
    schema,
    schemaLoadStatus,
    schemaLoadError,
    schemaServiceStatus: schemaService.schemaServiceStatus,
    schemaServiceError: schemaService.schemaServiceError,
    schemaServiceMessage: schemaService.schemaServiceMessage,
    schemaRecords: schemaService.schemaRecords,
    selectedSchemaKey: schemaService.selectedSchemaKey,
    validationIssues,
    nodes: workflowGraph.nodes,
    edges: workflowGraph.edges,
    selection,
    onNodesChange: workflowGraph.onNodesChange,
    onNodeSelect: workflowGraph.onNodeSelect,
    addWorkflowAgentNode: workflowGraph.addWorkflowAgentNode,
    addWorkflowPartNode: workflowGraph.addWorkflowPartNode,
    addWorkflowEdge: workflowGraph.addWorkflowEdge,
    ...schemaMutations,
    refreshSchemaRecords: schemaService.refreshSchemaRecords,
    reloadSchema: schemaService.reloadSchema,
    selectSchemaKey: schemaService.selectSchemaKey,
    validateSchema: schemaService.validateSchema,
    saveSchema: schemaService.saveSchema,
    deleteSchema: schemaService.deleteSchema,
  };
};
