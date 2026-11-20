'use strict'

/** Topics belong to a provider, like vacancies. Existing topics move to the author's provider (if any). */
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
