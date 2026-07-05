import type { ReactElement } from 'react';
import { Box, Button, Chip, Divider, List, ListItemButton, ListItemText, Paper, Stack, TextField, Typography } from '@mui/material';

import { useAgentMarkdownNotification } from '../hooks/useAgentMarkdownNotification';
import { useAgentMarkdownEditor } from '../hooks/useAgentMarkdownEditor';

const formatIssuePath = (path: readonly string[]): string => (path.length === 0 ? 'root' : path.join('.'));

export const AgentMarkdownPanel = (): ReactElement => {
  const editor = useAgentMarkdownEditor();
  useAgentMarkdownNotification({
    status: editor.status,
    message: editor.message,
    error: editor.error,
    selectedPath: editor.selectedPath,
    validationIssueCount: editor.validationIssues.length,
    currentFileIssueCount: editor.currentFileValidationIssues.length,
  });
  const fileItems = editor.files.map((file) => {
    const hasDraft = editor.draftPaths.includes(file.path);
    const validationLabel = file.validation.ok ? 'Valid' : 'Issue';

    return (
      <ListItemButton
        key={file.path}
        selected={editor.draftPath === file.path}
        onClick={() => editor.selectFile(file.path)}
        sx={{ borderRadius: 2, alignItems: 'flex-start', gap: 1 }}
      >
        <ListItemText
          primary={file.name}
          secondary={file.path}
          slotProps={{
            primary: { sx: { fontWeight: 700, fontSize: '0.95rem' } },
            secondary: { sx: { fontSize: '0.78rem', wordBreak: 'break-all' } },
          }}
        />
        <Stack direction="row" spacing={0.75} sx={{ pt: 0.25 }}>
          {hasDraft ? <Chip size="small" label="Draft" color="secondary" variant="outlined" /> : null}
          <Chip size="small" label={validationLabel} color={file.validation.ok ? 'success' : 'error'} variant="outlined" />
        </Stack>
      </ListItemButton>
    );
  });
  const validationIssueItems = editor.validationIssues.map((issue) => (
    <Typography key={`${issue.code}:${formatIssuePath(issue.path)}:${issue.message}`} component="div" sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
      {formatIssuePath(issue.path)}: {issue.message}
    </Typography>
  ));
  const currentFileIssueItems = editor.currentFileValidationIssues.map((issue) => (
    <Typography key={`${issue.code}:${formatIssuePath(issue.path)}:${issue.message}`} component="div" sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
      {formatIssuePath(issue.path)}: {issue.message}
    </Typography>
  ));
  const validationChip = editor.validation?.ok === true
    ? <Chip label="Draft validated" color="success" variant="outlined" />
    : <Chip label="Validate draft" color="default" variant="outlined" />;

  return (
    <Paper sx={{ p: 2.25 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2, alignItems: { xs: 'stretch', md: 'center' }, flexDirection: { xs: 'column', md: 'row' } }}>
        <Stack spacing={0.75}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
            Agents
          </Typography>
          <Typography variant="h5">Agent Markdown</Typography>
        </Stack>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={editor.reloadFiles} disabled={editor.isBusy}>Reload</Button>
          <Button variant="contained" onClick={editor.startNewDraft} disabled={editor.isBusy}>New Draft</Button>
        </Box>
      </Box>

      {currentFileIssueItems.length === 0 ? null : (
        <Box
          sx={{
            mb: 1.5,
            border: (theme) => `1px solid ${theme.palette.warning.main}`,
            borderRadius: 1.5,
            p: 1.25,
            backgroundColor: (theme) => theme.palette.warning.main.concat('14'),
          }}
        >
          {currentFileIssueItems}
        </Box>
      )}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: 'minmax(220px, 0.38fr) minmax(0, 1fr)' } }}>
        <Box sx={{ minWidth: 0 }}>
          <List dense sx={{ maxHeight: 520, overflow: 'auto', display: 'grid', gap: 0.75, p: 0 }}>
            {fileItems}
          </List>
        </Box>

        <Stack spacing={1.5} sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            {validationChip}
            {editor.hasLocalDraft ? <Chip label="Local draft" color="secondary" variant="outlined" /> : null}
            <Chip label={editor.isExistingPath ? 'Update' : 'Create'} variant="outlined" />
            <Chip label={editor.status} variant="outlined" />
          </Box>

          <TextField
            label="Markdown path"
            value={editor.draftPath}
            onChange={(event) => editor.updateDraftPath(event.target.value)}
            fullWidth
            size="small"
          />

          <TextField
            value={editor.content}
            onChange={(event) => editor.updateContent(event.target.value)}
            spellCheck={false}
            multiline
            minRows={18}
            fullWidth
            slotProps={{
              htmlInput: {
                sx: {
                  fontFamily: '"SFMono-Regular", "JetBrains Mono", monospace',
                  lineHeight: 1.45,
                  fontSize: '0.88rem',
                },
              },
            }}
          />

          {validationIssueItems.length === 0 ? null : (
            <Box
              sx={{
                border: (theme) => `1px solid ${theme.palette.error.main}`,
                borderRadius: 1.5,
                p: 1.25,
                backgroundColor: (theme) => theme.palette.error.main.concat('14'),
              }}
            >
              {validationIssueItems}
            </Box>
          )}

          <Divider />

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" color="secondary" onClick={editor.validateDraft} disabled={editor.isBusy || editor.draftPath.length === 0}>
              Validate Draft
            </Button>
            <Button variant="contained" color="secondary" onClick={editor.writeDraft} disabled={!editor.canWrite}>
              Write Markdown
            </Button>
            <Button variant="outlined" onClick={editor.discardDraft} disabled={editor.isBusy || !editor.hasLocalDraft}>
              Discard Draft
            </Button>
            <Button variant="outlined" color="error" onClick={editor.deleteFile} disabled={editor.isBusy || !editor.isExistingPath}>
              Delete
            </Button>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
};