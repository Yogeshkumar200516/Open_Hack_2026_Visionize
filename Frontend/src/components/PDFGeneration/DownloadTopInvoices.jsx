import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import API_BASE_URL from "../../Context/Api";

// 🔑 Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const generateHighGSTInvoicesPDF = async (
  highGstInvoices = [],
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

  const formatCurrency = (v) => Number(v || 0).toFixed(2);

  // Header drawing
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
      doc.text(line, PAGE_WIDTH / 2, 70 + index * 12 + offset, { align: "center" });
    });

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.line(40, 90 + offset, PAGE_WIDTH - 40, 90 + offset);
  };

  // Footer drawing with page numbers
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

  // Dynamic labels and keys based on subscriptionType
  const docNumberLabel = subscriptionType === "bill" ? "Bill Number" : "Invoice Number";
  const docDateLabel = subscriptionType === "bill" ? "Bill Date" : "Invoice Date";
  const docNumberKey = subscriptionType === "bill" ? "invoice_number" : "invoice_number";
  const docDateKey = subscriptionType === "bill" ? "invoice_date" : "invoice_date";

  // Table headers
  const headers = [
    [
      "S.No",
      "Customer Name",
      docNumberLabel,
      docDateLabel,
      "GST Amount",
      "Total Amount",
    ],
  ];

  // Table rows formatting
  const rows = highGstInvoices.map((inv, i) => [
    i + 1,
    inv.customer_name || "-",
    inv[docNumberKey] || "-",
    inv[docDateKey]
      ? new Date(inv[docDateKey]).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "-",
    formatCurrency(inv.gst_amount),
    formatCurrency(inv.total_amount),
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
      4: { halign: "right", fontStyle: "bold" },
      5: { halign: "right", fontStyle: "bold" },
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
        `Top GST ${subscriptionType === "bill" ? "Bills" : "Invoices"} List`,
        PAGE_WIDTH / 2,
        HEADER_HEIGHT + 35,
        {
          align: "center",
        }
      );

      if (currentPage === totalPages) {
        lastTableY = data.cursor.y;
      }
    },
  });

  // Calculate totals
  const totalGST = highGstInvoices.reduce(
    (sum, inv) => sum + Number(inv.gst_amount || 0),
    0
  );
  const totalAmount = highGstInvoices.reduce(
    (sum, inv) => sum + Number(inv.total_amount || 0),
    0
  );

  const summaryHeight = 90;
  const spacingAfterTable = 30;
  let currentY = lastTableY + spacingAfterTable;

  // Add page if summary won't fit
  if (currentY + summaryHeight + 40 > PAGE_HEIGHT) {
    doc.addPage();
    drawHeader();

    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(
      `Top GST ${subscriptionType === "bill" ? "Bills" : "Invoices"} List`,
      PAGE_WIDTH / 2,
      HEADER_HEIGHT + 35,
      {
        align: "center",
      }
    );

    currentY = HEADER_HEIGHT + 80;
  }

  // Draw summary box
  const boxX = PAGE_WIDTH - 300;
  const boxWidth = 260;

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(boxX, currentY, boxWidth, summaryHeight, 4, 4, "F");

  doc.setDrawColor(160);
  doc.setLineWidth(0.5);
  doc.line(40, currentY - 10, PAGE_WIDTH - 40, currentY - 10);

  const labelX = boxX + 10;
  const valueX = PAGE_WIDTH - 50;
  let textY = currentY + 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text("Total GST Amount:", labelX, textY);
  doc.text("Rs. " + formatCurrency(totalGST), valueX, textY, {
    align: "right",
  });

  textY += 20;
  doc.text("Total Invoice Amount:", labelX, textY);
  doc.text("Rs. " + formatCurrency(totalAmount), valueX, textY, {
    align: "right",
  });

  drawFooter();
  doc.save(`Top_GST_${subscriptionType === "bill" ? "Bills" : "Invoices"}.pdf`);
};
