import React, { useEffect, useState } from "react";
import { Box, useTheme, useMediaQuery } from "@mui/material";
import { styled } from "@mui/material/styles";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PartyMaster from "./PartyMaster";
import BillMaster from "./BillMaster";

// 🔹 Styled container for toggle buttons (UNCHANGED UI)
const StyledToggleContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  width: "100%",
  justifyContent: "space-evenly",
  backgroundColor:
    theme.palette.mode === "dark"
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(0, 0, 0, 0.03)",
  backdropFilter: "blur(8px)",
  borderBottom: `2px solid ${theme.palette.divider}`,
  padding: theme.spacing(1.5, 0),
  transition: "all 0.3s ease-in-out",
}));

// 🔹 Individual toggle buttons (UNCHANGED UI)
const StyledToggleOption = styled(Box)(({ theme, selected }) => ({
  flex: 1,
  textAlign: "center",
  cursor: "pointer",
  position: "relative",
  color: selected ? theme.palette.primary.main : theme.palette.text.secondary,
  fontWeight: selected ? 700 : 500,
  fontSize: "0.95rem",
  letterSpacing: "0.5px",
  padding: "10px 0",
  transition: "all 0.3s ease-in-out",

  "&:hover": {
    color: theme.palette.primary.main,
    background:
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.05)"
        : "rgba(0, 0, 0, 0.02)",
  },

  "&::after": {
    content: '""',
    position: "absolute",
    left: "50%",
    bottom: 0,
    transform: "translateX(-50%)",
    width: selected ? "60%" : "0%",
    height: "3px",
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
    borderRadius: "3px",
    boxShadow: selected ? `0 0 10px ${theme.palette.primary.main}80` : "none",
    transition: "width 0.4s ease-in-out",
  },
}));

const ToggleBillInvoice = () => {
  const [view, setView] = useState("invoice"); // default
  const [subscriptionType, setSubscriptionType] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // ✅ Load subscriptionType
  useEffect(() => {
    const type = localStorage.getItem("subscriptionType");
    setSubscriptionType(type);

    // Set default tab smartly
    if (type === "bill") setView("bill");
    else setView("invoice");
  }, []);

  // ✅ Case 1: Invoice only
  if (subscriptionType === "invoice") {
    return (
      <Box sx={{ mt: 4, width: "100%", minHeight: "100vh" }}>
        <PartyMaster />
      </Box>
    );
  }

  // ✅ Case 2: Bill only
  if (subscriptionType === "bill") {
    return (
      <Box sx={{ mt: 4, width: "100%", minHeight: "100vh" }}>
        <PartyMaster />
      </Box>
    );
  }

  // ✅ Case 3: BOTH → show toggle bar
  return (
    <Box sx={{ mt: 4, width: "100%", minHeight: "100vh" }}>
      {/* Toggle Bar */}
      <StyledToggleContainer>
        <StyledToggleOption
          selected={view === "invoice"}
          onClick={() => setView("invoice")}
        >
          <ReceiptLongOutlinedIcon sx={{ mr: 1, fontSize: "1.5rem", verticalAlign: "middle", }} />
          {isMobile ? "Invoice" : "Invoice Data"}
        </StyledToggleOption>

        <StyledToggleOption
          selected={view === "bill"}
          onClick={() => setView("bill")}
        >
          <DescriptionOutlinedIcon sx={{ mr: 1, fontSize: "1.5rem", verticalAlign: "middle", }} />
          {isMobile ? "Bill" : "Bill Data"}
        </StyledToggleOption>
      </StyledToggleContainer>

      {/* Body */}
      <Box
        sx={{
          animation: "fadeIn 0.5s ease-in-out",
          "@keyframes fadeIn": {
            from: { opacity: 0, transform: "translateY(20px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        {view === "invoice" ? <PartyMaster /> : <BillMaster />}
      </Box>
    </Box>
  );
};

export default ToggleBillInvoice;