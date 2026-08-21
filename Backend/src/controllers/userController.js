const { users, invoices } = require("../models");

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


// ➕ ADD USER
exports.addUser = async (req, res) => {

  try {

    const {
      first_name,
      last_name,
      mobile_number,
      email,
      password,
      role,
      status
    } = req.body;

    if (!first_name || !last_name || !mobile_number || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters, include a letter, number and special character",
      });
    }

    await users.create({
      tenant_id: req.user.tenant_id,
      first_name,
      last_name,
      mobile_number,
      email,
      password_hash: password,
      role,
      status: status || "active",
    });

    return res.status(201).json({
      message: "User created successfully",
    });

  } catch (error) {

    console.error("Add User Error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {

      const field = error.errors[0].path;

      if (field === "mobile_number") {
        return res.status(409).json({ message: "Mobile number already exists" });
      }

      if (field === "email") {
        return res.status(409).json({ message: "Email already exists" });
      }
    }

    return res.status(500).json({ message: "Server error" });

  }
};



// 📋 GET ALL USERS
exports.getAllUsers = async (req, res) => {

  try {

    const userList = await users.findAll({
      where: {
        tenant_id: req.user.tenant_id
      },
      order: [["created_at", "DESC"]],
    });

    res.json(userList);

  } catch (error) {

    console.error("Fetch Users Error:", error);

    res.status(500).json({
      message: "Failed to load users",
    });

  }
};



// 🗑 DELETE USER
exports.deleteUser = async (req, res) => {

  try {

    const id = req.params.id;

    const user = await users.findOne({
      where: {
        user_id: id,
        tenant_id: req.user.tenant_id
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const invoiceCount = await invoices.count({
      where: {
        created_by: id
      }
    });

    if (invoiceCount > 0) {
      return res.status(400).json({
        message: "Cannot delete user with active invoices; mark inactive instead"
      });
    }

    await user.destroy();

    res.json({
      message: "User deleted successfully",
    });

  } catch (error) {

    console.error("Delete User Error:", error);

    res.status(500).json({
      message: "Server error during deletion",
    });

  }
};



// ✏️ UPDATE USER
exports.updateUser = async (req, res) => {

  try {

    const id = req.params.id;

    const {
      first_name,
      last_name,
      email,
      mobile_number,
      role,
      status,
      password
    } = req.body;

    if (!first_name || !last_name || !email || !mobile_number || !role || !status) {
      return res.status(400).json({
        message: "All fields required except password",
      });
    }

    if (password && !isValidPassword(password)) {
      return res.status(400).json({
        message: "Invalid password format",
      });
    }

    const user = await users.findOne({
      where: {
        user_id: id,
        tenant_id: req.user.tenant_id
      }
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.first_name = first_name;
    user.last_name = last_name;
    user.email = email;
    user.mobile_number = mobile_number;
    user.role = role;
    user.status = status;

    if (password && password.trim() !== "") {
      user.password_hash = password;
    }

    await user.save();

    res.json({
      message: "User updated successfully",
    });

  } catch (error) {

    console.error("Update User Error:", error);

    res.status(500).json({
      message: "Failed to update user",
    });

  }
};