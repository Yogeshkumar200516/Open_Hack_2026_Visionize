import pdfMakeModule from "pdfmake/build/pdfmake";
import pdfFontsModule from "pdfmake/build/vfs_fonts";
import API_BASE_URL from "../../Context/Api";
pdfMakeModule.vfs = pdfFontsModule.vfs;

// ✅ UNIVERSAL IMAGE CONVERTER: ANY format → PNG for pdfMake
const universalImageToPng = async (imageSource) => {
  if (!imageSource) return null;
  
  console.log("🎨 Converting image to PNG:", imageSource);
  
  try {
    // Handle different input types
    let img;
    
    if (typeof imageSource === 'string') {
      if (imageSource.startsWith('data:image')) {
        // Base64 data URL
        img = new Image();
        img.src = imageSource;
      } else if (imageSource.startsWith('http')) {
        // URL - fetch first
        const resp = await fetch(imageSource, { mode: "cors", cache: "force-cache" });
        if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
        const blob = await resp.blob();
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
        img = new Image();
        img.src = dataUrl;
      }
    }
    
    return new Promise((resolve) => {
      img.crossOrigin = "Anonymous";
      
      img.onload = () => {
        console.log("✅ Image loaded, converting to PNG");
        
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // Resize to max 200px (maintain aspect ratio)
        let { width, height } = img;
        const maxSize = 200;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height / width) * maxSize);
            width = maxSize;
          } else {
            width = Math.round((width / height) * maxSize);
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // White background for transparency issues
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        // ✅ Always PNG output (pdfMake safe)
        const pngDataUrl = canvas.toDataURL("image/png", 0.95);
        console.log("✅ PNG conversion complete:", pngDataUrl.substring(0, 50) + "...");
        resolve(pngDataUrl);
      };
      
      img.onerror = (err) => {
        console.error("❌ Image load failed:", err);
        resolve(null);
      };
      
      // Trigger load if not already set
      if (!img.src) {
        img.src = imageSource;
      }
    });
  } catch (error) {
    console.error("❌ Universal conversion failed:", error);
    return null;
  }
};

// Format number to 2 decimals string
const formatCurrency = (amount) => {
  const num = Number(amount);
  return isNaN(num) ? "0.00" : num.toFixed(2);
};

// Number to words (integer part only)
const numberToWords = (amount) => {
  const singleDigits = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const twoDigits = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tensMultiple = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const placeValue = ["", "Thousand", "Lakh", "Crore"];

  if (typeof amount !== "number") amount = parseFloat(amount);
  if (isNaN(amount)) return "";

  const n = Math.floor(amount);
  if (n === 0) return "Zero Rupees Only";

  const convertBelowThousand = (num) => {
    let str = "";
    if (num > 99) {
      str += singleDigits[Math.floor(num / 100)] + " Hundred ";
      num %= 100;
    }
    if (num >= 10 && num < 20) {
      str += twoDigits[num - 10] + " ";
    } else {
      str += tensMultiple[Math.floor(num / 10)] + " " + singleDigits[num % 10] + " ";
    }
    return str.trim();
  };

  let word = "";
  let cnt = 0;
  let num = n;
  while (num > 0) {
    let chunk = 0;
    if (cnt === 0) {
      chunk = num % 1000;
      num = Math.floor(num / 1000);
    } else {
      chunk = num % 100;
      num = Math.floor(num / 100);
    }
    if (chunk > 0) {
      word = convertBelowThousand(chunk) + " " + placeValue[cnt] + " " + word;
    }
    cnt++;
  }
  return word.trim() + "Rupees Only";
};

export const generateBillPDF = async (bill) => {
  if (!bill) return;

  const pdfMake = pdfMakeModule.default || pdfMakeModule;
  pdfMake.vfs = pdfFontsModule.vfs;

  const formattedDate = bill.created_at
    ? new Date(bill.created_at).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const company = bill.company || {};
  let logoDataUrl = null;

  // ✅ UNIVERSAL: Convert ANY image format to PNG
  if (company.logo) {
    const fullLogoUrl = company.logo.startsWith("http")
      ? company.logo
      : `${API_BASE_URL}/uploads/logos/${company.logo}`;

    console.log("🎨 Processing logo:", fullLogoUrl);
    
    try {
      // Try base64 first, then URL
      const imageSource = company.logo_base64?.startsWith('data:image') 
        ? company.logo_base64 
        : fullLogoUrl;
      
      logoDataUrl = await universalImageToPng(imageSource);
      
      if (logoDataUrl) {
        console.log("✅ Logo converted to PNG successfully");
      } else {
        console.warn("❌ Logo conversion failed");
      }
    } catch (e) {
      console.error("❌ Logo processing error:", e);
      logoDataUrl = null;
    }
  }

  console.log("Final Logo Status:", !!logoDataUrl ? "✅ PNG READY" : "❌ NO LOGO");

  const productColWidths = [18, 120, 50, 25, 55, 35, 45, 60, 75];

  // Build product table rows
  const tableBody = [
    [
      { text: "#", bold: true, fillColor: "#4a90e2", color: "#fff" },
      { text: "Product", bold: true, fillColor: "#4a90e2", color: "#fff" },
      { text: "HSN", bold: true, fillColor: "#4a90e2", color: "#fff" },
      { text: "Qty", bold: true, alignment: "right", fillColor: "#4a90e2", color: "#fff" },
      { text: "Rate", bold: true, alignment: "right", fillColor: "#4a90e2", color: "#fff" },
      { text: "GST%", bold: true, alignment: "right", fillColor: "#4a90e2", color: "#fff" },
      { text: "Discount", bold: true, alignment: "right", fillColor: "#4a90e2", color: "#fff" },
      { text: "Base Amt", bold: true, alignment: "right", fillColor: "#4a90e2", color: "#fff" },
      { text: "Total (incl GST)", bold: true, alignment: "right", fillColor: "#4a90e2", color: "#fff" }
    ],
  ];

  if (bill.items && bill.items.length > 0) {
    bill.items.forEach((item, index) => {
      const rowFillColor = index % 2 === 0 ? "#f3f6fb" : "#eaf1fb";
      tableBody.push([
        { text: (index + 1).toString(), alignment: "center", fillColor: rowFillColor },
        { text: item.product_name || "-", fillColor: rowFillColor },
        { text: item.hsn_code || "-", fillColor: rowFillColor },
        {
          columns: [
            { text: item.quantity?.toString() || "0", alignment: "right", width: "auto" },
            { text: item.unit || "-", alignment: "right", width: "auto" }
          ],
          alignment: "center",
          fillColor: rowFillColor
        },
        { text: `₹${formatCurrency(item.rate)}`, alignment: "right", fillColor: rowFillColor },
        { text: `${item.gst_percentage || 0}%`, alignment: "right", fillColor: rowFillColor },
        { text: `${item.discount || 0}%`, alignment: "right", fillColor: rowFillColor },
        { text: `₹${formatCurrency(item.base_amount)}`, alignment: "right", fillColor: rowFillColor },
        { text: `₹${formatCurrency(item.total_with_gst)}`, alignment: "right", bold: true, fillColor: rowFillColor },
      ]);
    });
  } else {
    tableBody.push([{ text: "No products to display", colSpan: 9, alignment: "center", italics: true }, {}, {}, {}, {}, {}, {}, {}, {}]);
  }

  // Chunk table rows for page breaks
  const maxRowsPerPage = 16;
  const tableHeader = tableBody[0];
  let tableChunks = [];
  if (tableBody.length > maxRowsPerPage) {
    tableChunks.push([tableHeader, ...tableBody.slice(1, maxRowsPerPage)]);
    let idx = maxRowsPerPage;
    while (idx < tableBody.length) {
      tableChunks.push([tableHeader, ...tableBody.slice(idx, idx + maxRowsPerPage)]);
      idx += maxRowsPerPage;
    }
  } else {
    tableChunks.push(tableBody);
  }

  const totalAmount = bill.total_amount || 0;
  const totalAmountWords = numberToWords(totalAmount);

  // Prepare document content
  let content = [
    {
      table: {
        widths: [45, "*"],
        body: [
          [
            {
              border: [true, true, true, true],
              margin: [1, 1, 1, 1],
              stack: [
                logoDataUrl
                  ? { image: logoDataUrl, width: 45, height: 45, alignment: "center" }
                  : { text: "" }
              ]
            },
            {
              border: [true, true, true, true],
              margin: [1, 1, 1, 1],
              stack: [
                { text: company.name || "Your Company Name", style: "companyName", alignment: "center", margin: [0, 2, 0, 2] },
                { text: company.address || "", style: "companyDetails", alignment: "center", margin: [0, 0, 0, 2] },
                {
                  columns: [
                    { text: `GST: ${company.gst_no || ""}`, style: "companyDetails", alignment: "left" },
                    { text: `Mobile: ${company.mobile1 || ""}${company.mobile2 ? `, ${company.mobile2}` : ""}`, style: "companyDetails", alignment: "right" }
                  ]
                }
              ]
            }
          ]
        ]
      },
      layout: {
        hLineWidth: () => 1.2,
        vLineWidth: () => 1.2,
        hLineColor: () => "#bbb",
        vLineColor: () => "#bbb",
      },
      margin: [0, 0, 0, 10]
    },
    { columns: [{ text: "BILL", style: "header", alignment: "center" }], margin: [0, 0, 0, 10] },
    {
      columns: [
        { text: `Bill Number: ${bill.bill_number || "-"}`, style: "subheader", alignment: "left" },
        { text: `Date: ${formattedDate}`, style: "subheader", alignment: "right" }
      ],
      margin: [0, -18, 0, 3]
    },
    {
      columns: [
        { text: `Customer Name: ${bill.customer_name || "-"}`, style: "sectionHeader", alignment: "left" },
        { text: `Mobile: ${bill.mobile_no || "-"}`, style: "sectionHeader", alignment: "right" }
      ],
      margin: [0, 0, 0, 3]
    },
    {
      columns: [
        { text: `Payment Mode: ${bill.payment_type || "-"}`, style: "sectionHeader", alignment: "left" },
        { text: `Status: ${bill.payment_status || "-"}`, style: "sectionHeader", alignment: "right" }
      ],
      margin: [0, 0, 0, 7]
    },
    { text: "Product Details", style: "tableHeader", margin: [0, 0, 0, 5] }
  ];

  tableChunks.forEach((chunk, idx) => {
    content.push({
      table: {
        headerRows: 1,
        widths: productColWidths,
        body: chunk,
      },
      layout: {
        hLineColor: () => "#a0c4ff",
        vLineColor: () => "#a0c4ff",
        fillColor: (rowIndex) => (rowIndex === 0 ? "#4a90e2" : rowIndex % 2 ? "#f3f6fb" : "#eaf1fb"),
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 2,
        paddingBottom: () => 2,
      },
      margin: [0, 0, 0, 0],
      pageBreak: idx !== 0 ? "before" : undefined,
    });
  });

  const docDefinition = {
    pageSize: "A5",
    pageOrientation: "landscape",
    pageMargins: [14, 12, 14, 85],
    info: {
      title: `Bill_${bill.bill_number || "unknown"}`,
      author: company.name || "Your Company",
      subject: "Bill PDF",
      keywords: "bill, pdf"
    },
    content,
    footer: (currentPage, pageCount) => {
      return {
        margin: [14, 0, 14, 5],
        table: {
          widths: ["50%", "50%"],
          body: [
            [
              {
                stack: [
                  {
                    text: `Subtotal: ₹${formatCurrency(bill.subtotal)}`,
                    alignment: "right",
                  },
                  (parseFloat(bill.discount_value) || 0) > 0 && {
                    text:
                      bill.discount_type === "%"
                        ? `Discount (${bill.discount_value || 0}%): ₹${formatCurrency(
                            bill.discount_value
                          )}`
                        : `Discount (₹): ₹${formatCurrency(bill.discount_value)}`,
                    alignment: "right",
                  },
                  (parseFloat(bill.transport_charge) || 0) > 0 && {
                    text: `Transport Charges: ₹${formatCurrency(
                      bill.transport_charge
                    )}`,
                    alignment: "right",
                  },
                ].filter(Boolean),
              },
              {
                stack: [
                  {
                    text:
                      (parseFloat(bill.gst_percentage) || 0) > 0
                        ? `GST (${bill.gst_percentage}%): ₹${formatCurrency(
                            bill.gst_amount
                          )}`
                        : `GST: ₹${formatCurrency(bill.gst_amount)}`,
                    alignment: "right",
                  },
                  {
                    text:
                      (parseFloat(bill.gst_percentage) || 0) > 0
                        ? `CGST (${(bill.gst_percentage / 2).toFixed(2)}%): ₹${formatCurrency(
                            bill.cgst_amount
                          )}`
                        : `CGST: ₹${formatCurrency(bill.cgst_amount)}`,
                    alignment: "right",
                  },
                  {
                    text:
                      (parseFloat(bill.gst_percentage) || 0) > 0
                        ? `SGST (${(bill.gst_percentage / 2).toFixed(2)}%): ₹${formatCurrency(
                            bill.sgst_amount
                          )}`
                        : `SGST: ₹${formatCurrency(bill.sgst_amount)}`,
                    alignment: "right",
                  },
                ].filter(Boolean),
              }
            ],
            [
              {
                stack: [
                  { 
                    text: "Thank You!", 
                    alignment: "center", 
                    bold: true, 
                    fontSize: 9, 
                    color: "#d1495b", 
                    margin: [0, 0, 0, 6] 
                  },
                  { 
                    text: "We appreciate your business and look forward to serving you again.", 
                    alignment: "center", 
                    italics: true, 
                    fontSize: 7, 
                    color: "#a0522d" 
                  }
                ],
              },
              {
                stack: [
                  { text: `Total Amount: ₹${formatCurrency(totalAmount)}`, alignment: "right", bold: true, fontSize: 10, color: "#d1495b" },
                  { text: totalAmountWords, alignment: "right", italics: true, fontSize: 8, margin: [0, 3, 0, 0], color: "#a0522d" }
                ]
              }
            ]
          ]
        },
        layout: {
          hLineColor: () => "#b0c4de",
          vLineColor: () => "#b0c4de",
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        }
      };
    },
    styles: {
      header: { fontSize: 11, bold: true, color: "#294065", alignment: "center", decoration: "underline" },
      subheader: { fontSize: 9, margin: [0, 2], color: "#4a90e2" },
      sectionHeader: { fontSize: 9, bold: true, color: "#294065" },
      tableHeader: { fontSize: 10, bold: true, color: "#294065" },
      companyName: { fontSize: 11, bold: true, color: "#153E73" },
      companyDetails: { fontSize: 8, color: "#555" },
      balance: { fontSize: 15, bold: true, color: "#d1495b" }
    },
    defaultStyle: { fontSize: 10, color: "#222" },
    background: function (currentPage, pageSize) {
      return [
        {
          canvas: [
            { type: "rect", x: 12, y: 12, w: pageSize.width - 24, h: pageSize.height - 24, color: "#f6fafd" },
            { type: "line", x1: 8, y1: 8, x2: pageSize.width - 8, y2: 8, lineWidth: 1, lineColor: "#4a90e2" },
            { type: "line", x1: 8, y1: 8, x2: 8, y2: pageSize.height - 8, lineWidth: 1, lineColor: "#4a90e2" },
            { type: "line", x1: 8, y1: pageSize.height - 8, x2: pageSize.width - 8, y2: pageSize.height - 8, lineWidth: 1, lineColor: "#4a90e2" },
            { type: "line", x1: pageSize.width - 8, y1: 8, x2: pageSize.width - 8, y2: pageSize.height - 8, lineWidth: 1, lineColor: "#4a90e2" }
          ]
        }
      ];
    }
  };

  pdfMake.createPdf(docDefinition).download(`Bill_${bill.bill_number || "unknown"}.pdf`);
};