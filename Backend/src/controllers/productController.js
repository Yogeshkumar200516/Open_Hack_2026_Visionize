const fs = require('fs');
const path = require('path');
const models = require('../models');
const { Op } = require('sequelize');

// Using the exported models
const { products: Product, product_categories: ProductCategory, stock_movements: StockMovement, invoice_items: InvoiceItem, sequelize } = models;

const generateBarcode = () => "BC" + Math.random().toString().slice(2, 10);

exports.addProduct = async (req, res) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return res.status(401).json({ error: "Unauthorized: tenant_id missing" });
    }

    const {
      product_name,
      hsn_code,
      category_id,
      price,
      stock_quantity,
      description,
      image_url,
      gst,
      c_gst,
      s_gst,
      discount = 0,
      barcode,
    } = req.body;

    if (
      !product_name ||
      !hsn_code ||
      !category_id ||
      price == null ||
      stock_quantity == null ||
      gst == null ||
      c_gst == null ||
      s_gst == null
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const categoryCheck = await ProductCategory.findOne({
      where: { category_id, tenant_id: req.user.tenant_id }
    });

    if (!categoryCheck) {
      return res.status(400).json({ error: "Category does not exist for this tenant" });
    }

    if (categoryCheck.is_active !== true && categoryCheck.is_active !== 1) {
      return res.status(400).json({ error: "Category is inactive" });
    }

    const finalBarcode = barcode || generateBarcode();

    const newProduct = await Product.create({
      product_name,
      barcode: finalBarcode,
      hsn_code,
      category_id,
      price,
      stock_quantity,
      description: description || "",
      image_url: image_url || "",
      gst,
      c_gst,
      s_gst,
      discount,
      tenant_id: req.user.tenant_id,
    });

    res.status(201).json({
      message: "Product added successfully",
      product_id: newProduct.product_id,
      barcode: finalBarcode,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ error: "Failed to add product", details: error.message });
  }
};

exports.editProduct = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
      await transaction.rollback();
      return res.status(400).json({ error: "Invalid product ID" });
    }

    let {
      product_name,
      hsn_code,
      category_id,
      price,
      stock_quantity,
      description,
      image_url,
      gst,
      c_gst,
      s_gst,
      discount = 0,
      barcode,
    } = req.body;

    category_id = parseInt(category_id);
    price = parseFloat(price);
    stock_quantity = parseInt(stock_quantity);
    gst = parseFloat(gst);
    c_gst = parseFloat(c_gst);
    s_gst = parseFloat(s_gst);
    discount = parseFloat(discount);

    if (
      !product_name ||
      !hsn_code ||
      isNaN(category_id) ||
      isNaN(price) ||
      isNaN(stock_quantity) ||
      isNaN(gst) ||
      isNaN(c_gst) ||
      isNaN(s_gst) ||
      isNaN(discount)
    ) {
      await transaction.rollback();
      return res.status(400).json({ error: "Missing or invalid fields" });
    }

    const categoryCheck = await ProductCategory.findOne({
      where: { category_id, tenant_id: req.user.tenant_id }
    });

    if (!categoryCheck) {
      await transaction.rollback();
      return res.status(400).json({ error: "Category does not exist for this tenant" });
    }
    if (categoryCheck.is_active !== true && categoryCheck.is_active !== 1) {
      await transaction.rollback();
      return res.status(400).json({ error: "Category is inactive" });
    }

    const product = await Product.findOne({
      where: { product_id: productId, tenant_id: req.user.tenant_id },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ error: "Product not found" });
    }

    const oldStock = Number(product.stock_quantity || 0);
    const newStock = Number(stock_quantity);
    const stockChange = newStock - oldStock;

    await product.update({
      product_name,
      barcode: barcode || null,
      hsn_code,
      category_id,
      price,
      stock_quantity: newStock,
      description: description || "",
      image_url: image_url || "",
      gst,
      c_gst,
      s_gst,
      discount
    }, { transaction });

    if (stockChange !== 0) {
      const changeType = stockChange > 0 ? "IN" : "OUT";
      const qtyChanged = Math.abs(stockChange);
      const updatedBy =
        (req.user.first_name || "") + (req.user.last_name ? ` ${req.user.last_name}` : "") ||
        req.user.user_id ||
        "system";

      await StockMovement.create({
        tenant_id: req.user.tenant_id,
        product_id: productId,
        change_type: changeType,
        quantity_changed: qtyChanged,
        old_stock: oldStock,
        new_stock: newStock,
        reason: "Manual product edit",
        reference_id: null,
        updated_by: updatedBy,
      }, { transaction });
    }

    await transaction.commit();
    res.json({ message: "Product updated successfully" });
  } catch (err) {
    console.error("PUT /edit/:id error:", err);
    try { await transaction.rollback(); } catch (e) {}
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    if (!req.user?.tenant_id) {
      return res.status(401).json({ error: "Unauthorized: tenant_id missing" });
    }

    const categories = await ProductCategory.findAll({
      where: { tenant_id: req.user.tenant_id },
      attributes: ['category_id', 'category_name', 'is_active'],
      order: [['category_name', 'ASC']]
    });

    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { is_traced: false, tenant_id: req.user.tenant_id },
      include: [{
        model: ProductCategory,
        as: 'category', // Make sure associations are set correctly in models
        attributes: ['category_name'],
        required: true
      }],
      order: [['created_at', 'DESC']]
    });

    // Formatting it nicely to match the raw query structure
    const formattedProducts = products.map(p => {
      const data = p.toJSON();
      if (data.category) {
        data.category_name = data.category.category_name;
        delete data.category; // Optional depending on frontend needs
      }
      return data;
    });

    res.json(formattedProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

exports.deleteProduct = async (req, res) => {
  const productId = req.params.id;

  try {
    const usageCount = await InvoiceItem.count({
      where: { product_id: productId, tenant_id: req.user.tenant_id }
    });

    if (usageCount > 0) {
      await Product.update(
        { is_traced: true },
        { where: { product_id: productId, tenant_id: req.user.tenant_id } }
      );

      return res.status(200).json({
        message: "Product marked as traced (not deleted).",
        traced: true,
      });
    }

    const deletedCount = await Product.destroy({
      where: { product_id: productId, tenant_id: req.user.tenant_id }
    });

    if (deletedCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product deleted successfully", traced: false });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
};

exports.getTracedProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { is_traced: true, tenant_id: req.user.tenant_id },
      include: [{
        model: ProductCategory,
        as: 'category',
        attributes: ['category_name'],
        required: true
      }],
      order: [['created_at', 'DESC']]
    });

    const formattedProducts = products.map(p => {
      const data = p.toJSON();
      if (data.category) {
        data.category_name = data.category.category_name;
        delete data.category;
      }
      return data;
    });

    res.json(formattedProducts);
  } catch (error) {
    console.error("Error fetching traced products:", error);
    res.status(500).json({ error: "Failed to fetch traced products" });
  }
};

exports.toggleTrace = async (req, res) => {
  const { productId } = req.params;

  try {
    // MySQL style NOT is_traced would be changing boolean
    const product = await Product.findOne({
      where: { product_id: productId, tenant_id: req.user.tenant_id }
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    await product.update({ is_traced: !product.is_traced });

    res.json({ message: "Product trace status toggled successfully" });
  } catch (error) {
    console.error("Error toggling trace status:", error);
    res.status(500).json({ error: "Failed to toggle trace status" });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findOne({
      where: { product_id: productId, tenant_id: req.user.tenant_id },
      include: [{
        model: ProductCategory,
        as: 'category',
        attributes: ['category_name'],
      }]
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const data = product.toJSON();
    if (data.category) {
      data.category_name = data.category.category_name;
      delete data.category;
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
};

exports.updateStock = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      product_id,
      new_stock,
      updated_by = null,
      reason = "Stock updated manually",
      reference_id = null,
    } = req.body;

    if (!product_id || new_stock === undefined || new_stock < 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "Invalid product_id or new_stock value." });
    }

    const product = await Product.findOne({
      where: { product_id, tenant_id: req.user.tenant_id },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ message: "Product not found." });
    }

    const oldStock = Number(product.stock_quantity || 0);
    const stockChange = Number(new_stock) - oldStock;
    const changeType = stockChange > 0 ? "IN" : stockChange < 0 ? "OUT" : null;

    await product.update({ stock_quantity: new_stock }, { transaction });

    if (changeType) {
      const qtyChanged = Math.abs(stockChange);
      const updatedBy =
        updated_by ||
        (req.user.first_name || "") + (req.user.last_name ? ` ${req.user.last_name}` : "") ||
        req.user.user_id ||
        "system";

      await StockMovement.create({
        tenant_id: req.user.tenant_id,
        product_id,
        change_type: changeType,
        quantity_changed: qtyChanged,
        old_stock: oldStock,
        new_stock: Number(new_stock),
        reason,
        reference_id,
        updated_by: updatedBy,
      }, { transaction });
    }

    await transaction.commit();
    res.status(200).json({ message: "Stock updated and movement logged." });
  } catch (error) {
    try { await transaction.rollback(); } catch (e) {}
    console.error("Error updating stock:", error);
    res.status(500).json({ message: "Error updating stock", error: error.message });
  }
};

exports.getProductByBarcode = async (req, res) => {
  const { barcode } = req.params;

  try {
    const product = await Product.findOne({
      where: { barcode, tenant_id: req.user.tenant_id }
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.json(product);
  } catch (err) {
    console.error("Error fetching product by barcode:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.bulkUpload = async (req, res) => {
  if (!req.user || !req.user.tenant_id) {
    return res.status(401).json({ error: "Unauthorized: tenant_id missing" });
  }

  const { products: rows } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "No product rows provided." });
  }

  let categoryMap = {};
  try {
    const categories = await ProductCategory.findAll({
      where: { tenant_id: req.user.tenant_id }
    });
    categories.forEach((c) => {
      categoryMap[c.category_name.trim().toLowerCase()] = {
        category_id: c.category_id,
        is_active: c.is_active,
      };
    });
  } catch (err) {
    console.error("Bulk upload: failed to fetch categories", err);
    return res.status(500).json({ error: "Failed to fetch categories." });
  }

  let success_count = 0;
  let failed_count = 0;
  const failures = [];

  const generateBarcode = () =>
    "BC" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 10000);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; 

    const product_name      = String(row.product_name   ?? "").trim();
    const hsn_raw           = String(row.hsn_code       ?? "").trim();
    const hsn_code          = hsn_raw.replace(/[\u200B-\u200D\uFEFF]/g, "");
    const category_name_key = String(row.category_name  ?? "").trim().toLowerCase();
    const price             = parseFloat(row.price);
    const stock_quantity    = parseInt(row.stock_quantity, 10);
    const gst               = parseFloat(row.gst)      || 0;
    const discount          = parseFloat(row.discount) || 0;
    const description       = String(row.description   ?? "").trim();
    const barcode           = String(row.barcode        ?? "").trim() || generateBarcode();

    if (!product_name) {
      failures.push({ row: rowNum, product_name: "(empty)", reason: "product_name is required" });
      failed_count++;
      continue;
    }
    if (hsn_code.length < 4) {
      failures.push({ row: rowNum, product_name, reason: "hsn_code must be at least 4 characters" });
      failed_count++;
      continue;
    }
    if (isNaN(price) || price < 0) {
      failures.push({ row: rowNum, product_name, reason: "price must be a valid non-negative number" });
      failed_count++;
      continue;
    }
    if (isNaN(stock_quantity) || stock_quantity < 0) {
      failures.push({ row: rowNum, product_name, reason: "stock_quantity must be a valid non-negative integer" });
      failed_count++;
      continue;
    }
    if (gst < 0 || gst > 300) {
      failures.push({ row: rowNum, product_name, reason: "gst must be between 0 and 300" });
      failed_count++;
      continue;
    }
    if (discount < 0 || discount > 100) {
      failures.push({ row: rowNum, product_name, reason: "discount must be between 0 and 100" });
      failed_count++;
      continue;
    }

    const catEntry = categoryMap[category_name_key];
    if (!catEntry) {
      failures.push({ row: rowNum, product_name, reason: `Category "${row.category_name}" not found for this tenant` });
      failed_count++;
      continue;
    }
    if (catEntry.is_active !== true && catEntry.is_active !== 1) {
      failures.push({ row: rowNum, product_name, reason: `Category "${row.category_name}" is inactive` });
      failed_count++;
      continue;
    }

    const category_id = catEntry.category_id;
    const c_gst       = parseFloat((gst / 2).toFixed(2));
    const s_gst       = c_gst;

    try {
      await Product.create({
        product_name,
        barcode,
        hsn_code,
        category_id,
        price,
        stock_quantity,
        description,
        image_url: "",
        gst,
        c_gst,
        s_gst,
        discount,
        tenant_id: req.user.tenant_id,
      });
      success_count++;
    } catch (dbErr) {
      console.error(`Bulk upload: DB error on row ${rowNum}:`, dbErr.message);

      let reason = "Database error";
      if (dbErr.name === "SequelizeUniqueConstraintError") {
        reason = "Duplicate barcode — a product with this barcode already exists";
      } else if (dbErr.message) {
        reason = dbErr.message;
      }

      failures.push({ row: rowNum, product_name, reason });
      failed_count++;
    }
  }

  return res.status(200).json({
    message: "Bulk upload complete",
    success_count,
    failed_count,
    failures,
  });
};
