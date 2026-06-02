import { z } from 'zod'

const schema = z.object({
  SESSION_SECRET: z
    .string()
    .min(32, { error: 'SESSION_SECRET deve ter ao menos 32 caracteres.' }),
})

export const env = schema.parse({
  SESSION_SECRET: process.env.SESSION_SECRET,
})
