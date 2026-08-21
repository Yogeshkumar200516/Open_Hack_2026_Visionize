require("dotenv").config();
const jwt = require("jsonwebtoken");

const secretKey = process.env.SECRET_KEY;

const authenticateUser = (req, res, next) => {
  try {

    if (!secretKey) {
      console.error("JWT secret key missing in environment variables");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const authHeader =
      req.headers["authorization"] || req.headers["Authorization"];

    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization header missing",
      });
    }

    const parts = authHeader.trim().split(/\s+/);

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        message: "Invalid authorization format",
      });
    }

    const token = parts[1];

    const decoded = jwt.verify(token.trim(), secretKey);

    /*
      decoded contains:
      {
        user_id,
        tenant_id,
        role,
        first_name
      }
    */

    req.user = decoded;

    next();

  } catch (error) {

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired",
      });
    }

    return res.status(401).json({
      message: "Invalid token",
    });

  }
};

module.exports = { authenticateUser };