import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  TablePagination,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import AddLocationAltOutlinedIcon from '@mui/icons-material/AddLocationAltOutlined';
import axios from 'axios';
import API_BASE_URL from '../../Context/Api';
import BillingAddressModal from './AddressModal';
import DrawIcon from '@mui/icons-material/Draw';
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import HourglassBottomOutlinedIcon from '@mui/icons-material/HourglassBottomOutlined';

const getUserAndToken = () => {
  const user = localStorage.getItem('user');
  const token =
    localStorage.getItem('authToken') ||
    (JSON.parse(user || '{}').token);
  return {
    user: user ? JSON.parse(user) : null,
    authToken: token,
  };
};

const initialFormState = {
  address_name: '',
  address: '',
  cell_no1: '',
  cell_no2: '',
  gst_no: '',
  pan_no: '',
  account_name: '',
  bank_name: '',
  branch_name: '',
  ifsc_code: '',
  account_number: '',
  email: '',
  website: '',
};

const BillingAddressManager = ({ companyId, authToken }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryColor = theme.palette.primary.main;
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });
  const closeSnackbar = () => setSnackbar({ ...snackbar, open: false });

  // Fetch addresses
  const fetchAddresses = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/address/${companyId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setAddresses(res.data);
    } catch (err) {
      console.error('Failed to load billing addresses:', err);
      showSnackbar('Failed to load billing addresses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [companyId]);

  // Open modal for add
  const handleAdd = () => {
    setFormData(initialFormState);
    setEditId(null);
    setModalOpen(true);
  };

  // Edit address
  const handleEdit = (address) => {
    setFormData({
      address_name: address.address_name || '',
      address: address.address || '',
      cell_no1: address.cell_no1 || '',
      cell_no2: address.cell_no2 || '',
      gst_no: address.gst_no || '',
      pan_no: address.pan_no || '',
      account_name: address.account_name || '',
      bank_name: address.bank_name || '',
      branch_name: address.branch_name || '',
      ifsc_code: address.ifsc_code || '',
      account_number: address.account_number || '',
      email: address.email || '',
      website: address.website || '',
    });
    setEditId(address.billing_address_id);
    setModalOpen(true);
  };

  // Delete confirmation open
  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setConfirmDeleteOpen(true);
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/address/${deleteId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      showSnackbar('Billing address deleted', 'success');
      setConfirmDeleteOpen(false);
      setDeleteId(null);
      fetchAddresses();
    } catch (err) {
      console.error('Delete failed:', err);
      showSnackbar('Failed to delete billing address', 'error');
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((d) => ({ ...d, [name]: value }));
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!formData.address_name.trim() || !formData.address.trim()) {
      showSnackbar('Address Name and Address are required.', 'warning');
      return;
    }
    try {
      if (editId) {
        await axios.put(`${API_BASE_URL}/api/address/${editId}`, formData, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        showSnackbar('Billing address updated', 'success');
      } else {
        await axios.post(
          `${API_BASE_URL}/api/address`,
          { ...formData, company_id: companyId },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        showSnackbar('Billing address added', 'success');
      }
      setModalOpen(false);
      fetchAddresses();
    } catch (err) {
      console.error('Save failed:', err);
      showSnackbar('Failed to save billing address', 'error');
    }
  };

  // Filter by search term
  const filteredAddresses = addresses.filter((addr) => {
    const term = searchTerm.toLowerCase();
    return (
      addr.address_name?.toLowerCase().includes(term) ||
      addr.address?.toLowerCase().includes(term) ||
      addr.cell_no1?.toLowerCase().includes(term) ||
      addr.cell_no2?.toLowerCase().includes(term) ||
      addr.gst_no?.toLowerCase().includes(term) ||
      addr.pan_no?.toLowerCase().includes(term) ||
      addr.bank_name?.toLowerCase().includes(term) ||
      addr.ifsc_code?.toLowerCase().includes(term) ||
      addr.email?.toLowerCase().includes(term)
    );
  });

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Paginated addresses
  const paginatedAddresses = filteredAddresses.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box
      sx={{
        px: isMobile ? 0.5 : 2,
        py: isMobile ? 4 : 6,
        minHeight: '100vh',
        color: theme.palette.text.primary,
      }}
    >
      <Typography variant="h5" fontWeight="bold" color={primaryColor}>
        Billing Addresses
      </Typography>

      <Box
        display="flex"
        justifyContent="space-between"
        mb={4}
        mt={3}
        flexDirection={isMobile ? 'column' : 'row'}
        gap={isMobile ? 2 : 0}
        alignItems="center"
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: theme.palette.background.paper,
            borderRadius: '40px',
            p: '6px 14px',
            width: { xs: '90%', sm: 'auto' },
            maxWidth: 400,
            minWidth: 280,
            boxShadow: `0 0 6px ${primaryColor}33`,
            border: `2px solid ${primaryColor}`,
            transition: 'all 0.3s ease',
          }}
        >
          <SearchIcon sx={{ color: primaryColor, fontSize: 22, mr: 1 }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search billing addresses..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              color: theme.palette.text.primary,
              fontSize: 16,
              fontFamily: "'Inter', sans-serif",
            }}
          />
          {searchTerm && (
            <CloseIcon
              onClick={() => setSearchTerm('')}
              sx={{ color: 'gray', fontSize: 20, cursor: 'pointer' }}
            />
          )}
        </Box>

        <Button
          variant="outlined"
          onClick={handleAdd}
          startIcon={<AddLocationAltOutlinedIcon sx={{ fontSize: '18px' }} />}
          sx={{
            color: primaryColor,
            border: `2px solid ${primaryColor}`,
            fontWeight: 'bold',
            borderRadius: 2,
            whiteSpace: 'nowrap',
            textTransform: 'none',
            mt: isMobile ? 2 : 0,
            '&:hover': {
              boxShadow: `0 0 8px ${primaryColor}`,
            },
          }}
        >
          Add Billing Address
        </Button>
      </Box>

      <Typography sx={{ fontSize: { xs: '12px', sm: '14px' }, color: 'gray', mb: 1 }}>
        Note: Addresses added here can be selected in GST Invoice page for Invoice generation as selected company address
      </Typography>

      {loading ? (
        <Box textAlign="center" mt={6}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <>
          <TableContainer
            component={Paper}
            sx={{
              border: `2px solid ${primaryColor}`,
              borderRadius: 2,
              boxShadow: `0 0 10px ${primaryColor}66`,
              overflowX: 'auto',
              '&::-webkit-scrollbar': { height: 8 },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: primaryColor,
                borderRadius: 8,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: isDark ? '#212121' : '#eee',
              },
              scrollbarColor: `${primaryColor} ${isDark ? '#212121' : '#eee'}`,
              scrollbarWidth: 'thin',
            }}
          >
            <Table size={isMobile ? 'small' : 'medium'} stickyHeader sx={{ minWidth: 1100 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: isDark ? '#27273d' : '#f7f9fc' }}>
                  {[
                    'S.No',
                    'Address Name',
                    'Address',
                    'Phone 1',
                    'GST No.',
                    'PAN No.',
                    'Bank Name',
                    'Email',
                    'Actions',
                  ].map((header) => (
                    <TableCell
                      key={header}
                      sx={{
                        color: primaryColor,
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        fontSize: { xs: '0.9rem', sm: '1rem' },
                        py: 2,
                      }}
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedAddresses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 1,
                          color: 'text.secondary',
                        }}
                      >
                        <HourglassBottomOutlinedIcon sx={{ fontSize: 48, color: primaryColor }} />
                        No billing addresses found.
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAddresses.map((addr, index) => (
                    <TableRow key={addr.billing_address_id} hover>
                      <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                        {page * rowsPerPage + index + 1}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{addr.address_name}</TableCell>
                      <TableCell
                        sx={{
                          maxWidth: 250,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}
                        title={addr.address}
                      >
                        {addr.address}
                      </TableCell>
                      <TableCell>{addr.cell_no1}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{addr.gst_no}</TableCell>
                      <TableCell>{addr.pan_no}</TableCell>
                      <TableCell>{addr.bank_name}</TableCell>
                      <TableCell>{addr.email}</TableCell>
                      <TableCell align="left" sx={{ minWidth: 150 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            color="primary"
                            onClick={() => handleEdit(addr)}
                            sx={{
                              mr: 1,
                              borderRadius: '50%',
                              border: `1px solid ${primaryColor}`,
                              '&:hover': { boxShadow: `0 0 8px ${primaryColor}` },
                            }}
                          >
                            <DrawIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteClick(addr.billing_address_id)}
                            sx={{
                              borderRadius: '50%',
                              border: `1px solid ${theme.palette.error.main}`,
                              '&:hover': { boxShadow: `0 0 8px ${theme.palette.error.main}` },
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
            rowsPerPageOptions={[5, 10, 20, 50]}
            component="div"
            count={filteredAddresses.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              mt: 1,
              backgroundColor: isDark ? '#1e1e1e' : '#f9f9f9',
              borderRadius: 1,
            }}
          />
          </TableContainer>
          
        </>
      )}

      <BillingAddressModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        isEditing={!!editId}
      />

      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#000000' : '#ffffff',
            color: isDark ? '#ffffff' : '#000000',
            border: `2px solid ${primaryColor}`,
            boxShadow: `0 0 8px ${primaryColor}`,
            borderRadius: '20px',
          },
        }}
        aria-labelledby="confirm-delete-title"
      >
        <DialogTitle
          id="confirm-delete-title"
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 'bold',
            color: primaryColor,
            pr: 1,
          }}
        >
          Confirm Delete
          <IconButton
            aria-label="close"
            onClick={() => setConfirmDeleteOpen(false)}
            sx={{ color: isDark ? '#AAAAAD' : 'gray', p: 0, ml: -2 }}
            size="small"
          >
            <CloseIcon sx={{ mr: 1 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete this billing address?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDeleteOpen(false)}
            sx={{ color: isDark ? '#AAAAAD' : 'gray', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: '50px' }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={closeSnackbar} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

const BillingAddressManagerWrapper = () => {
  const { user, authToken } = getUserAndToken();
  const companyId = user?.tenant_id;

  if (!companyId) {
    return <div>Please login or select a company to manage billing addresses.</div>;
  }

  return <BillingAddressManager companyId={companyId} authToken={authToken} />;
};

export default BillingAddressManagerWrapper;
