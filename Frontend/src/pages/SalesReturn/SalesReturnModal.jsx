import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  InputAdornment,
  Grid,
  Divider,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import axiosInstance from '../../utils/axiosInstance';
import InvoiceModal from './InvoiceModal';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';

const SalesReturnModal = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [returnItems, setReturnItems] = useState([]);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openInvoiceModal, setOpenInvoiceModal] = useState(false);
  const [calculatedTotals, setCalculatedTotals] = useState({
    subtotal: 0,
    gstAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    totalAmount: 0,
  });

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
    if (selectedInvoice) {
      fetchInvoiceDetails();
    }
  }, [selectedInvoice]);

  useEffect(() => {
    const updatedReturnItems = invoiceItems
      .filter((i) => i.return_quantity > 0)
      .map((i) => ({
        item_id: i.item_id,
        product_id: i.product_id,
        quantity: i.return_quantity,
        rate: i.rate,
        gst_percentage: i.gst_percentage,
      }));
    setReturnItems(updatedReturnItems);
  }, [invoiceItems]);

  useEffect(() => {
    calculateTotals();
  }, [returnItems, discountAmount]);

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(
        `/api/sales-returns/invoices/${selectedInvoice.invoice_id}`
      );

      const items = response.data.data.items.map((item) => ({
        ...item,
        return_quantity: 0,
      }));
      setInvoiceItems(items);
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (itemId, quantity) => {
    setInvoiceItems((prev) =>
      prev.map((i) => {
        if (i.item_id === itemId) {
          const maxQuantity = i.available_for_return;
          const validQuantity = Math.max(0, Math.min(quantity, maxQuantity));
          return { ...i, return_quantity: validQuantity };
        }
        return i;
      })
    );
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalGstAmount = 0;

    returnItems.forEach((item) => {
      const baseAmount = (parseFloat(item.rate) || 0) * (parseInt(item.quantity) || 0);
      const gstPercentage = parseFloat(item.gst_percentage) || 0;
      const gstAmount = (baseAmount * gstPercentage) / 100;
      subtotal += baseAmount;
      totalGstAmount += gstAmount;
    });

    const cgstAmount = totalGstAmount / 2;
    const sgstAmount = totalGstAmount / 2;
    const totalAmount = subtotal + totalGstAmount - discountAmount;

    setCalculatedTotals({
      subtotal,
      gstAmount: totalGstAmount,
      cgstAmount,
      sgstAmount,
      totalAmount,
    });
  };

  const handleSubmit = async () => {
    if (!selectedInvoice) {
      setError('Please select an invoice');
      return;
    }

    if (returnItems.length === 0) {
      setError('Please add at least one item to return');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post('/api/sales-returns', {
        original_invoice_id: selectedInvoice.invoice_id,
        return_date: returnDate,
        items: returnItems,
        reason,
        discount_amount: parseFloat(discountAmount) || 0,
      });

      onSuccess(response.data.data);
      handleClose();
    } catch (err) {
      console.error('Error creating sales return:', err);
      // Ensure we extract the error message from the backend response if available
      const errorMessage = err.response?.data?.error?.message || err.message;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedInvoice(null);
    setInvoiceItems([]);
    setReturnItems([]);
    setReturnDate(new Date().toISOString().split('T')[0]);
    setReason('');
    setDiscountAmount(0);
    setError(null);
    onClose();
  };

  const handleInvoiceSelect = (invoice) => {
    setSelectedInvoice(invoice);
    setOpenInvoiceModal(false);
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleClose} 
        fullWidth
      maxWidth="none"
      PaperProps={{
        sx: {
          border: `2px solid ${primaryColor}`,
          boxShadow: `0 0 25px ${primaryColor}30`,
          borderRadius: 3,
          backgroundColor: isDark ? '#121212' : '#fff',
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
        <DialogTitle sx={{ pb: 1, pt: 2, px: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <NoteAddOutlinedIcon sx={{ color: primaryColor, fontSize: 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: primaryColor }}>
                Create Sales Return
              </Typography>
            </Box>
            <IconButton onClick={handleClose} size="small" sx={{ color: 'text.secondary' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0, height: 'calc(100% - 80px)', overflow: 'hidden' }}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Content Area */}
            <Box sx={{ flex: 1, p: {xs: 1.5, sm: 3}, overflow: 'auto', ...scrollbarStyles }}>
              {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {/* Invoice Selection Section */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: primaryColor }}>
                  Select Invoice
                </Typography>
                {selectedInvoice ? (
                  <Paper 
                    sx={{ 
                      p: 3, 
                      bgcolor: `${primaryColor}.50`, 
                      border: `1px solid ${primaryColor}`,
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: `0 4px 12px ${primaryColor}20`,
                      }
                    }}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          <ReceiptIcon sx={{ color: primaryColor, fontSize: 20 }} />
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {selectedInvoice.invoice_number}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Invoice ID
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {selectedInvoice.customer_name}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Box>
                            <Typography variant="body2">
                              {new Date(selectedInvoice.invoice_date).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Invoice Date
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: primaryColor }}>
                          ₹{parseFloat(selectedInvoice.total_amount).toFixed(2)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setOpenInvoiceModal(true)}
                          sx={{ 
                            textTransform: 'none',
                            borderColor: primaryColor,
                            color: primaryColor,
                            '&:hover': {
                              borderWidth: 2,
                              boxShadow: `0 0 8px ${primaryColor}30`,
                            }
                          }}
                        >
                          Change Invoice
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>
                ) : (
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setOpenInvoiceModal(true)}
                    startIcon={<ReceiptIcon />}
                    sx={{ 
                      py: 3, 
                      textTransform: 'none', 
                      borderStyle: 'dashed',
                      borderWidth: 2,
                      borderColor: primaryColor,
                      color: primaryColor,
                      fontSize: {xs: '1rem', sm: '1.1rem'},
                      fontWeight: 500,
                      height: 56,
                      borderRadius: 2,
                      '&:hover': {
                        borderWidth: 2,
                        boxShadow: `0 0 15px ${primaryColor}40`,
                        backgroundColor: `${primaryColor}08`,
                      }
                    }}
                  >
                    Select Invoice to Create Return
                  </Button>
                )}
              </Box>

              {/* Form Fields */}
              <Grid container spacing={2} sx={{ mb: 4, display: 'flex', flexDirection: {xs: 'row', sm: 'row', md: 'row', lg: 'column'} }}>
                <Grid sx={{width: {xs: '100%', sm: '100%'}, display: 'flex', gap: 2, flexDirection: {xs: 'column', sm: 'row'}}}>
                  <Grid item xs={12} sm={6} sx={{width: {xs: '100%', sm: '100%'}}}>
                  <TextField
                    label="Return Date"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} sx={{width: {xs: '100%', sm: '100%' }}}>
                  <TextField
                    label="Discount Amount"
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Grid>
                </Grid>
                <Grid item xs={12} sx={{width: {xs: '100%', sm: '100%' }}}>
                  <TextField
                    label="Reason for Return"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={4}
                    placeholder="Enter detailed reason for the return..."
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        alignItems: 'flex-start',
                      }
                    }}
                  />
                </Grid>
              </Grid>

              {/* Invoice Items Table */}
              {selectedInvoice && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: primaryColor }}>
                    Invoice Items ({invoiceItems.length} items)
                  </Typography>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                      <CircularProgress size={32} sx={{ color: primaryColor }} />
                    </Box>
                  ) : (
                    <Paper 
                      sx={{ 
                        borderRadius: 2, 
                        border: `1px solid ${primaryColor}20`,
                        overflow: 'hidden',
                        boxShadow: 1,
                      }}
                    >
                      <TableContainer sx={{ 
                        maxHeight: 400, 
                        minHeight: 200,
                        ...scrollbarStyles 
                      }}>
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow sx={{ 
                              bgcolor: `${primaryColor}.100`,
                              '& .MuiTableCell-head': {
                                fontWeight: 700,
                                color: primaryColor,
                              }
                            }}>
                              <TableCell>Product</TableCell>
                              <TableCell>HSN</TableCell>
                              <TableCell align="right">Ordered</TableCell>
                              <TableCell align="right">Available</TableCell>
                              <TableCell align="right">Rate</TableCell>
                              <TableCell align="center">Return Qty</TableCell>
                              <TableCell align="right">Amount</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {invoiceItems.map((item) => (
                              <TableRow 
                                key={item.item_id}
                                hover
                                sx={{ 
                                  '&:hover': { 
                                    bgcolor: `${primaryColor}04` 
                                  }
                                }}
                              >
                                <TableCell sx={{ py: 1.5 }}>
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {item.product_name}
                                    </Typography>
                                    {item.barcode && (
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                        {item.barcode}
                                      </Typography>
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ py: 1.5 }}>{item.hsn_code}</TableCell>
                                <TableCell align="right" sx={{ py: 1.5 }}>
                                  {item.ordered_quantity}
                                </TableCell>
                                <TableCell align="right" sx={{ py: 1.5 }}>
                                  <Chip
                                    label={item.available_for_return}
                                    size="small"
                                    color={item.available_for_return > 0 ? 'success' : 'default'}
                                    sx={{ fontWeight: 500 }}
                                  />
                                </TableCell>
                                <TableCell align="right" sx={{ py: 1.5 }}>
                                  ₹{parseFloat(item.rate).toFixed(2)}
                                </TableCell>
                                <TableCell align="center" sx={{ py: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleQuantityChange(item.item_id, item.return_quantity - 1)}
                                      disabled={item.return_quantity === 0}
                                      sx={{ 
                                        color: item.return_quantity === 0 ? 'action.disabled' : primaryColor,
                                        minWidth: 32,
                                        height: 32,
                                      }}
                                    >
                                      <RemoveIcon fontSize="small" />
                                    </IconButton>
                                    <TextField
                                      value={item.return_quantity}
                                      onChange={(e) => handleQuantityChange(item.item_id, parseInt(e.target.value) || 0)}
                                      size="small"
                                      type="number"
                                      sx={{ width: 70, mx: 0.5 }}
                                      inputProps={{
                                        min: 0,
                                        max: item.available_for_return,
                                        style: { textAlign: 'center', fontWeight: 600 },
                                      }}
                                    />
                                    <IconButton
                                      size="small"
                                      onClick={() => handleQuantityChange(item.item_id, item.return_quantity + 1)}
                                      disabled={item.return_quantity >= item.available_for_return}
                                      sx={{ 
                                        color: item.return_quantity >= item.available_for_return ? 'action.disabled' : primaryColor,
                                        minWidth: 32,
                                        height: 32,
                                      }}
                                    >
                                      <AddIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </TableCell>
                                <TableCell align="right" sx={{ py: 1.5 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: primaryColor }}>
                                    ₹{(item.rate * item.return_quantity).toFixed(2)}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  )}

                  {/* Enhanced Totals Summary */}
                  {returnItems.length > 0 && (
                    <Paper 
                      sx={{ 
                        mt: 3, 
                        p: 3, 
                        bgcolor: `linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}04 100%)`,
                        border: `1px solid ${primaryColor}20`,
                        borderRadius: 2,
                        boxShadow: 2,
                      }}
                    >
                      <Grid container spacing={2} alignItems="flex-end">
                        <Grid item xs={6}>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>Subtotal:</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="h6" align="right" sx={{ fontWeight: 700 }}>
                            ₹{calculatedTotals.subtotal.toFixed(2)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body1">CGST:</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body1" align="right">
                            ₹{calculatedTotals.cgstAmount.toFixed(2)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body1">SGST:</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body1" align="right">
                            ₹{calculatedTotals.sgstAmount.toFixed(2)}
                          </Typography>
                        </Grid>
                        {discountAmount > 0 && (
                          <>
                            <Grid item xs={6}>
                              <Typography variant="body1" color="error" sx={{ fontWeight: 500 }}>
                                Discount:
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body1" align="right" color="error" sx={{ fontWeight: 700 }}>
                                -₹{parseFloat(discountAmount).toFixed(2)}
                              </Typography>
                            </Grid>
                          </>
                        )}
                        <Grid item xs={12}>
                          <Divider sx={{ my: 2, borderColor: primaryColor }} />
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: primaryColor }}>
                            TOTAL:
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography 
                            variant="h4" 
                            align="right" 
                            sx={{ 
                              fontWeight: 900, 
                              background: `linear-gradient(135deg, ${primaryColor} 0%, ${theme.palette.primary.dark} 100%)`,
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}
                          >
                            ₹{calculatedTotals.totalAmount.toFixed(2)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  )}
                </>
              )}
            </Box>

            {/* Action Buttons */}
            <Box sx={{ 
              p: 2, 
              borderTop: `1px solid ${primaryColor}20`,
              backgroundColor: isDark ? '#1a1a1a' : '#fafafa',
            }}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexDirection: 'row' }}>
                <Button 
                  variant="outlined" 
                  onClick={handleClose} 
                  disabled={loading}
                  sx={{ 
                    flex: 1, 
                    py: 1, 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={loading || !selectedInvoice || returnItems.length === 0}
                  sx={{ 
                    flex: 1, 
                    py: 1, 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '1rem',
                    boxShadow: `0 4px 15px ${primaryColor}40`,
                  }}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={24} sx={{ mr: 1 }} />
                      Creating...
                    </>
                  ) : (
                    'Create Return'
                  )}
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <InvoiceModal
        open={openInvoiceModal}
        onClose={() => setOpenInvoiceModal(false)}
        onSelect={handleInvoiceSelect}
        returnType="sales"
      />
    </>
  );
};

export default SalesReturnModal;
