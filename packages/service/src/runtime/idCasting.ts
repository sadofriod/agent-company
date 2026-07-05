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
	TicketDraftId,
	TicketId,
	TopicId,
} from '../domain/base';

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
