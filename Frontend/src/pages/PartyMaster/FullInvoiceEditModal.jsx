import React, { useState, useEffect, useMemo } from "react";
import {
  Modal, Box, Typography, TextField, IconButton, Table, TableHead,
  TableRow, TableCell, TableBody, Button, useTheme, useMediaQuery,
  CircularProgress, TableContainer, Paper, MenuItem, Grid, Divider
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SaveIcon from "@mui/icons-material/Save";
import axiosInstance from "../../utils/axiosInstance";
import dayjs from "dayjs";

// FIX: invoice_items rows are stored with columns base_amount / total_with_gst
// (no separate cgst_amount/sgst_amount per item), while this modal's table
// and totals were reading item.amount / item.cgst_amount / item.sgst_amount /
// item.total_including_gst. On first load those were all `undefined`, so the
// "Amount" column and Grand Total showed blank until an edit (qty/rate
// change) triggered handleItemChange() to compute them for the first time.
// The backend now also sends these aliases directly, but this helper keeps
// the mapping correct even if a field is ever missing from the response.
const deriveItemAmounts = (item) => {
  const rate = parseFloat(item.rate ?? 0);
  const qty = parseFloat(item.quantity ?? 0);

  const amount = item.amount !== undefined && item.amount !== null
    ? parseFloat(item.amount)
    : item.base_amount !== undefined && item.base_amount !== null
      ? parseFloat(item.base_amount)
      : rate * qty;

  const totalIncludingGst = item.total_including_gst !== undefined && item.total_including_gst !== null
    ? parseFloat(item.total_including_gst)
    : item.total_with_gst !== undefined && item.total_with_gst !== null
      ? parseFloat(item.total_with_gst)
      : amount;

  const gstTotal = Math.max(0, totalIncludingGst - amount);

  const cgstAmount = item.cgst_amount !== undefined && item.cgst_amount !== null
    ? parseFloat(item.cgst_amount)
    : gstTotal / 2;

  const sgstAmount = item.sgst_amount !== undefined && item.sgst_amount !== null
    ? parseFloat(item.sgst_amount)
    : gstTotal / 2;

  return {
    amount: amount.toFixed(2),
    cgst_amount: cgstAmount.toFixed(2),
    sgst_amount: sgstAmount.toFixed(2),
    total_including_gst: totalIncludingGst.toFixed(2)
  };
};

export default function FullInvoiceEditModal({
  open,
  onClose,
  invoiceId,
  onSuccess
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(dayjs().format("YYYY-MM-DD"));
  
  // Customer
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerDetails, setCustomerDetails] = useState({
    name: "", mobile: "", gst_number: "", address: "", state: ""
  });

  // Products
  const [availableProducts, setAvailableProducts] = useState([]);
  const [items, setItems] = useState([]);

  // Charges & Payments
  const [transportCharge, setTransportCharge] = useState(0);
  const [discountType, setDiscountType] = useState("%");
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentType, setPaymentType] = useState("Cash");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [dueDate, setDueDate] = useState("");

  // E-Way Bill
  const [ewayBillNo, setEwayBillNo] = useState("");
  const [ewayBillDate, setEwayBillDate] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [placeOfDispatch, setPlaceOfDispatch] = useState("");

  useEffect(() => {
    if (open && invoiceId) {
      fetchInitialData();
    }
  }, [open, invoiceId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch reference data
      const [custRes, prodRes, invRes] = await Promise.all([
        axiosInstance.get("/api/invoices/customers"),
        axiosInstance.get("/api/products"),
        axiosInstance.get(`/api/invoices/get-invoice/${invoiceId}`)
      ]);
      setCustomers(custRes.data || []);
      setAvailableProducts(prodRes.data || []);

      // 2. Populate invoice data
      const inv = invRes.data;
      if (inv) {
        setInvoiceNo(inv.invoice_number || "");
        setInvoiceDate(inv.invoice_date || "");
        
        if (inv.customer_id) {
          setSelectedCustomerId(inv.customer_id);
          setCustomerDetails({
            name: inv.customer_name || "",
            mobile: inv.customer_mobile || "",
            gst_number: inv.customer_gst_number || "",
            address: inv.customer_address || "",
            state: inv.customer_state || ""
          });
        }

        // FIX: derive amount/cgst_amount/sgst_amount/total_including_gst
        // defensively from whatever the API returned (amount, base_amount,
        // total_including_gst, or total_with_gst) instead of assuming the
        // exact field names exist, so the row & totals populate immediately.
        const mappedItems = (inv.items || []).map(item => {
          const derived = deriveItemAmounts(item);
          return {
            product_id: item.product_id,
            product_name: item.product_name,
            hsn_code: item.hsn_code,
            quantity: item.quantity,
            unit: item.unit || "Pcs",
            rate: item.rate,
            gst_percentage: item.gst_percentage,
            ...derived
          };
        });
        setItems(mappedItems.length > 0 ? mappedItems : [getEmptyItem()]);

        setTransportCharge(inv.transport_charge || 0);
        setDiscountType(inv.discount_type || "%");
        setDiscountValue(inv.discount_value || 0);
        
        setPaymentType(inv.payment_type || "Cash");
        setPaymentStatus(inv.payment_status || "Pending");
        setAdvanceAmount(inv.advance_amount || 0);
        setDueDate(inv.due_date ? dayjs(inv.due_date).format("YYYY-MM-DD") : "");

        setEwayBillNo(inv.eway_bill_no || "");
        setEwayBillDate(inv.eway_bill_date ? dayjs(inv.eway_bill_date).format("YYYY-MM-DD") : "");
        setTransporterName(inv.transporter_name || "");
        setVehicleNo(inv.vehicle_number || "");
        setPlaceOfDispatch(inv.place_of_dispatch || "");
      }
    } catch (err) {
      console.error("Failed to load invoice for editing", err);
      alert("Failed to load invoice data.");
    } finally {
      setLoading(false);
    }
  };

  const getEmptyItem = () => ({
    product_id: "", product_name: "", hsn_code: "", quantity: 1, unit: "Pcs",
    rate: 0, amount: 0, gst_percentage: 0, cgst_amount: 0, sgst_amount: 0, total_including_gst: 0
  });

  // Calculate totals
  const summary = useMemo(() => {
    let subtotal = 0;
    let totalGst = 0;
    
    items.forEach(item => {
      subtotal += parseFloat(item.amount || 0);
      totalGst += parseFloat(item.cgst_amount || 0) + parseFloat(item.sgst_amount || 0);
    });

    let discountAmt = 0;
    if (discountType === "%") {
      discountAmt = subtotal * (parseFloat(discountValue || 0) / 100);
    } else {
      discountAmt = parseFloat(discountValue || 0);
    }

    const total = subtotal - discountAmt + totalGst + parseFloat(transportCharge || 0);
    
    return { subtotal, totalGst, discountAmt, total };
  }, [items, discountType, discountValue, transportCharge]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === "product_id") {
      const prod = availableProducts.find(p => p.product_id === value);
      if (prod) {
        item.product_id = prod.product_id;
        item.product_name = prod.product_name;
        item.hsn_code = prod.hsn_code;
        item.rate = prod.price;
        item.gst_percentage = prod.gst;
      }
    } else {
      item[field] = value;
    }

    // Recalculate row
    const qty = parseFloat(item.quantity || 0);
    const rate = parseFloat(item.rate || 0);
    const gstPct = parseFloat(item.gst_percentage || 0);
    
    const amount = qty * rate;
    const gstAmt = amount * (gstPct / 100);
    
    item.amount = amount.toFixed(2);
    item.cgst_amount = (gstAmt / 2).toFixed(2);
    item.sgst_amount = (gstAmt / 2).toFixed(2);
    item.total_including_gst = (amount + gstAmt).toFixed(2);

    newItems[index] = item;
    setItems(newItems);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const payload = {
        customer: {
          name: customerDetails.name || "",
          mobile: customerDetails.mobile || "",
          gst: customerDetails.gst_number || "",
          email: customerDetails.email || "",
          address: customerDetails.address || "",
          state: customerDetails.state || "",
          date: invoiceDate,
          vehicleNo: vehicleNo,
        },
        billing_address_id: null,
        products: items.map(p => ({
          product_id: p.product_id,
          product_name: p.product_name,
          hsn_code: p.hsn_code,
          quantity: p.quantity,
          unit: p.unit,
          rate: p.rate,
          gst: p.gst_percentage,
          amount: p.amount,
          priceIncludingGst: p.total_including_gst
        })).filter(p => p.product_id || p.product_name),
        summaryData: {
          totalWithGst: summary.subtotal,
          gst: 0,
          gstCost: summary.totalGst,
          cgstCost: summary.totalGst / 2,
          sgstCost: summary.totalGst / 2,
          discountType: discountType,
          discountValue: discountValue,
          transportCharge: transportCharge,
          total: summary.total,
          paymentType: paymentType,
          paymentStatus: paymentStatus,
          advanceAmount: advanceAmount,
          dueDate: dueDate
        },
        ewayData: {
          eway_bill_no: ewayBillNo,
          eway_bill_date: ewayBillDate,
          transporter_name: transporterName,
          place_of_dispatch: placeOfDispatch,
        }
      };

      await axiosInstance.put(`/api/invoices/edit/${invoiceId}`, payload);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to update invoice");
    } finally {
      setSaving(false);
    }
  };

  const modalBg = isDark ? "#121212" : "#fff";

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: "95%", maxWidth: 1200, height: "90vh", bgcolor: modalBg,
        boxShadow: 24, display: "flex", flexDirection: "column", borderRadius: 2, overflow: "hidden"
      }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: "1px solid #ccc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight="bold">Edit Invoice #{invoiceNo}</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>

        {loading ? (
          <Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
            
            {/* Top Info */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField label="Invoice No" fullWidth size="small" value={invoiceNo} disabled />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField type="date" label="Invoice Date" fullWidth size="small" 
                  value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <TextField select label="Select Customer" fullWidth size="small" 
                  value={selectedCustomerId} onChange={e => {
                    setSelectedCustomerId(e.target.value);
                    const c = customers.find(x => x.customer_id === e.target.value);
                    if(c) setCustomerDetails({ name: c.name, mobile: c.mobile, gst_number: c.gst_number, address: c.address, state: c.state });
                  }}>
                  <MenuItem value="">-- Select Existing Customer --</MenuItem>
                  {customers.map(c => <MenuItem key={c.customer_id} value={c.customer_id}>{c.name}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>

            {/* Customer Details Edit */}
            <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={1}>Customer Details</Typography>
            <Grid container spacing={2} mb={4}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField label="Name" fullWidth size="small" value={customerDetails.name} 
                  onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})} disabled={!!selectedCustomerId} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField label="Mobile" fullWidth size="small" value={customerDetails.mobile} 
                  onChange={e => setCustomerDetails({...customerDetails, mobile: e.target.value})} disabled={!!selectedCustomerId} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField label="GST Number" fullWidth size="small" value={customerDetails.gst_number} 
                  onChange={e => setCustomerDetails({...customerDetails, gst_number: e.target.value})} disabled={!!selectedCustomerId} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField label="State" fullWidth size="small" value={customerDetails.state} 
                  onChange={e => setCustomerDetails({...customerDetails, state: e.target.value})} disabled={!!selectedCustomerId} />
              </Grid>
            </Grid>

            <Divider sx={{ mb: 3 }} />

            {/* Products Table */}
            <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={1}>Products</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: isDark ? "#2a2a2a" : "#f5f5f5" }}>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>HSN</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>Rate</TableCell>
                    <TableCell>GST %</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <TextField select fullWidth size="small" value={item.product_id}
                          onChange={e => handleItemChange(index, "product_id", e.target.value)}>
                          {availableProducts.map(p => <MenuItem key={p.product_id} value={p.product_id}>{p.product_name}</MenuItem>)}
                        </TextField>
                      </TableCell>
                      <TableCell><TextField fullWidth size="small" value={item.hsn_code} onChange={e => handleItemChange(index, "hsn_code", e.target.value)} /></TableCell>
                      <TableCell><TextField fullWidth type="number" size="small" value={item.quantity} onChange={e => handleItemChange(index, "quantity", e.target.value)} /></TableCell>
                      <TableCell><TextField fullWidth type="number" size="small" value={item.rate} onChange={e => handleItemChange(index, "rate", e.target.value)} /></TableCell>
                      <TableCell><TextField fullWidth type="number" size="small" value={item.gst_percentage} onChange={e => handleItemChange(index, "gst_percentage", e.target.value)} /></TableCell>
                      <TableCell>₹{item.amount}</TableCell>
                      <TableCell>
                        <IconButton color="error" onClick={() => setItems(items.filter((_, i) => i !== index))}><DeleteOutlineIcon /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button startIcon={<AddCircleOutlineIcon />} onClick={() => setItems([...items, getEmptyItem()])} sx={{ mb: 4 }}>Add Row</Button>

            {/* Calculations & E-Way */}
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={1}>Transport & E-Way Bill</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField label="E-Way Bill No" fullWidth size="small" value={ewayBillNo} onChange={e => setEwayBillNo(e.target.value)} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField type="date" label="E-Way Bill Date" fullWidth size="small" value={ewayBillDate} onChange={e => setEwayBillDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Vehicle No" fullWidth size="small" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Transporter" fullWidth size="small" value={transporterName} onChange={e => setTransporterName(e.target.value)} />
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={1}>Summary</Typography>
                <Box sx={{ p: 2, bgcolor: isDark ? "#1e1e1e" : "#f9f9f9", borderRadius: 1 }}>
                  <Box display="flex" justifyContent="space-between" mb={1}><Typography>Subtotal:</Typography><Typography>₹{summary.subtotal.toFixed(2)}</Typography></Box>
                  <Box display="flex" justifyContent="space-between" mb={1}><Typography>Total GST:</Typography><Typography>₹{summary.totalGst.toFixed(2)}</Typography></Box>
                  
                  <Box display="flex" justifyContent="space-between" mb={1} alignItems="center">
                    <Typography>Transport:</Typography>
                    <TextField type="number" size="small" sx={{ width: 100 }} value={transportCharge} onChange={e => setTransportCharge(e.target.value)} />
                  </Box>
                  
                  <Divider sx={{ my: 1 }} />
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="h6" fontWeight="bold">Grand Total:</Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary">₹{summary.total.toFixed(2)}</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>

          </Box>
        )}

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: "1px solid #ccc", display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading || saving} startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}>
            Save Changes
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}