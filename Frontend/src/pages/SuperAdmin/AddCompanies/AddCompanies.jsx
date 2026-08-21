import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import API_BASE_URL from "../../../Context/Api";
import AddCompanyModal from "./AddCompaniesModal";
import DrawIcon from "@mui/icons-material/Draw";
import AddToPhotosOutlinedIcon from "@mui/icons-material/AddToPhotosOutlined";

const AddCompany = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingCompany, setEditingCompany] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const showSnackbar = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });
  const closeSnackbar = () => setSnackbar({ ...snackbar, open: false });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [searchTerm, setSearchTerm] = useState("");

  // For confirmation dialog
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);

  const authHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/companies`, {
        headers: { ...authHeaders() },
      });
      if (!res.ok) throw new Error("Failed to fetch companies");
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      showSnackbar("Failed to fetch companies", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleOpenModal = (company = null) => {
    setEditingCompany(company);
    setModalMode(company ? "edit" : "add");
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingCompany(null);
  };

  // Open confirmation dialog on delete icon click
  const handleDeleteClick = (company) => {
    setCompanyToDelete(company);
    setConfirmDeleteOpen(true);
  };

  const handleDeleteCancel = () => {
    setConfirmDeleteOpen(false);
    setCompanyToDelete(null);
  };

  // Confirm delete action
  const handleDeleteConfirm = async () => {
    if (!companyToDelete) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/companies/${companyToDelete.id}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      if (res.ok) {
        showSnackbar("Company deleted successfully", "success");
        fetchCompanies();
      } else {
        const data = await res.json();
        showSnackbar(data.message || "Failed to delete company", "error");
      }
    } catch (err) {
      showSnackbar("Error deleting company", "error");
    } finally {
      setConfirmDeleteOpen(false);
      setCompanyToDelete(null);
    }
  };

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  // Filter companies by search term on all relevant properties
  const filteredCompanies = companies.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.company_name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.cell_no1?.toLowerCase().includes(term) ||
      c.subscription_type?.toLowerCase().includes(term) ||
      (c.is_active === 1 || c.is_active === true ? "active" : "inactive").includes(term) ||
      String(c.id).includes(term)
    );
  });

  return (
    <Box
      sx={{
        px: isMobile ? 2 : 2,
        py: isMobile ? 4 : 4,
        minHeight: "100vh",
        color: theme.palette.text.primary,
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        mb={4}
        flexDirection={isMobile ? "column" : "row"}
        gap={isMobile ? 2 : 0}
      >
        <Typography variant="h5" fontWeight="bold" color={primaryColor}>
          Add Companies
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "center", sm: "center" },
          justifyContent: "space-between",
          mb: 2,
          width: "100%",
        }}
      >
        {/* Search Bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            bgcolor: (theme) => theme.palette.background.paper,
            borderRadius: "40px",
            p: "8px 14px",
            width: { xs: "90%", sm: "auto" },
            maxWidth: 400,
            minWidth: "280px",
            boxShadow: `0 0 6px ${primaryColor}33`,
            border: `2px solid ${primaryColor}`,
            transition: "all 0.3s ease",
          }}
        >
          <SearchIcon sx={{ color: primaryColor, fontSize: "1.2rem", mr: 1 }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            placeholder="Search companies..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              backgroundColor: "transparent",
              color: (theme) => theme.palette.text.primary,
              fontSize: "1rem",
              fontFamily: "'Inter', sans-serif",
            }}
          />
          {searchTerm && (
            <CloseIcon
              onClick={() => {
                setSearchTerm("");
                setPage(0);
              }}
              sx={{ color: "gray", fontSize: "20px", cursor: "pointer" }}
            />
          )}
        </Box>

        {/* Add Company Button */}
        <Button
          variant="outlined"
          startIcon={<AddToPhotosOutlinedIcon />}
          onClick={() => handleOpenModal(null)}
          sx={{
            color: primaryColor,
            border: `2px solid ${primaryColor}`,
            fontWeight: "bold",
            borderRadius: "10px",
            whiteSpace: "nowrap",
            alignSelf: { xs: "flex-end", sm: "auto" },
            textTransform: "none",
            mt: { xs: 2, sm: 0 },
            "&:hover": {
              boxShadow: `0 0 8px ${primaryColor}`,
            },
          }}
        >
          Add Company
        </Button>
      </Box>

      {loading ? (
        <Box textAlign="center" mt={6}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <TableContainer
  component={Paper}
  sx={{
    border: `2px solid ${primaryColor}`,
    borderRadius: 2,
    boxShadow: `0 0 10px ${primaryColor}66`,
  }}
>
  {/* 🔥 Scroll ONLY for table */}
  <Box
    sx={{
      maxHeight: 700, // adjust based on UI
      overflow: "auto",

      "&::-webkit-scrollbar": {
        height: "8px",
        width: "8px",
      },
      "&::-webkit-scrollbar-thumb": {
        backgroundColor: primaryColor,
        borderRadius: "8px",
      },
      "&::-webkit-scrollbar-track": {
        backgroundColor: isDark ? "#212121" : "#eee",
      },
      scrollbarColor: `${primaryColor} ${isDark ? "#212121" : "#eee"}`,
      scrollbarWidth: "thin",
    }}
  >
    <Table
      size={isMobile ? "small" : "medium"}
      stickyHeader
      sx={{ minWidth: 1100 }}
    >
      <TableHead>
        <TableRow sx={{ backgroundColor: isDark ? "#27273d" : "#f7f9fc" }}>
          {[
            "Company ID",
            "Name",
            "Email",
            "Phone",
            "Subscription",
            "Status",
            "Actions",
          ].map((header) => (
            <TableCell
              key={header}
              sx={{
                color: primaryColor,
                fontWeight: "bold",
                whiteSpace: "nowrap",
                fontSize: { xs: "0.95rem", sm: "1rem" },
                py: 2,
                textAlign:
                  header === "S.No" || header === "Company ID"
                    ? "center"
                    : "left",
                width:
                  header === "S.No"
                    ? 50
                    : header === "Company ID"
                    ? 80
                    : "auto",
              }}
            >
              {header}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>

      <TableBody>
        {filteredCompanies.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} align="center">
              No companies found.
            </TableCell>
          </TableRow>
        ) : (
          filteredCompanies
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((company) => (
              <TableRow key={company.id} hover>
                <TableCell sx={{ fontWeight: "bold", textAlign: "center", width: 80 }}>
                  {company.id}
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>
                  {company.company_name}
                </TableCell>
                <TableCell>{company.email}</TableCell>
                <TableCell>{company.cell_no1}</TableCell>
                <TableCell sx={{ textTransform: "capitalize" }}>
                  {company.subscription_type
                    ? company.subscription_type.charAt(0).toUpperCase() +
                      company.subscription_type.slice(1)
                    : ""}
                </TableCell>

                <TableCell>
                  <Box
                    sx={{
                      display: "inline-block",
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 3,
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: "0.9em",
                      backgroundColor:
                        company.is_active === 1 || company.is_active === true
                          ? "#0D6310"
                          : "#e74c3c",
                      textAlign: "center",
                    }}
                  >
                    {company.is_active ? "Active" : "Inactive"}
                  </Box>
                </TableCell>

                <TableCell sx={{ minWidth: 150 }}>
                  <IconButton
                    onClick={() => handleOpenModal(company)}
                    sx={{
                      borderRadius: "50%",
                      border: `1px solid ${primaryColor}`,
                      color: primaryColor,
                      "&:hover": { boxShadow: `0 0 8px ${primaryColor}` },
                      mr: 1,
                    }}
                  >
                    <DrawIcon fontSize="small" />
                  </IconButton>

                  <IconButton
                    onClick={() => handleDeleteClick(company)}
                    sx={{
                      borderRadius: "50%",
                      border: `1px solid ${theme.palette.error.main}`,
                      color: theme.palette.error.main,
                      "&:hover": {
                        boxShadow: `0 0 8px ${theme.palette.error.main}`,
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
        )}
      </TableBody>
    </Table>
  </Box>

  {/* 🔥 Pagination OUTSIDE scroll */}
  <TablePagination
    component="div"
    count={filteredCompanies.length}
    page={page}
    rowsPerPage={rowsPerPage}
    onPageChange={handleChangePage}
    onRowsPerPageChange={handleChangeRowsPerPage}
    rowsPerPageOptions={[5, 10, 20, 50]}
    sx={{
      backgroundColor: isDark ? "#1e1e1e" : "#f9f9f9",
      borderTop: `1px solid ${primaryColor}`,
    }}
  />
</TableContainer>
      )}

      <AddCompanyModal
        open={openModal}
        handleClose={handleCloseModal}
        onSaveSuccess={() => {
          fetchCompanies();
          showSnackbar(modalMode === "edit" ? "Company updated" : "Company added");
          handleCloseModal();
        }}
        onError={(msg) => showSnackbar(msg, "error")}
        company={editingCompany}
        mode={modalMode}
      />

<Dialog
  open={confirmDeleteOpen}
  onClose={(event, reason) => {
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      return; // Block
    }
    handleDeleteCancel();
  }}
  disableEscapeKeyDown={true}
  disableBackdropClick={true}
  aria-labelledby="confirm-delete-title"
  PaperProps={{
    sx: {
      backgroundColor: isDark ? "#000000" : "#ffffff",
      color: isDark ? "#ffffff" : "#000000",
      border: `2px solid ${primaryColor}`,
      boxShadow: `0 0 8px ${primaryColor}`,
      borderRadius: "20px",
    },
  }}
>
  <DialogTitle
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontWeight: "bold",
      color: primaryColor,
      pr: 1,
    }}
    id="confirm-delete-title"
  >
    Confirm Delete
    <IconButton
      aria-label="close"
      onClick={handleDeleteCancel}
      sx={{
        color: isDark ? "#AAAAAD" : "gray",
        p: 0,
        ml: -2,
      }}
      size="small"
    >
      <CloseIcon sx={{mr: 1}}/>
    </IconButton>
  </DialogTitle>
  <DialogContent>
    <Typography>
  {companyToDelete ? (
    <>Are you sure you want to delete <strong>{companyToDelete.company_name}</strong> with ID: <strong>{companyToDelete.id}</strong>, Email: <strong>{companyToDelete.email}</strong>, Subscription: <strong>{companyToDelete.subscription_type
      ? companyToDelete.subscription_type.charAt(0).toUpperCase() + companyToDelete.subscription_type.slice(1)
      : ""}</strong>?</>
  ) : (
    "Are you sure you want to delete this company?"
  )}
</Typography>
  </DialogContent>
  <DialogActions>
    <Button
      onClick={handleDeleteCancel}
      sx={{ color: isDark ? "#AAAAAD" : "gray", textTransform: "none" }}
    >
      Cancel
    </Button>
    <Button
      onClick={handleDeleteConfirm}
      variant="contained"
      color="error"
      sx={{ fontWeight: "bold", textTransform: "none", borderRadius: "50px" }}
    >
      Delete
    </Button>
  </DialogActions>
</Dialog>


      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={closeSnackbar} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AddCompany;
