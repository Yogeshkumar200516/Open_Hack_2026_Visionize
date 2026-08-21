import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  useTheme,
  useMediaQuery,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Dialog,
  DialogActions,
  DialogTitle,
  DialogContent,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TableContainer,
  TablePagination,
} from "@mui/material";
import {
  Close as CloseIcon,
  Search as SearchIcon,
  AddLink as AddLinkIcon,
  AutoMode as AutoModeIcon,
} from "@mui/icons-material";
import DrawIcon from "@mui/icons-material/Draw";
import axiosInstance from "../../utils/axiosInstance";



const CategoryModal = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const primaryColor = theme.palette.primary.main;
  const { palette } = theme;
  const isDark = theme.palette.mode === "dark";

  const api = useRef(axiosInstance);


  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [isActive, setIsActive] = useState("Active");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const intervalRef = useRef(null);

  // Fetch categories from server using fresh authAxios
  const fetchCategories = async () => {
    try {
      const res = await api.current.get("/api/categories");
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setCategories([]);
    }
  };

  // Reset form fields
  const resetForm = () => {
    setEditingId(null);
    setCategoryName("");
    setIsActive("Active");
  };

  // Show snackbar notification
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  // Effect: When modal opens, fetch categories and setup interval
  useEffect(() => {
    if (open) {
      fetchCategories();
      resetForm();

      // Auto-refresh every 30 seconds
      intervalRef.current = setInterval(fetchCategories, 30000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [open]);

  // Handle form submission for add/update category
  const handleSubmit = async () => {
  if (!categoryName.trim()) {
    showSnackbar("Category name is required", "error");
    return;
  }

  const data = {
    category_name: categoryName.trim(),
    is_active: isActive === "Active" ? 1 : 0,
  };

  try {
    if (editingId) {
      await api.current.put(`/api/categories/edit/${editingId}`, data);
      showSnackbar("Category updated successfully", "success");
    } else {
      await api.current.post("/api/categories/add", data);
      showSnackbar("Category added successfully", "success");
    }
    setFormOpen(false);
    resetForm();

    // IMMEDIATE REFRESH: Ensures categories update in table
    await fetchCategories();
    // ^ Ensure fetchCategories updates state used by your table
  } catch (err) {
    const msg = err.response?.data?.error || "Something went wrong";
    showSnackbar(msg, "error");
  }
};

const handleEdit = (category) => {
  setCategoryName(category.category_name);
  setIsActive(category.is_active ? "Active" : "Inactive");
  setEditingId(category.category_id);
  setFormOpen(true);
};


  // DateTime formatting helper
  const formatDateTime = (iso) => {
    const date = new Date(iso);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${day}-${month}-${year} - ${hours}:${minutes} ${ampm}`;
  };

  // Filter categories by search term
  const filteredCategories = categories.filter((cat) => {
    const lowerSearch = searchTerm.trim().toLowerCase();
    return (
      cat.category_name.toLowerCase().includes(lowerSearch) ||
      (cat.is_active ? "active" : "inactive").includes(lowerSearch) ||
      formatDateTime(cat.created_at).toLowerCase().includes(lowerSearch) ||
      String(cat.category_id).includes(lowerSearch)
    );
  });

  return (
    <>
      {/* Categories Listing Modal */}
      <Dialog
        open={open}
        onClose={(event, reason) => {
          if (reason !== "backdropClick") {
            onClose();
          }
        }}
        disableEscapeKeyDown
        fullWidth={false}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: { xs: "95vw", sm: "800px", md: "900px" },
            maxWidth: "95vw",
            m: { xs: 1, sm: 2 },
            borderRadius: 2,
            border: `1px solid ${primaryColor}`,
            boxShadow: `0px 0px 20px ${primaryColor}50`,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: primaryColor,
            fontWeight: "bold",
            fontSize: "1.3rem",
            bgcolor: palette.background.default,
            borderBottom: `1px solid ${primaryColor}33`,
            px: 3,
            py: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <AutoModeIcon fontSize="medium" />
            Category Master
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 2, sm: 2 }, backgroundColor: palette.background.paper }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2} mt={1}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                bgcolor: palette.background.paper,
                borderRadius: "40px",
                px: 2,
                py: 1,
                minWidth: "240px",
                border: `2px solid ${primaryColor}`,
                boxShadow: `0 0 8px ${primaryColor}44`,
                "&:hover": { boxShadow: `0 0 8px ${primaryColor}` },
              }}
            >
              <SearchIcon sx={{ color: primaryColor }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Category..."
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  backgroundColor: "transparent",
                  color: palette.text.primary,
                  fontSize: "1rem",
                  marginLeft: "10px",
                }}
              />
              {searchTerm && (
                <CloseIcon
                  onClick={() => setSearchTerm("")}
                  sx={{ color: "gray", fontSize: "20px", cursor: "pointer", ml: 1 }}
                />
              )}
            </Box>

            <Button
              variant="outlined"
              startIcon={<AddLinkIcon />}
              onClick={() => {
                resetForm();
                setFormOpen(true);
              }}
              sx={{
                border: `2px solid ${primaryColor}`,
                borderRadius: "10px",
                fontWeight: "bold",
                textTransform: "none",
                color: primaryColor,
                height: "42px",
                whiteSpace: "nowrap",
                "&:hover": { backgroundColor: `${primaryColor}10`, boxShadow: `0 0 8px ${primaryColor}` },
              }}
            >
              Add Category
            </Button>
          </Box>

          <Box
            sx={{
              border: `1px solid ${primaryColor}33`,
              borderRadius: 3,
              overflow: "hidden",
              backgroundColor: isDark ? "#121212" : "#fafafa",
              boxShadow: `0 0 10px ${primaryColor}22`,
              overflowX: "auto",
            }}
          >
            <TableContainer
              component="div"
              sx={{ minWidth: 850, overflowY: "auto", height: "40vh", "&::-webkit-scrollbar": { display: "none" }, scrollbarWidth: "none" }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {["S.No", "Category Name", "Category ID", "Status", "Created At", "Actions"].map((header) => (
                      <TableCell
                        key={header}
                        sx={{ color: primaryColor, fontWeight: "bold", whiteSpace: "nowrap", backgroundColor: palette.background.default, py: 1 }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No categories found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCategories
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((cat, index) => (
                        <TableRow key={cat.category_id} hover>
                          <TableCell sx={{ fontWeight: "bold", width: "25px", textAlign: "center" }}>
                            {page * rowsPerPage + index + 1}
                          </TableCell>
                          <TableCell>{cat.category_name}</TableCell>
                          <TableCell>{cat.category_id}</TableCell>
                          <TableCell>{cat.is_active ? "Active" : "Inactive"}</TableCell>
                          <TableCell>{formatDateTime(cat.created_at)}</TableCell>
                          <TableCell>
                            <IconButton
                              onClick={() => handleEdit(cat)}
                              sx={{ color: primaryColor, border: `1px solid ${primaryColor}`, "&:hover": { boxShadow: `0 0 8px ${primaryColor}` } }}
                            >
                              <DrawIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Box sx={{ borderTop: `1px solid ${primaryColor}22`, display: "flex", justifyContent: "flex-end", alignItems: "center", px: 2 }}>
            <TablePagination
              component="div"
              count={filteredCategories.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Category Form Dialog */}
      <Dialog
        open={formOpen}
        onClose={(event, reason) => {
          if (reason !== "backdropClick") {
            setFormOpen(false);
          }
        }}
        disableEscapeKeyDown
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
            border: `1px solid ${primaryColor}`,
            boxShadow: `0 0 10px ${primaryColor}`,
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 1, bgcolor: palette.background.default, color: primaryColor, fontWeight: "bold" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AutoModeIcon />
            {editingId ? "Edit Category" : "Add Category"}
          </Box>
          <IconButton onClick={() => setFormOpen(false)} edge="end">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ overflowY: "auto", flex: 1, bgcolor: palette.background.paper }}>
          <TextField
            label="Category Name"
            fullWidth
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={isActive} onChange={(e) => setIsActive(e.target.value)}>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions sx={{ position: "sticky", bottom: 0, bgcolor: palette.background.default }}>
          <Button
            variant="outlined"
            onClick={handleSubmit}
            sx={{
              gap: "8px",
              textTransform: "none",
              color: primaryColor,
              border: `2px solid ${primaryColor}`,
              borderRadius: "10px",
              backgroundColor: "transparent",
              transition: "all 0.3s ease-in-out",
              fontWeight: "bold",
              textAlign: "center",
              "&:hover": {
                boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                filter: "brightness(1.1)",
                transform: "scale(1.01)",
              },
            }}
          >
            {editingId ? "Update Category" : "Add Category"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Notifications */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CategoryModal;
