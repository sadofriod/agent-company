import { useEffect, type ReactElement } from 'react';
import { Alert, Box, IconButton, Stack, Typography } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { EditorHero } from '../../editor/components/EditorHero';
import { GraphPanel } from '../../editor/components/GraphPanel';
import { RuntimePanel } from '../../editor/components/RuntimePanel';
import { SelectionPanel } from '../../editor/components/SelectionPanel';
import type { RuntimeSessionModel } from '../../editor/hooks/useRuntimeSession';
import type { TeamEditorModel } from '../../editor/hooks/helper/teamEditor.types';
import { EditorMode } from '../../editor/model/types';
import { SchemaLoadStatus } from '../../editor/state/core/editorShared';

type EditorWorkspacePageProps = {
  editor: TeamEditorModel;
  mode: EditorMode;
  runtime: RuntimeSessionModel;
  onModeChange: (mode: EditorMode) => void;
};

export const EditorWorkspacePage = ({ editor, mode, runtime, onModeChange }: EditorWorkspacePageProps): ReactElement => {
  const navigate = useNavigate();
  const { schemaKey } = useParams<{ schemaKey: string }>();
  const isSchemaReady = editor.schemaLoadStatus === SchemaLoadStatus.Ready;
  const workspaceName = editor.schema.team_name ?? editor.schema.team_id;

  useEffect(() => {
    if (schemaKey === undefined) {
      navigate('/', { replace: true });
      return;
    }

    if (editor.selectedSchemaKey !== schemaKey) {
      void editor.selectSchemaKey(schemaKey);
    }
  }, [editor, navigate, schemaKey]);

  const openAgentMarkdown = (): void => {
    void navigate('/agents/markdown');
  };
  const openLlmGateway = (): void => {
    void navigate('/llm-gateways');
  };
  const deleteWorkspace = (): void => {
    void editor.deleteSchema().then(() => navigate('/'));
  };

  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#eef2f6' }}>
      <Box
        sx={{
          px: { xs: 1.25, md: 1.5 },
          py: 1.25,
          display: 'flex',
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          flexDirection: { xs: 'column', md: 'row' },
          borderBottom: '1px solid #d7dde5',
          bgcolor: '#fbfcfe',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <IconButton  color="secondary" onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
          </IconButton>
          <Stack spacing={0.35} sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ wordBreak: 'break-word' }}>
              {workspaceName}
            </Typography>
          </Stack>
        </Box>

        <EditorHero
          mode={mode}
          reloadSchema={editor.reloadSchema}
          refreshSchemaRecords={editor.refreshSchemaRecords}
          validateSchema={editor.validateSchema}
          saveSchema={editor.saveSchema}
          deleteSchema={deleteWorkspace}
          schemaLoadStatus={editor.schemaLoadStatus}
          schemaServiceStatus={editor.schemaServiceStatus}
          onModeChange={onModeChange}
          onOpenAgentMarkdown={openAgentMarkdown}
          onOpenLlmGateway={openLlmGateway}
        />
      </Box>

      {editor.schemaLoadError === null ? null : <Alert severity="error" sx={{ m: { xs: 1.25, md: 1.5 }, mb: 0 }}>{editor.schemaLoadError}</Alert>}
      {editor.validationIssues.length === 0 ? null : <Alert severity="warning" sx={{ m: { xs: 1.25, md: 1.5 }, mb: 0 }}>Loaded schema has {editor.validationIssues.length} validation issue(s).</Alert>}

      {isSchemaReady ? null : (
        <Box sx={{ m: { xs: 1.25, md: 1.5 }, p: 1.5, border: '1px solid #d7dde5', bgcolor: '#fbfcfe' }}>
          <Stack spacing={0.75}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0 }}>
              Workspace
            </Typography>
            <Typography variant="h6">Loading from service</Typography>
          </Stack>
        </Box>
      )}

      {isSchemaReady && mode === EditorMode.Edit ? (
        <GraphPanel
          schema={editor.schema}
          mode={mode}
          nodes={editor.nodes}
          edges={editor.edges}
          edgeConnectionError={editor.edgeConnectionError}
          onNodesChange={editor.onNodesChange}
          onEdgesChange={editor.onEdgesChange}
          onNodeSelect={editor.onNodeSelect}
          onAddWorkflowAgentNode={editor.addWorkflowAgentNode}
          onAddWorkflowPartNode={editor.addWorkflowPartNode}
          onAddWorkflowPipelineNode={editor.addWorkflowPipelineNode}
          onWorkflowConnect={editor.addWorkflowEdge}
          onClearEdgeConnectionError={editor.clearEdgeConnectionError}
          inspectorPanel={(
            <SelectionPanel
              schema={editor.schema}
              nodes={editor.nodes}
              selection={editor.selection}
              addDepartment={editor.addDepartment}
              removeDepartment={editor.removeDepartment}
              addAgent={editor.addAgent}
              removeAgent={editor.removeAgent}
              updateWorkflowAgentNode={editor.updateWorkflowAgentNode}
              updateWorkflowNodeMetadata={editor.updateWorkflowNodeMetadata}
              removeWorkflowDraftNode={editor.removeWorkflowDraftNode}
              updateTeamField={editor.updateTeamField}
              updateDepartmentField={editor.updateDepartmentField}
              updateDepartmentList={editor.updateDepartmentList}
              updateAgentField={editor.updateAgentField}
              updateAgentLlmBinding={editor.updateAgentLlmBinding}
              updateAgentList={editor.updateAgentList}
              updateAgentMetadataField={editor.updateAgentMetadataField}
              updateAgentMetadataList={editor.updateAgentMetadataList}
              updateDiscussionField={editor.updateDiscussionField}
              updateDiscussionNumber={editor.updateDiscussionNumber}
              updateMemoryPolicyField={editor.updateMemoryPolicyField}
              updateMemoryPolicyList={editor.updateMemoryPolicyList}
              addMemoryRetrievalProfile={editor.addMemoryRetrievalProfile}
              removeMemoryRetrievalProfile={editor.removeMemoryRetrievalProfile}
              updateMemoryRetrievalProfileField={editor.updateMemoryRetrievalProfileField}
              updateMemoryRetrievalProfileList={editor.updateMemoryRetrievalProfileList}
              updateMemoryRetrievalProfileNumber={editor.updateMemoryRetrievalProfileNumber}
              updateMemoryRetrievalProfileBoolean={editor.updateMemoryRetrievalProfileBoolean}
            />
          )}
        />
      ) : null}

      {isSchemaReady && mode === EditorMode.Run ? (
        <Stack spacing={1.5} sx={{ flex: '1 1 auto', minWidth: 0, minHeight: 0 }}>
          <RuntimePanel
            schema={editor.schema}
            runtime={runtime}
            onRunGoal={() => runtime.runGoal(editor.schema)}
          />
          <GraphPanel
            schema={editor.schema}
            mode={mode}
            nodes={editor.nodes}
            edges={editor.edges}
            edgeConnectionError={editor.edgeConnectionError}
            onNodesChange={editor.onNodesChange}
            onEdgesChange={editor.onEdgesChange}
            onNodeSelect={editor.onNodeSelect}
            onAddWorkflowAgentNode={editor.addWorkflowAgentNode}
            onAddWorkflowPartNode={editor.addWorkflowPartNode}
            onAddWorkflowPipelineNode={editor.addWorkflowPipelineNode}
            onWorkflowConnect={editor.addWorkflowEdge}
            onClearEdgeConnectionError={editor.clearEdgeConnectionError}
            highlightedNodeIds={runtime.runtimeActiveNodeIds}
            highlightedEdgeIds={runtime.runtimeActiveEdgeIds}
          />
        </Stack>
      ) : null}
    </Box>
  );
};
