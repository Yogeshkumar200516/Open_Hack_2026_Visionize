const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('customers', {
    customer_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'company_info',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    mobile: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    whatsapp_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    gst_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    pincode: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    place_of_supply: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    vehicle_number: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    consignee_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    consignee_gst_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    consignee_mobile: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    consignee_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    consignee_address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    consignee_state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    consignee_pincode: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    consignee_place_of_supply: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    consignee_vehicle_number: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'customers',
    schema: 'public',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        name: "customers_pkey",
        unique: true,
        fields: [
          { name: "customer_id" },
        ]
      },
    ]
  });
};
