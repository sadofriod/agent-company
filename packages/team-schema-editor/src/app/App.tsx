import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import '@xyflow/react/dist/style.css';

import { AgentMarkdownPage } from './pages/AgentMarkdownPage';
import { McpServerPage } from './pages/McpServerPage';
import { EditorWorkspacePage } from './pages/EditorWorkspacePage';
import { RuntimeWorkspacePage } from './pages/RuntimeWorkspacePage';
import { LlmGatewayPage } from './pages/LlmGatewayPage';
import { SkillCatalogPage } from './pages/SkillCatalogPage';
import { ToolCatalogPage } from './pages/ToolCatalogPage';
import { WorkspaceListPage } from './pages/WorkspaceListPage';
import { useRuntimeSession } from '../editor/hooks/useRuntimeSession';
import { useSchemaServiceNotification } from '../editor/hooks/useSchemaServiceNotification';
import { useTeamEditor } from '../editor/hooks/useTeamEditor';

export const App = (): ReactElement => {
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
      <Route path="/workspaces/:schemaKey" element={<Navigate to="edit" replace />} />
      <Route path="/workspaces/:schemaKey/edit" element={<EditorWorkspacePage editor={editor} />} />
      <Route path="/workspaces/:schemaKey/run" element={<RuntimeWorkspacePage editor={editor} runtime={runtime} />} />
      <Route path="/agents/markdown" element={<AgentMarkdownPage />} />
      <Route path="/llm-gateways" element={<LlmGatewayPage />} />
      <Route path="/mcp-servers" element={<McpServerPage />} />
      <Route path="/tools" element={<ToolCatalogPage />} />
      <Route path="/skills" element={<SkillCatalogPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};