import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import API_BASE_URL from "../../Context/Api";

// 🔑 Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const generateGstByUserPDF = async (gstByUser = [], subscriptionType = "invoice") => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // 🔄 Fetch company info securely
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

  const safeToLocaleString = (val) =>
    isNaN(val) || val === null || val === undefined
      ? "0"
      : Number(val).toLocaleString("en-IN");

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

  const docLabelPlural = subscriptionType === "bill" ? "Bills Created" : "Invoices Created";
  const avgGstLabel    = subscriptionType === "bill" ? "Avg. GST (Bill)" : "Avg. GST (Inv)";
  const docCreatedKey  = subscriptionType === "bill" ? "total_bills" : "total_invoices";
  const avgGstKey      = subscriptionType === "bill" ? "avg_gst_per_bill" : "avg_gst_per_invoice";

  const headers = [
    [
      "S.No",
      "User Name",
      "Role",
      avgGstLabel,
      "Total Sales",
      docLabelPlural,
      "GST Collected",
    ],
  ];

  const rows = gstByUser.map((user, i) => [
    i + 1,
    `${user.first_name} ${user.last_name}`,
    user.role.charAt(0).toUpperCase() + user.role.slice(1),
    safeToFixed(user[avgGstKey]),
    safeToLocaleString(user.total_sales),
    safeToLocaleString(user[docCreatedKey]),
    safeToFixed(user.total_gst_collected),
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
      2: { halign: "left" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "center" },
      6: { fontStyle: "bold", textColor: [0, 102, 204], halign: "right" },
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didDrawPage: (data) => {
      doc.setDrawColor(0);
      doc.setLineWidth(1);
      doc.rect(20, 20, PAGE_WIDTH - 40, PAGE_HEIGHT - 40);

      drawHeader();

      doc.setFontSize(13);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text(
        "GST Reported by User (Admin/Cashier) List",
        PAGE_WIDTH / 2,
        HEADER_HEIGHT + 35,
        { align: "center" }
      );

      if (
        doc.internal.getCurrentPageInfo().pageNumber ===
        doc.internal.getNumberOfPages()
      ) {
        lastTableY = data.cursor.y;
      }
    },
  });

  // ✅ Totals
  const totalSales = gstByUser.reduce(
    (sum, u) => sum + Number(u.total_sales || 0),
    0
  );
  const totalDocs = gstByUser.reduce(
    (sum, u) => sum + Number(u[docCreatedKey] || 0),
    0
  );
  const totalGstCollected = gstByUser.reduce(
    (sum, u) => sum + Number(u.total_gst_collected || 0),
    0
  );

  const summaryHeight = 80;
  const spacingAfterTable = 30;
  let currentY = lastTableY + spacingAfterTable;

  if (currentY + summaryHeight + 40 > PAGE_HEIGHT) {
    doc.addPage();
    drawHeader();
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(
      "GST Reported by User (Admin/Cashier) List",
      PAGE_WIDTH / 2,
      HEADER_HEIGHT + 35,
      { align: "center" }
    );
    currentY = HEADER_HEIGHT + 80;
  }

  const boxX = PAGE_WIDTH - 280;
  const boxY = currentY;
  const boxWidth = 240;
  const boxHeight = summaryHeight;

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 4, 4, "F");

  doc.setDrawColor(160);
  doc.setLineWidth(0.5);
  doc.line(40, boxY - 10, PAGE_WIDTH - 40, boxY - 10);

  const labelX = boxX + 10;
  const valueX = PAGE_WIDTH - 50;
  let textY = boxY + 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text("Total Sales:", labelX, textY);
  doc.text("Rs. " + safeToLocaleString(totalSales), valueX, textY, {
    align: "right",
  });

  textY += 20;
  doc.text(`Total ${subscriptionType === "bill" ? "Bills" : "Invoices"} Created:`, labelX, textY);
  doc.text(safeToLocaleString(totalDocs), valueX, textY, {
    align: "right",
  });

  textY += 20;
  doc.text("Total GST Collected:", labelX, textY);
  doc.text("Rs. " + safeToFixed(totalGstCollected), valueX, textY, {
    align: "right",
  });

  drawFooter();
  doc.save("GST_By_User.pdf");
};
