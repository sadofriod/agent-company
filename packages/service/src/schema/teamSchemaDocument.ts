import type { Prisma } from '@prisma/client';

import { getPrismaClient } from '../adapter/prismaClient';
import { createPrismaTeamSchemaRepository } from '../adapter/teamSchemaRepository';
import type { SchemaIssue, ValidationResult } from '../domain/base';
import { loadTeamSchema } from './loadTeamSchema';
import { teamSchema } from './teamDefinitionSchema';
import { issue, mapZodIssue } from './teamSchemaShared';

const TEAM_SCHEMA_KEY = 'current';

const createTeamSchemaRepository = () => createPrismaTeamSchemaRepository(getPrismaClient());

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const toPersistedDocument = (input: unknown): ValidationResult<Prisma.InputJsonValue> => {
	try {
		return {
			ok: true,
			value: JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue,
		};
	} catch {
		return {
			ok: false,
			issues: [issue('schema_invalid', [], 'Team schema 不是可持久化的 JSON 对象。')],
		};
	}
};

const notFoundIssues = (key: string): readonly SchemaIssue[] => [
	issue('file_missing', [], `Stored team schema "${key}" was not found.`, `Create it with POST /team/schemas/${key}.`),
];

const conflictIssues = (key: string): readonly SchemaIssue[] => [
	issue('file_conflict', [], `Stored team schema "${key}" already exists.`, `Use PUT /team/schemas/${key} to update it.`),
];

export const isStoredTeamSchemaMissing = (issues: readonly SchemaIssue[]): boolean =>
	issues.some((entry) => entry.code === 'file_missing');

export const listTeamSchemaDocuments = async (): Promise<
	ValidationResult<readonly { readonly key: string; readonly schema: unknown; readonly updatedAt: string }[]>
> => {
	const records = await createTeamSchemaRepository().list();

	return {
		ok: true,
		value: records.map((record) => ({
			key: record.key,
			schema: record.document,
			updatedAt: record.updatedAt,
		})),
	};
};

export const readTeamSchemaDocument = async (key = TEAM_SCHEMA_KEY): Promise<ValidationResult<unknown>> => {
	const record = await createTeamSchemaRepository().findByKey(key);

	if (record === undefined) {
		return { ok: false, issues: notFoundIssues(key) };
	}

	if (!isRecord(record.document)) {
		return {
			ok: false,
			issues: [issue('schema_invalid', [], 'Stored team schema document must be a JSON object.')],
		};
	}

	return { ok: true, value: record.document };
};

export const parseTeamSchemaDocument = (input: unknown): ValidationResult<Prisma.InputJsonValue> => {
	const parsedTeam = teamSchema.safeParse(input);

	if (!parsedTeam.success) {
		return {
			ok: false,
			issues: parsedTeam.error.issues.map(mapZodIssue),
		};
	}

	if (!isRecord(input)) {
		return {
			ok: false,
			issues: [issue('schema_invalid', [], 'Team schema request body must be a JSON object.')],
		};
	}

	return toPersistedDocument(input);
};

export const createTeamSchemaDocument = async (
	key: string,
	document: Prisma.InputJsonValue,
): Promise<ValidationResult<unknown>> => {
	const repository = createTeamSchemaRepository();
	const existingRecord = await repository.findByKey(key);

	if (existingRecord !== undefined) {
		return { ok: false, issues: conflictIssues(key) };
	}

	const record = await repository.upsert({ key, document });

	return { ok: true, value: record.document };
};

export const updateTeamSchemaDocument = async (
	key: string,
	document: Prisma.InputJsonValue,
): Promise<ValidationResult<unknown>> => {
	const repository = createTeamSchemaRepository();
	const existingRecord = await repository.findByKey(key);

	if (existingRecord === undefined) {
		return { ok: false, issues: notFoundIssues(key) };
	}

	const record = await repository.upsert({ key, document });

	return { ok: true, value: record.document };
};

export const deleteTeamSchemaDocument = async (key: string): Promise<ValidationResult<{ readonly deleted: true }>> => {
	const repository = createTeamSchemaRepository();
	const existingRecord = await repository.findByKey(key);

	if (existingRecord === undefined) {
		return { ok: false, issues: notFoundIssues(key) };
	}

	await repository.deleteByKey(key);

	return { ok: true, value: { deleted: true } };
};