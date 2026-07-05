import { randomUUID } from 'node:crypto';

import type { RuntimeId, SchemaIssue } from '../domain/base';
import type { AuditEvent } from '../domain/runtime';
import { MEMORY_SCOPE, type MemoryScope, type TeamDefinition } from '../domain/organization';

import { toAuditEventId } from './idCasting';

export const createIssue = (
	code: string,
	path: readonly string[],
	message: string,
	suggestion?: string,
): SchemaIssue => ({ code, path, message, suggestion });

export const createTimestamp = (): string => new Date().toISOString();

export const createAuditEvent = (
	runtimeId: RuntimeId,
	eventType: string,
	reason: string,
	timestamp: string,
	metadata?: Readonly<Record<string, unknown>>,
): AuditEvent => ({
	eventId: toAuditEventId(randomUUID()),
	eventType,
	runtimeId,
	reason,
	evidenceRefs: [],
	timestamp,
	...(metadata === undefined ? {} : { metadata }),
});

export const createRuntimeScopedId = (prefix: string): string => `${prefix}_${randomUUID()}`;

export const uniqueMemoryScopes = (team: TeamDefinition): readonly MemoryScope[] => {
	const configuredScopes = team.memoryPolicy?.retrievalProfiles.flatMap((profile) => profile.allowedScopes) ?? [];

	return [...new Set([MEMORY_SCOPE.Session, ...configuredScopes])];
};
