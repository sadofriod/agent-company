import type { Request } from 'express';
import { z } from 'zod';

import type { SchemaIssue, ValidationResult } from '../../domain/base';
import type { RuntimeSessionScheduler } from '../../runtime/runtimeSessionScheduler';

const runtimeTaskSchema = z.object({
	title: z.string().min(1),
	goal: z.string().min(1),
	constraints: z.array(z.string().min(1)).default([]),
	requesterId: z.string().min(1).optional(),
});

const runtimeSessionStartBodySchema = z.object({
	task: runtimeTaskSchema,
	team: z.record(z.string(), z.unknown()).optional(),
	traceId: z.string().min(1).optional(),
	testScenarios: z.object({
		pipelineCycle: z.boolean().optional(),
		capabilityMissing: z.boolean().optional(),
		ragEvidenceMissing: z.boolean().optional(),
		handoffFieldMissing: z.boolean().optional(),
		memoryScopePollution: z.boolean().optional(),
		memoryConflictEscalation: z.boolean().optional(),
		unauthorizedRetrieval: z.boolean().optional(),
	}).strict().optional(),
});

const toIssue = (entry: z.ZodIssue): SchemaIssue => ({
	code: 'request_invalid',
	path: entry.path.map(String),
	message: entry.message,
});

export const parseRuntimeSessionStartBody = (
	body: unknown,
): ValidationResult<{
	readonly task: {
		readonly title: string;
		readonly goal: string;
		readonly constraints: readonly string[];
		readonly requesterId?: string;
	};
	readonly team?: Record<string, unknown>;
	readonly traceId?: string;
	readonly testScenarios?: {
		readonly pipelineCycle?: boolean;
		readonly capabilityMissing?: boolean;
		readonly ragEvidenceMissing?: boolean;
		readonly handoffFieldMissing?: boolean;
		readonly memoryScopePollution?: boolean;
		readonly memoryConflictEscalation?: boolean;
		readonly unauthorizedRetrieval?: boolean;
	};
}> => {
	const parsedBody = runtimeSessionStartBodySchema.safeParse(body);

	if (parsedBody.success) {
		return { ok: true, value: parsedBody.data };
	}

	return {
		ok: false,
		issues: parsedBody.error.issues.map(toIssue),
	};
};

export const isRuntimeSessionMissing = (issues: readonly SchemaIssue[]): boolean =>
	issues.some((issue) => issue.code === 'runtime_session_missing');

export const isRuntimeSessionTransitionInvalid = (issues: readonly SchemaIssue[]): boolean =>
	issues.some((issue) => issue.code === 'runtime_session_transition_invalid');

export const isRuntimeSessionNotRunning = (issues: readonly SchemaIssue[]): boolean =>
	issues.some((issue) => issue.code === 'runtime_session_not_running');

export const resolveRuntimeSessionScheduler = (request: Request): RuntimeSessionScheduler => {
	const scheduler = request.app.locals.runtimeSessionScheduler as RuntimeSessionScheduler | undefined;

	if (scheduler !== undefined) {
		return scheduler;
	}

	throw new Error('Runtime session scheduler is not initialized.');
};