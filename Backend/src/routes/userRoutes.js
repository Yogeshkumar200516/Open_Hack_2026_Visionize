const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { authenticateUser } = require("../middleware/auth.js");

// Protect all routes
router.use(authenticateUser);

router.post("/add-users", userController.addUser);

router.get("/all-users", userController.getAllUsers);

router.delete("/delete/:id", userController.deleteUser);

router.put("/update/:id", userController.updateUser);

module.exports = router;