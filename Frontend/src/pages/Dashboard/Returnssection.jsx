import React from "react";
import {
  Box, Grid, Typography, Paper, alpha, Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from "recharts";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtMonth = (s) => {
  if (!s) return "";
  const [y, m] = s.split("-");
  return `${MONTH_NAMES[parseInt(m,10)-1]} ${y.slice(2)}`;
};

const fmtCurrency = (v) => {
  const n = Number(v || 0);
  if (n >= 10000000) return `₹${(n/10000000).toFixed(2)}Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(2)}L`;
  if (n >= 1000)     return `₹${(n/1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};

function StatCard({ label, value, icon: Icon, color, chip }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2, borderRadius: 2, height: "100%",
        border: `1.5px solid ${alpha(color, 0.2)}`,
        background: isDark
          ? `linear-gradient(135deg, ${alpha(color, 0.08)}, transparent)`
          : `linear-gradient(135deg, ${alpha(color, 0.05)}, ${alpha("#fff", 0.9)})`,
        transition: "all 0.2s",
        "&:hover": {
          border: `1.5px solid ${alpha(color, 0.45)}`,
          transform: "translateY(-2px)",
          boxShadow: `0 6px 20px ${alpha(color, 0.15)}`,
        },
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box sx={{
          width: 36, height: 36, borderRadius: 1.5,
          background: alpha(color, 0.12),
          display: "flex", alignItems: "center", justifyContent: "center", mb: 1,
        }}>
          <Icon sx={{ fontSize: 18, color }} />
        </Box>
        {chip}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem", fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, color, letterSpacing: "-0.02em", mt: 0.25 }}>
        {value}
      </Typography>
    </Paper>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  if (!active || !payload?.length) return null;
  return (
    <Paper elevation={4} sx={{
      p: 1.5, borderRadius: 1.5, minWidth: 160,
      background: isDark ? "#1e1e2e" : "#fff",
      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
    }}>
      <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, mb: 0.75 }}>{fmtMonth(label) || label}</Typography>
      {payload.map((p, i) => (
        <Box key={i} display="flex" justifyContent="space-between" gap={2}>
          <Typography sx={{ fontSize: "0.7rem", color: p.color }}>{p.name}</Typography>
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 700 }}>
            {p.name?.includes("₹") || p.name?.toLowerCase().includes("value") ? fmtCurrency(p.value) : p.value}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
};

const ChartPaper = ({ title, children }) => {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const isDark  = theme.palette.mode === "dark";
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5, borderRadius: 2, height: "100%",
        border: `1.5px solid ${alpha(primary, 0.15)}`,
        background: isDark ? alpha("#fff", 0.02) : alpha(primary, 0.015),
      }}
    >
      <Typography fontWeight={700} sx={{ color: primary, fontSize: "0.875rem", mb: 2 }}>{title}</Typography>
      {children}
    </Paper>
  );
};

const SectionTitle = ({ title, color }) => {
  const theme = useTheme();
  const c = color || theme.palette.primary.main;
  return (
    <Box display="flex" alignItems="center" gap={1} mb={2}>
      <Box sx={{ width: 3, height: 20, borderRadius: 1, background: c }} />
      <Typography fontWeight={700} sx={{ color: c, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>
        {title}
      </Typography>
    </Box>
  );
};

export default function ReturnsSection({
  salesReturnsSummary, salesReturnsMonthly,
  purchaseReturnsSummary, purchaseReturnsMonthly,
  safeToFixed, safeToLocaleString,
}) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;

  const sr = salesReturnsSummary    || {};
  const pr = purchaseReturnsSummary || {};

  // Merged monthly for combined bar
  const allMonths = Array.from(new Set([
    ...salesReturnsMonthly.map(r => r.month),
    ...purchaseReturnsMonthly.map(r => r.month),
  ])).sort();

  const combined = allMonths.map(month => ({
    month,
    sales_return_value:    Number(salesReturnsMonthly.find(r => r.month === month)?.total_return_value || 0),
    sales_return_count:    Number(salesReturnsMonthly.find(r => r.month === month)?.total_returns || 0),
    purchase_return_value: Number(purchaseReturnsMonthly.find(r => r.month === month)?.total_return_value || 0),
    purchase_return_count: Number(purchaseReturnsMonthly.find(r => r.month === month)?.total_returns || 0),
  }));


  // Pie data for verification status
  const srStatusData = [
    { name: "Verified",  value: Number(sr.verified_count || 0), color: "#22c55e" },
    { name: "Pending",   value: Number(sr.pending_count  || 0), color: "#f59e0b" },
  ].filter(d => d.value > 0);

  const prStatusData = [
    { name: "Verified",  value: Number(pr.verified_count || 0), color: "#22c55e" },
    { name: "Pending",   value: Number(pr.pending_count  || 0), color: "#f59e0b" },
  ].filter(d => d.value > 0);


  return (
    <Box>
      {/* ── Sales Returns ── */}
      <SectionTitle title="Sales Returns" color="#ef4444" />
      <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
        <Grid item xs={6} sm={3} sx={{width: {xs: '100%', sm: '30%', md: '22%', lg: '15%'}}}>
          <StatCard label="Total Returns"    value={safeToLocaleString(sr.total_returns)}    icon={SwapHorizIcon}     color="#ef4444" />
        </Grid>
        <Grid item xs={6} sm={3}sx={{width: {xs: '100%', sm: '30%', md: '22%', lg: '15%'}}}>
          <StatCard label="Return Value"     value={fmtCurrency(sr.total_return_value)}       icon={MonetizationOnIcon} color="#ef4444" />
        </Grid>
        <Grid item xs={6} sm={3} sx={{width: {xs: '100%', sm: '30%', md: '22%', lg: '15%'}}}>
          <StatCard label="Verified"         value={safeToLocaleString(sr.verified_count)}   icon={CheckCircleIcon}   color="#22c55e" />
        </Grid>
        <Grid item xs={6} sm={3} sx={{width: {xs: '100%', sm: '30%', md: '22%', lg: '15%'}}}>
          <StatCard
            label="Pending"
            value={safeToLocaleString(sr.pending_count)}
            icon={PendingIcon}
            color="#f59e0b"
            chip={
              Number(sr.pending_count) > 0
                ? <Chip label="Action needed" size="small" sx={{ fontSize: "0.65rem", height: 18, bgcolor: alpha("#f59e0b", 0.12), color: "#f59e0b" }} />
                : null
            }
          />
        </Grid>
      </Grid>

      {/* ── Purchase Returns ── */}
      <SectionTitle title="Purchase Returns" color="#f97316" />
      <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
        <Grid item xs={6} sm={3} sx={{width: {xs: '100%', sm: '30%', md: '22%', lg: '15%'}}}>
          <StatCard label="Total Returns"    value={safeToLocaleString(pr.total_returns)}    icon={SwapHorizIcon}     color="#f97316" />
        </Grid>
        <Grid item xs={6} sm={3} sx={{width: {xs: '100%', sm: '30%', md: '22%', lg: '15%'}}}>
          <StatCard label="Return Value"     value={fmtCurrency(pr.total_return_value)}       icon={MonetizationOnIcon} color="#f97316" />
        </Grid>
        <Grid item xs={6} sm={3} sx={{width: {xs: '100%', sm: '30%', md: '22%', lg: '15%'}}}>
          <StatCard label="Verified"         value={safeToLocaleString(pr.verified_count)}   icon={CheckCircleIcon}   color="#22c55e" />
        </Grid>
        <Grid item xs={6} sm={3} sx={{width: {xs: '100%', sm: '30%', md: '22%', lg: '15%'}}}>
          <StatCard
            label="Pending"
            value={safeToLocaleString(pr.pending_count)}
            icon={PendingIcon}
            color="#f59e0b"
            chip={
              Number(pr.pending_count) > 0
                ? <Chip label="Action needed" size="small" sx={{ fontSize: "0.65rem", height: 18, bgcolor: alpha("#f59e0b", 0.12), color: "#f59e0b" }} />
                : null
            }
          />
        </Grid>
      </Grid>

      {/* ── Charts ── */}
      <Grid container spacing={2.5} sx={{ mb: 3, width: '100%' }}>
        {/* Combined Returns Value Bar */}
        <Grid item xs={12} lg={7} sx={{width: '100%'}}>
          <ChartPaper title="Monthly Returns Value Comparison">
            {combined.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No return data available</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={combined} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(primary, 0.08)} />
                  <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => fmtCurrency(v)} tick={{ fontSize: 11 }} width={60} />
                  <ReTooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "0.78rem" }} />
                  <Bar dataKey="sales_return_value"    name="Sales Return ₹"    fill="#ef4444" radius={[3, 3, 0, 0]} barSize={14} />
                  <Bar dataKey="purchase_return_value" name="Purchase Return ₹" fill="#f97316" radius={[3, 3, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartPaper>
        </Grid>

        {/* Verification Status Pies */}
        <Grid item xs={12} sm={6} lg={2.5} sx={{width: {xs: '100%', sm: '100%', md: '48%'}}}>
          <ChartPaper title="Sales Return Status">
            {srStatusData.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4, fontSize: "0.8rem" }}>No data</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={srStatusData} dataKey="value" cx="50%" cy="50%" outerRadius={72} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} style={{ fontSize: "0.65rem" }}>
                    {srStatusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v, "Count"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartPaper>
        </Grid>

        <Grid item xs={12} sm={6} lg={2.5} sx={{width: {xs: '100%', sm: '100%', md: '48%'}}}>
          <ChartPaper title="Purchase Return Status">
            {prStatusData.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4, fontSize: "0.8rem" }}>No data</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={prStatusData} dataKey="value" cx="50%" cy="50%" outerRadius={72} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} style={{ fontSize: "0.65rem" }}>
                    {prStatusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v, "Count"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartPaper>
        </Grid>
      </Grid>

      {/* Monthly Count Trend */}
      <ChartPaper title="Monthly Returns Count Trend">
        {combined.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No data available</Typography>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={combined} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="srCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="prCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(primary, 0.08)} />
              <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <ReTooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "0.78rem" }} />
              <Area type="monotone" dataKey="sales_return_count"    name="Sales Returns"    stroke="#ef4444" fill="url(#srCount)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="purchase_return_count" name="Purchase Returns" stroke="#f97316" fill="url(#prCount)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartPaper>
    </Box>
  );
}