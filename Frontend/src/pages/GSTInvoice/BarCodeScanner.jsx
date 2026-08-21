// BarCodeScanner.jsx
import React, { useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../Context/Api";

export default function BarCodeScanner({ onProductFound }) {
  const [error, setError] = useState("");
  const [barcode, setBarcode] = useState("");

  // Get token from localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchProductByBarcode = async (barcode) => {
    try {
      setError("");
      if (!barcode.trim()) return;

      const headers = getAuthHeaders();
      const res = await axios.get(
        `${API_BASE_URL}/api/products/get-by-barcode/${encodeURIComponent(
          barcode
        )}`,
        { headers }
      );

      if (res?.data) {
        onProductFound?.(res.data); // safer call
      } else {
        setError("Product not found");
      }
    } catch (err) {
      console.error("❌ Error fetching product by barcode:", err);
      setError(err.response?.data?.message || "Failed to fetch product");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchProductByBarcode(barcode);
  };

  return (
    <div>
      <h3>Barcode Scanner</h3>
      <form onSubmit={handleSubmit}>
        <input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Scan or type barcode"
        />
        <button type="submit">Lookup</button>
      </form>
      {error && <div style={{ color: "red" }}>{error}</div>}
    </div>
  );
}
