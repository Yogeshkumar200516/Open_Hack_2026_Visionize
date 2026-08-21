import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import API_BASE_URL from "../../Context/Api";

/**
 * Generate and download Return Stock List PDF
 * @param {Array} filteredList - Array of return stock objects from table
 * @param {string} token - Auth token for multi-tenant requests
 */
export const generateReturnStockListPDF = async (filteredList = [], token) => {
  if (!token) {
    alert("Auth token missing. Please login first.");
    return;
  }

  // Fetch company info
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

  const doc = new jsPDF({ orientation: "potrait", unit: "pt", format: "a4" });

  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const HEADER_HEIGHT = 90;
  let lastTableY = 0;

  const formatCurrency = (value) => {
    const numValue = Number(value || 0).toFixed(2);
    return numValue;
  };

  // Header
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

  // Footer with centered page numbers
  const drawFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
        .setFontSize(9)
        .setTextColor(100)
        .setFont("helvetica", "normal");
      doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 8, { align: "center" });
    }
  };

  // Sort data by date
  const sortedData = [...filteredList].sort(
    (a, b) => new Date(b.return_date) - new Date(a.return_date)
  );

  // Table structure for Return Stock
  const headers = [
    ["S.No", "Type", "Return No", "Product", "Pending", "Verified", "Status", "Date"],
  ];
  
  const rows = sortedData.map((ret, i) => [
    i + 1,
    ret.return_type === 'sales_return' ? 'Sales' : 'Purchase',
    ret.return_number || "N/A",
    ret.product_name || "N/A",
    ret.pending_quantity || 0,
    ret.verified_quantity || 0,
    ret.verification_status?.replace('_', ' ').toUpperCase() || "PENDING",
    new Date(ret.return_date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
  ]);

  // Totals
  const totalPending = sortedData.reduce((sum, d) => sum + Number(d.pending_quantity || 0), 0);
  const totalVerified = sortedData.reduce((sum, d) => sum + Number(d.verified_quantity || 0), 0);
  const totalReturns = sortedData.length;

  // Generate table
  autoTable(doc, {
    head: headers,
    body: rows,
    margin: { top: HEADER_HEIGHT + 50, left: 25, right: 25 },
    styles: {
      fontSize: 9,
      font: "helvetica",
      valign: "middle",
      textColor: 20,
      cellPadding: { top: 4, bottom: 4, left: 8, right: 5 },
      overflow: 'linebreak'
    },
    headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: "bold", fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 60 },
      2: { cellWidth: 80 },
      3: { cellWidth: 120 },
      4: { cellWidth: 50 },
      5: { halign: 'center', cellWidth: 60 },
      6: { halign: 'center', cellWidth: 60 },
      7: { cellWidth: 80 },
      8: { cellWidth: 80 },
    },
    didDrawPage: (data) => {
      doc.setDrawColor(0).setLineWidth(1).rect(20, 20, PAGE_WIDTH - 40, PAGE_HEIGHT - 40);
      drawHeader();

      doc.setFontSize(13).setTextColor(0).setFont("helvetica", "bold");
      doc.text(
        "Return Stock Verification List",
        PAGE_WIDTH / 2,
        HEADER_HEIGHT + 35,
        { align: "center" }
      );

      const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
      const totalPages = doc.internal.getNumberOfPages();
      if (currentPage === totalPages) lastTableY = data.cursor.y;
    },
  });

  // Add Summary Box
  const finalPage = doc.getNumberOfPages();
  doc.setPage(finalPage);

  let boxY = lastTableY + 20;
  const boxX = PAGE_WIDTH - 280;
  const boxWidth = 240;
  const boxHeight = 90;

  if (boxY + boxHeight + 40 > PAGE_HEIGHT) {
    doc.addPage();
    drawHeader();
    doc.setFontSize(13).setTextColor(0).setFont("helvetica", "bold");
    doc.text(
      "Return Stock Verification List (Continued)",
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
  
  // Total Returns
  doc.text("Total Returns:", labelX, currentY);
  doc.text(totalReturns.toString(), valueX, currentY, { align: "right" });

  currentY += 20;
  
  // Total Pending
  doc.text("Total Pending:", labelX, currentY);
  doc.text(totalPending.toString(), valueX, currentY, { align: "right" });

  currentY += 20;
  
  // Total Verified
  doc.setFontSize(12).setTextColor(0).setFont("helvetica", "bold");
  doc.text("Total Verified:", labelX, currentY);
  doc.text(totalVerified.toString(), valueX, currentY, { align: "right" });

  // Footer with centered page numbers
  drawFooter();

  // Save file
  doc.save("Return_Stock_Verification_List.pdf");
};
