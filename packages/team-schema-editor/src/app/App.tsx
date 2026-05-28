import { useState, type ReactElement } from 'react';
import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import '@xyflow/react/dist/style.css';

import { AgentMarkdownPanel } from '../editor/components/AgentMarkdownPanel';
import { EditorHero } from '../editor/components/EditorHero';
import { GraphPanel } from '../editor/components/GraphPanel';
import { RuntimePanel } from '../editor/components/RuntimePanel';
import { SelectionPanel } from '../editor/components/SelectionPanel';
import { TeamSchemeListPanel } from '../editor/components/TeamSchemeListPanel';
import { useTeamEditor } from '../editor/hooks/useTeamEditor';
import type { EditorMode, RuntimeStatus } from '../editor/model/types';

export const App = (): ReactElement => {
  const [mode, setMode] = useState<EditorMode>('edit');
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>('idle');
  const [selectedTeamSchemeVersion, setSelectedTeamSchemeVersion] = useState('');
  const [selectedWorkflowAgentId, setSelectedWorkflowAgentId] = useState('');
  const {
    schema,
    schemaLoadStatus,
    schemaLoadError,
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
  const isSchemaReady = schemaLoadStatus === 'ready';
  const activeTeamSchemeVersion = selectedTeamSchemeVersion === schema.schema_version ? selectedTeamSchemeVersion : schema.schema_version;
  const selectedAgentId = selection.kind === 'agent' ? selection.agentId : null;
  const handleSelectTeam = (): void => onNodeSelect('team');
  const handleSelectAgent = (agentId: string): void => onNodeSelect(`agent:${agentId}`);
  const handleStart = (): void => setRuntimeStatus('running');
  const handlePause = (): void => setRuntimeStatus('paused');
  const handleTerminate = (): void => setRuntimeStatus('terminated');

  return (
    <Box component="main" sx={{ minHeight: '100vh', p: { xs: 1.75, md: 3 }, display: 'grid', gap: 2.5 }}>
      <EditorHero
        mode={mode}
        addDepartment={addDepartment}
        reloadSchema={reloadSchema}
        schemaLoadStatus={schemaLoadStatus}
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

      {isSchemaReady && mode === 'edit' ? (
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: { xs: '1fr', xl: '300px minmax(0, 1.75fr) minmax(320px, 0.85fr)' },
          }}
        >
          <TeamSchemeListPanel
            schema={schema}
            mode={mode}
            selectedVersion={activeTeamSchemeVersion}
            selectedAgentId={selectedAgentId}
            onSelectTeam={handleSelectTeam}
            onSelectVersion={setSelectedTeamSchemeVersion}
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

      {isSchemaReady && mode === 'run' ? (
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: { xs: '1fr', lg: '300px minmax(0, 1fr)' },
          }}
        >
          <TeamSchemeListPanel
            schema={schema}
            mode={mode}
            selectedVersion={activeTeamSchemeVersion}
            selectedAgentId={selectedAgentId}
            onSelectTeam={handleSelectTeam}
            onSelectVersion={setSelectedTeamSchemeVersion}
            onSelectAgent={handleSelectAgent}
          />

          <Stack spacing={2.5} sx={{ minWidth: 0 }}>
            <RuntimePanel
              schema={schema}
              runtimeStatus={runtimeStatus}
              onStart={handleStart}
              onPause={handlePause}
              onTerminate={handleTerminate}
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

      {isSchemaReady && mode === 'edit' ? <AgentMarkdownPanel /> : null}
    </Box>
  );
};