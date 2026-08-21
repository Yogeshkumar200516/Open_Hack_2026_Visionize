import React, { useState, useEffect, useContext, useRef } from "react";
import {
  ThemeProvider,
  createTheme,
  Container,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Table,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Box,
  Divider,
  IconButton,
  InputAdornment,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  Tooltip,
  Popper,
  Fade,
  ClickAwayListener,
  InputBase,
} from "@mui/material";
import CrisisAlertOutlinedIcon from "@mui/icons-material/CrisisAlertOutlined";
import AddLinkOutlinedIcon from "@mui/icons-material/AddLinkOutlined";
import { motion } from "framer-motion";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import InfoIcon from "@mui/icons-material/Info";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ReplyAllOutlinedIcon from "@mui/icons-material/ReplyAllOutlined";
import axios from "axios";
import GeneratingTokensIcon from "@mui/icons-material/GeneratingTokens";
import PublishedWithChangesOutlinedIcon from "@mui/icons-material/PublishedWithChangesOutlined";
import InvoicePreviewModal from "./InvoiceModal.jsx"; // adjust path as needed
import SelectProductsModal from "./ProductSelectionModal.jsx";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { ColorModeContext } from "../../Context/ThemeContext.jsx";
import { useTheme } from "@mui/material/styles";
import API_BASE_URL from "../../Context/Api.jsx";
import DraftSelectorDialog from "./DraftSelectModal.jsx";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SendAndArchiveIcon from "@mui/icons-material/SendAndArchive";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CircularProgress from "@mui/material/CircularProgress";


// Dark theme config (if needed separately)
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#121212", paper: "#1e1e1e" },
    primary: { main: "#00bcd4" },
    secondary: { main: "#ff4081" },
  },
  shape: { borderRadius: 16 },
  typography: { fontFamily: "'Poppins', sans-serif", fontSize: 14 },
});

const AnimatedBox = motion(Box);

export default function GstInvoice() {
  const theme = useTheme();
  const { palette } = theme;
  const isDark = palette.mode === "dark";
  const primaryColor = palette.primary.main;

  const colorMode = useContext(ColorModeContext); // toggle theme

  // 1. Updated useState
  const [customer, setCustomer] = useState({
    name: "",
    address: "",
    state: "",
    pincode: "",
    email: "", // ✅ added
    whatsapp_number: "", // ✅ added
    mobile: "",
    gst: "",
    placeOfSupply: "",
    vehicleNo: "",
    date: new Date().toISOString().split("T")[0],
    invoiceNo: "",
  });

  const [paymentType, setPaymentType] = useState("Cash");
  const [advanceAmount, setAdvanceAmount] = useState("");

  const [productList, setProductList] = useState([]);
  const [notification, setNotification] = useState(""); // to show stock warnings
  const [previewOpen, setPreviewOpen] = useState(false);

  const [barcode, setBarcode] = useState("");
  const barcodeInputRef = useRef();

  // 🔑 helper to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken"); // your stored token
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleBarcodeScan = async (e) => {
    if (e.key === "Enter" && barcode.trim() !== "") {
      try {
        const headers = getAuthHeaders();

        if (!headers.Authorization) {
          setSnackbarMessage("Please login first.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          return;
        }

        const { data: scannedProduct } = await axios.get(
          `${API_BASE_URL}/api/products/by-barcode/${barcode.trim()}`,
          { headers }
        );

        if (!scannedProduct || !scannedProduct.product_name) {
          setSnackbarMessage("Product not found");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setBarcode("");
          return;
        }

        // ✅ Compute derived fields
        const productId = scannedProduct.product_id;
        const rate = parseFloat(scannedProduct.discount_price || 0);
        const gst = parseFloat(scannedProduct.gst || 0);
        const discount = parseFloat(scannedProduct.discount || 0);
        const quantity = 1;
        const effectiveRate = rate * (1 - discount / 100);
        const amount = quantity * effectiveRate;
        const priceIncludingGst = amount * (1 + gst / 100);

        // ✅ Update selectedProducts
        setSelectedProducts((prev) => ({
          ...prev,
          [productId]: {
            ...scannedProduct,
            rate: effectiveRate,
            gst,
            discount,
            quantity,
            amount: amount.toFixed(2),
            priceIncludingGst: priceIncludingGst.toFixed(2),
          },
        }));

        // ✅ Update main invoice list
        updateParticularByBarcode(scannedProduct);

        // Reset barcode input
        setBarcode("");
      } catch (err) {
        console.error("Error fetching product by barcode:", err);
        setSnackbarMessage(
          err.response?.status === 401
            ? "Unauthorized: Invalid token or tenant access"
            : "Error fetching product or not found"
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setBarcode("");
      }
    }
  };

  const updateParticularByBarcode = (product) => {
    setProducts((prevRows) => {
      const updatedRows = [...prevRows];

      // Find if an empty row is available to overwrite
      const emptyIndex = updatedRows.findIndex(
        (r) => !r.particular || r.particular === ""
      );

      const quantity = 1;
      const rate = parseFloat(product.discount_price || 0);
      const gst = parseFloat(product.gst || 0);
      const discount = parseFloat(product.discount || 0);
      const effectiveRate = rate * (1 - discount / 100);
      const amount = quantity * product.discount_price;
      const priceWithGst = amount * (1 + gst / 100);

      const newRow = {
        particular: product.product_name,
        hsn_code: product.hsn_code,
        quantity,
        unit: product.unit || "Kg",
        rate: product.discount_price,
        amount: amount.toFixed(2),
        gst: product.gst,
        discount: product.discount,
        stock_quantity: product.stock_quantity ?? 0,
        priceIncludingGst: priceWithGst.toFixed(2),
        product_id: product.product_id, // Optional if used elsewhere
      };

      if (emptyIndex !== -1) {
        // Replace empty row
        updatedRows[emptyIndex] = { ...updatedRows[emptyIndex], ...newRow };
      } else {
        // Append new row
        updatedRows.push(newRow);
      }

      return updatedRows;
    });
  };

  const [products, setProducts] = useState([
    {
      particular: "",
      hsn_code: "",
      quantity: "",
      unit: "Kg",
      rate: "",
      amount: "",
      gst: "",
      discount: "",
      priceIncludingGst: "",
      stock_quantity: 0,
    },
  ]);

  const [paymentStatus, setPaymentStatus] = useState("Full Payment");
  const [dueDate, setDueDate] = useState("");

  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [currentDraftKey, setCurrentDraftKey] = useState(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success"); // success | error | warning | info

  const [showCustomer, setShowCustomer] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState({});

  const [selectModalOpen, setSelectModalOpen] = useState(false);

  const [gst, setGst] = useState(18);
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState("%");
  const [transportCharge, setTransportCharge] = useState("");
  const [transportChecked, setTransportChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const subtotal = products.reduce(
    (acc, item) => acc + parseFloat(item.priceIncludingGst || 0),
    0
  );
  const totalWithGst = products.reduce(
    (acc, item) => acc + parseFloat(item.priceIncludingGst || 0),
    0
  );
  const gstAmount = gst > 0 ? (subtotal * gst) / 100 : 0;
  const discountAmount =
    discountType === "%"
      ? totalWithGst * (discount / 100)
      : parseFloat(discount || 0);

  // Derived GST Values
  const cgst = gst / 2;
  const sgst = gst / 2;

  // Computations (assume you already have: subtotal, totalWithGst)
  const discountValue =
    discountType === "%"
      ? (subtotal * parseFloat(discount || 0)) / 100
      : parseFloat(discount || 0);

  const gstCost = ((subtotal - discountValue) * gst) / 100;
  const cgstCost = gstCost / 2;
  const sgstCost = gstCost / 2;
  const transportAmount = transportChecked
    ? parseFloat(transportCharge || 0)
    : 0;

  const total = totalWithGst - discountValue + transportAmount + gstCost;

  const generateInvoiceNumber = () => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(2); // last 2 digits of year
    const suffix = Math.random().toString(36).substring(2, 5).toUpperCase(); // 3-char random

    return `INV-${yy}${mm}${dd}-${suffix}`;
  };

  useEffect(() => {
    const newInvoiceNo = generateInvoiceNumber();
    setCustomer((prev) => ({ ...prev, invoiceNo: newInvoiceNo }));
  }, []);

  const handleAddSelectedProducts = (selectedProductsObj) => {
    setProducts((prevProducts) => {
      // Remove blank rows (if any)
      const filtered = prevProducts.filter(
        (p) => p.particular && p.particular.trim() !== ""
      );

      const selectedArray = Object.values(selectedProductsObj);
      const selectedIds = new Set(selectedArray.map((p) => p.product_id));

      // Filter out products that were deselected
      const retained = filtered.filter(
        (existing) =>
          existing.product_id && selectedIds.has(existing.product_id)
      );

      // Create a map for quick lookup of existing product IDs
      const retainedIds = new Set(retained.map((p) => p.product_id));

      // Add or update selected products
      const newlyFormatted = selectedArray
        .filter((p) => !retainedIds.has(p.product_id)) // only new ones
        .map((p) => {
          const amount = p.discount_price * p.quantity;
          const priceWithGst = amount + (amount * p.gst) / 100;

          return {
            product_id: p.product_id,
            particular: p.product_name,
            hsn_code: p.hsn_code,
            quantity: p.quantity,
            unit: "Kg",
            rate: p.discount_price,
            amount: amount.toFixed(2),
            gst: p.gst,
            discount: p.discount,
            priceIncludingGst: priceWithGst.toFixed(2),
            stock_quantity: p.stock_quantity,
          };
        });

      return [...retained, ...newlyFormatted];
    });
  };

  const handleSelectedProducts = (selectedProducts) => {
    const updated = [...products];

    selectedProducts.forEach((product) => {
      updated.push({
        particular: product.product_name,
        hsn_code: product.hsn_code,
        quantity: "",
        unit: "Kg",
        rate: product.discount_price,
        gst: product.gst,
        discount: product.discount,
        amount: "",
        priceIncludingGst: "",
        stock_quantity: product.stock_quantity,
      });
    });

    setProducts(updated);
    setProductModalOpen(false);
  };

  // ----------------- API CALL -----------------

  // ----------------- HANDLERS -----------------
  const handleCustomerChange = (e) => {
    setCustomer({ ...customer, [e.target.name]: e.target.value });
  };

  // ----------------- API CALL -----------------
  useEffect(() => {
    async function fetchProducts() {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          console.error("No auth token found. Please log in again.");
          return;
        }

        const res = await axios.get(`${API_BASE_URL}/api/products`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Normalize data for safety
        const normalized = res.data.map((p) => ({
          ...p,
          discount_price: p.discount_price ?? p.price,
          discount: p.discount ?? 0,
        }));

        setProductList(normalized);
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    }

    fetchProducts();
  }, []);

  useEffect(() => {
    // Sync selectedProducts when products change
    const selectedObj = {};
    products.forEach((p) => {
      if (p.product_id) {
        selectedObj[p.product_id] = {
          ...p,
          product_name: p.particular,
          discount_price: p.rate,
        };
      }
    });
    setSelectedProducts(selectedObj);
  }, [products]);

  // ----------------- HANDLE PRODUCT CHANGE -----------------
  const handleProductChange = (index, field, value) => {
    const updated = [...products];

    if (field === "particular") {
      // ✅ Find product by ID, not name
      const selected = productList.find((p) => p.product_id === value);
      if (!selected) return;

      if (selected.stock_quantity === 0) {
        setNotification("This product is out of stock.");
        return;
      } else {
        setNotification("");
      }

      const quantity = 1;
      const rate = parseFloat(selected.discount_price ?? selected.price ?? 0);
      const gst = parseFloat(selected.gst ?? 0);
      const amount = rate * quantity;
      const priceWithGst = amount + (amount * gst) / 100;

      // ✅ Save both product_id and product_name in row
      updated[index] = {
        ...updated[index],
        product_id: selected.product_id,
        particular: selected.product_name, // still needed for labels/tooltips
        hsn_code: selected.hsn_code,
        quantity,
        unit: "Nos",
        rate: selected.discount_price,
        gst: selected.gst,
        discount: selected.discount,
        stock_quantity: selected.stock_quantity,
        amount: amount.toFixed(2),
        priceIncludingGst: priceWithGst.toFixed(2),
      };

      // ✅ Keep selectedProducts in sync
      setSelectedProducts((prev) => ({
        ...prev,
        [selected.product_id]: {
          product_id: selected.product_id,
          particular: selected.product_name,
          hsn_code: selected.hsn_code,
          quantity,
          unit: "Nos",
          rate,
          gst: selected.gst,
          discount: selected.discount,
          stock_quantity: selected.stock_quantity,
          amount: amount.toFixed(2),
          priceIncludingGst: priceWithGst.toFixed(2),
        },
      }));
    } else if (field === "quantity") {
      const quantity = parseFloat(value) || 0;
      const rate = parseFloat(updated[index].rate || 0);
      const gst = parseFloat(updated[index].gst || 0);
      const productId = updated[index].product_id;

      // ✅ Get stock from productList or selectedProducts
      const productFromList = productList.find(
        (p) => p.product_id === productId
      );
      const stock =
        productFromList?.stock_quantity ??
        selectedProducts[productId]?.stock_quantity ??
        updated[index].stock_quantity ??
        0;

      if (stock === 0) {
        setNotification("This product is out of stock.");
      } else if (quantity > stock) {
        setNotification(
          `Entered quantity (${quantity}) exceeds available stock (${stock}).`
        );
      } else if (quantity <= 0) {
        setNotification("Quantity must be greater than zero.");
      } else {
        setNotification("");
      }

      const amount = rate * quantity;
      const priceWithGst = amount + (amount * gst) / 100;

      updated[index].quantity = quantity;
      updated[index].amount = amount.toFixed(2);
      updated[index].priceIncludingGst = priceWithGst.toFixed(2);
      updated[index].stock_quantity = stock; // ✅ keep stock reference

      if (productId && selectedProducts[productId]) {
        setSelectedProducts((prev) => ({
          ...prev,
          [productId]: {
            ...prev[productId],
            quantity,
            amount: amount.toFixed(2),
            priceIncludingGst: priceWithGst.toFixed(2),
          },
        }));
      }
    } else if (field === "discount") {
      const discount = parseFloat(value) || 0;
      const quantity = parseFloat(updated[index].quantity || 0);
      const rate = parseFloat(updated[index].rate || 0);
      const gst = parseFloat(updated[index].gst || 0);

      const amount = quantity * rate;
      const discountAmount = (amount * discount) / 100;
      const discountedAmount = amount - discountAmount;
      const priceWithGst = discountedAmount + (discountedAmount * gst) / 100;

      updated[index].discount = discount;
      updated[index].amount = discountedAmount.toFixed(2);
      updated[index].priceIncludingGst = priceWithGst.toFixed(2);

      const productId = updated[index].product_id;
      if (productId && selectedProducts[productId]) {
        setSelectedProducts((prev) => ({
          ...prev,
          [productId]: {
            ...prev[productId],
            discount,
            amount: discountedAmount.toFixed(2),
            priceIncludingGst: priceWithGst.toFixed(2),
          },
        }));
      }
    }

    setProducts(updated);
  };

  const handleRemoveProduct = (indexToRemove) => {
    const updatedProducts = products.filter(
      (_, index) => index !== indexToRemove
    );
    setProducts(updatedProducts);
  };

  const handleModalQuantityChange = (productId, newQuantity) => {
    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.product_id === productId
          ? {
              ...product,
              quantity: newQuantity,
              amount: (newQuantity * product.rate).toFixed(2),
              priceIncludingGst: (
                newQuantity *
                product.rate *
                (1 + product.gst / 100)
              ).toFixed(2),
            }
          : product
      )
    );

    setSelectedProducts((prevSelected) => ({
      ...prevSelected,
      [productId]: {
        ...prevSelected[productId],
        quantity: newQuantity,
        amount: (newQuantity * prevSelected[productId].rate).toFixed(2),
        priceIncludingGst: (
          newQuantity *
          prevSelected[productId].rate *
          (1 + prevSelected[productId].gst / 100)
        ).toFixed(2),
      },
    }));
  };

  const handleUnitChange = (index, value) => {
    const updated = [...products];
    updated[index].unit = value;
    setProducts(updated);
  };

  const addProductRow = () => {
    setProducts((prev) => [
      ...prev,
      {
        particular: "",
        hsn_code: "",
        quantity: "",
        unit: "Kg",
        rate: "",
        amount: "",
        gst: "",
        discount: "",
        priceIncludingGst: "",
        stock_quantity: 0,
      },
    ]);
  };

  const resetForm = () => {
    const newInvoiceNo = generateInvoiceNumber();
    setCustomer({
      name: "",
      address: "",
      state: "",
      pincode: "",
      mobile: "",
      gst: "",
      email: "",
      whatsapp_number: "",
      placeOfSupply: "",
      vehicleNo: "",
      date: "",
      invoiceNo: newInvoiceNo,
    });

    setProducts([
      {
        particular: "",
        hsn_code: "",
        quantity: "",
        unit: "Kg",
        rate: "",
        amount: "",
        gst: "",
        discount: "",
        priceIncludingGst: "",
        stock_quantity: 0,
      },
    ]);

    setDiscount("");
    setDiscountType("%");
    setTransportCharge("");
    setTransportChecked(false);
    setSelectedProducts({});
    setNotification("");
    setPreviewOpen(false);
  };

  const [summaryData, setSummaryData] = useState({
    totalWithGst: 0,
    discount: 0,
    discountValue: 0, // Make sure this is a number
    discountType: "%",
    gst: 0,
    gstCost: 0,
    cgstCost: 0,
    sgstCost: 0,
    transportCharge: 0, // Changed from '' to 0 (number)
    transportChecked: false,
    transportAmount: 0,
    total: 0,
  });

  useEffect(() => {
    // Guard clause for empty products
    if (!products || products.length === 0) {
      setSummaryData((prev) => ({
        ...prev,
        totalWithGst: 0,
        discount: 0,
        gst: 0,
        gstCost: 0,
        cgstCost: 0,
        sgstCost: 0,
        total: 0,
        transportAmount: 0,
      }));
      return;
    }

    // Compute subtotal and GST total
    let subtotal = 0;
    let totalGst = 0;

    products.forEach(({ quantity = 0, rate = 0, gst = 0, discount = 0 }) => {
      const qty = parseFloat(quantity) || 0;
      const rt = parseFloat(rate) || 0;
      const gstPercent = parseFloat(gst) || 0;
      const discountPercent = parseFloat(discount) || 0;

      const baseAmount = qty * rt;
      const discountAmount = (baseAmount * discountPercent) / 100;
      const discountedAmount = baseAmount - discountAmount;
      const gstAmount = (discountedAmount * gstPercent) / 100;

      subtotal += discountedAmount;
      totalGst += gstAmount;
    });

    // Calculate discount amount
    const discountValue = parseFloat(summaryData.discountValue) || 0;
    const discountType = summaryData.discountType || "%";

    let discountAmount = 0;
    if (discountType === "%") {
      discountAmount = (subtotal * discountValue) / 100;
    } else {
      discountAmount = discountValue;
    }

    const cgstCost = totalGst / 2;
    const sgstCost = totalGst / 2;

    const totalWithGst = subtotal - discountAmount + gstCost;

    const transportCharge = parseFloat(summaryData.transportCharge) || 0;
    const transportChecked = summaryData.transportChecked || false;
    const transportAmount = transportChecked ? transportCharge : 0;

    const finalTotal = totalWithGst + transportAmount;

    // Update summaryData state
    setSummaryData({
      totalWithGst: parseFloat(totalWithGst.toFixed(2)),
      discount: parseFloat(discountAmount.toFixed(2)),
      discountValue: parseFloat(discountValue.toFixed(2)),
      discountType,
      gst: parseFloat(totalGst.toFixed(2)),
      gstCost: parseFloat(totalGst.toFixed(2)),
      cgstCost: parseFloat(cgstCost.toFixed(2)),
      sgstCost: parseFloat(sgstCost.toFixed(2)),
      transportCharge: parseFloat(transportCharge.toFixed(2)),
      transportChecked,
      transportAmount: parseFloat(transportAmount.toFixed(2)),
      total: parseFloat(finalTotal.toFixed(2)),
    });
  }, [
    products,
    summaryData.discountValue,
    summaryData.discountType,
    summaryData.transportCharge,
    summaryData.transportChecked,
  ]);
  
  const subscriptionType = localStorage.getItem("subscriptionType");

  const [customerBill, setCustomerBill] = useState({
    name: "",
    mobile: "",
    bill_no: "",
    // plus any invoice fields you need
  });

  // Generate bill_no automatically once when switching to bill mode
  useEffect(() => {
    if (subscriptionType === "bill" && !customer.bill_no) {
      setCustomer((prev) => ({ ...prev, bill_no: generateBillNo() }));
    }
  }, [subscriptionType]);

// Utility function to generate 8-character alphanumeric bill number
const generateBillNo = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const handleSubmit = async () => {
  const userData = localStorage.getItem("user");
  const token = localStorage.getItem("authToken");
  const subscriptionType = localStorage.getItem("subscriptionType");

  if (!userData || !token) {
    setSnackbarMessage("Please login first to generate invoice/bill.");
    setSnackbarSeverity("error");
    setSnackbarOpen(true);
    return;
  }

  const user = JSON.parse(userData);
  const userId = user.user_id;

  // Validate required fields
  if (subscriptionType === "bill") {
    if (!customer || !customer.name || !customer.mobile) {
      setSnackbarMessage("Please fill in customer name and mobile.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
  } else {
    if (!customer || !customer.name || !customer.mobile || !customer.date || !customer.invoiceNo) {
      setSnackbarMessage("Please fill in all required customer fields.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    if (!Array.isArray(products) || products.length === 0) {
      setSnackbarMessage("Please add at least one product to the invoice.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
  }

  // Convert numeric fields safely
  const safeSubtotal = Number(subtotal) || 0;
  const safeTotalWithGst = Number(totalWithGst) || 0;
  const safeDiscount = Number(discount) || 0;
  const safeDiscountValue = Number(discountValue) || 0;
  const safeGst = Number(gst) || 0;
  const safeGstCost = Number(gstCost) || 0;
  const safeCgstCost = Number(cgstCost) || 0;
  const safeSgstCost = Number(sgstCost) || 0;
  const safeTransportAmount = Number(transportAmount) || 0;
  const safeTotal = Number(total) || 0;
  const safeAdvanceAmount = Number(advanceAmount) || 0;

  const safePaymentType = paymentType || "Cash";
  const safePaymentStatus = paymentStatus || "Full Payment";

  if (subscriptionType !== "bill") {
    if (safePaymentStatus === "Advance") {
      if (safeAdvanceAmount <= 0) {
        setSnackbarMessage("Advance amount must be greater than 0.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
      if (!dueDate) {
        setSnackbarMessage("Please select due date for advance payment.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
    }
  }

  // Prepare summary data
  const updatedSummary = {
    totalWithGst: parseFloat(safeTotalWithGst.toFixed(2)),
    discount: parseFloat(safeDiscount.toFixed(2)),
    discountValue: parseFloat(safeDiscountValue.toFixed(2)),
    discountType: discountType === "₹" ? "flat" : "%",
    gst: parseFloat(safeGst.toFixed(2)),
    gstCost: parseFloat(safeGstCost.toFixed(2)),
    cgstCost: parseFloat(safeCgstCost.toFixed(2)),
    sgstCost: parseFloat(safeSgstCost.toFixed(2)),
    transportCharge: transportChecked ? parseFloat(safeTransportAmount.toFixed(2)) : 0,
    transportChecked: transportChecked || false,
    transportAmount: transportChecked ? parseFloat(safeTransportAmount.toFixed(2)) : 0,
    total: parseFloat(safeTotal.toFixed(2)),
    paymentType: safePaymentType,
    paymentStatus: safePaymentStatus,
    advanceAmount: parseFloat(safeAdvanceAmount.toFixed(2)),
    dueDate: safePaymentStatus === "Advance" ? dueDate : null,
  };

  setSummaryData(updatedSummary);

  // Build payload & API URL based on subscription type
  let payload;
  let apiUrl;

  if (subscriptionType === "bill") {
    const billNo = generateBillNo();

    payload = {
      customer: {
        name: customer.name,
        mobile: customer.mobile,
        billNo: billNo,
        date: new Date().toISOString().split("T")[0],
      },
      products: products || [],      // optional
      summaryData: updatedSummary,    // optional
      created_by: userId,
    };

    apiUrl = `${API_BASE_URL}/api/bills/create`;
  } else {
    payload = {
      customer: {
        ...customer,
        email: customer.email || "",
        whatsapp_number: customer.whatsapp_number || "",
      },
      products,
      summaryData: updatedSummary,
      created_by: userId,
    };

    apiUrl = `${API_BASE_URL}/api/invoices/create`;
  }

  console.log("🚀 Sending Payload to Backend:", JSON.stringify(payload, null, 2));

  setIsLoading(true);

  try {
    const response = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: `Bearer ${token}`, // ensure tenant-aware token
        "Content-Type": "application/json",
      },
    });

    if (response.status === 201 || response.status === 200) {
      if (currentDraftKey && currentDraftKey.startsWith("draft_")) {
        localStorage.removeItem(currentDraftKey);
        setCurrentDraftKey(null);
      }

      setSnackbarMessage(
        subscriptionType === "bill" ? "Bill saved successfully!" : "Invoice saved successfully!"
      );
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      resetForm();
    } else {
      setSnackbarMessage("Saved but encountered a minor issue.");
      setSnackbarSeverity("warning");
      setSnackbarOpen(true);
    }
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message || "Unknown error occurred";
    console.error("❌ Error saving invoice/bill:", errMsg);
    setSnackbarMessage(`Error saving: ${errMsg}`);
    setSnackbarSeverity("error");
    setSnackbarOpen(true);
  } finally {
    setIsLoading(false);
  }
};




  const handleClearDraft = () => {
    localStorage.removeItem("invoiceDraft");
    setSnackbarMessage("Draft cleared.");
    setSnackbarSeverity("info");
    setSnackbarOpen(true);
  };

  const handleDeleteSpecificDraft = (key) => {
    const userData = localStorage.getItem("user");
    const userId = userData ? JSON.parse(userData).user_id : null;

    // ✅ Only allow deleting drafts belonging to current user
    if (!userId || !key.startsWith(`draft_${userId}_`)) {
      setSnackbarMessage("You cannot delete this draft (not your account).");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    localStorage.removeItem(key);
    setSnackbarMessage(`Draft ${key} deleted`);
    setSnackbarSeverity("info");
    setSnackbarOpen(true);

    // Reset currentDraftKey if this was the active one
    if (currentDraftKey === key) {
      setCurrentDraftKey(null);
    }
  };

  const handleSelectDraft = (draft, key) => {
    const userData = localStorage.getItem("user");
    const userId = userData ? JSON.parse(userData).user_id : null;

    // ✅ Ensure the draft belongs to the logged-in user
    if (!userId || !key.startsWith(`draft_${userId}_`)) {
      setSnackbarMessage("You cannot load this draft (not your account).");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (draft.customer) {
      setCustomer((prev) => ({
        ...prev,
        ...draft.customer,
        email: draft.customer.email || "",
        whatsapp_number: draft.customer.whatsapp_number || "",
      }));
    }

    if (draft.products) setProducts(draft.products);

    if (draft.summaryData) {
      const s = draft.summaryData;
      setGst(s.gst?.toString() || "");
      setDiscount(s.discount?.toString() || "");
      setDiscountType(s.discountType || "%");
      setTransportChecked(Boolean(s.transportChecked));
      setTransportCharge(s.transportAmount?.toString() || "");

      // ✅ New fields
      setPaymentType(s.paymentType || "Cash");
      setPaymentStatus(s.paymentStatus || "Full Payment");
      setAdvanceAmount(s.advanceAmount?.toString() || "");
      setDueDate(s.dueDate || "");
    }

    setCurrentDraftKey(key);

    setSnackbarMessage(`Draft ${key} loaded successfully.`);
    setSnackbarSeverity("success");
    setSnackbarOpen(true);
  };

  const handleSaveDraftToLocal = () => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      setSnackbarMessage("Please login first to save drafts.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    const user = JSON.parse(userData);
    const userId = user.user_id;

    const safeSubtotal = Number(subtotal) || 0;
    const safeTotalWithGst = Number(totalWithGst) || 0;
    const safeDiscount = Number(discount) || 0;
    const safeDiscountValue = Number(discountValue) || 0;
    const safeGst = Number(gst) || 0;
    const safeGstCost = Number(gstCost) || 0;
    const safeCgstCost = Number(cgstCost) || 0;
    const safeSgstCost = Number(sgstCost) || 0;
    const safeTransportAmount = Number(transportAmount) || 0;
    const safeTotal = Number(total) || 0;

    const updatedSummary = {
      totalWithGst: parseFloat(safeTotalWithGst.toFixed(2)),
      discount: parseFloat(safeDiscount.toFixed(2)),
      discountValue: parseFloat(safeDiscountValue.toFixed(2)),
      discountType: discountType || "%",
      gst: parseFloat(safeGst.toFixed(2)),
      gstCost: parseFloat(safeGstCost.toFixed(2)),
      cgstCost: parseFloat(safeCgstCost.toFixed(2)),
      sgstCost: parseFloat(safeSgstCost.toFixed(2)),
      transportCharge: transportChecked
        ? parseFloat(safeTransportAmount.toFixed(2))
        : 0,
      transportChecked: transportChecked || false,
      transportAmount: transportChecked
        ? parseFloat(safeTransportAmount.toFixed(2))
        : 0,
      total: parseFloat(safeTotal.toFixed(2)),

      paymentType: paymentType || "Cash",
      paymentStatus: paymentStatus || "Full Payment",
      advanceAmount: parseFloat(advanceAmount || 0),
      dueDate: dueDate || null,
    };

    const draftData = {
      customer,
      products,
      summaryData: updatedSummary,
      createdAt: new Date().toISOString(),
    };

    // ✅ Tenant-specific keys
    const allKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith(`draft_${userId}_`)
    );
    const newDraftKey = `draft_${userId}_${allKeys.length + 1}`;

    localStorage.setItem(newDraftKey, JSON.stringify(draftData));

    setSnackbarMessage(`Saved as ${newDraftKey}`);
    setSnackbarSeverity("success");
    setSnackbarOpen(true);
    resetForm();
  };

  const handleLoadDraftFromLocal = () => {
    const savedDraft = localStorage.getItem("invoiceDraft");

    if (!savedDraft) {
      setSnackbarMessage("No draft found.");
      setSnackbarSeverity("warning");
      setSnackbarOpen(true);
      return;
    }

    try {
      const parsed = JSON.parse(savedDraft);

      if (parsed.customer) {
        setCustomer((prev) => ({
          ...prev,
          ...parsed.customer,
          email: parsed.customer.email || "",
          whatsapp_number: parsed.customer.whatsapp_number || "",
        }));
      }

      if (parsed.products) setProducts(parsed.products);

      if (parsed.summaryData) {
        const s = parsed.summaryData;
        setGst(s.gst?.toString() || "");
        setDiscount(s.discount?.toString() || "");
        setDiscountType(s.discountType || "%");
        setTransportChecked(Boolean(s.transportChecked));
        setTransportCharge(s.transportAmount?.toString() || "");

        // ✅ New fields
        setPaymentType(s.paymentType || "Cash");
        setPaymentStatus(s.paymentStatus || "Full Payment");
        setAdvanceAmount(s.advanceAmount?.toString() || "");
        setDueDate(s.dueDate || "");
      }

      setCurrentDraftKey("invoiceDraft");

      setSnackbarMessage("Draft loaded successfully!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error loading draft:", error);
      setSnackbarMessage("Invalid draft data.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const [productSearch, setProductSearch] = useState("");
  const [mobileAnchorEl, setMobileAnchorEl] = useState(null); // Popper anchor
  const [anchorEl, setAnchorEl] = useState(null);
  const [search, setSearch] = useState("");
  const inputRef = useRef();

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearch("");
  };

  const open = Boolean(anchorEl);

  const filteredProducts = productList.filter((product) => {
    const q = search.toLowerCase();
    return (
      product.product_name.toLowerCase().includes(q) ||
      product.hsn_code.toLowerCase().includes(q) ||
      product.stock_quantity.toString().includes(q) ||
      product.discount_price.toString().includes(q)
    );
  });

  return (
    <>
      <ThemeProvider theme={darkTheme}>
        <Container
          maxWidth="xl"
          sx={{
            py: { xs: 6, md: 5 },
            backgroundColor: palette.background.default, // ✅ dynamic background
            minHeight: "100vh",
          }}
        >
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: primaryColor,
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontSize: { xs: "1.5rem", sm: "2rem" },
            }}
          >
            <ReceiptLongIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
            GST Invoice
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              mb: 3,
              justifyContent: "flex-end",
            }}
          >
            <Button
              variant="outlined"
              color="primary"
              startIcon={<SendAndArchiveIcon />}
              onClick={handleSaveDraftToLocal}
              sx={{
                textTransform: "none",
                color: primaryColor,
                fontWeight: "bold",
                border: `2px solid ${primaryColor}`,
                backgroundColor: "transparent",
                transition: "all 0.3s ease-in-out",
                "&:hover": {
                  borderColor: primaryColor,
                  boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                },
              }}
            >
              Save as Draft
            </Button>
            <Button
              variant="outlined"
              color="info"
              startIcon={<CloudSyncIcon />}
              onClick={() => setDraftModalOpen(true)}
              sx={{
                textTransform: "none",
                color: primaryColor,
                fontWeight: "bold",
                border: `2px solid ${primaryColor}`,
                backgroundColor: "transparent",
                transition: "all 0.3s ease-in-out",
                "&:hover": {
                  borderColor: primaryColor,
                  boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                },
              }}
            >
              Load Draft
            </Button>
          </Box>

          {/* Product Selection */}
          <AnimatedBox
            component={Paper}
            layout
            transition={{ duration: 0.4 }}
            sx={{
              p: { xs: 2, sm: 3 },
              mb: 4,
              backgroundColor: isDark ? "#0c0c0c" : "#f9f9f9",
              border: `1px solid ${isDark ? "#333" : "#ddd"}`,
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={1}
            >
              <Grid sx={{ display: "flex", gap: "30px" }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: primaryColor,
                    mb: { xs: 1, sm: 0 },
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    fontWeight: "bold",
                    fontSize: { xs: "1.2rem", sm: "1.25rem" },
                  }}
                >
                  {/* <Inventory2Icon sx={{ fontSize: {xs: '24px', sm: '20px'} }} /> */}
                  Product Selection
                </Typography>
              </Grid>

              <IconButton
                onClick={() => setPreviewOpen(true)}
                sx={{
                  color: primaryColor,
                  border: `2px solid ${primaryColor}`,
                  borderRadius: "50%",
                  "&:hover": {
                    borderColor: primaryColor,
                    boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                  },
                }}
              >
                <CrisisAlertOutlinedIcon
                  sx={{ fontSize: { xs: "18px", sm: "20px" } }}
                />
              </IconButton>
            </Box>
            <Typography
              sx={{
                color: primaryColor,
                fontWeight: "bold",
                mt: 2,
                fontSize: "14px",
              }}
            >
              Scan Bar Code (or) Type Bar Code ID
            </Typography>
            <TextField
              placeholder="Scan Bar Code"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleBarcodeScan}
              inputRef={barcodeInputRef}
              autoFocus
              fullWidth
              sx={{
                maxWidth: { xs: "100%", sm: "300px" },
                mb: 2,
                mt: 1,
                // Outer wrapper of the input
                "& .MuiOutlinedInput-root": {
                  backgroundColor: isDark ? "#2b2b2b" : "#fff",
                  color: isDark ? "#fff" : "#000",
                  borderRadius: 1,
                  // Border when not focused or hovered
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: isDark ? "#555" : "#ccc",
                  },
                  // Border on hover
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: primaryColor,
                  },
                  // Border on focus
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: primaryColor,
                  },
                },
                // Label when focused
                "& .MuiInputLabel-root": {
                  color: isDark ? "#aaa" : "#555",
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: primaryColor,
                },
              }}
            />

            {/* ---------------------------- */}
            {/* Mobile View (Stacked fields) */}
            {/* ---------------------------- */}
            <Box
              sx={{
                display: { xs: "block", lg: "none" },
                width: "100%",
                px: 0,
                mx: 0,
              }}
            >
              {products.map((row, index) => (
                <Paper
                  key={index}
                  elevation={2}
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    backgroundColor: palette.background.default,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {/* Delete Button (Top Right Corner) */}
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveProduct(index)}
                    sx={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      color: "#f44336",
                      backgroundColor: "rgba(255,255,255,0.1)",
                      "&:hover": {
                        borderColor: primaryColor,
                        boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                      },
                    }}
                  >
                    <ReplyAllOutlinedIcon
                      sx={{ fontSize: "20px", color: primaryColor }}
                    />
                  </IconButton>
                  <Grid container spacing={1} sx={{ display: "grid" }}>
                    {/* Particular Field */}
                    <Grid item xs={12}>
                      <Tooltip
                        title={
                          row.product_id
                            ? productList.find(
                                (p) => p.product_id === row.product_id
                              )?.product_name
                            : "No product selected"
                        }
                        placement="top"
                        arrow
                        enterDelay={300}
                        leaveDelay={200}
                        componentsProps={{
                          tooltip: {
                            sx: {
                              backgroundColor: isDark ? "#444" : "#333",
                              color: "#fff",
                              fontSize: "0.85rem",
                              borderRadius: 1,
                              px: 1.5,
                              py: 1,
                              boxShadow: 3,
                              maxWidth: 240,
                            },
                          },
                          arrow: {
                            sx: {
                              color: isDark ? "#444" : "#333",
                            },
                          },
                        }}
                      >
                        <TextField
                          select
                          fullWidth
                          label="Particular"
                          value={row.product_id || ""}
                          onChange={(e) =>
                            handleProductChange(
                              index,
                              "particular",
                              e.target.value
                            )
                          }
                          sx={{
                            minWidth: "200px",
                            "& .MuiInputBase-root": {
                              backgroundColor: isDark ? "#2b2b2b" : "#ffffff",
                              color: isDark ? "#fff" : "#000",
                            },
                            "& label.Mui-focused": { color: primaryColor },
                            "& .MuiInputLabel-root": {
                              color: isDark ? "#aaa" : "#555",
                            },
                            "& .MuiOutlinedInput-notchedOutline": {
                              borderColor: isDark ? "#555" : "#ccc",
                            },
                            "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                              {
                                borderColor: primaryColor,
                              },
                            "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                              {
                                borderColor: primaryColor,
                              },
                            "& svg": { color: isDark ? "#e0f7fa" : "gray" },
                          }}
                          SelectProps={{
                            renderValue: (selected) =>
                              productList.find((p) => p.product_id === selected)
                                ?.product_name || "",
                            MenuProps: {
                              PaperProps: {
                                sx: {
                                  maxHeight: 480,
                                  backgroundColor: isDark ? "#1e1e1e" : "#fff",
                                  border: `1px solid ${primaryColor}`,
                                  borderRadius: "4px",
                                  "& .MuiMenuItem-root": {
                                    px: 1.5,
                                    py: 0.75,
                                    fontSize: "0.85rem",
                                    color: isDark ? "#e0f7fa" : "#000",
                                    minHeight: "unset",
                                    alignItems: "start",
                                    "&:hover": {
                                      backgroundColor: isDark
                                        ? "#494e4e"
                                        : "#f0f0f0",
                                    },
                                    "&.Mui-selected": {
                                      backgroundColor: primaryColor,
                                      color: "#fff",
                                      "&:hover": {
                                        backgroundColor: primaryColor,
                                      },
                                    },
                                  },
                                  "&::-webkit-scrollbar": { width: "6px" },
                                  "&::-webkit-scrollbar-thumb": {
                                    backgroundColor: primaryColor,
                                    borderRadius: "6px",
                                  },
                                },
                              },
                            },
                          }}
                        >
                          {productList.map((product) => (
                            <MenuItem
                              key={product.product_id}
                              value={product.product_id}
                              disabled={product.stock_quantity === 0}
                              sx={{
                                opacity: product.stock_quantity === 0 ? 0.5 : 1,
                                fontStyle:
                                  product.stock_quantity === 0
                                    ? "italic"
                                    : "normal",
                                color:
                                  product.stock_quantity === 0
                                    ? "gray"
                                    : "inherit",
                                pointerEvents:
                                  product.stock_quantity === 0
                                    ? "none"
                                    : "auto",
                              }}
                            >
                              <Box display="flex" flexDirection="column">
                                <Typography
                                  fontWeight={900}
                                  fontSize="0.85rem"
                                  noWrap
                                >
                                  {product.product_name}
                                  {product.stock_quantity === 0 && (
                                    <Typography
                                      component="span"
                                      sx={{
                                        fontWeight: "normal",
                                        fontSize: "0.7rem",
                                        color: "red",
                                        ml: 1,
                                      }}
                                    >
                                      (Out of stock)
                                    </Typography>
                                  )}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  fontSize="0.7rem"
                                  color={isDark ? "#aaa" : "gray"}
                                >
                                  ID: {product.product_id} | HSN:{" "}
                                  {product.hsn_code} | Stock:{" "}
                                  {product.stock_quantity} | Price: ₹
                                  {product.discount_price}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </TextField>
                      </Tooltip>
                    </Grid>

                    {/* Disabled Fields */}
                    {/* Disabled Fields */}
                    {[
                      "HSN Code",
                      "Price/Nos",
                      "GST %",
                      "Discount %",
                      "Amount",
                      "Total (Incl. GST)",
                    ].map((label, i) => {
                      const keys = [
                        "hsn_code",
                        "rate",
                        "gst",
                        "discount",
                        "amount",
                        "priceIncludingGst",
                      ];
                      return (
                        <Grid item xs={12} key={i}>
                          <TextField
                            label={label}
                            fullWidth
                            type={keys[i] === "rate" ? "number" : "text"}
                            value={row[keys[i]]}
                            disabled={keys[i] !== "rate"}
                            inputProps={
                              keys[i] === "rate" ? { min: 0, step: "0.01" } : {}
                            }
                            onChange={(e) =>
                              keys[i] === "rate" &&
                              handleProductChange(index, "rate", e.target.value)
                            }
                            variant="outlined"
                            sx={{
                              "& .MuiInputBase-root": {
                                backgroundColor:
                                  keys[i] === "rate"
                                    ? isDark
                                      ? "#2b2b2b"
                                      : "#ffffff"
                                    : isDark
                                    ? "#2b2b2b"
                                    : "#f5f5f5",
                                color: isDark ? "#fff" : "#000",
                                borderRadius: 1,
                              },
                              "& .Mui-disabled": {
                                WebkitTextFillColor: isDark
                                  ? "#aaa"
                                  : "#595a59", // Normal disabled color
                              },
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: isDark ? "#555" : "#ccc",
                              },
                              "& .MuiInputLabel-root": {
                                color: isDark ? "#aaa" : "#555",
                              },

                              // Autofill override styles
                              "& input:-webkit-autofill": {
                                WebkitBoxShadow: `0 0 0 100px ${
                                  isDark ? "#2b2b2b" : "#f5f5f5"
                                } inset`,
                                WebkitTextFillColor: isDark
                                  ? "#aaa"
                                  : "#595a59",
                                caretColor: isDark ? "#aaa" : "#595a59",
                                borderRadius: 1,
                                transition:
                                  "background-color 5000s ease-in-out 0s",
                              },
                            }}
                          />
                        </Grid>
                      );
                    })}

                    {/* Quantity + Unit */}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Quantity"
                        type="number"
                        value={row.quantity}
                        inputProps={{ min: 0 }}
                        onChange={(e) =>
                          handleProductChange(index, "quantity", e.target.value)
                        }
                        InputProps={{
                          endAdornment: (
                            <Select
                              value={row.unit}
                              onChange={(e) =>
                                handleUnitChange(index, e.target.value)
                              }
                              variant="standard"
                              disableUnderline
                              sx={{
                                bgcolor: isDark ? "#1e1e1e" : "#f5f5f5", // background for select input box
                                color: isDark ? "#fff" : "gray",
                                borderRadius: 1,
                                px: 1,
                                "& .MuiSvgIcon-root": {
                                  color: isDark ? "#fff" : "gray",
                                },
                              }}
                              MenuProps={{
                                PaperProps: {
                                  sx: {
                                    bgcolor: isDark ? "#2a2a2a" : "#fff", // background for dropdown menu
                                    color: isDark ? "#fff" : "#000",
                                    boxShadow: isDark
                                      ? "0px 4px 12px rgba(0, 0, 0, 0.5)"
                                      : "0px 4px 12px rgba(0, 0, 0, 0.1)",
                                  },
                                },
                              }}
                            >
                              <MenuItem value="Kg">Kg</MenuItem>
                              <MenuItem value="Nos">Nos</MenuItem>
                              <MenuItem value="Nos">Litre</MenuItem>
                            </Select>
                          ),
                        }}
                        sx={{
                          "& .MuiInputBase-root": {
                            backgroundColor: isDark ? "#2b2b2b" : "#ffffff",
                            color: isDark ? "#fff" : "#3e403e",
                          },
                          "& label.Mui-focused": {
                            color: primaryColor,
                          },
                          "& .MuiInputLabel-root": {
                            color: isDark ? "#aaa" : "#555",
                          },
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: isDark ? "#555" : "#ccc",
                          },
                          "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                            {
                              borderColor: primaryColor,
                            },
                          "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                            {
                              borderColor: primaryColor,
                            },
                        }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              ))}

              {notification && (
                <Typography color="error" fontWeight="bold" mt={2}>
                  {notification}
                </Typography>
              )}
            </Box>

            {/* ----------------------------- */}
            {/* Desktop/Tablet Table View */}
            {/* ----------------------------- */}
            <Box>
              <Box
                sx={{
                  display: { xs: "none", lg: "block" },
                  mt: 2,
                  maxHeight: "500px",
                  overflow: "auto",
                  scrollbarWidth: "thin",
                  scrollbarColor: `${primaryColor} transparent`,
                  "&::-webkit-scrollbar": {
                    width: "8px",
                  },
                  "&::-webkit-scrollbar-track": {
                    background: "transparent",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: primaryColor,
                    borderRadius: "4px",
                  },
                }}
              >
                <Table size="small" stickyHeader sx={{ minWidth: "1200px" }}>
                  <TableHead>
                    <TableRow
                      sx={{ backgroundColor: palette.background.default }}
                    >
                      {[
                        "Particulars",
                        "HSN",
                        "Quantity",
                        "Price/Nos ₹",
                        "GST %",
                        "Discount %",
                        "Amount",
                        "Total (Incl. GST)",
                        "Actions",
                      ].map((col) => (
                        <TableCell
                          key={col}
                          sx={{
                            fontWeight: "bold",
                            color: primaryColor,
                            whiteSpace: "nowrap",
                            textAlign: "left",
                            padding: 1,
                            backgroundColor: palette.background.default,
                          }}
                        >
                          {col}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {products.map((row, index) => (
                      <TableRow key={index}>
                        {/* Particular Field */}
                        <TableCell sx={{ px: 1, py: 2 }}>
                          <Tooltip
                            title={row.particular ? row.particular : ""}
                            placement="top"
                            arrow
                            enterDelay={300}
                            leaveDelay={200}
                            componentsProps={{
                              tooltip: {
                                sx: {
                                  backgroundColor: isDark ? "#444" : "#333",
                                  color: "#fff",
                                  fontSize: "0.85rem",
                                  borderRadius: 1,
                                  px: 1.5,
                                  py: 1,
                                  boxShadow: 3,
                                  maxWidth: 240,
                                },
                              },
                              arrow: {
                                sx: { color: isDark ? "#444" : "#333" },
                              },
                            }}
                          >
                            <TextField
                              select
                              fullWidth
                              label="Particular"
                              value={row.product_id || ""}
                              onChange={(e) =>
                                handleProductChange(
                                  index,
                                  "particular",
                                  e.target.value
                                )
                              }
                              sx={{
                                minWidth: "200px",
                                maxWidth: "205px",
                                "& .MuiInputBase-root": {
                                  backgroundColor: isDark ? "#2b2b2b" : "#fff",
                                  color: isDark ? "#fff" : "#000",
                                  borderRadius: 1,
                                },
                                "& label.Mui-focused": { color: primaryColor },
                                "& .MuiOutlinedInput-notchedOutline": {
                                  borderColor: isDark ? "#555" : "#ccc",
                                },
                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                  borderColor: primaryColor,
                                },
                                "& .Mui-focused .MuiOutlinedInput-notchedOutline":
                                  {
                                    borderColor: primaryColor,
                                  },
                                "& .MuiSvgIcon-root": {
                                  color: isDark ? "#e0f7fa" : "#888",
                                },
                                "& .MuiInputLabel-root": {
                                  color: isDark ? "#aaa" : "#555",
                                },
                              }}
                              SelectProps={{
                                // ✅ Display product_name instead of product_id
                                renderValue: (selectedId) => {
                                  if (!selectedId) return "Select a product";
                                  const product = productList.find(
                                    (p) => p.product_id === selectedId
                                  );
                                  return product
                                    ? product.product_name
                                    : selectedId;
                                },
                                MenuProps: {
                                  PaperProps: {
                                    sx: {
                                      maxHeight: 480,
                                      backgroundColor: isDark
                                        ? "#1e1e1e"
                                        : "#fff",
                                      border: `1px solid ${primaryColor}`,
                                      borderRadius: "4px",
                                      "& .MuiMenuItem-root": {
                                        px: 1.5,
                                        py: 0.75,
                                        fontSize: "0.85rem",
                                        color: isDark ? "#e0f7fa" : "#333",
                                        "&:hover": {
                                          backgroundColor: isDark
                                            ? "#494e4e"
                                            : "#f0f0f0",
                                        },
                                        "&.Mui-selected": {
                                          backgroundColor: primaryColor,
                                          color: "#fff",
                                        },
                                      },
                                      "&::-webkit-scrollbar": { width: "6px" },
                                      "&::-webkit-scrollbar-thumb": {
                                        backgroundColor: primaryColor,
                                        borderRadius: "6px",
                                      },
                                    },
                                  },
                                },
                              }}
                            >
                              {productList.map((product) => (
                                <MenuItem
                                  key={product.product_id}
                                  value={product.product_id} // ✅ use ID as value
                                  disabled={product.stock_quantity === 0}
                                  sx={{
                                    opacity:
                                      product.stock_quantity === 0 ? 0.5 : 1,
                                    fontStyle:
                                      product.stock_quantity === 0
                                        ? "italic"
                                        : "normal",
                                    color:
                                      product.stock_quantity === 0
                                        ? "gray"
                                        : "inherit",
                                    pointerEvents:
                                      product.stock_quantity === 0
                                        ? "none"
                                        : "auto",
                                  }}
                                >
                                  <Box>
                                    <Typography
                                      fontWeight={900}
                                      fontSize="0.85rem"
                                      noWrap
                                    >
                                      {product.product_name}
                                      {product.stock_quantity === 0 && (
                                        <Typography
                                          component="span"
                                          sx={{
                                            fontWeight: "normal",
                                            fontSize: "0.7rem",
                                            color: "red",
                                            ml: 1,
                                          }}
                                        >
                                          (Out of stock)
                                        </Typography>
                                      )}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      fontSize="0.7rem"
                                      color="gray"
                                    >
                                      ID: {product.product_id} | HSN:{" "}
                                      {product.hsn_code} | Stock:{" "}
                                      {product.stock_quantity} | Price: ₹
                                      {product.discount_price}
                                    </Typography>
                                  </Box>
                                </MenuItem>
                              ))}
                            </TextField>
                          </Tooltip>
                        </TableCell>

                        {[
                          "hsn_code",
                          "quantity",
                          "rate",
                          "gst",
                          "discount",
                          "amount",
                          "priceIncludingGst",
                        ].map((field, i) => (
                          <TableCell key={i} sx={{ px: 1 }}>
                            <Tooltip
                              title={row[field]?.toString() || "N/A"}
                              placement="top"
                              arrow
                              enterDelay={300}
                              leaveDelay={200}
                              componentsProps={{
                                tooltip: {
                                  sx: {
                                    backgroundColor: isDark ? "#444" : "#333",
                                    color: "#fff",
                                    fontSize: "0.85rem",
                                    borderRadius: 1,
                                    px: 1.5,
                                    py: 1,
                                    boxShadow: 3,
                                    maxWidth: 240,
                                  },
                                },
                                arrow: {
                                  sx: {
                                    color: isDark ? "#444" : "#333",
                                  },
                                },
                              }}
                            >
                              {field === "quantity" ? (
                                <TextField
                                  fullWidth
                                  label="Qty"
                                  type="number"
                                  value={row.quantity}
                                  inputProps={{ min: 0 }}
                                  onChange={(e) =>
                                    handleProductChange(
                                      index,
                                      "quantity",
                                      e.target.value
                                    )
                                  }
                                  sx={{
                                    "& label.Mui-focused": {
                                      color: primaryColor,
                                    },
                                    "& .MuiInputBase-root": {
                                      backgroundColor: isDark
                                        ? "#2b2b2b"
                                        : "#fff",
                                      color: isDark ? "#b2b3b4" : "gray",
                                    },
                                    "& .MuiOutlinedInput-notchedOutline": {
                                      borderColor: isDark ? "#555" : "#ccc",
                                    },
                                    "&:hover .MuiOutlinedInput-notchedOutline":
                                      {
                                        borderColor: primaryColor,
                                      },
                                    "& .Mui-focused .MuiOutlinedInput-notchedOutline":
                                      {
                                        borderColor: primaryColor,
                                      },
                                    "& .MuiInputLabel-root": {
                                      color: isDark ? "#aaa" : "#555",
                                    },
                                  }}
                                  InputProps={{
                                    endAdornment: (
                                      <Select
                                        value={row.unit}
                                        onChange={(e) =>
                                          handleUnitChange(
                                            index,
                                            e.target.value
                                          )
                                        }
                                        variant="standard"
                                        disableUnderline
                                        sx={{
                                          bgcolor: isDark
                                            ? "#1e1e1e"
                                            : "#f5f5f5",
                                          color: isDark ? "#fff" : "gray",
                                          borderRadius: 1,
                                          px: 1,
                                          "& .MuiSvgIcon-root": {
                                            color: isDark ? "#fff" : "gray",
                                          },
                                        }}
                                        MenuProps={{
                                          PaperProps: {
                                            sx: {
                                              bgcolor: isDark
                                                ? "#2a2a2a"
                                                : "#fff",
                                              color: isDark ? "#fff" : "#000",
                                              boxShadow: isDark
                                                ? "0px 4px 12px rgba(0, 0, 0, 0.5)"
                                                : "0px 4px 12px rgba(0, 0, 0, 0.1)",
                                            },
                                          },
                                        }}
                                      >
                                        <MenuItem value="Kg">Kg</MenuItem>
                                        <MenuItem value="Nos">Nos</MenuItem>
                                        <MenuItem value="Litre">Litre</MenuItem>
                                      </Select>
                                    ),
                                  }}
                                />
                              ) : (
                                <TextField
                                  fullWidth
                                  label={
                                    field === "hsn_code"
                                      ? "HSN"
                                      : field === "rate"
                                      ? "Rate"
                                      : field === "gst"
                                      ? "GST %"
                                      : field === "amount"
                                      ? "Amount"
                                      : field === "discount"
                                      ? "Discount %"
                                      : "Total Amount"
                                  }
                                  value={row[field]}
                                  disabled
                                  sx={{
                                    "& .MuiInputBase-root": {
                                      backgroundColor: isDark
                                        ? "#2b2b2b"
                                        : "#f5f5f5",
                                      color: isDark ? "#fff" : "gray",
                                    },
                                    "& .Mui-disabled": {
                                      WebkitTextFillColor: isDark
                                        ? "#b2b3b4"
                                        : "gray",
                                    },
                                    "& .MuiOutlinedInput-notchedOutline": {
                                      borderColor: isDark ? "#555" : "#ccc",
                                    },
                                    "& .MuiInputLabel-root": {
                                      color: isDark ? "#aaa" : "#555",
                                    },
                                  }}
                                />
                              )}
                            </Tooltip>
                          </TableCell>
                        ))}
                        {/* Remove Button */}
                        <TableCell sx={{ textAlign: "center" }}>
                          <IconButton
                            onClick={() => handleRemoveProduct(index)}
                            sx={{
                              color: "#f44336",
                              "&:hover": {
                                color: "#fff",
                                borderColor: "#00acc1",
                                boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                              },
                            }}
                          >
                            <DeleteSweepIcon
                              sx={{ fontSize: "20px", color: primaryColor }}
                            />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}

                    {notification && (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Typography color="error" fontWeight="bold">
                            {notification}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
              <Grid
                sx={{
                  display: "flex",
                  flexDirection: {
                    xs: "column",
                    sm: "row",
                    md: "row",
                    lg: "row",
                  },
                  p: 1,
                  mt: 3,
                  gap: "10px",
                }}
              >
                <Button
                  display="flex"
                  gap={2}
                  mb={2}
                  onClick={addProductRow}
                  sx={{
                    textTransform: "none",
                    gap: "8px",
                    color: primaryColor,
                    border: `2px solid ${primaryColor}`,
                    borderRadius: "10px",
                    backgroundColor: "transparent",
                    transition: "all 0.3s ease-in-out",
                    "&:hover": {
                      borderColor: primaryColor,
                      boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                    },
                  }}
                >
                  <AddLinkOutlinedIcon sx={{ fontSize: "24px" }} />
                  <Typography sx={{ fontWeight: "bold" }}>
                    Add Products
                  </Typography>
                </Button>

                <Button
                  display="flex"
                  gap={2}
                  mb={2}
                  onClick={() => setSelectModalOpen(true)}
                  sx={{
                    gap: "8px",
                    textTransform: "none",
                    color: primaryColor,
                    border: `2px solid ${primaryColor}`,
                    borderRadius: "10px",
                    backgroundColor: "transparent",
                    transition: "all 0.3s ease-in-out",
                    "&:hover": {
                      borderColor: primaryColor,
                      boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                    },
                  }}
                >
                  <PublishedWithChangesOutlinedIcon sx={{ fontSize: "20px" }} />
                  <Typography sx={{ fontWeight: "bold" }}>
                    Select Products
                  </Typography>
                </Button>
              </Grid>
            </Box>
          </AnimatedBox>



{subscriptionType === "bill" && (
  <AnimatedBox
    component={Paper}
    layout
    transition={{ duration: 0.4 }}
    sx={{
      p: { xs: 2, sm: 3 },
      mb: 4,
      border: `1px solid ${isDark ? "#333" : "#ddd"}`,
      borderRadius: 1,
      backgroundColor: isDark ? "#0c0c0c" : "#f9f9f9",
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        p: 1,
        borderRadius: 1,
      }}
    >
      <Typography
        variant="h6"
        sx={{
          color: primaryColor,
          fontWeight: 600,
          fontSize: { xs: "1rem", sm: "1.25rem" },
        }}
      >
        Customer Details
      </Typography>
    </Box>

    <Grid container spacing={2} mt={1} ml={1}>
      {[
        ["Customer Name", "name"],
        ["Mobile Number", "mobile"],
        ["Bill Number", "bill_no"],
      ].map(([label, key]) => (
        <Grid key={key} item xs={12} sm={6} md={4} sx={{ px: { xs: 0, sm: 1 } }}>
          {/* Custom top label */}
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              mb: 0.5,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: isDark ? "#efeded" : "#6a6969",
            }}
          >
            {label}
            <Typography component="span" color="error" sx={{ fontSize: "1.2rem" }}>
              *
            </Typography>
          </Typography>

          <TextField
            fullWidth
            required={key !== "bill_no"}
            value={customer[key]}
            onChange={(e) =>
              setCustomer((prev) => ({ ...prev, [key]: e.target.value }))
            }
            InputProps={key === "bill_no" ? { readOnly: true } : {}}
            placeholder={key === "bill_no" ? "Auto-generated 8-character alphanumeric" : label}
            InputLabelProps={{
              shrink: false, // prevents label from floating above
            }}
            variant="outlined"
            sx={{
              "& .MuiInputBase-root": {
                backgroundColor: isDark ? "#2b2b2b" : "#fff",
                color: isDark ? "#fff" : "#000",
                borderRadius: 1,
                width: '100%',
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: isDark ? "#555" : "#ccc",
              },
              "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: primaryColor,
              },
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: primaryColor,
              },
              "& input": { color: isDark ? "#fff" : "#000" },
            }}
          />
        </Grid>
      ))}
    </Grid>
  </AnimatedBox>
)}



          {/* GST, Discount, Transport */}
          {/* GST, Discount, Transport, Payment Info */}
          <AnimatedBox
            component={Paper}
            layout
            transition={{ duration: 0.4 }}
            sx={{
              p: { xs: 2, sm: 3 },
              mb: 4,
              backgroundColor: isDark ? "#0c0c0c" : "#f9f9f9",
              border: `1px solid ${isDark ? "#333" : "#ddd"}`,
              borderRadius: 1,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: primaryColor,
                mb: 3,
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontWeight: "bold",
                fontSize: { xs: "1.2rem", sm: "1.25rem" },
              }}
            >
              Other Charges
            </Typography>

            <Grid
              container
              spacing={2}
              sx={{ display: { xs: "grid", sm: "flex" }, flexWrap: "wrap" }}
            >
              {/* GST */}
              <Grid item xs={12} sm={6} md={4}>
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  mb={0.5}
                  sx={{ color: isDark ? "#efeded" : "#6a6969" }}
                >
                  Overall GST % (Optional)
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  placeholder="Enter GST %"
                  value={gst}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                      setGst(val === "" ? "" : parseFloat(val));
                    }
                  }}
                  helperText={`CGST: ${(gst / 2).toFixed(2)}% | SGST: ${(
                    gst / 2
                  ).toFixed(2)}%`}
                  sx={{
                    "& .MuiInputBase-root": {
                      backgroundColor: isDark ? "#2b2b2b" : "#fff",
                      color: isDark ? "#fff" : "#4d4e4d",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: isDark ? "#555" : "#ccc",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: primaryColor,
                    },
                    "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: primaryColor,
                    },
                    "& .MuiFormHelperText-root": {
                      color: isDark ? "#ccc" : "#777",
                    },
                  }}
                />
              </Grid>

              {/* Payment Type (Cash, Card, UPI) */}
              <Grid item xs={12} sm={6} md={4}>
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  mb={0.5}
                  sx={{ color: isDark ? "#efeded" : "#6a6969" }}
                >
                  Payment Type
                </Typography>
                <FormControl fullWidth>
                  <Select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    displayEmpty
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          backgroundColor: isDark ? "#2b2b2b" : "#fff",
                          color: isDark ? "#fff" : "#000",
                          boxShadow: `0 4px 20px ${isDark ? "#000" : "#ccc"}`,
                          border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                        },
                      },
                      MenuListProps: {
                        sx: {
                          paddingY: 0,
                        },
                      },
                    }}
                    sx={{
                      backgroundColor: isDark ? "#2b2b2b" : "#fff",
                      color: isDark ? "#fff" : "#4d4e4d",
                      borderRadius: 1,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: isDark ? "#555" : "#ccc",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: primaryColor,
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: primaryColor,
                      },
                      "& .MuiSvgIcon-root": {
                        color: isDark ? "#fff" : "#888",
                      },
                    }}
                  >
                    <MenuItem
                      value="Cash"
                      sx={{
                        backgroundColor: isDark ? "#2b2b2b" : "#fff",
                        color: isDark ? "#fff" : "#000",
                      }}
                    >
                      Cash
                    </MenuItem>
                    <MenuItem
                      value="Card"
                      sx={{
                        backgroundColor: isDark ? "#2b2b2b" : "#fff",
                        color: isDark ? "#fff" : "#000",
                      }}
                    >
                      Card
                    </MenuItem>
                    <MenuItem
                      value="UPI"
                      sx={{
                        backgroundColor: isDark ? "#2b2b2b" : "#fff",
                        color: isDark ? "#fff" : "#000",
                      }}
                    >
                      UPI
                    </MenuItem>
                  </Select>
                  <FormHelperText sx={{ color: isDark ? "#ccc" : "#777" }}>
                    Mode of payment used by customer
                  </FormHelperText>
                </FormControl>
              </Grid>

              {/* Payment Status (Full Payment or Advance) */}
              <Grid item xs={12} sm={6} md={4}>
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  mb={0.5}
                  sx={{ color: isDark ? "#efeded" : "#6a6969" }}
                >
                  Payment Status
                </Typography>
                <FormControl fullWidth>
                  <Select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    displayEmpty
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          backgroundColor: isDark ? "#2b2b2b" : "#fff",
                          color: isDark ? "#fff" : "#000",
                          border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                          boxShadow: `0px 4px 10px ${isDark ? "#000" : "#ccc"}`,
                        },
                      },
                      MenuListProps: {
                        sx: {
                          py: 0,
                        },
                      },
                    }}
                    sx={{
                      backgroundColor: isDark ? "#2b2b2b" : "#fff",
                      color: isDark ? "#fff" : "#4d4e4d",
                      borderRadius: 1,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: isDark ? "#555" : "#ccc",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: primaryColor,
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: primaryColor,
                      },
                      "& .MuiSvgIcon-root": {
                        color: isDark ? "#fff" : "#888",
                      },
                    }}
                  >
                    <MenuItem
                      value="Full Payment"
                      sx={{
                        backgroundColor: isDark ? "#2b2b2b" : "#fff",
                        color: isDark ? "#fff" : "#000",
                        "&:hover": {
                          backgroundColor: isDark ? "#333" : "#eee",
                        },
                      }}
                    >
                      Full Payment
                    </MenuItem>
                    <MenuItem
                      value="Advance"
                      sx={{
                        backgroundColor: isDark ? "#2b2b2b" : "#fff",
                        color: isDark ? "#fff" : "#000",
                        "&:hover": {
                          backgroundColor: isDark ? "#333" : "#eee",
                        },
                      }}
                    >
                      Advance
                    </MenuItem>
                  </Select>
                  <FormHelperText sx={{ color: isDark ? "#ccc" : "#777" }}>
                    Whether full or partial payment is done
                  </FormHelperText>
                </FormControl>
              </Grid>

              {/* Advance Amount */}
              {paymentStatus === "Advance" && (
                <Grid item xs={12} sm={6} md={4}>
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    mb={0.5}
                    sx={{ color: isDark ? "#efeded" : "#6a6969" }}
                  >
                    Advance Amount ₹
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    placeholder="Enter Advance ₹"
                    value={advanceAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                        setAdvanceAmount(val);
                      }
                    }}
                    sx={{
                      "& .MuiInputBase-root": {
                        backgroundColor: isDark ? "#2b2b2b" : "#fff",
                        color: isDark ? "#fff" : "#4d4e4d",
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: isDark ? "#555" : "#ccc",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: primaryColor,
                      },
                      "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: primaryColor,
                      },
                    }}
                  />
                </Grid>
              )}

              {/* Due Date for Advance */}
              {paymentStatus === "Advance" && (
                <Grid item xs={12} sm={6} md={4}>
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    mb={0.5}
                    sx={{ color: isDark ? "#efeded" : "#6a6969" }}
                  >
                    Due Date for Full Payment
                  </Typography>
                  <TextField
                    fullWidth
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    sx={{
                      "& .MuiInputBase-root": {
                        backgroundColor: isDark ? "#2b2b2b" : "#fff",
                        color: isDark ? "#fff" : "#4d4e4d",
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: isDark ? "#555" : "#ccc",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: primaryColor,
                      },
                      "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: primaryColor,
                      },
                    }}
                  />
                </Grid>
              )}

              {/* Transport Charges */}
              <Grid item xs={12} sm={6} md={4}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: { xs: "left", sm: "center" },
                    gap: 2,
                    flexDirection: { xs: "column", sm: "row" },
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={transportChecked}
                        onChange={(e) => setTransportChecked(e.target.checked)}
                        sx={{
                          color: isDark ? "#aaa" : "#555",
                          "&.Mui-checked": { color: primaryColor },
                          alignItems: { xs: "left", sm: "center" },
                          mt: { xs: 0, sm: 2 },
                        }}
                      />
                    }
                    label={
                      <Typography
                        sx={{
                          color: isDark ? "#ccc" : "#444",
                          mt: { xs: 0, sm: 2 },
                        }}
                      >
                        Transport Charges
                      </Typography>
                    }
                  />
                  {transportChecked && (
                    <Box sx={{ flex: 1, ml: { xs: 0, sm: 5 } }}>
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        mb={0.5}
                        sx={{ color: isDark ? "#efeded" : "#6a6969" }}
                      >
                        Transport ₹
                      </Typography>
                      <TextField
                        fullWidth
                        type="number"
                        placeholder="Enter Transport ₹"
                        value={transportCharge}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                            setTransportCharge(val);
                          }
                        }}
                        sx={{
                          "& .MuiInputBase-root": {
                            backgroundColor: isDark ? "#2b2b2b" : "#fff",
                            color: isDark ? "#fff" : "#4d4e4d",
                          },
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: isDark ? "#555" : "#ccc",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: primaryColor,
                          },
                          "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: primaryColor,
                          },
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </Grid>

              {/* Discount */}
              <Grid item xs={12} sm={6} md={4}>
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  mb={0.5}
                  sx={{ color: isDark ? "#efeded" : "#6a6969" }}
                >
                  Discount
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  placeholder="Enter discount"
                  value={discount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                      setDiscount(val);
                    }
                  }}
                  helperText={`Type: ${discountType} → ₹${discountValue.toFixed(
                    2
                  )}`}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Select
                          value={discountType}
                          onChange={(e) => setDiscountType(e.target.value)}
                          variant="standard"
                          disableUnderline
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                backgroundColor: isDark ? "#1e1e1e" : "#fff",
                                color: isDark ? "#fff" : "#888",
                                border: `1px solid ${isDark ? "#333" : "#ccc"}`,
                                boxShadow: `0px 4px 12px ${
                                  isDark ? "#000" : "#aaa"
                                }`,
                              },
                            },
                            MenuListProps: {
                              sx: {
                                py: 0,
                              },
                            },
                          }}
                          sx={{
                            bgcolor: isDark ? "#1e1e1e" : "#f5f5f5",
                            color: isDark ? "#fff" : "#000",
                            borderRadius: 1,
                            px: 1.2,
                            py: 0.8,
                            fontWeight: "bold",
                            "& .MuiSvgIcon-root": {
                              color: isDark ? "#fff" : "#888",
                            },
                          }}
                        >
                          <MenuItem
                            value="%"
                            sx={{
                              backgroundColor: isDark ? "#1e1e1e" : "#fff",
                              color: isDark ? "#fff" : "#000",
                              "&:hover": {
                                backgroundColor: isDark ? "#2c2c2c" : "#eee",
                              },
                            }}
                          >
                            %
                          </MenuItem>
                          <MenuItem
                            value="₹"
                            sx={{
                              backgroundColor: isDark ? "#1e1e1e" : "#fff",
                              color: isDark ? "#fff" : "#000",
                              "&:hover": {
                                backgroundColor: isDark ? "#2c2c2c" : "#eee",
                              },
                            }}
                          >
                            ₹
                          </MenuItem>
                        </Select>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiInputBase-root": {
                      backgroundColor: isDark ? "#2b2b2b" : "#fff",
                      color: isDark ? "#fff" : "#4d4e4d",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: isDark ? "#555" : "#ccc",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: primaryColor,
                    },
                    "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: primaryColor,
                    },
                    "& .MuiFormHelperText-root": {
                      color: isDark ? "#ccc" : "#777",
                    },
                  }}
                />
              </Grid>
            </Grid>
          </AnimatedBox>

          

          {subscriptionType !== "bill" && (
  <>

  {/* Summary Section */}
          <AnimatedBox
            component={Paper}
            elevation={4}
            layout
            transition={{ duration: 0.4 }}
            sx={{
              p: { xs: 2, sm: 4 },
              mb: 4,
              borderRadius: 1,
              backgroundColor: isDark ? "#040404" : "#f9f9f9",
              border: `1px solid ${isDark ? "#333" : "#ddd"}`,
            }}
          >
            <Grid sx={{ display: "flex", gap: "8px" }}>
              {/* <PixOutlinedIcon sx={{color: 'primary.main', mt: '7px'}}/> */}
              <Typography
                variant="h6"
                fontWeight="bold"
                gutterBottom
                sx={{
                  color: primaryColor,
                  fontSize: { xs: "1.2rem", sm: "1.5rem" },
                }}
              >
                Invoice Summary
              </Typography>
            </Grid>

            <Divider sx={{ mb: 3 }} />

            {/* SUMMARY BOX – Includes 8 items + Grand Total */}
            <Box
              sx={{
                borderRadius: "16px",
                border: `1px solid ${primaryColor}`,
                boxShadow: `0 0 18px ${primaryColor}`,
                px: { xs: 2, sm: 4 },
                py: { xs: 3, sm: 4 },
                mb: 2,
                justifyContent: "space-between",
              }}
            >
              {/* Summary Columns: Left & Right */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  justifyContent: "space-between",
                  gap: 4,
                  mb: 3,
                }}
              >
                {/* LEFT COLUMN */}
                <Box sx={{ flex: 1 }}>
                  <Box component="ul" sx={{ listStyle: "none", pl: 0, m: 0 }}>
                    {[
                      {
                        label: "Subtotal (Without GST)",
                        value: `₹${subtotal.toFixed(2)}`,
                      },
                      {
                        label: `Discount (${
                          discountType === "%"
                            ? `${discount || 0}%`
                            : `₹${discount || 0}`
                        })`,
                        value: `₹${discountValue.toFixed(2)}`,
                      },
                      transportChecked && {
                        label: "Transport Charges",
                        value: `₹${transportAmount.toFixed(2)}`,
                      },
                      {
                        label: "Total with Product GST",
                        value: `₹${(
                          totalWithGst -
                          discountValue +
                          transportAmount +
                          gstCost
                        ).toFixed(2)}`,
                      },
                    ]
                      .filter(Boolean)
                      .map((item, idx) => (
                        <Box
                          component="li"
                          key={idx}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            py: 1.4,
                            gap: 4,
                            borderBottom: isDark
                              ? "1px dashed #b2ebf2"
                              : "1px dashed #448244",
                          }}
                        >
                          <Typography
                            fontSize="0.95rem"
                            sx={{
                              flex: 1,
                              color: isDark ? "#9fa4a3" : "#4a4d4a",
                            }}
                          >
                            {item.label}
                          </Typography>
                          <Typography
                            fontWeight={600}
                            fontSize="1rem"
                            sx={{
                              minWidth: "120px",
                              textAlign: "right",
                              color: isDark ? "#fff" : "#4e4f4e",
                            }}
                          >
                            {item.value}
                          </Typography>
                        </Box>
                      ))}
                  </Box>
                </Box>

                {/* RIGHT COLUMN – GST Breakdown */}
                {gst > 0 && (
                  <Box sx={{ flex: 1 }}>
                    <Box component="ul" sx={{ listStyle: "none", pl: 0, m: 0 }}>
                      {[
                        {
                          label: `GST (${gst}%)`,
                          value: `₹${gstCost.toFixed(2)}`,
                        },
                        {
                          label: `CGST (${(gst / 2).toFixed(2)}%)`,
                          value: `₹${cgstCost.toFixed(2)}`,
                        },
                        {
                          label: `SGST (${(gst / 2).toFixed(2)}%)`,
                          value: `₹${sgstCost.toFixed(2)}`,
                        },
                        {
                          label: "Total GST Value",
                          value: `₹${(cgstCost + sgstCost).toFixed(2)}`,
                        },
                      ].map((item, idx) => (
                        <Box
                          component="li"
                          key={idx}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            py: 1.4,
                            gap: 4,
                            borderBottom: isDark
                              ? "1px dashed #b2ebf2"
                              : "1px dashed #448244",
                          }}
                        >
                          <Typography
                            fontSize="0.95rem"
                            sx={{
                              flex: 1,
                              color: isDark ? "#9fa4a3" : "#4a4d4a",
                            }}
                          >
                            {item.label}
                          </Typography>
                          <Typography
                            fontWeight={600}
                            fontSize="1rem"
                            sx={{
                              minWidth: "120px",
                              textAlign: "right",
                              color: isDark ? "#fff" : "#4e4f4e",
                            }}
                          >
                            {item.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>

              {/* PAYMENT INFO SECTION */}
              <Box
                sx={{
                  mt: 3,
                  px: { xs: 2, sm: 4 },
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
                    sx={{ color: primaryColor }}
                  >
                    Payment Details
                  </Typography>

                  <Box component="ul" sx={{ listStyle: "none", pl: 0, m: 0 }}>
                    {[
                      {
                        label: "Payment Type",
                        value: paymentType || "Cash",
                      },
                      {
                        label: "Payment Status",
                        value: paymentStatus || "Pending",
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
                          borderBottom: isDark
                            ? "1px dashed #555"
                            : "1px dashed #aaa",
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
                    sx={{ color: primaryColor }}
                  >
                    Advance & Due Details
                  </Typography>

                  <Box component="ul" sx={{ listStyle: "none", pl: 0, m: 0 }}>
                    {advanceAmount > 0 && (
                      <Box
                        component="li"
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          py: 1,
                          borderBottom: isDark
                            ? "1px dashed #555"
                            : "1px dashed #aaa",
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
                          ₹{parseFloat(advanceAmount).toFixed(2)}
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
                        borderBottom: isDark
                          ? "1px dashed #555"
                          : "1px dashed #aaa",
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
                        {dueDate
                          ? new Date(dueDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "N/A"}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* GRAND TOTAL */}
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  mt: 2,
                  px: { xs: 1, sm: 2 },
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: "bold",
                    color: primaryColor,
                    fontSize: { xs: "1.2rem", sm: "1.6rem" },
                  }}
                >
                  Grand Total:
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: "bold",
                    color: primaryColor,
                    fontSize: { xs: "1.2rem", sm: "1.6rem" },
                  }}
                >
                  ₹{total.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </AnimatedBox>

          
    {/* show invoice date, invoiceNo, GST fields etc. */}
    {/* Customer Info */}
          <AnimatedBox
            component={Paper}
            layout
            transition={{ duration: 0.4 }}
            sx={{
              p: { xs: 2, sm: 3 },
              mb: 4,
              border: `1px solid ${isDark ? "#333" : "#ddd"}`,
              borderRadius: 1,
              backgroundColor: isDark ? "#0c0c0c" : "#f9f9f9",
            }}
          >
            <Box
              onClick={() => setShowCustomer(!showCustomer)}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexDirection: { xs: "row", sm: "row" },
                cursor: "pointer", // Shows pointer on hover for whole area
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.04)", // Optional hover effect
                },
                p: 1,
                borderRadius: 1,
              }}
            >
              <Box
                display="flex"
                alignItems="center"
                sx={{ mb: { xs: 2, sm: 0 } }}
              >
                <InfoIcon
                  sx={{
                    mr: 1,
                    color: primaryColor,
                    fontSize: { xs: "28px", sm: "24px" },
                    mt: { xs: "10px", sm: "0px" },
                  }}
                />
                <Typography
                  variant="h6"
                  sx={{
                    color: primaryColor,
                    mt: { xs: "10px", sm: "0px" },
                    fontWeight: 600,
                    fontSize: { xs: "1.2rem", sm: "1.25rem" },
                  }}
                >
                  Customer Information
                </Typography>
              </Box>

              {/* You can keep the IconButton just for visual feedback */}
              <IconButton sx={{ color: primaryColor }} disableRipple>
                {showCustomer ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            <motion.div
              initial={false}
              animate={{
                height: showCustomer ? "auto" : 0,
                opacity: showCustomer ? 1 : 0,
              }}
              style={{ overflow: "hidden" }}
              transition={{ duration: 0.5 }}
            >
              <Grid
                container
                spacing={2}
                mt={1}
                sx={{ display: { xs: "grid", sm: "flex" } }}
              >
                {[
                  ["GST No", "gst"],
                  ["Customer Name", "name"],
                  ["Address", "address"],
                  ["State", "state"],
                  ["Pincode", "pincode"],
                  ["Email", "email"], // ✅ new
                  ["WhatsApp No", "whatsapp_number"], // ✅ new
                  ["Mobile No", "mobile"],
                  ["Place of Supply", "placeOfSupply"],
                  ["Vehicle No", "vehicleNo"],
                  ["Invoice No", "invoiceNo"],
                  ["Date", "date"],
                ].map(([label, key]) => (
                  <Grid
                    key={key}
                    item
                    xs={12}
                    sm={6}
                    md={4}
                    sx={{ px: { xs: 0, sm: 1 } }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        color: isDark ? "#ccc" : "#6a6969",
                        mb: 0.5,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {label}
                      <Typography
                        component="span"
                        color="error"
                        sx={{ fontSize: "1.2rem" }}
                      >
                        *
                      </Typography>
                    </Typography>

                    <TextField
                      fullWidth
                      required
                      name={key}
                      type={key === "date" ? "date" : "text"}
                      InputLabelProps={{ shrink: true }}
                      value={customer[key]}
                      onChange={handleCustomerChange}
                      variant="outlined"
                      placeholder={label}
                      sx={{
                        "& .MuiInputBase-root": {
                          backgroundColor: isDark ? "#2b2b2b" : "#ffffff",
                          color: isDark ? "#fff" : "#000",
                          borderRadius: 0.5,
                        },
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: isDark ? "#555" : "#ccc",
                        },
                        "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                          {
                            borderColor: primaryColor,
                          },
                        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                          {
                            borderColor: primaryColor,
                          },
                        "& input": {
                          color: isDark ? "#fff" : "#000",
                        },
                        ...(key === "date" && {
                          '& input[type="date"]::-webkit-calendar-picker-indicator':
                            {
                              filter: isDark
                                ? "invert(46%) sepia(95%) saturate(604%) hue-rotate(148deg) brightness(95%) contrast(88%)"
                                : "invert(34%) sepia(84%) saturate(1146%) hue-rotate(72deg) brightness(92%) contrast(90%)",
                              cursor: "pointer",
                            },
                          '& input[type="date"]': {
                            accentColor: primaryColor,
                          },
                        }),
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </motion.div>
          </AnimatedBox>
  </>
)}


          

          <Dialog
            open={confirmClearOpen}
            onClose={() => setConfirmClearOpen(false)}
            maxWidth="xs"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 1,
                px: 1,
                py: 1,
                border: `1px solid ${primaryColor}`,
                bgcolor: isDark ? "#000" : "#fff",
                color: isDark ? "#eee" : "#333",
                boxShadow: `0 0 10px ${primaryColor}`,
              },
            }}
          >
            <DialogTitle
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontWeight: "bold",
                fontSize: "1.2rem",
                color: isDark ? "#ff7777" : "#c62828",
              }}
            >
              <WarningAmberIcon
                sx={{ color: isDark ? "#ff8888" : "#f44336" }}
              />
              Clear All Drafts?
            </DialogTitle>

            <DialogContent>
              <Typography
                variant="body2"
                sx={{ mt: 1, mb: 2, fontSize: "0.95rem" }}
              >
                Are you sure you want to delete{" "}
                <strong>all saved drafts</strong>? This action cannot be undone.
              </Typography>
              <DialogActions sx={{ justifyContent: "flex-end", px: 0 }}>
                <Button
                  onClick={() => {
                    const allKeys = Object.keys(localStorage).filter((key) =>
                      key.startsWith("draft_")
                    );
                    allKeys.forEach((key) => localStorage.removeItem(key));
                    setSnackbarMessage("All drafts deleted");
                    setSnackbarSeverity("info");
                    setSnackbarOpen(true);
                    setConfirmClearOpen(false);
                    setDraftModalOpen(false);
                  }}
                  variant="outlined"
                  color="error"
                  sx={{
                    textTransform: "none",
                    borderRadius: 2,
                    px: 2.5,
                    py: 1,
                    fontWeight: "bold",
                  }}
                >
                  Yes, Clear All
                </Button>
                <Button
                  onClick={() => setConfirmClearOpen(false)}
                  variant="outlined"
                  sx={{
                    textTransform: "none",
                    borderRadius: 2,
                    px: 2.5,
                    py: 1,
                    borderColor: isDark ? "#777" : "#ccc",
                    color: isDark ? "#ddd" : "#444",
                    "&:hover": {
                      borderColor: isDark ? "#aaa" : "#888",
                    },
                  }}
                >
                  Cancel
                </Button>
              </DialogActions>
            </DialogContent>
          </Dialog>

          <Snackbar
            open={snackbarOpen}
            autoHideDuration={5000}
            onClose={() => setSnackbarOpen(false)}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            sx={{
              "&.MuiSnackbar-anchorOriginTopRight": {
                top: "60px",
              },
            }}
          >
            <Alert
              onClose={() => setSnackbarOpen(false)}
              severity={snackbarSeverity}
              sx={{ width: "100%" }}
            >
              {snackbarMessage}
            </Alert>
          </Snackbar>

          <Grid
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: "10px",
              p: 0,
              textAlign: { xs: "center", sm: "right" },
              justifyContent: "flex-end",
            }}
          >
            <Button
              display="flex"
              gap={2}
              mb={2}
              onClick={() => setPreviewOpen(true)}
              sx={{
                textTransform: "none",
                gap: "8px",
                mt: "10px",
                color: primaryColor,
                border: `2px solid ${primaryColor}`,
                borderRadius: "10px",
                backgroundColor: isDark ? "black" : "white",
                transition: "all 0.3s ease-in-out",
                "&:hover": {
                  borderColor: primaryColor,
                  boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                },
              }}
            >
              <CrisisAlertOutlinedIcon
                sx={{ fontSize: "24px", fontWeight: "bold" }}
              />
              <Typography sx={{ fontWeight: "bold" }}>
                Preview Invoice
              </Typography>
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                mt: "10px",
                textTransform: "none",
                color: primaryColor,
                border: `2px solid ${primaryColor}`,
                borderRadius: "10px",
                backgroundColor: isDark ? "black" : "white",
                transition: "all 0.3s ease-in-out",
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? "not-allowed" : "pointer",
                "&:hover": {
                  borderColor: primaryColor,
                  boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                },
              }}
            >
              <GeneratingTokensIcon
                sx={{ fontSize: "20px", fontWeight: "bold" }}
              />
              <Typography sx={{ fontWeight: "bold" }}>
                Generate Invoice
              </Typography>

              {isLoading && (
                <CircularProgress
                  size={20}
                  thickness={4}
                  sx={{ color: primaryColor, ml: 1 }}
                />
              )}
            </Button>
          </Grid>
        </Container>
      </ThemeProvider>
      <InvoicePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onSubmit={handleSubmit} // <-- Added submit handler from parent
        paymentType={paymentType}
        paymentStatus={paymentStatus}
        dueDate={dueDate}
        advanceAmount={advanceAmount}
        summaryData={{
          subtotal, // Subtotal before GST
          totalWithGst, // Total including product GST
          gst, // GST percentage
          gstCost, // Total GST amount
          cgstCost, // CGST value
          sgstCost, // SGST value
          discount, // Discount input value
          discountValue, // Calculated discount amount
          discountType, // '%' or '₹'
          transportAmount, // Transport charges
          transportChecked, // Boolean for transport toggle
          total, // Final Grand Total
        }}
        customer={customer}
        products={products}
      />
      <SelectProductsModal
        open={selectModalOpen}
        onClose={() => setSelectModalOpen(false)}
        onAddProducts={handleAddSelectedProducts}
        selectedProducts={selectedProducts}
        productList={productList}
        setSelectedProducts={setSelectedProducts}
        onConfirm={handleAddSelectedProducts}
        key={theme.palette.mode}
      />
      <DraftSelectorDialog
        open={draftModalOpen}
        onClose={() => setDraftModalOpen(false)}
        onSelectDraft={handleSelectDraft}
        onDeleteDraft={handleDeleteSpecificDraft}
        onClearDrafts={() => setConfirmClearOpen(true)}
      />
    </>
  );
}
