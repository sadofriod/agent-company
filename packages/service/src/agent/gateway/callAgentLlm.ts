/**
 * Reusable LLM call helper extracted from agentStepRunner.
 *
 * Accepts a generic AgentGatewayBinding + system/user prompt, returns the
 * LLM response text.  Falls back to a structural placeholder when:
 *   - The gateway's apiFormat is not 'openai_chat'
 *   - The LLM call fails (network error, timeout, etc.)
 */

import type { AgentGatewayBinding } from '../gateway/resolveAgentGatewayBinding';

const DEFAULT_LLM_CALL_TIMEOUT_MS = 120_000;

const resolveApiKey = (gateway: AgentGatewayBinding): string | undefined => {
	const headers = gateway.llm.headers;
	const authorization = headers.Authorization ?? headers.authorization;
	if (typeof authorization === 'string' && authorization.trim().length > 0) return authorization;

	const xApiKey = headers['x-api-key'] ?? headers['X-API-Key'];
	if (typeof xApiKey === 'string' && xApiKey.trim().length > 0) return xApiKey;

	const envName = gateway.llm.apiKeyEnv;
	if (typeof envName === 'string' && envName.trim().length > 0) {
		const envValue = process.env[envName];
		if (typeof envValue === 'string' && envValue.trim().length > 0) return envValue;
	}

	return undefined;
};

const normalizeBaseUrl = (baseUrl: string | undefined): string => {
	const raw = (baseUrl ?? process.env.E2E_LMSTUDIO_BASE_URL ?? 'http://localhost:1234/v1').trim();
	return raw.endsWith('/') ? raw.slice(0, -1) : raw;
};

const resolveChatCompletionsUrl = (baseUrl: string): string =>
	baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

const toAlternativeLmStudioBaseUrls = (baseUrl: string): readonly string[] => {
	try {
		const parsed = new URL(baseUrl);
		if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') return [baseUrl];
		const hostInternal = new URL(baseUrl);
		hostInternal.hostname = 'host.docker.internal';
		return [baseUrl, hostInternal.toString().replace(/\/$/, '')];
	} catch {
		return [baseUrl];
	}
};

const toErrorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : 'Unknown LLM call error.';

export type CallAgentLlmInput = {
	readonly gateway: AgentGatewayBinding;
	readonly systemPrompt: string;
	readonly userPrompt: string;
	readonly fallbackResponse: string;
};

export const callAgentLlm = async (input: CallAgentLlmInput): Promise<string> => {
	const { gateway } = input;

	if (gateway.llm.apiFormat !== 'openai_chat') {
		return input.fallbackResponse;
	}

	const baseUrl = normalizeBaseUrl(gateway.llm.baseUrl);
	const timeoutMs = Number.parseInt(process.env.LLM_CALL_TIMEOUT_MS ?? `${DEFAULT_LLM_CALL_TIMEOUT_MS}`, 10);
	const abortController = new AbortController();
	const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0
		? setTimeout(() => abortController.abort(), timeoutMs)
		: undefined;
	const candidateBaseUrls = gateway.llm.provider === 'lmstudio'
		? toAlternativeLmStudioBaseUrls(baseUrl)
		: [baseUrl];

	try {
		const apiKey = resolveApiKey(gateway);
		const headers: Record<string, string> = {
			'content-type': 'application/json',
			...gateway.llm.headers,
		};
		if (apiKey !== undefined && headers.Authorization === undefined && headers.authorization === undefined) {
			headers.Authorization = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
		}

		const errors: string[] = [];
		for (const candidateBaseUrl of candidateBaseUrls) {
			const url = resolveChatCompletionsUrl(candidateBaseUrl);
			try {
				const response = await fetch(url, {
					method: 'POST',
					headers,
					body: JSON.stringify({
						model: gateway.llm.model,
						temperature: gateway.llm.temperature,
						max_tokens: gateway.llm.maxTokens,
						top_p: gateway.llm.topP,
						messages: [
							{ role: 'system', content: input.systemPrompt },
							{ role: 'user', content: input.userPrompt },
						],
					}),
					signal: abortController.signal,
				});
				const payloadText = await response.text();
				if (!response.ok) throw new Error(`LLM HTTP ${response.status}: ${payloadText}`);
				const payload = JSON.parse(payloadText) as {
					choices?: Array<{ message?: { content?: string } }>;
				};
				const content = payload.choices?.[0]?.message?.content;
				if (typeof content !== 'string' || content.trim().length === 0) {
					throw new Error('LLM response does not contain choices[0].message.content');
				}
				return content.trim();
			} catch (error: unknown) {
				errors.push(`${url}: ${toErrorMessage(error)}`);
			}
		}

		// All candidates failed – return fallback
		return `${input.fallbackResponse} [llm_error: ${errors.join(' | ')}]`;
	} finally {
		if (timeout !== undefined) clearTimeout(timeout);
	}
};
