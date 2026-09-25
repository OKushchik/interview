# User Roles (Admin / Candidate) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Додати ролі `admin` / `candidate`: спільний каталог вакансій для читання, створення/зміна/видалення лише для admin, кнопка створення на клієнті лише для admin; адміна призначають вручну в БД.

**Architecture:** Поле `role` на `users` (Sequelize + `schema.js` migrate). JWT без role; `/me` і write-роути читають роль з БД. `requireAdmin` після `requireAuth`. Vacancy list/get/prepare — для будь-якого auth; POST/PATCH/DELETE — admin. Клієнт ховає кнопку за `user.role`.

**Tech Stack:** Express, Sequelize, Postgres, Zod (існуючі), React + Zustand + Vitest (клієнт), Node built-in `node:test` (серверні unit-тести без нових deps).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-07-user-roles-design.md`
- Реєстрація завжди `candidate`; немає UI підвищення ролі
- JWT payload лишається `{ sub, email }` (без `role`)
- `403 { error: 'Forbidden' }` для candidate на write vacancy
- `GET /vacancies`, `GET /:id`, `POST /:id/prepare` — будь-який залогінений; каталог **повний**
- `publicUser` = `{ id, email, role, vacancies }` де `vacancies` = повний каталог
- Mock-вакансії на клієнті не мігруємо в БД у цьому плані
- Header не показує роль (YAGNI)
- Коміти лише якщо користувач явно просив; інакше пропустити commit-кроки

---

## File map

| File | Role |
|------|------|
| `server/src/db/schema.js` | enum `UserRole` + колонка `users.role` |
| `server/src/db/models.js` | поле `role` на User |
| `server/src/services/authService.js` | `publicUser` з `role` + повний каталог |
| `server/src/middleware/requireAdmin.js` | load user from DB, 403 if not admin |
| `server/src/middleware/requireAdmin.test.js` | unit tests |
| `server/src/services/vacancyService.js` | list all; get/patch/delete by id (no owner filter for admin paths) |
| `server/src/services/vacancyService.test.js` | unit tests for list/get helpers |
| `server/src/routes/vacancies.js` | wire requireAdmin + shared read/prepare |
| `server/package.json` | script `test` → `node --test` |
| `client/src/types/index.ts` | `UserRole` + `AuthUser.role` |
| `client/src/pages/VacanciesPage.tsx` | кнопка create лише для admin |
| `client/src/store/authStore.test.ts` | fixtures з `role` |

---

### Task 1: DB — `role` column + User model

**Files:**
- Modify: `server/src/db/schema.js`
- Modify: `server/src/db/models.js`

**Interfaces:**
- Consumes: існуючий `initDatabase` / `npm run db:migrate`
- Produces: колонка `users.role` (`admin` \| `candidate`, default `candidate`); Sequelize `User.role`

- [x] **Step 1: Extend `schema.js`**

У `schemaStatements` **після** створення таблиці `users` (або в кінець масиву перед/після indexes) додати:

```js
  `DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('admin', 'candidate');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'candidate';`,
```

Важливо: `CREATE TABLE IF NOT EXISTS "users"` **не** змінювати так, щоб ламати вже існуючі БД — нові інстали через `ADD COLUMN IF NOT EXISTS` покриті. Опційно можна додати `"role"` у CREATE TABLE для чистих інсталів:

```js
  `CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'candidate',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
  );`,
```

Якщо `CREATE TYPE` іде **після** `CREATE TABLE` з посиланням на `UserRole`, Postgres впаде на чистій БД. Тому порядок у масиві має бути:

1. `CREATE TYPE "UserRole"`
2. `CREATE TYPE "SeniorityLevel"` (існуючий)
3. `CREATE TABLE users` (з `role` або без + окремий `ALTER`)
4. решта як зараз

Практичний безпечний варіант (рекомендований у цьому task):

1. Залишити існуючий `CREATE TABLE users` без `role`
2. Після нього (і після `CREATE TYPE UserRole`) додати лише `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`

Порядок statements:

```js
export const schemaStatements = [
  `DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('admin', 'candidate');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;`,
  // ... existing SeniorityLevel + CREATE TABLE users (без role) + vacancies ...
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'candidate';`,
  // ... existing indexes / FKs ...
]
```

Встав `ALTER` після блоку створення `users` (після рядка з `CREATE TABLE IF NOT EXISTS "users"`), щоб колонка існувала до FK-операцій — порядок відносно vacancies не критичний.

- [x] **Step 2: Add `role` to Sequelize User model**

У `server/src/db/models.js` всередині `User.init({...})` після `passwordHash`:

```js
      role: {
        type: DataTypes.ENUM('admin', 'candidate'),
        allowNull: false,
        defaultValue: 'candidate',
      },
```

- [x] **Step 3: Run migrate**

Run: `cd server && npm run db:migrate`

Expected: `Database schema is up to date` без SQL errors.

- [ ] **Step 4: Commit (лише якщо користувач просив)**

```bash
git add server/src/db/schema.js server/src/db/models.js
git commit -m "feat(db): add users.role admin|candidate"
```

---

### Task 2: `publicUser.role` + `requireAdmin`

**Files:**
- Modify: `server/src/services/authService.js`
- Modify: `server/src/services/vacancyService.js` (мінімально: `listVacancies` без filter — потрібен для Task 2 `publicUser`; повні get/patch у Task 3)
- Create: `server/src/middleware/requireAdmin.js`
- Create: `server/src/middleware/requireAdmin.test.js`
- Modify: `server/package.json` (script `test`)

**Interfaces:**
- Consumes: `db.User.findOne`, `listVacancies(db)` (повний каталог)
- Produces:
  - `publicUser(db, user) → { id, email, role, vacancies }`
  - `createRequireAdmin(db, jwtSecret)` → Express middleware (викликати **після** або замість окремого ланцюга: спочатку auth, потім admin)
  - Рекомендований API: `createRequireAdmin(db)` очікує вже `req.user.id` від `requireAuth`

- [ ] **Step 1: Change `listVacancies` to full catalog**

У `server/src/services/vacancyService.js` замінити:

```js
export async function listVacancies(db, userId) {
  const rows = await db.Vacancy.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  })
  return rows.map(toVacancyDto)
}
```

на:

```js
export async function listVacancies(db) {
  const rows = await db.Vacancy.findAll({
    where: {},
    order: [['createdAt', 'DESC']],
  })
  return rows.map(toVacancyDto)
}
```

Примітка: `db.Vacancy.findAll` у `server/src/db/index.js` передає `where` у Sequelize — порожній `{}` ок. Оновити всі call sites, що передавали `userId`:

- `authService.publicUser`: `listVacancies(db, user.id)` → `listVacancies(db)`
- `routes/vacancies.js` GET `/`: `listVacancies(db, req.user.id)` → `listVacancies(db)` (зробити тут або в Task 3; обов’язково до кінця Task 3)

- [ ] **Step 2: Update `publicUser`**

У `server/src/services/authService.js`:

```js
export async function publicUser(db, user) {
  const vacancies = await listVacancies(db)
  return {
    id: user.id,
    email: user.email,
    role: user.role ?? 'candidate',
    vacancies,
  }
}
```

`user.role` має приходити з `db.User.findOne` / `create` (Sequelize plain object). Переконайся, що `toUserRow` / `get({ plain: true })` включає `role`.

- [ ] **Step 3: Write failing tests for `requireAdmin`**

Create `server/src/middleware/requireAdmin.test.js`:

```js
import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'
import { createRequireAdmin } from './requireAdmin.js'

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
  return res
}

describe('createRequireAdmin', () => {
  it('calls next when user role is admin', async () => {
    const db = {
      User: {
        findOne: mock.fn(async () => ({ id: '1', email: 'a@b.c', role: 'admin' })),
      },
    }
    const requireAdmin = createRequireAdmin(db)
    const req = { user: { id: '1', email: 'a@b.c' } }
    const res = mockRes()
    let nextCalled = false
    await requireAdmin(req, res, () => {
      nextCalled = true
    })
    assert.equal(nextCalled, true)
    assert.equal(req.user.role, 'admin')
  })

  it('responds 403 when user role is candidate', async () => {
    const db = {
      User: {
        findOne: mock.fn(async () => ({ id: '1', email: 'a@b.c', role: 'candidate' })),
      },
    }
    const requireAdmin = createRequireAdmin(db)
    const req = { user: { id: '1', email: 'a@b.c' } }
    const res = mockRes()
    let nextCalled = false
    await requireAdmin(req, res, () => {
      nextCalled = true
    })
    assert.equal(nextCalled, false)
    assert.equal(res.statusCode, 403)
    assert.deepEqual(res.body, { error: 'Forbidden' })
  })

  it('responds 401 when user missing in DB', async () => {
    const db = {
      User: {
        findOne: mock.fn(async () => null),
      },
    }
    const requireAdmin = createRequireAdmin(db)
    const req = { user: { id: 'missing', email: 'x@y.z' } }
    const res = mockRes()
    let nextCalled = false
    await requireAdmin(req, res, () => {
      nextCalled = true
    })
    assert.equal(nextCalled, false)
    assert.equal(res.statusCode, 401)
    assert.deepEqual(res.body, { error: 'Unauthorized' })
  })
})
```

- [ ] **Step 4: Run test — expect FAIL**

Run: `cd server && node --test src/middleware/requireAdmin.test.js`

Expected: FAIL (module not found / export missing).

- [ ] **Step 5: Implement `requireAdmin.js`**

Create `server/src/middleware/requireAdmin.js`:

```js
export function createRequireAdmin(db) {
  return async function requireAdmin(req, res, next) {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      const user = await db.User.findOne({ where: { id: req.user.id } })
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      if (user.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden' })
        return
      }
      req.user = { ...req.user, role: user.role, email: user.email }
      next()
    } catch (error) {
      next(error)
    }
  }
}
```

- [ ] **Step 6: Add test script + run PASS**

У `server/package.json` scripts:

```json
"test": "node --test src/**/*.test.js"
```

Run: `cd server && npm test`

Expected: PASS (requireAdmin tests; vacancyService tests можуть з’явитись у Task 3).

Якщо glob `src/**/*.test.js` на Windows через npm глючить, використай:

```json
"test": "node --test src/middleware/requireAdmin.test.js src/services/vacancyService.test.js"
```

і оновлюй список у міру додавання файлів.

- [ ] **Step 7: Commit (якщо просили)**

```bash
git add server/src/services/authService.js server/src/services/vacancyService.js server/src/middleware/requireAdmin.js server/src/middleware/requireAdmin.test.js server/package.json
git commit -m "feat(auth): expose role and requireAdmin middleware"
```

---

### Task 3: Vacancies routes — shared read + admin write

**Files:**
- Modify: `server/src/services/vacancyService.js`
- Create: `server/src/services/vacancyService.test.js`
- Modify: `server/src/routes/vacancies.js`

**Interfaces:**
- Consumes: `createRequireAdmin(db)`, `requireAuth`
- Produces:
  - `getVacancy(db, id) → VacancyDto | null`
  - `patchVacancy(db, id, input) → VacancyDto | null` (без `userId` filter)
  - `deleteVacancy(db, id) → boolean`
  - `getOwnedVacancy` можна залишити невикористаним або видалити call sites

- [ ] **Step 1: Failing tests for get/list helpers**

Create `server/src/services/vacancyService.test.js`:

```js
import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'
import { getVacancy, listVacancies } from './vacancyService.js'

describe('listVacancies', () => {
  it('loads all vacancies without userId filter', async () => {
    const findAll = mock.fn(async ({ where }) => {
      assert.deepEqual(where, {})
      return [
        {
          id: 'v1',
          userId: 'admin1',
          title: 'FE',
          level: 'junior',
          skills: ['React'],
          description: '',
          quizQuestions: null,
          botQuestions: null,
          codingTask: null,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ]
    })
    const db = { Vacancy: { findAll } }
    const result = await listVacancies(db)
    assert.equal(result.length, 1)
    assert.equal(result[0].id, 'v1')
  })
})

describe('getVacancy', () => {
  it('finds by id only', async () => {
    const findOne = mock.fn(async ({ where }) => {
      assert.deepEqual(where, { id: 'v1' })
      return {
        id: 'v1',
        userId: 'admin1',
        title: 'FE',
        level: 'junior',
        skills: ['React'],
        description: '',
        quizQuestions: null,
        botQuestions: null,
        codingTask: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      }
    })
    const db = { Vacancy: { findOne } }
    const vacancy = await getVacancy(db, 'v1')
    assert.equal(vacancy.id, 'v1')
  })

  it('returns null when missing', async () => {
    const db = {
      Vacancy: {
        findOne: mock.fn(async () => null),
      },
    }
    assert.equal(await getVacancy(db, 'missing'), null)
  })
})
```

Якщо `toVacancyDto` очікує інші поля — підлаштуй fixture під реальний DTO з `schemas.js` (прочитай `toVacancyDto` і скопіюй мінімально валідний row).

- [ ] **Step 2: Run — expect FAIL on `getVacancy`**

Run: `cd server && node --test src/services/vacancyService.test.js`

Expected: FAIL (`getVacancy` not exported) або FAIL на `listVacancies` signature.

- [ ] **Step 3: Implement service functions**

У `vacancyService.js` додати/замінити:

```js
export async function getVacancy(db, id) {
  const row = await db.Vacancy.findOne({ where: { id } })
  return row ? toVacancyDto(row) : null
}

export async function patchVacancy(db, id, input) {
  const existing = await db.Vacancy.findOne({ where: { id } })
  if (!existing) return null

  const normalized = normalizeVacancyFields({
    quizQuestions: input.quizQuestions,
    botQuestions: input.botQuestions,
    codingTask: input.codingTask,
  })

  const values = {}
  if (input.title !== undefined) values.title = input.title
  if (input.level !== undefined) values.level = input.level
  if (input.skills !== undefined) values.skills = input.skills
  if (input.description !== undefined) values.description = input.description
  if (input.quizQuestions !== undefined) values.quizQuestions = normalized.quizQuestions ?? null
  if (input.botQuestions !== undefined) values.botQuestions = normalized.botQuestions ?? null
  if (input.codingTask !== undefined) values.codingTask = normalized.codingTask ?? null

  const row = await db.Vacancy.update(values, { where: { id } })
  return toVacancyDto(row)
}

export async function deleteVacancy(db, id) {
  const existing = await db.Vacancy.findOne({ where: { id } })
  if (!existing) return false
  await db.Vacancy.destroy({ where: { id } })
  return true
}
```

Видалити або залишити `getOwnedVacancy` / старі сигнатури `patchVacancy(db, userId, id, input)` — **замінити** на нові сигнатури й оновити всі імпорти. Не лишати дві overload-версії.

`createVacancy(db, userId, input)` без змін (автор = admin user id).

- [ ] **Step 4: Wire `vacancies.js` routes**

```js
import { Router } from 'express'
import { createRequireAuth } from '../middleware/requireAuth.js'
import { createRequireAdmin } from '../middleware/requireAdmin.js'
import { prepareSchema, vacancyCreateSchema, vacancyPatchSchema } from '../services/schemas.js'
import {
  createVacancy,
  deleteVacancy,
  getVacancy,
  listVacancies,
  patchVacancy,
} from '../services/vacancyService.js'
import { prepareInterview } from '../services/prepareInterview.js'

export function createVacanciesRouter(db, jwtSecret, generator) {
  const router = Router()
  const requireAuth = createRequireAuth(jwtSecret)
  const requireAdmin = createRequireAdmin(db)

  router.use(requireAuth)

  router.get('/', async (req, res, next) => {
    try {
      const vacancies = await listVacancies(db)
      res.json({ vacancies })
    } catch (error) {
      next(error)
    }
  })

  router.post('/', requireAdmin, async (req, res, next) => {
    try {
      const parsed = vacancyCreateSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }
      const vacancy = await createVacancy(db, req.user.id, parsed.data)
      res.status(201).json({ vacancy })
    } catch (error) {
      next(error)
    }
  })

  router.get('/:id', async (req, res, next) => {
    try {
      const vacancy = await getVacancy(db, req.params.id)
      if (!vacancy) {
        res.status(404).json({ error: 'Vacancy not found' })
        return
      }
      res.json({ vacancy })
    } catch (error) {
      next(error)
    }
  })

  router.patch('/:id', requireAdmin, async (req, res, next) => {
    try {
      const parsed = vacancyPatchSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }
      const vacancy = await patchVacancy(db, req.params.id, parsed.data)
      if (!vacancy) {
        res.status(404).json({ error: 'Vacancy not found' })
        return
      }
      res.json({ vacancy })
    } catch (error) {
      next(error)
    }
  })

  router.delete('/:id', requireAdmin, async (req, res, next) => {
    try {
      const deleted = await deleteVacancy(db, req.params.id)
      if (!deleted) {
        res.status(404).json({ error: 'Vacancy not found' })
        return
      }
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  router.post('/:id/prepare', async (req, res, next) => {
    try {
      const parsed = prepareSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }

      const vacancy = await getVacancy(db, req.params.id)
      if (!vacancy) {
        res.status(404).json({ error: 'Vacancy not found' })
        return
      }

      const prepared = await prepareInterview(vacancy, parsed.data, generator)
      res.json({
        vacancy,
        config: parsed.data,
        ...prepared,
      })
    } catch (error) {
      next(error)
    }
  })

  return router
}
```

- [ ] **Step 5: Run all server tests**

Run: `cd server && npm test`

Expected: PASS.

- [ ] **Step 6: Manual smoke (optional but recommended)**

1. Зареєструвати candidate → `GET /api/auth/me` містить `"role":"candidate"`
2. Candidate `POST /api/vacancies` → 403
3. SQL: `UPDATE users SET role = 'admin' WHERE email = '...';`
4. Reload `/me` → `"role":"admin"`; `POST /vacancies` → 201

- [ ] **Step 7: Commit (якщо просили)**

```bash
git add server/src/services/vacancyService.js server/src/services/vacancyService.test.js server/src/routes/vacancies.js server/package.json
git commit -m "feat(vacancies): shared catalog reads, admin-only writes"
```

---

### Task 4: Client — `AuthUser.role` + hide create button

**Files:**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/pages/VacanciesPage.tsx`
- Modify: `client/src/store/authStore.test.ts`

**Interfaces:**
- Consumes: `user.role` з `/api/auth/me` (і login/register)
- Produces: UI create тільки для `admin`

- [ ] **Step 1: Update types**

У `client/src/types/index.ts` замінити `AuthUser` на:

```ts
export type UserRole = 'admin' | 'candidate'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  vacancies: unknown[]
}
```

- [ ] **Step 2: Update authStore test fixtures**

У `client/src/store/authStore.test.ts` у всіх mock user objects додати `role: 'candidate'` (або `'admin'` де доречно), наприклад:

```ts
user: { id: 'u1', email: 'a@b.c', role: 'candidate', vacancies: [] }
```

- [ ] **Step 3: Gate create UI on VacanciesPage**

У `client/src/pages/VacanciesPage.tsx`:

1. Імпорт store:

```ts
import { useAuthStore } from '@/store/authStore'
```

2. У компоненті:

```ts
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
```

3. Обгорнути кнопку створення:

```tsx
        {isAdmin && (
          <div className="flex justify-center">
            <Button size="lg" onClick={() => setShowCreateModal(true)}>
              <Plus size={20} />
              Створити власну вакансію
            </Button>
          </div>
        )}
```

4. Рендерити модалку лише для admin (або лишити з `isOpen={showCreateModal}` — безпечно, бо `showCreateModal` не відкриється без кнопки; краще явно):

```tsx
      {isAdmin && (
        <CreateVacancyModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onNext={handleCreateNext}
        />
      )}
```

`InterviewConfigModal` і картки вакансій — без змін (admin і candidate стартують тест).

- [ ] **Step 4: Run client tests**

Run: `cd client && npm test`

Expected: PASS.

- [ ] **Step 5: Manual UI check**

1. Увійти як candidate → немає кнопки «Створити власну вакансію»
2. Зробити юзера admin у БД, reload → кнопка є
3. Candidate далі бачить картки і може стартувати інтерв’ю

- [ ] **Step 6: Commit (якщо просили)**

```bash
git add client/src/types/index.ts client/src/pages/VacanciesPage.tsx client/src/store/authStore.test.ts
git commit -m "feat(ui): show create vacancy only for admin"
```

- [ ] **Step 7: Mark spec approved (optional doc hygiene)**

У `docs/superpowers/specs/2026-09-07-user-roles-design.md` змінити `Status: pending user review` → `Status: approved`.

---

## Spec coverage checklist (self-review)

| Spec item | Task |
|-----------|------|
| `users.role` enum + default candidate | Task 1 |
| Register always candidate | Task 1 default + Task 2 (не передавати role у create) |
| Manual SQL admin | documented in spec; smoke Task 3 |
| `publicUser` includes role + full vacancies | Task 2 |
| JWT without role | unchanged `requireAuth.js` |
| `requireAdmin` → 403 | Task 2 |
| GET list/get + prepare any auth | Task 3 |
| POST/PATCH/DELETE admin only | Task 3 |
| Client hide create button | Task 4 |
| Admin can still take interview | Task 4 (no gate on start) |
| Header role label out of scope | not implemented |
| Mock vacancies migration out of scope | not implemented |
