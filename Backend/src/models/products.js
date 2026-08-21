const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('products', {
    product_id: {
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
    product_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    barcode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: "uq_products_barcode"
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'product_categories',
        key: 'category_id'
      }
    },
    hsn_code: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    image_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: "NULL"
    },
    gst: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0.00
    },
    c_gst: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0.00
    },
    s_gst: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0.00
    },
    discount: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    discount_price: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    is_traced: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    sellable_stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    damaged_stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    scrap_stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'products',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      {
        name: "idx_products_barcode",
        fields: [
          { name: "barcode" },
        ]
      },
      {
        name: "idx_products_category",
        fields: [
          { name: "category_id" },
        ]
      },
      {
        name: "idx_products_tenant",
        fields: [
          { name: "tenant_id" },
        ]
      },
      {
        name: "uq_products_barcode",
        unique: true,
        fields: [
          { name: "tenant_id" },
          { name: "barcode" },
        ]
      },
      {
        name: "products_pkey",
        unique: true,
        fields: [
          { name: "product_id" },
        ]
      },
    ]
  });
};
