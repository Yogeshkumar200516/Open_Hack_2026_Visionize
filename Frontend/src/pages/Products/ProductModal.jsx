import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  useTheme,
  useMediaQuery,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import API_BASE_URL from "../../Context/Api";
import Barcode from "react-barcode";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import LocalPrintshopIcon from "@mui/icons-material/LocalPrintshop";

const ProductModal = ({ open, handleClose, handleSave, mode, initialData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const primaryColor = theme.palette.primary.main;
  const isDark = theme.palette.mode === "dark";

  const barcodeRef = useRef();

  const blankProduct = {
    product_name: "",
    description: "",
    category_id: "",
    price: "",
    stock_quantity: "",
    image_url: "",
    gst: 0,
    c_gst: 0,
    s_gst: 0,
    hsn_code: "",
    discount: 0,
    barcode: "",
  };

  const [categories, setCategories] = useState([]);
  const [productData, setProductData] = useState({ ...blankProduct });
  const [initialStock, setInitialStock] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const authToken = localStorage.getItem("authToken") || "";
  const userData = localStorage.getItem("user");
  const username = userData ? JSON.parse(userData).username : "unknown";

  useEffect(() => {
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/products/categories`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error loading categories:", err.response?.data || err.message);
      setSnack({
        open: true,
        message: "Failed to load categories",
        severity: "error",
      });
    }
  };

  // ✅ Fetch categories every time the modal opens
  if (authToken && open) {
    fetchCategories();
  }
}, [authToken, open, setSnack]);



  

  // ✅ Reset or pre-fill form when modal opens
  useEffect(() => {
    if (!open) {
      setProductData({ ...blankProduct });
      setInitialStock(null);
      setIsSubmitting(false);
      return;
    }

    if (mode === "edit" && initialData) {
      const parsedGST = parseFloat(initialData.gst) || 0;
      const halfGST = parseFloat((parsedGST / 2).toFixed(2));

      setProductData({
        product_name: initialData.product_name || "",
        description: initialData.description || "",
        category_id: parseInt(initialData.category_id, 10) || "",
        price: initialData.price ?? "",
        stock_quantity: initialData.stock_quantity ?? "",
        image_url: initialData.image_url || "",
        gst: parsedGST,
        c_gst: initialData.c_gst ?? halfGST,
        s_gst: initialData.s_gst ?? halfGST,
        hsn_code: initialData.hsn_code || "",
        discount: parseFloat(initialData.discount) || 0,
        barcode: initialData.barcode || "",
        product_id: initialData.product_id || initialData.id || undefined,
      });

      setInitialStock(initialData.stock_quantity);
    } else {
      setProductData({ ...blankProduct });
      setInitialStock(null);
    }
  }, [open, mode, initialData]);

  const handleChange = (e) => {
  const { name, value, type } = e.target;
  let val = value;

  if (type === "number") {
    val = value === "" ? "" : Number(value);
  }

  if (name === "gst") {
    const gstVal = value === "" ? "" : parseFloat(val);
    const sanitizedGstVal = isNaN(gstVal) ? "" : gstVal;
    const halfGST = sanitizedGstVal !== "" ? parseFloat((sanitizedGstVal / 2).toFixed(2)) : "";

    setProductData((prev) => ({
      ...prev,
      gst: sanitizedGstVal,
      c_gst: halfGST,
      s_gst: halfGST,
    }));
  } else if (name === "category_id") {
    setProductData((prev) => ({
      ...prev,
      category_id: val === "" ? "" : parseInt(val, 10),
    }));
  } else if (name === "hsn_code") {
    setProductData((prev) => ({
      ...prev,
      hsn_code: value ?? "",
    }));
  } else {
    setProductData((prev) => ({
      ...prev,
      [name]: val,
    }));
  }
};


  // Image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/products/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${authToken}`,
        },
      });

      setProductData((prev) => ({ ...prev, image_url: res.data.imagePath }));
      setSnack({ open: true, message: "Image uploaded.", severity: "success" });
    } catch (err) {
      console.error("Image upload failed:", err);
      setSnack({ open: true, message: "Image upload failed.", severity: "error" });
    }
  };

  // Generate random 10-character barcode (A-Z,0-9)
  const generateBarcode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let barcode = "";
    for (let i = 0; i < 10; i++) {
      barcode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return barcode;
  };

  const handleSubmit = async () => {
  const {
    product_name,
    price,
    stock_quantity,
    category_id,
    gst,
    hsn_code,
    product_id,
    discount,
    barcode,
  } = productData;

  const priceNum = parseFloat(price);
  const stockNum = parseInt(stock_quantity, 10);

  const rawHSN = hsn_code ?? "";
  const trimmedHSN = rawHSN.trim();
  const cleanedHSN = trimmedHSN.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // 1. Product Name
  if (!product_name?.trim()) {
    setSnack({ open: true, message: "Please enter product name.", severity: "error" });
    return;
  }

  // 2. Category
  if (!category_id) {
    setSnack({ open: true, message: "Please select a category.", severity: "error" });
    return;
  }

  // 3. Price
  if (price === "" || isNaN(priceNum)) {
    setSnack({ open: true, message: "Please enter product price.", severity: "error" });
    return;
  }
  if (priceNum < 0) {
    setSnack({ open: true, message: "Price cannot be negative.", severity: "error" });
    return;
  }

  // 4. Stock Quantity
  if (stock_quantity === "" || isNaN(stockNum)) {
    setSnack({ open: true, message: "Please enter stock quantity.", severity: "error" });
    return;
  }
  if (stockNum < 0) {
    setSnack({ open: true, message: "Stock quantity cannot be negative.", severity: "error" });
    return;
  }

  // 5. HSN Code
  if (!cleanedHSN) {
    setSnack({ open: true, message: "Please enter HSN code.", severity: "error" });
    return;
  }
  if (cleanedHSN.length < 4) {
    setSnack({ open: true, message: "HSN code must be at least 4 characters.", severity: "error" });
    return;
  }

  const sanitizedGST = parseFloat(gst) || 0;
  const cGST = parseFloat((sanitizedGST / 2).toFixed(2));
  const sGST = cGST;

  const payload = {
    product_name: product_name.trim(),
    description: productData.description?.trim() || "",
    category_id: Number(category_id),
    price: priceNum,
    stock_quantity: stockNum,
    gst: sanitizedGST,
    c_gst: cGST,
    s_gst: sGST,
    discount: parseFloat(discount) || 0,
    hsn_code: cleanedHSN,
    barcode: (barcode && String(barcode).trim()) || generateBarcode(),
    image_url: productData.image_url || "",
    updated_by: username,
    product_id,
  };

  setIsSubmitting(true);

  try {
    await handleSave(payload);  // This calls handleSaveProduct in parent
    handleClose();             // Close modal on success
  } catch (error) {
    console.error("Error saving product:", error.response?.data || error.message);
    const serverMessage =
      error.response?.data?.error || error.response?.data?.message || error.message;
    setSnack({
      open: true,
      message: `Failed to save product: ${serverMessage}`,
      severity: "error",
    });
  } finally {
    setIsSubmitting(false);
  }
};


  // Barcode download
  const handleDownloadBarcode = () => {
    const svgElement = barcodeRef.current?.querySelector("svg");
    if (!svgElement) {
      setSnack({ open: true, message: "Barcode not available.", severity: "warning" });
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = `${productData.product_name || "product"}_barcode.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  };

  // Barcode print
  const handlePrintBarcode = () => {
    const printContents = barcodeRef.current?.innerHTML;
    if (!printContents) {
      setSnack({ open: true, message: "No barcode to print.", severity: "warning" });
      return;
    }
    const printWindow = window.open("", "", "width=400,height=200");
    printWindow.document.write(`
      <html>
        <head><title>Print Barcode</title></head>
        <body style="display:flex; justify-content:center; align-items:center; margin:0;">
          ${printContents}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function () { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: isMobile ? "95%" : "90%",
    maxWidth: 500,
    maxHeight: "90vh",
    bgcolor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    borderRadius: "20px",
    boxShadow: `0 0 20px ${primaryColor}`,
    display: "flex",
    flexDirection: "column",
  };

  return (
    <>
      <Modal
        open={open}
        onClose={(event, reason) => {
          if (reason !== "backdropClick") {
            handleClose();
          }
        }}
        disableEscapeKeyDown
      >
        <Box sx={modalStyle}>
          {/* Header */}
          <Box
            sx={{
              p: 2,
              borderBottom: `1px solid ${isDark ? "#444" : "#ccc"}`,
              display: "flex",
              borderTopLeftRadius: "20px",
              borderTopRightRadius: "20px",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: primaryColor,
              position: "sticky",
              top: 0,
              zIndex: 2,
            }}
          >
            <Typography variant="h6" fontWeight={600} color="white">
              {mode === "edit" ? "Edit Product" : "Add New Product"}
            </Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon sx={{ color: "#fff" }} />
            </IconButton>
          </Box>

          {/* Body - Scrollable */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              px: 4,
              py: 2,
              "&::-webkit-scrollbar": { width: "6px" },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: isDark ? "#555" : "#ccc",
                borderRadius: "4px",
              },
            }}
          >
           {[
  { label: "Product Name", name: "product_name", required: true },
  { label: "Description", name: "description", multiline: true, rows: 2 },
  { label: "HSN Code", name: "hsn_code", required: true },
].map(({ label, name, ...rest }) => (
  <TextField
    key={name}
    label={label}
    name={name}
    fullWidth
    margin="dense"
    variant="filled"
    value={productData[name] ?? ""}  // Always use empty string fallback
    onChange={handleChange}
    required={rest.required}
    multiline={rest.multiline}
    rows={rest.rows}
    InputProps={{
      style: {
        backgroundColor: isDark ? "#1e1e1e" : "#f0f0f0",
        color: isDark ? "#fff" : "#000",
      },
    }}
    InputLabelProps={{
      style: {
        color: isDark ? "#aaa" : "#555",
      },
    }}
  />
))}

           <TextField
  label="Category"
  name="category_id"
  fullWidth
  select
  margin="dense"
  value={productData.category_id || ""} // defaults to empty string if undefined
  onChange={handleChange}
  variant="filled"
  InputProps={{
    style: {
      backgroundColor: isDark ? "#1e1e1e" : "#f0f0f0",
      color: isDark ? "#fff" : "#000",
    },
  }}
  InputLabelProps={{ style: { color: isDark ? "#aaa" : "#555" } }}
>
  {categories.length === 0 ? (
    <MenuItem disabled>No categories available</MenuItem>
  ) : (
    categories.map((category) => (
      <MenuItem
        key={category.category_id}
        value={category.category_id}
        disabled={!category.is_active}
      >
        {category.category_name} {!category.is_active && "(Inactive)"}
      </MenuItem>
    ))
  )}
</TextField>



            {[
              { label: "Price (₹)", name: "price" },
              { label: "Stock Quantity", name: "stock_quantity" },
              { label: "GST %", name: "gst" },
            ].map(({ label, name }) => (
              <TextField
                key={name}
                label={label}
                name={name}
                fullWidth
                type="number"
                required
                margin="dense"
                value={productData[name]}
                onChange={handleChange}
                variant="filled"
                InputProps={{
                  style: {
                    backgroundColor: isDark ? "#1e1e1e" : "#f0f0f0",
                    color: isDark ? "#fff" : "#000",
                  },
                }}
                InputLabelProps={{ style: { color: isDark ? "#aaa" : "#555" } }}
              />
            ))}

            <TextField
              label="CGST %"
              name="c_gst"
              fullWidth
              type="number"
              margin="dense"
              value={productData.c_gst}
              variant="filled"
              disabled
              InputProps={{
                style: {
                  backgroundColor: isDark ? "#2b2b2b" : "#e0e0e0",
                  color: "#888",
                },
              }}
              InputLabelProps={{ style: { color: "#888" } }}
            />

            <TextField
              label="SGST %"
              name="s_gst"
              fullWidth
              type="number"
              margin="dense"
              value={productData.s_gst}
              variant="filled"
              disabled
              InputProps={{
                style: {
                  backgroundColor: isDark ? "#2b2b2b" : "#e0e0e0",
                  color: "#888",
                },
              }}
              InputLabelProps={{ style: { color: "#888" } }}
            />

            <TextField
              label="Discount (%)"
              name="discount"
              fullWidth
              type="number"
              margin="dense"
              value={productData.discount}
              onChange={handleChange}
              variant="filled"
              inputProps={{ min: 0, max: 100, step: "0.01" }}
              InputProps={{
                style: {
                  backgroundColor: isDark ? "#1e1e1e" : "#f0f0f0",
                  color: isDark ? "#fff" : "#000",
                },
              }}
              InputLabelProps={{ style: { color: isDark ? "#aaa" : "#555" } }}
            />

            <Box
              mt={3}
              p={2}
              border={`1px solid ${primaryColor}`}
              borderRadius="10px"
              boxShadow={
                isDark ? `0 0 10px ${primaryColor}` : `0 0 6px ${primaryColor}55`
              }
              bgcolor={isDark ? "#1e1e1e" : "#f9f9f9"}
            >
              <TextField
                label="Upload Image"
                name="image_url"
                fullWidth
                margin="dense"
                value={productData.image_url}
                variant="filled"
                disabled
                InputProps={{
                  endAdornment: (
                    <Button
                      variant="contained"
                      component="label"
                      sx={{
                        ml: 1,
                        textTransform: "none",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        backgroundColor: primaryColor,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        "&:hover": {
                          backgroundColor: isDark ? "#0097a7" : "#0d8f5e",
                        },
                      }}
                    >
                      <CloudUploadOutlinedIcon fontSize="small" />
                      Upload
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </Button>
                  ),
                  style: {
                    backgroundColor: isDark ? "#2b2b2b" : "#e0e0e0",
                    color: "#888",
                    paddingRight: "8px",
                  },
                }}
                InputLabelProps={{ style: { color: "#888" } }}
              />
            </Box>

            {productData.image_url && (
              <Box mt={2} textAlign="center">
                <img
                  src={`${API_BASE_URL}/${productData.image_url}`}
                  alt="Preview"
                  style={{
                    maxHeight: "150px",
                    borderRadius: "10px",
                    border: `1px solid ${primaryColor}`,
                  }}
                />
              </Box>
            )}

            {mode === "edit" && productData.barcode && (
              <Box mt={2} textAlign="center">
                <Typography variant="subtitle2" gutterBottom>
                  Product Barcode
                </Typography>

                <div ref={barcodeRef}>
                  <Barcode
                    value={productData.barcode}
                    width={2}
                    height={80}
                    fontSize={14}
                    displayValue
                    background="#fff"
                  />
                </div>

                <Box sx={{ display: "flex", justifyContent: "center", mt: 2, flexDirection: { xs: "column", sm: "row" }, gap: "10px" }}>
                  <Button
                    startIcon={<CloudDownloadIcon />}
                    variant="outlined"
                    sx={{ textTransform: "none", borderRadius: 4 }}
                    onClick={handleDownloadBarcode}
                  >
                    Download Barcode
                  </Button>
                  <Button
                    startIcon={<LocalPrintshopIcon />}
                    variant="outlined"
                    sx={{ textTransform: "none", borderRadius: 4 }}
                    onClick={handlePrintBarcode}
                  >
                    Print Barcode
                  </Button>
                </Box>
              </Box>
            )}
          </Box>

          {/* Footer */}
          <Box
            sx={{
              p: 2,
              borderTop: `1px solid ${isDark ? "#444" : "#ccc"}`,
              textAlign: "center",
              backgroundColor: isDark ? "#121212" : "#f5f5f5",
              borderBottomLeftRadius: "20px",
              borderBottomRightRadius: "20px",
            }}
          >
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={isSubmitting}
              sx={{
                backgroundColor: "transparent",
                color: primaryColor,
                border: `1px solid ${primaryColor}`,
                fontWeight: "bold",
                px: 4,
                py: 1,
                textTransform: "none",
                borderRadius: "8px",
                "&:hover": {
                  boxShadow: `0 0 8px ${primaryColor}, 0 0 6px ${primaryColor}`,
                  backgroundColor: primaryColor,
                  color: "#fff",
                },
              }}
            >
              {isSubmitting ? "Saving..." : "Save Product"}
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Local snackbar to show validation/server messages (no alert boxes) */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          elevation={6}
          variant="filled"
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ProductModal;
