import type { ReactElement } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { ShieldCheck, ShieldX } from 'lucide-react';

type CapabilityGrant = {
  capabilityId: string;
  capabilityType: string;
  reason: string;
  expiresWhen: string;
};

type Props = {
  grants: readonly CapabilityGrant[];
  deniedIds: readonly string[];
};

const CAPABILITY_TYPE_LABELS: Record<string, string> = {
  skill: 'Skill',
  mcp_server: 'MCP',
  tool: 'Tool',
};

export const RuntimeCapabilityPanel = ({ grants, deniedIds }: Props): ReactElement | null => {
  if (grants.length === 0 && deniedIds.length === 0) return null;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Capabilities</Typography>
      <Stack spacing={0.5}>
        {grants.map((grant) => (
          <Box key={grant.capabilityId} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, p: 0.75, border: '1px solid #c8e6c9', bgcolor: '#f1f8e9' }}>
            <ShieldCheck size={13} style={{ marginTop: 2, flexShrink: 0, color: '#2e7d32' }} />
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip label={CAPABILITY_TYPE_LABELS[grant.capabilityType] ?? grant.capabilityType} size="small" color="success" variant="outlined" sx={{ height: 16, fontSize: '0.65rem' }} />
                <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{grant.capabilityId}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Expires: {grant.expiresWhen}
              </Typography>
            </Box>
          </Box>
        ))}
        {deniedIds.map((id) => (
          <Box key={id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, p: 0.75, border: '1px solid #ffcdd2', bgcolor: '#fff8f8' }}>
            <ShieldX size={13} style={{ flexShrink: 0, color: '#c62828' }} />
            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#c62828', wordBreak: 'break-all' }}>
              {id} — denied
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};
