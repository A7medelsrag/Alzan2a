import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/api/src/routes/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/repositories/**",
                "../repositories/**",
                "../../repositories/**",
                "**/repositories",
                "../repositories",
                "../../repositories",
                "*repositories*"
              ],
              message: "Routes cannot import repositories directly. Go through services."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["packages/shared/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@store/api", "@store/api/**", "**/apps/api/**"],
              message: "packages/shared must not import from apps/api."
            }
          ]
        }
      ]
    }
  },
  {
    ignores: ["**/dist/**", "**/node_modules/**"]
  }
);
