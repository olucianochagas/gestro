import { z } from 'zod'

const schema = z.object({
  SESSION_SECRET: z
    .string()
    .min(32, { error: 'SESSION_SECRET deve ter ao menos 32 caracteres.' }),
  DATABASE_URL: z.string().min(1).optional(),
})

export const env = schema.parse({
  SESSION_SECRET: process.env.SESSION_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
})
