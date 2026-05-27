import type { ReactElement } from 'react';
import { Box } from '@mui/material';
import '@xyflow/react/dist/style.css';

import { EditorHero } from '../editor/components/EditorHero';
import { GraphPanel } from '../editor/components/GraphPanel';
import { JsonSourcePanel } from '../editor/components/JsonSourcePanel';
import { SelectionPanel } from '../editor/components/SelectionPanel';
import { useTeamEditor } from '../editor/hooks/useTeamEditor';

export const App = (): ReactElement => {
  const {
    schema,
    jsonValue,
    parseError,
    validationIssues,
    nodes,
    edges,
    selection,
    onNodesChange,
    onNodeSelect,
    onJsonChange,
    applyJson,
    resetSample,
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

  return (
    <Box component="main" sx={{ minHeight: '100vh', p: { xs: 1.75, md: 3 }, display: 'grid', gap: 2.5 }}>
      <EditorHero addDepartment={addDepartment} resetSample={resetSample} applyJson={applyJson} />

      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 2fr) minmax(320px, 0.9fr)' },
          gridTemplateAreas: {
            xs: '"canvas" "side" "json"',
            xl: '"canvas side" "json side"',
          },
        }}
      >
        <Box sx={{ gridArea: 'canvas' }}>
          <GraphPanel
            schema={schema}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onNodeSelect={onNodeSelect}
          />
        </Box>

        <Box sx={{ gridArea: 'side' }}>
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

        <Box sx={{ gridArea: 'json' }}>
          <JsonSourcePanel
            jsonValue={jsonValue}
            parseError={parseError}
            validationIssues={validationIssues}
            onJsonChange={onJsonChange}
          />
        </Box>
      </Box>
    </Box>
  );
};