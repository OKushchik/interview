# Email Verification, Password Reset & Change Email — Design Spec

Date: 2026-09-07  
Status: approved for planning

## Goal

Додати підтвердження email при реєстрації, скидання пароля та зміну email поверх існуючого Express auth (`/api/auth/*` + httpOnly JWT cookie) і React клієнта.

## Decisions

- Підхід: user у БД одразу при register; доступ лише після `emailVerified=true`
- Після register cookie **не** видаємо; login блокуємо до verify; UI показує банер «підтвердіть email»
- Після успішного verify — **auto-login** (ставимо cookie)
- Токени в БД лише як **SHA-256 hash**; сирий токен лише в листі / URL
- Mail: abstraction `mailService` — dev без ключа → console log (+ опційний Ethereal/SMTP); prod з `RESEND_API_KEY` → Resend
- Існуючі юзери при міграції: `emailVerified = true`
- Password reset і change email — у скоупі цього ж feature set

## Data model

Додати до `users`:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `email_verified` | BOOLEAN NOT NULL | `false` | міграція: UPDATE усіх існуючих → `true` |
| `email_verification_token_hash` | STRING NULL | null | sha256 hex |
| `email_verification_expires_at` | DATE NULL | null | TTL (default 24h) |
| `password_reset_token_hash` | STRING NULL | null | sha256 hex |
| `password_reset_expires_at` | DATE NULL | null | TTL 24h |
| `pending_email` | STRING NULL | null | новий email до підтвердження |
| `email_change_token_hash` | STRING NULL | null | sha256 hex |
| `email_change_expires_at` | DATE NULL | null | TTL 24h |

Після успішного використання відповідного токена — hash + expires (і `pending_email` для change) обнуляються.

Token generation: `crypto.randomBytes(32).toString('hex')`, store `sha256(token)`.

## Mail

`mailService`:

- `sendVerificationEmail({ to, verifyUrl })`
- `sendPasswordResetEmail({ to, resetUrl })`
- `sendEmailChangeEmail({ to, verifyUrl })`

Env:

| Var | Purpose |
|-----|---------|
| `RESEND_API_KEY` | якщо є — Resend; інакше console (і в prod без ключа — fail з логом) |
| `MAIL_FROM` | from address (default `noreply@localhost`) |
| `CLIENT_ORIGIN` | база для лінків (вже є) |
| `EMAIL_TOKEN_TTL_HOURS` | default `24` |

Dev: у лог друкувати повний URL з сирим token (зручно локально).

## Backend API

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| POST | `/api/auth/register` | no | Create user `emailVerified=false`, set verification token, send mail. **No cookie.** `201 { message, email }` |
| POST | `/api/auth/login` | no | If credentials ok but `!emailVerified` → `403 { error: 'Email not verified' }`. Else cookie + `{ user }` |
| POST | `/api/auth/verify-email` | no | body `{ token }` → validate → `emailVerified=true`, clear token → **set cookie** → `200 { user }` |
| POST | `/api/auth/resend-verification` | no | body `{ email }` → rotate token + send if unverified user exists. Always `200 { message }` (no email enumeration) |
| POST | `/api/auth/forgot-password` | no | body `{ email }` → if user exists (prefer verified): rotate reset token + send. Always `200 { message }` |
| POST | `/api/auth/reset-password` | no | body `{ token, password }` → validate → update `passwordHash`, clear reset token. **No cookie.** `200 { message }` |
| POST | `/api/auth/change-email` | yes | body `{ newEmail, password }` → verify current password; newEmail unique; set `pendingEmail` + change token; mail to **new** address. `200 { message }` |
| POST | `/api/auth/verify-email-change` | no* | body `{ token }` → apply `pendingEmail` → `email`, clear pending/token; re-issue cookie if session present or set session for that user. `200 { user }` |
| GET | `/api/auth/me` | yes | unchanged |
| POST | `/api/auth/logout` | — | unchanged |

\* `verify-email-change` може бути без попередньої сесії (лінк з пошти); після успіху ставимо cookie для цього user.

User DTO (публічний): `{ id, email, role, vacancies }` — без token fields. Опційно пізніше `emailVerified` не потрібен клієнту для verified-only sessions.

### Validation

- Email: як зараз (zod)
- Password: min 8 chars (як зараз)
- `newEmail` ≠ current email; unique among users (і не як чужий `pending_email` — MVP: перевірка unique на `email`; колізію pending можна ігнорувати YAGNI або block якщо `pending_email` зайнятий іншим)

### Errors

| Case | Status | Body |
|------|--------|------|
| Invalid register/login input | 400 | `{ error }` |
| Email taken (register / change) | 409 | `{ error: 'Email already registered' }` |
| Bad credentials | 401 | `{ error: 'Invalid email or password' }` |
| Login unverified | 403 | `{ error: 'Email not verified' }` |
| Bad/expired token (any verify/reset) | 400 | `{ error: 'Invalid or expired token' }` |
| Change-email wrong password | 401 | `{ error: 'Invalid email or password' }` |
| Mail provider failure (after user write) | 503 | `{ error: 'Failed to send email' }` — user/token already saved; resend/forgot можливі |
| Unauthenticated change-email | 401 | existing |

## Frontend

### Routes

| Path | Access | Purpose |
|------|--------|---------|
| `/login` | public | Login / register + banners; link «Забули пароль?» |
| `/verify-email` | public | `?token=` → verify registration → `/vacancies` |
| `/forgot-password` | public | form email → success message |
| `/reset-password` | public | `?token=` + new password form |
| `/verify-email-change` | public | `?token=` → apply change → `/vacancies` or account |
| `/account` | auth | зміна email (current password + new email); show pending banner if `pendingEmail` — **або** модалка з Header, якщо окрема сторінка зайва. Рішення MVP: мінімальна `/account` |

### Auth store changes

- `register`: **не** ставить `authenticated`; зберігає `pendingVerificationEmail`
- `login`: на 403 unverified → `pendingVerificationEmail` + error/банер
- `verifyEmail(token)` → authenticated + clear pending
- `resendVerification(email)`
- `forgotPassword(email)`, `resetPassword(token, password)`
- `changeEmail(newEmail, password)`, `verifyEmailChange(token)`

### UX copy (UK)

- Після register / unverified login: банер «Підтвердіть email. Ми надіслали лист на {email}» + кнопка «Надіслати ще раз»
- Forgot: «Якщо акаунт існує, ми надіслали інструкції»
- Reset success: «Пароль змінено. Увійдіть»
- Change email: лист на нову адресу; до підтвердження логін по старому email

## Architecture (modules)

| Module | Responsibility |
|--------|----------------|
| `server/src/db/models.js` | нові колонки User |
| `server/src/services/tokenService.js` | generate + hash + expiry helpers |
| `server/src/services/mailService.js` | send* + Resend/console |
| `server/src/services/authService.js` | register/verify/reset/change orchestration helpers |
| `server/src/routes/auth.js` | нові endpoints |
| `server/src/config.js` | mail env |
| `client/src/services/authApi.ts` | нові API calls |
| `client/src/store/authStore.ts` | pending verification + actions |
| `client/src/pages/*` | Login, VerifyEmail, Forgot/Reset, Account, VerifyEmailChange |
| `client/src/App.tsx` | routes |

## Out of scope

- OAuth / social login
- Rate limiting UI / Redis throttling (можна додати пізніше)
- Окремий admin «force verify»
- Multi-device session revoke on password reset (MVP: лише зміна passwordHash; існуючі JWT лишаються до expiry — задокументовано як прийнятний ризик MVP; опційно invalidate later)

## Manual test plan

1. Register → немає cookie; `/me` 401; у логах/листі є verify URL
2. Login до verify → 403 + банер; resend оновлює лінк
3. Verify → cookie + `/vacancies`
4. Існуючий user після migrate логіниться без verify
5. Forgot → reset → login з новим паролем
6. Change email (logged in) → лист на новий → verify → `/me` показує новий email; старий більше не логінить
7. Expired/invalid tokens → 400

## Spec self-review notes

- Немає TBD: TTL = 24h via env; mail = Resend | console
- Change-email UI: `/account` обрано явно
- Password reset: без auto-login (відмінність від email verify — навмисно)
- JWT після reset не revoke — accepted MVP risk
