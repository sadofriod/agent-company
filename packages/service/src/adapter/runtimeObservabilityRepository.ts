import { Prisma } from '@prisma/client';
import type { PrismaClient, RuntimeEvent as PrismaRuntimeEvent, RuntimeSnapshot } from '@prisma/client';

import type { RuntimeEvent } from '../domain/runtimeEvent';
import type { RuntimeSession } from '../domain/runtime';
import {
	buildRuntimeSessionPayload,
	restoreRuntimeSessionPayload,
	type RuntimeSessionPayload,
} from '../runtime/buildRuntimeSessionPayload';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };
type JsonObject = { readonly [key: string]: JsonValue };

export type RuntimeSessionSnapshotRecord = {
	readonly session: RuntimeSession;
	readonly sequence: number;
};

export type SessionListPage = {
	readonly items: readonly RuntimeSessionSnapshotRecord[];
	readonly nextCursor?: string;
	readonly total: number;
};

export type RuntimeObservabilityRepository = {
	readonly listEvents: () => Promise<readonly RuntimeEvent[]>;
	readonly listLatestSnapshots: () => Promise<readonly RuntimeSessionSnapshotRecord[]>;
	readonly listSessionsPage: (options: {
		readonly status?: string;
		readonly cursor?: string;
		readonly limit: number;
	}) => Promise<SessionListPage>;
	readonly loadSessionSnapshot: (sessionId: string) => Promise<RuntimeSessionSnapshotRecord | undefined>;
	readonly loadEventsAfterSequence: (
		sessionId: string,
		sequence: number,
	) => Promise<readonly RuntimeEvent[]>;
	readonly saveSessionState: (
		session: RuntimeSession,
		events: readonly RuntimeEvent[],
	) => Promise<void>;
};

const isJsonPrimitive = (value: unknown): value is JsonPrimitive =>
	value === null
	|| typeof value === 'string'
	|| typeof value === 'number'
	|| typeof value === 'boolean';

const toJsonValue = (value: unknown): Prisma.JsonValue => {
	if (isJsonPrimitive(value)) {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map((entry) => toJsonValue(entry));
	}

	if (typeof value === 'object' && value !== null) {
		return Object.entries(value).reduce<Record<string, Prisma.JsonValue>>((result, [key, entry]) => ({
			...result,
			[key]: toJsonValue(entry),
		}), {}) as Prisma.JsonValue;
	}

	return String(value);
};

const toJsonObject = (value: unknown): Prisma.InputJsonObject => {
	const jsonValue = toJsonValue(value);

	if (typeof jsonValue === 'object' && jsonValue !== null && !Array.isArray(jsonValue)) {
		return jsonValue as Prisma.InputJsonObject;
	}

	return { value: jsonValue as Prisma.InputJsonValue };
};

const toSessionSnapshotInput = (session: RuntimeSession): Prisma.InputJsonObject =>
	toJsonObject(buildRuntimeSessionPayload(session));

const parseRuntimeSessionPayload = (value: Prisma.JsonValue): RuntimeSessionPayload => {
	return value as unknown as RuntimeSessionPayload;
};

const parseRuntimeEvent = (record: PrismaRuntimeEvent): RuntimeEvent => ({
	eventId: record.eventId,
	traceId: record.traceId,
	sessionId: record.sessionId,
	sequence: record.sequence,
	eventType: record.eventType,
	ts: record.ts.toISOString(),
	level: record.level as RuntimeEvent['level'],
	...(record.actor === null ? {} : { actor: record.actor as RuntimeEvent['actor'] }),
	...(record.target === null ? {} : { target: record.target as RuntimeEvent['target'] }),
	...(record.statePatch === null
		? {}
		: { statePatch: record.statePatch as Readonly<Record<string, unknown>> }),
	...(record.metrics === null ? {} : { metrics: record.metrics as RuntimeEvent['metrics'] }),
	payload: record.payload as Record<string, unknown>,
});

const parseRuntimeSnapshot = (record: RuntimeSnapshot): RuntimeSessionSnapshotRecord => ({
	session: restoreRuntimeSessionPayload(parseRuntimeSessionPayload(record.snapshot)),
	sequence: record.sequence,
});

export const createPrismaRuntimeObservabilityRepository = (
	prisma: PrismaClient,
): RuntimeObservabilityRepository => ({
	listEvents: async () => {
		const records = await prisma.runtimeEvent.findMany({
			orderBy: [{ createdAt: 'asc' }, { sequence: 'asc' }],
		});

		return records.map(parseRuntimeEvent);
	},
	listLatestSnapshots: async () => {
		const records = await prisma.runtimeSnapshot.findMany({
			distinct: ['sessionId'],
			orderBy: [{ sessionId: 'asc' }, { sequence: 'desc' }],
		});

		return records.map(parseRuntimeSnapshot);
	},
	listSessionsPage: async ({ status, cursor, limit }) => {
		// Count total distinct sessions
		const allSnapshots = await prisma.runtimeSnapshot.findMany({
			distinct: ['sessionId'],
			orderBy: [{ sessionId: 'asc' }, { sequence: 'desc' }],
		});

		const parsed = allSnapshots.map(parseRuntimeSnapshot);

		// Apply status filter in-process (status lives in the snapshot JSON)
		const filtered = status !== undefined
			? parsed.filter((item: RuntimeSessionSnapshotRecord) => (item.session as { status?: string }).status === status)
			: parsed;

		// Cursor-based pagination: cursor is a sessionId
		const startIndex = cursor !== undefined
			? filtered.findIndex((item: RuntimeSessionSnapshotRecord) => item.session.sessionId === cursor) + 1
			: 0;

		const page = filtered.slice(startIndex, startIndex + limit);
		const lastItem = page.at(-1);
		const nextCursor = page.length === limit && lastItem !== undefined
			? lastItem.session.sessionId
			: undefined;

		return { items: page, nextCursor, total: filtered.length };
	},
	loadSessionSnapshot: async (sessionId) => {
		const record = await prisma.runtimeSnapshot.findFirst({
			where: { sessionId },
			orderBy: { sequence: 'desc' },
		});

		if (record === null) {
			return undefined;
		}

		return parseRuntimeSnapshot(record);
	},
	loadEventsAfterSequence: async (sessionId, sequence) => {
		const records = await prisma.runtimeEvent.findMany({
			where: {
				sessionId,
				sequence: { gt: sequence },
			},
			orderBy: { sequence: 'asc' },
		});

		return records.map(parseRuntimeEvent);
	},
	saveSessionState: async (session, events) => {
		await prisma.$transaction(async (transaction) => {
			if (events.length > 0) {
				await transaction.runtimeEvent.createMany({
					data: events.map((event) => ({
						sessionId: event.sessionId,
						sequence: event.sequence,
						eventId: event.eventId,
						eventType: event.eventType,
						ts: new Date(event.ts),
						traceId: event.traceId,
						level: event.level,
						actor: event.actor === undefined ? Prisma.DbNull : (toJsonValue(event.actor) as Prisma.InputJsonValue),
						target: event.target === undefined ? Prisma.DbNull : (toJsonValue(event.target) as Prisma.InputJsonValue),
						statePatch: event.statePatch === undefined ? Prisma.DbNull : (toJsonValue(event.statePatch) as Prisma.InputJsonValue),
						metrics: event.metrics === undefined ? Prisma.DbNull : (toJsonValue(event.metrics) as Prisma.InputJsonValue),
						payload: toJsonValue(event.payload) as Prisma.InputJsonValue,
					})),
					skipDuplicates: true,
				});
			}

			const latestSequence = events.at(-1)?.sequence ?? session.state.context.auditTrail.length;

			await transaction.runtimeSnapshot.upsert({
				where: {
					sessionId_sequence: {
						sessionId: session.sessionId,
						sequence: latestSequence,
					},
				},
				create: {
					sessionId: session.sessionId,
					sequence: latestSequence,
					traceId: session.state.context.traceId,
					snapshot: toSessionSnapshotInput(session),
				},
				update: {
					traceId: session.state.context.traceId,
					snapshot: toSessionSnapshotInput(session),
				},
			});
		});
	},
});
