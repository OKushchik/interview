function assertCanSend({ resendApiKey, nodeEnv }) {
  if (resendApiKey) return
  if (nodeEnv === 'production') {
    throw new Error('Failed to send email: RESEND_API_KEY is required in production')
  }
}

async function sendViaResend({ resendApiKey, mailFrom, to, subject, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: mailFrom,
      to: [to],
      subject,
      text,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to send email: Resend ${res.status} ${body}`)
  }
}

export function createMailService({ resendApiKey, mailFrom, nodeEnv }) {
  async function send({ to, subject, text, urlForLog }) {
    assertCanSend({ resendApiKey, nodeEnv })

    if (!resendApiKey) {
      console.info(`[mail] to=${to} subject=${subject} url=${urlForLog ?? ''}\n${text}`)
      return
    }

    await sendViaResend({ resendApiKey, mailFrom, to, subject, text })
  }

  return {
    sendVerificationEmail({ to, verifyUrl }) {
      console.log("to", to)
      return send({
        to,
        subject: 'Confirm your email',
        text: `Confirm your email by opening this link:\n${verifyUrl}\n`,
        urlForLog: verifyUrl,
      })
    },
    sendPasswordResetEmail({ to, resetUrl }) {
      return send({
        to,
        subject: 'Reset your password',
        text: `Reset your password by opening this link:\n${resetUrl}\n`,
        urlForLog: resetUrl,
      })
    },
    sendEmailChangeEmail({ to, verifyUrl }) {
      return send({
        to,
        subject: 'Confirm your new email',
        text: `Confirm your new email by opening this link:\n${verifyUrl}\n`,
        urlForLog: verifyUrl,
      })
    },
  }
}
