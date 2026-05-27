import type { ReactElement } from 'react';
import { Box, Chip, Paper, Stack, TextField, Typography } from '@mui/material';

import type { ValidationIssue } from '../model/types';

type JsonSourcePanelProps = {
  readonly jsonValue: string;
  readonly parseError: string | null;
  readonly validationIssues: readonly ValidationIssue[];
  readonly onJsonChange: (value: string) => void;
};

export const JsonSourcePanel = ({ jsonValue, parseError, validationIssues, onJsonChange }: JsonSourcePanelProps): ReactElement => {
  return (
    <Paper sx={{ p: 2.25, minHeight: 280 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2, alignItems: 'flex-start' }}>
        <Stack spacing={0.75}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
            Schema
          </Typography>
          <Typography variant="h5">JSON Source</Typography>
        </Stack>
        {parseError === null ? (
          <Chip label="Validated" color="success" variant="outlined" />
        ) : (
          <Chip label={`${validationIssues.length} issue(s)`} color="error" variant="outlined" />
        )}
      </Box>

      {parseError === null ? null : (
        <Paper
          variant="outlined"
          sx={{
            mb: 1.5,
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'rgba(178, 79, 124, 0.08)',
            color: '#7a2547',
            fontFamily: '"SFMono-Regular", "JetBrains Mono", monospace',
            fontSize: '0.86rem',
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
          }}
        >
          {parseError}
        </Paper>
      )}

      <TextField
        value={jsonValue}
        onChange={(event) => onJsonChange(event.target.value)}
        spellCheck={false}
        multiline
        minRows={12}
        fullWidth
        slotProps={{
          htmlInput: {
            sx: {
              fontFamily: '"SFMono-Regular", "JetBrains Mono", monospace',
              lineHeight: 1.45,
            },
          },
        }}
      />
    </Paper>
  );
};