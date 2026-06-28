export const CAPABILITY_CATALOG_KIND = {
  McpServers: 'mcp_servers',
  Tools: 'tools',
  Skills: 'skills',
} as const;

export type CapabilityCatalogKind = typeof CAPABILITY_CATALOG_KIND[keyof typeof CAPABILITY_CATALOG_KIND];

export type CapabilityCatalogConfig = {
  id: string;
  key: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type CapabilityCatalogDraft = {
  key: string;
  name: string;
  description: string;
};

export const createEmptyCapabilityCatalogDraft = (): CapabilityCatalogDraft => ({
  key: '',
  name: '',
  description: '',
});
