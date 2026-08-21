import { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // ✅ INITIAL AUTH CHECK (RUNS ON APP LOAD)
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      clearAuth();
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;

      // 🔴 Token expired → logout immediately
      if (decoded.exp < currentTime) {
        console.warn("🔒 Token expired");
        handleLogout();
        return;
      }

      const parsedUser = JSON.parse(userData);

      // ✅ Set user with correct tenant_id from token
      const finalUser = {
        ...parsedUser,
        tenant_id: decoded.tenant_id,
        role: parsedUser.role,
      };

      setUser(finalUser);
      setIsAuthenticated(true);

    } catch (error) {
      console.error("❌ Token decode failed:", error);
      handleLogout();
    }
  }, []);

  // ✅ LOGIN HANDLER (CENTRALIZED)
  const handleLogin = (userData, token) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("user", JSON.stringify(userData));

    setUser(userData);
    setIsAuthenticated(true);
  };

  // ✅ LOGOUT HANDLER
  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  // ✅ CLEAR AUTH (REUSABLE)
  const clearAuth = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("tenantId");

    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);