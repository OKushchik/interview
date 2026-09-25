import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'
import { createMailService } from './mailService.js'

describe('createMailService', () => {
  it('logs to console when no API key', async () => {
    const logs = []
    const original = console.info
    console.info = (...args) => logs.push(args.join(' '))
    try {
      const mail = createMailService({ resendApiKey: '', mailFrom: 'a@b.c', nodeEnv: 'development' })
      await mail.sendVerificationEmail({ to: 'u@t.com', verifyUrl: 'http://x/verify?token=1' })
      assert.ok(logs.some((l) => l.includes('http://x/verify?token=1')))
    } finally {
      console.info = original
    }
  })

  it('throws in production without API key', async () => {
    const mail = createMailService({ resendApiKey: '', mailFrom: 'a@b.c', nodeEnv: 'production' })
    await assert.rejects(
      () => mail.sendVerificationEmail({ to: 'u@t.com', verifyUrl: 'http://x' }),
      /Failed to send email|RESEND/,
    )
  })

  it('calls Resend API when key present', async () => {
    const fetchMock = mock.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: '1' }) }))
    const previousFetch = globalThis.fetch
    globalThis.fetch = fetchMock
    try {
      const mail = createMailService({ resendApiKey: 're_test', mailFrom: 'a@b.c', nodeEnv: 'production' })
      await mail.sendPasswordResetEmail({ to: 'u@t.com', resetUrl: 'http://x/reset?token=2' })
      assert.equal(fetchMock.mock.calls.length, 1)
      const [url, init] = fetchMock.mock.calls[0].arguments
      assert.equal(url, 'https://api.resend.com/emails')
      assert.equal(init.method, 'POST')
      assert.ok(String(init.headers.Authorization).includes('re_test'))
    } finally {
      globalThis.fetch = previousFetch
    }
  })
})
