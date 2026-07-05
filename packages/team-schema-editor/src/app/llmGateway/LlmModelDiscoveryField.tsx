import { useMemo, useState, type ReactElement } from 'react';
import { Alert, Box, Button, MenuItem, Stack, TextField } from '@mui/material';
import { RefreshCw } from 'lucide-react';
import { findLlmProviderAdapter } from './types';

type LlmModelDiscoveryFieldProps = {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  onModelChange: (model: string) => void;
};

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null;

const toModelName = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (!isRecord(value)) {
    return null;
  }

  const candidates = [value.id, value.name, value.model];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
};

const toModelList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const models: string[] = [];
  for (const entry of value) {
    const name = toModelName(entry);
    if (name !== null) {
      models.push(name);
    }
  }

  return models;
};

const parseModelResponse = (payload: unknown): string[] => {
  if (!isRecord(payload)) {
    return [];
  }

  const nestedResult = isRecord(payload.result) ? payload.result : null;
  const sources: unknown[] = [payload.data, payload.models, payload.tags, nestedResult?.models];

  for (const source of sources) {
    const models = toModelList(source);
    if (models.length > 0) {
      return models;
    }
  }

  return [];
};

const normalizeBaseUrl = (baseUrl: string): string => baseUrl.trim().replace(/\/+$/, '');

const tryCreateUrl = (base: string, relativePath: string): string | null => {
  try {
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return new URL(relativePath, normalizedBase).toString();
  } catch {
    return null;
  }
};

const createCandidateModelEndpoints = (baseUrl: string, customPaths: readonly string[] = []): string[] => {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  if (normalizedBase.length === 0) {
    return [];
  }

  const defaultCandidates = ['./models', './v1/models', './api/tags'];
  const candidatePaths = customPaths.length === 0
    ? defaultCandidates
    : [...customPaths, ...defaultCandidates.filter((path) => !customPaths.includes(path))];
  const candidates = candidatePaths.map((path) => tryCreateUrl(normalizedBase, path));

  const uniqueCandidates: string[] = [];
  for (const candidate of candidates) {
    if (candidate !== null && !uniqueCandidates.includes(candidate)) {
      uniqueCandidates.push(candidate);
    }
  }

  return uniqueCandidates;
};

const createHeaders = (apiKey: string, authMode: 'none' | 'bearer'): Record<string, string> => {
  if (authMode === 'none') {
    return { Accept: 'application/json' };
  }

  return {
    Accept: 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'x-api-key': apiKey,
  };
};

const createModelOptions = (models: readonly string[]): ReactElement[] => {
  const options: ReactElement[] = [
    <MenuItem key="manual" value="">
      Keep manual input
    </MenuItem>,
  ];

  for (const modelName of models) {
    options.push(
      <MenuItem key={modelName} value={modelName}>
        {modelName}
      </MenuItem>,
    );
  }

  return options;
};

export const LlmModelDiscoveryField = ({
  provider,
  baseUrl,
  apiKey,
  model,
  onModelChange,
}: LlmModelDiscoveryFieldProps): ReactElement => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<readonly string[]>([]);
  const providerAdapter = useMemo(() => findLlmProviderAdapter(provider), [provider]);
  const endpointCandidates = useMemo(
    () => createCandidateModelEndpoints(baseUrl, providerAdapter?.modelDiscoveryPaths),
    [baseUrl, providerAdapter],
  );

  const discoverModels = async (): Promise<void> => {
    if (endpointCandidates.length === 0) {
      setError('Please enter a valid Base URL first.');
      return;
    }

    const authMode = providerAdapter?.authMode ?? 'bearer';
    if (authMode === 'bearer' && apiKey.trim().length === 0) {
      setError('Please enter API Key first.');
      return;
    }

    setLoading(true);
    setError(null);

    let discoveredModels: string[] = [];

    for (const endpoint of endpointCandidates) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: createHeaders(apiKey.trim(), authMode),
        });

        if (!response.ok) {
          continue;
        }

        const payload = (await response.json()) as unknown;
        discoveredModels = parseModelResponse(payload);
        if (discoveredModels.length > 0) {
          break;
        }
      } catch {
        continue;
      }
    }

    if (discoveredModels.length === 0) {
      setModels([]);
      setError('No models were discovered from this Base URL. Please verify endpoint compatibility and API key.');
      setLoading(false);
      return;
    }

    setModels(discoveredModels);
    setLoading(false);

    if (model.trim().length === 0) {
      const firstModel = discoveredModels[0];
      if (firstModel !== undefined) {
        onModelChange(firstModel);
      }
    }
  };

  const modelOptions = createModelOptions(models);

  return (
    <Stack spacing={1}>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<RefreshCw size={16} />}
          onClick={() => {
            void discoverModels();
          }}
          disabled={loading}
        >
          {loading ? 'Loading Models...' : 'Load Models from Base URL'}
        </Button>
      </Box>

      <TextField
        select
        label="Discovered Models"
        value=""
        onChange={(event) => {
          if (event.target.value.length > 0) {
            onModelChange(event.target.value);
          }
        }}
        helperText={models.length === 0 ? 'No discovered models yet. You can keep typing model manually.' : `${models.length} model(s) discovered.`}
      >
        {modelOptions}
      </TextField>

      {error === null ? null : <Alert severity="warning">{error}</Alert>}
    </Stack>
  );
};
