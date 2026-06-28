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
  createDefaultCapabilityCatalogDraft,
  createDraftFromCapabilityCatalog,
  deleteCapabilityCatalogConfig,
  listCapabilityCatalogConfigs,
  normalizeCapabilityCatalogDraft,
  saveCapabilityCatalogConfig,
} from '../capabilityCatalog/storage';
import type { CapabilityCatalogDraft, CapabilityCatalogKind } from '../capabilityCatalog/types';

type CapabilityManagementPageProps = {
  kind: CapabilityCatalogKind;
  title: string;
  subtitle: string;
};

const updateDraftField = (
  draft: CapabilityCatalogDraft,
  field: keyof CapabilityCatalogDraft,
  value: string,
): CapabilityCatalogDraft => ({ ...draft, [field]: value });

const slugifyKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const CapabilityManagementPage = ({ kind, title, subtitle }: CapabilityManagementPageProps): ReactElement => {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => listCapabilityCatalogConfigs(kind));
  const [draft, setDraft] = useState<CapabilityCatalogDraft>(createDefaultCapabilityCatalogDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(listCapabilityCatalogConfigs(kind));
  }, [kind]);

  const reload = (): void => {
    setItems(listCapabilityCatalogConfigs(kind));
  };

  const handleDraftChange = (field: keyof CapabilityCatalogDraft) => (event: ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;

    if (field === 'name') {
      setDraft((current) => {
        if (current.key.trim().length > 0) {
          return updateDraftField(current, field, value);
        }

        return {
          ...updateDraftField(current, field, value),
          key: slugifyKey(value),
        };
      });
      return;
    }

    setDraft((current) => updateDraftField(current, field, value));
  };

  const resetDraft = (): void => {
    setDraft(createDefaultCapabilityCatalogDraft());
    setEditingId(null);
  };

  const submitLabel = editingId === null ? 'Add Item' : 'Save Item';
  const normalizedDraft = useMemo(() => normalizeCapabilityCatalogDraft(draft), [draft]);
  const isSubmitDisabled = normalizedDraft.key.length === 0 || normalizedDraft.name.length === 0;

  const submit = (): void => {
    const nextDraft = normalizeCapabilityCatalogDraft(draft);

    if (nextDraft.key.length === 0 || nextDraft.name.length === 0) {
      setError('Key and name are required.');
      return;
    }

    saveCapabilityCatalogConfig(kind, nextDraft, editingId ?? undefined);
    setError(null);
    setItems(listCapabilityCatalogConfigs(kind));
    resetDraft();
  };

  const edit = (id: string): void => {
    const target = items.find((item) => item.id === id);
    if (target === undefined) {
      return;
    }

    setEditingId(target.id);
    setDraft(createDraftFromCapabilityCatalog(target));
    setError(null);
  };

  const remove = (id: string): void => {
    deleteCapabilityCatalogConfig(kind, id);
    setItems(listCapabilityCatalogConfigs(kind));
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
                Capability Catalog
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 850 }}>
              {title}
            </Typography>
            <Typography color="text.secondary">
              {subtitle}
            </Typography>
          </Stack>

          <Button variant="outlined" color="secondary" startIcon={<RefreshCw size={16} />} onClick={reload}>
            Refresh
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2.25 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">{editingId === null ? 'Add New Item' : 'Edit Item'}</Typography>
          {error === null ? null : <Alert severity="error">{error}</Alert>}
          <TextField label="Name" value={draft.name} onChange={handleDraftChange('name')} required />
          <TextField
            label="Key"
            value={draft.key}
            onChange={handleDraftChange('key')}
            required
            placeholder="snake_case_or-kebab-case"
            helperText="This key will be used in workflow dropdown selections."
          />
          <TextField label="Description" value={draft.description} onChange={handleDraftChange('description')} multiline minRows={3} />

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
          <Typography variant="h6">Configured Items</Typography>
          <List dense sx={{ display: 'grid', gap: 1, p: 0 }}>
            {items.map((item) => (
              <ListItem
                key={item.id}
                sx={{ border: '1px solid #d7dde5', borderRadius: 1, bgcolor: '#ffffff', alignItems: 'flex-start' }}
                secondaryAction={(
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton color="secondary" aria-label={`Edit ${item.name}`} onClick={() => edit(item.id)}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton color="error" aria-label={`Delete ${item.name}`} onClick={() => remove(item.id)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </Box>
                )}
              >
                <ListItemText
                  primary={`${item.name} (${item.key})`}
                  secondary={item.description ?? ''}
                  slotProps={{
                    primary: { sx: { fontWeight: 850 } },
                    secondary: { sx: { fontSize: '0.82rem' } },
                  }}
                />
              </ListItem>
            ))}
          </List>
          {items.length === 0 ? (
            <Typography color="text.secondary">No configured items yet.</Typography>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );
};
