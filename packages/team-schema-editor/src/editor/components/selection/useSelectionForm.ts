import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { buildSelectionFormValues, type SelectionFormValues } from './selectionFormValues';
import type { Selection, TeamSchemaDocument } from '../../model/types';

export const useSelectionForm = (schema: TeamSchemaDocument, selection: Selection) => {
  const form = useForm<SelectionFormValues>({
    defaultValues: buildSelectionFormValues(schema, selection),
  });

  useEffect(() => {
    form.reset(buildSelectionFormValues(schema, selection));
  }, [form, schema, selection]);

  return form;
};