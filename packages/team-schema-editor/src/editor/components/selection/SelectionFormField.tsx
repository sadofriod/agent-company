import { type ReactElement, type ReactNode } from 'react';
import { MenuItem, TextField } from '@mui/material';
import { Controller } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';

import type { SelectionFormValues } from './selectionFormValues';

export enum SelectionFieldType {
  Text = 'text',
  Number = 'number',
}

export type SelectionFormFieldProps = {
  form: UseFormReturn<SelectionFormValues>;
  name: string;
  label: string;
  multiline?: boolean;
  type?: SelectionFieldType;
  select?: boolean;
  multiple?: boolean;
  options?: readonly string[];
  helperText?: string;
  onValueChange: (value: string) => void;
  children?: ReactNode;
};

export const SelectionFormField = ({
  form,
  name,
  label,
  multiline = false,
  type = SelectionFieldType.Text,
  select = false,
  multiple = false,
  options,
  helperText,
  onValueChange,
  children,
}: SelectionFormFieldProps): ReactElement => {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => {
        let value: unknown = field.value ?? '';
        if (multiple && select) {
          value = typeof value === 'string'
            ? value.split('\n').filter((item) => item.trim().length > 0)
            : [];
        }
        return (
          <TextField
            {...field}
            fullWidth
            select={select}
            label={label}
            type={type}
            multiline={multiline && !select}
            minRows={multiline && !select ? 3 : undefined}
            value={value as string | number | readonly string[]}
            helperText={helperText}
            slotProps={{
              select: {
                multiple: multiple,
              },
            }}
            onChange={(event) => {
              let newValue = event.target.value;
              if (multiple && Array.isArray(newValue)) {
                newValue = newValue.join('\n');
              }
              field.onChange(newValue);
              onValueChange(newValue as string);
            }}
          >
            {children
              ? children
              : select
                ? options?.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))
                : null}
          </TextField>
        );
      }}
    />
  );
};