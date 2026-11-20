import { DataTypes, Model } from 'sequelize'

export class User extends Model {}

export class Vacancy extends Model {}

export class Provider extends Model {}

export class Topic extends Model {}

export class UserProviderAccess extends Model {}

export class TestResult extends Model {}

export class InterviewResult extends Model {}

export function initModels(sequelize) {
  User.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('super_admin', 'provider_admin', 'user'),
        allowNull: false,
        defaultValue: 'user',
      },
      isGuest: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      providerId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      emailVerificationTokenHash: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      emailVerificationExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      passwordResetTokenHash: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      passwordResetExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      pendingEmail: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      emailChangeTokenHash: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      emailChangeExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'users',
      modelName: 'User',
      timestamps: true,
      updatedAt: false,
      underscored: true,
    },
  )

  Vacancy.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      providerId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      level: {
        type: DataTypes.ENUM('junior', 'middle', 'senior'),
        allowNull: false,
      },
      skills: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
      },
      quizQuestions: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      botQuestions: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      codingTasks: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      interviewConfig: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'vacancies',
      modelName: 'Vacancy',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['user_id', 'created_at'] },
        { fields: ['provider_id', 'created_at'] },
      ],
    },
  )

  Provider.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'providers',
      modelName: 'Provider',
      timestamps: true,
      updatedAt: false,
      underscored: true,
    },
  )

  UserProviderAccess.init(
    {
      userId: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      providerId: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      // 'manage' — редагування (provider_admin), 'view' — лише перегляд.
      accessLevel: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'view',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'user_provider_access',
      modelName: 'UserProviderAccess',
      timestamps: true,
      updatedAt: false,
      underscored: true,
    },
  )

  Topic.init(
    {
      id: { type: DataTypes.STRING, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      userId: { type: DataTypes.STRING, allowNull: false },
      providerId: { type: DataTypes.STRING, allowNull: true },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
      content: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
      quizQuestions: { type: DataTypes.JSONB, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      tableName: 'topics',
      modelName: 'Topic',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['provider_id', 'created_at'] }],
    },
  )

  TestResult.init(
    {
      id: { type: DataTypes.STRING, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      userId: { type: DataTypes.STRING, allowNull: false },
      topicId: { type: DataTypes.STRING, allowNull: true },
      providerId: { type: DataTypes.STRING, allowNull: true },
      topicTitle: { type: DataTypes.STRING, allowNull: false },
      providerName: { type: DataTypes.STRING, allowNull: true },
      score: { type: DataTypes.INTEGER, allowNull: false },
      correctCount: { type: DataTypes.INTEGER, allowNull: false },
      total: { type: DataTypes.INTEGER, allowNull: false },
      details: { type: DataTypes.JSONB, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      tableName: 'test_results',
      modelName: 'TestResult',
      timestamps: true,
      updatedAt: false,
      underscored: true,
      indexes: [{ fields: ['user_id', 'created_at'] }],
    },
  )

  InterviewResult.init(
    {
      id: { type: DataTypes.STRING, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      userId: { type: DataTypes.STRING, allowNull: false },
      vacancyId: { type: DataTypes.STRING, allowNull: true },
      providerId: { type: DataTypes.STRING, allowNull: true },
      vacancyTitle: { type: DataTypes.STRING, allowNull: false },
      providerName: { type: DataTypes.STRING, allowNull: true },
      level: { type: DataTypes.STRING, allowNull: true },
      score: { type: DataTypes.INTEGER, allowNull: false },
      report: { type: DataTypes.JSONB, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      tableName: 'interview_results',
      modelName: 'InterviewResult',
      timestamps: true,
      updatedAt: false,
      underscored: true,
      indexes: [{ fields: ['provider_id', 'score'] }],
    },
  )

  User.hasMany(InterviewResult, { foreignKey: 'userId', onDelete: 'CASCADE' })
  InterviewResult.belongsTo(User, { foreignKey: 'userId' })

  User.hasMany(TestResult, { foreignKey: 'userId', onDelete: 'CASCADE' })
  TestResult.belongsTo(User, { foreignKey: 'userId' })

  Provider.hasMany(Topic, { foreignKey: 'providerId', onDelete: 'CASCADE' })
  Topic.belongsTo(Provider, { foreignKey: 'providerId' })

  User.hasMany(Topic, { foreignKey: 'userId', onDelete: 'CASCADE' })
  Topic.belongsTo(User, { foreignKey: 'userId' })

  User.hasMany(Vacancy, { foreignKey: 'userId', onDelete: 'CASCADE' })
  Vacancy.belongsTo(User, { foreignKey: 'userId' })

  Provider.hasMany(Vacancy, { foreignKey: 'providerId', onDelete: 'CASCADE' })
  Vacancy.belongsTo(Provider, { foreignKey: 'providerId' })

  Provider.hasMany(User, { foreignKey: 'providerId', onDelete: 'SET NULL' })
  User.belongsTo(Provider, { foreignKey: 'providerId' })

  User.belongsToMany(Provider, {
    through: UserProviderAccess,
    as: 'accessibleProviders',
    foreignKey: 'userId',
    otherKey: 'providerId',
  })
  Provider.belongsToMany(User, {
    through: UserProviderAccess,
    as: 'usersWithAccess',
    foreignKey: 'providerId',
    otherKey: 'userId',
  })

  return { User, Vacancy, Provider, UserProviderAccess, Topic, TestResult, InterviewResult }
}
