const DEV_MAIL_RECIPIENT = 'okushchik@gmail.com'

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

    // Outside production, deliver every email to the developer's inbox,
    // so test users (okushchik+1@gmail.com, etc.) never get real mail.
    const recipient = nodeEnv === 'production' ? to : DEV_MAIL_RECIPIENT
    if (recipient !== to) {
      console.info(`[mail] dev redirect: ${to} -> ${recipient}`)
    }

    // Dev mode: skip Resend entirely and just print the email (set MAIL_LOG_ONLY=true).
    if (!resendApiKey || (nodeEnv !== 'production' && process.env.MAIL_LOG_ONLY === 'true')) {
      console.info(`[mail] to=${to} subject=${subject} url=${urlForLog ?? ''}\n${text}`)
      return
    }

    try {
      await sendViaResend({ resendApiKey, mailFrom, to: recipient, subject, text })
    } catch (err) {
      // Resend without a verified domain only delivers to the account owner's email.
      // In dev, log the link instead of failing the whole flow.
      if (nodeEnv !== 'production' && String(err.message).includes('Resend 403')) {
        console.warn(`[mail] Resend refused delivery (unverified domain); logging instead.`)
        console.info(`[mail] to=${to} subject=${subject} url=${urlForLog ?? ''}\n${text}`)
        return
      }
      throw err
    }
  }

  return {
    sendVerificationEmail({ to, verifyUrl }) {
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
