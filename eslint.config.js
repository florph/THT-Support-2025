// ESLint 9 flat config. Replaces the legacy `eslintConfig` in package.json.
//
// Note on ESLint version: eslint-config-universe@15 (Expo's shared config) bundles
// an eslint-plugin-react that still calls the removed `context.getFilename()` API,
// so it is not yet compatible with ESLint 10. We pin to ESLint 9 until universe ships
// an ESLint 10-compatible release.
const universe = require('eslint-config-universe/flat/native');
const globals = require('globals');

module.exports = [
  ...universe,

  // CommonJS config files run in Node, not React Native.
  {
    files: ['*.config.js', '.prettierrc.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },

  // The react-hooks plugin (v6) ships React Compiler diagnostics. This project does
  // not enable the React Compiler, and these rules flag common, correct patterns
  // (fetch-on-mount, reset-form-on-open). Keep them as warnings, not errors.
  // The classic rules-of-hooks / exhaustive-deps stay at their default (error).
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },

  {
    ignores: ['node_modules/', 'dist/', '.expo/', 'web-build/'],
  },
];
