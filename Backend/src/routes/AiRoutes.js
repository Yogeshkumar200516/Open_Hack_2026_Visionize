const express = require("express");
const router = express.Router();

const { authenticateUser } = require("../middleware/auth");
const aiController = require("../controllers/aiController");

// 1. BUSINESS METRICS SUMMARY
router.get("/summary", authenticateUser, aiController.getSummary);

// 2. SALES FORECASTING
router.get("/sales-forecast", authenticateUser, aiController.getSalesForecast);

// 3. RETURN SPIKE DETECTION
router.get("/return-spike", authenticateUser, aiController.getReturnSpike);

// 4. SMART REORDER SUGGESTIONS
router.get("/reorder-suggestions", authenticateUser, aiController.getReorderSuggestions);

// 5. BUSINESS INSIGHTS NLP-STYLE
router.get("/business-insights", authenticateUser, aiController.getBusinessInsights);

// 6. RFM CUSTOMER SEGMENTATION
router.get("/customer-segmentation", authenticateUser, aiController.getCustomerSegmentation);

// 7. PRODUCT VELOCITY + DEAD STOCK + MARGIN ANALYSIS
router.get("/product-analytics", authenticateUser, aiController.getProductAnalytics);

// 8. GST SLAB ANALYTICS
router.get("/gst-analytics", authenticateUser, aiController.getGstAnalytics);

// 9. CASH FLOW ANALYSIS
router.get("/cash-flow", authenticateUser, aiController.getCashFlow);

// 10. DISCOUNT EFFECTIVENESS ANALYSIS
router.get("/discount-analysis", authenticateUser, aiController.getDiscountAnalysis);

// 11. SEASONAL TREND DETECTION
router.get("/seasonal-trends", authenticateUser, aiController.getSeasonalTrends);

module.exports = router;