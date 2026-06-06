import type { Response } from 'express';

import type { SchemaIssue, ValidationResult } from '../../domain/base';

export type ApiSuccessResponse<TData> = {
	readonly ok: true;
	readonly data: TData;
};

export type ApiErrorBody = {
	readonly code: string;
	readonly message: string;
	readonly issues?: readonly SchemaIssue[];
};

export type ApiErrorResponse = {
	readonly ok: false;
	readonly error: ApiErrorBody;
};

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;

type ValidationFailureOptions = {
	readonly status?: number;
	readonly code?: string;
	readonly message?: string;
};

const createIssueError = (issues: readonly SchemaIssue[]): { readonly status: number; readonly error: ApiErrorBody } => {
	const issueCodes = new Set(issues.map((issue) => issue.code));

	if (issueCodes.has('file_missing')) {
		return {
			status: 404,
			error: {
				code: 'not_found',
				message: 'Requested resource was not found.',
				issues,
			},
		};
	}

	if (issueCodes.has('file_conflict')) {
		return {
			status: 409,
			error: {
				code: 'conflict',
				message: 'Requested resource conflicts with existing state.',
				issues,
			},
		};
	}

	return {
		status: 400,
		error: {
			code: 'validation_failed',
			message: 'Request validation failed.',
			issues,
		},
	};
};

export const sendData = <TData>(response: Response, data: TData, status = 200): void => {
	response.status(status).json({ ok: true, data } satisfies ApiSuccessResponse<TData>);
};

export const sendErrorResponse = (response: Response, status: number, error: ApiErrorBody): void => {
	response.status(status).json({ ok: false, error } satisfies ApiErrorResponse);
};

export const sendValidationResult = <TValue>(
	response: Response,
	result: ValidationResult<TValue>,
	options: ValidationFailureOptions = {},
): void => {
	if (result.ok) {
		sendData(response, result.value);
		return;
	}

	const derivedFailure = createIssueError(result.issues);

	sendErrorResponse(response, options.status ?? derivedFailure.status, {
		code: options.code ?? derivedFailure.error.code,
		message: options.message ?? derivedFailure.error.message,
		issues: result.issues,
	});
};