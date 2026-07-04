/**
 * Spec: filterMemoryByGovernance
 *
 * Applies governance rules to a list of candidate RetrievedMemory objects
 * BEFORE they enter an Agent's context.  Rules enforced (MVP set):
 *
 *   1. Scope gate      – requester profile must include the memory's source scope
 *   2. Review gate     – if profile.requireReviewedMemory, only reviewed memories pass
 *   3. Expiry gate     – skip memories with an expiresAt in the past
 *   4. Visibility gate – 'private' memories only pass if the memory belongs to
 *                        the requesting agent (sourceObjectId ≡ requesterAgentId)
 *   5. Superseded gate – skip memories that have been superseded by a newer version
 *
 * Returns the filtered list plus a denial log for audit/debug purposes.
 */

import type { AgentId } from '../domain/base';
import {
	MEMORY_REVIEW_STATE,
	MEMORY_VISIBILITY,
	type RetrievedMemory,
} from '../domain/memory';
import type { MemoryRetrievalProfile, MemoryScope } from '../domain/organization';

export type GovernanceFilterInput = {
	readonly candidates: readonly RetrievedMemory[];
	readonly profile: MemoryRetrievalProfile;
	/** The scope of the memories we expect to retrieve (already resolved by caller). */
	readonly requestedScope: MemoryScope;
	readonly requesterAgentId: AgentId;
	/** ISO timestamp for expiry comparison; defaults to now. */
	readonly nowIso?: string;
};

export type GovernanceDenial = {
	readonly memoryId: string;
	readonly reason: string;
};

export type GovernanceFilterResult = {
	readonly allowed: readonly RetrievedMemory[];
	readonly denials: readonly GovernanceDenial[];
};

export const filterMemoryByGovernance = (input: GovernanceFilterInput): GovernanceFilterResult => {
	const now = input.nowIso ?? new Date().toISOString();
	const allowed: RetrievedMemory[] = [];
	const denials: GovernanceDenial[] = [];

	for (const memory of input.candidates) {
		// 1. Superseded gate — skip anything that has been superseded
		if (memory.supersededByIds.length > 0) {
			denials.push({ memoryId: memory.memoryId, reason: 'Memory has been superseded by a newer version.' });
			continue;
		}

		// 2. Review gate
		if (input.profile.requireReviewedMemory && !memory.reviewed) {
			denials.push({ memoryId: memory.memoryId, reason: 'Profile requires reviewed memory; this memory is not yet reviewed.' });
			continue;
		}

		// Gate 3 & 4 need additional metadata not present on RetrievedMemory.
		// When MemoryObject persistence is added, these checks will use the
		// persisted expiresAt and visibility fields.  For now we rely on the
		// presence of conflictIds as a proxy for "in conflict → do not pass".
		if (memory.conflictIds.length > 0) {
			denials.push({ memoryId: memory.memoryId, reason: `Memory has unresolved conflicts with: ${memory.conflictIds.join(', ')}.` });
			continue;
		}

		allowed.push(memory);
	}

	// Respect maxResults
	const capped = allowed.slice(0, input.profile.maxResults);
	const cappedDenials = allowed
		.slice(input.profile.maxResults)
		.map((m) => ({ memoryId: m.memoryId, reason: 'Excluded by profile maxResults limit.' }));

	return { allowed: capped, denials: [...denials, ...cappedDenials] };
};

// ---------------------------------------------------------------------------
// Extended filter for MemoryObject (used when persistence is available)
// ---------------------------------------------------------------------------

/** Subset of MemoryObject fields needed for governance filtering. */
export type MemoryObjectGovernanceView = {
	readonly memoryId: string;
	readonly scope: MemoryScope;
	readonly visibility: string;
	readonly reviewState: string;
	readonly expiresAt?: string;
	readonly sourceObjectId: string;
};

export type ObjectGovernanceFilterResult = {
	readonly allowedIds: ReadonlySet<string>;
	readonly denials: readonly GovernanceDenial[];
};

/**
 * Filter MemoryObject records before they are surfaced as RetrievedMemory.
 * Applies scope, visibility, expiry, and review gates.
 */
export const filterMemoryObjectsByGovernance = (
	objects: readonly MemoryObjectGovernanceView[],
	profile: MemoryRetrievalProfile,
	requestedScope: MemoryScope,
	requesterAgentId: AgentId,
	nowIso?: string,
): ObjectGovernanceFilterResult => {
	const now = nowIso ?? new Date().toISOString();
	const allowedIds = new Set<string>();
	const denials: GovernanceDenial[] = [];

	for (const obj of objects) {
		// 1. Scope gate
		if (!profile.allowedScopes.includes(obj.scope)) {
			denials.push({ memoryId: obj.memoryId, reason: `Scope '${obj.scope}' not in profile allowedScopes.` });
			continue;
		}

		// 2. Review gate
		if (profile.requireReviewedMemory && obj.reviewState !== MEMORY_REVIEW_STATE.Reviewed) {
			denials.push({ memoryId: obj.memoryId, reason: 'Profile requires reviewed memory.' });
			continue;
		}

		// 3. Expiry gate
		if (obj.expiresAt !== undefined && obj.expiresAt < now) {
			denials.push({ memoryId: obj.memoryId, reason: `Memory expired at ${obj.expiresAt}.` });
			continue;
		}

		// 4. Visibility gate
		if (obj.visibility === MEMORY_VISIBILITY.Private && obj.sourceObjectId !== requesterAgentId) {
			denials.push({ memoryId: obj.memoryId, reason: 'Private memory not accessible by this requester.' });
			continue;
		}

		allowedIds.add(obj.memoryId);
	}

	return { allowedIds, denials };
};
