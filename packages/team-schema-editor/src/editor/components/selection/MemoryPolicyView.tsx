import type { ReactElement } from 'react';
import { Button, Divider, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';

import type { TeamSchemaDocument } from '../../model/types';
import {
  MemoryPolicyField,
  MemoryPolicyListField,
  MemoryRetrievalProfileBooleanField,
  MemoryRetrievalProfileField,
  MemoryRetrievalProfileListField,
  MemoryRetrievalProfileNumberField,
} from '../../state/core/editorShared';

type MemoryPolicyViewProps = {
  schema: TeamSchemaDocument;
  updateMemoryPolicyField: (field: MemoryPolicyField, value: string) => void;
  updateMemoryPolicyList: (field: MemoryPolicyListField, value: string) => void;
  addMemoryRetrievalProfile: () => void;
  removeMemoryRetrievalProfile: (profileId: string) => void;
  updateMemoryRetrievalProfileField: (profileId: string, field: MemoryRetrievalProfileField, value: string) => void;
  updateMemoryRetrievalProfileList: (profileId: string, field: MemoryRetrievalProfileListField, value: string) => void;
  updateMemoryRetrievalProfileNumber: (profileId: string, field: MemoryRetrievalProfileNumberField, value: number) => void;
  updateMemoryRetrievalProfileBoolean: (profileId: string, field: MemoryRetrievalProfileBooleanField, value: boolean) => void;
};

const renderListValue = (items: readonly string[] | undefined): string => (items ?? []).join('\n');

const toPositiveNumber = (value: string, fallback: number): number => {
  const parsedValue = Number.parseInt(value, 10);

  return Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : fallback;
};

export const MemoryPolicyView = ({
  schema,
  updateMemoryPolicyField,
  updateMemoryPolicyList,
  addMemoryRetrievalProfile,
  removeMemoryRetrievalProfile,
  updateMemoryRetrievalProfileField,
  updateMemoryRetrievalProfileList,
  updateMemoryRetrievalProfileNumber,
  updateMemoryRetrievalProfileBoolean,
}: MemoryPolicyViewProps): ReactElement => {
  const memoryPolicy = schema.memory_policy;

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Memory Policy</Typography>
      <TextField
        fullWidth
        label="Retrieval Mode"
        value={memoryPolicy?.retrieval_mode ?? 'standard_rag'}
        onChange={(event) => updateMemoryPolicyField(MemoryPolicyField.RetrievalMode, event.target.value)}
      />
      <TextField
        fullWidth
        label="Vector Store"
        value={memoryPolicy?.vector_store ?? ''}
        onChange={(event) => updateMemoryPolicyField(MemoryPolicyField.VectorStore, event.target.value)}
      />
      <TextField
        fullWidth
        label="Graph Store"
        value={memoryPolicy?.graph_store ?? ''}
        onChange={(event) => updateMemoryPolicyField(MemoryPolicyField.GraphStore, event.target.value)}
      />
      <TextField
        fullWidth
        multiline
        minRows={3}
        label="Indexed Object Types"
        value={renderListValue(memoryPolicy?.indexed_object_types)}
        onChange={(event) => updateMemoryPolicyList(MemoryPolicyListField.IndexedObjectTypes, event.target.value)}
      />
      <TextField
        fullWidth
        multiline
        minRows={3}
        label="Evidence Required Outputs"
        value={renderListValue(memoryPolicy?.evidence_required_for_outputs)}
        onChange={(event) => updateMemoryPolicyList(MemoryPolicyListField.EvidenceRequiredForOutputs, event.target.value)}
      />
      <TextField
        fullWidth
        label="Conflict Strategy"
        value={memoryPolicy?.conflict_strategy ?? 'prefer_reviewed_latest'}
        onChange={(event) => updateMemoryPolicyField(MemoryPolicyField.ConflictStrategy, event.target.value)}
      />

      <Divider />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 850, letterSpacing: 0 }}>
          Retrieval Profiles
        </Typography>
        <Button size="small" variant="outlined" onClick={addMemoryRetrievalProfile}>Add profile</Button>
      </Stack>

      {(memoryPolicy?.retrieval_profiles ?? []).map((profile) => (
        <Stack key={profile.profile_id} spacing={1.25} sx={{ border: '1px solid #d7dde5', borderRadius: 1, p: 1.25 }}>
          <TextField
            fullWidth
            label="Profile ID"
            value={profile.profile_id}
            onChange={(event) => updateMemoryRetrievalProfileField(profile.profile_id, MemoryRetrievalProfileField.ProfileId, event.target.value)}
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Allowed Scopes"
            value={renderListValue(profile.allowed_scopes)}
            onChange={(event) => updateMemoryRetrievalProfileList(profile.profile_id, MemoryRetrievalProfileListField.AllowedScopes, event.target.value)}
          />
          <TextField
            fullWidth
            type="number"
            label="Max Results"
            value={profile.max_results}
            onChange={(event) => updateMemoryRetrievalProfileNumber(profile.profile_id, MemoryRetrievalProfileNumberField.MaxResults, toPositiveNumber(event.target.value, profile.max_results))}
          />
          <TextField
            fullWidth
            type="number"
            label="Max Graph Hops"
            value={profile.max_graph_hops}
            onChange={(event) => updateMemoryRetrievalProfileNumber(profile.profile_id, MemoryRetrievalProfileNumberField.MaxGraphHops, toPositiveNumber(event.target.value, profile.max_graph_hops))}
          />
          <FormControlLabel
            control={(
              <Switch
                checked={profile.require_reviewed_memory}
                onChange={(event) => updateMemoryRetrievalProfileBoolean(profile.profile_id, MemoryRetrievalProfileBooleanField.RequireReviewedMemory, event.target.checked)}
              />
            )}
            label="Require reviewed memory"
          />
          <Button color="error" variant="outlined" onClick={() => removeMemoryRetrievalProfile(profile.profile_id)} sx={{ alignSelf: 'flex-start' }}>
            Delete Profile
          </Button>
        </Stack>
      ))}
    </Stack>
  );
};