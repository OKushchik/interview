'use strict'

/** Результати проходження тестів по темах (вкладка «Аналіз» в акаунті). */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('test_results', {
      id: { type: Sequelize.STRING, primaryKey: true, allowNull: false },
      user_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      // Без FK: результат має пережити видалення теми (є знімок назви й питань).
      topic_id: { type: Sequelize.STRING, allowNull: true },
      provider_id: { type: Sequelize.STRING, allowNull: true },
      topic_title: { type: Sequelize.STRING, allowNull: false },
      provider_name: { type: Sequelize.STRING, allowNull: true },
      score: { type: Sequelize.INTEGER, allowNull: false },
      correct_count: { type: Sequelize.INTEGER, allowNull: false },
      total: { type: Sequelize.INTEGER, allowNull: false },
      details: { type: Sequelize.JSONB, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    })
    await queryInterface.addIndex('test_results', ['user_id', 'created_at'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('test_results')
  },
}
