import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
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

    // Compress image before converting to data URL
    return await new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      img.crossOrigin = "Anonymous"; // ✅ Required for cross-origin canvas drawing
      reader.onloadend = () => {
        img.src = reader.result;
      };
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Resize to smaller dimensions (max 200px for logo)
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

ctx.fillStyle = "#ffffff";  // white background
ctx.fillRect(0, 0, width, height);

ctx.drawImage(img, 0, 0, width, height);


        
        // Convert to JPEG with compression (0.6 quality)
        resolve(canvas.toDataURL('image/jpeg', 0.6));
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

// Helper to truncate reason to 2 lines or until first full stop
function getTruncatedReason(reason, doc, maxWidth, fontSize) {
  if (!reason) return "-";
  
  // Find first full stop
  const firstStopIndex = reason.indexOf(".");
  let truncatedText = reason;
  
  if (firstStopIndex !== -1) {
    truncatedText = reason.substring(0, firstStopIndex + 1);
  }

  // Split into lines
  const lines = splitTextToLines(doc, truncatedText, maxWidth, fontSize);
  return lines.slice(0, 2).join(" ");
}

/**
 * Generate Sales Return Details PDF - EXACT Invoice Style with QR Code
 */
export const generateSalesReturnDetailsPDF = async (salesReturnId, token) => {
  if (!token || !salesReturnId) {
    alert("Missing required data for PDF generation.");
    return;
  }

  // Initialize with compression options
  const doc = new jsPDF({
    compress: true // Enable built-in compression
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const format = (value) => {
    const num = parseFloat(value || 0);
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  try {
    // Fetch company info (EXACT same as invoice)
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
    };

    // --- Universal Converter: Ensure image is PNG/JPEG for jsPDF compatibility ---
    const logoDataUrl = await ensureCompatibleImage(
      companyInfo.logo_base64
        ? companyInfo.logo_base64
        : companyInfo.logoUrl
        ? await fetchLogoDataUrl(companyInfo.logoUrl)
        : null
    );

    // Fetch sales return details
    const returnResponse = await fetch(`${API_BASE_URL}/api/sales-returns/${salesReturnId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const returnData = await returnResponse.json();
    const salesReturn = returnData.data.return || {};
    const items = returnData.data.items || [];

    // Draw PDF using EXACT invoice structure
    await drawSalesReturnPDF(doc, salesReturn, items, companyInfo, logoDataUrl, pageWidth, pageHeight, format);

    doc.save(`Sales_Return_${salesReturn.return_number || salesReturnId}.pdf`);
  } catch (error) {
    console.error("Error generating sales return PDF:", error);
    alert("Failed to generate sales return PDF.");
    return;
  }
};

/**
 * Main Sales Return Drawing Function - EXACT Invoice Structure
 */
async function drawSalesReturnPDF(doc, salesReturn, items, companyInfo, logoDataUrl, pageWidth, pageHeight, format) {
  const margin = 6;

  // Dark Blue Theme Colors (EXACT same as invoice)
  const darkBlue = [25, 25, 112];
  const lightBlue = [41, 128, 185];
  const textBlack = [0, 0, 0];
  const bgWhite = [255, 255, 255];

  // Prepare all product rows (EXACT same structure as invoice)
  const allProducts = items.map((item, i) => [
    String(i + 1),
    String(item.product_name || ""),
    String(item.hsn_code || ""),
    parseFloat(item.quantity || 0).toFixed(2),
    String(item.unit || "PCS"),
    parseFloat(item.rate || 0).toFixed(2),
    String(`${item.gst_percentage || 0}%`),
    parseFloat(item.total_with_gst || 0).toFixed(2),
  ]);

  // Calculate bottom sections height (REDUCED to occupy full page)
  const summaryHeight = 10;
  const verificationStatusHeight = 12;
  const bottomThreeSections = 18;
  const declarationSignatureHeight = 20;
  const footerSpace = 8;
  const spacing = 4;
  
  const bottomSectionsHeight = summaryHeight + verificationStatusHeight + bottomThreeSections + declarationSignatureHeight + footerSpace + spacing;

  // Draw first page with header (SALES RETURN VERSION)
  let yPos = await drawSalesReturnFirstPageHeader(doc, salesReturn, companyInfo, logoDataUrl, pageWidth, pageHeight, margin, darkBlue, lightBlue, textBlack, bgWhite);

  const tableWidth = pageWidth - 2 * margin - 4;
  const tableX = margin + 2;

  // Column widths (EXACT same as invoice)
  const colWidths = {
    0: tableWidth * 0.06,
    1: tableWidth * 0.34,
    2: tableWidth * 0.10,
    3: tableWidth * 0.10,
    4: tableWidth * 0.08,
    5: tableWidth * 0.12,
    6: tableWidth * 0.08,
    7: tableWidth * 0.12,
  };

  // Calculate rows per page (EXACT same logic as invoice)
  const headerHeight = 7.5;
  const rowHeight = 6.5;
  const availableTableHeight = pageHeight - yPos - bottomSectionsHeight - margin;
  const maxRowsPage1 = Math.floor((availableTableHeight - 5 - headerHeight) / rowHeight) - 1;
  const maxRowsOtherPages = Math.floor((pageHeight - 2 * margin - headerHeight - bottomSectionsHeight - 3) / rowHeight) - 1;

  // Split products across pages (EXACT same logic)
  const page1Products = allProducts.slice(0, maxRowsPage1);
  let remainingProducts = allProducts.slice(maxRowsPage1);
  const productPages = [page1Products];

  while (remainingProducts.length > 0) {
    productPages.push(remainingProducts.slice(0, maxRowsOtherPages));
    remainingProducts = remainingProducts.slice(maxRowsOtherPages);
  }

  // Generate compressed QR code ONCE and reuse
  let qrImage = null;
  try {
    const qrData = salesReturn.qr_string?.trim() || `Return ${salesReturn.return_number || "N/A"}`;
    // Generate QR as JPEG with compression instead of PNG
    qrImage = await QRCode.toDataURL(qrData, { 
      margin: 0, 
      width: 100,
      type: 'image/jpeg',
      rendererOpts: {
        quality: 0.6
      }
    });
  } catch (e) {
    console.warn("QR generation failed", e);
  }

  // Draw product tables for all pages (EXACT same logic)
  for (let pageIndex = 0; pageIndex < productPages.length; pageIndex++) {
    const isFirstPage = pageIndex === 0;
    const productsForPage = productPages[pageIndex];

    if (!isFirstPage) {
      doc.addPage();
      doc.setDrawColor(...darkBlue);
      doc.setLineWidth(0.5);
      doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);
    }

    const currentTableStartY = isFirstPage ? yPos : margin + 3;
    const currentTableEndY = pageHeight - bottomSectionsHeight - margin;

    // Draw product table (SALES RETURN COLUMNS)
    autoTable(doc, {
      startY: currentTableStartY,
      head: [["S.No", "Description", "HSN/SAC", "Qty", "Verified", "Rate", "GST%", "Amount"]],
      body: productsForPage.map((row, index) => [
        row[0], // S.No
        row[1], // Description
        row[2], // HSN/SAC
        row[3], // Qty
        items[index]?.verified_quantity ? String(parseFloat(items[index].verified_quantity).toFixed(2)) : "0.00", // Verified
        row[5], // Rate
        row[6], // GST%
        row[7], // Amount
      ]),
      margin: { left: margin + 2, right: margin + 2 },
      theme: "plain",
      styles: {
        fontSize: 9,
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
        fontSize: 9,
        halign: "center",
        cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5},
        textColor: [255, 255, 255],
        lineWidth: 0,
      },
      columnStyles: {
        0: { cellWidth: colWidths[0], halign: "center" },
        1: { cellWidth: colWidths[1], halign: "left" },
        2: { cellWidth: colWidths[2], halign: "center" },
        3: { cellWidth: colWidths[3], halign: "right" },
        4: { cellWidth: colWidths[4], halign: "right" }, // Verified column
        5: { cellWidth: colWidths[5], halign: "right" },
        6: { cellWidth: colWidths[6], halign: "center" },
        7: { cellWidth: colWidths[7], halign: "right", fontStyle: "bold" },
      },
      tableLineWidth: 0,
      tableLineColor: darkBlue,
    });

    // Draw table borders (EXACT same as invoice)
    doc.setDrawColor(...darkBlue);
    doc.setLineWidth(0.4);
    doc.rect(tableX, currentTableStartY, tableWidth, currentTableEndY - currentTableStartY);

    let currentX = tableX;
    for (let i = 0; i < 8; i++) {
      if (i > 0) {
        doc.setLineWidth(0.3);
        doc.line(currentX, currentTableStartY, currentX, currentTableEndY);
      }
      currentX += colWidths[i];
    }

    doc.setLineWidth(0.4);
    doc.line(tableX, currentTableStartY + headerHeight, tableX + tableWidth, currentTableStartY + headerHeight);

    // Draw bottom sections (SALES RETURN VERSION - OPTIMIZED) - pass qrImage
    await drawSalesReturnBottomSections(doc, salesReturn, items, companyInfo, currentTableEndY, margin, tableWidth, pageWidth, pageHeight, format, darkBlue, lightBlue, textBlack, qrImage);
  }

  // Add page numbers (SALES RETURN VERSION)
  addSalesReturnPageBorders(doc, pageWidth, pageHeight, salesReturn, darkBlue, textBlack);
}

/**
 * Draw first page header for Sales Return (ADAPTED from invoice)
 */
async function drawSalesReturnFirstPageHeader(doc, salesReturn, companyInfo, logoDataUrl, pageWidth, pageHeight, margin, darkBlue, lightBlue, textBlack, bgWhite) {
  let yPos = margin;

  // Set white background (EXACT same)
  doc.setFillColor(...bgWhite);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Main border (EXACT same)
  doc.setDrawColor(...darkBlue);
  doc.setLineWidth(0.5);
  doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);

  yPos += 3;

  // ===== HEADER SECTION (EXACT same structure) =====
  const logoSize = 21;
  const logoX = margin;
  const logoY = yPos - 3;
  const twoThirdWidth = ((pageWidth - 2 * margin) * 2) / 3;
  const oneThirdWidth = ((pageWidth - 2 * margin) * 1) / 3;
  const dividerX = margin + twoThirdWidth;

  // Logo Box (EXACT same)
  doc.setDrawColor(...darkBlue);
  doc.setLineWidth(0.4);
  doc.rect(logoX, logoY, logoSize, logoSize);

  // Logo (OPTIMIZED - add once, compressed JPEG)
  if (logoDataUrl) {
    const padding = 2;
    // Use undefined for format to allow jsPDF to auto-detect from DataURL
    doc.addImage(logoDataUrl, undefined, logoX + padding, logoY + padding, logoSize - 2 * padding, logoSize - 2 * padding);
  }

  // Company Info (EXACT same)
  const companyX = logoX + logoSize + 3;
  const companyMaxWidth = dividerX - companyX - 5;

  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...textBlack);
  doc.text(companyInfo.name, companyX, yPos + 2);

  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...textBlack);
  const addressLines = splitTextToLines(doc, companyInfo.address, companyMaxWidth, 8.5);
  doc.text(addressLines.slice(0, 2), companyX, yPos + 7);

  doc.setFontSize(8.5).setTextColor(...textBlack);
  const gstX = companyX;
  const mobileX = companyX + companyMaxWidth / 2;
  doc.text(`GSTIN: ${companyInfo.gstNumber}`, gstX, yPos + 15);
  doc.text(`Mobile: ${companyInfo.mobile}`, mobileX, yPos + 15);

  // Vertical separator (EXACT same)
  doc.setDrawColor(...darkBlue);
  doc.setLineWidth(0.3);
  doc.line(dividerX, yPos-3, dividerX, yPos + 18);

  // SALES RETURN DETAILS (instead of ACK)
  const returnX = dividerX + 3;
  const returnMaxWidth = oneThirdWidth - 6;
  let returnY = yPos + 2;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold").setTextColor(...textBlack);
  doc.text("Return No:", returnX, returnY);
  doc.setFont("helvetica", "normal").setTextColor(...textBlack);
  doc.text(salesReturn.return_number || "-", returnX + 25, returnY);

  returnY += 4;
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...textBlack);
  doc.text("Return Date:", returnX, returnY);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...textBlack);
  doc.text(salesReturn.return_date ? dayjs(salesReturn.return_date).format("DD-MM-YYYY") : "-", returnX + 25, returnY);

  returnY += 4;
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...textBlack);
  doc.text("Invoice No:", returnX, returnY);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...textBlack);
  const invoiceText = salesReturn.original_invoice_number || "-";
  const invoiceLines = splitTextToLines(doc, invoiceText, returnMaxWidth - 25, 9);
  doc.text(invoiceLines.slice(0, 2), returnX + 25, returnY);

  yPos += Math.max(logoSize, 20);

  // Horizontal line (EXACT same)
  doc.setDrawColor(...darkBlue);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos-3, pageWidth - margin, yPos-3);
  yPos += 3;

  // ===== SALES RETURN TITLE (instead of Tax Invoice) =====
  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...darkBlue);
  const titleText = "SALES RETURN";
  const titleY = yPos;
  doc.text(titleText, pageWidth / 2, titleY, { align: "center" });

  const titleWidth = doc.getTextWidth(titleText);
  const titleStartX = (pageWidth - titleWidth) / 2;
  const titleEndX = titleStartX + titleWidth;
  doc.setDrawColor(...darkBlue);
  doc.setLineWidth(0.5);
  doc.line(titleStartX, titleY + 1.5, titleEndX, titleY + 1.5);
  yPos += 4;

  // ===== CUSTOMER / RETURN DETAILS TABLE (adapted from Buyer/Consignee) =====
  autoTable(doc, {
    startY: yPos,
    margin: { left: margin + 2, right: margin + 2 },
    body: [
      [
        {
          content: "Customer Details:",
          styles: { fontStyle: "bold", halign: "left", fontSize: 9, textColor: textBlack }
        },
        {
          content: "Return Information:",
          styles: { fontStyle: "bold", halign: "left", fontSize: 9, textColor: textBlack }
        }
      ],
      [
        {
          content:
            `${salesReturn.customer_name || ""}\n` +
            `${salesReturn.customer_address || ""}\n` +
            `Mobile: ${salesReturn.customer_mobile || ""}\n` +
            `GST: ${salesReturn.customer_gst || ""}`,
          styles: { fontSize: 8.5, fontStyle: "normal", valign: "top", halign: "left", textColor: textBlack }
        },
        {
          content:
            `Return No: ${salesReturn.return_number || "-"}\n` +
            `Date: ${salesReturn.return_date ? dayjs(salesReturn.return_date).format("DD-MM-YYYY") : "-"}\n` +
            `Original Invoice: ${salesReturn.original_invoice_number || "-"}\n` +
            `Reason: ${getTruncatedReason(salesReturn.reason, doc, 80, 8.5)}`,
          styles: { fontSize: 8.5, fontStyle: "normal", valign: "top", halign: "left", textColor: textBlack }
        }
      ]
    ],
    theme: "grid",
    styles: {
      fontSize: 8.5,
      cellPadding: 1.4,
      lineWidth: 0.3,
      lineColor: darkBlue,
      textColor: textBlack
    },
    tableLineColor: darkBlue,
    tableLineWidth: 0.4,
    columnStyles: {
      0: { cellWidth: (pageWidth - 2 * margin - 4) / 2 },
      1: { cellWidth: (pageWidth - 2 * margin - 4) / 2 }
    }
  });

  return doc.lastAutoTable.finalY + 3;
}

/**
 * Draw bottom sections for Sales Return with QR Code
 */
async function drawSalesReturnBottomSections(doc, salesReturn, items, companyInfo, yPos, margin, tableWidth, pageWidth, pageHeight, format, darkBlue, lightBlue, textBlack, qrImage) {
  yPos += 1;

  // ===== SUMMARY TABLE =====
  const subtotal = parseFloat(salesReturn.subtotal || 0);
  const gst = parseFloat(salesReturn.gst_amount || 0);
  const discount = parseFloat(salesReturn.discount_amount || 0);
  const totalAmount = parseFloat(salesReturn.total_amount || 0);

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin + 2, right: margin + 2 },
    body: [
      [
        `Subtotal: Rs. ${format(subtotal)}`,
        `GST: Rs. ${format(gst)}`,
        `Total: Rs. ${format(totalAmount)}`,
      ],
      [
        `Discount: Rs. ${format(discount)}`,
        `Items: ${items.length}`,
        `Status: Pending Verification`
      ],
    ],
    theme: "grid",
    styles: { 
      fontSize: 7.5, 
      cellPadding: 1.8, 
      lineWidth: 0.3, 
      halign: "left",
      lineColor: darkBlue,
      textColor: textBlack
    },
    columnStyles: { 
      0: { cellWidth: (tableWidth) / 3 + 12.9 },
      1: { cellWidth: (tableWidth) / 3 - 10.2},
      2: { cellWidth: (tableWidth) / 3 - 2.7, fillColor: [240, 240, 240], fontStyle: 'bold' }
    },
    tableLineColor: darkBlue,
    tableLineWidth: 0.4,
  });

  yPos = doc.lastAutoTable.finalY + 1;

  // ===== VERIFICATION STATUS SUMMARY =====
  const verifiedCount = items.filter(item => item.verified_quantity === item.quantity).length;
  const partialCount = items.filter(item => item.verified_quantity > 0 && item.verified_quantity < item.quantity).length;
  const pendingCount = items.filter(item => item.verified_quantity === 0).length;

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin + 2, right: margin + 2 },
    body: [
      [
        `Fully Verified: ${verifiedCount}`,
        `Partially Verified: ${partialCount}`,
        `Pending: ${pendingCount}`,
      ],
    ],
    theme: "grid",
    styles: { 
      fontSize: 7.5, 
      cellPadding: 1.8, 
      lineWidth: 0.3, 
      halign: "center",
      lineColor: darkBlue,
      textColor: textBlack,
      fontStyle: "bold"
    },
    columnStyles: { 
      0: { cellWidth: tableWidth / 3 + 12.9 },
      1: { cellWidth: tableWidth / 3 - 10.2, fillColor: [250, 250, 250] },
      2: { cellWidth: tableWidth / 3 - 2.7, fillColor: [240, 240, 240] }
    },
    tableLineColor: darkBlue,
    tableLineWidth: 0.4,
  });

  yPos = doc.lastAutoTable.finalY + 1;

  // ===== BOTTOM 3 SECTIONS (NEW CONTENT - NO DUPLICATION) =====
  const section1Width = (tableWidth * 4) / 10;
  const section2Width = (tableWidth * 3) / 10;
  const section3Width = (tableWidth * 3) / 10;
  const threeSectionStartY = yPos;

  // Section 1: VERIFICATION INSTRUCTIONS (NEW)
  const verificationInstructions = `Verification\n\n1. Verify quantity matches\n2. Inspect packaging\n3. Note any damage`;
  
  autoTable(doc, {
    startY: threeSectionStartY,
    margin: { left: margin + 2, right: pageWidth - margin - 2 - section1Width },
    body: [[verificationInstructions]],
    theme: "grid",
    styles: { fontSize: 7.5, halign: "left", fontStyle: "bold", cellPadding: 1.5, lineWidth: 0.3, lineColor: darkBlue, textColor: textBlack },
    tableLineColor: darkBlue,
    tableLineWidth: 0.4,
  });

  const section1EndY = doc.lastAutoTable.finalY;

  // Section 2: Bank Details (SAME as invoice)
  const section2X = margin + 2 + section1Width;
  autoTable(doc, {
    startY: threeSectionStartY,
    margin: { left: section2X, right: pageWidth - section2X - section2Width },
    body: [[`Bank Details\n\nBank: ${companyInfo.bankName}\nA/c: ${companyInfo.accountNo}\nIFSC: ${companyInfo.ifsc}`]],
    theme: "grid",
    styles: { fontSize: 7.5, halign: "left", fontStyle: "bold", cellPadding: 1.5, lineWidth: 0.3, lineColor: darkBlue, textColor: textBlack },
    tableLineColor: darkBlue,
    tableLineWidth: 0.4,
  });

  const section2EndY = doc.lastAutoTable.finalY;

  // Section 3: QR Code (EXACT same as invoice) - USE PASSED qrImage
  const section3X = section2X + section2Width - 3.7;
  autoTable(doc, {
    startY: threeSectionStartY,
    margin: { left: section3X, right: margin + 2 },
    body: [[{ content: "", styles: { minCellHeight: Math.max(section1EndY, section2EndY) - threeSectionStartY } }]],
    theme: "grid",
    styles: { lineWidth: 0.3, lineColor: darkBlue },
    tableLineColor: darkBlue,
    tableLineWidth: 0.4,
  });

  // Draw QR Code (use pre-generated compressed image)
  if (qrImage) {
    const qrSize = 14;
    const qrX = section3X + (section3Width - qrSize) / 2;
    const qrY = threeSectionStartY + 3;
    
    doc.setFont("helvetica", "bold").setFontSize(6).setTextColor(...textBlack);
    doc.text("Sales Return", qrX + qrSize / 2, qrY - 0.3, { align: "center" });
    // Use JPEG format for QR code
    doc.addImage(qrImage, "JPEG", qrX, qrY, qrSize, qrSize);
  }

  yPos = Math.max(section1EndY, section2EndY, doc.lastAutoTable.finalY) + 1;

  // ===== DECLARATION + SIGNATURE (OPTIMIZED) =====
  const declarationWidth = (tableWidth * 7) / 10;
  const signatureWidth = (tableWidth * 3) / 10;
  const declarationStartY = yPos;

  // Declaration
  autoTable(doc, {
    startY: declarationStartY,
    margin: {
      left: margin + 2,
      right: pageWidth - margin - 2 - declarationWidth - 30.7
    },
    head: [[
      {
        content: "Declaration",
        styles: {
          fontSize: 8,
          fontStyle: "bold",
          textColor: textBlack,
          fillColor: false,
          lineWidth: 0
        }
      }
    ]],
    body: [[
      {
        content: `Goods received on return will be verified before issuing credit. All particulars are true and correct. \nSubject to ${companyInfo.name} jurisdiction only.`,
        styles: {
          fontSize: 7,
          halign: "left",
          cellPadding: 1.2,
          minCellHeight: 14,
          textColor: textBlack,
          lineWidth: 0
        }
      }
    ]],
    theme: "grid",
    styles: {
      lineColor: darkBlue
    },
    headStyles: {
      fillColor: false,
      lineWidth: 0
    },
    tableLineColor: darkBlue,
    tableLineWidth: 0.4
  });

  const declarationEndY = doc.lastAutoTable.finalY;

  // Signature (EXACT same)
  const signatureX = margin + 2 + declarationWidth - 3.7;
  autoTable(doc, {
    startY: declarationStartY,
    margin: { left: signatureX, right: margin + 2 },
    body: [[{ content: "", styles: { minCellHeight: declarationEndY - declarationStartY } }]],
    theme: "grid",
    styles: { lineWidth: 0.3, lineColor: darkBlue },
    tableLineColor: darkBlue,
    tableLineWidth: 0.4,
  });

  // Signature text
  const sigCenterX = signatureX + signatureWidth / 2;
  const sigTopY = declarationStartY + 3;
  
  doc.setFont("helvetica", "bold").setFontSize(6.5).setTextColor(...textBlack);
  const companyNameLines = splitTextToLines(doc, `For ${companyInfo.name}`, signatureWidth - 4, 6.5);
  doc.text(companyNameLines, sigCenterX, sigTopY, { align: "center" });
  
  const sigLineY = declarationEndY - 4;
  doc.setDrawColor(...darkBlue);
  doc.setLineWidth(0.3);
  doc.line(signatureX + 3, sigLineY, signatureX + signatureWidth - 3, sigLineY);
  
  doc.setFont("helvetica", "normal").setFontSize(6).setTextColor(...textBlack);
  doc.text("Authorized Signatory", sigCenterX, sigLineY + 2, { align: "center" });
}

/**
 * Add page borders for Sales Return (ADAPTED from invoice)
 */
function addSalesReturnPageBorders(doc, pageWidth, pageHeight, salesReturn, darkBlue, textBlack) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Bottom section footer ONLY
    doc.setFontSize(6.5).setTextColor(...textBlack);
    doc.text(
      `Page ${i} of ${pageCount} | Return No: ${salesReturn.return_number || "-"}`,
      pageWidth / 2,
      pageHeight - 2.5,
      { align: "center" }
    );
  }
}