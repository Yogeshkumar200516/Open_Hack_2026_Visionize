const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./src/config/database.js");


const sequelize = require("./src/config/database");
const models = require("./src/models");   // ✅ load models

// ─── EXISTING ROUTES ──────────────────────────────────────────────────────────
const productRoutes = require("./src/routes/products.js");
const authRoutes = require("./src/routes/authRoutes.js");
const invoiceRoutes = require("./src/routes/invoices.js");
const gstReportsRoutes = require("./src/routes/gstReports.js");
const usersRoutes = require("./src/routes/userRoutes.js");
const companyInfoRoutes = require("./src/routes/companyInfoRoutes.js");
const categoriesRoutes = require("./src/routes/categoryRoutes.js");
const invoiceRoute = require("./src/routes/sendInvoice.js");
const adminRoutes = require("./src/routes/adminRoutes.js");
const billsRouter = require("./src/routes/billRoutes.js");
const reminderRouter = require("./src/routes/remiderRoutes.js");
const alertRouter = require("./src/routes/sendAlerts.js");
const billingAddressRoutes = require("./src/routes/addressRoutes.js");
const salesReturnRoutes = require("./src/routes/salesReturnRoutes.js");
const purchaseReturnRoutes = require("./src/routes/purchaseReturnRoutes.js");
const returnStockRoutes = require("./src/routes/returnStockRoutes.js");
const aiInsightsRoutes = require("./src/routes/AiRoutes.js");

// ─── NEW PURCHASE FLOW ROUTES ─────────────────────────────────────────────────
const supplierRoutes = require("./src/routes/purchase/supplierRoutes.js");
const purchaseRequestRoutes = require("./src/routes/purchase/purchaseRequestRoutes.js");
const rfqRoutes = require("./src/routes/purchase/rfqRoutes.js");
const purchaseOrderRoutes = require("./src/routes/purchase/purchaseOrderRoutes.js");
const purchaseInvoiceRoutes = require("./src/routes/purchase/purchaseInvoiceRoutes.js");
const goodsReceiptRoutes = require("./src/routes/purchase/goodsReceiptRoutes.js");
const supplierPaymentRoutes = require("./src/routes/purchase/supplierPaymentRoutes.js");
const supplierReturnRoutes = require("./src/routes/purchase/supplierReturnRoutes.js");
const purchaseAnalyticsRoutes = require("./src/routes/purchase/purchaseAnalyticsRoutes.js");
const kpiRoiRoutes = require("./src/routes/kpiRoutes.js");


const app = express();
const PORT = 5000;

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: "*", // Allow all origins for local testing
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Global logger
app.use((req, res, next) => {
  console.log(`[GLOBAL LOG] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// ─── STATIC FILES ─────────────────────────────────────────────────────────────
app.use("/invoices", express.static(path.join(__dirname, "public/invoices")));
app.use("/temp", express.static(path.join(__dirname, "temp")));
app.use("/images", express.static(path.join(__dirname, "public", "images")));

// ✅ Robust CORS for Uploads - Crucial for PDF generation on mobile/safari
app.use("/uploads", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
}, express.static(path.join(__dirname, "uploads")));

// ─── EXISTING API ROUTES ──────────────────────────────────────────────────────
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/gst-reports", gstReportsRoutes);
app.use("/api/company", companyInfoRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/send", invoiceRoute);
app.use("/api/admin", adminRoutes);
app.use("/api/bills", billsRouter);
app.use("/api/reminder", reminderRouter);
app.use("/api/alert", alertRouter);
app.use("/api/sales-returns", salesReturnRoutes);
app.use("/api/purchase-returns", purchaseReturnRoutes);
app.use("/api/return-stock", returnStockRoutes);
app.use("/api/address", billingAddressRoutes);
app.use("/api/ai-insights", aiInsightsRoutes);

// ─── PURCHASE FLOW API ROUTES ─────────────────────────────────────────────────
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchase-requests", purchaseRequestRoutes);
app.use("/api/rfq", rfqRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/purchase-invoices", purchaseInvoiceRoutes);
app.use("/api/goods-receipts", goodsReceiptRoutes);
app.use("/api/supplier-payments", supplierPaymentRoutes);
app.use("/api/supplier-returns", supplierReturnRoutes);
app.use("/api/purchase-analytics", purchaseAnalyticsRoutes);

app.use("/api/kpi-roi", kpiRoiRoutes);

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("✅ Billing API is running");
});

// ─── VERSION CHECK (to verify production deployment) ──────────────────────────
app.get("/api/version", (req, res) => {
  res.json({ version: "2026-04-27-v3", deployed: true, message: "Payment raw SQL fix active" });
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
const startServer = async () => {
  try {

    await sequelize.authenticate();
    console.log("✅ PostgreSQL connected successfully");

    // Load model associations
    Object.keys(models).forEach((modelName) => {
      if (models[modelName].associate) {
        models[modelName].associate(models);
      }
    });

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("❌ Unable to connect to database:", error);
  }
};

startServer();