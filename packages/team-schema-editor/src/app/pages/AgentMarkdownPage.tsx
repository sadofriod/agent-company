import type { ReactElement } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AgentMarkdownPanel } from '../../editor/components/AgentMarkdownPanel';

export const AgentMarkdownPage = (): ReactElement => {
  const navigate = useNavigate();

  return (
    <Box component="main" sx={{ minHeight: '100vh', p: { xs: 1.75, md: 3 }, display: 'grid', alignContent: 'start', gap: 2.5 }}>
      <Paper sx={{ p: { xs: 1.5, md: 2 }, display: 'flex', alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', gap: 1.5, flexDirection: { xs: 'column', md: 'row' } }}>
        <Stack spacing={0.5}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0, fontWeight: 850 }}>
            Agents
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 850 }}>
            Agent Markdown
          </Typography>
        </Stack>
        <Button variant="outlined" color="secondary" startIcon={<ArrowLeft size={16} />} onClick={() => navigate(-1)} sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}>
          Back
        </Button>
      </Paper>

      <AgentMarkdownPanel />
    </Box>
  );
};
