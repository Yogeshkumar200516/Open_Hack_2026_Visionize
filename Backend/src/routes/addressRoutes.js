const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');

router.get('/:companyId', addressController.getAddressesByCompanyId);
router.post('/', addressController.createAddress);
router.put('/:billingAddressId', addressController.updateAddress);
router.delete('/:billingAddressId', addressController.deleteAddress);

module.exports = router;
