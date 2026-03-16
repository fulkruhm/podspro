module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        args: 'none',
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
        ignoreRestSiblings: true,
      },
    ],
    'prefer-const': 'off',
    'no-useless-escape': 'off',
  },
  overrides: [
    {
      files: [
        'components/ForecastReviewView.tsx',
        'components/forecastReviewUtils.ts',
        'components/DashboardView.tsx',
        'components/AnomalyVisualization.tsx',
        'components/ForecastVisualization.tsx',
        'components/MLDashboard.tsx',
        'components/UserManagementView.tsx',
        'components/ProductDetailView.tsx',
        'services/dataService.ts',
        'services/userService.ts',
        'services/auditService.ts',
        'services/mlService.ts',
        'components/__tests__/forecastReviewUtils.test.ts',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            args: 'after-used',
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrors: 'all',
            caughtErrorsIgnorePattern: '^_',
            ignoreRestSiblings: false,
          },
        ],
        'prefer-const': 'error',
        'no-useless-escape': 'error',
      },
    },
  ],
};
