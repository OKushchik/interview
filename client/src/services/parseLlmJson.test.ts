import { describe, expect, it } from 'vitest'
import { parseLlmJson } from './parseLlmJson'

describe('parseLlmJson', () => {
  it('parses a plain JSON object', () => {
    expect(parseLlmJson('{"questions":[]}')).toEqual({ questions: [] })
  })

  it('parses JSON wrapped in a markdown json fence', () => {
    const raw = '```json\n{"questions":[{"question":"What is REST?"}]}\n```'
    expect(parseLlmJson(raw)).toEqual({
      questions: [{ question: 'What is REST?' }],
    })
  })

  it('parses JSON wrapped in a fence without a language tag', () => {
    const raw = '```\n{"score":80,"maxScore":100}\n```'
    expect(parseLlmJson(raw)).toEqual({ score: 80, maxScore: 100 })
  })

  it('parses JSON with surrounding prose', () => {
    const raw = 'Here is the result:\n{"questions":[]}\nDone.'
    expect(parseLlmJson(raw)).toEqual({ questions: [] })
  })
})
