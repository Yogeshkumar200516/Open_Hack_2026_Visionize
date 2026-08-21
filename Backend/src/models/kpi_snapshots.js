const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('kpi_snapshots', {
    snapshot_id: {
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
      },
      unique: "kpi_snapshots_tenant_id_kpi_id_snapshot_date_period_type_key"
    },
    kpi_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'kpi_catalogue',
        key: 'kpi_id'
      },
      unique: "kpi_snapshots_tenant_id_kpi_id_snapshot_date_period_type_key"
    },
    snapshot_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: "kpi_snapshots_tenant_id_kpi_id_snapshot_date_period_type_key"
    },
    period_type: {
      type: DataTypes.ENUM("daily","weekly","monthly"),
      allowNull: true,
      defaultValue: "daily",
      unique: "kpi_snapshots_tenant_id_kpi_id_snapshot_date_period_type_key"
    },
    computed_value: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    sample_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    notes: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'kpi_snapshots',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "kpi_snapshots_pkey",
        unique: true,
        fields: [
          { name: "snapshot_id" },
        ]
      },
      {
        name: "kpi_snapshots_tenant_id_kpi_id_snapshot_date_period_type_key",
        unique: true,
        fields: [
          { name: "tenant_id" },
          { name: "kpi_id" },
          { name: "snapshot_date" },
          { name: "period_type" },
        ]
      },
    ]
  });
};
