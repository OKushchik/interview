const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

function databaseUrl() {
  const raw = process.env.DATABASE_URL
  if (!raw) {
    throw new Error('Missing required env var DATABASE_URL')
  }
  try {
    const url = new URL(raw)
    url.searchParams.delete('schema')
    return url.toString()
  } catch {
    return raw
  }
}

const base = {
  url: databaseUrl(),
  dialect: 'postgres',
  logging: false,
  define: { underscored: true },
}

module.exports = { development: base, test: base, production: base }
