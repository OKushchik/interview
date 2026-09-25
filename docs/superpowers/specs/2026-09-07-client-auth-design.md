# Client Auth (Login) — Design Spec

Date: 2026-09-07  
Status: approved for planning

## Goal

Додати повний клієнтський цикл автентифікації поверх уже готового Express API (`/api/auth/*` + httpOnly JWT cookie), щоб увесь застосунок був доступний лише після логіну.

## Decisions

- Підхід: Zustand auth store + thin API client + `ProtectedRoute`
- Доступ: усе за логіном; без сесії → `/login`
- UI: одна сторінка `/login` з перемикачем «Вхід / Реєстрація»
- Сесія: лише cookie `access_token` (клієнт токен не зберігає)

## Backend contract (existing, no API changes)

| Method | Path | Behavior |
|--------|------|----------|
| POST | `/api/auth/register` | body `{ email, password }` → `201 { user }`, sets cookie |
| POST | `/api/auth/login` | body `{ email, password }` → `200 { user }`, sets cookie |
| POST | `/api/auth/logout` | clears cookie → `204` |
| GET | `/api/auth/me` | requires cookie → `200 { user }` or `401` |

User DTO: `{ id, email, vacancies }`  
Validation: email + password min 8 chars. Errors return `{ error: string }` (400/401/409).

## Architecture

| Module | Responsibility |
|--------|----------------|
| `client/src/services/api.ts` | `fetch` wrapper: JSON, `credentials: 'include'`, throw/return API errors |
| `client/src/services/authApi.ts` | `login`, `register`, `logout`, `me` |
| `client/src/store/authStore.ts` | `user`, `status` (`idle` \| `loading` \| `authenticated` \| `anonymous`), `error`, actions |
| `client/src/pages/LoginPage.tsx` | email/password form + mode toggle |
| `client/src/components/auth/ProtectedRoute.tsx` | bootstrap `/me`, render children or redirect |
| `App.tsx` | `/login` public; other routes wrapped by guard |
| `Header.tsx` | show email + logout |
| `vite.config.ts` | proxy `/api` → `http://localhost:3001` |

## UI & flow

1. App boot → `bootstrap()` → `GET /me`
2. While `status === 'loading'`: short loading state (no content flash)
3. Unauthenticated visit to protected route → redirect `/login`
4. Authenticated visit to `/login` → redirect `/vacancies`
5. Login success / register success → set user → navigate `/vacancies`
6. Logout → clear cookie + store → navigate `/login`
7. Form errors: show API `error` message under the form; network fallback in Ukrainian

Login page styling reuses existing `Input`, `Button`, and glass/surface theme (Ukrainian copy).

## Out of scope

- OAuth, password reset, email verification, remember-me
- Backend auth changes
- Migrating vacancies/interview data flows beyond auth gating

## Manual test plan

1. Cold start without cookie → lands on `/login`
2. Register → cookie set → `/vacancies`, email visible in Header
3. Logout → `/login`; subsequent `/me` is 401
4. Login with valid credentials succeeds; invalid shows error
5. Reload while logged in keeps access to protected routes
6. Direct URL to `/interview` or `/report` without session → `/login`
