import React from "react";
import {
  Box, Grid, Typography, Paper, Divider, alpha, Tooltip, useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import TrendingUpIcon     from "@mui/icons-material/TrendingUp";
import TrendingDownIcon   from "@mui/icons-material/TrendingDown";
import PeopleIcon         from "@mui/icons-material/People";
import ReceiptIcon        from "@mui/icons-material/Receipt";
import ShoppingCartIcon   from "@mui/icons-material/ShoppingCart";
import InventoryIcon      from "@mui/icons-material/Inventory2";
import SwapHorizIcon      from "@mui/icons-material/SwapHoriz";
import PercentIcon        from "@mui/icons-material/Percent";
import SpeedIcon          from "@mui/icons-material/Speed";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtMonth = (s) => {
  if (!s) return "";
  const [y, m] = s.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y.slice(2)}`;
};
const fmtCurrency = (v) => {
  const n = Number(v || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};

/* ─── Shared chart tooltip ───────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  if (!active || !payload?.length) return null;
  return (
    <Paper elevation={4} sx={{
      p: 1.5, borderRadius: 1.5, minWidth: 150,
      background: isDark ? "#1e1e2e" : "#fff",
      border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
    }}>
      <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, mb: 0.75 }}>
        {fmtMonth(label) || label}
      </Typography>
      {payload.map((p, i) => (
        <Box key={i} display="flex" justifyContent="space-between" gap={1.5}>
          <Typography sx={{ fontSize: "0.68rem", color: p.color }}>{p.name}</Typography>
          <Typography sx={{ fontSize: "0.68rem", fontWeight: 700 }}>
            {(p.name?.toLowerCase().includes("value") ||
              p.name?.toLowerCase().includes("revenue") ||
              p.name?.toLowerCase().includes("sales") ||
              p.name?.includes("₹"))
              ? fmtCurrency(p.value)
              : Number(p.value).toLocaleString("en-IN")}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
};

/* ─── Metric card ────────────────────────────────────────────────────────── */
function MetricCard({ label, value, icon: Icon, color, description, size = "normal" }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const c      = color || theme.palette.primary.main;
  const isSmall = size === "small";

  return (
    <Tooltip title={description || ""} arrow placement="top"
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: isDark ? "#1e1e2e" : "#fff",
            color: isDark ? "#fff" : "#333",
            border: `1px solid ${alpha(c, 0.3)}`,
            boxShadow: `0 4px 16px ${alpha(c, 0.18)}`,
            borderRadius: 2, maxWidth: 220, fontSize: "0.72rem",
          },
        },
        arrow: { sx: { color: isDark ? "#1e1e2e" : "#fff" } },
      }}
    >
      <Paper elevation={0} sx={{
        p: { xs: isSmall ? 1.25 : 1.5, sm: isSmall ? 1.5 : 2 },
        borderRadius: { xs: 1.5, sm: 2 },
        border: `1.5px solid ${alpha(c, 0.18)}`,
        background: isDark
          ? `linear-gradient(135deg, ${alpha(c, 0.09)}, ${alpha("#fff", 0.02)})`
          : `linear-gradient(135deg, ${alpha(c, 0.05)}, ${alpha("#fff", 0.85)})`,
        height: "100%",
        transition: "all 0.22s ease",
        cursor: "default",
        "&:hover": {
          border: `1.5px solid ${alpha(c, 0.5)}`,
          transform: "translateY(-2px)",
          boxShadow: `0 8px 22px ${alpha(c, 0.14)}`,
        },
        "&:active": { transform: "scale(0.97)" },
      }}>
        <Box sx={{
          width: { xs: isSmall ? 28 : 32, sm: isSmall ? 30 : 36 },
          height: { xs: isSmall ? 28 : 32, sm: isSmall ? 30 : 36 },
          borderRadius: 1.5,
          background: alpha(c, 0.12),
          display: "flex", alignItems: "center", justifyContent: "center",
          mb: { xs: 0.75, sm: 1 },
        }}>
          {Icon && <Icon sx={{ fontSize: { xs: isSmall ? 14 : 16, sm: isSmall ? 15 : 19 }, color: c }} />}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{
          fontSize: { xs: "0.65rem", sm: "0.7rem" },
          fontWeight: 500, display: "block",
          mb: { xs: 0.3, sm: 0.4 },
          lineHeight: 1.3,
          overflow: "hidden",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}>
          {label}
        </Typography>
        <Typography sx={{
          fontSize: { xs: isSmall ? "0.95rem" : "1.05rem", sm: isSmall ? "1.05rem" : "1.2rem", md: isSmall ? "1.05rem" : "1.3rem" },
          fontWeight: 800, color: c,
          letterSpacing: "-0.02em", lineHeight: 1.1,
          wordBreak: "break-word",
        }}>
          {value}
        </Typography>
      </Paper>
    </Tooltip>
  );
}

/* ─── Chart wrapper ─────────────────────────────────────────────────────── */
function ChartPaper({ title, children, mb }) {
  const theme  = useTheme();
  const primary = theme.palette.primary.main;
  const isDark  = theme.palette.mode === "dark";
  return (
    <Paper elevation={0} sx={{
      p: { xs: 1.5, sm: 2, md: 2.5 },
      mb: mb ?? { xs: 2, sm: 3 },
      borderRadius: { xs: 1.5, sm: 2 },
      border: `1.5px solid ${alpha(primary, 0.14)}`,
      background: isDark ? alpha("#fff", 0.02) : alpha(primary, 0.02),
      overflow: "hidden",
    }}>
      {title && (
        <Typography fontWeight={700} sx={{
          color: primary, fontSize: { xs: "0.8rem", sm: "0.88rem" }, mb: { xs: 1.5, sm: 2 },
        }}>
          {title}
        </Typography>
      )}
      {children}
    </Paper>
  );
}

/* ─── Section heading ───────────────────────────────────────────────────── */
const SectionTitle = ({ title }) => {
  const theme  = useTheme();
  const primary = theme.palette.primary.main;
  return (
    <Box display="flex" alignItems="center" gap={1} mb={{ xs: 1.25, sm: 1.75 }}>
      <Box sx={{ width: 3, height: 18, borderRadius: 1, background: primary, flexShrink: 0 }} />
      <Typography fontWeight={700} sx={{
        color: primary, fontSize: { xs: "0.85rem", sm: "0.95rem" }, letterSpacing: "-0.01em",
      }}>
        {title}
      </Typography>
    </Box>
  );
};

/* ─── Main export ─────────────────────────────────────────────────────────── */
export default function KPIMetricsSection({
  kpiMetrics, monthlyTrend, salesReturnsMonthly, purchaseReturnsMonthly,
  subscriptionType, safeToFixed, safeToLocaleString,
}) {
  const theme   = useTheme();
  const primary = theme.palette.primary.main;
  const isDark  = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const k = kpiMetrics || {};
  const docPlural = subscriptionType === "bill" ? "Bills" : "Invoices";

  /* Merge monthly */
  const combinedMonthly = monthlyTrend.map(m => ({
    ...m,
    sales_return_value:    Number(salesReturnsMonthly.find(r => r.month === m.month)?.total_return_value   || 0),
    purchase_return_value: Number(purchaseReturnsMonthly.find(r => r.month === m.month)?.total_return_value || 0),
  }));

  /* responsive chart height */
  const chartH     = isMobile ? 220 : 290;
  const chartHSm   = isMobile ? 190 : 240;

  /* Y-axis width — smaller on mobile */
  const yAxisW = isMobile ? 50 : 65;

  /* XAxis tick rotation for many data points */
  const xTickProps = monthlyTrend.length > 6
    ? { angle: -30, textAnchor: "end", interval: isMobile ? 1 : 0, tick: { fontSize: isMobile ? 9 : 11 }, height: 45 }
    : { tick: { fontSize: isMobile ? 9 : 11 } };

  const kpiCards = [
    { label: "Gross Revenue",   value: fmtCurrency(k.gross_revenue),   icon: MonetizationOnIcon, color: "#6366f1", description: "Total sales revenue before deducting returns" },
    { label: "Net Revenue",     value: fmtCurrency(k.net_revenue),     icon: TrendingUpIcon,     color: "#22c55e", description: "Revenue after deducting sales returns" },
    { label: "Revenue ex-GST",  value: fmtCurrency(k.revenue_after_gst), icon: ReceiptIcon,     color: "#0ea5e9", description: "Net revenue after removing GST portion" },
    { label: `Total ${docPlural}`, value: safeToLocaleString(k.total_docs), icon: ReceiptIcon,  color: primary,   description: `Number of ${docPlural.toLowerCase()} generated` },
    { label: "Unique Customers",value: safeToLocaleString(k.unique_customers), icon: PeopleIcon, color: "#f59e0b", description: "Distinct customers in selected period" },
    { label: "Units Sold",      value: safeToLocaleString(k.units_sold), icon: ShoppingCartIcon, color: "#8b5cf6", description: "Total product units sold" },
    { label: "Avg. Order Value",value: fmtCurrency(k.avg_order_value), icon: MonetizationOnIcon, color: "#ec4899", description: "Average value per transaction" },
    { label: "Inventory Value", value: fmtCurrency(k.inventory_value), icon: InventoryIcon,     color: "#14b8a6", description: "Current stock value at selling price" },
  ];

    const ReturnValue = k.total_return_value + k.purchase_return_value;

  const roiCards = [
    { label: "Return Rate",       value: `${k.return_rate ?? "0.00"}%`,       icon: SwapHorizIcon,  color: Number(k.return_rate) > 10 ? "#ef4444" : "#22c55e", description: "Sales returns as % of gross revenue" },
    { label: "Discount Rate",     value: `${k.discount_rate ?? "0.00"}%`,     icon: PercentIcon,    color: "#f59e0b", description: "Discounts as % of gross revenue" },
    { label: "GST Effective Rate",value: `${k.gst_effective_rate ?? "0.00"}%`,icon: PercentIcon,    color: "#6366f1", description: "Effective GST rate across all transactions" },
    { label: "Inventory Turnover",value: `${k.inventory_turnover ?? "0.00"}x`,icon: SpeedIcon,      color: "#0ea5e9", description: "Times inventory is sold vs. held" },
    { label: "Sales Return Value",value: fmtCurrency(k.total_return_value),   icon: TrendingDownIcon, color: "#ef4444", description: "Monetary value of all sales returns" },
    { label: "Purchase Returns",  value: fmtCurrency(k.purchase_return_value),icon: TrendingDownIcon, color: "#f97316", description: "Monetary value of all purchase returns" },
        { label: "Purchase Returns",  value: fmtCurrency(ReturnValue),icon: TrendingDownIcon, color: "#f97316", description: "Monetary value of all purchase returns" },
  ];

  return (
    <Box>
      {/* KPI */}
      <SectionTitle title="Key Performance Indicators" />
      <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }} sx={{ mb: { xs: 2.5, sm: 4 } }}>
        {kpiCards.map((c, i) => (
          <Grid item xs={6} sm={4} md={3} key={i} sx={{width: {xs: '100%', sm: '32%', md: '22%', lg: '15%'}}}>
            <MetricCard {...c} />
          </Grid>
        ))}
      </Grid>

      {/* ROI */}
      <SectionTitle title="ROI & Efficiency Metrics" />
      <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }} sx={{ mb: { xs: 2.5, sm: 4 } }}>
        {roiCards.map((c, i) => (
          <Grid item xs={6} sm={4} md={2} key={i} sx={{width: {xs: '100%', sm: '32%', md: '22%', lg: '15%'}}}>
            <MetricCard {...c} size="small" />
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: { xs: 2, sm: 3 }, opacity: 0.25 }} />

      {/* Revenue vs Returns trend */}
      <SectionTitle title="Revenue vs. Returns Trend" />

<ChartPaper>
  {combinedMonthly.length === 0 ? (
    <Typography
      color="text.secondary"
      align="center"
      sx={{ py: 4, fontSize: "0.85rem" }}
    >
      No data available
    </Typography>
  ) : (
    <Box
      sx={{
        width: "100%",
        overflowX: "auto",
        overflowY: "hidden",
        WebkitOverflowScrolling: "touch",

        /* -------- PRIMARY COLOR SCROLLBAR -------- */

        "&::-webkit-scrollbar": {
          height: 8
        },
        "&::-webkit-scrollbar-track": {
          backgroundColor: alpha(primary, 0.08),
          borderRadius: 10
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: primary,
          borderRadius: 10,
          transition: "all 0.3s ease"
        },
        "&::-webkit-scrollbar-thumb:hover": {
          backgroundColor: alpha(primary, 0.85)
        },

        /* Firefox */
        scrollbarColor: `${primary} ${alpha(primary, 0.08)}`,
        scrollbarWidth: "thin"
      }}
    >
      <Box
        sx={{
          minWidth: isMobile ? 600 : "100%",  // 👈 forces scroll on mobile
        }}
      >
        <ResponsiveContainer width="100%" height={chartH}>
          <AreaChart
            data={combinedMonthly}
            margin={{
              top: 8,
              right: isMobile ? 8 : 20,
              left: 0,
              bottom: 0
            }}
          >
            <defs>
              <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.28}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>

              <linearGradient id="gSR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.22}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>

              <linearGradient id="gPR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.18}/>
                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={alpha(primary, 0.08)} />

            <XAxis
              dataKey="month"
              tickFormatter={fmtMonth}
              {...xTickProps}
            />

            <YAxis
              tickFormatter={fmtCurrency}
              tick={{ fontSize: isMobile ? 9 : 11 }}
              width={yAxisW}
            />

            <ReTooltip content={<ChartTooltip />} />

            <Legend
              wrapperStyle={{
                fontSize: isMobile ? "0.68rem" : "0.78rem",
                paddingTop: 8
              }}
            />

            <Area
              type="monotone"
              dataKey="total_sales"
              name="Total Sales"
              stroke="#22c55e"
              fill="url(#gSales)"
              strokeWidth={2}
              dot={false}
            />

            <Area
              type="monotone"
              dataKey="sales_return_value"
              name="Sales Returns"
              stroke="#ef4444"
              fill="url(#gSR)"
              strokeWidth={2}
              dot={false}
            />

            <Area
              type="monotone"
              dataKey="purchase_return_value"
              name="Purchase Returns"
              stroke="#f97316"
              fill="url(#gPR)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )}
</ChartPaper>

      {/* GST trend + Avg order side by side on tablet+, stacked on mobile */}
      <Grid container spacing={{ xs: 2, sm: 2.5 }} sx={{width: '100%'}}>
        <Grid item xs={12} md={6} sx={{width: {xs: '100%', sm: '100%', md: '48%', lg: '48%'}}}>
          <SectionTitle title="GST Collection Trend" />
          <ChartPaper mb={0}>
            {monthlyTrend.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 3, fontSize: "0.85rem" }}>No data</Typography>
            ) : (
              <Box sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch", "&::-webkit-scrollbar": {
          height: 8
        },
        "&::-webkit-scrollbar-track": {
          backgroundColor: alpha(primary, 0.08),
          borderRadius: 10
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: primary,
          borderRadius: 10,
          transition: "all 0.3s ease"
        },
        "&::-webkit-scrollbar-thumb:hover": {
          backgroundColor: alpha(primary, 0.85)
        },

        /* Firefox */
        scrollbarColor: `${primary} ${alpha(primary, 0.08)}`,
        scrollbarWidth: "thin" }}>
                <Box sx={{ minWidth: isMobile ? 650 : "100%" }}>
                  <ResponsiveContainer width="100%" height={chartHSm}>
                    <BarChart data={monthlyTrend} margin={{ top: 5, right: isMobile ? 6 : 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(primary, 0.08)} />
                      <XAxis dataKey="month" tickFormatter={fmtMonth} {...xTickProps} />
                      <YAxis tickFormatter={fmtCurrency} tick={{ fontSize: isMobile ? 9 : 11 }} width={yAxisW} />
                      <ReTooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: isMobile ? "0.68rem" : "0.78rem" }} />
                      <Bar dataKey="total_gst" name="GST Collected ₹" fill="#6366f1" radius={[3,3,0,0]} barSize={isMobile ? 12 : 16} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            )}
          </ChartPaper>
        </Grid>

        <Grid item xs={12} md={6} sx={{width: {xs: '100%', sm: '100%', md: '48%', lg: '48%'}}}>
          <SectionTitle title="Avg. Order Value Trend" />
          <ChartPaper mb={0}>
            {monthlyTrend.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 3, fontSize: "0.85rem" }}>No data</Typography>
            ) : (
              <Box sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch", "&::-webkit-scrollbar": {
          height: 8
        },
        "&::-webkit-scrollbar-track": {
          backgroundColor: alpha(primary, 0.08),
          borderRadius: 10
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: primary,
          borderRadius: 10,
          transition: "all 0.3s ease"
        },
        "&::-webkit-scrollbar-thumb:hover": {
          backgroundColor: alpha(primary, 0.85)
        },

        /* Firefox */
        scrollbarColor: `${primary} ${alpha(primary, 0.08)}`,
        scrollbarWidth: "thin" }}>
                <Box sx={{ minWidth: isMobile ? 650 : "100%" }}>
                  <ResponsiveContainer width="100%" height={chartHSm}>
                    <LineChart data={monthlyTrend} margin={{ top: 5, right: isMobile ? 6 : 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(primary, 0.08)} />
                      <XAxis dataKey="month" tickFormatter={fmtMonth} {...xTickProps} />
                      <YAxis tickFormatter={fmtCurrency} tick={{ fontSize: isMobile ? 9 : 11 }} width={yAxisW} />
                      <ReTooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: isMobile ? "0.68rem" : "0.78rem" }} />
                      <Line
                        type="monotone"
                        dataKey={subscriptionType === "bill" ? "avg_bill_value" : "avg_invoice_value"}
                        name="Avg. Order ₹"
                        stroke="#ec4899"
                        strokeWidth={2.5}
                        dot={{ r: isMobile ? 2 : 3, fill: "#ec4899" }}
                        activeDot={{ r: isMobile ? 4 : 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            )}
          </ChartPaper>
        </Grid>
      </Grid>
    </Box>
  );
}