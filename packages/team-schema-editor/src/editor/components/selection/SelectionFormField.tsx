import type { ReactElement } from 'react';
import { TextField } from '@mui/material';
import { Controller } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';

import type { SelectionFormValues } from './selectionFormValues';

type SelectionFormFieldProps = {
  readonly form: UseFormReturn<SelectionFormValues>;
  readonly name: string;
  readonly label: string;
  readonly multiline?: boolean;
  readonly type?: 'text' | 'number';
  readonly onValueChange: (value: string) => void;
};

export const SelectionFormField = ({
  form,
  name,
  label,
  multiline = false,
  type = 'text',
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
          minRows={multiline ? 4 : undefined}
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