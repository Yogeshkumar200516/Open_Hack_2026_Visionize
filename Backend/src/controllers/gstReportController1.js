const { Sequelize, Op } = require("sequelize");
const {
  company_info,
  bills,
  bill_items,
  invoices,
  invoice_items,
  products,
  product_categories,
  users,
  stock_movements,
  customers,
  billing_address,
  sales_returns,
  sales_return_items,
  purchase_returns,
  purchase_return_items,
  return_stock_verification
} = require("../models");
const db = company_info.sequelize;

// ─── Subscription Type Cache (5-minute TTL per tenant) ────────────────────────
// Prevents double DB hit: every request was calling getSubscriptionType() which
// fires an extra SELECT on company_info before the actual query runs.
const _subTypeCache = new Map(); // key: tenant_id, value: { type, expiresAt }

async function getSubscriptionType(tenant_id) {
  const now = Date.now();
  const cached = _subTypeCache.get(tenant_id);
  if (cached && cached.expiresAt > now) return cached.type;

  const company = await company_info.findOne({
    where: { id: tenant_id },
    attributes: ["subscription_type"]
  });
  const type = company?.subscription_type || "invoice";
  _subTypeCache.set(tenant_id, { type, expiresAt: now + 5 * 60 * 1000 }); // 5 min TTL
  return type;
}

// ─── PostgreSQL date filter helpers ──────────────────────────────────────────
// NOTE: All previous SQL used MySQL functions (YEAR, MONTH, DATE_FORMAT, WEEK,
// QUARTER) which DO NOT EXIST in PostgreSQL. These helpers build the correct
// PostgreSQL WHERE clauses using EXTRACT() instead.

function pgYearFilter(col, year) {
  return year ? `AND EXTRACT(YEAR FROM ${col}) = CAST(:year AS INTEGER)` : "";
}
function pgMonthFilter(col, month) {
  return month ? `AND EXTRACT(MONTH FROM ${col}) = CAST(:month AS INTEGER)` : "";
}
function pgWeekFilter(col, week) {
  return week ? `AND EXTRACT(WEEK FROM ${col}) = CAST(:week AS INTEGER)` : "";
}
function pgQuarterFilter(col, quarter) {
  return quarter ? `AND EXTRACT(QUARTER FROM ${col}) = CAST(:quarter AS INTEGER)` : "";
}
function pgDateFilter(col, dateFilter) {
  if (dateFilter === "today") {
    return `AND ${col}::date = CURRENT_DATE`;
  }
  if (dateFilter === "yesterday") {
    return `AND ${col}::date = CURRENT_DATE - INTERVAL '1 day'`;
  }
  return "";
}
// Converts a timestamp/date column to 'YYYY-MM' format (PostgreSQL)
function pgMonthGroup(col) {
  return `TO_CHAR(${col}, 'YYYY-MM')`;
}

function tableNames(subType) {
  const isBill = subType === "bill";
  const isBoth = subType === "both";
  
  if (isBoth) {
    return {
      docs: `(
        SELECT bill_id AS id, bill_number, created_at, tenant_id, gst_amount, cgst_amount, sgst_amount, total_amount, discount_value, transport_charge, created_by, 'bill' AS type FROM bills
        UNION ALL
        SELECT invoice_id AS id, invoice_number AS bill_number, created_at, tenant_id, gst_amount, cgst_amount, sgst_amount, total_amount, discount_value, transport_charge, created_by, 'invoice' AS type FROM invoices
      )`,
      items: `(
        SELECT product_id, quantity, bill_id AS id, tenant_id, rate, gst_percentage, base_amount, total_with_gst FROM bill_items
        UNION ALL
        SELECT product_id, quantity, invoice_id AS id, tenant_id, rate, gst_percentage, base_amount, total_with_gst FROM invoice_items
      )`,
      docId: "id",
      isBoth: true
    };
  }

  return {
    docs: isBill ? "bills" : "invoices",
    items: isBill ? "bill_items" : "invoice_items",
    docId: isBill ? "bill_id" : "invoice_id",
    isBoth: false
  };
}

// ─── 1. Summary Stats ─────────────────────────────────────────────────────────
exports.getSummary = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const sub = await getSubscriptionType(tenant_id);
    const { year, month, week, quarter, date_filter } = req.query;
    const { docs, items, docId } = tableNames(sub);

    const query = `
      SELECT
        COUNT(DISTINCT d.${docId})              AS total_docs,
        COALESCE(SUM(d.total_amount),0)        AS total_sales,
        COALESCE(SUM(d.gst_amount),0)          AS total_gst,
        COALESCE(SUM(d.cgst_amount),0)         AS total_cgst,
        COALESCE(SUM(d.sgst_amount),0)         AS total_sgst,
        COALESCE(SUM(d.discount_value),0)      AS total_discount,
        COALESCE(SUM(d.transport_charge),0)    AS total_transport,
        COALESCE(AVG(d.total_amount),0)        AS avg_doc_value,
        (SELECT COALESCE(SUM(i.quantity),0) FROM ${items} i WHERE i.id IN (SELECT ${docId} FROM ${docs} d2 WHERE d2.tenant_id = d.tenant_id ${pgYearFilter("d2.created_at", year)} ${pgMonthFilter("d2.created_at", month)} ${pgWeekFilter("d2.created_at", week)} ${pgQuarterFilter("d2.created_at", quarter)} ${pgDateFilter("d2.created_at", date_filter)})) AS total_quantity_sold,
        (SELECT COUNT(DISTINCT i.product_id) FROM ${items} i WHERE i.id IN (SELECT ${docId} FROM ${docs} d2 WHERE d2.tenant_id = d.tenant_id ${pgYearFilter("d2.created_at", year)} ${pgMonthFilter("d2.created_at", month)} ${pgWeekFilter("d2.created_at", week)} ${pgQuarterFilter("d2.created_at", quarter)} ${pgDateFilter("d2.created_at", date_filter)})) AS total_products_sold
      FROM ${docs} d
      WHERE d.tenant_id = CAST(:tenant_id AS INTEGER)
      ${pgYearFilter("d.created_at", year)}
      ${pgMonthFilter("d.created_at", month)}
      ${pgWeekFilter("d.created_at", week)}
      ${pgQuarterFilter("d.created_at", quarter)}
      ${pgDateFilter("d.created_at", date_filter)}
      GROUP BY d.tenant_id
    `;

    const [row] = await db.query(query, {
      replacements: { tenant_id, year, month, week, quarter, date_filter },
      type: Sequelize.QueryTypes.SELECT
    });

    const result = row || {
      total_docs: 0, total_sales: 0, total_gst: 0, total_cgst: 0, total_sgst: 0,
      total_discount: 0, total_transport: 0, total_quantity_sold: 0, total_products_sold: 0, avg_doc_value: 0
    };

    // Normalize keys for frontend
    if (sub === "bill") {
      result.total_bills = result.total_docs;
      result.avg_bill_value = result.avg_doc_value;
    } else {
      result.total_invoices = result.total_docs;
      result.avg_invoice_value = result.avg_doc_value;
    }
    result.subscription_type = sub;

    res.json(result);
  } catch (err) {
    console.error("Error fetching summary:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ─── 2. Monthly Trend ─────────────────────────────────────────────────────────
exports.getMonthlyTrend = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const sub = await getSubscriptionType(tenant_id);
    const { docs } = tableNames(sub);
    const { year } = req.query;

    const query = `
      SELECT ${pgMonthGroup("d.created_at")} AS month,
        COUNT(*)                                 AS total_invoices,
        COALESCE(SUM(d.total_amount),0)        AS total_sales,
        COALESCE(SUM(d.gst_amount),0)          AS total_gst,
        COALESCE(SUM(d.cgst_amount),0)         AS total_cgst,
        COALESCE(SUM(d.sgst_amount),0)         AS total_sgst,
        COALESCE(AVG(d.total_amount),0)        AS avg_gst_per_invoice
      FROM ${docs} d
      WHERE d.tenant_id = CAST(:tenant_id AS INTEGER)
      ${pgYearFilter("d.created_at", year)}
      GROUP BY ${pgMonthGroup("d.created_at")}
      ORDER BY month
    `;

    const rows = await db.query(query, {
      replacements: { tenant_id, year },
      type: Sequelize.QueryTypes.SELECT
    });

    res.json(rows);
  } catch (err) {
    console.error("Error fetching monthly trends:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

// ─── 3. Top Products ──────────────────────────────────────────────────────────
exports.getTopProducts = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const sub = await getSubscriptionType(tenant_id);
    const { docs, items, docId } = tableNames(sub);
    const { year, month } = req.query;

    const query = `
      SELECT p.product_id, p.product_name, p.hsn_code, c.category_name,
        COALESCE(SUM(ti.quantity),0)                          AS total_quantity,
        COALESCE(SUM(ti.base_amount),0)                       AS total_sales,
        COALESCE(SUM(ti.total_with_gst-ti.base_amount),0)     AS gst_collected,
        COALESCE(AVG(ti.gst_percentage),0)                    AS avg_gst_rate,
        COALESCE(SUM(d.discount_value),0) / COUNT(DISTINCT ti.product_id) AS total_discount_given
      FROM ${items} ti
      JOIN products p ON p.product_id=ti.product_id AND p.tenant_id=:tenant_id
      LEFT JOIN product_categories c ON c.category_id=p.category_id
      JOIN ${docs} d ON d.${docId}=ti.id
      WHERE d.tenant_id = CAST(:tenant_id AS INTEGER)
      ${pgYearFilter("d.created_at", year)}
      ${pgMonthFilter("d.created_at", month)}
      GROUP BY ti.product_id, p.product_id, p.product_name, p.hsn_code, c.category_name
      ORDER BY gst_collected DESC
    `;

    const rows = await db.query(query, {
      replacements: { tenant_id, year, month },
      type: Sequelize.QueryTypes.SELECT
    });

    res.json(rows);
  } catch (err) {
    console.error("Error fetching top products:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

// ─── 4. GST by User ───────────────────────────────────────────────────────────
exports.getGstByUser = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const sub = await getSubscriptionType(tenant_id);
    const { docs, docId } = tableNames(sub);
    const { year, month } = req.query;

    const query = `
      SELECT u.first_name, u.last_name, u.role,
        COUNT(d.${docId})              AS total_invoices,
        COALESCE(SUM(d.gst_amount),0)   AS total_gst_collected,
        COALESCE(SUM(d.total_amount),0) AS total_sales,
        COALESCE(AVG(d.gst_amount),0)   AS avg_gst_per_invoice
      FROM ${docs} d
      JOIN users u ON u.user_id=d.created_by AND u.tenant_id=:tenant_id
      WHERE d.tenant_id = CAST(:tenant_id AS INTEGER)
      ${pgYearFilter("d.created_at", year)}
      ${pgMonthFilter("d.created_at", month)}
      GROUP BY d.created_by, u.first_name, u.last_name, u.role
      ORDER BY total_gst_collected DESC
    `;

    const rows = await db.query(query, {
      replacements: { tenant_id, year, month },
      type: Sequelize.QueryTypes.SELECT
    });

    res.json(rows);
  } catch (err) {
    console.error("Error fetching GST by user:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

// ─── 5. Stock Movements ───────────────────────────────────────────────────────
exports.getStockMovements = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const { year, month } = req.query;
    const query = `
      SELECT sm.movement_id, p.product_name, sm.change_type,
        sm.quantity_changed, sm.old_stock, sm.new_stock,
        sm.stock_type, sm.reason, sm.reference_type,
        u.user_id AS updated_by_id, u.first_name AS updated_by_name, sm.created_at
      FROM stock_movements sm
      JOIN products p ON p.product_id=sm.product_id
      LEFT JOIN users u ON u.user_id = CASE 
        WHEN sm.updated_by ~ '^[0-9]+$' THEN sm.updated_by::INTEGER 
        ELSE NULL 
      END
      WHERE sm.tenant_id = CAST(:tenant_id AS INTEGER)
      ${pgYearFilter("sm.created_at", year)}
      ${pgMonthFilter("sm.created_at", month)}
      ORDER BY sm.created_at DESC
    `;
    const rows = await stock_movements.sequelize.query(query, {
      replacements: { tenant_id, year, month },
      type: Sequelize.QueryTypes.SELECT
    });
    res.json(rows);
  } catch (err) {
    console.error("Error fetching stock movements — DETAIL:", err.original || err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

// ─── 6. High GST Invoices ─────────────────────────────────────────────────────
exports.getHighGstInvoices = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const subscriptionType = await getSubscriptionType(tenant_id);
    const model = subscriptionType === "bill" ? bills : invoices;
    const { year, month } = req.query;

    const query = subscriptionType === "bill" ? `
        SELECT tbl.bill_number AS invoice_number, tbl.bill_date AS invoice_date,
          tbl.customer_name, tbl.gst_amount, tbl.total_amount
        FROM bills tbl
        WHERE tbl.tenant_id = CAST(:tenant_id AS INTEGER) AND tbl.gst_amount > 0
        ${pgYearFilter("tbl.created_at", year)}
        ${pgMonthFilter("tbl.created_at", month)}
        ORDER BY tbl.gst_amount DESC
      ` : `
        SELECT tbl.invoice_number, tbl.invoice_date,
          c.name AS customer_name, tbl.gst_amount, tbl.total_amount
        FROM invoices tbl
        LEFT JOIN customers c ON c.customer_id=tbl.customer_id
        WHERE tbl.tenant_id = CAST(:tenant_id AS INTEGER) AND tbl.gst_amount > 0
        ${pgYearFilter("tbl.created_at", year)}
        ${pgMonthFilter("tbl.created_at", month)}
        ORDER BY tbl.gst_amount DESC
      `;

    const rows = await model.sequelize.query(query, {
      replacements: { tenant_id, year, month },
      type: Sequelize.QueryTypes.SELECT
    });

    res.json(rows);
  } catch (err) {
    console.error("Error fetching high gst invoices:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

// ─── 7. Discounts by Product ──────────────────────────────────────────────────
exports.getDiscountsByProduct = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const subscriptionType = await getSubscriptionType(tenant_id);
    const model      = subscriptionType === "bill" ? bills : invoices;
    const itemTable  = subscriptionType === "bill" ? "bill_items"  : "invoice_items";
    const refCol     = subscriptionType === "bill" ? "bill_id"     : "invoice_id";
    const itemIdCol  = subscriptionType === "bill" ? "bill_item_id": "item_id";
    const tblName    = subscriptionType === "bill" ? "bills"       : "invoices";
    const { year, month } = req.query;

    const query = `
      SELECT p.product_name, COUNT(ti.${itemIdCol}) AS times_sold,
        ROUND(CAST(AVG(tbl.discount_value) AS NUMERIC),2)  AS avg_discount,
        ROUND(CAST(SUM(tbl.discount_value) AS NUMERIC),2)  AS total_discount_amount,
        MIN(tbl.discount_value)           AS min_discount,
        MAX(tbl.discount_value)           AS max_discount
      FROM ${itemTable} ti
      JOIN ${tblName} tbl ON tbl.${refCol}=ti.${refCol}
      JOIN products p ON p.product_id=ti.product_id AND p.tenant_id=:tenant_id
      WHERE tbl.tenant_id = CAST(:tenant_id AS INTEGER)
      ${pgYearFilter("tbl.created_at", year)}
      ${pgMonthFilter("tbl.created_at", month)}
      GROUP BY p.product_name
      ORDER BY avg_discount DESC
    `;

    const rows = await model.sequelize.query(query, {
      replacements: { tenant_id, year, month },
      type: Sequelize.QueryTypes.SELECT
    });

    res.json(rows);
  } catch (err) {
    console.error("Error fetching discounts by product:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

// ─── 8. Category Sales ────────────────────────────────────────────────────────
exports.getCategorySales = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const subscriptionType = await getSubscriptionType(tenant_id);
    const model      = subscriptionType === "bill" ? bills : invoices;
    const itemTable  = subscriptionType === "bill" ? "bill_items"  : "invoice_items";
    const refCol     = subscriptionType === "bill" ? "bill_id"     : "invoice_id";
    const tblName    = subscriptionType === "bill" ? "bills"       : "invoices";
    const { year, month } = req.query;

    const query = `
      SELECT c.category_name,
        COUNT(DISTINCT ti.product_id)                       AS products_in_category,
        COALESCE(SUM(ti.quantity),0)                        AS total_quantity_sold,
        COALESCE(SUM(ti.base_amount),0)                     AS total_sales,
        COALESCE(SUM(ti.total_with_gst-ti.base_amount),0)   AS total_gst_collected,
        COALESCE(AVG(ti.gst_percentage),0)                  AS avg_gst_rate,
        ROUND(CAST(AVG(tbl.discount_value) AS NUMERIC),2)   AS avg_discount
      FROM ${itemTable} ti
      JOIN products p ON p.product_id=ti.product_id AND p.tenant_id=:tenant_id
      JOIN product_categories c ON c.category_id=p.category_id
      JOIN ${tblName} tbl ON tbl.${refCol}=ti.${refCol}
      WHERE tbl.tenant_id = CAST(:tenant_id AS INTEGER)
      ${pgYearFilter("tbl.created_at", year)}
      ${pgMonthFilter("tbl.created_at", month)}
      GROUP BY c.category_name
      ORDER BY total_sales DESC
    `;

    const rows = await model.sequelize.query(query, {
      replacements: { tenant_id, year, month },
      type: Sequelize.QueryTypes.SELECT
    });

    res.json(rows);
  } catch (err) {
    console.error("Error fetching category sales:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
};

// ─── 9. Advance Invoices/Bills ────────────────────────────────────────────────
exports.getAdvanceInvoices = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { status, year, month } = req.query;
  try {
    const subscriptionType = await getSubscriptionType(tenant_id);
    const model = subscriptionType === "bill" ? bills : invoices;

    let sql;
    if (subscriptionType === "bill") {
      sql = `
        SELECT tbl.bill_id, tbl.bill_number, tbl.bill_date,
          tbl.total_amount, tbl.advance_amount,
          (tbl.total_amount - tbl.advance_amount) AS due_amount,
          tbl.due_date, tbl.payment_completion_status, tbl.payment_settlement_date,
          tbl.customer_name, tbl.mobile_no AS customer_mobile
        FROM bills tbl
        WHERE tbl.tenant_id = CAST(:tenant_id AS INTEGER) AND tbl.payment_status = 'Advance'
      `;
    } else {
      sql = `
        SELECT tbl.invoice_id, tbl.invoice_number, tbl.invoice_date,
          tbl.total_amount, tbl.advance_amount,
          (tbl.total_amount - tbl.advance_amount) AS due_amount,
          tbl.due_date, tbl.payment_completion_status, tbl.payment_settlement_date,
          c.name AS customer_name, c.mobile AS customer_mobile
        FROM invoices tbl
        LEFT JOIN customers c ON tbl.customer_id=c.customer_id
        WHERE tbl.tenant_id = CAST(:tenant_id AS INTEGER) AND tbl.payment_status = 'Advance'
      `;
    }

    if (year)  sql += ` ${pgYearFilter("tbl.created_at", year).replace("AND ", "AND ")}`;
    if (month) sql += ` ${pgMonthFilter("tbl.created_at", month).replace("AND ", "AND ")}`;

    if (status === "pending")   sql += " AND tbl.payment_completion_status = 'Pending'";
    if (status === "completed") sql += " AND tbl.payment_completion_status = 'Completed'";

    sql += subscriptionType === "bill" ? " ORDER BY tbl.bill_date DESC" : " ORDER BY tbl.invoice_date DESC";

    const rows = await model.sequelize.query(sql, {
      replacements: { tenant_id, year, month },
      type: Sequelize.QueryTypes.SELECT
    });

    res.json(rows);
  } catch (err) {
    console.error("Error fetching advance invoices:", err);
    res.status(500).json({ error: "Failed to fetch advance invoices", message: err.message });
  }
};

// ─── 10. Sales Returns Summary ────────────────────────────────────────────────
exports.getSalesReturnsSummary = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const { year, month, date_filter } = req.query;
    const query = `
      SELECT
        COUNT(DISTINCT sr.sales_return_id)  AS total_returns,
        COALESCE(SUM(sr.total_amount),0)    AS total_return_value,
        COALESCE(SUM(sr.gst_amount),0)      AS total_return_gst,
        COALESCE(AVG(sr.total_amount),0)    AS avg_return_value,
        COUNT(DISTINCT CASE WHEN sri.verification_status='pending'
              THEN sr.sales_return_id END)  AS pending_count,
        COUNT(DISTINCT CASE WHEN sri.verification_status='verified'
              THEN sr.sales_return_id END)  AS verified_count
      FROM sales_returns sr
      LEFT JOIN sales_return_items sri ON sri.sales_return_id=sr.sales_return_id
      WHERE sr.tenant_id = CAST(:tenant_id AS INTEGER)
      ${pgYearFilter("sr.created_at", year)}
      ${pgMonthFilter("sr.created_at", month)}
      ${pgDateFilter("sr.created_at", date_filter)}
    `;
    const rows = await sales_returns.sequelize.query(query, {
      replacements: { tenant_id, year, month, date_filter },
      type: Sequelize.QueryTypes.SELECT
    });
    res.json(rows[0] || {});
  } catch (err) {
    console.error("Error fetching sales return summary:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
};

// ─── 11. Sales Returns Monthly Trend ─────────────────────────────────────────
exports.getSalesReturnsMonthlyTrend = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const { year } = req.query;
    const query = `
      SELECT
        ${pgMonthGroup("sr.created_at")} AS month,
        COUNT(*)                           AS total_returns,
        COALESCE(SUM(sr.total_amount),0)   AS total_return_value,
        COALESCE(SUM(sr.gst_amount),0)     AS total_return_gst
      FROM sales_returns sr
      WHERE sr.tenant_id = CAST(:tenant_id AS INTEGER)
      ${pgYearFilter("sr.created_at", year)}
      GROUP BY ${pgMonthGroup("sr.created_at")}
      ORDER BY month
    `;
    const rows = await sales_returns.sequelize.query(query, {
      replacements: { tenant_id, year },
      type: Sequelize.QueryTypes.SELECT
    });
    res.json(rows);
  } catch (err) {
    console.error("Error fetching sales return monthly:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
};

// ─── 12. Purchase Returns Summary ────────────────────────────────────────────
exports.getPurchaseReturnsSummary = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const { year, month, date_filter } = req.query;
    const query = `
      SELECT
        COUNT(DISTINCT pr.purchase_return_id) AS total_returns,
        COALESCE(SUM(pr.total_amount),0)      AS total_return_value,
        COALESCE(SUM(pr.gst_amount),0)        AS total_return_gst,
        COALESCE(AVG(pr.total_amount),0)      AS avg_return_value,
        COUNT(DISTINCT CASE WHEN pri.verification_status='pending'
              THEN pr.purchase_return_id END) AS pending_count,
        COUNT(DISTINCT CASE WHEN pri.verification_status='verified'
              THEN pr.purchase_return_id END) AS verified_count
      FROM purchase_returns pr
      LEFT JOIN purchase_return_items pri ON pri.purchase_return_id=pr.purchase_return_id
      WHERE pr.tenant_id = CAST(:tenant_id AS INTEGER)
      ${pgYearFilter("pr.created_at", year)}
      ${pgMonthFilter("pr.created_at", month)}
      ${pgDateFilter("pr.created_at", date_filter)}
    `;
    const rows = await purchase_returns.sequelize.query(query, {
      replacements: { tenant_id, year, month, date_filter },
      type: Sequelize.QueryTypes.SELECT
    });
    res.json(rows[0] || {});
  } catch (err) {
    console.error("Error fetching purchase returns summary:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
};

// ─── 13. Purchase Returns Monthly Trend ──────────────────────────────────────
exports.getPurchaseReturnsMonthlyTrend = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const { year } = req.query;
    const query = `
      SELECT
        ${pgMonthGroup("pr.created_at")} AS month,
        COUNT(*)                           AS total_returns,
        COALESCE(SUM(pr.total_amount),0)   AS total_return_value,
        COALESCE(SUM(pr.gst_amount),0)     AS total_return_gst
      FROM purchase_returns pr
      WHERE pr.tenant_id = CAST(:tenant_id AS INTEGER)
      ${pgYearFilter("pr.created_at", year)}
      GROUP BY ${pgMonthGroup("pr.created_at")}
      ORDER BY month
    `;
    const rows = await purchase_returns.sequelize.query(query, {
      replacements: { tenant_id, year },
      type: Sequelize.QueryTypes.SELECT
    });
    res.json(rows);
  } catch (err) {
    console.error("Error fetching purchase returns monthly:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
};

// ─── 14. Return Stock Verification Summary ────────────────────────────────────
exports.getReturnStockSummary = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const { year, month } = req.query;
    const query = `
      SELECT
        COUNT(*)                                       AS total_verifications,
        COALESCE(SUM(rsv.returned_quantity),0)         AS total_returned_qty,
        COALESCE(SUM(rsv.sellable_quantity),0)         AS total_sellable,
        COALESCE(SUM(rsv.damaged_quantity),0)          AS total_damaged,
        COALESCE(SUM(rsv.scrap_quantity),0)            AS total_scrap,
        COUNT(CASE WHEN rsv.verification_status='pending'   THEN 1 END) AS pending_verifications,
        COUNT(CASE WHEN rsv.verification_status='completed' THEN 1 END) AS completed_verifications
      FROM return_stock_verification rsv
      WHERE rsv.tenant_id = CAST(:tenant_id AS INTEGER)
      ${pgYearFilter("rsv.created_at", year)}
      ${pgMonthFilter("rsv.created_at", month)}
    `;
    const rows = await return_stock_verification.sequelize.query(query, {
      replacements: { tenant_id, year, month },
      type: Sequelize.QueryTypes.SELECT
    });
    res.json(rows[0] || {});
  } catch (err) {
    console.error("Error fetching stock return verification summary:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
};

// ─── 15. KPI & ROI Metrics ────────────────────────────────────────────────────
exports.getKpiMetrics = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const subscriptionType = await getSubscriptionType(tenant_id);
    const { year, month, date_filter } = req.query;

    let salesQuery;
    if (subscriptionType === "bill") {
      salesQuery = `
        SELECT
          COALESCE(SUM(tbl.total_amount),0)   AS gross_revenue,
          COALESCE(SUM(tbl.gst_amount),0)     AS total_gst,
          COALESCE(SUM(tbl.discount_value),0) AS total_discount,
          COALESCE(SUM(tbl.transport_charge),0) AS total_transport,
          COUNT(DISTINCT tbl.bill_id)         AS total_docs,
          COUNT(DISTINCT tbl.customer_name)   AS unique_customers,
          COALESCE(SUM(tbi.quantity),0)       AS units_sold,
          COALESCE(AVG(tbl.total_amount),0)   AS avg_order_value
        FROM bills tbl
        LEFT JOIN bill_items tbi ON tbi.bill_id=tbl.bill_id
        WHERE tbl.tenant_id = CAST(:tenant_id AS INTEGER)
        ${pgYearFilter("tbl.created_at", year)}
        ${pgMonthFilter("tbl.created_at", month)}
        ${pgDateFilter("tbl.created_at", date_filter)}
      `;
    } else {
      salesQuery = `
        SELECT
          COALESCE(SUM(tbl.total_amount),0)   AS gross_revenue,
          COALESCE(SUM(tbl.gst_amount),0)     AS total_gst,
          COALESCE(SUM(tbl.discount_value),0) AS total_discount,
          COALESCE(SUM(tbl.transport_charge),0) AS total_transport,
          COUNT(DISTINCT tbl.invoice_id)      AS total_docs,
          COUNT(DISTINCT tbl.customer_id)     AS unique_customers,
          COALESCE(SUM(tii.quantity),0)       AS units_sold,
          COALESCE(AVG(tbl.total_amount),0)   AS avg_order_value
        FROM invoices tbl
        LEFT JOIN invoice_items tii ON tii.invoice_id=tbl.invoice_id
        WHERE tbl.tenant_id = CAST(:tenant_id AS INTEGER)
        ${pgYearFilter("tbl.created_at", year)}
        ${pgMonthFilter("tbl.created_at", month)}
        ${pgDateFilter("tbl.created_at", date_filter)}
      `;
    }

    const srQuery = `
      SELECT COALESCE(SUM(sr.total_amount),0) AS total_return_value
      FROM sales_returns sr
      WHERE sr.tenant_id = CAST(:tenant_id AS INTEGER)
      ${pgYearFilter("sr.created_at", year)}
      ${pgMonthFilter("sr.created_at", month)}
      ${pgDateFilter("sr.created_at", date_filter)}
    `;

    const prQuery = `
      SELECT COALESCE(SUM(pr.total_amount),0) AS total_purchase_return_value
      FROM purchase_returns pr
      WHERE pr.tenant_id = CAST(:tenant_id AS INTEGER)
      ${pgYearFilter("pr.created_at", year)}
      ${pgMonthFilter("pr.created_at", month)}
      ${pgDateFilter("pr.created_at", date_filter)}
    `;

    const stockQuery = `
      SELECT COALESCE(SUM(p.price * p.stock_quantity),0) AS total_inventory_value
      FROM products p WHERE p.tenant_id=:tenant_id
    `;

    const combinedQuery = `
      WITH sales_cte AS (
        ${salesQuery}
      ),
      sr_cte AS (
        ${srQuery}
      ),
      pr_cte AS (
        ${prQuery}
      ),
      stock_cte AS (
        ${stockQuery}
      )
      SELECT * FROM sales_cte, sr_cte, pr_cte, stock_cte;
    `;

    const genericModel = products;
    const rows = await genericModel.sequelize.query(combinedQuery, { 
      replacements: { tenant_id, year, month, date_filter }, 
      type: Sequelize.QueryTypes.SELECT 
    });

    const result = rows[0] || {};
    const grossRevenue   = Number(result.gross_revenue || 0);
    const totalGst       = Number(result.total_gst || 0);
    const totalDiscount  = Number(result.total_discount || 0);
    const returnValue    = Number(result.total_return_value || 0);
    const purchaseReturn = Number(result.total_purchase_return_value || 0);
    const inventoryValue = Number(result.total_inventory_value || 0);

    const netRevenue     = grossRevenue - returnValue;
    const revenueAfterGst = netRevenue - totalGst;

    const returnRate        = grossRevenue ? ((returnValue / grossRevenue) * 100).toFixed(2) : "0.00";
    const discountRate      = grossRevenue ? ((totalDiscount / grossRevenue) * 100).toFixed(2) : "0.00";
    const gstEffectiveRate  = grossRevenue ? ((totalGst / grossRevenue) * 100).toFixed(2) : "0.00";
    const inventoryTurnover = inventoryValue ? (grossRevenue / inventoryValue).toFixed(2) : "0.00";

    res.json({
      gross_revenue:        grossRevenue,
      net_revenue:          netRevenue,
      revenue_after_gst:    revenueAfterGst,
      total_gst:            totalGst,
      total_discount:       totalDiscount,
      total_return_value:   returnValue,
      purchase_return_value: purchaseReturn,
      inventory_value:      inventoryValue,
      total_docs:           result.total_docs || 0,
      unique_customers:     result.unique_customers || 0,
      units_sold:           result.units_sold || 0,
      avg_order_value:      Number(result.avg_order_value || 0).toFixed(2),
      return_rate:          returnRate,
      discount_rate:        discountRate,
      gst_effective_rate:   gstEffectiveRate,
      inventory_turnover:   inventoryTurnover,
      subscription_type:    subscriptionType,
    });
  } catch (err) {
    console.error("Error fetching KPI metrics:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
};

// ─── 16. Billing Addresses ────────────────────────────────────────────────────
exports.getBillingAddresses = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const list = await billing_address.findAll({
      where: { company_id: tenant_id, is_active: true },
      attributes: ["billing_address_id", "address_name"]
    });
    res.json(list);
  } catch (err) {
    console.error("Error fetching billing addresses:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
};

// ─── 17. Return Stock Top Products ────────────────────────────────────────────
exports.getReturnStockTopProducts = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const { year, month } = req.query;
    const query = `
      SELECT p.product_name, p.product_id,
        COALESCE(SUM(rsv.returned_quantity),0) AS total_returned,
        COALESCE(SUM(rsv.sellable_quantity),0) AS total_sellable,
        COALESCE(SUM(rsv.damaged_quantity),0)  AS total_damaged,
        COALESCE(SUM(rsv.scrap_quantity),0)    AS total_scrap
      FROM return_stock_verification rsv
      JOIN products p ON p.product_id=rsv.product_id
      WHERE rsv.tenant_id = CAST(:tenant_id AS INTEGER)
      ${pgYearFilter("rsv.created_at", year)}
      ${pgMonthFilter("rsv.created_at", month)}
      GROUP BY rsv.product_id, p.product_name, p.product_id
      ORDER BY total_returned DESC
      LIMIT 20
    `;
    const rows = await return_stock_verification.sequelize.query(query, {
      replacements: { tenant_id, year, month },
      type: Sequelize.QueryTypes.SELECT
    });
    res.json(rows);
  } catch (err) {
    console.error("Error fetching return stock top products:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
};

// ─── 18. Customers List ───────────────────────────────────────────────────────
exports.getCustomers = async (req, res) => {
  const tenant_id = req.user.tenant_id;
  if (!tenant_id || isNaN(tenant_id)) {
    return res.status(401).json({ error: "Unauthorized or invalid tenant" });
  }

  let page = Number(req.query.page);
  let limit = Number(req.query.limit);
  if (isNaN(page) || page < 0) page = 0;
  if (isNaN(limit) || limit <= 0 || limit > 100) limit = 10;
  const offset = page * limit;

  const allowedSortFields = ["name", "mobile", "email", "gst_number", "state", "created_at"];
  const sortField = allowedSortFields.includes(req.query.sortField) ? req.query.sortField : "created_at";
  const sortOrder = req.query.sortOrder === "ASC" ? "ASC" : "DESC";

  const search = (req.query.search || "").trim();
  const whereClause = { tenant_id };

  if (search) {
  whereClause[Op.or] = [
    { name:       { [Op.iLike]: `%${search}%` } },
    { mobile:     { [Op.iLike]: `%${search}%` } },
    { email:      { [Op.iLike]: `%${search}%` } },
    { gst_number: { [Op.iLike]: `%${search}%` } }
  ];
}

  try {
    const { count, rows } = await customers.findAndCountAll({
      where: whereClause,
      order: [[sortField, sortOrder]],
      limit,
      offset
    });

    res.json({
      data: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    });
  } catch (err) {
    console.error("Error fetching customers:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
};
