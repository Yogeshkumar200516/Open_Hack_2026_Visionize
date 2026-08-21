// src/pages/AiInsights.jsx
// ============================================================
// ADVANCED AI INSIGHTS DASHBOARD
// Tabs: Overview | Forecast | Returns | Inventory | Customers
//       Products | GST | Cash Flow | Discounts | Seasonal
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from "react";
import axiosInstance from "../../utils/axiosInstance";
import {
  Box, Grid, Card, CardContent, Typography, Chip, CircularProgress,
  Alert, Button, ButtonGroup, Divider, Avatar, LinearProgress,
  Tooltip, IconButton, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Fade, Skeleton,
  useTheme, useMediaQuery, alpha, Tab, Tabs, Badge, Collapse,
  ToggleButton, ToggleButtonGroup, tooltipClasses,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  TrendingUp, TrendingDown, TrendingFlat, WarningAmber,
  CheckCircleOutline, ErrorOutline, Inventory2Outlined,
  AssessmentOutlined, AutoGraphOutlined, NotificationsActiveOutlined,
  CurrencyRupeeOutlined, RefreshOutlined, ArrowUpward, ArrowDownward,
  HealthAndSafety, ReportProblem, TaskAlt, LightbulbOutlined,
  SpeedOutlined, InventoryOutlined, LocalShippingOutlined, PeopleAltOutlined,
  BarChartOutlined, AccountBalanceWalletOutlined, LocalOfferOutlined,
  CalendarMonthOutlined, FlashOn, ExpandMore, ExpandLess,
  ScoreOutlined, StarOutlined, InfoOutlined, ArrowForwardIos,
} from "@mui/icons-material";
import API_BASE_URL from "../../Context/Api";

// ─── Custom Attractive Tooltip ────────────────────────────────────────────────
const StyledTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.mode === "dark"
      ? "rgba(15, 18, 30, 0.97)"
      : "rgba(255, 255, 255, 0.98)",
    color: theme.palette.mode === "dark" ? "#e8ecf4" : "#1a1f36",
    border: `1px solid ${theme.palette.mode === "dark"
      ? "rgba(255,255,255,0.1)"
      : "rgba(0,0,0,0.08)"}`,
    borderRadius: 12,
    boxShadow: theme.palette.mode === "dark"
      ? "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)"
      : "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
    padding: "10px 14px",
    maxWidth: 260,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: theme.palette.mode === "dark"
      ? "rgba(15, 18, 30, 0.97)"
      : "rgba(255, 255, 255, 0.98)",
    "&::before": {
      border: `1px solid ${theme.palette.mode === "dark"
        ? "rgba(255,255,255,0.1)"
        : "rgba(0,0,0,0.08)"}`,
    },
  },
}));

// Tooltip content renderer
const TooltipContent = ({ title, description, accent, icon }) => {
  const theme = useTheme();
  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={0.8} sx={{ mb: description ? 0.6 : 0 }}>
        {icon && (
          <Box sx={{
            width: 20, height: 20, borderRadius: "6px",
            bgcolor: alpha(accent || theme.palette.primary.main, 0.15),
            display: "flex", alignItems: "center", justifyContent: "center",
            color: accent || theme.palette.primary.main,
            flexShrink: 0,
          }}>
            {React.cloneElement(icon, { sx: { fontSize: 13 } })}
          </Box>
        )}
        <Typography variant="caption" fontWeight={800} fontSize="0.72rem"
          sx={{ color: accent || theme.palette.primary.main, lineHeight: 1.3 }}>
          {title}
        </Typography>
      </Stack>
      {description && (
        <Typography variant="caption" fontSize="0.67rem" lineHeight={1.55}
          sx={{ color: "inherit", opacity: 0.82, display: "block" }}>
          {description}
        </Typography>
      )}
    </Box>
  );
};

// Card-level info tooltip trigger (small info icon in top-right of cards)
const CardInfoTooltip = ({ title, description, accent, icon }) => {
  const theme = useTheme();
  return (
    <StyledTooltip
      title={<TooltipContent title={title} description={description} accent={accent} icon={icon} />}
      arrow
      placement="top"
      enterDelay={200}
      leaveDelay={100}
    >
      <Box sx={{
        width: 20, height: 20, borderRadius: "50%", cursor: "help",
        display: "flex", alignItems: "center", justifyContent: "center",
        bgcolor: alpha(accent || theme.palette.primary.main, 0.1),
        color: alpha(accent || theme.palette.primary.main, 0.6),
        flexShrink: 0,
        transition: "all 0.15s",
        "&:hover": {
          bgcolor: alpha(accent || theme.palette.primary.main, 0.18),
          color: accent || theme.palette.primary.main,
          transform: "scale(1.15)",
        },
      }}>
        <InfoOutlined sx={{ fontSize: 13 }} />
      </Box>
    </StyledTooltip>
  );
};

// ─── Utility helpers ──────────────────────────────────────────────────────────
const fmtINR = (val) => {
  const n = Number(val) || 0;
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};
const pct = (v, decimals = 1) => {
  const n = Number(v);
  return `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`;
};
const num = (v) => Number(v) || 0;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// ─── Micro chart (pure CSS bar spark) ────────────────────────────────────────
const SparkBar = ({ data = [], valueKey = "value", color, height = 48 }) => {
  const theme = useTheme();
  const max = Math.max(...data.map((d) => num(d[valueKey])), 1);
  const c = color || theme.palette.primary.main;
  return (
    <Stack direction="row" alignItems="flex-end" sx={{ height, gap: "2px" }}>
      {data.map((d, i) => {
        const h = clamp((num(d[valueKey]) / max) * height, 3, height);
        const isLast = i === data.length - 1;
        return (
          <Tooltip key={i} title={`${d.label || d.month || ""}: ${fmtINR(d[valueKey])}`} arrow>
            <Box sx={{
              flex: 1, height: h, minWidth: 4,
              bgcolor: isLast ? c : alpha(c, 0.45),
              borderRadius: "3px 3px 0 0",
              transition: "height 0.4s ease",
              cursor: "pointer",
              "&:hover": { bgcolor: c, opacity: 0.9 },
            }} />
          </Tooltip>
        );
      })}
    </Stack>
  );
};

// ─── Donut chart (pure CSS conic-gradient) ────────────────────────────────────
const DonutChart = ({ slices = [], size = 80, thickness = 14 }) => {
  const total = slices.reduce((a, s) => a + num(s.value), 0) || 1;
  let acc = 0;
  const gradient = slices.map((s, i) => {
    const pctVal = (num(s.value) / total) * 100;
    const seg = `${s.color} ${acc.toFixed(1)}% ${(acc + pctVal).toFixed(1)}%`;
    acc += pctVal;
    return seg;
  }).join(", ");
  return (
    <Box sx={{ position: "relative", width: size, height: size }}>
      <Box sx={{
        width: size, height: size, borderRadius: "50%",
        background: `conic-gradient(${gradient})`,
        transition: "all 0.5s ease",
      }} />
      <Box sx={{
        position: "absolute", inset: thickness,
        borderRadius: "50%", bgcolor: "background.paper",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Typography variant="caption" fontWeight={900} fontSize={size * 0.14}>
          {slices.length}
        </Typography>
      </Box>
    </Box>
  );
};

// ─── Gauge ────────────────────────────────────────────────────────────────────
const HealthGauge = ({ score, label }) => {
  const theme = useTheme();
  const c = score >= 80 ? "#00c853" : score >= 60 ? "#ffab00" : score >= 40 ? "#ff6d00" : "#d50000";
  return (
    <Box sx={{ textAlign: "center" }}>
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <CircularProgress variant="determinate" value={100} size={96} thickness={5}
          sx={{ color: alpha(c, 0.12), position: "absolute" }} />
        <CircularProgress variant="determinate" value={score} size={96} thickness={5}
          sx={{ color: c, "& .MuiCircularProgress-circle": { strokeLinecap: "round" } }} />
        <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Typography variant="h6" fontWeight={900} color={c} lineHeight={1}>{score}</Typography>
          <Typography variant="caption" color="text.secondary" fontSize="0.6rem">/100</Typography>
        </Box>
      </Box>
      <Typography variant="body2" fontWeight={700} color={c} sx={{ mt: 0.5 }}>{label}</Typography>
    </Box>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, subType = "neutral", icon, color, loading, size = "md", tooltipTitle, tooltipDesc }) => {
  const theme = useTheme();
  const c = color || theme.palette.primary.main;
  const subColor = subType === "positive" ? "#00c853" : subType === "negative" ? "#d50000" : subType === "warning" ? "#ffab00" : "text.secondary";
  return (
    <Card elevation={0} sx={{
      border: `1px solid ${alpha(c, 0.18)}`,
      borderRadius: 2.5,
      height: "100%",
      background: `linear-gradient(145deg, ${alpha(c, 0.06)} 0%, ${theme.palette.background.paper} 55%)`,
      transition: "transform 0.18s, box-shadow 0.18s",
      "&:hover": { transform: "translateY(-2px)", boxShadow: `0 6px 20px ${alpha(c, 0.18)}` },
    }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={0.5} sx={{ mb: 0.2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}
                sx={{ textTransform: "uppercase", letterSpacing: 0.6, fontSize: "0.65rem" }}>
                {label}
              </Typography>
              
            </Stack>
            {loading ? <Skeleton width={70} height={34} sx={{ mt: 0.5 }} /> : (
              <Typography variant={size === "lg" ? "h4" : "h6"} fontWeight={900} color={c}
                sx={{ mt: 0.3, lineHeight: 1.2, wordBreak: "break-word" }}>
                {value}
              </Typography>
            )}
            {sub && !loading && (
              <Typography variant="caption" color={subColor}
                sx={{ mt: 0.4, display: "flex", alignItems: "center", gap: 0.3, fontWeight: 600 }}>
                {sub}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: alpha(c, 0.1), color: c, width: 40, height: 40, ml: 1, flexShrink: 0 }}>
            {icon}
          </Avatar>
        </Stack>
      </CardContent>
    </Card>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, subtitle, accent, action, tooltipTitle, tooltipDesc }) => {
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2.5 }}>
      <Stack direction="row" gap={1.5} alignItems="flex-start">
        <Avatar sx={{ bgcolor: alpha(accent || theme.palette.primary.main, 0.12),
          color: accent || theme.palette.primary.main, width: 38, height: 38 }}>
          {icon}
        </Avatar>
        <Box>
          <Stack direction="row" alignItems="center" gap={0.8}>
            <Typography variant="h6" fontWeight={800} letterSpacing={-0.3} sx={{color: primaryColor}}>{title}</Typography>
            {tooltipTitle && (
              <CardInfoTooltip title={tooltipTitle} description={tooltipDesc} accent={accent || primaryColor} icon={icon} />
            )}
          </Stack>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
      </Stack>
      {action}
    </Stack>
  );
};

// ─── Insight Pill ─────────────────────────────────────────────────────────────
const InsightPill = ({ insight }) => {
  const theme = useTheme();
  const colorMap = {
    positive: "#00c853", warning: "#ffab00", critical: "#d50000", info: theme.palette.info.main,
  };
  const c = colorMap[insight.type] || theme.palette.text.secondary;
  return (
    <Box sx={{
      p: 1.5, borderRadius: 2,
      border: `1px solid ${alpha(c, 0.22)}`,
      background: alpha(c, 0.045),
      display: "flex", gap: 1.5, alignItems: "flex-start",
      transition: "box-shadow 0.15s",
      "&:hover": { boxShadow: `0 2px 12px ${alpha(c, 0.15)}` },
    }}>
      <Typography fontSize={18} lineHeight={1.2}>{insight.icon}</Typography>
      <Box sx={{ flex: 1 }}>
        <Stack direction="row" alignItems="center" gap={0.8} sx={{ mb: 0.4 }}>
          <Chip label={insight.category} size="small" sx={{
            height: 18, fontSize: "0.6rem", fontWeight: 800,
            bgcolor: alpha(c, 0.14), color: c, border: "none",
          }} />
        </Stack>
        <Typography variant="body2" color="text.primary" lineHeight={1.55}>{insight.message}</Typography>
      </Box>
    </Box>
  );
};

// ─── Status chip ──────────────────────────────────────────────────────────────
const STATUS_META = {
  out_of_stock: { label: "Out of Stock", color: "#d50000" },
  critical: { label: "Critical", color: "#f44336" },
  reorder_soon: { label: "Reorder Soon", color: "#ff9800" },
  slow_moving: { label: "Slow Moving", color: "#8bc34a" },
  sufficient: { label: "Sufficient", color: "#4caf50" },
  no_sales_data: { label: "No Data", color: "#78909c" },
  fast: { label: "Fast", color: "#00c853" },
  medium: { label: "Medium", color: "#ff9800" },
  slow: { label: "Slow", color: "#f44336" },
  no_movement: { label: "Dead", color: "#607d8b" },
};
const StatusChip = ({ status }) => {
  const m = STATUS_META[status] || { label: status, color: "#78909c" };
  return (
    <Chip label={m.label} size="small" sx={{
      bgcolor: alpha(m.color, 0.1), color: m.color, fontWeight: 700,
      fontSize: "0.62rem", height: 20, border: `1px solid ${alpha(m.color, 0.28)}`,
    }} />
  );
};

// ─── RFM Segment chip ─────────────────────────────────────────────────────────
const SegmentChip = ({ segment, color }) => (
  <Chip label={segment} size="small" sx={{
    bgcolor: alpha(color, 0.1), color, fontWeight: 700,
    fontSize: "0.62rem", height: 20, border: `1px solid ${alpha(color, 0.3)}`,
  }} />
);

// ─── Score bar ────────────────────────────────────────────────────────────────
const ScoreBar = ({ label, score, max = 5, color }) => {
  const theme = useTheme();
  const c = color || theme.palette.primary.main;
  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <Typography variant="caption" color="text.secondary" sx={{ width: 14, fontWeight: 800 }}>{label}</Typography>
      <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: alpha(c, 0.12), overflow: "hidden" }}>
        <Box sx={{ width: `${(score / max) * 100}%`, height: "100%", bgcolor: c, borderRadius: 3, transition: "width 0.5s" }} />
      </Box>
      <Typography variant="caption" fontWeight={800} color={c} sx={{ width: 14 }}>{score}</Typography>
    </Stack>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const AiInsights = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDark = theme.palette.mode === "dark";
  // axiosInstance handles headers and tokens

    const { palette } = theme;
    const primaryColor = palette.primary.main;

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [lastRefresh, setLastRefresh] = useState(null);

  // Data state
  const [summary, setSummary] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [returnSpike, setReturnSpike] = useState(null);
  const [reorder, setReorder] = useState(null);
  const [bizInsights, setBizInsights] = useState(null);
  const [customers, setCustomers] = useState(null);
  const [productAnalytics, setProductAnalytics] = useState(null);
  const [gstAnalytics, setGstAnalytics] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [discountAnalysis, setDiscountAnalysis] = useState(null);
  const [seasonal, setSeasonal] = useState(null);

  // Controls
  const [forecastMonths, setForecastMonths] = useState(6);
  const [spikeThreshold, setSpikeThreshold] = useState(30);
  const [leadTime, setLeadTime] = useState(7);
  const [cashFlowMonths, setCashFlowMonths] = useState(6);
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [productView, setProductView] = useState("revenue");
  const [customerFilter, setCustomerFilter] = useState("all");

  // ── Fetchers ───────────────────────────────────────────────────────────────
  const setLoad = (k, v) => setLoading((p) => ({ ...p, [k]: v }));
  const setErr = (k, v) => setErrors((p) => ({ ...p, [k]: v }));

  const fetch = useCallback(async (key, url, setter) => {
    setLoad(key, true); setErr(key, null);
    try {
      const { data } = await axiosInstance.get(url);
      setter(data);
    } catch (e) {
      setErr(key, e.response?.data?.error || `Failed to load ${key}`);
    } finally {
      setLoad(key, false);
    }
  }, []);

  const fetchAll = useCallback(() => {
    fetch("summary", "/api/ai-insights/summary", setSummary);
    fetch("forecast", `/api/ai-insights/sales-forecast?months=${forecastMonths}`, setForecast);
    fetch("returnSpike", `/api/ai-insights/return-spike?threshold=${spikeThreshold}`, setReturnSpike);
    fetch("reorder", `/api/ai-insights/reorder-suggestions?lead_time_days=${leadTime}`, setReorder);
    fetch("bizInsights", "/api/ai-insights/business-insights", setBizInsights);
    fetch("customers", "/api/ai-insights/customer-segmentation", setCustomers);
    fetch("products", "/api/ai-insights/product-analytics", setProductAnalytics);
    fetch("gst", "/api/ai-insights/gst-analytics", setGstAnalytics);
    fetch("cashFlow", `/api/ai-insights/cash-flow?months=${cashFlowMonths}`, setCashFlow);
    fetch("discount", "/api/ai-insights/discount-analysis", setDiscountAnalysis);
    fetch("seasonal", "/api/ai-insights/seasonal-trends", setSeasonal);
    setLastRefresh(new Date());
  }, [forecastMonths, spikeThreshold, leadTime, cashFlowMonths]);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (activeTab === 1) fetch("forecast", `/api/ai-insights/sales-forecast?months=${forecastMonths}`, setForecast); }, [forecastMonths]);
  useEffect(() => { if (activeTab === 2) fetch("returnSpike", `/api/ai-insights/return-spike?threshold=${spikeThreshold}`, setReturnSpike); }, [spikeThreshold]);
  useEffect(() => { if (activeTab === 3) fetch("reorder", `/api/ai-insights/reorder-suggestions?lead_time_days=${leadTime}`, setReorder); }, [leadTime]);
  useEffect(() => { if (activeTab === 7) fetch("cashFlow", `/api/ai-insights/cash-flow?months=${cashFlowMonths}`, setCashFlow); }, [cashFlowMonths]);

  const isLoading = (k) => !!loading[k];
  const anyLoading = Object.values(loading).some(Boolean);

  // ── Tab config ────────────────────────────────────────────────────────────
  const TABS = [
    { label: "Overview", icon: <SpeedOutlined fontSize="small" />, accent: theme.palette.primary.main },
    { label: "Forecast", icon: <AutoGraphOutlined fontSize="small" />, accent: "#00bcd4" },
    { label: "Return Alerts", icon: <NotificationsActiveOutlined fontSize="small" />, accent: "#f44336" },
    { label: "Inventory", icon: <InventoryOutlined fontSize="small" />, accent: "#ff9800" },
    { label: "Insights", icon: <LightbulbOutlined fontSize="small" />, accent: "#9c27b0" },
    { label: "Customers", icon: <PeopleAltOutlined fontSize="small" />, accent: "#2196f3" },
    { label: "Products", icon: <BarChartOutlined fontSize="small" />, accent: "#00897b" },
    { label: "Cash Flow", icon: <AccountBalanceWalletOutlined fontSize="small" />, accent: "#4caf50" },
    { label: "GST", icon: <AssessmentOutlined fontSize="small" />, accent: "#7c4dff" },
    { label: "Discounts", icon: <LocalOfferOutlined fontSize="small" />, accent: "#e91e63" },
    { label: "Seasonal", icon: <CalendarMonthOutlined fontSize="small" />, accent: "#ff5722" },
  ];
  const accent = TABS[activeTab]?.accent || theme.palette.primary.main;

  // ── Helper: table skeleton ─────────────────────────────────────────────────
  const TableSkeleton = ({ rows = 5, cols = 5 }) => (
    <Stack spacing={1} sx={{ mt: 1 }}>
      {Array(rows).fill(0).map((_, i) => (
        <Stack key={i} direction="row" spacing={1}>
          {Array(cols).fill(0).map((_, j) => (
            <Skeleton key={j} height={32} sx={{ flex: 1, borderRadius: 1 }} variant="rounded" />
          ))}
        </Stack>
      ))}
    </Stack>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 0: OVERVIEW
  // ══════════════════════════════════════════════════════════════════════════
  const renderOverview = () => (
    <Fade in timeout={400}>
      <Box>
        {/* Hero KPIs */}
        <Grid container spacing={2} sx={{ mb: 2.5, width: '100%' }}>
          {[
            {
              label: "This Month Revenue",
              value: summary ? fmtINR(summary.current_month_revenue) : "—",
              sub: summary?.revenue_growth_pct != null ? pct(summary.revenue_growth_pct) + " vs Last Month" : "No Comparison",
              subType: summary?.revenue_growth_pct >= 0 ? "positive" : "negative",
              icon: <CurrencyRupeeOutlined />, color: theme.palette.primary.main,
              tooltipTitle: "This Month Revenue",
              tooltipDesc: "Total gross revenue collected in the current calendar month, before deductions like returns or discounts.",
            },
            {
              label: "Return Spike",
              value: summary?.return_spike_alert ? "⚠️ Alert" : "✅ Normal",
              sub: "vs last month", subType: summary?.return_spike_alert ? "negative" : "positive",
              icon: <NotificationsActiveOutlined />, color: summary?.return_spike_alert ? "#f44336" : "#00c853",
              tooltipTitle: "Return Spike Status",
              tooltipDesc: "Monitors if product returns have spiked unusually compared to the previous month. An alert means return rate exceeded your set threshold.",
            },
            {
              label: "Out of Stock",
              value: summary?.inventory?.out_of_stock ?? "—",
              sub: `Of ${summary?.inventory?.total_products ?? "—"} Products`,
              subType: (summary?.inventory?.out_of_stock ?? 1) > 0 ? "negative" : "positive",
              icon: <Inventory2Outlined />, color: (summary?.inventory?.out_of_stock ?? 1) > 0 ? "#f44336" : "#00c853",
              tooltipTitle: "Out of Stock Products",
              tooltipDesc: "Number of SKUs with zero sellable stock. These items cannot be fulfilled and may result in lost sales.",
            },
            {
              label: "Pending Dues",
              value: summary ? fmtINR(summary.pending_dues) : "—",
              sub: "Outstanding Advances",
              subType: (summary?.pending_dues ?? 1) > 0 ? "warning" : "positive",
              icon: <AccountBalanceWalletOutlined />, color: (summary?.pending_dues ?? 1) > 0 ? "#ff9800" : "#4caf50",
              tooltipTitle: "Pending Dues",
              tooltipDesc: "Total outstanding receivables from customers who have not yet made full payment. Includes partial payments and advance balances.",
            },
            {
              label: "Transactions",
              value: summary?.transaction_count ?? "—",
              sub: "This Month",
              icon: <FlashOn />, color: "#00bcd4",
              tooltipTitle: "Transaction Count",
              tooltipDesc: "Total number of sales invoices processed in the current month. Useful to track business activity and volume.",
            },
            {
              label: "Low Stock",
              value: summary?.inventory?.low_stock ?? "—",
              sub: "Need Restocking",
              subType: (summary?.inventory?.low_stock ?? 0) > 0 ? "warning" : "positive",
              icon: <ReportProblem />, color: "#ff9800",
              tooltipTitle: "Low Stock Items",
              tooltipDesc: "Products that are running low and need to be restocked soon before reaching zero. Based on your set reorder point threshold.",
            },
            {
              label: "Today's Revenue",
              value: summary ? fmtINR(summary.today_revenue) : "—",
              sub: `${summary?.today_transactions || 0} Transactions`,
              icon: <FlashOn />, color: "#4caf50",
              tooltipTitle: "Today's Revenue",
              tooltipDesc: "Total gross revenue collected today across all bills and invoices.",
            },
            {
              label: "Yesterday's Revenue",
              value: summary ? fmtINR(summary.yesterday_revenue) : "—",
              sub: `${summary?.yesterday_transactions || 0} Transactions`,
              icon: <CalendarMonthOutlined />, color: "#78909c",
              tooltipTitle: "Yesterday's Revenue",
              tooltipDesc: "Total gross revenue collected yesterday.",
            },
          ].map((k, i) => (
            <Grid item xs={6} sm={4} md={2} key={i} sx={{width: {xs: '100%', sm: '48%', md: '30%', lg: '15%'}}}>
              <StyledTooltip
                title={<TooltipContent title={k.tooltipTitle} description={k.tooltipDesc} accent={k.color} />}
                arrow
                placement="top"
                enterDelay={300}
              >
                <Box sx={{ height: '100%' }}>
                  <KpiCard {...k} loading={isLoading("summary")} />
                </Box>
              </StyledTooltip>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2} sx={{ mb: 2.5, width: '100%' }}>
          {/* Health Score */}
          <Grid item xs={12} sm={6} md={3} sx={{width: {xs: '100%', sm: '100%', md: '38%', lg: '38%'}}}>
            <StyledTooltip
              title={<TooltipContent title="Business Health Score" description="A composite score (0–100) reflecting overall business performance based on revenue, return rate, inventory turnover, and customer activity. Higher is better." accent="#00c853" />}
              arrow
              placement="top"
              enterDelay={300}
            >
              <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3, height: "100%", cursor: "default" }}>
                <CardContent>
                  <SectionHeader
                    icon={<HealthAndSafety />}
                    title="Business Health"
                    accent="#00c853"
                  />
                  {isLoading("bizInsights") ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                      <CircularProgress size={80} />
                    </Box>
                  ) : bizInsights ? (
                    <>
                      <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                        <HealthGauge score={bizInsights.health_score.score} label={bizInsights.health_score.label} />
                      </Box>
                      <Divider sx={{ mb: 1.5 }} />
                      <Stack spacing={0.8}>
                        {[
                          { label: "Transactions", value: bizInsights.kpis.transaction_count, tip: "Total invoices this period" },
                          { label: "Avg. Order", value: fmtINR(bizInsights.kpis.avg_order_value), tip: "Mean order value per transaction" },
                          { label: "Return Rate", value: `${bizInsights.kpis.return_rate_pct}%`, tip: "Percentage of revenue returned" },
                          { label: "Inv. Turnover", value: `${bizInsights.kpis.inventory_turnover}x`, tip: "How many times inventory was sold and restocked" },
                          { label: "Unique Customers", value: bizInsights.kpis.unique_customers, tip: "Distinct buyers this period" },
                        ].map(({ label, value, tip }) => (
                          <StyledTooltip key={label} title={<TooltipContent title={label} description={tip} accent="#00c853" />} arrow placement="left" enterDelay={300}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ cursor: "default" }}>
                              <Typography variant="caption" color="text.secondary" sx={{ borderBottom: "1px dashed", borderColor: "divider" }}>{label}</Typography>
                              <Typography variant="caption" fontWeight={800}>{value}</Typography>
                            </Stack>
                          </StyledTooltip>
                        ))}
                      </Stack>
                    </>
                  ) : <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>No data</Typography>}
                </CardContent>
              </Card>
            </StyledTooltip>
          </Grid>

          {/* Revenue KPIs + bar chart */}
          <Grid item xs={12} sm={6} md={5} sx={{width: {xs: '100%', sm: '100%', md: '59%', lg: '60%'}}}>
            <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3, height: "100%" }}>
              <CardContent>
                <SectionHeader
                  icon={<CurrencyRupeeOutlined />}
                  title="Revenue Breakdown"
                  subtitle={bizInsights?.period?.label}
                  accent={theme.palette.primary.main}
                />
                {isLoading("bizInsights") ? (
                  <Grid container spacing={1.5}>{Array(6).fill(0).map((_, i) => <Grid item xs={6} key={i}><Skeleton height={58} variant="rounded" /></Grid>)}</Grid>
                ) : bizInsights ? (
                  <>
                    <Grid container spacing={1.5} sx={{ mb: 2 }}>
                      {[
                        { l: "Gross Revenue", v: fmtINR(bizInsights.kpis.gross_revenue), c: theme.palette.primary.main, tip: "Total revenue before any deductions" },
                        { l: "Net Revenue", v: fmtINR(bizInsights.kpis.net_revenue), c: "#00bcd4", tip: "Revenue after returns and discounts are removed" },
                        { l: "GST Collected", v: fmtINR(bizInsights.kpis.gst_collected), c: "#7c4dff", tip: "Total GST amount billed to customers" },
                        { l: "Discounts", v: fmtINR(bizInsights.kpis.total_discount), c: "#ff9800", tip: "Total discount value given across all invoices" },
                        { l: "Returns", v: fmtINR(bizInsights.kpis.total_returns), c: "#f44336", tip: "Value of goods returned by customers this period" },
                        { l: "Pending Dues", v: fmtINR(bizInsights.kpis.pending_dues), c: "#ff5722", tip: "Amount still owed by customers but not yet collected" },
                      ].map((k) => (
                        <Grid item xs={6} key={k.l} sx={{width: {xs: '48%', sm: '30%', md: '20%'}}}>
                          <StyledTooltip
                            title={<TooltipContent title={k.l} description={k.tip} accent={k.c} />}
                            arrow placement="top" enterDelay={200}
                          >
                            <Box sx={{ p: 1.2, borderRadius: 1.5, background: alpha(k.c, 0.07), border: `1px solid ${alpha(k.c, 0.18)}`, cursor: "default",
                              transition: "box-shadow 0.15s", "&:hover": { boxShadow: `0 2px 10px ${alpha(k.c, 0.2)}` } }}>
                              <Typography variant="caption" color="text.secondary" display="block" fontWeight={600} fontSize="0.62rem">{k.l}</Typography>
                              <Typography variant="subtitle2" fontWeight={900} color={k.c}>{k.v}</Typography>
                            </Box>
                          </StyledTooltip>
                        </Grid>
                      ))}
                    </Grid>
                    <Card elevation={0} sx={{ mt: 2, border: `1px solid ${alpha("#ff9800", 0.28)}`, borderRadius: 3, height: "100%", background: alpha("#ff9800", 0.03) }}>
                      <CardContent>
                        <SectionHeader
                          icon={<TaskAlt />}
                          title="Action Items"
                          subtitle="Prioritized tasks"
                          accent="#ff9800"
                        />
                        {isLoading("bizInsights") ? <Stack spacing={1}>{Array(4).fill(0).map((_, i) => <Skeleton key={i} height={48} variant="rounded" />)}</Stack>
                          : bizInsights?.action_items?.length > 0 ? (
                            <Stack spacing={1.2}>
                              {bizInsights.action_items.map((a, i) => (
                                <StyledTooltip
                                  key={i}
                                  title={<TooltipContent title={`Priority ${a.priority}`} description={a.action} accent="#ff9800" />}
                                  arrow placement="top" enterDelay={200}
                                >
                                  <Stack direction="row" gap={1.2} alignItems="flex-start" sx={{ cursor: "default" }}>
                                    <Avatar sx={{ width: 24, height: 24, fontSize: 11, fontWeight: 900, bgcolor: alpha("#ff9800", 0.14), color: "#ff9800", flexShrink: 0 }}>{a.priority}</Avatar>
                                    <Typography variant="body2" color="text.primary" lineHeight={1.5}>{a.action}</Typography>
                                  </Stack>
                                </StyledTooltip>
                              ))}
                            </Stack>
                          ) : <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>No critical actions required ✅</Typography>}
                      </CardContent>
                    </Card>
                    {forecast?.historical?.length > 0 && (
                      <>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>6-Month Revenue Trend</Typography>
                        <SparkBar data={forecast.historical.map((h) => ({ value: h.total_sales, month: h.month }))} valueKey="value" color={theme.palette.primary.main} height={44} />
                      </>
                    )}
                  </>
                ) : null}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick insights strip */}
        {bizInsights?.insights && (
          <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3 }}>
            <CardContent>
              <SectionHeader
                icon={<LightbulbOutlined />}
                title="Key Insights"
                subtitle={`${bizInsights.insights.length} insights for ${bizInsights.period?.label}`}
                accent="#ff9800"
              />
              <Grid container spacing={1.5}>
                {bizInsights.insights.slice(0, 6).map((ins, i) => (
                  <Grid item xs={12} sm={6} md={4} key={i} sx={{width: {xs: '100%', sm: '48%'}}}>
                    <InsightPill insight={ins} />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>
    </Fade>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 1: FORECAST
  // ══════════════════════════════════════════════════════════════════════════
  const renderForecast = () => (
    <Fade in timeout={400}>
      <Box>
        <Stack direction="row" alignItems="center" gap={2} sx={{ mb: 3, flexWrap: "wrap" }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>Lookback:</Typography>
          <ButtonGroup size="small" variant="outlined">
            {[3, 4, 5, 6, 9, 12].map((m) => (
              <Button key={m} onClick={() => setForecastMonths(m)}
                variant={forecastMonths === m ? "contained" : "outlined"} sx={{ minWidth: 42 }}>
                {m}mo
              </Button>
            ))}
          </ButtonGroup>
          {isLoading("forecast") && <CircularProgress size={16} thickness={5} />}
        </Stack>

        {errors.forecast && <Alert severity="error" sx={{ mb: 2 }}>{errors.forecast}</Alert>}

        {isLoading("forecast") ? (
          <Grid container spacing={2}>{Array(4).fill(0).map((_, i) => <Grid item xs={6} sm={3} key={i}><Skeleton height={110} variant="rounded" /></Grid>)}</Grid>
        ) : forecast?.forecast ? (
          <>
            {/* Forecast hero */}
           <Grid
  container
  spacing={2}
  alignItems="stretch"
  sx={{ mb: 2.5, width: "100%" }}
>
  {/* LEFT CARD */}
  <Grid
    item
    xs={12}
    sm={6}
    md={4}
    sx={{
      width: { xs: "100%", sm: "100%", md: "48%", lg: "33%" },
      display: "flex"
    }}
  >
    <StyledTooltip
      title={
        <TooltipContent
          title="Predicted Revenue"
          description="Blended forecast for next month using 4 algorithms: SMA (15%), WMA (35%), Linear Regression (30%), and Exponential Smoothing (20%)."
          accent="#00bcd4"
          icon={<AutoGraphOutlined />}
        />
      }
      arrow
      placement="top"
      enterDelay={200}
    >
      <Card
        elevation={0}
        sx={{
          height: "100%",
          width: "100%",
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(
            "#00bcd4",
            0.12
          )}, ${alpha("#00bcd4", 0.04)})`,
          border: `1px solid ${alpha("#00bcd4", 0.3)}`,
          cursor: "help",
          transition: "box-shadow 0.2s",
          "&:hover": {
            boxShadow: `0 4px 20px ${alpha("#00bcd4", 0.2)}`
          }
        }}
      >
        <CardContent
          sx={{
            textAlign: "center",
            py: 3,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center"
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={700}
            textTransform="uppercase"
            letterSpacing={0.6}
            display="block"
          >
            Predicted Revenue
          </Typography>

          <Typography
            variant="h3"
            fontWeight={900}
            color="#00bcd4"
            sx={{ my: 1 }}
          >
            {fmtINR(forecast.forecast.predicted_revenue)}
          </Typography>

          <Stack direction="row" justifyContent="center" gap={1} sx={{ mb: 1 }}>
            <Chip
              icon={
                forecast.forecast.trend_direction === "upward" ? (
                  <TrendingUp fontSize="small" />
                ) : forecast.forecast.trend_direction === "downward" ? (
                  <TrendingDown fontSize="small" />
                ) : (
                  <TrendingFlat fontSize="small" />
                )
              }
              label={forecast.forecast.trend_direction}
              size="small"
              sx={{
                bgcolor: alpha(
                  forecast.forecast.trend_direction === "upward"
                    ? "#00c853"
                    : forecast.forecast.trend_direction === "downward"
                    ? "#d50000"
                    : "#78909c",
                  0.12
                ),
                color:
                  forecast.forecast.trend_direction === "upward"
                    ? "#00c853"
                    : forecast.forecast.trend_direction === "downward"
                    ? "#d50000"
                    : "#78909c",
                fontWeight: 800
              }}
            />
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Range: {fmtINR(forecast.forecast.lower_bound)} –{" "}
            {fmtINR(forecast.forecast.upper_bound)}
          </Typography>

          <br />

          <Typography variant="caption" color="text.secondary">
            Target month: {forecast.forecast.month}
          </Typography>
        </CardContent>
      </Card>
    </StyledTooltip>
  </Grid>

  {/* RIGHT CARD */}
  <Grid
    item
    xs={12}
    sm={6}
    md={8}
    sx={{
      width: { xs: "100%", sm: "100%", md: "48%", lg: "65%" },
      display: "flex"
    }}
  >
    <Card
      elevation={0}
      sx={{
        height: "100%",
        width: "100%",
        border: `2px solid ${primaryColor}`,
        borderRadius: 3
      }}
    >
      <CardContent>
        <SectionHeader
          icon={<AutoGraphOutlined />}
          title="Forecast Methods"
          subtitle="4 algorithms blended for best accuracy"
          accent="#00bcd4"
          tooltipTitle="Forecast Algorithm Blend"
          tooltipDesc="Revenue is predicted by combining 4 statistical methods. Each uses a different weighting to balance recency, trend, and stability."
        />

        <Grid container spacing={1.5}>
          {[
            {
              l: "Simple Moving Avg",
              v: fmtINR(forecast.forecast.sma_forecast),
              pct: "15% weight",
              c: "#607d8b",
              tip: "Averages revenue equally across all historical months. Good baseline, ignores trends."
            },
            {
              l: "Weighted Moving Avg",
              v: fmtINR(forecast.forecast.wma_forecast),
              pct: "35% weight",
              c: "#9c27b0",
              tip: "Gives more weight to recent months."
            },
            {
              l: "Linear Regression",
              v: fmtINR(forecast.forecast.linear_trend_forecast),
              pct: "30% weight",
              c: "#ff5722",
              tip: "Fits a trend line through historical data."
            },
            {
              l: "Exponential Smooth.",
              v: fmtINR(forecast.forecast.exponential_forecast),
              pct: "20% weight",
              c: "#ff9800",
              tip: "Uses exponential decay weighting."
            }
          ].map((m) => (
            <Grid
              item
              xs={6}
              sm={3}
              key={m.l}
              sx={{
                width: { xs: "100%", sm: "48%", md: "32%", lg: "22%" }
              }}
            >
              <StyledTooltip
                title={
                  <TooltipContent
                    title={m.l}
                    description={m.tip}
                    accent={m.c}
                  />
                }
                arrow
                placement="top"
                enterDelay={200}
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    background: alpha(m.c, 0.06),
                    border: `1px solid ${alpha(m.c, 0.18)}`,
                    textAlign: "center",
                    cursor: "help",
                    transition: "box-shadow 0.15s",
                    "&:hover": {
                      boxShadow: `0 2px 10px ${alpha(m.c, 0.2)}`
                    }
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    fontWeight={600}
                    fontSize="0.65rem"
                  >
                    {m.l}
                  </Typography>

                  <Typography variant="h6" fontWeight={900} color={m.c}>
                    {m.v}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    {m.pct}
                  </Typography>
                </Box>
              </StyledTooltip>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  </Grid>
</Grid>

            {/* Confidence + Trend */}
<Grid
  container
  spacing={2}
  alignItems="stretch"
  sx={{ mb: 2.5, width: "100%" }}
>
  {/* CARD 1 */}
  <Grid
    item
    xs={12}
    sm={6}
    md={4}
    sx={{
      width: { xs: "100%", sm: "100%", md: "48%", lg: "33%" },
      display: "flex",
    }}
  >
    <Card
      elevation={0}
      sx={{
        border: `2px solid ${primaryColor}`,
        borderRadius: 3,
        width: "100%",
        height: "100%",
        display: "flex",
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
        }}
      >
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={800}>
            Prediction Confidence
          </Typography>

          <CardInfoTooltip
            title="Prediction Confidence"
            description="How reliable the forecast is, based on data consistency and volatility. Higher confidence means more stable historical data and a more accurate prediction."
            accent="#00bcd4"
            icon={<AutoGraphOutlined />}
          />
        </Stack>

        <Stack direction="row" alignItems="center" gap={2} sx={{ mt: 1 }}>
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant="determinate"
              value={forecast.forecast.confidence_score}
              sx={{
                height: 10,
                borderRadius: 5,
                bgcolor: alpha(theme.palette.divider, 0.3),
                "& .MuiLinearProgress-bar": {
                  borderRadius: 5,
                  bgcolor:
                    forecast.forecast.confidence_score >= 70
                      ? "#00c853"
                      : forecast.forecast.confidence_score >= 50
                      ? "#ff9800"
                      : "#f44336",
                },
              }}
            />

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, display: "block" }}
            >
              Based on {forecast.forecast.months_analyzed} months · Volatility:{" "}
              {forecast.analytics?.revenue_volatility}%
            </Typography>
          </Box>

          <Typography
            variant="h5"
            fontWeight={900}
            color={
              forecast.forecast.confidence_score >= 70
                ? "#00c853"
                : "#ff9800"
            }
          >
            {forecast.forecast.confidence_score}%
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  </Grid>

  {/* CARD 2 */}
  <Grid
    item
    xs={12}
    sm={6}
    md={4}
    sx={{
      width: { xs: "100%", sm: "100%", md: "48%", lg: "32%" },
      display: "flex",
    }}
  >
    <Card
      elevation={0}
      sx={{
        border: `2px solid ${primaryColor}`,
        borderRadius: 3,
        width: "100%",
        height: "100%",
        display: "flex",
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
        }}
      >
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={800}>
            Trend Rate
          </Typography>

          <CardInfoTooltip
            title="Monthly Trend Rate"
            description="The average percentage growth or decline per month based on your historical data. A positive trend means your revenue is growing month over month."
            accent="#00bcd4"
            icon={<TrendingUp />}
          />
        </Stack>

        <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1 }}>
          {forecast.forecast.trend_direction === "upward" ? (
            <ArrowUpward sx={{ color: "#00c853", fontSize: 28 }} />
          ) : forecast.forecast.trend_direction === "downward" ? (
            <ArrowDownward sx={{ color: "#d50000", fontSize: 28 }} />
          ) : (
            <TrendingFlat sx={{ color: "#78909c", fontSize: 28 }} />
          )}

          <Box>
            <Typography
              variant="h5"
              fontWeight={900}
              color={
                forecast.forecast.trend_direction === "upward"
                  ? "#00c853"
                  : forecast.forecast.trend_direction === "downward"
                  ? "#d50000"
                  : "#78909c"
              }
            >
              {pct(forecast.forecast.trend_pct_per_month)}/mo
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Average monthly growth rate
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  </Grid>

  {/* CARD 3 */}
  <Grid
    item
    xs={12}
    sm={6}
    md={4}
    sx={{
      width: { xs: "100%", sm: "100%", md: "48%", lg: "32%" },
      display: "flex",
    }}
  >
    <Card
      elevation={0}
      sx={{
        border: `2px solid ${primaryColor}`,
        borderRadius: 3,
        width: "100%",
        height: "100%",
        display: "flex",
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
        }}
      >
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={800}>
            Best vs Worst Month
          </Typography>

          <CardInfoTooltip
            title="Best vs Worst Month"
            description="Highlights the highest and lowest revenue months in your selected lookback period along with the average, helping identify seasonal peaks and troughs."
            accent={primaryColor}
            icon={<BarChartOutlined />}
          />
        </Stack>

        <Stack spacing={0.5} sx={{ mt: 1 }}>
          <Stack direction="row" justifyContent="space-between">
            <Stack direction="row" alignItems="center" gap={0.5}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "#00c853",
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Best: {forecast.analytics.best_month.month}
              </Typography>
            </Stack>

            <Typography
              variant="caption"
              fontWeight={800}
              color="#00c853"
            >
              {fmtINR(forecast.analytics.best_month.revenue)}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between">
            <Stack direction="row" alignItems="center" gap={0.5}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "#f44336",
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Worst: {forecast.analytics.worst_month.month}
              </Typography>
            </Stack>

            <Typography
              variant="caption"
              fontWeight={800}
              color="#f44336"
            >
              {fmtINR(forecast.analytics.worst_month.revenue)}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              Avg Monthly
            </Typography>

            <Typography variant="caption" fontWeight={800}>
              {fmtINR(forecast.analytics.avg_monthly_revenue)}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  </Grid>
</Grid>

            {/* Historical table + chart */}
            <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3 }}>
              <CardContent>
                <SectionHeader
                  icon={<BarChartOutlined />}
                  title={`Historical Data (${forecastMonths} months)`}
                  accent="#00bcd4"
                  tooltipTitle="Historical Sales Data"
                  tooltipDesc="Month-by-month breakdown of your actual sales. This data is used as the foundation for all forecast calculations."
                />
                <SparkBar data={forecast.historical.map((h) => ({ value: h.total_sales, month: h.month }))} valueKey="value" color="#00bcd4" height={60} />
                <Stack direction="row" sx={{ mt: 0.5, mb: 2 }}>
                  {forecast.historical.map((h, i) => (
                    <Typography key={i} variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: "center", fontSize: "0.6rem" }}>{h.month.slice(5)}</Typography>
                  ))}
                </Stack>

                <TableContainer sx={{overflowX: "auto",
          "&::-webkit-scrollbar": { height: 6, width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: primaryColor,
            borderRadius: 4,
          },}}>
                  <Table size="small" sx={{minWidth: '1000px'}}>
                    <TableHead>
                      <TableRow>
                        {["Month", "Revenue", "GST", "Transactions", "Avg. Order", "Discount", "MoM Growth"].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.7rem", color: "text.secondary", bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#000", 0.02) }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {forecast.historical.map((r, i) => {
                        const growth = forecast.analytics.growth_rates.find((g) => g.month === r.month);
                        return (
                          <TableRow key={i} hover>
                            <TableCell sx={{ fontSize: "0.75rem", fontWeight: 600 }}>{r.month}</TableCell>
                            <TableCell sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#00bcd4" }}>{fmtINR(r.total_sales)}</TableCell>
                            <TableCell sx={{ fontSize: "0.75rem" }}>{fmtINR(r.total_gst)}</TableCell>
                            <TableCell sx={{ fontSize: "0.75rem" }}>{r.total_docs}</TableCell>
                            <TableCell sx={{ fontSize: "0.75rem" }}>{fmtINR(r.avg_order)}</TableCell>
                            <TableCell sx={{ fontSize: "0.75rem" }}>{fmtINR(r.total_discount)}</TableCell>
                            <TableCell sx={{ fontSize: "0.75rem" }}>
                              {growth?.growth_pct != null ? (
                                <Chip label={pct(growth.growth_pct)} size="small" sx={{
                                  height: 18, fontSize: "0.6rem", fontWeight: 800,
                                  bgcolor: alpha(growth.growth_pct >= 0 ? "#00c853" : "#f44336", 0.1),
                                  color: growth.growth_pct >= 0 ? "#00c853" : "#f44336",
                                }} />
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </>
        ) : (
          <Alert severity="info">Insufficient data for forecast. At least 2 months of sales history required.</Alert>
        )}
      </Box>
    </Fade>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 2: RETURN ALERTS
  // ══════════════════════════════════════════════════════════════════════════
  const renderReturns = () => (
    <Fade in timeout={400}>
      <Box>
        <Stack direction="row" alignItems="center" gap={2} sx={{ mb: 3, flexWrap: "wrap" }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>Spike Threshold:</Typography>
          <ButtonGroup size="small" variant="outlined">
            {[20, 30, 50, 75, 100].map((t) => (
              <Button key={t} onClick={() => setSpikeThreshold(t)}
                variant={spikeThreshold === t ? "contained" : "outlined"} color="error">
                &gt;{t}%
              </Button>
            ))}
          </ButtonGroup>
          {isLoading("returnSpike") && <CircularProgress size={16} thickness={5} />}
        </Stack>

        {errors.returnSpike && <Alert severity="error" sx={{ mb: 2 }}>{errors.returnSpike}</Alert>}

        {isLoading("returnSpike") ? <Skeleton height={300} variant="rounded" /> : returnSpike ? (
          <>
            <Alert severity={returnSpike.alert_triggered ? "error" : "success"}
              icon={returnSpike.alert_triggered ? <ReportProblem /> : <CheckCircleOutline />}
              sx={{ mb: 3, borderRadius: 2, fontWeight: 700 }}>
              {returnSpike.summary_message}
            </Alert>

            {/* Summary stats */}
            <Grid container spacing={2} sx={{ mb: 2.5, width: '100%' }}>
              {[
                { l: "Total Spikes", v: returnSpike.spikes.length, c: returnSpike.spikes.length > 0 ? "#f44336" : "#00c853",
                  tip: "Number of months where return rate exceeded your configured spike threshold." },
                { l: "Recovery Rate", v: `${returnSpike.recovery_rate_pct}%`, c: returnSpike.recovery_rate_pct > 60 ? "#00c853" : "#ff9800",
                  tip: "Percentage of returned items that were recovered, restocked, or resold." },
                { l: "Return Incidents", v: returnSpike.top_returned_products?.reduce((a, b) => a + b.incidents, 0) ?? 0, c: "#ff9800",
                  tip: "Total number of individual return events across all products in the last 3 months." },
                { l: "Problematic Products", v: returnSpike.top_returned_products?.length ?? 0, c: "#f44336",
                  tip: "Number of products with consistently high return rates that need attention." },
              ].map((k) => (
                <Grid item xs={6} sm={3} key={k.l} sx={{width: {xs: '100%', sm: '48%', md: '38%', lg: '20%'}}}>
                  <StyledTooltip title={<TooltipContent title={k.l} description={k.tip} accent={k.c} />} arrow placement="top" enterDelay={200}>
                    <Box sx={{ p: 1.5, textAlign: "center", borderRadius: 2, border: `1px solid ${alpha(k.c, 0.2)}`, background: alpha(k.c, 0.06), cursor: "help",
                      transition: "box-shadow 0.15s", "&:hover": { boxShadow: `0 2px 12px ${alpha(k.c, 0.2)}` } }}>
                      <Typography variant="h5" fontWeight={900} color={k.c}>{k.v}</Typography>
                      <Typography variant="caption" color="text.secondary">{k.l}</Typography>
                    </Box>
                  </StyledTooltip>
                </Grid>
              ))}
            </Grid>

            {/* Return vs Sales trend */}
            {returnSpike.return_vs_sales?.length > 0 && (
              <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3, mb: 2.5 }}>
                <CardContent>
                  <SectionHeader
                    icon={<BarChartOutlined />}
                    title="Return Rate vs Sales"
                    subtitle="6-month comparison"
                    accent="#f44336"
                    tooltipTitle="Return Rate vs Sales"
                    tooltipDesc="Compares monthly return value against total sales. A growing gap between these two lines is a positive sign. Months marked 'Spike' exceeded your threshold."
                  />
                  <TableContainer sx={{"&::-webkit-scrollbar": { height: 6, width: '4px' },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: primaryColor,
            borderRadius: 4,
          },}}>
                    <Table size="small" sx={{minWidth: '600px'}}>
                      <TableHead>
                        <TableRow>
                          {["Month", "Sales Value", "Return Value", "Return Rate %", "Status"].map((h) => (
                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.7rem", color: "text.secondary" }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {returnSpike.return_vs_sales.map((r, i) => (
                          <TableRow key={i} hover>
                            <TableCell sx={{ fontSize: "0.75rem", fontWeight: 600 }}>{r.month}</TableCell>
                            <TableCell sx={{ fontSize: "0.75rem" }}>{fmtINR(r.sales_value)}</TableCell>
                            <TableCell sx={{ fontSize: "0.75rem", color: "#f44336", fontWeight: 700 }}>{fmtINR(r.return_value)}</TableCell>
                            <TableCell>
                              <Chip label={`${r.return_rate_pct}%`} size="small" sx={{
                                height: 18, fontSize: "0.65rem", fontWeight: 800,
                                bgcolor: alpha(r.return_rate_pct > 10 ? "#f44336" : r.return_rate_pct > 5 ? "#ff9800" : "#00c853", 0.1),
                                color: r.return_rate_pct > 10 ? "#f44336" : r.return_rate_pct > 5 ? "#ff9800" : "#00c853",
                              }} />
                            </TableCell>
                            <TableCell>
                              {returnSpike.spikes.find((s) => s.month === r.month) ? (
                                <Chip label="⚠️ Spike" size="small" color="error" variant="outlined" sx={{ height: 18, fontSize: "0.62rem" }} />
                              ) : <Typography variant="caption" color="#00c853">Normal</Typography>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Top returned products */}
            {returnSpike.top_returned_products?.length > 0 && (
              <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3 }}>
                <CardContent>
                  <SectionHeader
                    icon={<ReportProblem />}
                    title="Top Returned Products"
                    subtitle="Last 3 months"
                    accent="#f44336"
                    tooltipTitle="Top Returned Products"
                    tooltipDesc="Products with the highest return volumes in the last 90 days. Risk level is based on return frequency and value. Review quality or description accuracy for these items."
                  />
                  <TableContainer sx={{"&::-webkit-scrollbar": { height: 6, width: '4px' },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: primaryColor,
            borderRadius: 4,
          },}}>
                    <Table size="small" sx={{minWidth: '1000px'}}>
                      <TableHead>
                        <TableRow>
                          {["Product", "Category", "Incidents", "Qty Returned", "Return Value", "Avg Rate", "Risk", "Reasons"].map((h) => (
                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.7rem", color: "text.secondary" }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {returnSpike.top_returned_products.map((p, i) => (
                          <TableRow key={i} hover>
                            <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>{p.product_name}</TableCell>
                            <TableCell sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{p.category}</TableCell>
                            <TableCell sx={{ fontSize: "0.75rem" }}>{p.incidents}</TableCell>
                            <TableCell sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#f44336" }}>{p.total_qty}</TableCell>
                            <TableCell sx={{ fontSize: "0.75rem" }}>{fmtINR(p.total_value)}</TableCell>
                            <TableCell sx={{ fontSize: "0.75rem" }}>{fmtINR(p.avg_rate)}</TableCell>
                            <TableCell>
                              <Chip label={p.risk_level} size="small" sx={{
                                height: 18, fontSize: "0.62rem", fontWeight: 800,
                                bgcolor: alpha(p.risk_level === "critical" ? "#d50000" : p.risk_level === "high" ? "#f44336" : "#ff9800", 0.1),
                                color: p.risk_level === "critical" ? "#d50000" : p.risk_level === "high" ? "#f44336" : "#ff9800",
                              }} />
                            </TableCell>
                            <TableCell sx={{ fontSize: "0.7rem", color: "text.secondary", maxWidth: 160 }}>
                              <Tooltip title={p.reasons?.join(" | ") || "No reason recorded"} arrow>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "block", whiteSpace: "nowrap" }}>
                                  {p.reasons?.slice(0, 1).join("") || "—"}
                                </span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </Box>
    </Fade>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 3: INVENTORY
  // ══════════════════════════════════════════════════════════════════════════
  const renderInventory = () => {
    const filtered = reorder?.suggestions?.filter((s) =>
      inventoryFilter === "all" ? true : s.status === inventoryFilter || s.mover_type === inventoryFilter
    ) || [];
    return (
      <Fade in timeout={400}>
        <Box>
          <Stack direction={{ xs: "column", sm: "row" }} gap={2} sx={{ mb: 3, flexWrap: "wrap" }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>Lead Time:</Typography>
              <ButtonGroup size="small" variant="outlined">
                {[3, 5, 7, 10, 14, 21].map((d) => (
                  <Button key={d} onClick={() => setLeadTime(d)} variant={leadTime === d ? "contained" : "outlined"} color="warning">{d}d</Button>
                ))}
              </ButtonGroup>
            </Stack>
            {isLoading("reorder") && <CircularProgress size={16} thickness={5} />}
          </Stack>

          {errors.reorder && <Alert severity="error" sx={{ mb: 2 }}>{errors.reorder}</Alert>}

          {isLoading("reorder") ? <Skeleton height={300} variant="rounded" /> : reorder ? (
            <>
              <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                {[
                  { l: "Out of Stock", v: reorder.summary.out_of_stock, c: "#d50000", filter: "out_of_stock",
                    tip: "Products with zero available units. Immediate restocking needed to avoid lost sales." },
                  { l: "Critical", v: reorder.summary.critical, c: "#f44336", filter: "critical",
                    tip: "Stock will run out within your lead time window. Order now to prevent stockouts." },
                  { l: "Reorder Soon", v: reorder.summary.reorder_soon, c: "#ff9800", filter: "reorder_soon",
                    tip: "Stock levels are below reorder point. Plan purchases within the next few days." },
                  { l: "Slow Moving", v: reorder.summary.slow_moving, c: "#8bc34a", filter: "slow_moving",
                    tip: "Products with low sales velocity. Consider promotions or bundling to clear inventory." },
                  { l: "Sufficient", v: reorder.summary.sufficient, c: "#4caf50", filter: "sufficient",
                    tip: "Healthy stock levels relative to current demand. No immediate action needed." },
                  { l: "Fast Movers", v: reorder.summary.fast_movers, c: "#00c853", filter: "fast",
                    tip: "Top-selling products with high daily sales velocity. Ensure consistent stock availability." },
                  { l: "Dead Stock", v: reorder.summary.dead_stock, c: "#607d8b", filter: "no_movement",
                    tip: "Products with zero sales in the last 90 days. Consider clearance or write-off." },
                  { l: "Stock Value", v: fmtINR(reorder.summary.total_stock_value), c: theme.palette.primary.main, filter: "all",
                    tip: "Total cost value of all current inventory at purchase/transfer price." },
                ].map((s) => (
                  <Grid item xs={4} sm={3} md={1.5} key={s.l} sx={{width: {xs: '100%', sm: '48%', md: '38%', lg: '20%'}}}>
                    <StyledTooltip title={<TooltipContent title={s.l} description={s.tip} accent={s.c} />} arrow placement="top" enterDelay={200}>
                      <Box onClick={() => setInventoryFilter(inventoryFilter === s.filter ? "all" : s.filter)}
                        sx={{
                          p: 1.2, textAlign: "center", borderRadius: 2, cursor: "pointer",
                          border: `2px solid ${inventoryFilter === s.filter ? s.c : alpha(s.c, 0.2)}`,
                          background: alpha(s.c, inventoryFilter === s.filter ? 0.12 : 0.05),
                          transition: "all 0.15s",
                          "&:hover": { border: `2px solid ${s.c}`, background: alpha(s.c, 0.1) },
                        }}>
                        <Typography variant={s.v?.toString().length > 6 ? "caption" : "h6"} fontWeight={900} color={s.c}>{s.v}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.6rem" }}>{s.l}</Typography>
                      </Box>
                    </StyledTooltip>
                  </Grid>
                ))}
              </Grid>

              <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3 }}>
                <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                  <Box sx={{ p: 2 }}>
                    <SectionHeader
                      icon={<LocalShippingOutlined />}
                      title={`Inventory Suggestions (${filtered.length})`}
                      subtitle={inventoryFilter !== "all" ? `Filtered: ${inventoryFilter}` : `Lead time: ${leadTime}d`}
                      accent="#ff9800"
                      tooltipTitle="Inventory Reorder Suggestions"
                      tooltipDesc="AI-generated reorder recommendations for each product based on daily sales velocity, current stock, lead time, and reorder point calculations."
                    />
                  </Box>
                  <TableContainer sx={{ maxHeight: 500, overflowX: "auto",
          "&::-webkit-scrollbar": { height: 6, width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: primaryColor,
            borderRadius: 4,
          }, }}>
                    <Table stickyHeader size="small" sx={{minWidth: '1200px', p: 2}}>
                      <TableHead>
                        <TableRow>
                          {["Product", "Category", "Stock", "Sellable", "Daily Sales", "Days Left", "Reorder Pt.", "Suggest Qty", "Stock Value", "Return %", "Status", "Mover"].map((h) => (
                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.68rem", color: "text.secondary", bgcolor: isDark ? alpha("#fff", 0.04) : alpha("#000", 0.03), whiteSpace: "nowrap" }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filtered.slice(0, 80).map((s, i) => (
                          <TableRow key={i} hover sx={{ opacity: s.status === "sufficient" ? 0.65 : 1 }}>
                            <TableCell sx={{ fontSize: "0.73rem", fontWeight: 700, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Tooltip title={s.product_name}><span>{s.product_name}</span></Tooltip></TableCell>
                            <TableCell sx={{ fontSize: "0.7rem", color: "text.secondary" }}>{s.category || "—"}</TableCell>
                            <TableCell sx={{ fontSize: "0.73rem", fontWeight: 700 }}>{s.current_stock}</TableCell>
                            <TableCell sx={{ fontSize: "0.73rem" }}>{s.sellable_stock}</TableCell>
                            <TableCell sx={{ fontSize: "0.73rem" }}>{s.avg_daily_sales > 0 ? s.avg_daily_sales : "—"}</TableCell>
                            <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700, color: s.days_remaining !== null && s.days_remaining <= leadTime ? "#f44336" : s.days_remaining !== null && s.days_remaining <= 14 ? "#ff9800" : "text.primary" }}>
                              {s.days_remaining === null ? "∞" : s.days_remaining}
                            </TableCell>
                            <TableCell sx={{ fontSize: "0.73rem" }}>{s.reorder_point}</TableCell>
                            <TableCell>
                              {s.suggested_reorder_qty > 0 ? <Chip label={s.suggested_reorder_qty} size="small" sx={{ bgcolor: alpha("#ff9800", 0.1), color: "#ff9800", fontWeight: 800, height: 18, fontSize: "0.68rem" }} /> : "—"}
                            </TableCell>
                            <TableCell sx={{ fontSize: "0.73rem" }}>{fmtINR(s.stock_value)}</TableCell>
                            <TableCell sx={{ fontSize: "0.73rem", color: s.return_rate_pct > 10 ? "#f44336" : "text.primary" }}>{s.return_rate_pct}%</TableCell>
                            <TableCell><StatusChip status={s.status} /></TableCell>
                            <TableCell><StatusChip status={s.mover_type} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </>
          ) : null}
        </Box>
      </Fade>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 4: INSIGHTS (full business insights)
  // ══════════════════════════════════════════════════════════════════════════
  const renderInsights = () => (
    <Fade in timeout={400}>
      <Box>
        {errors.bizInsights && <Alert severity="error" sx={{ mb: 2 }}>{errors.bizInsights}</Alert>}
        {isLoading("bizInsights") ? (
          <Grid container spacing={2}>{Array(6).fill(0).map((_, i) => <Grid item xs={12} sm={6} key={i}><Skeleton height={80} variant="rounded" /></Grid>)}</Grid>
        ) : bizInsights ? (
          <Grid container spacing={2} sx={{display: 'flex', }}>
            <Grid container spacing={1} sx={{ width: "100%" }}>

  {/* Card 1 */}
  <Grid item xs={12} md={4} sx={{width: {xs: '100%', sm: '48%', md: '32%'}}}>
    <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3, height: "100%" }}>
      <CardContent sx={{ textAlign: "center" }}>
        <SectionHeader
          icon={<HealthAndSafety />}
          title="Health Score"
          tooltipTitle="Business Health Score"
          tooltipDesc="Composite score out of 100 combining revenue growth, return rate, inventory health, and customer engagement. Above 80 is excellent."
        />
        <HealthGauge score={bizInsights.health_score.score} label={bizInsights.health_score.label} />
      </CardContent>
    </Card>
  </Grid>

  {/* Card 2 */}
  <Grid item xs={12} md={4} sx={{width: {xs: '100%', sm: '48%', md: '33%'}}}>
    <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3, height: "100%" }}>
      <CardContent>
        <Stack direction="row" alignItems="center" gap={0.8} sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{color: primaryColor}}>Stock Summary</Typography>
          <CardInfoTooltip
            title="Stock Summary"
            description="Quick overview of your inventory health — out of stock, low stock, damaged, and pending verification counts across all products."
            accent={primaryColor}
            icon={<Inventory2Outlined />}
          />
        </Stack>

        <Stack spacing={0.8}>
          {[
            { l: "Total Products", v: bizInsights.stock_summary.total_products, c: "text.primary", tip: "Total number of active SKUs in your catalog" },
            { l: "Out of Stock", v: bizInsights.stock_summary.out_of_stock, c: "#d50000", tip: "Products with zero sellable stock" },
            { l: "Low Stock", v: bizInsights.stock_summary.low_stock, c: "#ff9800", tip: "Products below minimum stock threshold" },
            { l: "With Damaged", v: bizInsights.stock_summary.products_with_damaged, c: "#607d8b", tip: "Products that have some damaged units" },
            { l: "With Scrap", v: bizInsights.stock_summary.products_with_scrap, c: "#78909c", tip: "Products with units marked as scrap" },
            { l: "Pending Verif.", v: bizInsights.stock_summary.pending_return_verifications, c: "#9c27b0", tip: "Returned items awaiting quality verification" },
          ].map(({ l, v, c, tip }) => (
            <Stack key={l} direction="row" justifyContent="space-between" alignItems="center">
              <StyledTooltip title={<TooltipContent title={l} description={tip} accent={c === "text.primary" ? primaryColor : c} />} arrow placement="left" enterDelay={300}>
                <Typography variant="caption" color="text.secondary" sx={{ cursor: "help", borderBottom: "1px dashed", borderColor: "divider" }}>{l}</Typography>
              </StyledTooltip>
              <Typography variant="caption" fontWeight={800} color={c}>{v}</Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  </Grid>

  {/* Card 3 */}
  <Grid item xs={12} md={4} sx={{width: {xs: '100%', sm: '48%', md: '33%'}}}>
    <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3, height: "100%" }}>
      <CardContent>
        <Stack direction="row" alignItems="center" gap={0.8} sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{color: primaryColor}}>Payment Methods</Typography>
          <CardInfoTooltip
            title="Payment Method Breakdown"
            description="Shows how your customers are paying — cash, UPI, card, credit, etc. Helps understand payment preferences and plan for reconciliation."
            accent={primaryColor}
            icon={<AccountBalanceWalletOutlined />}
          />
        </Stack>

        {bizInsights.payment_breakdown.map((p, i) => {
          const colors = ["#00bcd4", "#9c27b0", "#ff9800", "#4caf50", "#f44336"];
          const c = colors[i % colors.length];

          return (
            <Box key={i} sx={{ mb: 1 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  {p.payment_type}
                </Typography>
                <Typography variant="caption" fontWeight={800} color={c}>
                  {p.share_pct}%
                </Typography>
              </Stack>

              <LinearProgress
                variant="determinate"
                value={num(p.share_pct)}
                sx={{
                  height: 5,
                  borderRadius: 3,
                  bgcolor: alpha(c, 0.1),
                  "& .MuiLinearProgress-bar": {
                    bgcolor: c,
                    borderRadius: 3,
                  },
                }}
              />
            </Box>
          );
        })}
      </CardContent>
    </Card>
  </Grid>

</Grid>

            <Grid item xs={12} sm={7} md={9}>
              <Stack spacing={2}>
                {/* All KPIs */}
                <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3 }}>
                  <CardContent>
                    <SectionHeader
                      icon={<FlashOn />}
                      title="Complete KPI Summary"
                      subtitle={bizInsights.period?.label}
                      accent="#ff5722"
                      tooltipTitle="Complete KPI Summary"
                      tooltipDesc="All key performance indicators for the selected period in one view. Use this as your single source of truth for business performance."
                    />
                    <Grid container spacing={1.2}>
                      {[
                        { l: "Gross Revenue", v: fmtINR(bizInsights.kpis.gross_revenue), c: theme.palette.primary.main, tip: "Total revenue before deductions" },
                        { l: "Net Revenue", v: fmtINR(bizInsights.kpis.net_revenue), c: "#00bcd4", tip: "Revenue after returns and discounts" },
                        { l: "GST Collected", v: fmtINR(bizInsights.kpis.gst_collected), c: "#7c4dff", tip: "Total GST billed across all invoices" },
                        { l: "CGST", v: fmtINR(bizInsights.kpis.cgst), c: "#9c27b0", tip: "Central GST component collected" },
                        { l: "SGST", v: fmtINR(bizInsights.kpis.sgst), c: "#e91e63", tip: "State GST component collected" },
                        { l: "Transport Revenue", v: fmtINR(bizInsights.kpis.transport_revenue), c: "#607d8b", tip: "Revenue from shipping and transport charges" },
                        { l: "Total Discounts", v: fmtINR(bizInsights.kpis.total_discount), c: "#ff9800", tip: "Sum of all discounts given to customers" },
                        { l: "Discount Rate", v: `${bizInsights.kpis.discount_rate_pct}%`, c: "#ff5722", tip: "Discounts as a percentage of gross revenue" },
                        { l: "Return Value", v: fmtINR(bizInsights.kpis.total_returns), c: "#f44336", tip: "Total value of products returned" },
                        { l: "Return Rate", v: `${bizInsights.kpis.return_rate_pct}%`, c: bizInsights.kpis.return_rate_pct > 10 ? "#f44336" : "#00c853", tip: "Returns as a percentage of gross revenue" },
                        { l: "Pending Dues", v: fmtINR(bizInsights.kpis.pending_dues), c: "#ff9800", tip: "Unpaid customer balances" },
                        { l: "Avg. Order", v: fmtINR(bizInsights.kpis.avg_order_value), c: "#00bcd4", tip: "Mean invoice value per transaction" },
                        { l: "Transactions", v: bizInsights.kpis.transaction_count, c: theme.palette.primary.main, tip: "Total invoices processed" },
                        { l: "Unique Customers", v: bizInsights.kpis.unique_customers, c: "#2196f3", tip: "Distinct buyers this period" },
                        { l: "Inventory Value", v: fmtINR(bizInsights.kpis.inventory_value), c: "#607d8b", tip: "Total cost value of current stock" },
                        { l: "Damaged Stock Value", v: fmtINR(bizInsights.kpis.damaged_stock_value), c: "#f44336", tip: "Estimated value of damaged/unsellable inventory" },
                        { l: "Inv. Turnover", v: `${bizInsights.kpis.inventory_turnover}x`, c: "#00897b", tip: "How many times inventory sold and replenished" },
                        { l: "Revenue Growth", v: bizInsights.kpis.revenue_growth_pct != null ? pct(bizInsights.kpis.revenue_growth_pct) : "N/A", c: (bizInsights.kpis.revenue_growth_pct ?? 0) >= 0 ? "#00c853" : "#f44336", tip: "Revenue change vs previous period" },
                        { l: "Avg Order Growth", v: bizInsights.kpis.avg_order_growth_pct != null ? pct(bizInsights.kpis.avg_order_growth_pct) : "N/A", c: "#00bcd4", tip: "Average order value change vs previous period" },
                        { l: "Customer Growth", v: bizInsights.kpis.customer_growth_pct != null ? pct(bizInsights.kpis.customer_growth_pct) : "N/A", c: "#2196f3", tip: "Change in unique customer count vs previous period" },
                      ].map((k) => (
                        <Grid item xs={6} sm={4} md={3} key={k.l} sx={{width: {xs: '48%', sm: '30%', md: '20%', lg: '15%'}}}>
                          <StyledTooltip title={<TooltipContent title={k.l} description={k.tip} accent={k.c} />} arrow placement="top" enterDelay={200}>
                            <Box sx={{ p: 1, borderRadius: 1.5, background: alpha(k.c, 0.06), border: `1px solid ${alpha(k.c, 0.15)}`, cursor: "help",
                              transition: "box-shadow 0.15s", "&:hover": { boxShadow: `0 2px 8px ${alpha(k.c, 0.2)}` } }}>
                              <Typography variant="caption" color="text.secondary" display="block" fontSize="0.6rem" fontWeight={600}>{k.l}</Typography>
                              <Typography variant="subtitle2" fontWeight={900} color={k.c} lineHeight={1.2}>{k.v}</Typography>
                            </Box>
                          </StyledTooltip>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>

                {/* All insights */}
                <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3 }}>
                  <CardContent>
                    <SectionHeader
                      icon={<LightbulbOutlined />}
                      title="AI-Generated Insights"
                      subtitle={`${bizInsights.insights.length} observations`}
                      accent="#9c27b0"
                      tooltipTitle="AI-Generated Insights"
                      tooltipDesc="Pattern-detection insights derived from your sales data. Each observation is categorized by type and impact level to guide decision-making."
                    />
                    <Stack spacing={1.2}>
                      {bizInsights.insights.map((ins, i) => <InsightPill key={i} insight={ins} />)}
                    </Stack>
                  </CardContent>
                </Card>

                {/* Category performance */}
                {bizInsights.category_performance?.length > 0 && (
                  <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3 }}>
                    <CardContent>
                      <SectionHeader
                        icon={<BarChartOutlined />}
                        title="Category Performance"
                        accent="#00897b"
                        tooltipTitle="Category Performance"
                        tooltipDesc="Revenue share and unit sales across product categories. Helps identify which categories are driving growth and which need attention."
                      />
                      {bizInsights.category_performance.map((c, i) => {
                        const colors = ["#00bcd4", "#9c27b0", "#ff9800", "#4caf50", "#f44336", "#2196f3"];
                        const col = colors[i % colors.length];
                        return (
                          <Box key={i} sx={{ mb: 1.5 }}>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.3 }}>
                              <Typography variant="body2" fontWeight={700}>{c.category}</Typography>
                              <Stack direction="row" gap={2}>
                                <Typography variant="caption" color="text.secondary">{c.qty} units</Typography>
                                <Typography variant="caption" fontWeight={800} color={col}>{fmtINR(c.revenue)}</Typography>
                                <Typography variant="caption" color="text.secondary">{c.share_pct}%</Typography>
                              </Stack>
                            </Stack>
                            <LinearProgress variant="determinate" value={num(c.share_pct)} sx={{ height: 6, borderRadius: 3, bgcolor: alpha(col, 0.1), "& .MuiLinearProgress-bar": { bgcolor: col, borderRadius: 3 } }} />
                          </Box>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </Grid>
          </Grid>
        ) : null}
      </Box>
    </Fade>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 5: CUSTOMER SEGMENTATION
  // ══════════════════════════════════════════════════════════════════════════
  const renderCustomers = () => (
    <Fade in timeout={400}>
      <Box>
        {errors.customers && <Alert severity="error" sx={{ mb: 2 }}>{errors.customers}</Alert>}
        {isLoading("customers") ? <TableSkeleton rows={8} cols={8} /> : customers ? (
          <>
            {customers.message ? (
              <Alert severity="info">{customers.message}</Alert>
            ) : (
              <>
                <Grid container spacing={2} sx={{ mb: 2.5, width: '100%' }}>
                  {[
                    { l: "Total Customers", v: customers.summary.total_customers, c: "#2196f3",
                      tip: "Total distinct buyers in the selected period" },
                    { l: "Champions", v: customers.summary.champions_count, c: "#00c853",
                      tip: "High-value customers who buy frequently and recently. Your most loyal segment." },
                    { l: "At Risk", v: customers.summary.at_risk_count, c: "#f44336",
                      tip: "Previously active customers who haven't purchased recently. Needs re-engagement." },
                    { l: "Avg. Order Value", v: fmtINR(customers.summary.avg_customer_value), c: "#ff9800",
                      tip: "Mean total spend per customer over the analysis period" },
                    { l: "Avg. Annual CLV", v: fmtINR(customers.summary.avg_clv_annual), c: "#9c27b0",
                      tip: "Estimated annual customer lifetime value based on purchase frequency and average order" },
                    { l: "Total Annual CLV", v: fmtINR(customers.summary.total_clv_annual), c: theme.palette.primary.main,
                      tip: "Combined projected annual revenue from all active customers" },
                  ].map((k) => (
                    <Grid item xs={6} sm={4} md={2} key={k.l} sx={{width: {xs: '100%', sm: '30%', md: '20%', lg: '15%'}}}>
                      <StyledTooltip title={<TooltipContent title={k.l} description={k.tip} accent={k.c} />} arrow placement="top" enterDelay={200}>
                        <Box sx={{ p: 1.5, textAlign: "center", borderRadius: 2, border: `1px solid ${alpha(k.c, 0.2)}`, background: alpha(k.c, 0.06), cursor: "help",
                          transition: "box-shadow 0.15s", "&:hover": { boxShadow: `0 2px 12px ${alpha(k.c, 0.18)}` } }}>
                          <Typography variant={k.v?.toString().length > 8 ? "caption" : "h6"} fontWeight={900} color={k.c}>{k.v}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">{k.l}</Typography>
                        </Box>
                      </StyledTooltip>
                    </Grid>
                  ))}
                </Grid>

                {/* Segment overview */}
                <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3, mb: 2.5 }}>
                  <CardContent>
                    <SectionHeader
                      icon={<PeopleAltOutlined />}
                      title="RFM Segments"
                      subtitle="Recency · Frequency · Monetary analysis"
                      accent="#2196f3"
                      tooltipTitle="RFM Customer Segmentation"
                      tooltipDesc="Customers are scored on Recency (how recently they bought), Frequency (how often), and Monetary (how much they spend). Segments guide targeted marketing strategies."
                    />
                    <Grid container spacing={1}>
                      {customers.segments.map((s, i) => (
                        <Grid item xs={12} sm={6} md={4} key={i} sx={{width: {xs: '100%', sm: '48%', md: '32%', lg: '22%'}}}>
                          <StyledTooltip
                            title={<TooltipContent
                              title={s.segment}
                              description={`${s.count} customers (${s.share_pct}% of total). Total revenue: ${fmtINR(s.total_revenue)}. Avg annual CLV: ${fmtINR(s.avg_clv)}.`}
                              accent={s.color}
                            />}
                            arrow placement="top" enterDelay={200}
                          >
                            <Box sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${alpha(s.color, 0.22)}`, background: alpha(s.color, 0.04), cursor: "help",
                              transition: "box-shadow 0.15s", "&:hover": { boxShadow: `0 2px 10px ${alpha(s.color, 0.18)}` } }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                  <SegmentChip segment={s.segment} color={s.color} />
                                  <Typography variant="h5" fontWeight={900} color={s.color} sx={{ mt: 0.5 }}>{s.count}</Typography>
                                  <Typography variant="caption" color="text.secondary">{s.share_pct}% of customers</Typography>
                                </Box>
                                <Box sx={{ textAlign: "right" }}>
                                  <Typography variant="caption" color="text.secondary" display="block">Total Revenue</Typography>
                                  <Typography variant="caption" fontWeight={800}>{fmtINR(s.total_revenue)}</Typography>
                                  <Typography variant="caption" color="text.secondary" display="block">Avg. CLV/yr</Typography>
                                  <Typography variant="caption" fontWeight={800} color={s.color}>{fmtINR(s.avg_clv)}</Typography>
                                </Box>
                              </Stack>
                            </Box>
                          </StyledTooltip>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>

                {/* Customer table */}
                <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3 }}>
                  <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                    <Box sx={{ p: 2 }}>
                      <SectionHeader
                        icon={<PeopleAltOutlined />}
                        title="Customer Details"
                        subtitle="Sorted by total spend"
                        accent="#2196f3"
                        tooltipTitle="Customer Detail Table"
                        tooltipDesc="Individual RFM scores and lifetime value estimates for each customer. R/F/M scores are 1–5, with 5 being best. Use this to identify who to reward or re-engage."
                      />
                    </Box>
                    <TableContainer sx={{ maxHeight: 440, overflowX: "auto",
          "&::-webkit-scrollbar": { height: 6, width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: primaryColor,
            borderRadius: 4,
          }, }}>
                      <Table stickyHeader size="small" sx={{p: 2,  minWidth: '1200px'}}>
                        <TableHead>
                          <TableRow>
                            {["Customer", "Segment", "R Score", "F Score", "M Score", "Recency", "Frequency", "Total Spend", "Avg. Order", "Annual CLV", "First Purchase"].map((h) => (
                              <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.68rem", color: "text.secondary", bgcolor: isDark ? alpha("#fff", 0.04) : alpha("#000", 0.03), whiteSpace: "nowrap" }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {customers.customers.map((c, i) => (
                            <TableRow key={i} hover>
                              <TableCell sx={{ fontSize: "0.73rem", fontWeight: 700 }}>
                                <Box>
                                  <Typography variant="caption" fontWeight={800} display="block">{c.name}</Typography>
                                  <Typography variant="caption" color="text.secondary" fontSize="0.62rem">{c.mobile}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell><SegmentChip segment={c.segment} color={c.segment_color} /></TableCell>
                              <TableCell>
                                <Box sx={{ width: 20, height: 20, borderRadius: "50%", bgcolor: alpha("#00bcd4", 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <Typography variant="caption" fontWeight={900} color="#00bcd4">{c.r_score}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ width: 20, height: 20, borderRadius: "50%", bgcolor: alpha("#9c27b0", 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <Typography variant="caption" fontWeight={900} color="#9c27b0">{c.f_score}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ width: 20, height: 20, borderRadius: "50%", bgcolor: alpha("#ff9800", 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <Typography variant="caption" fontWeight={900} color="#ff9800">{c.m_score}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ fontSize: "0.73rem" }}>{c.recency_days}d</TableCell>
                              <TableCell sx={{ fontSize: "0.73rem" }}>{c.frequency}</TableCell>
                              <TableCell sx={{ fontSize: "0.73rem", fontWeight: 800, color: theme.palette.primary.main }}>{fmtINR(c.monetary)}</TableCell>
                              <TableCell sx={{ fontSize: "0.73rem" }}>{fmtINR(c.avg_order_value)}</TableCell>
                              <TableCell sx={{ fontSize: "0.73rem", fontWeight: 800, color: "#9c27b0" }}>{fmtINR(c.clv_annual_estimate)}</TableCell>
                              <TableCell sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{c.first_purchase ? new Date(c.first_purchase).toLocaleDateString("en-IN") : "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        ) : null}
      </Box>
    </Fade>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 6: PRODUCT ANALYTICS
  // ══════════════════════════════════════════════════════════════════════════
  const renderProducts = () => (
    <Fade in timeout={400}>
      <Box>
        {errors.products && <Alert severity="error" sx={{ mb: 2 }}>{errors.products}</Alert>}
        {isLoading("products") ? <TableSkeleton /> : productAnalytics ? (
          <>
            <Grid container spacing={1.5} sx={{ mb: 2.5, width: '100%' }}>
              {[
                { l: "Fast Movers", v: productAnalytics.summary.fast_movers, c: "#00c853",
                  tip: "Products selling more than 1 unit/day on average in the last 90 days" },
                { l: "Medium Movers", v: productAnalytics.summary.medium_movers, c: "#ff9800",
                  tip: "Products with moderate sales velocity — not fast but consistently selling" },
                { l: "Slow Movers", v: productAnalytics.summary.slow_movers, c: "#f44336",
                  tip: "Products with very low sales velocity. May need promotions or review" },
                { l: "Dead Stock Items", v: productAnalytics.summary.dead_stock_items, c: "#607d8b",
                  tip: "Products with no sales in the last 90 days. Consider clearance or removal" },
                { l: "Dead Stock Value", v: fmtINR(productAnalytics.summary.dead_stock_value), c: "#607d8b",
                  tip: "Total inventory value tied up in dead stock products" },
                { l: "Revenue (90d)", v: fmtINR(productAnalytics.summary.total_revenue_90d), c: theme.palette.primary.main,
                  tip: "Total gross revenue generated from all products in the last 90 days" },
                { l: "Est. Profit (90d)", v: fmtINR(productAnalytics.summary.estimated_profit_90d), c: "#00c853",
                  tip: "Estimated profit based on selling price minus assumed cost (margin estimate)" },
                { l: "Avg Return Rate", v: `${productAnalytics.summary.avg_return_rate}%`, c: "#f44336",
                  tip: "Average product return rate across your entire catalog in the last 90 days" },
              ].map((k) => (
                <Grid item xs={6} sm={3} md={1.5} key={k.l} sx={{width: {xs: '48%', sm: '32%', md: '23%', lg: '18%'}}}>
                  <StyledTooltip title={<TooltipContent title={k.l} description={k.tip} accent={k.c} />} arrow placement="top" enterDelay={200}>
                    <Box sx={{ p: 1.2, textAlign: "center", borderRadius: 2, border: `1px solid ${alpha(k.c, 0.2)}`, background: alpha(k.c, 0.05), cursor: "help",
                      transition: "box-shadow 0.15s", "&:hover": { boxShadow: `0 2px 10px ${alpha(k.c, 0.18)}` } }}>
                      <Typography variant={k.v?.toString().length > 7 ? "caption" : "h6"} fontWeight={900} color={k.c}>{k.v}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" fontSize="0.6rem">{k.l}</Typography>
                    </Box>
                  </StyledTooltip>
                </Grid>
              ))}
            </Grid>

            {/* View toggle */}
            <Stack direction="row" gap={1} sx={{ mb: 2 }}>
              {[
                { v: "revenue", l: "By Revenue" },
                { v: "profit", l: "By Profit" },
                { v: "fast", l: "Fast Movers" },
                { v: "dead", l: "Dead Stock" },
              ].map((t) => (
                <Chip key={t.v} label={t.l} onClick={() => setProductView(t.v)}
                  variant={productView === t.v ? "filled" : "outlined"}
                  color={productView === t.v ? "primary" : "default"} size="small"
                  sx={{ fontWeight: 500, cursor: "pointer", p: 1 }} />
              ))}
            </Stack>

            <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3 }}>
              <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                <Box sx={{ p: 2 }}>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Typography variant="subtitle1" fontWeight={800} color={primaryColor}>
                      {productView === "dead" ? "Dead Stock Products" : productView === "fast" ? "Fast Moving Products" : productView === "profit" ? "Top Products by Profit" : "Top Products by Revenue"}
                    </Typography>
                    <CardInfoTooltip
                      title={productView === "dead" ? "Dead Stock Products" : productView === "fast" ? "Fast Moving Products" : productView === "profit" ? "Top by Profit" : "Top by Revenue"}
                      description={productView === "dead" ? "Items with zero sales in 90 days. Review for clearance." : productView === "fast" ? "Highest daily velocity products needing consistent stock." : productView === "profit" ? "Products generating highest estimated profit margin." : "Products contributing most to gross revenue in last 90 days."}
                      accent={primaryColor}
                      icon={<BarChartOutlined />}
                    />
                  </Stack>
                </Box>
                <TableContainer sx={{ maxHeight: 480, overflowX: "auto",
          "&::-webkit-scrollbar": { height: 6, width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: primaryColor,
            borderRadius: 4,
          }, }}>
                  <Table stickyHeader size="small" sx={{minWidth: '1100px', p: 1}}>
                    <TableHead>
                      <TableRow>
                        {["Product", "Category", "Price", "Stock", "Sold (90d)", "Sold (30d)", "Daily Vel.", "Trend", "Revenue (90d)", "Est. Profit", "Margin %", "Return %", "Mover", "Last Sale"].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.67rem", color: "text.secondary", bgcolor: isDark ? alpha("#fff", 0.04) : alpha("#000", 0.03), whiteSpace: "nowrap" }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(productView === "dead" ? productAnalytics.dead_stock : productView === "fast" ? productAnalytics.fast_movers : productView === "profit" ? productAnalytics.top_by_profit : productAnalytics.top_by_revenue).map((p, i) => (
                        <TableRow key={i} hover sx={{ bgcolor: p.is_dead_stock ? alpha("#607d8b", 0.04) : "inherit" }}>
                          <TableCell sx={{ fontSize: "0.73rem", fontWeight: 700, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Tooltip title={p.product_name}><span>{p.product_name}</span></Tooltip></TableCell>
                          <TableCell sx={{ fontSize: "0.7rem", color: "text.secondary" }}>{p.category}</TableCell>
                          <TableCell sx={{ fontSize: "0.73rem" }}>{fmtINR(p.price)}</TableCell>
                          <TableCell sx={{ fontSize: "0.73rem", fontWeight: 700 }}>{p.stock_quantity}</TableCell>
                          <TableCell sx={{ fontSize: "0.73rem" }}>{p.qty_sold_90}</TableCell>
                          <TableCell sx={{ fontSize: "0.73rem" }}>{p.qty_sold_30}</TableCell>
                          <TableCell sx={{ fontSize: "0.73rem" }}>{p.daily_velocity > 0 ? p.daily_velocity : "—"}</TableCell>
                          <TableCell>
                            {p.velocity_trend_pct !== 0 && (
                              <Chip label={pct(p.velocity_trend_pct)} size="small" sx={{ height: 18, fontSize: "0.62rem", fontWeight: 800, bgcolor: alpha(p.velocity_trend_pct >= 0 ? "#00c853" : "#f44336", 0.1), color: p.velocity_trend_pct >= 0 ? "#00c853" : "#f44336" }} />
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.73rem", fontWeight: 800, color: theme.palette.primary.main }}>{fmtINR(p.gross_revenue_90)}</TableCell>
                          <TableCell sx={{ fontSize: "0.73rem", fontWeight: 800, color: "#00c853" }}>{fmtINR(p.estimated_profit_90)}</TableCell>
                          <TableCell sx={{ fontSize: "0.73rem" }}>{p.estimated_margin_pct}%</TableCell>
                          <TableCell sx={{ fontSize: "0.73rem", color: p.return_rate_pct > 10 ? "#f44336" : "text.primary" }}>{p.return_rate_pct}%</TableCell>
                          <TableCell><StatusChip status={p.mover_class} /></TableCell>
                          <TableCell sx={{ fontSize: "0.7rem", color: p.is_dead_stock ? "#607d8b" : "text.secondary" }}>
                            {p.last_sold_date ? `${p.days_since_last_sale}d ago` : "Never"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </>
        ) : null}
      </Box>
    </Fade>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 7: CASH FLOW
  // ══════════════════════════════════════════════════════════════════════════
  const renderCashFlow = () => (
    <Fade in timeout={400}>
      <Box>
        <Stack direction="row" alignItems="center" gap={2} sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>Period:</Typography>
          <ButtonGroup size="small" variant="outlined">
            {[3, 6, 9, 12].map((m) => (
              <Button key={m} onClick={() => setCashFlowMonths(m)} variant={cashFlowMonths === m ? "contained" : "outlined"} color="success">{m}mo</Button>
            ))}
          </ButtonGroup>
          {isLoading("cashFlow") && <CircularProgress size={16} thickness={5} />}
        </Stack>

        {errors.cashFlow && <Alert severity="error" sx={{ mb: 2 }}>{errors.cashFlow}</Alert>}

        {isLoading("cashFlow") ? <TableSkeleton /> : cashFlow ? (
          <>
            {/* Aging & summary */}
            <Grid container spacing={2} sx={{ mb: 2.5, width: '100%' }}>
              <Grid item xs={12} md={5} sx={{width: {xs: '100%', sm: '100%', md: '48%', lg: '49%'}}}>
                <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3 }}>
                  <CardContent>
                    <SectionHeader
                      icon={<AccountBalanceWalletOutlined />}
                      title="Receivables Aging"
                      subtitle="Outstanding dues by age"
                      accent="#4caf50"
                      tooltipTitle="Receivables Aging"
                      tooltipDesc="Categorizes unpaid customer dues by how long they've been outstanding. Older receivables (90+ days) are harder to collect and may need escalation."
                    />
                    <Stack spacing={1.5}>
                      {[
                        { l: "0–30 days", v: cashFlow.summary.aging_0_30, c: "#4caf50", tip: "Fresh dues — recently invoiced, likely to be collected soon" },
                        { l: "31–60 days", v: cashFlow.summary.aging_31_60, c: "#ff9800", tip: "Moderately aged dues — follow up recommended" },
                        { l: "61–90 days", v: cashFlow.summary.aging_61_90, c: "#ff5722", tip: "Aging dues — escalate collection efforts" },
                        { l: "90+ days", v: cashFlow.summary.aging_90_plus, c: "#f44336", tip: "Severely overdue — high risk of bad debt, immediate action needed" },
                      ].map((a) => {
                        const total = Number(cashFlow.summary.total_receivable) || 1;
                        const pctVal = Math.min(100, (Number(a.v) / total) * 100);
                        return (
                          <Box key={a.l}>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.3 }}>
                              <StyledTooltip title={<TooltipContent title={a.l} description={a.tip} accent={a.c} />} arrow placement="left" enterDelay={300}>
                                <Typography variant="caption" color="text.secondary" sx={{ cursor: "help", borderBottom: "1px dashed", borderColor: "divider" }}>{a.l}</Typography>
                              </StyledTooltip>
                              <Typography variant="caption" fontWeight={800} color={a.c}>{fmtINR(a.v)}</Typography>
                            </Stack>
                            <LinearProgress variant="determinate" value={pctVal} sx={{ height: 7, borderRadius: 3, bgcolor: alpha(a.c, 0.1), "& .MuiLinearProgress-bar": { bgcolor: a.c, borderRadius: 3 } }} />
                          </Box>
                        );
                      })}
                      <Divider />
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="subtitle2" fontWeight={800} color={primaryColor}>Total Receivable</Typography>
                        <Typography variant="subtitle2" fontWeight={900} color="#ff9800">{fmtINR(cashFlow.summary.total_receivable)}</Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={7} sx={{width: {xs: '100%', sm: '100%', md: '48%', lg: '49%'}}}>
                <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3, height: "100%" }}>
                  <CardContent>
                    <SectionHeader
                      icon={<BarChartOutlined />}
                      title="Monthly Cash Flow"
                      accent="#4caf50"
                      tooltipTitle="Monthly Cash Flow"
                      tooltipDesc="Tracks actual cash received each month (inflow) versus returns and outstanding (outflow). Net cash flow = inflow minus outflows."
                    />
                    <SparkBar data={cashFlow.monthly_cash_flow.map((m) => ({ value: m.net_cash_flow, month: m.month }))} valueKey="value" color="#4caf50" height={52} />
                    <Stack direction="row" sx={{ mt: 0.5, mb: 1 }}>
                      {cashFlow.monthly_cash_flow.map((m, i) => (
                        <Typography key={i} variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: "center", fontSize: "0.6rem" }}>{m.month.slice(5)}</Typography>
                      ))}
                    </Stack>
                    <Stack direction="row" justifyContent="space-around">
                      {[
                        { l: "Avg Monthly Inflow", v: fmtINR(cashFlow.summary.avg_monthly_inflow), c: "#4caf50", tip: "Average cash actually received per month" },
                        { l: "Pending Invoices", v: cashFlow.summary.pending_invoices, c: "#ff9800", tip: "Number of invoices with outstanding balance" },
                      ].map((k) => (
                        <StyledTooltip key={k.l} title={<TooltipContent title={k.l} description={k.tip} accent={k.c} />} arrow placement="top" enterDelay={200}>
                          <Box sx={{ textAlign: "center", cursor: "help" }}>
                            <Typography variant="h6" fontWeight={900} color={k.c}>{k.v}</Typography>
                            <Typography variant="caption" color="text.secondary">{k.l}</Typography>
                          </Box>
                        </StyledTooltip>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Cash flow table */}
            <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3 }}>
              <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                <Box sx={{ p: 2 }}>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Typography variant="subtitle1" fontWeight={800} color={primaryColor}>Monthly Cash Flow Detail</Typography>
                    <CardInfoTooltip
                      title="Monthly Cash Flow Detail"
                      description="Detailed monthly breakdown of all cash movements including inflows, advances, collected dues, return outflows, and net position."
                      accent="#4caf50"
                      icon={<AccountBalanceWalletOutlined />}
                    />
                  </Stack>
                </Box>
                <TableContainer sx={{overflowX: "auto",
          "&::-webkit-scrollbar": { height: 6, width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: primaryColor,
            borderRadius: 4,
          },}}>
                  <Table size="small" sx={{minWidth: '1000px'}}>
                    <TableHead>
                      <TableRow>
                        {["Month", "Cash Inflow", "Received Cash", "Advance Received", "Collected Dues", "Receivable", "Return Outflow", "Net Cash Flow", "Invoices"].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.69rem", color: "text.secondary", bgcolor: isDark ? alpha("#fff", 0.04) : alpha("#000", 0.03) }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cashFlow.monthly_cash_flow.map((r, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>{r.month}</TableCell>
                          <TableCell sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#4caf50" }}>{fmtINR(r.cash_inflow)}</TableCell>
                          <TableCell sx={{ fontSize: "0.75rem" }}>{fmtINR(r.received_cash)}</TableCell>
                          <TableCell sx={{ fontSize: "0.75rem" }}>{fmtINR(r.advance_received)}</TableCell>
                          <TableCell sx={{ fontSize: "0.75rem" }}>{fmtINR(r.collected_dues)}</TableCell>
                          <TableCell sx={{ fontSize: "0.75rem", color: "#ff9800" }}>{fmtINR(r.receivable)}</TableCell>
                          <TableCell sx={{ fontSize: "0.75rem", color: "#f44336" }}>{fmtINR(r.return_outflow)}</TableCell>
                          <TableCell>
                            <Chip label={fmtINR(r.net_cash_flow)} size="small" sx={{
                              height: 20, fontSize: "0.68rem", fontWeight: 800,
                              bgcolor: alpha(Number(r.net_cash_flow) >= 0 ? "#4caf50" : "#f44336", 0.1),
                              color: Number(r.net_cash_flow) >= 0 ? "#4caf50" : "#f44336",
                            }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.75rem" }}>{r.total_invoices}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </>
        ) : null}
      </Box>
    </Fade>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 8: GST ANALYTICS
  // ══════════════════════════════════════════════════════════════════════════
  const renderGST = () => (
    <Fade in timeout={400}>
      <Box>
        {errors.gst && <Alert severity="error" sx={{ mb: 2 }}>{errors.gst}</Alert>}
        {isLoading("gst") ? <TableSkeleton /> : gstAnalytics ? (
          <>
            <Grid container spacing={2} sx={{ mb: 2.5, width: '100%' }}>
              {[
                { l: "Taxable Value", v: fmtINR(gstAnalytics.summary.total_taxable_value), c: "#7c4dff",
                  tip: "Total value of sales before GST — the base on which tax is calculated" },
                { l: "Total GST Liability", v: fmtINR(gstAnalytics.summary.total_gst_liability), c: "#9c27b0",
                  tip: "Total GST amount you are liable to remit to the government for this period" },
                { l: "Est. CGST", v: fmtINR(gstAnalytics.summary.estimated_cgst), c: "#2196f3",
                  tip: "Estimated Central GST portion (50% of total GST for intra-state sales)" },
                { l: "Est. SGST", v: fmtINR(gstAnalytics.summary.estimated_sgst), c: "#e91e63",
                  tip: "Estimated State GST portion (50% of total GST for intra-state sales)" },
                { l: "Effective GST Rate", v: `${gstAnalytics.summary.effective_gst_rate}%`, c: "#ff9800",
                  tip: "Blended average GST rate across all your product sales" },
                { l: "Total Invoices", v: gstAnalytics.summary.total_invoices, c: theme.palette.primary.main,
                  tip: "Number of tax invoices included in this GST analysis" },
              ].map((k) => (
                <Grid item xs={6} sm={4} md={2} key={k.l} sx={{width: {xs: '100%', sm: '48%', md: '23%', lg: '18%'}}}>
                  <StyledTooltip title={<TooltipContent title={k.l} description={k.tip} accent={k.c} />} arrow placement="top" enterDelay={200}>
                    <Box sx={{ p: 1.5, textAlign: "center", borderRadius: 2, border: `1px solid ${alpha(k.c, 0.2)}`, background: alpha(k.c, 0.05), cursor: "help",
                      transition: "box-shadow 0.15s", "&:hover": { boxShadow: `0 2px 10px ${alpha(k.c, 0.18)}` } }}>
                      <Typography variant={k.v?.toString().length > 7 ? "body2" : "h6"} fontWeight={900} color={k.c}>{k.v}</Typography>
                      <Typography variant="caption" color="text.secondary">{k.l}</Typography>
                    </Box>
                  </StyledTooltip>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={2} sx={{ mb: 2.5, width: '100%' }}>
              {/* GST slab donut + table */}
              <Grid item xs={12} md={6} sx={{width: {xs: '100%', sm: '100%', md: '48%', lg: '49%'}}}>
                <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3, height: "100%" }}>
                  <CardContent>
                    <SectionHeader
                      icon={<AssessmentOutlined />}
                      title="GST Slab Breakdown"
                      subtitle="GSTR-1 style"
                      accent="#7c4dff"
                      tooltipTitle="GST Slab Breakdown"
                      tooltipDesc="Categorizes your sales by GST tax slab (0%, 5%, 12%, 18%, 28%). Essential for filing GSTR-1 returns accurately."
                    />
                    {gstAnalytics.slab_breakdown.length > 0 && (
                      <Stack direction="row" alignItems="center" gap={3} sx={{ mb: 2 }}>
                        <DonutChart slices={gstAnalytics.slab_breakdown.map((s, i) => ({
                          value: s.gst_amount,
                          color: ["#7c4dff", "#2196f3", "#00bcd4", "#4caf50", "#ff9800", "#f44336"][i % 6],
                        }))} size={90} />
                        <Stack spacing={0.8}>
                          {gstAnalytics.slab_breakdown.map((s, i) => {
                            const c = ["#7c4dff", "#2196f3", "#00bcd4", "#4caf50", "#ff9800", "#f44336"][i % 6];
                            return (
                              <Stack key={i} direction="row" alignItems="center" gap={0.8}>
                                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: c }} />
                                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                                <Typography variant="caption" fontWeight={800} color={c}>{s.share_of_gst_pct}%</Typography>
                              </Stack>
                            );
                          })}
                        </Stack>
                      </Stack>
                    )}
                    <TableContainer sx={{overflowX: "auto",
          "&::-webkit-scrollbar": { height: 6, width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: primaryColor,
            borderRadius: 4,
          },}}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {["GST Rate", "Invoices", "Taxable Value", "CGST", "SGST", "Total GST", "Share"].map((h) => (
                              <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.68rem", color: "text.secondary" }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {gstAnalytics.slab_breakdown.map((s, i) => {
                            const c = ["#7c4dff", "#2196f3", "#00bcd4", "#4caf50", "#ff9800", "#f44336"][i % 6];
                            return (
                              <TableRow key={i} hover>
                                <TableCell><Chip label={`${s.gst_rate}%`} size="small" sx={{ bgcolor: alpha(c, 0.1), color: c, fontWeight: 800, height: 20, fontSize: "0.7rem" }} /></TableCell>
                                <TableCell sx={{ fontSize: "0.73rem" }}>{s.invoice_count}</TableCell>
                                <TableCell sx={{ fontSize: "0.73rem" }}>{fmtINR(s.taxable_value)}</TableCell>
                                <TableCell sx={{ fontSize: "0.73rem" }}>{fmtINR(s.cgst)}</TableCell>
                                <TableCell sx={{ fontSize: "0.73rem" }}>{fmtINR(s.sgst)}</TableCell>
                                <TableCell sx={{ fontSize: "0.73rem", fontWeight: 800, color: c }}>{fmtINR(s.gst_amount)}</TableCell>
                                <TableCell sx={{ fontSize: "0.73rem" }}>{s.share_of_gst_pct}%</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Monthly GST trend */}
              <Grid item xs={12} md={6} sx={{width: {xs: '100%', sm: '100%', md: '48%', lg: '49%'}}}>
                <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3, height: "100%" }}>
                  <CardContent>
                    <SectionHeader
                      icon={<AutoGraphOutlined />}
                      title="GST Monthly Trend"
                      subtitle="Last 12 months"
                      accent="#9c27b0"
                      tooltipTitle="GST Monthly Trend"
                      tooltipDesc="Tracks your GST liability month by month. Growing GST usually signals growing revenue. Compare against targets and last year for context."
                    />
                    <SparkBar data={gstAnalytics.monthly_trend.map((m) => ({ value: m.total_gst, month: m.month }))} valueKey="value" color="#9c27b0" height={52} />
                    <Stack direction="row" sx={{ mt: 0.5, mb: 2 }}>
                      {gstAnalytics.monthly_trend.slice(-6).map((m, i) => (
                        <Typography key={i} variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: "center", fontSize: "0.6rem" }}>{m.month.slice(5)}</Typography>
                      ))}
                    </Stack>
                    <TableContainer sx={{ maxHeight: 250, overflowX: "auto",
          "&::-webkit-scrollbar": { height: 6, width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: primaryColor,
            borderRadius: 4,
          }, }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {["Month", "Taxable Value", "CGST", "SGST", "Total GST", "Invoices"].map((h) => (
                              <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.68rem", color: "text.secondary" }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {gstAnalytics.monthly_trend.slice(-6).map((r, i) => (
                            <TableRow key={i} hover>
                              <TableCell sx={{ fontSize: "0.73rem", fontWeight: 600 }}>{r.month}</TableCell>
                              <TableCell sx={{ fontSize: "0.73rem" }}>{fmtINR(r.taxable_value)}</TableCell>
                              <TableCell sx={{ fontSize: "0.73rem" }}>{fmtINR(r.cgst)}</TableCell>
                              <TableCell sx={{ fontSize: "0.73rem" }}>{fmtINR(r.sgst)}</TableCell>
                              <TableCell sx={{ fontSize: "0.73rem", fontWeight: 800, color: "#9c27b0" }}>{fmtINR(r.total_gst)}</TableCell>
                              <TableCell sx={{ fontSize: "0.73rem" }}>{r.invoice_count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Top GST-contributing products */}
            {gstAnalytics.top_gst_products?.length > 0 && (
              <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3 }}>
                <CardContent>
                  <SectionHeader
                    icon={<BarChartOutlined />}
                    title="Top GST-Contributing Products"
                    accent="#7c4dff"
                    tooltipTitle="Top GST-Contributing Products"
                    tooltipDesc="Products generating the highest GST amounts. Use this to verify HSN codes, GST rates, and ensure accurate filing."
                  />
                  <TableContainer sx={{overflowX: "auto",
          "&::-webkit-scrollbar": { height: 6, width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: primaryColor,
            borderRadius: 4,
          },}}>
                    <Table size="small" sx={{minWidth: '700px'}}>
                      <TableHead>
                        <TableRow>
                          {["Product", "HSN Code", "GST Rate", "Taxable Value", "GST Contributed", "Qty"].map((h) => (
                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.69rem", color: "text.secondary" }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {gstAnalytics.top_gst_products.map((p, i) => (
                          <TableRow key={i} hover>
                            <TableCell sx={{ fontSize: "0.73rem", fontWeight: 700 }}>{p.product_name}</TableCell>
                            <TableCell sx={{ fontSize: "0.73rem", fontFamily: "monospace" }}>{p.hsn_code}</TableCell>
                            <TableCell><Chip label={`${p.gst_rate}%`} size="small" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 800, bgcolor: alpha("#7c4dff", 0.1), color: "#7c4dff" }} /></TableCell>
                            <TableCell sx={{ fontSize: "0.73rem" }}>{fmtINR(p.taxable_value)}</TableCell>
                            <TableCell sx={{ fontSize: "0.73rem", fontWeight: 800, color: "#9c27b0" }}>{fmtINR(p.gst_contributed)}</TableCell>
                            <TableCell sx={{ fontSize: "0.73rem" }}>{p.qty}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </Box>
    </Fade>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 9: DISCOUNT ANALYSIS
  // ══════════════════════════════════════════════════════════════════════════
  const renderDiscounts = () => (
    <Fade in timeout={400}>
      <Box>
        {errors.discount && <Alert severity="error" sx={{ mb: 2 }}>{errors.discount}</Alert>}
        {isLoading("discount") ? <TableSkeleton /> : discountAnalysis ? (
          <>
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              <Grid item xs={12} md={5} sx={{width: '100%'}}>
                <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3, background: alpha("#e91e63", 0.03) }}>
                  <CardContent>
                    <SectionHeader
                      icon={<LocalOfferOutlined />}
                      title="Discount Effectiveness"
                      accent="#e91e63"
                      tooltipTitle="Discount Effectiveness"
                      tooltipDesc="Measures whether giving discounts actually increases your average order size. A positive lift means discounted orders are larger than non-discounted ones."
                    />
                    <Grid container spacing={1} sx={{width: '100%'}}>
                      {[
                        { l: "Status", v: discountAnalysis.summary.discount_effectiveness === "positive" ? "✅ Positive Lift" : "❌ No Lift",
                          c: discountAnalysis.summary.discount_effectiveness === "positive" ? "#00c853" : "#f44336",
                          tip: "Whether discounts are increasing average order value" },
                        { l: "Avg Order Lift", v: `${discountAnalysis.summary.avg_order_lift_pct}%`,
                          c: Number(discountAnalysis.summary.avg_order_lift_pct) > 0 ? "#00c853" : "#f44336",
                          tip: "How much higher discounted orders are vs non-discounted" },
                        { l: "Discounted Avg", v: fmtINR(discountAnalysis.summary.discounted_avg_order), c: "#e91e63",
                          tip: "Average order value when a discount was applied" },
                        { l: "Non-Disc. Avg", v: fmtINR(discountAnalysis.summary.non_discounted_avg_order), c: "#607d8b",
                          tip: "Average order value without any discount" },
                        { l: "Total Discount (6m)", v: fmtINR(discountAnalysis.summary.total_discount_given_6m), c: "#ff9800",
                          tip: "Total discount amount given to customers in last 6 months" },
                        { l: "Discount Invoice Share", v: `${discountAnalysis.summary.discounted_invoice_share}%`, c: "#ff5722",
                          tip: "Percentage of all invoices that included a discount" },
                      ].map((k) => (
                        <Grid item xs={6} key={k.l} sx={{width: {xs: '48%', sm: '32%', md: '24%', lg: '15%'}}}>
                          <StyledTooltip title={<TooltipContent title={k.l} description={k.tip} accent={k.c} />} arrow placement="top" enterDelay={200}>
                            <Box sx={{ p: 1, borderRadius: 1.5, background: alpha(k.c, 0.06), border: `1px solid ${alpha(k.c, 0.15)}`, cursor: "help",
                              transition: "box-shadow 0.15s", "&:hover": { boxShadow: `0 2px 8px ${alpha(k.c, 0.18)}` } }}>
                              <Typography variant="caption" color="text.secondary" display="block" fontSize="0.62rem" fontWeight={600}>{k.l}</Typography>
                              <Typography variant="subtitle2" fontWeight={900} color={k.c}>{k.v}</Typography>
                            </Box>
                          </StyledTooltip>
                        </Grid>
                      ))}
                    </Grid>
                    <Alert severity={discountAnalysis.summary.discount_effectiveness === "positive" ? "success" : "warning"} sx={{ mt: 2, borderRadius: 2, fontSize: "0.8rem" }}>
                      {discountAnalysis.summary.recommendation}
                    </Alert>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={7} sx={{width: '100%'}}>
                <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3 }}>
                  <CardContent>
                    <SectionHeader
                      icon={<AutoGraphOutlined />}
                      title="Discount Monthly Trend"
                      subtitle="6 months"
                      accent="#e91e63"
                      tooltipTitle="Discount Monthly Trend"
                      tooltipDesc="Tracks how discount spending and adoption rate change month over month. Rising discount rate without revenue growth is a warning sign."
                    />
                    <SparkBar data={discountAnalysis.monthly_trend.map((m) => ({ value: m.total_discount, month: m.month }))} valueKey="value" color="#e91e63" height={48} />
                    <Stack direction="row" sx={{ mt: 0.5, mb: 1.5 }}>
                      {discountAnalysis.monthly_trend.map((m, i) => (
                        <Typography key={i} variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: "center", fontSize: "0.6rem" }}>{m.month.slice(5)}</Typography>
                      ))}
                    </Stack>
                    <TableContainer sx={{overflowX: "auto",
          "&::-webkit-scrollbar": { height: 6, width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: primaryColor,
            borderRadius: 4,
          },}}>
                      <Table size="small" sx={{minWidth: '800px'}}>
                        <TableHead>
                          <TableRow>
                            {["Month", "Discount Given", "Revenue", "Discount Rate", "Disc. Invoices", "Adoption"].map((h) => (
                              <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.68rem", color: "text.secondary" }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {discountAnalysis.monthly_trend.map((r, i) => (
                            <TableRow key={i} hover>
                              <TableCell sx={{ fontSize: "0.73rem", fontWeight: 600 }}>{r.month}</TableCell>
                              <TableCell sx={{ fontSize: "0.73rem", fontWeight: 800, color: "#e91e63" }}>{fmtINR(r.total_discount)}</TableCell>
                              <TableCell sx={{ fontSize: "0.73rem" }}>{fmtINR(r.total_revenue)}</TableCell>
                              <TableCell>
                                <Chip label={`${r.discount_rate_pct}%`} size="small" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 800, bgcolor: alpha(r.discount_rate_pct > 15 ? "#f44336" : "#ff9800", 0.1), color: r.discount_rate_pct > 15 ? "#f44336" : "#ff9800" }} />
                              </TableCell>
                              <TableCell sx={{ fontSize: "0.73rem" }}>{r.discounted_count}</TableCell>
                              <TableCell sx={{ fontSize: "0.73rem" }}>{r.discount_adoption_pct}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {discountAnalysis.product_discounts?.length > 0 && (
              <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3 }}>
                <CardContent>
                  <SectionHeader
                    icon={<LocalOfferOutlined />}
                    title="Product-Level Discounts"
                    subtitle="Last 3 months"
                    accent="#e91e63"
                    tooltipTitle="Product-Level Discounts"
                    tooltipDesc="Breakdown of discounts given per product. High discount-to-revenue ratio on specific products may indicate pricing issues or over-discounting."
                  />
                  <TableContainer sx={{overflowX: "auto",
          "&::-webkit-scrollbar": { height: 6, width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: primaryColor,
            borderRadius: 4,
          },}}>
                    <Table size="small" sx={{minWidth: '900px'}}>
                      <TableHead>
                        <TableRow>
                          {["Product", "Times Sold", "Qty", "Avg Discount", "Total Discount", "Revenue", "Disc/Revenue %"].map((h) => (
                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.69rem", color: "text.secondary" }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {discountAnalysis.product_discounts.map((p, i) => (
                          <TableRow key={i} hover>
                            <TableCell sx={{ fontSize: "0.73rem", fontWeight: 700 }}>{p.product_name}</TableCell>
                            <TableCell sx={{ fontSize: "0.73rem" }}>{p.times_sold}</TableCell>
                            <TableCell sx={{ fontSize: "0.73rem" }}>{p.total_qty}</TableCell>
                            <TableCell sx={{ fontSize: "0.73rem" }}>{fmtINR(p.avg_discount)}</TableCell>
                            <TableCell sx={{ fontSize: "0.73rem", fontWeight: 800, color: "#e91e63" }}>{fmtINR(p.total_discount_given)}</TableCell>
                            <TableCell sx={{ fontSize: "0.73rem" }}>{fmtINR(p.total_revenue)}</TableCell>
                            <TableCell>
                              <Chip label={`${p.discount_to_revenue_pct}%`} size="small" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 800, bgcolor: alpha(p.discount_to_revenue_pct > 15 ? "#f44336" : p.discount_to_revenue_pct > 8 ? "#ff9800" : "#00c853", 0.1), color: p.discount_to_revenue_pct > 15 ? "#f44336" : p.discount_to_revenue_pct > 8 ? "#ff9800" : "#00c853" }} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </Box>
    </Fade>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 10: SEASONAL TRENDS
  // ══════════════════════════════════════════════════════════════════════════
  const renderSeasonal = () => (
    <Fade in timeout={400}>
      <Box>
        {errors.seasonal && <Alert severity="error" sx={{ mb: 2 }}>{errors.seasonal}</Alert>}
        {isLoading("seasonal") ? <TableSkeleton /> : seasonal ? (
          <>
            {seasonal.summary.recommendation && (
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2, fontWeight: 600 }}>{seasonal.summary.recommendation}</Alert>
            )}

            <Grid container spacing={2} sx={{ mb: 2.5, width: '100%' }}>
              <Grid container spacing={2} alignItems="stretch" sx={{width: '100%'}}>

  {/* LEFT CARD */}
  <Grid item xs={12} md={6} display="flex" sx={{ width: {xs: '100%', sm: '100%', md: '48%', lg: '49%'}}}>
    <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3, width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <SectionHeader
          icon={<CalendarMonthOutlined />}
          title="Monthly Seasonality"
          subtitle="Seasonality index (100 = average)"
          tooltipTitle="Monthly Seasonality Index"
          tooltipDesc="Shows which months are above or below your average sales. Index 100 = average month. Above 100 = peak months, below 100 = slow months. Use this to plan inventory and campaigns."
        />

        <Stack spacing={0.8}>
          {seasonal.monthly_seasonality.map((m, i) => {
            const idx = Number(m.seasonality_index);
            const c = m.is_peak ? "#00c853" : m.is_slow ? "#f44336" : "#ff9800";

            return (
              <StyledTooltip
                key={i}
                title={<TooltipContent
                  title={m.month_name}
                  description={`Seasonality index: ${m.seasonality_index}. ${m.is_peak ? "Peak month — high demand expected." : m.is_slow ? "Slow month — consider promotions." : "Average activity month."}`}
                  accent={c}
                />}
                arrow placement="right" enterDelay={200}
              >
                <Box sx={{ cursor: "help" }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.2 }}>
                    <Stack direction="row" alignItems="center" gap={0.8}>
                      <Typography variant="caption" color="text.secondary" sx={{ width: 36 }}>{m.month_name.slice(0, 3)}</Typography>
                    </Stack>
                    <Typography variant="caption" fontWeight={800} color={c}>{m.seasonality_index}</Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (idx / 200) * 100)}
                    sx={{ height: 5, borderRadius: 3, bgcolor: alpha(c, 0.1), "& .MuiLinearProgress-bar": { bgcolor: c, borderRadius: 3 } }}
                  />
                </Box>
              </StyledTooltip>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  </Grid>

  {/* RIGHT CARD */}
  <Grid item xs={12} md={6} display="flex" sx={{ width: {xs: '100%', sm: '100%', md: '48%', lg: '49%'}}}>
    <Card elevation={0} sx={{ border: `2px solid ${primaryColor}`, borderRadius: 3, width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <SectionHeader
          icon={<CalendarMonthOutlined />}
          title="Day of Week Pattern"
          tooltipTitle="Day of Week Sales Pattern"
          tooltipDesc="Shows which days of the week have higher or lower sales activity. Index 100 = average day. Use this to schedule promotions, staff, or deliveries on peak days."
        />

        <Stack spacing={0.8}>
          {seasonal.day_of_week_pattern.map((d, i) => {
            const idx = Number(d.index);
            const c = idx > 115 ? "#00c853" : idx < 85 ? "#f44336" : "#ff9800";

            return (
              <StyledTooltip
                key={i}
                title={<TooltipContent
                  title={d.dow_name}
                  description={`Activity index: ${d.index}. ${idx > 115 ? "High activity day — ensure stock and staff availability." : idx < 85 ? "Low activity day — good time for replenishment." : "Average activity day."}`}
                  accent={c}
                />}
                arrow placement="right" enterDelay={200}
              >
                <Box sx={{ cursor: "help" }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.2 }}>
                    <Typography variant="caption" color="text.secondary">{d.dow_name}</Typography>
                    <Typography variant="caption" fontWeight={800} color={c}>{d.index}</Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (idx / 200) * 100)}
                    sx={{ height: 5, borderRadius: 3, bgcolor: alpha(c, 0.1), "& .MuiLinearProgress-bar": { bgcolor: c, borderRadius: 3 } }}
                  />
                </Box>
              </StyledTooltip>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  </Grid>

</Grid>
              <Grid sx={{width: '100%'}}>
                {/* Hourly pattern */}
                  {seasonal.hourly_pattern?.length > 0 && (
                    <Card elevation={0} sx={{ width: '100%', border: `2px solid ${primaryColor}`, borderRadius: 3 }}>
                      <CardContent>
                        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                          <Typography variant="subtitle2" color={primaryColor} fontWeight={800}>Hourly Activity Pattern</Typography>
                          <CardInfoTooltip
                            title="Hourly Activity Pattern"
                            description="Shows revenue distribution by hour of day. Identifies peak business hours to optimize staffing, promotions, or flash sales."
                            accent={primaryColor}
                            icon={<CalendarMonthOutlined />}
                          />
                        </Stack>
                        <SparkBar data={seasonal.hourly_pattern.map((h) => ({ value: h.avg_revenue, month: h.label }))} valueKey="value" color="#ff5722" height={40} />
                        <Stack direction="row" sx={{ mt: 0.5 }}>
                          {[0, 4, 8, 12, 16, 20, 23].map((h) => (
                            <Typography key={h} variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: "center", fontSize: "0.58rem" }}>{h}h</Typography>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  )}
              </Grid>
            </Grid>
          </>
        ) : null}
      </Box>
    </Fade>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  const tabRenderers = [
    renderOverview, renderForecast, renderReturns, renderInventory,
    renderInsights, renderCustomers, renderProducts, renderCashFlow,
    renderGST, renderDiscounts, renderSeasonal,
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: {xs: 6, sm: 6}, px: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={2}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Avatar sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.main, 0.6)})`,
              width: {xs: 38, sm: 48}, height: {xs: 38, sm: 48},
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
            }}>
              <FlashOn />
            </Avatar>
            <Box>
              <Typography fontWeight={900} letterSpacing={-0.5} lineHeight={1.1} sx={{fontSize: {xs: '1.3rem', sm: '1.5rem'}, color: primaryColor}}>
                AI Business Intelligence
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Real-time analytics · {TABS.length} modules · {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString("en-IN")}` : "Loading..."}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" gap={1} alignItems="center">
            {anyLoading && <CircularProgress size={16} thickness={5} sx={{ color: accent }} />}
            <Tooltip title="Refresh all data">
              <IconButton onClick={fetchAll} disabled={anyLoading} size="small"
                sx={{ bgcolor: alpha(accent, 0.08), "&:hover": { bgcolor: alpha(accent, 0.16) } }}>
                <RefreshOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
      <Box sx={{
        mb: 3, overflowX: "auto", pb: 0.5,
        "&::-webkit-scrollbar": { height: 4 },
        "&::-webkit-scrollbar-thumb": { bgcolor: alpha(accent, 0.25), borderRadius: 2 },
      }}>
        <Stack direction="row" gap={0.75} sx={{ minWidth: "max-content" }}>
          {TABS.map((tab, i) => {
            const isActive = activeTab === i;
            const c = tab.accent;
            // Badges
            const hasBadge =
              (i === 2 && returnSpike?.alert_triggered) ||
              (i === 3 && (reorder?.summary?.out_of_stock ?? 0) + (reorder?.summary?.critical ?? 0) > 0);
            return (
              <Box key={i} sx={{ position: "relative" }}>
                <Button
                  onClick={() => setActiveTab(i)}
                  startIcon={tab.icon}
                  size="small"
                  sx={{
                    borderRadius: 2.5, fontWeight: isActive ? 800 : 500,
                    fontSize: "0.78rem", px: { xs: 1.2, sm: 1.5 }, py: 0.75,
                    textTransform: "none", transition: "all 0.18s",
                    bgcolor: isActive ? alpha(c, 0.12) : "transparent",
                    color: isActive ? c : "text.secondary",
                    border: `1.5px solid ${isActive ? alpha(c, 0.5) : "transparent"}`,
                    whiteSpace: "nowrap",
                    "&:hover": { bgcolor: alpha(c, 0.08), color: c, border: `1.5px solid ${alpha(c, 0.28)}` },
                  }}
                >
                  {tab.label}
                </Button>
                {hasBadge && (
                  <Box sx={{
                    position: "absolute", top: 4, right: 4,
                    width: 7, height: 7, borderRadius: "50%", bgcolor: "#f44336",
                    animation: "aiPulse 1.5s ease-in-out infinite",
                    "@keyframes aiPulse": { "0%,100%": { opacity: 1, transform: "scale(1)" }, "50%": { opacity: 0.5, transform: "scale(1.3)" } },
                  }} />
                )}
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* ── Active Tab Content ───────────────────────────────────────────── */}
      <Box>
        {tabRenderers[activeTab] ? tabRenderers[activeTab]() : null}
      </Box>
    </Box>
  );
};

export default AiInsights;