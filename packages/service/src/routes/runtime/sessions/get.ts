/**
 * GET /runtime/sessions
 *
 * Returns a paginated list of runtime session snapshots.
 *
 * Query parameters:
 *   status   - filter by session status ('running' | 'paused' | 'terminated' | 'completed')
 *   cursor   - opaque cursor (sessionId) for next-page navigation
 *   limit    - page size (1–100, default 20)
 */
import type { RequestHandler } from 'express';

import { sendData } from '../../_shared/response';
import { resolveRuntimeSessionScheduler } from '../../_shared/runtimeSession';
import { buildRuntimeSessionPayload } from '../../../runtime/buildRuntimeSessionPayload';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const handler: RequestHandler = async (request, response): Promise<void> => {
	const rawLimit = Number(request.query.limit ?? DEFAULT_LIMIT);
	const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;
	const cursor = typeof request.query.cursor === 'string' && request.query.cursor.length > 0
		? request.query.cursor
		: undefined;
	const status = typeof request.query.status === 'string' && request.query.status.length > 0
		? request.query.status
		: undefined;

	const page = await resolveRuntimeSessionScheduler(request).listSessions({ status, cursor, limit });

	sendData(response, {
		items: page.items.map(buildRuntimeSessionPayload),
		nextCursor: page.nextCursor,
		total: page.total,
		limit,
	});
};

export default handler;
