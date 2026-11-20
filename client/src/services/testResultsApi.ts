import type { InterviewResultSummary, OwnInterviewResult, TeamResult, TestResult } from '@/types'
import { apiRequest } from './api'

export const testResultsApi = {
  async list(): Promise<TestResult[]> {
    const data = await apiRequest<{ results: TestResult[] }>('/api/test-results')
    return data.results
  },
  /** Власні результати співбесід поточного користувача. */
  async listInterviews(): Promise<OwnInterviewResult[]> {
    const data = await apiRequest<{ results: OwnInterviewResult[] }>('/api/test-results/interviews')
    return data.results
  },
  /** Результати користувачів по провайдерах адміна, від найкращих. */
  async listTeam(providerId?: string): Promise<TeamResult[]> {
    const query = providerId ? `?providerId=${encodeURIComponent(providerId)}` : ''
    const data = await apiRequest<{ results: TeamResult[] }>(`/api/test-results/team${query}`)
    return data.results
  },
  /** Результати співбесід по провайдерах адміна, від найкращих. */
  async listTeamInterviews(providerId?: string): Promise<InterviewResultSummary[]> {
    const query = providerId ? `?providerId=${encodeURIComponent(providerId)}` : ''
    const data = await apiRequest<{ results: InterviewResultSummary[] }>(`/api/test-results/team/interviews${query}`)
    return data.results
  },
  async saveTopicResult(slug: string, topicId: string, answers: Record<string, number>): Promise<TestResult> {
    const data = await apiRequest<{ result: TestResult }>(
      `/api/providers/${encodeURIComponent(slug)}/topics/${encodeURIComponent(topicId)}/results`,
      { method: 'POST', body: JSON.stringify({ answers }) },
    )
    return data.result
  },
}
