import { DataTypes, Model } from 'sequelize'

export class User extends Model {}

export class Vacancy extends Model {}

export class Company extends Model {}

export class UserCompanyAccess extends Model {}

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
        type: DataTypes.ENUM('super_admin', 'company_admin', 'user'),
        allowNull: false,
        defaultValue: 'user',
      },
      isGuest: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      companyId: {
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
      companyId: {
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
      codingTask: {
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
        { fields: ['company_id', 'created_at'] },
      ],
    },
  )

  Company.init(
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
      tableName: 'companies',
      modelName: 'Company',
      timestamps: true,
      updatedAt: false,
      underscored: true,
    },
  )

  UserCompanyAccess.init(
    {
      userId: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      companyId: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'user_company_access',
      modelName: 'UserCompanyAccess',
      timestamps: true,
      updatedAt: false,
      underscored: true,
    },
  )

  User.hasMany(Vacancy, { foreignKey: 'userId', onDelete: 'CASCADE' })
  Vacancy.belongsTo(User, { foreignKey: 'userId' })

  Company.hasMany(Vacancy, { foreignKey: 'companyId', onDelete: 'CASCADE' })
  Vacancy.belongsTo(Company, { foreignKey: 'companyId' })

  Company.hasMany(User, { foreignKey: 'companyId', onDelete: 'SET NULL' })
  User.belongsTo(Company, { foreignKey: 'companyId' })

  User.belongsToMany(Company, {
    through: UserCompanyAccess,
    as: 'accessibleCompanies',
    foreignKey: 'userId',
    otherKey: 'companyId',
  })
  Company.belongsToMany(User, {
    through: UserCompanyAccess,
    as: 'usersWithAccess',
    foreignKey: 'companyId',
    otherKey: 'userId',
  })

  return { User, Vacancy, Company, UserCompanyAccess }
}
