import type { Request, Response } from 'express';

import type { RuntimeEvent } from '../../domain/runtimeEvent';

const CACHE_CONTROL_HEADER = 'no-cache, no-transform';
const KEEP_ALIVE_HEADER = 'keep-alive';

export const openSseStream = (response: Response): void => {
	response.status(200);
	response.setHeader('Content-Type', 'text/event-stream');
	response.setHeader('Cache-Control', CACHE_CONTROL_HEADER);
	response.setHeader('Connection', KEEP_ALIVE_HEADER);
	response.setHeader('X-Accel-Buffering', 'no');
	response.flushHeaders();
};

export const getLastEventId = (request: Request): string | undefined => {
	const value = request.header('Last-Event-ID');

	return value === undefined || value.length === 0 ? undefined : value;
};

export const writeSseEvent = (response: Response, event: RuntimeEvent): void => {
	response.write(`id: ${event.eventId}\n`);
	response.write(`event: ${event.eventType}\n`);
	response.write(`data: ${JSON.stringify(event)}\n\n`);
};

export const writeSseHeartbeat = (response: Response): void => {
	response.write('event: heartbeat\n');
	response.write(`data: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`);
};
