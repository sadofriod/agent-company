import type { ReactElement } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

import type { RuntimeReviewResult } from '../model/types';

type Props = {
  reviewResults: readonly RuntimeReviewResult[];
};

const SEVERITY_CONFIG = {
  pass: { color: 'success', Icon: CheckCircle2, label: 'Pass' },
  revise: { color: 'warning', Icon: AlertTriangle, label: 'Revise' },
  block: { color: 'error', Icon: XCircle, label: 'Block' },
} as const;

const ReviewResultItem = ({ result }: { result: RuntimeReviewResult }): ReactElement => {
  const config = SEVERITY_CONFIG[result.status] ?? SEVERITY_CONFIG.block;
  const { Icon } = config;

  return (
    <Box sx={{ border: '1px solid #d7dde5', p: 1, bgcolor: '#ffffff' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
        <Icon size={13} />
        <Chip
          label={config.label}
          size="small"
          color={config.color}
          variant="outlined"
          sx={{ height: 18, fontSize: '0.7rem' }}
        />
        <Typography variant="caption" color="text.secondary">
          {result.reviewer === 'logic_review' ? 'Logic' : 'Quality'} · {result.targetType}
        </Typography>
      </Box>
      {result.issues.map((issue, idx) => (
        <Box key={idx} sx={{ mt: 0.5, pl: 1, borderLeft: `2px solid ${issue.severity === 'block' ? '#d32f2f' : issue.severity === 'revise' ? '#ed6c02' : '#2e7d32'}` }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {issue.field}
          </Typography>
          <Typography variant="body2">{issue.message}</Typography>
        </Box>
      ))}
      {result.issues.length === 0 && (
        <Typography variant="body2" color="text.secondary">No issues found.</Typography>
      )}
    </Box>
  );
};

export const RuntimeReviewPanel = ({ reviewResults }: Props): ReactElement | null => {
  if (reviewResults.length === 0) return null;

  const hasBlock = reviewResults.some((r) => r.status === 'block');
  const hasRevise = reviewResults.some((r) => r.status === 'revise');
  const overallStatus = hasBlock ? 'block' : hasRevise ? 'revise' : 'pass';
  const overallConfig = SEVERITY_CONFIG[overallStatus];
  const { Icon } = overallConfig;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
        <Icon size={14} />
        <Typography variant="subtitle2">Review Results</Typography>
        <Chip
          label={overallConfig.label}
          size="small"
          color={overallConfig.color}
          sx={{ height: 18, fontSize: '0.7rem' }}
        />
        <Typography variant="caption" color="text.secondary">
          ({reviewResults.length} review{reviewResults.length > 1 ? 's' : ''})
        </Typography>
      </Box>
      <Stack spacing={0.75}>
        {reviewResults.map((result) => (
          <ReviewResultItem key={result.reviewId} result={result} />
        ))}
      </Stack>
    </Box>
  );
};
