const express = require("express");
const router = express.Router();
const gstReportController = require("../controllers/gstReportController");
const { authenticateUser } = require("../middleware/auth");

router.use(authenticateUser);

router.get("/summary", gstReportController.getSummary);
router.get("/monthly", gstReportController.getMonthlyTrend);
router.get("/top-products", gstReportController.getTopProducts);
router.get("/gst-by-user", gstReportController.getGstByUser);
router.get("/stock-movements", gstReportController.getStockMovements);
router.get("/high-gst-invoices", gstReportController.getHighGstInvoices);
router.get("/discounts-by-product", gstReportController.getDiscountsByProduct);
router.get("/category-sales", gstReportController.getCategorySales);
router.get("/advance-invoices", gstReportController.getAdvanceInvoices);
router.get("/sales-returns-summary", gstReportController.getSalesReturnsSummary);
router.get("/sales-returns-monthly", gstReportController.getSalesReturnsMonthlyTrend);
router.get("/purchase-returns-summary", gstReportController.getPurchaseReturnsSummary);
router.get("/purchase-returns-monthly", gstReportController.getPurchaseReturnsMonthlyTrend);
router.get("/return-stock-summary", gstReportController.getReturnStockSummary);
router.get("/kpi-metrics", gstReportController.getKpiMetrics);
router.get("/billing-addresses", gstReportController.getBillingAddresses);
router.get("/return-stock-by-product", gstReportController.getReturnStockTopProducts);
router.get("/customers", gstReportController.getCustomers);

module.exports = router;