import React, { useState } from "react";
import {
  Box, Grid, Typography, Paper, alpha,
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, TablePagination, useTheme, LinearProgress,
} from "@mui/material";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import VerifiedIcon from "@mui/icons-material/Verified";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import InventoryIcon from "@mui/icons-material/Inventory2";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import DeleteIcon from "@mui/icons-material/Delete";

const fmtNum = (v) => Number(v || 0).toLocaleString("en-IN");

function StatCard({ label, value, icon: Icon, color }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Paper elevation={0} sx={{
      p: 2, borderRadius: 2, height: "100%",
      border: `1.5px solid ${alpha(color, 0.2)}`,
      background: isDark
        ? `linear-gradient(135deg, ${alpha(color, 0.08)}, transparent)`
        : `linear-gradient(135deg, ${alpha(color, 0.05)}, ${alpha("#fff", 0.9)})`,
      transition: "all 0.2s",
      "&:hover": { border: `1.5px solid ${alpha(color, 0.45)}`, transform: "translateY(-2px)" },
    }}>
      <Box sx={{
        width: 34, height: 34, borderRadius: 1.5,
        background: alpha(color, 0.12),
        display: "flex", alignItems: "center", justifyContent: "center", mb: 1,
      }}>
        <Icon sx={{ fontSize: 17, color }} />
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

export default function ReturnStockSection({ returnStockSummary, returnStockByProduct, safeToLocaleString }) {
  const theme  = useTheme();
  const primary = theme.palette.primary.main;
  const isDark  = theme.palette.mode === "dark";
    const primaryColor = theme.palette.primary.main;

  const [page, setPage]               = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const s = returnStockSummary || {};

  const summaryCards = [
    { label: "Total Verifications",    value: fmtNum(s.total_verifications),       icon: VerifiedIcon,        color: primary    },
    { label: "Total Returned Qty",     value: fmtNum(s.total_returned_qty),         icon: InventoryIcon,       color: "#6366f1"  },
    { label: "Sellable (Re-stock)",    value: fmtNum(s.total_sellable),             icon: InventoryIcon,       color: "#22c55e"  },
    { label: "Damaged",                value: fmtNum(s.total_damaged),              icon: BuildCircleIcon,     color: "#f59e0b"  },
    { label: "Scrap",                  value: fmtNum(s.total_scrap),                icon: DeleteIcon,          color: "#ef4444"  },
    { label: "Pending Verifications",  value: fmtNum(s.pending_verifications),      icon: PendingActionsIcon,  color: "#f97316"  },
  ];

  // Bar chart data for top returned products
  const chartData = returnStockByProduct.slice(0, 10).map(p => ({
    name: p.product_name?.length > 14 ? p.product_name.slice(0, 13) + "…" : p.product_name,
    full_name: p.product_name,
    Sellable: Number(p.total_sellable || 0),
    Damaged:  Number(p.total_damaged  || 0),
    Scrap:    Number(p.total_scrap    || 0),
  }));

  const paginated = returnStockByProduct.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Box sx={{ width: 3, height: 20, borderRadius: 1, background: "#22c55e" }} />
        <Typography fontWeight={700} sx={{ color: "#22c55e", fontSize: "0.95rem", letterSpacing: "-0.01em" }}>
          Return Stock Verification
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
        {summaryCards.map((c, i) => (
          <Grid item xs={6} sm={4} md={2} key={i} sx={{width: {xs: '100%', sm: '48%', md: '32%', lg: '20%', xl: '15%'}}}>
            <StatCard {...c} />
          </Grid>
        ))}
      </Grid>

      {/* Stock Distribution Bar */}
      <Grid container spacing={2.5} sx={{ mb: 3, width: '100%' }}>
        <Grid item xs={12} lg={7} sx={{width: {xs: '100%', sm: '100%', md: '48%'}}}>
          <Paper elevation={0} sx={{
            p: 2.5, borderRadius: 2,
            border: `1.5px solid ${alpha(primary, 0.15)}`,
            background: isDark ? alpha("#fff", 0.02) : alpha(primary, 0.015),
          }}>
            <Typography fontWeight={700} sx={{ color: primary, fontSize: "0.875rem", mb: 2 }}>
              Top Returned Products – Stock Distribution
            </Typography>
            {chartData.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No verification data available</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(primary, 0.08)} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ReTooltip
                    formatter={(v, n, props) => [v, n]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.full_name || ""}
                    contentStyle={{
                      background: isDark ? "#1e1e2e" : "#fff",
                      border: `1px solid ${alpha(primary, 0.2)}`,
                      borderRadius: 8, fontSize: "0.75rem",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "0.78rem" }} />
                  <Bar dataKey="Sellable" fill="#22c55e" radius={[3, 3, 0, 0]} barSize={12} />
                  <Bar dataKey="Damaged"  fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={12} />
                  <Bar dataKey="Scrap"    fill="#ef4444" radius={[3, 3, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Overall Distribution Breakdown */}
        <Grid item xs={12} lg={5} sx={{width: {xs: '100%', sm: '100%', md: '48%'}}}>
          <Paper elevation={0} sx={{
            p: 2.5, borderRadius: 2, height: "100%",
            border: `1.5px solid ${alpha(primary, 0.15)}`,
            background: isDark ? alpha("#fff", 0.02) : alpha(primary, 0.015),
          }}>
            <Typography fontWeight={700} sx={{ color: primary, fontSize: "0.875rem", mb: 2.5 }}>
              Overall Stock Distribution
            </Typography>
            {[
              { label: "Sellable",    value: Number(s.total_sellable || 0), total: Number(s.total_returned_qty || 1), color: "#22c55e" },
              { label: "Damaged",     value: Number(s.total_damaged  || 0), total: Number(s.total_returned_qty || 1), color: "#f59e0b" },
              { label: "Scrap",       value: Number(s.total_scrap    || 0), total: Number(s.total_returned_qty || 1), color: "#ef4444" },
            ].map((item, i) => {
              const pct = item.total > 0 ? ((item.value / item.total) * 100).toFixed(1) : "0.0";
              return (
                <Box key={i} mb={2.5}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: item.color }}>{item.label}</Typography>
                    <Box display="flex" gap={1} alignItems="center">
                      <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{fmtNum(item.value)} units</Typography>
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: item.color }}>{pct}%</Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Number(pct)}
                    sx={{
                      height: 8, borderRadius: 4,
                      background: alpha(item.color, 0.15),
                      "& .MuiLinearProgress-bar": {
                        background: `linear-gradient(90deg, ${item.color}, ${alpha(item.color, 0.7)})`,
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>
              );
            })}
            <Box sx={{ mt: 3, p: 1.5, borderRadius: 1.5, background: alpha(primary, 0.05), border: `1px dashed ${alpha(primary, 0.2)}` }}>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                <strong style={{ color: primary }}>Recovery Rate: </strong>
                {Number(s.total_returned_qty) > 0
                  ? `${((Number(s.total_sellable || 0) / Number(s.total_returned_qty)) * 100).toFixed(1)}%`
                  : "–"
                } of returned items re-enter sellable stock
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Table */}
      <Paper elevation={0} sx={{
        borderRadius: 2, overflow: "hidden",
        border: `1.5px solid ${alpha(primary, 0.2)}`,
      }}>
        <Box sx={{ p: 2, borderBottom: `1px solid ${alpha(primary, 0.1)}` }}>
          <Typography fontWeight={700} sx={{ color: primary, fontSize: "0.875rem" }}>
            Return Stock by Product
          </Typography>
        </Box>
        <TableContainer sx={{
          maxHeight: 380,
          "&::-webkit-scrollbar": { width: "4px", height: "4px" },
          "&::-webkit-scrollbar-thumb": { background: primaryColor, borderRadius: 4 },
        }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {["#","Product","Total Returned","Sellable","Damaged","Scrap"].map(h => (
                  <TableCell key={h} sx={{
                    fontWeight: 700, color: primary, fontSize: "0.8rem",
                    background: isDark ? "#1e1e1e" : "#f8f8f8",
                    whiteSpace: "nowrap", py: 1.5,
                    textAlign: h === "#" ? "center" : "left",
                  }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" sx={{ py: 3, fontSize: "0.85rem" }}>No data available</Typography>
                  </TableCell>
                </TableRow>
              ) : paginated.map((row, i) => (
                <TableRow key={row.product_id} hover>
                  <TableCell align="center" sx={{ fontWeight: 600, fontSize: "0.8rem" }}>
                    {page * rowsPerPage + i + 1}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.82rem" }}>{row.product_name}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: primary }}>{fmtNum(row.total_returned)}</TableCell>
                  <TableCell sx={{ color: "#22c55e", fontWeight: 600 }}>{fmtNum(row.total_sellable)}</TableCell>
                  <TableCell sx={{ color: "#f59e0b", fontWeight: 600 }}>{fmtNum(row.total_damaged)}</TableCell>
                  <TableCell sx={{ color: "#ef4444", fontWeight: 600 }}>{fmtNum(row.total_scrap)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={returnStockByProduct.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 20]}
          sx={{
            "& .MuiTablePagination-toolbar": {
              background: isDark ? "#1e1e1e" : "#fafafa",
              color: primary,
              fontSize: "0.8rem",
            },
          }}
        />
      </Paper>
    </Box>
  );
}