import { useState, type ReactElement } from 'react';
import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import '@xyflow/react/dist/style.css';

import { AgentMarkdownPanel } from '../editor/components/AgentMarkdownPanel';
import { EditorHero } from '../editor/components/EditorHero';
import { GraphPanel } from '../editor/components/GraphPanel';
import { RuntimePanel } from '../editor/components/RuntimePanel';
import { SelectionPanel } from '../editor/components/SelectionPanel';
import { TeamSchemeListPanel } from '../editor/components/TeamSchemeListPanel';
import { useSchemaServiceNotification } from '../editor/hooks/useSchemaServiceNotification';
import { useTeamEditor } from '../editor/hooks/useTeamEditor';
import { useRuntimeSession } from '../editor/hooks/useRuntimeSession';
import { EditorMode } from '../editor/model/types';

export const App = (): ReactElement => {
  const [mode, setMode] = useState<EditorMode>(EditorMode.Edit);
  const [selectedWorkflowAgentId, setSelectedWorkflowAgentId] = useState('');
  const {
    schema,
    schemaLoadStatus,
    schemaLoadError,
    schemaServiceStatus,
    schemaServiceError,
    schemaServiceMessage,
    schemaRecords,
    selectedSchemaKey,
    validationIssues,
    nodes,
    edges,
    selection,
    onNodesChange,
    onNodeSelect,
    addWorkflowAgentNode,
    addWorkflowPartNode,
    addWorkflowEdge,
    reloadSchema,
    refreshSchemaRecords,
    selectSchemaKey,
    validateSchema,
    saveSchema,
    deleteSchema,
    updateTeamField,
    updateDepartmentField,
    updateDepartmentList,
    updateAgentField,
    updateAgentList,
    updateDiscussionField,
    updateDiscussionNumber,
    addDepartment,
    removeDepartment,
    addAgent,
    removeAgent,
  } = useTeamEditor();
  const runtime = useRuntimeSession();
  useSchemaServiceNotification({ status: schemaServiceStatus, message: schemaServiceMessage, error: schemaServiceError });
  const isSchemaReady = schemaLoadStatus === 'ready';
  const selectedAgentId = selection.kind === 'agent' ? selection.agentId : null;
  const handleSelectTeam = (): void => onNodeSelect('team');
  const handleSelectAgent = (agentId: string): void => onNodeSelect(`agent:${agentId}`);

  return (
    <Box component="main" sx={{ minHeight: '100vh', p: { xs: 1.75, md: 3 }, display: 'grid', gap: 2.5 }}>
      <EditorHero
        mode={mode}
        addDepartment={addDepartment}
        reloadSchema={reloadSchema}
        refreshSchemaRecords={refreshSchemaRecords}
        validateSchema={validateSchema}
        saveSchema={saveSchema}
        deleteSchema={deleteSchema}
        schemaLoadStatus={schemaLoadStatus}
        schemaServiceStatus={schemaServiceStatus}
        onModeChange={setMode}
      />

      {schemaLoadError === null ? null : <Alert severity="error">{schemaLoadError}</Alert>}
      {validationIssues.length === 0 ? null : <Alert severity="warning">Loaded schema has {validationIssues.length} validation issue(s).</Alert>}

      {isSchemaReady ? null : (
        <Paper sx={{ p: 2.25 }}>
          <Stack spacing={0.75}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
              Team Schema
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
            gridTemplateColumns: { xs: '1fr', xl: '300px minmax(0, 1.75fr) minmax(320px, 0.85fr)' },
          }}
        >
          <TeamSchemeListPanel
            schema={schema}
            schemaRecords={schemaRecords}
            mode={mode}
            selectedSchemaKey={selectedSchemaKey}
            selectedAgentId={selectedAgentId}
            onSelectTeam={handleSelectTeam}
            onSelectSchemaKey={selectSchemaKey}
            onSelectAgent={handleSelectAgent}
          />

          <GraphPanel
            schema={schema}
            mode={mode}
            nodes={nodes}
            edges={edges}
            selectedWorkflowAgentId={selectedWorkflowAgentId}
            onNodesChange={onNodesChange}
            onNodeSelect={onNodeSelect}
            onWorkflowAgentChange={setSelectedWorkflowAgentId}
            onAddWorkflowAgentNode={addWorkflowAgentNode}
            onAddWorkflowPartNode={addWorkflowPartNode}
            onWorkflowConnect={addWorkflowEdge}
          />

          <SelectionPanel
            schema={schema}
            selection={selection}
            addDepartment={addDepartment}
            removeDepartment={removeDepartment}
            addAgent={addAgent}
            removeAgent={removeAgent}
            updateTeamField={updateTeamField}
            updateDepartmentField={updateDepartmentField}
            updateDepartmentList={updateDepartmentList}
            updateAgentField={updateAgentField}
            updateAgentList={updateAgentList}
            updateDiscussionField={updateDiscussionField}
            updateDiscussionNumber={updateDiscussionNumber}
          />
        </Box>
      ) : null}

      {isSchemaReady && mode === EditorMode.Run ? (
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: { xs: '1fr', lg: '300px minmax(0, 1fr)' },
          }}
        >
          <TeamSchemeListPanel
            schema={schema}
            schemaRecords={schemaRecords}
            mode={mode}
            selectedSchemaKey={selectedSchemaKey}
            selectedAgentId={selectedAgentId}
            onSelectTeam={handleSelectTeam}
            onSelectSchemaKey={selectSchemaKey}
            onSelectAgent={handleSelectAgent}
          />

          <Stack spacing={2.5} sx={{ minWidth: 0 }}>
            <RuntimePanel
              schema={schema}
              runtime={runtime}
              onCreateSession={() => runtime.createSession(schema)}
            />
            <GraphPanel
              schema={schema}
              mode={mode}
              nodes={nodes}
              edges={edges}
              selectedWorkflowAgentId={selectedWorkflowAgentId}
              onNodesChange={onNodesChange}
              onNodeSelect={onNodeSelect}
              onWorkflowAgentChange={setSelectedWorkflowAgentId}
              onAddWorkflowAgentNode={addWorkflowAgentNode}
              onAddWorkflowPartNode={addWorkflowPartNode}
              onWorkflowConnect={addWorkflowEdge}
            />
          </Stack>
        </Box>
      ) : null}

      {isSchemaReady && mode === EditorMode.Edit ? <AgentMarkdownPanel /> : null}
    </Box>
  );
};