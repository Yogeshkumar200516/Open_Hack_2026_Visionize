const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('feature_registry', {
    feature_id: {
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
    feature_key: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    feature_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    feature_module: {
      type: DataTypes.ENUM("invoicing","billing","purchase","returns","inventory","reporting","payments","supplier","analytics"),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    business_goal: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    target_outcomes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM("planned","in_development","deployed","retired"),
      allowNull: true,
      defaultValue: "planned"
    },
    deployed_at: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    retired_at: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    dev_cost: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.00
    },
    infra_cost_monthly: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.00
    },
    support_cost_monthly: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.00
    },
    observation_window_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 30
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    }
  }, {
    sequelize,
    tableName: 'feature_registry',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      {
        name: "feature_registry_pkey",
        unique: true,
        fields: [
          { name: "feature_id" },
        ]
      },
    ]
  });
};
