import type { ReactElement } from 'react';
import { Stack, Typography } from '@mui/material';

export const PipelinePolicyView = (): ReactElement => {
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Pipeline Policy</Typography>
      <Typography color="text.secondary" sx={{ lineHeight: 1.5 }}>
        Current version visualizes pipeline governance and exposes it in the JSON pane. Field-level editing can be extended next.
      </Typography>
    </Stack>
  );
};