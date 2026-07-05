import type { SourceRef } from '../domain/base';
import { SourceRefKind } from '../domain/base';

export const createStructuredSourceRef = (id: string, label: string): SourceRef => ({
	kind: SourceRefKind.StructuredObject,
	id,
	label,
});

export const createMemorySourceRef = (id: string, label: string): SourceRef => ({
	kind: SourceRefKind.Memory,
	id,
	label,
});

export const createAuditSourceRef = (id: string, label: string): SourceRef => ({
	kind: SourceRefKind.AuditEvent,
	id,
	label,
});

export const createDocumentSourceRef = (id: string, label: string): SourceRef => ({
	kind: SourceRefKind.Document,
	id,
	label,
});
