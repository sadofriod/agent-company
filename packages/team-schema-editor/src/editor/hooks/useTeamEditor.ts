import { useAppDispatch, useAppSelector } from '../state/core/editorHooks';
import type { TeamEditorModel } from './helper/teamEditor.types';
import { useTeamSchemaMutations } from './useTeamSchemaMutations';
import { useTeamSchemaService } from './useTeamSchemaService';
import { useWorkflowGraphEditor } from './useWorkflowGraphEditor';
import { withWorkflowLayoutDocument } from '../model/workflowLayout';

export const useTeamEditor = (): TeamEditorModel => {
  const dispatch = useAppDispatch();
  const schema = useAppSelector((state) => state.editor.schema);
  const schemaLoadStatus = useAppSelector((state) => state.editor.schemaLoadStatus);
  const schemaLoadError = useAppSelector((state) => state.editor.schemaLoadError);
  const schemaDocumentRevision = useAppSelector((state) => state.editor.schemaDocumentRevision);
  const validationIssues = useAppSelector((state) => state.editor.validationIssues);
  const selection = useAppSelector((state) => state.editor.selection);
  const schemaService = useTeamSchemaService(dispatch);
  const workflowGraph = useWorkflowGraphEditor(schema, dispatch, schemaDocumentRevision);
  const schemaMutations = useTeamSchemaMutations(dispatch);
  const createPersistableSchema = (): typeof schema => withWorkflowLayoutDocument(schema, workflowGraph.nodes, workflowGraph.edges);

  return {
    schema,
    schemaLoadStatus,
    schemaLoadError,
    schemaServiceStatus: schemaService.schemaServiceStatus,
    schemaServiceError: schemaService.schemaServiceError,
    schemaServiceMessage: schemaService.schemaServiceMessage,
    schemaRecords: schemaService.schemaRecords,
    selectedSchemaKey: schemaService.selectedSchemaKey,
    draftSchemaKey: schemaService.draftSchemaKey,
    validationIssues,
    nodes: workflowGraph.nodes,
    edges: workflowGraph.edges,
    selection,
    onNodesChange: workflowGraph.onNodesChange,
    onEdgesChange: workflowGraph.onEdgesChange,
    onNodeSelect: workflowGraph.onNodeSelect,
    addWorkflowAgentNode: workflowGraph.addWorkflowAgentNode,
    addWorkflowPartNode: workflowGraph.addWorkflowPartNode,
    addWorkflowPipelineNode: workflowGraph.addWorkflowPipelineNode,
    updateWorkflowAgentNode: workflowGraph.updateWorkflowAgentNode,
    updateWorkflowNodeMetadata: workflowGraph.updateWorkflowNodeMetadata,
    removeWorkflowDraftNode: workflowGraph.removeWorkflowDraftNode,
    addWorkflowEdge: workflowGraph.addWorkflowEdge,
    edgeConnectionError: workflowGraph.edgeConnectionError,
    clearEdgeConnectionError: workflowGraph.clearEdgeConnectionError,
    ...schemaMutations,
    updateDraftSchemaKey: schemaService.updateDraftSchemaKey,
    createSchema: () => schemaService.createSchema(createPersistableSchema()),
    refreshSchemaRecords: schemaService.refreshSchemaRecords,
    reloadSchema: schemaService.reloadSchema,
    selectSchemaKey: schemaService.selectSchemaKey,
    validateSchema: () => schemaService.validateSchema(createPersistableSchema()),
    saveSchema: () => schemaService.saveSchema(createPersistableSchema()),
    deleteSchema: schemaService.deleteSchema,
  };
};
