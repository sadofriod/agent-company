import type { ReactElement } from 'react';
import { TextField } from '@mui/material';
import { Controller } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';

import type { SelectionFormValues } from './selectionFormValues';

export enum SelectionFieldType {
  Text = 'text',
  Number = 'number',
}

type SelectionFormFieldProps = {
  form: UseFormReturn<SelectionFormValues>;
  name: string;
  label: string;
  multiline?: boolean;
  type?: SelectionFieldType;
  onValueChange: (value: string) => void;
};

export const SelectionFormField = ({
  form,
  name,
  label,
  multiline = false,
  type = SelectionFieldType.Text,
  onValueChange,
}: SelectionFormFieldProps): ReactElement => {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <TextField
          {...field}
          fullWidth
          label={label}
          type={type}
          multiline={multiline}
          minRows={multiline ? 3 : undefined}
          value={field.value ?? ''}
          onChange={(event) => {
            field.onChange(event.target.value);
            onValueChange(event.target.value);
          }}
        />
      )}
    />
  );
};