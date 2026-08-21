import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  Tooltip,
  Stack,
  LinearProgress,
  Fade,
  Zoom,
  Collapse,
  Badge,
  Avatar,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  ErrorOutline as ErrorOutlineIcon,
  Inventory as InventoryIcon,
  Assignment as AssignmentIcon,
  History as HistoryIcon,
  Image as ImageIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  ArrowForward as ArrowForwardIcon,
  Done as DoneIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';
import { useAuth } from '../../Context/AuthContext';
import API_BASE_URL from '../../Context/Api';

const ReturnStockModal = ({ open, onClose, selectedItem, onSuccess, isViewMode = false }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();

  // Form States
  const [sellableQty, setSellableQty] = useState(0);
  const [damagedQty, setDamagedQty] = useState(0);
  const [scrapQty, setScrapQty] = useState(0);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [damageReason, setDamageReason] = useState('');
  const [images, setImages] = useState([]);
  const [updateStockImmediately, setUpdateStockImmediately] = useState(true);

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [itemDetails, setItemDetails] = useState(null);
  const [showHistory, setShowHistory] = useState(true);

  useEffect(() => {
    if (open && selectedItem) {
      fetchItemDetails();
      resetForm();
    }
  }, [open, selectedItem]);

  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/api/return-stock/item/${selectedItem.return_type}/${selectedItem.return_item_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch item details');
      }

      const data = await response.json();
      setItemDetails(data.data.item);
      setVerificationHistory(data.data.verification_history || []);
    } catch (err) {
      console.error('Error fetching item details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSellableQty(0);
    setDamagedQty(0);
    setScrapQty(0);
    setInspectionNotes('');
    setDamageReason('');
    setImages([]);
    setUpdateStockImmediately(true);
    setError(null);
    setSuccess(null);
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Validate file types and size
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      return isValidType && isValidSize;
    });

    if (validFiles.length === 0) {
      setError('Please upload valid image files (JPEG, PNG, GIF) under 5MB');
      return;
    }

    setUploadingImages(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      validFiles.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch(`${API_BASE_URL}/api/return-stock/upload-images`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload images');
      }

      const data = await response.json();
      setImages(prev => [...prev, ...data.data.uploaded_images]);
      setSuccess('Images uploaded successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error uploading images:', err);
      setError(err.message);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    const totalQty = parseInt(sellableQty) + parseInt(damagedQty) + parseInt(scrapQty);
    const pendingQty = itemDetails?.pending_quantity || 0;

    if (totalQty === 0) {
      setError('Please categorize at least some quantity');
      return;
    }

    if (totalQty > pendingQty) {
      setError(`Total quantity (${totalQty}) cannot exceed pending quantity (${pendingQty})`);
      return;
    }

    if (damagedQty > 0 && !damageReason.trim()) {
      setError('Please provide a damage reason for damaged items');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('authToken');
      const payload = {
        return_type: selectedItem.return_type,
        return_id: selectedItem.return_id,
        return_item_id: selectedItem.return_item_id,
        product_id: selectedItem.product_id,
        returned_quantity: totalQty,
        sellable_quantity: parseInt(sellableQty) || 0,
        damaged_quantity: parseInt(damagedQty) || 0,
        scrap_quantity: parseInt(scrapQty) || 0,
        inspection_notes: inspectionNotes,
        damage_reason: damageReason,
        images: images,
        update_stock_immediately: updateStockImmediately,
      };

      const response = await fetch(`${API_BASE_URL}/api/return-stock/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Verification failed');
      }

      const data = await response.json();
      setSuccess('Return verification completed successfully!');
      
      // Refresh item details
      await fetchItemDetails();
      
      // Reset form
      resetForm();
      
      // Notify parent component
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      console.error('Error submitting verification:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTotalQty = () => {
    return parseInt(sellableQty || 0) + parseInt(damagedQty || 0) + parseInt(scrapQty || 0);
  };

  const getPendingQty = () => {
    return itemDetails?.pending_quantity || 0;
  };

  const isQuantityValid = () => {
    const total = getTotalQty();
    const pending = getPendingQty();
    return total > 0 && total <= pending;
  };

  const getProgressPercentage = () => {
    if (!itemDetails) return 0;
    const total = itemDetails.returned_quantity;
    const verified = itemDetails.verified_quantity || 0;
    return (verified / total) * 100;
  };

  // Safe JSON parse helper
  const safeParseJSON = (data) => {
    if (!data) return [];
    if (typeof data === 'object') return data;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('JSON parse error:', e);
        return [];
      }
    }
    return [];
  };

  if (!selectedItem) return null;

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
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 400 }}
    >
      {/* Modern Header */}
      <DialogTitle
        sx={{
          background: isDark 
            ? `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}25 100%)` 
            : `linear-gradient(135deg, ${primaryColor}10 0%, ${primaryColor}20 100%)`,
          borderBottom: `3px solid ${primaryColor}`,
          px: { xs: 2, sm: 3 },
          py: {xs: 2, sm: 2},
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at top right, ${primaryColor}20, transparent)`,
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                sx={{
                  bgcolor: primaryColor,
                  width: { xs: 40, sm: 48 },
                  height: { xs: 40, sm: 48 },
                  boxShadow: `0 4px 20px ${primaryColor}40`,
                }}
              >
                {isViewMode ? <HistoryIcon /> : <AssignmentIcon />}
              </Avatar>
              <Box>
                <Typography 
                  sx={{ 
                    fontWeight: 700, 
                    fontSize: {xs: '1rem', sm: '1.2rem'},
                    color: primaryColor,
                    mb: 0.5,
                  }}
                >
                  {isViewMode ? 'Return Details' : 'Verify Return Stock'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {itemDetails?.return_number || 'Loading...'}
                </Typography>
              </Box>
            </Stack>
            <IconButton 
              onClick={onClose} 
              size="small"
              sx={{
                bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                '&:hover': {
                  bgcolor: 'error.main',
                  color: 'white',
                  transform: 'rotate(90deg)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 }, mt: 2, ...scrollbarStyles }}>
        {loading && !itemDetails ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <CircularProgress size={60} thickness={4} />
            <Typography variant="body1" sx={{ mt: 3, color: 'text.secondary' }}>
              Loading item details...
            </Typography>
          </Box>
        ) : (
          <>
            {/* Error/Success Messages with Animation */}
            <Collapse in={!!error}>
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  boxShadow: 2,
                  border: `2px solid ${theme.palette.error.main}`,
                }} 
                onClose={() => setError(null)}
                icon={<ErrorOutlineIcon />}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {error}
                </Typography>
              </Alert>
            </Collapse>
            
            <Collapse in={!!success}>
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  boxShadow: 2,
                  border: `2px solid ${theme.palette.success.main}`,
                }} 
                onClose={() => setSuccess(null)}
                icon={<CheckCircleOutlineIcon />}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {success}
                </Typography>
              </Alert>
            </Collapse>

            {/* Progress Bar for Verification Status */}
            {itemDetails && (
              <Zoom in={true}>
                <Card 
                  sx={{ 
                    mb: 3, 
                    borderRadius: 3,
                    border: `2px solid ${primaryColor}30`,
                    background: isDark 
                      ? `linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}15 100%)` 
                      : `linear-gradient(135deg, ${primaryColor}05 0%, ${primaryColor}10 100%)`,
                    boxShadow: `0 8px 32px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'}`,
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ fontWeight: 700, color: primaryColor, fontSize: {xs: '1.2rem', sm: '1.4rem'} }}>
                          Verification Progress
                        </Typography>
                        <Chip
                          label={`${Math.round(getProgressPercentage())}%`}
                          color={getProgressPercentage() === 100 ? 'success' : 'warning'}
                          size="small"
                          sx={{ fontWeight: 700, fontSize: '0.875rem' }}
                        />
                      </Stack>
                      <LinearProgress 
                        variant="determinate" 
                        value={getProgressPercentage()} 
                        sx={{
                          height: 12,
                          borderRadius: 2,
                          bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 2,
                            background: `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.success.light})`,
                          },
                        }}
                      />
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Stack alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              Returned
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.main' }}>
                              {itemDetails?.returned_quantity}
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={4}>
                          <Stack alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              Verified
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                              {itemDetails?.verified_quantity || 0}
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={4}>
                          <Stack alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              Pending
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>
                              {itemDetails?.pending_quantity}
                            </Typography>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Stack>
                  </CardContent>
                </Card>
              </Zoom>
            )}

            {/* Item Details Section - Modern Cards */}
            <Zoom in={true} style={{ transitionDelay: '100ms' }}>
              <Card 
                sx={{ 
                  mb: 3, 
                  borderRadius: 3,
                  border: `2px solid ${primaryColor}30`,
                  boxShadow: `0 8px 32px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'}`,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    background: `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}10 100%)`,
                    p: 2,
                    borderBottom: `1px solid ${primaryColor}30`,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <InventoryIcon sx={{ color: primaryColor, fontSize: {xs: 24, sm: 28} }} />
                    <Typography sx={{ fontWeight: 700, color: primaryColor, fontSize: {xs: '1rem', sm: '1.1rem'} }}>
                      Return Information
                    </Typography>
                  </Stack>
                </Box>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Grid container spacing={3}>
                    {/* Product Info with Icon */}
                    <Grid item xs={12} sm={6}>
                      <Stack spacing={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <CategoryIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Product Name
                          </Typography>
                        </Stack>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                          {itemDetails?.product_name}
                        </Typography>
                      </Stack>
                    </Grid>

                    {/* Barcode */}
                    <Grid item xs={12} sm={6}>
                      <Stack spacing={1}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Barcode
                        </Typography>
                        <Chip
                          label={itemDetails?.barcode || 'N/A'}
                          size="small"
                          sx={{ 
                            fontWeight: 600,
                            width: 'fit-content',
                            bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          }}
                        />
                      </Stack>
                    </Grid>

                    {/* Return Date */}
                    <Grid item xs={12} sm={6}>
                      <Stack spacing={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Return Date
                          </Typography>
                        </Stack>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {itemDetails?.return_date ? new Date(itemDetails.return_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'N/A'}
                        </Typography>
                      </Stack>
                    </Grid>

                    {/* Customer / Supplier Details */}
                    <Grid item xs={12} sm={6}>
                      <Stack spacing={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {selectedItem?.return_type === 'sales_return' ? 'Customer' : 'Supplier'}
                          </Typography>
                        </Stack>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {selectedItem?.return_type === 'sales_return'
                            ? `${itemDetails?.customer_name || 'N/A'} (${itemDetails?.customer_mobile || 'N/A'})`
                            : `${itemDetails?.supplier_name || 'N/A'} (${itemDetails?.supplier_mobile || 'N/A'})`}
                        </Typography>
                      </Stack>
                    </Grid>

                    {/* Original Invoice Details */}
                    <Grid item xs={12} sm={6}>
                      <Stack spacing={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <AssignmentIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Original Invoice Number
                          </Typography>
                        </Stack>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {itemDetails?.original_invoice_number || 'N/A'}
                        </Typography>
                      </Stack>
                    </Grid>

                    {/* Status */}
                    <Grid item xs={12} sm={6}>
                      <Stack spacing={1}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Verification Status
                        </Typography>
                        <Chip
                          icon={
                            itemDetails?.verification_status === 'verified' ? (
                              <DoneIcon />
                            ) : itemDetails?.verification_status === 'partially_verified' ? (
                              <PendingIcon />
                            ) : (
                              <ErrorOutlineIcon />
                            )
                          }
                          label={itemDetails?.verification_status?.toUpperCase().replace('_', ' ')}
                          color={
                            itemDetails?.verification_status === 'verified'
                              ? 'success'
                              : itemDetails?.verification_status === 'partially_verified'
                              ? 'warning'
                              : 'error'
                          }
                          sx={{ 
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            width: 'fit-content',
                          }}
                        />
                      </Stack>
                    </Grid>

                    {/* Return Reason */}
                    {itemDetails?.reason && (
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Stack spacing={1}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Return Reason
                          </Typography>
                          <Paper
                            sx={{
                              p: 2,
                              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                              borderRadius: 2,
                              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                            }}
                          >
                            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                              {itemDetails.reason}
                            </Typography>
                          </Paper>
                        </Stack>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Zoom>

            {/* Verification Form - Only show if not in view mode and has pending quantity */}
            {!isViewMode && getPendingQty() > 0 && (
              <Zoom in={true} style={{ transitionDelay: '200ms' }}>
                <Card 
                  sx={{ 
                    mb: 3, 
                    borderRadius: 3,
                    border: `2px solid ${primaryColor}30`,
                    boxShadow: `0 8px 32px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'}`,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      background: `linear-gradient(135deg, ${primaryColor}30 0%, ${primaryColor}15 100%)`,
                      p: 2,
                      borderBottom: `1px solid ${primaryColor}30`,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <CheckCircleIcon sx={{ color: primaryColor, fontSize: {xs: 24, sm: 28} }} />
                      <Typography sx={{ fontWeight: 700, color: primaryColor, fontSize: {xs: '1rem', sm: '1.1rem'} }}>
                        Categorize Stock
                      </Typography>
                    </Stack>
                  </Box>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Grid container spacing={2} sx={{width: '100%'}}>
                      <Grid sx={{width: '100%', display: 'flex', flexDirection: {xs: 'column', sm: 'row'}}}>
                        {/* Quantity Inputs with Modern Style */}
                      <Grid sx={{width: '100%', pr: 2, pb: 2}}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            border: `2px solid ${theme.palette.success.main}30`,
                            background: isDark 
                              ? `${theme.palette.success.main}08` 
                              : `${theme.palette.success.main}05`,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              border: `2px solid ${theme.palette.success.main}`,
                              boxShadow: `0 4px 20px ${theme.palette.success.main}30`,
                            },
                          }}
                        >
                          <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main' }}>
                                Sellable
                              </Typography>
                            </Stack>
                            <TextField
                              fullWidth
                              type="number"
                              value={sellableQty}
                              onChange={(e) => setSellableQty(Math.max(0, parseInt(e.target.value) || 0))}
                              InputProps={{
                                inputProps: { min: 0, max: getPendingQty() },
                                sx: {
                                  fontSize: '1.5rem',
                                  fontWeight: 700,
                                  textAlign: 'center',
                                },
                              }}
                              helperText="Ready to sell"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                },
                              }}
                            />
                          </Stack>
                        </Paper>
                      </Grid>

                      <Grid sx={{width: '100%', pr: 2, pb: 2}}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            border: `2px solid ${theme.palette.warning.main}30`,
                            background: isDark 
                              ? `${theme.palette.warning.main}08` 
                              : `${theme.palette.warning.main}05`,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              border: `2px solid ${theme.palette.warning.main}`,
                              boxShadow: `0 4px 20px ${theme.palette.warning.main}30`,
                            },
                          }}
                        >
                          <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'warning.main' }}>
                                Damaged
                              </Typography>
                            </Stack>
                            <TextField
                              fullWidth
                              type="number"
                              value={damagedQty}
                              onChange={(e) => setDamagedQty(Math.max(0, parseInt(e.target.value) || 0))}
                              InputProps={{
                                inputProps: { min: 0, max: getPendingQty() },
                                sx: {
                                  fontSize: '1.5rem',
                                  fontWeight: 700,
                                  textAlign: 'center',
                                },
                              }}
                              helperText="With damage"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                },
                              }}
                            />
                          </Stack>
                        </Paper>
                      </Grid>

                      <Grid sx={{width: '100%'}}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            border: `2px solid ${theme.palette.error.main}30`,
                            background: isDark 
                              ? `${theme.palette.error.main}08` 
                              : `${theme.palette.error.main}05`,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              border: `2px solid ${theme.palette.error.main}`,
                              boxShadow: `0 4px 20px ${theme.palette.error.main}30`,
                            },
                          }}
                        >
                          <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <CancelIcon sx={{ color: 'error.main', fontSize: 20 }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'error.main' }}>
                                Scrap
                              </Typography>
                            </Stack>
                            <TextField
                              fullWidth
                              type="number"
                              value={scrapQty}
                              onChange={(e) => setScrapQty(Math.max(0, parseInt(e.target.value) || 0))}
                              InputProps={{
                                inputProps: { min: 0, max: getPendingQty() },
                                sx: {
                                  fontSize: '1.5rem',
                                  fontWeight: 700,
                                  textAlign: 'center',
                                },
                              }}
                              helperText="Unusable"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                },
                              }}
                            />
                          </Stack>
                        </Paper>
                      </Grid>
                      </Grid>

                      <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm: 'column', md: 'row'}, gap: 2, width: '100%'}}>
                        {/* Quantity Summary with Modern Design */}
                      <Grid item xs={12} sx={{width: '100%'}}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 3,
                            borderRadius: 2,
                            background: isQuantityValid() 
                              ? `linear-gradient(135deg, ${theme.palette.success.main}15, ${theme.palette.success.main}25)` 
                              : `linear-gradient(135deg, ${theme.palette.error.main}15, ${theme.palette.error.main}25)`,
                            border: `2px solid ${isQuantityValid() ? theme.palette.success.main : theme.palette.error.main}`,
                            boxShadow: `0 4px 20px ${isQuantityValid() ? theme.palette.success.main : theme.palette.error.main}20`,
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                            <Stack direction="row" alignItems="center" spacing={2}>
                              {isQuantityValid() ? (
                                <CheckCircleIcon sx={{ color: 'success.main', fontSize: 32 }} />
                              ) : (
                                <CancelIcon sx={{ color: 'error.main', fontSize: 32 }} />
                              )}
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  Total Categorized
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: isQuantityValid() ? 'success.main' : 'error.main' }}>
                                  {getTotalQty()}
                                </Typography>
                              </Box>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  Pending Quantity
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                  {getPendingQty()}
                                </Typography>
                              </Box>
                            </Stack>
                          </Stack>
                        </Paper>
                      </Grid>

                      {/* Notes with Modern Style */}
                      <Grid item xs={12} sx={{width: '100%'}}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          label="Inspection Notes"
                          value={inspectionNotes}
                          onChange={(e) => setInspectionNotes(e.target.value)}
                          placeholder="General inspection observations..."
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                            },
                          }}
                        />
                      </Grid>

                      {/* Damage Reason - Show only if damaged quantity > 0 */}
                      <Collapse in={damagedQty > 0} sx={{ width: '100%' }}>
                        <Grid fullWidth container sx={{width: '100%'}}>
                          <Grid item xs={12} sx={{width:'100%'}}>
                            <Alert 
                              severity="warning" 
                              sx={{ mb: 2, borderRadius: 2, width: '100%' }}
                              icon={<WarningIcon />}
                            >
                              Please provide a reason for the damaged items
                            </Alert>
                            <TextField
                              fullWidth
                              multiline
                              rows={2}
                              label="Damage Reason"
                              value={damageReason}
                              onChange={(e) => setDamageReason(e.target.value)}
                              placeholder="Describe the damage..."
                              required
                              error={damagedQty > 0 && !damageReason.trim()}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                },
                                width: '100%',
                              }}
                            />
                          </Grid>
                        </Grid>
                      </Collapse>
                      </Box>

                      {/* Image Upload with Modern Design */}
                      <Grid item xs={12} sx={{width: '100%'}}>
                        <Box
                          sx={{
                            p: 3,
                            borderRadius: 2,
                            border: `2px dashed ${primaryColor}50`,
                            background: isDark ? `${primaryColor}05` : `${primaryColor}08`,
                            textAlign: 'center',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              border: `2px dashed ${primaryColor}`,
                              background: isDark ? `${primaryColor}10` : `${primaryColor}15`,
                            },
                          }}
                        >
                          <Stack spacing={2} alignItems="center">
                            <Badge badgeContent={images.length} color="primary">
                              <ImageIcon sx={{ fontSize: 48, color: primaryColor, opacity: 0.7 }} />
                            </Badge>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              Upload Verification Images (Optional)
                            </Typography>
                            <Button
                              variant="contained"
                              component="label"
                              startIcon={uploadingImages ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                              disabled={uploadingImages}
                              sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                px: 4,
                                py: 1.5,
                                boxShadow: `0 4px 20px ${primaryColor}40`,
                              }}
                            >
                              {uploadingImages ? 'Uploading...' : 'Choose Images'}
                              <input
                                type="file"
                                hidden
                                multiple
                                accept="image/jpeg,image/jpg,image/png,image/gif"
                                onChange={handleImageUpload}
                              />
                            </Button>
                            <Typography variant="caption" color="text.secondary">
                              Max 5MB per image • JPEG, PNG, GIF supported
                            </Typography>
                          </Stack>
                        </Box>

                        {/* Image Preview with Modern Grid */}
                        {images.length > 0 && (
                          <Grid container spacing={2} sx={{ mt: 2 }}>
                            {images.map((img, index) => (
                              <Grid item xs={6} sm={4} md={3} key={index}>
                                <Zoom in={true}>
                                  <Paper
                                    elevation={4}
                                    sx={{
                                      position: 'relative',
                                      borderRadius: 2,
                                      overflow: 'hidden',
                                      transition: 'all 0.3s ease',
                                      '&:hover': {
                                        transform: 'scale(1.05)',
                                        boxShadow: `0 8px 32px ${primaryColor}40`,
                                      },
                                    }}
                                  >
                                    <CardMedia
                                      component="img"
                                      height="150"
                                      image={`${API_BASE_URL}${img.url}`}
                                      alt={`Upload ${index + 1}`}
                                      sx={{ objectFit: 'cover' }}
                                    />
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRemoveImage(index)}
                                      sx={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        bgcolor: 'error.main',
                                        color: 'white',
                                        boxShadow: 2,
                                        '&:hover': { 
                                          bgcolor: 'error.dark',
                                          transform: 'rotate(90deg)',
                                        },
                                        transition: 'all 0.3s ease',
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                    <Box
                                      sx={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        bgcolor: 'rgba(0,0,0,0.6)',
                                        color: 'white',
                                        py: 0.5,
                                        px: 1,
                                      }}
                                    >
                                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                        Image {index + 1}
                                      </Typography>
                                    </Box>
                                  </Paper>
                                </Zoom>
                              </Grid>
                            ))}
                          </Grid>
                        )}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Zoom>
            )}

            {/* Verification History with Modern Design */}
            {verificationHistory.length > 0 && (
              <Zoom in={true} style={{ transitionDelay: '300ms' }}>
                <Card 
                  sx={{ 
                    borderRadius: 3,
                    border: `2px solid ${primaryColor}30`,
                    boxShadow: `0 8px 32px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'}`,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      background: `linear-gradient(135deg, ${primaryColor}25 0%, ${primaryColor}15 100%)`,
                      p: 2,
                      borderBottom: `1px solid ${primaryColor}30`,
                      cursor: 'pointer',
                    }}
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <HistoryIcon sx={{ color: primaryColor, fontSize: {xs: 24, sm: 28} }} />
                        <Typography sx={{ fontWeight: 700, color: primaryColor, fontSize: {xs: '1rem', sm: '1.1rem'} }}>
                          Verification History
                        </Typography>
                        <Chip 
                          label={verificationHistory.length} 
                          size="small" 
                          sx={{ 
                            fontWeight: 700,
                            bgcolor: primaryColor,
                            color: 'white',
                          }} 
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {showHistory ? 'Click to hide' : 'Click to show'}
                      </Typography>
                    </Stack>
                  </Box>
                  <Collapse in={showHistory}>
                    <CardContent sx={{ p: 0 }}>
                      <TableContainer sx={{...scrollbarStyles,}}>
                        <Table size={isMobile ? 'small' : 'medium'} sx={{minWidth: '900px'}}>
                          <TableHead>
                            <TableRow sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                              <TableCell sx={{ fontWeight: 700, color: primaryColor }}>Date & Time</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: primaryColor }} align="center">Sellable</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: primaryColor }} align="center">Damaged</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: primaryColor }} align="center">Scrap</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: primaryColor }}>Verified By</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: primaryColor }} align="center">Details</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {verificationHistory.map((item, index) => (
                              <TableRow 
                                key={item.verification_id} 
                                hover
                                sx={{
                                  '&:nth-of-type(odd)': {
                                    bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                                  },
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                  },
                                }}
                              >
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {new Date(item.verification_date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(item.verification_date).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={item.sellable_quantity}
                                    color="success"
                                    size="small"
                                    sx={{ fontWeight: 700, minWidth: 50 }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={item.damaged_quantity}
                                    color="warning"
                                    size="small"
                                    sx={{ fontWeight: 700, minWidth: 50 }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={item.scrap_quantity}
                                    color="error"
                                    size="small"
                                    sx={{ fontWeight: 700, minWidth: 50 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <Avatar
                                      sx={{
                                        width: 28,
                                        height: 28,
                                        bgcolor: primaryColor,
                                        fontSize: '0.75rem',
                                      }}
                                    >
                                      {/* {item.verified_by_name?.charAt(0)} */}
                                    </Avatar>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {item.verified_by_name}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell align="center">
                                  <Tooltip 
                                    title={
                                      <Box sx={{ p: 1 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                          Inspection Notes:
                                        </Typography>
                                        <Typography variant="body2">
                                          {item.inspection_notes || 'No notes provided'}
                                        </Typography>
                                        {item.damage_reason && (
                                          <>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>
                                              Damage Reason:
                                            </Typography>
                                            <Typography variant="body2">
                                              {item.damage_reason}
                                            </Typography>
                                          </>
                                        )}
                                      </Box>
                                    }
                                    arrow
                                  >
                                    <IconButton size="small" sx={{ color: primaryColor }}>
                                      <InfoIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      {/* Show verification images if any */}
                      {verificationHistory.some(h => {
                        const imgs = safeParseJSON(h.images);
                        return imgs.length > 0;
                      }) && (
                        <Box sx={{ p: 3, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
                            Verification Images
                          </Typography>
                          <Grid container spacing={2}>
                            {verificationHistory.map((item) => {
                              const imgs = safeParseJSON(item.images);
                              return imgs.map((img, imgIndex) => (
                                <Grid item xs={6} sm={4} md={3} key={`${item.verification_id}-${imgIndex}`}>
                                  <Zoom in={true}>
                                    <Paper
                                      elevation={3}
                                      sx={{
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                          transform: 'scale(1.05)',
                                          boxShadow: `0 8px 32px ${primaryColor}40`,
                                        },
                                      }}
                                    >
                                      <CardMedia
                                        component="img"
                                        height="120"
                                        image={`${API_BASE_URL}${img.url}`}
                                        alt={`Verification ${imgIndex + 1}`}
                                        sx={{ objectFit: 'cover' }}
                                      />
                                    </Paper>
                                  </Zoom>
                                </Grid>
                              ));
                            })}
                          </Grid>
                        </Box>
                      )}
                    </CardContent>
                  </Collapse>
                </Card>
              </Zoom>
            )}
          </>
        )}
      </DialogContent>

      {/* Modern Footer with Actions */}
      <DialogActions 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          borderTop: `2px solid ${primaryColor}30`,
          background: isDark 
            ? `linear-gradient(135deg, ${primaryColor}05 0%, transparent 100%)` 
            : `linear-gradient(135deg, ${primaryColor}03 0%, transparent 100%)`,
          gap: 2,
        }}
      >
        <Button 
          onClick={onClose} 
          variant="outlined"
          size={isMobile ? 'medium' : 'large'}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 4,
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2,
            },
          }}
        >
          Close
        </Button>
        {!isViewMode && getPendingQty() > 0 && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            size={isMobile ? 'medium' : 'large'}
            disabled={!isQuantityValid() || loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              px: 4,
              boxShadow: `0 4px 20px ${primaryColor}40`,
              '&:hover': {
                boxShadow: `0 6px 30px ${primaryColor}60`,
              },
            }}
          >
            {loading ? 'Submitting...' : 'Submit Verification'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ReturnStockModal;