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
  Checkbox,
  InputAdornment,
  CircularProgress,
  Alert,
  Chip,
  Radio,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Pagination,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  CalendarToday as CalendarIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import API_BASE_URL from '../../Context/Api';

const InvoiceModal = ({ open, onClose, onSelect, returnType = 'sales' }) => {
  const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const primaryColor = theme.palette.primary.main;
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (open) {
      fetchInvoices();
    }
  }, [open, page, searchQuery, paymentStatusFilter, dateFrom, dateTo, returnType]);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchQuery && { search: searchQuery }),
        ...(paymentStatusFilter && { payment_status: paymentStatusFilter }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
      });

      // Determine the endpoint based on return type
      const endpoint =
        returnType === 'sales'
          ? `${API_BASE_URL}/api/sales-returns/invoices`
          : `${API_BASE_URL}/api/purchase-returns/invoices`;

      const response = await fetch(`${endpoint}?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data = await response.json();
      setInvoices(data.data.invoices || []);
      setTotalPages(data.data.pagination.total_pages);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInvoice = (invoice) => {
    setSelectedInvoice(invoice);
  };

  const handleConfirmSelection = () => {
    if (selectedInvoice) {
      onSelect(selectedInvoice);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedInvoice(null);
    setSearchQuery('');
    setPaymentStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    setShowFilters(false);
    onClose();
  };

  const getPaymentStatusColor = (status) => {
    return status === 'Full Payment' ? 'success' : 'warning';
  };

  return (
    <Dialog 
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
    open={open} onClose={handleClose}
    >
      <DialogTitle>
        <Box 
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, color: primaryColor, fontSize: {xs: '1rem', sm: '1.2rem'} }}>
            Select Invoice for {returnType === 'sales' ? 'Sales' : 'Purchase'} Return
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Search and Filter Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              placeholder="Search by invoice number, customer, mobile..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant={showFilters ? 'contained' : 'outlined'}
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{ textTransform: 'none', minWidth: 100 }}
            >
              Filters
            </Button>
          </Box>

          {/* Filter Options */}
          {showFilters && (
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: primaryColor }}>
                Filter Options
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl component="fieldset">
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                    Payment Status
                  </Typography>
                  <RadioGroup
                    row
                    value={paymentStatusFilter}
                    onChange={(e) => {
                      setPaymentStatusFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <FormControlLabel value="" control={<Radio size="small" />} label="All" />
                    <FormControlLabel
                      value="Full Payment"
                      control={<Radio size="small" />}
                      label="Full Payment"
                    />
                    <FormControlLabel
                      value="Advance"
                      control={<Radio size="small" />}
                      label="Advance"
                    />
                  </RadioGroup>
                </FormControl>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="From Date"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(1);
                    }}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="To Date"
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(1);
                    }}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setPaymentStatusFilter('');
                    setDateFrom('');
                    setDateTo('');
                    setPage(1);
                  }}
                  sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                >
                  Clear Filters
                </Button>
              </Box>
            </Paper>
          )}
        </Box>

        {/* Invoice Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : invoices.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">No invoices found</Typography>
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" sx={{minWidth: '1000px'}}>
                <TableHead>
                  <TableRow sx={{backgroundColor: isDark ? "#262626" : "#e7e5e5"}}>
                    <TableCell padding="checkbox"></TableCell>
                    <TableCell sx={{ fontWeight: 600, color: primaryColor }}>Invoice No</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: primaryColor }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: primaryColor }}>
                      {returnType === 'sales' ? 'Customer' : 'Supplier'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: primaryColor }} align="right">
                      Items
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: primaryColor }} align="right">
                      Available
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: primaryColor }} align="right">
                      Amount
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: primaryColor }}>Payment</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow
                      key={invoice.invoice_id}
                      hover
                      onClick={() => handleSelectInvoice(invoice)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor:
                          selectedInvoice?.invoice_id === invoice.invoice_id
                            ? 'primary.50'
                            : 'inherit',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Radio
                          checked={selectedInvoice?.invoice_id === invoice.invoice_id}
                          onChange={() => handleSelectInvoice(invoice)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ReceiptIcon fontSize="small" color="action" />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {invoice.invoice_number}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {new Date(invoice.invoice_date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {returnType === 'sales'
                            ? invoice.customer_name
                            : invoice.supplier_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {returnType === 'sales'
                            ? invoice.customer_mobile
                            : invoice.supplier_mobile}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{invoice.total_items}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={invoice.available_for_return}
                          size="small"
                          color="success"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          ₹{parseFloat(invoice.total_amount).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.payment_status}
                          size="small"
                          color={getPaymentStatusColor(invoice.payment_status)}
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(e, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button sx={{textTransform: 'none'}} onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleConfirmSelection}
          disabled={!selectedInvoice}
          sx={{textTransform: 'none'}}
        >
          Select Invoice
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceModal;
