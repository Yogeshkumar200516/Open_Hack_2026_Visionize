import React, { useRef, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  useMediaQuery,
  useTheme,
  InputAdornment,
  IconButton,
} from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo2.svg";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import API_BASE_URL from "../../Context/Api";

const LoginPage = ({ onLogin }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery("(max-width:600px)");
  const navigate = useNavigate();
  const primaryColor = theme.palette.primary.main;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef();

  const handleLogin = async () => {
  setError("");

  if (!email || !password) {
    return setError("Please fill in all fields");
  }

  try {
    const res = await axios.post(
      `${API_BASE_URL}/api/auth/login`,
      { email, password },
      { headers: { "Content-Type": "application/json" } }
    );

    const { user, token, company } = res.data;

    // ✅ Validate response
    if (!user || !token) {
      console.error("Login response missing user or token:", res.data);
      return setError("Login failed: incomplete response from server");
    }

    // =========================
    // ✅ ROLE MAPPING
    // =========================
    let mappedRole = user.role;
    if (mappedRole === "customer") mappedRole = "sales";

    // =========================
    // ✅ TENANT HANDLING
    // =========================
    if (mappedRole === "super_admin") {
      localStorage.removeItem("tenantId");
    } else {
      localStorage.setItem("tenantId", user.tenant_id);
    }

    // =========================
    // ✅ SUBSCRIPTION HANDLING
    // =========================
    if (company?.subscription_type) {
      localStorage.setItem("subscriptionType", company.subscription_type);
    } else {
      localStorage.removeItem("subscriptionType");
    }

    // =========================
    // 🔥 CRITICAL FIX STARTS HERE
    // =========================

    // ❌ REMOVE WRONG EXPIRY LOGIC
    localStorage.removeItem("tokenExpiry");

    // ✅ STORE ONLY AUTH TOKEN
    localStorage.setItem("authToken", token);

    // ✅ STORE USER SAFELY
    localStorage.setItem(
      "user",
      JSON.stringify({ ...user, role: mappedRole })
    );

    // =========================
    // 🔥 OPTIONAL: DEBUG LOGS
    // =========================
    // console.log("✅ Login Successful");
    // console.log("🔐 Token stored:", token);
    // console.log("👤 User:", user);
    // console.log("🏢 Tenant ID:", user.tenant_id);

    // =========================
    // ✅ CALL GLOBAL LOGIN HANDLER
    // =========================
    onLogin({ ...user, role: mappedRole }, token, company);

    // =========================
    // ✅ ROLE-BASED NAVIGATION
    // =========================
    if (mappedRole === "super_admin") {
      navigate("/super-admin");
    } else if (mappedRole === "admin") {
      navigate("/dashboard");
    } else if (mappedRole === "cashier") {
      navigate("/pos");
    } else if (mappedRole === "sales") {
      navigate("/sales");
    }

  } catch (err) {
    console.error("❌ Login failed:", err);

    if (err.response) {
      if (err.response.status === 403) {
        setError(err.response.data?.message || "Your company is inactive.");
      } else if (err.response.status === 401) {
        setError(err.response.data?.message || "Invalid email or password");
      } else {
        setError(err.response.data?.message || "Login failed");
      }
    } else {
      setError("Network error. Please try again.");
    }
  }
};


  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: isDark ? "#121212" : "#f4f6f8",
        overflow: "hidden",
        p: 2,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 420,
          bgcolor: isDark ? "#1e1e1e" : "#ffffff",
          color: theme.palette.text.primary,
          borderRadius: 4,
          boxShadow: `0 0 20px ${primaryColor}`,
          p: isMobile ? 3 : 4,
          border: `1px solid ${isDark ? "#00bcd4" : "#cfd8dc"}`,
        }}
      >
        <Box display="flex" justifyContent="center" mb={2}>
          <img
            src={logo}
            alt="Logo"
            style={{
              height: isMobile ? 40 : 70,
              objectFit: "contain",
            }}
          />
        </Box>

        <Typography
          variant="h4"
          align="center"
          fontWeight="bold"
          sx={{ color: primaryColor, mb: 2 }}
        >
          Nexora ERP
        </Typography>

        <Divider sx={{ mb: 3, borderColor: primaryColor }} />

        {/* Email */}
        <Typography
          variant="subtitle2"
          fontWeight="bold"
          gutterBottom
          sx={{ color: isDark ? "#aaa" : "#333" }}
        >
          Email{" "}
          <Typography component="span" color="error">
            *
          </Typography>
        </Typography>
        <TextField
          fullWidth
          required
          placeholder="Enter your email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="dense"
          variant="outlined"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              passwordRef.current?.focus();
            }
          }}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
            },
          }}
        />

        {/* Password */}
        <Typography
          variant="subtitle2"
          fontWeight="bold"
          gutterBottom
          sx={{ color: isDark ? "#aaa" : "#333" }}
        >
          Password{" "}
          <Typography component="span" color="error">
            *
          </Typography>
        </Typography>
        <TextField
          fullWidth
          required
          placeholder="Enter your password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          inputRef={passwordRef}
          margin="dense"
          variant="outlined"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleLogin();
            }
          }}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword((prev) => !prev)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Error Message */}
        {error && (
          <Typography variant="body2" color="error" mb={2}>
            {error}
          </Typography>
        )}

        {/* Login Button */}
        <Button
          fullWidth
          variant="contained"
          onClick={handleLogin}
          sx={{
            mt: 1,
            py: 1.2,
            fontSize: "1rem",
            fontWeight: "bold",
            borderRadius: 3,
            background: primaryColor,
            color: "#fff",
            "&:hover": {
              background: isDark
                ? "linear-gradient(45deg, #00acc1, #00e5ff)"
                : "linear-gradient(45deg,rgb(27, 77, 43),rgb(27, 95, 58))",
              boxShadow: `0 0 12px ${primaryColor}`,
            },
          }}
        >
          Login
        </Button>
      </Box>
    </Box>
  );
};

export default LoginPage;
