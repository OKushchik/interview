'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('companies', {
      id: { type: Sequelize.STRING, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false },
      slug: { type: Sequelize.STRING, allowNull: false, unique: true },
      created_at: {
        type: Sequelize.DATE(3),
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('companies')
  },
}
