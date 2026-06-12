import type { CaseReducer, PayloadAction } from '@reduxjs/toolkit';

import type { MemoryRetrievalProfileDocument } from '../../model/types';
import {
  createDefaultMemoryProfile,
  parseList,
  type EditorState,
  type MemoryPolicyField,
  type MemoryPolicyListField,
  type MemoryRetrievalProfileField,
  type MemoryRetrievalProfileBooleanField,
  type MemoryRetrievalProfileListField,
  type MemoryRetrievalProfileNumberField,
  withMemoryPolicy,
  withSchema,
} from '../core/editorShared';

const toOptionalValue = (value: string): string | undefined => {
  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? undefined : trimmedValue;
};

const ensureUniqueProfileId = (profiles: readonly MemoryRetrievalProfileDocument[]): string => {
  const existingIds = profiles.map((profile) => profile.profile_id);
  let suffix = profiles.length + 1;
  let candidate = `memory_profile_${suffix}`;

  while (existingIds.includes(candidate)) {
    suffix += 1;
    candidate = `memory_profile_${suffix}`;
  }

  return candidate;
};

const removeAgentMemoryProfile = (agent: EditorState['schema']['agents'][number]): EditorState['schema']['agents'][number] => {
  const { memory_access_policy, ...agentWithoutMemoryProfile } = agent;
  void memory_access_policy;

  return agentWithoutMemoryProfile;
};

export const updateMemoryPolicyField: CaseReducer<
  EditorState,
  PayloadAction<{ field: MemoryPolicyField; value: string }>
> = (state, action): void => {
  const schema = withMemoryPolicy(state.schema, (memoryPolicy) => ({
    ...memoryPolicy,
    [action.payload.field]: action.payload.field === 'vector_store' || action.payload.field === 'graph_store'
      ? toOptionalValue(action.payload.value)
      : action.payload.value,
  }));

  Object.assign(state, withSchema(state, schema));
};

export const updateMemoryPolicyList: CaseReducer<
  EditorState,
  PayloadAction<{ field: MemoryPolicyListField; value: string }>
> = (state, action): void => {
  const schema = withMemoryPolicy(state.schema, (memoryPolicy) => ({
    ...memoryPolicy,
    [action.payload.field]: parseList(action.payload.value),
  }));

  Object.assign(state, withSchema(state, schema));
};

export const addMemoryRetrievalProfile: CaseReducer<EditorState> = (state): void => {
  const schema = withMemoryPolicy(state.schema, (memoryPolicy) => ({
    ...memoryPolicy,
    retrieval_profiles: [
      ...memoryPolicy.retrieval_profiles,
      createDefaultMemoryProfile(ensureUniqueProfileId(memoryPolicy.retrieval_profiles)),
    ],
  }));

  Object.assign(state, withSchema(state, schema));
};

export const removeMemoryRetrievalProfile: CaseReducer<EditorState, PayloadAction<string>> = (state, action): void => {
  const schemaWithMemory = withMemoryPolicy(state.schema, (memoryPolicy) => {
    const nextProfiles = memoryPolicy.retrieval_profiles.filter((profile) => profile.profile_id !== action.payload);

    return {
      ...memoryPolicy,
      retrieval_profiles: nextProfiles.length === 0 ? [createDefaultMemoryProfile()] : nextProfiles,
    };
  });
  const schema = {
    ...schemaWithMemory,
    agents: schemaWithMemory.agents.map((agent) => (
      agent.memory_access_policy === action.payload ? removeAgentMemoryProfile(agent) : agent
    )),
  };

  Object.assign(state, withSchema(state, schema));
};

export const updateMemoryRetrievalProfileField: CaseReducer<
  EditorState,
  PayloadAction<{ profileId: string; field: MemoryRetrievalProfileField; value: string }>
> = (state, action): void => {
  const nextProfileId = toOptionalValue(action.payload.value) ?? action.payload.profileId;
  const schemaWithMemory = withMemoryPolicy(state.schema, (memoryPolicy) => ({
    ...memoryPolicy,
    retrieval_profiles: memoryPolicy.retrieval_profiles.map((profile) => (
      profile.profile_id === action.payload.profileId
        ? { ...profile, [action.payload.field]: nextProfileId }
        : profile
    )),
  }));
  const schema = nextProfileId === action.payload.profileId
    ? schemaWithMemory
    : {
        ...schemaWithMemory,
        agents: schemaWithMemory.agents.map((agent) => (
          agent.memory_access_policy === action.payload.profileId
            ? { ...agent, memory_access_policy: nextProfileId }
            : agent
        )),
      };

  Object.assign(state, withSchema(state, schema));
};

export const updateMemoryRetrievalProfileList: CaseReducer<
  EditorState,
  PayloadAction<{ profileId: string; field: MemoryRetrievalProfileListField; value: string }>
> = (state, action): void => {
  const schema = withMemoryPolicy(state.schema, (memoryPolicy) => ({
    ...memoryPolicy,
    retrieval_profiles: memoryPolicy.retrieval_profiles.map((profile) => (
      profile.profile_id === action.payload.profileId
        ? { ...profile, [action.payload.field]: parseList(action.payload.value) }
        : profile
    )),
  }));

  Object.assign(state, withSchema(state, schema));
};

export const updateMemoryRetrievalProfileNumber: CaseReducer<
  EditorState,
  PayloadAction<{ profileId: string; field: MemoryRetrievalProfileNumberField; value: number }>
> = (state, action): void => {
  const schema = withMemoryPolicy(state.schema, (memoryPolicy) => ({
    ...memoryPolicy,
    retrieval_profiles: memoryPolicy.retrieval_profiles.map((profile) => (
      profile.profile_id === action.payload.profileId
        ? { ...profile, [action.payload.field]: action.payload.value }
        : profile
    )),
  }));

  Object.assign(state, withSchema(state, schema));
};

export const updateMemoryRetrievalProfileBoolean: CaseReducer<
  EditorState,
  PayloadAction<{ profileId: string; field: MemoryRetrievalProfileBooleanField; value: boolean }>
> = (state, action): void => {
  const schema = withMemoryPolicy(state.schema, (memoryPolicy) => ({
    ...memoryPolicy,
    retrieval_profiles: memoryPolicy.retrieval_profiles.map((profile) => (
      profile.profile_id === action.payload.profileId
        ? { ...profile, [action.payload.field]: action.payload.value }
        : profile
    )),
  }));

  Object.assign(state, withSchema(state, schema));
};