import React, { useState } from "react";
import {
  Paper,
  Typography,
  IconButton,
  Box,
  useTheme,
  GlobalStyles,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

// Month name map
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Format YYYY-MM to "Month YYYY"
function formatMonthYear(monthStr) {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-");
  const monthIndex = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

// Custom dark-themed tooltip component
function CustomTooltip({ active, payload, label, subscriptionType }) {
  if (active && payload && payload.length > 0) {
    const invoiceOrBill = subscriptionType === "bill" ? "Bills" : "Invoices";
    const labelMap = {
      total_gst: "Total GST",
      total_sales: "Total Sales",
      total_invoices: invoiceOrBill,
      total_bills: invoiceOrBill,
    };

    return (
      <Box
        sx={{
          backgroundColor: "#1e1e1e",
          border: "1px solid #444",
          p: 2,
          borderRadius: 2,
          boxShadow: 3,
          minWidth: 180,
        }}
      >
        {payload.map((entry, index) => {
          const key = entry.name === "Invoices" ? "total_invoices"
            : entry.name === "Bills" ? "total_bills"
            : entry.name;
          const label = labelMap[key] || entry.name;
          const value = key === "total_sales"
            ? `₹${entry.value.toLocaleString()}`
            : entry.value.toLocaleString();

          return (
            <Box
              key={index}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                color: entry.color,
                mb: 0.5,
              }}
            >
              <Typography variant="body2">{label}</Typography>
              <Typography variant="body2" fontWeight="bold">
                {value}
              </Typography>
            </Box>
          );
        })}
      </Box>
    );
  }
  return null;
}

export default function MonthlyTrendChart({ monthlyTrend }) {
  const ITEMS_PER_PAGE = 12;
  const [startIndex, setStartIndex] = useState(0);
  const theme = useTheme();
  const { palette } = theme;
  const primaryColor = palette.primary.main;

  // Slice data for current page (12 months)
  const displayedData = monthlyTrend.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Enable/disable navigation buttons
  const canGoPrev = startIndex > 0;
  const canGoNext = startIndex + ITEMS_PER_PAGE < monthlyTrend.length;
  const subscriptionType = localStorage.getItem("subscriptionType");

  // Contextual bar key
  const docPluralKey = subscriptionType === "bill" ? "total_bills" : "total_invoices";
  const docPluralLabel = subscriptionType === "bill" ? "Bills" : "Invoices";

  return (
    <>
      {/* Inject global styles to remove white tooltip background */}
      <GlobalStyles
        styles={{
          ".recharts-default-tooltip": {
            backgroundColor: "transparent !important",
            border: "none !important",
            boxShadow: "none !important",
            padding: "0 !important",
            margin: "0 !important",
          },
        }}
      />

      <Paper
        sx={{
          px: { xs: 1, sm: 2 },
          py: 3,
          mb: 1,
          borderRadius: 3,
          border: `1px solid ${primaryColor}`,
        }}
      >
        {monthlyTrend.length === 0 ? (
          <Typography>No data found.</Typography>
        ) : (
          <>
            {/* Pagination Controls */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
              <IconButton
                onClick={() => setStartIndex((i) => Math.max(0, i - ITEMS_PER_PAGE))}
                disabled={!canGoPrev}
                size="small"
                aria-label="Previous months"
              >
                <ArrowBackIosNewIcon sx={{ fontSize: "14px" }} />
              </IconButton>
              <IconButton
                onClick={() => setStartIndex((i) =>
                  Math.min(
                    monthlyTrend.length - ITEMS_PER_PAGE,
                    i + ITEMS_PER_PAGE
                  )
                )}
                disabled={!canGoNext}
                size="small"
                aria-label="Next months"
              >
                <ArrowForwardIosIcon sx={{ fontSize: "14px" }} />
              </IconButton>
            </Box>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={displayedData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                {/* X Axis */}
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonthYear}
                  stroke={primaryColor}
                  tick={{ fontSize: 12, fill: primaryColor }}
                  axisLine={{ stroke: primaryColor }}
                  tickLine={{ stroke: primaryColor }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />

                <YAxis
                  stroke={primaryColor}
                  tick={{ fontSize: 12, fill: primaryColor }}
                  axisLine={{ stroke: primaryColor }}
                  tickLine={{ stroke: primaryColor }}
                  tickFormatter={(value) => `₹${value.toLocaleString()}`}
                  width={60}
                />

                {/* Tooltip with transparent background */}
                <Tooltip
                  content={
                    (props) => (
                      <CustomTooltip {...props} subscriptionType={subscriptionType} />
                    )
                  }
                  cursor={{ fill: "transparent" }}
                  wrapperStyle={{
                    backgroundColor: "transparent",
                    border: "none",
                    boxShadow: "none",
                    pointerEvents: "none",
                    zIndex: 9999,
                  }}
                />

                {/* Legend */}
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  payload={[
                    { value: "Total GST", type: "square", id: "ID01", color: "#3f51b5" },
                    { value: "Total Sales", type: "square", id: "ID02", color: "#ff7300" },
                    { value: docPluralLabel, type: "square", id: "ID03", color: "#00c49f" },
                  ]}
                />

                {/* Bars */}
                <Bar
                  dataKey="total_gst"
                  name="Total GST"
                  fill="#3f51b5"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="total_sales"
                  name="Total Sales"
                  fill="#ff7300"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey={docPluralKey}
                  name={docPluralLabel}
                  fill="#00c49f"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </Paper>
    </>
  );
}
