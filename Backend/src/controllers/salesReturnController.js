const { Sequelize } = require("sequelize");
const { 
  sales_returns, 
  sales_return_items, 
  invoices, 
  invoice_items, 
  customers, 
  products, 
  users, 
  stock_movements 
} = require("../models");

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function generateReturnNumber(tenant_id) {
  const year = new Date().getFullYear();
  const prefix = `SR-T${tenant_id}-${year}-`;
  const prefixLike = `${prefix}%`;
  const startIndex = prefix.length + 1;

  const [row] = await sales_returns.sequelize.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM :startIndex) AS INTEGER)), 0) as max_seq 
     FROM sales_returns 
     WHERE tenant_id = :tenant_id AND return_number LIKE :prefixLike`,
    {
      replacements: { tenant_id, prefixLike, startIndex },
      type: Sequelize.QueryTypes.SELECT
    }
  );

  const nextSeq = (row?.max_seq || 0) + 1;
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

// ============================================
// 1. GET ALL SALES RETURNS (List View)
// ============================================
exports.getAllSalesReturns = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const {
      page = 1,
      limit = 20,
      search = '',
      date_from,
      date_to,
      status
    } = req.query;

    const pageNumber = parseInt(page);
    const pageLimit = parseInt(limit);
    const offset = (pageNumber - 1) * pageLimit;

    let whereClause = 'sr.tenant_id = CAST(:tenant_id AS INTEGER)';
    const replacements = { tenant_id };

    if (search) {
      whereClause += ` AND (
        sr.return_number LIKE :search
        OR TO_CHAR(sr.return_date, 'DD-MM-YYYY') LIKE :search
        OR c.name LIKE :search
        OR c.mobile LIKE :search
        OR i.invoice_number LIKE :search
        OR CAST(sr.total_amount AS TEXT) LIKE :search
      )`;
      replacements.search = `%${search}%`;
    }

    if (date_from) {
      whereClause += ' AND sr.return_date >= :date_from';
      replacements.date_from = date_from;
    }

    if (date_to) {
      whereClause += ' AND sr.return_date <= :date_to';
      replacements.date_to = date_to;
    }

    let statusHavingClause = '';
    if (status) {
      statusHavingClause = `HAVING CASE 
        WHEN COALESCE(SUM(sri.quantity - COALESCE(sri.verified_quantity, 0)), 0) = 0 
             AND COUNT(DISTINCT sri.sales_return_item_id) > 0 THEN 'verified'
        WHEN COALESCE(SUM(sri.verified_quantity), 0) > 0 THEN 'partially_verified'
        ELSE 'pending'
      END = :status`;
      replacements.status = status;
    }

    const countQuery = `
      SELECT COUNT(DISTINCT sr.sales_return_id) AS total
      FROM sales_returns sr
      LEFT JOIN customers c ON sr.customer_id = c.customer_id
      LEFT JOIN invoices i ON sr.original_invoice_id = i.invoice_id
      LEFT JOIN sales_return_items sri ON sr.sales_return_id = sri.sales_return_id
      JOIN users u ON sr.created_by = u.user_id
      WHERE ${whereClause}
    `;

    const [countResult] = await sales_returns.sequelize.query(countQuery, {
      replacements,
      type: Sequelize.QueryTypes.SELECT
    });
    const totalItems = countResult ? parseInt(countResult.total) : 0;
    const totalPages = Math.ceil(totalItems / pageLimit);

    replacements.limit = pageLimit;
    replacements.offset = offset;

    const query = `
      SELECT 
        sr.sales_return_id,
        sr.return_number,
        sr.return_date,
        sr.subtotal,
        sr.gst_amount,
        sr.cgst_amount,
        sr.sgst_amount,
        sr.discount_amount,
        sr.total_amount,
        sr.reason,
        sr.created_at,
        c.customer_id,
        c.name AS customer_name,
        c.mobile AS customer_mobile,
        c.gst_number,
        c.email AS customer_email,
        i.invoice_number AS original_invoice_number,
        i.invoice_date AS original_invoice_date,
        CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
        COUNT(DISTINCT sri.sales_return_item_id) AS total_items,
        COALESCE(SUM(sri.quantity), 0) AS total_quantity,
        COALESCE(SUM(sri.verified_quantity), 0) AS total_verified_quantity,
        CASE 
          WHEN COALESCE(SUM(sri.quantity - COALESCE(sri.verified_quantity, 0)), 0) = 0 
               AND COUNT(DISTINCT sri.sales_return_item_id) > 0 THEN 'verified'
          WHEN COALESCE(SUM(sri.verified_quantity), 0) > 0 THEN 'partially_verified'
          ELSE 'pending'
        END AS overall_verification_status
      FROM sales_returns sr
      JOIN customers c ON sr.customer_id = c.customer_id
      JOIN invoices i ON sr.original_invoice_id = i.invoice_id
      LEFT JOIN users u ON sr.created_by = u.user_id
      LEFT JOIN sales_return_items sri ON sr.sales_return_id = sri.sales_return_id
      WHERE ${whereClause}
      GROUP BY 
        sr.sales_return_id, sr.return_number, sr.return_date, sr.subtotal, 
        sr.gst_amount, sr.cgst_amount, sr.sgst_amount, sr.discount_amount, 
        sr.total_amount, sr.reason, sr.created_at,
        c.customer_id, c.name, c.mobile, c.gst_number, c.email,
        i.invoice_id, i.invoice_number, i.invoice_date,
        u.user_id, u.first_name, u.last_name
      ${statusHavingClause}
      ORDER BY sr.return_date DESC, sr.created_at DESC
      LIMIT :limit OFFSET :offset
    `;

    const rows = await sales_returns.sequelize.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT
    });

    const summaryQuery = `
      SELECT 
        COUNT(*) AS total_returns,
        COALESCE(SUM(sr.total_amount), 0) AS total_return_value
      FROM sales_returns sr
      LEFT JOIN customers c ON sr.customer_id = c.customer_id
      LEFT JOIN invoices i ON sr.original_invoice_id = i.invoice_id
      WHERE ${whereClause}
    `;
    const [summary] = await sales_returns.sequelize.query(summaryQuery, {
      replacements,
      type: Sequelize.QueryTypes.SELECT
    });

    const pendingQuery = `
      SELECT COUNT(DISTINCT sr.sales_return_id) AS pending_verification_count
      FROM sales_returns sr
      JOIN sales_return_items sri ON sr.sales_return_id = sri.sales_return_id
      WHERE sr.tenant_id = CAST(:tenant_id AS INTEGER)
      AND sri.quantity > COALESCE(sri.verified_quantity, 0)
    `;
    const [pendingCount] = await sales_returns.sequelize.query(pendingQuery, {
      replacements: { tenant_id },
      type: Sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        items: rows,
        pagination: {
          current_page: pageNumber,
          total_pages: totalPages,
          total_items: totalItems,
          items_per_page: pageLimit
        },
        summary: {
          total_returns: summary ? parseInt(summary.total_returns) : 0,
          total_return_value: summary ? parseFloat(summary.total_return_value) : 0,
          pending_verification_count: pendingCount ? parseInt(pendingCount.pending_verification_count) : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching sales returns:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch sales returns', details: error.message } });
  }
};

// ============================================
// 2. GET ALL INVOICES FOR RETURN CREATION
// ============================================
exports.getInvoicesForReturn = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const {
      page = 1,
      limit = 50,
      search = '',
      payment_status,
      date_from,
      date_to
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereClause = "i.tenant_id = CAST(:tenant_id AS INTEGER) AND i.document_type = 'Tax Invoice' AND i.is_fully_returned = FALSE";
    const replacements = { tenant_id };

    if (search) {
      whereClause += ` AND (i.invoice_number LIKE :search OR c.name LIKE :search OR c.mobile LIKE :search)`;
      replacements.search = `%${search}%`;
    }

    if (payment_status) {
      whereClause += ' AND i.payment_status = :payment_status';
      replacements.payment_status = payment_status;
    }

    if (date_from) {
      whereClause += ' AND i.invoice_date >= :date_from';
      replacements.date_from = date_from;
    }
    if (date_to) {
      whereClause += ' AND i.invoice_date <= :date_to';
      replacements.date_to = date_to;
    }

    const countQuery = `
      SELECT COUNT(*) as total FROM invoices i 
      LEFT JOIN customers c ON i.customer_id = c.customer_id
      WHERE ${whereClause}
    `;
    const [countResult] = await invoices.sequelize.query(countQuery, {
      replacements,
      type: Sequelize.QueryTypes.SELECT
    });
    const totalItems = countResult ? parseInt(countResult.total) : 0;
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    replacements.limit = parseInt(limit);
    replacements.offset = offset;

    const query = `
      SELECT 
        i.invoice_id,
        i.invoice_number,
        i.invoice_date,
        i.subtotal,
        i.gst_amount,
        i.total_amount,
        i.payment_status,
        i.payment_type,
        c.customer_id,
        c.name AS customer_name,
        c.mobile AS customer_mobile,
        c.gst_number AS customer_gst,
        COUNT(DISTINCT ii.item_id) AS total_items,
        COALESCE(SUM(ii.quantity), 0) AS total_quantity,
        COALESCE(SUM(ii.returned_quantity), 0) AS total_returned_quantity,
        (COALESCE(SUM(ii.quantity), 0) - COALESCE(SUM(ii.returned_quantity), 0)) AS available_for_return
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.customer_id
      LEFT JOIN invoice_items ii ON i.invoice_id = ii.invoice_id
      WHERE ${whereClause}
      GROUP BY i.invoice_id, c.customer_id
      HAVING (COALESCE(SUM(ii.quantity), 0) - COALESCE(SUM(ii.returned_quantity), 0)) > 0
      ORDER BY i.invoice_date DESC
      LIMIT :limit OFFSET :offset
    `;

    const rows = await invoices.sequelize.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        invoices: rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: totalItems,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch invoices', details: error.message } });
  }
};

// ============================================
// 3. GET INVOICE DETAILS WITH ITEMS
// ============================================
exports.getInvoiceDetailsForReturn = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { invoice_id } = req.params;

    const invoiceQuery = `
      SELECT 
        i.*,
        c.name AS customer_name,
        c.mobile AS customer_mobile,
        c.email AS customer_email,
        c.gst_number AS customer_gst,
        c.address AS customer_address,
        c.state AS customer_state,
        c.pincode AS customer_pincode
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.customer_id
      WHERE i.invoice_id = :invoice_id AND i.tenant_id = CAST(:tenant_id AS INTEGER)
    `;
    const [invoice] = await invoices.sequelize.query(invoiceQuery, {
      replacements: { invoice_id, tenant_id },
      type: Sequelize.QueryTypes.SELECT
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    }

    const itemsQuery = `
  SELECT 
    ii.item_id,
    ii.product_id,
    ii.hsn_code,
    ii.quantity AS ordered_quantity,
    ii.returned_quantity,
    (ii.quantity - COALESCE(ii.returned_quantity, 0)) AS available_for_return,
    ii.unit,
    ii.rate,
    ii.gst_percentage,
    ii.base_amount,
    ii.total_with_gst,
    p.product_name,
    p.barcode,
    p.image_url,
    p.stock_quantity AS current_stock
  FROM invoice_items ii
  JOIN products p 
    ON ii.product_id = p.product_id 
    AND p.tenant_id = ii.tenant_id
  WHERE 
    ii.invoice_id = :invoice_id
    AND ii.tenant_id = CAST(:tenant_id AS INTEGER)
    AND (ii.quantity - COALESCE(ii.returned_quantity, 0)) > 0
`;
    const items = await invoice_items.sequelize.query(itemsQuery, {
      replacements: { invoice_id, tenant_id },
      type: Sequelize.QueryTypes.SELECT
    });

    res.json({ success: true, data: { invoice, items } });
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch invoice details', details: error.message } });
  }
};

// ============================================
// 4. CREATE SALES RETURN
// ============================================
exports.createSalesReturn = async (req, res) => {
  const transaction = await sales_returns.sequelize.transaction();
  try {
    const { tenant_id, user_id } = req.user;
    const { original_invoice_id, return_date, items, reason, discount_amount = 0 } = req.body;

    if (!original_invoice_id || !return_date || !items || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
    }

    const userCheck = await users.findOne({ where: { user_id, tenant_id }, transaction });
    if (!userCheck) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: { message: "Invalid user for this tenant" } });
    }

    const invoiceData = await invoices.findOne({ where: { invoice_id: original_invoice_id, tenant_id }, transaction });
    if (!invoiceData) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: { message: "Invoice not found" } });
    }

    const customer_id = invoiceData.customer_id;
    const returnNumber = await generateReturnNumber(tenant_id);

    let subtotal = 0;
    let totalGstAmount = 0;
    let totalCgstAmount = 0;
    let totalSgstAmount = 0;
    const enrichedItems = [];

    for (const item of items) {
      const invoiceItem = await invoice_items.findOne({
        where: { item_id: item.item_id, invoice_id: original_invoice_id },
        transaction
      });

      if (!invoiceItem) {
        throw new Error(`Item ${item.item_id} not found`);
      }

      const availableQty = invoiceItem.quantity - (invoiceItem.returned_quantity || 0);
      if (item.quantity > availableQty) {
        throw new Error(`Quantity ${item.quantity} exceeds available ${availableQty} for product ${item.product_name || item.item_id}`);
      }

      const baseAmount = item.rate * item.quantity;
      const gstAmount = (baseAmount * item.gst_percentage) / 100;

      subtotal += baseAmount;
      totalGstAmount += gstAmount;
      totalCgstAmount += gstAmount / 2;
      totalSgstAmount += gstAmount / 2;
      
      enrichedItems.push({
        ...item,
        baseAmount,
        gstAmount,
        totalWithGst: baseAmount + gstAmount
      });
    }

    const totalAmount = subtotal + totalGstAmount - discount_amount;

    const returnRec = await sales_returns.create({
      tenant_id,
      original_invoice_id,
      return_number: returnNumber,
      return_date,
      customer_id,
      subtotal,
      gst_amount: totalGstAmount,
      cgst_amount: totalCgstAmount,
      sgst_amount: totalSgstAmount,
      discount_amount,
      total_amount: totalAmount,
      reason: reason || null,
      created_by: user_id
    }, { transaction });

    for (const item of enrichedItems) {
      await sales_return_items.create({
        tenant_id,
        sales_return_id: returnRec.sales_return_id,
        invoice_item_id: item.item_id,
        product_id: item.product_id,
        quantity: item.quantity,
        rate: item.rate,
        gst_percentage: item.gst_percentage,
        base_amount: item.baseAmount,
        gst_amount: item.gstAmount,
        total_with_gst: item.totalWithGst,
        verification_status: 'pending',
        verified_quantity: 0
      }, { transaction });

      await invoice_items.sequelize.query(
        `UPDATE invoice_items 
         SET returned_quantity = COALESCE(returned_quantity, 0) + :qty 
         WHERE item_id = :item_id`,
        { replacements: { qty: item.quantity, item_id: item.item_id }, transaction }
      );

      // Note: Physical stock update is intentionally removed from here.
      // Stock quantity is now updated during the Return Verification process in returnStockController.js
      // to avoid double-counting and ensure correct categorization (Sellable/Damaged/Scrap).
    }

    await transaction.commit();
    res.status(201).json({
      success: true,
      message: "Sales return created successfully",
      data: { sales_return_id: returnRec.sales_return_id, return_number: returnNumber }
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating sales return:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// ============================================
// 5. GET SINGLE SALES RETURN DETAILS
// ============================================
exports.getSalesReturnDetails = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { sales_return_id } = req.params;

    const query = `
      SELECT 
        sr.*,
        c.customer_id,
        c.name AS customer_name,
        c.mobile AS customer_mobile,
        c.email AS customer_email,
        c.gst_number AS customer_gst,
        c.address AS customer_address,
        i.invoice_number AS original_invoice_number,
        i.invoice_date AS original_invoice_date,
        CONCAT(u.first_name, ' ', u.last_name) AS created_by_name
      FROM sales_returns sr
      JOIN customers c ON sr.customer_id = c.customer_id
      JOIN invoices i ON sr.original_invoice_id = i.invoice_id
      LEFT JOIN users u ON sr.created_by = u.user_id
      WHERE sr.sales_return_id = :sales_return_id AND sr.tenant_id = CAST(:tenant_id AS INTEGER)
    `;
    const [ret] = await sales_returns.sequelize.query(query, {
      replacements: { sales_return_id, tenant_id },
      type: Sequelize.QueryTypes.SELECT
    });

    if (!ret) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sales return not found' } });
    }

    const itemsQuery = `
      SELECT 
        sri.*,
        p.product_name,
        p.barcode,
        p.image_url,
        ii.hsn_code,
        ii.unit
      FROM sales_return_items sri
      JOIN products p ON sri.product_id = p.product_id
      LEFT JOIN invoice_items ii ON sri.invoice_item_id = ii.item_id
      WHERE sri.sales_return_id = :sales_return_id AND sri.tenant_id = CAST(:tenant_id AS INTEGER)
    `;
    const items = await sales_return_items.sequelize.query(itemsQuery, {
      replacements: { sales_return_id, tenant_id },
      type: Sequelize.QueryTypes.SELECT
    });

    res.json({ success: true, data: { return: ret, items } });
  } catch (error) {
    console.error('Error fetching sales return details:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch sales return details', details: error.message } });
  }
};

// ============================================
// 6. DELETE SALES RETURN (Only if not verified)
// ============================================
exports.deleteSalesReturn = async (req, res) => {
  const transaction = await sales_returns.sequelize.transaction();
  try {
    const { tenant_id } = req.user;
    const { sales_return_id } = req.params;

    const countQuery = `
      SELECT COUNT(*) as verified_count 
      FROM sales_return_items 
      WHERE sales_return_id = :sales_return_id AND verified_quantity > 0
    `;
    const [verifiedItems] = await sales_return_items.sequelize.query(countQuery, {
      replacements: { sales_return_id },
      type: Sequelize.QueryTypes.SELECT,
      transaction
    });

    if (verifiedItems && parseInt(verifiedItems.verified_count) > 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: { code: 'CANNOT_DELETE', message: 'Cannot delete sales return with verified items' } });
    }

    const returnItems = await sales_return_items.findAll({
      where: { sales_return_id },
      transaction
    });

    for (const item of returnItems) {
      await invoice_items.sequelize.query(
        `UPDATE invoice_items 
         SET returned_quantity = returned_quantity - :qty 
         WHERE item_id = :item_id`,
        { replacements: { qty: item.quantity, item_id: item.invoice_item_id }, transaction }
      );

      await products.sequelize.query(
        `UPDATE products 
         SET stock_quantity = stock_quantity + :qty 
         WHERE product_id = :product_id AND tenant_id = CAST(:tenant_id AS INTEGER)`,
        { replacements: { qty: item.quantity, product_id: item.product_id, tenant_id }, transaction }
      );
    }
    
    // Also delete stock_movements for this return to keep things clean? Original code didn't, but we should be fine staying identical to original.
    // Original code deleted just sales_returns and relied on cascade for sales_return_items, but let's be explicit.
    await sales_return_items.destroy({
      where: { sales_return_id },
      transaction
    });

    await sales_returns.destroy({
      where: { sales_return_id, tenant_id },
      transaction
    });

    await transaction.commit();
    res.json({ success: true, message: 'Sales return deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting sales return:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete sales return', details: error.message } });
  }
};
