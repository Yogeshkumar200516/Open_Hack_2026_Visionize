// src/AppLayout/AppLayout.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Routes, Route, Navigate, useNavigate, useLocation,
} from "react-router-dom";
import { Box, CssBaseline } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";

import Navbar from "../components/Navbar/Navbar";
import Products from "../pages/Products/Products";
import Dashboard from "../pages/Dashboard/GSTReport";
import LoginPage from "../components/Login/Login";
import Loader from "../components/Loader/Loader";
import AddAdmin from "../pages/SuperAdmin/AddAdmin/AddAdmin";
import AddSuperAdmin from "../pages/SuperAdmin/AddSuperAdmin/AddSuperAdmin";
import AddCompany from "../pages/SuperAdmin/AddCompanies/AddCompanies";
import LoadingPage from "../components/LoginLoader.jsx/LoginLoader";
import ReturnStock from "../pages/ReturnStock/ReturnStock";
import UserBillingToggle from "../pages/AddUsers/ToggleBar";
import ToggleBillInvoiceBar from "../pages/GSTInvoice/ToggleBillInvoiceBar";
import ToggleBillInvoice from "../pages/PartyMaster/ToggleBillInvoice";
import SalesReturn from "../pages/SalesReturn/SalesReturn";
import PurchaseReturn from "../pages/PurchaseReturn/PurchaseReturn";
import AiInsights from "../pages/AiInsights/AiInsights";
import SupplierMaster from "../pages/SupplierMaster/SupplierMaster";
import PurchaseRequest from "../pages/PurchaseRequest/PurchaseRequest";
import RFQPage from "../pages/RFQPage/RFQ";
import PurchaseOrders from "../pages/PurchaseOrders/PurchaseOrders";
import PurchaseInvoicePage from "../pages/PurchaseInvoice/PurchaseInvoice";
import GoodsReceipt from "../pages/GoodsReceipt/GoodsReceipt";
import PurchaseAnalytics from "../pages/PurchaseAnalytics/PurchaseAnalytics";
import KpiRoiDashboard from "../pages/KPIDashboard/KPIDashboard";

// ─── PURCHASE FLOW PAGES ──────────────────────────────────────────────────────

import { useAuth } from "../Context/AuthContext";

// ─── PURCHASE FLOW PAGES ──────────────────────────────────────────────────────

const AppLayout = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const isXLarge = useMediaQuery("(min-width:1200px)");
  const isSmall = useMediaQuery("(max-width:600px)");
  const isMedium = useMediaQuery("(min-width:600px) and (max-width:1200px)");

  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState("permanent");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [location.pathname]);

  useEffect(() => {
    if (isSmall) {
      setVariant("temporary");
      setOpen(false);
    } else if (isXLarge) {
      setVariant("permanent");
      setOpen(true);
    } else if (isMedium) {
      setVariant("permanent");
      setOpen(false);
    }
  }, [isXLarge, isMedium, isSmall]);

  const handleDrawerToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    // We still want a small initial delay to let AuthContext initialize
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setOpen(false);
  }, [logout]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setTimeout(handleLogout, 20 * 60 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, handleLogout]);

  const handleLogin = (userData, token) => {
    login(userData, token);
    setShowLoading(true);
    if (isXLarge) {
      setVariant("permanent");
      setOpen(true);
    } else {
      setVariant("temporary");
      setOpen(false);
    }
  };

  // ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────
  const handleKeyboardShortcuts = useCallback(
    (event) => {
      if (!isAuthenticated) return;
      const tag = event.target.tagName;
      if (["INPUT", "TEXTAREA"].includes(tag)) return;
      if (!event.ctrlKey) return;
      switch (event.key.toLowerCase()) {
        case "i":
          event.preventDefault();
          navigate("/gst-invoice-bill");
          break;
        case "p":
          if (["admin", "sales"].includes(user?.role)) {
            event.preventDefault();
            navigate("/products");
          }
          break;
        case "u":
          if (user?.role === "admin") {
            event.preventDefault();
            navigate("/admin-access");
          }
          break;
        case "d":
          if (["admin", "cashier"].includes(user?.role)) {
            event.preventDefault();
            navigate("/sales-return");
          }
          break;
        case "b":
          if (user?.role === "admin") {
            event.preventDefault();
            navigate("/purchase-orders");
          }
          break;
        case "f":
          event.preventDefault();
          break;
        default:
          break;
      }
    },
    [navigate, isAuthenticated, user]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => window.removeEventListener("keydown", handleKeyboardShortcuts);
  }, [handleKeyboardShortcuts]);

  // ─── PROTECTED ROUTE ──────────────────────────────────────────────────────
  const PrivateRoute = ({ element: Element, roles }) => {
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!roles.includes(user?.role)) {
      const defaultPath =
        user?.role === "super_admin" ? "/add-company" :
        user?.role === "admin" ? "/" :
        user?.role === "cashier" ? "/gst-invoice" :
        user?.role === "sales" ? "/products" : "/login";
      return <Navigate to={defaultPath} replace />;
    }
    return <Element />;
  };

  const onLoadingComplete = () => {
    setShowLoading(false);
    if (user?.role === "super_admin") navigate("/add-company");
    else if (user?.role === "admin") navigate("/");
    else navigate("/gst-invoice");
  };

  if (loading) return <Loader />;
  if (showLoading) return <LoadingPage onLoaded={onLoadingComplete} />;

  const marginTop = variant === "temporary" ? 34 : 44;

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {isAuthenticated && (
        <Navbar
          onLogout={handleLogout}
          user={user}
          open={open}
          variant={variant}
          setOpen={setOpen}
          handleDrawerToggle={handleDrawerToggle}
        />
      )}

      <Box component="main" sx={{ flexGrow: 1, mt: `${marginTop}px`, px: { xs: 1, sm: 2 }, pb: 2, overflow: "auto" }}>
        <Routes>
          {/* ─── Auth ──────────────────────────────────────────────────────── */}
          <Route path="/login" element={
            isAuthenticated ? (
              <Navigate to={user?.role === "super_admin" ? "/add-company" : user?.role === "admin" ? "/" : "/gst-invoice"} replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          } />

          {/* ─── Super Admin ───────────────────────────────────────────────── */}
          <Route path="/add-company" element={<PrivateRoute element={AddCompany} roles={["super_admin"]} />} />
          <Route path="/super-admin" element={<PrivateRoute element={AddCompany} roles={["super_admin"]} />} />
          <Route path="/add-admin" element={<PrivateRoute element={AddAdmin} roles={["super_admin"]} />} />
          <Route path="/add-superadmin" element={<PrivateRoute element={AddSuperAdmin} roles={["super_admin"]} />} />

          {/* ─── Admin ─────────────────────────────────────────────────────── */}
          <Route path="/" element={<PrivateRoute element={Dashboard} roles={["admin"]} />} />
          <Route path="/dashboard" element={<PrivateRoute element={Dashboard} roles={["admin"]} />} />
          <Route path="/admin-access" element={<PrivateRoute element={UserBillingToggle} roles={["admin"]} />} />
          <Route path="/kpi-dashboard" element={<PrivateRoute element={KpiRoiDashboard} roles={["admin"]} />} />

          {/* ─── Shared (admin, cashier, sales) ────────────────────────────── */}
          <Route path="/gst-invoice-bill" element={<PrivateRoute element={ToggleBillInvoiceBar} roles={["admin", "cashier", "sales"]} />} />
          <Route path="/gst-invoice" element={<PrivateRoute element={ToggleBillInvoiceBar} roles={["admin", "cashier", "sales"]} />} />
          <Route path="/pos" element={<PrivateRoute element={ToggleBillInvoiceBar} roles={["admin", "cashier", "sales"]} />} />
          <Route path="/sales" element={<PrivateRoute element={ToggleBillInvoiceBar} roles={["admin", "cashier", "sales"]} />} />
          <Route path="/products" element={<PrivateRoute element={Products} roles={["admin", "sales"]} />} />
          <Route path="/party-master" element={<PrivateRoute element={ToggleBillInvoice} roles={["admin", "cashier", "sales"]} />} />
          <Route path="/return-stock" element={<PrivateRoute element={ReturnStock} roles={["admin", "cashier"]} />} />
          <Route path="/sales-return" element={<PrivateRoute element={SalesReturn} roles={["admin", "cashier"]} />} />
          <Route path="/purchase-return" element={<PrivateRoute element={PurchaseReturn} roles={["admin", "cashier"]} />} />
          <Route path="/ai-insights" element={<PrivateRoute element={AiInsights} roles={["admin", "cashier"]} />} />

          {/* ─── PURCHASE FLOW (admin only) ─────────────────────────────────── */}
          <Route path="/suppliers" element={<PrivateRoute element={SupplierMaster} roles={["admin"]} />} />
          <Route path="/purchase-requests" element={<PrivateRoute element={PurchaseRequest} roles={["admin"]} />} />
          <Route path="/rfq" element={<PrivateRoute element={RFQPage} roles={["admin"]} />} />
          <Route path="/purchase-orders" element={<PrivateRoute element={PurchaseOrders} roles={["admin"]} />} />
          <Route path="/purchase-invoice" element={<PrivateRoute element={PurchaseInvoicePage} roles={["admin"]} />} />
          <Route path="/goods-receipt" element={<PrivateRoute element={GoodsReceipt} roles={["admin"]} />} />
          <Route path="/purchase-analytics" element={<PrivateRoute element={PurchaseAnalytics} roles={["admin"]} />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default AppLayout;
