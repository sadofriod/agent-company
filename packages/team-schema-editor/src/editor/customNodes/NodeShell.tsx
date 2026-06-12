import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Handle, Position } from '@xyflow/react';

import type { WorkflowNodeType } from '../model/types';

type NodeShellProps = {
  eyebrow: string;
  title: string;
  accent: string;
  selected: boolean;
  children: ReactNode;
  variant?: 'standard' | 'container' | 'memory';
  workflowNodeType?: WorkflowNodeType;
};

const createHandleStyle = (accent: string, side: 'left' | 'right'): CSSProperties => ({
  width: 10,
  height: 26,
  border: `1px solid ${accent}`,
  borderRadius: side === 'left' ? '0 3px 3px 0' : '3px 0 0 3px',
  background: '#f8fafc',
  boxShadow: '0 0 0 2px rgba(248, 250, 252, 0.9)',
  left: side === 'left' ? -5 : undefined,
  right: side === 'right' ? -5 : undefined,
});

export const NodeShell = ({
  eyebrow,
  title,
  accent,
  selected,
  children,
  variant = 'standard',
  workflowNodeType,
}: NodeShellProps): ReactElement => {
  const isContainer = variant === 'container';
  const isMemory = variant === 'memory';

  return (
    <Box
      sx={{
        position: 'relative',
        width: isContainer ? 292 : 268,
        minHeight: isContainer ? 150 : 132,
        borderRadius: 1,
        border: selected ? `1px solid ${accent}` : '1px solid #d5dbe3',
        bgcolor: '#ffffff',
        color: '#1f2937',
        boxShadow: selected ? `0 0 0 2px color-mix(in srgb, ${accent} 28%, transparent), 0 12px 30px rgba(15, 23, 42, 0.16)` : '0 8px 22px rgba(15, 23, 42, 0.08)',
        outline: workflowNodeType === undefined ? 'none' : `1px dashed ${accent}`,
        outlineOffset: 5,
        overflow: 'hidden',
      }}
    >
      <Handle type="target" position={Position.Left} style={createHandleStyle(accent, 'left')} />
      <Handle type="source" position={Position.Right} style={createHandleStyle(accent, 'right')} />

      <Box sx={{ position: 'absolute', inset: '0 auto 0 0', width: 5, bgcolor: accent }} />
      <Stack spacing={1} sx={{ p: 1.5, pl: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: accent, flex: '0 0 auto' }} />
          <Typography
            variant="caption"
            sx={{
              flex: '1 1 auto',
              minWidth: 0,
              color: '#667085',
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: 0,
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </Typography>
          {workflowNodeType === undefined ? null : (
            <Typography
              variant="caption"
              sx={{
                flex: '0 0 auto',
                border: `1px solid ${accent}`,
                borderRadius: 0.75,
                color: accent,
                fontSize: '0.64rem',
                fontWeight: 800,
                lineHeight: 1,
                px: 0.55,
                py: 0.35,
                textTransform: 'uppercase',
              }}
            >
              draft
            </Typography>
          )}
        </Stack>

        <Typography sx={{ fontSize: '0.98rem', fontWeight: 800, lineHeight: 1.18, wordBreak: 'break-word' }}>
          {title}
        </Typography>

        <Box
          sx={{
            borderTop: '1px solid #edf0f4',
            pt: 1,
            display: 'grid',
            gap: 0.85,
            color: isMemory ? '#475569' : isContainer ? '#394150' : '#4b5563',
          }}
        >
          {children}
        </Box>
      </Stack>
    </Box>
  );
};