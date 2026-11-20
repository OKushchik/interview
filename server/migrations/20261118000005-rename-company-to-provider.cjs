'use strict'

/**
 * Rename company -> provider:
 * tables, columns, indexes and role enum values (company_admin -> provider_admin).
 * Data is preserved, the migration is reversible.
 */

const INDEXES = [
  ['users_company_id_idx', 'users_provider_id_idx'],
  ['vacancies_company_id_created_at_idx', 'vacancies_provider_id_created_at_idx'],
  ['user_company_access_company_id_idx', 'user_provider_access_provider_id_idx'],
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize
    await queryInterface.renameTable('companies', 'providers')
    await queryInterface.renameTable('user_company_access', 'user_provider_access')
    await queryInterface.renameColumn('users', 'company_id', 'provider_id')
    await queryInterface.renameColumn('vacancies', 'company_id', 'provider_id')
    await queryInterface.renameColumn('user_provider_access', 'company_id', 'provider_id')
    for (const [from, to] of INDEXES) {
      await q.query(`ALTER INDEX IF EXISTS "${from}" RENAME TO "${to}"`)
    }
    await q.query(`ALTER TYPE "enum_users_role" RENAME VALUE 'company_admin' TO 'provider_admin'`)
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize
    await q.query(`ALTER TYPE "enum_users_role" RENAME VALUE 'provider_admin' TO 'company_admin'`)
    for (const [from, to] of INDEXES) {
      await q.query(`ALTER INDEX IF EXISTS "${to}" RENAME TO "${from}"`)
    }
    await queryInterface.renameColumn('user_provider_access', 'provider_id', 'company_id')
    await queryInterface.renameColumn('vacancies', 'provider_id', 'company_id')
    await queryInterface.renameColumn('users', 'provider_id', 'company_id')
    await queryInterface.renameTable('user_provider_access', 'user_company_access')
    await queryInterface.renameTable('providers', 'companies')
  },
}
