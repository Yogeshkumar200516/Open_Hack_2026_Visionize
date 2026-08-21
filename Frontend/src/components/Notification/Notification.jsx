import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  useTheme,
  Box,
  Tooltip,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddAlarmIcon from "@mui/icons-material/AddAlarm";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import AttachEmailIcon from "@mui/icons-material/AttachEmail";
import { Snackbar, Alert, CircularProgress } from "@mui/material";
import axiosInstance from "../../utils/axiosInstance";


import {
  fetchReminderData,
  fetchCompanySubscriptionType,
} from "../../utils/reminder.jsx";
import { calculateDayDifference } from "../../utils/dateCalculation.jsx";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import API_BASE_URL from "../../Context/Api.jsx";

dayjs.extend(utc);

// Helper to format due dates with labels
const formatDueDate = (dueDateStr) => {
  const { diffInDays, formattedDate, isOverdue } =
    calculateDayDifference(dueDateStr);

  let label = "";
  if (diffInDays > 0) label = `${diffInDays} day(s) left`;
  else if (diffInDays === 0) label = "Today";
  else label = `${Math.abs(diffInDays)} day(s) ago`;

  return (
    <Box component="span">
      {formattedDate}{" "}
      <Box
        component="span"
        sx={{
          color: isOverdue ? "error.main" : "success.main",
          fontWeight: 600,
          fontSize: "0.85rem",
          ml: 0.5,
        }}
      >
        ({label})
      </Box>
    </Box>
  );
};

const ReminderModal = ({ open, onClose, onDataLoaded }) => {
  const theme = useTheme();
  const { palette } = theme;
  const isDark = palette.mode === "dark";
  const primaryColor = palette.primary.main;

  const [data, setData] = useState({ reminders: [], overdues: [] });
  const [tab, setTab] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [dueSortOrder, setDueSortOrder] = useState("asc");
  const [subscriptionType, setSubscriptionType] = useState("invoice");

  const isBill = subscriptionType === "bill";

  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      setDataLoading(true);
      try {
        const type = await fetchCompanySubscriptionType();
        setSubscriptionType(type);

        const { reminders = [], overdues = [] } = await fetchReminderData(type);

        const recomputedOverdues = [];
        const recomputedReminders = [];

        [...reminders, ...overdues].forEach((item) => {
          const dueDateField = item.dueDate || item.due_date;
          const { diffInDays } = calculateDayDifference(dueDateField);

          if (diffInDays < 0) {
            recomputedOverdues.push(item); // overdue
          } else if (diffInDays <= 2 && diffInDays >= 0) {
            recomputedReminders.push(item); // today, 1 day, 2 days
          }
        });

        setData({
          overdues: recomputedOverdues,
          reminders: recomputedReminders,
        });

        onDataLoaded?.(recomputedReminders, recomputedOverdues);
      } catch (err) {
        console.error("Error fetching reminders:", err);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [open, onDataLoaded]);

  const handleCopyNumber = (number, id) => {
    navigator.clipboard.writeText(number);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSortOrder = () =>
    setDueSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));

  // Compose mailto link
//   const createGmailLink = (email, invoiceNumber, dueDate, type, companyName) => {
//   if (!email) return "";

//   const safeCompanyName = companyName || "Your Company";
//   const formattedDueDate = dayjs(dueDate).format("DD-MM-YYYY");

//   const subject =
//     type === "reminder"
//       ? `Reminder: Invoice #${invoiceNumber} due on ${formattedDueDate}`
//       : `Overdue Alert: Invoice #${invoiceNumber} was due on ${formattedDueDate}`;

//   const body =
//     type === "reminder"
//       ? `Greetings from ${safeCompanyName}\n\nDear Valued Customer,\n\n` +
//         `We hope this message finds you well.\n\n` +
//         `This is a kind reminder that your invoice number ${invoiceNumber} is scheduled to be due on ${formattedDueDate}.\n\n` +
//         `To ensure uninterrupted service and maintain a smooth business relationship, please arrange to complete the payment on or before the due date.\n\n` +
//         `If you have already made the payment, kindly disregard this reminder.\n\n` +
//         `We sincerely appreciate your prompt attention and continued partnership.\n\n` +
//         `Warm regards,\n${safeCompanyName}`
//       : `Greetings from ${safeCompanyName}\n\nDear Valued Customer,\n\n` +
//         `Our records indicate that invoice number ${invoiceNumber}, with a due date of ${formattedDueDate}, has not yet been settled.\n\n` +
//         `We kindly urge you to arrange payment at your earliest convenience to avoid any potential disruption in services or additional charges.\n\n` +
//         `If you have recently completed the payment, please accept our thanks and disregard this notice.\n\n` +
//         `Your cooperation in resolving this matter promptly is greatly appreciated.\n\n` +
//         `Thank you for your attention.\n\n` +
//         `Sincerely,\n${safeCompanyName}`;

//   return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
//     email
//   )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
// };

// ... (removing the redundant declarations below)



const handleSendEmail = async (item, type) => {
  setLoadingEmail(true); // show loader
  try {
    await axiosInstance.post(`/api/alert/send-reminder`, {
      customerEmail: item.customer_email || item.email,
      invoiceNumber: item.bill_number || item.invoice_number,
      companyName: item.company_name,
      companyEmail: item.company_email,
      dueDate: item.due_date || item.dueDate,
      type,
    });

    setSnackbar({
      open: true,
      message: `Email sent successfully to ${item.customer_email}`,
      severity: "success",
    });
  } catch (err) {
    console.error(err);
    setSnackbar({
      open: true,
      message: `Failed to send email to ${item.customer_email}`,
      severity: "error",
    });
  } finally {
    setLoadingEmail(false); // hide loader
  }
};






  // Compose WhatsApp link with companyName passed correctly
  const createWhatsAppLink = (
    whatsapp,
    invoiceNumber,
    dueDate,
    type,
    companyName
  ) => {
    if (!whatsapp) return "";
    const normalizedPhone = whatsapp.replace(/\D/g, "");
    const safeCompanyName = companyName || "Your Company";
    const formattedDueDate = dayjs(dueDate).format("DD-MM-YYYY");

    const message =
      type === "reminder"
        ? `*Greetings from ${safeCompanyName}*\n\nDear Valued Customer,\n\n` +
          `We hope this message finds you well.\n\n` +
          `This is a kind reminder that your invoice number *${invoiceNumber}* is scheduled to be due on *${formattedDueDate}*.\n\n` +
          `To ensure uninterrupted service and maintain a smooth business relationship, please arrange to complete the payment on or before the due date.\n\n` +
          `If you have already made the payment, kindly disregard this reminder.\n\n` +
          `We sincerely appreciate your prompt attention and continued partnership.\n\n` +
          `*Warm regards,*\n${safeCompanyName}`
        : `*Greetings from ${safeCompanyName}*\n\nDear Valued Customer,\n\n` +
          `Our records indicate that invoice number *${invoiceNumber}*, with a due date of *${formattedDueDate}*, has not yet been settled.\n\n` +
          `We kindly urge you to arrange payment at your earliest convenience to avoid any potential disruption in services or additional charges.\n\n` +
          `If you have recently completed the payment, please accept our thanks and disregard this notice.\n\n` +
          `Your cooperation in resolving this matter promptly is greatly appreciated.\n\n` +
          `Thank you for your attention.\n\n` +
          `*Sincerely*,\n${safeCompanyName}`;

    return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
      message
    )}`;
  };

  const sortedRows = useMemo(() => {
    const rows = tab === 0 ? data.overdues : data.reminders;
    return [...rows].sort((a, b) => {
      const dateA = dayjs.utc(a.dueDate || a.due_date).startOf("day");
      const dateB = dayjs.utc(b.dueDate || b.due_date).startOf("day");
      return dueSortOrder === "asc"
        ? dateA.valueOf() - dateB.valueOf()
        : dateB.valueOf() - dateA.valueOf();
    });
  }, [data, tab, dueSortOrder]);

  const renderTable = (rows) => {
    const hasData = rows.length > 0;
    // Base headers
    const headers = [
      "Action",
      isBill ? "Bill No" : "Invoice No",
      "Customer Name",
    ];
    if (!isBill) headers.push("Alerts");
    if (!isBill) headers.push("Email", "GST No.");
    headers.push("Phone", "Amount(₹)", "Advance(₹)", "Balance(₹)", "Due Date");
    // Add Alerts column only if NOT bill subscription
    

    return (
      <Box
        sx={{
          width: "100%",
          height: { xs: "390px", sm: "320px", md: "300px" },
          border: `2px ${hasData ? "solid" : "dashed"} ${primaryColor}`,
          borderRadius: 2,
          overflowY: hasData ? "auto" : "hidden",
          bgcolor: hasData ? "transparent" : isDark ? "grey.900" : "grey.100",
          display: "flex",
          alignItems: hasData ? "stretch" : "center",
          justifyContent: "start",
          flexDirection: "column",
          "&::-webkit-scrollbar": { width: "2px", height: "8px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: primaryColor,
            borderRadius: "10px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: isDark ? "#2c2c2c" : "#f0f0f0",
          },
        }}
      >
        {hasData ? (
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableCell
                    key={header}
                    sx={{
                      backgroundColor: primaryColor,
                      fontWeight: "bold",
                      color: "#fff",
                      cursor: header === "Due Date" ? "pointer" : "default",
                    }}
                    align={header === "Action" ? "center" : "left"}
                    onClick={
                      header === "Due Date" ? toggleSortOrder : undefined
                    }
                  >
                    {header}
                    {header === "Due Date" &&
                      (dueSortOrder === "asc" ? (
                        <ArrowDownwardIcon
                          fontSize="inherit"
                          sx={{ ml: 1, fontSize: 16 }}
                        />
                      ) : (
                        <ArrowUpwardIcon
                          fontSize="inherit"
                          sx={{ ml: 1, fontSize: 16 }}
                        />
                      ))}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
  {rows.map((item) => {
    const key = item.invoice_id
      ? `inv-${item.invoice_id}`
      : item.bill_id
      ? `bill-${item.bill_id}`
      : Math.random();

    // ✅ Compute due date and diffInDays per row
    const dueDateValue = item.dueDate || item.due_date;
    const { diffInDays } = calculateDayDifference(dueDateValue);

    // ✅ Determine mail type based on diffInDays
    const mailType = diffInDays < 0 ? "overdue" : "reminder";

    return (
      <TableRow key={key}>
        {/* Copy Invoice/Bill Number */}
        <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
          <Tooltip
            title={
              copiedId === (item.invoice_id || item.bill_id)
                ? "Copied"
                : `Copy ${isBill ? "Bill" : "Invoice"} Number`
            }
            arrow
          >
            <IconButton
              size="small"
              onClick={() =>
                handleCopyNumber(
                  item.invoice_number || item.bill_number,
                  item.invoice_id || item.bill_id
                )
              }
              sx={{
                color: "gray",
                "&:hover": { color: primaryColor },
              }}
            >
              <ContentCopyIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </TableCell>

        {/* Invoice/Bill Number */}
        <TableCell sx={{ fontWeight: "bold", minWidth: "160px" }}>
          {item.invoice_number || item.bill_number}
        </TableCell>

        {/* Customer Name */}
        <TableCell sx={{ fontWeight: "bold", minWidth: "200px" }}>
          {item.customer_name || "-"}
        </TableCell>
        {/* Alerts: Email & WhatsApp */}
        {!isBill && (
          <TableCell align="left" sx={{ whiteSpace: "nowrap", minWidth: "130px" }}>
            {/* Email */}
            <IconButton
              size="small"
              onClick={() => handleSendEmail(item, mailType)} // ✅ pass mailType
              sx={{
  color: primaryColor,
  border: `2px solid ${primaryColor}`,
  '&:hover': {
    boxShadow: (theme) => `0 4px 12px 0 ${theme.palette.primary.main}80`
  }
}}

              aria-label="Send Email"
            >
              <AttachEmailIcon sx={{ fontSize: 26 }} />
            </IconButton>

            {/* WhatsApp */}
            {item.whatsapp && (
              <Tooltip title="Send WhatsApp Message" arrow>
                <IconButton
                  size="small"
                  component="a"
                  href={createWhatsAppLink(
                    item.whatsapp,
                    item.invoice_number,
                    dueDateValue,
                    mailType,
                    item.company_name || "Your Company"
                  )}
                  sx={{
  color: primaryColor,
  border: `2px solid ${primaryColor}`,
  ml: 1,
  '&:hover': {
    boxShadow: (theme) => `0 4px 12px 0 ${theme.palette.primary.main}80`
  }
}}

                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Send WhatsApp Message"
                >
                  <WhatsAppIcon sx={{ fontSize: 26, ml: 0 }} />
                </IconButton>
              </Tooltip>
            )}
          </TableCell>
        )}

        {/* Email and GST No. (if not bill subscription) */}
        {!isBill && <TableCell>{item.customer_email || "-"}</TableCell>}
        {!isBill && <TableCell>{item.customer_gst_no || "-"}</TableCell>}

        {/* Phone Number */}
        <TableCell>{item.mobile_no || item.customer_phone_no || "-"}</TableCell>

        {/* Amounts */}
        <TableCell align="right" sx={{ fontWeight: "bold", color: primaryColor }}>
          {item.total_amount}
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: "bold" }}>
          {item.advance_amount}
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: "bold", color: "error.main" }}>
          {(item.total_amount - item.advance_amount).toFixed(2)}
        </TableCell>

        {/* Due Date */}
        <TableCell sx={{ minWidth: "200px" }}>
          {formatDueDate(dueDateValue)}
        </TableCell>
      </TableRow>
    );
  })}
</TableBody>

          </Table>
        ) : (
          <Box sx={{ textAlign: "center", mt: 8 }}>
            <HourglassEmptyIcon
              sx={{ fontSize: 48, mb: 1, color: primaryColor }}
            />
            <Typography variant="subtitle1" fontWeight="bold">
              No data available
            </Typography>
            <Typography variant="body2">You're all caught up!</Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width: { xs: "95%", sm: "90%", md: "85%", lg: "80%" },
          height: { xs: "80vh", sm: "70vh", md: "65vh" },
          display: "flex",
          flexDirection: "column",
          border: `2px solid ${primaryColor}`,
          boxShadow: `0 0 10px ${primaryColor}`,
          borderRadius: "10px",
          backgroundColor: isDark ? "#000" : "#fff",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <AddAlarmIcon sx={{ color: primaryColor }} />
          <Typography
            variant="h6"
            sx={{ color: primaryColor, fontWeight: "bold" }}
          >
            {isBill ? "Bill Notifications" : "Invoice Notifications"}
          </Typography>
        </Stack>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
  dividers
  sx={{
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    p: 2,
    position: "relative",
  }}
>
  {(loadingEmail || dataLoading) && (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        bgcolor: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <CircularProgress size={80} thickness={4} color="inherit" />
    </Box>
  )}

  {/* Tabs */}
  <Box sx={{ display: "flex", ml: -5, mt: -1.5 }}>
    <Tabs
      value={tab}
      onChange={(e, v) => setTab(v)}
      variant="scrollable"
      scrollButtons
      allowScrollButtonsMobile
    >
      <Tab
        label={`Overdues (${data.overdues.length})`}
        sx={{ fontWeight: "bold", textTransform: "none" }}
      />
      <Tab
        label={`Reminders (${data.reminders.length})`}
        sx={{ fontWeight: "bold", textTransform: "none" }}
      />
    </Tabs>
  </Box>

  {/* Info text */}
  <Typography
    variant="body2"
    sx={{ ml: 1, mt: 0, color: "text.secondary" }}
  >
    (Copy {isBill ? "Bill" : "Invoice"} number and search it in the Party
    Master page)
  </Typography>

  {/* Table */}
  {renderTable(sortedRows)}
</DialogContent>


      <Snackbar
  open={snackbar.open}
  autoHideDuration={4000}
  onClose={() => setSnackbar({ ...snackbar, open: false })}
  anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
>
  <Alert
    onClose={() => setSnackbar({ ...snackbar, open: false })}
    severity={snackbar.severity}
    sx={{ width: "100%" }}
  >
    {snackbar.message}
  </Alert>
</Snackbar>

    </Dialog>
  );
};

export default ReminderModal;
