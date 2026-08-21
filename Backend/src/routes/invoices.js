const express = require("express");
const router = express.Router();
const multer = require("multer");
const invoiceController = require("../controllers/invoiceController");
const { authenticateUser } = require("../middleware/auth.js");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Apply authentication middleware globally to all routes
router.use(authenticateUser);

router.get("/customers", invoiceController.getCustomers);
router.get("/next-number", invoiceController.getNextInvoiceNumber);
router.post("/send-invoice-to", upload.single("pdf"), invoiceController.sendInvoiceTo);
router.post("/create", invoiceController.createInvoice);
router.get("/get-invoice", invoiceController.getInvoices);
router.get("/get-invoice/:invoice_id", invoiceController.getInvoiceById);
router.put("/update/:invoice_id", invoiceController.updateInvoice);
router.put("/approve/:invoice_id", invoiceController.approveInvoice);
router.put("/reject/:invoice_id", invoiceController.rejectInvoice);
router.put("/edit/:invoice_id", invoiceController.editInvoice);
router.delete("/delete/:invoice_id", invoiceController.deleteInvoice);

module.exports = router;
