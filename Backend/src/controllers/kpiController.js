const db = require("../models");
const Sequelize = require("sequelize");

const fmt2 = (val) => Number(val).toFixed(2);

// 1. DASHBOARD SUMMARY
exports.getSummary = async (req, res) => {
  const tenantId = req.user.tenant_id;
  const days = parseInt(req.query.period) || 30;

  try {
    const [revenue] = await db.sequelize.query(
      `SELECT
         COUNT(invoice_id)                                         AS invoice_count,
         COALESCE(SUM(total_amount), 0)                            AS gross_revenue,
         COALESCE(AVG(total_amount), 0)                            AS avg_order_value,
         COALESCE(SUM(CASE WHEN payment_completion_status='Completed' THEN total_amount ELSE 0 END), 0) AS collected_revenue,
         COALESCE(SUM(CASE WHEN payment_completion_status='Pending'   THEN total_amount ELSE 0 END), 0) AS pending_revenue,
         COALESCE(SUM(gst_amount), 0)                              AS total_gst_collected,
         COUNT(CASE WHEN payment_completion_status='Pending' THEN 1 END) AS pending_invoice_count
       FROM invoices
       WHERE tenant_id = :tenantId AND invoice_date >= (CURRENT_DATE - (:days * INTERVAL '1 day'))`,
      { replacements: { tenantId, days }, type: Sequelize.QueryTypes.SELECT }
    );

    const [returns] = await db.sequelize.query(
      `SELECT
         COUNT(DISTINCT sr.sales_return_id)       AS total_returns,
         COALESCE(SUM(sr.total_amount), 0)        AS return_value,
         ROUND(
           COUNT(DISTINCT sr.original_invoice_id) * 100.0
           / NULLIF((SELECT COUNT(*) FROM invoices
                     WHERE tenant_id = :tenantId AND invoice_date >= (CURRENT_DATE - (:days * INTERVAL '1 day'))), 0)
         , 2)                                     AS return_rate_pct
       FROM sales_returns sr
       WHERE sr.tenant_id = :tenantId AND sr.return_date >= (CURRENT_DATE - (:days * INTERVAL '1 day'))`,
      { replacements: { tenantId, days }, type: Sequelize.QueryTypes.SELECT }
    );

    const [stock] = await db.sequelize.query(
      `SELECT
         SUM(stock_quantity)   AS total_stock,
         SUM(sellable_stock)   AS sellable_stock,
         SUM(damaged_stock)    AS damaged_stock,
         SUM(scrap_stock)      AS scrap_stock,
         ROUND(SUM(sellable_stock) * 100.0 / NULLIF(SUM(stock_quantity),0), 2) AS sellable_pct,
         ROUND(SUM(damaged_stock)  * 100.0 / NULLIF(SUM(stock_quantity),0), 2) AS damaged_pct,
         ROUND(SUM(scrap_stock)    * 100.0 / NULLIF(SUM(stock_quantity),0), 2) AS scrap_pct,
         COUNT(product_id) AS total_products
       FROM products
       WHERE tenant_id = :tenantId`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const [poStats] = await db.sequelize.query(
      `SELECT
         COUNT(po_id) AS total_pos,
         SUM(CASE WHEN status='fully_received'    THEN 1 ELSE 0 END) AS fully_received,
         SUM(CASE WHEN status='partially_received' THEN 1 ELSE 0 END) AS partially_received,
         SUM(CASE WHEN status='cancelled'          THEN 1 ELSE 0 END) AS cancelled_pos,
         ROUND(
           SUM(CASE WHEN status='fully_received' THEN 1 ELSE 0 END) * 100.0
           / NULLIF(COUNT(po_id), 0), 2
         ) AS fulfilment_rate_pct
       FROM purchase_orders
       WHERE tenant_id = :tenantId AND po_date >= (CURRENT_DATE - (:days * INTERVAL '1 day'))`,
      { replacements: { tenantId, days }, type: Sequelize.QueryTypes.SELECT }
    );

    const [bills] = await db.sequelize.query(
      `SELECT
         COUNT(bill_id)                     AS bill_count,
         COALESCE(SUM(total_amount), 0)     AS bill_revenue,
         COALESCE(AVG(total_amount), 0)     AS avg_bill_value
       FROM bills
       WHERE tenant_id = :tenantId AND bill_date >= (CURRENT_DATE - (:days * INTERVAL '1 day'))`,
      { replacements: { tenantId, days }, type: Sequelize.QueryTypes.SELECT }
    );

    res.json({
      period_days: days,
      revenue: revenue || {},
      returns: returns || {},
      stock: stock || {},
      purchase_orders: poStats || {},
      bills: bills || {},
      collection_rate_pct: Number(revenue?.gross_revenue) > 0
        ? parseFloat(((Number(revenue.collected_revenue) / Number(revenue.gross_revenue)) * 100).toFixed(2))
        : 0,
    });
  } catch (err) {
    console.error("KPI Summary Error:", err);
    res.status(500).json({ message: "Failed to fetch KPI summary", error: err.message });
  }
};

// 2. REVENUE TREND
exports.getRevenueTrend = async (req, res) => {
  const tenantId = req.user.tenant_id;
  const months = parseInt(req.query.months) || 6;

  try {
    const rows = await db.sequelize.query(
      `SELECT
         TO_CHAR(invoice_date, 'YYYY-MM')  AS month,
         trim(to_char(invoice_date, 'Mon YYYY'))  AS month_label,
         COUNT(invoice_id)                   AS invoice_count,
         COALESCE(SUM(total_amount), 0)      AS gross_revenue,
         COALESCE(SUM(CASE WHEN payment_completion_status='Completed' THEN total_amount ELSE 0 END), 0) AS collected_revenue,
         COALESCE(SUM(CASE WHEN payment_completion_status='Pending'   THEN total_amount ELSE 0 END), 0) AS pending_revenue,
         COALESCE(AVG(total_amount), 0)      AS avg_order_value,
         COALESCE(SUM(gst_amount), 0)        AS gst_collected,
         COALESCE(SUM(discount_value), 0)    AS total_discounts
       FROM invoices
       WHERE tenant_id = :tenantId
         AND invoice_date >= (CURRENT_DATE - (:months * INTERVAL '1 month'))
       GROUP BY TO_CHAR(invoice_date, 'YYYY-MM'), trim(to_char(invoice_date, 'Mon YYYY'))
       ORDER BY month ASC`,
      { replacements: { tenantId, months }, type: Sequelize.QueryTypes.SELECT }
    );

    const billRows = await db.sequelize.query(
      `SELECT
         TO_CHAR(bill_date, 'YYYY-MM')       AS month,
         COALESCE(SUM(total_amount), 0)      AS bill_revenue,
         COUNT(bill_id)                      AS bill_count
       FROM bills
       WHERE tenant_id = :tenantId
         AND bill_date >= (CURRENT_DATE - (:months * INTERVAL '1 month'))
       GROUP BY TO_CHAR(bill_date, 'YYYY-MM')
       ORDER BY month ASC`,
      { replacements: { tenantId, months }, type: Sequelize.QueryTypes.SELECT }
    );

    const billMap = {};
    billRows.forEach((b) => { billMap[b.month] = b; });

    const merged = rows.map((r) => ({
      ...r,
      bill_revenue: billMap[r.month]?.bill_revenue || 0,
      bill_count: billMap[r.month]?.bill_count || 0,
      total_revenue: parseFloat(r.gross_revenue) + parseFloat(billMap[r.month]?.bill_revenue || 0),
    }));

    res.json({ months, trend: merged });
  } catch (err) {
    console.error("Revenue Trend Error:", err);
    res.status(500).json({ message: "Failed to fetch revenue trend", error: err.message });
  }
};

// 3. STOCK KPI BREAKDOWN
exports.getStockKpi = async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const [overall] = await db.sequelize.query(
      `SELECT * FROM v_kpi_stock_health WHERE tenant_id = :tenantId`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const byCategory = await db.sequelize.query(
      `SELECT
         pc.category_name,
         COUNT(p.product_id)     AS product_count,
         SUM(p.stock_quantity)   AS total_stock,
         SUM(p.sellable_stock)   AS sellable_stock,
         SUM(p.damaged_stock)    AS damaged_stock,
         SUM(p.scrap_stock)      AS scrap_stock,
         ROUND(SUM(p.sellable_stock)*100.0/NULLIF(SUM(p.stock_quantity),0),2) AS sellable_pct
       FROM products p
       JOIN product_categories pc ON pc.category_id = p.category_id
       WHERE p.tenant_id = :tenantId
       GROUP BY pc.category_id, pc.category_name
       ORDER BY sellable_pct ASC`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const movementTrend = await db.sequelize.query(
      `SELECT
         created_at::DATE      AS day,
         change_type,
         stock_type,
         SUM(quantity_changed) AS total_qty
       FROM stock_movements
       WHERE tenant_id = :tenantId
         AND created_at >= (NOW() - INTERVAL '30 days')
       GROUP BY created_at::DATE, change_type, stock_type
       ORDER BY day ASC`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    res.json({
      overall: overall || {},
      by_category: byCategory,
      movement_trend: movementTrend,
    });
  } catch (err) {
    console.error("Stock KPI Error:", err);
    
    if (err.message.includes("v_kpi_stock_health")) {
      return res.status(500).json({ message: "View v_kpi_stock_health not found in PostgreSQL. Please run the migration or view creation script.", error: err.message });
    }
    res.status(500).json({ message: "Failed to fetch stock KPI", error: err.message });
  }
};

// 4. PAYMENT EFFICIENCY
exports.getPaymentKpi = async (req, res) => {
  const tenantId = req.user.tenant_id;
  const months = parseInt(req.query.months) || 6;

  try {
    const monthly = await db.sequelize.query(
      `SELECT
         TO_CHAR(invoice_date, 'YYYY-MM')  AS month,
         trim(to_char(invoice_date, 'Mon YYYY'))  AS month_label,
         COUNT(invoice_id)                   AS total_invoices,
         SUM(total_amount)                   AS total_billed,
         SUM(CASE WHEN payment_completion_status='Completed' THEN total_amount ELSE 0 END) AS collected,
         SUM(CASE WHEN payment_completion_status='Pending'   THEN total_amount ELSE 0 END) AS pending,
         ROUND(
           SUM(CASE WHEN payment_completion_status='Completed' THEN total_amount ELSE 0 END)
           * 100.0 / NULLIF(SUM(total_amount), 0), 2
         ) AS collection_rate_pct,
         COUNT(CASE WHEN payment_type='Cash' THEN 1 END) AS cash_count,
         COUNT(CASE WHEN payment_type='UPI'  THEN 1 END) AS upi_count,
         COUNT(CASE WHEN payment_type='NEFT' THEN 1 END) AS neft_count,
         COUNT(CASE WHEN payment_type='Card' THEN 1 END) AS card_count
       FROM invoices
       WHERE tenant_id = :tenantId
         AND invoice_date >= (CURRENT_DATE - (:months * INTERVAL '1 month'))
       GROUP BY TO_CHAR(invoice_date, 'YYYY-MM'), trim(to_char(invoice_date, 'Mon YYYY'))
       ORDER BY month ASC`,
      { replacements: { tenantId, months }, type: Sequelize.QueryTypes.SELECT }
    );

    const paymentMix = await db.sequelize.query(
      `SELECT
         payment_type,
         COUNT(invoice_id)           AS count,
         SUM(total_amount)           AS amount,
         ROUND(COUNT(invoice_id)*100.0/NULLIF((SELECT COUNT(*) FROM invoices WHERE tenant_id=:tenantId),0),2) AS share_pct
       FROM invoices
       WHERE tenant_id = :tenantId
       GROUP BY payment_type`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    res.json({ monthly, payment_mix: paymentMix });
  } catch (err) {
    console.error("Payment KPI Error:", err);
    res.status(500).json({ message: "Failed to fetch payment KPI", error: err.message });
  }
};

// 5. RETURNS ANALYTICS
exports.getReturnsKpi = async (req, res) => {
  const tenantId = req.user.tenant_id;
  const months = parseInt(req.query.months) || 6;

  try {
    const salesReturns = await db.sequelize.query(
      `SELECT
         TO_CHAR(sr.return_date, 'YYYY-MM')  AS month,
         trim(to_char(sr.return_date, 'Mon YYYY'))  AS month_label,
         COUNT(sr.sales_return_id)             AS return_count,
         SUM(sr.total_amount)                  AS return_value,
         COUNT(DISTINCT sr.customer_id)        AS unique_customers
       FROM sales_returns sr
       WHERE sr.tenant_id = :tenantId
         AND sr.return_date >= (CURRENT_DATE - (:months * INTERVAL '1 month'))
       GROUP BY TO_CHAR(sr.return_date, 'YYYY-MM'), trim(to_char(sr.return_date, 'Mon YYYY'))
       ORDER BY month ASC`,
      { replacements: { tenantId, months }, type: Sequelize.QueryTypes.SELECT }
    );

    const verificationStats = await db.sequelize.query(
      `SELECT
         rsv.verification_status,
         COUNT(rsv.verification_id)            AS count,
         SUM(rsv.returned_quantity)            AS total_qty,
         SUM(rsv.sellable_quantity)            AS sellable_qty,
         SUM(rsv.damaged_quantity)             AS damaged_qty,
         SUM(rsv.scrap_quantity)               AS scrap_qty
       FROM return_stock_verification rsv
       WHERE rsv.tenant_id = :tenantId
       GROUP BY rsv.verification_status`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const recoveryRate = await db.sequelize.query(
      `SELECT
         SUM(returned_quantity)  AS total_returned,
         SUM(sellable_quantity)  AS total_sellable,
         SUM(damaged_quantity)   AS total_damaged,
         SUM(scrap_quantity)     AS total_scrap,
         ROUND(SUM(sellable_quantity)*100.0/NULLIF(SUM(returned_quantity),0),2) AS recovery_rate_pct
       FROM return_stock_verification
       WHERE tenant_id = :tenantId`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const supplierReturns = await db.sequelize.query(
      `SELECT
         TO_CHAR(sr.return_date, 'YYYY-MM')  AS month,
         trim(to_char(sr.return_date, 'Mon YYYY'))  AS month_label,
         COUNT(sr.supplier_return_id)          AS return_count,
         SUM(sr.total_amount)                  AS return_value
       FROM supplier_returns sr
       WHERE sr.tenant_id = :tenantId
         AND sr.return_date >= (CURRENT_DATE - (:months * INTERVAL '1 month'))
       GROUP BY TO_CHAR(sr.return_date, 'YYYY-MM'), trim(to_char(sr.return_date, 'Mon YYYY'))
       ORDER BY month ASC`,
      { replacements: { tenantId, months }, type: Sequelize.QueryTypes.SELECT }
    );

    res.json({
      sales_returns_trend: salesReturns,
      verification_breakdown: verificationStats,
      recovery_rate: recoveryRate[0] || {},
      supplier_returns_trend: supplierReturns,
    });
  } catch (err) {
    console.error("Returns KPI Error:", err);
    res.status(500).json({ message: "Failed to fetch returns KPI", error: err.message });
  }
};

// 6. PURCHASE FLOW KPI
exports.getPurchaseKpi = async (req, res) => {
  const tenantId = req.user.tenant_id;
  const months = parseInt(req.query.months) || 6;

  try {
    const poStatus = await db.sequelize.query(
      `SELECT
         status,
         COUNT(po_id)       AS count,
         SUM(total_amount)  AS total_value
       FROM purchase_orders
       WHERE tenant_id = :tenantId
         AND po_date >= (CURRENT_DATE - (:months * INTERVAL '1 month'))
       GROUP BY status`,
      { replacements: { tenantId, months }, type: Sequelize.QueryTypes.SELECT }
    );

    const poTrend = await db.sequelize.query(
      `SELECT
         TO_CHAR(po_date, 'YYYY-MM')  AS month,
         trim(to_char(po_date, 'Mon YYYY'))  AS month_label,
         COUNT(po_id)                   AS po_count,
         SUM(total_amount)              AS po_value,
         ROUND(
           SUM(CASE WHEN status='fully_received' THEN 1 ELSE 0 END)*100.0
           /NULLIF(COUNT(po_id),0), 2
         )                              AS fulfilment_rate_pct
       FROM purchase_orders
       WHERE tenant_id = :tenantId
         AND po_date >= (CURRENT_DATE - (:months * INTERVAL '1 month'))
       GROUP BY TO_CHAR(po_date, 'YYYY-MM'), trim(to_char(po_date, 'Mon YYYY'))
       ORDER BY month ASC`,
      { replacements: { tenantId, months }, type: Sequelize.QueryTypes.SELECT }
    );

    const grStats = await db.sequelize.query(
      `SELECT
         COUNT(gr.gr_id)                                                      AS total_grs,
         SUM(CASE WHEN gr.status='discrepancy_noted' THEN 1 ELSE 0 END)      AS discrepancy_count,
         SUM(gri.ordered_quantity)                                            AS total_ordered,
         SUM(gri.received_quantity)                                           AS total_received,
         SUM(gri.accepted_quantity)                                           AS total_accepted,
         SUM(gri.rejected_quantity)                                           AS total_rejected,
         ROUND(SUM(gri.accepted_quantity)*100.0/NULLIF(SUM(gri.received_quantity),0),2) AS acceptance_rate_pct
       FROM goods_receipts gr
       JOIN goods_receipt_items gri ON gri.gr_id = gr.gr_id
       WHERE gr.tenant_id = :tenantId
         AND gr.gr_date >= (CURRENT_DATE - (:months * INTERVAL '1 month'))`,
      { replacements: { tenantId, months }, type: Sequelize.QueryTypes.SELECT }
    );

    const paymentDues = await db.sequelize.query(
      `SELECT
         COUNT(pi2.purchase_invoice_id)                                       AS total_invoices,
         SUM(pi2.total_amount)                                                AS total_billed,
         SUM(CASE WHEN pi2.payment_completion_status='Completed' THEN pi2.total_amount ELSE 0 END) AS paid,
         SUM(CASE WHEN pi2.payment_completion_status='Pending'   THEN pi2.total_amount ELSE 0 END) AS pending_dues,
         ROUND(
           SUM(CASE WHEN pi2.payment_completion_status='Completed' THEN pi2.total_amount ELSE 0 END)
           *100.0/NULLIF(SUM(pi2.total_amount),0), 2
         )                                                                    AS payment_rate_pct
       FROM purchase_invoices pi2
       WHERE pi2.tenant_id = :tenantId`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    res.json({
      po_status: poStatus,
      po_trend: poTrend,
      gr_stats: grStats[0] || {},
      payment_dues: paymentDues[0] || {},
    });
  } catch (err) {
    console.error("Purchase KPI Error:", err);
    res.status(500).json({ message: "Failed to fetch purchase KPI", error: err.message });
  }
};

// 7. FEATURE ROI
exports.getFeatures = async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const features = await db.sequelize.query(
      `SELECT
         fr.feature_id,
         fr.feature_key,
         fr.feature_name,
         fr.feature_module,
         fr.business_goal,
         fr.status,
         fr.deployed_at,
         fr.dev_cost,
         fr.infra_cost_monthly,
         fr.support_cost_monthly,
         fr.observation_window_days,
         rc.roi_percentage,
         rc.total_benefits,
         rc.total_costs,
         rc.incremental_revenue,
         rc.cost_savings,
         rc.payback_months,
         rc.calculation_date,
         kc.kpi_name          AS primary_kpi_name,
         kc.unit              AS primary_kpi_unit,
         fkt.baseline_value,
         fkt.target_value,
         fkt.target_delta_pct
       FROM feature_registry fr
       LEFT JOIN roi_calculations rc
         ON rc.feature_id = fr.feature_id AND rc.tenant_id = fr.tenant_id
         AND rc.calculation_date = (
           SELECT MAX(rc2.calculation_date)
           FROM roi_calculations rc2
           WHERE rc2.feature_id = fr.feature_id AND rc2.tenant_id = fr.tenant_id
         )
       LEFT JOIN feature_kpi_targets fkt
         ON fkt.feature_id = fr.feature_id AND fkt.is_primary = TRUE
       LEFT JOIN kpi_catalogue kc
         ON kc.kpi_id = fkt.kpi_id
       WHERE fr.tenant_id = :tenantId
       ORDER BY fr.deployed_at DESC`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    res.json({ features });
  } catch (err) {
    console.error("Features ROI Error:", err);
    res.status(500).json({ message: "Failed to fetch feature ROI", error: err.message });
  }
};

// 8. KPI CATALOGUE
exports.getKpiCatalogue = async (req, res) => {
  try {
    const rows = await db.sequelize.query(
      `SELECT * FROM kpi_catalogue WHERE is_active = TRUE ORDER BY kpi_category, kpi_name`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    res.json({ kpis: rows });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch KPI catalogue", error: err.message });
  }
};

// 9. COMPUTE & UPSERT ROI
exports.computeRoi = async (req, res) => {
  const tenantId = req.user.tenant_id;
  const {
    feature_id,
    period_months = 1,
    incremental_revenue = 0,
    cost_savings = 0,
    productivity_value = 0,
    risk_reduction_value = 0,
    notes = "",
  } = req.body;

  if (!feature_id) return res.status(400).json({ message: "feature_id is required" });

  try {
    const features = await db.sequelize.query(
      `SELECT dev_cost, infra_cost_monthly, support_cost_monthly FROM feature_registry WHERE feature_id=:feature_id AND tenant_id=:tenantId`,
      { replacements: { feature_id, tenantId }, type: Sequelize.QueryTypes.SELECT }
    );
    if (!features || features.length === 0) return res.status(404).json({ message: "Feature not found" });
    const feature = features[0];

    const dev_cost = parseFloat(feature.dev_cost) || 0;
    const infra_cost = parseFloat(feature.infra_cost_monthly) * period_months;
    const support_cost = parseFloat(feature.support_cost_monthly) * period_months;

    const total_benefits =
      parseFloat(incremental_revenue) +
      parseFloat(cost_savings) +
      parseFloat(productivity_value) +
      parseFloat(risk_reduction_value);
    const total_costs = dev_cost + infra_cost + support_cost;
    const roi_pct = total_costs > 0 ? ((total_benefits - total_costs) / total_costs) * 100 : 0;
    const payback_months = total_benefits > 0 ? total_costs / (total_benefits / period_months) : null;

    const existing = await db.sequelize.query(
      `SELECT calculation_id FROM roi_calculations WHERE tenant_id=:tenantId AND feature_id=:feature_id AND calculation_date=CURRENT_DATE`,
      { replacements: { tenantId, feature_id }, type: Sequelize.QueryTypes.SELECT }
    );

    if (existing && existing.length > 0) {
      await db.sequelize.query(
        `UPDATE roi_calculations SET
           period_months=:period_months,
           incremental_revenue=:incremental_revenue,
           cost_savings=:cost_savings,
           productivity_value=:productivity_value,
           risk_reduction_value=:risk_reduction_value,
           dev_cost=:dev_cost,
           infra_cost=:infra_cost,
           support_cost=:support_cost,
           payback_months=:payback_months,
           notes=:notes
         WHERE tenant_id=:tenantId AND feature_id=:feature_id AND calculation_date=CURRENT_DATE`,
        { replacements: {
            tenantId, feature_id, period_months,
            incremental_revenue, cost_savings, productivity_value, risk_reduction_value,
            dev_cost, infra_cost, support_cost, payback_months, notes
          }
        }
      );
    } else {
      await db.sequelize.query(
        `INSERT INTO roi_calculations
           (tenant_id, feature_id, calculation_date, period_months,
            incremental_revenue, cost_savings, productivity_value, risk_reduction_value,
            dev_cost, infra_cost, support_cost, payback_months, notes)
         VALUES (:tenantId, :feature_id, CURRENT_DATE, :period_months,
                 :incremental_revenue, :cost_savings, :productivity_value, :risk_reduction_value,
                 :dev_cost, :infra_cost, :support_cost, :payback_months, :notes)`,
        { replacements: {
            tenantId, feature_id, period_months,
            incremental_revenue, cost_savings, productivity_value, risk_reduction_value,
            dev_cost, infra_cost, support_cost, payback_months, notes
          }
        }
      );
    }

    res.json({
      message: "ROI computed and saved",
      roi_percentage: Number(roi_pct).toFixed(2),
      total_benefits,
      total_costs,
      payback_months,
    });
  } catch (err) {
    console.error("Compute ROI Error:", err);
    res.status(500).json({ message: "Failed to compute ROI", error: err.message });
  }
};

// 10. TOP PRODUCTS
exports.getTopProducts = async (req, res) => {
  const tenantId = req.user.tenant_id;
  const limit = parseInt(req.query.limit) || 10;
  const days = parseInt(req.query.period) || 30;

  try {
    const rows = await db.sequelize.query(
      `SELECT
         p.product_id,
         p.product_name,
         pc.category_name,
         COUNT(ii.item_id)          AS times_sold,
         SUM(ii.quantity)           AS total_qty_sold,
         SUM(ii.total_with_gst)     AS total_revenue,
         AVG(ii.rate)               AS avg_rate,
         p.stock_quantity           AS current_stock
       FROM invoice_items ii
       JOIN products p ON p.product_id = ii.product_id
       LEFT JOIN product_categories pc ON pc.category_id = p.category_id
       JOIN invoices inv ON inv.invoice_id = ii.invoice_id
       WHERE ii.tenant_id = :tenantId
         AND inv.invoice_date >= (CURRENT_DATE - (:days * INTERVAL '1 day'))
       GROUP BY p.product_id, p.product_name, pc.category_name
       ORDER BY total_revenue DESC
       LIMIT :limit`,
      { replacements: { tenantId, days, limit }, type: Sequelize.QueryTypes.SELECT }
    );

    res.json({ products: rows, period_days: days });
  } catch (err) {
    console.error("Top Products Error:", err);
    res.status(500).json({ message: "Failed to fetch top products", error: err.message });
  }
};

// 11. CUSTOMER KPI
exports.getCustomerKpi = async (req, res) => {
  const tenantId = req.user.tenant_id;
  const days = parseInt(req.query.period) || 30;

  try {
    const overview = await db.sequelize.query(
      `SELECT
         COUNT(DISTINCT c.customer_id)                              AS total_customers,
         COUNT(DISTINCT CASE WHEN inv.invoice_date >= (CURRENT_DATE - (:days * INTERVAL '1 day'))
                             THEN inv.customer_id END)             AS active_customers,
         COUNT(DISTINCT inv.invoice_id)                            AS total_invoices,
         ROUND(COUNT(DISTINCT inv.invoice_id) * 1.0
               / NULLIF(COUNT(DISTINCT c.customer_id), 0), 2)     AS avg_invoices_per_customer
       FROM customers c
       LEFT JOIN invoices inv ON inv.customer_id = c.customer_id AND inv.tenant_id = c.tenant_id
       WHERE c.tenant_id = :tenantId`,
      { replacements: { tenantId, days }, type: Sequelize.QueryTypes.SELECT }
    );

    const topCustomers = await db.sequelize.query(
      `SELECT
         c.customer_id,
         c.name,
         COUNT(inv.invoice_id)       AS invoice_count,
         SUM(inv.total_amount)       AS total_revenue,
         AVG(inv.total_amount)       AS avg_order_value,
         MAX(inv.invoice_date)       AS last_invoice_date
       FROM customers c
       JOIN invoices inv ON inv.customer_id = c.customer_id
       WHERE c.tenant_id = :tenantId
         AND inv.invoice_date >= (CURRENT_DATE - (:days * INTERVAL '1 day'))
       GROUP BY c.customer_id, c.name
       ORDER BY total_revenue DESC
       LIMIT 10`,
      { replacements: { tenantId, days }, type: Sequelize.QueryTypes.SELECT }
    );

    res.json({ overview: overview[0] || {}, top_customers: topCustomers });
  } catch (err) {
    console.error("Customer KPI Error:", err);
    res.status(500).json({ message: "Failed to fetch customer KPI", error: err.message });
  }
};

// 12. TELEMETRY LOG
exports.logTelemetry = async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { feature_key, action, entity_type, entity_id, session_id, metadata } = req.body;

  if (!feature_key || !action)
    return res.status(400).json({ message: "feature_key and action are required" });

  try {
    await db.sequelize.query(
      `INSERT INTO telemetry_events
         (tenant_id, user_id, session_id, feature_key, action, entity_type, entity_id, metadata)
       VALUES (:tenantId, :user_id, :session_id, :feature_key, :action, :entity_type, :entity_id, :metadata)`,
      { replacements: {
          tenantId,
          user_id: req.user.user_id,
          session_id: session_id || null,
          feature_key,
          action,
          entity_type: entity_type || null,
          entity_id: entity_id || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
        }
      }
    );
    res.json({ message: "Event logged" });
  } catch (err) {
    console.error("Telemetry Error:", err);
    res.status(500).json({ message: "Failed to log telemetry event", error: err.message });
  }
};
