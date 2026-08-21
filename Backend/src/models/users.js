module.exports = (sequelize, DataTypes) => {

  const Users = sequelize.define(
    "users",
    {
      user_id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },

      tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "company_info",
          key: "id",
        },
      },

      first_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      last_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      mobile_number: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: "users_mobile_number_key",
      },

      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: "users_email_key",
      },

      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      role: {
        type: DataTypes.ENUM("super_admin", "admin", "cashier", "sales"),
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: true,
        defaultValue: "active",
      },
    },
    {
      tableName: "users",
      schema: "public",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,

      indexes: [
        {
          name: "users_email_key",
          unique: true,
          fields: ["email"],
        },
        {
          name: "users_mobile_number_key",
          unique: true,
          fields: ["mobile_number"],
        },
        {
          name: "users_pkey",
          unique: true,
          fields: ["user_id"],
        },
      ],
    }
  );

  /* -------------------------------
     MODEL ASSOCIATIONS
  --------------------------------*/

  Users.associate = (models) => {

    // Each user belongs to a company (tenant)
    Users.belongsTo(models.company_info, {
      foreignKey: "tenant_id",
      as: "company",
    });

  };

  return Users;
};