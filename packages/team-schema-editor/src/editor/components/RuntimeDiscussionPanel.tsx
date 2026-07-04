import type { ReactElement } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { MessageSquare } from 'lucide-react';

import type { RuntimeDiscussionTurn } from '../model/types';

type Props = {
  turns: readonly RuntimeDiscussionTurn[];
  mode?: string;
};

const MODE_LABELS: Record<string, string> = {
  supervisor_led: 'Supervisor-Led',
  sequential_handoff: 'Sequential Handoff',
  parallel_review: 'Parallel Review',
};

export const RuntimeDiscussionPanel = ({ turns, mode }: Props): ReactElement | null => {
  if (turns.length === 0) return null;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
        <MessageSquare size={14} />
        <Typography variant="subtitle2">Discussion Turns</Typography>
        {mode !== undefined && (
          <Chip label={MODE_LABELS[mode] ?? mode} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.7rem' }} />
        )}
      </Box>
      <Stack spacing={0.75}>
        {turns.map((turn, idx) => {
          const recommendation = typeof turn.structuredOutput.recommendation === 'string'
            ? turn.structuredOutput.recommendation
            : JSON.stringify(turn.structuredOutput);

          return (
            <Box key={idx} sx={{ border: '1px solid #d7dde5', p: 1, bgcolor: '#ffffff' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.4 }}>
                <Chip label={`Round ${turn.round}`} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.65rem' }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {turn.agentId}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {recommendation}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};
