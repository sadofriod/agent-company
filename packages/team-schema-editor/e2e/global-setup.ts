import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { FullConfig } from '@playwright/test';

const STORAGE_KEY = 'agents-team.llm-gateways.v1';
const STORAGE_STATE_PATH = './e2e/.auth/lmstudio-storage-state.json';

type StorageState = {
  cookies: Array<Record<string, unknown>>;
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
};

const normalizeBaseUrl = (config: FullConfig): string => {
  const configured = process.env.E2E_BASE_URL ?? config.projects[0]?.use?.baseURL ?? 'http://localhost:5173';
  const url = new URL(configured);
  return url.origin;
};

const buildLmStudioGatewayEntry = (): Record<string, unknown> => {
  const now = new Date().toISOString();
  const provider = process.env.E2E_LMSTUDIO_PROVIDER?.trim() || 'lmstudio';
  const model = process.env.E2E_LMSTUDIO_MODEL?.trim() || 'google/gemma-4-12b';
  const apiFormat = process.env.E2E_LMSTUDIO_API_FORMAT?.trim() || 'openai_chat';
  const baseUrl = process.env.E2E_LMSTUDIO_BASE_URL?.trim() || 'http://localhost:1234/v1';
  const apiKey = process.env.E2E_LMSTUDIO_API_KEY?.trim() || '';

  return {
    id: 'gateway-e2e-lmstudio',
    name: process.env.E2E_LMSTUDIO_NAME?.trim() || 'E2E LM Studio',
    provider,
    model,
    apiFormat,
    baseUrl,
    ...(apiKey.length === 0 ? {} : { apiKey }),
    createdAt: now,
    updatedAt: now,
  };
};

const buildStorageState = (origin: string): StorageState => {
  const gatewayList = [buildLmStudioGatewayEntry()];

  return {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          {
            name: STORAGE_KEY,
            value: JSON.stringify(gatewayList),
          },
        ],
      },
    ],
  };
};

const globalSetup = async (config: FullConfig): Promise<void> => {
  const outputPath = resolve(process.cwd(), STORAGE_STATE_PATH);
  const storageState = buildStorageState(normalizeBaseUrl(config));

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(storageState, null, 2), 'utf8');
};

export default globalSetup;