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
const generateInvoicePDF = require("../utils/generatePdf.js");
const { sendEmail, sendWhatsApp } = require("../utils/sendEmail");
const fs = require("fs");
const path = require("path");

// Helper to sanitize inputs
const sanitize = (val, def = null) => {
  if (val === undefined || val === null) return def;
  if (typeof val === "string" && val.trim() === "") return def;
  return val;
};

// Helper: given a raw invoice_item row (base_amount / total_with_gst / gst_percentage),
// compute the convenience aliases the frontend edit/preview forms expect
// (amount / cgst_amount / sgst_amount / total_including_gst). Item-level GST
// isn't split into cgst/sgst columns in the DB, so we derive an even split
// here — matching how the invoice header itself splits gst_amount into
// cgst_amount/sgst_amount.
const withItemAmountAliases = (itemJson) => {
  const rate = parseFloat(itemJson.rate || 0);
  const qty  = parseFloat(itemJson.quantity || 0);

  const baseAmount = itemJson.base_amount !== undefined && itemJson.base_amount !== null
    ? parseFloat(itemJson.base_amount)
    : rate * qty;

  const totalWithGst = itemJson.total_with_gst !== undefined && itemJson.total_with_gst !== null
    ? parseFloat(itemJson.total_with_gst)
    : baseAmount;

  const gstAmount = Math.max(0, totalWithGst - baseAmount);

  return {
    ...itemJson,
    // Convenience aliases — keep alongside the raw base_amount/total_with_gst
    // columns so both naming conventions work for any consumer.
    amount:               baseAmount.toFixed(2),
    cgst_amount:          (gstAmount / 2).toFixed(2),
    sgst_amount:          (gstAmount / 2).toFixed(2),
    total_including_gst:  totalWithGst.toFixed(2)
  };
};

const normalizeInvoiceDate = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
};

const buildInvoicePrefix = (tenantId, dateInput) => {
  const d = normalizeInvoiceDate(dateInput);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  // Safe handling for tenantId
  const tenantIdStr = (tenantId !== undefined && tenantId !== null && tenantId !== "") 
    ? String(tenantId).padStart(2, "0") 
    : "";
  
  // Format: INV{paddedTenantId}-DDMMYYYY  (e.g. INV01-31032026)
  const prefix = `INV${tenantIdStr}-${dd}${mm}${yyyy}`;
  console.log(`[InvoicePrefix] tenant_id=${tenantId} → prefix="${prefix}"`);
  return prefix;
};

const generateNextInvoiceNumber = async ({ tenant_id, invoiceDate, transaction = null }) => {
  const prefix = buildInvoicePrefix(tenant_id, invoiceDate);
  // Pad tenantId correctly for the regex search
  const tenantIdStr = String(tenant_id).padStart(2, "0");
  
  // Regex matches the standard pattern: INV{tenantId}-{8-digit-date}-{sequence}
  // e.g. ^INV01-[0-9]{8}-([0-9]+)$
  // This allows us to find the maximum sequence number used ever by this tenant,
  // regardless of which day the invoice was created on.
  const regexPattern = `^INV${tenantIdStr}-[0-9]{8}-([0-9]+)$`;

  const [row] = await invoices.sequelize.query(
    `
      SELECT
        COALESCE(
          MAX((substring(invoice_number FROM :regexPattern))::int),
          0
        ) AS max_seq
      FROM invoices
      WHERE tenant_id = :tenant_id
        AND invoice_number ~ :regexPattern
    `,
    {
      replacements: { tenant_id, regexPattern },
      type: invoices.sequelize.QueryTypes.SELECT,
      transaction
    }
  );

  const nextSeq = (Number(row?.max_seq) || 0) + 1;
  // Pad to minimum 3 digits (001...999), then grow naturally (1000, 9999, 10000)
  const seqStr = nextSeq < 1000 ? String(nextSeq).padStart(3, "0") : String(nextSeq);
  return `${prefix}-${seqStr}`;
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

// GET /api/invoices/next-number
exports.getNextInvoiceNumber = async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  if (!tenant_id) {
    return res.status(403).json({ success: false, message: "Tenant information missing." });
  }

  try {
    const invoiceDate = sanitize(req.query?.date) || new Date().toISOString().split("T")[0];
    const invoice_number = await generateNextInvoiceNumber({ tenant_id, invoiceDate });
    return res.status(200).json({ success: true, invoice_number });
  } catch (error) {
    console.error("❌ Error generating next invoice number:", error);
    return res.status(500).json({ success: false, message: "Failed to generate invoice number." });
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
    const resolvedInvoiceDate     = sanitize(customer.date) || createdAt.toISOString().split("T")[0];
    const generatedInvoiceNo      = await generateNextInvoiceNumber({
      tenant_id,
      invoiceDate: resolvedInvoiceDate,
      transaction: t
    });

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
      invoice_number:    generatedInvoiceNo,
      invoice_date:      resolvedInvoiceDate,
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
      invoice_status: 'pending_approval',
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
        reason:           `Invoice #${generatedInvoiceNo}`,
        reference_id:     String(invoice_id),
        updated_by:       String(sanitize(created_by, req.user.user_id))
      }, { transaction: t });
    }

    await t.commit();

    const invoicesDir = path.join(__dirname, "..", "..", "public", "invoices");
    if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

    const safeInvoiceNo = String(generatedInvoiceNo).replace(/[^a-zA-Z0-9-_]/g, "_");
    const fileName      = `invoice-${safeInvoiceNo}.pdf`;
    const filePath      = path.join(invoicesDir, fileName);
    const customerForPdf = {
      ...customer,
      invoiceNo: generatedInvoiceNo,
      date: resolvedInvoiceDate
    };

    try {
      await generateInvoicePDF({ customer: customerForPdf, products: reqProducts, summaryData }, filePath);
      return res.status(201).json({
        success: true,
        message: "Invoice created successfully",
        pdfUrl: `/invoices/${fileName}`,
        invoice_number: generatedInvoiceNo
      });
    } catch (pdfErr) {
      console.error("❌ PDF generation error:", pdfErr);
      return res.status(201).json({
        success: true,
        message: "Invoice created but PDF generation failed",
        pdfError: pdfErr.message,
        invoice_number: generatedInvoiceNo
      });
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

    // Fetch all sales_returns for this tenant to flag which invoices have returns
    const { sales_returns } = require("../models");
    const salesReturnsList = await sales_returns.findAll({
      where: { tenant_id },
      attributes: ["original_invoice_id"]
    });
    const invoicesWithReturns = new Set(
      salesReturnsList.map(r => r.original_invoice_id).filter(Boolean)
    );

    // Group items by invoice_id
    const itemsGrouped = {};
    itemsList.forEach(item => {
      const invId = item.invoice_id;
      if (!itemsGrouped[invId]) itemsGrouped[invId] = [];
      // FIX: previously spread only ...item.toJSON(), which exposes the raw
      // base_amount/total_with_gst columns but NOT the amount/cgst_amount/
      // sgst_amount/total_including_gst names that the edit/preview UIs read.
      // withItemAmountAliases() adds those aliases so per-item amounts show
      // up immediately instead of only after the row is edited.
      itemsGrouped[invId].push({
        ...withItemAmountAliases(item.toJSON()),
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

      // --- Prepare Base64 logo ---
      let logo_base64 = null;
      if (company && company.company_logo) {
        try {
          const logoPath = path.resolve(__dirname, "..", "..", "uploads", "logos", company.company_logo);
          if (fs.existsSync(logoPath)) {
            const fileData = fs.readFileSync(logoPath);
            const ext = path.extname(company.company_logo).toLowerCase();
            
            // Robust Mime-Type detection
            let mimeType = "image/jpeg";
            if (ext === ".png") mimeType = "image/png";
            else if (ext === ".webp") mimeType = "image/webp";
            else if (ext === ".svg") mimeType = "image/svg+xml";
            else if (ext === ".gif") mimeType = "image/gif";
            
            logo_base64 = `data:${mimeType};base64,${fileData.toString("base64")}`;
          }
        } catch (err) {
          console.error("Failed to read logo file for base64 in listing:", err);
        }
      }

      // ── Company (nested object for PDF generators) ──────────────────────
      const companyData = company ? {
        company_id:        company.id,
        company_name:      company.company_name,
        company_logo:      company.company_logo,
        logo_base64,      // ✅ NEW: Direct Base64 for PDF
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

        // ── Flag: invoice has associated sales return(s) ──────────────────
        has_sales_return: invoicesWithReturns.has(invoice.invoice_id),

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

    if (invoice.invoice_status === 'approved' || invoice.invoice_status === 'rejected') {
      return res.status(400).json({ message: "Approved or rejected invoices cannot be modified." });
    }

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

exports.getInvoiceById = async (req, res) => {
  const { invoice_id } = req.params;
  const tenant_id = req.user?.tenant_id;
  if (!tenant_id) return res.status(403).json({ message: "Tenant information missing." });

  try {
    const inv = await invoices.findOne({
      where: { invoice_id, tenant_id },
      include: [
        { model: customers, as: "customer", required: false },
        { model: users, as: "created_by_user", required: false, attributes: ["user_id", "first_name", "last_name"] },
        { model: billing_address, as: "billing_address", required: false }
      ]
    });

    if (!inv) return res.status(404).json({ message: "Invoice not found." });

    const itemsList = await invoice_items.findAll({
      where: { tenant_id, invoice_id },
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

    const invoice = inv.toJSON();
    const c = invoice.customer || {};
    const u = invoice.created_by_user || {};
    const b = invoice.billing_address || {};

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

    // FIX: this is the response FullInvoiceEditModal.jsx consumes.
    // Previously each item only had base_amount/total_with_gst (the raw
    // DB column names), while the modal's fetchInitialData() read
    // item.amount / item.cgst_amount / item.sgst_amount /
    // item.total_including_gst — all undefined on first load, so the
    // "Amount" column and the Grand Total showed blank until an edit
    // (quantity/rate change) triggered a client-side recalculation.
    // withItemAmountAliases() derives and attaches those exact field
    // names so everything is populated immediately.
    const fullItems = itemsList.map(item => ({
      ...withItemAmountAliases(item.toJSON()),
      product_name:        item.product?.product_name,
      product_description: item.product?.description,
      image_url:           item.product?.image_url,
      product_price:       item.product?.price,
      gst:                 item.product?.gst,
      c_gst:               item.product?.c_gst,
      s_gst:               item.product?.s_gst,
      discount:            item.product?.discount,
      category_name:       item.product?.category?.category_name
    }));

    res.json({
      ...invoice,
      ...customerFlat,
      ...billingFlat,
      created_by_name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
      items: fullItems,
      customer: {
        ...customerFlat,
        created_at: c.created_at || null
      }
    });

  } catch (err) {
    console.error("❌ Failed to fetch invoice by ID:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.approveInvoice = async (req, res) => {
  const { invoice_id } = req.params;
  const tenant_id = req.user?.tenant_id;
  if (!tenant_id) return res.status(403).json({ message: "Tenant information missing." });

  // Role check
  const userRole = String(req.user?.role || '').toLowerCase();
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return res.status(403).json({ message: "Access denied. Only administrators can approve invoices." });
  }

  try {
    const invoice = await invoices.findOne({ where: { invoice_id, tenant_id } });
    if (!invoice) return res.status(404).json({ message: "Invoice not found." });

    if (invoice.invoice_status === 'approved') {
      return res.status(400).json({ message: "Invoice is already approved." });
    }

    await invoice.update({
      invoice_status: 'approved',
      approved_by: req.user.user_id,
      approved_at: new Date()
    });

    res.json({ message: "Invoice approved successfully.", invoice_status: "approved" });
  } catch (err) {
    console.error("❌ Failed to approve invoice:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.rejectInvoice = async (req, res) => {
  const { invoice_id } = req.params;
  const { rejection_note } = req.body;
  const tenant_id = req.user?.tenant_id;
  if (!tenant_id) return res.status(403).json({ message: "Tenant information missing." });

  // Role check
  const userRole = String(req.user?.role || '').toLowerCase();
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return res.status(403).json({ message: "Access denied. Only administrators can reject invoices." });
  }

  try {
    const invoice = await invoices.findOne({ where: { invoice_id, tenant_id } });
    if (!invoice) return res.status(404).json({ message: "Invoice not found." });

    if (invoice.invoice_status === 'approved') {
      return res.status(400).json({ message: "Approved invoices cannot be rejected." });
    }

    await invoice.update({
      invoice_status: 'rejected',
      rejected_by: req.user.user_id,
      rejected_at: new Date(),
      rejection_note: rejection_note || null
    });

    res.json({ message: "Invoice rejected successfully.", invoice_status: "rejected" });
  } catch (err) {
    console.error("❌ Failed to reject invoice:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteInvoice = async (req, res) => {
  const { invoice_id } = req.params;
  const tenant_id = req.user?.tenant_id;
  if (!tenant_id) return res.status(403).json({ message: "Tenant information missing." });

  const t = await invoices.sequelize.transaction();
  try {
    const invoice = await invoices.findOne({ 
      where: { invoice_id, tenant_id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!invoice) {
      await t.rollback();
      return res.status(404).json({ message: "Invoice not found." });
    }

    if (invoice.invoice_status !== 'pending_approval') {
      await t.rollback();
      return res.status(400).json({ message: "Only invoices pending approval can be deleted." });
    }

    // Get all invoice items
    const items = await invoice_items.findAll({ 
      where: { tenant_id, invoice_id }, 
      transaction: t 
    });

    // Restore stocks and log stock movements
    for (const item of items) {
      const productRecord = await products.findOne({
        where: { tenant_id, product_id: item.product_id },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (productRecord) {
        const currentStock = productRecord.stock_quantity ?? 0;
        const newStock = currentStock + item.quantity;

        await productRecord.update({ stock_quantity: newStock }, { transaction: t });

        await stock_movements.create({
          tenant_id,
          product_id:       item.product_id,
          change_type:      "IN",
          quantity_changed: item.quantity,
          old_stock:        currentStock,
          new_stock:        newStock,
          reference_type:   "invoice",
          reason:           `Invoice #${invoice.invoice_number} deleted`,
          reference_id:     String(invoice_id),
          updated_by:       String(req.user.user_id)
        }, { transaction: t });
      }
    }

    // Delete invoice items
    await invoice_items.destroy({ 
      where: { tenant_id, invoice_id }, 
      transaction: t 
    });

    // Delete invoice
    await invoice.destroy({ transaction: t });

    await t.commit();
    res.json({ message: "Invoice deleted successfully and stock restored." });
  } catch (err) {
    await t.rollback();
    console.error("❌ Failed to delete invoice:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.editInvoice = async (req, res) => {
  const { invoice_id } = req.params;
  const tenant_id = req.user?.tenant_id;
  if (!tenant_id) {
    return res.status(403).json({ success: false, message: "Tenant information missing." });
  }

  const t = await invoices.sequelize.transaction();

  try {
    const invoice = await invoices.findOne({
      where: { invoice_id, tenant_id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!invoice) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }

    if (invoice.invoice_status !== 'pending_approval') {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Only invoices pending approval can be edited." });
    }

    const { customer, products: reqProducts, summaryData, ewayData, billing_address_id } = req.body;

    if (!customer || !reqProducts?.length || !summaryData) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Missing required invoice data." });
    }

    // 1. Restore stock from previous items
    const previousItems = await invoice_items.findAll({
      where: { tenant_id, invoice_id },
      transaction: t
    });

    for (const item of previousItems) {
      const productRecord = await products.findOne({
        where: { tenant_id, product_id: item.product_id },
        transaction: t,
        lock: t.LOCK.UPDATE
      });
      if (productRecord) {
        const currentStock = productRecord.stock_quantity ?? 0;
        await productRecord.update({ stock_quantity: currentStock + item.quantity }, { transaction: t });
      }
    }

    // Delete old items
    try {
      await invoice_items.destroy({
        where: { tenant_id, invoice_id },
        transaction: t
      });
    } catch (err) {
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        throw new Error("Cannot edit invoice: it has associated sales returns which must be deleted first.");
      }
      throw err;
    }

    // 2. Validate and deduct stock for new items
    for (const p of reqProducts) {
      const productRecord = await products.findOne({
        where: { tenant_id, product_id: p.product_id },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!productRecord) throw new Error(`Product not found for ID ${p.product_id}`);

      const currentStock = productRecord.stock_quantity ?? 0;
      const newStock = currentStock - p.quantity;

      if (newStock < 0) {
        throw new Error(
          `Insufficient stock for "${productRecord.product_name}" (ID: ${p.product_id}). ` +
          `Available: ${currentStock}, Requested: ${p.quantity}`
        );
      }

      await productRecord.update({ stock_quantity: newStock }, { transaction: t });

      // Create new invoice item
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

      // Log stock movement
      await stock_movements.create({
        tenant_id,
        product_id:       p.product_id,
        change_type:      "OUT",
        quantity_changed: p.quantity,
        old_stock:        currentStock,
        new_stock:        newStock,
        reference_type:   "invoice",
        reason:           `Invoice #${invoice.invoice_number} edited`,
        reference_id:     String(invoice_id),
        updated_by:       String(req.user.user_id)
      }, { transaction: t });
    }

    // 3. Find or update customer
    let customerRecord = null;
    const customerGst = sanitize(customer.gst);
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
        consignee_name:            sanitize(customer.consignee_name)            ?? customerRecord.consignee_name,
        consignee_gst_number:      sanitize(customer.consignee_gst)             ?? customerRecord.consignee_gst_number,
        consignee_mobile:          sanitize(customer.consignee_mobile)          ?? customerRecord.consignee_mobile,
        consignee_email:           sanitize(customer.consignee_email)           ?? customerRecord.consignee_email,
        consignee_address:         sanitize(customer.consignee_address)         ?? customerRecord.consignee_address,
        consignee_state:           sanitize(customer.consignee_state)           ?? customerRecord.consignee_state,
        consignee_pincode:         sanitize(customer.consignee_pincode)         ?? customerRecord.consignee_pincode,
        consignee_place_of_supply: sanitize(customer.consignee_placeOfSupply)   ?? customerRecord.consignee_place_of_supply,
        consignee_vehicle_number:  sanitize(customer.consignee_vehicleNo)       ?? customerRecord.consignee_vehicle_number
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

    const customer_id = customerRecord.customer_id;
    const paymentType = sanitize(summaryData.paymentType, "Cash");
    const paymentStatus = sanitize(summaryData.paymentStatus, "Full Payment");
    const advanceAmount = sanitize(summaryData.advanceAmount, 0);
    const dueDate = paymentStatus === "Advance" ? sanitize(summaryData.dueDate) : null;
    const paymentCompletionStatus = paymentStatus === "Advance" && advanceAmount > 0 ? "Pending" : "Completed";
    const resolvedInvoiceDate = sanitize(customer.date) || invoice.invoice_date;
    const place_of_dispatch = sanitize(ewayData?.place_of_dispatch);

    // 4. Update the invoice row
    // Preserve existing billing_address_id if not explicitly sent from frontend
    const resolvedBillingAddressId = billing_address_id != null
      ? billing_address_id
      : invoice.billing_address_id;
    await invoice.update({
      billing_address_id: resolvedBillingAddressId,
      customer_id,
      invoice_date:      resolvedInvoiceDate,
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
      payment_settlement_date:   paymentStatus === "Full Payment" ? new Date().toISOString().split("T")[0] : null,
      eway_bill_no:      ewayData ? sanitize(ewayData.eway_bill_no) : invoice.eway_bill_no,
      eway_bill_date:    ewayData ? sanitize(ewayData.eway_bill_date) : invoice.eway_bill_date,
      transporter_name:  ewayData ? sanitize(ewayData.transporter_name) : invoice.transporter_name,
      transporter_gst_number: ewayData ? sanitize(ewayData.transporter_gst_number) : invoice.transporter_gst_number,
      transport_mode:    ewayData ? sanitize(ewayData.transport_mode) : invoice.transport_mode,
      transport_distance: ewayData ? sanitize(ewayData.transport_distance) : invoice.transport_distance,
      eway_valid_upto:   ewayData ? sanitize(ewayData.eway_valid_upto) : invoice.eway_valid_upto,
      transaction_type:  ewayData ? sanitize(ewayData.transaction_type) : invoice.transaction_type,
      supply_type:       ewayData ? sanitize(ewayData.supply_type) : invoice.supply_type,
      document_type:     ewayData ? sanitize(ewayData.document_type) : invoice.document_type
    }, { transaction: t });

    await t.commit();

    // 5. Regenerate PDF
    const invoicesDir = path.join(__dirname, "..", "..", "public", "invoices");
    if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

    const safeInvoiceNo = String(invoice.invoice_number).replace(/[^a-zA-Z0-9-_]/g, "_");
    const fileName = `invoice-${safeInvoiceNo}.pdf`;
    const filePath = path.join(invoicesDir, fileName);
    const customerForPdf = {
      ...customer,
      invoiceNo: invoice.invoice_number,
      date: resolvedInvoiceDate
    };

    try {
      await generateInvoicePDF({ customer: customerForPdf, products: reqProducts, summaryData }, filePath);
      return res.status(200).json({
        success: true,
        message: "Invoice updated successfully",
        pdfUrl: `/invoices/${fileName}`,
        invoice_number: invoice.invoice_number
      });
    } catch (pdfErr) {
      console.error("❌ PDF generation error on edit:", pdfErr);
      return res.status(200).json({
        success: true,
        message: "Invoice updated but PDF generation failed",
        pdfError: pdfErr.message,
        invoice_number: invoice.invoice_number
      });
    }

  } catch (error) {
    await t.rollback();
    console.error("❌ Error updating invoice:", error);
    return res.status(400).json({ success: false, message: error.message || "Server error while updating invoice" });
  }
};