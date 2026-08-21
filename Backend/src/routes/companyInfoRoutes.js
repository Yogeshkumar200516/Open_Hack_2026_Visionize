const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { authenticateUser } = require("../middleware/auth.js");
const companyInfoController = require("../controllers/companyInfoController");

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/logos"); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    const tenantId = req.user?.tenant_id || "tenant";
    const uniqueName = `${tenantId}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// All routes require authentication
router.use(authenticateUser);

router.get("/info", companyInfoController.getCompanyInfo);
router.post("/add", upload.single("company_logo"), companyInfoController.addCompanyInfo);
router.put("/update", upload.single("company_logo"), companyInfoController.updateCompanyInfo);

module.exports = router;
