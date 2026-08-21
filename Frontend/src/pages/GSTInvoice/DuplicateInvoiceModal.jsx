import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  useTheme,
  useMediaQuery,
  CircularProgress,
  TableContainer,
  TablePagination,
  Paper,
  MenuItem,
  Chip
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import FileCopyOutlinedIcon from "@mui/icons-material/FileCopyOutlined";
import axiosInstance from "../../utils/axiosInstance";

export default function DuplicateInvoiceModal({
  open,
  onClose,
  onSelectInvoice,
  themeMode,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const currentTheme = useMemo(() => {
    const isDark = themeMode === "dark";
    return {
      paperBg: isDark ? "#121212" : "#ffffff",
      headerBg: isDark ? "#1a1a1a" : "#f5f5f5",
      borderColor: isDark ? "#333" : "#ddd",
      textColor: isDark ? "#eaeaea" : "#222",
      hoverBg: isDark ? "#1e1e1e" : "#f9f9f9",
      primaryColor: isDark ? "#00bcd4" : "#136919",
      secondaryColor: isDark ? "#d7d6d6" : "#464646",
    };
  }, [themeMode]);

  // Load invoices when modal opens
  useEffect(() => {
    if (!open) return;

    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/api/invoices/get-invoice`);
        setInvoices(res.data || []);
      } catch (err) {
        console.error("❌ Failed to fetch invoices:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [open]);

  // Unique customer names for filter dropdown
  const customerNames = useMemo(() => {
    const names = new Set();
    invoices.forEach(inv => {
      if (inv.customer_name) names.add(inv.customer_name);
    });
    return Array.from(names).sort();
  }, [invoices]);

  // Filter invoices based on search term & customer filter
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchCustomer = selectedCustomer === "all" || inv.customer_name === selectedCustomer;
      
      const search = searchTerm.toLowerCase();
      const matchSearch = 
        (inv.invoice_number || "").toLowerCase().includes(search) ||
        (inv.customer_name || "").toLowerCase().includes(search) ||
        (inv.invoice_date || "").includes(search) ||
        String(inv.total_amount || "").includes(search);

      return matchCustomer && matchSearch;
    });
  }, [invoices, searchTerm, selectedCustomer]);

  const paginatedInvoices = useMemo(() => {
    return filteredInvoices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredInvoices, page, rowsPerPage]);

  const handleSelect = async (invoiceId) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/invoices/get-invoice/${invoiceId}`);
      if (res.data) {
        onSelectInvoice(res.data);
        onClose();
      }
    } catch (err) {
      console.error("❌ Failed to fetch full invoice details:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status) => {
    let color = "default";
    let label = "Legacy";
    let variant = "outlined";
    
    if (status === "pending_approval") {
      color = "warning";
      label = "Pending";
    } else if (status === "approved") {
      color = "success";
      label = "Approved";
    } else if (status === "rejected") {
      color = "error";
      label = "Rejected";
    }
    
    return <Chip label={label} color={color} size="small" variant={variant} sx={{ fontWeight: "bold" }} />;
  };

  return (
    <Modal
      open={open}
      onClose={(event, reason) => {
        if (reason === "backdropClick") return;
        onClose();
      }}
      disablePortal
      keepMounted
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "95%",
          maxWidth: 1100,
          height: "90vh",
          bgcolor: currentTheme.paperBg,
          boxShadow: `0 0 12px ${currentTheme.primaryColor}`,
          display: "flex",
          flexDirection: "column",
          border: `1px solid ${currentTheme.primaryColor}`,
          color: currentTheme.primaryColor,
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            px: 3,
            py: 2,
            backgroundColor: currentTheme.headerBg,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1px solid ${currentTheme.borderColor}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FileCopyOutlinedIcon sx={{ fontSize: 28, color: currentTheme.primaryColor }} />
            <Typography variant="h6" fontWeight="bold" sx={{ color: currentTheme.primaryColor }}>
              Duplicate Invoice
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: currentTheme.textColor }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* SEARCH & FILTERS */}
        <Box sx={{ px: 3, pt: 2, display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              backgroundColor: currentTheme.headerBg,
              borderRadius: 3,
              border: `1px solid ${currentTheme.borderColor}`,
              px: 1.5,
              py: 0.5,
              flex: 2,
              "&:focus-within": { boxShadow: `0 0 0 1px ${currentTheme.primaryColor}` },
            }}
          >
            <SearchIcon sx={{ ml: 1, color: currentTheme.primaryColor, fontSize: 24, mr: 1.5 }} />
            <TextField
              placeholder="Search by Invoice No, Customer, Date..."
              variant="standard"
              fullWidth
              InputProps={{
                disableUnderline: true,
                sx: { fontSize: "0.95rem", color: currentTheme.textColor },
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <CloseIcon
                onClick={() => setSearchTerm("")}
                sx={{
                  ml: 1,
                  color: currentTheme.textColor,
                  fontSize: 20,
                  cursor: "pointer",
                }}
              />
            )}
          </Box>

          <TextField
            select
            label="Filter by Customer"
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            variant="outlined"
            size="small"
            sx={{
              flex: 1,
              "& .MuiInputLabel-root": { color: currentTheme.textColor },
              "& .MuiOutlinedInput-root": {
                color: currentTheme.textColor,
                "& fieldset": { borderColor: currentTheme.borderColor },
                "&:hover fieldset": { borderColor: currentTheme.primaryColor },
                "&.Mui-focused fieldset": { borderColor: currentTheme.primaryColor },
              },
            }}
          >
            <MenuItem value="all">All Customers</MenuItem>
            {customerNames.map(name => (
              <MenuItem key={name} value={name}>{name}</MenuItem>
            ))}
          </TextField>
        </Box>

        {/* TABLE CONTAINER */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            mx: 3,
            mt: 2,
            mb: 2,
            overflow: "hidden"
          }}
        >
          {loading ? (
            <Box sx={{ textAlign: "center", mt: 8 }}>
              <CircularProgress color="primary" />
            </Box>
          ) : filteredInvoices.length === 0 ? (
            <Box sx={{ textAlign: "center", mt: 8, color: currentTheme.secondaryColor }}>
              <ErrorOutlineIcon sx={{ fontSize: 50, mb: 1 }} />
              <Typography variant="h6">No invoices found</Typography>
              <Typography variant="body2">
                Try changing your search term or filters.
              </Typography>
            </Box>
          ) : (
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 1,
                border: `1px solid ${currentTheme.borderColor}`,
                backgroundColor: currentTheme.paperBg,
                boxShadow: `0 0 10px ${currentTheme.primaryColor}33`,
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  overflow: "auto",
                  "&::-webkit-scrollbar": {
                    width: "4px",
                    height: "8px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: currentTheme.primaryColor,
                    borderRadius: "8px",
                  },
                  "&::-webkit-scrollbar-track": {
                    backgroundColor: currentTheme.headerBg,
                  },
                }}
              >
                <Table size={isMobile ? "small" : "medium"} stickyHeader sx={{ minWidth: 800 }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: currentTheme.headerBg }}>
                      {["Action", "Invoice No", "Date", "Customer Name", "Total Amount", "Status"].map(
                        (head) => (
                          <TableCell
                            key={head}
                            sx={{
                              color: currentTheme.primaryColor,
                              fontWeight: "bold",
                              whiteSpace: "nowrap",
                              fontSize: { xs: "0.9rem", sm: "1rem" },
                              backgroundColor: currentTheme.headerBg
                            }}
                          >
                            {head}
                          </TableCell>
                        )
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedInvoices.map((inv) => (
                      <TableRow
                        key={inv.invoice_id}
                        hover
                        sx={{
                          cursor: "pointer",
                          "&:hover": { backgroundColor: currentTheme.hoverBg },
                        }}
                      >
                        <TableCell>
                          <Button
                            variant="contained"
                            size="small"
                            sx={{
                              backgroundColor: currentTheme.primaryColor,
                              color: "#fff",
                              textTransform: "none",
                              borderRadius: 2,
                              fontSize: "0.8rem",
                              px: 2,
                              fontWeight: 600,
                            }}
                            onClick={() => handleSelect(inv.invoice_id)}
                          >
                            Select
                          </Button>
                        </TableCell>
                        <TableCell sx={{ color: currentTheme.textColor }}>{inv.invoice_number}</TableCell>
                        <TableCell sx={{ color: currentTheme.textColor }}>{inv.invoice_date}</TableCell>
                        <TableCell sx={{ color: currentTheme.textColor }}>{inv.customer_name || "Anonymous"}</TableCell>
                        <TableCell sx={{ color: currentTheme.textColor, fontWeight: "bold" }}>
                          ₹ {parseFloat(inv.total_amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {getStatusChip(inv.invoice_status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              {/* Pagination */}
              <TablePagination
                component="div"
                count={filteredInvoices.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                sx={{
                  borderTop: `1px solid ${currentTheme.borderColor}`,
                  backgroundColor: currentTheme.headerBg,
                  color: currentTheme.textColor,
                  fontSize: "0.9rem",
                  "& .MuiTablePagination-selectIcon": {
                    color: currentTheme.textColor,
                  },
                  "& .MuiTablePagination-actions button": {
                    color: currentTheme.textColor,
                  },
                }}
              />
            </TableContainer>
          )}
        </Box>

        {/* FOOTER */}
        <Box
          sx={{
            borderTop: `1px solid ${currentTheme.borderColor}`,
            px: 3,
            py: 2,
            display: "flex",
            justifyContent: "flex-end",
            backgroundColor: currentTheme.headerBg,
          }}
        >
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              px: 3,
              py: 0.3,
              fontWeight: "bold",
              fontSize: "0.95rem",
              borderRadius: "30px",
              textTransform: "none",
              color: currentTheme.primaryColor,
              border: `2px solid ${currentTheme.primaryColor}`,
              "&:hover": { boxShadow: `0 0 8px ${currentTheme.primaryColor}` },
            }}
          >
            Close
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
