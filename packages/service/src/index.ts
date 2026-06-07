import 'dotenv/config';

import express from 'express';

import type { AgentMarkdownAdapter } from './adapter/agentMarkdownAdapter';
import { createAgentMarkdownAdapter } from './adapter/createAgentMarkdownAdapter';
import type { RuntimeSessionScheduler } from './runtime/runtimeSessionScheduler';
import { createRuntimeSessionScheduler } from './runtime/runtimeSessionScheduler';
import { registerFileRoutes } from './routes';

const DEFAULT_PORT = 3000;

type CreateAppOptions = {
	readonly agentsDirectory?: string;
	readonly agentMarkdownAdapter?: AgentMarkdownAdapter;
	readonly runtimeSessionScheduler?: RuntimeSessionScheduler;
	readonly routesDirectory?: string;
};

const parsePort = (value: string | undefined): number => {
	if (value === undefined) {
		return DEFAULT_PORT;
	}

	const port = Number.parseInt(value, 10);

	if (!Number.isInteger(port) || port <= 0) {
		return DEFAULT_PORT;
	}

	return port;
};
const createApp = async (options: CreateAppOptions = {}): Promise<express.Express> => {
	const app = express();
	app.locals.agentMarkdownAdapter =
		options.agentMarkdownAdapter ?? createAgentMarkdownAdapter({ agentsDirectory: options.agentsDirectory });
	app.locals.runtimeSessionScheduler =
		options.runtimeSessionScheduler ?? createRuntimeSessionScheduler();

	app.use(express.json({ limit: '1mb' }));
	await registerFileRoutes(app, {
		routesDirectory: options.routesDirectory,
		moduleUrl: new URL('./routes/', import.meta.url).href,
	});

	return app;
};

const startServer = async (): Promise<void> => {
	const app = await createApp();
	const port = parsePort(process.env.PORT);

	app.listen(port, () => {
		console.log(`agents-team service listening on port ${port}`);
	});
};

void startServer().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : 'Unexpected server startup error.';

	console.error(message);
	process.exitCode = 1;
});

export { createApp };