import {
  createEmptyLlmGatewayDraft,
  isAgentLlmApiFormat,
  type LlmGatewayConfig,
  type LlmGatewayDraft,
} from './types';

const STORAGE_KEY = 'agents-team.llm-gateways.v1';

export const LLM_GATEWAY_STORAGE_EVENT = 'agents-team:llm-gateways-updated';

const canUseLocalStorage = (): boolean => typeof window !== 'undefined' && window.localStorage !== undefined;

const normalizeOptional = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const readRawConfigs = (): LlmGatewayConfig[] => {
  if (!canUseLocalStorage()) {
    return [];
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (rawValue === null) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const configs: LlmGatewayConfig[] = [];
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) {
        continue;
      }

      const id = typeof item.id === 'string' ? item.id : '';
      const name = typeof item.name === 'string' ? item.name : '';
      const provider = typeof item.provider === 'string' ? item.provider : '';
      const model = typeof item.model === 'string' ? item.model : '';
      const createdAt = typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString();
      const updatedAt = typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString();

      if (id.length === 0 || provider.length === 0 || model.length === 0) {
        continue;
      }

      const apiFormat = typeof item.apiFormat === 'string' && isAgentLlmApiFormat(item.apiFormat.trim())
        ? item.apiFormat.trim()
        : undefined;

      configs.push({
        id,
        name: name.length === 0 ? provider : name,
        provider,
        model,
        ...(apiFormat === undefined ? {} : { apiFormat }),
        ...(typeof item.baseUrl === 'string' && item.baseUrl.trim().length > 0 ? { baseUrl: item.baseUrl.trim() } : {}),
        ...(typeof item.apiKey === 'string' && item.apiKey.trim().length > 0
          ? { apiKey: item.apiKey.trim() }
          : (typeof item.apiKeyEnv === 'string' && item.apiKeyEnv.trim().length > 0 ? { apiKey: item.apiKeyEnv.trim() } : {})),
        createdAt,
        updatedAt,
      });
    }

    return configs;
  } catch {
    return [];
  }
};

const writeConfigs = (configs: readonly LlmGatewayConfig[]): void => {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  window.dispatchEvent(new CustomEvent(LLM_GATEWAY_STORAGE_EVENT));
};

const createGatewayId = (): string => `gateway-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const listLlmGatewayConfigs = (): LlmGatewayConfig[] =>
  readRawConfigs().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

export const createDraftFromGateway = (gateway: LlmGatewayConfig): LlmGatewayDraft => ({
  name: gateway.name,
  provider: gateway.provider,
  model: gateway.model,
  apiFormat: gateway.apiFormat ?? '',
  baseUrl: gateway.baseUrl ?? '',
  apiKey: gateway.apiKey ?? '',
});

export const normalizeGatewayDraft = (draft: LlmGatewayDraft): LlmGatewayDraft => {
  const trimmedApiFormat = draft.apiFormat.trim();

  return {
    name: draft.name.trim(),
    provider: draft.provider.trim(),
    model: draft.model.trim(),
    apiFormat: isAgentLlmApiFormat(trimmedApiFormat) ? trimmedApiFormat : '',
    baseUrl: draft.baseUrl.trim(),
    apiKey: draft.apiKey.trim(),
  };
};

export const saveLlmGatewayConfig = (draft: LlmGatewayDraft, id?: string): LlmGatewayConfig => {
  const normalized = normalizeGatewayDraft(draft);
  const now = new Date().toISOString();
  const current = readRawConfigs();
  const existing = id === undefined ? undefined : current.find((item) => item.id === id);

  const nextRecord: LlmGatewayConfig = {
    id: existing?.id ?? createGatewayId(),
    name: normalized.name.length > 0 ? normalized.name : normalized.provider,
    provider: normalized.provider,
    model: normalized.model,
    ...(normalizeOptional(normalized.apiFormat) !== undefined && isAgentLlmApiFormat(normalized.apiFormat)
      ? { apiFormat: normalized.apiFormat }
      : {}),
    ...(normalizeOptional(normalized.baseUrl) === undefined ? {} : { baseUrl: normalizeOptional(normalized.baseUrl) }),
    ...(normalizeOptional(normalized.apiKey) === undefined ? {} : { apiKey: normalizeOptional(normalized.apiKey) }),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const nextConfigs = existing === undefined
    ? [nextRecord, ...current]
    : current.map((item) => (item.id === existing.id ? nextRecord : item));

  writeConfigs(nextConfigs);
  return nextRecord;
};

export const deleteLlmGatewayConfig = (id: string): void => {
  const nextConfigs = readRawConfigs().filter((item) => item.id !== id);
  writeConfigs(nextConfigs);
};

export const createDefaultLlmGatewayDraft = createEmptyLlmGatewayDraft;
