import path from 'node:path';
import { fileURLToPath } from 'node:url';

import eslint from '@eslint/js';
import stylisticPlugin from '@stylistic/eslint-plugin';
import canonicalPlugin from 'eslint-plugin-canonical';
import nPlugin from 'eslint-plugin-n';
import prettierPlugin from 'eslint-plugin-prettier/recommended';
import promisePlugin from 'eslint-plugin-promise';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import unicornPlugin from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  // @ts-ignore
  promisePlugin.configs['flat/recommended'],
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.js',
      '**/eslint.config.mjs',
      '**/*.d.ts',
    ],
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      '@stylistic': stylisticPlugin,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@stylistic/member-delimiter-style': [
        'error',
        {
          multiline: { delimiter: 'semi', requireLast: true },
          singleline: { delimiter: 'semi', requireLast: false },
        },
      ],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
    },
  },
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    extends: [unicornPlugin.configs['flat/recommended']],
    rules: {
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-static-only-class': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.builtin,
        ...globals.node,
      },
    },
    extends: [canonicalPlugin.configs['flat/recommended']],
    rules: {
      'canonical/filename-match-exported': 'error',
      'canonical/import-specifier-newline': 'off',
      'canonical/destructuring-property-newline': 'off',
      'canonical/no-restricted-strings': 'error',
      'canonical/no-use-extend-native': 'error',
      'canonical/prefer-inline-type-import': 'off',
    },
  },
  {
    // @ts-ignore
    extends: [sonarjsPlugin.configs.recommended],
    rules: {
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/todo-tag': 'warn',
    },
  },
  {
    files: ['**/*.ts'],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          prefix: ['I'],
        },
        {
          selector: 'variable',
          types: ['boolean'],
          format: ['PascalCase'],
          prefix: ['is', 'should', 'has', 'can', 'did', 'will'],
        },
      ],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: '*', next: 'try' },
        { blankLine: 'always', prev: '*', next: 'block-like' },
        { blankLine: 'always', prev: 'block-like', next: '*' },
      ],
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
    },
  },
  prettierPlugin,
  {
    rules: {
      'prettier/prettier': [
        'error',
        { singleQuote: true, trailingComma: 'all', endOfLine: 'auto' },
      ],
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.builtin,
        ...globals.node,
      },
    },
    extends: [nPlugin.configs['flat/recommended']],
    rules: {
      'n/no-extraneous-import': 'off',
      'n/no-missing-import': 'off',
    },
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.builtin,
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        // @ts-ignore
        tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url)),
      },
    },
  },
);
