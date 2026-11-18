import type { SeniorityLevel } from './type'

export const SENIORITY_LABELS: Record<SeniorityLevel, string> = {
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
}

export const SENIORITY_COLORS: Record<SeniorityLevel, string> = {
  junior: 'text-emerald-400',
  middle: 'text-yellow-400',
  senior: 'text-red-400',
}

export const AVAILABLE_SKILLS = [
  'React', 'Angular', 'Vue', 'TypeScript', 'JavaScript',
  'Node.js', 'Laravel', 'Python', 'PostgreSQL', 'Docker',
  'Kubernetes', 'AWS', 'GraphQL', 'Redis', 'MongoDB',
  'Next.js', 'Tailwind CSS', 'Git', 'CI/CD', 'REST API',
]
