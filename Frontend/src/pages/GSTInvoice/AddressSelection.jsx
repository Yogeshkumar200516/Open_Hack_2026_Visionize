import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../Context/Api";
import {
  Button,
  Menu,
  MenuItem,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
  Divider,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";

const BillingAddressDropdown = ({ addresses = [], onSelect, themeMode }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuWidth, setMenuWidth] = useState(null);
  const buttonRef = useRef(null);
  const open = Boolean(anchorEl);

  const [selectedId, setSelectedId] = useState(
    addresses.length > 0 ? addresses[0].billing_address_id : null
  );

  // ✅ Dynamic color palette for dark/light themes
  const isDark = themeMode === "dark";
  const colors = {
    bg: isDark ? "#121212" : "#ffffff",
    text: isDark ? "#e0e0e0" : "#222222",
    subtext: isDark ? "#bdbdbd" : "#555555",
    border: isDark ? "#333333" : "#cccccc",
    hover: isDark ? "#1e1e1e" : "#f5f5f5",
    primary: isDark ? "#00bcd4" : "#136919",
    scrollbarTrack: isDark ? "#1e1e1e" : "#f0f0f0",
    scrollbarThumb: isDark ? "#00bcd4" : "#136919",
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    if (buttonRef.current) {
      const { width } = buttonRef.current.getBoundingClientRect();
      setMenuWidth(width);
    }
  };

  const handleClose = () => setAnchorEl(null);

  const handleSelection = (addressId) => {
    setSelectedId(addressId);
    const selectedAddress = addresses.find(
      (addr) => addr.billing_address_id === addressId
    );
    if (onSelect) onSelect(selectedAddress);
    handleClose();
  };

  const selectedAddress = addresses.find(
    (addr) => addr.billing_address_id === selectedId
  );

  if (!selectedAddress) {
    return (
      <Typography sx={{ color: colors.subtext }}>
        No billing addresses available.
      </Typography>
    );
  }

  return (
    <>
  {/* Dropdown Button */}
  <Button
    ref={buttonRef}
    aria-controls={open ? "billing-address-menu" : undefined}
    aria-haspopup="true"
    aria-expanded={open ? "true" : undefined}
    onClick={handleClick}
    fullWidth
    variant="outlined"
    endIcon={
      <KeyboardArrowDownIcon sx={{ color: colors.primary, fontSize: 28 }} />
    }
    sx={{
      width: "100%",
      justifyContent: "space-between",
      alignItems: "center",
      textAlign: "left",
      padding: isMobile ? 1.2 : 1.8,
      borderRadius: "10px",
      border: `1px solid ${colors.primary}`,
      backgroundColor: colors.bg,
      color: colors.text,
      boxShadow: `0 0 8px ${colors.primary}33`,
      "&:hover": {
        backgroundColor: colors.hover,
        boxShadow: `0 0 10px ${colors.primary}66`,
      },
    }}
  >
    <Box sx={{ width: "90%", overflow: "hidden" }}>
      <Typography
        sx={{
          fontWeight: "bold",
          color: colors.primary,
          fontSize: isMobile ? "0.8rem" : "0.9rem",
          mb: 1,
          whiteSpace: "normal",
                wordWrap: "break-word",
                overflowWrap: "break-word",
        }}
        noWrap
      >
        <LocationOnOutlinedIcon
          sx={{
            fontSize: 20,
            mr: 1,
            color: colors.primary,
            verticalAlign: "middle",
          }}
        />
        {selectedAddress.address_name} — {selectedAddress.address}
      </Typography>

      {/* Info Display – Neatly Structured */}
      <Box
        sx={{
          mt: 0.6,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 0.4,
        }}
      >
        <Typography
          variant="body2"
          sx={{ color: colors.subtext, display: "flex", gap: 0.5 }}
        >
          <strong>GST :</strong> {selectedAddress.gst_no || "-"}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: colors.subtext, display: "flex", gap: 0.5 }}
        >
          <strong>PAN :</strong> {selectedAddress.pan_no || "-"}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: colors.subtext, display: "flex", gap: 0.5 }}
        >
          <strong>Bank :</strong> {selectedAddress.bank_name || "-"}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: colors.subtext, display: "flex", gap: 0.5, textTransform: 'none' }}
        >
          <strong>EMAIL :</strong> {selectedAddress.email || "-"}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: colors.subtext, display: "flex", gap: 0.5 }}
        >
          <strong>Cell :</strong> {selectedAddress.cell_no1 || "-"}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: colors.subtext, display: "flex", gap: 0.5 }}
        >
          <strong>IFSC :</strong> {selectedAddress.ifsc_code || "-"}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: colors.subtext, display: "flex", gap: 0.5 }}
        >
          <strong>Account :</strong> {selectedAddress.account_number || "-"}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: colors.subtext, display: "flex", gap: 0.5 }}
        >
          <strong>Branch :</strong> {selectedAddress.branch_name || "-"}
        </Typography>
      </Box>
    </Box>
  </Button>

  {/* Dropdown Menu */}
  <Menu
    id="billing-address-menu"
    anchorEl={anchorEl}
    open={open}
    onClose={handleClose}
    anchorOrigin={{
      vertical: "bottom",
      horizontal: "left",
    }}
    transformOrigin={{
      vertical: "top",
      horizontal: "left",
    }}
    PaperProps={{
      elevation: 6,
      sx: {
        width: menuWidth || "auto",
        maxHeight: 350,
        maxWidth: "100vw",
        bgcolor: colors.bg,
        border: `1px solid ${colors.border}`,
        boxShadow: `0 0 15px ${colors.primary}55`,
        mt: 1,
        overflowX: "auto",
        overflowY: "auto",
        borderRadius: 0,
        "&::-webkit-scrollbar": {
          width: "6px",
          height: "6px",
        },
        "&::-webkit-scrollbar-track": {
          background: colors.scrollbarTrack,
          borderRadius: "8px",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: colors.scrollbarThumb,
          borderRadius: "8px",
        },
        "&::-webkit-scrollbar-thumb:hover": {
          backgroundColor: `${colors.primary}cc`,
        },
      },
    }}
    MenuListProps={{
      sx: { p: 0, minWidth: "100%" },
    }}
  >
    {addresses.map((address, idx) => (
      <React.Fragment key={address.billing_address_id}>
        <MenuItem
          selected={selectedId === address.billing_address_id}
          onClick={() => handleSelection(address.billing_address_id)}
          sx={{
            flexDirection: "column",
            alignItems: "flex-start",
            py: 1.6,
            px: 2.2,
            gap: 0.4,
            backgroundColor:
              selectedId === address.billing_address_id
                ? `${colors.primary}22`
                : "transparent",
            "&:hover": {
              backgroundColor: colors.hover,
            },
          }}
        >
          <Typography
            sx={{
              fontWeight: "bold",
              color: colors.primary,
              fontSize: "1rem",
              mb: 0.3,
              whiteSpace: "normal",
                wordWrap: "break-word",
                overflowWrap: "break-word",
            }}
          >
            {address.address_name} — {address.address}
          </Typography>

          {/* Structured Info Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 0.3,
              width: "100%",
            }}
          >
            <Typography variant="body2" sx={{ color: colors.subtext }}>
              <strong>GST :</strong> {address.gst_no || "-"}
            </Typography>
            <Typography variant="body2" sx={{ color: colors.subtext }}>
              <strong>PAN :</strong> {address.pan_no || "-"}
            </Typography>
            <Typography variant="body2" sx={{ color: colors.subtext }}>
              <strong>Bank :</strong> {address.bank_name || "-"}
            </Typography>
            <Typography variant="body2" sx={{ color: colors.subtext }}>
              <strong>Email :</strong> {address.email || "-"}
            </Typography>
            <Typography variant="body2" sx={{ color: colors.subtext }}>
              <strong>Cell :</strong> {address.cell_no1 || "-"}
            </Typography>
            <Typography variant="body2" sx={{ color: colors.subtext }}>
              <strong>IFSC :</strong> {address.ifsc_code || "-"}
            </Typography>
            <Typography variant="body2" sx={{ color: colors.subtext }}>
              <strong>Account :</strong> {address.account_number || "-"}
            </Typography>
            <Typography variant="body2" sx={{ color: colors.subtext }}>
              <strong>Branch :</strong> {address.branch_name || "-"}
            </Typography>
          </Box>
        </MenuItem>
        {idx < addresses.length - 1 && (
          <Divider sx={{ borderColor: colors.border }} />
        )}
      </React.Fragment>
    ))}
  </Menu>
</>

  );
};

const BillingAddressPage = ({ companyId, onAddressSelect, themeMode, setInitialSelected }) => {
  const theme = useTheme();
  const [billingAddresses, setBillingAddresses] = useState([]);

   useEffect(() => {
    if (!companyId) return;
    axios
      .get(`${API_BASE_URL}/api/address/${companyId}`)
      .then((res) => {
        const addresses = Array.isArray(res.data) ? res.data : [];
        setBillingAddresses(addresses);

        // ✅ Set initial selected address if not already set
        if (addresses.length > 0 && setInitialSelected) {
          setInitialSelected(addresses[0]); // default to first address
        }
      })
      .catch((err) => {
        console.error("Failed to fetch billing addresses:", err);
        setBillingAddresses([]);
      });
  }, [companyId, setInitialSelected]);

  return (
    <Box
      sx={{
        width: "100%",
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        mt: 2,
      }}
    >
      {billingAddresses.length > 0 ? (
        <BillingAddressDropdown
          addresses={billingAddresses}
          onSelect={onAddressSelect}
          themeMode={themeMode} // ✅ Forwarding theme mode properly
        />
      ) : (
        <Typography
          sx={{
            color: theme.palette.text.secondary,
            textAlign: "center",
            py: 2,
            fontStyle: "italic",
          }}
        >
          No billing addresses found.
        </Typography>
      )}
    </Box>
  );
};

export default BillingAddressPage;
