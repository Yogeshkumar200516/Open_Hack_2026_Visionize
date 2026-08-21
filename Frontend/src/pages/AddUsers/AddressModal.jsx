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

const subscriptionOptions = ["invoice", "bill", "both"];

const BillingAddressModal = ({
  open,
  onClose,
  formData: initialFormData,
  onInputChange,
  onSubmit,
  isEditing,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);

  // Sync initialFormData changes into formData state
  useEffect(() => {
    setFormData(initialFormData);
  }, [initialFormData, open]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Also propagate changes upstream
    if (onInputChange) {
      const syntheticEvent = { target: { name: field, value } };
      onInputChange(syntheticEvent);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSubmit();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          minWidth: 300,
          border: `2px solid ${primaryColor}`,
          boxShadow: `0 0 15px ${primaryColor}`,
          borderRadius: "20px",
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
          msOverflowStyle: "none",
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
        }}
      >
        {isEditing ? "Edit Billing Address" : "Add Billing Address"}
        <IconButton
          onClick={onClose}
          aria-label="close"
          size="small"
          sx={{ color: theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          maxHeight: "70vh",
          overflowY: "auto",
          "&::-webkit-scrollbar": { display: "none" },
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        <TextField
          label="Address Name"
          fullWidth
          margin="dense"
          name="address_name"
          value={formData.address_name}
          onChange={(e) => handleChange("address_name", e.target.value)}
          required
          autoFocus
        />
        <TextField
          label="Address"
          fullWidth
          margin="dense"
          name="address"
          value={formData.address}
          onChange={(e) => handleChange("address", e.target.value)}
          required
          multiline
          minRows={2}
        />
        <TextField
          label="Cell No 1"
          fullWidth
          margin="dense"
          name="cell_no1"
          value={formData.cell_no1}
          onChange={(e) => handleChange("cell_no1", e.target.value)}
        />
        <TextField
          label="Cell No 2"
          fullWidth
          margin="dense"
          name="cell_no2"
          value={formData.cell_no2}
          onChange={(e) => handleChange("cell_no2", e.target.value)}
        />
        <TextField
          label="GST No"
          fullWidth
          margin="dense"
          name="gst_no"
          value={formData.gst_no}
          onChange={(e) => handleChange("gst_no", e.target.value)}
        />
        <TextField
          label="PAN No"
          fullWidth
          margin="dense"
          name="pan_no"
          value={formData.pan_no}
          onChange={(e) => handleChange("pan_no", e.target.value)}
        />
        <TextField
          label="Account Name"
          fullWidth
          margin="dense"
          name="account_name"
          value={formData.account_name}
          onChange={(e) => handleChange("account_name", e.target.value)}
        />
        <TextField
          label="Bank Name"
          fullWidth
          margin="dense"
          name="bank_name"
          value={formData.bank_name}
          onChange={(e) => handleChange("bank_name", e.target.value)}
        />
        <TextField
          label="Branch Name"
          fullWidth
          margin="dense"
          name="branch_name"
          value={formData.branch_name}
          onChange={(e) => handleChange("branch_name", e.target.value)}
        />
        <TextField
          label="IFSC Code"
          fullWidth
          margin="dense"
          name="ifsc_code"
          value={formData.ifsc_code}
          onChange={(e) => handleChange("ifsc_code", e.target.value)}
        />
        <TextField
          label="Account Number"
          fullWidth
          margin="dense"
          name="account_number"
          value={formData.account_number}
          onChange={(e) => handleChange("account_number", e.target.value)}
        />
        <TextField
          label="Email"
          fullWidth
          margin="dense"
          name="email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />
        <TextField
          label="Website"
          fullWidth
          margin="dense"
          name="website"
          value={formData.website}
          onChange={(e) => handleChange("website", e.target.value)}
        />


        
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          sx={{
            textTransform: "none",
            mr: 2,
            borderRadius: "50px",
            color: "#fff",
          }}
        >
          {saving ? (isEditing ? "Updating..." : "Adding...") : isEditing ? "Update" : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BillingAddressModal;
