import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Pacotes gerados por scripts/empacotar.mjs: é build compilado, com
    // node_modules dentro. Lintar isso são milhares de avisos sobre código
    // que não é nosso.
    "dist/**",
  ]),
]);

export default eslintConfig;
