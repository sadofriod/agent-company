/**
 * Spec: retrieveMemory
 *
 * Retrieves MemoryObject records from Prisma that match the given query,
 * then maps them to RetrievedMemory.
 *
 * Strategy (MVP — keyword / scope-based, no vectors):
 *   1. Filter by scope and sessionId when provided.
 *   2. Filter by embeddingStatus = 'indexed' (records written via writeMemory).
 *   3. Filter out expired records (expiresAt < now).
 *   4. Rank by simple keyword overlap score between query text and content.
 *   5. Apply profile.maxResults cap.
 *
 * When a real vector store is available, replace step 4 with a cosine
 * similarity search on the embedding column.
 */

import type { PrismaClient } from '@prisma/client';
import type { MemoryId } from '../domain/base';
import {
	MEMORY_EMBEDDING_STATUS,
	type MemoryObjectType,
	type RetrievedMemory,
} from '../domain/memory';
import type { MemoryQuery } from '../domain/memory';
import type { MemoryRetrievalProfile } from '../domain/organization';
import { SourceRefKind } from '../domain/base';

export type RetrieveMemoryInput = {
	readonly prisma: PrismaClient;
	readonly query: MemoryQuery;
	readonly profile: MemoryRetrievalProfile;
	readonly sessionId?: string;
	readonly nowIso?: string;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const tokenize = (text: string): readonly string[] =>
	text
		.toLowerCase()
		.replace(/[_-]/g, ' ')
		.split(/[^a-z0-9\u4e00-\u9fa5]+/)
		.filter((t) => t.length > 1);

const scoreContent = (content: string, queryTokens: readonly string[]): number => {
	const contentTokens = new Set(tokenize(content));
	return queryTokens.reduce((score, t) => score + (contentTokens.has(t) ? 1 : 0), 0);
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retrieves persisted MemoryObjects matching the query from the database
 * and returns them as RetrievedMemory instances ready for agent context injection.
 */
export const retrieveMemory = async (input: RetrieveMemoryInput): Promise<readonly RetrievedMemory[]> => {
	const { prisma, query, profile, sessionId, nowIso } = input;
	const now = nowIso ?? new Date().toISOString();
	const queryTokens = tokenize(query.query);

	const records = await prisma.memoryObject.findMany({
		where: {
			scope: { in: [...profile.allowedScopes] },
			embeddingStatus: MEMORY_EMBEDDING_STATUS.Indexed,
			OR: [
				{ expiresAt: null },
				{ expiresAt: { gt: new Date(now) } },
			],
			...(sessionId !== undefined ? { sessionId } : {}),
		},
		orderBy: { createdAt: 'desc' },
		take: profile.maxResults * 4, // oversample before ranking
	});

	type MemoryRecord = {
		memoryId: string;
		sourceObjectType: string;
		sourceObjectId: string;
		content: string;
		summary: string;
		reviewState: string;
		sourceRefs: unknown;
	};

	type ScoredRecord = {
		record: MemoryRecord;
		score: number;
	};

	const scored: ScoredRecord[] = (records as MemoryRecord[]).map((record: MemoryRecord) => ({
		record,
		score: queryTokens.length === 0 ? 0.5 : scoreContent(record.content, queryTokens) / Math.max(1, queryTokens.length),
	}));

	const top = scored
		.sort((a: ScoredRecord, b: ScoredRecord) => b.score - a.score)
		.slice(0, profile.maxResults);

	return top.map(({ record, score }: ScoredRecord) => ({
		memoryId: record.memoryId as MemoryId,
		sourceObjectType: record.sourceObjectType as MemoryObjectType,
		sourceObjectId: record.sourceObjectId,
		content: record.content,
		evidenceSummary: record.summary,
		score,
		sourceRefs: Array.isArray(record.sourceRefs)
			? (record.sourceRefs as unknown[]).map((ref: unknown) => {
				if (typeof ref === 'object' && ref !== null) {
					return ref as { kind: SourceRefKind; id: string; label: string };
				}
				return { kind: SourceRefKind.Memory, id: record.memoryId, label: record.summary };
			})
			: [{ kind: SourceRefKind.Memory, id: record.memoryId, label: record.summary }],
		reviewed: record.reviewState === 'reviewed',
		conflictIds: [],
		supersededByIds: [],
	}));
};
