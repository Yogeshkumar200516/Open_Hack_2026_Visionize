import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import API_BASE_URL from "../../Context/Api";

// 🔑 Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const generateCustomersPDF = async (customers = []) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // 🔄 Fetch company info (SAME AS ADVANCE PDF)
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

  // ✅ CUSTOMER TABLE HEADERS
  const headers = [
    [
      "S.No",
      "Name",
      "Mobile",
      "Email",
      "GST Number",
      "State",
      "Created Date",
    ],
  ];

  // ✅ CUSTOMER ROWS
  const rows = customers.map((cust, i) => [
    i + 1,
    cust.name || "-",
    cust.mobile || "-",
    cust.email || "-",
    cust.gst_number || "-",
    cust.state || "-",
    cust.created_at
      ? new Date(cust.created_at).toLocaleDateString("en-GB")
      : "-",
  ]);

  autoTable(doc, {
    head: headers,
    body: rows,
    margin: { top: HEADER_HEIGHT + 50, left: 30, right: 30 },
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
      4: { halign: "center" },
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didDrawPage: () => {
      doc.setDrawColor(0).setLineWidth(1);
      doc.rect(20, 20, PAGE_WIDTH - 40, PAGE_HEIGHT - 40);

      drawHeader();

      doc.setFontSize(13).setTextColor(0).setFont("helvetica", "bold");
      doc.text(
        "Customer Report",
        PAGE_WIDTH / 2,
        HEADER_HEIGHT + 35,
        { align: "center" }
      );
    },
  });

  drawFooter();

  doc.save("Customers_Report.pdf");
};