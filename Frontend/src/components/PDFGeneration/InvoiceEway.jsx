import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { toWords } from "number-to-words";
import axios from "axios";
import API_BASE_URL from "../../Context/Api";
import { ensureCompatibleImage } from "../../utils/imageUtils";

// --- Helper: Full Logo URL Constructor ---
const getFullLogoUrl = (filename) => {
  if (!filename) return null;
  return filename.startsWith("http")
    ? filename
    : `${API_BASE_URL}/uploads/logos/${filename}`;
};

// --- Helper: Convert Image URL → Base64 DataURL ---
const fetchLogoDataUrl = async (logoUrl) => {
  if (!logoUrl) return null;
  try {
    const resp = await fetch(logoUrl, { mode: "cors" });
    if (!resp.ok) throw new Error("Image fetch failed");
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; // ✅ Required for cross-origin fetching to canvas
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Failed to fetch logo", e);
    return null;
  }
};

// --- Helper: Text Wrapping ---
function splitTextToLines(doc, text, maxWidth, fontSize) {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(text, maxWidth);
}

/**
 * generateInvoicePDF
 * Generates an Invoice PDF and RETURNS its Blob for further use (no saving)
 * 
 * @param {Object} invoice - Invoice data
 * @param {String} token - JWT token for backend auth
 * @returns {Blob} - Generated PDF Blob
 */
export const generateInvoicePDF2 = async (invoice, token) => {
  if (!token) {
    alert("Authorization token missing. Please login.");
    return;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const numberToWords = (num) =>
    toWords(parseFloat(num || 0)).replace(/^\w/, (c) => c.toUpperCase()) +
    " Rupees Only";

  const format = (value) =>
    Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  try {
  // Fetch company info
  const response = await axios.get(`${API_BASE_URL}/api/company/info`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = response.data;
  if (!data || Object.keys(data).length === 0) {
    alert("Company information not found.");
    return;
  }

  const companyInfo = {
    name: data.company_name || "Company Name",
    address: data.address || "No address provided",
    gstNumber: data.gst_no || "GST not available",
    pan: data.pan_no || "PAN not available",
    mobile: `${data.cell_no1 || ""}${data.cell_no2 ? ", " + data.cell_no2 : ""}`,
    bankName: data.bank_name || "Bank name",
    accountNo: data.account_number || "Account No",
    ifsc: data.ifsc_code || "IFSC",
    branch: data.branch_name || "Branch",
    logoUrl: getFullLogoUrl(data.company_logo),
    logo_base64: data.logo_base64, // ✅ Direct Base64
  };

  // --- Universal Converter: Ensure image is compatible for jsPDF ---
  const logoDataUrl = await ensureCompatibleImage(
    companyInfo.logo_base64
      ? companyInfo.logo_base64
      : companyInfo.logoUrl
      ? await fetchLogoDataUrl(companyInfo.logoUrl)
      : null
  );

  // ✅ FIX HERE
  const pdfBlob = await drawPDF(companyInfo, logoDataUrl);
  return pdfBlob; // 🔥 This line makes the function return the PDF blob
} catch (error) {
  console.error("Error fetching company info for PDF:", error);
  alert("Failed to fetch company info. Please try again.");
  return;
}


  // ✅ Internal Function to draw full PDF structure
  async function drawPDF(companyInfo, logoDataUrl) {
    const leftMargin = 14;
    const topMargin = 14;
    const rightMargin = 14;
    let headerHeight = 0;

    // --- Logo ---
    const logoBoxW = 22;
    const logoBoxH = 22;
    const logoBoxX = leftMargin;
    const logoBoxY = topMargin;

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.roundedRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, 0, 0, "D");

    if (logoDataUrl) {
      const img = new Image();
      img.src = logoDataUrl;
      await new Promise((resolve) => {
        img.onload = () => {
          const wr = logoBoxW / img.width;
          const hr = logoBoxH / img.height;
          const ratio = Math.min(wr, hr);
          const imgW = img.width * ratio;
          const imgH = img.height * ratio;
          const imgX = logoBoxX + (logoBoxW - imgW) / 2;
          const imgY = logoBoxY + (logoBoxH - imgH) / 2;
          // Use undefined to allow jsPDF to auto-detect from DataURL
          doc.addImage(logoDataUrl, undefined, imgX, imgY, imgW, imgH);
          resolve();
        };
        img.onerror = resolve;
      });
    }

    // --- Company Info ---
    const titleFont = 14;
    const infoFont = 10;
    const maxInfoWidth = pageWidth - leftMargin - rightMargin - logoBoxW - 8;
    let infoStartY = topMargin + 4;

    const addressLines = splitTextToLines(doc, companyInfo.address, maxInfoWidth, infoFont);
    const companyInfoLines = [
      { text: companyInfo.name, font: titleFont, bold: true },
      ...addressLines.map((line) => ({ text: line, font: infoFont, bold: false })),
    ];

    let dy = 0;
    companyInfoLines.forEach((line) => {
      doc.setFont("helvetica", line.bold ? "bold" : "normal");
      doc.setFontSize(line.font);
      doc.text(line.text, pageWidth / 2 + logoBoxW / 2, infoStartY + dy, {
        align: "center",
        maxWidth: maxInfoWidth,
      });
      dy += line.font * 0.5;
    });

    const gstText = `GST: ${companyInfo.gstNumber}`;
    const mobileText = `Mobile: ${companyInfo.mobile}`;
    const gstMobileY = infoStartY + dy + 2;
    const leftX = logoBoxX + logoBoxW + 8;
    const rightX = pageWidth - rightMargin;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(infoFont);
    doc.text(gstText, leftX, gstMobileY, { align: "left" });
    doc.text(mobileText, rightX, gstMobileY, { align: "right" });
    dy += infoFont * 0.7;
    headerHeight = Math.max(logoBoxH, dy + 1);
    const afterHeaderY = topMargin + headerHeight + 2;

    // --- Divider ---
    doc.setDrawColor(80, 80, 80);
    doc.line(10, afterHeaderY, pageWidth - 10, afterHeaderY);

    // --- Title ---
    const contentStartY = afterHeaderY + 8;
    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text("Tax Invoice", pageWidth / 2, contentStartY, { align: "center" });

    // --- QR Code ---
    try {
      const qrData = invoice.qr_string?.trim() || "https://example.com";
      const qrImage = await QRCode.toDataURL(qrData, { margin: 0, width: 80 });
      doc.setFontSize(10);
      doc.text("e-Invoice", 192, contentStartY + 2, { align: "right" });
      // Use undefined for auto-detection in InvoiceEway.jsx
      doc.addImage(qrImage, undefined, 175, contentStartY + 7, 20, 20);
    } catch (err) {
      console.warn("QR Code generation failed:", err);
    }

    // --- IRN and Ack Details ---
    const labelX = 14,
      valueX = 35,
      irnYStart = contentStartY + 15,
      lineHeight = 5;
    doc.setFont("helvetica", "bold").setFontSize(9);
    doc.text("IRN:", labelX, irnYStart);
    doc.text(invoice.irn?.trim() || "-", valueX, irnYStart);
    doc.text("Ack No:", labelX, irnYStart + lineHeight);
    doc.text(invoice.ack_number?.trim() || "-", valueX, irnYStart + lineHeight);
    doc.text("Ack Date:", labelX, irnYStart + lineHeight * 2);
    doc.text(invoice.ack_date?.trim() || "-", valueX, irnYStart + lineHeight * 2);

    // --- Company Info Table ---
    const firstTableStartY = irnYStart + lineHeight * 2 + 4;
    autoTable(doc, {
      startY: firstTableStartY,
      margin: { left: 14, right: 14 },
      body: [
        [
          { content: companyInfo.name, colSpan: 2, styles: { fontStyle: "bold", fontSize: 10 } },
        ],
        [
          {
            content: `${companyInfo.address}\nGST No: ${companyInfo.gstNumber}\nPAN: ${companyInfo.pan}\nMobile: ${companyInfo.mobile}`,
            styles: { fontSize: 10 },
          },
          {
            content: `Invoice No: ${invoice.invoice_number || "-"}\ne-Way Bill No: ${
              invoice.eway_bill_number || "-"
            }\nDate: ${invoice.invoice_date || "-"}`,
            styles: { fontSize: 10 },
          },
        ],
      ],
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 3 },
    });

    // --- Buyer & Consignee Table ---
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 4,
      margin: { left: 14, right: 14 },
      body: [
        [
          { content: "Buyer (Bill To):", styles: { fontStyle: "bold" } },
          { content: "Consignee (Ship To):", styles: { fontStyle: "bold" } },
        ],
        [
          {
            content: `${invoice.customer_name || ""}\n\n${invoice.customer_address || ""}\nState: ${
              invoice.customer_state || ""
            }, Code: ${invoice.customer_pincode || ""}\nMobile: ${
              invoice.customer_mobile || ""
            }\nGST No: ${invoice.customer_gst_number || ""}\nVehicle No: ${
              invoice.vehicle_number || ""
            }\nPlace of Supply: ${invoice.place_of_supply || ""}`,
          },
          {
            content: `${invoice.consignee_name || ""}\n\n${invoice.consignee_address || ""}\nState: ${
              invoice.consignee_state || ""
            }, Code: ${invoice.consignee_pincode || ""}\nMobile: ${
              invoice.consignee_mobile || ""
            }\nGST No: ${invoice.consignee_gst_number || ""}\nVehicle No: ${
              invoice.consignee_vehicle_number || ""
            }\nPlace of Supply: ${invoice.consignee_place_of_supply || ""}`,
          },
        ],
      ],
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 92 }, 1: { cellWidth: 95 } },
    });

    // --- Products Table ---
    const headers = [["S.N", "Description", "HSN", "Qty", "Disc(%)", "Rate", "Per", "Amount"]];
    const data = (invoice.items || []).map((item, i) => [
      i + 1,
      item.product_name,
      item.hsn_code,
      `${item.quantity} ${item.unit || ""}`,
      parseFloat(item.discount || 0).toFixed(2),
      parseFloat(item.rate || 0).toFixed(2),
      item.unit || "-",
      parseFloat(item.total_with_gst || 0).toFixed(2),
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 4,
      head: headers,
      body: data,
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2.5 },
      headStyles: { fillColor: [220, 220, 220], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 45 },
        2: { cellWidth: 23 },
        3: { cellWidth: 18 },
        4: { cellWidth: 18, halign: "right" },
        5: { cellWidth: 25, halign: "right" },
        6: { cellWidth: 15, halign: "center" },
        7: { cellWidth: 28, halign: "right", fontStyle: "bold" },
      },
    });

    const afterProductY = doc.lastAutoTable.finalY + 2;

    // --- Summary Table ---
    autoTable(doc, {
      startY: afterProductY,
      margin: { left: 14, right: 14 },
      body: [
        new Array(6).fill({ content: "" }).concat([
          {
            content: "Taxable Value",
            styles: { fontStyle: "bold", halign: "right" },
          },
          { content: format(invoice.subtotal), styles: { halign: "right" } },
        ]),
        new Array(6).fill({ content: "" }).concat([
          {
            content: "Central Tax (9%)",
            styles: { fontStyle: "bold", halign: "right" },
          },
          { content: format(invoice.cgst_amount), styles: { halign: "right" } },
        ]),
        new Array(6).fill({ content: "" }).concat([
          {
            content: "State Tax (9%)",
            styles: { fontStyle: "bold", halign: "right" },
          },
          { content: format(invoice.sgst_amount), styles: { halign: "right" } },
        ]),
        new Array(6).fill({ content: "" }).concat([
          {
            content: "Total GST",
            styles: { fontStyle: "bold", halign: "right" },
          },
          {
            content: format(+invoice.cgst_amount + +invoice.sgst_amount),
            styles: { halign: "right" },
          },
        ]),
        new Array(6).fill({ content: "" }).concat([
          {
            content: "Transport Charges",
            styles: { fontStyle: "bold", halign: "right" },
          },
          {
            content: format(invoice.transport_charge),
            styles: { halign: "right" },
          },
        ]),
        new Array(6).fill({ content: "" }).concat([
          {
            content: "Total Amount",
            styles: { fontStyle: "bold", halign: "right" },
          },
          {
            content: format(invoice.total_amount),
            styles: { halign: "right" },
          },
        ]),
      ],
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        6: { cellWidth: 60 },
        7: { cellWidth: 35 },
      },
      tableLineColor: 100,
      tableLineWidth: 0.4,
    });

    // --- Amount in Words ---
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 2,
      margin: { left: 14, right: 14 },
      body: [
        [
          {
            content: `Amount Chargeable (in words): INR ${numberToWords(
              invoice.total_amount
            )}`,
            colSpan: 10,
            styles: {
              fontStyle: "bold",
              halign: "right",
              textColor: "#313030",
            },
          },
        ],
        [
          {
            content: `Tax Amount (in words): INR ${numberToWords(
              (+invoice.cgst_amount || 0) + (+invoice.sgst_amount || 0)
            )}`,
            colSpan: 10,
            styles: { halign: "right", textColor: "#313030" },
          },
        ],
      ],
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2 },
      tableLineColor: 100,
      tableLineWidth: 0.4,
    });

    // --- Bank Details Section (Page Safe) ---
    const sectionWidth = pageWidth - 28;
    let bankY = doc.lastAutoTable.finalY + 4;
    const bankLineCount = 7;
    const bankHeight = bankLineCount * 5 + 8;
    if (bankY + bankHeight > pageHeight - 30) {
      doc.addPage();
      bankY = 20;
    }
    autoTable(doc, {
      startY: bankY,
      margin: { left: 14, right: 14 },
      body: [
        [
          {
            content: `Company's Bank Details\n\nA/c Name : ${companyInfo.name}\nBank Name : ${companyInfo.bankName}\nA/c No : ${companyInfo.accountNo}\nBranch : ${companyInfo.branch}\nIFSC Code : ${companyInfo.ifsc}`,
            styles: {
              fontSize: 10,
              halign: "left",
              fontStyle: "bold",
              lineWidth: 0.2,
              lineColor: [180, 180, 180],
              fillColor: [245, 245, 245],
              textColor: [50, 50, 50],
              cellPadding: 4,
            },
          },
        ],
      ],
      columnStyles: {
        0: { cellWidth: sectionWidth },
      },
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2 },
    });

    // --- Declaration Section (Page Safe) ---
    let declarationY = doc.lastAutoTable.finalY + 4;
    const declarationLineCount = 7;
    const declarationHeight = declarationLineCount * 5 + 8;
    if (declarationY + declarationHeight > pageHeight - 30) {
      doc.addPage();
      declarationY = 20;
    }
    autoTable(doc, {
      startY: declarationY,
      margin: { left: 14, right: 14 },
      body: [
        [
          {
            content: `Declaration:\n\nWe declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.\nGoods once sold will not be taken back or exchanged.\n\nSubject to Erode Jurisdiction only.`,
            styles: {
              fontSize: 10,
              halign: "left",
              fontStyle: "bold",
              lineWidth: 0.2,
              lineColor: [180, 180, 180],
              fillColor: [255, 255, 255],
              textColor: [60, 60, 60],
              cellPadding: 4,
            },
          },
        ],
      ],
      columnStyles: {
        0: { cellWidth: sectionWidth },
      },
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
    });

    // --- Signature Box (Smart Positioning) ---
    let signatureY = doc.lastAutoTable.finalY + 10;
    const boxWidth = 80;
    const boxHeight = 35;
    const boxX = pageWidth - 14 - boxWidth;
    if (signatureY + boxHeight > pageHeight * 0.7) {
      doc.addPage();
      signatureY = 20;
    }
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.2);
    doc.roundedRect(boxX, signatureY, boxWidth, boxHeight, 0, 0);
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text(`For ${companyInfo.name}`, boxX + boxWidth / 2, signatureY + 10, {
      align: "center",
    });
    doc.setDrawColor(180);
    doc.line(boxX + 10, signatureY + 22, boxX + boxWidth - 10, signatureY + 22);
    doc.text("Authorized Signatory", boxX + boxWidth / 2, signatureY + 30, {
      align: "center",
    });

    // --- Footer on Each Page ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(80);
      doc.setLineWidth(0.3);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 18);
      doc.setDrawColor(180).setLineWidth(0.5);
      doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
      doc.setFontSize(8).setTextColor(100);
      doc.text(
        `Page ${i} of ${pageCount} | Invoice No: ${
          invoice.invoice_number || "-"
        }`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    // --- Deliver PDF ---
     // ✅ Return Blob instead of saving
    const pdfBlob = new Blob([doc.output("arraybuffer")], {
      type: "application/pdf",
    });
    return pdfBlob;
  }
};
