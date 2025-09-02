module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  env: {
    node: true,
    es2020: true
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'curly': 'warn',
    'eqeqeq': 'warn',
    'no-throw-literal': 'warn',
    'semi': ['warn', 'always']
  },
  ignorePatterns: [
    'out',
    'dist',
    '**/*.d.ts',
    'src/webview-angular-v2/**/*',
    'src/webview-angular-old-backup/**/*',
    'src/test/**/*'
  ]
};