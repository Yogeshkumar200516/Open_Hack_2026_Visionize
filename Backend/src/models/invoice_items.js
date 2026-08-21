const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('invoice_items', {
    item_id: {
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
    invoice_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'invoices',
        key: 'invoice_id'
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
    },
    returned_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'invoice_items',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "invoice_items_pkey",
        unique: true,
        fields: [
          { name: "item_id" },
        ]
      },
    ]
  });
};
