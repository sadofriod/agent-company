import {
  CAPABILITY_CATALOG_KIND,
  createEmptyCapabilityCatalogDraft,
  type CapabilityCatalogConfig,
  type CapabilityCatalogDraft,
  type CapabilityCatalogKind,
} from './types';
import { DEFAULT_CAPABILITY_CATALOGS, TOOL_CATALOG_INCREMENTAL_DEFAULT_KEYS } from '../defaultCatalogs';

const STORAGE_KEY_BY_KIND: Record<CapabilityCatalogKind, string> = {
  [CAPABILITY_CATALOG_KIND.McpServers]: 'agents-team.catalog.mcp-servers.v1',
  [CAPABILITY_CATALOG_KIND.Tools]: 'agents-team.catalog.tools.v1',
  [CAPABILITY_CATALOG_KIND.Skills]: 'agents-team.catalog.skills.v1',
};

export const CAPABILITY_CATALOG_STORAGE_EVENT = 'agents-team:capability-catalog-updated';

const canUseLocalStorage = (): boolean => typeof window !== 'undefined' && window.localStorage !== undefined;

const normalizeOptional = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const normalizeCatalogKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const incrementalToolCatalogKeySet = new Set<string>(TOOL_CATALOG_INCREMENTAL_DEFAULT_KEYS);

const appendMissingIncrementalToolDefaults = (configs: readonly CapabilityCatalogConfig[]): CapabilityCatalogConfig[] => {
  const existingIds = new Set(configs.map((item) => item.id));
  const existingKeys = new Set(configs.map((item) => item.key));
  const nextConfigs = [...configs];

  for (const defaultConfig of DEFAULT_CAPABILITY_CATALOGS[CAPABILITY_CATALOG_KIND.Tools]) {
    if (!incrementalToolCatalogKeySet.has(defaultConfig.key)) {
      continue;
    }

    if (existingIds.has(defaultConfig.id) || existingKeys.has(defaultConfig.key)) {
      continue;
    }

    nextConfigs.push(defaultConfig);
  }

  return nextConfigs;
};

const readRawConfigs = (kind: CapabilityCatalogKind): CapabilityCatalogConfig[] => {
  if (!canUseLocalStorage()) {
    return [];
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY_BY_KIND[kind]);
  if (rawValue === null) {
    return [...DEFAULT_CAPABILITY_CATALOGS[kind]];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const configs: CapabilityCatalogConfig[] = [];
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) {
        continue;
      }

      const id = typeof item.id === 'string' ? item.id : '';
      const rawKey = typeof item.key === 'string' ? item.key : '';
      const rawName = typeof item.name === 'string' ? item.name : '';
      const createdAt = typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString();
      const updatedAt = typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString();
      const key = normalizeCatalogKey(rawKey);
      const name = rawName.trim();

      if (id.length === 0 || key.length === 0 || name.length === 0) {
        continue;
      }

      configs.push({
        id,
        key,
        name,
        ...(typeof item.description === 'string' && item.description.trim().length > 0
          ? { description: item.description.trim() }
          : {}),
        createdAt,
        updatedAt,
      });
    }

    return kind === CAPABILITY_CATALOG_KIND.Tools ? appendMissingIncrementalToolDefaults(configs) : configs;
  } catch {
    return [];
  }
};

const writeConfigs = (kind: CapabilityCatalogKind, configs: readonly CapabilityCatalogConfig[]): void => {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY_BY_KIND[kind], JSON.stringify(configs));
  window.dispatchEvent(new CustomEvent(CAPABILITY_CATALOG_STORAGE_EVENT, { detail: { kind } }));
};

const createCatalogId = (kind: CapabilityCatalogKind): string =>
  `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createDefaultCapabilityCatalogDraft = createEmptyCapabilityCatalogDraft;

export const createDraftFromCapabilityCatalog = (config: CapabilityCatalogConfig): CapabilityCatalogDraft => ({
  key: config.key,
  name: config.name,
  description: config.description ?? '',
});

export const normalizeCapabilityCatalogDraft = (draft: CapabilityCatalogDraft): CapabilityCatalogDraft => ({
  key: normalizeCatalogKey(draft.key),
  name: draft.name.trim(),
  description: draft.description.trim(),
});

export const listCapabilityCatalogConfigs = (kind: CapabilityCatalogKind): CapabilityCatalogConfig[] =>
  readRawConfigs(kind).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

export const saveCapabilityCatalogConfig = (
  kind: CapabilityCatalogKind,
  draft: CapabilityCatalogDraft,
  id?: string,
): CapabilityCatalogConfig => {
  const normalized = normalizeCapabilityCatalogDraft(draft);
  const now = new Date().toISOString();
  const current = readRawConfigs(kind);
  const existing = id === undefined ? undefined : current.find((item) => item.id === id);
  const key = normalized.key.length > 0 ? normalized.key : normalizeCatalogKey(normalized.name);

  const nextRecord: CapabilityCatalogConfig = {
    id: existing?.id ?? createCatalogId(kind),
    key,
    name: normalized.name.length > 0 ? normalized.name : key,
    ...(normalizeOptional(normalized.description) === undefined ? {} : { description: normalizeOptional(normalized.description) }),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const nextConfigs = existing === undefined
    ? [nextRecord, ...current]
    : current.map((item) => (item.id === existing.id ? nextRecord : item));

  writeConfigs(kind, nextConfigs);
  return nextRecord;
};

export const deleteCapabilityCatalogConfig = (kind: CapabilityCatalogKind, id: string): void => {
  const nextConfigs = readRawConfigs(kind).filter((item) => item.id !== id);
  writeConfigs(kind, nextConfigs);
};
