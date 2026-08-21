const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('sales_returns', {
    sales_return_id: {
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
    original_invoice_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'invoices',
        key: 'invoice_id'
      }
    },
    return_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "uq_sales_returns_return_number"
    },
    return_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'customers',
        key: 'customer_id'
      }
    },
    subtotal: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    gst_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    cgst_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    sgst_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    discount_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.00
    },
    total_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    }
  }, {
    sequelize,
    tableName: 'sales_returns',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "idx_sales_returns_customer",
        fields: [
          { name: "customer_id" },
        ]
      },
      {
        name: "idx_sales_returns_date",
        fields: [
          { name: "return_date" },
        ]
      },
      {
        name: "idx_sales_returns_invoice",
        fields: [
          { name: "original_invoice_id" },
        ]
      },
      {
        name: "idx_sales_returns_tenant",
        fields: [
          { name: "tenant_id" },
        ]
      },
      {
        name: "sales_returns_pkey",
        unique: true,
        fields: [
          { name: "sales_return_id" },
        ]
      },
      {
        name: "uq_sales_returns_return_number",
        unique: true,
        fields: [
          { name: "tenant_id" },
          { name: "return_number" },
        ]
      },
    ]
  });
};
