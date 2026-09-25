# Email Verification, Password Reset & Change Email — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Додати підтвердження email при реєстрації, скидання пароля та зміну email (hashed tokens + mailService + клієнтські сторінки) поверх існуючого Express/Sequelize auth і React клієнта.

**Architecture:** Колонки токенів на `users`; `tokenService` (generate/hash/expiry); `mailService` (console у dev без ключа, Resend HTTP API якщо є `RESEND_API_KEY`); auth routes оркеструють flow; клієнт — pending-банер, публічні verify/forgot/reset/change-verify роути, захищена `/account`.

**Tech Stack:** Node ESM, Express, Sequelize, Zod, `node:test`, `node:crypto`; React 19, Zustand, React Router, Vitest; Resend REST (fetch, без обов’язкового SDK).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-07-email-verification-design.md`
- Токени в БД лише як SHA-256 hex; сирий token лише в URL/листі
- Register: **без** cookie; login unverified → `403 Email not verified`
- Verify-email і verify-email-change: **з** cookie (auto-login)
- Reset-password: **без** cookie
- Існуючі users при міграції: `email_verified = true`
- UI-копія українською
- Пароль min 8 (існуючий zod)
- Не додавати OAuth / Redis rate-limit
- Коміти лише якщо git доступний і користувач не заборонив; інакше пропустити commit-кроки
- Оновлювати `server/package.json` `test` script при додаванні нових test-файлів

---

## File map

| File | Role |
|------|------|
| `server/src/db/schema.js` | ALTER + backfill `email_verified` |
| `server/src/db/models.js` | Sequelize fields |
| `server/src/config.js` | `resendApiKey`, `mailFrom`, `emailTokenTtlHours` |
| `server/.env.example` | нові env |
| `server/src/services/tokenService.js` | createTokenPair, hashToken, expiryDate |
| `server/src/services/tokenService.test.js` | unit tests |
| `server/src/services/mailService.js` | send* + Resend/console |
| `server/src/services/mailService.test.js` | unit tests (mock fetch) |
| `server/src/services/schemas.js` | zod для нових body |
| `server/src/services/authService.js` | helpers + розширити `publicUser` (`pendingEmail`) |
| `server/src/routes/auth.js` | усі нові endpoints + зміна register/login |
| `server/src/services/emailAuthService.js` | orchestration: assign verification/reset/change tokens |
| `server/src/services/emailAuthService.test.js` | unit tests з mock db/mail |
| `client/src/types/index.ts` | `pendingEmail` на `AuthUser` |
| `client/src/services/authApi.ts` | нові методи |
| `client/src/store/authStore.ts` | pendingVerificationEmail + actions |
| `client/src/store/authStore.test.ts` | оновити/додати тести |
| `client/src/pages/LoginPage.tsx` | банер + forgot link; register без navigate vacancies |
| `client/src/pages/VerifyEmailPage.tsx` | auto verify |
| `client/src/pages/ForgotPasswordPage.tsx` | form |
| `client/src/pages/ResetPasswordPage.tsx` | form |
| `client/src/pages/VerifyEmailChangePage.tsx` | auto verify change |
| `client/src/pages/AccountPage.tsx` | change email |
| `client/src/components/layout/Header.tsx` | лінк на `/account` |
| `client/src/App.tsx` | routes |
| `README.md` | коротко про verify / env (якщо вже є auth секція — доповнити) |

---

### Task 1: Schema, model, config

**Files:**
- Modify: `server/src/db/schema.js`
- Modify: `server/src/db/models.js`
- Modify: `server/src/config.js`
- Modify: `server/.env.example`

**Interfaces:**
- Consumes: існуючий `schemaStatements` + `User.init`
- Produces: колонки з spec; `env.resendApiKey`, `env.mailFrom`, `env.emailTokenTtlHours`

- [ ] **Step 1: Додати SQL у `schema.js` (після ALTER role)**

```js
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_token_hash" TEXT;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_expires_at" TIMESTAMP(3);`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_token_hash" TEXT;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_expires_at" TIMESTAMP(3);`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pending_email" TEXT;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_change_token_hash" TEXT;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_change_expires_at" TIMESTAMP(3);`,
  `UPDATE "users" SET "email_verified" = true WHERE "email_verified" = false AND "email_verification_token_hash" IS NULL AND "created_at" < CURRENT_TIMESTAMP;`,
```

**Увага:** backfill має позначити **існуючих** як verified. Безпечніший варіант після ADD COLUMN:

```js
  // Run once-style backfill: будь-хто без verification token і без pending вважаємо legacy verified
  `UPDATE "users" SET "email_verified" = true WHERE "email_verification_token_hash" IS NULL AND "pending_email" IS NULL;`,
```

Нові реєстрації завжди виставляють token hash, тож цей UPDATE не зламає їх після створення (якщо migrate лише на старті — ок). **Краще:** окремий one-shot лише для рядків створених до фічі:

На практиці для цього репо: після ADD з `DEFAULT false`, одразу:

```js
  `UPDATE "users" SET "email_verified" = true;`,
```

перед деплоєм нової логіки register — і лише потім деплой коду. У плані реалізації: у `schema.js` після ADD колонок виконати `UPDATE "users" SET "email_verified" = true;` **один раз при migrate**. Новий `User.create` у коді явно ставить `emailVerified: false` (перебиває default після create). Існуючі вже `true`.

- [ ] **Step 2: Додати поля в `User.init` (`models.js`)**

```js
emailVerified: {
  type: DataTypes.BOOLEAN,
  allowNull: false,
  defaultValue: false,
  field: 'email_verified',
},
emailVerificationTokenHash: {
  type: DataTypes.STRING,
  allowNull: true,
  field: 'email_verification_token_hash',
},
emailVerificationExpiresAt: {
  type: DataTypes.DATE,
  allowNull: true,
  field: 'email_verification_expires_at',
},
passwordResetTokenHash: {
  type: DataTypes.STRING,
  allowNull: true,
  field: 'password_reset_token_hash',
},
passwordResetExpiresAt: {
  type: DataTypes.DATE,
  allowNull: true,
  field: 'password_reset_expires_at',
},
pendingEmail: {
  type: DataTypes.STRING,
  allowNull: true,
  field: 'pending_email',
},
emailChangeTokenHash: {
  type: DataTypes.STRING,
  allowNull: true,
  field: 'email_change_token_hash',
},
emailChangeExpiresAt: {
  type: DataTypes.DATE,
  allowNull: true,
  field: 'email_change_expires_at',
},
```

(Якщо модель уже використовує `underscored: true`, можна імена без `field` — **перевір існуючий стиль**: зараз `passwordHash` → underscored `password_hash`. Використовуй camelCase без явного `field`, як `passwordHash` / `createdAt`.)

- [ ] **Step 3: Розширити `env` у `config.js`**

```js
export const env = {
  // ...existing
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  mailFrom: process.env.MAIL_FROM ?? 'noreply@localhost',
  emailTokenTtlHours: Number(process.env.EMAIL_TOKEN_TTL_HOURS ?? 24),
}
```

- [ ] **Step 4: Оновити `server/.env.example`**

```
RESEND_API_KEY=
MAIL_FROM=noreply@localhost
EMAIL_TOKEN_TTL_HOURS=24
```

- [ ] **Step 5: Запустити міграцію**

Run: `cd server && npm run db:migrate`  
Expected: exit 0

- [ ] **Step 6: Commit**

```bash
git add server/src/db/schema.js server/src/db/models.js server/src/config.js server/.env.example
git commit -m "feat(auth): add email verification columns and mail env"
```

---

### Task 2: tokenService

**Files:**
- Create: `server/src/services/tokenService.js`
- Create: `server/src/services/tokenService.test.js`
- Modify: `server/package.json` (додати test path)

**Interfaces:**
- Produces:
  - `hashToken(token: string): string` — sha256 hex
  - `createTokenPair(ttlHours: number): { token: string, tokenHash: string, expiresAt: Date }`
  - `isExpired(expiresAt: Date | null | undefined, now?: Date): boolean`

- [ ] **Step 1: Write failing tests**

```js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createTokenPair, hashToken, isExpired } from './tokenService.js'

describe('tokenService', () => {
  it('hashToken is stable sha256 hex', () => {
    const h = hashToken('abc')
    assert.equal(h, hashToken('abc'))
    assert.equal(h.length, 64)
    assert.notEqual(h, 'abc')
  })

  it('createTokenPair returns raw token, matching hash, future expiry', () => {
    const { token, tokenHash, expiresAt } = createTokenPair(24)
    assert.equal(token.length, 64)
    assert.equal(tokenHash, hashToken(token))
    assert.ok(expiresAt.getTime() > Date.now())
  })

  it('isExpired detects past dates', () => {
    assert.equal(isExpired(new Date(Date.now() - 1000)), true)
    assert.equal(isExpired(new Date(Date.now() + 60_000)), false)
    assert.equal(isExpired(null), true)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd server && node --test src/services/tokenService.test.js`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `tokenService.js`**

```js
import { createHash, randomBytes } from 'node:crypto'

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function createTokenPair(ttlHours) {
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)
  return { token, tokenHash, expiresAt }
}

export function isExpired(expiresAt, now = new Date()) {
  if (!expiresAt) return true
  return new Date(expiresAt).getTime() <= now.getTime()
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd server && node --test src/services/tokenService.test.js`  
Expected: PASS

- [ ] **Step 5: Додати файл у `package.json` scripts.test**

- [ ] **Step 6: Commit**

```bash
git add server/src/services/tokenService.js server/src/services/tokenService.test.js server/package.json
git commit -m "feat(auth): add tokenService for email tokens"
```

---

### Task 3: mailService

**Files:**
- Create: `server/src/services/mailService.js`
- Create: `server/src/services/mailService.test.js`
- Modify: `server/package.json`

**Interfaces:**
- Produces: `createMailService({ resendApiKey, mailFrom, nodeEnv })` →
  - `sendVerificationEmail({ to, verifyUrl })`
  - `sendPasswordResetEmail({ to, resetUrl })`
  - `sendEmailChangeEmail({ to, verifyUrl })`
- Якщо `resendApiKey` порожній → `console.info` з subject/to/url, resolve
- Якщо ключ є → `POST https://api.resend.com/emails` з Bearer; при !ok → throw `Error('Failed to send email')`
- У `nodeEnv === 'production'` і порожній ключ → throw одразу (не мовчати)

- [ ] **Step 1: Write failing tests** (mock `global.fetch` / stub console)

```js
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
    global.fetch = fetchMock
    const mail = createMailService({ resendApiKey: 're_test', mailFrom: 'a@b.c', nodeEnv: 'production' })
    await mail.sendPasswordResetEmail({ to: 'u@t.com', resetUrl: 'http://x/reset?token=2' })
    assert.equal(fetchMock.mock.calls.length, 1)
    const [url, init] = fetchMock.mock.calls[0].arguments
    assert.equal(url, 'https://api.resend.com/emails')
    assert.equal(init.method, 'POST')
    assert.ok(String(init.headers.Authorization).includes('re_test'))
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement mailService** (три send* делегують у внутрішній `send({ to, subject, text })`)

- [ ] **Step 4: Run — expect PASS**; оновити `package.json` test script

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(auth): add mailService with Resend and console fallback"
```

---

### Task 4: emailAuthService + schemas + register/login/verify/resend

**Files:**
- Create: `server/src/services/emailAuthService.js`
- Create: `server/src/services/emailAuthService.test.js`
- Modify: `server/src/services/schemas.js`
- Modify: `server/src/services/authService.js` (`publicUser` + optional helpers)
- Modify: `server/src/routes/auth.js`
- Modify: `server/src/index.js` (передати mail/ttl у router якщо потрібно)
- Modify: `server/package.json`

**Interfaces:**
- Zod:
  - `emailOnlySchema = z.object({ email: registerSchema.shape.email })`
  - `tokenSchema = z.object({ token: z.string().min(1) })`
  - `resetPasswordSchema = z.object({ token: z.string().min(1), password: z.string().min(8) })`
  - `changeEmailSchema = z.object({ newEmail: registerSchema.shape.email, password: z.string().min(8) })`
- `publicUser` додає `pendingEmail: user.pendingEmail ?? null`
- `createAuthRouter(db, jwtSecret, secureCookies, { mail, clientOrigin, emailTokenTtlHours })`
- `emailAuthService` functions (pure-ish з db+mail):
  - `issueEmailVerification(user, { mail, clientOrigin, ttlHours })` → updates user, sends mail, returns void
  - `verifyEmailToken(db, token, …)` → user or null
  - etc. — або логіка прямо в routes; тоді тести на extracted helpers

Рекомендовані helpers у `emailAuthService.js`:

```js
export async function startEmailVerification(user, deps) { /* createTokenPair, user.update, mail.sendVerificationEmail */ }
export async function completeEmailVerification(db, rawToken) { /* find by hash, check expiry, update verified, clear tokens, return user */ }
export async function resendEmailVerification(db, email, deps) { /* find unverified, startEmailVerification; no throw if missing */ }
```

- [ ] **Step 1: Write failing unit tests для helpers** (mock user.update / db.User.findOne / mail)

Приклади кейсів:
1. `completeEmailVerification` з валідним hash → `emailVerified true`, tokens null
2. expired → null / throw mapped to 400 на route рівні
3. `startEmailVerification` викликає mail з URL `${clientOrigin}/verify-email?token=...`

- [ ] **Step 2: Implement helpers**

- [ ] **Step 3: Оновити routes**

`POST /register`:
1. validate
2. conflict check
3. `User.create({ email, passwordHash, emailVerified: false, role default })`
4. `await startEmailVerification(user, deps)` — catch mail error → 503 `{ error: 'Failed to send email' }` (user вже є)
5. `201 { message: 'Check your email to verify your account', email }` — **без** `issueSession`

`POST /login`:
- після verifyPassword: if `!user.emailVerified` → `403 { error: 'Email not verified' }`

`POST /verify-email`:
- parse token → `completeEmailVerification` → if fail 400 → else `issueSession` + `200 { user }`

`POST /resend-verification`:
- parse email → `resendEmailVerification` → always `200 { message: 'If an account exists, a verification email was sent' }` (mail fail: лог; все одно 200 щоб не enumeration — **або** 503 якщо user found & mail failed; MVP: якщо user знайдено і mail впав → 503)

- [ ] **Step 4: Wire `createAuthRouter` у `index.js` з `createMailService(env)`**

- [ ] **Step 5: Run server tests**

Run: `cd server && npm test`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(auth): require email verification on register and login"
```

---

### Task 5: Forgot / reset password

**Files:**
- Modify: `server/src/services/emailAuthService.js`
- Modify: `server/src/services/emailAuthService.test.js`
- Modify: `server/src/routes/auth.js`

**Interfaces:**
- `startPasswordReset(user, deps)` → URL `${clientOrigin}/reset-password?token=`
- `completePasswordReset(db, rawToken, newPassword)` → hash password, clear reset fields
- forgot: always `200 { message: 'If an account exists, password reset instructions were sent' }`
- Spec: prefer verified users — `if (!user || !user.emailVerified) return 200` без листа (unverified не reset через цей канал; вони мають verify/resend)

- [ ] **Step 1: Failing tests** для start/complete reset

- [ ] **Step 2: Implement + routes `POST /forgot-password`, `POST /reset-password`**

- [ ] **Step 3: `npm test` PASS**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(auth): add forgot and reset password flow"
```

---

### Task 6: Change email

**Files:**
- Modify: `server/src/services/emailAuthService.js` (+ tests)
- Modify: `server/src/routes/auth.js`

**Interfaces:**
- `startEmailChange(user, newEmail, deps)` — check unique email; set pendingEmail + change token; mail to **newEmail** URL `${clientOrigin}/verify-email-change?token=`
- `completeEmailChange(db, rawToken)` — set email = pendingEmail, clear pending/tokens; return user
- `POST /change-email` behind `requireAuth`: load user, verifyPassword, then start
- `POST /verify-email-change`: complete + `issueSession` + `{ user }`

- [ ] **Step 1: Failing tests** (unique conflict, wrong password handled in route)

- [ ] **Step 2: Implement**

- [ ] **Step 3: `npm test` PASS**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(auth): add change-email with verification"
```

---

### Task 7: Client authApi + authStore

**Files:**
- Modify: `client/src/types/index.ts` — `pendingEmail: string | null` на `AuthUser`
- Modify: `client/src/services/authApi.ts`
- Modify: `client/src/store/authStore.ts`
- Modify: `client/src/store/authStore.test.ts`

**Interfaces:**

```ts
// authApi
register → Promise<{ message: string; email: string }>  // changed
verifyEmail(token: string) → Promise<{ user: AuthUser }>
resendVerification(email: string) → Promise<{ message: string }>
forgotPassword(email: string) → Promise<{ message: string }>
resetPassword(token: string, password: string) → Promise<{ message: string }>
changeEmail(newEmail: string, password: string) → Promise<{ message: string }>
verifyEmailChange(token: string) → Promise<{ user: AuthUser }>
```

Store:

```ts
pendingVerificationEmail: string | null
register: // sets pendingVerificationEmail, status anonymous, NO navigate responsibility
login: // on ApiError status 403 message Email not verified → set pendingVerificationEmail from attempted email
verifyEmail / verifyEmailChange: // authenticated
resendVerification / forgotPassword / resetPassword / changeEmail
clearPendingVerification: () => void
```

- [ ] **Step 1: Update store tests** — register більше no longer returns user; register leaves anonymous + pending email; login 403 sets pending

```ts
it('register sets pendingVerificationEmail and stays anonymous', async () => {
  vi.mocked(authApi.register).mockResolvedValue({
    message: 'Check your email',
    email: 'a@b.c',
  })
  await useAuthStore.getState().register('a@b.c', 'password1')
  expect(useAuthStore.getState()).toMatchObject({
    status: 'anonymous',
    user: null,
    pendingVerificationEmail: 'a@b.c',
  })
})

it('login 403 Email not verified sets pendingVerificationEmail', async () => {
  const { ApiError } = await import('@/services/api')
  vi.mocked(authApi.login).mockRejectedValue(new ApiError(403, 'Email not verified'))
  await expect(useAuthStore.getState().login('a@b.c', 'password1')).rejects.toBeTruthy()
  expect(useAuthStore.getState().pendingVerificationEmail).toBe('a@b.c')
})
```

Оновити mock `authApi` у тесті новими fn.

- [ ] **Step 2: Run `cd client && npx vitest run src/store/authStore.test.ts` — FAIL**

- [ ] **Step 3: Implement api + store**

- [ ] **Step 4: Vitest PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(client): auth API and store for email verification flows"
```

---

### Task 8: Login banner + public email pages

**Files:**
- Modify: `client/src/pages/LoginPage.tsx`
- Create: `client/src/pages/VerifyEmailPage.tsx`
- Create: `client/src/pages/ForgotPasswordPage.tsx`
- Create: `client/src/pages/ResetPasswordPage.tsx`
- Create: `client/src/pages/VerifyEmailChangePage.tsx`
- Modify: `client/src/App.tsx`

**UI behavior:**
- LoginPage: після register **не** `navigate('/vacancies')`; показати банер
- Банер якщо `pendingVerificationEmail`: текст «Підтвердіть email. Ми надіслали лист на {email}» + кнопка resend
- Лінк «Забули пароль?» → `/forgot-password`
- VerifyEmailPage: `useSearchParams` token → `verifyEmail` → navigate `/vacancies` або error
- ForgotPasswordPage / ResetPasswordPage: форми + українські повідомлення зі spec
- VerifyEmailChangePage: аналог VerifyEmail
- У `App.tsx`: ці роути **поза** `ProtectedRoute`; forgot/reset/login під `GuestRoute` (authenticated → vacancies). Verify pages — **окремо без GuestRoute**, щоб клік з пошти працював навіть якщо вже є стара сесія (після verify нова cookie)

```tsx
<Route path="/verify-email" element={<VerifyEmailPage />} />
<Route path="/verify-email-change" element={<VerifyEmailChangePage />} />
<Route element={<GuestRoute />}>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
  <Route path="/reset-password" element={<ResetPasswordPage />} />
</Route>
```

- [ ] **Step 1: Implement pages + App wiring** (reuse `Input`/`Button`/glass-card як LoginPage)

- [ ] **Step 2: Manual smoke** — `npm run dev` (client+server): register → URL у server log → відкрити verify

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(client): verification, forgot and reset password pages"
```

---

### Task 9: Account page + Header

**Files:**
- Create: `client/src/pages/AccountPage.tsx`
- Modify: `client/src/components/layout/Header.tsx`
- Modify: `client/src/App.tsx`
- Modify: `README.md` (коротка нотатка про RESEND / verify)

**UI:**
- `/account` під `ProtectedRoute`
- Поточний email; якщо `user.pendingEmail` — банер «Підтвердіть новий email: …»
- Форма: newEmail + password → `changeEmail`
- Header: клікабельний email → `/account` (або окремий лінк «Акаунт»)

- [ ] **Step 1: Implement AccountPage + Header + route**

- [ ] **Step 2: Manual check change-email flow via console link**

- [ ] **Step 3: Run full tests**

```bash
cd server && npm test
cd client && npx vitest run
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(client): account page for email change"
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| DB columns + legacy verified | 1 |
| token hash helpers | 2 |
| mail console/Resend | 3 |
| register no cookie + verify + resend + login 403 | 4 |
| forgot/reset | 5 |
| change-email + verify-email-change | 6 |
| client API/store | 7 |
| login banner + public pages | 8 |
| /account + Header | 9 |
| Out of scope OAuth/rate-limit | — (не робимо) |

## Plan self-review

- Немає TBD/placeholder кроків
- `publicUser.pendingEmail` узгоджено з Account banner
- Register response shape змінено — Task 7/8 оновлюють клієнт
- Verify pages поза GuestRoute — зафіксовано
- Backfill: `UPDATE email_verified = true` при migrate, нові create ставлять false явно
