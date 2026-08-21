import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  useTheme,
  Box,
  IconButton,
  MenuItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import dayjs from "dayjs";

const AdvancePaymentEditModal = ({ open, onClose, invoiceData, onSave }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;

  const [formData, setFormData] = useState({
    advance_amount: "",
    due_date: "",
    payment_status: "Advance",
    settled_date: dayjs().format("YYYY-MM-DD"),
  });

  const [balanceAmount, setBalanceAmount] = useState(0);

  useEffect(() => {
    if (invoiceData) {
      const advance = invoiceData.advance_amount || 0;
      const total = invoiceData.total_amount || 0;

      setFormData({
        advance_amount: advance,
        due_date: invoiceData.due_date
          ? dayjs(invoiceData.due_date).format("YYYY-MM-DD")
          : "",
        payment_status: invoiceData.payment_status || "Advance",
        settled_date: invoiceData.payment_settlement_date
          ? dayjs(invoiceData.payment_settlement_date).format("YYYY-MM-DD")
          : dayjs().format("YYYY-MM-DD"),
      });

      setBalanceAmount(total - advance);
    }
  }, [invoiceData]);

  useEffect(() => {
    const advance = parseFloat(formData.advance_amount || 0);
    const total = parseFloat(invoiceData?.total_amount || 0);
    setBalanceAmount(advance <= 0 ? 0 : Math.max(0, total - advance));
  }, [formData.advance_amount, invoiceData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!formData.advance_amount || parseFloat(formData.advance_amount) < 0) {
      alert("Advance amount must be a valid positive number.");
      return;
    }
    if (
      formData.payment_status === "Full Payment" &&
      (!formData.settled_date || formData.settled_date.trim() === "")
    ) {
      alert("Please select a settlement date for full payment.");
      return;
    }

    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="body">
      {/* Header */}
      <Box
        sx={{
          backgroundColor: isDark ? "#121212" : "#f5f5f5",
          color: isDark ? "#fff" : "#222",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 3,
          py: 2,
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <DialogTitle sx={{ m: 0, p: 0, fontSize: "1.2rem", fontWeight: 'bold', color: primaryColor }}>
          Advance Payment Summary
        </DialogTitle>
        <IconButton onClick={onClose} sx={{ color: "inherit" }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Scrollable Content */}
      <DialogContent
        dividers
        sx={{
          backgroundColor: isDark ? "#1a1a1a" : "#fafafa",
          px: 3,
          py: 3,
          maxHeight: "60vh",
          overflowY: "auto",
          scrollbarWidth: "none",
            msOverflowStyle: "none",
            "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {/* Summary Box */}
        <Box
          sx={{
            borderRadius: 2,
            mb: 3,
            p: 2,
            backgroundColor: isDark ? "#232323" : "#f0f0f0",
            boxShadow: isDark
              ? "0 0 5px rgba(255,255,255,0.05)"
              : "0 2px 6px rgba(0,0,0,0.05)",
          }}
        >
          <Typography variant="subtitle2" sx={{ color: isDark ? "#bbb" : "#666" }}>
            Total Amount
          </Typography>
          <Typography
            variant="h6"
            sx={{ fontWeight: "bold", color: isDark ? "#f5f5f5" : "#222" }}
          >
            ₹ {parseFloat(invoiceData?.total_amount || 0).toFixed(2)}
          </Typography>

          <Box mt={2}>
            <Typography variant="subtitle2" sx={{ color: isDark ? "#bbb" : "#666" }}>
              Balance Amount
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color:
                  balanceAmount === 0
                    ? theme.palette.success.main
                    : theme.palette.error.main,
              }}
            >
              ₹ {balanceAmount.toFixed(2)}
            </Typography>
          </Box>
        </Box>

        {/* Form Fields */}
        <Box mb={2}>
          <TextField
            fullWidth
            label="Advance Amount"
            name="advance_amount"
            value={formData.advance_amount}
            onChange={handleChange}
            type="number"
            inputProps={{ min: 0 }}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: isDark ? "#2c2c2c" : "#fff",
              },
            }}
          />
        </Box>

        <Box mb={2}>
          <TextField
            fullWidth
            label="Due Date"
            name="due_date"
            type="date"
            value={formData.due_date}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: isDark ? "#2c2c2c" : "#fff",
              },
            }}
          />
        </Box>

        <Box mb={2}>
          <TextField
            fullWidth
            select
            label="Payment Status"
            name="payment_status"
            value={formData.payment_status}
            onChange={handleChange}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: isDark ? "#2c2c2c" : "#fff",
              },
            }}
          >
            <MenuItem value="Advance">Advance</MenuItem>
            <MenuItem value="Full Payment">Full Payment</MenuItem>
          </TextField>
        </Box>

        {formData.payment_status === "Full Payment" && (
          <Box mb={2}>
            <TextField
              fullWidth
              label="Settlement Date"
              name="settled_date"
              type="date"
              value={formData.settled_date}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: isDark ? "#2c2c2c" : "#fff",
                },
              }}
            />
          </Box>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions
        sx={{
          backgroundColor: isDark ? "#121212" : "#f5f5f5",
          px: 3,
          py: 2,
          position: "sticky",
          bottom: 0,
          zIndex: 10,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderColor: theme.palette.divider,
            color: isDark ? "#ccc" : "#333",
            textTransform: 'none',
            borderRadius: '20px',
          }}
        >
          Cancel
        </Button>
        <Button variant="outlined" onClick={handleSubmit} 
            sx={{
              color: primaryColor,
              border: `2px solid ${primaryColor}`,
              fontWeight: 'bold',
              textTransform: 'none',
              borderRadius: '20px',
              "&:hover": {
                        boxShadow: `0 0 8px ${primaryColor}`,
                      },
            }}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdvancePaymentEditModal;
