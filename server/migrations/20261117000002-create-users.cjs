'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.STRING, primaryKey: true, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING, allowNull: false },
      role: {
        type: Sequelize.ENUM('super_admin', 'company_admin', 'user'),
        allowNull: false,
        defaultValue: 'user',
      },
      is_guest: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      company_id: {
        type: Sequelize.STRING,
        allowNull: true,
        references: { model: 'companies', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      email_verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      email_verification_token_hash: { type: Sequelize.STRING, allowNull: true },
      email_verification_expires_at: { type: Sequelize.DATE(3), allowNull: true },
      password_reset_token_hash: { type: Sequelize.STRING, allowNull: true },
      password_reset_expires_at: { type: Sequelize.DATE(3), allowNull: true },
      pending_email: { type: Sequelize.STRING, allowNull: true },
      email_change_token_hash: { type: Sequelize.STRING, allowNull: true },
      email_change_expires_at: { type: Sequelize.DATE(3), allowNull: true },
      created_at: {
        type: Sequelize.DATE(3),
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
    await queryInterface.addIndex('users', ['company_id'], { name: 'users_company_id_idx' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role"')
  },
}
