const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/auth");
const kpiController = require("../controllers/kpiController");

// 1. DASHBOARD SUMMARY
router.get("/summary", authenticateUser, kpiController.getSummary);

// 2. REVENUE TREND
router.get("/revenue-trend", authenticateUser, kpiController.getRevenueTrend);

// 3. STOCK KPI BREAKDOWN
router.get("/stock-kpi", authenticateUser, kpiController.getStockKpi);

// 4. PAYMENT EFFICIENCY
router.get("/payment-kpi", authenticateUser, kpiController.getPaymentKpi);

// 5. RETURNS ANALYTICS
router.get("/returns-kpi", authenticateUser, kpiController.getReturnsKpi);

// 6. PURCHASE FLOW KPI
router.get("/purchase-kpi", authenticateUser, kpiController.getPurchaseKpi);

// 7. FEATURE ROI
router.get("/features", authenticateUser, kpiController.getFeatures);

// 8. KPI CATALOGUE
router.get("/kpi-catalogue", authenticateUser, kpiController.getKpiCatalogue);

// 9. COMPUTE & UPSERT ROI
router.post("/compute-roi", authenticateUser, kpiController.computeRoi);

// 10. TOP PRODUCTS
router.get("/top-products", authenticateUser, kpiController.getTopProducts);

// 11. CUSTOMER KPI
router.get("/customer-kpi", authenticateUser, kpiController.getCustomerKpi);

// 12. TELEMETRY LOG
router.post("/telemetry", authenticateUser, kpiController.logTelemetry);

module.exports = router;