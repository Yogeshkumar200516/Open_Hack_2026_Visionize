// src/utils/sendInvoiceToCustomer.js

import axios from "axios";
import API_BASE_URL from "../Context/Api";

/**
 * Sends the generated invoice PDF Blob to backend for email + WhatsApp delivery.
 *
 * @param {Blob} pdfBlob - PDF file in Blob format
 * @param {Object} customer - Customer details { name, email, whatsapp_number, invoiceNo }
 * @param {string} token - JWT authentication token
 * @returns {Promise<Object>} - Response from backend
 */
export const sendInvoiceToCustomer = async (pdfBlob, customer, token) => {
  if (!pdfBlob || !customer) {
    throw new Error("Missing PDF or customer data.");
  }
  if (!token) {
    throw new Error("Authorization token missing.");
  }

  const formData = new FormData();
  formData.append("pdf", pdfBlob, `Invoice_${customer.invoiceNo || "Bill"}.pdf`);
  formData.append("name", customer.name || "");
  formData.append("email", customer.email || "");
  formData.append("whatsapp", customer.whatsapp_number || "");

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/invoices/send-to-customer`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`, // Authorization header
        },
      }
    );

    // Check backend success flag, throw error if failed
    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to send invoice");
    }

    return response.data;
  } catch (error) {
    console.error("❌ Failed to send invoice to customer:", error);
    // Optionally show user notification/snackbar here
    throw error;
  }
};
