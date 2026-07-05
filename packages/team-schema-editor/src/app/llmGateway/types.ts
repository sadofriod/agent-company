import type { AgentLlmDocument } from '../../editor/model/types';
import { LLM_API_FORMAT, type AgentLlmApiFormat } from '@agents-team/service/domain/organization';

export type LlmProviderAuthMode = 'none' | 'bearer';

export type LlmProviderAdapter = {
  provider: string;
  displayName: string;
  description: string;
  defaultApiFormat: AgentLlmApiFormat;
  defaultBaseUrl: string;
  defaultModel?: string;
  authMode: LlmProviderAuthMode;
  modelDiscoveryPaths: readonly string[];
};

const buildProviderAdapter = (adapter: LlmProviderAdapter): LlmProviderAdapter => adapter;

export const LLM_PROVIDER_ADAPTERS: readonly LlmProviderAdapter[] = [
  buildProviderAdapter({
    provider: 'deepseek',
    displayName: 'DeepSeek',
    description: 'OpenAI-compatible API (base_url: https://api.deepseek.com, GET /models).',
    defaultApiFormat: LLM_API_FORMAT.OpenAIChat,
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-v4-flash',
    authMode: 'bearer',
    modelDiscoveryPaths: ['./models'],
  }),
  buildProviderAdapter({
    provider: 'lmstudio',
    displayName: 'LM Studio',
    description: 'Local OpenAI-compatible server (default: http://localhost:1234/v1, GET /v1/models).',
    defaultApiFormat: LLM_API_FORMAT.OpenAIChat,
    defaultBaseUrl: 'http://localhost:1234/v1',
    authMode: 'none',
    modelDiscoveryPaths: ['./models'],
  }),
];

const normalizeProviderKey = (provider: string): string => provider.trim().toLowerCase();

const apiFormatSet = new Set<AgentLlmApiFormat>(Object.values(LLM_API_FORMAT));

export const isAgentLlmApiFormat = (value: string): value is AgentLlmApiFormat =>
  apiFormatSet.has(value as AgentLlmApiFormat);

export const findLlmProviderAdapter = (provider: string): LlmProviderAdapter | undefined => {
  const key = normalizeProviderKey(provider);
  if (key.length === 0) {
    return undefined;
  }

  return LLM_PROVIDER_ADAPTERS.find((adapter) => normalizeProviderKey(adapter.provider) === key);
};

export type LlmGatewayConfig = {
  id: string;
  name: string;
  provider: string;
  model: string;
  apiFormat?: AgentLlmApiFormat;
  baseUrl?: string;
  apiKey?: string;
  createdAt: string;
  updatedAt: string;
};

export type LlmGatewayDraft = {
  name: string;
  provider: string;
  model: string;
  apiFormat: AgentLlmApiFormat | '';
  baseUrl: string;
  apiKey: string;
};

export const createEmptyLlmGatewayDraft = (): LlmGatewayDraft => ({
  name: '',
  provider: '',
  model: '',
  apiFormat: '',
  baseUrl: '',
  apiKey: '',
});

export const createAgentLlmDocumentFromGateway = (gateway: LlmGatewayConfig): AgentLlmDocument => ({
  provider: gateway.provider,
  model: gateway.model,
  ...(gateway.apiFormat === undefined ? {} : { api_format: gateway.apiFormat }),
  ...(gateway.baseUrl === undefined ? {} : { base_url: gateway.baseUrl }),
  ...(gateway.apiKey === undefined ? {} : { headers: { Authorization: `Bearer ${gateway.apiKey}` } }),
});
