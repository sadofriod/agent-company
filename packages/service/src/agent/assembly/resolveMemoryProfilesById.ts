import type { RuntimePlan } from '../../domain/runtime';
import type { MemoryProfilesById } from './types';

export const resolveMemoryProfilesById = (runtimePlan: RuntimePlan): MemoryProfilesById =>
  new Map(
    runtimePlan.memoryPolicy?.retrievalProfiles.map((profile) => [profile.profileId, profile]) ?? [],
  );