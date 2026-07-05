import type { MemoryPolicyDocument, MemoryRetrievalProfileDocument } from '../../model/types';

export const createDefaultMemoryProfile = (profileId = 'default_memory'): MemoryRetrievalProfileDocument => ({
  profile_id: profileId,
  allowed_scopes: ['system', 'session', 'ticket'],
  max_results: 8,
  max_graph_hops: 1,
  require_reviewed_memory: false,
});

export const createDefaultMemoryPolicy = (): MemoryPolicyDocument => ({
  retrieval_mode: 'standard_rag',
  indexed_object_types: ['memory_object', 'topic', 'decision', 'ticket'],
  retrieval_profiles: [createDefaultMemoryProfile()],
  evidence_required_for_outputs: ['decision', 'ticket', 'handoff', 'review_result'],
  conflict_strategy: 'prefer_reviewed_latest',
});
