const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('roi_calculations', {
    roi_id: {
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
      unique: "roi_calculations_tenant_id_feature_id_calculation_date_key"
    },
    feature_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'feature_registry',
        key: 'feature_id'
      },
      unique: "roi_calculations_tenant_id_feature_id_calculation_date_key"
    },
    calculation_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: "roi_calculations_tenant_id_feature_id_calculation_date_key"
    },
    period_months: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    incremental_revenue: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.00
    },
    cost_savings: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.00
    },
    productivity_value: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.00
    },
    risk_reduction_value: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.00
    },
    total_benefits: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    dev_cost: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.00
    },
    infra_cost: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.00
    },
    support_cost: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.00
    },
    total_costs: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    roi_percentage: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    payback_months: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'roi_calculations',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "roi_calculations_pkey",
        unique: true,
        fields: [
          { name: "roi_id" },
        ]
      },
      {
        name: "roi_calculations_tenant_id_feature_id_calculation_date_key",
        unique: true,
        fields: [
          { name: "tenant_id" },
          { name: "feature_id" },
          { name: "calculation_date" },
        ]
      },
    ]
  });
};
