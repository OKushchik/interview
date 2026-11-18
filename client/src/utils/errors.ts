import { ApiError } from '@/services/api'

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message ? error.message : fallback
}
