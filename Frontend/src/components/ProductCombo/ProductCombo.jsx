// src/components/ProductCombo/ProductCombo.jsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Paper,
  alpha,
  useTheme,
} from "@mui/material";

import {
  Add as AddIcon,
  Inventory2Outlined as InvIcon,
} from "@mui/icons-material";

import API_BASE_URL from "../../Context/Api";

const ProductComboBox = ({
  value,
  onChange,
  label = "Product",
  size = "small",
  required = false,
  error = false,
  helperText = "",
  disabled = false,
  placeholder = "Search or type product name…",
}) => {

  const theme = useTheme();
  const primary = theme.palette.primary.main;

  const token = localStorage.getItem("authToken");

  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value?.product_name || "");

  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  /* ───────────────── Thin Scrollbar Style ───────────────── */

  const scrollbarStyle = {
    "&::-webkit-scrollbar": {
      width: 5,
      height: 5,
    },
    "&::-webkit-scrollbar-thumb": {
      background: alpha(primary, 0.5),
      borderRadius: 10,
    },
    "&::-webkit-scrollbar-thumb:hover": {
      background: primary,
    },
    "&::-webkit-scrollbar-track": {
      background: alpha(primary, 0.08),
    },
  };

  /* ───────────────── Fetch Products ───────────────── */

  const fetchProducts = useCallback(
    (query = "") => {
      if (abortRef.current) abortRef.current.abort();

      abortRef.current = new AbortController();

      setLoading(true);

      fetch(
        `${API_BASE_URL}/api/purchase-requests/products/search?q=${encodeURIComponent(
          query
        )}&limit=50`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortRef.current.signal,
        }
      )
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((d) => setOptions(Array.isArray(d.products) ? d.products : []))
        .catch((err) => {
          if (err.name !== "AbortError") {
            console.error("ProductComboBox fetch error:", err);
            setOptions([]);
          }
        })
        .finally(() => setLoading(false));
    },
    [token]
  );

  /* ───────────────── Load Initial ───────────────── */

  useEffect(() => {
    fetchProducts("");
  }, [fetchProducts]);

  /* ───────────────── Sync Value ───────────────── */

  useEffect(() => {
    setInputValue(value?.product_name || "");
  }, [value?.product_name]);

  /* ───────────────── Input Change ───────────────── */

  const handleInputChange = (_, newVal, reason) => {
    setInputValue(newVal);

    if (reason === "input") {
      clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        fetchProducts(newVal);
      }, 280);
    }
  };

  /* ───────────────── Option Builder ───────────────── */

  const allOptions = (() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return options;

    const exactMatch = options.some(
      (o) => o.product_name.toLowerCase() === trimmed.toLowerCase()
    );

    return exactMatch
      ? options
      : [{ _isNew: true, product_id: null, product_name: trimmed }, ...options];
  })();

  /* ───────────────── On Change ───────────────── */

  const handleChange = (_, selected) => {

    if (!selected) {
      onChange(null);
      return;
    }

    if (typeof selected === "string") {
      onChange({
        product_id: null,
        product_name: selected.trim(),
        hsn_code: "",
        gst_percentage: 0,
        price: 0,
        _isNew: true,
      });
      return;
    }

    if (selected._isNew) {
      onChange({
        product_id: null,
        product_name: selected.product_name,
        hsn_code: "",
        gst_percentage: 0,
        price: 0,
        _isNew: true,
      });
      return;
    }

    onChange({
      product_id: selected.product_id,
      product_name: selected.product_name,
      hsn_code: selected.hsn_code || "",
      gst_percentage: selected.gst ?? selected.gst_percentage ?? 0,
      price: selected.price ?? selected.selling_price ?? 0,
      stock_quantity: selected.stock_quantity ?? null,
      _isNew: false,
    });
  };

  /* ───────────────── Selected Option ───────────────── */

  const selectedOption = (() => {
    if (!value?.product_name) return null;

    if (value.product_id) {
      return (
        options.find((o) => o.product_id === value.product_id) ?? {
          product_id: value.product_id,
          product_name: value.product_name,
        }
      );
    }

    return { _isNew: true, product_id: null, product_name: value.product_name };
  })();

  return (
    <Autocomplete
      size={size}
      disabled={disabled}
      freeSolo
      options={allOptions}
      getOptionLabel={(o) => (typeof o === "string" ? o : o.product_name || "")}
      value={selectedOption}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleChange}
      loading={loading}
      filterOptions={(x) => x}
      noOptionsText="Type to search products"

      /* ───────── Styled Dropdown ───────── */

      PaperComponent={(props) => (
        <Paper
          {...props}
          sx={{
            borderRadius: 2,
            py: 2,
            border: `1px solid ${alpha(primary, 0.25)}`,
            boxShadow: `0 6px 20px ${alpha(primary, 0.2)}`,
            ...scrollbarStyle,
          }}
        />
      )}

      ListboxProps={{
        sx: {
          maxHeight: 300,
          ...scrollbarStyle,
        },
      }}

      /* ───────── Styled Options ───────── */

      renderOption={(props, option) => {
        const { key, ...rest } = props;

        return (
          <li
            key={
              option._isNew
                ? `__new__${option.product_name}`
                : `prod_${option.product_id}`
            }
            {...rest}
            style={{
              padding: "8px 10px",
            }}
          >
            {option._isNew ? (
              <Box sx={{ display: "flex", gap: 1 }}>
                <AddIcon color="primary" fontSize="small" />

                <Box>
                  <Typography fontWeight={700} color="primary.main">
                    Add "{option.product_name}"
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    Will be created after Goods Receipt
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.5,
                  width: "100%",
                }}
              >
                <InvIcon fontSize="small" sx={{ mt: 1 }} />

                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 'bold'}}>
                    {option.product_name}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    {[
                      option.hsn_code ? `HSN: ${option.hsn_code}` : "",
                      option.stock_quantity != null
                        ? `Stock: ${option.stock_quantity}`
                        : "",
                      option.gst ?? option.gst_percentage
                        ? `GST: ${option.gst ?? option.gst_percentage}%`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Typography>
                </Box>

                {option.price != null && (
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="success.main"
                  >
                    ₹{Number(option.price ?? 0).toFixed(2)}
                  </Typography>
                )}
              </Box>
            )}
          </li>
        );
      }}

      /* ───────── Styled Input ───────── */

      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={error}
          helperText={helperText}
          placeholder={placeholder}
          size={size}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              "&:hover fieldset": {
                borderColor: primary,
              },
              "&.Mui-focused fieldset": {
                borderColor: primary,
                borderWidth: 2,
              },
            },
          }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading && <CircularProgress size={14} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

export default ProductComboBox;