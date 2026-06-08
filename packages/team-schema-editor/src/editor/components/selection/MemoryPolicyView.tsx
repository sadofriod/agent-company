import type { ReactElement } from 'react';
import { Stack, Typography } from '@mui/material';

import type { TeamSchemaDocument } from '../../model/types';

type MemoryPolicyViewProps = {
  schema: TeamSchemaDocument;
};

export const MemoryPolicyView = ({ schema }: MemoryPolicyViewProps): ReactElement => {
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Memory Policy</Typography>
      <Typography color="text.secondary">Retrieval mode: {schema.memory_policy?.retrieval_mode ?? 'none'}</Typography>
      <Typography color="text.secondary">Profiles: {schema.memory_policy?.retrieval_profiles.length ?? 0}</Typography>
      <Typography color="text.secondary">Indexed objects: {schema.memory_policy?.indexed_object_types.join(', ') ?? 'none'}</Typography>
    </Stack>
  );
};