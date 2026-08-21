import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import API_BASE_URL from "../../Context/Api";

// 🔑 Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const generateDiscountsByProductPDF = async (
  discountsByProduct = [],
  subscriptionType = "invoice"
) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // 🔄 Fetch company info with token
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

  const safeToFixed = (val) =>
    isNaN(val) || val === null || val === undefined
      ? "0.00"
      : Number(val).toFixed(2);

  const formatCurrency = (val) =>
    Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

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

  const headers = [
    [
      "S.No",
      "Product",
      "Avg. Discount",
      "Min. Discount",
      "Max. Discount",
      "Total Discount",
    ],
  ];

  const rows = discountsByProduct.map((disc, i) => [
    i + 1,
    disc.product_name,
    safeToFixed(disc.avg_discount),
    safeToFixed(disc.min_discount),
    safeToFixed(disc.max_discount),
    safeToFixed(disc.total_discount_amount),
  ]);

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
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { fontStyle: "bold", textColor: [0, 102, 204], halign: "right" },
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didDrawPage: () => {
      doc.setDrawColor(0);
      doc.setLineWidth(1);
      doc.rect(20, 20, PAGE_WIDTH - 40, PAGE_HEIGHT - 40);
      drawHeader();
      doc.setFontSize(13);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text(
        "Product wise Discount List",
        PAGE_WIDTH / 2,
        HEADER_HEIGHT + 35,
        {
          align: "center",
        }
      );
    },
  });

  // Calculate totals
  const totalMin = discountsByProduct.reduce(
    (acc, d) => acc + (parseFloat(d.min_discount) || 0),
    0
  );
  const totalMax = discountsByProduct.reduce(
    (acc, d) => acc + (parseFloat(d.max_discount) || 0),
    0
  );
  const totalDiscount = discountsByProduct.reduce(
    (acc, d) => acc + (parseFloat(d.total_discount_amount) || 0),
    0
  );

  // Place the summary
  const finalPage = doc.getNumberOfPages();
  doc.setPage(finalPage);

  const lastTableY = doc.lastAutoTable.finalY || HEADER_HEIGHT + 100;
  let boxY = lastTableY + 20;
  const boxX = PAGE_WIDTH - 280;
  const boxWidth = 240;
  const boxHeight = 80;
  const bottomMargin = 40;
  const topMarginForBoxOnNewPage = 150;

  if (boxY + boxHeight + bottomMargin > PAGE_HEIGHT) {
    doc.addPage();
    boxY = topMarginForBoxOnNewPage;
    drawHeader();
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(
      "Product wise Discount List (Continued)",
      PAGE_WIDTH / 2,
      HEADER_HEIGHT + 35,
      {
        align: "center",
      }
    );
  }

  // Draw styled summary box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 4, 4, "F");

  doc.setDrawColor(160);
  doc.setLineWidth(0.5);
  doc.line(boxX, boxY - 10, PAGE_WIDTH - 40, boxY - 10);

  const labelX = boxX + 10;
  const valueX = PAGE_WIDTH - 50;
  let currentY = boxY + 20;

  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text("Total Min Discount:", labelX, currentY);
  doc.text("Rs. " + formatCurrency(totalMin), valueX, currentY, {
    align: "right",
  });

  currentY += 20;
  doc.text("Total Max Discount:", labelX, currentY);
  doc.text("Rs. " + formatCurrency(totalMax), valueX, currentY, {
    align: "right",
  });

  currentY += 20;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Total Discount Given:", labelX, currentY);
  doc.text("Rs. " + formatCurrency(totalDiscount), valueX, currentY, {
    align: "right",
  });

  drawFooter();
  doc.save("Discounts_By_Product.pdf");
};
