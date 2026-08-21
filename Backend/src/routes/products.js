const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { authenticateUser } = require("../middleware/auth.js");
const productController = require("../controllers/productController");

router.use(authenticateUser);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../public/images/products");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.use((req, res, next) => {
  console.log(
    `[PRODUCT ROUTER] ${new Date().toISOString()} ${req.method} ${req.originalUrl} - tenant=${req.user?.tenant_id}`
  );
  next();
});

// Product Routes Using Controller
router.post("/add", productController.addProduct);
router.put("/edit/:id", productController.editProduct);
router.get("/categories", productController.getCategories);
router.get("/", productController.getProducts);
router.delete("/delete/:id", productController.deleteProduct);
router.get("/traced", productController.getTracedProducts);
router.put("/:productId/toggle-trace", productController.toggleTrace);
router.get("/:id", productController.getProductById);
router.post("/update-stock", productController.updateStock);
router.get("/by-barcode/:barcode", productController.getProductByBarcode);
router.post("/bulk-upload", productController.bulkUpload);

// Image upload route (kept in route as it relies heavily on multer)
router.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }
  const imagePath = `images/products/${req.file.filename}`;
  res.status(200).json({ imagePath });
});

module.exports = router;
