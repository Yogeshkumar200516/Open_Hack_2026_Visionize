import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import API_BASE_URL from "../../Context/Api";

/**
 * Generate and download Invoice/Bill list PDF.
 * @param {Array} filteredList - Array of filtered invoice or bill objects (already filtered in frontend).
 * @param {string} token - Auth token for multi-tenant requests.
 */
export const generateInvoiceListPDF = async (filteredList = [], token) => {
  if (!token) {
    alert("Auth token missing. Please login first.");
    return;
  }

  const subscriptionType = localStorage.getItem("subscriptionType") || "invoice";

  // 🔹 Fetch company info
  let company = {};
  try {
    const response = await axios.get(`${API_BASE_URL}/api/company/info`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    company = response.data || {};
  } catch (err) {
    console.error("❌ Error fetching company info:", err);
    alert("Failed to fetch company info. Cannot generate PDF.");
    return;
  }

  const companyName = company?.company_name || "Company Name";
  const addressLines = company?.address
    ? company.address.split("\n")
    : ["Address Line 1", "Address Line 2"];
  const gstin = company?.gst_no ? `GSTIN : ${company.gst_no}` : "GSTIN : N/A";
  const phones = `Cell : ${company?.cell_no1 || ""}${
    company?.cell_no2 ? `, ${company.cell_no2}` : ""
  }`;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const HEADER_HEIGHT = 90;
  let lastTableY = 0;

  const formatCurrency = (value) => Number(value || 0).toFixed(2);

  // 🔹 Header
  const drawHeader = () => {
    const HEADER_TOP_OFFSET = 15;
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(40);
    doc.text(gstin, 40, 30 + HEADER_TOP_OFFSET);
    doc.text(phones, PAGE_WIDTH - 40, 30 + HEADER_TOP_OFFSET, { align: "right" });

    doc.setFontSize(16).setTextColor(0);
    doc.text(companyName, PAGE_WIDTH / 2, 48 + HEADER_TOP_OFFSET, { align: "center" });

    doc.setFontSize(10).setFont("helvetica", "normal");
    const addressText = addressLines.join(" ");
    const wrappedAddress = doc.splitTextToSize(addressText, PAGE_WIDTH * 0.6);
    wrappedAddress.forEach((line, index) => {
      doc.text(line, PAGE_WIDTH / 2, 70 + index * 12 + HEADER_TOP_OFFSET, { align: "center" });
    });

    doc.setDrawColor(0).setLineWidth(0.4);
    doc.line(40, 90 + HEADER_TOP_OFFSET, PAGE_WIDTH - 40, 90 + HEADER_TOP_OFFSET);
  };

  // 🔹 Footer
  const drawFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
        .setFontSize(9)
        .setTextColor(100)
        .setFont("helvetica", "normal");
      doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - 60, PAGE_HEIGHT - 20);
    }
  };

  // 🔹 Use already filtered data from frontend
  const sortedData = [...filteredList].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  // 🔹 Table structure
  let headers = [];
  let rows = [];

  if (subscriptionType === "bill") {
    headers = [["#", "Bill No", "Created By", "Discount", "Transport", "Date", "Total"]];
    rows = sortedData.map((bill, i) => [
      i + 1,
      bill.bill_number || "N/A",
      bill.created_by_name || "N/A",
      formatCurrency(bill.discount_value),
      formatCurrency(bill.transport_charge),
      new Date(bill.created_at).toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      formatCurrency(bill.subtotal),
    ]);
  } else {
    headers = [
      ["#", "Customer Name", "GST No", "Invoice No", "Discount", "Transport", "Date", "Total"],
    ];
    rows = sortedData.map((inv, i) => [
      i + 1,
      inv.customer_name || "Anonymous",
      inv.customer_gst_number || "N/A",
      inv.invoice_number || "N/A",
      formatCurrency(inv.discount_value),
      formatCurrency(inv.transport_charge),
      new Date(inv.created_at).toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      formatCurrency(inv.total_amount),
    ]);
  }

  // 🔹 Totals
  const totalAmount = sortedData.reduce(
    (sum, d) =>
      sum + Number(subscriptionType === "bill" ? d.subtotal || 0 : d.total_amount || 0),
    0
  );
  const totalDiscount = sortedData.reduce(
    (sum, d) => sum + Number(d.discount_value || 0),
    0
  );
  const totalTransport = sortedData.reduce(
    (sum, d) => sum + Number(d.transport_charge || 0),
    0
  );

  // 🔹 Generate table
  autoTable(doc, {
    head: headers,
    body: rows,
    margin: { top: HEADER_HEIGHT + 50, left: 40, right: 40 },
    styles: {
      fontSize: 10,
      font: "helvetica",
      valign: "middle",
      textColor: 20,
      cellPadding: { top: 5, bottom: 5, left: 10, right: 5 },
    },
    headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: "bold", fontSize: 10 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didDrawPage: (data) => {
      doc.setDrawColor(0).setLineWidth(1).rect(20, 20, PAGE_WIDTH - 40, PAGE_HEIGHT - 40);
      drawHeader();

      doc.setFontSize(13).setTextColor(0).setFont("helvetica", "bold");
      doc.text(
        subscriptionType === "bill"
          ? "Overall Generated Bills List"
          : "Overall Generated Invoices List",
        PAGE_WIDTH / 2,
        HEADER_HEIGHT + 35,
        { align: "center" }
      );

      const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
      const totalPages = doc.internal.getNumberOfPages();
      if (currentPage === totalPages) lastTableY = data.cursor.y;
    },
  });

  // 🔹 Add Summary Box
  const finalPage = doc.getNumberOfPages();
  doc.setPage(finalPage);

  let boxY = lastTableY + 20;
  const boxX = PAGE_WIDTH - 280;
  const boxWidth = 240;
  const boxHeight = 80;

  if (boxY + boxHeight + 40 > PAGE_HEIGHT) {
    doc.addPage();
    drawHeader();
    doc.setFontSize(13).setTextColor(0).setFont("helvetica", "bold");
    doc.text(
      subscriptionType === "bill"
        ? "Overall Generated Bills List (Continued)"
        : "Overall Generated Invoices List (Continued)",
      PAGE_WIDTH / 2,
      HEADER_HEIGHT + 35,
      { align: "center" }
    );
    boxY = HEADER_HEIGHT + 70;
  }

  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(20);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 4, 4, "F");
  doc.setDrawColor(160).setLineWidth(0.5);
  doc.line(boxX, boxY - 10, PAGE_WIDTH - 40, boxY - 10);

  let currentY = boxY + 20;
  const labelX = boxX + 10;
  const valueX = PAGE_WIDTH - 50;

  doc.setFontSize(11).setTextColor(60);
  doc.text("Total Discount:", labelX, currentY);
  doc.text("Rs. " + formatCurrency(totalDiscount), valueX, currentY, { align: "right" });

  currentY += 20;
  doc.text("Total Transport:", labelX, currentY);
  doc.text("Rs. " + formatCurrency(totalTransport), valueX, currentY, { align: "right" });

  currentY += 20;
  doc.setFontSize(12).setTextColor(0).setFont("helvetica", "bold");
  doc.text("Grand Total:", labelX, currentY);
  doc.text("Rs. " + formatCurrency(totalAmount), valueX, currentY, { align: "right" });

  // 🔹 Footer
  drawFooter();

  // Save file
  doc.save(subscriptionType === "bill" ? "Bill_List.pdf" : "Invoice_List.pdf");
};
