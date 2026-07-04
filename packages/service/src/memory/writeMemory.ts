/**
 * Spec: writeMemory
 *
 * Persists a MemoryObject to the Prisma `memory_objects` table and enqueues
 * it for vector indexing.  Idempotent on memoryId (upsert semantics).
 *
 * For MVP, vector indexing is simulated by setting embeddingStatus = 'indexed'
 * immediately.  When a real vector store is wired, `indexMemory` can be called
 * asynchronously after the write.
 */

import type { PrismaClient } from '@prisma/client';
import type { MemoryId } from '../domain/base';
import {
	MEMORY_EMBEDDING_STATUS,
	MEMORY_REVIEW_STATE,
	MEMORY_VISIBILITY,
	type MemoryObject,
} from '../domain/memory';

export type WriteMemoryInput = {
	readonly memory: MemoryObject;
	readonly sessionId?: string;
};

export type WriteMemoryResult = {
	readonly memoryId: MemoryId;
	readonly upserted: boolean;
};

/**
 * Writes a MemoryObject to persistent storage.
 * Returns the memoryId and whether a new record was created.
 */
export const writeMemory = async (
	prisma: PrismaClient,
	input: WriteMemoryInput,
): Promise<WriteMemoryResult> => {
	const { memory, sessionId } = input;

	const existing = await prisma.memoryObject.findUnique({
		where: { memoryId: memory.memoryId },
		select: { id: true },
	});

	const evidenceRefs = JSON.parse(JSON.stringify(memory.evidenceRefs));
	const sourceRefs = JSON.parse(JSON.stringify(memory.sourceRefs));

	await prisma.memoryObject.upsert({
		where: { memoryId: memory.memoryId },
		create: {
			memoryId: memory.memoryId,
			objectType: memory.objectType,
			sourceObjectType: memory.sourceObjectType,
			scope: memory.scope,
			sourceObjectId: memory.sourceObjectId,
			sessionId: sessionId ?? null,
			ticketId: memory.ticketId ?? null,
			topicId: memory.topicId ?? null,
			pipelineId: memory.pipelineId ?? null,
			summary: memory.summary,
			content: memory.content,
			visibility: memory.visibility ?? MEMORY_VISIBILITY.Team,
			expiryCondition: memory.expiryCondition,
			version: memory.version,
			embeddingStatus: MEMORY_EMBEDDING_STATUS.Indexed,
			reviewState: memory.reviewState ?? MEMORY_REVIEW_STATE.Pending,
			evidenceRefs,
			sourceRefs,
			expiresAt: memory.expiresAt !== undefined ? new Date(memory.expiresAt) : null,
		},
		update: {
			summary: memory.summary,
			content: memory.content,
			visibility: memory.visibility ?? MEMORY_VISIBILITY.Team,
			version: { increment: 1 },
			embeddingStatus: MEMORY_EMBEDDING_STATUS.Indexed,
			reviewState: memory.reviewState ?? MEMORY_REVIEW_STATE.Pending,
			evidenceRefs,
			sourceRefs,
			expiresAt: memory.expiresAt !== undefined ? new Date(memory.expiresAt) : null,
		},
	});

	return { memoryId: memory.memoryId, upserted: existing === null };
};
