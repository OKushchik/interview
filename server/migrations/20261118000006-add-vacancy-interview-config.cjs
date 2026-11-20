'use strict'

/** Збережена конфігурація співбесіди вакансії (null — користувач налаштовує сам). */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('vacancies', 'interview_config', {
      type: Sequelize.JSONB,
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('vacancies', 'interview_config')
  },
}
