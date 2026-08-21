module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "company_info",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },

      company_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      company_logo: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      cell_no1: {
        type: DataTypes.STRING(15),
        allowNull: true,
      },

      cell_no2: {
        type: DataTypes.STRING(15),
        allowNull: true,
      },

      gst_no: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      pan_no: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      account_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      bank_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      branch_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      ifsc_code: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      account_number: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },

      email: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      website: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      subscription_type: {
        type: DataTypes.ENUM("invoice", "bill", "both"),
        allowNull: false,
        defaultValue: "invoice",
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "company_info",
      schema: "public",

      timestamps: true,

      createdAt: "created_at",
      updatedAt: "updated_at",

      indexes: [
        {
          name: "company_info_pkey",
          unique: true,
          fields: ["id"],
        },
      ],
    }
  );
};