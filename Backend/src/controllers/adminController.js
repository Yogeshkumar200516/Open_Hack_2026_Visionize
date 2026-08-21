const models = require("../models");

const CompanyInfo = models.company_info;
const User = models.users;

/* ===============================
   COMPANIES
================================ */

exports.getCompanies = async (req, res) => {
  try {
    const companies = await CompanyInfo.findAll({
      order: [["id", "DESC"]],
    });

    res.json(companies);
  } catch (err) {
    console.error("Error fetching companies:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getCompanyById = async (req, res) => {
  try {
    const company = await CompanyInfo.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json(company);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.createCompany = async (req, res) => {
  try {
    let payload = { ...req.body };
    payload.subscription_type = payload.subscription_type ?? 'invoice';
    payload.is_active = (payload.is_active === false || payload.is_active === 0) ? false : true;

    const company = await CompanyInfo.create(payload);

    res.json({
      message: "Company added successfully",
      id: company.id,
    });
  } catch (err) {
    console.error("Error adding company:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const company = await CompanyInfo.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    let payload = { ...req.body };
    payload.subscription_type = payload.subscription_type ?? 'invoice';
    payload.is_active = (payload.is_active === false || payload.is_active === 0) ? false : true;

    await company.update(payload);

    res.json({ message: "Company updated successfully" });
  } catch (err) {
    console.error("Error updating company:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const company = await CompanyInfo.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    await company.destroy();

    res.json({ message: "Company deleted" });
  } catch (err) {
    console.error("Error deleting company:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===============================
   USERS
================================ */

exports.getUsers = async (req, res) => {
  try {
    let users;

    if (req.user.role === "super_admin") {
      users = await User.findAll();
    } else if (req.user.role === "admin") {
      users = await User.findAll({
        where: {
          tenant_id: req.user.tenant_id,
        },
      });
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    let user;
    let query = {};

    if (req.user.role === "super_admin") {
      query = { user_id: req.params.id };
    } else if (req.user.role === "admin") {
      query = {
        user_id: req.params.id,
        tenant_id: req.user.tenant_id,
      };
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    user = await User.findOne({ where: query });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.createUser = async (req, res) => {
  try {
    let { tenant_id, role } = req.body;

    if (req.user.role === "admin") {
      if (role === "super_admin") {
        return res
          .status(403)
          .json({ message: "Admins cannot create super admins" });
      }

      tenant_id = req.user.tenant_id;
    } else if (req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.create({
      ...req.body,
      tenant_id,
      status: req.body.status || "active",
    });

    res.status(201).json({
      message: "User created",
      user_id: user.user_id, // User table uses user_id as PK
    });
  } catch (err) {
    console.error("Error adding user:", err);
    res.status(500).json({ message: "Server error", details: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user.role === "admin") {
      if (
        user.tenant_id !== req.user.tenant_id ||
        user.role === "super_admin"
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    await user.update(req.body);

    res.json({ message: "User updated" });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user.role === "admin") {
      if (
        user.tenant_id !== req.user.tenant_id ||
        user.role === "super_admin"
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    await user.destroy();

    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: "Server error" });
  }
};