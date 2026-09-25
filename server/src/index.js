import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { createAuthRouter } from './routes/auth.js'
import { createVacanciesRouter } from './routes/vacancies.js'
import { createInterviewRouter } from './routes/interview.js'
const { env } = await import('./config.js')
const { db, initDatabase } = await import('./db/index.js')
const { createQuestionGenerator } = await import('./services/openaiService.js')
const { createMailService } = await import('./services/mailService.js')


async function main() {

  await initDatabase()

  const generator = createQuestionGenerator(env.openaiApiKey)
  const secureCookies = env.nodeEnv === 'production'
  const mail = createMailService({
    resendApiKey: env.resendApiKey,
    mailFrom: env.mailFrom,
    nodeEnv: env.nodeEnv,
  })

  const app = express()
  app.use(cors({
    origin: env.clientOrigin,
    credentials: true,
  }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.use(
    '/api/auth',
    createAuthRouter(db, env.jwtSecret, secureCookies, {
      mail,
      clientOrigin: env.clientOrigin,
      emailTokenTtlHours: env.emailTokenTtlHours,
    }),
  )
  app.use('/api/vacancies', createVacanciesRouter(db, env.jwtSecret, generator))
  app.use('/api/interview', createInterviewRouter(env.jwtSecret, generator))

  app.use((err, _req, res, _next) => {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  })

  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`)
  })
}

function isEntryPoint() {
  const entry = process.argv[1]
  if (!entry) return false
  return resolve(fileURLToPath(import.meta.url)) === resolve(entry)
}

if (isEntryPoint()) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
