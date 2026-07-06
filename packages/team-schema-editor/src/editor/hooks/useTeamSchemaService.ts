import { useEffect } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';

import { formatApiErrorMessage } from '../api/shared';
import {
  useDeleteTeamSchemaMutation,
  useGetTeamSchemaQuery,
  useListTeamSchemaRecordsQuery,
  SaveSchemaMethod,
  useSaveTeamSchemaMutation,
  useValidateTeamSchemaMutation,
} from '../api/teamSchemaApi';
import type { TeamSchemaDocument, TeamSchemaRecord } from '../model/types';
import { useAppSelector } from '../state/core/editorHooks';
import { createPendingTeamSchema, SchemaServiceStatus } from '../state/core/editorShared';
import {
  clearSchemaServiceFeedback,
  schemaLoadFailed,
  schemaLoadSucceeded,
  setDraftSchemaKey,
  setSchemaServiceError,
  setSchemaServiceKeys,
  setSchemaServiceMessage,
  setSchemaServiceStatus,
  startSchemaLoad,
} from '../state/core/editorSlice';
import type { AppDispatch } from '../state/core/editorStore';
import type { TeamSchemaServiceModel } from './helper/teamEditor.types';

const toErrorMessage = (error: unknown): string => formatApiErrorMessage(error, 'Unable to load team schema.');

type RecordsQuery = ReturnType<typeof useListTeamSchemaRecordsQuery>;
type SchemaQuery = ReturnType<typeof useGetTeamSchemaQuery>;

const useResolveInitialSchema = (
  dispatch: AppDispatch,
  schemaRecords: TeamSchemaRecord[],
  isSuccess: boolean,
  isError: boolean,
  error: unknown,
  selectedSchemaKey: string | null,
  draftSchemaKey: string,
  resolvedInitialSchema: boolean,
): void => {
  useEffect(() => {
    if (resolvedInitialSchema) {
      return;
    }

    if (isError) {
      dispatch(schemaLoadFailed(toErrorMessage(error)));
      dispatch(setSchemaServiceKeys({
        selectedSchemaKey,
        draftSchemaKey,
        resolvedInitialSchema: true,
      }));
      return;
    }

    if (!isSuccess) {
      return;
    }

    const preferredKey = schemaRecords.find((record) => record.key === 'current')?.key ?? schemaRecords[0]?.key;

    if (preferredKey === undefined) {
      dispatch(schemaLoadSucceeded(createPendingTeamSchema()));
      dispatch(setSchemaServiceKeys({
        selectedSchemaKey: null,
        draftSchemaKey: draftSchemaKey === 'current' ? 'current' : draftSchemaKey,
        resolvedInitialSchema: true,
      }));
      return;
    }

    dispatch(setSchemaServiceKeys({
      selectedSchemaKey: preferredKey,
      draftSchemaKey: draftSchemaKey === 'current' ? preferredKey : draftSchemaKey,
      resolvedInitialSchema: true,
    }));
  }, [dispatch, draftSchemaKey, error, isError, isSuccess, resolvedInitialSchema, schemaRecords, selectedSchemaKey]);
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
  dispatch: AppDispatch,
  status: SchemaServiceStatus,
): void => {
  dispatch(setSchemaServiceStatus(status));
};

const setServiceError = (
  dispatch: AppDispatch,
  error: string,
): void => {
  dispatch(setSchemaServiceError(error));
};

const setServiceMessage = (
  dispatch: AppDispatch,
  message: string,
): void => {
  dispatch(setSchemaServiceMessage(message));
};

const formatValidationErrors = (issues: readonly { path: readonly string[]; message: string }[]): string =>
  issues.map((issue) => `${issue.path.length === 0 ? 'root' : issue.path.join('.')}: ${issue.message}`).join('\n');

const refreshSchemaRecords = async (
  recordsQuery: RecordsQuery,
  dispatch: AppDispatch,
): Promise<void> => {
  setServiceLoading(dispatch, SchemaServiceStatus.Loading);

  try {
    const records = await recordsQuery.refetch().unwrap();
    setServiceMessage(dispatch, `Loaded ${records.length} schema record(s).`);
  } catch (error: unknown) {
    setServiceError(dispatch, toErrorMessage(error));
  }
};

const reloadSchema = async (
  selectedSchemaKey: string | null,
  dispatch: AppDispatch,
  schemaQuery: SchemaQuery,
): Promise<void> => {
  if (selectedSchemaKey === null) {
    dispatch(schemaLoadSucceeded(createPendingTeamSchema()));
    setServiceError(dispatch, 'No schema selected to reload.');
    return;
  }

  dispatch(startSchemaLoad());
  dispatch(clearSchemaServiceFeedback());

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
  dispatch: AppDispatch,
): Promise<void> => {
  setServiceLoading(dispatch, SchemaServiceStatus.Validating);

  try {
    const validation = await validateTeamSchema(schema).unwrap();

    if (validation.ok) {
      setServiceMessage(dispatch, 'Schema validated against service.');
      return;
    }

    setServiceError(dispatch, formatValidationErrors(validation.issues));
  } catch (error: unknown) {
    setServiceError(dispatch, toErrorMessage(error));
  }
};

const saveSchema = async (
  schema: TeamSchemaDocument,
  activeSchemaKey: string,
  schemaRecords: TeamSchemaRecord[],
  recordsQuery: RecordsQuery,
  saveTeamSchema: ReturnType<typeof useSaveTeamSchemaMutation>[0],
  dispatch: AppDispatch,
): Promise<void> => {
  setServiceLoading(dispatch, SchemaServiceStatus.Saving);

  try {
    const method = schemaRecords.some((record) => record.key === activeSchemaKey) ? SaveSchemaMethod.Put : SaveSchemaMethod.Post;
    await saveTeamSchema({ key: activeSchemaKey, schema, method }).unwrap();
    await recordsQuery.refetch().unwrap();
    setServiceMessage(dispatch, `Saved schema ${activeSchemaKey}.`);
  } catch (error: unknown) {
    setServiceError(dispatch, toErrorMessage(error));
  }
};

const createSchema = async (
  schema: TeamSchemaDocument,
  draftSchemaKey: string,
  schemaRecords: TeamSchemaRecord[],
  dispatch: AppDispatch,
  recordsQuery: RecordsQuery,
  saveTeamSchema: ReturnType<typeof useSaveTeamSchemaMutation>[0],
): Promise<void> => {
  const nextSchemaKey = draftSchemaKey.trim();

  if (nextSchemaKey.length === 0) {
    setServiceError(dispatch, 'Schema key is required.');
    return;
  }

  if (schemaRecords.some((record) => record.key === nextSchemaKey)) {
    setServiceError(dispatch, `Schema ${nextSchemaKey} already exists. Use Save to update it.`);
    return;
  }

  setServiceLoading(dispatch, SchemaServiceStatus.Saving);

  try {
    const nextSchema = await saveTeamSchema({ key: nextSchemaKey, schema, method: SaveSchemaMethod.Post }).unwrap();
    await recordsQuery.refetch().unwrap();
    dispatch(schemaLoadSucceeded(nextSchema));
    dispatch(setSchemaServiceKeys({
      selectedSchemaKey: nextSchemaKey,
      draftSchemaKey: nextSchemaKey,
    }));
    setServiceMessage(dispatch, `Created schema ${nextSchemaKey}.`);
  } catch (error: unknown) {
    setServiceError(dispatch, toErrorMessage(error));
  }
};

const deleteSchema = async (
  selectedSchemaKey: string | null,
  dispatch: AppDispatch,
  recordsQuery: RecordsQuery,
  deleteTeamSchema: ReturnType<typeof useDeleteTeamSchemaMutation>[0],
): Promise<void> => {
  if (selectedSchemaKey === null) {
    setServiceError(dispatch, 'No schema selected to delete.');
    return;
  }

  const keyToDelete = selectedSchemaKey;
  setServiceLoading(dispatch, SchemaServiceStatus.Deleting);

  try {
    await deleteTeamSchema(keyToDelete).unwrap();
    const records = await recordsQuery.refetch().unwrap();
    const nextSchemaKey = records[0]?.key ?? null;
    dispatch(schemaLoadSucceeded(createPendingTeamSchema()));
    dispatch(setSchemaServiceKeys({
      selectedSchemaKey: nextSchemaKey,
      draftSchemaKey: nextSchemaKey ?? 'current',
    }));
    setServiceMessage(dispatch, `Deleted schema ${keyToDelete}.`);
  } catch (error: unknown) {
    setServiceError(dispatch, toErrorMessage(error));
  }
};

export const useTeamSchemaService = (dispatch: AppDispatch): TeamSchemaServiceModel => {
  const selectedSchemaKey = useAppSelector((state) => state.editor.selectedSchemaKey);
  const draftSchemaKey = useAppSelector((state) => state.editor.draftSchemaKey);
  const resolvedInitialSchema = useAppSelector((state) => state.editor.resolvedInitialSchema);
  const schemaServiceStatus = useAppSelector((state) => state.editor.schemaServiceStatus);
  const schemaServiceError = useAppSelector((state) => state.editor.schemaServiceError);
  const schemaServiceMessage = useAppSelector((state) => state.editor.schemaServiceMessage);
  const recordsQuery = useListTeamSchemaRecordsQuery();
  const schemaQuery = useGetTeamSchemaQuery(selectedSchemaKey ?? skipToken);
  const [validateTeamSchema] = useValidateTeamSchemaMutation();
  const [saveTeamSchema] = useSaveTeamSchemaMutation();
  const [deleteTeamSchema] = useDeleteTeamSchemaMutation();
  const schemaRecords = recordsQuery.data ?? [];
  const activeSchemaKey = selectedSchemaKey ?? 'current';

  useResolveInitialSchema(
    dispatch,
    schemaRecords,
    recordsQuery.isSuccess,
    recordsQuery.isError,
    recordsQuery.error,
    selectedSchemaKey,
    draftSchemaKey,
    resolvedInitialSchema,
  );

  useLoadSelectedSchema(dispatch, selectedSchemaKey, {
    data: schemaQuery.data,
    error: schemaQuery.error,
    isLoading: schemaQuery.isLoading,
    isFetching: schemaQuery.isFetching,
    isError: schemaQuery.isError,
  });

  const selectSchemaKey = async (key: string): Promise<void> => {
    dispatch(setSchemaServiceKeys({
      selectedSchemaKey: key,
      draftSchemaKey: key,
    }));
    if (selectedSchemaKey !== key) {
      dispatch(startSchemaLoad());
    }
  };

  const updateDraftSchemaKey = (key: string): void => {
    dispatch(setDraftSchemaKey(key));
  };

  const serviceActions = {
    updateDraftSchemaKey,
    createSchema: (schema: TeamSchemaDocument) => createSchema(schema, draftSchemaKey, schemaRecords, dispatch, recordsQuery, saveTeamSchema),
    refreshSchemaRecords: () => refreshSchemaRecords(recordsQuery, dispatch),
    reloadSchema: () => reloadSchema(selectedSchemaKey, dispatch, schemaQuery),
    selectSchemaKey,
    validateSchema: (schema: TeamSchemaDocument) => validateSchema(schema, validateTeamSchema, dispatch),
    saveSchema: (schema: TeamSchemaDocument) => saveSchema(schema, activeSchemaKey, schemaRecords, recordsQuery, saveTeamSchema, dispatch),
    deleteSchema: () => deleteSchema(selectedSchemaKey, dispatch, recordsQuery, deleteTeamSchema),
  };

  return {
    schemaServiceStatus,
    schemaServiceError,
    schemaServiceMessage,
    schemaRecords,
    selectedSchemaKey,
    draftSchemaKey,
    ...serviceActions,
  };
};
