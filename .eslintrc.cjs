module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { es2022: true, node: true },
  globals: {
    D1Database: 'readonly', KVNamespace: 'readonly', AnalyticsEngineDataset: 'readonly',
    RateLimit: 'readonly', ExecutionContext: 'readonly', ExportedHandlerScheduledHandler: 'readonly',
  },
  ignorePatterns: ['node_modules/', 'mcp/'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-constant-condition': 'off',
    'no-useless-catch': 'off',
    'no-useless-escape': 'off',
    'prefer-const': 'off',
  },
};
