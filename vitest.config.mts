import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Same "@/*" alias as tsconfig.json
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    // e2e/ is reserved for Playwright specs
    exclude: [...configDefaults.exclude, ".next/**", "e2e/**"],
  },
});
