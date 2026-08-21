import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Chip,
  CircularProgress,
  Button,
  Divider,
  Avatar,
  IconButton,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Tooltip,
} from "@mui/material";
import {
  Close as CloseIcon,
  Receipt as ReceiptIcon,
  CalendarToday as CalendarIcon,
  Inventory as InventoryIcon,
} from "@mui/icons-material";
import axiosInstance from "../../utils/axiosInstance";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { generateSalesReturnDetailsPDF } from "../../components/PDFGeneration/DownloadIndividualSales";

const formatCurrency = (value) =>
  `₹${parseFloat(value || 0).toFixed(2)}`;

const formatDate = (date) =>
  new Date(date).toLocaleDateString();

const ReturnsInfo = ({ open, onClose, salesReturnId }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [data, setData] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Custom scrollbar styles
  const scrollbarStyles = {
    '&::-webkit-scrollbar': {
      height: '6px',
      width: '6px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: isDark ? '#2a2a3a' : '#f1f3f4',
      borderRadius: '3px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: primaryColor,
      borderRadius: '3px',
      border: '1px solid transparent',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: `${primaryColor}CC`,
    },
  };

  useEffect(() => {
    if (open && salesReturnId) {
      fetchReturnDetails();
    }
  }, [open, salesReturnId]);

  const fetchReturnDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get(`/api/sales-returns/${salesReturnId}`);
      const result = response.data;
      setData(result.data.return);
      setItems(result.data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (item) => {
    if (item.verified_quantity === item.quantity)
      return <Chip label="Verified" color="success" size="small" sx={{ fontWeight: 600 }} />;
    if (item.verified_quantity > 0)
      return <Chip label="Partially Verified" color="warning" size="small" sx={{ fontWeight: 600 }} />;
    return <Chip label="Pending" color="error" size="small" sx={{ fontWeight: 600 }} />;
  };

  const getOverallStatus = () => {
    const verifiedItems = items.filter(item => item.verified_quantity === item.quantity);
    const partialItems = items.filter(item => item.verified_quantity > 0 && item.verified_quantity < item.quantity);
    const pendingItems = items.filter(item => item.verified_quantity === 0);

    if (verifiedItems.length === items.length) return 'verified';
    if (partialItems.length > 0 || pendingItems.length > 0) return 'partially_verified';
    return 'pending';
  };

  const handleDownloadPDFClick = async () => {
  if (!salesReturnId || !data) {
    alert("No return data available for download.");
    return;
  }
  
  try {
    setLoading(true);
    const token = localStorage.getItem("authToken");
    await generateSalesReturnDetailsPDF(salesReturnId, token);
  } catch (err) {
    console.error("PDF generation failed:", err);
    alert("Failed to generate PDF.");
  } finally {
    setLoading(false);
  }
};


  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth
      maxWidth="none"
      PaperProps={{
        sx: {
          border: `2px solid ${primaryColor}`,
          boxShadow: `0 0 25px ${primaryColor}30`,
          borderRadius: 3,
          height: '90vh',
          maxHeight: '90vh',
          overflow: 'hidden',
          // ✅ RESPONSIVE WIDTH VIA MARGINS (95% on xs, 90% on sm, etc.)
          mx: { xs: '2.5%', sm: '5%', md: '7.5%', lg: 'auto' },
          width: {xs: '100%', sm: '85%', md: '80%'},
          m: 'auto',
        },
      }}
    >
      {/* ✅ FIXED TITLE HEADER */}
      <Box sx={{ 
        px: { xs: 2, sm: 3 }, 
        pt: 2, 
        pb: 1.5,
        background: `linear-gradient(180deg, ${primaryColor}15 0%, transparent 100%)`,
        borderBottom: `1px solid ${primaryColor}20`,
        position: 'sticky',
        top: 0,
        zIndex: 1
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ReceiptIcon sx={{ fontSize: 24, color: primaryColor }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: primaryColor }}>
                Sales Return Details
              </Typography>
              <Chip 
                label={`#${data?.return_number || ''}`} 
                size="small"
                color="primary"
                sx={{ fontWeight: 700, height: 24 }}
              />
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: `${primaryColor}20`,
                color: primaryColor,
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Main Content */}
      <DialogContent sx={{ 
        p: 0, 
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{ flex: 1, overflow: 'auto', p: 1, ...scrollbarStyles }}>
          {loading ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              gap: 2
            }}>
              <CircularProgress size={48} sx={{ color: primaryColor }} />
              <Typography>Loading return details...</Typography>
            </Box>
          ) : error ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 8, 
              color: 'error.main',
              '& .MuiTypography-root': {
                fontSize: '1.2rem',
                fontWeight: 500,
              }
            }}>
              <Typography>{error}</Typography>
            </Box>
          ) : data ? (
            <>
              {/* Info Cards Section */}
              <Grid container spacing={3} sx={{ mb: 4, width: '100%' }}>
                {/* Return Info Card */}
                <Grid item xs={12} lg={8} sx={{ width: "100%" }}>
                  <Card
                    sx={{
                      height: "100%",
                      borderRadius: 3,
                      overflow: "hidden",
                      border: `1px solid ${primaryColor}25`,
                      background: "background.paper",
                      boxShadow: `0 6px 25px ${primaryColor}15`,
                      transition: "all 0.35s ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: `0 12px 35px ${primaryColor}30`,
                      },
                    }}
                  >
                    {/* Header Section */}
                    <Box
                      sx={{
                        px: {xs: 1, sm: 3},
                        py: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        background: `linear-gradient(90deg, ${primaryColor}15, transparent)`,
                        borderBottom: `1px solid ${primaryColor}20`,
                      }}
                    >
                      <AssignmentReturnOutlinedIcon
                        sx={{
                          color: primaryColor,
                          fontSize: 24,
                          backgroundColor: `${primaryColor}20`,
                          borderRadius: "50%",
                          p: 0.7,
                        }}
                      />

                      <Typography
                        variant="h6"
                        sx={{
                          color: primaryColor,
                          fontWeight: 700,
                          letterSpacing: 0.3,
                        }}
                      >
                        Return Information
                      </Typography>
                    </Box>

                    {/* Content */}
                    <CardContent sx={{ p: { xs: 1, sm: 3 }, width: '100%' }}>
                      <Grid
                        container
                        spacing={2}
                        alignItems="stretch"
                        sx={{width: '100%'}}
                      >
                        {/* LEFT SIDE — CUSTOMER DETAILS */}
                        <Grid sx={{ display: "flex", width: {xs: '100%', sm: '100%', md: '48.5%'} }}>
                          <Box
                            sx={{
                              flex: 1,
                              p: {xs: 1, sm: 3},
                              borderRadius: 3,
                              border: `1px solid ${primaryColor}25`,
                              background: `linear-gradient(135deg, ${primaryColor}10, transparent)`,
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{ mb: 2, fontWeight: 700, color: primaryColor }}
                            >
                              Customer Details
                            </Typography>

                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                Name
                              </Typography>
                              <Typography fontWeight={600}>
                                {data.customer_name}
                              </Typography>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                Mobile
                              </Typography>
                              <Typography fontWeight={600}>
                                {data.customer_mobile}
                              </Typography>
                            </Box>

                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Email
                              </Typography>
                              <Typography fontWeight={600} 
                              sx={{
                                whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "break-word",
                              }}
                              >
                                {data.customer_email}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>

                        {/* RIGHT SIDE — DATE + INVOICE + REASON */}
                        <Grid sx={{ display: "flex", width: {xs: '100%', sm: '100%', md: '48.5%'} }}>
                          <Box
                            sx={{
                              flex: 1,
                              display: "flex",
                              flexDirection: "column",
                              gap: 1,
                            }}
                          >
                            {/* ROW 1: Date + Invoice */}
                            <Grid container spacing={1} sx={{width: '100%', display: 'flex', flexDirection: {xs: 'column', sm: 'row'}}}>
                              <Grid item xs={6} sx={{width: {xs: '100%', sm: '48%', md: '100%', lg: '48%'}}}>
                                <Box
                                  sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: "action.hover",
                                    height: "100%",
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Return Date
                                  </Typography>

                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                                    <CalendarIcon
                                      sx={{ fontSize: 18, color: primaryColor }}
                                    />
                                    <Typography fontWeight={600}>
                                      {formatDate(data.return_date)}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Grid>

                              <Grid item xs={6} sx={{width: {xs: '100%', sm: '48%', md: '100%', lg: '48%'}}}>
                                <Box
                                  sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: "action.hover",
                                    height: "100%",
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Invoice Number
                                  </Typography>

                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                                    <ReceiptIcon
                                      sx={{ fontSize: 18, color: primaryColor }}
                                    />
                                    <Typography fontWeight={600}>
                                      {data.original_invoice_number}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Grid>
                            </Grid>

                            {/* ROW 2: Reason */}
                            {/* ROW 2: Reason - SCROLLABLE WITH FIXED HEIGHT */}
                            <Box
                              sx={{
                                p: 3,
                                borderRadius: 3,
                                border: `1px dashed ${primaryColor}40`,
                                backgroundColor: `${primaryColor}08`,
                                height: 152,  // ✅ FIXED HEIGHT
                                overflow: 'auto',  // ✅ ENABLE SCROLL
                                ...scrollbarStyles,  // ✅ PRIMARY COLOR SCROLLBAR
                                mt: 1.5
                              }}
                            >
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }} color="text.secondary">
                                Reason for Return
                              </Typography>
                              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                                {data.reason || "No reason provided"}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Financial Summary Card */}
                <Grid item xs={12} lg={4} sx={{ width: '100%'}}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      border: `1px solid ${primaryColor}20`,
                      boxShadow: 3,
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: `0 8px 25px ${primaryColor}20`,
                        transform: 'translateY(-2px)',
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{gap: {xs: 1, sm: 0}, mb: 3, display: 'flex', justifyContent: 'space-between', flexDirection: {xs: 'column', sm: 'row'}}}>
                        <Typography variant="h6" sx={{ color: primaryColor, fontWeight: 700, fontSize: {xs: '1.1rem', sm: '1.2rem'} }}>
                          Financial Summary
                        </Typography>
                        <Chip
                          label={getOverallStatus().toUpperCase()}
                          color={getOverallStatus() === 'verified' ? 'success' : getOverallStatus() === 'partially_verified' ? 'warning' : 'error'}
                          sx={{ 
                            fontWeight: 700, 
                            height: 32,
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {formatCurrency(data.subtotal)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">GST</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {formatCurrency(data.gst_amount)}
                        </Typography>
                      </Box>
                      {parseFloat(data.discount_amount) > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="body2" color="error.main">Discount</Typography>
                          <Typography variant="body1" color="error.main" fontWeight={600}>
                            -{formatCurrency(data.discount_amount)}
                          </Typography>
                        </Box>
                      )}
                      <Divider sx={{ my: 2 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight={800} color={primaryColor} sx={{fontSize: {xs: '1.1rem', sm: '1.2rem'}}}>
                          Total Amount
                        </Typography>
                        <Typography 
                          variant="h6" 
                          fontWeight={900}
                          sx={{ 
                            background: `linear-gradient(135deg, ${primaryColor} 0%, ${theme.palette.primary.dark} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontSize: {xs: '1.1rem', sm: '1.2rem'},
                          }}
                        >
                          {formatCurrency(data.total_amount)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Divider sx={{ my: 4 }} />

              {/* Items Table */}
              <Box sx={{p: 1}}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <InventoryIcon sx={{ fontSize: 20, color: primaryColor }} />
                    <Typography variant="h6" sx={{ fontWeight: 800, color: primaryColor }}>
                      Returned Items ({items.length})
                    </Typography>
                  </Box>
                </Box>
                <Paper 
                  sx={{ 
                    borderRadius: 2, 
                    border: `1px solid ${primaryColor}20`,
                    overflow: 'hidden',
                    boxShadow: 3,
                  }}
                >
                  <TableContainer sx={{ 
                    maxHeight: 400, 
                    minHeight: 300,
                    ...scrollbarStyles 
                  }}>
                    <Table stickyHeader size={isMobile ? "small" : "medium"} sx={{minWidth: '1100px'}}>
                      <TableHead>
                        <TableRow sx={{ 
                          bgcolor: `${primaryColor}.100`,
                          '& .MuiTableCell-head': {
                            fontWeight: 700,
                            color: primaryColor,
                            fontSize: '0.95rem',
                            border: 'none',
                          }
                        }}>
                          <TableCell align="center">S.No</TableCell>
                          <TableCell>Product</TableCell>
                          <TableCell>HSN</TableCell>
                          <TableCell align="right">Qty</TableCell>
                          <TableCell align="right">Verified</TableCell>
                          <TableCell align="right">Rate</TableCell>
                          <TableCell align="right">GST %</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="center">Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow 
                            key={item.sales_return_item_id}
                            hover
                            sx={{ 
                              '&:hover': { 
                                bgcolor: `${primaryColor}04`,
                                transition: 'background-color 0.2s ease',
                              },
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <TableCell align="center" sx={{ py: 2 }}>
                              <Typography variant="body1" fontWeight={600}>
                                {index+1}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 2 }}>
                              <Box sx={{ display: "flex", alignItems: 'center', gap: 2 }}>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.25 }}>
                                    {item.product_name}
                                  </Typography>
                                  {item.barcode && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                      {item.barcode}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ py: 2 }}>
                              <Chip label={item.hsn_code} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell align="right" sx={{ py: 2 }}>
                              <Typography variant="body1" fontWeight={600}>
                                {item.quantity}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ py: 2 }}>
                              <Chip
                                label={item.verified_quantity}
                                color={item.verified_quantity === item.quantity ? 'success' : 'warning'}
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ py: 2 }}>
                              {formatCurrency(item.rate)}
                            </TableCell>
                            <TableCell align="right" sx={{ py: 2 }}>
                              <Chip label={`${item.gst_percentage}%`} size="small" color="primary" variant="outlined" />
                            </TableCell>
                            <TableCell align="right" sx={{ py: 2 }}>
                              <Typography variant="body1" fontWeight={700} color={primaryColor}>
                                {formatCurrency(item.total_with_gst)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ py: 2 }}>
                              {getStatusChip(item)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Box>
            </>
          ) : null}
        </Box>

        {/* Action Buttons */}
        <DialogActions sx={{ 
          p: 2, 
          borderTop: `1px solid ${primaryColor}20`,
          backgroundColor: isDark ? '#1a1a1a' : '#fafafa',
          gap: 0
        }}>
          <Button
            onClick={onClose}
            sx={{
              py: 0.3,
              borderRadius: 2,
              color: 'gray',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '1.1rem',
              border: `1px solid gray`,
              // boxShadow: `0 4px 15px ${primaryColor}40`,
              // '&:hover': {
              //   boxShadow: `0 6px 20px ${primaryColor}50`,
              // }
            }}
          >
            Close
          </Button>
          <Tooltip arrow title="Download Sales Return PDF">
  <Button
    onClick={handleDownloadPDFClick}
    disabled={loading}
    variant="contained"
    sx={{
      py: 0.3,
      borderRadius: 2,
      textTransform: 'none',
      fontWeight: 700,
      fontSize: '1.1rem',
      boxShadow: `0 4px 15px ${primaryColor}40`,
      '&:hover': {
        boxShadow: `0 6px 20px ${primaryColor}50`,
      },
      '&:disabled': {
        backgroundColor: 'grey.500',
      }
    }}
  >
    <CloudDownloadIcon sx={{ fontSize: "20px", mr: 1 }} />
    {loading ? "Generating..." : "Download PDF"}
  </Button>
</Tooltip>

        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};

export default ReturnsInfo;
