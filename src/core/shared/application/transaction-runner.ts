/**
 * Executa `work` dentro de uma fronteira transacional.
 * Implementações de produção garantem atomicidade (tudo-ou-nada);
 * a implementação in-memory apenas executa o trabalho.
 */
export interface TransactionRunner {
  run<T>(work: () => Promise<T>): Promise<T>
}
