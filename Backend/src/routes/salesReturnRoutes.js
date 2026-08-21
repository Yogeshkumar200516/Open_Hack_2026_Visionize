const express = require('express');
const router = express.Router();
const salesReturnController = require('../controllers/salesReturnController');
const { authenticateUser } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateUser);

router.get('/', salesReturnController.getAllSalesReturns);
router.get('/invoices', salesReturnController.getInvoicesForReturn);
router.get('/invoices/:invoice_id', salesReturnController.getInvoiceDetailsForReturn);
router.post('/', salesReturnController.createSalesReturn);
router.get('/:sales_return_id', salesReturnController.getSalesReturnDetails);
router.delete('/:sales_return_id', salesReturnController.deleteSalesReturn);

module.exports = router;
