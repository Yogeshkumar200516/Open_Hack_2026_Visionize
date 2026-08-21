import React, { useState, useEffect, useContext } from "react";
import { styled, useTheme } from "@mui/material/styles";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import MuiDrawer from "@mui/material/Drawer";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Grid from "@mui/material/Grid";
import Tooltip from "@mui/material/Tooltip";
import List from "@mui/material/List";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import MenuOpenRoundedIcon from "@mui/icons-material/MenuOpenRounded";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Collapse from "@mui/material/Collapse";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import useMediaQuery from "@mui/material/useMediaQuery";
import logo from "../../assets/images/logo2.svg";
import Login from "../Login/Login";
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { ColorModeContext } from "../../Context/ThemeContext.jsx";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import Diversity1OutlinedIcon from "@mui/icons-material/Diversity1Outlined";
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import Badge from "@mui/material/Badge";
import ReminderModal from "../Notification/Notification.jsx";
import API_BASE_URL from "../../Context/Api.jsx";
import { fetchReminderData } from "../../utils/reminder.jsx";
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ManageHistoryOutlinedIcon from '@mui/icons-material/ManageHistoryOutlined';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';


const drawerWidth = 240;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(0, 2),
  ...theme.mixins.toolbar,
  flexShrink: 0,
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => {
  const borderColor = theme.palette.mode === "dark" ? "#333" : "#e0e0e0";
  return {
    zIndex: theme.zIndex.drawer + 1,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    boxShadow: "none",
    backdropFilter: "none",
    backgroundImage: "none",
    borderBottom: `1px solid ${borderColor}`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
      marginLeft: drawerWidth,
      width: `calc(100% - ${drawerWidth}px)`,
      transition: theme.transitions.create(["width", "margin"], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  };
});

// Custom scrollbar styles
const scrollbarStyles = {
  overflowY: "auto",
  overflowX: "hidden",
  flex: 1,
  "&::-webkit-scrollbar": {
    width: "3px",
  },
  "&::-webkit-scrollbar-track": {
    background: "transparent",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "rgba(128,128,128,0.3)",
    borderRadius: "10px",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    background: "rgba(128,128,128,0.6)",
  },
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(128,128,128,0.3) transparent",
};

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => {
  const borderColor = theme.palette.mode === "dark" ? "#2d2e2d" : "#ddd";
  return {
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    ...(open
      ? {
          ...openedMixin(theme),
          "& .MuiDrawer-paper": {
            ...openedMixin(theme),
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRight: `1px solid ${borderColor}`,
            display: "flex",
            flexDirection: "column",
          },
        }
      : {
          ...closedMixin(theme),
          "& .MuiDrawer-paper": {
            ...closedMixin(theme),
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRight: `1px solid ${borderColor}`,
            display: "flex",
            flexDirection: "column",
          },
        }),
  };
});

// ─── Dropdown group component ────────────────────────────────────────────────
function NavGroup({ groupText, groupIcon, children, drawerOpen, isGroupActive, theme }) {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();

  // Auto-expand when a child is active
  useEffect(() => {
    if (isGroupActive) setExpanded(true);
  }, [isGroupActive]);

  const handleToggle = () => {
    if (drawerOpen) {
      setExpanded((prev) => !prev);
    }
  };

  return (
    <>
      <ListItem disablePadding sx={{ display: "block" }}>
        <ListItemButton
          onClick={handleToggle}
          sx={{
            justifyContent: drawerOpen ? "initial" : "center",
            px: 2.5,
            backgroundColor: isGroupActive
              ? theme.palette.action.selected
              : "transparent",
            color: isGroupActive
              ? theme.palette.primary.main
              : theme.palette.text.primary,
            "&:hover": {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          <ListItemIcon
            sx={{
              justifyContent: "center",
              minWidth: 0,
              mr: drawerOpen ? 3 : "auto",
              color: isGroupActive
                ? theme.palette.text.primary
                : theme.palette.text.secondary,
            }}
          >
            {groupIcon}
          </ListItemIcon>
          {drawerOpen && (
            <>
              <ListItemText
                primary={groupText}
                primaryTypographyProps={{ fontWeight: "bold", color: isGroupActive ? theme.palette.text.primary : theme.palette.text.secondary}}
              />
              {expanded ? (
                <ExpandLess sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
              ) : (
                <ExpandMore sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
              )}
            </>
          )}
        </ListItemButton>
      </ListItem>

      {drawerOpen && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {children}
          </List>
        </Collapse>
      )}
    </>
  );
}

// ─── Sub-item inside a NavGroup ───────────────────────────────────────────────
function NavSubItem({ text, icon, path, drawerOpen, onNavigate, theme }) {
  const location = useLocation();
  const isActive = location.pathname === path;

  return (
    <ListItem disablePadding sx={{ display: "block" }}>
      <ListItemButton
        component={Link}
        to={path}
        onClick={onNavigate}
        sx={{
          pl: drawerOpen ? 4.5 : 2.5,
          justifyContent: drawerOpen ? "initial" : "center",
          backgroundColor: isActive
            ? theme.palette.action.selected
            : "transparent",
          color: isActive
            ? theme.palette.primary.main
            : theme.palette.text.primary,
          "&:hover": {
            backgroundColor: theme.palette.action.hover,
          },
        }}
      >
        <ListItemIcon
          sx={{
            justifyContent: "center",
            minWidth: 0,
            mr: drawerOpen ? 3 : "auto",
            color: isActive
              ? theme.palette.primary.main
              : theme.palette.text.secondary,
          }}
        >
          {React.cloneElement(icon, { sx: { fontSize: 20 } })}
        </ListItemIcon>
        {drawerOpen && (
          <ListItemText
            primary={text}
            primaryTypographyProps={{
              fontWeight: isActive ? "bold" : "bold",
              fontSize: "0.875rem",
              color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
            }}
          />
        )}
      </ListItemButton>
    </ListItem>
  );
}


// ─── Main Navbar ─────────────────────────────────────────────────────────────
function Navbar({ user, onLogout, open, variant, setOpen, handleDrawerToggle }) {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isXLarge = useMediaQuery("(min-width:1200px)");
  const isSmall = useMediaQuery("(max-width:600px)");
  const isMedium = useMediaQuery("(min-width:600px) and (max-width:1200px)");
  const subscriptionType = localStorage.getItem("subscriptionType");
  const colorMode = useContext(ColorModeContext);

  const normalizedSubscription = subscriptionType?.trim().toLowerCase();

  // ─── Page definitions ────────────────────────────────────────────────────
  const topPages = [
    {
      text: "Dashboard",
      icon: <DashboardOutlinedIcon />,
      path: "/",
      roles: ["admin"],
    },
    {
      text: normalizedSubscription === "bill" ? "Product Billing" : "GST Invoice",
      icon: <ReceiptLongRoundedIcon />,
      path: "/gst-invoice-bill",
      roles: ["admin", "cashier", "sales"],
    },
    {
      text: "Party Master",
      icon: <Diversity1OutlinedIcon />,
      path: "/party-master",
      roles: ["admin", "cashier", "sales"],
    },
    {
      text: "AI Insights",
      icon: <AutoAwesomeOutlinedIcon />,
      path: "/ai-insights",
      roles: ["admin", "cashier", "sales"],
    },
    {
      text: "Products & Stock",
      icon: <Inventory2RoundedIcon />,
      path: "/products",
      roles: ["admin", "sales"],
    },
    {
      text: "Add Companies",
      icon: <AddBusinessOutlinedIcon />,
      path: "/add-company",
      roles: ["super_admin"],
    },
    {
      text: "Add Users",
      icon: <GroupAddIcon />,
      path: "/add-admin",
      roles: ["super_admin"],
    },
  ];

  // Returns group — only for invoice/both subscriptions
  const returnsPages = [
    {
      text: "Return Stock",
      icon: <ManageHistoryOutlinedIcon />,
      path: "/return-stock",
      roles: ["admin", "cashier"],
    },
    {
      text: "Sales Return",
      icon: <RequestQuoteOutlinedIcon />,
      path: "/sales-return",
      roles: ["admin", "cashier"],
    },
    {
      text: "Purchase Return",
      icon: <MonetizationOnOutlinedIcon />,
      path: "/purchase-return",
      roles: ["admin", "cashier"],
    },
  ];

  // Purchase Flow group — only for invoice/both subscriptions
  const purchaseFlowPages = [
    {
      text: "KPI & ROI Metrics",
      icon: <DashboardOutlinedIcon />,
      path: "/kpi-dashboard",
      roles: ["admin", "cashier"],
    },
    {
      text: "Supplier Master",
      icon: <Diversity1OutlinedIcon />,
      path: "/suppliers",
      roles: ["admin", "cashier"],
    },
    {
      text: "Purchase Request",
      icon: <AutoAwesomeOutlinedIcon />,
      path: "/purchase-requests",
      roles: ["admin", "cashier"],
    },
    {
      text: "Request Quotation",
      icon: <Inventory2RoundedIcon />,
      path: "/rfq",
      roles: ["admin", "cashier"],
    },
    {
      text: "Purchase Orders",
      icon: <AddBusinessOutlinedIcon />,
      path: "/purchase-orders",
      roles: ["admin", "cashier"],
    },
    {
      text: "Purchase Invoice",
      icon: <GroupAddIcon />,
      path: "/purchase-invoice",
      roles: ["admin", "cashier"],
    },
    {
      text: "Goods Receipt",
      icon: <Diversity1OutlinedIcon />,
      path: "/goods-receipt",
      roles: ["admin", "cashier"],
    },
    {
      text: "Purchase Analytics",
      icon: <AutoAwesomeOutlinedIcon />,
      path: "/purchase-analytics",
      roles: ["admin", "cashier"],
    },
  ];

  const bottomPages = [
    {
      text: normalizedSubscription === "bill" ? "Manage User" : "User & Billing",
      icon: <GroupAddIcon />,
      path: "/admin-access",
      roles: ["admin"],
    },
  ];

  // ─── Filter by user role ─────────────────────────────────────────────────
  const filterByRole = (pages) =>
    pages.filter((p) => user && user.role && p.roles.includes(user.role));

  const filteredTop = filterByRole(topPages);
  const filteredReturns = filterByRole(returnsPages);
  const filteredPurchaseFlow = filterByRole(purchaseFlowPages);
  const filteredBottom = filterByRole(bottomPages);

  const showInvoiceGroups = ["invoice", "both"].includes(normalizedSubscription);

  // Active group detection
  const returnsActive = filteredReturns.some((p) => location.pathname === p.path);
  const purchaseFlowActive = filteredPurchaseFlow.some((p) => location.pathname === p.path);

  // ─── Notification state ──────────────────────────────────────────────────
  const [badgeCount, setBadgeCount] = useState(0);
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
  let isMounted = true;
  let intervalId;

  const fetchAndUpdateBadge = async () => {
    try {
      const { reminders, overdues } = await fetchReminderData();

      if (isMounted) {
        setBadgeCount(reminders.length + overdues.length);
      }

    } catch (error) {
      console.error("Reminder fetch error:", error);

      // ❌ DO NOT keep retrying aggressively
      clearInterval(intervalId);
    }
  };

  // ✅ Run once
  fetchAndUpdateBadge();

  // ✅ Run every 60 seconds (NOT 15)
  intervalId = setInterval(fetchAndUpdateBadge, 60000);

  return () => {
    isMounted = false;
    clearInterval(intervalId);
  };
}, []);

  const handleOpen = () => setOpenModal(true);
  const handleClose = () => setOpenModal(false);
  const handleDataLoaded = (reminders, overdues) =>
    setBadgeCount(reminders.length + overdues.length);

  // Responsive drawer behaviour
  useEffect(() => {
    if (isSmall) setOpen(false);
    else if (isXLarge) setOpen(true);
    else if (isMedium) setOpen(false);
  }, [isSmall, isXLarge, isMedium, setOpen]);

  // ─── Shared nav list renderer ────────────────────────────────────────────
  const renderNavList = (drawerIsOpen, onNavigate = () => {}) => (
    <List sx={{ py: 0 }}>
      {/* Top flat pages */}
      {filteredTop.map(({ text, icon, path }) => {
        const isActive = location.pathname === path;
        return (
          <ListItem key={text} disablePadding sx={{ display: "block" }}>
            <ListItemButton
              component={Link}
              to={path}
              onClick={onNavigate}
              sx={{
                justifyContent: drawerIsOpen ? "initial" : "center",
                px: 2.5,
                backgroundColor: isActive ? theme.palette.action.selected : "transparent",
                color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                "&:hover": { backgroundColor: theme.palette.action.hover },
              }}
            >
              <ListItemIcon
                sx={{
                  justifyContent: "center",
                  minWidth: 0,
                  mr: drawerIsOpen ? 3 : "auto",
                  color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                }}
              >
                {React.cloneElement(icon, { sx: { fontWeight: "bold" } })}
              </ListItemIcon>
              <ListItemText
                primary={text}
                sx={{ opacity: drawerIsOpen ? 1 : 0 }}
                primaryTypographyProps={{ fontWeight: "bold", color: isActive ? theme.palette.primary.main : theme.palette.text.secondary, }}
              />
            </ListItemButton>
          </ListItem>
        );
      })}

      {/* Returns group */}
      {showInvoiceGroups && filteredReturns.length > 0 && (
        <NavGroup
          groupText="Returns"
          groupIcon={<AssignmentReturnOutlinedIcon />}
          drawerOpen={drawerIsOpen}
          isGroupActive={returnsActive}
          theme={theme}
        >
          {filteredReturns.map(({ text, icon, path }) => (
            <NavSubItem
              key={path}
              text={text}
              icon={icon}
              path={path}
              drawerOpen={drawerIsOpen}
              onNavigate={onNavigate}
              theme={theme}
            />
          ))}
        </NavGroup>
      )}

      {/* Purchase Flow group */}
      {showInvoiceGroups && filteredPurchaseFlow.length > 0 && (
        <NavGroup
          groupText="Purchase Flow"
          groupIcon={<ShoppingCartOutlinedIcon />}
          drawerOpen={drawerIsOpen}
          isGroupActive={purchaseFlowActive}
          theme={theme}
        >
          {filteredPurchaseFlow.map(({ text, icon, path }) => (
            <NavSubItem
              key={path}
              text={text}
              icon={icon}
              path={path}
              drawerOpen={drawerIsOpen}
              onNavigate={onNavigate}
              theme={theme}
            />
          ))}
        </NavGroup>
      )}

      {/* Bottom flat pages (e.g. User & Billing) */}
      {filteredBottom.map(({ text, icon, path }) => {
        const isActive = location.pathname === path;
        return (
          <ListItem key={text} disablePadding sx={{ display: "block" }}>
            <ListItemButton
              component={Link}
              to={path}
              onClick={onNavigate}
              sx={{
                justifyContent: drawerIsOpen ? "initial" : "center",
                px: 2.5,
                backgroundColor: isActive ? theme.palette.action.selected : "transparent",
                color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                "&:hover": { backgroundColor: theme.palette.action.hover },
              }}
            >
              <ListItemIcon
                sx={{
                  justifyContent: "center",
                  minWidth: 0,
                  mr: drawerIsOpen ? 3 : "auto",
                  color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                }}
              >
                {React.cloneElement(icon, { sx: { fontWeight: "bold" } })}
              </ListItemIcon>
              <ListItemText
                primary={text}
                sx={{ opacity: drawerIsOpen ? 1 : 0 }}
                primaryTypographyProps={{ fontWeight: "bold", color: isActive ? theme.palette.primary.main : theme.palette.text.secondary, }}
              />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );

  // ─── Shared footer ───────────────────────────────────────────────────────
  const renderFooter = (drawerIsOpen, showLogout = false) => (
    <Box
      sx={{
        flexShrink: 0,
        p: 2,
        display: "flex",
        flexDirection: showLogout ? "column" : "row",
        alignItems: "center",
        justifyContent: drawerIsOpen ? "flex-start" : "center",
        gap: 1,
        borderTop: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
      }}
    >
      {showLogout && user && (
        <Button
          onClick={onLogout}
          fullWidth
          variant="outlined"
          sx={{
            display: { xs: "inline-flex", sm: "none" },
            color: theme.palette.mode === "dark" ? "#00bcd4" : "#136919",
            borderColor: theme.palette.mode === "dark" ? "#00bcd4" : "#136919",
            borderRadius: "30px",
            textTransform: "none",
            fontWeight: "bold",
            fontSize: "0.9rem",
            mb: 1,
            transition: "all 0.3s ease",
            "&:hover": {
              backgroundColor: theme.palette.mode === "dark" ? "#444f4e" : "#bdf9c0",
              boxShadow: theme.palette.mode === "dark"
                ? "0 0 8px #00bcd4"
                : "0 0 8px rgb(13, 119, 33)",
            },
          }}
        >
          Logout
        </Button>
      )}
      <img
        src={logo}
        alt="Company Logo"
        style={{ width: 30, height: 30, objectFit: "contain" }}
      />
      {drawerIsOpen && (
        <Grid sx={{ lineHeight: 1 }}>
          <Typography
            sx={{
              textAlign: "center",
              fontSize: "12px",
              fontWeight: "bold",
              color: theme.palette.text.secondary,
            }}
          >
            Developed by
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            © Team Visionize {showLogout ? "(BIT)" : ""}
          </Typography>
        </Grid>
      )}
    </Box>
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* ── AppBar ── */}
      <AppBar position="fixed" open={open && variant === "permanent"}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          {/* Left */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {!open && (
              <>
                <IconButton
                  onClick={handleDrawerToggle}
                  edge="start"
                  sx={{ mr: { xs: 0, sm: 2 } }}
                >
                  <MenuOpenRoundedIcon
                    sx={{
                      fontSize: "30px",
                      color: theme.palette.text.secondary,
                      "&:hover": { color: theme.palette.text.primary },
                    }}
                  />
                </IconButton>
                <Typography
                  variant="h6"
                  noWrap
                  component="div"
                  sx={{
                    color: theme.palette.text.primary,
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontFamily: "'Diphylleia', serif",
                    fontWeight: 900,
                    fontSize: { xs: "1.1rem", sm: "1.25rem" },
                  }}
                >
                  <img
                    src={logo}
                    alt="Billing Software Logo"
                    style={{ width: "34px", height: "34px", objectFit: "contain" }}
                  />
                  Nexora ERP
                </Typography>
              </>
            )}
          </Box>

          {/* Right */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Tooltip title="Toggle Theme" arrow>
              <IconButton
                onClick={colorMode.toggleColorMode}
                sx={{ color: theme.palette.mode === "dark" ? "#00bcd4" : "#136919" }}
              >
                {theme.palette.mode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Notifications" arrow>
              <IconButton onClick={handleOpen} sx={{ color: theme.palette.primary.main }}>
                <Badge badgeContent={badgeCount} color="error">
                  <NotificationsActiveOutlinedIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {user && (
              <Typography
                variant="h6"
                sx={{
                  color: theme.palette.text.primary,
                  fontWeight: "bold",
                  display: { xs: "none", sm: "flex" },
                  fontSize: "1.1rem",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  letterSpacing: "0.5px",
                }}
              >
                Welcome, {user.first_name || "User"}
              </Typography>
            )}

            {user && (
              <Button
                onClick={() => { onLogout(); navigate("/login"); }}
                variant="outlined"
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  color: theme.palette.mode === "dark" ? "#00bcd4" : "#136919",
                  borderColor: theme.palette.mode === "dark" ? "#00bcd4" : "#136919",
                  borderRadius: "30px",
                  textTransform: "none",
                  px: 3,
                  fontWeight: "bold",
                  fontSize: "0.9rem",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    backgroundColor: theme.palette.mode === "dark" ? "#444f4e" : "#bdf9c0",
                    boxShadow: theme.palette.mode === "dark"
                      ? "0 0 8px #00bcd4"
                      : "0 0 8px rgb(13, 119, 33)",
                  },
                }}
              >
                Logout
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Temporary Drawer (mobile) ── */}
      {variant === "temporary" ? (
        <MuiDrawer
          variant="temporary"
          open={open}
          onClose={() => setOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            zIndex: theme.zIndex.drawer + 2,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              boxShadow: "none",
              backdropFilter: "none",
              backgroundImage: "none",
              display: "flex",
              flexDirection: "column",
            },
          }}
        >
          {/* Header */}
          <DrawerHeader>
            <Typography
              variant="h6"
              noWrap
              sx={{
                color: theme.palette.text.primary,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontFamily: "'Diphylleia', serif",
                fontWeight: 900,
                fontSize: "1.25rem",
              }}
            >
              <img
                src={logo}
                alt="Music Player Logo"
                style={{ width: "34px", height: "34px", objectFit: "contain" }}
              />
              Nexora ERP
            </Typography>
            <IconButton onClick={handleDrawerToggle}>
              <MenuOpenRoundedIcon sx={{ fontSize: "30px", color: "#fff" }} />
            </IconButton>
          </DrawerHeader>

          {/* Scrollable nav area */}
          <Box sx={scrollbarStyles}>
            {renderNavList(true, () => setOpen(false))}
          </Box>

          {/* Sticky footer */}
          {renderFooter(true, true)}
        </MuiDrawer>

      ) : (
        /* ── Permanent Drawer (desktop) ── */
        <Drawer variant="permanent" open={open}>
          <DrawerHeader>
            <Typography
              variant="h6"
              noWrap
              sx={{
                color: theme.palette.text.primary,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontFamily: "'Diphylleia', serif",
                fontWeight: 900,
                fontSize: "1.18rem",
              }}
            >
              <img
                src={logo}
                alt="Music Player Logo"
                style={{ width: "34px", height: "34px", objectFit: "contain" }}
              />
              Nexora ERP
            </Typography>
            <IconButton onClick={handleDrawerToggle}>
              <ChevronLeftIcon sx={{ color: "#aaa" }} />
            </IconButton>
          </DrawerHeader>

          {/* Scrollable nav area */}
          <Box sx={scrollbarStyles}>
            {renderNavList(open)}
          </Box>

          {/* Sticky footer */}
          {renderFooter(open, false)}
        </Drawer>
      )}

      <ReminderModal
        open={openModal}
        onClose={handleClose}
        onDataLoaded={handleDataLoaded}
      />
    </Box>
  );
}

export default Navbar;