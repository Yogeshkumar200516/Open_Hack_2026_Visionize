import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { toWords } from "number-to-words";
import axios from "axios";
import API_BASE_URL from "../../Context/Api";
import { ensureCompatibleImage } from "../../utils/imageUtils";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// Helper to form full logo URL
const getFullLogoUrl = (filename) => {
  if (!filename) return null;
  return filename.startsWith("http")
    ? filename
    : `${API_BASE_URL}/uploads/logos/${filename}`;
};

// Helper for robust image loading WITH COMPRESSION
const fetchLogoDataUrl = async (logoUrl) => {
  if (!logoUrl) return null;
  try {
    const resp = await fetch(logoUrl, { mode: "cors" });
    if (!resp.ok) throw new Error("Image fetch failed");
    const blob = await resp.blob();

    return await new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      img.crossOrigin = "Anonymous"; // ✅ Required for cross-origin canvas drawing
      reader.onloadend = () => { img.src = reader.result; };

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const maxSize = 200;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };

      img.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Failed to fetch logo", e);
    return null;
  }
};

// Helper to wrap text into multiple lines within max width
function splitTextToLines(doc, text, maxWidth, fontSize) {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(text, maxWidth);
}

/**
 * Normalise a state string for comparison.
 */
function normaliseState(s) {
  return (s || "").toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Returns true when the transaction is inter-state (IGST applies).
 */
function isInterState(companyState, buyerState) {
  if (!companyState || !buyerState) return false;
  return normaliseState(companyState) !== normaliseState(buyerState);
}

/**
 * Main Document PDF Generator (Invoices/Bills)
 */
export const generateInvoicePDF = async (docData, returnBlob = false, token) => {
  if (!token) {
    alert("Authorization token missing. Please login.");
    return;
  }

  const isBill = !!docData.bill_number || !!docData.billNo;
  const docType = isBill ? "Bill" : "Invoice";
  const docNumber = isBill
    ? docData.bill_number || docData.billNo
    : docData.invoice_number;

  const doc = new jsPDF({ compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const numberToWords = (num) =>
    toWords(parseFloat(num || 0))
      .replace(/^\w/, (c) => c.toUpperCase()) + " Rupees Only";

  const format = (value) => {
    const num = parseFloat(value || 0);
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  try {
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
      logo_base64: data.logo_base64, // ✅ Directly use Base64 if available
      // State field used for IGST determination
      state: data.state || "",
    };

    // --- Universal Converter: Ensure image is PNG/JPEG for jsPDF compatibility ---
    const logoDataUrl = await ensureCompatibleImage(
      companyInfo.logo_base64
        ? companyInfo.logo_base64
        : companyInfo.logoUrl
        ? await fetchLogoDataUrl(companyInfo.logoUrl)
        : null
    );

    await drawInvoicePDF(
      doc, docData, companyInfo, logoDataUrl,
      pageWidth, pageHeight, format, numberToWords, isBill
    );

    const pdfBlob = new Blob([doc.output("arraybuffer")], {
      type: "application/pdf",
    });

    if (returnBlob) return pdfBlob;
    doc.save(`${docType}_${docNumber || "Doc"}.pdf`);
  } catch (error) {
    console.error(`Error generating ${docType} PDF:`, error);
    alert(`Failed to generate ${docType} PDF.`);
  }
};

/**
 * Main Document Drawing Function with Proper Pagination
 */
async function drawInvoicePDF(
  doc, docData, companyInfo, logoDataUrl,
  pageWidth, pageHeight, format, numberToWords, isBill = false
) {
  const margin = 6;

  // Theme Colors
  const darkBlue  = [25, 25, 112];
  const lightBlue = [41, 128, 185];
  const textBlack = [0, 0, 0];
  const bgWhite   = [255, 255, 255];

  // ── Determine IGST vs CGST+SGST ─────────────────────────────────────────
  const interState = isInterState(
    companyInfo.state,
    docData.customer_state || docData.place_of_supply
  );
  // ─────────────────────────────────────────────────────────────────────────

  // Prepare all product rows  (9 columns – GST% inserted between Rate and Disc%)
  const allProducts = (docData.items || []).map((item, i) => [
    String(i + 1),                                                                          // 0  S.No
    String(item.product_name || ""),                                                        // 1  Description
    String(item.hsn_code || ""),                                                            // 2  HSN/SAC
    parseFloat(item.quantity || 0).toFixed(2),                                             // 3  Qty
    String(item.unit || "PCS"),                                                             // 4  Unit
    parseFloat(item.rate || 0).toFixed(2),                                                 // 5  Rate
    `${parseFloat(item.gst_percentage ?? item.gst_percent ?? item.tax_percentage ?? 0).toFixed(2)} %`, // 6  GST% ← NEW
    `${parseFloat(item.discount || 0).toFixed(2)} %`,                                             // 7  Disc(%)
    parseFloat(item.total_with_gst || 0).toFixed(2),                                       // 8  Amount
  ]);

  // Bottom sections height estimate
  const summaryHeight            = 12;
  const amountInWordsHeight      = 7;
  const bottomThreeSections      = 22;
  const declarationSignatureHeight = 25;
  const footerSpace              = 10;
  const spacing                  = 7;
  const bottomSectionsHeight =
    summaryHeight + amountInWordsHeight + bottomThreeSections +
    declarationSignatureHeight + footerSpace + spacing;

  // Draw first-page header
  let yPos = await drawFirstPageHeader(
    doc, docData, companyInfo, logoDataUrl,
    pageWidth, pageHeight, margin,
    darkBlue, lightBlue, textBlack, bgWhite, isBill
  );

  const tableWidth = pageWidth - 2 * margin - 4;
  const tableX     = margin + 2;

  // ── Column widths (9 columns) ────────────────────────────────────────────
  const colWidths = {
    0: tableWidth * 0.06,   // S.No
    1: tableWidth * 0.27,   // Description   (trimmed from 0.34 to fit new col)
    2: tableWidth * 0.10,   // HSN/SAC
    3: tableWidth * 0.07,   // Qty
    4: tableWidth * 0.08,   // Unit
    5: tableWidth * 0.12,   // Rate
    6: tableWidth * 0.08,   // GST(%)  ← NEW
    7: tableWidth * 0.09,   // Disc(%)
    8: tableWidth * 0.13,   // Amount
  };
  // ─────────────────────────────────────────────────────────────────────────

  const headerHeight       = 7.5;
  const rowHeight          = 6.5;
  const availableTableHeight = pageHeight - yPos - bottomSectionsHeight - margin;
  const maxRowsPage1       = Math.floor((availableTableHeight - 5 - headerHeight) / rowHeight) - 1;
  const maxRowsOtherPages  = Math.floor((pageHeight - 2 * margin - headerHeight - bottomSectionsHeight - 3) / rowHeight) - 1;

  const page1Products = allProducts.slice(0, maxRowsPage1);
  let remainingProducts = allProducts.slice(maxRowsPage1);
  const productPages = [page1Products];
  while (remainingProducts.length > 0) {
    productPages.push(remainingProducts.slice(0, maxRowsOtherPages));
    remainingProducts = remainingProducts.slice(maxRowsOtherPages);
  }

  // Generate QR once
  let qrImage = null;
  try {
    const qrData = docData.qr_string?.trim() || "https://example.com";
    qrImage = await QRCode.toDataURL(qrData, {
      margin: 0, width: 100, type: "image/jpeg",
      rendererOpts: { quality: 0.6 },
    });
  } catch (e) {
    console.warn("QR generation failed", e);
  }

  // ===== DRAW PRODUCT TABLES FOR ALL PAGES =====
  for (let pageIndex = 0; pageIndex < productPages.length; pageIndex++) {
    const isFirstPage      = pageIndex === 0;
    const productsForPage  = productPages[pageIndex];

    if (!isFirstPage) {
      doc.addPage();
      doc.setDrawColor(...darkBlue);
      doc.setLineWidth(0.5);
      doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);
    }

    const currentTableStartY = isFirstPage ? yPos : margin + 3;
    const currentTableEndY   = pageHeight - bottomSectionsHeight - margin;

    // Product table (9 columns)
    autoTable(doc, {
      startY: currentTableStartY,
      head: [["S.No", "Description", "HSN/SAC", "Qty", "Unit", "Rate", "GST%", "Disc%", "Amount"]],
      body: productsForPage,
      margin: { left: margin + 2, right: margin + 2 },
      theme: "plain",
      styles: {
        fontSize: 8.5,
        cellPadding: 1.5,
        minCellHeight: 5,
        valign: "middle",
        overflow: "linebreak",
        cellWidth: "wrap",
        lineWidth: 0.1,
        textColor: textBlack,
      },
      headStyles: {
        fillColor: lightBlue,
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "center",
        cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
        textColor: [255, 255, 255],
        lineWidth: 0,
      },
      columnStyles: {
        0: { cellWidth: colWidths[0], halign: "center" },
        1: { cellWidth: colWidths[1], halign: "left"   },
        2: { cellWidth: colWidths[2], halign: "center" },
        3: { cellWidth: colWidths[3], halign: "right"  },
        4: { cellWidth: colWidths[4], halign: "center" },
        5: { cellWidth: colWidths[5], halign: "right"  },
        6: { cellWidth: colWidths[6], halign: "center" }, // GST%
        7: { cellWidth: colWidths[7], halign: "right"  },
        8: { cellWidth: colWidths[8], halign: "right", fontStyle: "bold" },
      },
      tableLineWidth: 0,
      tableLineColor: darkBlue,
    });

    // Table border
    doc.setDrawColor(...darkBlue);
    doc.setLineWidth(0.4);
    doc.rect(tableX, currentTableStartY, tableWidth, currentTableEndY - currentTableStartY);

    // Vertical column lines (9 columns)
    let currentX = tableX;
    for (let i = 0; i < 9; i++) {
      if (i > 0) {
        doc.setLineWidth(0.3);
        doc.line(currentX, currentTableStartY, currentX, currentTableEndY);
      }
      currentX += colWidths[i];
    }

    // Header separator
    doc.setLineWidth(0.4);
    doc.line(tableX, currentTableStartY + headerHeight, tableX + tableWidth, currentTableStartY + headerHeight);

    // Bottom sections (pass interState flag)
    await drawBottomSections(
      doc, docData, companyInfo, currentTableEndY,
      margin, tableWidth, pageWidth, pageHeight,
      format, numberToWords,
      darkBlue, lightBlue, textBlack,
      qrImage, isBill, interState
    );
  }

  addPageBorders(doc, pageWidth, pageHeight, docData, darkBlue, textBlack, isBill);
}

/**
 * Draw first page header (logo, company info, buyer/consignee)
 */
async function drawFirstPageHeader(
  doc, docData, companyInfo, logoDataUrl,
  pageWidth, pageHeight, margin,
  darkBlue, lightBlue, textBlack, bgWhite, isBill = false
) {
  let yPos = margin;

  doc.setFillColor(...bgWhite);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setDrawColor(...darkBlue);
  doc.setLineWidth(0.5);
  doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);

  yPos += 3;

  const logoSize      = 21;
  const logoX         = margin;
  const logoY         = yPos - 3;
  const twoThirdWidth = ((pageWidth - 2 * margin) * 2) / 3;
  const oneThirdWidth = ((pageWidth - 2 * margin) * 1) / 3;
  const dividerX      = margin + twoThirdWidth;

  doc.setDrawColor(...darkBlue);
  doc.setLineWidth(0.4);
  doc.rect(logoX, logoY, logoSize, logoSize);

  if (logoDataUrl) {
    const padding = 2;
    // Use undefined for format to allow jsPDF to auto-detect from DataURL
    doc.addImage(logoDataUrl, undefined,
      logoX + padding, logoY + padding,
      logoSize - 2 * padding, logoSize - 2 * padding
    );
  }

  const companyX       = logoX + logoSize + 3;
  const companyMaxWidth = dividerX - companyX - 5;

  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...textBlack);
  doc.text(companyInfo.name, companyX, yPos + 2);

  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...textBlack);
  const addressLines = splitTextToLines(doc, companyInfo.address, companyMaxWidth, 8.5);
  doc.text(addressLines.slice(0, 2), companyX, yPos + 7);

  const gstX    = companyX;
  const mobileX = companyX + companyMaxWidth / 2;
  doc.setFontSize(8.5);
  doc.text(`GSTIN: ${companyInfo.gstNumber}`, gstX,    yPos + 15);
  doc.text(`Mobile: ${companyInfo.mobile}`,   mobileX, yPos + 15);

  doc.setDrawColor(...darkBlue);
  doc.setLineWidth(0.3);
  doc.line(dividerX, yPos - 3, dividerX, yPos + 18);

  const ackX      = dividerX + 3;
  const ackMaxWidth = oneThirdWidth - 6;
  let ackY = yPos + 2;

  doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(...textBlack);
  doc.text("Invoice No:", ackX, ackY);
  doc.setFont("helvetica", "normal");
  doc.text(docData.invoice_number || "-", ackX + 25, ackY);

  ackY += 4;
  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text("Date:", ackX, ackY);
  doc.setFont("helvetica", "normal");
  doc.text(docData.invoice_date || "-", ackX + 25, ackY);

  ackY += 4;
  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text("Payment Type:", ackX, ackY);
  doc.setFont("helvetica", "normal");
  const irnLines = splitTextToLines(doc, docData.payment_type || "-", ackMaxWidth - 16, 9);
  doc.text(irnLines.slice(0, 2), ackX + 25, ackY);

  ackY += 4;
  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text("Total Value:", ackX, ackY);
  doc.setFont("helvetica", "normal");
  doc.text(docData.total_amount || "-", ackX + 25, ackY);

  yPos += Math.max(logoSize, 20);

  doc.setDrawColor(...darkBlue).setLineWidth(0.3);
  doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);
  yPos += 3;

  // Document title
  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...darkBlue);
  const titleText = isBill ? "Tax Bill" : "Tax Invoice";
  const titleY    = yPos;
  doc.text(titleText, pageWidth / 2, titleY, { align: "center" });

  const titleWidth  = doc.getTextWidth(titleText);
  const titleStartX = (pageWidth - titleWidth) / 2;
  doc.setDrawColor(...darkBlue).setLineWidth(0.5);
  doc.line(titleStartX, titleY + 1.5, titleStartX + titleWidth, titleY + 1.5);
  yPos += 4;

  // Buyer / Consignee table
  autoTable(doc, {
    startY: yPos,
    margin: { left: margin + 2, right: margin + 2 },
    body: [
      [
        { content: "Buyer (Bill To):",      styles: { fontStyle: "bold", halign: "left", fontSize: 9, textColor: textBlack } },
        { content: "Consignee (Ship To):",  styles: { fontStyle: "bold", halign: "left", fontSize: 9, textColor: textBlack } },
      ],
      [
        {
          content:
            `${docData.customer_name || ""}\n` +
            `${docData.customer_address || ""}\n` +
            `Mobile: ${docData.customer_mobile || ""}    GST: ${docData.customer_gst_number || ""}\n` +
            `Vehicle: ${docData.vehicle_number || ""}    Place: ${docData.place_of_supply || ""}`,
          styles: { fontSize: 8.5, fontStyle: "normal", valign: "top", halign: "left", textColor: textBlack },
        },
        {
          content:
            `${docData.consignee_name || ""}\n` +
            `${docData.consignee_address || ""}\n` +
            `Mobile: ${docData.consignee_mobile || ""}    GST: ${docData.consignee_gst_number || ""}\n` +
            `Vehicle: ${docData.consignee_vehicle_number || ""}    Place: ${docData.consignee_place_of_supply || ""}`,
          styles: { fontSize: 8.5, fontStyle: "normal", valign: "top", halign: "left", textColor: textBlack },
        },
      ],
    ],
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 1.4, lineWidth: 0.3, lineColor: darkBlue, textColor: textBlack },
    tableLineColor: darkBlue,
    tableLineWidth: 0.4,
    columnStyles: {
      0: { cellWidth: (pageWidth - 2 * margin - 4) / 2 },
      1: { cellWidth: (pageWidth - 2 * margin - 4) / 2 },
    },
  });

  return doc.lastAutoTable.finalY + 3;
}

/**
 * Draw bottom sections.
 * interState: true  → display IGST row  (CGST/SGST hidden)
 *             false → display CGST + SGST rows
 */
async function drawBottomSections(
  doc, docData, companyInfo,
  yPos, margin, tableWidth, pageWidth, pageHeight,
  format, numberToWords,
  darkBlue, lightBlue, textBlack,
  qrImage, isBill = false, interState = false
) {
  yPos += 2;
  const docType = isBill ? "Bill" : "Invoice";
  const docNumber = isBill ? docData.bill_number : docData.invoice_number;
  const docDate   = (isBill ? docData.bill_date : docData.invoice_date) || docData.created_at;

  const subtotal         = parseFloat(docData.subtotal          || 0);
  const transportCharge  = parseFloat(docData.transport_charge  || 0);
  const cgst             = parseFloat(docData.cgst_amount       || 0);
  const sgst             = parseFloat(docData.sgst_amount       || 0);
  // igst_amount field preferred; fallback to cgst+sgst sum if not stored separately
  const igst             = parseFloat(docData.igst_amount       || (cgst + sgst) || 0);
  const totalGst         = interState ? igst : cgst + sgst;
  const totalAmount      = parseFloat(
    docData.total_amount || subtotal + transportCharge + totalGst
  );

  // ===== SUMMARY TABLE =====
  let summaryBody;
  if (interState) {
    summaryBody = [
      [
        `Total GST (IGST): Rs. ${format(igst)}`,
        `IGST: Rs. ${format(igst)}`,
        `Taxable Value: Rs. ${format(subtotal)}`,
      ],
      [
        `Transport Charge: Rs. ${format(transportCharge)}`,
        ``,                                                // blank – no SGST row
        `Total Amount: Rs. ${format(totalAmount)}`,
      ],
    ];
  } else {
    summaryBody = [
      [
        `Total GST: Rs. ${format(totalGst)}`,
        `CGST: Rs. ${format(cgst)}`,
        `Taxable Value: Rs. ${format(subtotal)}`,
      ],
      [
        `Transport Charge: Rs. ${format(transportCharge)}`,
        `SGST: Rs. ${format(sgst)}`,
        `Total Amount: Rs. ${format(totalAmount)}`,
      ],
    ];
  }

  autoTable(doc, {
    startY: yPos - 3,
    margin: { left: margin + 2, right: margin + 2 },
    body: summaryBody,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2.5, lineWidth: 0.3, halign: "left", lineColor: darkBlue, textColor: textBlack },
    columnStyles: {
      0: { cellWidth: (tableWidth) / 3 + 12.9 },
      1: { cellWidth: (tableWidth) / 3 - 6.5 },
      2: { cellWidth: (tableWidth) / 3 - 6.5, fillColor: [240, 240, 240], fontStyle: "bold" },
    },
    tableLineColor: darkBlue,
    tableLineWidth: 0.4,
  });

  yPos = doc.lastAutoTable.finalY + 2;

  // ===== AMOUNT IN WORDS =====
  autoTable(doc, {
    startY: yPos - 3,
    margin: { left: margin + 2, right: margin + 2 },
    body: [[{
      content: `Total Amount (in words): INR ${numberToWords(totalAmount)}`,
      styles: { fontStyle: "bold", halign: "left", fontSize: 8, textColor: textBlack },
    }]],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.3, lineColor: darkBlue, textColor: textBlack },
    tableLineColor: darkBlue,
    tableLineWidth: 0.4,
  });

  yPos = doc.lastAutoTable.finalY + 2;

  // ===== BOTTOM 3 SECTIONS =====
  const section1Width = (tableWidth * 4) / 10;
  const section2Width = (tableWidth * 3) / 10;
  const section3Width = (tableWidth * 3) / 10;
  const threeSectionStartY = yPos;

  // Section 1: Bank Details
  autoTable(doc, {
    startY: threeSectionStartY,
    margin: { left: margin + 2, right: pageWidth - margin - 2 - section1Width },
    body: [[
      `Bank Details\n\nA/c Name: ${docData.billing_address_account_name || companyInfo.accountName || "-"}\n` +
      `Bank: ${docData.billing_address_bank_name || companyInfo.bankName || "-"}\n` +
      `A/c No: ${docData.billing_address_account_number || companyInfo.accountNo || "-"}\n` +
      `IFSC: ${docData.billing_address_ifsc_code || companyInfo.ifsc || "-"}`
    ]],
    theme: "grid",
    styles: { fontSize: 8, halign: "left", fontStyle: "bold", cellPadding: 2, lineWidth: 0.3, lineColor: darkBlue, textColor: textBlack },
    tableLineColor: darkBlue,
    tableLineWidth: 0.4,
  });

  const section1EndY = doc.lastAutoTable.finalY;

  // Section 2: Document Details
  const section2X       = margin + 2 + section1Width;
  const docDateFormatted = docDate ? dayjs.utc(docDate).local().format("DD-MM-YYYY") : "-";

  autoTable(doc, {
    startY: threeSectionStartY,
    margin: { left: section2X, right: pageWidth - section2X - section2Width },
    body: [[
      `${docType} Details\n\n` +
      `Ack. No: ${docData.ack_number || "-"}\n` +
      `Ack. Date: ${docData.invoice_date}\n` +
      `IRN No: ${docData.irn || "-"}\n` +
      `E-Way Bill No: ${"-"}`
    ]],
    theme: "grid",
    styles: { fontSize: 8, halign: "left", fontStyle: "bold", cellPadding: 2, lineWidth: 0.3, lineColor: darkBlue, textColor: textBlack },
    tableLineColor: darkBlue,
    tableLineWidth: 0.4,
  });

  const section2EndY = doc.lastAutoTable.finalY;

  // Section 3: QR Code box
  const section3X = section2X + section2Width;
  autoTable(doc, {
    startY: threeSectionStartY,
    margin: { left: section3X, right: margin + 2 },
    body: [[{ content: "", styles: { minCellHeight: section1EndY - threeSectionStartY } }]],
    theme: "grid",
    styles: { lineWidth: 0.3, lineColor: darkBlue },
    tableLineColor: darkBlue,
    tableLineWidth: 0.4,
  });

  if (qrImage) {
    const qrSize = 18;
    const qrX = section3X + (section3Width - qrSize) / 2;
    const qrY = threeSectionStartY + 3;
    doc.setFont("helvetica", "bold").setFontSize(6.5).setTextColor(...textBlack);
    doc.text("e-Invoice QR", qrX + qrSize / 2, qrY - 0.5, { align: "center" });
    // Use undefined to allow jsPDF to auto-detect from DataURL
    doc.addImage(qrImage, undefined, qrX, qrY, qrSize, qrSize);
  }

  yPos = Math.max(section1EndY, section2EndY, doc.lastAutoTable.finalY) + 2;

  // ===== DECLARATION + SIGNATURE =====
  const declarationWidth = (tableWidth * 7) / 10;
  const signatureWidth   = (tableWidth * 3) / 10;
  const declarationStartY = yPos;

  autoTable(doc, {
    startY: declarationStartY,
    margin: { left: margin + 2, right: pageWidth - margin - 2 - declarationWidth },
    head: [[{
      content: "Declaration",
      styles: { fontSize: 9, fontStyle: "bold", textColor: textBlack, fillColor: false, lineWidth: 0 },
    }]],
    body: [[{
      content: `We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. Goods once sold will not be taken back or exchanged. Subjected to local jurisdiction only.`,
      styles: { fontSize: 9, halign: "left", cellPadding: 2, minCellHeight: 18, textColor: textBlack, lineWidth: 0 },
    }]],
    theme: "grid",
    styles: { lineColor: darkBlue },
    headStyles: { fillColor: false, lineWidth: 0 },
    tableLineColor: darkBlue,
    tableLineWidth: 0.4,
  });

  const declarationEndY = doc.lastAutoTable.finalY;

  const signatureX = margin + 2 + declarationWidth;
  autoTable(doc, {
    startY: declarationStartY,
    margin: { left: signatureX, right: margin + 2 },
    body: [[{ content: "", styles: { minCellHeight: declarationEndY - declarationStartY } }]],
    theme: "grid",
    styles: { lineWidth: 0.3, lineColor: darkBlue },
    tableLineColor: darkBlue,
    tableLineWidth: 0.4,
  });

  const sigCenterX = signatureX + signatureWidth / 2;
  const sigTopY    = declarationStartY + 3;

  doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(...textBlack);
  const companyNameLines = splitTextToLines(doc, `For ${companyInfo.name}`, signatureWidth - 4, 7);
  doc.text(companyNameLines, sigCenterX, sigTopY, { align: "center" });

  const sigLineY = declarationEndY - 6;
  doc.setDrawColor(...darkBlue).setLineWidth(0.3);
  doc.line(signatureX + 3, sigLineY, signatureX + signatureWidth - 3, sigLineY);

  doc.setFont("helvetica", "normal").setFontSize(6.5).setTextColor(...textBlack);
  doc.text("Authorized Signatory", sigCenterX, sigLineY + 3, { align: "center" });
}

/**
 * Add page numbers footer to all pages
 */
function addPageBorders(doc, pageWidth, pageHeight, docData, darkBlue, textBlack, isBill = false) {
  const pageCount = doc.internal.getNumberOfPages();
  const docType   = isBill ? "Bill" : "Invoice";
  const docNumber = isBill ? docData.bill_number : docData.invoice_number;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7).setTextColor(...textBlack);
    doc.text(
      `Page ${i} of ${pageCount} | ${docType} No: ${docNumber || "-"}`,
      pageWidth / 2,
      pageHeight - 3,
      { align: "center" }
    );
  }
}
