import React from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Tooltip,
  Fade,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

const safeToLocaleString = (value) => {
  const num = Number(value);
  return !isNaN(num) ? num.toLocaleString() : "-";
};

export default function ReturnsSummaryCards({ summary }) {
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const subscriptionType = localStorage.getItem("subscriptionType");

  if (!summary) {
    return (
      <Grid item xs={12}>
        <Typography align="center" color="text.secondary">
          No summary data found.
        </Typography>
      </Grid>
    );
  }

  const totalDocLabel =
    subscriptionType === "bill" ? "Total Bills" : "Total Invoices";

  const totalDocValue =
    subscriptionType === "bill"
      ? summary.total_bills
      : summary.total_invoices;

  const avgDocLabel =
    subscriptionType === "bill" ? "Avg Bill Value" : "Avg Invoice Value";

  const avgDocValue =
    subscriptionType === "bill"
      ? summary.avg_bill_value
      : summary.avg_invoice_value;

  const cards = [
    {
      label: "Total Sales",
      value: summary.total_sales,
      prefix: "₹",
      description: "Overall revenue generated including GST before returns.",
    },
    {
      label: "Total GST",
      value: summary.total_gst,
      prefix: "₹",
      description: "Total GST collected from all transactions.",
    },
    {
      label: "Total Discounts",
      value: summary.total_discount,
      prefix: "₹",
      description: "Total discount amount provided to customers.",
    },
    {
      label: "Transport Charges",
      value: summary.total_transport,
      prefix: "₹",
      description: "Total transportation charges added to transactions.",
    },
    {
      label: totalDocLabel,
      value: totalDocValue,
      description:
        subscriptionType === "bill"
          ? "Total number of bills generated."
          : "Total number of invoices generated.",
    },
    {
      label: "Total Products Sold",
      value: summary.total_products_sold,
      description: "Total quantity of products sold across all transactions.",
    },
  ];

  return (
    <Grid container spacing={1} mb={4} sx={{width: '100%'}}>
      {cards.map(({ label, value, prefix, description }, i) => (
        <Grid
          key={i}
          item
          xs={6}
          sm={6}
          md={4}
          lg={3}
          sx={{
            "@media (max-width:500px)": {
              flexBasis: "100%",
              maxWidth: "100%",
            },
            display: "flex",
            
          }}
        >
          <Tooltip
            arrow
            TransitionComponent={Fade}
            TransitionProps={{ timeout: 300 }}
            placement="top"
            title={
              <div style={{ padding: "4px 8px" }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 600, mb: 0.5 }}
                >
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {description}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: "block", mt: 1, fontWeight: 600 }}
                >
                  Value: {prefix ?? ""}
                  {safeToLocaleString(value)}
                </Typography>
              </div>
            }
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: isDark ? "#1e1e1e" : "#ffffff",
                  color: isDark ? "#fff" : "#333",
                  border: `1px solid ${primaryColor}`,
                  boxShadow: `0 4px 15px ${primaryColor}40`,
                  borderRadius: 2,
                },
              },
              arrow: {
                sx: {
                  color: isDark ? "#1e1e1e" : "#ffffff",
                },
              },
            }}
          >
            <Card
              elevation={4}
              sx={{
                height: "100%",
                width: { xs: "100%", sm: "180px" },
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                borderRadius: 2,
                backgroundColor: "background.paper",
                border: `1px solid ${primaryColor}`,
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
                cursor: "pointer",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: `0 6px 20px ${primaryColor}`,
                },
              }}
            >
              <CardContent>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                  sx={{
                    fontSize: { xs: "0.8rem", sm: "0.9rem" },
                    fontWeight: 500,
                  }}
                >
                  {label}
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{
                    fontSize: { xs: "1.1rem", sm: "1.4rem" },
                    color: isDark ? "#fff" : "#4a4a49",
                  }}
                >
                  {prefix ?? ""}
                  {safeToLocaleString(value)}
                </Typography>
              </CardContent>
            </Card>
          </Tooltip>
        </Grid>
      ))}
    </Grid>
  );
}
