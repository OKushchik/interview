# User Roles (Admin / Candidate) — Design Spec

Date: 2026-09-07  
Status: approved

## Goal

Розділити користувачів на `admin` і `candidate`: адмін створює (і може проходити) вакансії; кандидат бачить спільний каталог і лише проходить тестування. Призначення адміна — вручну в БД.

## Decisions

- Підхід: поле `role` на `users` + серверні перевірки + умовна кнопка на клієнті
- Реєстрація завжди створює `candidate`
- Адміна виставляють SQL/`UPDATE` за email
- Каталог вакансій спільний: усі залогінені читають; писати може лише `admin`
- Адмін також може проходити співбесіду

## Data model

Додати до `users`:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `role` | enum `admin` \| `candidate` | `candidate` | NOT NULL |

`vacancies.user_id` лишається (автор = адмін, який створив). Зміна власності не потрібна.

Призначити адміна (операційна інструкція):

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@mail.com';
```

Після `UPDATE` клієнт підхопить роль через `GET /api/auth/me` (reload / bootstrap). Перелогін не обов’язковий, якщо `/me` читає роль з БД.

## Backend

### User DTO

`publicUser` повертає:

```ts
{ id: string; email: string; role: 'admin' | 'candidate'; vacancies: VacancyDto[] }
```

### Auth

- `POST /register` — завжди `role: 'candidate'`
- JWT лишає payload `{ sub, email }` (без role у токені)
- На write-операціях і в `/me` роль читається з БД (`User.findOne`)

### Middleware

- Існуючий `requireAuth` без змін по сенсу
- Новий `requireAdmin`: якщо `user.role !== 'admin'` → `403 { error: 'Forbidden' }`
  - Реалізація: після JWT завантажити User з БД (або розширити `requireAuth` контекст `req.user` свіжою роллю на vacancy write routes)

### Vacancies API

| Method | Path | Who | Behavior change |
|--------|------|-----|-----------------|
| GET | `/api/vacancies` | any auth | Список **усіх** вакансій (не лише `user_id` поточного) |
| GET | `/api/vacancies/:id` | any auth | Будь-яка вакансія за id (не `getOwnedVacancy`) |
| POST | `/api/vacancies` | admin | `requireAdmin`; інакше 403 |
| PATCH | `/api/vacancies/:id` | admin | `requireAdmin`; оновлення без обмеження «лише свій» або лише admin-owned — MVP: будь-яка вакансія для admin |
| DELETE | `/api/vacancies/:id` | admin | як PATCH |
| POST | `/api/vacancies/:id/prepare` | any auth | Доступ за id без перевірки власника |

`listVacancies` / `publicUser.vacancies` і `GET /api/vacancies` повертають **один і той самий повний каталог** (усі вакансії), щоб роль і клієнт не розходились у даних.

## Frontend

- `AuthUser.role: 'admin' | 'candidate'`
- `VacanciesPage`: кнопка «Створити власну вакансію» + `CreateVacancyModal` лише при `user.role === 'admin'`
- Старт інтерв’ю доступний і admin, і candidate
- Header: роль у MVP не показувати (YAGNI)
- Ховання UI не замінює серверний 403

## Error handling

| Case | Response |
|------|----------|
| Candidate POST/PATCH/DELETE vacancy | 403 `{ error: 'Forbidden' }` |
| Unauthenticated | 401 (існуюче) |
| Vacancy not found (GET/prepare) | 404 |

## Out of scope

- UI для підвищення до admin
- Allowlist email у `.env`
- Окремі права «admin не може проходити тест»
- Міграція існуючих mock-вакансій у БД (клієнтські mock можуть лишитись до окремого task)

## Manual test plan

1. Зареєструвати нового юзера → `role = candidate`, кнопки створення немає
2. Candidate: `POST /api/vacancies` → 403
3. `UPDATE` email → `admin`; reload → кнопка створення з’являється
4. Admin створює вакансію → вона видна іншому candidate в каталозі
5. Candidate стартує `prepare` по id адмінської вакансії → 200
6. Admin також може стартувати інтерв’ю
