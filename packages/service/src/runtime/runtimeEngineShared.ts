import { randomUUID } from 'node:crypto';

import type {
	AgentId,
	AuditEventId,
	CapabilityId,
	DecisionId,
	DepartmentId,
	HandoffId,
	MemoryId,
	PipelineId,
	PipelineStepId,
	ReviewId,
	RuntimeId,
	SchemaIssue,
	SourceRef,
	TicketDraftId,
	TicketId,
	TopicId,
} from '../domain/base';
import { MEMORY_SCOPE, type MemoryScope, type TeamDefinition } from '../domain/organization';
import type { AuditEvent } from '../domain/runtime';

export const toRuntimeId = (value: string): RuntimeId => value as RuntimeId;
export const toAuditEventId = (value: string): AuditEventId => value as AuditEventId;
export const toTopicId = (value: string): TopicId => value as TopicId;
export const toDecisionId = (value: string): DecisionId => value as DecisionId;
export const toTicketDraftId = (value: string): TicketDraftId => value as TicketDraftId;
export const toTicketId = (value: string): TicketId => value as TicketId;
export const toPipelineId = (value: string): PipelineId => value as PipelineId;
export const toPipelineStepId = (value: string): PipelineStepId => value as PipelineStepId;
export const toHandoffId = (value: string): HandoffId => value as HandoffId;
export const toReviewId = (value: string): ReviewId => value as ReviewId;
export const toMemoryId = (value: string): MemoryId => value as MemoryId;
export const toAgentId = (value: string): AgentId => value as AgentId;
export const toDepartmentId = (value: string): DepartmentId => value as DepartmentId;
export const toCapabilityId = (value: string): CapabilityId => value as CapabilityId;

export const createIssue = (
	code: string,
	path: readonly string[],
	message: string,
	suggestion?: string,
): SchemaIssue => ({ code, path, message, suggestion });

export const createTimestamp = (): string => new Date().toISOString();

export const createStructuredSourceRef = (id: string, label: string): SourceRef => ({
	kind: 'structured_object',
	id,
	label,
});

export const createMemorySourceRef = (id: string, label: string): SourceRef => ({
	kind: 'memory',
	id,
	label,
});

export const createAuditSourceRef = (id: string, label: string): SourceRef => ({
	kind: 'audit_event',
	id,
	label,
});

export const createDocumentSourceRef = (id: string, label: string): SourceRef => ({
	kind: 'document',
	id,
	label,
});

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