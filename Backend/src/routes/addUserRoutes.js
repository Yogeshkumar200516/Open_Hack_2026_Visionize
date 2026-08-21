const express = require("express");
const router = express.Router();
const db = require("../config/config.js"); // MySQL connection
const jwt = require("jsonwebtoken");

const secretKey = "your-secret-key"; // ⚠️ Move to .env in production

// Password validation helper
const isValidPassword = (password) => {
  const minLength = 8;
  const hasAlphabet = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasNoSpaces = /^\S+$/.test(password);

  return (
    password.length >= minLength &&
    hasAlphabet &&
    hasNumber &&
    hasSpecialChar &&
    hasNoSpaces
  );
};

// Authentication middleware to verify JWT token from Authorization header
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Auth token missing" });

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded; // Contains user_id, tenant_id, role, etc.
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Apply auth middleware globally for this router
router.use(authenticateUser);

// ➕ ADD USER (store password as plain text)
router.post("/add-users", async (req, res) => {
  const {
    first_name,
    last_name,
    mobile_number,
    email,
    password,
    role,
    status,
  } = req.body;

  if (!first_name || !last_name || !mobile_number || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({
      message:
        "Password must be at least 8 characters, include a letter, a number, a special character, and have no spaces",
    });
  }

  try {
    const sql = `
      INSERT INTO users (
        tenant_id,
        first_name,
        last_name,
        mobile_number,
        email,
        password_hash,
        role,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(sql, [
      req.user.tenant_id, // ✅ tenant_id from JWT
      first_name,
      last_name,
      mobile_number,
      email,
      password, // ✅ Plain password stored directly
      role,
      status || "active",
    ]);

    return res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error("Insert User Error:", err);

    if (err.code === "ER_DUP_ENTRY") {
      if (err.sqlMessage.includes("mobile_number")) {
        return res.status(409).json({ message: "Mobile number already exists." });
      }
      if (err.sqlMessage.includes("email")) {
        return res.status(409).json({ message: "Email already exists." });
      }
    }

    return res.status(500).json({ message: "Server error" });
  }
});

// ✅ GET all users for current tenant
router.get("/all-users", async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT * FROM users WHERE tenant_id = ? ORDER BY created_at DESC",
      [req.user.tenant_id]
    );

    return res.json(users);
  } catch (err) {
    console.error("Fetch users error:", err);
    return res.status(500).json({ message: "Failed to load users" });
  }
});

// 🗑 DELETE user if belongs to tenant
router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [user] = await db.query(
      "SELECT * FROM users WHERE user_id = ? AND tenant_id = ?",
      [id, req.user.tenant_id]
    );

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const [invoices] = await db.query(
      "SELECT * FROM invoices WHERE created_by = ?",
      [id]
    );

    if (invoices.length > 0) {
      return res.status(400).json({ message: "Cannot delete user with active invoices; mark inactive instead" });
    }

    await db.query(
      "DELETE FROM users WHERE user_id = ? AND tenant_id = ?",
      [id, req.user.tenant_id]
    );

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete User Error:", err);
    return res.status(500).json({ message: "Server error during deletion" });
  }
});

// ✏️ UPDATE user and store raw password if provided
router.put("/update/:id", async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    mobile_number,
    role,
    status,
    password,
  } = req.body;

  if (!first_name || !last_name || !email || !mobile_number || !role || !status) {
    return res.status(400).json({ message: "All fields required except password" });
  }

  if (password && !isValidPassword(password)) {
    return res.status(400).json({
      message:
        "Password must be at least 8 characters, include a letter, a number, a special character, and no spaces",
    });
  }

  try {
    const [user] = await db.query(
      "SELECT * FROM users WHERE user_id = ? AND tenant_id = ?",
      [req.params.id, req.user.tenant_id]
    );

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    let sql = `
      UPDATE users SET
        first_name = ?, last_name = ?, email = ?, mobile_number = ?, role = ?, status = ?
    `;

    const params = [first_name, last_name, email, mobile_number, role, status];

    if (password && password.trim() !== "") {
      sql += `, password_hash = ?`;
      params.push(password); // ✅ Store raw password directly
    }

    sql += ` WHERE user_id = ? AND tenant_id = ?`;
    params.push(req.params.id, req.user.tenant_id);

    await db.query(sql, params);

    return res.status(200).json({ message: "User updated successfully" });
  } catch (err) {
    console.error("Update user error:", err);
    return res.status(500).json({ message: "Failed to update user" });
  }
});

module.exports = router;
