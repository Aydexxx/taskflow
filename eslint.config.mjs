// Flat ESLint config shared by every workspace. Running `eslint .` from any
// workspace directory resolves up to this file, so the rules stay consistent
// across shared/, server/, and client/.
import js from '@eslint/js';
import { globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  // Repo-wide ignores. `globalIgnores` guarantees these apply regardless of the
  // directory ESLint is invoked from.
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/generated/**',
    '**/coverage/**',
    '**/*.config.ts',
    '**/*.config.js',
    '**/*.config.mjs',
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // House rules. The codebase routes all logging through explicit, reviewed
    // call sites, so stray console / sequential awaits are flagged by default.
    rules: {
      'no-console': 'error',
      'no-await-in-loop': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['server/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['client/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    // CLI scripts, tests, and test harnesses legitimately log and await in loops.
    files: ['**/seed.ts', '**/*.test.ts', '**/*.test.tsx', 'server/src/test/**', 'client/src/test/**'],
    rules: {
      'no-console': 'off',
      'no-await-in-loop': 'off',
    },
  },
];
