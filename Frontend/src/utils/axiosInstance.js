/**
 * axiosInstance.js
 *
 * A shared Axios instance that:
 *  1. Reads the auth token FRESH from localStorage on EVERY request
 *     (fixes the stale-token bug where useRef captures the token at mount time
 *     and never updates it)
 *  2. Adds a 30-second timeout so hanging requests never block the UI forever
 *  3. Intercepts 401 responses and automatically clears auth + redirects to /login
 *
 * Usage (replaces inline useRef axios.create):
 *   import axiosInstance from "../../utils/axiosInstance";
 *   const { data } = await axiosInstance.get("/suppliers", { params });
 */

import axios from "axios";
import API_BASE_URL from "../Context/Api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30s — prevents requests from hanging forever
});

// ── Request interceptor: inject FRESH token on every call ─────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 and global network errors ────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      console.warn("🔒 401 Unauthorized — clearing auth and redirecting to login");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      localStorage.removeItem("tenantId");
      // Use window.location so it works outside React Router context too
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
