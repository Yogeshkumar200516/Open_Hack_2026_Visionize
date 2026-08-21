const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

const {
  return_stock_verification,
  sales_returns,
  supplier_returns,
  sales_return_items,
  supplier_return_items,
  products,
  stock_movements,
  users,
  customers,
  invoices,
  invoice_items,
  suppliers,
  purchase_invoices,
  purchase_invoice_items
} = require('../models');

// ============================================
// 1. GET ALL RETURNS (INCLUDING ALL STATUSES)
// ============================================
exports.getAllReturns = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const {
      page = 1,
      limit = 20,
      search = '',
      return_type,
      status,
      date_from,
      date_to
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let salesReturnsQuery = '';
    let salesParams = { tenant_id };

    if (!return_type || return_type === 'all' || return_type === 'sales_return') {
      let salesWhere = ['sr.tenant_id = :tenant_id'];

      if (status && status !== 'all') {
        salesWhere.push('sri.verification_status = :status');
        salesParams.status = status;
      }
      if (search) {
        salesWhere.push(`(p.product_name LIKE :search OR sr.return_number LIKE :search OR c.name LIKE :search)`);
        salesParams.search = `%${search}%`;
      }
      if (date_from) { salesWhere.push('sr.return_date >= :date_from'); salesParams.date_from = date_from; }
      if (date_to)   { salesWhere.push('sr.return_date <= :date_to');   salesParams.date_to = date_to; }

      salesReturnsQuery = `
        SELECT
          'sales_return' AS return_type,
          sri.sales_return_item_id AS return_item_id,
          sr.sales_return_id AS return_id,
          sr.return_number,
          sr.return_date,
          c.name AS customer_supplier_name,
          c.mobile AS customer_supplier_mobile,
          sr.reason,
          p.product_id,
          p.product_name,
          p.barcode,
          p.image_url,
          p.stock_quantity,
          p.sellable_stock,
          p.damaged_stock,
          p.scrap_stock,
          sri.quantity AS returned_quantity,
          sri.verified_quantity,
          (sri.quantity - COALESCE(sri.verified_quantity, 0)) AS pending_quantity,
          sri.rate,
          sri.gst_percentage,
          sri.total_with_gst,
          CAST(sri.verification_status AS VARCHAR) AS verification_status,
          i.invoice_number AS original_invoice_number,
          ii.hsn_code,
          ii.unit,
          COALESCE((
            SELECT SUM(v.sellable_quantity)
            FROM return_stock_verification v
            WHERE v.return_type = 'sales_return'
              AND v.return_item_id = sri.sales_return_item_id
              AND v.tenant_id = :tenant_id
          ), 0) AS total_sellable_verified,
          COALESCE((
            SELECT SUM(v.damaged_quantity)
            FROM return_stock_verification v
            WHERE v.return_type = 'sales_return'
              AND v.return_item_id = sri.sales_return_item_id
              AND v.tenant_id = :tenant_id
          ), 0) AS total_damaged_verified,
          COALESCE((
            SELECT SUM(v.scrap_quantity)
            FROM return_stock_verification v
            WHERE v.return_type = 'sales_return'
              AND v.return_item_id = sri.sales_return_item_id
              AND v.tenant_id = :tenant_id
          ), 0) AS total_scrap_verified
        FROM sales_return_items sri
        JOIN sales_returns sr ON sri.sales_return_id = sr.sales_return_id
        JOIN products p ON sri.product_id = p.product_id
        JOIN customers c ON sr.customer_id = c.customer_id
        JOIN invoices i ON sr.original_invoice_id = i.invoice_id
        LEFT JOIN invoice_items ii ON sri.invoice_item_id = ii.item_id
        WHERE ${salesWhere.join(' AND ')}
      `;
    }

    let purchaseReturnsQuery = '';
    let purchaseParams = { tenant_id };

    if (!return_type || return_type === 'all' || return_type === 'purchase_return') {
      let purchaseWhere = ['pr.tenant_id = :tenant_id'];

      if (status && status !== 'all') {
        purchaseWhere.push('pri.verification_status = :status');
        purchaseParams.status = status;
      }
      if (search) {
        purchaseWhere.push(`(p.product_name LIKE :search OR pr.return_number LIKE :search OR c.supplier_name LIKE :search)`);
        purchaseParams.search = `%${search}%`;
      }
      if (date_from) { purchaseWhere.push('pr.return_date >= :date_from'); purchaseParams.date_from = date_from; }
      if (date_to)   { purchaseWhere.push('pr.return_date <= :date_to');   purchaseParams.date_to = date_to; }

      purchaseReturnsQuery = `
        SELECT
          'purchase_return' AS return_type,
          pri.supplier_return_item_id AS return_item_id,
          pr.supplier_return_id AS return_id,
          pr.return_number,
          pr.return_date,
          c.supplier_name AS customer_supplier_name,
          c.mobile AS customer_supplier_mobile,
          pr.reason,
          p.product_id,
          p.product_name,
          p.barcode,
          p.image_url,
          p.stock_quantity,
          p.sellable_stock,
          p.damaged_stock,
          p.scrap_stock,
          pri.quantity AS returned_quantity,
          pri.verified_quantity,
          (pri.quantity - COALESCE(pri.verified_quantity, 0)) AS pending_quantity,
          pri.rate,
          pri.gst_percentage,
          pri.total_with_gst,
          CAST(pri.verification_status AS VARCHAR) AS verification_status,
          i.purchase_invoice_number AS original_invoice_number,
          COALESCE(ii.hsn_code, p.hsn_code) AS hsn_code,
          ii.unit,
          COALESCE((
            SELECT SUM(v.sellable_quantity)
            FROM return_stock_verification v
            WHERE v.return_type = 'purchase_return'
              AND v.return_item_id = pri.supplier_return_item_id
              AND v.tenant_id = :tenant_id
          ), 0) AS total_sellable_verified,
          COALESCE((
            SELECT SUM(v.damaged_quantity)
            FROM return_stock_verification v
            WHERE v.return_type = 'purchase_return'
              AND v.return_item_id = pri.supplier_return_item_id
              AND v.tenant_id = :tenant_id
          ), 0) AS total_damaged_verified,
          COALESCE((
            SELECT SUM(v.scrap_quantity)
            FROM return_stock_verification v
            WHERE v.return_type = 'purchase_return'
              AND v.return_item_id = pri.supplier_return_item_id
              AND v.tenant_id = :tenant_id
          ), 0) AS total_scrap_verified
        FROM supplier_return_items pri
        JOIN supplier_returns pr ON pri.supplier_return_id = pr.supplier_return_id
        JOIN products p ON pri.product_id = p.product_id
        JOIN suppliers c ON pr.supplier_id = c.supplier_id
        JOIN purchase_invoices i ON pr.purchase_invoice_id = i.purchase_invoice_id
        LEFT JOIN purchase_invoice_items ii
          ON ii.purchase_invoice_id = pr.purchase_invoice_id
          AND ii.product_id = pri.product_id
        WHERE ${purchaseWhere.join(' AND ')}
      `;
    }

    let finalQuery = '';
    let finalParams = { tenant_id };

    if (salesReturnsQuery && purchaseReturnsQuery) {
      finalQuery = `(${salesReturnsQuery}) UNION ALL (${purchaseReturnsQuery})`;
      finalParams = { ...salesParams, ...purchaseParams };
    } else if (salesReturnsQuery) {
      finalQuery = salesReturnsQuery;
      finalParams = salesParams;
    } else if (purchaseReturnsQuery) {
      finalQuery = purchaseReturnsQuery;
      finalParams = purchaseParams;
    }

    if (!finalQuery) {
      return res.json({
        success: true,
        data: {
          items: [],
          pagination: { current_page: 1, total_pages: 0, total_items: 0, items_per_page: parseInt(limit) },
          summary: {
            total_sellable_stock: 0,
            total_damaged_stock: 0,
            total_scrap_stock: 0,
            total_pending_quantity: 0,
            total_verified_quantity: 0
          }
        }
      });
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${finalQuery}) as combined`;
    const [countResult] = await sales_returns.sequelize.query(countQuery, {
      replacements: finalParams,
      type: Sequelize.QueryTypes.SELECT
    });

    const totalItems = countResult ? parseInt(countResult.total) : 0;
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    finalParams.limit  = parseInt(limit);
    finalParams.offset = offset;

    const paginatedQuery = `
      SELECT * FROM (${finalQuery}) as combined
      ORDER BY return_date DESC, return_number DESC
      LIMIT :limit OFFSET :offset
    `;
    const items = await sales_returns.sequelize.query(paginatedQuery, {
      replacements: finalParams,
      type: Sequelize.QueryTypes.SELECT
    });

    const summaryQuery = `
      SELECT
        COALESCE(SUM(total_sellable_verified), 0) AS total_sellable_stock,
        COALESCE(SUM(total_damaged_verified), 0)  AS total_damaged_stock,
        COALESCE(SUM(total_scrap_verified), 0)    AS total_scrap_stock,
        COALESCE(SUM(pending_quantity), 0)         AS total_pending_quantity,
        COALESCE(SUM(verified_quantity), 0)        AS total_verified_quantity
      FROM (${finalQuery}) as combined
    `;
    const [summaryResult] = await sales_returns.sequelize.query(summaryQuery, {
      replacements: finalParams,
      type: Sequelize.QueryTypes.SELECT
    });

    const returnItemIds = items.map(item => item.return_item_id);
    let verificationHistory = [];

    if (returnItemIds.length > 0) {
      const historyQuery = `
        SELECT
          v.verification_id,
          v.return_type,
          v.return_item_id,
          v.verification_date,
          v.sellable_quantity,
          v.damaged_quantity,
          v.scrap_quantity,
          v.inspection_notes,
          CONCAT(u.first_name, ' ', u.last_name) AS verified_by_name
        FROM return_stock_verification v
        JOIN users u ON v.verified_by = u.user_id
        WHERE v.tenant_id = :tenant_id AND v.verification_status = 'completed'
        ORDER BY v.verification_date DESC
      `;
      verificationHistory = await sales_returns.sequelize.query(historyQuery, {
        replacements: { tenant_id },
        type: Sequelize.QueryTypes.SELECT
      });
    }

    items.forEach(item => {
      item.verification_history = verificationHistory.filter(
        h => h.return_type === item.return_type && h.return_item_id === item.return_item_id
      );
    });

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          current_page:   parseInt(page),
          total_pages:    totalPages,
          total_items:    totalItems,
          items_per_page: parseInt(limit)
        },
        summary: summaryResult || {}
      }
    });

  } catch (error) {
    console.error('Error fetching all returns:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch returns', details: error.message } });
  }
};

// ============================================
// 2. GET RETURN ITEM DETAILS
// ============================================
exports.getReturnItemDetails = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { return_type, return_item_id } = req.params;

    if (!['sales_return', 'purchase_return'].includes(return_type)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_RETURN_TYPE', message: 'Return type must be sales_return or purchase_return' } });
    }

    let query, replacements = { return_item_id, tenant_id };

    if (return_type === 'sales_return') {
      query = `
        SELECT
          'sales_return' AS return_type,
          sri.sales_return_item_id AS return_item_id,
          sr.sales_return_id AS return_id,
          sr.return_number,
          sr.return_date,
          sr.reason,
          c.customer_id,
          c.name AS customer_name,
          c.mobile AS customer_mobile,
          i.invoice_number AS original_invoice_number,
          p.product_id,
          p.product_name,
          p.barcode,
          p.image_url,
          p.stock_quantity,
          p.sellable_stock,
          p.damaged_stock,
          p.scrap_stock,
          sri.quantity AS returned_quantity,
          sri.verified_quantity,
          (sri.quantity - COALESCE(sri.verified_quantity, 0)) AS pending_quantity,
          sri.rate,
          sri.gst_percentage,
          sri.verification_status,
          ii.hsn_code,
          ii.unit
        FROM sales_return_items sri
        JOIN sales_returns sr ON sri.sales_return_id = sr.sales_return_id
        JOIN products p ON sri.product_id = p.product_id
        JOIN customers c ON sr.customer_id = c.customer_id
        JOIN invoices i ON sr.original_invoice_id = i.invoice_id
        LEFT JOIN invoice_items ii ON sri.invoice_item_id = ii.item_id
        WHERE sri.sales_return_item_id = :return_item_id AND sri.tenant_id = :tenant_id
      `;
    } else {
      query = `
        SELECT
          'purchase_return' AS return_type,
          pri.supplier_return_item_id AS return_item_id,
          pr.supplier_return_id AS return_id,
          pr.return_number,
          pr.return_date,
          pr.reason,
          c.supplier_id,
          c.supplier_name,
          c.mobile AS supplier_mobile,
          i.purchase_invoice_number AS original_invoice_number,
          p.product_id,
          p.product_name,
          p.barcode,
          p.image_url,
          p.stock_quantity,
          p.sellable_stock,
          p.damaged_stock,
          p.scrap_stock,
          pri.quantity AS returned_quantity,
          pri.verified_quantity,
          (pri.quantity - COALESCE(pri.verified_quantity, 0)) AS pending_quantity,
          pri.rate,
          pri.gst_percentage,
          pri.verification_status,
          COALESCE(ii.hsn_code, p.hsn_code) AS hsn_code,
          ii.unit
        FROM supplier_return_items pri
        JOIN supplier_returns pr ON pri.supplier_return_id = pr.supplier_return_id
        JOIN products p ON pri.product_id = p.product_id
        JOIN suppliers c ON pr.supplier_id = c.supplier_id
        JOIN purchase_invoices i ON pr.purchase_invoice_id = i.purchase_invoice_id
        LEFT JOIN purchase_invoice_items ii
          ON ii.purchase_invoice_id = pr.purchase_invoice_id
          AND ii.product_id = pri.product_id
        WHERE pri.supplier_return_item_id = :return_item_id AND pri.tenant_id = :tenant_id
      `;
    }

    const [item] = await sales_returns.sequelize.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT
    });

    if (!item) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Return item not found' } });
    }

    const historyQuery = `
      SELECT
        v.verification_id,
        v.verification_date,
        v.returned_quantity,
        v.sellable_quantity,
        v.damaged_quantity,
        v.scrap_quantity,
        v.inspection_notes,
        v.damage_reason,
        v.images,
        v.stock_updated,
        CONCAT(u.first_name, ' ', u.last_name) AS verified_by_name
      FROM return_stock_verification v
      JOIN users u ON v.verified_by = u.user_id
      WHERE v.return_type = :return_type
        AND v.return_item_id = :return_item_id
        AND v.tenant_id = :tenant_id
      ORDER BY v.verification_date DESC
    `;
    const history = await sales_returns.sequelize.query(historyQuery, {
      replacements: { return_type, return_item_id, tenant_id },
      type: Sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: { item, verification_history: history || [] }
    });

  } catch (error) {
    console.error('Error fetching return item details:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch return item details', details: error.message } });
  }
};

// ============================================
// 3. UPLOAD VERIFICATION IMAGES
// ============================================
exports.uploadImages = async (req, res) => {
  try {
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      url: `/uploads/return_verifications/${file.filename}`,
      size: file.size
    }));

    res.json({ success: true, data: { uploaded_images: uploadedFiles } });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ success: false, error: { code: 'UPLOAD_ERROR', message: 'Failed to upload images', details: error.message } });
  }
};

// ============================================
// 4. CREATE VERIFICATION AND UPDATE STOCK
// ============================================
exports.verifyReturnStock = async (req, res) => {
  const transaction = await return_stock_verification.sequelize.transaction();

  try {
    const { tenant_id, user_id } = req.user;
    const {
      return_type,
      return_id,
      return_item_id,
      product_id,
      returned_quantity,
      sellable_quantity  = 0,
      damaged_quantity   = 0,
      scrap_quantity     = 0,
      inspection_notes,
      damage_reason,
      images             = [],
      update_stock_immediately = true
    } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!return_type || !return_id || !return_item_id || !product_id || returned_quantity === undefined) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
    }

    if (!['sales_return', 'purchase_return'].includes(return_type)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: { code: 'INVALID_RETURN_TYPE', message: 'Return type must be sales_return or purchase_return' } });
    }

    const totalQuantity = (sellable_quantity || 0) + (damaged_quantity || 0) + (scrap_quantity || 0);
    if (totalQuantity !== returned_quantity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'QUANTITY_MISMATCH',
          message: `Total categorized quantity (${totalQuantity}) must equal returned quantity (${returned_quantity})`
        }
      });
    }

    // ── Read the return item via raw SQL ─────────────────────────────────────
    // Using raw SQL here because DataTypes.ENUM on PostgreSQL can cause
    // Sequelize to misread the value when the column was added via ALTER TABLE
    // after the original table creation (the pg ENUM type name may differ).
    // Raw SQL bypasses that entirely and reads exactly what is in the DB.
    const itemTable = return_type === 'sales_return' ? 'sales_return_items'   : 'supplier_return_items';
    const itemIdCol = return_type === 'sales_return' ? 'sales_return_item_id' : 'supplier_return_item_id';

    const [returnItemRow] = await return_stock_verification.sequelize.query(
      `SELECT quantity, verified_quantity, verification_status
       FROM ${itemTable}
       WHERE ${itemIdCol} = :return_item_id
         AND tenant_id = CAST(:tenant_id AS INTEGER)`,
      {
        replacements: { return_item_id, tenant_id },
        type: Sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    if (!returnItemRow) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Return item not found' } });
    }

    const availableToVerify = returnItemRow.quantity - (returnItemRow.verified_quantity || 0);
    if (returned_quantity > availableToVerify) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: {
          code: 'QUANTITY_EXCEEDED',
          message: `Verification quantity ${returned_quantity} exceeds available quantity ${availableToVerify}`
        }
      });
    }

    // ── Create verification record ───────────────────────────────────────────
    const verification = await return_stock_verification.create({
      tenant_id,
      return_type,
      return_id,
      return_item_id,
      product_id,
      returned_quantity,
      verification_date: new Date(),
      verified_by: user_id,
      sellable_quantity,
      damaged_quantity,
      scrap_quantity,
      inspection_notes,
      damage_reason,
      images,
      verification_status: 'completed',
      stock_updated: false
    }, { transaction });

    const verificationId = verification.verification_id;

    // ── Fetch product ────────────────────────────────────────────────────────
    const product = await products.findOne({ where: { product_id, tenant_id }, transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }

    const previousStock = {
      stock_quantity: product.stock_quantity,
      sellable_stock: product.sellable_stock,
      damaged_stock:  product.damaged_stock,
      scrap_stock:    product.scrap_stock
    };

    let updatedStock = { ...previousStock };

    // ── Update stock ─────────────────────────────────────────────────────────
    if (update_stock_immediately) {
      // Sales return → stock comes IN; Purchase return → stock goes OUT
      const multiplier = return_type === 'sales_return' ? 1 : -1;

      updatedStock = {
        stock_quantity: previousStock.stock_quantity + (sellable_quantity * multiplier),
        sellable_stock: previousStock.sellable_stock + (sellable_quantity * multiplier),
        damaged_stock:  previousStock.damaged_stock  + (damaged_quantity  * multiplier),
        scrap_stock:    previousStock.scrap_stock    + (scrap_quantity    * multiplier)
      };

      await products.update({
        stock_quantity: updatedStock.stock_quantity,
        sellable_stock: updatedStock.sellable_stock,
        damaged_stock:  updatedStock.damaged_stock,
        scrap_stock:    updatedStock.scrap_stock
      }, { where: { product_id, tenant_id }, transaction });

      if (sellable_quantity > 0) {
        await stock_movements.create({
          tenant_id,
          product_id,
          change_type:      return_type === 'sales_return' ? 'IN' : 'OUT',
          quantity_changed: sellable_quantity,
          old_stock:        previousStock.stock_quantity,
          new_stock:        updatedStock.stock_quantity,
          stock_type:       'sellable',
          reason:           `${return_type} verification - sellable`,
          reference_id:     verificationId,
          reference_type:   'return_verification',
          updated_by:       user_id
        }, { transaction });
      }

      if (damaged_quantity > 0) {
        await stock_movements.create({
          tenant_id,
          product_id,
          change_type:      return_type === 'sales_return' ? 'IN' : 'OUT',
          quantity_changed: damaged_quantity,
          old_stock:        previousStock.damaged_stock,
          new_stock:        updatedStock.damaged_stock,
          stock_type:       'damaged',
          reason:           `${return_type} verification - damaged`,
          reference_id:     verificationId,
          reference_type:   'return_verification',
          updated_by:       user_id
        }, { transaction });
      }

      if (scrap_quantity > 0) {
        await stock_movements.create({
          tenant_id,
          product_id,
          change_type:      return_type === 'sales_return' ? 'IN' : 'OUT',
          quantity_changed: scrap_quantity,
          old_stock:        previousStock.scrap_stock,
          new_stock:        updatedStock.scrap_stock,
          stock_type:       'scrap',
          reason:           `${return_type} verification - scrap`,
          reference_id:     verificationId,
          reference_type:   'return_verification',
          updated_by:       user_id
        }, { transaction });
      }

      await return_stock_verification.update(
        { stock_updated: true },
        { where: { verification_id: verificationId }, transaction }
      );
    }

    // ── Update the return item's verified_quantity and verification_status ───
    // Using raw SQL to avoid PostgreSQL ENUM cast issues with Sequelize ORM.
    const newVerifiedQty = (returnItemRow.verified_quantity || 0) + returned_quantity;
    const newItemStatus  = newVerifiedQty >= returnItemRow.quantity ? 'verified' : 'partially_verified';

    // Both sales_return_items.verification_status and supplier_return_items.verification_status
    // use the verification_status_enum type (the migration script adds them as ENUM).
    // Cast explicitly to avoid PostgreSQL type-mismatch errors with Sequelize replacements.
    await return_stock_verification.sequelize.query(
      `UPDATE ${itemTable}
       SET verified_quantity   = :newVerifiedQty,
           verification_status = :newItemStatus::verification_status_enum
       WHERE ${itemIdCol} = :return_item_id
         AND tenant_id = CAST(:tenant_id AS INTEGER)`,
      {
        replacements: { newVerifiedQty, newItemStatus, return_item_id, tenant_id },
        type: Sequelize.QueryTypes.UPDATE,
        transaction,
      }
    );

    // ── Read ALL sibling items and compute the parent return's status ─────────
    // Again using raw SQL so the ENUM values come back as plain strings
    // and we see the row we just updated (same transaction, already flushed).

    if (return_type === 'purchase_return') {

      const siblingRows = await return_stock_verification.sequelize.query(
        `SELECT verification_status
         FROM supplier_return_items
         WHERE supplier_return_id = :return_id
           AND tenant_id = CAST(:tenant_id AS INTEGER)`,
        {
          replacements: { return_id, tenant_id },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const allVerified = siblingRows.length > 0 &&
        siblingRows.every(row => row.verification_status === 'verified');

      const anyVerified = siblingRows.some(
        row => row.verification_status === 'verified' ||
               row.verification_status === 'partially_verified'
      );

      // sr_status_enum values:
      //   all items verified   → 'sent_to_supplier'  (shown as "Verified" in UI)
      //   some items verified  → 'acknowledged'       (shown as "Partially Verified")
      //   no items verified    → 'draft'
      const overallStatus = allVerified ? 'sent_to_supplier'
                          : anyVerified ? 'acknowledged'
                          : 'draft';

      await return_stock_verification.sequelize.query(
        `UPDATE supplier_returns
         SET status = :overallStatus::sr_status_enum
         WHERE supplier_return_id = :return_id
           AND tenant_id = CAST(:tenant_id AS INTEGER)`,
        {
          replacements: { overallStatus, return_id, tenant_id },
          type: Sequelize.QueryTypes.UPDATE,
          transaction,
        }
      );

    } else {
      // sales_returns table has no aggregate status column;
      // verification status is tracked per-item via sales_return_items.verification_status.
      // No parent-level status update needed for sales returns.
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Return verification completed successfully',
      data: {
        verification_id:    verificationId,
        verification_date:  new Date(),
        stock_updates:      { previous_stock: previousStock, updated_stock: updatedStock },
        return_item_status: { verification_status: newItemStatus, verified_quantity: newVerifiedQty }
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error creating verification:', error);
    res.status(500).json({ success: false, error: { code: 'VERIFICATION_ERROR', message: 'Failed to create verification', details: error.message } });
  }
};

// ============================================
// 5. GET VERIFICATION HISTORY
// ============================================
exports.getVerificationHistory = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const {
      page = 1,
      limit = 20,
      product_id,
      return_type,
      date_from,
      date_to,
      verified_by
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereClause  = 'v.tenant_id = :tenant_id';
    const replacements = { tenant_id };

    if (product_id)  { whereClause += ' AND v.product_id = :product_id';        replacements.product_id  = product_id; }
    if (return_type) { whereClause += ' AND v.return_type = :return_type';       replacements.return_type = return_type; }
    if (date_from)   { whereClause += ' AND v.verification_date >= :date_from';  replacements.date_from   = date_from; }
    if (date_to)     { whereClause += ' AND v.verification_date <= :date_to';    replacements.date_to     = date_to; }
    if (verified_by) { whereClause += ' AND v.verified_by = :verified_by';       replacements.verified_by = verified_by; }

    const countQuery = `SELECT COUNT(*) as total FROM return_stock_verification v WHERE ${whereClause}`;
    const [countResult] = await return_stock_verification.sequelize.query(countQuery, {
      replacements,
      type: Sequelize.QueryTypes.SELECT
    });

    const totalItems = countResult ? parseInt(countResult.total) : 0;
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    replacements.limit  = parseInt(limit);
    replacements.offset = offset;

    const query = `
      SELECT
        v.*,
        p.product_name,
        p.barcode,
        CONCAT(u.first_name, ' ', u.last_name) AS verified_by_name,
        CASE
          WHEN v.return_type = 'sales_return'    THEN sr.return_number
          WHEN v.return_type = 'purchase_return' THEN pr.return_number
        END AS return_number,
        CASE
          WHEN v.return_type = 'sales_return'    THEN c1.name
          WHEN v.return_type = 'purchase_return' THEN c2.supplier_name
        END AS customer_supplier_name
      FROM return_stock_verification v
      JOIN products p  ON v.product_id  = p.product_id
      JOIN users u     ON v.verified_by = u.user_id
      LEFT JOIN sales_returns    sr ON v.return_type = 'sales_return'    AND v.return_id = sr.sales_return_id
      LEFT JOIN supplier_returns pr ON v.return_type = 'purchase_return' AND v.return_id = pr.supplier_return_id
      LEFT JOIN customers  c1 ON sr.customer_id = c1.customer_id
      LEFT JOIN suppliers  c2 ON pr.supplier_id = c2.supplier_id
      WHERE ${whereClause}
      ORDER BY v.verification_date DESC
      LIMIT :limit OFFSET :offset
    `;
    const history = await return_stock_verification.sequelize.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        items: history,
        pagination: {
          current_page:   parseInt(page),
          total_pages:    totalPages,
          total_items:    totalItems,
          items_per_page: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching verification history:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch verification history', details: error.message } });
  }
};

// ============================================
// 6. GET STOCK SUMMARY
// ============================================
exports.getStockSummary = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { product_id, category_id } = req.query;

    let whereClause    = 'p.tenant_id = :tenant_id';
    const replacements = { tenant_id };

    if (product_id)  { whereClause += ' AND p.product_id = :product_id';    replacements.product_id  = product_id; }
    if (category_id) { whereClause += ' AND p.category_id = :category_id';  replacements.category_id = category_id; }

    const summaryQuery = `
      SELECT
        p.product_id,
        p.product_name,
        p.barcode,
        p.stock_quantity,
        p.sellable_stock,
        p.damaged_stock,
        p.scrap_stock,
        COUNT(DISTINCT CASE WHEN sri.verification_status IN ('pending', 'partially_verified') THEN sri.sales_return_item_id END) AS pending_sales_returns,
        COUNT(DISTINCT CASE WHEN pri.verification_status IN ('pending', 'partially_verified') THEN pri.supplier_return_item_id END) AS pending_purchase_returns,
        SUM(CASE WHEN sri.verification_status IN ('pending', 'partially_verified') THEN (sri.quantity - COALESCE(sri.verified_quantity, 0)) ELSE 0 END) AS pending_sales_quantity,
        SUM(CASE WHEN pri.verification_status IN ('pending', 'partially_verified') THEN (pri.quantity - COALESCE(pri.verified_quantity, 0)) ELSE 0 END) AS pending_purchase_quantity
      FROM products p
      LEFT JOIN sales_return_items    sri ON p.product_id = sri.product_id AND sri.tenant_id = :tenant_id
      LEFT JOIN supplier_return_items pri ON p.product_id = pri.product_id AND pri.tenant_id = :tenant_id
      WHERE ${whereClause}
      GROUP BY p.product_id
    `;
    const summary = await products.sequelize.query(summaryQuery, {
      replacements,
      type: Sequelize.QueryTypes.SELECT
    });

    const overallSummaryQuery = `
      SELECT
        COUNT(DISTINCT p.product_id)       AS total_products,
        COALESCE(SUM(p.stock_quantity), 0)  AS total_stock_quantity,
        COALESCE(SUM(p.sellable_stock), 0)  AS total_sellable_stock,
        COALESCE(SUM(p.damaged_stock), 0)   AS total_damaged_stock,
        COALESCE(SUM(p.scrap_stock), 0)     AS total_scrap_stock
      FROM products p
      WHERE p.tenant_id = :tenant_id
    `;
    const [overallSummary] = await products.sequelize.query(overallSummaryQuery, {
      replacements: { tenant_id },
      type: Sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        overall_summary: overallSummary || {},
        products: summary
      }
    });

  } catch (error) {
    console.error('Error fetching stock summary:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch stock summary', details: error.message } });
  }
};