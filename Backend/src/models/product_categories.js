const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('product_categories', {
    category_id: {
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
    category_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    tableName: 'product_categories',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "product_categories_pkey",
        unique: true,
        fields: [
          { name: "category_id" },
        ]
      },
    ]
  });
};
