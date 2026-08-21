import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import PrivacyTipOutlinedIcon from "@mui/icons-material/PrivacyTipOutlined";
import API_BASE_URL from "../../Context/Api";

const CompanyInfoModal = ({ open, handleClose }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { palette, shadows } = theme;
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [formData, setFormData] = useState({
    company_name: "",
    address: "",
    cell_no1: "",
    cell_no2: "",
    gst_no: "",
    pan_no: "",
    account_name: "",
    bank_name: "",
    branch_name: "",
    ifsc_code: "",
    account_number: "",
    email: "",
    website: "",
    company_logo: "",
  });
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Fetch company info when modal opens
  useEffect(() => {
    if (open) fetchCompanyInfo();
  }, [open]);

  // Preview uploaded logo
  useEffect(() => {
    if (!logo) {
      setLogoPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(logo);
    setLogoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logo]);

  const fetchCompanyInfo = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Auth token missing");

      const { data } = await axios.get(`${API_BASE_URL}/api/company/info`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data && data.company_name) {
        setFormData(data);
        setIsEdit(true);
      } else {
        // Reset form if no data
        setFormData({
          company_name: "",
          address: "",
          cell_no1: "",
          cell_no2: "",
          gst_no: "",
          pan_no: "",
          account_name: "",
          bank_name: "",
          branch_name: "",
          ifsc_code: "",
          account_number: "",
          email: "",
          website: "",
          company_logo: "",
        });
        setIsEdit(false);
      }
      setLogo(null);
    } catch (err) {
      console.error("Fetch error:", err);
      showSnackbar("Failed to load company info.", "error");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLogo(e.target.files[0]);
    }
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Auth token missing");

      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "company_logo") return;
        data.append(key, value);
      });
      if (logo) data.append("company_logo", logo);

      const url = `${API_BASE_URL}/api/company/${isEdit ? "update" : "add"}`;
      const method = isEdit ? "put" : "post";

      await axios({
        method,
        url,
        data,
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      showSnackbar(
        `Company info ${isEdit ? "updated" : "saved"} successfully!`,
        "success"
      );
      handleClose();
    } catch (err) {
      console.error("Save error:", err);
      showSnackbar("Failed to save company info.", "error");
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="company-info-modal"
        closeAfterTransition
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: isMobile ? "95%" : "90%",
            maxWidth: 500,
            height: "90vh",
            bgcolor: palette.background.paper,
            color: palette.text.primary,
            borderRadius: "20px",
            boxShadow: `0 0 20px ${palette.primary.main}`,
            display: "flex",
            flexDirection: "column",
            p: 0,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              flexShrink: 0,
              px: 3,
              py: 2,
              borderBottom: `1px solid ${palette.divider}`,
              bgcolor: palette.background.default,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTopLeftRadius: "20px",
              borderTopRightRadius: "20px",
            }}
          >
            <Box sx={{ display: "flex", gap: "8px", color: palette.primary.main }}>
              <PrivacyTipOutlinedIcon
                sx={{
                  fontSize: { xs: "24px", sm: "28px" },
                  fontWeight: "bold",
                }}
              />
              <Typography
                id="company-info-modal"
                fontWeight={800}
                letterSpacing={0.5}
                sx={{
                  fontSize: { xs: "18px", sm: "20px" },
                  fontWeight: "bold",
                }}
              >
                {isEdit ? "Edit" : "Add"} Company Info
              </Typography>
            </Box>
            <IconButton onClick={handleClose} aria-label="close modal">
              <CloseIcon fontSize="inherit" />
            </IconButton>
          </Box>

          {/* Scrollable content */}
          <Box
            sx={{
              flexGrow: 1,
              overflowY: "auto",
              px: 3,
              py: 2,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {[
              { label: "Company Name", name: "company_name", placeholder: "Enter company name" },
              { label: "Address", name: "address", placeholder: "Enter company address" },
              { label: "Cell No 1", name: "cell_no1", placeholder: "Enter primary contact number" },
              { label: "Cell No 2", name: "cell_no2", placeholder: "Enter secondary contact number" },
              { label: "GST No", name: "gst_no", placeholder: "Enter GST number" },
              { label: "PAN No", name: "pan_no", placeholder: "Enter PAN number" },
              { label: "Account Name", name: "account_name", placeholder: "Enter account holder name" },
              { label: "Bank Name", name: "bank_name", placeholder: "Enter bank name" },
              { label: "Branch Name", name: "branch_name", placeholder: "Enter branch name" },
              { label: "IFSC Code", name: "ifsc_code", placeholder: "Enter IFSC code" },
              { label: "Account Number", name: "account_number", placeholder: "Enter bank account number" },
              { label: "Email", name: "email", placeholder: "Enter company email" },
              { label: "Website", name: "website", placeholder: "Enter company website" },
            ].map(({ label, name, placeholder }) => (
              <Box key={name} sx={{ mb: 3 }}>
                <Typography
                  component="label"
                  htmlFor={name}
                  sx={{
                    mb: 1,
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: palette.text.secondary,
                  }}
                >
                  {label}
                </Typography>
                <TextField
                  id={name}
                  name={name}
                  placeholder={placeholder}
                  fullWidth
                  value={formData[name] || ""}
                  onChange={handleChange}
                  variant="outlined"
                  size="medium"
                />
              </Box>
            ))}

            <Box sx={{ mb: 3 }}>
              <Typography sx={{ mb: 1, fontWeight: 700, fontSize: "0.9rem", color: palette.text.secondary }}>
                Upload Company Logo
              </Typography>
              <Button variant="outlined" component="label" sx={{ mb: 1 }}>
                Choose File
                <input type="file" hidden accept="image/*" onChange={handleLogoChange} />
              </Button>
              {(logo || formData.company_logo) && (
                <Typography sx={{ fontStyle: "italic", fontSize: "0.9rem" }}>
                  {logo?.name || formData.company_logo}
                </Typography>
              )}
            </Box>

            {/* Logo Preview */}
            {(logoPreview || formData.company_logo) && (
              <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
                <img
                  src={logoPreview ? logoPreview : `${API_BASE_URL}/uploads/logos/${formData.company_logo}`}
                  alt="Company Logo Preview"
                  style={{
                    maxHeight: 120,
                    maxWidth: "100%",
                    borderRadius: 10,
                    border: `1.5px solid ${palette.divider}`,
                    boxShadow: shadows[4],
                    objectFit: "contain",
                  }}
                />
              </Box>
            )}
          </Box>

          {/* Footer */}
          <Box
            sx={{
              flexShrink: 0,
              px: 3,
              py: 2,
              borderTop: `1px solid ${palette.divider}`,
              bgcolor: palette.background.default,
              display: "flex",
              justifyContent: "flex-end",
              borderBottomLeftRadius: "20px",
              borderBottomRightRadius: "20px",
            }}
          >
            <Button
              variant="outlined"
              onClick={handleSubmit}
              sx={{
                fontWeight: "bold",
                textTransform: "none",
                borderRadius: "20px",
                px: 3,
                color: palette.primary.main,
                border: `2px solid ${palette.primary.main}`,
                transition: "background-color 0.3s",
                "&:hover": {
                  boxShadow: `0 0 8px ${palette.primary.main}`,
                  filter: "brightness(1.1)",
                },
              }}
            >
              {isEdit ? "Update" : "Add"}
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          elevation={6}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CompanyInfoModal;
