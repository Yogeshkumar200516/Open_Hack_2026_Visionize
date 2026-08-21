const { 
  company_info, 
  invoices, 
  bills, 
  customers 
} = require("../models");
const { sendEmailWithPDF, sendReminderEmail } = require("../utils/sendEmail.js");
const dayjs = require("dayjs");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

// ─── 1. Send Bill PDF ──────────────────────────────────────────────────────────
exports.sendBill = async (req, res) => {
  try {
    const { billNumber, customerEmail, pdfBase64 } = req.body;
    const tenant_id = req.user?.tenant_id;

    if (!tenant_id) return res.status(400).json({ success: false, message: "Company ID missing in token." });
    if (!customerEmail) return res.status(400).json({ success: false, message: "Customer email is missing." });

    let pdfBuffer;
    try {
      pdfBuffer = Buffer.from(pdfBase64, "base64");
    } catch {
      return res.status(400).json({ success: false, message: "Invalid PDF data" });
    }

    const company = await company_info.findOne({ where: { id: tenant_id } });
    if (!company) return res.status(404).json({ success: false, message: "Company info not found" });

    const info = await sendEmailWithPDF({
      pdfBuffer,
      invoiceNumber: billNumber,
      customerEmail,
      fromEmail: company.email,
      fromName: company.company_name,
    });

    // Zepto Mail success check
    if (info.message === "OK" || info.request_id || (info.data && info.data.length > 0)) {
      return res.status(200).json({ success: true, message: "Bill sent via email.", smtp_info: info });
    }

    return res.status(500).json({ success: false, message: "Failed to send bill via Zepto Mail.", smtp_info: info });
  } catch (err) {
    console.error("❌ Error in send-bill:", err);
    let msg = err.message;
    if (msg.includes("535") || msg.includes("Invalid login") || err.code === 'EAUTH') {
      msg = "SMTP Authentication Error: Gmail rejected your credentials. Please ensure you have set a valid App Password in the .env file.";
    }
    return res.status(500).json({ success: false, message: msg, detail: err.message });
  }
};

// ─── 2. Send Invoice PDF ───────────────────────────────────────────────────────
exports.sendInvoice = async (req, res) => {
  try {
    const { invoiceNumber, customerEmail, pdfBase64 } = req.body;
    const tenant_id = req.user?.tenant_id;

    if (!tenant_id) return res.status(400).json({ success: false, message: "Company ID missing in token." });
    if (!customerEmail) return res.status(400).json({ success: false, message: "Customer email is missing." });

    let pdfBuffer;
    try {
      pdfBuffer = Buffer.from(pdfBase64, "base64");
    } catch {
      return res.status(400).json({ success: false, message: "Invalid PDF data" });
    }

    const company = await company_info.findOne({ where: { id: tenant_id } });
    if (!company) return res.status(404).json({ success: false, message: "Company info not found" });

    const info = await sendEmailWithPDF({
      pdfBuffer,
      invoiceNumber,
      customerEmail,
      fromEmail: company.email,
      fromName: company.company_name,
    });

    // Zepto Mail success check
    if (info.message === "OK" || info.request_id || (info.data && info.data.length > 0)) {
      return res.status(200).json({ success: true, message: "Invoice sent via email.", smtp_info: info });
    }

    return res.status(500).json({ success: false, message: "Failed to send invoice via Zepto Mail.", smtp_info: info });
  } catch (err) {
    console.error("❌ Error in send-invoice:", err);
    let msg = err.message;
    if (msg.includes("535") || msg.includes("Invalid login") || err.code === 'EAUTH') {
      msg = "SMTP Authentication Error: Gmail rejected your credentials. Please ensure you have set a valid App Password in the .env file.";
    }
    return res.status(500).json({ success: false, message: msg, detail: err.message });
  }
};

// ─── 3. Send Manual Reminder ───────────────────────────────────────────────────
exports.sendReminder = async (req, res) => {
  const {
    customerEmail,
    invoiceNumber,
    companyName,
    companyEmail,
    dueDate,
    type,
  } = req.body;

  if (!customerEmail || !invoiceNumber || !companyName || !dueDate) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: customerEmail, invoiceNumber, companyName, dueDate",
    });
  }

  const validTypes = ["reminder", "overdue"];
  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: "Invalid or missing type. Must be 'reminder' or 'overdue'.",
    });
  }

  try {
    const info = await sendReminderEmail({
      customerEmail,
      invoiceNumber,
      companyName,
      companyEmail,
      dueDate,
      type,
    });

    res.json({ success: true, info });
  } catch (err) {
    console.error("❌ Failed to send reminder email:", err);
    let msg = err.message;
    if (msg.includes("535") || msg.includes("Invalid login")) {
      msg = "SMTP Authentication Error: Please ensure you are using a valid Gmail App Password in your .env file.";
    }
    res.status(500).json({ success: false, error: msg, detail: err.message });
  }
};

// ─── 4. Send Invoice Alerts (Batch Process) ───────────────────────────────────
exports.sendInvoiceAlerts = async (req, res) => {
  try {
    const tenant_id = req.user?.tenant_id;
    const companyName = req.user?.company_name || "Your Company";
    const companyEmail = req.user?.company_email || process.env.EMAIL_AUTH_USER;

    if (!tenant_id) {
      return res.status(400).json({ success: false, message: "Company ID missing in token." });
    }

    const today = dayjs().startOf("day");
    const twoDaysLater = today.add(2, "day").format("YYYY-MM-DD");

    const overdueInvoices = await invoices.findAll({
      where: {
        tenant_id,
        payment_status: 'Advance',
        payment_completion_status: 'Pending',
        due_date: { [Op.not]: null, [Op.lte]: twoDaysLater }
      },
      include: [{ model: customers, as: "customer", attributes: ["email"] }]
    });

    const emailsSent = [];

    for (const inv of overdueInvoices) {
      const customer_email = inv.customer?.email;
      if (!customer_email) continue;

      const dueDate = dayjs(inv.due_date).startOf("day");
      const diffDays = dueDate.diff(today, "day");

      let type = null;
      if (diffDays === 2) type = "reminder";
      else if (diffDays < 0) type = "overdue";

      if (type) {
        await sendReminderEmail({
          customerEmail: customer_email,
          invoiceNumber: inv.invoice_number,
          companyName,
          companyEmail,
          dueDate: dueDate.format("YYYY-MM-DD"),
          type,
        });
        emailsSent.push({ invoiceNumber: inv.invoice_number, type, customerEmail: customer_email });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Alert emails sent for ${emailsSent.length} invoices.`,
      details: emailsSent,
    });
  } catch (err) {
    console.error("❌ Error in send-invoice-alerts:", err.message);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// ─── 5. Check Reminder Status (Invoices) ──────────────────────────────────────
exports.checkInvoiceReminderStatus = async (req, res) => {
  try {
    const tenant_id = req.user?.tenant_id;
    if (!tenant_id) {
      return res.status(400).json({ success: false, message: "Company ID missing in token." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const invoiceList = await invoices.findAll({
      where: {
        tenant_id,
        payment_status: 'Advance',
        payment_completion_status: 'Pending',
        due_date: { [Op.not]: null }
      },
      include: [
        { model: customers, as: "customer", attributes: ["name", "email", "gst_number", "mobile", "whatsapp_number"] },
        // If company relation mapped directly:
        // { model: company_info, as: "tenant", attributes: ["company_name"] }
      ],
      raw: true,
      nest: true
    });

    // Fallback company name fetching
    const company = await company_info.findOne({ where: { id: tenant_id }, attributes: ["company_name"] });
    const company_name = company?.company_name || "Unknown Company";

    const reminders = [];
    const overdues = [];

    invoiceList.forEach((inv) => {
      const due = new Date(inv.due_date);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
      const dueDateStr = due.toISOString().split("T")[0];

      // Format payload similarly to previous RAW SQL response
      const payload = {
        invoice_id: inv.invoice_id,
        invoice_number: inv.invoice_number,
        due_date: inv.due_date,
        total_amount: inv.total_amount,
        advance_amount: inv.advance_amount,
        payment_status: inv.payment_status,
        payment_completion_status: inv.payment_completion_status,
        customer_name: inv.customer?.name,
        customer_email: inv.customer?.email,
        customer_gst_no: inv.customer?.gst_number,
        customer_phone_no: inv.customer?.mobile,
        whatsapp: inv.customer?.whatsapp_number,
        company_name: inv.tenant?.company_name || company_name,
        dueDate: dueDateStr
      };

      if (diffDays < 0) {
        overdues.push(payload);
      } else if (diffDays <= 2) {
        reminders.push(payload);
      }
    });

    return res.status(200).json({ reminders, overdues });
  } catch (err) {
    console.error("❌ Error in check-reminder-status:", err.message);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// ─── 6. Check Reminder Status (Bills) ─────────────────────────────────────────
exports.checkBillReminderStatus = async (req, res) => {
  try {
    const tenant_id = req.user?.tenant_id;
    if (!tenant_id) {
      return res.status(400).json({ success: false, message: "Company ID missing in token." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const billList = await bills.findAll({
      where: {
        tenant_id,
        payment_status: 'Advance',
        payment_completion_status: 'Pending',
        due_date: { [Op.not]: null }
      },
      raw: true
    });

    const reminders = [];
    const overdues = [];

    billList.forEach(bill => {
      const due = new Date(bill.due_date);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
      const dueDateStr = due.toISOString().split("T")[0];

      const payload = { ...bill, dueDate: dueDateStr };

      if (diffDays < 0) {
        overdues.push(payload);
      } else {
        reminders.push(payload); // Push all upcoming
      }
    });

    return res.status(200).json({ reminders, overdues });
  } catch (err) {
    console.error("❌ Error in check-bill-reminder-status:", err.message);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
};
