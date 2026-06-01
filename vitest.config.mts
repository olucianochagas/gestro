import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // Evita que `import 'server-only'` quebre os testes de integração.
      'server-only': fileURLToPath(new URL('./src/test-support/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // SESSION_SECRET é exigido pela validação de env (infra/config/env.ts),
    // carregada por testes de integração dos Route Handlers.
    env: {
      SESSION_SECRET: 'test-session-secret-with-at-least-32-chars',
      NODE_ENV: 'test',
    },
  },
})
