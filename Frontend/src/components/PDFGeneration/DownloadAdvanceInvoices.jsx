import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import API_BASE_URL from "../../Context/Api";

// 🔑 Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const generateAdvanceInvoicesPDF = async (advanceInvoices = [], subscriptionType = "invoice") => {
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
  const phones = `Cell : ${company?.cell_no1 || ""}${company?.cell_no2 ? `, ${company.cell_no2}` : ""}`;

  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const HEADER_HEIGHT = 90;

  const formatCurrency = (v) => Number(v || 0).toFixed(2);

  const drawHeader = () => {
    const offset = 15;
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(40);
    doc.text(gstin, 40, 30 + offset);
    doc.text(phones, PAGE_WIDTH - 40, 30 + offset, { align: "right" });

    doc.setFontSize(16).setTextColor(0);
    doc.text(companyName, PAGE_WIDTH / 2, 48 + offset, { align: "center" });

    doc.setFontSize(10).setFont("helvetica", "normal");
    const addressText = addressLines.join(" ");
    const wrapped = doc.splitTextToSize(addressText, PAGE_WIDTH * 0.6);
    wrapped.forEach((line, i) => {
      doc.text(line, PAGE_WIDTH / 2, 70 + i * 12 + offset, { align: "center" });
    });

    doc.setDrawColor(0).setLineWidth(0.4);
    doc.line(40, 90 + offset, PAGE_WIDTH - 40, 90 + offset);
  };

  const drawFooter = () => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(9).setTextColor(100).setFont("helvetica", "normal");
      doc.text(`Page ${i} of ${pages}`, PAGE_WIDTH - 60, PAGE_HEIGHT - 10);
    }
  };

  // Dynamic header labels based on subscriptionType
  const docLabel = subscriptionType === "bill" ? "Bill No" : "Invoice No";
  const dateLabel = subscriptionType === "bill" ? "Bill Date" : "Invoice Date";

  // Header for table adjusted dynamically
  const headers = [
    [
      "S.No",
      "Name",
      docLabel,
      dateLabel,
      "Advance",
      "Total",
      "Due Date",
      "Status",
    ],
  ];

  // Rows adapted to use bill or invoice fields
  const rows = advanceInvoices.map((inv, i) => [
    i + 1,
    inv.customer_name || "-",
    subscriptionType === "bill" ? inv.bill_number : inv.invoice_number,
    inv[subscriptionType === "bill" ? "bill_date" : "invoice_date"]
      ? new Date(inv[subscriptionType === "bill" ? "bill_date" : "invoice_date"]).toLocaleDateString("en-GB")
      : "-",
    formatCurrency(inv.advance_amount),
    formatCurrency(inv.total_amount),
    inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-GB") : "-",
    inv.payment_completion_status || "-",
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
      4: { halign: "right", fontStyle: "bold" },
      5: { halign: "right", fontStyle: "bold" },
      7: { halign: "center" },
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didDrawPage: (data) => {
      const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
      const totalPages = doc.internal.getNumberOfPages();

      doc.setDrawColor(0).setLineWidth(1);
      doc.rect(20, 20, PAGE_WIDTH - 40, PAGE_HEIGHT - 40);

      drawHeader();

      doc.setFontSize(13).setTextColor(0).setFont("helvetica", "bold");
      doc.text(
        `Advance Payment ${subscriptionType === "bill" ? "Bills" : "Invoices"}`,
        PAGE_WIDTH / 2,
        HEADER_HEIGHT + 35,
        { align: "center" }
      );

      if (currentPage === totalPages) {
        lastTableY = data.cursor.y;
      }
    },
  });

  // Summary calculation
  const totalAdvance = advanceInvoices.reduce(
    (sum, inv) => sum + Number(inv.advance_amount || 0),
    0
  );
  const totalBilled = advanceInvoices.reduce(
    (sum, inv) => sum + Number(inv.total_amount || 0),
    0
  );

  const summaryHeight = 90;
  const spacing = 30;
  let currentY = lastTableY + spacing;

  if (currentY + summaryHeight + 40 > PAGE_HEIGHT) {
    doc.addPage();
    drawHeader();

    doc.setFontSize(13).setTextColor(0).setFont("helvetica", "bold");
    doc.text(
      `Advance Payment ${subscriptionType === "bill" ? "Bills" : "Invoices"}`,
      PAGE_WIDTH / 2,
      HEADER_HEIGHT + 35,
      { align: "center" }
    );

    currentY = HEADER_HEIGHT + 80;
  }

  const boxX = PAGE_WIDTH - 300;
  const boxWidth = 260;

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(boxX, currentY, boxWidth, summaryHeight, 4, 4, "F");

  doc.setDrawColor(160).setLineWidth(0.5);
  doc.line(40, currentY - 10, PAGE_WIDTH - 40, currentY - 10);

  const labelX = boxX + 10;
  const valueX = PAGE_WIDTH - 50;
  let textY = currentY + 20;

  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(60);
  doc.text("Total Advance Amount:", labelX, textY);
  doc.text("Rs. " + formatCurrency(totalAdvance), valueX, textY, { align: "right" });

  textY += 20;
  doc.text("Total Billed Amount:", labelX, textY);
  doc.text("Rs. " + formatCurrency(totalBilled), valueX, textY, { align: "right" });

  drawFooter();
  doc.save(`Advance_${subscriptionType === "bill" ? "Bills" : "Invoices"}.pdf`);
};
