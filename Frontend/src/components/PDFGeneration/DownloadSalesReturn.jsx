import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import API_BASE_URL from "../../Context/Api";

/**
 * Generate and download Sales Returns List PDF (matching Invoice List PDF style exactly)
 * @param {Array} filteredList - Array of sales return objects from table
 * @param {string} token - Auth token for multi-tenant requests
 */
export const generateSalesReturnsListPDF = async (filteredList = [], token) => {
  if (!token) {
    alert("Auth token missing. Please login first.");
    return;
  }

  const subscriptionType = localStorage.getItem("subscriptionType") || "sales_returns";

  // 🔹 Fetch company info (EXACT SAME as sample)
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
    ? company.address.split("\\n")
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

  // ✅ FIXED: formatCurrency now returns string without special encoding
  const formatCurrency = (value) => {
    const numValue = Number(value || 0).toFixed(2);
    return numValue; // Returns plain string like "1234.50"
  };

  // 🔹 Header (EXACT SAME as sample)
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
    doc.line(20, 90 + HEADER_TOP_OFFSET, PAGE_WIDTH - 20, 90 + HEADER_TOP_OFFSET);
  };

  // ✅ FIXED: Footer now displays page number in BOTTOM CENTER (not bottom right)
  const drawFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
        .setFontSize(9)
        .setTextColor(100)
        .setFont("helvetica", "normal");
      // ✅ Changed: Display page number in center bottom
      doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 8, { align: "center" });
    }
  };

  // 🔹 Use already filtered data from frontend
  const sortedData = [...filteredList].sort(
    (a, b) => new Date(b.return_date) - new Date(a.return_date)
  );

  // 🔹 Table structure for Sales Returns (matching table columns)
  const headers = [
    ["S.No", "Return No", "Customer", "Invoice No", "Items", "Total Qty", "Date", "Amount"],
  ];
  
  // ✅ FIXED: Amount formatting - removed ₹ from table, will add separately
  const rows = sortedData.map((ret, i) => [
  i + 1,
  ret.return_number || "N/A",
  // ✅ FIXED: Show full mobile number without truncation
  ret.customer_mobile 
    ? `${ret.customer_name || "N/A"} (${ret.customer_mobile})` 
    : ret.customer_name || "N/A",
  ret.original_invoice_number || "N/A",
  ret.total_items || 0,
  ret.total_quantity || 0,
//   ret.overall_verification_status?.replace('_', ' ').toUpperCase() || "PENDING",
  new Date(ret.return_date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }),
    formatCurrency(ret.total_amount),
]);


  // 🔹 Totals (matching sample logic)
  const totalAmount = sortedData.reduce((sum, d) => sum + Number(d.total_amount || 0), 0);
  const totalItemsCount = sortedData.reduce((sum, d) => sum + Number(d.total_items || 0), 0);
  const totalQuantity = sortedData.reduce((sum, d) => sum + Number(d.total_quantity || 0), 0);

  // 🔹 Generate table (EXACT SAME STYLES as sample)
  autoTable(doc, {
    head: headers,
    body: rows,
    margin: { top: HEADER_HEIGHT + 50, left: 25, right: 25 },
    styles: {
      fontSize: 10,
      font: "helvetica",
      valign: "middle",
      textColor: 20,
      cellPadding: { top: 5, bottom: 5, left: 10, right: 5 },
      overflow: 'linebreak'
    },
    headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: "bold", fontSize: 10 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 80 }, // Return No
      2: { cellWidth: 100 }, // Customer
      3: { cellWidth: 100 }, // Invoice No
      7: { halign: 'right', cellWidth: 90, fontStyle: "bold" }, // Amount - right aligned
    //   7: { cellWidth: 50 }, // Status
    },
    didDrawPage: (data) => {
      doc.setDrawColor(0).setLineWidth(1).rect(20, 20, PAGE_WIDTH - 40, PAGE_HEIGHT - 40);
      drawHeader();

      doc.setFontSize(13).setTextColor(0).setFont("helvetica", "bold");
      doc.text(
        "Overall Sales Returns List",
        PAGE_WIDTH / 2,
        HEADER_HEIGHT + 35,
        { align: "center" }
      );

      const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
      const totalPages = doc.internal.getNumberOfPages();
      if (currentPage === totalPages) lastTableY = data.cursor.y;
    },
  });

  // 🔹 Add Summary Box (SALES RETURNS SPECIFIC - matching sample positioning)
  const finalPage = doc.getNumberOfPages();
  doc.setPage(finalPage);

  let boxY = lastTableY + 20;
  const boxX = PAGE_WIDTH - 280;
  const boxWidth = 240;
  const boxHeight = 100;

  if (boxY + boxHeight + 40 > PAGE_HEIGHT) {
    doc.addPage();
    drawHeader();
    doc.setFontSize(13).setTextColor(0).setFont("helvetica", "bold");
    doc.text(
      "Overall Sales Returns List (Continued)",
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
  
  // ✅ Total Items
  doc.text("Total Items:", labelX, currentY);
  doc.text(totalItemsCount.toString(), valueX, currentY, { align: "right" });

  currentY += 20;
  
  // ✅ Total Quantity
  doc.text("Total Quantity:", labelX, currentY);
  doc.text(totalQuantity.toString(), valueX, currentY, { align: "right" });

  currentY += 20;
  
  // ✅ FIXED: Grand Total - plain number formatting
  doc.setFontSize(12).setTextColor(0).setFont("helvetica", "bold");
  doc.text("Grand Total:", labelX, currentY);
  const grandTotalFormatted = formatCurrency(totalAmount); // ✅ Plain number
  doc.text(`Rs. ${grandTotalFormatted}`, valueX, currentY, { align: "right" });

  // 🔹 Footer with centered page numbers
  drawFooter();

  // Save file (matching sample naming)
  doc.save("Sales_Returns_List.pdf");
};
