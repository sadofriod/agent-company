import type { ReactElement } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';

type GraphPanelHeaderProps = {
  teamName: string;
  departmentCount: number;
  agentCount: number;
  linkCount: number;
  draftNodeCount: number;
};

export const GraphPanelHeader = ({
  teamName,
  departmentCount,
  agentCount,
  linkCount,
  draftNodeCount,
}: GraphPanelHeaderProps): ReactElement => (
  <Box
    sx={{
      display: 'flex',
      alignItems: { xs: 'flex-start', lg: 'center' },
      flexDirection: { xs: 'column', lg: 'row' },
      justifyContent: 'space-between',
      gap: 1.5,
      px: 1.5,
      py: 1.25,
      borderBottom: '1px solid #d7dde5',
      bgcolor: '#ffffff',
    }}
  >
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
      <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.68rem', fontWeight: 850, letterSpacing: 0 }}>
        Flow Editor
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 850, lineHeight: 1.15, wordBreak: 'break-word' }}>
        {teamName}
      </Typography>
    </Stack>
    <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: { xs: 'flex-start', lg: 'flex-end' } }}>
      <Chip size="small" label={`${departmentCount} departments`} sx={{ borderRadius: 0.75, fontWeight: 750 }} />
      <Chip size="small" label={`${agentCount} agents`} sx={{ borderRadius: 0.75, fontWeight: 750 }} />
      <Chip size="small" label={`${linkCount} links`} sx={{ borderRadius: 0.75, fontWeight: 750 }} />
      <Chip
        size="small"
        color="secondary"
        variant="outlined"
        label={`${draftNodeCount} draft nodes`}
        sx={{ borderRadius: 0.75, fontWeight: 750 }}
      />
    </Stack>
  </Box>
);