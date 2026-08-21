import React from "react";
import {
  Box, Collapse, Stack, FormControl, InputLabel,
  Select, MenuItem, Button, Typography, alpha, Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const QUARTERS = [
  { value: 1, label: "Q1 (Jan–Mar)" },
  { value: 2, label: "Q2 (Apr–Jun)" },
  { value: 3, label: "Q3 (Jul–Sep)" },
  { value: 4, label: "Q4 (Oct–Dec)" },
];

function getWeeksInYear(year) {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const used = jan1.getDay() + dec31.getDay();
  return used === 6 ? 53 : 52;
}

export default function FilterCollapse({
  showFilters,
  selectedMonth,    setSelectedMonth,
  selectedYear,     setSelectedYear,
  selectedWeek,     setSelectedWeek,
  selectedQuarter,  setSelectedQuarter,
  selectedDateFilter,   setSelectedDateFilter,
  selectedBillingAddress, setSelectedBillingAddress,
  billingAddresses = [],
}) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const isDark = theme.palette.mode === "dark";
  const currentYear = new Date().getFullYear();
  const weeksCount = getWeeksInYear(selectedYear || currentYear);

  const clearAll = () => {
    setSelectedMonth("");
    setSelectedWeek("");
    setSelectedQuarter("");
    setSelectedDateFilter("");
    setSelectedBillingAddress("");
  };

  const activeCount = [selectedMonth, selectedWeek, selectedQuarter, selectedDateFilter, selectedBillingAddress]
    .filter(Boolean).length;

  // Mutual exclusion: Quarter, Month, Week, and Date Filter (Today/Yesterday) are exclusive.
  const handleQuarter = (v) => {
    setSelectedQuarter(v);
    if (v) { setSelectedMonth(""); setSelectedWeek(""); setSelectedDateFilter(""); }
  };

  const handleMonth = (v) => {
    setSelectedMonth(v);
    if (v) { setSelectedQuarter(""); setSelectedWeek(""); setSelectedDateFilter(""); }
  };

  const handleWeek = (v) => {
    setSelectedWeek(v);
    if (v) { setSelectedMonth(""); setSelectedQuarter(""); setSelectedDateFilter(""); }
  };

  const handleDateFilter = (v) => {
    setSelectedDateFilter(v);
    if (v) { setSelectedMonth(""); setSelectedQuarter(""); setSelectedWeek(""); }
  };

  return (
    <Collapse in={showFilters} timeout={250}>
      <Box
        sx={{
          mb: 2.5,
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          border: `1.5px solid ${alpha(primary, 0.25)}`,
          background: isDark ? alpha("#fff", 0.03) : alpha(primary, 0.03),
          backdropFilter: "blur(8px)",
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Typography fontWeight={700} sx={{ color: primary, fontSize: "0.875rem", letterSpacing: "0.02em" }}>
            FILTER OPTIONS
          </Typography>
          {activeCount > 0 && (
            <Button
              startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
              onClick={clearAll}
              size="small"
              sx={{
                color: primary, fontSize: "0.75rem", textTransform: "none",
                fontWeight: 600, p: "2px 8px", borderRadius: 1,
                border: `1px solid ${alpha(primary, 0.3)}`,
                "&:hover": { background: alpha(primary, 0.08) },
              }}
            >
              Clear all ({activeCount})
            </Button>
          )}
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          flexWrap="wrap"
          useFlexGap
        >
          {/* Year */}
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <InputLabel>Year</InputLabel>
            <Select value={selectedYear} label="Year" onChange={(e) => setSelectedYear(e.target.value)}>
              {Array.from({ length: 6 }, (_, i) => currentYear - i).map(yr => (
                <MenuItem key={yr} value={yr}>{yr}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Quarter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Quarter</InputLabel>
            <Select value={selectedQuarter} label="Quarter" onChange={(e) => handleQuarter(e.target.value)}>
              <MenuItem value="">All Quarters</MenuItem>
              {QUARTERS.map(q => (
                <MenuItem key={q.value} value={q.value}>{q.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Month */}
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Month</InputLabel>
            <Select value={selectedMonth} label="Month" onChange={(e) => handleMonth(e.target.value)}>
              <MenuItem value="">All Months</MenuItem>
              {MONTHS.map((m, i) => (
                <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Week */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Week</InputLabel>
            <Select value={selectedWeek} label="Week" onChange={(e) => handleWeek(e.target.value)}>
              <MenuItem value="">All Weeks</MenuItem>
              {Array.from({ length: weeksCount }, (_, i) => i + 1).map(w => (
                <MenuItem key={w} value={w}>Week {w}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Date Filter (Today/Yesterday) */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Date Filter</InputLabel>
            <Select value={selectedDateFilter} label="Date Filter" onChange={(e) => handleDateFilter(e.target.value)}>
              <MenuItem value="">Custom / All</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="yesterday">Yesterday</MenuItem>
            </Select>
          </FormControl>

          {/* Billing Address */}
          {billingAddresses.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Billing Address</InputLabel>
              <Select
                value={selectedBillingAddress}
                label="Billing Address"
                onChange={(e) => setSelectedBillingAddress(e.target.value)}
              >
                <MenuItem value="">All Addresses</MenuItem>
                {billingAddresses.map(b => (
                  <MenuItem key={b.billing_address_id} value={b.billing_address_id}>
                    {b.address_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>

        {/* Active filter hint */}
        {activeCount > 0 && (
          <Box mt={1.5} display="flex" gap={0.75} flexWrap="wrap" alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Active:</Typography>
            {selectedDateFilter && <Chip label={selectedDateFilter === "today" ? "Today" : "Yesterday"} size="small" onDelete={() => setSelectedDateFilter("")} sx={{ height: 22, fontSize: "0.7rem", textTransform: 'capitalize' }} />}
            {selectedQuarter && <Chip label={`Q${selectedQuarter}`} size="small" onDelete={() => setSelectedQuarter("")} sx={{ height: 22, fontSize: "0.7rem" }} />}
            {selectedMonth   && <Chip label={MONTHS[selectedMonth - 1]} size="small" onDelete={() => setSelectedMonth("")} sx={{ height: 22, fontSize: "0.7rem" }} />}
            {selectedWeek    && <Chip label={`Week ${selectedWeek}`} size="small" onDelete={() => setSelectedWeek("")} sx={{ height: 22, fontSize: "0.7rem" }} />}
            {selectedBillingAddress && (
              <Chip
                label={billingAddresses.find(b => b.billing_address_id === Number(selectedBillingAddress))?.address_name || "Address"}
                size="small" onDelete={() => setSelectedBillingAddress("")}
                sx={{ height: 22, fontSize: "0.7rem" }}
              />
            )}
          </Box>
        )}
      </Box>
    </Collapse>
  );
}