import express, { type Request, type Response } from 'express';

import { createAgentAssemblyFactory } from './agent/createAgentAssemblyFactory';
import type { AgentAssembly, AgentAssemblyBundle } from './agent/types';
import type { RuntimePlan } from './domain/runtime';
import { createRuntimePlan } from './runtime/createRuntimePlan';
import { loadTeamSchema } from './schema/loadTeamSchema';

const DEFAULT_PORT = 3000;

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

const serializeRuntimePlan = (runtimePlan: RuntimePlan) => ({
	team: runtimePlan.team,
	departments: [...runtimePlan.departmentsById.values()],
	agents: [...runtimePlan.agentsById.values()],
	discussionPolicy: runtimePlan.discussionPolicy,
	pipelinePolicy: runtimePlan.pipelinePolicy,
	memoryPolicy: runtimePlan.memoryPolicy,
	reviewPolicy: runtimePlan.reviewPolicy,
});

const serializeAgentAssembly = (agentAssembly: AgentAssembly) => ({
	agentId: agentAssembly.agentId,
	teamId: agentAssembly.teamId,
	departmentId: agentAssembly.departmentId,
	role: agentAssembly.role,
	model: agentAssembly.model,
	description: agentAssembly.description,
	inputContract: agentAssembly.inputContract,
	outputContract: agentAssembly.outputContract,
	responsibilities: agentAssembly.responsibilities,
	department: agentAssembly.department,
	definition: agentAssembly.definition,
	metadata: agentAssembly.metadata,
	memoryProfile: agentAssembly.memoryProfile,
	capabilities: agentAssembly.capabilities,
});

const serializeAgentAssemblyBundle = (bundle: AgentAssemblyBundle) => ({
	teamId: bundle.teamId,
	agents: bundle.agents.map(serializeAgentAssembly),
});

const createApp = (): express.Express => {
	const app = express();

	app.use(express.json({ limit: '1mb' }));

	app.get('/health', (_request: Request, response: Response) => {
		response.json({ ok: true });
	});

	app.post('/team/validate', (request: Request, response: Response) => {
		const validation = loadTeamSchema(request.body);

		if (!validation.ok) {
			response.status(400).json(validation);
			return;
		}

		response.json({ ok: true, team: validation.value });
	});

	app.post('/runtime-plan', (request: Request, response: Response) => {
		const validation = loadTeamSchema(request.body);

		if (!validation.ok) {
			response.status(400).json(validation);
			return;
		}

		const runtimePlan = createRuntimePlan(validation.value);
		const assemblyFactory = createAgentAssemblyFactory(runtimePlan);

		response.json({
			ok: true,
			runtimePlan: serializeRuntimePlan(runtimePlan),
			agentAssembly: serializeAgentAssemblyBundle(assemblyFactory.assembleAll()),
		});
	});

	app.use((error: unknown, _request: Request, response: Response, _next: express.NextFunction) => {
		const message = error instanceof Error ? error.message : 'Unexpected server error.';

		response.status(500).json({
			ok: false,
			message,
		});
	});

	return app;
};

const app = createApp();
const port = parsePort(process.env.PORT);

app.listen(port, () => {
	console.log(`agents-team service listening on port ${port}`);
});

export { createApp };