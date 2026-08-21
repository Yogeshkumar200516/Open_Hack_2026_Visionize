const { Sequelize } = require("sequelize");
const { company_info } = require("../models");
const db = company_info.sequelize;

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function getSubscriptionType(tenantId) {
  const reqQuery = `SELECT subscription_type FROM company_info WHERE id = :tenant_id`;
  const [rows] = await db.query(reqQuery, { replacements: { tenant_id: tenantId }, type: Sequelize.QueryTypes.SELECT });
  return rows?.subscription_type || "invoice";
}

function tableNames(subType) {
  const isBill = subType === "bill";
  const isBoth = subType === "both";
  
  if (isBoth) {
    return {
      docs: `(
        SELECT 
          bill_id AS id, bill_number, bill_date AS doc_date, customer_name, total_amount, 
          gst_amount, cgst_amount, sgst_amount, discount_value, transport_charge, 
          payment_status::TEXT, payment_completion_status::TEXT, advance_amount, payment_type::TEXT, 
          tenant_id, created_at, 'bill' AS type 
        FROM bills
        UNION ALL
        SELECT 
          invoice_id AS id, invoice_number AS bill_number, invoice_date AS doc_date, CAST(customer_id AS TEXT) AS customer_name, total_amount, 
          gst_amount, cgst_amount, sgst_amount, discount_value, transport_charge, 
          payment_status::TEXT, payment_completion_status::TEXT, advance_amount, payment_type::TEXT, 
          tenant_id, created_at, 'invoice' AS type 
        FROM invoices
      )`,
      items: `(
        SELECT 
          bill_item_id AS item_id, bill_id AS id, product_id, quantity, base_amount, 
          total_with_gst, tenant_id, rate, gst_percentage 
        FROM bill_items
        UNION ALL
        SELECT 
          item_id AS item_id, invoice_id AS id, product_id, quantity, base_amount, 
          total_with_gst, tenant_id, rate, gst_percentage 
        FROM invoice_items
      )`,
      docId: "id",
      customerCol: "customer_name",
      isBoth: true
    };
  }

  return {
    docs: isBill ? "bills" : "invoices",
    items: isBill ? "bill_items" : "invoice_items",
    docId: isBill ? "bill_id" : "invoice_id",
    docNo: isBill ? "bill_number" : "invoice_number",
    docDate: isBill ? "bill_date" : "invoice_date",
    customerCol: isBill ? "customer_name" : "customer_name", // Changed from customer_id to customer_name for invoices if needed, but let's check schema. 
    // Wait, in buildInsights/getSummary it uses docId directly. 
    isBoth: false
  };
}

const fmt2 = (v) => Math.round(Number(v) * 100) / 100;

// ─── Health score calculator ──────────────────────────────────────────────────
function calcHealthScore(kpis) {
  let score = 100;
  const revenueGrowth = Number(kpis.revenue_growth_pct ?? 0);
  const returnRate   = Number(kpis.return_rate_pct ?? 0);
  const outOfStock   = Number(kpis.out_of_stock ?? 0);
  const totalProd    = Number(kpis.total_products ?? 1);
  const pendingDues  = Number(kpis.pending_dues ?? 0);
  const revenue      = Number(kpis.gross_revenue ?? 1);

  // Revenue growth impact (-20 to +10)
  if (revenueGrowth < -20) score -= 20;
  else if (revenueGrowth < -10) score -= 12;
  else if (revenueGrowth < -5)  score -= 6;
  else if (revenueGrowth >= 10) score += 10;
  else if (revenueGrowth >= 5)  score += 5;

  // Return rate impact (0 to -25)
  if (returnRate > 20)     score -= 25;
  else if (returnRate > 15) score -= 18;
  else if (returnRate > 10) score -= 10;
  else if (returnRate > 5)  score -= 4;

  // Stock health (0 to -15)
  const oosPct = totalProd > 0 ? (outOfStock / totalProd) * 100 : 0;
  if (oosPct > 20) score -= 15;
  else if (oosPct > 10) score -= 8;
  else if (oosPct > 5)  score -= 3;

  // Pending dues (0 to -10)
  const duesPct = revenue > 0 ? (pendingDues / revenue) * 100 : 0;
  if (duesPct > 30) score -= 10;
  else if (duesPct > 15) score -= 5;

  score = Math.min(100, Math.max(0, Math.round(score)));

  let label = "Poor";
  if (score >= 85)      label = "Excellent";
  else if (score >= 70) label = "Good";
  else if (score >= 55) label = "Average";
  else if (score >= 40) label = "Needs Attention";

  return { score, label };
}

// ─── Insight builder (structured objects for frontend InsightPill) ─────────────
function buildInsights(kpis, topProductName) {
  const insights = [];

  const push = (type, category, icon, message) =>
    insights.push({ type, category, icon, message });

  const revenueGrowth = Number(kpis.revenue_growth_pct);
  const avgOrderGrowth = Number(kpis.avg_order_growth_pct);
  const customerGrowth = Number(kpis.customer_growth_pct);
  const returnRate     = Number(kpis.return_rate_pct);
  const discountRate   = Number(kpis.discount_rate_pct);
  const invTurnover    = Number(kpis.inventory_turnover);

  if (!isNaN(revenueGrowth)) {
    if (revenueGrowth >= 10)
      push("positive", "Revenue", "📈", `Strong revenue growth of +${fmt2(revenueGrowth)}% vs last month.`);
    else if (revenueGrowth >= 0)
      push("info", "Revenue", "➡️", `Revenue stable — grew +${fmt2(revenueGrowth)}% vs last month.`);
    else
      push("warning", "Revenue", "📉", `Revenue down ${fmt2(Math.abs(revenueGrowth))}% vs last month. Review sales strategy.`);
  }

  if (!isNaN(avgOrderGrowth) && avgOrderGrowth > 5)
    push("positive", "Orders", "💰", `Customers are spending more per order (+${fmt2(avgOrderGrowth)}%).`);

  if (!isNaN(customerGrowth) && customerGrowth > 5)
    push("positive", "Customers", "👥", `Customer base expanded by +${fmt2(customerGrowth)}% this month.`);

  if (returnRate > 15)
    push("critical", "Returns", "⚠️", `Return rate critically high at ${fmt2(returnRate)}%. Inspect product quality.`);
  else if (returnRate > 8)
    push("warning", "Returns", "🔁", `Return rate elevated at ${fmt2(returnRate)}%. Monitor closely.`);
  else
    push("positive", "Returns", "✅", `Return rate healthy at ${fmt2(returnRate)}%.`);

  if (discountRate > 20)
    push("warning", "Discounts", "🏷️", `Heavy discounting at ${fmt2(discountRate)}% of revenue. Monitor margins.`);

  if (invTurnover > 0 && invTurnover < 1)
    push("warning", "Inventory", "📦", `Low inventory turnover (${fmt2(invTurnover)}x). Stock may be moving slowly.`);
  else if (invTurnover >= 3)
    push("positive", "Inventory", "🚀", `High inventory turnover (${fmt2(invTurnover)}x) — excellent stock management.`);

  if (topProductName && topProductName !== "N/A")
    push("info", "Products", "⭐", `Top selling product this month: ${topProductName}.`);

  return insights;
}

exports.getSummary = async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const sub = await getSubscriptionType(tenantId);
    const { docs, docId } = tableNames(sub);

    const [rev] = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM created_at)=EXTRACT(YEAR FROM NOW()) THEN total_amount END),0) AS curr_rev,
         COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM (NOW() - INTERVAL '1 month')) AND EXTRACT(YEAR FROM created_at)=EXTRACT(YEAR FROM (NOW() - INTERVAL '1 month')) THEN total_amount END),0) AS prev_rev,
         COALESCE(SUM(CASE WHEN created_at::date = CURRENT_DATE THEN total_amount END),0) AS today_rev,
         COALESCE(SUM(CASE WHEN created_at::date = CURRENT_DATE - 1 THEN total_amount END),0) AS yesterday_rev,
         COALESCE(SUM(CASE WHEN payment_status='Advance' AND payment_completion_status='Pending' THEN total_amount - advance_amount END),0) AS pending_dues,
         COUNT(DISTINCT CASE WHEN EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM created_at)=EXTRACT(YEAR FROM NOW()) THEN ${docId} END) AS curr_docs,
         COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) AS today_docs,
         COUNT(CASE WHEN created_at::date = CURRENT_DATE - 1 THEN 1 END) AS yesterday_docs
       FROM ${docs} AS d WHERE d.tenant_id=:tenantId`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const [stkRow] = await db.query(
      `SELECT
         SUM(CASE WHEN stock_quantity=0 THEN 1 ELSE 0 END) AS out_of_stock,
         SUM(CASE WHEN stock_quantity BETWEEN 1 AND 5 THEN 1 ELSE 0 END) AS low_stock,
         COUNT(*) AS total
       FROM products WHERE tenant_id=:tenantId`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const [retRow] = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM created_at)=EXTRACT(YEAR FROM NOW()) THEN total_amount END),0) AS curr,
         COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM (NOW() - INTERVAL '1 month')) AND EXTRACT(YEAR FROM created_at)=EXTRACT(YEAR FROM (NOW() - INTERVAL '1 month')) THEN total_amount END),0) AS prev
       FROM sales_returns WHERE tenant_id=:tenantId`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const currRev = Number(rev?.curr_rev || 0);
    const prevRev = Number(rev?.prev_rev || 0);
    const currRet = Number(retRow?.curr || 0);
    const prevRet = Number(retRow?.prev || 0);
    const growthPct = prevRev > 0 ? ((currRev - prevRev) / prevRev) * 100 : null;
    const retSpike = prevRet > 0 && ((currRet - prevRet) / prevRet) * 100 > 30;

    res.json({
      current_month_revenue: fmt2(currRev),
      revenue_growth_pct: growthPct !== null ? fmt2(growthPct) : null,
      today_revenue: fmt2(rev?.today_rev || 0),
      yesterday_revenue: fmt2(rev?.yesterday_rev || 0),
      today_transactions: Number(rev?.today_docs || 0),
      yesterday_transactions: Number(rev?.yesterday_docs || 0),
      return_spike_alert: retSpike,
      pending_dues: fmt2(rev?.pending_dues || 0),
      transaction_count: Number(rev?.curr_docs || 0),
      inventory: {
        out_of_stock: Number(stkRow?.out_of_stock || 0),
        low_stock: Number(stkRow?.low_stock || 0),
        total_products: Number(stkRow?.total || 0),
      },
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("summary error:", err);
    res.status(500).json({ error: "Internal server error", detail: err.message });
  }
};

exports.getSalesForecast = async (req, res) => {
  const tenantId = req.user.tenant_id;
  const lookback = Math.min(Math.max(parseInt(req.query.months) || 6, 3), 12);

  try {
    const sub = await getSubscriptionType(tenantId);
    const { docs } = tableNames(sub);

    const rows = await db.query(
      `SELECT
         TO_CHAR(created_at,'YYYY-MM') AS month,
         SUM(COALESCE(total_amount,0)) AS total_sales,
         SUM(COALESCE(gst_amount,0)) AS total_gst,
         COUNT(*) AS total_docs,
         AVG(COALESCE(total_amount,0)) AS avg_order,
         SUM(COALESCE(discount_value,0)) AS total_discount
       FROM ${docs} AS d
       WHERE tenant_id = :tenantId
         AND created_at >= (CURRENT_DATE - (:lookback * INTERVAL '1 month'))
         AND created_at < (CURRENT_DATE + INTERVAL '1 day')
       GROUP BY TO_CHAR(created_at,'YYYY-MM')
       ORDER BY month ASC`,
      { replacements: { tenantId, lookback }, type: Sequelize.QueryTypes.SELECT }
    );

    if (rows.length < 2) {
      return res.json({ forecast: null, message: "Need at least 2 months of data. Found " + rows.length + ".", historical: rows });
    }

    const vals = rows.map((r) => Number(r.total_sales));
    const n = vals.length;
    const sma = vals.reduce((a, b) => a + b, 0) / n;

    let wSum = 0, wTot = 0;
    vals.forEach((v, i) => { const w = i + 1; wSum += v * w; wTot += w; });
    const wma = wSum / wTot;

    const xMean = (n - 1) / 2;
    const yMean = sma;
    let ssxy = 0, ssxx = 0;
    vals.forEach((y, x) => { ssxy += (x - xMean) * (y - yMean); ssxx += (x - xMean) ** 2; });

    const slope = ssxx ? ssxy / ssxx : 0;
    const intercept = yMean - slope * xMean;
    const linearForecast = intercept + slope * n;

    let expSmoothed = vals[0];
    for (let i = 1; i < n; i++) expSmoothed = 0.3 * vals[i] + 0.7 * expSmoothed;
    const expForecast = 0.3 * vals[n - 1] + 0.7 * expSmoothed;

    const blended = wma * 0.35 + linearForecast * 0.30 + expForecast * 0.20 + sma * 0.15;
    const variance = vals.reduce((a, v) => a + (v - sma) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const cv = sma ? (stdDev / sma) * 100 : 100;
    const confidence = Math.max(30, Math.min(95, Math.round(100 - cv * 1.2)));

    const trendPct = sma ? (slope / sma) * 100 : 0;
    const trendDir = trendPct > 3 ? "upward" : trendPct < -3 ? "downward" : "stable";

    const growthRates = [];
    for (let i = 1; i < rows.length; i++) {
      const prev = Number(rows[i - 1].total_sales);
      const curr = Number(rows[i].total_sales);
      growthRates.push(prev > 0 ? ((curr - prev) / prev) * 100 : null);
    }

    const maxIdx = vals.indexOf(Math.max(...vals));
    const minIdx = vals.indexOf(Math.min(...vals));
    const lowerBound = Math.max(0, blended - stdDev);
    const upperBound = blended + stdDev;

    const nextDate = new Date();
    nextDate.setDate(1);
    nextDate.setMonth(nextDate.getMonth() + 1);

    res.json({
      forecast: {
        month: nextDate.toISOString().slice(0, 7),
        predicted_revenue: fmt2(blended),
        lower_bound: fmt2(lowerBound),
        upper_bound: fmt2(upperBound),
        sma_forecast: fmt2(sma),
        wma_forecast: fmt2(wma),
        linear_trend_forecast: fmt2(linearForecast),
        exponential_forecast: fmt2(expForecast),
        confidence_score: confidence,
        trend_direction: trendDir,
        trend_pct_per_month: fmt2(trendPct),
        months_analyzed: n,
      },
      analytics: {
        avg_monthly_revenue: fmt2(sma),
        best_month: { month: rows[maxIdx].month, revenue: fmt2(vals[maxIdx]) },
        worst_month: { month: rows[minIdx].month, revenue: fmt2(vals[minIdx]) },
        revenue_volatility: fmt2(cv),
        growth_rates: rows.slice(1).map((r, i) => ({ month: r.month, growth_pct: growthRates[i] ? fmt2(growthRates[i]) : null })),
      },
      historical: rows,
    });
  } catch (err) {
    console.error("forecast error:", err);
    res.status(500).json({ error: "Internal server error", detail: err.message });
  }
};

exports.getReturnSpike = async (req, res) => {
  const tenantId = req.user.tenant_id;
  const threshold = parseFloat(req.query.threshold) || 30;

  try {
    const srMonthly = await db.query(
      `SELECT TO_CHAR(sr.created_at,'YYYY-MM') AS month,
              COUNT(*) AS return_count,
              COALESCE(SUM(sr.total_amount),0) AS return_value,
              COALESCE(SUM(sri.quantity),0) AS return_qty,
              COUNT(DISTINCT sr.customer_id) AS unique_customers
       FROM sales_returns sr
       LEFT JOIN sales_return_items sri ON sri.sales_return_id=sr.sales_return_id
       WHERE sr.tenant_id=:tenantId
         AND sr.created_at >= CAST(TO_CHAR(NOW() - INTERVAL '6 months','YYYY-MM-01') AS DATE)
       GROUP BY month ORDER BY month`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const prMonthly = await db.query(
      `SELECT TO_CHAR(pr.created_at,'YYYY-MM') AS month,
              COUNT(*) AS return_count,
              COALESCE(SUM(pr.total_amount),0) AS return_value,
              COALESCE(SUM(pri.quantity),0) AS return_qty
       FROM purchase_returns pr
       LEFT JOIN purchase_return_items pri ON pri.purchase_return_id=pr.purchase_return_id
       WHERE pr.tenant_id=:tenantId
         AND pr.created_at >= CAST(TO_CHAR(NOW() - INTERVAL '6 months','YYYY-MM-01') AS DATE)
       GROUP BY month ORDER BY month`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const topReturnedProducts = await db.query(
      `SELECT p.product_id, p.product_name, c.category_name,
              COUNT(sri.sales_return_item_id) AS incidents,
              COALESCE(SUM(sri.quantity),0) AS total_qty,
              COALESCE(SUM(sri.total_with_gst),0) AS total_value,
              COALESCE(AVG(sri.rate),0) AS avg_rate,
              STRING_AGG(DISTINCT sr.reason, ' | ') AS reasons
       FROM sales_return_items sri
       JOIN sales_returns sr ON sr.sales_return_id=sri.sales_return_id
       JOIN products p ON p.product_id=sri.product_id
       LEFT JOIN product_categories c ON c.category_id=p.category_id
       WHERE sr.tenant_id=:tenantId
         AND sr.created_at >= (NOW() - INTERVAL '3 months')
       GROUP BY p.product_id, p.product_name, c.category_name
       ORDER BY total_qty DESC LIMIT 15`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const verificationBreakdown = await db.query(
      `SELECT
         verification_status,
         return_type,
         COUNT(*) AS count,
         COALESCE(SUM(returned_quantity),0) AS total_qty,
         COALESCE(SUM(sellable_quantity),0) AS sellable,
         COALESCE(SUM(damaged_quantity),0) AS damaged,
         COALESCE(SUM(scrap_quantity),0) AS scrap
       FROM return_stock_verification
       WHERE tenant_id=:tenantId
       GROUP BY verification_status, return_type`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const sub = await getSubscriptionType(tenantId);
     const { docs, docId } = tableNames(sub);
     const salesVsReturn = await db.query(
       `SELECT
          TO_CHAR(d.created_at,'YYYY-MM') AS month,
          COALESCE(SUM(d.total_amount),0) AS sales_value,
          COALESCE(SUM(sr.total_amount),0) AS return_value
        FROM ${docs} AS d
        LEFT JOIN sales_returns sr ON sr.original_invoice_id = d.${docId}
         AND TO_CHAR(sr.created_at,'YYYY-MM')=TO_CHAR(d.created_at,'YYYY-MM')
       WHERE d.tenant_id=:tenantId
         AND d.created_at >= CAST(TO_CHAR(NOW() - INTERVAL '6 months','YYYY-MM-01') AS DATE)
       GROUP BY month ORDER BY month`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const detectSpikes = (rows, label) => {
      const spikes = [];
      for (let i = 1; i < rows.length; i++) {
        const prev = Number(rows[i - 1].return_value);
        const curr = Number(rows[i].return_value);
        if (prev === 0 && curr > 0) {
          spikes.push({ month: rows[i].month, prev_value: 0, curr_value: fmt2(curr), change_pct: 100, severity: "medium", type: label });
        } else if (prev > 0) {
          const chg = ((curr - prev) / prev) * 100;
          if (chg > threshold) {
            spikes.push({ month: rows[i].month, prev_month: rows[i - 1].month, prev_value: fmt2(prev), curr_value: fmt2(curr), change_pct: fmt2(chg), severity: chg > 100 ? "critical" : chg > 60 ? "high" : "medium", type: label });
          }
        }
      }
      return spikes;
    };

    const salesSpikes = detectSpikes(srMonthly, "sales_return");
    const purchaseSpikes = detectSpikes(prMonthly, "purchase_return");
    const allSpikes = [...salesSpikes, ...purchaseSpikes];

    const totalReturned = verificationBreakdown.reduce((a, b) => a + Number(b.total_qty), 0);
    const totalSellable = verificationBreakdown.reduce((a, b) => a + Number(b.sellable), 0);
    const recoveryRate = totalReturned > 0 ? fmt2((totalSellable / totalReturned) * 100) : 0;

    res.json({
      alert_triggered: allSpikes.length > 0,
      spike_threshold_pct: threshold,
      overall_status: allSpikes.length > 0 ? "ACTION_REQUIRED" : "NORMAL",
      summary_message: allSpikes.length > 0 ? "⚠️ " + allSpikes.length + " return spike(s) detected. Immediate review required." : "✅ Return rates are within normal bounds.",
      spikes: allSpikes,
      recovery_rate_pct: recoveryRate,
      sales_returns: {
        monthly: srMonthly.map((r) => ({ month: r.month, return_count: Number(r.return_count), return_value: fmt2(r.return_value), return_qty: Number(r.return_qty), unique_customers: Number(r.unique_customers) })),
        spikes: salesSpikes,
      },
      purchase_returns: {
        monthly: prMonthly.map((r) => ({ month: r.month, return_count: Number(r.return_count), return_value: fmt2(r.return_value), return_qty: Number(r.return_qty) })),
        spikes: purchaseSpikes,
      },
      top_returned_products: topReturnedProducts.map((p) => ({
        product_id: p.product_id,
        product_name: p.product_name,
        category: p.category_name,
        incidents: Number(p.incidents),
        total_qty: Number(p.total_qty),
        total_value: fmt2(p.total_value),
        avg_rate: fmt2(p.avg_rate),
        reasons: p.reasons ? p.reasons.split(" | ").filter(Boolean).slice(0, 3) : [],
        risk_level: Number(p.total_qty) > 50 ? "critical" : Number(p.total_qty) > 20 ? "high" : "medium",
      })),
      verification_breakdown: verificationBreakdown,
      return_vs_sales: salesVsReturn.map((r) => ({
        month: r.month,
        sales_value: fmt2(r.sales_value),
        return_value: fmt2(r.return_value),
        return_rate_pct: Number(r.sales_value) > 0 ? fmt2((Number(r.return_value) / Number(r.sales_value)) * 100) : 0,
      })),
    });
  } catch (err) {
    console.error("return-spike error:", err);
    res.status(500).json({ error: "Internal server error", detail: err.message });
  }
};

exports.getReorderSuggestions = async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const sub = await getSubscriptionType(tenantId);
    const { docs, items, docId } = tableNames(sub);
    const leadTimeDays = parseInt(req.query.lead_time_days) || 7;

    const velocity = await db.query(
      `SELECT
         p.product_id, p.product_name, p.category_id, c.category_name,
         p.stock_quantity, p.sellable_stock, p.price,
         p.damaged_stock, p.scrap_stock,
         COALESCE(SUM(i.quantity),0) AS qty_sold_30d,
         MAX(d.created_at) AS last_sold
       FROM products p
       LEFT JOIN ${items} i ON i.product_id=p.product_id AND i.tenant_id=p.tenant_id
       LEFT JOIN ${docs} d ON d.${docId}=i.${docId} AND d.created_at >= (NOW() - INTERVAL '30 days')
       LEFT JOIN product_categories c ON c.category_id=p.category_id
       WHERE p.tenant_id=:tenantId
       GROUP BY p.product_id, p.product_name, p.category_id, c.category_name, p.stock_quantity, p.sellable_stock, p.price, p.damaged_stock, p.scrap_stock`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    // FIX: 'Pending' does not exist in gr_status_enum.
    // Valid values: 'draft', 'in_progress', 'completed', 'discrepancy_noted'
    const incoming = await db.query(
      `SELECT gri.product_id, COALESCE(SUM(gri.received_quantity),0) AS incoming_qty
       FROM goods_receipt_items gri
       JOIN goods_receipts g ON g.gr_id=gri.gr_id
       WHERE gri.tenant_id=:tenantId AND g.status IN ('draft', 'in_progress')
       GROUP BY gri.product_id`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );
    const incMap = {}; incoming.forEach((m) => { incMap[m.product_id] = Number(m.incoming_qty); });

    // FIX: Corrected vendor query using purchase_invoice_items -> purchase_invoices -> suppliers
    const vendors = await db.query(
      `SELECT pii.product_id,
              s.supplier_name,
              COUNT(pi.purchase_invoice_id) AS purchase_count,
              MAX(pi.purchase_invoice_date) AS last_purchase_date
       FROM purchase_invoice_items pii
       JOIN purchase_invoices pi ON pi.purchase_invoice_id=pii.purchase_invoice_id
       JOIN suppliers s ON s.supplier_id=pi.supplier_id
       WHERE pii.tenant_id=:tenantId
       GROUP BY pii.product_id, s.supplier_id, s.supplier_name
       ORDER BY purchase_count DESC`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );
    const vMap = {}; vendors.forEach((v) => { if (!vMap[v.product_id]) vMap[v.product_id] = v; });

    // Return rate data for products
    const retRates = await db.query(
      `SELECT sri.product_id,
              COALESCE(SUM(sri.quantity),0) AS returned_qty
       FROM sales_return_items sri
       JOIN sales_returns sr ON sr.sales_return_id=sri.sales_return_id
       WHERE sri.tenant_id=:tenantId AND sr.created_at >= (NOW() - INTERVAL '90 days')
       GROUP BY sri.product_id`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );
    const retMap = {}; retRates.forEach((r) => { retMap[r.product_id] = Number(r.returned_qty); });

    const suggestions = velocity.map((p) => {
      const qtySold = Number(p.qty_sold_30d);
      const dailyVelocity = qtySold / 30;
      const safetyStock = Math.ceil(dailyVelocity * 3);
      const reorderPoint = Math.ceil((dailyVelocity * leadTimeDays) + safetyStock);
      const incomingQty = incMap[p.product_id] || 0;
      const currentStock = Number(p.stock_quantity);
      const suggestedOrder = Math.max(0, Math.ceil(reorderPoint - currentStock - incomingQty));
      const daysUntilStockout = dailyVelocity > 0 ? currentStock / dailyVelocity : 999;
      const stockValue = fmt2(Number(p.price) * currentStock);
      const returnedQty = retMap[p.product_id] || 0;
      const returnRatePct = qtySold > 0 ? fmt2((returnedQty / qtySold) * 100) : 0;

      const lastSoldDate = p.last_sold ? new Date(p.last_sold) : null;
      const daysSinceLastSale = lastSoldDate ? Math.floor((Date.now() - lastSoldDate) / 86400000) : null;

      // Determine status (matches frontend STATUS_META keys)
      let status = "sufficient";
      if (currentStock <= 0) status = "out_of_stock";
      else if (daysUntilStockout <= leadTimeDays && dailyVelocity > 0) status = "critical";
      else if (daysUntilStockout <= leadTimeDays + 7 && dailyVelocity > 0) status = "reorder_soon";
      else if (dailyVelocity === 0 && currentStock > 0) status = "no_sales_data";
      else if (dailyVelocity > 0 && dailyVelocity < 0.3) status = "slow_moving";

      // Mover type (matches frontend STATUS_META keys)
      let mover_type = "no_movement";
      if (dailyVelocity > 3) mover_type = "fast";
      else if (dailyVelocity > 1) mover_type = "medium";
      else if (dailyVelocity > 0) mover_type = "slow";

      // Priority for sorting
      let priority = "low";
      if (status === "out_of_stock") priority = "critical";
      else if (status === "critical") priority = "high";
      else if (status === "reorder_soon") priority = "medium";

      const preferredVendor = vMap[p.product_id];

      return {
        product_id: p.product_id,
        product_name: p.product_name,
        category: p.category_name,
        current_stock: currentStock,
        sellable_stock: Number(p.sellable_stock),
        thirty_day_velocity: qtySold,
        avg_daily_sales: fmt2(dailyVelocity),
        daily_velocity: fmt2(dailyVelocity),
        incoming_stock: incomingQty,
        reorder_point: reorderPoint,
        suggested_reorder_qty: suggestedOrder,
        suggested_order_qty: suggestedOrder,
        days_remaining: daysUntilStockout >= 999 ? null : fmt2(daysUntilStockout),
        days_until_stockout: daysUntilStockout >= 999 ? null : fmt2(daysUntilStockout),
        stock_value: stockValue,
        return_rate_pct: returnRatePct,
        status,
        mover_type,
        priority,
        last_sold_date: p.last_sold || null,
        days_since_last_sale: daysSinceLastSale,
        preferred_vendor: preferredVendor ? {
          name: preferredVendor.supplier_name,
          last_purchase: preferredVendor.last_purchase_date,
        } : null,
      };
    }).filter((s) => s.suggested_order_qty > 0 || s.status === "out_of_stock" || s.status === "critical");

    suggestions.sort((a, b) => {
      const p = { critical: 0, high: 1, medium: 2, low: 3 };
      return (p[a.priority] ?? 3) - (p[b.priority] ?? 3);
    });

    // Summary counts matching frontend expectations
    const summary = {
      total_items_to_reorder: suggestions.length,
      out_of_stock: suggestions.filter((s) => s.status === "out_of_stock").length,
      critical: suggestions.filter((s) => s.status === "critical").length,
      critical_shortages: suggestions.filter((s) => s.priority === "critical").length,
      high_priority: suggestions.filter((s) => s.priority === "high").length,
      reorder_soon: suggestions.filter((s) => s.status === "reorder_soon").length,
      slow_moving: suggestions.filter((s) => s.status === "slow_moving").length,
      sufficient: suggestions.filter((s) => s.status === "sufficient").length,
      fast_movers: suggestions.filter((s) => s.mover_type === "fast").length,
      dead_stock: suggestions.filter((s) => s.mover_type === "no_movement" && s.current_stock > 0).length,
      total_stock_value: fmt2(suggestions.reduce((a, s) => a + Number(s.stock_value), 0)),
    };

    res.json({ summary, suggestions });
  } catch (err) {
    console.error("reorder-suggestions:", err);
    res.status(500).json({ error: "Internal server error", detail: err.message });
  }
};

exports.getBusinessInsights = async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const sub = await getSubscriptionType(tenantId);
    const { docs, items, docId, customerCol } = tableNames(sub);

    const now = new Date();
    const periodLabel = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

    const [curr] = await db.query(
      `SELECT
         COALESCE(SUM(total_amount),0) AS revenue,
         COUNT(DISTINCT ${docId}) AS doc_count,
         COUNT(DISTINCT ${customerCol}) AS unique_customers,
         COALESCE(AVG(total_amount),0) AS avg_order,
         COALESCE(SUM(discount_value),0) AS discount,
         COALESCE(SUM(gst_amount),0) AS gst,
         COALESCE(SUM(cgst_amount),0) AS cgst,
         COALESCE(SUM(sgst_amount),0) AS sgst,
         COALESCE(SUM(transport_charge),0) AS transport,
         COALESCE(SUM(CASE WHEN payment_status='Advance' AND payment_completion_status='Pending' THEN total_amount-advance_amount END),0) AS pending_dues,
         COALESCE(SUM(CASE WHEN payment_type='Cash' THEN total_amount END),0) AS cash_rev,
         COALESCE(SUM(CASE WHEN payment_type='UPI' THEN total_amount END),0) AS upi_rev,
         -- FIX: 'Credit Card' and 'Debit Card' removed — not in payment_type_enum
         -- Valid enum values: 'Cash', 'Card', 'UPI', 'NEFT', 'IMPS', 'RTGS'
         COALESCE(SUM(CASE WHEN payment_type='Card' THEN total_amount END),0) AS card_rev,
         COALESCE(SUM(CASE WHEN payment_type='NEFT' THEN total_amount END),0) AS neft_rev,
         COALESCE(SUM(CASE WHEN payment_type='IMPS' THEN total_amount END),0) AS imps_rev,
         COALESCE(SUM(CASE WHEN payment_type='RTGS' THEN total_amount END),0) AS rtgs_rev
       FROM ${docs} AS d
       WHERE d.tenant_id=:tenantId
         AND EXTRACT(MONTH FROM d.created_at)=EXTRACT(MONTH FROM NOW())
         AND EXTRACT(YEAR FROM d.created_at)=EXTRACT(YEAR FROM NOW())`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const [prev] = await db.query(
      `SELECT COALESCE(SUM(total_amount),0) AS revenue,
              COUNT(DISTINCT ${docId}) AS doc_count,
              COUNT(DISTINCT ${customerCol}) AS unique_customers,
              COALESCE(AVG(total_amount),0) AS avg_order
       FROM ${docs} AS d
       WHERE d.tenant_id=:tenantId
         AND EXTRACT(MONTH FROM d.created_at)=EXTRACT(MONTH FROM (NOW() - INTERVAL '1 month'))
         AND EXTRACT(YEAR FROM d.created_at)=EXTRACT(YEAR FROM (NOW() - INTERVAL '1 month'))`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const [ret] = await db.query(
      `SELECT COALESCE(SUM(total_amount),0) AS val, COUNT(*) AS cnt
       FROM sales_returns
       WHERE tenant_id=:tenantId
         AND EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM NOW())
         AND EXTRACT(YEAR FROM created_at)=EXTRACT(YEAR FROM NOW())`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const [prevRet] = await db.query(
      `SELECT COALESCE(SUM(total_amount),0) AS val, COUNT(*) AS cnt
       FROM sales_returns
       WHERE tenant_id=:tenantId
         AND EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM (NOW() - INTERVAL '1 month'))
         AND EXTRACT(YEAR FROM created_at)=EXTRACT(YEAR FROM (NOW() - INTERVAL '1 month'))`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const [stock] = await db.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN stock_quantity=0 THEN 1 ELSE 0 END) AS out_of_stock,
              SUM(CASE WHEN stock_quantity BETWEEN 1 AND 5 THEN 1 ELSE 0 END) AS low_stock,
              SUM(CASE WHEN damaged_stock>0 THEN 1 ELSE 0 END) AS has_damaged,
              SUM(CASE WHEN scrap_stock>0 THEN 1 ELSE 0 END) AS has_scrap,
              COALESCE(SUM(damaged_stock * price),0) AS damaged_value,
              COALESCE(SUM(scrap_stock * price),0) AS scrap_value,
              COALESCE(SUM(stock_quantity * price),0) AS inventory_value
       FROM products WHERE tenant_id=:tenantId`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    // FIX: verification_status enum is lowercase 'pending' not 'Pending'
    const [pendingVer] = await db.query(
      `SELECT COUNT(*) AS cnt FROM return_stock_verification WHERE tenant_id=:tenantId AND verification_status='pending'`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const topProducts = await db.query(
      `SELECT p.product_id, p.product_name, c.category_name,
              COALESCE(SUM(i.quantity),0) AS qty,
              COALESCE(SUM(i.total_with_gst),0) AS revenue,
              COALESCE(SUM(i.base_amount),0) AS base_revenue,
              COUNT(DISTINCT d.${docId}) AS order_count
       FROM ${items} i JOIN ${docs} d ON d.${docId}=i.${docId}
       JOIN products p ON p.product_id=i.product_id
       LEFT JOIN product_categories c ON c.category_id=p.category_id
       WHERE i.tenant_id=:tenantId
         AND EXTRACT(MONTH FROM d.created_at)=EXTRACT(MONTH FROM NOW())
         AND EXTRACT(YEAR FROM d.created_at)=EXTRACT(YEAR FROM NOW())
       GROUP BY p.product_id, p.product_name, c.category_name
       ORDER BY revenue DESC LIMIT 10`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const categories = await db.query(
      `SELECT c.category_name,
              COALESCE(SUM(i.quantity),0) AS qty,
              COALESCE(SUM(i.total_with_gst),0) AS revenue,
              COUNT(DISTINCT p.product_id) AS products
       FROM ${items} i JOIN ${docs} d ON d.${docId}=i.${docId}
       JOIN products p ON p.product_id=i.product_id
       LEFT JOIN product_categories c ON c.category_id=p.category_id
       WHERE i.tenant_id=:tenantId
         AND EXTRACT(MONTH FROM d.created_at)=EXTRACT(MONTH FROM NOW())
         AND EXTRACT(YEAR FROM d.created_at)=EXTRACT(YEAR FROM NOW())
       GROUP BY c.category_id, c.category_name
       ORDER BY revenue DESC LIMIT 5`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const payments = await db.query(
      `SELECT COALESCE(payment_type::text, 'Not Specified') AS payment_type,
              COUNT(*) AS count,
              COALESCE(SUM(total_amount),0) AS total,
              COALESCE(AVG(total_amount),0) AS avg_amount
       FROM ${docs} AS d WHERE d.tenant_id=:tenantId
         AND EXTRACT(MONTH FROM d.created_at)=EXTRACT(MONTH FROM NOW())
         AND EXTRACT(YEAR FROM d.created_at)=EXTRACT(YEAR FROM NOW())
       GROUP BY payment_type ORDER BY total DESC`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const dailySales = await db.query(
      `SELECT EXTRACT(DAY FROM created_at) AS day_num,
              trim(to_char(created_at, 'Day')) AS day_name,
              COALESCE(SUM(total_amount),0) AS daily_revenue,
              COUNT(*) AS daily_count
       FROM ${docs} AS d WHERE d.tenant_id=:tenantId
         AND EXTRACT(MONTH FROM d.created_at)=EXTRACT(MONTH FROM NOW())
         AND EXTRACT(YEAR FROM d.created_at)=EXTRACT(YEAR FROM NOW())
       GROUP BY day_num, trim(to_char(d.created_at, 'Day')) ORDER BY day_num`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    // ── Compute derived KPIs ─────────────────────────────────────────────
    const revenue    = Number(curr?.revenue || 0);
    const pRevenue   = Number(prev?.revenue || 0);
    const returnVal  = Number(ret?.val || 0);
    const pReturnVal = Number(prevRet?.val || 0);
    const discount   = Number(curr?.discount || 0);

    const revenueGrowth   = pRevenue > 0 ? ((revenue - pRevenue) / pRevenue) * 100 : null;
    const returnRate      = revenue > 0 ? (returnVal / revenue) * 100 : 0;
    const pReturnRate     = pRevenue > 0 ? (pReturnVal / pRevenue) * 100 : 0;
    const returnRateChange = pReturnRate > 0 ? returnRate - pReturnRate : 0;
    const avgOrderGrowth   = Number(prev?.avg_order) > 0 ? ((Number(curr?.avg_order) - Number(prev?.avg_order)) / Number(prev?.avg_order)) * 100 : null;
    const customerGrowth   = Number(prev?.unique_customers) > 0 ? ((Number(curr?.unique_customers) - Number(prev?.unique_customers)) / Number(prev?.unique_customers)) * 100 : null;
    const discountRate     = revenue > 0 ? (discount / revenue) * 100 : 0;
    const gstRate          = revenue > 0 ? (Number(curr?.gst || 0) / revenue) * 100 : 0;
    const inventoryValue   = Number(stock?.inventory_value || 0);
    const invTurnover      = inventoryValue > 0 ? revenue / inventoryValue : 0;

    // Net revenue = gross - returns - discounts
    const netRevenue = Math.max(0, revenue - returnVal - discount);

    // ── Build kpis object (all fields frontend uses) ─────────────────────
    const kpis = {
      // Frontend uses both names — provide both
      total_revenue:        fmt2(revenue),
      gross_revenue:        fmt2(revenue),        // ← frontend looks for this
      net_revenue:          fmt2(netRevenue),      // ← frontend looks for this
      total_gst:            fmt2(curr?.gst),
      gst_collected:        fmt2(curr?.gst),       // ← frontend looks for this
      cgst:                 fmt2(curr?.cgst),
      sgst:                 fmt2(curr?.sgst),
      total_discount:       fmt2(discount),
      total_returns:        fmt2(returnVal),
      return_count:         Number(ret?.cnt || 0),
      return_rate_pct:      fmt2(returnRate),
      return_rate_change:   fmt2(returnRateChange),
      pending_dues:         fmt2(curr?.pending_dues),
      transport_revenue:    fmt2(curr?.transport),
      avg_order_value:      fmt2(curr?.avg_order),
      avg_order_growth_pct: avgOrderGrowth !== null ? fmt2(avgOrderGrowth) : null,
      transaction_count:    Number(curr?.doc_count),
      unique_customers:     Number(curr?.unique_customers),
      customer_growth_pct:  customerGrowth !== null ? fmt2(customerGrowth) : null,
      revenue_growth_pct:   revenueGrowth !== null ? fmt2(revenueGrowth) : null,
      inventory_value:      fmt2(inventoryValue),
      damaged_stock_value:  fmt2(stock?.damaged_value),
      scrap_stock_value:    fmt2(stock?.scrap_value),
      inventory_turnover:   fmt2(invTurnover),
      gst_rate_pct:         fmt2(gstRate),
      discount_rate_pct:    fmt2(discountRate),
      cash_revenue:         fmt2(curr?.cash_rev),
      upi_revenue:          fmt2(curr?.upi_rev),
      card_revenue:         fmt2(curr?.card_rev),
      neft_revenue:         fmt2(curr?.neft_rev),
      imps_revenue:         fmt2(curr?.imps_rev),
      rtgs_revenue:         fmt2(curr?.rtgs_rev),
      // For health score calculation
      out_of_stock:         Number(stock?.out_of_stock || 0),
      total_products:       Number(stock?.total || 0),
    };

    // ── Health score ─────────────────────────────────────────────────────
    const health_score = calcHealthScore(kpis);

    // ── Structured insights (objects, not plain strings) ─────────────────
    const topProductName = topProducts.length > 0 ? topProducts[0].product_name : "N/A";
    const insights = buildInsights(kpis, topProductName);

    // ── Action items (frontend uses .action not .message) ─────────────────
    const rawActions = [];
    if (revenueGrowth !== null && revenueGrowth < -5)
      rawActions.push({ priority: 1, type: "revenue_drop", message: `Revenue is down ${fmt2(Math.abs(revenueGrowth))}% vs last month. Consider running promotions.` });
    if (returnRate > 15)
      rawActions.push({ priority: 1, type: "high_returns", message: `Return rate critically high at ${fmt2(returnRate)}%. Inspect product quality immediately.` });
    else if (returnRateChange > 5)
      rawActions.push({ priority: 2, type: "return_spike", message: `Return rate increased by ${fmt2(returnRateChange)}% this month.` });
    if (Number(stock?.out_of_stock) > 0)
      rawActions.push({ priority: 1, type: "stockout", message: `${Number(stock?.out_of_stock)} products are completely out of stock.` });
    if (discountRate > 20)
      rawActions.push({ priority: 2, type: "high_discounts", message: `Discounting is aggressive (${fmt2(discountRate)}% of revenue). Monitor margins.` });
    if (Number(pendingVer?.cnt) > 0)
      rawActions.push({ priority: 2, type: "pending_verification", message: `${Number(pendingVer?.cnt)} returned items are pending QA verification.` });

    // Expose both .action and .message so either frontend version works
    const action_items = rawActions
      .sort((a, b) => a.priority - b.priority)
      .map((a) => ({ ...a, action: a.message }));

    res.json({
      period: {
        label: periodLabel,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
      health_score,          // ← frontend crash fix: was missing
      kpis,
      stock_summary: {
        total_products:               Number(stock?.total || 0),
        out_of_stock:                 Number(stock?.out_of_stock || 0),
        low_stock:                    Number(stock?.low_stock || 0),
        products_with_damaged:        Number(stock?.has_damaged || 0),
        products_with_scrap:          Number(stock?.has_scrap || 0),
        pending_return_verifications: Number(pendingVer?.cnt || 0),
      },
      top_products: topProducts.map((p) => ({
        product_id:   p.product_id,
        name:         p.product_name,
        category:     p.category_name,
        qty_sold:     Number(p.qty),
        revenue:      fmt2(p.revenue),
        base_revenue: fmt2(p.base_revenue),
        order_count:  Number(p.order_count),
      })),
      payment_breakdown: payments.map((p) => ({
        payment_type: p.payment_type,
        count:        Number(p.count),
        total:        fmt2(p.total),
        avg_amount:   fmt2(p.avg_amount),
        share_pct:    revenue > 0 ? fmt2((Number(p.total) / revenue) * 100) : 0,
      })),
      category_performance: categories.map((c) => ({
        category:  c.category_name,
        qty:       Number(c.qty),
        revenue:   fmt2(c.revenue),
        products:  Number(c.products),
        share_pct: revenue > 0 ? fmt2((Number(c.revenue) / revenue) * 100) : 0,
      })),
      daily_sales: dailySales.map((d) => ({
        day:      Number(d.day_num),
        day_name: d.day_name,
        revenue:  fmt2(d.daily_revenue),
        count:    Number(d.daily_count),
      })),
      insights,
      action_items,
      subscription_type: sub,
    });
  } catch (err) {
    console.error("business-insights:", err);
    res.status(500).json({ error: "Internal server error", detail: err.message });
  }
};

exports.getCustomerSegmentation = async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const sub = await getSubscriptionType(tenantId);
    if (sub === "bill") {
      return res.json({ message: "Customer segmentation requires invoice mode.", segments: [], customers: [] });
    }

    const rfm = await db.query(
      `SELECT
         c.customer_id,
         c.name,
         c.mobile,
         c.email,
         DATE_PART('day', CURRENT_DATE - MAX(i.invoice_date)::timestamp) AS recency_days,
         COUNT(DISTINCT i.invoice_id) AS frequency,
         COALESCE(SUM(i.total_amount), 0) AS monetary,
         COALESCE(AVG(i.total_amount), 0) AS avg_order_value,
         MIN(i.invoice_date) AS first_purchase,
         MAX(i.invoice_date) AS last_purchase,
         DATE_PART('day', MAX(i.invoice_date)::timestamp - MIN(i.invoice_date)::timestamp) AS customer_tenure_days,
         COUNT(DISTINCT TO_CHAR(i.invoice_date, 'YYYY-MM')) AS active_months
       FROM customers c
       JOIN invoices i ON i.customer_id=c.customer_id AND i.tenant_id=c.tenant_id
       WHERE c.tenant_id=:tenantId
       GROUP BY c.customer_id
       HAVING COUNT(DISTINCT i.invoice_id) > 0`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    if (rfm.length === 0) return res.json({ segments: [], customers: [], summary: {} });

    const score = (val, arr, ascending = true) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = sorted.indexOf(val);
      const percentile = idx / sorted.length;
      const raw = Math.ceil(percentile * 5) || 1;
      return ascending ? raw : 6 - raw;
    };

    const recencyArr = rfm.map((r) => Number(r.recency_days));
    const freqArr    = rfm.map((r) => Number(r.frequency));
    const monArr     = rfm.map((r) => Number(r.monetary));

    const customers = rfm.map((r) => {
      const R = score(Number(r.recency_days), recencyArr, false);
      const F = score(Number(r.frequency), freqArr, true);
      const M = score(Number(r.monetary), monArr, true);
      const rfmScore = R * 100 + F * 10 + M;
      const avg = (R + F + M) / 3;

      let segment, segmentColor, description;
      if (R >= 4 && F >= 4 && M >= 4)      { segment = "Champions";           segmentColor = "#4caf50"; description = "Bought recently, buy often, spend most."; }
      else if (R >= 3 && F >= 3 && M >= 3) { segment = "Loyal Customers";     segmentColor = "#2196f3"; description = "Buy regularly, respond well to promotions."; }
      else if (R >= 4 && F <= 2)            { segment = "New Customers";       segmentColor = "#00bcd4"; description = "Bought recently but not yet frequent."; }
      else if (R >= 3 && F >= 3 && M <= 2) { segment = "Potential Loyalists"; segmentColor = "#9c27b0"; description = "Recent buyers with medium frequency — nurture them."; }
      else if (R >= 4 && M >= 4)            { segment = "Big Spenders";        segmentColor = "#ff9800"; description = "High value recent buyers. VIP treatment recommended."; }
      else if (R <= 2 && F >= 4)            { segment = "At Risk";             segmentColor = "#ff5722"; description = "Used to buy often but haven't recently."; }
      else if (R <= 2 && F >= 2)            { segment = "Needs Re-engagement"; segmentColor = "#f44336"; description = "Haven't bought in a while. Send win-back offers."; }
      else if (R === 1 && F === 1)          { segment = "Lost";                segmentColor = "#607d8b"; description = "Bought once long ago. Hard to recover."; }
      else                                  { segment = "Occasional Buyers";   segmentColor = "#78909c"; description = "Low frequency, moderate recency."; }

      const tenureMonths        = Math.max(1, Math.round(Number(r.customer_tenure_days) / 30));
      const purchaseFreqPerMonth = Number(r.frequency) / tenureMonths;
      const clvAnnual           = Number(r.avg_order_value) * purchaseFreqPerMonth * 12;

      return {
        customer_id: r.customer_id, name: r.name, mobile: r.mobile,
        recency_days: Number(r.recency_days), frequency: Number(r.frequency),
        monetary: fmt2(r.monetary), avg_order_value: fmt2(r.avg_order_value),
        r_score: R, f_score: F, m_score: M, rfm_score: rfmScore, avg_rfm: fmt2(avg),
        segment, segment_color: segmentColor, description,
        first_purchase: r.first_purchase, last_purchase: r.last_purchase,
        customer_tenure_days: Number(r.customer_tenure_days),
        active_months: Number(r.active_months),
        clv_annual_estimate: fmt2(clvAnnual),
      };
    });

    customers.sort((a, b) => b.monetary - a.monetary);

    const segMap = {};
    customers.forEach((c) => {
      if (!segMap[c.segment]) segMap[c.segment] = { segment: c.segment, color: c.segment_color, count: 0, total_revenue: 0, avg_clv: 0, customers: [] };
      segMap[c.segment].count++;
      segMap[c.segment].total_revenue += Number(c.monetary);
      segMap[c.segment].avg_clv += Number(c.clv_annual_estimate);
      segMap[c.segment].customers.push(c.name);
    });

    const segments = Object.values(segMap).map((s) => ({
      ...s,
      total_revenue: fmt2(s.total_revenue),
      avg_clv: fmt2(s.avg_clv / s.count),
      share_pct: fmt2((s.count / customers.length) * 100),
    })).sort((a, b) => b.count - a.count);

    const totalCLV = customers.reduce((a, b) => a + Number(b.clv_annual_estimate), 0);
    const avgCLV   = customers.length > 0 ? totalCLV / customers.length : 0;

    res.json({
      summary: {
        total_customers:       customers.length,
        total_customer_revenue: fmt2(customers.reduce((a, b) => a + Number(b.monetary), 0)),
        avg_customer_value:    fmt2(customers.reduce((a, b) => a + Number(b.monetary), 0) / customers.length),
        avg_clv_annual:        fmt2(avgCLV),
        total_clv_annual:      fmt2(totalCLV),
        champions_count:       segMap["Champions"]?.count || 0,
        at_risk_count:         (segMap["At Risk"]?.count || 0) + (segMap["Needs Re-engagement"]?.count || 0),
        avg_frequency:         fmt2(customers.reduce((a, b) => a + b.frequency, 0) / customers.length),
        avg_recency_days:      fmt2(customers.reduce((a, b) => a + b.recency_days, 0) / customers.length),
      },
      segments,
      customers: customers.slice(0, 100),
    });
  } catch (err) {
    console.error("customer-segmentation:", err);
    res.status(500).json({ error: "Internal server error", detail: err.message });
  }
};

exports.getProductAnalytics = async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const sub = await getSubscriptionType(tenantId);
    const { docs, items, docId } = tableNames(sub);

    const velocity90 = await db.query(
      `SELECT p.product_id, p.product_name, p.price, p.stock_quantity,
              p.sellable_stock, p.damaged_stock, p.scrap_stock, p.hsn_code,
              c.category_name,
              COALESCE(SUM(i.quantity),0) AS qty_sold_90,
              COALESCE(SUM(i.base_amount),0) AS base_revenue_90,
              COALESCE(SUM(i.total_with_gst),0) AS gross_revenue_90,
              COALESCE(AVG(i.rate),0) AS avg_selling_price,
              COUNT(DISTINCT d.${docId}) AS orders_90
       FROM products p
       LEFT JOIN ${items} i ON i.product_id=p.product_id AND i.tenant_id=p.tenant_id
       LEFT JOIN ${docs} d ON d.${docId}=i.${docId} AND d.created_at >= (NOW() - INTERVAL '90 days')
       LEFT JOIN product_categories c ON c.category_id=p.category_id
       WHERE p.tenant_id=:tenantId
       GROUP BY p.product_id, p.product_name, p.price, p.stock_quantity, p.sellable_stock, p.damaged_stock, p.scrap_stock, p.hsn_code, c.category_name`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const velocity30 = await db.query(
      `SELECT i.product_id, COALESCE(SUM(i.quantity),0) AS qty_30
       FROM ${items} i JOIN ${docs} d ON d.${docId}=i.${docId}
       WHERE i.tenant_id=:tenantId AND d.created_at >= (NOW() - INTERVAL '30 days')
       GROUP BY i.product_id`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const rets = await db.query(
      `SELECT sri.product_id, COALESCE(SUM(sri.quantity),0) AS returned
       FROM sales_return_items sri JOIN sales_returns sr ON sr.sales_return_id=sri.sales_return_id
       WHERE sri.tenant_id=:tenantId AND sr.created_at >= (NOW() - INTERVAL '90 days')
       GROUP BY sri.product_id`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const lastSale = await db.query(
      `SELECT i.product_id, MAX(d.created_at) AS last_sold_date
       FROM ${items} i JOIN ${docs} d ON d.${docId}=i.${docId}
       WHERE i.tenant_id=:tenantId
       GROUP BY i.product_id`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const v30Map      = {}; velocity30.forEach((r) => (v30Map[r.product_id]      = Number(r.qty_30)));
    const retMap      = {}; rets.forEach((r)       => (retMap[r.product_id]      = Number(r.returned)));
    const lastSaleMap = {}; lastSale.forEach((r)   => (lastSaleMap[r.product_id] = r.last_sold_date));

    const analytics = velocity90.map((p) => {
      const qty90          = Number(p.qty_sold_90);
      const qty30          = v30Map[p.product_id] || 0;
      const returned       = retMap[p.product_id] || 0;
      const netQty90       = Math.max(0, qty90 - returned);
      const dailyVelocity  = netQty90 / 90;
      const velocity30Daily = qty30 / 30;
      const velocityTrend  = dailyVelocity > 0 ? ((velocity30Daily - dailyVelocity) / dailyVelocity) * 100 : 0;
      const returnRate     = qty90 > 0 ? (returned / qty90) * 100 : 0;
      const avgSell        = Number(p.avg_selling_price) || Number(p.price);
      const costProxy      = Number(p.price) * 0.65;
      const estimatedMarginPct     = avgSell > 0 ? ((avgSell - costProxy) / avgSell) * 100 : 0;
      const estimatedMarginPerUnit = avgSell - costProxy;
      const totalEstimatedProfit   = netQty90 * estimatedMarginPerUnit;
      const lastSoldDate   = lastSaleMap[p.product_id];
      const daysSinceLastSale = lastSoldDate ? Math.floor((Date.now() - new Date(lastSoldDate).getTime()) / 86400000) : null;
      const stockValue     = Number(p.price) * (p.sellable_stock > 0 ? p.sellable_stock : p.stock_quantity);

      let moverClass = "no_movement";
      if (dailyVelocity > 3)      moverClass = "fast";
      else if (dailyVelocity > 1) moverClass = "medium";
      else if (dailyVelocity > 0) moverClass = "slow";

      const isDeadStock = (daysSinceLastSale === null || daysSinceLastSale > 90) && Number(p.stock_quantity) > 0;

      return {
        product_id: p.product_id, product_name: p.product_name, category: p.category_name,
        hsn_code: p.hsn_code, price: fmt2(p.price), avg_selling_price: fmt2(avgSell),
        stock_quantity: Number(p.stock_quantity), sellable_stock: Number(p.sellable_stock),
        damaged_stock: Number(p.damaged_stock), scrap_stock: Number(p.scrap_stock),
        stock_value: fmt2(stockValue), qty_sold_90: qty90, qty_sold_30: qty30,
        net_qty_sold: netQty90, returned_qty: returned, return_rate_pct: fmt2(returnRate),
        daily_velocity: fmt2(dailyVelocity), velocity_30d_daily: fmt2(velocity30Daily),
        velocity_trend_pct: fmt2(velocityTrend), orders_90: Number(p.orders_90),
        base_revenue_90: fmt2(p.base_revenue_90), gross_revenue_90: fmt2(p.gross_revenue_90),
        estimated_margin_pct: fmt2(estimatedMarginPct), estimated_profit_90: fmt2(totalEstimatedProfit),
        mover_class: moverClass, is_dead_stock: isDeadStock,
        last_sold_date: lastSoldDate || null, days_since_last_sale: daysSinceLastSale,
      };
    });

    analytics.sort((a, b) => b.gross_revenue_90 - a.gross_revenue_90);

    const deadStockItems        = analytics.filter((a) => a.is_dead_stock);
    const deadStockValue        = deadStockItems.reduce((s, a) => s + Number(a.stock_value), 0);
    const totalEstimatedProfit  = analytics.reduce((s, a) => s + Number(a.estimated_profit_90), 0);
    const fastMovers            = analytics.filter((a) => a.mover_class === "fast");
    const totalRevenue90        = analytics.reduce((s, a) => s + Number(a.gross_revenue_90), 0);

    res.json({
      summary: {
        total_products:       analytics.length,
        fast_movers:          fastMovers.length,
        medium_movers:        analytics.filter((a) => a.mover_class === "medium").length,
        slow_movers:          analytics.filter((a) => a.mover_class === "slow").length,
        dead_stock_items:     deadStockItems.length,
        dead_stock_value:     fmt2(deadStockValue),
        total_revenue_90d:    fmt2(totalRevenue90),
        estimated_profit_90d: fmt2(totalEstimatedProfit),
        avg_return_rate:      analytics.length > 0 ? fmt2(analytics.reduce((s, a) => s + Number(a.return_rate_pct), 0) / analytics.length) : 0,
      },
      dead_stock:     deadStockItems.sort((a, b) => Number(b.stock_value) - Number(a.stock_value)).slice(0, 20),
      top_by_revenue: analytics.slice(0, 15),
      top_by_profit:  [...analytics].sort((a, b) => b.estimated_profit_90 - a.estimated_profit_90).slice(0, 15),
      fast_movers:    fastMovers.slice(0, 10),
      all:            analytics,
    });
  } catch (err) {
    console.error("product-analytics:", err);
    res.status(500).json({ error: "Internal server error", detail: err.message });
  }
};

exports.getGstAnalytics = async (req, res) => {
  const tenantId = req.user.tenant_id;
  const year  = parseInt(req.query.year)  || new Date().getFullYear();
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;
  try {
    const sub = await getSubscriptionType(tenantId);
    const { docs, items, docId } = tableNames(sub);

    const slabData = await db.query(
      `SELECT
         i.gst_percentage,
         COUNT(DISTINCT d.${docId}) AS invoice_count,
         COALESCE(SUM(i.quantity),0) AS total_qty,
         COALESCE(SUM(i.base_amount),0) AS taxable_value,
         COALESCE(SUM(i.total_with_gst - i.base_amount),0) AS gst_amount,
         COALESCE(SUM(i.total_with_gst),0) AS total_with_gst
       FROM ${items} i JOIN ${docs} d ON d.${docId}=i.${docId}
       WHERE i.tenant_id=:tenantId
         AND EXTRACT(YEAR FROM d.created_at)=:year
         AND EXTRACT(MONTH FROM d.created_at)=:month
       GROUP BY i.gst_percentage ORDER BY i.gst_percentage`,
      { replacements: { tenantId, year, month }, type: Sequelize.QueryTypes.SELECT }
    );

    const monthlyGST = await db.query(
      `SELECT TO_CHAR(d.created_at,'YYYY-MM') AS month,
              COALESCE(SUM(d.gst_amount),0) AS total_gst,
              COALESCE(SUM(d.cgst_amount),0) AS cgst,
              COALESCE(SUM(d.sgst_amount),0) AS sgst,
              COALESCE(SUM(d.total_amount - d.gst_amount),0) AS taxable_value,
              COUNT(*) AS invoice_count
       FROM ${docs} AS d
       WHERE d.tenant_id=:tenantId AND d.created_at >= (NOW() - INTERVAL '12 months')
       GROUP BY month ORDER BY month`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const topGSTProducts = await db.query(
      `SELECT p.product_name, p.hsn_code, i.gst_percentage,
              COALESCE(SUM(i.total_with_gst - i.base_amount),0) AS gst_contributed,
              COALESCE(SUM(i.base_amount),0) AS taxable_value,
              COALESCE(SUM(i.quantity),0) AS qty
       FROM ${items} i JOIN ${docs} d ON d.${docId}=i.${docId}
       JOIN products p ON p.product_id=i.product_id
       WHERE i.tenant_id=:tenantId
         AND EXTRACT(YEAR FROM d.created_at)=:year
         AND EXTRACT(MONTH FROM d.created_at)=:month
       GROUP BY p.product_id, p.product_name, p.hsn_code, i.gst_percentage
       ORDER BY gst_contributed DESC LIMIT 15`,
      { replacements: { tenantId, year, month }, type: Sequelize.QueryTypes.SELECT }
    );

    let byDocType = [];
    if (sub !== "bill") {
      const docTypeRows = await db.query(
        `SELECT COALESCE(document_type::text, 'Tax Invoice') AS document_type,
                COUNT(*) AS count,
                COALESCE(SUM(gst_amount), 0) AS total_gst,
                COALESCE(SUM(total_amount), 0) AS total_value
         FROM invoices
         WHERE tenant_id=:tenantId
           AND EXTRACT(YEAR FROM created_at)=:year
           AND EXTRACT(MONTH FROM created_at)=:month
         GROUP BY document_type`,
        { replacements: { tenantId, year, month }, type: Sequelize.QueryTypes.SELECT }
      );
      byDocType = docTypeRows;
    }

    const totalTaxable = slabData.reduce((a, r) => a + Number(r.taxable_value), 0);
    const totalGST     = slabData.reduce((a, r) => a + Number(r.gst_amount), 0);

    res.json({
      period: { year, month },
      summary: {
        total_taxable_value:  fmt2(totalTaxable),
        total_gst_liability:  fmt2(totalGST),
        estimated_cgst:       fmt2(totalGST / 2),
        estimated_sgst:       fmt2(totalGST / 2),
        effective_gst_rate:   totalTaxable > 0 ? fmt2((totalGST / totalTaxable) * 100) : 0,
        total_invoices:       slabData.reduce((a, r) => a + Number(r.invoice_count), 0),
      },
      slab_breakdown: slabData.map((r) => ({
        gst_rate:       Number(r.gst_percentage),
        label:          `${r.gst_percentage}% GST`,
        invoice_count:  Number(r.invoice_count),
        total_qty:      Number(r.total_qty),
        taxable_value:  fmt2(r.taxable_value),
        gst_amount:     fmt2(r.gst_amount),
        cgst:           fmt2(Number(r.gst_amount) / 2),
        sgst:           fmt2(Number(r.gst_amount) / 2),
        total_with_gst: fmt2(r.total_with_gst),
        share_of_gst_pct: totalGST > 0 ? fmt2((Number(r.gst_amount) / totalGST) * 100) : 0,
      })),
      monthly_trend: monthlyGST.map((r) => ({
        month: r.month, total_gst: fmt2(r.total_gst), cgst: fmt2(r.cgst),
        sgst: fmt2(r.sgst), taxable_value: fmt2(r.taxable_value), invoice_count: Number(r.invoice_count),
      })),
      top_gst_products: topGSTProducts.map((r) => ({
        product_name: r.product_name, hsn_code: r.hsn_code, gst_rate: Number(r.gst_percentage),
        gst_contributed: fmt2(r.gst_contributed), taxable_value: fmt2(r.taxable_value), qty: Number(r.qty),
      })),
      by_document_type: byDocType,
    });
  } catch (err) {
    console.error("gst-analytics:", err);
    res.status(500).json({ error: "Internal server error", detail: err.message });
  }
};

exports.getCashFlow = async (req, res) => {
  const tenantId = req.user.tenant_id;
  const months   = Math.min(parseInt(req.query.months) || 6, 12);
  try {
    const sub = await getSubscriptionType(tenantId);
    const { docs } = tableNames(sub);

    const inflows = await db.query(
      `SELECT TO_CHAR(created_at,'YYYY-MM') AS month,
              COALESCE(SUM(CASE WHEN payment_status='Full Payment' THEN total_amount END),0) AS received_cash,
              COALESCE(SUM(CASE WHEN payment_status='Advance' THEN advance_amount END),0) AS advance_received,
              COALESCE(SUM(CASE WHEN payment_status='Advance' AND payment_completion_status='Pending' THEN total_amount-advance_amount END),0) AS receivable,
              COALESCE(SUM(CASE WHEN payment_status='Advance' AND payment_completion_status='Completed' THEN total_amount-advance_amount END),0) AS collected_dues,
              COUNT(*) AS total_invoices
       FROM ${docs} AS d WHERE d.tenant_id=:tenantId
         AND created_at >= CAST(TO_CHAR(NOW() - (:months * INTERVAL '1 month'), 'YYYY-MM-01') AS DATE)
       GROUP BY TO_CHAR(created_at,'YYYY-MM') ORDER BY month`,
      { replacements: { tenantId, months }, type: Sequelize.QueryTypes.SELECT }
    );

    const outflows = await db.query(
      `SELECT TO_CHAR(created_at,'YYYY-MM') AS month,
              COALESCE(SUM(total_amount),0) AS return_outflow
       FROM sales_returns WHERE tenant_id=:tenantId
         AND created_at >= CAST(TO_CHAR(NOW() - (:months * INTERVAL '1 month'), 'YYYY-MM-01') AS DATE)
       GROUP BY TO_CHAR(created_at,'YYYY-MM') ORDER BY month`,
      { replacements: { tenantId, months }, type: Sequelize.QueryTypes.SELECT }
    );

    const agingRows = await db.query(
      `SELECT
         SUM(CASE WHEN (CURRENT_DATE - created_at::date) <= 30 THEN total_amount-advance_amount END) AS aging_0_30,
         SUM(CASE WHEN (CURRENT_DATE - created_at::date) BETWEEN 31 AND 60 THEN total_amount-advance_amount END) AS aging_31_60,
         SUM(CASE WHEN (CURRENT_DATE - created_at::date) BETWEEN 61 AND 90 THEN total_amount-advance_amount END) AS aging_61_90,
         SUM(CASE WHEN (CURRENT_DATE - created_at::date) > 90 THEN total_amount-advance_amount END) AS aging_90_plus,
         COUNT(*) AS pending_count
       FROM ${docs} AS d WHERE d.tenant_id=:tenantId AND payment_status='Advance' AND payment_completion_status='Pending'`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const paymentTypeTrend = await db.query(
      `SELECT TO_CHAR(created_at,'YYYY-MM') AS month,
              payment_type::text AS payment_type,
              COUNT(*) AS count,
              COALESCE(SUM(total_amount),0) AS amount
       FROM ${docs} AS d WHERE d.tenant_id=:tenantId
         AND d.created_at >= CAST(TO_CHAR(NOW() - (:months * INTERVAL '1 month'), 'YYYY-MM-01') AS DATE)
       GROUP BY TO_CHAR(d.created_at,'YYYY-MM'), payment_type ORDER BY month`,
      { replacements: { tenantId, months }, type: Sequelize.QueryTypes.SELECT }
    );

    const outMap = {}; outflows.forEach((r) => (outMap[r.month] = Number(r.return_outflow)));

    const cashFlow = inflows.map((r) => {
      const totalIn  = Number(r.received_cash) + Number(r.advance_received) + Number(r.collected_dues);
      const totalOut = outMap[r.month] || 0;
      const net      = totalIn - totalOut;
      return {
        month: r.month, cash_inflow: fmt2(totalIn),
        received_cash: fmt2(r.received_cash), advance_received: fmt2(r.advance_received),
        collected_dues: fmt2(r.collected_dues), receivable: fmt2(r.receivable),
        return_outflow: fmt2(totalOut), net_cash_flow: fmt2(net),
        total_invoices: Number(r.total_invoices),
      };
    });

    const totalReceivable = cashFlow.reduce((a, b) => a + Number(b.receivable), 0);
    const agingData       = agingRows[0] || {};

    res.json({
      summary: {
        total_receivable:    fmt2(totalReceivable),
        aging_0_30:          fmt2(agingData.aging_0_30 || 0),
        aging_31_60:         fmt2(agingData.aging_31_60 || 0),
        aging_61_90:         fmt2(agingData.aging_61_90 || 0),
        aging_90_plus:       fmt2(agingData.aging_90_plus || 0),
        pending_invoices:    Number(agingData.pending_count || 0),
        avg_monthly_inflow:  cashFlow.length > 0 ? fmt2(cashFlow.reduce((a, b) => a + Number(b.cash_inflow), 0) / cashFlow.length) : 0,
      },
      monthly_cash_flow: cashFlow,
      payment_type_trend: paymentTypeTrend.map((r) => ({
        month: r.month, payment_type: r.payment_type, count: Number(r.count), amount: fmt2(r.amount),
      })),
    });
  } catch (err) {
    console.error("cash-flow:", err);
    res.status(500).json({ error: "Internal server error", detail: err.message });
  }
};

exports.getDiscountAnalysis = async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const sub = await getSubscriptionType(tenantId);
    const { docs, items, docId, isBoth } = tableNames(sub);

    let colNames = [];
    let itemColNames = [];

    if (isBoth) {
      // For both mode, we know the columns from the UNION
      colNames = ['discount_value', 'total_amount', 'payment_status', 'created_at', 'tenant_id'];
      itemColNames = ['total_with_gst', 'product_id', 'quantity'];
    } else {
      const cols = await db.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = :docs AND column_name IN (
           'discount_value','discount_amount','discount','discount_type','total_with_gst'
         )`,
        { replacements: { docs }, type: Sequelize.QueryTypes.SELECT }
      );
      colNames = cols.map((c) => c.column_name);

      const itemCols = await db.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = :items AND column_name IN (
           'total_with_gst','total_amount','gst_percentage','quantity'
         )`,
        { replacements: { items }, type: Sequelize.QueryTypes.SELECT }
      );
      itemColNames = itemCols.map((c) => c.column_name);
    }

    const discCol = colNames.includes("discount_value") ? "discount_value" : colNames.includes("discount_amount") ? "discount_amount" : colNames.includes("discount") ? "discount" : null;
    const hasDiscType = colNames.includes("discount_type");
    const itemTotalCol = itemColNames.includes("total_with_gst") ? "total_with_gst" : "total_amount";

    if (!discCol) {
      return res.json({
        summary: {
          discount_effectiveness: "no_data", avg_order_lift_pct: 0,
          discounted_avg_order: 0, non_discounted_avg_order: 0,
          total_discount_given_6m: "0", total_revenue_6m: "0",
          overall_discount_rate_pct: 0, discounted_invoice_share: 0,
          recommendation: "Discount data not available in your current table structure.",
        },
        monthly_trend: [], product_discounts: [], discount_types: [],
      });
    }

    const discountImpact = await db.query(
      `SELECT
         CASE WHEN COALESCE(${discCol}, 0) > 0 THEN 'discounted' ELSE 'no_discount' END AS type,
         COUNT(*) AS invoice_count,
         COALESCE(AVG(total_amount), 0) AS avg_order_value,
         COALESCE(SUM(total_amount), 0) AS total_revenue,
         COALESCE(AVG(COALESCE(${discCol}, 0)), 0) AS avg_discount_given
       FROM ${docs} AS d
       WHERE tenant_id = :tenantId AND created_at >= (NOW() - INTERVAL '6 months')
       GROUP BY (CASE WHEN COALESCE(${discCol}, 0) > 0 THEN 'discounted' ELSE 'no_discount' END)`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const discountTrend = await db.query(
      `SELECT
         TO_CHAR(d.created_at, 'YYYY-MM') AS month,
         COALESCE(SUM(COALESCE(d.${discCol}, 0)), 0) AS total_discount,
         COALESCE(SUM(total_amount), 0) AS total_revenue,
         COUNT(CASE WHEN COALESCE(d.${discCol}, 0) > 0 THEN 1 END) AS discounted_count,
         COUNT(*) AS total_count
       FROM ${docs} AS d
       WHERE d.tenant_id = :tenantId AND d.created_at >= (NOW() - INTERVAL '6 months')
       GROUP BY TO_CHAR(d.created_at, 'YYYY-MM') ORDER BY month ASC`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const productDiscount = await db.query(
      `SELECT
         p.product_id, p.product_name,
         COUNT(DISTINCT d.${docId}) AS times_sold,
         COALESCE(SUM(i.quantity), 0) AS total_qty,
         COALESCE(AVG(COALESCE(d.${discCol}, 0)), 0) AS avg_discount,
         COALESCE(SUM(COALESCE(d.${discCol}, 0)), 0) AS total_discount_given,
         COALESCE(SUM(i.${itemTotalCol}), 0) AS total_revenue
       FROM ${items} i
       JOIN ${docs} d ON d.${docId} = i.${docId}
       JOIN products p ON p.product_id = i.product_id
       WHERE i.tenant_id = :tenantId
         AND d.created_at >= (NOW() - INTERVAL '3 months')
         AND COALESCE(d.${discCol}, 0) > 0
       GROUP BY p.product_id, p.product_name
       ORDER BY total_discount_given DESC LIMIT 15`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    let discountTypes = [];
    if (hasDiscType) {
      const dtRows = await db.query(
        `SELECT
           COALESCE(discount_type::text, 'flat') AS discount_type,
           COUNT(*) AS count,
           COALESCE(SUM(COALESCE(${discCol}, 0)), 0) AS total_discount,
           COALESCE(AVG(total_amount), 0) AS avg_order
         FROM ${docs}
         WHERE tenant_id = :tenantId
           AND COALESCE(${discCol}, 0) > 0
           AND created_at >= (NOW() - INTERVAL '6 months')
         GROUP BY discount_type`,
        { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
      );
      discountTypes = dtRows.map((r) => ({
        discount_type: r.discount_type, count: Number(r.count),
        total_discount: fmt2(r.total_discount), avg_order: fmt2(r.avg_order),
      }));
    }

    const discounted    = discountImpact.find((r) => r.type === "discounted");
    const nonDiscounted = discountImpact.find((r) => r.type === "no_discount");

    const discountLift = discounted && nonDiscounted && Number(nonDiscounted.avg_order_value) > 0
      ? fmt2(((Number(discounted.avg_order_value) - Number(nonDiscounted.avg_order_value)) / Number(nonDiscounted.avg_order_value)) * 100)
      : 0;

    const totalDiscount6m = discountTrend.reduce((a, r) => a + Number(r.total_discount), 0);
    const totalRevenue6m  = discountTrend.reduce((a, r) => a + Number(r.total_revenue), 0);

    res.json({
      summary: {
        discount_effectiveness:       Number(discountLift) > 0 ? "positive" : "negative",
        avg_order_lift_pct:           discountLift,
        discounted_avg_order:         discounted ? fmt2(discounted.avg_order_value) : 0,
        non_discounted_avg_order:     nonDiscounted ? fmt2(nonDiscounted.avg_order_value) : 0,
        total_discount_given_6m:      fmt2(totalDiscount6m),
        total_revenue_6m:             fmt2(totalRevenue6m),
        overall_discount_rate_pct:    totalRevenue6m > 0 ? fmt2((totalDiscount6m / totalRevenue6m) * 100) : 0,
        discounted_invoice_share:     discounted && nonDiscounted
          ? fmt2((Number(discounted.invoice_count) / (Number(discounted.invoice_count) + Number(nonDiscounted.invoice_count))) * 100) : 0,
        recommendation: Number(discountLift) > 5 ? "Discounts are generating higher order values. Strategy is working."
          : Number(discountLift) > 0 ? "Mild positive lift from discounts. Consider targeted offers."
          : "Discounts not translating to higher order values. Review strategy.",
      },
      monthly_trend: discountTrend.map((r) => ({
        month: r.month, total_discount: fmt2(r.total_discount), total_revenue: fmt2(r.total_revenue),
        discount_rate_pct: Number(r.total_revenue) > 0 ? fmt2((Number(r.total_discount) / Number(r.total_revenue)) * 100) : 0,
        discounted_count: Number(r.discounted_count), total_count: Number(r.total_count),
        discount_adoption_pct: Number(r.total_count) > 0 ? fmt2((Number(r.discounted_count) / Number(r.total_count)) * 100) : 0,
      })),
      product_discounts: productDiscount.map((r) => ({
        product_name: r.product_name, times_sold: Number(r.times_sold), total_qty: Number(r.total_qty),
        avg_discount: fmt2(r.avg_discount), total_discount_given: fmt2(r.total_discount_given),
        total_revenue: fmt2(r.total_revenue),
        discount_to_revenue_pct: Number(r.total_revenue) > 0 ? fmt2((Number(r.total_discount_given) / Number(r.total_revenue)) * 100) : 0,
      })),
      discount_types: discountTypes,
      detected_discount_column: discCol,
    });
  } catch (err) {
    console.error("discount-analysis ERROR:", err);
    res.status(500).json({ error: "Internal server error", detail: err.message });
  }
};

exports.getSeasonalTrends = async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const sub = await getSubscriptionType(tenantId);
    const { docs, items, docId } = tableNames(sub);

    const monthlyAgg = await db.query(
      `SELECT EXTRACT(MONTH FROM created_at) AS month_num, trim(to_char(created_at, 'Month')) AS month_name,
              COUNT(*) AS total_docs, COALESCE(AVG(total_amount),0) AS avg_revenue,
              COALESCE(SUM(total_amount),0) AS total_revenue
       FROM ${docs} AS d WHERE d.tenant_id=:tenantId
       GROUP BY month_num, trim(to_char(created_at, 'Month')) ORDER BY month_num`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const dowAgg = await db.query(
      `SELECT EXTRACT(DOW FROM created_at) + 1 AS dow_num, trim(to_char(created_at, 'Day')) AS dow_name,
              COUNT(*) AS total_docs, COALESCE(AVG(total_amount),0) AS avg_revenue,
              COALESCE(SUM(total_amount),0) AS total_revenue
       FROM ${docs} AS d WHERE d.tenant_id=:tenantId
       GROUP BY dow_num, trim(to_char(created_at, 'Day')) ORDER BY dow_num`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const hourAgg = await db.query(
      `SELECT EXTRACT(HOUR FROM d.created_at) AS hour_num,
              COUNT(*) AS total_docs, COALESCE(AVG(total_amount),0) AS avg_revenue
       FROM ${docs} AS d WHERE d.tenant_id=:tenantId
       GROUP BY hour_num ORDER BY hour_num`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const catTrend = await db.query(
      `SELECT TO_CHAR(d.created_at,'YYYY-MM') AS month,
              c.category_name,
              COALESCE(SUM(i.total_with_gst),0) AS revenue
       FROM ${items} i JOIN ${docs} d ON d.${docId}=i.${docId}
       JOIN products p ON p.product_id=i.product_id
       JOIN product_categories c ON c.category_id=p.category_id
       WHERE i.tenant_id=:tenantId AND d.created_at >= (NOW() - INTERVAL '12 months')
       GROUP BY TO_CHAR(d.created_at,'YYYY-MM'), c.category_name, c.category_id
       ORDER BY month`,
      { replacements: { tenantId }, type: Sequelize.QueryTypes.SELECT }
    );

    const avgMonthly = monthlyAgg.length > 0 ? monthlyAgg.reduce((a, r) => a + Number(r.avg_revenue), 0) / monthlyAgg.length : 0;

    const monthlyWithIndex = monthlyAgg.map((r) => ({
      month_num:         Number(r.month_num),
      month_name:        r.month_name,
      total_docs:        Number(r.total_docs),
      avg_revenue:       fmt2(r.avg_revenue),
      total_revenue:     fmt2(r.total_revenue),
      seasonality_index: avgMonthly > 0 ? fmt2((Number(r.avg_revenue) / avgMonthly) * 100) : 100,
      is_peak: avgMonthly > 0 && Number(r.avg_revenue) > avgMonthly * 1.15,
      is_slow: avgMonthly > 0 && Number(r.avg_revenue) < avgMonthly * 0.85,
    }));

    const peakMonths = monthlyWithIndex.filter((m) => m.is_peak).map((m) => m.month_name);
    const slowMonths = monthlyWithIndex.filter((m) => m.is_slow).map((m) => m.month_name);

    const avgDow  = dowAgg.length > 0 ? dowAgg.reduce((a, r) => a + Number(r.avg_revenue), 0) / dowAgg.length : 0;
    const bestDay = dowAgg.reduce((best, r) => Number(r.avg_revenue) > Number(best.avg_revenue || 0) ? r : best, {});
    const worstDay = dowAgg.reduce((worst, r) => Number(r.avg_revenue) < Number(worst.avg_revenue || Infinity) ? r : worst, { avg_revenue: Infinity });

    res.json({
      summary: {
        peak_months:         peakMonths,
        slow_months:         slowMonths,
        best_day_of_week:    bestDay.dow_name || null,
        worst_day_of_week:   worstDay.dow_name || null,
        recommendation: peakMonths.length > 0
          ? "Peak season: " + peakMonths.join(", ") + ". Stock up and run promotions. " + (slowMonths.length > 0 ? "Slow months: " + slowMonths.join(", ") + " — consider clearance sales." : "")
          : "Not enough data yet to determine seasonal patterns.",
      },
      monthly_seasonality: monthlyWithIndex,
      day_of_week_pattern: dowAgg.map((r) => ({
        dow_num: Number(r.dow_num), dow_name: r.dow_name, total_docs: Number(r.total_docs),
        avg_revenue: fmt2(r.avg_revenue), total_revenue: fmt2(r.total_revenue),
        index: avgDow > 0 ? fmt2((Number(r.avg_revenue) / avgDow) * 100) : 100,
      })),
      hourly_pattern: hourAgg.map((r) => ({
        hour: Number(r.hour_num), label: r.hour_num + ":00",
        total_docs: Number(r.total_docs), avg_revenue: fmt2(r.avg_revenue),
      })),
      category_monthly_trend: catTrend.map((r) => ({
        month: r.month, category: r.category_name, revenue: fmt2(r.revenue),
      })),
    });
  } catch (err) {
    console.error("seasonal-trends:", err);
    res.status(500).json({ error: "Internal server error", detail: err.message });
  }
};