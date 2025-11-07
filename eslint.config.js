const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        module: "writable",
      },
    },
    rules: {
      "no-unused-vars": ["warn",  { "argsIgnorePattern": "_not_used" } ],
      "no-undef": "warn",
    },
  },
];
