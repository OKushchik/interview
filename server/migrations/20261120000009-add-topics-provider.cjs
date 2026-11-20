'use strict'

/** Теми належать провайдеру, як і вакансії. Наявні теми переходять до провайдера автора (якщо він є). */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('topics', 'provider_id', {
      type: Sequelize.STRING,
      allowNull: true,
      references: { model: 'providers', key: 'id' },
      onDelete: 'CASCADE',
    })
    await queryInterface.sequelize.query(
      `UPDATE topics SET provider_id = users.provider_id FROM users WHERE users.id = topics.user_id`,
    )
    await queryInterface.addIndex('topics', ['provider_id', 'created_at'], { name: 'topics_provider_id_created_at_idx' })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('topics', 'topics_provider_id_created_at_idx')
    await queryInterface.removeColumn('topics', 'provider_id')
  },
}
