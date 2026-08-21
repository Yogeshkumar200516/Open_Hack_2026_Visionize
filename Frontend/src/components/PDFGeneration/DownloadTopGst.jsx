import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import API_BASE_URL from "../../Context/Api";

// 🔑 helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const generateTopGSTProductsPDF = async (topProducts = [], subscriptionType = "invoice") => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // 🔄 Fetch company info (tenant-aware)
  let company = {};
  try {
    const { data } = await axios.get(`${API_BASE_URL}/api/company/info`, {
      headers: getAuthHeaders(),
    });
    company = data;
  } catch (err) {
    console.error("Failed to fetch company info:", err);
  }

  const companyName = company?.company_name || "Company Name";
  const addressLines = company?.address
    ? company.address.split("\n")
    : ["Address Line 1", "Address Line 2"];
  const gstin = company?.gst_no ? `GSTIN : ${company.gst_no}` : "GSTIN : N/A";
  const phones = `Cell : ${company?.cell_no1 || ""}${
    company?.cell_no2 ? `, ${company.cell_no2}` : ""
  }`;

  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const HEADER_HEIGHT = 90;

  const formatCurrency = (v) => Number(v || 0).toFixed(2);
  const formatNumber = (v) => Number(v || 0).toLocaleString("en-IN");

  const drawHeader = () => {
    const offset = 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40);

    doc.text(gstin, 40, 30 + offset);
    doc.text(phones, PAGE_WIDTH - 40, 30 + offset, { align: "right" });

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(companyName, PAGE_WIDTH / 2, 48 + offset, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const addressText = addressLines.join(" ");
    const wrappedAddress = doc.splitTextToSize(addressText, PAGE_WIDTH * 0.6);
    wrappedAddress.forEach((line, index) => {
      doc.text(line, PAGE_WIDTH / 2, 70 + index * 12 + offset, {
        align: "center",
      });
    });

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.line(40, 90 + offset, PAGE_WIDTH - 40, 90 + offset);
  };

  const drawFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - 60, PAGE_HEIGHT - 10);
    }
  };

  // Table headers remain stable; no subscriptionType change needed here since it's product-focused
  const headers = [
    [
      "S.No",
      "Product Name",
      "HSN",
      "Category",
      "Quantity Sold",
      "Total Sales",
      "Avg. GST Rate",
      "Total Discount",
      "Total GST",
    ],
  ];

  const rows = topProducts.map((p, i) => [
    i + 1,
    p.product_name,
    p.hsn_code || "N/A",
    p.category_name || "N/A",
    formatNumber(p.total_quantity),
    formatCurrency(p.total_sales),
    formatCurrency(p.avg_gst_rate),
    formatCurrency(p.total_discount_given),
    formatCurrency(p.gst_collected),
  ]);

  let lastTableY = 0;

  autoTable(doc, {
    head: headers,
    body: rows,
    margin: { top: HEADER_HEIGHT + 50, left: 40, right: 40 },
    styles: {
      fontSize: 10,
      font: "helvetica",
      cellPadding: 5,
      textColor: 20,
      valign: "middle",
    },
    headStyles: {
      fillColor: [50, 50, 50],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 10,
      halign: "left",
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold" },
      1: { halign: "left" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right", fontStyle: "bold" },
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didDrawPage: (data) => {
      const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
      const totalPages = doc.internal.getNumberOfPages();

      doc.setDrawColor(0);
      doc.setLineWidth(1);
      doc.rect(20, 20, PAGE_WIDTH - 40, PAGE_HEIGHT - 40);

      drawHeader();

      doc.setFontSize(13);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text(
        "Top GST Contributing Products List",
        PAGE_WIDTH / 2,
        HEADER_HEIGHT + 35,
        { align: "center" }
      );

      if (currentPage === totalPages) {
        lastTableY = data.cursor.y;
      }
    },
  });

  // Totals
  const totalSales = topProducts.reduce(
    (sum, p) => sum + Number(p.total_sales || 0),
    0
  );
  const totalDiscount = topProducts.reduce(
    (sum, p) => sum + Number(p.total_discount_given || 0),
    0
  );
  const totalGST = topProducts.reduce(
    (sum, p) => sum + Number(p.gst_collected || 0),
    0
  );

  const summaryHeight = 90;
  const spacing = 30;
  let currentY = lastTableY + spacing;

  if (currentY + summaryHeight + 40 > PAGE_HEIGHT) {
    doc.addPage();
    drawHeader();

    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(
      "Top GST Contributing Products List",
      PAGE_WIDTH / 2,
      HEADER_HEIGHT + 35,
      { align: "center" }
    );

    currentY = HEADER_HEIGHT + 150;
  }

  const boxX = PAGE_WIDTH - 300;
  const boxWidth = 250;

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(boxX, currentY, boxWidth, summaryHeight, 4, 4, "F");

  const labelX = boxX + 10;
  const valueX = PAGE_WIDTH - 50;
  let textY = currentY + 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text("Total Sales:", labelX, textY);
  doc.text("Rs. " + formatCurrency(totalSales), valueX, textY, {
    align: "right",
  });

  textY += 20;
  doc.text("Total Discount:", labelX, textY);
  doc.text("Rs. " + formatCurrency(totalDiscount), valueX, textY, {
    align: "right",
  });

  textY += 20;
  doc.text("Total GST Collected:", labelX, textY);
  doc.text("Rs. " + formatCurrency(totalGST), valueX, textY, {
    align: "right",
  });

  drawFooter();
  doc.save("Top_GST_Products.pdf");
};
