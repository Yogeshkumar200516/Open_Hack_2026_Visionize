import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, user } = useAuth();

  // 🔴 Not logged in
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // 🔴 Tenant check (skip for super_admin)
  if (user.role !== "super_admin" && !user.tenant_id) {
    console.error("❌ Missing tenant_id for non-super admin");
    return <Navigate to="/login" replace />;
  }

  // 🔴 Role check
  if (!allowedRoles.includes(user.role)) {
    let fallbackPath = "/login";

    switch (user.role) {
      case "super_admin":
        fallbackPath = "/add-company";
        break;
      case "admin":
        fallbackPath = "/";
        break;
      case "cashier":
        fallbackPath = "/gst-invoice";
        break;
      case "sales":
        fallbackPath = "/sales";
        break;
      default:
        fallbackPath = "/login";
    }

    return <Navigate to={fallbackPath} replace />;
  }

  // ✅ Authorized
  return children;
};

export default ProtectedRoute;