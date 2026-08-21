import React from "react";
import { Grid, Card, CardContent, Typography, Tooltip, Fade, alpha, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const safeToLocaleString = (value) => {
  const num = Number(value);
  return !isNaN(num) ? num.toLocaleString("en-IN") : "-";
};

const fmtCurrency = (v) => {
  const n = Number(v || 0);
  if (n >= 10000000) return `₹${(n/10000000).toFixed(2)}Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(2)}L`;
  if (n >= 1000)     return `₹${(n/1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};

export default function GSTSummaryCards({ kpiMetrics, summary, subscriptionType, totalReturns, pendingReturns }) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const isDark = theme.palette.mode === "dark";
  const k = kpiMetrics || {};

  const ReturnValue = k.total_return_value + k.purchase_return_value;

  console.log(ReturnValue);

  if (!summary) {
    return (
      <Grid item xs={12}>
        <Typography align="center" color="text.secondary">No summary data found.</Typography>
      </Grid>
    );
  }

  const totalDocLabel = subscriptionType === "bill" ? "Total Bills" : "Total Invoices";
  const totalDocValue = subscriptionType === "bill" ? summary.total_bills : summary.total_invoices;
  const avgDocLabel   = subscriptionType === "bill" ? "Avg Bill Value" : "Avg Invoice Value";
  const avgDocValue   = subscriptionType === "bill" ? summary.avg_bill_value : summary.avg_invoice_value;

  const cards = [
    {
      label: "Total Sales",    value: fmtCurrency(summary.total_sales),
      raw: summary.total_sales, prefix: "",
      description: "Overall revenue generated including GST before returns.",
      color: "#22c55e",
    },
    {
      label: "Total GST",      value: fmtCurrency(summary.total_gst),
      raw: summary.total_gst, prefix: "",
      description: "Total GST collected from all transactions.",
      color: "#6366f1",
    },
    {
      label: "Total Discounts", value: fmtCurrency(summary.total_discount),
      raw: summary.total_discount, prefix: "",
      description: "Total discount amount provided to customers.",
      color: "#f59e0b",
    },
    {
      label: "Transport Charges", value: fmtCurrency(summary.total_transport),
      raw: summary.total_transport, prefix: "",
      description: "Total transportation charges added to transactions.",
      color: "#0ea5e9",
    },
    {
      label: totalDocLabel, value: safeToLocaleString(totalDocValue),
      raw: totalDocValue, prefix: "",
      description: subscriptionType === "bill" ? "Total number of bills generated." : "Total number of invoices generated.",
      color: primary,
    },
    {
      label: "Total Products Sold", value: safeToLocaleString(summary.total_products_sold),
      raw: summary.total_products_sold, prefix: "",
      description: "Total distinct products sold.",
      color: "#8b5cf6",
    },
    {
      label: avgDocLabel, value: fmtCurrency(avgDocValue),
      raw: avgDocValue, prefix: "",
      description: "Average transaction value.",
      color: "#ec4899",
    },
    {
      label: "CGST", value: fmtCurrency(summary.total_cgst),
      raw: summary.total_cgst, prefix: "",
      description: "Central GST collected.",
      color: "#14b8a6",
    },
  ];

  if (subscriptionType !== "bill") {
    cards.push(
      {
        label: "Total Returns",     value: safeToLocaleString(totalReturns),
        raw: totalReturns, prefix: "",
        description: "Total number of sales return entries.",
        color: "#ef4444",
      },
      {
        label: "Return Value",      value: fmtCurrency(ReturnValue),
        raw: ReturnValue, prefix: "",
        description: "Combined monetary value of all processed sales returns.",
        color: "#ef4444",
      },
      {
        label: "Pending Verification", value: safeToLocaleString(pendingReturns),
        raw: pendingReturns, prefix: "",
        description: "Return entries awaiting verification approval.",
        color: "#f97316",
      },
    );
  }

  return (
    <Grid container spacing={1.5} mb={3}sx={{width: '100%', justifyContent: 'flex-start'}}>
      {cards.map(({ label, value, raw, prefix, description, color }, i) => (
        <Grid key={i} item xs={6} sm={4} md={3} lg={2} sx={{ display: "flex", width: {xs: '100%', sm: '32%', md: '22%', lg: '15%'} }}>
          <Tooltip
            arrow
            TransitionComponent={Fade}
            TransitionProps={{ timeout: 250 }}
            placement="top"
            title={
              <div style={{ padding: "4px 8px" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.4 }}>{label}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.85, fontSize: "0.78rem" }}>{description}</Typography>
                <Typography variant="caption" sx={{ display: "block", mt: 0.75, fontWeight: 700, color }}>
                  Exact: {prefix}₹{safeToLocaleString(raw)}
                </Typography>
              </div>
            }
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: isDark ? "#1e1e2e" : "#ffffff",
                  color: isDark ? "#fff" : "#333",
                  border: `1px solid ${alpha(color, 0.3)}`,
                  boxShadow: `0 4px 20px ${alpha(color, 0.2)}`,
                  borderRadius: 2,
                },
              },
              arrow: { sx: { color: isDark ? "#1e1e2e" : "#ffffff" } },
            }}
          >
            <Card
              elevation={0}
              sx={{
                width: "100%",
                borderRadius: 2,
                border: `1.5px solid ${alpha(color, 0.2)}`,
                background: isDark
                  ? `linear-gradient(135deg, ${alpha(color, 0.1)}, ${alpha("#fff", 0.02)})`
                  : `linear-gradient(135deg, ${alpha(color, 0.06)}, ${alpha("#fff", 0.9)})`,
                transition: "all 0.25s ease",
                cursor: "default",
                "&:hover": {
                  border: `1.5px solid ${alpha(color, 0.5)}`,
                  transform: "translateY(-3px)",
                  boxShadow: `0 8px 24px ${alpha(color, 0.2)}`,
                },
              }}
            >
              <CardContent sx={{ p: "14px !important" }}>
                <Box
                  sx={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: color, mb: 1,
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: "0.7rem", fontWeight: 500, display: "block", mb: 0.5, lineHeight: 1.3 }}
                >
                  {label}
                </Typography>
                <Typography
                  fontWeight={800}
                  sx={{ fontSize: "1.1rem", color, letterSpacing: "-0.02em", lineHeight: 1.1 }}
                >
                  {value}
                </Typography>
              </CardContent>
            </Card>
          </Tooltip>
        </Grid>
      ))}
    </Grid>
  );
}