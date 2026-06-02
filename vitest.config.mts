import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Evita que `import 'server-only'` quebre os testes ao importar adaptadores de servidor.
      "server-only": fileURLToPath(
        new URL("./src/test-support/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test-support/setup-env.ts"],
  },
});
