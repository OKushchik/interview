import { initDatabase, sequelize } from './index.js'

await initDatabase()
await sequelize.close()
console.log('Database schema is up to date')
