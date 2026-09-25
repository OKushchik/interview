# AI Interview Simulator

Платформа для автоматизованих технічних співбесід з AI-аналізом відповідей.

## Технології

- **React 19** + **Vite 6** + **TypeScript**
- **Tailwind CSS 4** — dark cyberpunk тема
- **Zustand** — state management
- **Framer Motion** — анімації модалок
- **Lucide React** — іконки
- **Web Speech API** — голосовий ввід
- **OpenAI API** — генерація питань та аналіз (опціонально)

## Запуск

Фронтенд лежить у `client/`. З кореня репозиторію:

```bash
npm run dev
```

Або безпосередньо:

```bash
cd client
npm install
npm run dev
```

Якщо `node_modules` лишилися в корені після перенесення — встановіть залежності саме в `client/`.

Відкрийте http://localhost:5173

## Конфігурація AI

Скопіюйте `.env.example` в `.env` у корені репозиторію (Vite читає його звідти):

```bash
cp .env.example .env
```

- `VITE_USE_MOCK_AI=true` — використовувати mock-дані (за замовчуванням)
- `VITE_OPENAI_API_KEY` — ваш API ключ OpenAI для реальної генерації

## Функціонал

- Сторінка вакансій з готовими та кастомними позиціями
- Модалка створення вакансії (назва, рівень, скіли)
- Конфігурація співбесіди (Quiz / Online Bot, кількість питань, кодинг)
- Quiz-режим з прогрес-баром та варіантами відповідей
- Online Bot з текстовим та голосовим вводом + AI фідбек
- Секція онлайн-кодингу
- AI Summary Report після завершення


## Set Admin role
UPDATE users SET role = 'admin' WHERE email = 'user@gmail.com';

## Автентифікація / email

Реєстрація вимагає підтвердження email (лінк у листі). У development без `RESEND_API_KEY` лінк друкується в лог API-сервера.

Серверні змінні (`server/.env`): `RESEND_API_KEY`, `MAIL_FROM`, `EMAIL_TOKEN_TTL_HOURS`, `CLIENT_ORIGIN`.

Після міграції БД (`cd server && npm run db:migrate`) існуючі акаунти лишаються verified.

## Структура

```
client/
├── src/
│   ├── components/
│   │   ├── ui/          # Button, Card, Modal, Input...
│   │   ├── layout/      # Header
│   │   ├── vacancies/   # VacancyCard
│   │   ├── modals/      # CreateVacancy, InterviewConfig
│   │   ├── interview/   # Quiz, Bot, Coding
│   │   └── report/      # SummaryReport
│   ├── pages/           # Vacancies, Interview, Report
│   ├── store/           # Zustand store
│   ├── services/        # AI service
│   ├── hooks/           # useSpeechRecognition
│   ├── data/            # Mock vacancies
│   └── types/           # TypeScript types
├── index.html
├── package.json
└── vite.config.ts
.env.example
```