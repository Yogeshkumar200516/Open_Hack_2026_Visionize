const express = require("express");
const router = express.Router();
const billController = require("../controllers/billController");
const { authenticateUser } = require("../middleware/auth");

router.get("/get-bill", authenticateUser, billController.getBills);
router.put("/update-bill/:bill_id", authenticateUser, billController.updateBill);
router.post("/create", authenticateUser, billController.createBill);

module.exports = router;
