import axiosInstance from '../../utils/axiosInstance';
import SalesReturnModal from './SalesReturnModal';
import ReturnsInfo from './ReturnsInfo';
import AddToPhotosOutlinedIcon from "@mui/icons-material/AddToPhotosOutlined";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { generateSalesReturnsListPDF } from '../../components/PDFGeneration/DownloadSalesReturn';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import { useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useState, useEffect } from 'react';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  FilterList as FilterListIcon,
  CalendarToday as CalendarIcon,
  Receipt as ReceiptIcon,
  TrendingDown as TrendingDownIcon,
  Download as DownloadIcon,
  UnfoldMore as UnfoldMoreIcon,
} from '@mui/icons-material';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Fade, Grid, IconButton,
  InputAdornment, Menu, MenuItem, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TextField,
  Tooltip, Typography, Alert,
} from '@mui/material';


// ─── Sorting helpers ────────────────────────────────────────────────────────
const SORTABLE_COLUMNS = {
  'Return No':    { key: 'return_number',                  type: 'string' },
  Date:           { key: 'return_date',                    type: 'date'   },
  Customer:       { key: 'customer_name',                  type: 'string' },
  'Invoice No':   { key: 'original_invoice_number',        type: 'string' },
  Items:          { key: 'total_items',                    type: 'number' },
  'Total Qty':    { key: 'total_quantity',                 type: 'number' },
  Amount:         { key: 'total_amount',                   type: 'number' },
  Status:         { key: 'overall_verification_status',    type: 'string' },
};

const sortData = (data, sortConfig) => {
  if (!sortConfig.key) return data;
  return [...data].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    if (sortConfig.type === 'date') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    }
    if (sortConfig.type === 'number') {
      return sortConfig.direction === 'asc'
        ? parseFloat(aVal || 0) - parseFloat(bVal || 0)
        : parseFloat(bVal || 0) - parseFloat(aVal || 0);
    }
    const aStr = (aVal || '').toString().toLowerCase();
    const bStr = (bVal || '').toString().toLowerCase();
    return sortConfig.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });
};
// ────────────────────────────────────────────────────────────────────────────

const SalesReturn = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [salesReturns, setSalesReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState(null);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [openInfoModal, setOpenInfoModal] = useState(false);
  const [selectedReturnId, setSelectedReturnId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc', type: 'string' });

  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    fetchSalesReturns();
  }, [page, searchQuery, dateFrom, dateTo, statusFilter, rowsPerPage]);

  const fetchSalesReturns = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: page.toString(),
        limit: rowsPerPage.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        ...(statusFilter && { status: statusFilter }),
      };

      const { data } = await axiosInstance.get(`/api/sales-returns`, { params });
      setSalesReturns(data.data.items || []);
      setTotalPages(data.data.pagination.total_pages);
      setTotalItems(data.data.pagination.total_items);
      setSummary(data.data.summary);
    } catch (err) {
      console.error('Error fetching sales returns:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1);
  };

  // ─── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = (header) => {
    const col = SORTABLE_COLUMNS[header];
    if (!col) return;
    setSortConfig((prev) => {
      if (prev.key === col.key) {
        if (prev.direction === 'asc') return { ...prev, direction: 'desc' };
        if (prev.direction === 'desc') return { key: null, direction: 'asc', type: 'string' };
      }
      return { key: col.key, direction: 'asc', type: col.type };
    });
  };

  const SortIcon = ({ header }) => {
    const col = SORTABLE_COLUMNS[header];
    if (!col) return null;
    const isActive = sortConfig.key === col.key;
    return (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', ml: 0.4, opacity: isActive ? 1 : 0.3, transition: 'opacity 0.2s', color: primaryColor }}>
        {isActive && sortConfig.direction === 'asc' ? (
          <ArrowUpwardIcon sx={{ fontSize: 14 }} />
        ) : isActive && sortConfig.direction === 'desc' ? (
          <ArrowDownwardIcon sx={{ fontSize: 14 }} />
        ) : (
          <UnfoldMoreIcon sx={{ fontSize: 14 }} />
        )}
      </Box>
    );
  };
  // ──────────────────────────────────────────────────────────────────────────

  const handleDeleteReturn = async () => {
    if (!returnToDelete) return;
    try {
      await axiosInstance.delete(`/api/sales-returns/${returnToDelete.sales_return_id}`);
      fetchSalesReturns();
      setDeleteDialogOpen(false);
      setReturnToDelete(null);
    } catch (err) {
      console.error('Error deleting sales return:', err);
      alert(err.message);
    }
  };

  const handleViewDetails = (salesReturn) => {
    setSelectedReturnId(salesReturn.sales_return_id);
    setOpenInfoModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'success';
      case 'partially_verified': return 'warning';
      case 'pending': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'verified': return 'Verified';
      case 'partially_verified': return 'Partially Verified';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  const handleFilterClick = (event) => setFilterAnchorEl(event.currentTarget);
  const handleFilterClose = () => setFilterAnchorEl(null);

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setStatusFilter('');
    setPage(1);
    handleFilterClose();
  };

  const scrollbarStyles = {
    '&::-webkit-scrollbar': { height: '8px' },
    '&::-webkit-scrollbar-track': { backgroundColor: isDark ? '#2a2a3a' : '#f1f1f1' },
    '&::-webkit-scrollbar-thumb': { backgroundColor: primaryColor, borderRadius: '4px' },
    '&::-webkit-scrollbar-thumb:hover': { backgroundColor: `${primaryColor}CC` },
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      const params = {
        page: '1', limit: '1000',
        ...(searchQuery && { search: searchQuery }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        ...(statusFilter && { status: statusFilter }),
      };
      const { data } = await axiosInstance.get(`/api/sales-returns`, { params });
      const token = localStorage.getItem('authToken');
      await generateSalesReturnsListPDF(data.data.items || [], token);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sorted data
  const sortedReturns = sortData(salesReturns, sortConfig);

  // Table headers config
  const tableHeaders = [
    { label: 'S.No',       align: 'center', width: 60 },
    { label: 'Actions',    align: 'left'              },
    { label: 'Return No',  align: 'left'              },
    { label: 'Date',       align: 'left'              },
    { label: 'Customer',   align: 'left'              },
    { label: 'Invoice No', align: 'left'              },
    { label: 'Items',      align: 'left'              },
    { label: 'Total Qty',  align: 'left'              },
    { label: 'Amount',     align: 'left'              },
    { label: 'Status',     align: 'left'              },
  ];

  return (
    <Box sx={{ px: isMobile ? 1 : 2, py: isMobile ? 4 : 4, minHeight: "100vh", color: theme.palette.text.primary }}>
      {/* Header Section */}
      <Box flexDirection={isMobile ? "column" : "row"} gap={isMobile ? 2 : 0}
        sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" sx={{ color: primaryColor, fontWeight: 700, mb: 0, display: 'flex', gap: 1 }}>
            <RequestQuoteOutlinedIcon sx={{ fontSize: { xs: 28, sm: 28 }, mt: { xs: 0.3, sm: 0.3 } }} />
            Sales Returns
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Tooltip arrow title="Create Sales Returns">
            <Button variant="outlined" startIcon={<AddToPhotosOutlinedIcon />} onClick={() => setOpenCreateModal(true)}
              sx={{ color: primaryColor, border: `2px solid ${primaryColor}`, fontWeight: "bold", borderRadius: "10px", whiteSpace: "nowrap", width: '100%', textTransform: "none", py: 0.5, minHeight: 36, lineHeight: 1.2, "&:hover": { boxShadow: `0 0 8px ${primaryColor}` } }}>
              Create Returns
            </Button>
          </Tooltip>
        </Box>
      </Box>
      <Box sx={{ mb: 2, mt: { xs: 2, sm: 0 } }}>
        <Typography variant="body2" color="text.secondary">
          Manage and track product returns from customers
        </Typography>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3, width: "100%" }}>
          {/* Total Returns */}
          <Grid sx={{ width: { xs: "100%", sm: "200px" } }} item>
            <Tooltip arrow TransitionComponent={Fade} TransitionProps={{ timeout: 300 }} placement="top"
              title={<div style={{ padding: "4px 8px" }}><Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Total Returns</Typography><Typography variant="body2" sx={{ opacity: 0.9 }}>Total number of sales return entries recorded.</Typography><Typography variant="caption" sx={{ display: "block", mt: 1, fontWeight: 600 }}>Value: {summary.total_returns || 0}</Typography></div>}
              componentsProps={{ tooltip: { sx: { bgcolor: isDark ? "#1e1e1e" : "#ffffff", color: isDark ? "#fff" : "#333", border: `1px solid ${primaryColor}`, boxShadow: `0 4px 15px ${primaryColor}40`, borderRadius: 2 } }, arrow: { sx: { color: isDark ? "#1e1e1e" : "#ffffff" } } }}>
              <Card elevation={4} sx={{ height: "100%", width: { xs: "100%", sm: "200px" }, display: "flex", flexDirection: "column", justifyContent: "center", borderRadius: 2, backgroundColor: "background.paper", border: `1px solid ${primaryColor}`, transition: "transform 0.3s ease, box-shadow 0.3s ease", cursor: "pointer", "&:hover": { transform: "translateY(-4px)", boxShadow: `0 6px 20px ${primaryColor}` } }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Total Returns</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: isDark ? "#fff" : "#4a4a4a" }}>{summary.total_returns || 0}</Typography>
                </CardContent>
              </Card>
            </Tooltip>
          </Grid>

          {/* Total Return Value */}
          <Grid sx={{ width: { xs: "100%", sm: "200px" } }} item>
            <Tooltip arrow TransitionComponent={Fade} TransitionProps={{ timeout: 300 }} placement="top"
              title={<div style={{ padding: "4px 8px" }}><Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Total Return Value</Typography><Typography variant="body2" sx={{ opacity: 0.9 }}>Combined monetary value of all processed sales returns.</Typography><Typography variant="caption" sx={{ display: "block", mt: 1, fontWeight: 600 }}>Value: ₹{parseFloat(summary.total_return_value || 0).toFixed(2)}</Typography></div>}
              componentsProps={{ tooltip: { sx: { bgcolor: isDark ? "#1e1e1e" : "#ffffff", color: isDark ? "#fff" : "#333", border: `1px solid ${primaryColor}`, boxShadow: `0 4px 15px ${primaryColor}40`, borderRadius: 2 } }, arrow: { sx: { color: isDark ? "#1e1e1e" : "#ffffff" } } }}>
              <Card elevation={4} sx={{ height: "100%", width: { xs: "100%", sm: "200px" }, display: "flex", flexDirection: "column", justifyContent: "center", borderRadius: 2, backgroundColor: "background.paper", border: `1px solid ${primaryColor}`, transition: "transform 0.3s ease, box-shadow 0.3s ease", cursor: "pointer", "&:hover": { transform: "translateY(-4px)", boxShadow: `0 6px 20px ${primaryColor}` } }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Total Return Value</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: isDark ? "#fff" : "#4a4a4a" }}>₹{parseFloat(summary.total_return_value || 0).toFixed(2)}</Typography>
                </CardContent>
              </Card>
            </Tooltip>
          </Grid>

          {/* Pending Verification */}
          <Grid sx={{ width: { xs: "100%", sm: "200px" } }} item>
            <Tooltip arrow TransitionComponent={Fade} TransitionProps={{ timeout: 300 }} placement="top"
              title={<div style={{ padding: "4px 8px" }}><Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Pending Verification</Typography><Typography variant="body2" sx={{ opacity: 0.9 }}>Returns awaiting approval or verification.</Typography><Typography variant="caption" sx={{ display: "block", mt: 1, fontWeight: 600 }}>Value: {summary.pending_verification_count || 0}</Typography></div>}
              componentsProps={{ tooltip: { sx: { bgcolor: isDark ? "#1e1e1e" : "#ffffff", color: isDark ? "#fff" : "#333", border: `1px solid ${primaryColor}`, boxShadow: `0 4px 15px ${primaryColor}40`, borderRadius: 2 } }, arrow: { sx: { color: isDark ? "#1e1e1e" : "#ffffff" } } }}>
              <Card elevation={4} sx={{ height: "100%", width: { xs: "100%", sm: "200px" }, display: "flex", flexDirection: "column", justifyContent: "center", borderRadius: 2, backgroundColor: "background.paper", border: `1px solid ${primaryColor}`, transition: "transform 0.3s ease, box-shadow 0.3s ease", cursor: "pointer", "&:hover": { transform: "translateY(-4px)", boxShadow: `0 6px 20px ${primaryColor}` } }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Pending Verification</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "warning.main" }}>{summary.pending_verification_count || 0}</Typography>
                </CardContent>
              </Card>
            </Tooltip>
          </Grid>
        </Grid>
      )}

      {/* Search and Filter Section */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexDirection: { xs: "column", sm: "row" } }}>
          <TextField size="small" placeholder="Search for Sales Returns" value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            sx={{ flex: 1, width: '100%' }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
          />
          <Box sx={{ display: 'flex', gap: '12px' }}>
            <Tooltip title="Filter by Status / Date Range">
              <Button variant="outlined" startIcon={<FilterListIcon />} onClick={handleFilterClick}
                sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' }, borderRadius: 2, border: `2px solid ${primaryColor}`, "&:hover": { borderColor: primaryColor, boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}` } }}>
                Filters
              </Button>
            </Tooltip>
            <Tooltip arrow title="Download Returns List as PDF">
              <IconButton onClick={handleDownload}
                sx={{ gap: "8px", textTransform: "none", color: primaryColor, border: `2px solid ${primaryColor}`, borderRadius: "10px", backgroundColor: "transparent", transition: "all 0.3s ease-in-out", fontWeight: "bold", "&:hover": { borderColor: primaryColor, boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}` } }}>
                <CloudDownloadIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Filter Menu */}
      <Menu anchorEl={filterAnchorEl} open={Boolean(filterAnchorEl)} onClose={handleFilterClose}>
        <Box sx={{ p: 2, minWidth: 300 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>Date Range</Typography>
          <TextField label="From Date" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} sx={{ mb: 2 }} />
          <TextField label="To Date" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} sx={{ mb: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Status</Typography>
          <TextField select label="Verification Status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} fullWidth sx={{ mb: 2 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="verified">Verified</MenuItem>
            <MenuItem value="partially_verified">Partially Verified</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
          </TextField>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={clearFilters} fullWidth sx={{ textTransform: 'none' }}>Clear</Button>
            <Button variant="contained" onClick={handleFilterClose} fullWidth sx={{ textTransform: 'none' }}>Apply</Button>
          </Box>
        </Box>
      </Menu>

      {/* Error Display */}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Table */}
      <Paper sx={{ borderRadius: 2, boxShadow: 2, border: `2px solid ${primaryColor}`, overflow: 'hidden', ...scrollbarStyles }}>
        <TableContainer sx={{ ...scrollbarStyles }}>
          <Table stickyHeader sx={{ minWidth: '1200px' }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: isDark ? "#27273d" : "#f7f9fc" }}>
                {tableHeaders.map(({ label, align, width }) => {
                  const isSortable = !!SORTABLE_COLUMNS[label];
                  const col = SORTABLE_COLUMNS[label];
                  const isActive = col && sortConfig.key === col.key;
                  return (
                    <TableCell
                      key={label}
                      align={align || 'left'}
                      onClick={isSortable ? () => handleSort(label) : undefined}
                      sx={{
                        color: primaryColor,
                        fontWeight: 600,
                        ...(width && { width }),
                        ...(label === 'S.No' && { textAlign: 'center' }),
                        cursor: isSortable ? 'pointer' : 'default',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        ...(isActive && { backgroundColor: `${primaryColor}18` }),
                        '&:hover': isSortable ? { backgroundColor: `${primaryColor}22` } : {},
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                        {label}
                        {isSortable && <SortIcon header={label} />}
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 8 }}><CircularProgress /></TableCell></TableRow>
              ) : sortedReturns.length === 0 ? (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 8 }}><Typography color="text.secondary">No sales returns found</Typography></TableCell></TableRow>
              ) : (
                sortedReturns.map((returnItem, index) => (
                  <TableRow key={returnItem.sales_return_id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary', textAlign: 'center' }}>
                      {(page - 1) * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton onClick={() => handleViewDetails(returnItem)} color="primary"
                            sx={{ borderRadius: "50%", border: `1px solid ${primaryColor}`, color: primaryColor, "&:hover": { boxShadow: `0 0 8px ${primaryColor}` } }}>
                            <TrackChangesIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {returnItem.overall_verification_status === 'pending' && (
                          <Tooltip title="Delete">
                            <IconButton onClick={() => { setReturnToDelete(returnItem); setDeleteDialogOpen(true); }} color="error"
                              sx={{ borderRadius: "50%", border: `1px solid red`, "&:hover": { boxShadow: `0 0 8px red` } }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{returnItem.return_number}</Typography></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        {new Date(returnItem.return_date).toLocaleDateString()}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{returnItem.customer_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{returnItem.customer_mobile}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ReceiptIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        {returnItem.original_invoice_number}
                      </Box>
                    </TableCell>
                    <TableCell>{returnItem.total_items || 0}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{returnItem.total_quantity || 0}</Typography>
                      {returnItem.total_verified_quantity > 0 && (
                        <Typography variant="caption" color="success.main">({returnItem.total_verified_quantity} verified)</Typography>
                      )}
                    </TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>₹{parseFloat(returnItem.total_amount || 0).toFixed(2)}</Typography></TableCell>
                    <TableCell>
                      <Chip label={getStatusLabel(returnItem.overall_verification_status)} color={getStatusColor(returnItem.overall_verification_status)} size="small" sx={{ fontWeight: 500 }} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {totalItems > 0 && (
          <Box sx={{ borderTop: `1px solid ${isDark ? '#40444d' : '#e0e0e0'}`, p: 2, backgroundColor: isDark ? '#1e1e2e' : '#fafafa' }}>
            <TablePagination
              rowsPerPageOptions={[5, 10, 20, 50]}
              component="div"
              count={totalItems}
              rowsPerPage={rowsPerPage}
              page={(page - 1)}
              onPageChange={(event, newPage) => handleChangePage(event, newPage + 1)}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Rows per page:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
              sx={{
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { color: theme.palette.text.primary, fontWeight: 500 },
                '& .MuiTablePagination-actions': { color: primaryColor },
                '& .MuiSelect-select': { color: primaryColor },
              }}
            />
          </Box>
        )}
      </Paper>

      {/* Create Sales Return Modal */}
      <SalesReturnModal open={openCreateModal} onClose={() => setOpenCreateModal(false)} onSuccess={() => { setOpenCreateModal(false); fetchSalesReturns(); }} />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: { border: `2px solid ${primaryColor}`, boxShadow: `0 0 15px ${primaryColor}`, borderRadius: 3 } }}>
        <DialogTitle sx={{ color: primaryColor }}>Confirm Delete ?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete sales return <strong>{returnToDelete?.return_number}</strong>?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>This action cannot be undone. Only returns with no verified items can be deleted.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none', color: 'gray' }}>Cancel</Button>
          <Button onClick={handleDeleteReturn} sx={{ borderRadius: 2, color: 'red', textTransform: 'none', border: `2px solid red`, "&:hover": { boxShadow: `0 0 8px red` } }}>Delete</Button>
        </DialogActions>
      </Dialog>

      <ReturnsInfo open={openInfoModal} onClose={() => setOpenInfoModal(false)} salesReturnId={selectedReturnId} />
    </Box>
  );
};

export default SalesReturn;