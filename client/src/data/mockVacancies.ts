import type { Vacancy } from '@/types'

export const MOCK_VACANCIES: Vacancy[] = [
  {
    id: '1',
    title: 'Frontend React Developer',
    level: 'middle',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Git'],
    description: 'Розробка сучасних SPA-додатків з React та TypeScript. Робота з REST API, state management та UI/UX.',
  },
  {
    id: '2',
    title: 'Fullstack Laravel + React',
    level: 'senior',
    skills: ['Laravel', 'React', 'PostgreSQL', 'Docker', 'REST API'],
    description: 'Повний цикл розробки: backend на Laravel, frontend на React. Архітектура, code review, менторство.',
  },
  {
    id: '3',
    title: 'Senior Node.js Engineer',
    level: 'senior',
    skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS'],
    description: 'Проєктування мікросервісної архітектури, high-load системи, оптимізація продуктивності.',
  },
  {
    id: '4',
    title: 'Junior Vue.js Developer',
    level: 'junior',
    skills: ['Vue', 'JavaScript', 'Git', 'REST API'],
    description: 'Стартова позиція для розробників, які хочуть розвиватись у Vue.js екосистемі.',
  },
  {
    id: '5',
    title: 'Python Backend Developer',
    level: 'middle',
    skills: ['Python', 'PostgreSQL', 'Docker', 'REST API', 'Redis'],
    description: 'Розробка API та бізнес-логіки на Python. Інтеграція з зовнішніми сервісами.',
  },
  {
    id: '6',
    title: 'DevOps Engineer',
    level: 'middle',
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Git'],
    description: 'Автоматизація деплою, моніторинг інфраструктури, CI/CD pipelines.',
  },
]
