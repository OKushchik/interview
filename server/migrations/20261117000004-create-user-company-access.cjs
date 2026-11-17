'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_company_access', {
      user_id: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      company_id: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE(3),
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
    await queryInterface.addIndex('user_company_access', ['company_id'], {
      name: 'user_company_access_company_id_idx',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_company_access')
  },
}
