import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

config({ path: resolve(here, '../.env') })

function required(name, fallback) {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(`Missing required env var ${name}`)
  }
  return value
}

function databaseUrl() {
  const raw = process.env.DATABASE_URL
  if (!raw) {
    throw new Error('Missing required env var DATABASE_URL')
  }
  try {
    const url = new URL(raw)
    url.searchParams.delete('schema')
    return url.toString()
  } catch {
    return raw
  }
}

export const env = {
  databaseUrl: databaseUrl(),
  jwtSecret: required('JWT_SECRET', 'dev-jwt-secret-change-me'),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  port: Number(process.env.PORT ?? 3001),
  // Prefer OPENAI_API_KEY; VITE_OPENAI_API_KEY kept as temporary alias if still in server/.env
  openaiApiKey: process.env.OPENAI_API_KEY ?? process.env.VITE_OPENAI_API_KEY ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  mailFrom: process.env.MAIL_FROM ?? 'noreply@localhost',
  emailTokenTtlHours: Number(process.env.EMAIL_TOKEN_TTL_HOURS ?? 24),
}
