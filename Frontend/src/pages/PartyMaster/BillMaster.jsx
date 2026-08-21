import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  CircularProgress,
  Button,
  TextField,
  Box,
  Collapse,
  IconButton,
  useTheme,
  useMediaQuery,
  Tooltip,
  TableSortLabel,
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import SearchIcon from "@mui/icons-material/Search";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import localizedFormat from "dayjs/plugin/localizedFormat";
import advancedFormat from "dayjs/plugin/advancedFormat";
import { generateInvoiceListPDF } from "../../components/PDFGeneration/DownloadInvoiceList.jsx";
import CloseIcon from "@mui/icons-material/Close";
import API_BASE_URL from "../../Context/Api.jsx";
import DrawIcon from "@mui/icons-material/Draw";
import AdvancePaymentEditModal from "./AdvanceEditModal.jsx";
import duration from "dayjs/plugin/duration";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { calculateDayDifference } from "../../utils/dateCalculation.jsx";
import { generateBillPDF } from "../../components/PDFGeneration/DownloadBill.jsx";
import { generateInvoicePDF } from "../../components/PDFGeneration/DownloadInvoice.jsx";
import { Select, MenuItem, FormControl, InputLabel } from "@mui/material"; // Add these imports
import BillPreviewModal from "./BillPreviewModal.jsx";


dayjs.extend(localizedFormat);
dayjs.extend(advancedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);
dayjs.extend(isSameOrBefore);

function BillMaster() {
  const [invoices, setInvoices] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");
  const [searchTerm, setSearchTerm] = useState("");
  const [discountFilter, setDiscountFilter] = useState("all");
  const [transportFilter, setTransportFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [advanceInvoice, setAdvanceInvoice] = useState(null);
  const [advanceBill, setAdvanceBill] = useState(null); // Add this to store advance bill when subscriptionType is `bill`
  const theme = useTheme();
  const { palette } = theme;
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const primaryColor = palette.primary.main;
  const isDark = palette.mode === "dark";
//   const subscriptionType = localStorage.getItem("subscriptionType");
  const subscriptionType = "bill";

const [selectedInvoice, setSelectedInvoice] = useState(null);
const [selectedBill, setSelectedBill] = useState(null);

const [billingAddresses, setBillingAddresses] = useState([]);
const [selectedAddressFilter, setSelectedAddressFilter] = useState("all");
const companyId = JSON.parse(localStorage.getItem("user"))?.tenant_id; // or from context

// Fetch addresses scoped to companyId (fetch once)
useEffect(() => {
  const fetchAddresses = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/address/${companyId}`);
      setBillingAddresses(response.data || []);
    } catch (err) {
      setBillingAddresses([]); // fallback
    }
  };
  fetchAddresses();
}, []);



  /**
   * Renders due date as a text description for invoices or bills.
   * Uses the same consistent logic to calculate day differences.
   *
   * @param {object} inv - Invoice or Bill object with payment_status and due_date.
   * @returns {object} { text: string, isOverdue: boolean }
   */
  const renderDueDate = (inv) => {
    if (inv.payment_status !== "Advance" || !inv.due_date) {
      return { text: "-", isOverdue: false };
    }
    const { diffInDays, formattedDate, isOverdue } = calculateDayDifference(inv.due_date);
    let remaining = "";
    if (diffInDays > 0) {
      remaining = ` (${diffInDays} day(s) left)`;
    } else if (diffInDays === 0) {
      remaining = " (Today)";
    } else {
      remaining = ` (${Math.abs(diffInDays)} day(s) overdue)`;
    }
    return {
      text: formattedDate + remaining,
      isOverdue,
    };
  };

  // Use this helper to get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem("authToken");
  };

  // Fetch invoices scoped to logged-in user's tenant
  const fetchInvoices = async () => {
    setLoading(true);
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      setSnackbarSeverity("error");
      setSnackbarMessage("Please login to view invoices.");
      setSnackbarOpen(true);
      return;
    }
    try {
      const response = await axios.get(`${API_BASE_URL}/api/invoices/get-invoice`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = Array.isArray(response.data) ? response.data : response.data.data;
      setInvoices(data || []);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setInvoices([]);
      setSnackbarSeverity("error");
      setSnackbarMessage("Failed to fetch invoices.");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch bills scoped to logged-in user's tenant
  const fetchBills = async () => {
    setLoading(true);
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      setSnackbarSeverity("error");
      setSnackbarMessage("Please login to view bills.");
      setSnackbarOpen(true);
      return;
    }
    try {
      const response = await axios.get(`${API_BASE_URL}/api/bills/get-bill`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = Array.isArray(response.data) ? response.data : response.data.data;
      setBills(data || []);
    } catch (err) {
      console.error("Error fetching bills:", err);
      setBills([]);
      setSnackbarSeverity("error");
      setSnackbarMessage("Failed to fetch bills.");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subscriptionType === "bill") {
      fetchBills();
    } else {
      fetchInvoices();
    }
  }, [subscriptionType]);

  // Safe number formatting helper
  const safeFormat = (value, prefix = "") => {
    const num = Number(value);
    return isNaN(num) ? `${prefix}0.00` : `${prefix}${num.toFixed(2)}`;
  };

  // Handle preview modal open
  // Handle preview modal open
const handlePreviewOpen = (item, type) => {
  const token = getAuthToken();
  if (!token) {
    setSnackbarMessage("Please login first to preview.");
    setSnackbarSeverity("error");
    setSnackbarOpen(true);
    return;
  }

  if (type === "bill") {
    setSelectedBill(item);
    setSelectedInvoice(null);
  } else {
    setSelectedInvoice(item);
    setSelectedBill(null);
  }

  setPreviewOpen(true);
};

// Unified filteredItems that works for invoices or bills
  const filteredItems = useMemo(() => {
    const items = subscriptionType === "bill" ? bills : invoices;
    return items.filter((item) => {
      const today = dayjs();
      const term = searchTerm.trim().toLowerCase();

      if (term) {
        const dueObj = renderDueDate(item);
        const matchesSearch =
          (String(item[subscriptionType === "bill" ? "bill_id" : "invoice_id"])?.toLowerCase().includes(term) ?? false) ||
          (item.customer_name?.toLowerCase().includes(term) ?? false) ||
          ((subscriptionType === "bill"
            ? item.bill_number
            : item.invoice_number)?.toLowerCase().includes(term) ?? false) ||
          (item.customer_mobile?.toLowerCase().includes(term) ?? false) ||
          ((String(item.invoice_date ?? item.bill_date))?.toLowerCase().includes(term) ?? false) ||
          (item.gst_number?.toLowerCase().includes(term) ?? false) ||
          ((String(item.total_amount))?.toLowerCase().includes(term) ?? false) ||
          ((String(item.discount_value))?.toLowerCase().includes(term) ?? false) ||
          ((String(item.transport_charge))?.toLowerCase().includes(term) ?? false) ||
          (item.payment_status?.toLowerCase().includes(term) ?? false) ||
          ((String(item.due_date))?.toLowerCase().includes(term) ?? false) ||
          (dueObj.text?.toLowerCase().includes(term) ?? false);
        if (!matchesSearch) return false;
      }

      if (discountFilter === "yes" && (!item.discount_value || Number(item.discount_value) === 0)) return false;
      if (discountFilter === "no" && item.discount_value && Number(item.discount_value) !== 0) return false;
      if (transportFilter === "yes" && (!item.transport_charge || Number(item.transport_charge) === 0)) return false;
      if (transportFilter === "no" && item.transport_charge && Number(item.transport_charge) !== 0) return false;

      const dateField = item.invoice_date ?? item.bill_date;

      if (startDate) {
        const itemDate = new Date(dateField);
        const start = new Date(startDate);
        if (itemDate < start) return false;
      }

      if (endDate) {
        const itemDate = new Date(dateField);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }

      if (paymentStatusFilter !== "all" && item.payment_status !== paymentStatusFilter) return false;

      if (dueDateFilter !== "all") {
        const due = item.due_date ? dayjs(item.due_date) : null;
        if (item.payment_status !== "Advance" || !due) {
          if (dueDateFilter === "nodue") {
            return !item.due_date || item.payment_status !== "Advance";
          }
          return false;
        }
        const diff = due.diff(today, "day");
        if (dueDateFilter === "overdue" && diff >= 0) return false;
        if (dueDateFilter === "today" && diff !== 0) return false;
        if (dueDateFilter === "upcoming" && diff <= 0) return false;
      }

       // NEW: Address filter
    if (
  selectedAddressFilter !== "all" &&
  String(item.billing_address_id) !== String(selectedAddressFilter)
) {
  return false;
}


      return true;
    });
  }, [
    subscriptionType,
    invoices,
    bills,
    searchTerm,
    discountFilter,
    transportFilter,
    startDate,
    endDate,
    paymentStatusFilter,
    dueDateFilter,
    selectedAddressFilter,
  ]);


  // Handle preview modal close
  const handlePreviewClose = () => {
    setSelectedInvoice(null);
    setPreviewOpen(false);
  };

  // Handle download PDF (uses filteredItems for current subscription type)
  const handleDownloadPDF = () => {
    const token = getAuthToken();
    if (!token) {
      setSnackbarMessage("Please login first to download list.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    generateInvoiceListPDF(filteredItems, token);
  };

  // Handle edit button click to open advance payment modal
  const handleEditClick = (item) => {
    if (subscriptionType === "bill") {
      setAdvanceBill(item);
    } else {
      setAdvanceInvoice(item);
    }
    setEditModalOpen(true);
  };

  

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  // Sorting state and handler
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key ? { key, direction: prev.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }
    );
  };

  // Sorted filtered items
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Date fields convert to timestamps for correct comparison
        if (sortConfig.key === "created_at" || sortConfig.key === "invoice_date" || sortConfig.key === "bill_date") {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [filteredItems, sortConfig]);

  // Paginated items for current page
  const paginatedItems = sortedItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Handler for saving advance payment edits (works for invoices and bills)
  const handleSaveEdit = async (updatedData) => {
    const isBill = subscriptionType === "bill";
    const item = isBill ? advanceBill : advanceInvoice;
    const itemType = isBill ? "bill" : "invoice";

    if (!item || !(isBill ? item.bill_id : item.invoice_id)) {
      setSnackbarSeverity("error");
      setSnackbarMessage(`No ${itemType} selected to update.`);
      setSnackbarOpen(true);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setSnackbarSeverity("error");
      setSnackbarMessage(`Please login first to update ${itemType}.`);
      setSnackbarOpen(true);
      return;
    }

    try {
      const payload = {
        advance_amount: parseFloat(updatedData.advance_amount || 0),
        due_date: updatedData.due_date || null,
        payment_status: updatedData.payment_status,
        payment_completion_status:
          updatedData.payment_status === "Full Payment" ? "Completed" : "Pending",
        payment_settlement_date:
          updatedData.payment_status === "Full Payment"
            ? updatedData.settled_date || new Date().toISOString().split("T")[0]
            : null,
      };

      const updateUrl = isBill
        ? `${API_BASE_URL}/api/bills/update-bill/${item.bill_id}`
        : `${API_BASE_URL}/api/invoices/update/${item.invoice_id}`;

      await axios.put(updateUrl, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSnackbarSeverity("success");
      setSnackbarMessage(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} updated successfully.`);
      setSnackbarOpen(true);
      setEditModalOpen(false);

      // Clear the related advance item state and refetch
      if (isBill) {
        setAdvanceBill(null);
        fetchBills();
      } else {
        setAdvanceInvoice(null);
        fetchInvoices();
      }
    } catch (error) {
      console.error(`Failed to update ${itemType}:`, error);
      setSnackbarSeverity("error");
      setSnackbarMessage(`Failed to update ${itemType}. Please try again.`);
      setSnackbarOpen(true);
    }
  };



  // === Common dynamic styling ===
  const cardBg = isDark ? "#263238" : "#fff";
  const hoverBg = isDark ? "#343535ff" : "#E6EDE6";
  const selectedBg = isDark ? "#25353cff" : "#b3edb3ff";
  const labelColor = isDark ? "#00bcd4" : "#1b5e20";
  const borderCol = isDark ? "#455a64" : "#ddd";

  // === Responsive grid ===
  const gridStyle = (cols) => ({
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : `repeat(${cols}, 1fr)`,
    gap: isMobile ? 0.5 : 2,
    fontSize: 13,
    width: "100%",
  });

  // === Page-break-safe box ===
  const pageBreakSafeBox = {
    pageBreakInside: "avoid",
    breakInside: "avoid",
    WebkitColumnBreakInside: "avoid",
  };


  return (
    <Box
      sx={{
        backgroundColor: isDark ? "#121212" : "#f5f5f5",
        color: palette.text.primary,
        minHeight: "100vh",
        paddingY: isMobile ? "1rem" : "2rem",
        paddingX: isMobile ? "0.5rem" : "1rem",
        width: "100%",
        maxWidth: "100vw",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          fontSize: { xs: "20px", sm: "26px" },
          color: primaryColor,
          fontWeight: "bold",
          pt: { xs: 3, sm: 1 },
          pb: { xs: 2, sm: 3 },
        }}
      >
        Party Master - {subscriptionType === "bill" ? "Bill" : "Invoice"} Details
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            backgroundColor: palette.background.paper,
            borderRadius: 8,
            boxShadow: `0 0 10px ${primaryColor}66`,
            border: `2px solid ${primaryColor}`,
            px: 2,
            py: { xs: 0.5, sm: 1 },
            width: isMobile ? "100%" : "70%",
            maxWidth: 700,
            "&:hover": {
              boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
              filter: "brightness(1.1)",
              transform: "scale(1.02)",
              transition: "all 0.3s ease",
            },
          }}
        >
          <SearchIcon sx={{ ml: 1, color: primaryColor }} />
          <TextField
            placeholder="Search by Name, ID, Number, etc..."
            variant="standard"
            fullWidth
            InputProps={{
              disableUnderline: true,
              sx: { fontSize: { xs: "0.9rem", sm: "0.95rem" }, pl: 1 },
            }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <CloseIcon
            onClick={() => setSearchTerm("")}
            sx={{ ml: 1, color: "gray", fontSize: "20px", cursor: "pointer" }}
          />
        </Box>
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          width: "100%",
          mt: 2,
          pr: 3,
          mb: 2,
          gap: "6px",
        }}
      >
        <Button
          onClick={handleDownloadPDF}
          variant="contained"
          sx={{
            gap: "8px",
            textTransform: "none",
            color: primaryColor,
            border: `1px solid ${primaryColor}`,
            borderRadius: "10px",
            backgroundColor: "transparent",
            transition: "all 0.3s ease-in-out",
            fontWeight: "bold",
            "&:hover": {
              borderColor: primaryColor,
              boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
            },
          }}
        >
          <CloudDownloadIcon sx={{ fontSize: "20px", fontWeight: "bold" }} />
          Download PDF
        </Button>
        <Tooltip title="Toggle Filter" arrow>
          <IconButton
            onClick={() => setShowFilters(!showFilters)}
            sx={{
              ml: 1,
              border: `1px solid ${primaryColor}`,
              "&:hover": {
                borderColor: primaryColor,
                boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
              },
            }}
          >
            <FilterListRoundedIcon sx={{ color: primaryColor, fontWeight: "bold" }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Collapse in={showFilters} timeout="auto" unmountOnExit>
        <Paper
          elevation={4}
          sx={{
            mx: "auto",
            px: 3,
            py: 2,
            mb: 2,
            borderRadius: 4,
            background: isDark
              ? "linear-gradient(145deg, #1e1e1e, #2a2a2a)"
              : "linear-gradient(145deg, #ffffff, #f0f0f0)",
            boxShadow: isDark ? "0 4px 15px rgba(0,0,0,0.6)" : "0 4px 15px rgba(0,0,0,0.1)",
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold", color: primaryColor }}>
            Advanced Filters
          </Typography>

          <Box
      sx={{
        width: "100%",
        mb: 2,
        px: { xs: 0, sm: 1 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        ...pageBreakSafeBox,
      }}
    >
      <Typography
        fontWeight={600}
        mb={1}
        sx={{ alignSelf: "flex-start", pl: 1 }}
      >
        Billing Address
      </Typography>

      <FormControl fullWidth size="small" sx={pageBreakSafeBox}>
        <InputLabel>Billing Address</InputLabel>
        <Select
          label="Billing Address"
          value={selectedAddressFilter}
          onChange={(e) => setSelectedAddressFilter(e.target.value)}
          fullWidth
          displayEmpty
          sx={{
            borderRadius: "10px",
            fontSize: 14,
            fontWeight: 500,
            backgroundColor: 'transparent',
            "& .MuiSelect-select": {
              display: "flex",
              flexDirection: "column",
              gap: 1,
              py: 1.5,
              px: 2,
              whiteSpace: "normal",
              wordBreak: "break-word",
            },
            boxShadow: isDark
              ? "0px 2px 6px rgba(0,0,0,0.6)"
              : "0px 2px 6px rgba(0,0,0,0.1)",
            ...pageBreakSafeBox,
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                borderRadius: "10px",
                overflowY: "auto",
                boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
                maxHeight: "350px",
                backgroundColor: cardBg,
                "&::-webkit-scrollbar": {
                  width: "8px",
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: isDark ? "#00bcd4" : "#136919",
                  borderRadius: "8px",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                  backgroundColor: isDark ? "#20cde4ff" : "#1a6920ff",
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor: isDark ? "#263238" : "#f1f1f1",
                  borderRadius: "8px",
                },
                ...pageBreakSafeBox,
              },
            },
            anchorOrigin: { vertical: "bottom", horizontal: "left" },
            transformOrigin: { vertical: "top", horizontal: "left" },
          }}
          renderValue={(selected) => {
            const addr = billingAddresses.find(
              (a) => a.billing_address_id === selected
            );
            if (!addr)
              return (
                <Typography sx={{ color: theme.palette.text.secondary }}>
                  Select Billing Address
                </Typography>
              );

            return (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  width: "100%",
                  ...pageBreakSafeBox,
                }}
              >
                {/* Row 1 */}
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    color: labelColor,
                    textTransform: "uppercase",
                  }}
                >
                  📍 {addr.address_name} — {addr.address}
                </Typography>

                {/* Row 2 */}
                <Box sx={gridStyle(3)}>
                  <Typography><b>GST:</b> {addr.gst_no || "N/A"}</Typography>
                  <Typography><b>PAN:</b> {addr.pan_no || "N/A"}</Typography>
                  <Typography><b>Bank:</b> {addr.bank_name || "N/A"}</Typography>
                </Box>

                {/* Row 3 */}
                <Box sx={gridStyle(3)}>
                  <Typography><b>Email:</b> {addr.email || "N/A"}</Typography>
                  <Typography><b>Cell:</b> {addr.cell_no1 || "N/A"}</Typography>
                  <Typography><b>IFSC:</b> {addr.ifsc_code || "N/A"}</Typography>
                </Box>

                {/* Row 4 */}
                <Box sx={gridStyle(3)}>
                  <Typography><b>Account:</b> {addr.account_number || "N/A"}</Typography>
                  <Typography><b>Branch:</b> {addr.branch_name || "N/A"}</Typography>
                </Box>
              </Box>
            );
          }}
        >
          {billingAddresses.map((addr) => (
            <MenuItem
              key={addr.billing_address_id}
              value={addr.billing_address_id}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 0.8,
                p: 1.5,
                borderBottom: `1px solid ${borderCol}`,
                borderRadius: "8px",
                backgroundColor:
                  selectedAddressFilter === addr.billing_address_id
                    ? selectedBg
                    : "transparent",
                "&:hover": {
                  backgroundColor: hoverBg,
                },
                transition: "background-color 0.2s ease",
                ...pageBreakSafeBox,
              }}
            >
              {/* Row 1 */}
              <Typography
                sx={{
                  fontWeight: 700,
                  color: labelColor,
                  textTransform: "uppercase",
                  fontSize: 14,
                }}
              >
                {addr.address_name} — {addr.address}
              </Typography>

              {/* Row 2 */}
              <Box sx={gridStyle(4)}>
                <Typography><b>GST:</b> {addr.gst_no || "N/A"}</Typography>
                <Typography><b>PAN:</b> {addr.pan_no || "N/A"}</Typography>
                <Typography><b>Bank:</b> {addr.bank_name || "N/A"}</Typography>
                <Typography><b>Email:</b> {addr.email || "N/A"}</Typography>
              </Box>

              {/* Row 3 */}
              <Box sx={gridStyle(4)}>
                <Typography><b>Cell:</b> {addr.cell_no1 || "N/A"}</Typography>
                <Typography><b>IFSC:</b> {addr.ifsc_code || "N/A"}</Typography>
                <Typography><b>Account:</b> {addr.account_number || "N/A"}</Typography>
                <Typography><b>Branch:</b> {addr.branch_name || "N/A"}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>




          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 4, mt: 2 }}>
            <Box>
              <Typography fontWeight={600} mb={1}>
                Discount Status
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {["all", "yes", "no"].map((val) => (
                  <Button
                    key={val}
                    variant={discountFilter === val ? "contained" : "outlined"}
                    color={discountFilter === val ? "primary" : "inherit"}
                    size="small"
                    sx={{
                      borderRadius: 5,
                      px: 3,
                      fontWeight: 500,
                      textTransform: "capitalize",
                    }}
                    onClick={() => setDiscountFilter(val)}
                  >
                    {val === "all" ? "All" : val === "yes" ? "Given" : "Not Given"}
                  </Button>
                ))}
              </Box>
            </Box>
            <Box>
              <Typography fontWeight={600} mb={1}>
                Transport Charge
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {["all", "yes", "no"].map((val) => (
                  <Button
                    key={val}
                    variant={transportFilter === val ? "contained" : "outlined"}
                    color={transportFilter === val ? "primary" : "inherit"}
                    size="small"
                    sx={{
                      borderRadius: 5,
                      px: 3,
                      fontWeight: 500,
                      textTransform: "capitalize",
                    }}
                    onClick={() => setTransportFilter(val)}
                  >
                    {val === "all" ? "All" : val === "yes" ? "Applied" : "Not Applied"}
                  </Button>
                ))}
              </Box>
            </Box>
            <Box>
              <Typography fontWeight={600} mb={1}>
                Payment Status
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {["all", "Advance", "Full Payment"].map((val) => (
                  <Button
                    key={val}
                    variant={paymentStatusFilter === val ? "contained" : "outlined"}
                    color={paymentStatusFilter === val ? "primary" : "inherit"}
                    size="small"
                    sx={{
                      borderRadius: 5,
                      px: 3,
                      fontWeight: 500,
                      textTransform: "capitalize",
                    }}
                    onClick={() => setPaymentStatusFilter(val)}
                  >
                    {val === "all" ? "All" : val}
                  </Button>
                ))}
              </Box>
            </Box>
            <Box>
              <Typography fontWeight={600} mb={1}>
                Due Date
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {[
                  { label: "All", value: "all" },
                  { label: "Overdue", value: "overdue" },
                  { label: "Today", value: "today" },
                  { label: "Upcoming", value: "upcoming" },
                  { label: "No Due", value: "nodue" },
                ].map(({ label, value }) => (
                  <Button
                    key={value}
                    variant={dueDateFilter === value ? "contained" : "outlined"}
                    color={dueDateFilter === value ? "primary" : "inherit"}
                    size="small"
                    sx={{
                      borderRadius: 5,
                      px: 3,
                      fontWeight: 500,
                      textTransform: "capitalize",
                    }}
                    onClick={() => setDueDateFilter(value)}
                  >
                    {label}
                  </Button>
                ))}
              </Box>
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography fontWeight={600} mb={1}>
                Date Range
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <TextField
                  type="date"
                  size="small"
                  label="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  type="date"
                  size="small"
                  label="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  sx={{
                    borderRadius: 5,
                    px: 3,
                    fontWeight: "bold",
                    textTransform: "capitalize",
                    color: primaryColor,
                    border: `1px solid ${primaryColor}`,
                    mt: 0.5,
                  }}
                >
                  Clear
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Collapse>
      {loading ? (
        <Box textAlign="center" mt={4}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <Box
          sx={{
            width: "100%",
            border: `2px solid ${primaryColor}`,
            borderRadius: 2,
            boxShadow: `0 0 8px ${primaryColor}66`,
            overflowX: "hidden",
          }}
        >
          <TableContainer
            sx={{
              maxHeight: "calc(100vh - 100px)",
              overflowX: "auto",
              overflowY: "auto",
              scrollbarWidth: "thin",
              scrollbarColor: `${primaryColor} transparent`,
              "&::-webkit-scrollbar": {
                height: "4px",
                width: "6px",
              },
              "&::-webkit-scrollbar-track": {
                background: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: primaryColor,
                borderRadius: "4px",
              },
            }}
          >
            <Table
              stickyHeader
              size="small"
              sx={{
                minWidth: 1800,
                width: "100%",
                tableLayout: "auto",
                borderCollapse: "separate",
              }}
            >
              <TableHead>
                <TableRow sx={{ backgroundColor: isDark ? "#121212" : "#f4f4f4", height: "60px" }}>
                  <TableCell sx={{ color: primaryColor, fontWeight: "bold" }}>ID</TableCell>
                  <TableCell sx={{ color: primaryColor, fontWeight: "bold" }}>
                    {subscriptionType === "bill" ? "Bill No" : "Invoice No"}
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: primaryColor }}>Actions</TableCell>
                  {subscriptionType != 'bill' && (
                    <TableCell sx={{ color: primaryColor, fontWeight: "bold" }}>Customer GST No</TableCell>
                  )}
                  <TableCell sx={{ color: primaryColor, fontWeight: "bold" }}>Customer Name</TableCell>
                  {subscriptionType != 'bill' && (
                    <TableCell sx={{ color: primaryColor, fontWeight: "bold" }}>Billed From</TableCell>
                  )}
                  <TableCell align="right" sx={{ fontWeight: "bold", color: primaryColor }}>
                    <TableSortLabel
                      active={sortConfig.key === "discount_value"}
                      direction={sortConfig.direction}
                      onClick={() => handleSort("discount_value")}
                    >
                      Discount
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold", color: primaryColor }}>
                    <TableSortLabel
                      active={sortConfig.key === "transport_charge"}
                      direction={sortConfig.direction}
                      onClick={() => handleSort("transport_charge")}
                    >
                      Transport
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: primaryColor }}>
                    <TableSortLabel
                      active={sortConfig.key === "created_at"}
                      direction={sortConfig.direction}
                      onClick={() => handleSort("created_at")}
                    >
                      Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold", color: primaryColor }}>
                    <TableSortLabel
                      active={sortConfig.key === "total_amount"}
                      direction={sortConfig.direction}
                      onClick={() => handleSort("total_amount")}
                    >
                      Total Amount
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: primaryColor }}>Payment Status</TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: primaryColor }}>Due Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ color: palette.text.secondary }}>
                      {subscriptionType === "bill" ? "No bills found." : "No invoices found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => (
                    <TableRow
                      key={subscriptionType === "bill" ? item.bill_id : item.invoice_id}
                      hover
                      sx={{
                        backgroundColor: isDark ? "black" : "white",
                        transition: "all 0.2s",
                        "&:hover": {
                          backgroundColor: isDark ? "#2a2a2a" : "#f9f9f9",
                        },
                      }}
                    >
                      <TableCell align="center" sx={{ fontWeight: "bold" }}>
                        {subscriptionType === "bill" ? item.bill_id : item.invoice_id}
                      </TableCell>
                      <TableCell>{subscriptionType === "bill" ? item.bill_number : item.invoice_number || "N/A"}</TableCell>
                      <TableCell>
                        <Tooltip title="Preview">
                          <IconButton
                            onClick={() => handlePreviewOpen(item)}
                            sx={{
                              borderRadius: "50%",
                              border: `1px solid ${primaryColor}`,
                              color: primaryColor,
                              "&:hover": {
                                boxShadow: `0 0 8px ${primaryColor}`,
                              },
                            }}
                          >
                            <TrackChangesIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {item.payment_status === "Advance" && (
                          <Tooltip title="Edit Advance">
                            <IconButton
                              onClick={() => handleEditClick(item)}
                              sx={{
                                ml: 1,
                                borderRadius: "50%",
                                border: `1px solid ${primaryColor}`,
                                color: primaryColor,
                                "&:hover": {
                                  boxShadow: `0 0 8px ${primaryColor}`,
                                },
                              }}
                            >
                              <DrawIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                      {subscriptionType != 'bill' && (
                        <TableCell>{item.customer_gst_number || "N/A"}</TableCell>
                      )}
                      <TableCell>{item.customer_name || "Anonymous"}</TableCell>
                      {subscriptionType != 'bill' && (
                        <TableCell sx={{fontWeight: 'bold'}}>{item.billing_address_name || "Anonymous"}</TableCell>
                      )}
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>
                        ₹ {safeFormat(item.discount_value)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>
                        ₹ {safeFormat(item.transport_charge)}
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        {item.created_at
                          ? dayjs(item.created_at).tz("Asia/Kolkata").format("DD-MM-YYYY - hh:mm A")
                          : "N/A"}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold", color: primaryColor }}>
                        ₹ {safeFormat(item.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.payment_status}
                          sx={{
                            color: item.payment_status === "Advance" ? "#fb8c00" : "#43a047",
                            backgroundColor: "transparent",
                            fontWeight: "bold",
                            fontSize: "0.75rem",
                            px: 1.5,
                            border: item.payment_status === "Advance" ? "1px solid #fb8c00" : "1px solid #43a047",
                          }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {item.payment_status === "Advance" && item.due_date ? (
                          (() => {
                            const dueInfo = renderDueDate(item);
                            return (
                              <Box
                                component="span"
                                sx={{
                                  color: dueInfo.isOverdue ? "red" : palette.text.primary,
                                  fontSize: "0.85rem",
                                  fontWeight: "bold",
                                }}
                              >
                                {dueInfo.text}
                              </Box>
                            );
                          })()
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={sortedItems.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              px: 2,
              backgroundColor: isDark ? "#1e1e1e" : "#f9f9f9",
              color: isDark ? "#fff" : "#000",
              ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": {
                fontSize: "0.85rem",
              },
            }}
          />
        </Box>
      )}
      <AdvancePaymentEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        invoiceData={subscriptionType === "bill" ? advanceBill : advanceInvoice}
        onSave={handleSaveEdit}
      />
      <BillPreviewModal
  open={previewOpen}
  onClose={handlePreviewClose}
  invoice={selectedInvoice}
  bill={selectedBill}
/>


      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbarSeverity} onClose={() => setSnackbarOpen(false)} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default BillMaster;
