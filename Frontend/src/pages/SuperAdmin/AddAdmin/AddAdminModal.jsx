import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  Paper,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CloseIcon from "@mui/icons-material/Close";
import API_BASE_URL from "../../../Context/Api";

const AddAdminModal = ({
  open,
  handleClose,
  onUserUpdated,
  onError,
  mode = "add", // "add" or "edit"
  userToEdit,
  companies = [],
}) => {

  const isEditing = mode === "edit";

  const [formData, setFormData] = useState({
    tenant_id: "",
    first_name: "",
    last_name: "",
    mobile_number: "",
    email: "",
    password_hash: "",
    confirm_password: "",
    role: "admin",
    status: "active",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
   const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const primaryColor = theme.palette.primary.main;
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    if (isEditing && userToEdit) {
      setFormData({
        tenant_id: userToEdit.tenant_id || "",
        first_name: userToEdit.first_name || "",
        last_name: userToEdit.last_name || "",
        mobile_number: userToEdit.mobile_number || "",
        email: userToEdit.email || "",
        password_hash: userToEdit.password_hash || "",
        confirm_password: userToEdit.password_hash || "",
        role: userToEdit.role || "admin",
        status: userToEdit.status || "active",
      });
    } else {
      setFormData({
        tenant_id: "",
        first_name: "",
        last_name: "",
        mobile_number: "",
        email: "",
        password_hash: "",
        confirm_password: "",
        role: "admin",
        status: "active",
      });
    }
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [open, isEditing, userToEdit]);

  const authHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (
      (!isEditing || formData.password_hash || formData.confirm_password) &&
      formData.password_hash !== formData.confirm_password
    ) {
      onError("Passwords do not match", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tenant_id: formData.role === "super_admin" ? null : formData.tenant_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        mobile_number: formData.mobile_number,
        email: formData.email,
        password_hash: formData.password_hash || undefined,
        role: formData.role,
        status: formData.status,
      };

      let url, method;
      if (isEditing && userToEdit?.user_id) {
        url = `${API_BASE_URL}/api/admin/users/${userToEdit.user_id}`;
        method = "PUT";
      } else {
        url = `${API_BASE_URL}/api/admin/users`;
        method = "POST";
      }

      const res = await fetch(url, {
        method,
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onUserUpdated();
        handleClose();
      } else {
        const data = await res.json();
        onError(data.message || "Failed to save user", "error");
      }
    } catch (err) {
      onError("Error saving user", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
  open={open}
  onClose={(event, reason) => {
    // ✅ BLOCK ALL external closes - only allow programmatic close
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      return; // Do NOTHING
    }
    handleClose(); // Only allow internal closes
  }}
  disableEscapeKeyDown={true}
  disableBackdropClick={true}
  fullWidth
  PaperProps={{
    sx: {
      minWidth: '300px',
      border: `2px solid ${primaryColor}`,
      boxShadow: `0 0 10px ${primaryColor}`,
      borderRadius: '20px',
    },
  }}
>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: primaryColor, fontWeight: "bold" }}>
        {isEditing ? "Edit Admin User" : "Add Admin User"}
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers
        sx={{
          maxHeight: "70vh",
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
        <FormControl fullWidth margin="dense">
          <InputLabel>Role</InputLabel>
          <Select
            value={formData.role}
            label="Role"
            onChange={(e) => handleChange("role", e.target.value)}
          >
            <MenuItem value="super_admin">Super Admin</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="cashier">Cashier</MenuItem>
            <MenuItem value="sales">Sales</MenuItem>
          </Select>
        </FormControl>

        {formData.role !== "super_admin" && (
          <FormControl fullWidth margin="dense">
            <InputLabel>Company</InputLabel>
            <Select
              value={formData.tenant_id}
              label="Company"
              onChange={(e) => handleChange("tenant_id", e.target.value)}
            >
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  <Box>
                    <Typography fontWeight="bold">{c.company_name}</Typography>
                    <Typography variant="caption">
                      ID: {c.id} | {c.email} | {c.subscription_type}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <TextField
          label="First Name"
          fullWidth
          margin="dense"
          value={formData.first_name}
          onChange={(e) => handleChange("first_name", e.target.value)}
        />
        <TextField
          label="Last Name"
          fullWidth
          margin="dense"
          value={formData.last_name}
          onChange={(e) => handleChange("last_name", e.target.value)}
        />
        <TextField
          label="Mobile Number"
          fullWidth
          margin="dense"
          value={formData.mobile_number}
          onChange={(e) => handleChange("mobile_number", e.target.value)}
        />
        <TextField
          label="Email"
          fullWidth
          margin="dense"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />

        <TextField
          label="Password"
          fullWidth
          margin="dense"
          type={showPassword ? "text" : "password"}
          value={formData.password_hash}
          onChange={(e) => handleChange("password_hash", e.target.value)}
          placeholder={isEditing ? "Leave blank to keep current password" : ""}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword((prev) => !prev)}
                  edge="end"
                  tabIndex={-1}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          label="Confirm Password"
          fullWidth
          margin="dense"
          type={showConfirmPassword ? "text" : "password"}
          value={formData.confirm_password}
          onChange={(e) => handleChange("confirm_password", e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  edge="end"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={formData.status === "active"}
              onChange={(e) =>
                handleChange("status", e.target.checked ? "active" : "inactive")
              }
            />
          }
          label="Active"
        />
      </DialogContent>

            <DialogActions sx={{p: 2}}>
        <Button
          onClick={handleClose}
          sx={{ textTransform: "none" }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          sx={{ textTransform: "none", fontWeight: "bold", color: '#fff', borderRadius: '50px', mr: 2 }}
        >
          {saving
            ? isEditing
              ? "Updating..."
              : "Adding..."
            : isEditing
            ? "Update"
            : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddAdminModal;
