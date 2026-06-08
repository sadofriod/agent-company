import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/editor/hooks/use*.ts'],
    rules: {
      'max-lines-per-function': ['error', { max: 70, skipBlankLines: true, skipComments: true }],
    },
  },
);
