import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(
        new URL("./src/test-support/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.pg.test.ts"],
    globalSetup: ["./src/test-support/pg-global-setup.ts"],
    // Banco único compartilhado entre arquivos → execução serial evita corridas de TRUNCATE.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 120000,
  },
});
