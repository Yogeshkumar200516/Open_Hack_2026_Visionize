import React, {useState} from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  Divider,
  useTheme,
  IconButton,
  Grid,
  TableContainer,
  Paper,
  Snackbar,
  Alert,
  Backdrop,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import SendIcon from "@mui/icons-material/Send";
import { generateInvoicePDF } from "../../components/PDFGeneration/DownloadInvoice";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { sendInvoicePDF } from "../../components/PDFGeneration/SendInvoice";
import { generateBillPDF } from "../../components/PDFGeneration/DownloadBill";
import { generateInvoiceListPDF } from "../../components/PDFGeneration/DownloadInvoiceList";
import PermContactCalendarOutlinedIcon from '@mui/icons-material/PermContactCalendarOutlined';
import { sendInvoiceOrBill } from "../../utils/sendInvoice/Bill";
import RoomPreferencesOutlinedIcon from '@mui/icons-material/RoomPreferencesOutlined';

function InvoicePreviewModal({ open, onClose, invoice, bill }) {
  const theme = useTheme();
  const themeColor = theme.palette.primary.main;
  const isDark = theme.palette.mode === "dark";
  dayjs.extend(utc);
  dayjs.extend(timezone);

  const subscriptionType = localStorage.getItem("subscriptionType");
  const [isBill, setIsBill] = useState(subscriptionType);

  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Helper to get token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem("authToken");
  };

const handleDownloadPDFClick = async () => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    setSnackbar({
      open: true,
      message: "Authentication required. Please login.",
      severity: "error",
    });
    return;
  }

  try {
    const isActuallyBill = !!bill || (subscriptionType === "bill" && !!invoice);
    const data = bill || invoice;

    if (isActuallyBill) {
      await generateBillPDF(data);
    } else {
      await generateInvoicePDF(data, false, token);
    }
  } catch (error) {
    console.error("PDF generation failed:", error);
    setSnackbar({
      open: true,
      message: "PDF generation failed. Please try again.",
      severity: "error",
    });
  }
};

const handleSend = async () => {
  setLoading(true);

  const token = localStorage.getItem("authToken");
  if (!token) {
    setSnackbar({
      open: true,
      message: "Please login first to send invoice/bill.",
      severity: "error",
    });
    setLoading(false);
    return;
  }

  try {
    let pdfResult;
    let number, customerEmail;
    const isActuallyBill = !!bill || (subscriptionType === "bill" && !!invoice);
    const data = bill || invoice;

    if (isActuallyBill) {
      number = data.bill_number || data.billNo;
      customerEmail = data.customer_email || data.email;
      if (!customerEmail) {
        setSnackbar({
          open: true,
          message: "Customer email is missing for Bill. Please provide an email.",
          severity: "error",
        });
        setLoading(false);
        return;
      }
      pdfResult = await sendInvoicePDF(data, true, token); 
    } else {
      number = data.invoice_number || data.invoiceNo;
      customerEmail = data.customer_email || data.email;

      if (!customerEmail) {
        setSnackbar({
          open: true,
          message: "Customer email is missing for Invoice. Please provide an email.",
          severity: "error",
        });
        setLoading(false);
        return;
      }
      pdfResult = await sendInvoicePDF(data, false, token);
    }

    if (!pdfResult.success) {
      setSnackbar({
        open: true,
        message: "PDF generation failed: " + pdfResult.message,
        severity: "error",
      });
      setLoading(false);
      return;
    }

    let pdfBase64;
    if (pdfResult.blob) {
      pdfBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(pdfResult.blob);
      });
    } else {
      pdfBase64 = pdfResult.base64;
    }

    const result = await sendInvoiceOrBill({
      type: subscriptionType,
      number,
      customerEmail,
      pdfBase64,
      token,
    });

    console.log("📨 Backend response:", result);

    if (result.success) {
      setSnackbar({
        open: true,
        message: `${subscriptionType === "bill" ? "Bill" : "Invoice"} sent successfully!`,
        severity: "success",
      });
    } else {
      setSnackbar({
        open: true,
        message: `Send failed: ${result.message}`,
        severity: "error",
      });
    }
  } catch (error) {
    setSnackbar({
      open: true,
      message: error.message || "Error sending PDF",
      severity: "error",
    });
  } finally {
    setLoading(false);
  }
};







  if (!invoice) return null;

  const formatCurrency = (val) => {
    const num = Number(val);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  const balance = invoice.total_amount - invoice.advance_amount;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: "90vh",
          borderRadius: 3,
          border: `1px solid ${themeColor}`,
          boxShadow: `0 0 10px ${themeColor}`,
          width: { xs: "95%", sm: "90%", md: "85%", lg: "auto", },
          margin: "auto", 
        },
      }}
    >
      {subscriptionType != 'bill' && (
        <>
        <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: isDark ? "#000" : "#fafcfa",
          color: themeColor,
          fontWeight: 600,
          fontSize: 20,
          px: 3,
          py: 2,
        }}
      >
        Invoice Preview - {invoice.invoice_number}
        <IconButton onClick={onClose} color="info">
          <CloseIcon sx={{ color: themeColor }} />
        </IconButton>
      </DialogTitle>
        </>
      )}
      

      {subscriptionType === 'bill' && (
        <>
        <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: isDark ? "#000" : "#fafcfa",
          color: themeColor,
          fontWeight: 600,
          fontSize: 20,
          px: 3,
          py: 2,
        }}
      >
        Bill Preview - {invoice.bill_number}
        <IconButton onClick={onClose} color="info">
          <CloseIcon sx={{ color: themeColor }} />
        </IconButton>
      </DialogTitle>
        </>
      )}

      <DialogContent
        dividers
        sx={{
          px: { xs: 2, sm: 4 },
          py: { xs: 2, sm: 3 },
          maxHeight: "75vh",
          overflowY: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          backgroundColor: isDark ? "#000" : "white",
        }}
      >
        {subscriptionType != 'bill' && (
          <>
          <Typography
  variant="subtitle1"
  gutterBottom
  sx={{
    display: "flex",
    alignItems: "center",
    color: themeColor,
    fontSize: { xs: "0.9rem", sm: "1rem" },
    fontWeight: "bold",
    gap: 1, // spacing between icon and text
  }}
>
  <RoomPreferencesOutlinedIcon
    sx={{
      fontSize: { xs: "1.2rem", sm: "1.5rem" }, // responsive icon size
      color: themeColor,
    }}
  />
  Company Details
</Typography>

        

        <Box
          sx={{
            border: `1px solid ${themeColor}`,
            borderRadius: "10px",
            backgroundColor: theme.palette.background.paper,
            p: { xs: 2, sm: 3 },
            mb: 3,
          }}
        >
        {subscriptionType != 'bill' && (() => {
          // Use billing_address fields if available, fall back to company info
          const co = invoice.company || {};
          const companyName    = invoice.billing_address_name       || co.company_name    || "-";
          const companyMobile  = invoice.billing_address_cell_no1   || co.cell_no1        || "-";
          const companyAddress = invoice.billing_address_address    || co.address         || "-";
          const companyGst     = invoice.billing_address_gst_no     || co.gst_no          || "-";
          const companyPan     = invoice.billing_address_pan_no     || co.pan_no          || "-";
          const companyAccName = invoice.billing_address_account_name || co.account_name  || "-";
          const companyBank    = invoice.billing_address_bank_name  || co.bank_name       || "-";
          const companyBranch  = invoice.billing_address_branch_name || co.branch_name    || "-";
          const companyAccNo   = invoice.billing_address_account_number || co.account_number || "-";
          const companyIfsc    = invoice.billing_address_ifsc_code  || co.ifsc_code       || "-";
          const companyEmail   = invoice.billing_address_email      || co.email           || "-";

          return (
            <>
          {/* Name & Mobile */}
          <Grid container spacing={2} mb={2} sx={{ justifyContent: "space-between" }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Address Name :</strong>{" "}
                <Box component="span" sx={{ color: isDark ? "#cfd3d3" : "#3e3e3e", fontWeight: 900 }}>
                  {companyName}
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor, fontWeight: "bold", textAlign: { xs: "left", sm: "right" } }}>
                Mobile :{" "}
                <Box component="span" sx={{ color: isDark ? "#cfd3d3" : "#3e3e3e", fontWeight: 900 }}>
                  {companyMobile}
                </Box>
              </Typography>
            </Grid>
          </Grid>

          {/* Address */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ color: themeColor, fontWeight: "bold", mb: 0.5 }}>Address :</Typography>
            <Typography variant="body2" sx={{ color: isDark ? "#cfd3d3" : "#3e3e3e", whiteSpace: "pre-line", pl: 1 }}>
              {companyAddress}
            </Typography>
          </Box>

          {/* GST & PAN */}
          <Grid container spacing={2} mb={2} sx={{ justifyContent: "space-between" }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>GST No. :</strong>{" "}
                <Box component="span" sx={{ color: isDark ? "#cfd3d3" : "#3e3e3e", fontWeight: 500 }}>{companyGst}</Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor, fontWeight: "bold", textAlign: { xs: "left", sm: "right" } }}>
                PAN No. :{" "}
                <Box component="span" sx={{ color: isDark ? "#cfd3d3" : "#3e3e3e", fontWeight: 500 }}>{companyPan}</Box>
              </Typography>
            </Grid>
          </Grid>

          {/* Bank Details */}
          <Grid container spacing={2} mb={2} sx={{ justifyContent: "space-between" }}>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Account Name :</strong>{" "}
                <Box component="span" sx={{ color: isDark ? "#cfd3d3" : "#3e3e3e", fontWeight: 500 }}>{companyAccName}</Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" sx={{ color: themeColor, fontWeight: "bold", textAlign: { xs: "left", sm: "center" } }}>
                Bank Name. :{" "}
                <Box component="span" sx={{ color: isDark ? "#cfd3d3" : "#3e3e3e", fontWeight: 500 }}>{companyBank}</Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" sx={{ color: themeColor, fontWeight: "bold", textAlign: { xs: "left", sm: "right" } }}>
                Branch :{" "}
                <Box component="span" sx={{ color: isDark ? "#cfd3d3" : "#3e3e3e", fontWeight: 500 }}>{companyBranch}</Box>
              </Typography>
            </Grid>
          </Grid>
          <Grid container spacing={2} mb={2} sx={{ justifyContent: "space-between" }}>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Account. No :</strong>{" "}
                <Box component="span" sx={{ color: isDark ? "#cfd3d3" : "#3e3e3e", fontWeight: 500 }}>{companyAccNo}</Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" sx={{ color: themeColor, fontWeight: "bold", textAlign: { xs: "left", sm: "center" } }}>
                IFSC Code :{" "}
                <Box component="span" sx={{ color: isDark ? "#cfd3d3" : "#3e3e3e", fontWeight: 500 }}>{companyIfsc}</Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" sx={{ color: themeColor, fontWeight: "bold", textAlign: { xs: "left", sm: "right" } }}>
                Email :{" "}
                <Box component="span" sx={{ color: isDark ? "#cfd3d3" : "#3e3e3e", fontWeight: 500 }}>{companyEmail}</Box>
              </Typography>
            </Grid>
          </Grid>
            </>
          );
        })()}
        </Box>
          </>
        )}


        {/* Customer Info */}
        <Typography
  variant="subtitle1"
  gutterBottom
  sx={{
    display: "flex",
    alignItems: "center",
    color: themeColor,
    fontSize: { xs: "0.9rem", sm: "1rem" },
    fontWeight: "bold",
    gap: 1, // spacing between icon and text
  }}
>
  <PermContactCalendarOutlinedIcon
    sx={{
      fontSize: { xs: "1.1rem", sm: "1.3rem" }, // responsive icon size
      color: themeColor,
    }}
  />
  Customer Information
</Typography>
        <Typography
          variant="subtitle1"
          gutterBottom
          sx={{
            color: isDark ? "#cfd3d3" : "#3e3e3e",
            fontSize: { xs: "0.8rem", sm: "0.9rem" },
            fontWeight: "bold",
          }}
        >
          Buyer Details
        </Typography>

        <Box
          sx={{
            border: `1px solid ${themeColor}`,
            borderRadius: "10px",
            backgroundColor: theme.palette.background.paper,
            p: { xs: 2, sm: 3 },
            mb: 2,
          }}
        >
          {subscriptionType != 'bill' && (
            <>
            {/* Name & Mobile */}
          <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Name :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 900,
                  }}
                >
                  {invoice.customer_name || "-"}
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Mobile :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 900,
                  }}
                >
                  {invoice.customer_mobile || "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>
            </>
          )}

          {subscriptionType === 'bill' && (
            <>
            {/* Name & Mobile */}
          <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Name :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 900,
                  }}
                >
                  {invoice.customer_name || "-"}
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Mobile :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 900,
                  }}
                >
                  {invoice.mobile_no || "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>
            </>
          )}

          {subscriptionType === 'bill' && (
            <>
            <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Bill No. :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.bill_number || "-"}
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Date :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.created_at
                    ? dayjs
                        .utc(invoice.created_at)
                        .tz("Asia/Kolkata")
                        .format("DD-MM-YYYY - hh:mm A")
                    : "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>
            </>
          )}

          {subscriptionType != 'bill' && (
            <>
            {/* Address */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              sx={{ color: themeColor, fontWeight: "bold", mb: 0.5 }}
            >
              Address :
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: isDark ? "#cfd3d3" : "#3e3e3e",
                whiteSpace: "pre-line",
                pl: 1,
              }}
            >
              {[invoice.customer_address, invoice.customer_state, invoice.customer_pincode]
                .filter(Boolean)
                .join(", ") || "-"}
            </Typography>
          </Box>

          {/* GST & Invoice No. */}
          <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>GST No. :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.customer_gst_number || "-"}
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Invoice No. :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.invoice_number || "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>

          <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Email :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.customer_email || "-"}
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                WhatsApp No. :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.customer_whatsapp_number || "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>
            </>
          )}

          <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Payment Mode :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.payment_type || "-"}
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Payment Status :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.payment_status || "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>

          <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Advance Amount :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  ₹{invoice.advance_amount || "-"}
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
  <Typography
    variant="body2"
    sx={{
      color: themeColor,
      fontWeight: "bold",
      textAlign: { xs: "left", sm: "center" },
    }}
  >
    Due Date :{" "}
    <Box
      component="span"
      sx={{
        color: isDark ? "#cfd3d3" : "#3e3e3e",
        fontWeight: 500,
      }}
    >
      {invoice.due_date
        ? new Date(invoice.due_date)
            .toLocaleDateString("en-GB") // dd/mm/yyyy
            .replace(/\//g, "-")        // convert to dd-mm-yyyy
        : "-"}
    </Box>
  </Typography>
</Grid>

            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Balance Amount:{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  ₹{balance.toFixed(2) || "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>

          {subscriptionType != 'bill' && (
            <>
            {/* Place of Supply & Vehicle No. */}
          <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Place of Supply :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.place_of_supply || "-"}
                </Box>
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "center" },
                }}
              >
                Vehicle No. :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.vehicle_number || "-"}
                </Box>
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Date :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.created_at
                    ? dayjs
                        .utc(invoice.created_at)
                        .tz("Asia/Kolkata")
                        .format("DD-MM-YYYY - hh:mm A")
                    : "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>
            </>
          )}
        </Box>


        {subscriptionType != 'bill' && (
          <>
          {/* Customer Info */}
        <Typography
          variant="subtitle1"
          gutterBottom
          sx={{
            color: isDark ? "#cfd3d3" : "#3e3e3e",
            fontSize: { xs: "0.8rem", sm: "0.9rem" },
            fontWeight: "bold",
          }}
        >
          Consignee Details
        </Typography>

        <Box
          sx={{
            border: `1px solid ${themeColor}`,
            borderRadius: "10px",
            backgroundColor: theme.palette.background.paper,
            p: { xs: 2, sm: 3 },
            mb: 3,
          }}
        >
          {subscriptionType != 'bill' && (
            <>
            {/* Name & Mobile */}
          <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Name :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 900,
                  }}
                >
                  {invoice.consignee_name || "-"}
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Mobile :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 900,
                  }}
                >
                  {invoice.consignee_mobile || "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>
            </>
          )}

          {subscriptionType === 'bill' && (
            <>
            {/* Name & Mobile */}
          <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Name :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 900,
                  }}
                >
                  {invoice.customer_name || "-"}
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Mobile :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 900,
                  }}
                >
                  {invoice.mobile_no || "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>
            </>
          )}

          {subscriptionType === 'bill' && (
            <>
            <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Bill No. :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.bill_number || "-"}
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Date :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.created_at
                    ? dayjs
                        .utc(invoice.created_at)
                        .tz("Asia/Kolkata")
                        .format("DD-MM-YYYY - hh:mm A")
                    : "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>
            </>
          )}

          {subscriptionType != 'bill' && (
            <>
            {/* Address */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              sx={{ color: themeColor, fontWeight: "bold", mb: 0.5 }}
            >
              Address :
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: isDark ? "#cfd3d3" : "#3e3e3e",
                whiteSpace: "pre-line",
                pl: 1,
              }}
            >
              {[invoice.consignee_address, invoice.consignee_state, invoice.consignee_pincode]
                .filter(Boolean)
                .join(", ") || "-"}
            </Typography>
          </Box>

          {/* GST & Invoice No. */}
          <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>GST No. :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.consignee_gst_number || "-"}
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Invoice No. :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.consignee_email || "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>
            </>
          )}

          

          {subscriptionType != 'bill' && (
            <>
            {/* Place of Supply & Vehicle No. */}
          <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Place of Supply :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.place_of_supply || "-"}
                </Box>
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "center" },
                }}
              >
                Vehicle No. :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.vehicle_number || "-"}
                </Box>
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Date :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.created_at
                    ? dayjs
                        .utc(invoice.created_at)
                        .tz("Asia/Kolkata")
                        .format("DD-MM-YYYY - hh:mm A")
                    : "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>
            </>
          )}
        </Box>
          </>
        )}

        {/* {subscriptionType != "bill" && (
          <>
          <Typography
          variant="subtitle1"
          gutterBottom
          sx={{
            color: isDark ? "#cfd3d3" : "#3e3e3e",
            fontSize: { xs: "0.8rem", sm: "0.9rem" },
            fontWeight: "bold",
          }}
        >
          Transport Details
        </Typography>

        <Box
          sx={{
            border: `1px solid ${themeColor}`,
            borderRadius: "10px",
            backgroundColor: theme.palette.background.paper,
            p: { xs: 2, sm: 3 },
            mb: 3,
          }}
        >
            <>
          <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Transporter Name :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 900,
                  }}
                >
                  {invoice.transport_name || "-"}
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Mobile :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 900,
                  }}
                >
                  {invoice.consignee_mobile || "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>
            </>


            
            <>
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              sx={{ color: themeColor, fontWeight: "bold", mb: 0.5 }}
            >
              Address :
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: isDark ? "#cfd3d3" : "#3e3e3e",
                whiteSpace: "pre-line",
                pl: 1,
              }}
            >
              {[invoice.consignee_address, invoice.consignee_state, invoice.consignee_pincode]
                .filter(Boolean)
                .join(", ") || "-"}
            </Typography>
          </Box>

          <>
            <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>eWay Bill No. :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.eway_bill_no || "-"}
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Value of Goods (₹) :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.total_amount || "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>
            </>

            <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Bill Date :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.eway_bill_date
                    ? dayjs
                        .utc(invoice.eway_bill_date)
                        .tz("Asia/Kolkata")
                        .format("DD-MM-YYYY")
                    : "-"}
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Valid Upto :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.eway_valid_upto
                    ? dayjs
                        .utc(invoice.eway_valid_upto)
                        .tz("Asia/Kolkata")
                        .format("DD-MM-YYYY")
                    : "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>

          <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Transporter GST No. :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.transporter_gst_number || "-"}
                </Box>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Transport Distance :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.transport_distance || "-"} KM
                </Box>
              </Typography>
            </Grid>
          </Grid>
            </>

          

            <>
          <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Place of Dispatch :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.place_of_dispatch || "-"}
                </Box>
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "center" },
                }}
              >
                Vehicle No. :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.vehicle_number || "-"}
                </Box>
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Transport Mode :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.transport_mode || "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>
            </>

            <>
          <Grid
            container
            spacing={2}
            mb={2}
            sx={{ justifyContent: "space-between" }}
          >
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" sx={{ color: themeColor }}>
                <strong>Transaction Type :</strong>{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.transaction_type || "-"}
                </Box>
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "center" },
                }}
              >
                Supply Type :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.supply_type || "-"}
                </Box>
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography
                variant="body2"
                sx={{
                  color: themeColor,
                  fontWeight: "bold",
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Document Type :{" "}
                <Box
                  component="span"
                  sx={{
                    color: isDark ? "#cfd3d3" : "#3e3e3e",
                    fontWeight: 500,
                  }}
                >
                  {invoice.document_type || "-"}
                </Box>
              </Typography>
            </Grid>
          </Grid>
            </>
        </Box>
          </>
        )} */}

        <Divider sx={{ my: 3, borderColor: themeColor }} />

        <Typography
          variant="subtitle1"
          gutterBottom
          sx={{
            color: themeColor,
            fontSize: { xs: "0.9rem", sm: "1rem" },
            fontWeight: "bold",
          }}
        >
          📦 Product Details
        </Typography>

        <Box sx={{ overflowX: "auto" }}>
          <TableContainer
            component={Paper}
            sx={{
              backgroundColor: "#000",
              mb: 2,
              border: `1px solid ${themeColor}`,
              minWidth: "800px",
              borderRadius: "10px",
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{ backgroundColor: theme.palette.background.default }}
                >
                  {[
                    "Product",
                    "HSN",
                    "Qty",
                    "Unit",
                    "Rate",
                    "GST%",
                    "Discount",
                    "Base Amt",
                    "Total (incl GST)",
                    "Category",
                  ].map((head, idx) => (
                    <TableCell
                      key={idx}
                      sx={{
                        color: themeColor,
                        fontWeight: "bold",
                        fontSize: "0.85rem",
                      }}
                    >
                      {head}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item, index) => (
                    <TableRow
                      key={item.item_id || index}
                      sx={{
                        backgroundColor: theme.palette.background.paper,
                      }}
                    >
                      <TableCell sx={{ color: isDark ? "#fff" : "#424242" }}>
                        {item.product_name || "-"}
                      </TableCell>
                      <TableCell sx={{ color: isDark ? "#fff" : "#424242" }}>
                        {item.hsn_code || "-"}
                      </TableCell>
                      <TableCell sx={{ color: isDark ? "#fff" : "#424242" }}>
                        {item.quantity}
                      </TableCell>
                      <TableCell sx={{ color: isDark ? "#fff" : "#424242" }}>
                        {item.unit || "-"}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: isDark ? "#fff" : "#424242" }}
                      >
                        ₹{formatCurrency(item.rate)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: isDark ? "#fff" : "#424242" }}
                      >
                        {item.gst_percentage || 0}%
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: isDark ? "#fff" : "#424242" }}
                      >
                        {item.discount || 0}%
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: isDark ? "#fff" : "#424242" }}
                      >
                        ₹{formatCurrency(item.base_amount)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: isDark ? "#fff" : "#424242",
                          fontWeight: "bold",
                        }}
                      >
                        ₹{formatCurrency(item.total_with_gst)}
                      </TableCell>
                      <TableCell sx={{ color: isDark ? "#fff" : "#424242" }}>
                        {item.category_name || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      sx={{ textAlign: "center", color: "#aaa" }}
                    >
                      Please select product(s) to display details.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Divider sx={{ my: 3, borderColor: themeColor }} />

        {/* Summary */}
        <Box>
          {/* Title */}
          <Typography
            variant="h6"
            sx={{
              color: themeColor,
              fontWeight: "bold",
              fontSize: { xs: "0.9rem", sm: "1rem" },
              mb: 1,
              letterSpacing: 1,
            }}
          >
            Bill Summary
          </Typography>

          <Box sx={{
              borderRadius: "10px",
              border: `1px solid ${themeColor}`,
              p: 3,
              width: "100%",
              backgroundColor: theme.palette.background.paper,
              justifyContent: "space-between",
            }}>
            <Grid
            container
            spacing={3}
            sx={{
              borderRadius: "10px",
              p: 1,
              width: "100%",
              justifyContent: "space-between",
            }}
          >
            {/* LEFT COLUMN */}
            {/* LEFT COLUMN */}
<Grid item xs={12} sm={6}>
  <Box sx={{ color: "#ccc" }}>
    {[
      {
        label: "Subtotal (Without GST)",
        value: `₹${formatCurrency(invoice.subtotal)}`,
      },

      {
        label:
          invoice.discount_type === "%"
            ? `Discount (${(
                (invoice.discount_value / invoice.subtotal) *
                100
              ).toFixed(2)}%)`
            : `Discount (₹)`,
        value: `₹${formatCurrency(invoice.discount_value)}`,
      },

      ...(invoice.transport_charge > 0
        ? [
            {
              label: "Transport Charges",
              value: `₹${formatCurrency(invoice.transport_charge)}`,
            },
          ]
        : []),

      {
        label: "Amount With GST",
        value: `₹${formatCurrency(
          (parseFloat(invoice.subtotal) || 0) +
            (parseFloat(invoice.gst_amount) || 0) -
            (parseFloat(invoice.discount_value) || 0)
        )}`,
      },
    ]
      .filter(Boolean)
      .map((item, idx) => (
        <Box
          key={idx}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1.4,
          }}
        >
          <Typography
            fontSize="1rem"
            color="text.secondary"
            sx={{ flex: 1 }}
          >
            {item.label} :
          </Typography>

          <Typography
            fontWeight={600}
            sx={{
              color: isDark ? "white" : "#303030",
              minWidth: "150px",
              textAlign: "right",
              fontSize: "16px",
            }}
          >
            {item.value}
          </Typography>
        </Box>
      ))}
  </Box>
</Grid>

            {/* RIGHT COLUMN – GST DETAILS */}
            <Grid item xs={12} sm={6}>
  <Box sx={{ color: "#ccc" }}>
    {[
      {
        label:
          invoice.gst_percentage > 0
            ? `GST (+ ${invoice.gst_percentage}% on Bill)`
            : "GST",
        value: `₹${formatCurrency(invoice.gst_amount || 0)}`,
      },
      {
        label:
          invoice.gst_percentage > 0
            ? `CGST (+ ${(invoice.gst_percentage / 2).toFixed(2)}% on Bill)`
            : "CGST",
        value: `₹${formatCurrency(invoice.cgst_amount || 0)}`,
      },
      {
        label:
          invoice.gst_percentage > 0
            ? `SGST (+ ${(invoice.gst_percentage / 2).toFixed(2)}% on Bill)`
            : "SGST",
        value: `₹${formatCurrency(invoice.sgst_amount || 0)}`,
      },
      {
        label: "Total GST Value",
        value: `₹${formatCurrency(invoice.gst_amount || 0)}`,
      },
      {
        label: "Grand Total",
        value: `₹${formatCurrency(invoice.total_amount || 0)}`,
      },
    ].map((item, idx) => (
      <Box
        key={idx}
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1.4,
        }}
      >
        <Typography
          fontSize="1rem"
          color="text.secondary"
          sx={{ flex: 1 }}
        >
          {item.label} :
        </Typography>
        <Typography
          fontWeight={600}
          fontSize="1.05rem"
          sx={{
            color: isDark ? "white" : "#303030",
            minWidth: "150px",
            textAlign: "right",
          }}
        >
          {item.value}
        </Typography>
      </Box>
    ))}
  </Box>
</Grid>
          </Grid>

          <Box
  sx={{
    mt: 3,
    px: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 4,
  }}
>
  {/* LEFT SIDE - Payment Type & Status */}
  <Box sx={{ flex: 1 }}>
    <Typography
      variant="subtitle1"
      fontWeight="bold"
      gutterBottom
      sx={{ color: themeColor }}
    >
      Payment Details
    </Typography>

    <Box component="ul" sx={{ listStyle: "none", pl: 0, m: 0 }}>
      {[
        {
          label: "Payment Type",
          value: invoice.payment_type || "Cash",
        },
        {
          label: "Payment Status",
          value: invoice.payment_status || "Pending",
        },
      ].map((item, idx) => (
        <Box
          component="li"
          key={idx}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 1,
            borderBottom: isDark ? "1px dashed #555" : "1px dashed #aaa",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.95rem",
              color: isDark ? "#bbb" : "#444",
            }}
          >
            {item.label}
          </Typography>
          <Typography
            fontWeight={600}
            sx={{
              color: isDark ? "#fff" : "#000",
              fontSize: "1rem",
              textTransform: "capitalize",
            }}
          >
            {item.value}
          </Typography>
        </Box>
      ))}
    </Box>
  </Box>

  {/* RIGHT SIDE - Advance and Due */}
  <Box sx={{ flex: 1 }}>
    <Typography
      variant="subtitle1"
      fontWeight="bold"
      gutterBottom
      sx={{ color: themeColor }}
    >
      Advance & Due Details
    </Typography>

    <Box component="ul" sx={{ listStyle: "none", pl: 0, m: 0 }}>
      {invoice.advance_amount > 0 && (
        <Box
          component="li"
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 1,
            borderBottom: isDark ? "1px dashed #555" : "1px dashed #aaa",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.95rem",
              color: isDark ? "#bbb" : "#444",
            }}
          >
            Advance Paid
          </Typography>
          <Typography
            fontWeight={600}
            sx={{
              color: isDark ? "#fff" : "#000",
              fontSize: "1rem",
            }}
          >
            ₹{parseFloat(invoice.advance_amount).toFixed(2)}
          </Typography>
        </Box>
      )}

      <Box
        component="li"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          py: 1,
          borderBottom: isDark ? "1px dashed #555" : "1px dashed #aaa",
        }}
      >
        <Typography
          sx={{
            fontSize: "0.95rem",
            color: isDark ? "#bbb" : "#444",
          }}
        >
          Due Date
        </Typography>
        <Typography
          fontWeight={600}
          sx={{
            color: isDark ? "#fff" : "#000",
            fontSize: "1rem",
          }}
        >
          {invoice.due_date
            ? new Date(invoice.due_date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "N/A"}
        </Typography>
      </Box>
    </Box>
  </Box>

  {/* BALANCE AMOUNT AT BOTTOM */}
  {parseFloat(invoice.advance_amount || 0) > 0 && (
  <Box
    sx={{
      mt: 2,
      px: 2,
      py: 2,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: isDark ? "#1a1a1a" : "#f2f2f2",
      borderRadius: "10px",
    }}
  >
    <Typography
      sx={{
        fontSize: "1.1rem",
        fontWeight: "bold",
        color: themeColor,
      }}
    >
      Balance Amount
    </Typography>
    <Typography
      sx={{
        fontSize: "1.2rem",
        fontWeight: "bold",
        color: themeColor,
      }}
    >
      ₹
      {(
        parseFloat(invoice.total_amount || 0) -
        parseFloat(invoice.advance_amount || 0)
      ).toFixed(2)}
    </Typography>
  </Box>
)}
</Box>
          </Box>

          <Divider sx={{ my: 3, borderColor: themeColor }} />

          {/* GRAND TOTAL */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mt: 2, px: 1 }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: themeColor,
                fontSize: { xs: "1.2rem", sm: "1.4rem" },
              }}
            >
              Grand Total:
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: themeColor,
                fontSize: { xs: "1.2rem", sm: "1.4rem" },
              }}
            >
              ₹{formatCurrency(invoice.total_amount)}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{ px: 3, py: 2, backgroundColor: isDark ? "#000" : "#fafcfa", display: 'flex', flexDirection: {xs: 'column', sm: 'row', gap: '10px'} }}
      >
        <Button
          onClick={onClose}
          sx={{
            ml: "10px",
            gap: "8px",
            display: {xs: 'none', sm: 'flex'},
            textTransform: "none",
            color: isDark ? "#d1cfce" : "gray",
            border: isDark ? "1px solid #d1cfce" : "1px solid gray",
            borderRadius: "10px",
            backgroundColor: "transparent",
            transition: "all 0.3s ease-in-out",
            "&:hover": {
              borderColor: "red",
              color: "red",
            },
          }}
        >
          Close
        </Button>
        <Button
  onClick={handleDownloadPDFClick}
  variant="contained"
  sx={{
    gap: "8px",
    width: { xs: "100%", sm: "170px" },
    textTransform: "none",
    color: themeColor,
    border: `1px solid ${themeColor}`,
    borderRadius: "10px",
    backgroundColor: "transparent",
    transition: "all 0.3s ease-in-out",
    fontWeight: "bold",
    "&:hover": {
      borderColor: themeColor,
      boxShadow: `0 0 8px ${themeColor}, 0 0 6px ${themeColor}`,
    },
  }}
>
  <CloudDownloadIcon sx={{ fontSize: "20px", fontWeight: "bold" }} />
  Download PDF
</Button>
        {subscriptionType != 'bill' && (
          <>
          <Button
        onClick={handleSend}
        variant="contained"
        sx={{
          gap: "8px",
          width: {xs: '100%', sm: '170px'},
          textTransform: "none",
          color: themeColor,
          border: `1px solid ${themeColor}`,
          borderRadius: "10px",
          backgroundColor: "transparent",
          transition: "all 0.3s ease-in-out",
          fontWeight: "bold",
          "&:hover": {
            borderColor: themeColor,
            boxShadow: `0 0 8px ${themeColor}, 0 0 6px ${themeColor}`,
          },
        }}
      >
        <SendIcon sx={{ fontSize: "20px", fontWeight: "bold" }} />
        Send Invoice
      </Button>
          </>
        )}

      {/* Loading Spinner */}
      <Backdrop
        open={loading}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          color: "#fff",
          backdropFilter: "blur(1px)",
        }}
      >
        <CircularProgress color="inherit" size={60} thickness={5} />
      </Backdrop>

      {/* Snackbar Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      </DialogActions>
    </Dialog>
  );
}

function Section({ title, children }) {
  return (
    <Box mb={2}>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          mb: 1,
          color: "#90caf9",
          fontSize: "1.1rem",
        }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 1.5,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function TwoColumn({ label, value, bold = false, color = "inherit" }) {
  return (
    <Typography sx={{ color }}>
      <strong style={{ fontWeight: bold ? 600 : 500 }}>{label}:</strong>{" "}
      <span style={{ fontWeight: bold ? 600 : 400 }}>{value || "N/A"}</span>
    </Typography>
  );
}

export default InvoicePreviewModal;
