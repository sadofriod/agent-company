import type { ReactElement } from 'react';
import { MenuItem, Stack, TextField, Typography } from '@mui/material';

import { CONFLICT_RESOLUTION, DISCUSSION_MODE } from '@agents-team/service/domain/organization';
import type { TeamSchemaDocument } from '../../model/types';
import { DiscussionField } from '../../state/core/editorShared';

type DiscussionSelectionViewProps = {
  schema: TeamSchemaDocument;
  updateDiscussionField: (field: DiscussionField, value: string) => void;
  updateDiscussionNumber: (field: 'max_rounds', value: number) => void;
};

export const DiscussionSelectionView = ({ schema, updateDiscussionField, updateDiscussionNumber }: DiscussionSelectionViewProps): ReactElement => {
  const modeOptions = Object.values(DISCUSSION_MODE);
  const conflictResolutionOptions = Object.values(CONFLICT_RESOLUTION);

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Discussion Policy</Typography>
      <TextField
        select
        fullWidth
        label="Mode"
        value={schema.discussion_policy.mode}
        onChange={(event) => updateDiscussionField(DiscussionField.Mode, event.target.value)}
      >
        {modeOptions.map((option) => (
          <MenuItem key={option} value={option}>{option}</MenuItem>
        ))}
      </TextField>
      <TextField
        fullWidth
        type="number"
        label="Max Rounds"
        value={schema.discussion_policy.max_rounds}
        onChange={(event) => updateDiscussionNumber('max_rounds', Number.parseInt(event.target.value, 10))}
      />
      <TextField
        select
        fullWidth
        label="Supervisor Agent Id"
        value={schema.discussion_policy.supervisor_agent_id ?? ''}
        onChange={(event) => updateDiscussionField(DiscussionField.SupervisorAgentId, event.target.value)}
      >
        <MenuItem value="">None</MenuItem>
        {schema.agents.map((agent) => (
          <MenuItem key={agent.agent_id} value={agent.agent_id}>{agent.metadata?.name ?? agent.agent_id}</MenuItem>
        ))}
      </TextField>
      <TextField
        select
        fullWidth
        label="Conflict Resolution"
        value={schema.discussion_policy.conflict_resolution}
        onChange={(event) => updateDiscussionField(DiscussionField.ConflictResolution, event.target.value)}
      >
        {conflictResolutionOptions.map((option) => (
          <MenuItem key={option} value={option}>{option}</MenuItem>
        ))}
      </TextField>
    </Stack>
  );
};