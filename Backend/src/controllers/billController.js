const {
  bills,
  bill_items,
  products,
  stock_movements,
  company_info,
  users
} = require("../models");
const fs = require("fs");
const path = require("path");

// Utility to sanitize inputs and provide default values
const sanitize = (val, def = null) => {
  if (val === undefined || val === null) return def;
  if (typeof val === "string" && val.trim() === "") return def;
  return val;
};

// GET /api/bills/get-bill
exports.getBills = async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  if (!tenant_id) {
    return res.status(403).json({ message: "Tenant information missing in token." });
  }

  try {
    const billsList = await bills.findAll({
      where: { tenant_id },
      include: [
        { model: users, as: "created_by_user", required: false, attributes: ["user_id", "first_name", "last_name"] },
        { model: company_info, as: "tenant", required: false }
      ],
      order: [["created_at", "DESC"]]
    });

    const itemsList = await bill_items.findAll({
      where: { tenant_id },
      include: [
        { 
          model: products, 
          as: "product", 
          where: { tenant_id }, 
          required: false,
          include: [{ model: require("../models").product_categories, as: "category", required: false }]
        }
      ]
    });

    // Group items
    const itemsGrouped = {};
    itemsList.forEach(item => {
      const bId = item.bill_id;
      if (!itemsGrouped[bId]) itemsGrouped[bId] = [];
      itemsGrouped[bId].push({
        ...item.toJSON(),
        product_name: item.product?.product_name,
        product_description: item.product?.description,
        image_url: item.product?.image_url,
        product_price: item.product?.price,
        gst: item.product?.gst,
        c_gst: item.product?.c_gst,
        s_gst: item.product?.s_gst,
        discount: item.product?.discount,
        category_name: item.product?.category?.category_name
      });
    });

    const fullBills = billsList.map(b => {
      const bill = b.toJSON();
      const u = bill.created_by_user || {};
      const c = bill.tenant || {};

      return {
        ...bill,
        created_by_name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
        items: itemsGrouped[bill.bill_id] || [],
        company: {
          name: c.company_name,
          logo: c.company_logo,
          logo_base64: (() => {
            if (c.company_logo) {
              try {
                // Use path.resolve for robustness
                const logoPath = path.resolve(__dirname, "..", "..", "uploads", "logos", c.company_logo);
                if (fs.existsSync(logoPath)) {
                  const fileData = fs.readFileSync(logoPath);
                  const ext = path.extname(c.company_logo).toLowerCase();
                  
                  // Robust Mime-Type detection
                  let mimeType = "image/jpeg";
                  if (ext === ".png") mimeType = "image/png";
                  else if (ext === ".webp") mimeType = "image/webp";
                  else if (ext === ".svg") mimeType = "image/svg+xml";
                  else if (ext === ".gif") mimeType = "image/gif";

                  return `data:${mimeType};base64,${fileData.toString("base64")}`;
                }
              } catch (err) {
                console.error("Failed to read logo file for base64 in bill listing:", err);
              }
            }
            return null;
          })(), // ✅ NEW: Direct Base64 for PDF
          address: c.address,
          mobile1: c.cell_no1,
          mobile2: c.cell_no2,
          gst_no: c.gst_no,
          email: c.email,
          website: c.website,
        }
      };
    });

    res.json(fullBills);

  } catch (err) {
    console.error("❌ Failed to fetch bills:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// PUT /api/bills/update-bill/:bill_id
exports.updateBill = async (req, res) => {
  const { bill_id } = req.params;
  const {
    advance_amount,
    due_date,
    payment_status,
    billNo,
    bill_no: bill_no_alt,
    customer_name,
    mobile_no,
  } = req.body;

  const tenant_id = req.user?.tenant_id;
  if (!tenant_id) {
    return res.status(403).json({ message: "Tenant information missing in token." });
  }

  const actualBillNo = billNo || bill_no_alt;

  try {
    const bill = await bills.findOne({ where: { bill_id, tenant_id: req.user.tenant_id } });
    if (!bill) {
      return res.status(404).json({ message: "Bill not found." });
    }

    await bill.update({
      advance_amount: advance_amount || 0,
      due_date: due_date || null,
      payment_status,
      payment_completion_status: payment_completion_status || "Completed",
      payment_settlement_date: payment_settlement_date || null,
      customer_name: customer_name || bill.customer_name,
      mobile_no: mobile_no || bill.mobile_no,
      bill_no: actualBillNo || bill.bill_no,
      bill_number: actualBillNo || bill.bill_no,
    });

    res.json({ message: "Bill updated successfully." });
  } catch (error) {
    console.error("Error updating bill:", error);
    res.status(500).json({ message: "Server error while updating bill." });
  }
};

// POST /api/bills/create
exports.createBill = async (req, res) => {
  const tenant_id = req.user?.tenant_id;

  if (!tenant_id) {
    return res.status(403).json({ success: false, message: "Tenant information missing." });
  }
  
  const { customer = {}, products: reqProducts = [], summaryData = {}, created_by } = req.body;

  const actualBillNo = customer.billNo || customer.bill_no;

  if (!actualBillNo) {
    return res.status(400).json({ success: false, message: "Bill number is required." });
  }

  const t = await bills.sequelize.transaction();

  try {
    const tenantCompany = await company_info.findOne({
      where: { id: tenant_id },
      attributes: ["subscription_type"],
      transaction: t
    });

    if (!tenantCompany) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    if (tenantCompany.subscription_type === "invoice") {
      await t.rollback();
      return res.status(403).json({ success: false, message: "Your subscription does not allow bill creation." });
    }

    const createdAt = new Date();
    
    // 1. Insert Bill Header
    const newBill = await bills.create({
      tenant_id,
      customer_name: sanitize(customer.name),
      mobile_no: sanitize(customer.mobile),
      bill_no: sanitize(actualBillNo),
      bill_number: sanitize(actualBillNo), // Handle duplicate legacy field
      bill_date: sanitize(customer.date) || createdAt.toISOString().split("T")[0],
      subtotal: sanitize(summaryData.totalWithGst, 0),
      gst_percentage: sanitize(summaryData.gst, 0),
      gst_amount: sanitize(summaryData.gstCost, 0),
      cgst_amount: sanitize(summaryData.cgstCost, 0),
      sgst_amount: sanitize(summaryData.sgstCost, 0),
      discount_type: sanitize(summaryData.discountType, "%"),
      discount_value: sanitize(summaryData.discountValue, 0),
      transport_charge: sanitize(summaryData.transportCharge, 0),
      total_amount: sanitize(summaryData.total, 0),
      payment_type: sanitize(summaryData.paymentType, "Cash"),
      payment_status: sanitize(summaryData.paymentStatus, "Full Payment"),
      advance_amount: sanitize(summaryData.advanceAmount, 0),
      due_date: sanitize(summaryData.dueDate, null),
      payment_completion_status: sanitize(summaryData.paymentStatus === "Advance" && summaryData.advanceAmount > 0 ? "Pending" : "Completed"),
      payment_settlement_date: sanitize(summaryData.paymentStatus === "Full Payment" ? createdAt.toISOString().split("T")[0] : null),
      created_by: sanitize(created_by, req.user.user_id)
    }, { transaction: t });

    const bill_id = newBill.bill_id;

    // 2. Insert Bill Items and Update Stock
    for (const p of reqProducts) {
      await bill_items.create({
        tenant_id,
        bill_id,
        product_id: sanitize(p.product_id),
        hsn_code: sanitize(p.hsn_code),
        quantity: sanitize(p.quantity, 0),
        unit: sanitize(p.unit),
        rate: sanitize(p.rate, 0),
        gst_percentage: sanitize(p.gst, 0),
        base_amount: sanitize(p.amount, 0),
        total_with_gst: sanitize(p.priceIncludingGst, 0)
      }, { transaction: t });

      const productRecord = await products.findOne({
        where: { tenant_id, product_id: p.product_id },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!productRecord) {
        throw new Error(`Product not found for ID ${p.product_id}`);
      }

      const currentStock = productRecord.stock_quantity ?? 0;
      const newStock = currentStock - p.quantity;

      if (newStock < 0) {
        throw new Error(`Insufficient stock for product ID ${p.product_id}`);
      }

      await productRecord.update({ stock_quantity: newStock }, { transaction: t });

      await stock_movements.create({
        tenant_id,
        product_id: p.product_id,
        change_type: 'OUT',
        quantity_changed: p.quantity,
        old_stock: currentStock,
        new_stock: newStock,
        reason: `Bill #${sanitize(actualBillNo)}`,
        reference_id: bill_id,
        updated_by: String(sanitize(created_by, req.user.user_id))
      }, { transaction: t });
    }

    await t.commit();

    return res.status(201).json({
      success: true,
      message: "Bill created successfully",
      bill_id
    });
  } catch (err) {
    await t.rollback();
    console.error("❌ Error creating bill:", err);
    return res.status(400).json({ 
      success: false, 
      message: err.message || "Server error while creating bill" 
    });
  }
};
