import { useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  Stack,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowLeft, SendHorizonal, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { EditorHero } from '../../editor/components/EditorHero';
import { GraphPanel } from '../../editor/components/GraphPanel';
import { RuntimeReviewPanel } from '../../editor/components/RuntimeReviewPanel';
import { RuntimeCapabilityPanel } from '../../editor/components/RuntimeCapabilityPanel';
import { RuntimeDiscussionPanel } from '../../editor/components/RuntimeDiscussionPanel';
import type { RuntimeSessionModel } from '../../editor/hooks/useRuntimeSession';
import type { TeamEditorModel } from '../../editor/hooks/helper/teamEditor.types';
import type { RuntimeEventFeedItem } from '../../editor/hooks/helper/runtimeSession.types';
import { useListRuntimeSessionsQuery } from '../../editor/api/runtimeSessionApi';
import { EditorMode } from '../../editor/model/types';
import { SchemaLoadStatus } from '../../editor/state/core/editorShared';

type RuntimeWorkspacePageProps = {
  editor: TeamEditorModel;
  runtime: RuntimeSessionModel;
};

type RuntimeSessionListItem = {
  sessionId: string;
  status: string;
  updatedAt: string;
  createdAt: string;
};

const sortSessionList = (items: readonly RuntimeSessionListItem[]): RuntimeSessionListItem[] => [...items].sort((left, right) => (
  new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
));

const upsertSessionListItem = (
  items: readonly RuntimeSessionListItem[],
  item: RuntimeSessionListItem,
): RuntimeSessionListItem[] => {
  const next = [
    item,
    ...items.filter((candidate) => candidate.sessionId !== item.sessionId),
  ];

  return sortSessionList(next);
};

const formatDateTime = (value: string): string => {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Date(timestamp).toLocaleString();
};

const formatNodeLabel = (nodeId: string): string => {
  if (nodeId.startsWith('department:')) {
    return `Department ${nodeId.replace('department:', '')}`;
  }

  if (nodeId.startsWith('agent:')) {
    return `Agent ${nodeId.replace('agent:', '')}`;
  }

  if (nodeId === 'goal') {
    return 'Goal';
  }

  if (nodeId === 'discussion') {
    return 'Discussion';
  }

  if (nodeId === 'pipeline') {
    return 'Pipeline';
  }

  if (nodeId.startsWith('memory:')) {
    return nodeId === 'memory:session' ? 'Session Memory' : 'Discussion Memory';
  }

  return nodeId;
};

const buildNodeEventFeed = (
  selectedNodeId: string,
  feed: readonly RuntimeEventFeedItem[],
): readonly RuntimeEventFeedItem[] => feed.filter((item) => item.nodeIds.includes(selectedNodeId));

export const RuntimeWorkspacePage = ({ editor, runtime }: RuntimeWorkspacePageProps): ReactElement => {
  const navigate = useNavigate();
  const { schemaKey } = useParams<{ schemaKey: string }>();
  const isSchemaReady = editor.schemaLoadStatus === SchemaLoadStatus.Ready;
  const workspaceName = editor.schema.team_name ?? editor.schema.team_id;
  const [selectedRuntimeNodeId, setSelectedRuntimeNodeId] = useState<string | null>(null);
  const [sessionList, setSessionList] = useState<readonly RuntimeSessionListItem[]>([]);

  // Load historical sessions from backend
  const { data: historicalSessions } = useListRuntimeSessionsQuery({ limit: 50 }, { skip: !isSchemaReady });

  useEffect(() => {
    if (historicalSessions === undefined) return;
    setSessionList((current) => {
      const backendItems = historicalSessions.items.map((s) => ({
        sessionId: s.sessionId,
        status: s.status,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));
      const merged = [...backendItems, ...current.filter((c) => !backendItems.some((b) => b.sessionId === c.sessionId))];
      return sortSessionList(merged);
    });
  }, [historicalSessions]);

  useEffect(() => {
    if (schemaKey === undefined) {
      navigate('/', { replace: true });
      return;
    }

    if (editor.selectedSchemaKey !== schemaKey) {
      void editor.selectSchemaKey(schemaKey);
    }
  }, [editor, navigate, schemaKey]);

  useEffect(() => {
    const currentSession = runtime.session;

    if (currentSession === null) {
      return;
    }

    setSessionList((current) => upsertSessionListItem(current, {
      sessionId: currentSession.sessionId,
      status: currentSession.status,
      createdAt: currentSession.createdAt,
      updatedAt: currentSession.updatedAt,
    }));
  }, [runtime.session]);

  const canInteract = runtime.session !== null;
  const isBusy = runtime.status !== 'idle';
  const currentSessionId = runtime.session?.sessionId ?? null;
  const selectedNodeInsight = selectedRuntimeNodeId === null ? null : runtime.runtimeNodeInsights[selectedRuntimeNodeId] ?? null;
  const selectedNodeFeed = useMemo(
    () => selectedRuntimeNodeId === null ? [] : buildNodeEventFeed(selectedRuntimeNodeId, runtime.runtimeEventFeed),
    [runtime.runtimeEventFeed, selectedRuntimeNodeId],
  );
  const selectedNodeErrorEvents = selectedNodeFeed.filter((item) => item.level === 'error');
  const runCurrentGoal = (): void => {
    if (isBusy || runtime.taskDraft.goal.trim().length === 0) {
      return;
    }

    if (runtime.taskDraft.title.trim().length === 0) {
      runtime.setTaskTitle(runtime.taskDraft.goal.slice(0, 36));
    }

    void runtime.runGoal(editor.schema);
  };
  const openAgentMarkdown = (): void => {
    void navigate('/agents/markdown');
  };
  const openLlmGateway = (): void => {
    void navigate('/llm-gateways');
  };
  const openMcpServers = (): void => {
    void navigate('/mcp-servers');
  };
  const openTools = (): void => {
    void navigate('/tools');
  };
  const openSkills = (): void => {
    void navigate('/skills');
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
          <IconButton color="secondary" onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
          </IconButton>
          <Stack spacing={0.35} sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ wordBreak: 'break-word' }}>
              {workspaceName}
            </Typography>
          </Stack>
        </Box>

        <EditorHero
          mode={EditorMode.Run}
          reloadSchema={editor.reloadSchema}
          refreshSchemaRecords={editor.refreshSchemaRecords}
          validateSchema={editor.validateSchema}
          saveSchema={editor.saveSchema}
          deleteSchema={deleteWorkspace}
          schemaLoadStatus={editor.schemaLoadStatus}
          schemaServiceStatus={editor.schemaServiceStatus}
          onModeChange={(nextMode) => {
            if (nextMode === EditorMode.Edit) {
              void navigate(`/workspaces/${schemaKey ?? editor.selectedSchemaKey ?? editor.schema.team_id}/edit`);
            }
          }}
          onOpenAgentMarkdown={openAgentMarkdown}
          onOpenLlmGateway={openLlmGateway}
          onOpenMcpServers={openMcpServers}
          onOpenTools={openTools}
          onOpenSkills={openSkills}
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

      {isSchemaReady ? (
        <Box
          sx={{
            flex: '1 1 auto',
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '280px minmax(0, 1fr)' },
            gap: 1.25,
            p: { xs: 1.25, md: 1.5 },
          }}
        >
          <Box
            sx={{
              border: '1px solid #d7dde5',
              bgcolor: '#fbfcfe',
              minHeight: 0,
              overflow: 'auto',
            }}
          >
            <Box sx={{ px: 1.25, py: 1, borderBottom: '1px solid #d7dde5' }}>
              <Typography variant="subtitle2">Run Sessions</Typography>
              <Typography variant="caption" color="text.secondary">Sessions executed in current workspace runtime</Typography>
            </Box>
            <List disablePadding data-testid="session-list">
              {sessionList.length === 0 ? (
                <Box sx={{ px: 1.25, py: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">No sessions yet. Run once to create a session.</Typography>
                </Box>
              ) : sessionList.map((item) => (
                <ListItemButton
                  key={item.sessionId}
                  selected={item.sessionId === currentSessionId}
                  disabled={isBusy}
                  data-testid="session-list-item"
                  data-session-id={item.sessionId}
                  data-session-status={item.status}
                  onClick={() => {
                    void runtime.loadSession(item.sessionId);
                  }}
                  sx={{ alignItems: 'flex-start', py: 1 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      {item.sessionId}
                    </Typography>
                    <Stack spacing={0.25} sx={{ mt: 0.4 }}>
                      <Typography variant="caption" color="text.secondary">Status: {item.status}</Typography>
                      <Typography variant="caption" color="text.secondary">Updated: {formatDateTime(item.updatedAt)}</Typography>
                    </Stack>
                  </Box>
                </ListItemButton>
              ))}
            </List>
          </Box>

          <Stack spacing={1.25} sx={{ minHeight: 0 }}>
            <Box sx={{ border: '1px solid #d7dde5', bgcolor: '#fbfcfe', p: 1.25 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2">Run Input</Typography>
                <TextField
                  placeholder="Type your goal and press Enter"
                  value={runtime.taskDraft.goal}
                  onChange={(event) => runtime.setTaskGoal(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') {
                      return;
                    }

                    event.preventDefault();
                    runCurrentGoal();
                  }}
                  fullWidth
                  size="small"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            color="secondary"
                            aria-label="Run goal"
                            disabled={isBusy || runtime.taskDraft.goal.trim().length === 0}
                            onClick={runCurrentGoal}
                          >
                            <SendHorizonal size={15} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  <Button variant="outlined" color="secondary" disabled={!canInteract || isBusy} onClick={() => void runtime.refreshSession()}>
                    Refresh
                  </Button>
                  <Button variant="outlined" color="secondary" disabled={!canInteract || isBusy || runtime.session?.status !== 'running'} onClick={() => void runtime.pauseSession()}>
                    Pause
                  </Button>
                  <Button variant="outlined" color="secondary" disabled={!canInteract || isBusy || runtime.session?.status !== 'paused'} onClick={() => void runtime.resumeSession()}>
                    Resume
                  </Button>
                  <Button variant="outlined" color="error" disabled={!canInteract || isBusy || runtime.session?.status === 'terminated'} onClick={() => void runtime.terminateSession()}>
                    Terminate
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  <Chip label={runtime.session?.status ?? 'idle'} size="small" variant="outlined" />
                  <Chip label={`nodes ${runtime.runtimeActiveNodeIds.length}`} size="small" variant="outlined" />
                  <Chip label={`edges ${runtime.runtimeActiveEdgeIds.length}`} size="small" variant="outlined" />
                </Box>
              </Stack>
            </Box>

            <Box sx={{ flex: '1 1 auto', minHeight: 0 }}>
              <GraphPanel
                schema={editor.schema}
                mode={EditorMode.Run}
                nodes={editor.nodes}
                edges={editor.edges}
                edgeConnectionError={editor.edgeConnectionError}
                onNodesChange={editor.onNodesChange}
                onEdgesChange={editor.onEdgesChange}
                onNodeSelect={(nodeId) => {
                  editor.onNodeSelect(nodeId);
                  setSelectedRuntimeNodeId(nodeId);
                }}
                onAddWorkflowAgentNode={editor.addWorkflowAgentNode}
                onAddWorkflowPartNode={editor.addWorkflowPartNode}
                onAddWorkflowPipelineNode={editor.addWorkflowPipelineNode}
                onWorkflowConnect={editor.addWorkflowEdge}
                onClearEdgeConnectionError={editor.clearEdgeConnectionError}
                highlightedNodeIds={runtime.runtimeActiveNodeIds}
                highlightedEdgeIds={runtime.runtimeActiveEdgeIds}
              />
            </Box>
          </Stack>
        </Box>
      ) : null}

      <Drawer
        anchor="right"
        open={selectedRuntimeNodeId !== null}
        onClose={() => setSelectedRuntimeNodeId(null)}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 460 } } } }}
      >
        <Box sx={{ p: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack spacing={0.3}>
            <Typography variant="subtitle1">Runtime Node Details</Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedRuntimeNodeId === null ? '' : formatNodeLabel(selectedRuntimeNodeId)}
            </Typography>
          </Stack>
          <IconButton onClick={() => setSelectedRuntimeNodeId(null)} aria-label="Close runtime detail">
            <X size={16} />
          </IconButton>
        </Box>

        <Divider />

        <Box sx={{ p: 1.25, overflow: 'auto', minHeight: 0 }}>
          {selectedNodeInsight === null ? null : (
            <Box sx={{ border: '1px solid #d7dde5', bgcolor: '#fbfcfe', p: 1.25, mb: 1.25 }}>
              <Stack spacing={0.5}>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0 }}>Latest Insight</Typography>
                <Typography variant="body2">{selectedNodeInsight.summary}</Typography>
                {selectedNodeInsight.conclusion === undefined ? null : <Typography variant="body2" color="text.secondary">{selectedNodeInsight.conclusion}</Typography>}
                <Typography variant="caption" color="text.secondary">Updated: {formatDateTime(selectedNodeInsight.updatedAt)}</Typography>
              </Stack>
            </Box>
          )}

          {runtime.error === null ? null : (
            <Alert severity="error" sx={{ mb: 1.25 }}>
              {runtime.error}
            </Alert>
          )}

          {/* Discussion turns — shown on discussion node */}
          {selectedRuntimeNodeId === 'discussion' && (runtime.session?.state.discussionResult?.turns?.length ?? 0) > 0 && (
            <Box data-testid="discussion-turns-panel">
              <RuntimeDiscussionPanel
                turns={runtime.session!.state.discussionResult!.turns!}
                mode={runtime.session?.state.context?.currentMode}
              />
            </Box>
          )}

          {/* Review results — shown globally when session has reviews */}
          {(runtime.session?.state.reviewResults?.length ?? 0) > 0 && (
            <Box data-testid="review-results-panel">
              <RuntimeReviewPanel reviewResults={runtime.session!.state.reviewResults!} />
            </Box>
          )}

          {/* Capability interruption — shown when session interrupted by denied capability */}
          {(() => {
            const interruption = runtime.session?.state.interruption;
            if (interruption === undefined || (interruption.deniedCapabilityIds?.length ?? 0) === 0) return null;
            return (
              <Box data-testid="capability-denial-panel">
                <RuntimeCapabilityPanel
                  grants={[]}
                  deniedIds={interruption.deniedCapabilityIds ?? []}
                />
              </Box>
            );
          })()}

          {selectedNodeErrorEvents.length === 0 ? null : (
            <Box sx={{ mb: 1.25, mt: 1.25 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Error Events</Typography>
              <Stack spacing={0.75}>
                {selectedNodeErrorEvents.map((item) => (
                  <Box key={item.eventId} sx={{ border: '1px solid #efc2c4', bgcolor: '#fff6f7', p: 1 }}>
                    <Typography variant="caption" color="text.secondary">{item.eventType} · {formatDateTime(item.ts)}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.45 }}>{item.summary}</Typography>
                    {item.conclusion === undefined ? null : <Typography variant="body2" color="text.secondary" sx={{ mt: 0.45 }}>{item.conclusion}</Typography>}
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          <Box sx={{ mt: 1.25 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Node Logs</Typography>
            {selectedNodeFeed.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No runtime logs for this node yet.</Typography>
            ) : (
              <Stack spacing={0.75}>
                {selectedNodeFeed.map((item) => (
                  <Box key={item.eventId} sx={{ border: '1px solid #d7dde5', bgcolor: '#ffffff', p: 1 }}>
                    <Typography variant="caption" color="text.secondary">{item.eventType} · {formatDateTime(item.ts)}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.45 }}>{item.summary}</Typography>
                    {item.toolCalls.length === 0 ? null : (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.45, display: 'block' }}>
                        Tool calls: {item.toolCalls.map((toolCall) => `${toolCall.capabilityId}(${toolCall.status})`).join(', ')}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};
