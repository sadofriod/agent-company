import { useEffect, type ReactElement } from 'react';
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { EditorHero } from '../../editor/components/EditorHero';
import { GraphPanel } from '../../editor/components/GraphPanel';
import { RuntimePanel } from '../../editor/components/RuntimePanel';
import { SelectionPanel } from '../../editor/components/SelectionPanel';
import type { RuntimeSessionModel } from '../../editor/hooks/useRuntimeSession';
import type { TeamEditorModel } from '../../editor/hooks/helper/teamEditor.types';
import { EditorMode } from '../../editor/model/types';

type EditorWorkspacePageProps = {
  editor: TeamEditorModel;
  mode: EditorMode;
  runtime: RuntimeSessionModel;
  onModeChange: (mode: EditorMode) => void;
};

export const EditorWorkspacePage = ({ editor, mode, runtime, onModeChange }: EditorWorkspacePageProps): ReactElement => {
  const navigate = useNavigate();
  const { schemaKey } = useParams<{ schemaKey: string }>();
  const isSchemaReady = editor.schemaLoadStatus === 'ready';
  const workspaceName = editor.schema.team_name ?? editor.schema.team_id;
  const selectedAgentId = editor.selection.kind === 'agent' ? editor.selection.agentId : null;

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
  const deleteWorkspace = (): void => {
    void editor.deleteSchema().then(() => navigate('/'));
  };

  return (
    <Box component="main" sx={{ minHeight: '100vh', p: { xs: 1.75, md: 3 }, display: 'grid', alignContent: 'start', gap: 2.5 }}>
      <Paper sx={{ p: { xs: 1.5, md: 2 }, display: 'flex', alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', gap: 1.5, flexDirection: { xs: 'column', md: 'row' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Button variant="outlined" color="secondary" startIcon={<ArrowLeft size={16} />} onClick={() => navigate('/')} sx={{ flexShrink: 0 }}>
            Workspaces
          </Button>
          <Stack spacing={0.4} sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0, fontWeight: 850 }}>
              Workspace Editor
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 850, lineHeight: 1.15, wordBreak: 'break-word' }}>
              {workspaceName}
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <Chip size="small" label={editor.selectedSchemaKey} variant="outlined" />
              <Chip size="small" label={mode === EditorMode.Edit ? 'Edit' : 'Run'} color="secondary" variant="outlined" />
              {selectedAgentId === null ? null : <Chip size="small" label={selectedAgentId} variant="outlined" />}
            </Stack>
          </Stack>
        </Box>

        <EditorHero
          mode={mode}
          addDepartment={editor.addDepartment}
          reloadSchema={editor.reloadSchema}
          refreshSchemaRecords={editor.refreshSchemaRecords}
          validateSchema={editor.validateSchema}
          saveSchema={editor.saveSchema}
          deleteSchema={deleteWorkspace}
          schemaLoadStatus={editor.schemaLoadStatus}
          schemaServiceStatus={editor.schemaServiceStatus}
          onModeChange={onModeChange}
          onOpenAgentMarkdown={openAgentMarkdown}
        />
      </Paper>

      {editor.schemaLoadError === null ? null : <Alert severity="error">{editor.schemaLoadError}</Alert>}
      {editor.validationIssues.length === 0 ? null : <Alert severity="warning">Loaded schema has {editor.validationIssues.length} validation issue(s).</Alert>}

      {isSchemaReady ? null : (
        <Paper sx={{ p: 2.25 }}>
          <Stack spacing={0.75}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
              Workspace
            </Typography>
            <Typography variant="h5">Loading from service</Typography>
          </Stack>
        </Paper>
      )}

      {isSchemaReady && mode === EditorMode.Edit ? (
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.75fr) minmax(320px, 0.85fr)' },
          }}
        >
          <GraphPanel
            schema={editor.schema}
            mode={mode}
            nodes={editor.nodes}
            edges={editor.edges}
            edgeConnectionError={editor.edgeConnectionError}
            onNodesChange={editor.onNodesChange}
            onNodeSelect={editor.onNodeSelect}
            onAddWorkflowAgentNode={editor.addWorkflowAgentNode}
            onAddWorkflowPartNode={editor.addWorkflowPartNode}
            onAddWorkflowPipelineNode={editor.addWorkflowPipelineNode}
            onWorkflowConnect={editor.addWorkflowEdge}
            onClearEdgeConnectionError={editor.clearEdgeConnectionError}
          />

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
            updateAgentList={editor.updateAgentList}
            updateAgentMetadataField={editor.updateAgentMetadataField}
            updateAgentMetadataList={editor.updateAgentMetadataList}
            updateDiscussionField={editor.updateDiscussionField}
            updateDiscussionNumber={editor.updateDiscussionNumber}
          />
        </Box>
      ) : null}

      {isSchemaReady && mode === EditorMode.Run ? (
        <Stack spacing={2.5} sx={{ minWidth: 0 }}>
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
            onNodeSelect={editor.onNodeSelect}
            onAddWorkflowAgentNode={editor.addWorkflowAgentNode}
            onAddWorkflowPartNode={editor.addWorkflowPartNode}
            onAddWorkflowPipelineNode={editor.addWorkflowPipelineNode}
            onWorkflowConnect={editor.addWorkflowEdge}
            onClearEdgeConnectionError={editor.clearEdgeConnectionError}
          />
        </Stack>
      ) : null}
    </Box>
  );
};
