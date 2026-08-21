require("dotenv").config();
const jwt = require("jsonwebtoken");

const { users, company_info } = require("../models");

const secretKey = process.env.SECRET_KEY;

const login = async (req, res) => {

  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // 1️⃣ Fetch active user
    const user = await users.findOne({
      where: {
        email: email,
        status: "active",
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // 2️⃣ Password check
    // (replace later with bcrypt.compare if hashed)
    if (user.password_hash !== password) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // 3️⃣ Check company if not super_admin
    let company = null;

    if (user.role !== "super_admin" && user.tenant_id) {

      company = await company_info.findOne({
        attributes: [
          "id",
          "company_name",
          "subscription_type",
          "is_active",
        ],
        where: {
          id: user.tenant_id,
        },
      });

      if (!company) {
        return res.status(401).json({
          message: "Invalid tenant",
        });
      }

      if (!company.is_active) {
        return res.status(403).json({
          message: "Your company is inactive. Please contact admin.",
        });
      }
    }

    // 4️⃣ Generate JWT
    const token = jwt.sign(
      {
        user_id: user.user_id,
        tenant_id: user.tenant_id,
        role: user.role,
        first_name: user.first_name,
      },
      secretKey,
      { expiresIn: "22h" }
    );

    const decoded = jwt.verify(token, secretKey);

    // 5️⃣ Prepare response user
    const responseUser = {
      user_id: user.user_id,
      tenant_id: user.tenant_id,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      tokenExpiry: decoded.exp,
    };

    // 6️⃣ Send response
    res.json({
      message: "Login successful",
      token,
      user: responseUser,
      company,
    });

  } catch (error) {

    console.error("Login error:", error);

    res.status(500).json({
      message: "Server error",
    });

  }
};

module.exports = {
  login,
};