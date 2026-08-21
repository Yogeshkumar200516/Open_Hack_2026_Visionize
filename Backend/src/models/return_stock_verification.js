const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('return_stock_verification', {
    verification_id: {
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
    return_type: {
      type: DataTypes.ENUM("sales_return","purchase_return"),
      allowNull: false
    },
    return_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    return_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'product_id'
      }
    },
    returned_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    verification_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    verified_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    sellable_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    damaged_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    scrap_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    inspection_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    damage_reason: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    images: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    verification_status: {
      type: DataTypes.ENUM("pending","in_progress","completed"),
      allowNull: true,
      defaultValue: "pending"
    },
    stock_updated: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'return_stock_verification',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      {
        name: "idx_return_verification_date",
        fields: [
          { name: "verification_date" },
        ]
      },
      {
        name: "idx_return_verification_product",
        fields: [
          { name: "product_id" },
        ]
      },
      {
        name: "idx_return_verification_return",
        fields: [
          { name: "return_type" },
          { name: "return_id" },
        ]
      },
      {
        name: "idx_return_verification_status",
        fields: [
          { name: "verification_status" },
        ]
      },
      {
        name: "idx_return_verification_tenant",
        fields: [
          { name: "tenant_id" },
        ]
      },
      {
        name: "return_stock_verification_pkey",
        unique: true,
        fields: [
          { name: "verification_id" },
        ]
      },
    ]
  });
};
