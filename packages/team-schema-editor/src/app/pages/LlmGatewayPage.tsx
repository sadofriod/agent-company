import { useEffect, useMemo, useState, type ChangeEvent, type ReactElement } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowLeft, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  createDefaultLlmGatewayDraft,
  createDraftFromGateway,
  deleteLlmGatewayConfig,
  listLlmGatewayConfigs,
  normalizeGatewayDraft,
  saveLlmGatewayConfig,
} from '../llmGateway/llmGatewayStorage';
import { LLM_PROVIDER_ADAPTERS, findLlmProviderAdapter, type LlmGatewayDraft } from '../llmGateway/types';
import { LlmModelDiscoveryField } from '../llmGateway/LlmModelDiscoveryField';

const updateDraftField = (
  draft: LlmGatewayDraft,
  field: keyof LlmGatewayDraft,
  value: string,
): LlmGatewayDraft => ({ ...draft, [field]: value });

const applyProviderDefaults = (draft: LlmGatewayDraft, provider: string): LlmGatewayDraft => {
  const adapter = findLlmProviderAdapter(provider);
  if (adapter === undefined) {
    return { ...draft, provider };
  }

  return {
    ...draft,
    provider,
    apiFormat: draft.apiFormat.length === 0 ? adapter.defaultApiFormat : draft.apiFormat,
    baseUrl: draft.baseUrl.trim().length === 0 ? adapter.defaultBaseUrl : draft.baseUrl,
    model: draft.model.trim().length === 0 && adapter.defaultModel !== undefined ? adapter.defaultModel : draft.model,
  };
};

export const LlmGatewayPage = (): ReactElement => {
  const navigate = useNavigate();
  const [gateways, setGateways] = useState(() => listLlmGatewayConfigs());
  const [draft, setDraft] = useState<LlmGatewayDraft>(createDefaultLlmGatewayDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setGateways(listLlmGatewayConfigs());
  }, []);

  const reload = (): void => {
    setGateways(listLlmGatewayConfigs());
  };

  const handleDraftChange = (field: keyof LlmGatewayDraft) => (event: ChangeEvent<HTMLInputElement>): void => {
    if (field === 'provider') {
      setDraft((current) => applyProviderDefaults(current, event.target.value));
      return;
    }

    setDraft((current) => updateDraftField(current, field, event.target.value));
  };

  const resetDraft = (): void => {
    setDraft(createDefaultLlmGatewayDraft());
    setEditingId(null);
  };

  const submitLabel = editingId === null ? 'Add LLM API' : 'Save LLM API';
  const normalizedDraft = useMemo(() => normalizeGatewayDraft(draft), [draft]);
  const isSubmitDisabled = normalizedDraft.provider.length === 0 || normalizedDraft.model.length === 0;

  const submit = (): void => {
    const nextDraft = normalizeGatewayDraft(draft);

    if (nextDraft.provider.length === 0 || nextDraft.model.length === 0) {
      setError('Provider and model are required.');
      return;
    }

    saveLlmGatewayConfig(nextDraft, editingId ?? undefined);
    setError(null);
    setGateways(listLlmGatewayConfigs());
    resetDraft();
  };

  const edit = (id: string): void => {
    const target = gateways.find((item) => item.id === id);
    if (target === undefined) {
      return;
    }

    setEditingId(target.id);
    setDraft(createDraftFromGateway(target));
    setError(null);
  };

  const remove = (id: string): void => {
    deleteLlmGatewayConfig(id);
    setGateways(listLlmGatewayConfigs());
    if (editingId === id) {
      resetDraft();
    }
  };

  return (
    <Box component="main" sx={{ minHeight: '100vh', p: { xs: 1.75, md: 3 }, display: 'grid', alignContent: 'start', gap: 2.5 }}>
      <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Stack spacing={0.75}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton color="secondary" onClick={() => navigate(-1)}>
                <ArrowLeft size={16} />
              </IconButton>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0, fontWeight: 850 }}>
                LLM Gateway
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 850 }}>
              LLM API Management
            </Typography>
            <Typography color="text.secondary">
              Configure reusable LLM API entries for workflow node selection.
            </Typography>
          </Stack>

          <Button variant="outlined" color="secondary" startIcon={<RefreshCw size={16} />} onClick={reload}>
            Refresh
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2.25 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">{editingId === null ? 'Add New LLM API' : 'Edit LLM API'}</Typography>
          {error === null ? null : <Alert severity="error">{error}</Alert>}
          <TextField label="Name" value={draft.name} onChange={handleDraftChange('name')} placeholder="Example: OpenAI Production" />
          <TextField
            label="Provider"
            value={draft.provider}
            onChange={handleDraftChange('provider')}
            required
            placeholder="deepseek / lmstudio / custom"
            helperText="Select a default adapter or enter a custom provider."
            slotProps={{
              htmlInput: {
                list: 'llm-provider-options',
              },
            }}
          />
          <datalist id="llm-provider-options">
            {LLM_PROVIDER_ADAPTERS.map((adapter) => (
              <option key={adapter.provider} value={adapter.provider}>
                {adapter.displayName}
              </option>
            ))}
          </datalist>
          <TextField label="Model" value={draft.model} onChange={handleDraftChange('model')} required />
          <TextField label="API Format" value={draft.apiFormat} onChange={handleDraftChange('apiFormat')} placeholder="openai" />
          <TextField label="Base URL" value={draft.baseUrl} onChange={handleDraftChange('baseUrl')} placeholder="https://api.example.com/v1" />
          <TextField
            label="API Key"
            type="password"
            autoComplete="off"
            value={draft.apiKey}
            onChange={handleDraftChange('apiKey')}
            placeholder="sk-..."
          />
          <LlmModelDiscoveryField
            provider={draft.provider}
            baseUrl={draft.baseUrl}
            apiKey={draft.apiKey}
            model={draft.model}
            onModelChange={(nextModel) => {
              setDraft((current) => updateDraftField(current, 'model', nextModel));
            }}
          />

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={submit} disabled={isSubmitDisabled}>
              {submitLabel}
            </Button>
            <Button variant="text" color="secondary" onClick={resetDraft}>
              Reset
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1.25}>
          <Typography variant="h6">Configured LLM APIs</Typography>
          <List dense sx={{ display: 'grid', gap: 1, p: 0 }}>
            {gateways.map((gateway) => (
              <ListItem
                key={gateway.id}
                sx={{ border: '1px solid #d7dde5', borderRadius: 1, bgcolor: '#ffffff', alignItems: 'flex-start' }}
                secondaryAction={(
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton color="secondary" aria-label={`Edit ${gateway.name}`} onClick={() => edit(gateway.id)}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton color="error" aria-label={`Delete ${gateway.name}`} onClick={() => remove(gateway.id)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </Box>
                )}
              >
                <ListItemText
                  primary={gateway.name}
                  secondary={`${gateway.provider} · ${gateway.model}${gateway.baseUrl === undefined ? '' : ` · ${gateway.baseUrl}`}`}
                  slotProps={{
                    primary: { sx: { fontWeight: 850 } },
                    secondary: { sx: { fontSize: '0.82rem' } },
                  }}
                />
              </ListItem>
            ))}
          </List>
          {gateways.length === 0 ? (
            <Typography color="text.secondary">No configured LLM API entries yet.</Typography>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );
};
