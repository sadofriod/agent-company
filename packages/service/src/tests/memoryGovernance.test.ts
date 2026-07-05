/**
 * Unit tests: Memory governance
 * Covers filterMemoryByGovernance, detectMemoryConflict
 */
import { describe, expect, it } from 'vitest';

import { MEMORY_CONFLICT_STRATEGY } from '../domain/organization';
import type { RetrievedMemory } from '../domain/memory';
import type { MemoryId } from '../domain/base';
import type { MemoryRetrievalProfile } from '../domain/organization';
import { filterMemoryByGovernance } from '../memory/filterMemoryByGovernance';
import { detectMemoryConflict } from '../memory/detectMemoryConflict';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeMemory = (overrides: Partial<RetrievedMemory> = {}): RetrievedMemory => ({
	memoryId: 'mem-001' as MemoryId,
	sourceObjectType: 'decision',
	sourceObjectId: 'decision-001',
	content: 'Use React for the frontend.',
	evidenceSummary: 'Agreed in design discussion.',
	score: 0.9,
	sourceRefs: [],
	reviewed: true,
	conflictIds: [],
	supersededByIds: [],
	...overrides,
});

const makeProfile = (overrides: Partial<MemoryRetrievalProfile> = {}): MemoryRetrievalProfile => ({
	profileId: 'profile-001' as MemoryRetrievalProfile['profileId'],
	allowedScopes: ['session', 'topic'],
	maxResults: 10,
	maxGraphHops: 2,
	requireReviewedMemory: false,
	...overrides,
});

// ---------------------------------------------------------------------------
// filterMemoryByGovernance
// ---------------------------------------------------------------------------

describe('filterMemoryByGovernance', () => {
	it('passes reviewed memory when requireReviewedMemory=false', () => {
		const result = filterMemoryByGovernance({
			candidates: [makeMemory({ reviewed: true })],
			profile: makeProfile({ requireReviewedMemory: false }),
			requestedScope: 'session',
			requesterAgentId: 'agent-001' as RetrievedMemory['sourceObjectId'] extends string ? string : never as any,
		});

		expect(result.allowed).toHaveLength(1);
		expect(result.denials).toHaveLength(0);
	});

	it('filters out unreviewed memory when requireReviewedMemory=true', () => {
		const result = filterMemoryByGovernance({
			candidates: [makeMemory({ reviewed: false })],
			profile: makeProfile({ requireReviewedMemory: true }),
			requestedScope: 'session',
			requesterAgentId: 'agent-001' as any,
		});

		expect(result.allowed).toHaveLength(0);
		expect(result.denials).toHaveLength(1);
		expect(result.denials[0]?.reason).toContain('requires reviewed memory');
	});

	it('filters out memory with unresolved conflicts', () => {
		const result = filterMemoryByGovernance({
			candidates: [makeMemory({ conflictIds: ['mem-002' as MemoryId] })],
			profile: makeProfile(),
			requestedScope: 'session',
			requesterAgentId: 'agent-001' as any,
		});

		expect(result.allowed).toHaveLength(0);
		expect(result.denials[0]?.reason).toContain('unresolved conflicts');
	});

	it('filters out superseded memory', () => {
		const result = filterMemoryByGovernance({
			candidates: [makeMemory({ supersededByIds: ['mem-newer' as MemoryId] })],
			profile: makeProfile(),
			requestedScope: 'session',
			requesterAgentId: 'agent-001' as any,
		});

		expect(result.allowed).toHaveLength(0);
		expect(result.denials[0]?.reason).toContain('superseded');
	});

	it('caps results at profile.maxResults', () => {
		const memories = Array.from({ length: 5 }, (_, i) =>
			makeMemory({ memoryId: `mem-00${i}` as MemoryId }),
		);

		const result = filterMemoryByGovernance({
			candidates: memories,
			profile: makeProfile({ maxResults: 3 }),
			requestedScope: 'session',
			requesterAgentId: 'agent-001' as any,
		});

		expect(result.allowed).toHaveLength(3);
	});
});

// ---------------------------------------------------------------------------
// detectMemoryConflict
// ---------------------------------------------------------------------------

describe('detectMemoryConflict', () => {
	it('detects explicit conflictIds', () => {
		const memories = [
			makeMemory({ memoryId: 'mem-A' as MemoryId, conflictIds: ['mem-B' as MemoryId] }),
			makeMemory({ memoryId: 'mem-B' as MemoryId }),
		];

		const result = detectMemoryConflict({ memories, strategy: MEMORY_CONFLICT_STRATEGY.ReturnConflictsToReview });

		expect(result.conflicts).toHaveLength(1);
		expect(result.suppressedIds.size).toBe(0); // ReturnConflictsToReview = don't auto-suppress
	});

	it('suppresses all members with BlockOnConflict strategy', () => {
		const memories = [
			makeMemory({ memoryId: 'mem-A' as MemoryId, conflictIds: ['mem-B' as MemoryId] }),
			makeMemory({ memoryId: 'mem-B' as MemoryId }),
		];

		const result = detectMemoryConflict({ memories, strategy: MEMORY_CONFLICT_STRATEGY.BlockOnConflict });

		expect(result.suppressedIds.has('mem-A' as MemoryId)).toBe(true);
		expect(result.suppressedIds.has('mem-B' as MemoryId)).toBe(true);
	});

	it('suppresses unreviewed members with PreferReviewedLatest', () => {
		const memories = [
			makeMemory({ memoryId: 'mem-reviewed' as MemoryId, reviewed: true, score: 0.9, conflictIds: ['mem-unreviewed' as MemoryId] }),
			makeMemory({ memoryId: 'mem-unreviewed' as MemoryId, reviewed: false }),
		];

		const result = detectMemoryConflict({ memories, strategy: MEMORY_CONFLICT_STRATEGY.PreferReviewedLatest });

		expect(result.suppressedIds.has('mem-unreviewed' as MemoryId)).toBe(true);
		expect(result.suppressedIds.has('mem-reviewed' as MemoryId)).toBe(false);
	});

	it('returns empty conflicts when no conflicts exist', () => {
		const memories = [makeMemory(), makeMemory({ memoryId: 'mem-002' as MemoryId })];

		const result = detectMemoryConflict({ memories, strategy: MEMORY_CONFLICT_STRATEGY.ReturnConflictsToReview });

		expect(result.conflicts).toHaveLength(0);
		expect(result.suppressedIds.size).toBe(0);
	});
});
