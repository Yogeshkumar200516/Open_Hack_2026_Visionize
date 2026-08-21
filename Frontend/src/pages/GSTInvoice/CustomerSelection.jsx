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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import axiosInstance from "../../utils/axiosInstance";

export default function SelectCustomersModal({
  open,
  onClose,
  onSelectCustomer,
  themeMode,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
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


  useEffect(() => {
    if (!open) return;

    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/api/invoices/customers`);
        setCustomers(res.data || []);
      } catch (err) {
        console.error("❌ Failed to fetch customers:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, [open]);

  const filtered = customers.filter((c) => {
    const search = searchTerm.toLowerCase();
    return (
      c.name?.toLowerCase().includes(search) ||
      c.mobile?.includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.gst_number?.toLowerCase().includes(search) ||
      c.state?.toLowerCase().includes(search) ||
      c.place_of_supply?.toLowerCase().includes(search)
    );
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
            <ManageAccountsOutlinedIcon sx={{ fontSize: 28, color: currentTheme.primaryColor }} />
            <Typography variant="h6" fontWeight="bold" sx={{ color: currentTheme.primaryColor }}>
              Choose Customer
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: currentTheme.textColor }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* SEARCH BAR */}
        <Box sx={{ px: 3, pt: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              backgroundColor: currentTheme.headerBg,
              borderRadius: 3,
              border: `1px solid ${currentTheme.borderColor}`,
              px: 1.5,
              py: 1,
              "&:focus-within": { boxShadow: `0 0 0 1px ${currentTheme.primaryColor}` },
            }}
          >
            <SearchIcon sx={{ ml: 1, color: currentTheme.primaryColor, fontSize: 26, mr: 2 }} />
            <TextField
              placeholder="Search by Name, GST, Email, Mobile..."
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
                  mr: 1,
                  cursor: "pointer",
                }}
              />
            )}
          </Box>
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
          }}
        >
          {loading ? (
            <Box sx={{ textAlign: "center", mt: 8 }}>
              <CircularProgress color="primary" />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: "center", mt: 8, color: currentTheme.secondaryColor }}>
              <ErrorOutlineIcon sx={{ fontSize: 50, mb: 1 }} />
              <Typography variant="h6">No customers found</Typography>
              <Typography variant="body2">
                Try changing your search or add a new customer.
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
                height: 400, // fixed height
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Table body scrollable */}
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
                <Table size={isMobile ? "small" : "medium"} stickyHeader sx={{ minWidth: 1200 }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: currentTheme.headerBg }}>
                      {["Action", "Name", "Mobile", "Email", "GST No", "State", "Place of Supply"].map(
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
                    {paginated.map((cust) => (
                      <TableRow
                        key={cust.customer_id}
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
                            onClick={() => {
                              onSelectCustomer(cust);
                              onClose();
                            }}
                          >
                            Select
                          </Button>
                        </TableCell>
                        <TableCell sx={{ color: currentTheme.textColor }}>{cust.name}</TableCell>
                        <TableCell sx={{ color: currentTheme.textColor }}>{cust.mobile}</TableCell>
                        <TableCell sx={{ color: currentTheme.textColor }}>{cust.email}</TableCell>
                        <TableCell sx={{ color: currentTheme.textColor }}>{cust.gst_number || "-"}</TableCell>
                        <TableCell sx={{ color: currentTheme.textColor }}>{cust.state || "-"}</TableCell>
                        <TableCell sx={{ color: currentTheme.textColor }}>{cust.place_of_supply || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              {/* Pagination */}
              <TablePagination
  component="div"
  count={filtered.length}
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
      color: currentTheme.textColor, // dropdown arrow color
    },
    "& .MuiTablePagination-actions button": {
      color: currentTheme.textColor, // next/previous arrows color
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
              mr: 2,
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
