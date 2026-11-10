import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next 16부터 eslint-config-next가 flat config를 직접 제공한다 (FlatCompat 불필요)
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
