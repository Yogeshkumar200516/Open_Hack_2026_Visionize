const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('feature_kpi_targets', {
    target_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    feature_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'feature_registry',
        key: 'feature_id'
      }
    },
    kpi_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'kpi_catalogue',
        key: 'kpi_id'
      }
    },
    baseline_value: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    target_value: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    target_delta_pct: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    measurement_start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    measurement_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'feature_kpi_targets',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "feature_kpi_targets_pkey",
        unique: true,
        fields: [
          { name: "target_id" },
        ]
      },
    ]
  });
};
