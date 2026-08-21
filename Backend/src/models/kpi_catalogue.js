const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('kpi_catalogue', {
    kpi_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    kpi_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "kpi_catalogue_kpi_key_key"
    },
    kpi_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    kpi_category: {
      type: DataTypes.ENUM("revenue","cost","productivity","quality","adoption","risk"),
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    calculation_method: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    higher_is_better: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    tableName: 'kpi_catalogue',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "kpi_catalogue_kpi_key_key",
        unique: true,
        fields: [
          { name: "kpi_key" },
        ]
      },
      {
        name: "kpi_catalogue_pkey",
        unique: true,
        fields: [
          { name: "kpi_id" },
        ]
      },
    ]
  });
};
