const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('sales_return_items', {
    sales_return_item_id: {
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
    sales_return_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'sales_returns',
        key: 'sales_return_id'
      }
    },
    invoice_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'invoice_items',
        key: 'item_id'
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
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
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
    gst_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    total_with_gst: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    verification_status: {
      type: DataTypes.ENUM("pending","verified","partially_verified"),
      allowNull: true,
      defaultValue: "pending"
    },
    verified_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'sales_return_items',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "sales_return_items_pkey",
        unique: true,
        fields: [
          { name: "sales_return_item_id" },
        ]
      },
    ]
  });
};
