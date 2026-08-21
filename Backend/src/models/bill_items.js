const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('bill_items', {
    bill_item_id: {
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
    bill_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'bills',
        key: 'bill_id'
      }
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'product_id'
      }
    },
    hsn_code: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    rate: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    gst_percentage: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    base_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    total_with_gst: {
      type: DataTypes.DECIMAL,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'bill_items',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "bill_items_pkey",
        unique: true,
        fields: [
          { name: "bill_item_id" },
        ]
      },
    ]
  });
};
