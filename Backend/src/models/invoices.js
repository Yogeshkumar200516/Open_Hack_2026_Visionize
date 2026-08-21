const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('invoices', {
    invoice_id: {
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
    billing_address_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'billing_address',
        key: 'billing_address_id'
      }
    },
    invoice_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "uq_invoices_invoice_number"
    },
    invoice_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'customers',
        key: 'customer_id'
      }
    },
    place_of_supply: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    place_of_dispatch: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    vehicle_number: {
      type: DataTypes.STRING(50),
      allowNull: true
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
      type: DataTypes.ENUM("Cash","Card","UPI","NEFT","IMPS","RTGS"),
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
    },
    eway_bill_no: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    eway_bill_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    transporter_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    transporter_gst_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    transport_mode: {
      type: DataTypes.ENUM("Road","Rail","Air","Ship"),
      allowNull: true
    },
    transport_distance: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    eway_valid_upto: {
      type: DataTypes.DATE,
      allowNull: true
    },
    transaction_type: {
      type: DataTypes.ENUM("Regular","Bill To-Ship To","Bill From-Dispatch From","Combination"),
      allowNull: true
    },
    supply_type: {
      type: DataTypes.ENUM("Outward","Inward"),
      allowNull: true
    },
    document_type: {
      type: DataTypes.ENUM("Tax Invoice","Chalan","Purchase Return","Sales Return","Proforma Invoice","Debit Note","Credit Note"),
      allowNull: true,
      defaultValue: "Tax Invoice"
    },
    is_fully_returned: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    invoice_status: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: 'pending_approval'
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejected_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    rejected_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejection_note: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'invoices',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "idx_invoices_customer",
        fields: [
          { name: "customer_id" },
        ]
      },
      {
        name: "idx_invoices_date",
        fields: [
          { name: "invoice_date" },
        ]
      },
      {
        name: "idx_invoices_number",
        fields: [
          { name: "invoice_number" },
        ]
      },
      {
        name: "idx_invoices_tenant",
        fields: [
          { name: "tenant_id" },
        ]
      },
      {
        name: "uq_invoices_invoice_number",
        unique: true,
        fields: [
          { name: "tenant_id" },
          { name: "invoice_number" },
        ]
      },
      {
        name: "invoices_pkey",
        unique: true,
        fields: [
          { name: "invoice_id" },
        ]
      },
    ]
  });
};
