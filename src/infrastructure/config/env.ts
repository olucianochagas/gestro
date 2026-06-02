import { z } from 'zod'

const schema = z.object({
  SESSION_SECRET: z
    .string()
    .min(32, { error: 'SESSION_SECRET deve ter ao menos 32 caracteres.' }),
  DATABASE_URL: z.string().min(1).optional(),
  NODE_ENV: z.string().optional(),
})

export const env = schema.parse({
  SESSION_SECRET: process.env.SESSION_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
})

// Defensivo: produção nunca deve cair silenciosamente em persistência in-memory.
if (env.NODE_ENV === 'production' && !env.DATABASE_URL) {
  throw new Error('DATABASE_URL é obrigatória em produção.')
}
