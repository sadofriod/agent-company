/**
 * Spec: graphRagTraversal
 *
 * Traverses the MemoryGraphEdge table up to `maxHops` hops from a starting
 * memoryId, collecting all reachable memoryIds.
 *
 * Used by retrieveMemory to expand the candidate set with semantically related
 * memories (e.g., DERIVED_FROM, REFERENCES chains).
 *
 * For MVP: BFS over Prisma queries (1–2 hops).  A production implementation
 * would use a native graph DB or recursive CTE.
 */

import type { PrismaClient } from '@prisma/client';
import type { MemoryId } from '../domain/base';

export type GraphRagTraversalInput = {
	readonly prisma: PrismaClient;
	readonly startId: MemoryId;
	/** Number of hops to traverse. Default 1. */
	readonly maxHops?: number;
	/** Edge types to follow. If empty, all types are followed. */
	readonly edgeTypes?: readonly string[];
};

/**
 * Returns all memoryIds reachable from startId within maxHops,
 * following edges in both directions (from or to).
 */
export const graphRagTraversal = async (input: GraphRagTraversalInput): Promise<ReadonlySet<MemoryId>> => {
	const { prisma, startId, maxHops = 1, edgeTypes = [] } = input;
	const visited = new Set<MemoryId>([startId]);
	const frontier = new Set<MemoryId>([startId]);

	for (let hop = 0; hop < maxHops; hop++) {
		if (frontier.size === 0) break;

		const frontierIds = [...frontier];
		frontier.clear();

		const edges = await prisma.memoryGraphEdge.findMany({
			where: {
				OR: [
					{ fromId: { in: frontierIds } },
					{ toId: { in: frontierIds } },
				],
				...(edgeTypes.length > 0 ? { edgeType: { in: [...edgeTypes] } } : {}),
			},
			select: { fromId: true, toId: true },
		});

		for (const edge of edges) {
			for (const id of [edge.fromId as MemoryId, edge.toId as MemoryId]) {
				if (!visited.has(id)) {
					visited.add(id);
					frontier.add(id);
				}
			}
		}
	}

	// Remove the start node itself — caller already has it
	visited.delete(startId);
	return visited;
};
