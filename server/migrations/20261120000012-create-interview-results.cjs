'use strict'

/** Результати співбесід по вакансіях (вкладка «Результати» для адмінів). Знімок назви вакансії й провайдера. */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('interview_results', {
      id: { type: Sequelize.STRING, primaryKey: true, allowNull: false },
      user_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      // Без FK: результат має пережити видалення вакансії.
      vacancy_id: { type: Sequelize.STRING, allowNull: true },
      provider_id: { type: Sequelize.STRING, allowNull: true },
      vacancy_title: { type: Sequelize.STRING, allowNull: false },
      provider_name: { type: Sequelize.STRING, allowNull: true },
      level: { type: Sequelize.STRING, allowNull: true },
      score: { type: Sequelize.INTEGER, allowNull: false },
      report: { type: Sequelize.JSONB, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    })
    await queryInterface.addIndex('interview_results', ['provider_id', 'score'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('interview_results')
  },
}
