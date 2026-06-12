import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';

import { formatApiErrorMessage } from '../api/shared';
import {
  useDeleteTeamSchemaMutation,
  useGetTeamSchemaQuery,
  useListTeamSchemaRecordsQuery,
  useSaveTeamSchemaMutation,
  useValidateTeamSchemaMutation,
} from '../api/teamSchemaApi';
import type { TeamSchemaDocument, TeamSchemaRecord } from '../model/types';
import { createPendingTeamSchema } from '../state/core/editorShared';
import { schemaLoadFailed, schemaLoadSucceeded, startSchemaLoad } from '../state/core/editorSlice';
import type { AppDispatch } from '../state/core/editorStore';
import type { SchemaServiceStatus, TeamSchemaServiceModel } from './helper/teamEditor.types';

type ServiceState = {
  selectedSchemaKey: string | null;
  draftSchemaKey: string;
  resolvedInitialSchema: boolean;
  schemaServiceStatus: SchemaServiceStatus;
  schemaServiceError: string | null;
  schemaServiceMessage: string | null;
};

const toErrorMessage = (error: unknown): string => formatApiErrorMessage(error, 'Unable to load team schema.');

type RecordsQuery = ReturnType<typeof useListTeamSchemaRecordsQuery>;
type SchemaQuery = ReturnType<typeof useGetTeamSchemaQuery>;

const useServiceState = (): {
  state: ServiceState;
  setState: Dispatch<SetStateAction<ServiceState>>;
} => {
  const [state, setState] = useState<ServiceState>({
    selectedSchemaKey: null,
    draftSchemaKey: 'current',
    resolvedInitialSchema: false,
    schemaServiceStatus: 'idle',
    schemaServiceError: null,
    schemaServiceMessage: null,
  });

  return { state, setState };
};

const useResolveInitialSchema = (
  dispatch: AppDispatch,
  schemaRecords: TeamSchemaRecord[],
  isSuccess: boolean,
  isError: boolean,
  error: unknown,
  state: ServiceState,
  setState: Dispatch<SetStateAction<ServiceState>>,
): void => {
  useEffect(() => {
    if (state.resolvedInitialSchema) {
      return;
    }

    if (isError) {
      dispatch(schemaLoadFailed(toErrorMessage(error)));
      setState((current) => ({ ...current, resolvedInitialSchema: true }));
      return;
    }

    if (!isSuccess) {
      return;
    }

    const preferredKey = schemaRecords.find((record) => record.key === 'current')?.key ?? schemaRecords[0]?.key;

    if (preferredKey === undefined) {
      dispatch(schemaLoadSucceeded(createPendingTeamSchema()));
      setState((current) => ({
        ...current,
        draftSchemaKey: current.draftSchemaKey === 'current' ? 'current' : current.draftSchemaKey,
        resolvedInitialSchema: true,
      }));
      return;
    }

    setState((current) => ({
      ...current,
      selectedSchemaKey: preferredKey,
      draftSchemaKey: current.draftSchemaKey === 'current' ? preferredKey : current.draftSchemaKey,
      resolvedInitialSchema: true,
    }));
  }, [dispatch, error, isError, isSuccess, schemaRecords, setState, state.resolvedInitialSchema]);
};

const useLoadSelectedSchema = (
  dispatch: AppDispatch,
  selectedSchemaKey: string | null,
  queryState: {
    data?: TeamSchemaDocument;
    error?: unknown;
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
  },
): void => {
  useEffect(() => {
    if (selectedSchemaKey === null) {
      return;
    }

    if (queryState.isLoading || queryState.isFetching) {
      dispatch(startSchemaLoad());
      return;
    }

    if (queryState.isError) {
      dispatch(schemaLoadFailed(toErrorMessage(queryState.error)));
      return;
    }

    if (queryState.data !== undefined) {
      dispatch(schemaLoadSucceeded(queryState.data));
    }
  }, [dispatch, queryState.data, queryState.error, queryState.isError, queryState.isFetching, queryState.isLoading, selectedSchemaKey]);
};

const setServiceLoading = (
  setState: Dispatch<SetStateAction<ServiceState>>,
  status: SchemaServiceStatus,
): void => {
  setState((current) => ({ ...current, schemaServiceStatus: status, schemaServiceError: null, schemaServiceMessage: null }));
};

const setServiceError = (
  setState: Dispatch<SetStateAction<ServiceState>>,
  error: string,
): void => {
  setState((current) => ({ ...current, schemaServiceStatus: 'error', schemaServiceError: error }));
};

const setServiceMessage = (
  setState: Dispatch<SetStateAction<ServiceState>>,
  message: string,
): void => {
  setState((current) => ({ ...current, schemaServiceStatus: 'idle', schemaServiceMessage: message }));
};

const formatValidationErrors = (issues: readonly { path: readonly string[]; message: string }[]): string =>
  issues.map((issue) => `${issue.path.length === 0 ? 'root' : issue.path.join('.')}: ${issue.message}`).join('\n');

const refreshSchemaRecords = async (
  recordsQuery: RecordsQuery,
  setState: Dispatch<SetStateAction<ServiceState>>,
): Promise<void> => {
  setServiceLoading(setState, 'loading');

  try {
    const records = await recordsQuery.refetch().unwrap();
    setServiceMessage(setState, `Loaded ${records.length} schema record(s).`);
  } catch (error: unknown) {
    setServiceError(setState, toErrorMessage(error));
  }
};

const reloadSchema = async (
  selectedSchemaKey: string | null,
  dispatch: AppDispatch,
  setState: Dispatch<SetStateAction<ServiceState>>,
  schemaQuery: SchemaQuery,
): Promise<void> => {
  if (selectedSchemaKey === null) {
    dispatch(schemaLoadSucceeded(createPendingTeamSchema()));
    setServiceError(setState, 'No schema selected to reload.');
    return;
  }

  dispatch(startSchemaLoad());
  setState((current) => ({ ...current, schemaServiceError: null, schemaServiceMessage: null }));

  try {
    const nextSchema = await schemaQuery.refetch().unwrap();
    dispatch(schemaLoadSucceeded(nextSchema));
  } catch (error: unknown) {
    dispatch(schemaLoadFailed(toErrorMessage(error)));
  }
};

const validateSchema = async (
  schema: TeamSchemaDocument,
  validateTeamSchema: ReturnType<typeof useValidateTeamSchemaMutation>[0],
  setState: Dispatch<SetStateAction<ServiceState>>,
): Promise<void> => {
  setServiceLoading(setState, 'validating');

  try {
    const validation = await validateTeamSchema(schema).unwrap();

    if (validation.ok) {
      setServiceMessage(setState, 'Schema validated against service.');
      return;
    }

    setServiceError(setState, formatValidationErrors(validation.issues));
  } catch (error: unknown) {
    setServiceError(setState, toErrorMessage(error));
  }
};

const saveSchema = async (
  schema: TeamSchemaDocument,
  activeSchemaKey: string,
  schemaRecords: TeamSchemaRecord[],
  recordsQuery: RecordsQuery,
  saveTeamSchema: ReturnType<typeof useSaveTeamSchemaMutation>[0],
  setState: Dispatch<SetStateAction<ServiceState>>,
): Promise<void> => {
  setServiceLoading(setState, 'saving');

  try {
    const method = schemaRecords.some((record) => record.key === activeSchemaKey) ? 'PUT' : 'POST';
    await saveTeamSchema({ key: activeSchemaKey, schema, method }).unwrap();
    await recordsQuery.refetch().unwrap();
    setServiceMessage(setState, `Saved schema ${activeSchemaKey}.`);
  } catch (error: unknown) {
    setServiceError(setState, toErrorMessage(error));
  }
};

const createSchema = async (
  schema: TeamSchemaDocument,
  draftSchemaKey: string,
  schemaRecords: TeamSchemaRecord[],
  dispatch: AppDispatch,
  recordsQuery: RecordsQuery,
  saveTeamSchema: ReturnType<typeof useSaveTeamSchemaMutation>[0],
  setState: Dispatch<SetStateAction<ServiceState>>,
): Promise<void> => {
  const nextSchemaKey = draftSchemaKey.trim();

  if (nextSchemaKey.length === 0) {
    setServiceError(setState, 'Schema key is required.');
    return;
  }

  if (schemaRecords.some((record) => record.key === nextSchemaKey)) {
    setServiceError(setState, `Schema ${nextSchemaKey} already exists. Use Save to update it.`);
    return;
  }

  setServiceLoading(setState, 'saving');

  try {
    const nextSchema = await saveTeamSchema({ key: nextSchemaKey, schema, method: 'POST' }).unwrap();
    await recordsQuery.refetch().unwrap();
    dispatch(schemaLoadSucceeded(nextSchema));
    setState((current) => ({
      ...current,
      selectedSchemaKey: nextSchemaKey,
      draftSchemaKey: nextSchemaKey,
      resolvedInitialSchema: true,
    }));
    setServiceMessage(setState, `Created schema ${nextSchemaKey}.`);
  } catch (error: unknown) {
    setServiceError(setState, toErrorMessage(error));
  }
};

const deleteSchema = async (
  selectedSchemaKey: string | null,
  dispatch: AppDispatch,
  recordsQuery: RecordsQuery,
  deleteTeamSchema: ReturnType<typeof useDeleteTeamSchemaMutation>[0],
  setState: Dispatch<SetStateAction<ServiceState>>,
): Promise<void> => {
  if (selectedSchemaKey === null) {
    setServiceError(setState, 'No schema selected to delete.');
    return;
  }

  const keyToDelete = selectedSchemaKey;
  setServiceLoading(setState, 'deleting');

  try {
    await deleteTeamSchema(keyToDelete).unwrap();
    const records = await recordsQuery.refetch().unwrap();
    const nextSchemaKey = records[0]?.key ?? null;
    dispatch(schemaLoadSucceeded(createPendingTeamSchema()));
    setState((current) => ({
      ...current,
      selectedSchemaKey: nextSchemaKey,
      draftSchemaKey: nextSchemaKey ?? 'current',
    }));
    setServiceMessage(setState, `Deleted schema ${keyToDelete}.`);
  } catch (error: unknown) {
    setServiceError(setState, toErrorMessage(error));
  }
};

export const useTeamSchemaService = (dispatch: AppDispatch): TeamSchemaServiceModel => {
  const { state, setState } = useServiceState();
  const recordsQuery = useListTeamSchemaRecordsQuery();
  const schemaQuery = useGetTeamSchemaQuery(state.selectedSchemaKey ?? skipToken);
  const [validateTeamSchema] = useValidateTeamSchemaMutation();
  const [saveTeamSchema] = useSaveTeamSchemaMutation();
  const [deleteTeamSchema] = useDeleteTeamSchemaMutation();
  const schemaRecords = recordsQuery.data ?? [];
  const activeSchemaKey = state.selectedSchemaKey ?? 'current';

  useResolveInitialSchema(
    dispatch,
    schemaRecords,
    recordsQuery.isSuccess,
    recordsQuery.isError,
    recordsQuery.error,
    state,
    setState,
  );

  useLoadSelectedSchema(dispatch, state.selectedSchemaKey, {
    data: schemaQuery.data,
    error: schemaQuery.error,
    isLoading: schemaQuery.isLoading,
    isFetching: schemaQuery.isFetching,
    isError: schemaQuery.isError,
  });

  const selectSchemaKey = async (key: string): Promise<void> => {
    setState((current) => ({
      ...current,
      selectedSchemaKey: key,
      draftSchemaKey: key,
      resolvedInitialSchema: true,
      schemaServiceError: null,
      schemaServiceMessage: null,
    }));
    if (state.selectedSchemaKey !== key) {
      dispatch(startSchemaLoad());
    }
  };

  const updateDraftSchemaKey = (key: string): void => {
    setState((current) => ({ ...current, draftSchemaKey: key, schemaServiceError: null, schemaServiceMessage: null }));
  };

  const serviceActions = {
    updateDraftSchemaKey,
    createSchema: (schema: TeamSchemaDocument) => createSchema(schema, state.draftSchemaKey, schemaRecords, dispatch, recordsQuery, saveTeamSchema, setState),
    refreshSchemaRecords: () => refreshSchemaRecords(recordsQuery, setState),
    reloadSchema: () => reloadSchema(state.selectedSchemaKey, dispatch, setState, schemaQuery),
    selectSchemaKey,
    validateSchema: (schema: TeamSchemaDocument) => validateSchema(schema, validateTeamSchema, setState),
    saveSchema: (schema: TeamSchemaDocument) => saveSchema(schema, activeSchemaKey, schemaRecords, recordsQuery, saveTeamSchema, setState),
    deleteSchema: () => deleteSchema(state.selectedSchemaKey, dispatch, recordsQuery, deleteTeamSchema, setState),
  };

  return {
    schemaServiceStatus: state.schemaServiceStatus,
    schemaServiceError: state.schemaServiceError,
    schemaServiceMessage: state.schemaServiceMessage,
    schemaRecords,
    selectedSchemaKey: state.selectedSchemaKey,
    draftSchemaKey: state.draftSchemaKey,
    ...serviceActions,
  };
};
