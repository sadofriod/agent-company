/**
 * Spec: detectMemoryConflict
 *
 * Inspects a list of RetrievedMemory items for conflicts and supersessions.
 * Uses two detection strategies:
 *
 *   1. Explicit conflict IDs  – memory.conflictIds already populated (from
 *      MemoryGraphEdge CONTRADICTS relationships).
 *   2. Cross-supersession     – if memory A is in memory B's supersededByIds,
 *      then A is stale (superseded); flag both as potentially conflicting.
 *
 * Returns a MemoryConflict record per conflict group.  The caller (pipeline
 * advance or review gate) decides what to do based on the active
 * MemoryConflictStrategy.
 */

import {
	type MemoryConflict,
	type RetrievedMemory,
} from '../domain/memory';
import type { MemoryId } from '../domain/base';
import { MEMORY_CONFLICT_STRATEGY, type MemoryConflictStrategy } from '../domain/organization';

export type DetectMemoryConflictInput = {
	readonly memories: readonly RetrievedMemory[];
	readonly strategy: MemoryConflictStrategy;
};

export type DetectMemoryConflictResult = {
	readonly conflicts: readonly MemoryConflict[];
	/** Memories that should be suppressed due to conflicts, based on strategy. */
	readonly suppressedIds: ReadonlySet<MemoryId>;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build a map of memoryId → memory for fast lookup. */
const buildIndex = (memories: readonly RetrievedMemory[]): ReadonlyMap<MemoryId, RetrievedMemory> =>
	new Map(memories.map((m) => [m.memoryId, m]));

/**
 * Collects all conflict groups.  Each group is keyed by the "primary" memory
 * (lowest memoryId alphabetically for determinism).
 */
const buildConflictGroups = (
	memories: readonly RetrievedMemory[],
): ReadonlyMap<MemoryId, ReadonlySet<MemoryId>> => {
	const groups = new Map<MemoryId, Set<MemoryId>>();

	const addToGroup = (a: MemoryId, b: MemoryId): void => {
		const primary = a < b ? a : b;
		const secondary = a < b ? b : a;
		const existing = groups.get(primary);
		if (existing !== undefined) {
			existing.add(secondary);
		} else {
			groups.set(primary, new Set([secondary]));
		}
	};

	for (const memory of memories) {
		// Explicit CONTRADICTS edges
		for (const conflictId of memory.conflictIds) {
			addToGroup(memory.memoryId, conflictId);
		}

		// Cross-supersession: if memory has supersededByIds, it conflicts with the newer versions
		for (const supersededById of memory.supersededByIds) {
			addToGroup(memory.memoryId, supersededById);
		}
	}

	return groups;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const detectMemoryConflict = (input: DetectMemoryConflictInput): DetectMemoryConflictResult => {
	const index = buildIndex(input.memories);
	const groups = buildConflictGroups(input.memories);
	const conflicts: MemoryConflict[] = [];
	const suppressedIds = new Set<MemoryId>();

	for (const [primaryId, conflictingIds] of groups) {
		const conflictingWithIds = [...conflictingIds];

		conflicts.push({
			memoryId: primaryId,
			conflictingWithIds,
			strategy: input.strategy,
			summary: `Memory '${primaryId}' conflicts with: ${conflictingWithIds.join(', ')}.`,
		});

		// Apply suppression based on strategy
		switch (input.strategy) {
			case MEMORY_CONFLICT_STRATEGY.BlockOnConflict:
				// Block everything in the conflict group
				suppressedIds.add(primaryId);
				for (const id of conflictingIds) suppressedIds.add(id);
				break;

			case MEMORY_CONFLICT_STRATEGY.PreferReviewedLatest: {
				// Suppress unreviewed / superseded members; keep latest reviewed
				const allInGroup = [primaryId, ...conflictingIds];
				const reviewed = allInGroup.filter((id) => index.get(id)?.reviewed === true);
				const unreviewed = allInGroup.filter((id) => index.get(id)?.reviewed !== true);
				const superseded = allInGroup.filter((id) => (index.get(id)?.supersededByIds.length ?? 0) > 0);

				for (const id of superseded) suppressedIds.add(id);
				if (reviewed.length > 0) {
					// Keep highest-score reviewed; suppress others
					const sortedReviewed = [...reviewed].sort((a, b) => {
						const scoreA = index.get(a)?.score ?? 0;
						const scoreB = index.get(b)?.score ?? 0;
						return scoreB - scoreA;
					});
					// Suppress all but the top reviewed
					for (const id of sortedReviewed.slice(1)) suppressedIds.add(id);
					for (const id of unreviewed) suppressedIds.add(id);
				}
				break;
			}

			case MEMORY_CONFLICT_STRATEGY.ReturnConflictsToReview:
				// Don't auto-suppress; flag conflicts and let Review Gate decide
				break;
		}
	}

	return { conflicts, suppressedIds };
};
