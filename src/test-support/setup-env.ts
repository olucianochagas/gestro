// Define variáveis de ambiente exigidas pela validação fail-fast (infrastructure/config/env.ts)
// ANTES de o grafo de módulos do teste ser avaliado. setupFiles rodam antes do arquivo de teste.
process.env.SESSION_SECRET ||= 'test-session-secret-with-at-least-32-chars'
