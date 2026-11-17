'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vacancies', {
      id: { type: Sequelize.STRING, primaryKey: true, allowNull: false },
      user_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      company_id: {
        type: Sequelize.STRING,
        allowNull: true,
        references: { model: 'companies', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      title: { type: Sequelize.STRING, allowNull: false },
      level: {
        type: Sequelize.ENUM('junior', 'middle', 'senior'),
        allowNull: false,
      },
      skills: { type: Sequelize.ARRAY(Sequelize.STRING), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false, defaultValue: '' },
      quiz_questions: { type: Sequelize.JSONB, allowNull: true },
      bot_questions: { type: Sequelize.JSONB, allowNull: true },
      coding_task: { type: Sequelize.JSONB, allowNull: true },
      created_at: {
        type: Sequelize.DATE(3),
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE(3),
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
    await queryInterface.addIndex('vacancies', ['user_id', 'created_at'], {
      name: 'vacancies_user_id_created_at_idx',
    })
    await queryInterface.addIndex('vacancies', ['company_id', 'created_at'], {
      name: 'vacancies_company_id_created_at_idx',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vacancies')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_vacancies_level"')
  },
}
