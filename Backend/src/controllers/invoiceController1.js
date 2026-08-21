const {
  invoices,
  invoice_items,
  customers,
  products,
  stock_movements,
  company_info,
  users,
  billing_address
} = require("../models");
const fs = require("fs");
const path = require("path");
const generateInvoicePDF = require("../utils/generatePdf.js");
const { sendEmail, sendWhatsApp } = require("../utils/sendEmail");

// Helper to sanitize inputs
const sanitize = (val, def = null) => {
  if (val === undefined || val === null) return def;
  if (typeof val === "string" && val.trim() === "") return def;
  return val;
};

// GET /api/invoices/customers
exports.getCustomers = async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  if (!tenant_id) {
    return res.status(403).json({ success: false, message: "Tenant information missing." });
  }
  try {
    const customerList = await customers.findAll({
      where: { tenant_id },
      attributes: [
        "customer_id", "name", "mobile", "whatsapp_number", "gst_number",
        "email", "address", "state", "pincode", "place_of_supply",
        "vehicle_number", "consignee_name", "consignee_gst_number",
        "consignee_mobile", "consignee_email", "consignee_address",
        "consignee_state", "consignee_pincode", "consignee_place_of_supply",
        "consignee_vehicle_number"
      ],
      order: [["created_at", "DESC"]]
    });
    res.json(customerList || []);
  } catch (error) {
    console.error("❌ Error fetching customers:", error);
    res.status(500).json({ success: false, message: "Failed to fetch customers." });
  }
};

// POST /api/invoices/send-invoice-to
exports.sendInvoiceTo = async (req, res) => {
  try {
    const { email, mobile, invoice_number } = req.body;
    const pdfBuffer = req.file?.buffer;
    const tenant_id = req.user?.tenant_id;

    if (!tenant_id) return res.status(403).json({ message: "Tenant information missing." });
    if (!email)     return res.status(400).json({ message: "Customer email is required." });
    if (!pdfBuffer) return res.status(400).json({ message: "Invoice PDF file is required." });

    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempPath = path.join(tempDir, `Invoice_${invoice_number || Date.now()}.pdf`);
    fs.writeFileSync(tempPath, pdfBuffer);

    const info = await sendEmail(email, invoice_number, pdfBuffer);
    if (mobile) await sendWhatsApp(mobile, invoice_number, tempPath);
    fs.unlinkSync(tempPath);

    // Provide detailed log in backend but always return success if API accepted it
    console.log("📨 Email API Response:", info);
    
    return res.status(200).json({ success: true, message: "Invoice sent via email and WhatsApp.", api_info: info });
  } catch (err) {
    console.error("Send invoice failed:", err);
    return res.status(500).json({ success: false, message: "Failed to send invoice.", detail: err.message });
  }
};

// POST /api/invoices/create
exports.createInvoice = async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  if (!tenant_id) {
    return res.status(403).json({ success: false, message: "Tenant information missing." });
  }

  const t = await invoices.sequelize.transaction();

  try {
    const tenantCompany = await company_info.findOne({
      where: { id: tenant_id },
      attributes: ["subscription_type"],
      transaction: t
    });

    if (!tenantCompany) {
      await t.rollback();
      return res.status(403).json({ success: false, message: "Tenant not found." });
    }

    if (tenantCompany.subscription_type === "bill") {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: "Your subscription does not allow creating invoices."
      });
    }

    const { customer, products: reqProducts, summaryData, created_by, ewayData, billing_address_id } = req.body;

    if (!customer || !reqProducts?.length || !summaryData) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Missing required invoice data." });
    }

    const paymentType             = sanitize(summaryData.paymentType, "Cash");
    const paymentStatus           = sanitize(summaryData.paymentStatus, "Full Payment");
    const advanceAmount           = sanitize(summaryData.advanceAmount, 0);
    const dueDate                 = paymentStatus === "Advance" ? sanitize(summaryData.dueDate) : null;
    const paymentCompletionStatus = paymentStatus === "Advance" && advanceAmount > 0 ? "Pending" : "Completed";
    const createdAt               = new Date();
    const paymentSettlementDate   = paymentStatus === "Full Payment" ? createdAt.toISOString().split("T")[0] : null;

    // Find or create customer
    let customerRecord  = null;
    const customerGst    = sanitize(customer.gst);
    const customerMobile = sanitize(customer.mobile);

    if (customerGst) {
      customerRecord = await customers.findOne({ where: { tenant_id, gst_number: customerGst }, transaction: t });
    } else if (customerMobile) {
      customerRecord = await customers.findOne({ where: { tenant_id, mobile: customerMobile }, transaction: t });
    }

    if (customerRecord) {
      await customerRecord.update({
        name:            sanitize(customer.name)            ?? customerRecord.name,
        email:           sanitize(customer.email)           ?? customerRecord.email,
        address:         sanitize(customer.address)         ?? customerRecord.address,
        state:           sanitize(customer.state)           ?? customerRecord.state,
        pincode:         sanitize(customer.pincode)         ?? customerRecord.pincode,
        place_of_supply: sanitize(customer.placeOfSupply)   ?? customerRecord.place_of_supply,
        vehicle_number:  sanitize(customer.vehicleNo)       ?? customerRecord.vehicle_number,
        whatsapp_number: sanitize(customer.whatsapp_number) ?? customerRecord.whatsapp_number,
        consignee_name:            sanitize(customer.consignee_name),
        consignee_gst_number:      sanitize(customer.consignee_gst),
        consignee_mobile:          sanitize(customer.consignee_mobile),
        consignee_email:           sanitize(customer.consignee_email),
        consignee_address:         sanitize(customer.consignee_address),
        consignee_state:           sanitize(customer.consignee_state),
        consignee_pincode:         sanitize(customer.consignee_pincode),
        consignee_place_of_supply: sanitize(customer.consignee_placeOfSupply),
        consignee_vehicle_number:  sanitize(customer.consignee_vehicleNo)
      }, { transaction: t });
    } else {
      customerRecord = await customers.create({
        tenant_id,
        name:            sanitize(customer.name),
        mobile:          sanitize(customer.mobile),
        gst_number:      sanitize(customer.gst),
        email:           sanitize(customer.email),
        whatsapp_number: sanitize(customer.whatsapp_number),
        address:         sanitize(customer.address),
        state:           sanitize(customer.state),
        pincode:         sanitize(customer.pincode),
        place_of_supply: sanitize(customer.placeOfSupply),
        vehicle_number:  sanitize(customer.vehicleNo),
        consignee_name:            sanitize(customer.consignee_name),
        consignee_gst_number:      sanitize(customer.consignee_gst),
        consignee_mobile:          sanitize(customer.consignee_mobile),
        consignee_email:           sanitize(customer.consignee_email),
        consignee_address:         sanitize(customer.consignee_address),
        consignee_state:           sanitize(customer.consignee_state),
        consignee_pincode:         sanitize(customer.consignee_pincode),
        consignee_place_of_supply: sanitize(customer.consignee_placeOfSupply),
        consignee_vehicle_number:  sanitize(customer.consignee_vehicleNo)
      }, { transaction: t });
    }

    const customer_id       = customerRecord.customer_id;
    const place_of_dispatch = sanitize(ewayData?.place_of_dispatch);

    const newInvoice = await invoices.create({
      tenant_id,
      billing_address_id: sanitize(billing_address_id, null),
      customer_id,
      invoice_number:    sanitize(customer.invoiceNo),
      invoice_date:      sanitize(customer.date),
      place_of_supply:   sanitize(customer.placeOfSupply),
      place_of_dispatch,
      vehicle_number:    sanitize(customer.vehicleNo),
      subtotal:          sanitize(summaryData.totalWithGst, 0),
      gst_percentage:    sanitize(summaryData.gst, 0),
      gst_amount:        sanitize(summaryData.gstCost, 0),
      cgst_amount:       sanitize(summaryData.cgstCost, 0),
      sgst_amount:       sanitize(summaryData.sgstCost, 0),
      discount_type:     sanitize(summaryData.discountType, "%"),
      discount_value:    sanitize(summaryData.discountValue, 0),
      transport_charge:  sanitize(summaryData.transportCharge, 0),
      total_amount:      sanitize(summaryData.total, 0),
      payment_type:      paymentType,
      payment_status:    paymentStatus,
      advance_amount:    advanceAmount,
      due_date:          dueDate,
      payment_completion_status: paymentCompletionStatus,
      payment_settlement_date:   paymentSettlementDate,
      created_by: sanitize(created_by, req.user.user_id),
    }, { transaction: t });

    const invoice_id = newInvoice.invoice_id;

    for (const p of reqProducts) {
      await invoice_items.create({
        tenant_id,
        invoice_id,
        product_id:     sanitize(p.product_id),
        hsn_code:       sanitize(p.hsn_code),
        quantity:       sanitize(p.quantity, 0),
        unit:           sanitize(p.unit),
        rate:           sanitize(p.rate, 0),
        gst_percentage: sanitize(p.gst, 0),
        base_amount:    sanitize(p.amount, 0),
        total_with_gst: sanitize(p.priceIncludingGst, 0)
      }, { transaction: t });

      const productRecord = await products.findOne({
        where: { tenant_id, product_id: p.product_id },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!productRecord) throw new Error(`Product not found for ID ${p.product_id}`);

      const currentStock = productRecord.stock_quantity ?? 0;
      const newStock     = currentStock - p.quantity;

      if (newStock < 0) {
        throw new Error(
          `Insufficient stock for "${productRecord.product_name}" (ID: ${p.product_id}). ` +
          `Available: ${currentStock}, Requested: ${p.quantity}`
        );
      }

      await productRecord.update({ stock_quantity: newStock }, { transaction: t });

      await stock_movements.create({
        tenant_id,
        product_id:       p.product_id,
        change_type:      "OUT",
        quantity_changed: p.quantity,
        old_stock:        currentStock,
        new_stock:        newStock,
        reference_type:   "invoice",
        reason:           `Invoice #${sanitize(customer.invoiceNo)}`,
        reference_id:     String(invoice_id),
        updated_by:       String(sanitize(created_by, req.user.user_id))
      }, { transaction: t });
    }

    await t.commit();

    const invoicesDir = path.join(__dirname, "..", "..", "public", "invoices");
    if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

    const safeInvoiceNo = String(customer.invoiceNo).replace(/[^a-zA-Z0-9-_]/g, "_");
    const fileName      = `invoice-${safeInvoiceNo}.pdf`;
    const filePath      = path.join(invoicesDir, fileName);

    try {
      await generateInvoicePDF({ customer, products: reqProducts, summaryData }, filePath);
      return res.status(201).json({ success: true, message: "Invoice created successfully", pdfUrl: `/invoices/${fileName}` });
    } catch (pdfErr) {
      console.error("❌ PDF generation error:", pdfErr);
      return res.status(201).json({ success: true, message: "Invoice created but PDF generation failed", pdfError: pdfErr.message });
    }

  } catch (error) {
    await t.rollback();
    console.error("❌ Error creating invoice:", error);
    return res.status(400).json({ success: false, message: error.message || "Server error while creating invoice" });
  }
};

// GET /api/invoices/get-invoice
exports.getInvoices = async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  if (!tenant_id) {
    return res.status(403).json({ message: "Tenant information missing." });
  }

  try {
    // Fetch company — use correct schema column names (NOT phone/state/pincode)
    const company = await company_info.findOne({ where: { id: tenant_id } });

    const invoicesList = await invoices.findAll({
      where: { tenant_id },
      include: [
        { model: customers,       as: "customer",        required: false },
        { model: users,           as: "created_by_user", required: false, attributes: ["user_id", "first_name", "last_name"] },
        { model: billing_address, as: "billing_address", required: false }
      ],
      order: [["created_at", "DESC"]]
    });

    const itemsList = await invoice_items.findAll({
      where: { tenant_id },
      include: [
        {
          model: products,
          as: "product",
          required: false,
          include: [
            { model: require("../models").product_categories, as: "category", required: false }
          ]
        }
      ]
    });

    // Group items by invoice_id
    const itemsGrouped = {};
    itemsList.forEach(item => {
      const invId = item.invoice_id;
      if (!itemsGrouped[invId]) itemsGrouped[invId] = [];
      itemsGrouped[invId].push({
        ...item.toJSON(),
        product_name:        item.product?.product_name,
        product_description: item.product?.description,
        image_url:           item.product?.image_url,
        product_price:       item.product?.price,
        gst:                 item.product?.gst,
        c_gst:               item.product?.c_gst,
        s_gst:               item.product?.s_gst,
        discount:            item.product?.discount,
        category_name:       item.product?.category?.category_name
      });
    });

    const fullInvoices = invoicesList.map(inv => {
      const invoice = inv.toJSON();
      const c = invoice.customer        || {};  // customer row
      const u = invoice.created_by_user || {};  // user row
      const b = invoice.billing_address || {};  // billing_address row

      // ── Company (nested object for PDF generators) ──────────────────────
      const companyData = company ? {
        company_id:        company.id,
        company_name:      company.company_name,
        company_logo:      company.company_logo,
        gst_no:            company.gst_no,          // ✅ correct column name
        pan_no:            company.pan_no,
        email:             company.email,
        website:           company.website,
        address:           company.address,
        cell_no1:          company.cell_no1,         // ✅ correct column name (not "phone")
        cell_no2:          company.cell_no2,
        account_name:      company.account_name,
        bank_name:         company.bank_name,
        branch_name:       company.branch_name,
        ifsc_code:         company.ifsc_code,
        account_number:    company.account_number,
        subscription_type: company.subscription_type,
      } : null;

      // ── Flatten billing_address → billing_address_* top-level fields ────
      // PreviewModal reads: invoice.billing_address_name,
      //   invoice.billing_address_address, invoice.billing_address_gst_no, etc.
      // PartyMaster reads: item.billing_address_name for "Billed From" column
      const hasBilling = !!invoice.billing_address_id;
      const billingFlat = {
        billing_address_name:           hasBilling ? b.address_name    : null,
        billing_address_address:        hasBilling ? b.address         : null,
        billing_address_cell_no1:       hasBilling ? b.cell_no1        : null,
        billing_address_cell_no2:       hasBilling ? b.cell_no2        : null,
        billing_address_gst_no:         hasBilling ? b.gst_no          : null,
        billing_address_pan_no:         hasBilling ? b.pan_no          : null,
        billing_address_account_name:   hasBilling ? b.account_name    : null,
        billing_address_bank_name:      hasBilling ? b.bank_name       : null,
        billing_address_branch_name:    hasBilling ? b.branch_name     : null,
        billing_address_ifsc_code:      hasBilling ? b.ifsc_code       : null,
        billing_address_account_number: hasBilling ? b.account_number  : null,
        billing_address_email:          hasBilling ? b.email           : null,
        billing_address_website:        hasBilling ? b.website         : null,
      };

      // ── Flatten customer → customer_* and consignee_* top-level fields ──
      // PartyMaster reads: item.customer_name, item.customer_mobile, item.customer_gst_number
      // PreviewModal reads: invoice.customer_name, invoice.customer_address,
      //   invoice.customer_state, invoice.customer_pincode,
      //   invoice.customer_gst_number, invoice.customer_email,
      //   invoice.customer_whatsapp_number,
      //   invoice.consignee_name, invoice.consignee_mobile,
      //   invoice.consignee_address, invoice.consignee_state,
      //   invoice.consignee_pincode, invoice.consignee_gst_number,
      //   invoice.consignee_email
      const customerFlat = {
        customer_id:               c.customer_id       || null,
        customer_name:             c.name              || null,
        customer_mobile:           c.mobile            || null,
        customer_whatsapp_number:  c.whatsapp_number   || null,
        customer_gst_number:       c.gst_number        || null,
        customer_email:            c.email             || null,
        customer_address:          c.address           || null,
        customer_state:            c.state             || null,
        customer_pincode:          c.pincode           || null,
        customer_place_of_supply:  c.place_of_supply   || null,
        customer_vehicle_number:   c.vehicle_number    || null,
        // Consignee — flat at top level (used by PreviewModal Consignee section)
        consignee_name:             c.consignee_name            || null,
        consignee_gst_number:       c.consignee_gst_number      || null,
        consignee_mobile:           c.consignee_mobile          || null,
        consignee_email:            c.consignee_email           || null,
        consignee_address:          c.consignee_address         || null,
        consignee_state:            c.consignee_state           || null,
        consignee_pincode:          c.consignee_pincode         || null,
        consignee_place_of_supply:  c.consignee_place_of_supply || null,
        consignee_vehicle_number:   c.consignee_vehicle_number  || null,
      };

      return {
        // ── Invoice base columns (invoice_id, invoice_number, total_amount, etc.) ──
        ...invoice,

        // ── Flattened customer fields at top level ───────────────────────
        // These overwrite any same-named keys from invoice spread above
        ...customerFlat,

        // ── Flattened billing_address fields at top level ─────────────────
        ...billingFlat,

        // ── Creator name ──────────────────────────────────────────────────
        created_by_name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),

        // ── Company nested object (used by PDF generators) ────────────────
        company: companyData,

        // ── Items array ───────────────────────────────────────────────────
        items: itemsGrouped[invoice.invoice_id] || [],

        // ── Keep nested customer object as well (used by PDF generators) ──
        customer: {
          ...customerFlat,
          created_at: c.created_at || null,
        },

        // ── Keep nested billing_address object (used by PDF generators) ───
        billing_address: hasBilling ? {
          billing_address_id: b.billing_address_id,
          address_name:       b.address_name,
          address:            b.address,
          cell_no1:           b.cell_no1,
          cell_no2:           b.cell_no2,
          gst_no:             b.gst_no,
          pan_no:             b.pan_no,
          account_name:       b.account_name,
          bank_name:          b.bank_name,
          branch_name:        b.branch_name,
          ifsc_code:          b.ifsc_code,
          account_number:     b.account_number,
          email:              b.email,
          website:            b.website,
          is_active:          b.is_active,
          created_at:         b.created_at,
          updated_at:         b.updated_at,
        } : null,
      };
    });

    res.json(fullInvoices);

  } catch (err) {
    console.error("❌ Failed to fetch invoices:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// PUT /api/invoices/update/:invoice_id
exports.updateInvoice = async (req, res) => {
  const { invoice_id } = req.params;
  const { advance_amount, due_date, payment_status, payment_completion_status, payment_settlement_date } = req.body;

  const tenant_id = req.user?.tenant_id;
  if (!tenant_id) return res.status(403).json({ message: "Tenant information missing." });

  try {
    const invoice = await invoices.findOne({ where: { invoice_id, tenant_id } });
    if (!invoice) return res.status(404).json({ message: "Invoice not found." });

    const allowedStatus = ["Full Payment", "Advance"];
    if (!allowedStatus.includes(payment_status)) {
      return res.status(400).json({ message: "Invalid payment_status value." });
    }

    await invoice.update({
      advance_amount:            advance_amount || 0,
      due_date:                  due_date || null,
      payment_status,
      payment_completion_status: payment_completion_status || "Completed",
      payment_settlement_date:   payment_settlement_date || null,
    });

    res.json({ message: "Invoice updated successfully." });
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(500).json({ message: "Server error while updating invoice." });
  }
};