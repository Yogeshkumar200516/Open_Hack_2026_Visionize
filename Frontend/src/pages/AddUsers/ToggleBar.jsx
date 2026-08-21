import React, { useEffect, useState } from "react";
import { Box, Typography, useTheme, useMediaQuery } from "@mui/material";
import { styled } from "@mui/material/styles";
import AddUsers from "./AddUsers";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import BillingAddressManagerWrapper from "./BillingAdress";

// 🔹 Styled container for toggle buttons
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

// 🔹 Individual toggle buttons with glowing underline
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

const UserBillingToggle = () => {
  const [view, setView] = useState("users");
  const [subscriptionType, setSubscriptionType] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // ✅ Get subscriptionType from localStorage
  useEffect(() => {
    const storedType = localStorage.getItem("subscriptionType");
    setSubscriptionType(storedType);
    console.log("📦 Loaded subscriptionType:", storedType);
  }, []);

  // ✅ If subscriptionType === "bill", show ONLY user management
  if (subscriptionType === "bill") {
    return (
      <Box
        sx={{
          mt: 4,
          width: "100%",
          minHeight: "100vh",
          backgroundColor: "transparent",
          animation: "fadeIn 0.5s ease-in-out",
          "@keyframes fadeIn": {
            from: { opacity: 0, transform: "translateY(20px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        <AddUsers />
      </Box>
    );
  }

  // ✅ Otherwise (invoice or both) show the toggle bar and both pages
  return (
    <Box
      sx={{
        mt: 4,
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "transparent",
      }}
    >
      {/* Toggle Bar */}
      <StyledToggleContainer>
        <StyledToggleOption
          selected={view === "users"}
          onClick={() => setView("users")}
        >
          <ManageAccountsOutlinedIcon
            sx={{
              verticalAlign: "middle",
              mr: 1,
              fontSize: "1.5rem",
            }}
          />
          {isMobile ? "Users" : "User Management"}
        </StyledToggleOption>

        <StyledToggleOption
          selected={view === "billing"}
          onClick={() => setView("billing")}
        >
          <AdminPanelSettingsOutlinedIcon
            sx={{
              verticalAlign: "middle",
              mr: 1,
              fontSize: "1.5rem",
            }}
          />
          {isMobile ? "Addresses" : "Billing Addresses"}
        </StyledToggleOption>
      </StyledToggleContainer>

      {/* Body Section */}
      <Box
        sx={{
          animation: "fadeIn 0.5s ease-in-out",
          "@keyframes fadeIn": {
            from: { opacity: 0, transform: "translateY(20px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        {view === "users" ? <AddUsers /> : <BillingAddressManagerWrapper />}
      </Box>
    </Box>
  );
};

export default UserBillingToggle;
