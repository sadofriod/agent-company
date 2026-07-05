/**
 * Spec: indexMemory
 *
 * Marks an existing MemoryObject as 'indexed' for retrieval.
 * In a full vector-store integration, this would compute an embedding and
 * store it in a vector index (pgvector, Pinecone, etc.).
 *
 * For MVP: updates embeddingStatus → 'indexed' in Postgres so
 * filterMemoryByGovernance can include it in results.
 */

import type { PrismaClient } from '@prisma/client';
import type { MemoryId } from '../domain/base';
import { MEMORY_EMBEDDING_STATUS } from '../domain/memory';

export type IndexMemoryResult = {
	readonly memoryId: MemoryId;
	readonly indexed: boolean;
};

/**
 * Sets embeddingStatus to 'indexed' for a MemoryObject.
 * Returns { indexed: false } if the record was not found.
 */
export const indexMemory = async (
	prisma: PrismaClient,
	memoryId: MemoryId,
): Promise<IndexMemoryResult> => {
	const existing = await prisma.memoryObject.findUnique({
		where: { memoryId },
		select: { id: true },
	});

	if (existing === null) {
		return { memoryId, indexed: false };
	}

	await prisma.memoryObject.update({
		where: { memoryId },
		data: { embeddingStatus: MEMORY_EMBEDDING_STATUS.Indexed },
	});

	return { memoryId, indexed: true };
};
