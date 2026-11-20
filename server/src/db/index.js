import { Sequelize } from 'sequelize'
import { env } from '../config.js'
import { initModels } from './models.js'

export const sequelize = new Sequelize(env.databaseUrl, {
  dialect: 'postgres',
  logging: false,
  define: {
    underscored: true,
  },
})

const { User, Vacancy, Provider, UserProviderAccess, Topic } = initModels(sequelize)

function toUserRow(row) {
  const user = row.get({ plain: true })
  user.update = async (values) => {
    const [count, rows] = await User.update(values, {
      where: { id: user.id },
      returning: true,
    })
    if (count === 0 || !rows[0]) {
      throw new Error('User not found')
    }
    Object.assign(user, rows[0].get({ plain: true }))
    return user
  }
  return user
}

function toVacancyRow(row) {
  return row.get({ plain: true })
}

export const db = {
  User: {
    async findOne({ where }) {
      const row = await User.findOne({ where })
      return row ? toUserRow(row) : null
    },
    async findAll({ where, order } = {}) {
      const rows = await User.findAll({ where, order })
      return rows.map(toUserRow)
    },
    async create(values) {
      const row = await User.create(values)
      return toUserRow(row)
    },
    async update(values, { where }) {
      const [count, rows] = await User.update(values, { where, returning: true })
      if (count === 0 || !rows[0]) {
        throw new Error('User not found')
      }
      return toUserRow(rows[0])
    },
    async destroy({ where }) {
      return User.destroy({ where })
    },
  },
  Provider: {
    async findOne({ where }) {
      const row = await Provider.findOne({ where })
      return row ? row.get({ plain: true }) : null
    },
    async findAll({ where, order } = {}) {
      const rows = await Provider.findAll({ where, order })
      return rows.map((row) => row.get({ plain: true }))
    },
    async create(values) {
      const row = await Provider.create(values)
      return row.get({ plain: true })
    },
    async update(values, { where }) {
      const [count, rows] = await Provider.update(values, { where, returning: true })
      if (count === 0 || !rows[0]) {
        throw new Error('Provider not found')
      }
      return rows[0].get({ plain: true })
    },
    async destroy({ where }) {
      return Provider.destroy({ where })
    },
  },
  UserProviderAccess: {
    async findOne({ where }) {
      const row = await UserProviderAccess.findOne({ where })
      return row ? row.get({ plain: true }) : null
    },
    async findAll({ where } = {}) {
      const rows = await UserProviderAccess.findAll({ where })
      return rows.map((row) => row.get({ plain: true }))
    },
    async create(values) {
      const row = await UserProviderAccess.create(values)
      return row.get({ plain: true })
    },
    async destroy({ where }) {
      return UserProviderAccess.destroy({ where })
    },
  },
  Topic: {
    async findAll({ where, order } = {}) {
      const rows = await Topic.findAll({ where, order })
      return rows.map((row) => row.get({ plain: true }))
    },
    async findOne({ where }) {
      const row = await Topic.findOne({ where })
      return row ? row.get({ plain: true }) : null
    },
    async create(values) {
      const row = await Topic.create(values)
      return row.get({ plain: true })
    },
    async destroy({ where }) {
      return Topic.destroy({ where })
    },
  },
  Vacancy: {
    async findAll({ where, order }) {
      const rows = await Vacancy.findAll({ where, order })
      return rows.map(toVacancyRow)
    },
    async findOne({ where }) {
      const row = await Vacancy.findOne({
        where: {
          id: where.id,
          ...(where.userId ? { userId: where.userId } : {}),
          ...(where.providerId ? { providerId: where.providerId } : {}),
        },
      })
      return row ? toVacancyRow(row) : null
    },
    async create(values) {
      const row = await Vacancy.create(values)
      return toVacancyRow(row)
    },
    async update(values, { where }) {
      const [count, rows] = await Vacancy.update(values, { where, returning: true })
      if (count === 0 || !rows[0]) {
        throw new Error('Vacancy not found')
      }
      return toVacancyRow(rows[0])
    },
    async destroy({ where }) {
      await Vacancy.destroy({ where })
    },
  },
}

export async function initDatabase(instance = sequelize) {
  await instance.authenticate()
}
