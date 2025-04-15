module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
  },
  ignorePatterns: [
    '/lib/**/*', // Ignore built files.
    '.eslintrc.js',
    'index.js',
  ],
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    'quotes': ['error', 'single'],
    'indent': ['error', 2],
    'max-len': ['error', { 'code': 120 }],
  },
}; 