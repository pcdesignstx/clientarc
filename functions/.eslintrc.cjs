module.exports = {
  root: true,
  env: {
    node: true,
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "script"
  },
  extends: ["eslint:recommended"],
  rules: {
    quotes: ["error", "single"],
    "max-len": ["error", { code: 120 }],
    indent: ["error", 2]
  }
};