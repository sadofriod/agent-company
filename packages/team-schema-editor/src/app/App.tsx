import { useState, type ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import '@xyflow/react/dist/style.css';

import { AgentMarkdownPage } from './pages/AgentMarkdownPage';
import { EditorWorkspacePage } from './pages/EditorWorkspacePage';
import { WorkspaceListPage } from './pages/WorkspaceListPage';
import { useRuntimeSession } from '../editor/hooks/useRuntimeSession';
import { useSchemaServiceNotification } from '../editor/hooks/useSchemaServiceNotification';
import { useTeamEditor } from '../editor/hooks/useTeamEditor';
import { EditorMode } from '../editor/model/types';

export const App = (): ReactElement => {
  const [mode, setMode] = useState<EditorMode>(EditorMode.Edit);
  const editor = useTeamEditor();
  const runtime = useRuntimeSession();

  useSchemaServiceNotification({
    status: editor.schemaServiceStatus,
    message: editor.schemaServiceMessage,
    error: editor.schemaServiceError,
  });

  return (
    <Routes>
      <Route path="/" element={<WorkspaceListPage editor={editor} />} />
      <Route
        path="/workspaces/:schemaKey"
        element={<EditorWorkspacePage editor={editor} mode={mode} runtime={runtime} onModeChange={setMode} />}
      />
      <Route path="/agents/markdown" element={<AgentMarkdownPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};