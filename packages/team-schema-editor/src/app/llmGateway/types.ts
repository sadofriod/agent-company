import type { AgentLlmDocument } from '../../editor/model/types';

export type LlmGatewayConfig = {
  id: string;
  name: string;
  provider: string;
  model: string;
  apiFormat?: string;
  baseUrl?: string;
  apiKeyEnv?: string;
  createdAt: string;
  updatedAt: string;
};

export type LlmGatewayDraft = {
  name: string;
  provider: string;
  model: string;
  apiFormat: string;
  baseUrl: string;
  apiKeyEnv: string;
};

export const createEmptyLlmGatewayDraft = (): LlmGatewayDraft => ({
  name: '',
  provider: '',
  model: '',
  apiFormat: '',
  baseUrl: '',
  apiKeyEnv: '',
});

export const createAgentLlmDocumentFromGateway = (gateway: LlmGatewayConfig): AgentLlmDocument => ({
  provider: gateway.provider,
  model: gateway.model,
  ...(gateway.apiFormat === undefined ? {} : { api_format: gateway.apiFormat }),
  ...(gateway.baseUrl === undefined ? {} : { base_url: gateway.baseUrl }),
  ...(gateway.apiKeyEnv === undefined ? {} : { api_key_env: gateway.apiKeyEnv }),
});
