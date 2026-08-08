module.exports = {
  root: true,
  env: { node: true, browser: true, es2022: true },
  extends: [
    'eslint:recommended',
  ],
  ignorePatterns: ['dist', 'build', 'node_modules', 'coverage', '*.config.js', '*.config.ts'],
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'off', // TypeScript handles this
  },
};
