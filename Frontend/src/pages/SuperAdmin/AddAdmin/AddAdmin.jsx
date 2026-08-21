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
  useTheme,
  useMediaQuery,
  CircularProgress,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddLinkIcon from "@mui/icons-material/AddLink";
import DeleteIcon from "@mui/icons-material/Delete";
import DrawIcon from "@mui/icons-material/Draw";
import CloseIcon from "@mui/icons-material/Close";
import API_BASE_URL from "../../../Context/Api";
import AddAdminModal from "./AddAdminModal";

// Mappings for better label display
const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  cashier: "Cashier",
  sales: "Sales"
};

const AddAdmin = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedUser, setSelectedUser] = useState(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
const [userToDelete, setUserToDelete] = useState(null);

const handleDeleteClick = (user) => {
  setUserToDelete(user);
  setConfirmDeleteOpen(true);
};

const handleDeleteConfirm = async () => {
  setConfirmDeleteOpen(false);
  if (!userToDelete) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/users/${userToDelete.user_id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    if (res.ok) {
      showSnackbar("User deleted successfully", "success");
      fetchUsers();
    } else {
      const data = await res.json();
      showSnackbar(data.message || "Failed to delete user", "error");
    }
  } catch (err) {
    showSnackbar("An error occurred while deleting user", "error");
  }
  setUserToDelete(null);
};

const handleDeleteCancel = () => {
  setConfirmDeleteOpen(false);
  setUserToDelete(null);
};


  const showSnackbar = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });
  const closeSnackbar = () => setSnackbar({ ...snackbar, open: false });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const authHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { ...authHeaders() },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      showSnackbar("Failed to fetch users", "error");
    } finally {
      setLoading(false);
    }
  };
  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/companies`, {
        headers: { ...authHeaders() },
      });
      if (!res.ok) throw new Error("Failed to fetch companies");
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      showSnackbar("Failed to fetch companies", "error");
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, []);

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      if (res.ok) {
        showSnackbar("User deleted successfully", "success");
        fetchUsers();
      } else {
        const data = await res.json();
        showSnackbar(data.message || "Failed to delete user", "error");
      }
    } catch (err) {
      showSnackbar("An error occurred while deleting user", "error");
    }
  };

  // Filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterRole, setFilterRole] = useState("");

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };
  const handleCloseSearch = () => {
    setSearchTerm("");
    setPage(0);
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    const name = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
    const matchesSearch =
      name.includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.mobile_number?.toLowerCase().includes(term) ||
      u.role?.toLowerCase().includes(term) ||
      u.status?.toLowerCase().includes(term);

    const matchesCompany =
      !filterCompany || String(u.tenant_id) === String(filterCompany);
    const matchesRole = !filterRole || u.role === filterRole;

    return matchesSearch && matchesCompany && matchesRole;
  });

  const paginated = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const isWide = useMediaQuery("(min-width:1250px)");

  return (
    <Box
      sx={{
        color: theme.palette.text.primary,
        minHeight: "100vh",
        py: isMobile ? 2 : 4,
        px: isMobile ? 2 : 2,
        boxSizing: "border-box",
        overflowX: "hidden",
        width: "100%",
        maxWidth: "100vw",
      }}
    >
      <Typography
        gutterBottom
        sx={{
          fontSize: { xs: "20px", sm: "26px" },
          color: primaryColor,
          fontWeight: "bold",
          pt: { xs: 3, sm: 1 },
          pb: { xs: 1, sm: 0 },
        }}
      >
        Admin User Management
      </Typography>
      {/* Filter controls beside Add Admin User button */}
      <Box
        sx={{
    display: "flex",
    flexDirection: isWide ? "row" : "column",
    justifyContent: "space-between",
    alignItems: isWide ? "center" : "stretch",
    mb: 2,
    gap: isWide ? 1 : 2,
    mt: isMobile ? 0 : 4,
  }}
      >
        {/* Search bar on right (or stacked below filters on mobile) */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: isWide ? "flex-start" : "center",
            mt: isMobile ? 2 : 0,
            width: isMobile ? "100%" : "auto"
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: theme.palette.background.paper,
              borderRadius: "40px",
              p: "8px 14px",
              width: "100%",
              maxWidth: 400,
              boxShadow: `0 0 6px ${primaryColor}33`,
              border: `2px solid ${primaryColor}`,
              transition: "all 0.3s ease",
            }}
          >
            <SearchIcon sx={{ color: primaryColor, fontSize: "1.2rem", mr: 1 }} />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search admin users..."
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                backgroundColor: "transparent",
                color: theme.palette.text.primary,
                fontSize: "1rem",
                fontFamily: "'Inter', sans-serif"
              }}
            />
            {searchTerm && (
              <CloseIcon
                onClick={handleCloseSearch}
                sx={{ color: "gray", fontSize: "20px", cursor: "pointer" }}
              />
            )}
          </Box>
        </Box>


        <Box
          sx={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            justifyContent: isMobile ? "flex-start" : "flex-end",
          }}
        >
          <FormControl
  size="small"
  variant="outlined"   // ✅ important for notched outline
  sx={{
    minWidth: isMobile ? "100%" : 250,
    borderRadius: "10px",
    fontWeight: "bold",
    "& .MuiInputLabel-root": {
      color: primaryColor,
      fontWeight: "normal",
    },
    "& .MuiOutlinedInput-root": {
      borderRadius: "10px",
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      "& fieldset": {
        border: `2px solid ${primaryColor}`, // ✅ keep border so notch works
      },
      "&:hover fieldset": {
        border: `2px solid ${primaryColor}`,
        transition: "all 0.3s ease",
      },
      "&.Mui-focused fieldset": {
        border: `2px solid ${primaryColor}`,
      },
      "& .MuiSelect-icon": {
        color: primaryColor,
      },
    },
    "& .MuiSelect-select": {
      fontWeight: "bold",
    },
  }}
>
  <InputLabel>Filter by Company</InputLabel>
  <Select
    value={filterCompany}
    label="Filter by Company"
    onChange={(e) => setFilterCompany(e.target.value)}
    renderValue={(value) => {
      if (!value) return "All Companies";
      const selected = companies.find((c) => c.id === value);
      return selected ? selected.company_name : value;
    }}
  >
    <MenuItem value="">
      <em>All Companies</em>
    </MenuItem>
    {companies.map((c) => (
      <MenuItem key={c.id} value={c.id}>
        <Box>
          <Typography fontWeight="bold">{c.company_name}</Typography>
          <Typography variant="caption" color="text.secondary">
            ID: {c.id} | {c.email} | {c.subscription_type}
          </Typography>
        </Box>
      </MenuItem>
    ))}
  </Select>
</FormControl>

<FormControl
  size="small"
  variant="outlined"
  sx={{
    minWidth: isMobile ? "100%" : 180,
    borderRadius: "10px",
    fontWeight: "bold",
    "& .MuiInputLabel-root": {
      color: primaryColor,
      fontWeight: "normal",
    },
    "& .MuiOutlinedInput-root": {
      borderRadius: "10px",
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      "& fieldset": {
        border: `2px solid ${primaryColor}`,
      },
      "&:hover fieldset": {
        border: `2px solid ${primaryColor}`,
        transition: "all 0.3s ease",
      },
      "&.Mui-focused fieldset": {
        border: `2px solid ${primaryColor}`,
      },
      "& .MuiSelect-icon": {
        color: primaryColor,
      },
    },
    "& .MuiSelect-select": {
      fontWeight: "bold",
    },
  }}
>
  <InputLabel>Filter by Role</InputLabel>
  <Select
    value={filterRole}
    label="Filter by Role"
    onChange={(e) => setFilterRole(e.target.value)}
    renderValue={(value) => (value ? ROLE_LABELS[value] : "All Roles")}
  >
    <MenuItem value="">
      <em>All Roles</em>
    </MenuItem>
    {Object.entries(ROLE_LABELS).map(([key, label]) => (
      <MenuItem key={key} value={key}>
        {label}
      </MenuItem>
    ))}
  </Select>
</FormControl>


          {/* Add Admin User button */}
          <Button
            variant="outlined"
            onClick={() => {
              setSelectedUser(null);
              setModalMode("add");
              setOpenModal(true);
            }}
            sx={{
              gap: "8px",
              textTransform: "none",
              color: primaryColor,
              border: `2px solid ${primaryColor}`,
              borderRadius: "10px",
              fontWeight: "bold",
              backgroundColor: "transparent",
              whiteSpace: "nowrap",
              fontSize: "1rem",
              boxShadow: `0 0 8px ${primaryColor}33`,
              "&:hover": {
                boxShadow: `0 0 10px ${primaryColor}, 0 0 8px ${primaryColor}`,
                filter: "brightness(1.1)",
                transform: "scale(1.01)"
              }
            }}
          >
            <AddLinkIcon />
            Add Admin User
          </Button>
        </Box>
      </Box>
      {/* Table */}
      {loading ? (
        <Box textAlign="center" mt={4}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <Box
          sx={{
            width: "100%",
            overflowX: "auto",
            maxWidth: "100vw",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
           <TableContainer
  component={Paper}
  sx={{
    border: `2px solid ${primaryColor}`,
    borderRadius: 2,
    boxShadow: `0 0 8px ${primaryColor}66`,
  }}
>
  {/* 🔥 SCROLL ONLY HERE */}
  <Box
    sx={{
      maxHeight: 750, // adjust based on your UI
      overflow: "auto",

      "&::-webkit-scrollbar": {
        height: "3px",
        width: "3px",
        background: "#e3e3e3",
      },
      "&::-webkit-scrollbar-thumb": {
        background: primaryColor,
        borderRadius: "2px",
        minHeight: "16px",
        minWidth: "16px",
      },
      "&::-webkit-scrollbar-thumb:hover": {
        background: theme.palette.primary.dark,
      },

      // Firefox
      scrollbarColor: `${primaryColor} #e3e3e3`,
      scrollbarWidth: "thin",
    }}
  >
    <Table size="small" sx={{ minWidth: 1300, width: "100%" }}>
      <TableHead>
        <TableRow sx={{ backgroundColor: isDark ? "#27273d" : "#f7f9fc" }}>
          {[
            "S.No",
            "Name",
            "Email",
            "Mobile",
            "Role",
            "Company",
            "Actions",
            "Status",
          ].map((header) => (
            <TableCell
              key={header}
              sx={{
                color: primaryColor,
                fontWeight: "bold",
                whiteSpace: "nowrap",
                fontSize: { xs: "0.95rem", sm: "1rem" },
                py: 2.2,
              }}
            >
              {header}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>

      <TableBody>
        {paginated.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} align="center">
              No users found.
            </TableCell>
          </TableRow>
        ) : (
          paginated.map((u, index) => (
            <TableRow key={u.user_id} hover>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  width: "30px",
                  textAlign: "center",
                }}
              >
                {index + 1 + page * rowsPerPage}
              </TableCell>

              <TableCell sx={{ fontWeight: "bold" }}>
                {(u.first_name || "") + " " + (u.last_name || "")}
              </TableCell>

              <TableCell>{u.email}</TableCell>
              <TableCell>{u.mobile_number}</TableCell>

              <TableCell>
                {ROLE_LABELS[u.role] || u.role}
              </TableCell>

              <TableCell>
                {u.tenant_id
                  ? (() => {
                      const c = companies.find(
                        (comp) => comp.id === u.tenant_id
                      );
                      return c ? (
                        <Box>
                          <Typography fontWeight="bold">
                            {c.company_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {c.id} | {c.email} | {c.subscription_type}
                          </Typography>
                        </Box>
                      ) : "N/A";
                    })()
                  : "N/A"}
              </TableCell>

              <TableCell sx={{ minWidth: "100px" }}>
                <IconButton
                  color="primary"
                  onClick={() => {
                    setModalMode("edit");
                    setSelectedUser({ ...u, id: u.user_id });
                    setOpenModal(true);
                  }}
                  sx={{
                    borderRadius: "50%",
                    border: `1px solid ${primaryColor}`,
                    "&:hover": {
                      boxShadow: `0 0 8px ${primaryColor}`,
                    },
                  }}
                >
                  <DrawIcon fontSize="small" />
                </IconButton>

                <IconButton
                  color="error"
                  onClick={() => handleDeleteClick(u)}
                  sx={{
                    ml: 1,
                    borderRadius: "50%",
                    border: `1px solid ${theme.palette.error.main}`,
                    "&:hover": {
                      boxShadow: `0 0 8px ${theme.palette.error.main}`,
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>

              <TableCell>
                <Box
                  sx={{
                    display: "inline-block",
                    px: 1.6,
                    py: 0.5,
                    borderRadius: 3,
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: "0.93em",
                    background:
                      u.status === "active" ? "#0D6310" : "#e74c3c",
                    letterSpacing: 0.5,
                    textTransform: "capitalize",
                    textAlign: "center",
                  }}
                >
                  {u.status}
                </Box>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </Box>

  {/* 🔥 Pagination FIXED */}
  <TablePagination
    component="div"
    rowsPerPageOptions={[5, 10, 20, 50]}
    count={filteredUsers.length}
    page={page}
    rowsPerPage={rowsPerPage}
    onPageChange={handleChangePage}
    onRowsPerPageChange={handleChangeRowsPerPage}
    sx={{
      px: 2,
      backgroundColor: isDark ? "#1e1e1e" : "#f9f9f9",
      borderTop: `1px solid ${primaryColor}`,
    }}
  />
</TableContainer>
        </Box>
      )}
      <AddAdminModal
        open={openModal}
        handleClose={() => {
          setOpenModal(false);
          setSelectedUser(null);
          setModalMode("add");
        }}
        onUserUpdated={() => {
          fetchUsers();
          showSnackbar(
            modalMode === "edit"
              ? "User updated successfully"
              : "User added successfully",
            "success"
          );
        }}
        onError={showSnackbar}
        mode={modalMode}
        userToEdit={selectedUser}
        companies={companies}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={closeSnackbar}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

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
      borderRadius: '20px'
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
    }}
  >
    <span id="confirm-delete-title">Confirm Delete</span>
    <IconButton
      aria-label="close"
      onClick={handleDeleteCancel}
      sx={{
        color: (theme) => theme.palette.grey[500],
      }}
      size="small"
    >
      <CloseIcon />
    </IconButton>
  </DialogTitle>

  <DialogContent>
  <Typography>
    {userToDelete ? (() => {
      const userCompany = companies.find(
        (c) => c.id === userToDelete.tenant_id
      );
      return (
        <>
          Are you sure you want to delete <strong>{userToDelete.first_name} {userToDelete.last_name}</strong> (<strong>{userToDelete.role.charAt(0).toUpperCase() + userToDelete.role.slice(1)}</strong>, {userToDelete.email}) from 
          {userCompany ? (
            <><strong> {userCompany.company_name}</strong> (ID: {userCompany.id}, Subscription: {userCompany.subscription_type.charAt(0).toUpperCase() + userCompany.subscription_type.slice(1)})</>
          ) : ""}
        </>
      );
    })() : "Are you sure you want to delete this user?"}
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

    </Box>
  );
};

export default AddAdmin;
