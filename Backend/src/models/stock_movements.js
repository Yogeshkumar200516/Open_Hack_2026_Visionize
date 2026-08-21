const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('stock_movements', {
    movement_id: {
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
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'product_id'
      }
    },
    change_type: {
      type: DataTypes.ENUM("IN","OUT"),
      allowNull: false
    },
    quantity_changed: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    old_stock: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    new_stock: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    stock_type: {
      type: DataTypes.ENUM("regular","sellable","damaged","scrap"),
      allowNull: true,
      defaultValue: "regular"
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: "NULL"
    },
    reference_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "NULL"
    },
    reference_type: {
      type: DataTypes.ENUM("invoice","bill","sales_return","purchase_return","return_verification","adjustment","purchase_order","purchase_invoice","goods_receipt"),
      allowNull: true
    },
    updated_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "NULL"
    }
  }, {
    sequelize,
    tableName: 'stock_movements',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "idx_stock_movements_product",
        fields: [
          { name: "product_id" },
        ]
      },
      {
        name: "idx_stock_movements_reference",
        fields: [
          { name: "reference_type" },
          { name: "reference_id" },
        ]
      },
      {
        name: "idx_stock_movements_stock_type",
        fields: [
          { name: "stock_type" },
        ]
      },
      {
        name: "idx_stock_movements_tenant",
        fields: [
          { name: "tenant_id" },
        ]
      },
      {
        name: "idx_stock_movements_type",
        fields: [
          { name: "change_type" },
        ]
      },
      {
        name: "stock_movements_pkey",
        unique: true,
        fields: [
          { name: "movement_id" },
        ]
      },
    ]
  });
};
