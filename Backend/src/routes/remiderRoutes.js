const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { authenticateUser } = require("../middleware/auth.js");

router.get("/check-reminder-status", authenticateUser, notificationController.checkInvoiceReminderStatus);
router.get("/check-bill-reminder-status", authenticateUser, notificationController.checkBillReminderStatus);
router.post("/send-reminder", authenticateUser, notificationController.sendReminder);

module.exports = router;