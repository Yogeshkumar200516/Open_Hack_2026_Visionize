import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

// Helper: format safely with Indian number style
const safeFormat = (val) => {
  const num = Number(val);
  return !isNaN(num)
    ? num.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "-";
};

/**
 * Draws a visually balanced and clean "e-Way Bill" page
 * (To be appended to existing jsPDF instance)
 */
export async function drawEwayBillPage(doc, invoice) {
  // --- PAGE INIT ---
  doc.addPage();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = { top: 18, left: 18, right: 18, bottom: 20 };

  // Outer border
  doc.setDrawColor(130, 130, 130);
  doc.setLineWidth(0.4);
  doc.roundedRect(
    margin.left - 6,
    margin.top - 10,
    pageWidth - margin.left - margin.right + 12,
    pageHeight - margin.top - margin.bottom + 5,
    5,
    5
  );

  // --- TITLE SECTION ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("E-WAY BILL DETAILS", pageWidth / 2, margin.top, { align: "center" });

  doc.setDrawColor(100);
  doc.setLineWidth(0.3);
  doc.line(
    margin.left,
    margin.top + 3,
    pageWidth - margin.right,
    margin.top + 3
  );

  // --- QR & IRN INFO ---
  const infoY = margin.top + 14;
  const qrSize = 45;
  const qrX = pageWidth - margin.right - qrSize;
  const qrY = infoY - 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const infoData = [
    ["IRN", invoice.irn || "-"],
    ["Ack No.", invoice.ack_number || "-"],
    ["Ack Date", invoice.ack_date || "-"],
  ];

  let y = infoY;
  infoData.forEach(([label, val]) => {
    doc.text(`${label}:`, margin.left, y);
    doc.text(val, margin.left + 38, y);
    y += 7;
  });

  // --- QR Code ---
  try {
    const qrData = invoice.qr_string || "https://ewaybillgst.gov.in";
    const qrImage = await QRCode.toDataURL(qrData, { margin: 0, width: qrSize });
    doc.addImage(qrImage, "PNG", qrX, qrY, qrSize, qrSize);
  } catch (err) {
    console.warn("QR generation failed:", err);
  }

  // --- TRANSPORT DETAILS ---
  const transBoxY = y + 4;
  const boxWidth = pageWidth - margin.left - margin.right;
  const boxHeight = 48;
  const colGap = 10;
  const colWidth = (boxWidth - colGap) / 2;

  doc.setDrawColor(180);
  doc.roundedRect(margin.left, transBoxY, boxWidth, boxHeight, 4, 4);
  doc.line(
    margin.left + colWidth + colGap / 2,
    transBoxY,
    margin.left + colWidth + colGap / 2,
    transBoxY + boxHeight
  );

  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("Transport Details", margin.left + 5, transBoxY + 10);

  doc.setFont("helvetica", "normal").setFontSize(10);

  const leftInfo = [
    ["Transporter Name", invoice.transporter_name],
    ["Transporter GSTIN", invoice.transporter_gst_number],
    ["Vehicle No.", invoice.vehicle_number],
  ];
  const rightInfo = [
    ["Mode", invoice.transport_mode],
    ["Distance (Km)", invoice.transport_distance ? `${invoice.transport_distance} km` : "-"],
    ["e-Way Bill No.", invoice.eway_bill_no],
  ];

  let yLeft = transBoxY + 20;
  leftInfo.forEach(([label, val]) => {
    doc.text(label, margin.left + 8, yLeft);
    doc.text(val || "-", margin.left + colWidth - 8, yLeft, { align: "right" });
    yLeft += 7;
  });

  let yRight = transBoxY + 20;
  rightInfo.forEach(([label, val]) => {
    doc.text(label, margin.left + colWidth + colGap, yRight);
    doc.text(val || "-", margin.left + boxWidth - 8, yRight, { align: "right" });
    yRight += 7;
  });

  // --- FROM / TO SECTION ---
  const addrY = transBoxY + boxHeight + 10;
  const addrHeight = 46;
  doc.roundedRect(margin.left, addrY, boxWidth, addrHeight, 4, 4);
  doc.line(
    margin.left + colWidth + colGap / 2,
    addrY,
    margin.left + colWidth + colGap / 2,
    addrY + addrHeight
  );

  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("From (Dispatch From)", margin.left + 6, addrY + 10);
  doc.text("To (Ship To)", margin.left + colWidth + colGap, addrY + 10);

  doc.setFont("helvetica", "normal").setFontSize(10);

  const fromAddr = [
    invoice.company_name,
    `GSTIN: ${invoice.company_gstin || "-"}`,
    invoice.place_of_dispatch || "",
    invoice.from_address_line1 || "",
    invoice.from_address_line2 || "",
  ].filter(Boolean);

  const toAddr = [
    invoice.consignee_name || invoice.customer_name,
    `GSTIN: ${invoice.consignee_gst_number || invoice.customer_gst_number || "-"}`,
    invoice.consignee_address || invoice.customer_address,
    invoice.consignee_state || invoice.customer_state,
    invoice.consignee_pincode || invoice.customer_pincode,
  ].filter(Boolean);

  let yFrom = addrY + 18;
  fromAddr.forEach((line) => {
    doc.text(line, margin.left + 8, yFrom);
    yFrom += 6;
  });

  let yTo = addrY + 18;
  toAddr.forEach((line) => {
    doc.text(line, margin.left + colWidth + colGap, yTo);
    yTo += 6;
  });

  // --- PRODUCTS TABLE ---
  const tableY = addrY + addrHeight + 12;
  autoTable(doc, {
    startY: tableY,
    margin: { left: margin.left, right: margin.right },
    head: [["S.N", "Description", "HSN", "Qty", "Rate", "Amount"]],
    body: (invoice.items || []).map((item, i) => [
      i + 1,
      item.product_name || "-",
      item.hsn_code || "-",
      `${item.quantity || "-"} ${item.unit || ""}`,
      safeFormat(item.rate),
      safeFormat(item.total_with_gst),
    ]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: 30,
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      1: { cellWidth: 68 },
      2: { cellWidth: 24, halign: "center" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 32, halign: "right" },
    },
  });

  // --- SUMMARY ---
  const summaryY = doc.lastAutoTable.finalY + 12;
  doc.setFont("helvetica", "bold").setFontSize(10);

  const summaryData = [
    ["Taxable Value", safeFormat(invoice.subtotal)],
    ["CGST", safeFormat(invoice.cgst_amount)],
    ["SGST", safeFormat(invoice.sgst_amount)],
    ["Total Amount", safeFormat(invoice.total_amount)],
  ];

  const labelX = pageWidth - margin.right - 82;
  const valueX = pageWidth - margin.right - 5;
  summaryData.forEach(([label, val], i) => {
    const yPos = summaryY + i * 7;
    doc.text(label, labelX, yPos);
    doc.text(val, valueX, yPos, { align: "right" });
  });

  // --- SIGNATURE BOX ---
  const sigY = summaryY + 38;
  const sigW = 80;
  const sigH = 25;
  doc.setDrawColor(90, 90, 90);
  doc.roundedRect(pageWidth - margin.right - sigW, sigY, sigW, sigH, 3, 3);
  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text(
    "Authorized Signatory",
    pageWidth - margin.right - sigW / 2,
    sigY + sigH / 2 + 3,
    { align: "center" }
  );

  // --- FOOTER ---
  const footerY = pageHeight - 14;
  doc.setDrawColor(160);
  doc.line(margin.left, footerY, pageWidth - margin.right, footerY);
  doc.setFont("helvetica", "italic").setFontSize(9).setTextColor(80);
  doc.text(
    "Generated by Smart Billing Software • Powered by GST Automation",
    pageWidth / 2,
    footerY + 5,
    { align: "center" }
  );
}
