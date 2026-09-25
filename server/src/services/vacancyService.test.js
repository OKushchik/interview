import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'
import { getVacancy, listVacancies } from './vacancyService.js'

const sampleRow = {
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

describe('listVacancies', () => {
  it('loads all vacancies without userId filter', async () => {
    const findAll = mock.fn(async ({ where }) => {
      assert.deepEqual(where, {})
      return [sampleRow]
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
      return sampleRow
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
