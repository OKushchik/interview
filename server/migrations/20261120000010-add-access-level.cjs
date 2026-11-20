'use strict'

/**
 * Рівень доступу до провайдера: 'manage' (редагування) або 'view' (лише перегляд).
 * Наявні записи provider_admin — 'manage', решта — 'view'.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_provider_access', 'access_level', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'view',
    })
    await queryInterface.sequelize.query(
      `UPDATE user_provider_access SET access_level = 'manage'
       WHERE user_id IN (SELECT id FROM users WHERE role = 'provider_admin')`,
    )
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('user_provider_access', 'access_level')
  },
}
