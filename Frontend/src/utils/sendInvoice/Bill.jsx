import axios from "axios";
import API_BASE_URL from "../../Context/Api";

export const sendInvoiceOrBill = async ({ type, number, customerEmail, pdfBase64, token }) => {
  try {
    const endpoint = type === "bill" 
      ? `${API_BASE_URL}/api/send/send-bill` 
      : `${API_BASE_URL}/api/send/send-invoice`;

    const response = await axios.post(
      endpoint,
      {
        invoiceNumber: number,
        customerEmail,
        pdfBase64,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return {
      success: response.data?.success || false,
      message: response.data?.message || "No message",
    };
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || error.message || "Unknown error sending PDF",
    };
  }
};
