const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        module: "writable",
        JsonRisk: "writable",
      },
    },
    rules: {
      "no-unused-vars": ["warn",  { "argsIgnorePattern": "_not_used", "caughtErrorsIgnorePattern": "_not_used" } ],
      "no-undef": "warn",
    },
  },
];
