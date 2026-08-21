const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('billing_address', {
    billing_address_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'company_info',
        key: 'id'
      }
    },
    address_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cell_no1: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    cell_no2: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    gst_no: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    pan_no: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    account_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    bank_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    branch_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    ifsc_code: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    account_number: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    website: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    tableName: 'billing_address',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",
    indexes: [
      {
        name: "billing_address_pkey",
        unique: true,
        fields: [
          { name: "billing_address_id" },
        ]
      },
    ]
  });
};
