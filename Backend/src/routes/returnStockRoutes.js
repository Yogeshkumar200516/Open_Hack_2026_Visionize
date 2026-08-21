const express = require('express');
const router = express.Router();
const returnStockController = require('../controllers/returnStockController.js');
const { authenticateUser } = require('../middleware/auth.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Apply authentication to all routes
router.use(authenticateUser);

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/return_verifications');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'return-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
  }
});

// Mount Routes
router.get('/all-returns', returnStockController.getAllReturns);
router.get('/item/:return_type/:return_item_id', returnStockController.getReturnItemDetails);
router.post('/upload-images', upload.array('images', 5), returnStockController.uploadImages);
router.post('/verify', returnStockController.verifyReturnStock);
router.get('/history', returnStockController.getVerificationHistory);
router.get('/stock-summary', returnStockController.getStockSummary);

module.exports = router;