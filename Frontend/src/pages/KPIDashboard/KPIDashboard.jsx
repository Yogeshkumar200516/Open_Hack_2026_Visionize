// src/pages/KpiRoiDashboard.jsx
import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  Box, Grid, Card, CardContent, Typography, Chip, Select,
  MenuItem, FormControl, InputLabel, CircularProgress, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, LinearProgress, Divider, IconButton, Tabs, Tab, Avatar,
  useTheme, alpha,
} from "@mui/material";
import {
  TrendingUp, TrendingDown, AccountBalance, Inventory2,
  AssignmentReturn, ShoppingCart, Verified, Timeline,
  BarChart as BarChartIcon, PieChart as PieChartIcon,
  Refresh, Star, Warning, CheckCircle,
} from "@mui/icons-material";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import API_BASE_URL from "../../Context/Api";
import { useAuth } from "../../Context/AuthContext";
import { ColorModeContext } from "../../Context/ThemeContext";
import axiosInstance from "../../utils/axiosInstance";

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const PALETTE = {
  emerald:  "#10b981",
  teal:     "#14b8a6",
  sky:      "#0ea5e9",
  violet:   "#8b5cf6",
  amber:    "#f59e0b",
  rose:     "#f43f5e",
  slate:    "#64748b",
  indigo:   "#6366f1",
};

const PIE_COLORS = [PALETTE.emerald, PALETTE.amber, PALETTE.rose, PALETTE.violet, PALETTE.sky];
const MODULE_COLORS = {
  invoicing:  PALETTE.emerald,
  billing:    PALETTE.teal,
  purchase:   PALETTE.sky,
  returns:    PALETTE.amber,
  inventory:  PALETTE.violet,
  reporting:  PALETTE.indigo,
  payments:   PALETTE.rose,
  supplier:   PALETTE.slate,
  analytics:  "#ec4899",
};

// ─── FORMATTERS ───────────────────────────────────────────────────────────────
const fmt = {
  currency: (v) => {
    if (!v && v !== 0) return "—";
    const n = parseFloat(v);
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
    if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
  },
  pct: (v) => (v == null ? "—" : `${parseFloat(v).toFixed(1)}%`),
  num: (v) => (v == null ? "—" : Number(v).toLocaleString("en-IN")),
  roi: (v) => {
    if (v == null) return "—";
    const n = parseFloat(v);
    return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
  },
};

// ─── METRIC CARD ──────────────────────────────────────────────────────────────
const MetricCard = ({ title, value, subtitle, icon: Icon, color, trend, trendLabel, loading }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${alpha(color, 0.18)}`,
        background: isDark
          ? `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(color, 0.03)} 100%)`
          : `linear-gradient(135deg, ${alpha(color, 0.06)} 0%, #fff 100%)`,
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": { transform: "translateY(-2px)", boxShadow: `0 8px 24px ${alpha(color, 0.2)}` },
        height: "100%",
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, fontSize: "0.68rem" }}>
            {title}
          </Typography>
          <Avatar sx={{ bgcolor: alpha(color, 0.15), width: 36, height: 36 }}>
            <Icon sx={{ color, fontSize: 18 }} />
          </Avatar>
        </Box>

        {loading ? (
          <CircularProgress size={22} sx={{ color }} />
        ) : (
          <>
            <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.text.primary, lineHeight: 1.1, mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: "0.72rem" }}>
                {subtitle}
              </Typography>
            )}
            {trend != null && (
              <Box display="flex" alignItems="center" gap={0.5} mt={0.8}>
                {trend >= 0
                  ? <TrendingUp sx={{ fontSize: 14, color: PALETTE.emerald }} />
                  : <TrendingDown sx={{ fontSize: 14, color: PALETTE.rose }} />}
                <Typography variant="caption" sx={{ color: trend >= 0 ? PALETTE.emerald : PALETTE.rose, fontWeight: 700, fontSize: "0.7rem" }}>
                  {trendLabel || fmt.pct(Math.abs(trend))}
                </Typography>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, subtitle, icon: Icon, color }) => {
  const theme = useTheme();
  return (
    <Box display="flex" alignItems="center" gap={1.5} mb={2}>
      <Box sx={{ p: 0.8, borderRadius: 2, bgcolor: alpha(color, 0.12), display: "flex" }}>
        <Icon sx={{ color, fontSize: 20 }} />
      </Box>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      </Box>
    </Box>
  );
};

// ─── ROI BADGE ────────────────────────────────────────────────────────────────
const RoiBadge = ({ value }) => {
  if (value == null) return <Chip label="No Data" size="small" sx={{ bgcolor: alpha(PALETTE.slate, 0.1), color: PALETTE.slate, fontWeight: 700, fontSize: "0.68rem" }} />;
  const v = parseFloat(value);
  const color = v >= 100 ? PALETTE.emerald : v >= 0 ? PALETTE.teal : PALETTE.rose;
  const label = v >= 100 ? "High ROI" : v >= 0 ? "Positive" : "Negative";
  return (
    <Chip
      label={`${fmt.roi(value)} · ${label}`}
      size="small"
      sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 700, fontSize: "0.68rem", border: `1px solid ${alpha(color, 0.3)}` }}
    />
  );
};

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, prefix = "", suffix = "" }) => {
  const theme = useTheme();
  if (!active || !payload?.length) return null;
  return (
    <Paper elevation={4} sx={{ p: 1.5, borderRadius: 2, bgcolor: theme.palette.background.paper, border: `1px solid ${alpha(PALETTE.slate, 0.15)}`, minWidth: 160 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.5, color: theme.palette.text.secondary }}>{label}</Typography>
      {payload.map((p, i) => (
        <Box key={i} display="flex" alignItems="center" gap={1}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: p.color }} />
          <Typography variant="caption" sx={{ color: theme.palette.text.primary }}>
            {p.name}: <strong>{prefix}{typeof p.value === "number" ? p.value.toLocaleString("en-IN") : p.value}{suffix}</strong>
          </Typography>
        </Box>
      ))}
    </Paper>
  );
};

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function KpiRoiDashboard() {
  const { user } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [period, setPeriod] = useState(30);
  const [months, setMonths] = useState(6);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState({});
  const [data, setData] = useState({
    summary: null,
    revenueTrend: null,
    stockKpi: null,
    paymentKpi: null,
    returnsKpi: null,
    purchaseKpi: null,
    features: null,
    topProducts: null,
    customerKpi: null,
  });

// axiosInstance handles headers and tokens

  const load = useCallback(async (key, url) => {
    setLoading((l) => ({ ...l, [key]: true }));
    try {
      const res = await axiosInstance.get(`/api/kpi-roi/${url}`);
      setData((d) => ({ ...d, [key]: res.data }));
    } catch (e) {
      console.error(`Failed to load ${key}:`, e);
    } finally {
      setLoading((l) => ({ ...l, [key]: false }));
    }
  }, []);

  useEffect(() => { load("summary", `summary?period=${period}`); }, [period]);
  useEffect(() => { load("revenueTrend", `revenue-trend?months=${months}`); }, [months]);
  useEffect(() => { load("stockKpi", "stock-kpi"); }, []);
  useEffect(() => { load("paymentKpi", `payment-kpi?months=${months}`); }, [months]);
  useEffect(() => { load("returnsKpi", `returns-kpi?months=${months}`); }, [months]);
  useEffect(() => { load("purchaseKpi", `purchase-kpi?months=${months}`); }, [months]);
  useEffect(() => { load("features", "features"); }, []);
  useEffect(() => { load("topProducts", `top-products?period=${period}&limit=10`); }, [period]);
  useEffect(() => { load("customerKpi", `customer-kpi?period=${period}`); }, [period]);

  const s = data.summary;
  const isAnyLoading = Object.values(loading).some(Boolean);

  // ─── TAB: OVERVIEW ──────────────────────────────────────────────────────────
  const OverviewTab = () => (
    <Box>
      {/* KPI Cards */}
      <Grid container spacing={2} mb={3}>
        {[
          { title: "Gross Revenue", value: fmt.currency(s?.revenue?.gross_revenue), subtitle: `${fmt.num(s?.revenue?.invoice_count)} invoices`, icon: AccountBalance, color: PALETTE.emerald },
          { title: "Collection Rate", value: fmt.pct(s?.collection_rate_pct), subtitle: `${fmt.currency(s?.revenue?.pending_revenue)} pending`, icon: CheckCircle, color: PALETTE.teal },
          { title: "Avg. Order Value", value: fmt.currency(s?.revenue?.avg_order_value), subtitle: "Per invoice", icon: TrendingUp, color: PALETTE.sky },
          { title: "Sales Return Rate", value: fmt.pct(s?.returns?.return_rate_pct), subtitle: `${fmt.currency(s?.returns?.return_value)} returned`, icon: AssignmentReturn, color: PALETTE.amber },
          { title: "PO Fulfilment", value: fmt.pct(s?.purchase_orders?.fulfilment_rate_pct), subtitle: `${fmt.num(s?.purchase_orders?.total_pos)} orders`, icon: ShoppingCart, color: PALETTE.indigo },
          { title: "Sellable Stock %", value: fmt.pct(s?.stock?.sellable_pct), subtitle: `${fmt.num(s?.stock?.total_stock)} total units`, icon: Inventory2, color: PALETTE.violet },
          { title: "Bill Revenue", value: fmt.currency(s?.bills?.bill_revenue), subtitle: `${fmt.num(s?.bills?.bill_count)} bills`, icon: BarChartIcon, color: PALETTE.rose },
          { title: "GST Collected", value: fmt.currency(s?.revenue?.total_gst_collected), subtitle: "Tax collected", icon: Verified, color: PALETTE.slate },
        ].map((card, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <MetricCard {...card} loading={loading.summary} />
          </Grid>
        ))}
      </Grid>

      {/* Revenue + Bills Trend */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={8}>
          <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(PALETTE.slate, 0.12)}`, p: 2.5 }}>
            <SectionHeader title="Revenue Trend" subtitle="Invoice + Bill revenue combined" icon={Timeline} color={PALETTE.emerald} />
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.revenueTrend?.trend || []}>
                <defs>
                  <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={PALETTE.emerald} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={PALETTE.emerald} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="billGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={PALETTE.sky} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={PALETTE.sky} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(PALETTE.slate, 0.1)} />
                <XAxis dataKey="month_label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => fmt.currency(v)} tick={{ fontSize: 11 }} />
                <RTooltip content={<CustomTooltip prefix="₹" />} />
                <Legend />
                <Area type="monotone" dataKey="gross_revenue" name="Invoice Revenue" stroke={PALETTE.emerald} fill="url(#invGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="bill_revenue" name="Bill Revenue" stroke={PALETTE.sky} fill="url(#billGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="collected_revenue" name="Collected" stroke={PALETTE.teal} strokeDasharray="4 2" fill="none" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Payment Mix Pie */}
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(PALETTE.slate, 0.12)}`, p: 2.5, height: "100%" }}>
            <SectionHeader title="Payment Mix" subtitle="By method" icon={PieChartIcon} color={PALETTE.violet} />
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.paymentKpi?.payment_mix || []}
                  dataKey="count"
                  nameKey="payment_type"
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={3}
                >
                  {(data.paymentKpi?.payment_mix || []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RTooltip formatter={(v, n, p) => [`${v} (${p.payload.share_pct}%)`, p.payload.payment_type]} />
                <Legend iconSize={10} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
      </Grid>

      {/* Top Products Table */}
      <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(PALETTE.slate, 0.12)}`, p: 2.5 }}>
        <SectionHeader title="Top Performing Products" subtitle={`Last ${period} days by revenue`} icon={Star} color={PALETTE.amber} />
        {loading.topProducts ? (
          <LinearProgress sx={{ borderRadius: 1 }} />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["#", "Product", "Category", "Qty Sold", "Revenue", "Avg Rate", "Stock"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.72rem", color: theme.palette.text.secondary, borderBottom: `2px solid ${alpha(PALETTE.slate, 0.1)}` }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.topProducts?.products || []).slice(0, 8).map((p, i) => (
                  <TableRow key={p.product_id} hover sx={{ "&:last-child td": { border: 0 } }}>
                    <TableCell sx={{ fontSize: "0.75rem", color: PALETTE.slate }}>#{i + 1}</TableCell>
                    <TableCell sx={{ fontSize: "0.78rem", fontWeight: 600 }}>{p.product_name}</TableCell>
                    <TableCell><Chip label={p.category_name} size="small" sx={{ fontSize: "0.65rem", height: 20 }} /></TableCell>
                    <TableCell sx={{ fontSize: "0.78rem" }}>{fmt.num(p.total_qty_sold)}</TableCell>
                    <TableCell sx={{ fontSize: "0.78rem", fontWeight: 700, color: PALETTE.emerald }}>{fmt.currency(p.total_revenue)}</TableCell>
                    <TableCell sx={{ fontSize: "0.78rem" }}>{fmt.currency(p.avg_rate)}</TableCell>
                    <TableCell>
                      <Chip
                        label={fmt.num(p.current_stock)}
                        size="small"
                        sx={{ fontSize: "0.65rem", height: 20, bgcolor: p.current_stock < 10 ? alpha(PALETTE.rose, 0.1) : alpha(PALETTE.emerald, 0.1), color: p.current_stock < 10 ? PALETTE.rose : PALETTE.emerald }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );

  // ─── TAB: INVENTORY KPI ─────────────────────────────────────────────────────
  const InventoryTab = () => {
    const sk = data.stockKpi;
    const overall = sk?.overall || {};
    const cats = sk?.by_category || [];

    return (
      <Box>
        <Grid container spacing={2} mb={3}>
          {[
            { title: "Total Products", value: fmt.num(overall.total_products), icon: Inventory2, color: PALETTE.violet },
            { title: "Total Stock Units", value: fmt.num(overall.total_stock), icon: BarChartIcon, color: PALETTE.sky },
            { title: "Sellable Stock", value: `${fmt.num(overall.sellable_stock)} (${fmt.pct(overall.sellable_pct)})`, icon: CheckCircle, color: PALETTE.emerald },
            { title: "Damaged + Scrap", value: `${fmt.num((overall.damaged_stock || 0) + (overall.scrap_stock || 0))}`, icon: Warning, color: PALETTE.rose },
          ].map((c, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <MetricCard {...c} loading={loading.stockKpi} />
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2} mb={3}>
          {/* Stock Donut */}
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(PALETTE.slate, 0.12)}`, p: 2.5 }}>
              <SectionHeader title="Stock Composition" subtitle="Sellable vs. Damaged vs. Scrap" icon={PieChartIcon} color={PALETTE.violet} />
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Sellable", value: overall.sellable_stock || 0 },
                      { name: "Damaged", value: overall.damaged_stock || 0 },
                      { name: "Scrap",   value: overall.scrap_stock   || 0 },
                    ]}
                    dataKey="value"
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={3}
                  >
                    <Cell fill={PALETTE.emerald} />
                    <Cell fill={PALETTE.amber} />
                    <Cell fill={PALETTE.rose} />
                  </Pie>
                  <RTooltip />
                  <Legend iconSize={10} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Grid>

          {/* Stock by Category */}
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(PALETTE.slate, 0.12)}`, p: 2.5 }}>
              <SectionHeader title="Sellable Stock % by Category" subtitle="Lower = needs attention" icon={BarChartIcon} color={PALETTE.sky} />
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={cats.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(PALETTE.slate, 0.1)} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="category_name" type="category" tick={{ fontSize: 11 }} width={90} />
                  <RTooltip content={<CustomTooltip suffix="%" />} />
                  <Bar dataKey="sellable_pct" name="Sellable %" radius={[0, 4, 4, 0]}>
                    {cats.map((c, i) => (
                      <Cell key={i} fill={c.sellable_pct >= 80 ? PALETTE.emerald : c.sellable_pct >= 50 ? PALETTE.amber : PALETTE.rose} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Grid>
        </Grid>

        {/* Movement Trend */}
        <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(PALETTE.slate, 0.12)}`, p: 2.5 }}>
          <SectionHeader title="Stock Movement Trend (30 Days)" subtitle="IN vs OUT by stock type" icon={Timeline} color={PALETTE.teal} />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sk?.movement_trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(PALETTE.slate, 0.1)} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <RTooltip />
              <Legend />
              <Bar dataKey="total_qty" name="Qty Changed" fill={PALETTE.sky} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Box>
    );
  };

  // ─── TAB: RETURNS KPI ───────────────────────────────────────────────────────
  const ReturnsTab = () => {
    const rk = data.returnsKpi;
    const recovery = rk?.recovery_rate || {};
    const verif = rk?.verification_breakdown || [];

    return (
      <Box>
        <Grid container spacing={2} mb={3}>
          {[
            { title: "Recovery Rate", value: fmt.pct(recovery.recovery_rate_pct), subtitle: `${fmt.num(recovery.total_returned)} units returned`, icon: AssignmentReturn, color: PALETTE.emerald },
            { title: "Sellable Recovered", value: fmt.num(recovery.total_sellable), subtitle: "Units put back in stock", icon: CheckCircle, color: PALETTE.teal },
            { title: "Damaged Items", value: fmt.num(recovery.total_damaged), subtitle: "Units marked damaged", icon: Warning, color: PALETTE.amber },
            { title: "Scrapped Items", value: fmt.num(recovery.total_scrap), subtitle: "Units written off", icon: Warning, color: PALETTE.rose },
          ].map((c, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <MetricCard {...c} loading={loading.returnsKpi} />
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2} mb={3}>
          {/* Sales Returns Trend */}
          <Grid item xs={12} md={7}>
            <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(PALETTE.slate, 0.12)}`, p: 2.5 }}>
              <SectionHeader title="Sales Returns Trend" subtitle="Customer returns over time" icon={Timeline} color={PALETTE.amber} />
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rk?.sales_returns_trend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(PALETTE.slate, 0.1)} />
                  <XAxis dataKey="month_label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tickFormatter={(v) => fmt.currency(v)} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <RTooltip />
                  <Legend />
                  <Bar yAxisId="right" dataKey="return_count" name="Count" fill={alpha(PALETTE.amber, 0.3)} radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="left" dataKey="return_value" name="Value (₹)" fill={PALETTE.amber} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Grid>

          {/* Verification Status */}
          <Grid item xs={12} md={5}>
            <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(PALETTE.slate, 0.12)}`, p: 2.5 }}>
              <SectionHeader title="Verification Status" subtitle="Return stock categorization" icon={Verified} color={PALETTE.violet} />
              {verif.length === 0 ? (
                <Box display="flex" alignItems="center" justifyContent="center" height={180}>
                  <Typography color="text.secondary" variant="caption">No verification data yet</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={verif} dataKey="count" nameKey="verification_status" cx="50%" cy="50%" outerRadius={75} paddingAngle={4}>
                      {verif.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <RTooltip />
                    <Legend iconSize={10} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Grid>
        </Grid>

        {/* Supplier Returns Trend */}
        <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(PALETTE.slate, 0.12)}`, p: 2.5 }}>
          <SectionHeader title="Supplier Returns Trend" subtitle="Returns sent back to suppliers" icon={ShoppingCart} color={PALETTE.sky} />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={rk?.supplier_returns_trend || []}>
              <defs>
                <linearGradient id="srGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={PALETTE.sky} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={PALETTE.sky} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(PALETTE.slate, 0.1)} />
              <XAxis dataKey="month_label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => fmt.currency(v)} tick={{ fontSize: 11 }} />
              <RTooltip />
              <Area type="monotone" dataKey="return_value" name="Return Value" stroke={PALETTE.sky} fill="url(#srGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </Box>
    );
  };

  // ─── TAB: PURCHASE KPI ──────────────────────────────────────────────────────
  const PurchaseTab = () => {
    const pk = data.purchaseKpi;
    const gr = pk?.gr_stats || {};
    const dues = pk?.payment_dues || {};

    return (
      <Box>
        <Grid container spacing={2} mb={3}>
          {[
            { title: "PO Fulfilment Rate", value: fmt.pct(pk?.po_trend?.at(-1)?.fulfilment_rate_pct), subtitle: "Latest month", icon: ShoppingCart, color: PALETTE.emerald },
            { title: "GR Acceptance Rate", value: fmt.pct(gr.acceptance_rate_pct), subtitle: `${fmt.num(gr.total_rejected)} units rejected`, icon: Verified, color: PALETTE.teal },
            { title: "Supplier Payment Rate", value: fmt.pct(dues.payment_rate_pct), subtitle: `${fmt.currency(dues.pending_dues)} pending`, icon: AccountBalance, color: PALETTE.sky },
            { title: "GR Discrepancies", value: fmt.num(gr.discrepancy_count), subtitle: `of ${fmt.num(gr.total_grs)} receipts`, icon: Warning, color: PALETTE.rose },
          ].map((c, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <MetricCard {...c} loading={loading.purchaseKpi} />
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2} mb={3}>
          {/* PO Status Donut */}
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(PALETTE.slate, 0.12)}`, p: 2.5 }}>
              <SectionHeader title="PO Status" subtitle="Distribution by status" icon={PieChartIcon} color={PALETTE.sky} />
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pk?.po_status || []} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {(pk?.po_status || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <RTooltip />
                  <Legend iconSize={10} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Grid>

          {/* PO Trend */}
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(PALETTE.slate, 0.12)}`, p: 2.5 }}>
              <SectionHeader title="Purchase Order Trend" subtitle="PO count & fulfilment rate" icon={Timeline} color={PALETTE.indigo} />
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={pk?.po_trend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(PALETTE.slate, 0.1)} />
                  <XAxis dataKey="month_label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <RTooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="po_count" name="PO Count" fill={alpha(PALETTE.indigo, 0.4)} radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="fulfilment_rate_pct" name="Fulfilment %" stroke={PALETTE.emerald} strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Grid>
        </Grid>

        {/* GR Stats */}
        <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(PALETTE.slate, 0.12)}`, p: 2.5 }}>
          <SectionHeader title="Goods Receipt Summary" subtitle="Ordered vs. Received vs. Accepted" icon={Verified} color={PALETTE.teal} />
          <Grid container spacing={2}>
            {[
              { label: "Total Ordered", value: fmt.num(gr.total_ordered), color: PALETTE.sky },
              { label: "Total Received", value: fmt.num(gr.total_received), color: PALETTE.indigo },
              { label: "Accepted", value: fmt.num(gr.total_accepted), color: PALETTE.emerald },
              { label: "Rejected", value: fmt.num(gr.total_rejected), color: PALETTE.rose },
              { label: "Acceptance Rate", value: fmt.pct(gr.acceptance_rate_pct), color: PALETTE.teal },
              { label: "Total GRs", value: fmt.num(gr.total_grs), color: PALETTE.violet },
            ].map((item, i) => (
              <Grid item xs={6} sm={4} md={2} key={i}>
                <Box sx={{ textAlign: "center", p: 1.5, borderRadius: 2, bgcolor: alpha(item.color, 0.07) }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: item.color }}>{item.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Card>
      </Box>
    );
  };

  // ─── TAB: FEATURE ROI ───────────────────────────────────────────────────────
  const FeatureRoiTab = () => {
    const features = data.features?.features || [];

    return (
      <Box>
        <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(PALETTE.slate, 0.12)}`, p: 2.5, mb: 3 }}>
          <SectionHeader title="Feature Portfolio ROI" subtitle="Standardized KPI tracking per deployed feature (TNI26073)" icon={BarChartIcon} color={PALETTE.violet} />

          {loading.features ? (
            <LinearProgress />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {["Feature", "Module", "Status", "Primary KPI", "Baseline → Target", "Dev Cost", "ROI", "Payback"].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.72rem", color: "text.secondary", borderBottom: `2px solid ${alpha(PALETTE.slate, 0.12)}`, whiteSpace: "nowrap" }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {features.map((f) => (
                    <TableRow key={f.feature_id} hover sx={{ "&:last-child td": { border: 0 } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.78rem" }}>{f.feature_name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.65rem" }}>{f.business_goal?.substring(0, 60)}{f.business_goal?.length > 60 ? "…" : ""}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={f.feature_module}
                          size="small"
                          sx={{ fontSize: "0.65rem", height: 20, bgcolor: alpha(MODULE_COLORS[f.feature_module] || PALETTE.slate, 0.12), color: MODULE_COLORS[f.feature_module] || PALETTE.slate }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={f.status}
                          size="small"
                          sx={{ fontSize: "0.65rem", height: 20, bgcolor: f.status === "deployed" ? alpha(PALETTE.emerald, 0.1) : alpha(PALETTE.amber, 0.1), color: f.status === "deployed" ? PALETTE.emerald : PALETTE.amber }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.75rem" }}>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{f.primary_kpi_name || "—"}</Typography>
                        {f.primary_kpi_unit && <Typography variant="caption" color="text.secondary"> ({f.primary_kpi_unit})</Typography>}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.75rem" }}>
                        {f.baseline_value != null ? (
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Typography variant="caption">{f.baseline_value}</Typography>
                            <Typography variant="caption" color="text.secondary">→</Typography>
                            <Typography variant="caption" sx={{ color: PALETTE.emerald, fontWeight: 700 }}>{f.target_value}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.62rem" }}>({f.target_delta_pct > 0 ? "+" : ""}{f.target_delta_pct}%)</Typography>
                          </Box>
                        ) : "—"}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem", fontWeight: 600 }}>{fmt.currency(f.dev_cost)}</TableCell>
                      <TableCell><RoiBadge value={f.roi_percentage} /></TableCell>
                      <TableCell sx={{ fontSize: "0.75rem" }}>
                        {f.payback_months != null ? `${parseFloat(f.payback_months).toFixed(1)} mo` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>

        {/* ROI Visual: Grouped Bar by Module */}
        {features.filter((f) => f.dev_cost > 0).length > 0 && (
          <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(PALETTE.slate, 0.12)}`, p: 2.5 }}>
            <SectionHeader title="Feature Cost Distribution" subtitle="Dev + Infra + Support per feature" icon={BarChartIcon} color={PALETTE.indigo} />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={features.map((f) => ({
                name: f.feature_name.split(" ").slice(0, 2).join(" "),
                dev: parseFloat(f.dev_cost) || 0,
                infra: parseFloat(f.infra_cost_monthly) * 12 || 0,
                support: parseFloat(f.support_cost_monthly) * 12 || 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(PALETTE.slate, 0.1)} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => fmt.currency(v)} tick={{ fontSize: 11 }} />
                <RTooltip content={<CustomTooltip prefix="₹" />} />
                <Legend />
                <Bar dataKey="dev" name="Dev Cost" stackId="a" fill={PALETTE.indigo} />
                <Bar dataKey="infra" name="Annual Infra" stackId="a" fill={PALETTE.sky} />
                <Bar dataKey="support" name="Annual Support" stackId="a" fill={PALETTE.violet} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </Box>
    );
  };

  // ─── TABS CONFIG ────────────────────────────────────────────────────────────
  const tabs = [
    { label: "Overview", icon: <BarChartIcon fontSize="small" /> },
    { label: "Inventory KPI", icon: <Inventory2 fontSize="small" /> },
    { label: "Returns KPI", icon: <AssignmentReturn fontSize="small" /> },
    { label: "Purchase KPI", icon: <ShoppingCart fontSize="small" /> },
    { label: "Feature ROI", icon: <TrendingUp fontSize="small" /> },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, minHeight: "100vh", bgcolor: theme.palette.background.default }}>

      {/* ── PAGE HEADER ────────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          gap: 2,
          mb: 3,
          pb: 2,
          borderBottom: `1px solid ${alpha(PALETTE.slate, 0.12)}`,
        }}
      >
        <Box>
          <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
            <Box sx={{ p: 0.9, borderRadius: 2, background: `linear-gradient(135deg, ${PALETTE.emerald}, ${PALETTE.teal})`, display: "flex" }}>
              <BarChartIcon sx={{ color: "#fff", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                KPI & ROI Dashboard
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                TNI26073 · Standardized Metrics & Return-on-Investment Analysis
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Controls */}
        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ fontSize: "0.78rem" }}>Period</InputLabel>
            <Select value={period} label="Period" onChange={(e) => setPeriod(e.target.value)} sx={{ fontSize: "0.78rem" }}>
              {[7, 14, 30, 60, 90].map((d) => <MenuItem key={d} value={d} sx={{ fontSize: "0.78rem" }}>Last {d} days</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ fontSize: "0.78rem" }}>Trend Window</InputLabel>
            <Select value={months} label="Trend Window" onChange={(e) => setMonths(e.target.value)} sx={{ fontSize: "0.78rem" }}>
              {[3, 6, 12].map((m) => <MenuItem key={m} value={m} sx={{ fontSize: "0.78rem" }}>{m} Months</MenuItem>)}
            </Select>
          </FormControl>
          <Tooltip title="Refresh all metrics">
            <IconButton
              size="small"
              onClick={() => {
                load("summary", `summary?period=${period}`);
                load("revenueTrend", `revenue-trend?months=${months}`);
                load("stockKpi", "stock-kpi");
                load("paymentKpi", `payment-kpi?months=${months}`);
                load("returnsKpi", `returns-kpi?months=${months}`);
                load("purchaseKpi", `purchase-kpi?months=${months}`);
                load("features", "features");
                load("topProducts", `top-products?period=${period}&limit=10`);
                load("customerKpi", `customer-kpi?period=${period}`);
              }}
              sx={{ border: `1px solid ${alpha(PALETTE.slate, 0.2)}`, borderRadius: 2 }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── TOP-LEVEL LOADING BAR ─────────────────────────────────────────── */}
      {isAnyLoading && (
        <LinearProgress
          sx={{ borderRadius: 1, mb: 2, height: 3, bgcolor: alpha(PALETTE.emerald, 0.1), "& .MuiLinearProgress-bar": { bgcolor: PALETTE.emerald } }}
        />
      )}

      {/* ── TABS ─────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          mb: 3,
          borderRadius: 2,
          border: `1px solid ${alpha(PALETTE.slate, 0.12)}`,
          bgcolor: theme.palette.background.paper,
          overflow: "hidden",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTab-root": { fontSize: "0.75rem", fontWeight: 600, minHeight: 44, gap: 0.8, textTransform: "none" },
            "& .Mui-selected": { color: PALETTE.emerald },
            "& .MuiTabs-indicator": { bgcolor: PALETTE.emerald, height: 3, borderRadius: "3px 3px 0 0" },
          }}
        >
          {tabs.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Box>

      {/* ── TAB PANELS ──────────────────────────────────────────────────────── */}
      {activeTab === 0 && <OverviewTab />}
      {activeTab === 1 && <InventoryTab />}
      {activeTab === 2 && <ReturnsTab />}
      {activeTab === 3 && <PurchaseTab />}
      {activeTab === 4 && <FeatureRoiTab />}

      {/* ── FOOTER NOTE ─────────────────────────────────────────────────────── */}
      <Box mt={4} pt={2} sx={{ borderTop: `1px solid ${alpha(PALETTE.slate, 0.1)}` }}>
        <Typography variant="caption" color="text.secondary">
          KPI data is derived from live ERP transactions (invoices, bills, purchase orders, returns, stock movements). Feature ROI requires manual benefit entry via the compute-ROI API. All metrics refresh on page load or manual refresh.
        </Typography>
      </Box>
    </Box>
  );
}