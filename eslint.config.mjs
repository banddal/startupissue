import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "Render stored source content as text; raw HTML injection is forbidden.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/db", "@/server/db/*"],
              message: "DB modules are server-only and may only be imported from src/server or server entrypoints.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}", "src/auth.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "drizzle/**"]),
]);
