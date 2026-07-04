/**
 * Unit tests: Memory persistence layer (writeMemory, indexMemory, retrieveMemory, graphRagTraversal)
 *
 * Uses a lightweight in-memory mock of PrismaClient.MemoryObject so no real DB
 * is required.
 */
import { describe, expect, it, vi } from 'vitest';

import type { MemoryId } from '../domain/base';
import { MEMORY_EMBEDDING_STATUS, MEMORY_OBJECT_TYPE, MEMORY_VISIBILITY } from '../domain/memory';
import type { MemoryObject } from '../domain/memory';
import { writeMemory } from '../memory/writeMemory';
import { indexMemory } from '../memory/indexMemory';
import { retrieveMemory } from '../memory/retrieveMemory';
import { graphRagTraversal } from '../memory/graphRagTraversal';
import type { MemoryRetrievalProfile } from '../domain/organization';

// ---------------------------------------------------------------------------
// Minimal PrismaClient mock
// ---------------------------------------------------------------------------

const makeMemoryStore = (): Map<string, Record<string, unknown>> => new Map();

const makePrisma = (store = makeMemoryStore()) => {
	const edgeStore = new Map<string, Record<string, unknown>>();

	const memoryObject = {
		findUnique: vi.fn(({ where }: { where: { memoryId: string } }) => {
			return Promise.resolve(store.get(where.memoryId) ?? null);
		}),
		upsert: vi.fn(({ where, create, update }: { where: { memoryId: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
			const existing = store.get(where.memoryId);
			if (existing !== null && existing !== undefined) {
				store.set(where.memoryId, { ...existing, ...update });
			} else {
				store.set(where.memoryId, { ...create });
			}
			return Promise.resolve(store.get(where.memoryId));
		}),
		update: vi.fn(({ where, data }: { where: { memoryId: string }; data: Record<string, unknown> }) => {
			const existing = store.get(where.memoryId);
			if (existing !== undefined) {
				store.set(where.memoryId, { ...existing, ...data });
			}
			return Promise.resolve(store.get(where.memoryId) ?? null);
		}),
		findMany: vi.fn(({ where }: { where: Record<string, unknown> }) => {
			const allRecords = [...store.values()];
			const scopeFilter = (where.scope as { in?: string[] } | undefined)?.in;
			const embeddingFilter = where.embeddingStatus as string | undefined;
			return Promise.resolve(
				allRecords.filter((record) => {
					if (scopeFilter !== undefined && !scopeFilter.includes(record.scope as string)) return false;
					if (embeddingFilter !== undefined && record.embeddingStatus !== embeddingFilter) return false;
					return true;
				}),
			);
		}),
	};

	const memoryGraphEdge = {
		findMany: vi.fn(({ where }: { where: { OR?: unknown[]; edgeType?: { in?: string[] } } }) => {
			const allEdges = [...edgeStore.values()];
			const orClauses = where.OR as Array<{ fromId?: { in?: string[] }; toId?: { in?: string[] } }> | undefined;

			return Promise.resolve(
				allEdges.filter((edge) => {
					if (orClauses === undefined) return true;
					return orClauses.some((clause) => {
						const fromIds = clause.fromId?.in ?? [];
						const toIds = clause.toId?.in ?? [];
						return fromIds.includes(edge.fromId as string) || toIds.includes(edge.toId as string);
					});
				}),
			);
		}),
		create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
			const id = String(edgeStore.size + 1);
			edgeStore.set(id, { ...data, id });
			return Promise.resolve(edgeStore.get(id));
		}),
	};

	return { memoryObject, memoryGraphEdge };
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeMemoryObject = (overrides: Partial<MemoryObject> = {}): MemoryObject => ({
	memoryId: 'mem-001' as MemoryId,
	objectType: MEMORY_OBJECT_TYPE.Decision,
	sourceObjectType: MEMORY_OBJECT_TYPE.Decision,
	scope: 'session',
	sourceObjectId: 'decision-001',
	summary: 'Use React for the frontend.',
	content: 'The team decided to use React for the frontend application.',
	visibility: MEMORY_VISIBILITY.Team,
	expiryCondition: 'session_end',
	version: 1,
	embeddingStatus: MEMORY_EMBEDDING_STATUS.Pending,
	reviewState: 'pending',
	reviewStatus: 'pending',
	evidenceRefs: [],
	sourceRefs: [],
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	...overrides,
});

const makeProfile = (overrides: Partial<MemoryRetrievalProfile> = {}): MemoryRetrievalProfile => ({
	profileId: 'profile-001' as MemoryRetrievalProfile['profileId'],
	allowedScopes: ['session'],
	maxResults: 10,
	maxGraphHops: 2,
	requireReviewedMemory: false,
	...overrides,
});

// ---------------------------------------------------------------------------
// writeMemory
// ---------------------------------------------------------------------------

describe('writeMemory', () => {
	it('creates a new record and returns upserted=true', async () => {
		const prisma = makePrisma() as unknown as Parameters<typeof writeMemory>[0];
		const memory = makeMemoryObject();

		const result = await writeMemory(prisma, { memory });

		expect(result.memoryId).toBe('mem-001');
		expect(result.upserted).toBe(true);
	});

	it('updates an existing record and returns upserted=false', async () => {
		const store = makeMemoryStore();
		store.set('mem-001', { memoryId: 'mem-001', content: 'old content' });
		const prisma = makePrisma(store) as unknown as Parameters<typeof writeMemory>[0];
		const memory = makeMemoryObject({ content: 'updated content' });

		const result = await writeMemory(prisma, { memory });

		expect(result.upserted).toBe(false);
	});

	it('sets embeddingStatus to indexed immediately', async () => {
		const store = makeMemoryStore();
		const prisma = makePrisma(store) as unknown as Parameters<typeof writeMemory>[0];
		await writeMemory(prisma, { memory: makeMemoryObject() });

		const record = store.get('mem-001');
		expect(record?.embeddingStatus).toBe(MEMORY_EMBEDDING_STATUS.Indexed);
	});
});

// ---------------------------------------------------------------------------
// indexMemory
// ---------------------------------------------------------------------------

describe('indexMemory', () => {
	it('returns indexed=false when record not found', async () => {
		const prisma = makePrisma() as unknown as Parameters<typeof indexMemory>[0];
		const result = await indexMemory(prisma, 'mem-missing' as MemoryId);
		expect(result.indexed).toBe(false);
	});

	it('sets embeddingStatus to indexed for existing record', async () => {
		const store = makeMemoryStore();
		store.set('mem-001', { memoryId: 'mem-001', embeddingStatus: MEMORY_EMBEDDING_STATUS.Pending });
		const prisma = makePrisma(store) as unknown as Parameters<typeof indexMemory>[0];

		const result = await indexMemory(prisma, 'mem-001' as MemoryId);

		expect(result.indexed).toBe(true);
		expect(store.get('mem-001')?.embeddingStatus).toBe(MEMORY_EMBEDDING_STATUS.Indexed);
	});
});

// ---------------------------------------------------------------------------
// retrieveMemory
// ---------------------------------------------------------------------------

describe('retrieveMemory', () => {
	it('returns empty array when store is empty', async () => {
		const prisma = makePrisma() as unknown as Parameters<typeof retrieveMemory>[0]['prisma'];
		const results = await retrieveMemory({
			prisma,
			query: { requesterAgentId: 'agent-001' as any, scope: 'session', query: 'React frontend', profileId: 'p1' },
			profile: makeProfile(),
		});
		expect(results).toHaveLength(0);
	});

	it('returns records matching scope filter', async () => {
		const store = makeMemoryStore();
		store.set('mem-001', {
			memoryId: 'mem-001',
			scope: 'session',
			embeddingStatus: MEMORY_EMBEDDING_STATUS.Indexed,
			content: 'React for the frontend',
			summary: 'React decision',
			sourceObjectType: 'decision',
			sourceObjectId: 'dec-001',
			reviewState: 'reviewed',
			sourceRefs: [],
			expiresAt: null,
		});
		store.set('mem-002', {
			memoryId: 'mem-002',
			scope: 'organization',
			embeddingStatus: MEMORY_EMBEDDING_STATUS.Indexed,
			content: 'Use TypeScript',
			summary: 'TypeScript decision',
			sourceObjectType: 'decision',
			sourceObjectId: 'dec-002',
			reviewState: 'reviewed',
			sourceRefs: [],
			expiresAt: null,
		});
		const prisma = makePrisma(store) as unknown as Parameters<typeof retrieveMemory>[0]['prisma'];

		const results = await retrieveMemory({
			prisma,
			query: { requesterAgentId: 'agent-001' as any, scope: 'session', query: 'React frontend', profileId: 'p1' },
			profile: makeProfile({ allowedScopes: ['session'] }),
		});

		expect(results).toHaveLength(1);
		expect(results[0]?.memoryId).toBe('mem-001');
	});

	it('ranks higher-relevance records first', async () => {
		const store = makeMemoryStore();
		store.set('mem-A', {
			memoryId: 'mem-A',
			scope: 'session',
			embeddingStatus: MEMORY_EMBEDDING_STATUS.Indexed,
			content: 'React for frontend development',
			summary: 'React decision',
			sourceObjectType: 'decision',
			sourceObjectId: 'dec-A',
			reviewState: 'reviewed',
			sourceRefs: [],
			expiresAt: null,
		});
		store.set('mem-B', {
			memoryId: 'mem-B',
			scope: 'session',
			embeddingStatus: MEMORY_EMBEDDING_STATUS.Indexed,
			content: 'Use Docker for deployment',
			summary: 'Docker decision',
			sourceObjectType: 'decision',
			sourceObjectId: 'dec-B',
			reviewState: 'reviewed',
			sourceRefs: [],
			expiresAt: null,
		});
		const prisma = makePrisma(store) as unknown as Parameters<typeof retrieveMemory>[0]['prisma'];

		const results = await retrieveMemory({
			prisma,
			query: { requesterAgentId: 'agent-001' as any, scope: 'session', query: 'React frontend development', profileId: 'p1' },
			profile: makeProfile({ allowedScopes: ['session'] }),
		});

		// mem-A has more overlap with query tokens
		expect(results[0]?.memoryId).toBe('mem-A');
	});
});

// ---------------------------------------------------------------------------
// graphRagTraversal
// ---------------------------------------------------------------------------

describe('graphRagTraversal', () => {
	it('returns empty set when no edges exist', async () => {
		const prisma = makePrisma() as unknown as Parameters<typeof graphRagTraversal>[0]['prisma'];

		const result = await graphRagTraversal({ prisma, startId: 'mem-001' as MemoryId, maxHops: 1 });

		expect(result.size).toBe(0);
	});

	it('finds 1-hop neighbors', async () => {
		const store = makeMemoryStore();
		const prisma = makePrisma(store);
		// Manually populate edge store via create
		await prisma.memoryGraphEdge.create({ data: { fromId: 'mem-001', toId: 'mem-002', edgeType: 'DERIVED_FROM', id: '1' } });

		const castPrisma = prisma as unknown as Parameters<typeof graphRagTraversal>[0]['prisma'];
		const result = await graphRagTraversal({ prisma: castPrisma, startId: 'mem-001' as MemoryId, maxHops: 1 });

		expect(result.has('mem-002' as MemoryId)).toBe(true);
		expect(result.has('mem-001' as MemoryId)).toBe(false); // start node excluded
	});
});
