import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  IconButton,
  useTheme,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import API_BASE_URL from "../../../Context/Api";

// Subscription enum options as per your database
const subscriptionOptions = [
  "invoice",
  "bill",
  "both",
];

const AddCompanyModal = ({ open, handleClose, onSaveSuccess, onError, company, mode }) => {
  const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const primaryColor = theme.palette.primary.main;
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [formData, setFormData] = useState({
    company_name: "",
    company_logo: "",   // you can handle logo update separately if needed
    address: "",
    cell_no1: "",
    cell_no2: "",
    email: "",
    gst_no: "",
    pan_no: "",
    account_name: "",
    bank_name: "",
    branch_name: "",
    ifsc_code: "",
    account_number: "",
    website: "",
    subscription_type: "invoice",
    is_active: true,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setFormData({
        company_name: company.company_name || "",
        company_logo: company.company_logo || "",
        address: company.address || "",
        cell_no1: company.cell_no1 || "",
        cell_no2: company.cell_no2 || "",
        email: company.email || "",
        gst_no: company.gst_no || "",
        pan_no: company.pan_no || "",
        account_name: company.account_name || "",
        bank_name: company.bank_name || "",
        branch_name: company.branch_name || "",
        ifsc_code: company.ifsc_code || "",
        account_number: company.account_number || "",
        website: company.website || "",
        subscription_type: company.subscription_type || "invoice",
        is_active: company.is_active === 1 || company.is_active === true,
      });
    } else {
      setFormData({
        company_name: "",
        company_logo: "",
        address: "",
        cell_no1: "",
        cell_no2: "",
        email: "",
        gst_no: "",
        pan_no: "",
        account_name: "",
        bank_name: "",
        branch_name: "",
        ifsc_code: "",
        account_number: "",
        website: "",
        subscription_type: "invoice",
        is_active: true,
      });
    }
  }, [company, open]);

  const authHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === "edit" && company?.id) {
        await axios.put(`${API_BASE_URL}/api/admin/companies/${company.id}`, formData, {
          headers: { ...authHeaders(), "Content-Type": "application/json" },
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/admin/companies`, formData, {
          headers: { ...authHeaders(), "Content-Type": "application/json" },
        });
      }
      onSaveSuccess();
    } catch (error) {
      console.error(error);
      onError("Failed to save company");
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
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: primaryColor, fontWeight: 'bold' }}>
        {mode === "edit" ? "Edit Company" : "Add Company"}
        <IconButton
          onClick={handleClose}
          aria-label="close"
          size="small"
          sx={{ color: theme.palette.grey[500] }}
        >
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
        <TextField
          label="Company Name"
          fullWidth
          margin="dense"
          value={formData.company_name}
          onChange={(e) => handleChange("company_name", e.target.value)}
          autoFocus
          required
        />
        <TextField
          label="Email"
          fullWidth
          margin="dense"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />
        <TextField
          label="Address"
          fullWidth
          margin="dense"
          value={formData.address}
          onChange={(e) => handleChange("address", e.target.value)}
        />
        <TextField
          label="Phone 1"
          fullWidth
          margin="dense"
          value={formData.cell_no1}
          onChange={(e) => handleChange("cell_no1", e.target.value)}
        />
        <TextField
          label="Phone 2"
          fullWidth
          margin="dense"
          value={formData.cell_no2}
          onChange={(e) => handleChange("cell_no2", e.target.value)}
        />
        <TextField
          label="GST No"
          fullWidth
          margin="dense"
          value={formData.gst_no}
          onChange={(e) => handleChange("gst_no", e.target.value)}
        />
        <TextField
          label="PAN No"
          fullWidth
          margin="dense"
          value={formData.pan_no}
          onChange={(e) => handleChange("pan_no", e.target.value)}
        />
        <TextField
          label="Account Name"
          fullWidth
          margin="dense"
          value={formData.account_name}
          onChange={(e) => handleChange("account_name", e.target.value)}
        />
        <TextField
          label="Bank Name"
          fullWidth
          margin="dense"
          value={formData.bank_name}
          onChange={(e) => handleChange("bank_name", e.target.value)}
        />
        <TextField
          label="Branch Name"
          fullWidth
          margin="dense"
          value={formData.branch_name}
          onChange={(e) => handleChange("branch_name", e.target.value)}
        />
        <TextField
          label="IFSC Code"
          fullWidth
          margin="dense"
          value={formData.ifsc_code}
          onChange={(e) => handleChange("ifsc_code", e.target.value)}
        />
        <TextField
          label="Account Number"
          fullWidth
          margin="dense"
          value={formData.account_number}
          onChange={(e) => handleChange("account_number", e.target.value)}
        />
        <TextField
          label="Website"
          fullWidth
          margin="dense"
          value={formData.website}
          onChange={(e) => handleChange("website", e.target.value)}
        />

        <FormControl fullWidth margin="dense">
          <InputLabel id="subscription-label">Subscription Type</InputLabel>
          <Select
            labelId="subscription-label"
            label="Subscription Type"
            value={formData.subscription_type}
            onChange={(e) => handleChange("subscription_type", e.target.value)}
            sx={{ textTransform: "capitalize" }}
          >
            {subscriptionOptions.map((option) => (
              <MenuItem key={option} value={option} sx={{ textTransform: "capitalize" }}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={formData.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
            />
          }
          label="Active"
        />
      </DialogContent>
      <DialogActions sx={{p: 2}}>
        <Button onClick={handleClose} disabled={saving} sx={{textTransform: 'none'}}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{textTransform: 'none', mr: 2, borderRadius: '50px', color: '#fff'}}>
          {saving ? (mode === "edit" ? "Updating..." : "Adding...") : mode === "edit" ? "Update" : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddCompanyModal;
