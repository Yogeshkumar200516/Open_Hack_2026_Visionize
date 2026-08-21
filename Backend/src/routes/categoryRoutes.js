const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/auth.js");
const categoryController = require("../controllers/categoryController");

// Apply authentication middleware to all category routes
router.use(authenticateUser);

router.get("/", categoryController.getCategories);
router.post("/add", categoryController.addCategory);
router.put("/edit/:id", categoryController.editCategory);
router.patch("/toggle-status/:id", categoryController.toggleStatus);

module.exports = router;
