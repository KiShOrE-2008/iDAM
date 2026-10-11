import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    ignores: [
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",
      "android/**",
      "scratch/**",
      "test/**",
      "node_modules/**"
    ]
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off"
    }
  }
];
