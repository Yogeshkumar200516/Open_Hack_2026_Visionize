const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('bills', {
    bill_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    bill_no: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: "uq_bills_bill_no"
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'company_info',
        key: 'id'
      }
    },
    customer_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    mobile_no: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    bill_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "uq_bills_bill_number"
    },
    bill_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    subtotal: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    gst_percentage: {
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
    discount_type: {
      type: DataTypes.ENUM("%","flat"),
      allowNull: true,
      defaultValue: "%"
    },
    discount_value: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    transport_charge: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    total_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    payment_type: {
      type: DataTypes.ENUM("Cash","Card","UPI"),
      allowNull: true,
      defaultValue: "Cash"
    },
    payment_status: {
      type: DataTypes.ENUM("Full Payment","Advance"),
      allowNull: true,
      defaultValue: "Full Payment"
    },
    advance_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.00
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    payment_completion_status: {
      type: DataTypes.ENUM("Completed","Pending"),
      allowNull: true,
      defaultValue: "Completed"
    },
    payment_settlement_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'bills',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "uq_bills_bill_no",
        unique: true,
        fields: [
          { name: "tenant_id" },
          { name: "bill_no" },
        ]
      },
      {
        name: "uq_bills_bill_number",
        unique: true,
        fields: [
          { name: "tenant_id" },
          { name: "bill_number" },
        ]
      },
      {
        name: "bills_pkey",
        unique: true,
        fields: [
          { name: "bill_id" },
        ]
      },
    ]
  });
};
