const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { authenticateUser } = require("../middleware/auth.js");

router.post("/send-bill", authenticateUser, notificationController.sendBill);
router.post("/send-invoice", authenticateUser, notificationController.sendInvoice);

module.exports = router;
