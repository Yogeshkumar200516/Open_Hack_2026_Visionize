import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Chip,
  LinearProgress,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import TableChartIcon from "@mui/icons-material/TableChart";
import axios from "axios";
import readXlsxFile from "read-excel-file";
import API_BASE_URL from "../../Context/Api";

const REQUIRED_COLUMNS = [
  "product_name",
  "hsn_code",
  "category_name",
  "price",
  "stock_quantity",
  "gst",
  "discount",
];

const OPTIONAL_COLUMNS = ["description", "barcode"];

// Schema for read-excel-file typed parsing
const SCHEMA = {
  product_name: {
    column: "product_name",
    prop: "product_name",
    type: String,
    required: true,
  },
  hsn_code: {
    column: "hsn_code",
    prop: "hsn_code",
    type: String,
    required: true,
  },
  category_name: {
    column: "category_name",
    prop: "category_name",
    type: String,
    required: true,
  },
  price: {
    column: "price",
    prop: "price",
    type: Number,
    required: true,
  },
  stock_quantity: {
    column: "stock_quantity",
    prop: "stock_quantity",
    type: Number,
    required: true,
  },
  gst: {
    column: "gst",
    prop: "gst",
    type: Number,
    required: true,
  },
  discount: {
    column: "discount",
    prop: "discount",
    type: Number,
    required: true,
  },
  description: {
    column: "description",
    prop: "description",
    type: String,
  },
  barcode: {
    column: "barcode",
    prop: "barcode",
    type: String,
  },
};


// ─────────────────────────────────────────────────────────────────────
// Minimal .xlsx generator (no extra library required)
// Builds a valid Office Open XML workbook in a ZIP container using
// only the browser's built-in APIs (Blob, Uint8Array, etc.)
// ─────────────────────────────────────────────────────────────────────

/** CRC-32 table */
const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function strToBytes(str) {
  return new TextEncoder().encode(str);
}

function uint32LE(n) {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);
}

function uint16LE(n) {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
}

function concat(...arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

/** Build a ZIP local file entry + central directory entry */
function zipEntry(filename, data) {
  const nameBytes = strToBytes(filename);
  const crc = crc32(data);
  const size = data.length;

  // Local file header
  const localHeader = concat(
    new Uint8Array([0x50, 0x4b, 0x03, 0x04]), // signature
    uint16LE(20),          // version needed
    uint16LE(0),           // flags
    uint16LE(0),           // compression (stored)
    uint16LE(0),           // mod time
    uint16LE(0),           // mod date
    uint32LE(crc),
    uint32LE(size),        // compressed size
    uint32LE(size),        // uncompressed size
    uint16LE(nameBytes.length),
    uint16LE(0),           // extra field length
    nameBytes,
    data,
  );

  // Central directory header (offset stored externally)
  const centralHeader = (offset) => concat(
    new Uint8Array([0x50, 0x4b, 0x01, 0x02]), // signature
    uint16LE(20),          // version made by
    uint16LE(20),          // version needed
    uint16LE(0),           // flags
    uint16LE(0),           // compression
    uint16LE(0),           // mod time
    uint16LE(0),           // mod date
    uint32LE(crc),
    uint32LE(size),
    uint32LE(size),
    uint16LE(nameBytes.length),
    uint16LE(0),           // extra
    uint16LE(0),           // comment
    uint16LE(0),           // disk start
    uint16LE(0),           // internal attr
    uint32LE(0),           // external attr
    uint32LE(offset),      // relative offset of local header
    nameBytes,
  );

  return { localHeader, centralHeader, localSize: localHeader.length };
}

/** Escape a string for XML */
function xmlEscape(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generate a minimal .xlsx file from a 2-D array of rows.
 * First row is treated as headers and styled bold.
 */
function generateXlsx(rows) {
  // Build shared strings table
  const strings = [];
  const strIndex = {};
  const si = (val) => {
    const s = String(val ?? "");
    if (!(s in strIndex)) { strIndex[s] = strings.length; strings.push(s); }
    return strIndex[s];
  };

  // Pre-register all strings
  rows.forEach((row) => row.forEach((cell) => {
    if (typeof cell === "string") si(cell);
  }));

  // worksheet XML
  const colLetters = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
  const getCol = (i) => colLetters[i] || String.fromCharCode(65 + i);

  let sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>`;

  rows.forEach((row, ri) => {
    sheetXml += `\n    <row r="${ri + 1}">`;
    row.forEach((cell, ci) => {
      const col = getCol(ci);
      const ref = `${col}${ri + 1}`;
      if (typeof cell === "number") {
        // numeric — style 1 for header row numbers (but headers are strings so this won't apply)
        sheetXml += `<c r="${ref}" t="n"><v>${cell}</v></c>`;
      } else {
        // shared string
        const idx = si(cell);
        // style="1" on header row (ri===0) for bold
        const styleAttr = ri === 0 ? ` s="1"` : "";
        sheetXml += `<c r="${ref}" t="s"${styleAttr}><v>${idx}</v></c>`;
      }
    });
    sheetXml += `</row>`;
  });

  sheetXml += `\n  </sheetData>
</worksheet>`;

  // shared strings XML
  const ssXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
${strings.map((s) => `  <si><t xml:space="preserve">${xmlEscape(s)}</t></si>`).join("\n")}
</sst>`;

  // styles XML — define one bold font style (xfId=1)
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>
  </cellXfs>
</styleSheet>`;

  // workbook XML
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Products" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml"            ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml"   ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml"       ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/xl/styles.xml"              ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const topRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  // Build ZIP
  const files = [
    { name: "[Content_Types].xml",          data: strToBytes(contentTypes) },
    { name: "_rels/.rels",                  data: strToBytes(topRels) },
    { name: "xl/workbook.xml",              data: strToBytes(workbookXml) },
    { name: "xl/_rels/workbook.xml.rels",   data: strToBytes(workbookRels) },
    { name: "xl/worksheets/sheet1.xml",     data: strToBytes(sheetXml) },
    { name: "xl/sharedStrings.xml",         data: strToBytes(ssXml) },
    { name: "xl/styles.xml",                data: strToBytes(stylesXml) },
  ];

  const entries = [];
  let offset = 0;
  for (const f of files) {
    const entry = zipEntry(f.name, f.data);
    entries.push({ entry, offset });
    offset += entry.localSize;
  }

  const localParts = entries.map((e) => e.entry.localHeader);
  const centralParts = entries.map((e) => e.entry.centralHeader(e.offset));
  const centralSize = centralParts.reduce((s, a) => s + a.length, 0);

  const eocd = concat(
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]), // end of central dir signature
    uint16LE(0), uint16LE(0),
    uint16LE(entries.length),
    uint16LE(entries.length),
    uint32LE(centralSize),
    uint32LE(offset),
    uint16LE(0),
  );

  return concat(...localParts, ...centralParts, eocd);
}

/** Trigger a file download in the browser */
function downloadBlob(bytes, filename, mimeType) {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────

const BulkUploadModal = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const isDark = theme.palette.mode === "dark";

  const fileInputRef = useRef(null);
  const authToken = localStorage.getItem("authToken") || "";

  const [step, setStep] = useState("idle"); // idle | preview | uploading | done
  const [fileName, setFileName] = useState("");
  const [previewRows, setPreviewRows] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [uploadResults, setUploadResults] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const resetState = () => {
    setStep("idle");
    setFileName("");
    setPreviewRows([]);
    setValidationErrors([]);
    setUploadResults(null);
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Download a proper .xlsx template file
  const handleDownloadTemplate = () => {
    const headers = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];
    const sample1 = [
      "Sample Product", "1001", "Electronics", 1000, 50, 18, 5,
      "Optional description", "ABC1234567",
    ];
    const sample2 = [
      "Another Product", "2002", "Clothing", 500, 100, 12, 0,
      "", "",
    ];

    const rows = [headers, sample1, sample2];
    const bytes = generateXlsx(rows);
    downloadBlob(
      bytes,
      "product_upload_template.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  };

  // Row-level validation
  const validateRows = (rows) => {
    const errors = [];
    rows.forEach((row, i) => {
      const rowNum = i + 2;

      REQUIRED_COLUMNS.forEach((col) => {
        const val = row[col];
        if (val === undefined || val === null || String(val).trim() === "") {
          errors.push(`Row ${rowNum}: "${col}" is required`);
        }
      });

      if (row.price !== undefined && (isNaN(row.price) || row.price < 0)) {
        errors.push(`Row ${rowNum}: "price" must be a valid non-negative number`);
      }
      if (row.stock_quantity !== undefined && (isNaN(row.stock_quantity) || row.stock_quantity < 0)) {
        errors.push(`Row ${rowNum}: "stock_quantity" must be a valid non-negative integer`);
      }
      if (row.gst !== undefined) {
        const g = Number(row.gst);
        if (isNaN(g) || g < 0 || g > 300)
          errors.push(`Row ${rowNum}: "gst" must be between 0 and 300`);
      }
      if (row.discount !== undefined) {
        const d = Number(row.discount);
        if (isNaN(d) || d < 0 || d > 100)
          errors.push(`Row ${rowNum}: "discount" must be between 0 and 100`);
      }
      if (row.hsn_code !== undefined && String(row.hsn_code).trim().length < 4) {
        errors.push(`Row ${rowNum}: "hsn_code" must be at least 4 characters`);
      }
    });
    return errors;
  };

  // Parse xlsx using read-excel-file with schema
  const parseFile = async (file) => {
    setFileName(file.name);
    try {
      const { rows, errors: schemaErrors } =
  await readXlsxFile(file, {
    schema: SCHEMA,
    trim: true,
  });


      const parseErrors = schemaErrors.map(
        (e) =>
          `Row ${e.row}: "${e.column}" — ${e.error}${
            e.value !== undefined ? ` (got: ${e.value})` : ""
          }`
      );

      if (rows.length === 0 && parseErrors.length === 0) {
        setValidationErrors(["The sheet is empty. Please add product rows."]);
        setPreviewRows([]);
        setStep("preview");
        return;
      }

      const manualErrors = validateRows(rows);
      setValidationErrors([...parseErrors, ...manualErrors]);
      setPreviewRows(rows);
      setStep("preview");
    } catch (err) {
      const msg = err?.message?.toLowerCase().includes("column")
        ? `Missing required column(s) — please use the provided template. (${err.message})`
        : "Failed to parse the Excel file. Please ensure it is a valid .xlsx and use the provided template.";
      setValidationErrors([msg]);
      setPreviewRows([]);
      setStep("preview");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) parseFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      parseFile(file);
    }
  };

  const handleUpload = async () => {
    if (validationErrors.length > 0) return;
    setStep("uploading");
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/products/bulk-upload`,
        { products: previewRows },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setUploadResults(res.data);
      setStep("done");
      if (res.data.success_count > 0) onSuccess?.();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Upload failed. Please try again.";
      setUploadResults({
        error: msg,
        success_count: 0,
        failed_count: previewRows.length,
        failures: [],
      });
      setStep("done");
    }
  };

  /* ─────────────────────────── render ─────────────────────────── */
  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason !== "backdropClick") {
          handleClose();
        }
      }}
      disableEscapeKeyDown
      fullWidth
      maxWidth="none"
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: `1.5px solid ${primaryColor}`,
          boxShadow: `0 0 20px ${primaryColor}55`,
          bgcolor: theme.palette.background.paper,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: 'hidden',
          // ✅ RESPONSIVE WIDTH VIA MARGINS (95% on xs, 90% on sm, etc.)
          mx: { xs: '2.5%', sm: '5%', md: '7.5%', lg: 'auto' },
          width: {xs: '100%', sm: '85%', md: '80%'},
          m: 'auto',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: primaryColor,
          color: "#fff",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          py: 1.5,
          px: 3,
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <TableChartIcon />
          <Typography fontWeight={700} fontSize="1.1rem">
            Bulk Product Upload (Excel)
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon sx={{ color: "#fff" }} />
        </IconButton>
      </DialogTitle>

      {/* Body */}
      <DialogContent
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 3,
          py: 2,
          mt: 3,
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-thumb": { background: isDark ? "#555" : "#ccc", borderRadius: 4 },
        }}
      >
        {/* ── idle ── */}
        {step === "idle" && (
          <Box>
            {/* Step 1 */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                border: `1px dashed ${primaryColor}88`,
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Box>
                <Typography fontWeight={600} color={primaryColor}>
                  Step 1: Download the Template
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Downloads a ready-to-use <strong>.xlsx</strong> file — fill in your product
                  data and upload the same file directly
                </Typography>
              </Box>
              <Button
                startIcon={<DownloadIcon />}
                variant="outlined"
                onClick={handleDownloadTemplate}
                sx={{
                  textTransform: "none",
                  borderRadius: 3,
                  borderColor: primaryColor,
                  color: primaryColor,
                  whiteSpace: "nowrap",
                  "&:hover": { boxShadow: `0 0 8px ${primaryColor}` },
                }}
              >
                Download Template (.xlsx)
              </Button>
            </Box>

            {/* Step 2 – drop zone */}
            <Box
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: `2px dashed ${dragOver ? primaryColor : primaryColor + "66"}`,
                borderRadius: 3,
                p: 6,
                textAlign: "center",
                cursor: "pointer",
                bgcolor: dragOver
                  ? `${primaryColor}11`
                  : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: `${primaryColor}11`,
                  borderColor: primaryColor,
                  boxShadow: `0 0 12px ${primaryColor}44`,
                },
              }}
            >
              <UploadFileIcon sx={{ fontSize: 52, color: primaryColor, mb: 1 }} />
              <Typography fontWeight={600} fontSize="1.05rem" color={primaryColor}>
                Step 2: Upload Your Filled Excel (.xlsx)
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Drag &amp; drop your .xlsx file here, or click to browse
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={handleFileSelect}
              />
            </Box>

            {/* Column guide */}
            <Box mt={2} p={2} borderRadius={2} border={`1px solid ${primaryColor}33`}>
              <Typography fontWeight={600} mb={1} color={primaryColor}>
                Required Columns
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {REQUIRED_COLUMNS.map((col) => (
                  <Chip key={col} label={col} size="small" color="primary" variant="outlined" />
                ))}
                {OPTIONAL_COLUMNS.map((col) => (
                  <Chip key={col} label={`${col} (optional)`} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          </Box>
        )}

        {/* ── preview ── */}
        {step === "preview" && (
          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} sx={{gap: 2, display: 'flex', flexDirection: {xs: 'column', sm: 'row'}}}>
              <Typography fontWeight={700} color={primaryColor}>
                Preview: {fileName}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={resetState}
                sx={{ textTransform: "none", borderRadius: 2, borderColor: primaryColor, color: primaryColor }}
              >
                Change File
              </Button>
            </Box>

            {validationErrors.length > 0 && (
              <Box
                sx={{
                  mb: 2, p: 2, borderRadius: 2,
                  bgcolor: "rgba(239,83,80,0.08)",
                  border: "1px solid #ef5350",
                  maxHeight: 160, overflowY: "auto",
                }}
              >
                <Typography fontWeight={600} color="error" mb={0.5}>
                  <ErrorIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: "middle" }} />
                  {validationErrors.length} validation error(s) — fix before uploading
                </Typography>
                {validationErrors.map((err, i) => (
                  <Typography key={i} variant="body2" color="error">• {err}</Typography>
                ))}
              </Box>
            )}

            {validationErrors.length === 0 && previewRows.length > 0 && (
              <Box
                sx={{
                  mb: 2, p: 1.5, borderRadius: 2,
                  bgcolor: "rgba(41,139,36,0.08)",
                  border: "1px solid #298b24",
                  display: "flex", alignItems: "center", gap: 1,
                }}
              >
                <CheckCircleIcon sx={{ color: "#298b24" }} />
                <Typography color="#298b24" fontWeight={600}>
                  {previewRows.length} row(s) validated successfully. Ready to upload.
                </Typography>
              </Box>
            )}

            {previewRows.length > 0 && (
              <TableContainer
                component={Paper}
                sx={{
                  maxHeight: 320,
                  border: `1px solid ${primaryColor}44`,
                  borderRadius: 2,
                  "&::-webkit-scrollbar": { height: "6px", width: "6px" },
                  "&::-webkit-scrollbar-thumb": { background: isDark ? "#555" : "#ccc", borderRadius: 4 },
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold", bgcolor: theme.palette.background.default, color: primaryColor, whiteSpace: "nowrap" }}>
                        #
                      </TableCell>
                      {[...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].map((col) => (
                        <TableCell
                          key={col}
                          sx={{ fontWeight: "bold", bgcolor: theme.palette.background.default, color: primaryColor, whiteSpace: "nowrap" }}
                        >
                          {col}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewRows.slice(0, 50).map((row, i) => (
                      <TableRow key={i} hover>
                        <TableCell>{i + 1}</TableCell>
                        {[...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].map((col) => (
                          <TableCell key={col} sx={{ whiteSpace: "nowrap", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {String(row[col] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {previewRows.length > 50 && (
                      <TableRow>
                        <TableCell colSpan={REQUIRED_COLUMNS.length + OPTIONAL_COLUMNS.length + 1} align="center">
                          <Typography variant="body2" color="text.secondary">
                            ... and {previewRows.length - 50} more rows
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* ── uploading ── */}
        {step === "uploading" && (
          <Box textAlign="center" py={6}>
            <Typography fontWeight={600} color={primaryColor} mb={3} fontSize="1.1rem">
              Uploading {previewRows.length} products...
            </Typography>
            <LinearProgress sx={{ borderRadius: 2, height: 8 }} />
            <Typography variant="body2" color="text.secondary" mt={2}>
              Please do not close this window
            </Typography>
          </Box>
        )}

        {/* ── done ── */}
        {step === "done" && uploadResults && (
          <Box>
            {uploadResults.error ? (
              <Box sx={{ p: 3, borderRadius: 2, bgcolor: "rgba(239,83,80,0.08)", border: "1px solid #ef5350", textAlign: "center" }}>
                <ErrorIcon sx={{ fontSize: 48, color: "#ef5350", mb: 1 }} />
                <Typography fontWeight={700} color="error" fontSize="1.1rem">Upload Failed</Typography>
                <Typography color="error" mt={1}>{uploadResults.error}</Typography>
              </Box>
            ) : (
              <Box>
                <Box
                  sx={{
                    p: 2, borderRadius: 2, mb: 2,
                    bgcolor: uploadResults.success_count > 0 ? "rgba(41,139,36,0.08)" : "rgba(239,83,80,0.08)",
                    border: `1px solid ${uploadResults.success_count > 0 ? "#298b24" : "#ef5350"}`,
                  }}
                >
                  <Typography fontWeight={700} color={uploadResults.success_count > 0 ? "#298b24" : "error"} fontSize="1.05rem">
                    Upload Complete
                  </Typography>
                  <Box display="flex" gap={3} mt={1} flexWrap="wrap">
                    <Typography>
                      <span style={{ fontWeight: 700, color: "#298b24" }}>✓ {uploadResults.success_count}</span>{" "}
                      product(s) added successfully
                    </Typography>
                    {uploadResults.failed_count > 0 && (
                      <Typography>
                        <span style={{ fontWeight: 700, color: "#ef5350" }}>✗ {uploadResults.failed_count}</span>{" "}
                        row(s) failed
                      </Typography>
                    )}
                  </Box>
                </Box>

                {uploadResults.failures?.length > 0 && (
                  <Box sx={{ maxHeight: 260, overflowY: "auto", border: "1px solid #ef5350", borderRadius: 2, p: 1.5, bgcolor: "rgba(239,83,80,0.05)" }}>
                    <Typography fontWeight={600} color="error" mb={1}>Failed Rows</Typography>
                    {uploadResults.failures.map((f, i) => (
                      <Box key={i} mb={0.5}>
                        <Typography variant="body2">
                          <strong>Row {f.row}:</strong> {f.product_name || "(unnamed)"} —{" "}
                          <span style={{ color: "#ef5350" }}>{f.reason}</span>
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions
        sx={{
          px: 3, py: 2,
          borderTop: `1px solid ${isDark ? "#333" : "#e0e0e0"}`,
          bgcolor: isDark ? "#121212" : "#f5f5f5",
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
          gap: 1,
          display: 'flex', 
          flexDirection: {xs: 'column', sm: 'row'},
        }}
      >
        {step === "done" && (
          <Button
            variant="outlined"
            onClick={resetState}
            sx={{ textTransform: "none", borderRadius: 3, borderColor: primaryColor, color: primaryColor }}
          >
            Upload Another File
          </Button>
        )}
        <Box flex={1} />
        <Button onClick={handleClose} sx={{ textTransform: "none", borderRadius: 3, color: "text.secondary" }}>
          {step === "done" ? "Close" : "Cancel"}
        </Button>
        {step === "preview" && validationErrors.length === 0 && previewRows.length > 0 && (
          <Button
            variant="contained"
            onClick={handleUpload}
            startIcon={<UploadFileIcon />}
            sx={{
              textTransform: "none",
              borderRadius: 3,
              bgcolor: primaryColor,
              color: "#fff",
              fontWeight: 700,
              px: 3,
              "&:hover": { boxShadow: `0 0 10px ${primaryColor}` },
            }}
          >
            Upload {previewRows.length} Product(s)
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BulkUploadModal;