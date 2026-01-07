import path from 'path';
import { FlatCompat } from '@eslint/eslintrc';

// Reuse the existing .eslintrc.js settings via the compatibility helper, but
// constrain what gets linted and reintroduce ignores (ESLint v9 no longer has
// default ignore patterns).
const compat = new FlatCompat({
  baseDirectory: path.resolve(),
});

const ignores = [
  '**/node_modules/**',
  '**/.next/**',
  '**/out/**',
  '**/coverage/**',
  '**/dist/**',
  '**/.turbo/**',
  '**/.git/**',
  '**/public/**',
];

export default [
  { ignores },
  ...compat.config({
    extends: ['next/core-web-vitals'],
    root: true,
    env: {
      browser: true,
      es2022: true,
      node: true,
      jest: true,
    },
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true,
      },
    },
    rules: {
      // TypeScript specific rules (using ESLint equivalents)
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // React specific rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/exhaustive-deps': 'warn',

      // General rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',

      // Import rules
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
        },
      ],
    },
    overrides: [
      {
        files: ['**/__tests__/**/*', '**/*.test.*', '**/*.spec.*'],
        env: {
          jest: true,
        },
        rules: {
          'no-unused-vars': 'off',
          'no-console': 'off',
        },
      },
      {
        files: ['**/*.config.js', '**/*.config.ts'],
        rules: {
          'no-var': 'off',
        },
      },
    ],
    settings: {
      react: {
        version: 'detect',
      },
    },
  }),
];

