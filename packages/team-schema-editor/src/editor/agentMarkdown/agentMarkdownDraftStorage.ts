export type AgentMarkdownDraft = {
  path: string;
  content: string;
  updatedAt: string;
};

const STORAGE_KEY = 'agents-team.agent-markdown-drafts.v1';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAgentMarkdownDraft = (value: unknown): value is AgentMarkdownDraft =>
  isRecord(value)
  && typeof value.path === 'string'
  && typeof value.content === 'string'
  && typeof value.updatedAt === 'string';

const canUseLocalStorage = (): boolean => typeof window !== 'undefined' && window.localStorage !== undefined;

const readDraftIndex = (): Record<string, AgentMarkdownDraft> => {
  if (!canUseLocalStorage()) {
    return {};
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);

  if (rawValue === null) {
    return {};
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);

    if (!isRecord(parsedValue)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue).filter((entry): entry is [string, AgentMarkdownDraft] => isAgentMarkdownDraft(entry[1])),
    );
  } catch {
    return {};
  }
};

const writeDraftIndex = (drafts: Record<string, AgentMarkdownDraft>): void => {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
};

export const listAgentMarkdownDraftPaths = (): string[] =>
  Object.keys(readDraftIndex()).sort((leftPath, rightPath) => leftPath.localeCompare(rightPath));

export const readAgentMarkdownDraft = (path: string): AgentMarkdownDraft | null => readDraftIndex()[path] ?? null;

export const writeAgentMarkdownDraft = (path: string, content: string): AgentMarkdownDraft => {
  const draft = {
    path,
    content,
    updatedAt: new Date().toISOString(),
  };

  writeDraftIndex({ ...readDraftIndex(), [path]: draft });

  return draft;
};

export const removeAgentMarkdownDraft = (path: string): void => {
  const drafts = readDraftIndex();
  const { [path]: _removedDraft, ...remainingDrafts } = drafts;

  writeDraftIndex(remainingDrafts);
};

export const moveAgentMarkdownDraft = (fromPath: string, toPath: string, content: string): AgentMarkdownDraft => {
  const drafts = readDraftIndex();
  const { [fromPath]: _removedDraft, ...remainingDrafts } = drafts;
  const draft = {
    path: toPath,
    content,
    updatedAt: new Date().toISOString(),
  };

  writeDraftIndex({ ...remainingDrafts, [toPath]: draft });

  return draft;
};