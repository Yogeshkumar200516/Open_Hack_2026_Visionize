const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { authenticateUser } = require("../middleware/auth.js");

router.post("/send-reminder", authenticateUser, notificationController.sendReminder);
router.post("/send-invoice-alerts", authenticateUser, notificationController.sendInvoiceAlerts);

module.exports = router;
