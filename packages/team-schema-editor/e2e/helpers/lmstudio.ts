const lmStudioProvider = process.env.E2E_LMSTUDIO_PROVIDER?.trim() || 'lmstudio';
const lmStudioModel = process.env.E2E_LMSTUDIO_MODEL?.trim() || 'google/gemma-4-12b';
const lmStudioApiFormat = process.env.E2E_LMSTUDIO_API_FORMAT?.trim() || 'openai_chat';
const lmStudioBaseUrl = process.env.E2E_LMSTUDIO_BASE_URL?.trim() || 'http://localhost:1234/v1';
const lmStudioApiKey = process.env.E2E_LMSTUDIO_API_KEY?.trim() || '';

type JsonRecord = Record<string, unknown>;

export type LmStudioBinding = {
  readonly provider: string;
  readonly model: string;
  readonly apiFormat: string;
  readonly baseUrl: string;
};

export const lmStudioBinding: LmStudioBinding = {
  provider: lmStudioProvider,
  model: lmStudioModel,
  apiFormat: lmStudioApiFormat,
  baseUrl: lmStudioBaseUrl,
};

export const bindAllAgentsToLmStudio = (fixture: JsonRecord): void => {
  const agents = Array.isArray(fixture.agents) ? fixture.agents as Array<JsonRecord> : [];

  for (const agent of agents) {
    const metadata = typeof agent.metadata === 'object' && agent.metadata !== null
      ? agent.metadata as JsonRecord
      : {};

    metadata.llm = {
      provider: lmStudioBinding.provider,
      model: lmStudioBinding.model,
      api_format: lmStudioBinding.apiFormat,
      base_url: lmStudioBinding.baseUrl,
      ...(lmStudioApiKey.length > 0 ? { headers: { Authorization: `Bearer ${lmStudioApiKey}` } } : {}),
    };
    agent.metadata = metadata;
    agent.model = lmStudioBinding.model;
  }
};