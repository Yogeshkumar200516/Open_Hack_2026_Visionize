const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('telemetry_events', {
    event_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
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
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    session_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    feature_key: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    entity_id: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    occurred_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'telemetry_events',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "idx_telemetry_action",
        fields: [
          { name: "action" },
        ]
      },
      {
        name: "idx_telemetry_date",
        fields: [
          { name: "occurred_at" },
        ]
      },
      {
        name: "idx_telemetry_feature",
        fields: [
          { name: "feature_key" },
        ]
      },
      {
        name: "idx_telemetry_tenant",
        fields: [
          { name: "tenant_id" },
        ]
      },
      {
        name: "telemetry_events_pkey",
        unique: true,
        fields: [
          { name: "event_id" },
        ]
      },
    ]
  });
};
