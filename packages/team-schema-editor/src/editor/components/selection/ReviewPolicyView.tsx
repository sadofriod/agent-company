import type { ReactElement } from 'react';
import { Stack, Typography } from '@mui/material';

import type { TeamSchemaDocument } from '../../model/types';

type ReviewPolicyViewProps = {
  readonly schema: TeamSchemaDocument;
};

export const ReviewPolicyView = ({ schema }: ReviewPolicyViewProps): ReactElement => {
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Review Policy</Typography>
      <Typography color="text.secondary">Ticket admission: {schema.review_policy.ticket_admission.join(', ')}</Typography>
      <Typography color="text.secondary">Step completion: {schema.review_policy.step_completion.join(', ')}</Typography>
      <Typography color="text.secondary">Allowed results: {schema.review_policy.allowed_results.join(', ')}</Typography>
    </Stack>
  );
};