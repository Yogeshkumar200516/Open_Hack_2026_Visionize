import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
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
  Chip,
  InputAdornment,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Tooltip,
  useTheme,
  useMediaQuery,
  Fade,
  TablePagination,
  Stack,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  FilterList as FilterListIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useAuth } from '../../Context/AuthContext';
import API_BASE_URL from '../../Context/Api';
import ManageHistoryOutlinedIcon from '@mui/icons-material/ManageHistoryOutlined';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ReturnStockModal from './ReturnStockModal';
import { generateReturnStockListPDF } from '../../components/PDFGeneration/DownloadReturnStock';

const ReturnStock = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useAuth();
  
  const [allReturns, setAllReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [returnTypeFilter, setReturnTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  
  // Verification Modal States
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);

  // Stock Summary - Updated to use filtered summary from backend
  const [stockSummary, setStockSummary] = useState(null);
  const [filteredSummary, setFilteredSummary] = useState(null);

  const scrollbarStyles = {
    '&::-webkit-scrollbar': {
      height: '8px',
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: isDark ? '#2a2a3a' : '#f1f1f1',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: primaryColor,
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: `${primaryColor}CC`,
    },
  };

  useEffect(() => {
    fetchAllReturns();
  }, [page, searchQuery, returnTypeFilter, statusFilter, dateFrom, dateTo, rowsPerPage]);

  useEffect(() => {
    fetchStockSummary();
  }, []);

  const fetchAllReturns = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: rowsPerPage.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(returnTypeFilter !== 'all' && { return_type: returnTypeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
      });

      const response = await fetch(
        `${API_BASE_URL}/api/return-stock/all-returns?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch returns');
      }

      const data = await response.json();
      setAllReturns(data.data.items || []);
      setTotalPages(data.data.pagination.total_pages);
      setTotalItems(data.data.pagination.total_items);
      
      // Set filtered summary from backend response
      if (data.data.summary) {
        setFilteredSummary(data.data.summary);
      }
    } catch (err) {
      console.error('Error fetching returns:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockSummary = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/api/return-stock/stock-summary`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stock summary');
      }

      const data = await response.json();
      setStockSummary(data.data.overall_summary);
    } catch (err) {
      console.error('Error fetching stock summary:', err);
    }
  };

  const handleActionClick = (item) => {
    setSelectedItem(item);
    
    if (item.verification_status === 'verified') {
      // View mode for verified items
      setIsViewMode(true);
    } else {
      // Edit/verify mode for pending/partially verified items
      setIsViewMode(false);
    }
    
    setVerificationModalOpen(true);
  };

  const handleVerificationSuccess = () => {
    fetchAllReturns();
    fetchStockSummary();
    setVerificationModalOpen(false);
    setSelectedItem(null);
    setIsViewMode(false);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1);
  };

  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setReturnTypeFilter('all');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    handleFilterClose();
  };

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Get ALL returns (not just current page) for complete PDF
      const params = new URLSearchParams({
        page: '1',
        limit: '10000', // Get all records
        ...(searchQuery && { search: searchQuery }),
        ...(returnTypeFilter !== 'all' && { return_type: returnTypeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
      });

      const response = await fetch(
        `${API_BASE_URL}/api/return-stock/all-returns?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch data for PDF');
      }

      const data = await response.json();
      const allReturnsList = data.data.items || [];

      // Generate PDF with filtered data
      await generateReturnStockListPDF(allReturnsList, token);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getReturnTypeColor = (type) => {
    return type === 'sales_return' ? 'primary' : 'secondary';
  };

  const getReturnTypeLabel = (type) => {
    return type === 'sales_return' ? 'Sales Return' : 'Purchase Return';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified':
        return 'success';
      case 'partially_verified':
        return 'warning';
      case 'pending':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'partially_verified':
        return 'Partially Verified';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  // Use filtered summary if available, otherwise use overall summary
  const displaySummary = filteredSummary || stockSummary;

  return (
    <Box sx={{ 
      px: isMobile ? 1 : 2,
      py: isMobile ? 4 : 4,
      minHeight: "100vh",
      color: theme.palette.text.primary, 
    }}>
      {/* Header Section */}
      <Box sx={{ mt: 3, mb: 3 }}>
        <Box>
          <Typography variant="h5" 
            sx={{ 
              color: primaryColor, 
              fontWeight: 700, 
              mb: 0, 
              display: 'flex', 
              gap: 1,
            }}
          >
            <ManageHistoryOutlinedIcon sx={{ fontSize: { xs: 28, sm: 28 }, mt: {xs: 0.3, sm: 0.3} }} />
            Return Stock Verification
          </Typography>
        </Box>
        <Box sx={{ mb: 2, mt: { xs: 2, sm: 0 } }}>
          <Typography variant="body2" color="text.secondary">
            Verify and categorize returned items as sellable, damaged, or scrap
          </Typography>
        </Box>
      </Box>

      {/* Stock Summary Cards with Tooltips - Using Backend Summary */}
      {displaySummary && (
        <Grid container spacing={2} sx={{ mb: 3, width: "100%" }}>
          {/* Pending Quantity */}
          <Grid sx={{ width: { xs: "100%", sm: "200px" } }} item>
            <Tooltip
              arrow
              TransitionComponent={Fade}
              TransitionProps={{ timeout: 300 }}
              placement="top"
              title={
                <div style={{ padding: "4px 8px" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Pending Quantity
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Items awaiting verification
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 1, fontWeight: 600 }}
                  >
                    Value: {displaySummary.total_pending_quantity || 0}
                  </Typography>
                </div>
              }
              componentsProps={{
                tooltip: {
                  sx: {
                    bgcolor: isDark ? "#1e1e1e" : "#ffffff",
                    color: isDark ? "#fff" : "#333",
                    border: `1px solid ${primaryColor}`,
                    boxShadow: `0 4px 15px ${primaryColor}40`,
                    borderRadius: 2,
                  },
                },
                arrow: {
                  sx: {
                    color: isDark ? "#1e1e1e" : "#ffffff",
                  },
                },
              }}
            >
              <Card
                elevation={4}
                sx={{
                  height: "100%",
                  width: { xs: "100%", sm: "200px" },
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  borderRadius: 2,
                  backgroundColor: "background.paper",
                  border: `1px solid ${theme.palette.warning.main}`,
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  cursor: "pointer",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: `0 6px 20px ${theme.palette.warning.main}`,
                  },
                }}
              >
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Pending Qty
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: 'warning.main',
                    }}
                  >
                    {displaySummary.total_pending_quantity || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Tooltip>
          </Grid>

          {/* Verified Quantity */}
          <Grid sx={{ width: { xs: "100%", sm: "200px" } }} item>
            <Tooltip
              arrow
              TransitionComponent={Fade}
              TransitionProps={{ timeout: 300 }}
              placement="top"
              title={
                <div style={{ padding: "4px 8px" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Verified Quantity
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Items already verified
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 1, fontWeight: 600 }}
                  >
                    Value: {displaySummary.total_verified_quantity || 0}
                  </Typography>
                </div>
              }
              componentsProps={{
                tooltip: {
                  sx: {
                    bgcolor: isDark ? "#1e1e1e" : "#ffffff",
                    color: isDark ? "#fff" : "#333",
                    border: `1px solid ${primaryColor}`,
                    boxShadow: `0 4px 15px ${primaryColor}40`,
                    borderRadius: 2,
                  },
                },
                arrow: {
                  sx: {
                    color: isDark ? "#1e1e1e" : "#ffffff",
                  },
                },
              }}
            >
              <Card
                elevation={4}
                sx={{
                  height: "100%",
                  width: { xs: "100%", sm: "200px" },
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  borderRadius: 2,
                  backgroundColor: "background.paper",
                  border: `1px solid ${primaryColor}`,
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  cursor: "pointer",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: `0 6px 20px ${primaryColor}`,
                  },
                }}
              >
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Verified Qty
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: primaryColor }}
                  >
                    {displaySummary.total_verified_quantity || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Tooltip>
          </Grid>

          {/* Sellable Stock */}
          <Grid sx={{ width: { xs: "100%", sm: "200px" } }} item>
            <Tooltip
              arrow
              TransitionComponent={Fade}
              TransitionProps={{ timeout: 300 }}
              placement="top"
              title={
                <div style={{ padding: "4px 8px" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Sellable Stock
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Items verified as ready to sell
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 1, fontWeight: 600 }}
                  >
                    Value: {displaySummary.total_sellable_stock || 0}
                  </Typography>
                </div>
              }
              componentsProps={{
                tooltip: {
                  sx: {
                    bgcolor: isDark ? "#1e1e1e" : "#ffffff",
                    color: isDark ? "#fff" : "#333",
                    border: `1px solid ${primaryColor}`,
                    boxShadow: `0 4px 15px ${primaryColor}40`,
                    borderRadius: 2,
                  },
                },
                arrow: {
                  sx: {
                    color: isDark ? "#1e1e1e" : "#ffffff",
                  },
                },
              }}
            >
              <Card
                elevation={4}
                sx={{
                  height: "100%",
                  width: { xs: "100%", sm: "200px" },
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  borderRadius: 2,
                  backgroundColor: "background.paper",
                  border: `1px solid ${theme.palette.success.main}`,
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  cursor: "pointer",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: `0 6px 20px ${theme.palette.success.main}`,
                  },
                }}
              >
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Sellable Stock
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: 'success.main' }}
                  >
                    {displaySummary.total_sellable_stock || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Tooltip>
          </Grid>

          {/* Damaged Stock */}
          <Grid sx={{ width: { xs: "100%", sm: "200px" } }} item>
            <Tooltip
              arrow
              TransitionComponent={Fade}
              TransitionProps={{ timeout: 300 }}
              placement="top"
              title={
                <div style={{ padding: "4px 8px" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Damaged Stock
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Items categorized as damaged
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 1, fontWeight: 600 }}
                  >
                    Value: {displaySummary.total_damaged_stock || 0}
                  </Typography>
                </div>
              }
              componentsProps={{
                tooltip: {
                  sx: {
                    bgcolor: isDark ? "#1e1e1e" : "#ffffff",
                    color: isDark ? "#fff" : "#333",
                    border: `1px solid ${primaryColor}`,
                    boxShadow: `0 4px 15px ${primaryColor}40`,
                    borderRadius: 2,
                  },
                },
                arrow: {
                  sx: {
                    color: isDark ? "#1e1e1e" : "#ffffff",
                  },
                },
              }}
            >
              <Card
                elevation={4}
                sx={{
                  height: "100%",
                  width: { xs: "100%", sm: "200px" },
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  borderRadius: 2,
                  backgroundColor: "background.paper",
                  border: `1px solid ${theme.palette.warning.main}`,
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  cursor: "pointer",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: `0 6px 20px ${theme.palette.warning.main}`,
                  },
                }}
              >
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Damaged Stock
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: 'warning.main' }}
                  >
                    {displaySummary.total_damaged_stock || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Tooltip>
          </Grid>

          {/* Scrap Stock */}
          <Grid sx={{ width: { xs: "100%", sm: "200px" } }} item>
            <Tooltip
              arrow
              TransitionComponent={Fade}
              TransitionProps={{ timeout: 300 }}
              placement="top"
              title={
                <div style={{ padding: "4px 8px" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Scrap Stock
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Items marked as scrap/unusable
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 1, fontWeight: 600 }}
                  >
                    Value: {displaySummary.total_scrap_stock || 0}
                  </Typography>
                </div>
              }
              componentsProps={{
                tooltip: {
                  sx: {
                    bgcolor: isDark ? "#1e1e1e" : "#ffffff",
                    color: isDark ? "#fff" : "#333",
                    border: `1px solid ${primaryColor}`,
                    boxShadow: `0 4px 15px ${primaryColor}40`,
                    borderRadius: 2,
                  },
                },
                arrow: {
                  sx: {
                    color: isDark ? "#1e1e1e" : "#ffffff",
                  },
                },
              }}
            >
              <Card
                elevation={4}
                sx={{
                  height: "100%",
                  width: { xs: "100%", sm: "200px" },
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  borderRadius: 2,
                  backgroundColor: "background.paper",
                  border: `1px solid ${theme.palette.error.main}`,
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  cursor: "pointer",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: `0 6px 20px ${theme.palette.error.main}`,
                  },
                }}
              >
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Scrap Stock
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: 'error.main' }}
                  >
                    {displaySummary.total_scrap_stock || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Tooltip>
          </Grid>
        </Grid>
      )}

      {/* Search and Filter Section */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2}}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexDirection: {xs: "column", sm: "row"}  }}>
          <TextField
            size="small"
            placeholder="Search for products..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            sx={{ flex: 1, width: '100%' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{display: 'flex', gap: '12px'}}>
            <Tooltip title="Filter by Status / Type / Date">
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={handleFilterClick}
                sx={{ 
                  textTransform: 'none', 
                  width: {xs: '100%', sm: 'auto'}, 
                  borderRadius: 2, 
                  border: `2px solid ${primaryColor}`,
                  "&:hover": {
                    borderColor: primaryColor,
                    boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                  }, 
                }}
              >
                Filters
              </Button>
            </Tooltip>

            <Tooltip arrow title="Download Return Stock List as PDF">
              <IconButton
                onClick={handleDownloadPDF}
                disabled={loading}
                sx={{
                  gap: "8px",
                  textTransform: "none",
                  color: primaryColor,
                  border: `2px solid ${primaryColor}`,
                  borderRadius: "10px",
                  backgroundColor: "transparent",
                  transition: "all 0.3s ease-in-out",
                  fontWeight: "bold",
                  "&:hover": {
                    borderColor: primaryColor,
                    boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                  },
                }}
              >
                <CloudDownloadIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleFilterClose}
      >
        <Box sx={{ p: 2, minWidth: 300 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Return Type
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <RadioGroup
              value={returnTypeFilter}
              onChange={(e) => {
                setReturnTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <FormControlLabel value="all" control={<Radio size="small" />} label="All" />
              <FormControlLabel value="sales_return" control={<Radio size="small" />} label="Sales Returns" />
              <FormControlLabel value="purchase_return" control={<Radio size="small" />} label="Purchase Returns" />
            </RadioGroup>
          </FormControl>

          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Verification Status
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <RadioGroup
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <FormControlLabel value="all" control={<Radio size="small" />} label="All" />
              <FormControlLabel value="pending" control={<Radio size="small" />} label="Pending" />
              <FormControlLabel value="partially_verified" control={<Radio size="small" />} label="Partially Verified" />
              <FormControlLabel value="verified" control={<Radio size="small" />} label="Verified" />
            </RadioGroup>
          </FormControl>

          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Date Range
          </Typography>
          <TextField
            label="From Date"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            fullWidth
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            label="To Date"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            fullWidth
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={clearFilters}
              fullWidth
              sx={{ textTransform: 'none' }}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              onClick={handleFilterClose}
              fullWidth
              sx={{ textTransform: 'none' }}
            >
              Apply
            </Button>
          </Box>
        </Box>
      </Menu>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Returns Table */}
      <Paper sx={{ 
        borderRadius: 2, 
        boxShadow: 2, 
        border: `2px solid ${primaryColor}`,
        overflow: 'hidden',
        ...scrollbarStyles
      }}>
        <TableContainer sx={{ ...scrollbarStyles }}>
          <Table stickyHeader sx={{ minWidth: '1200px' }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: isDark ? "#27273d" : "#f7f9fc" }}>
                <TableCell sx={{ color: primaryColor, fontWeight: 600, width: 60, textAlign: 'center' }}>S.No</TableCell>
                <TableCell sx={{ color: primaryColor, fontWeight: 600 }}>Actions</TableCell>
                <TableCell sx={{ color: primaryColor, fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ color: primaryColor, fontWeight: 600 }}>Return No</TableCell>
                <TableCell sx={{ color: primaryColor, fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ color: primaryColor, fontWeight: 600 }}>Product</TableCell>
                <TableCell sx={{ color: primaryColor, fontWeight: 600 }}>Customer/Supplier</TableCell>
                <TableCell sx={{ color: primaryColor, fontWeight: 600 }} align="right">Pending Qty</TableCell>
                <TableCell sx={{ color: primaryColor, fontWeight: 600 }} align="right">Verified</TableCell>
                <TableCell sx={{ color: primaryColor, fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : allReturns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">No returns found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                allReturns.map((item, index) => (
                  <TableRow 
                    key={`${item.return_type}-${item.return_item_id}`} 
                    hover
                    sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary', textAlign: 'center' }}>
                      {(page - 1) * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={item.verification_status === 'verified' ? "View Details" : "Verify Item"}>
                        <IconButton
                          onClick={() => handleActionClick(item)}
                          color="primary"
                          sx={{
                            borderRadius: "50%",
                            border: `1px solid ${primaryColor}`,
                            color: primaryColor,
                            "&:hover": {
                              boxShadow: `0 0 8px ${primaryColor}`,
                            },
                          }}
                        >
                          {item.verification_status === 'verified' ? (
                            <VerifiedUserIcon fontSize="small" />
                          ) : (
                            <VisibilityIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getReturnTypeLabel(item.return_type)}
                        color={getReturnTypeColor(item.return_type)}
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.return_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        {new Date(item.return_date).toLocaleDateString()}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.product_name}
                      </Typography>
                      {item.barcode && (
                        <Typography variant="caption" color="text.secondary">
                          {item.barcode}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{item.customer_supplier_name}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={item.pending_quantity}
                        color={item.pending_quantity > 0 ? "warning" : "default"}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                        {item.verified_quantity || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(item.verification_status)}
                        color={getStatusColor(item.verification_status)}
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* TablePagination */}
        {totalItems > 0 && (
          <Box
            sx={{
              borderTop: `1px solid ${isDark ? '#40444d' : '#e0e0e0'}`,
              p: 2,
              backgroundColor: isDark ? '#1e1e2e' : '#fafafa',
            }}
          >
            <TablePagination
              rowsPerPageOptions={[5, 10, 20, 50]}
              component="div"
              count={totalItems}
              rowsPerPage={rowsPerPage}
              page={(page - 1)}
              onPageChange={(event, newPage) => handleChangePage(event, newPage + 1)}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Rows per page:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} of ${count}`
              }
              sx={{
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  color: theme.palette.text.primary,
                  fontWeight: 500,
                },
                '& .MuiTablePagination-actions': {
                  color: primaryColor,
                },
                '& .MuiSelect-select': {
                  color: primaryColor,
                },
              }}
            />
          </Box>
        )}
      </Paper>

      {/* Verification Modal */}
      <ReturnStockModal
        open={verificationModalOpen}
        onClose={() => {
          setVerificationModalOpen(false);
          setSelectedItem(null);
          setIsViewMode(false);
        }}
        selectedItem={selectedItem}
        onSuccess={handleVerificationSuccess}
        isViewMode={isViewMode}
      />
    </Box>
  );
};

export default ReturnStock;