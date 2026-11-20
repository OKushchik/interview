'use strict'

/**
 * Одне завдання з кодингу (coding_task) стає списком завдань (coding_tasks).
 * Наявний об'єкт обгортається в масив з одного елемента.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.renameColumn('vacancies', 'coding_task', 'coding_tasks')
    await queryInterface.sequelize.query(`
      UPDATE vacancies
      SET coding_tasks = jsonb_build_array(coding_tasks)
      WHERE coding_tasks IS NOT NULL AND jsonb_typeof(coding_tasks) = 'object'
    `)
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE vacancies
      SET coding_tasks = coding_tasks -> 0
      WHERE coding_tasks IS NOT NULL AND jsonb_typeof(coding_tasks) = 'array'
    `)
    await queryInterface.renameColumn('vacancies', 'coding_tasks', 'coding_task')
  },
}
