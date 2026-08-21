import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../utils/axiosInstance";
import {
  Box, Grid, Typography, CircularProgress, IconButton,
  Tooltip, useMediaQuery, Chip, Tabs, Tab, alpha, Button,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssessmentIcon from "@mui/icons-material/Assessment";
import InventoryIcon from "@mui/icons-material/Inventory";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

import GSTSummaryCards from "./SummaryCards";
import FilterCollapse from "./FilterCollapse";
import MonthlyTrendChart from "./MonthlyTrendChart";
import CategorySalesPieChart from "./CategoryPieChart";
import TopGSTProductsTable from "./TopGstProductsTable";
import GstByUserTable from "./GstByUserTable";
import RecentStockMovementsTable from "./RecentStockTable";
import HighGstInvoicesTable from "./HighGstTable";
import DiscountsByProductTable from "./DiscountsTable";
import AdvanceInvoiceTable from "./AdvanceInvoiceTable";
import KPIMetricsSection from "./Kpimetricssection";
import ReturnsSection from "./Returnssection";
import ReturnStockSection from "./Returnstocksection";

import { generateTopGSTProductsPDF } from "../../components/PDFGeneration/DownloadTopGst";
import { generateHighGSTInvoicesPDF } from "../../components/PDFGeneration/DownloadTopInvoices";
import { generateDiscountsByProductPDF } from "../../components/PDFGeneration/Discounts";
import { generateGstByUserPDF } from "../../components/PDFGeneration/GstByUser";
import { generateStockMovementsPDF } from "../../components/PDFGeneration/StockMovement";
import { generateAdvanceInvoicesPDF } from "../../components/PDFGeneration/DownloadAdvanceInvoices";

import API_BASE_URL from "../../Context/Api";
import CustomerTable from "./CustomerTable";
import { generateCustomersPDF } from "../../components/PDFGeneration/DownloadCustomers";


// Styled section header component
const SectionHeader = ({ title, action, color }) => {
  const theme = useTheme();
  const primary = color || theme.palette.primary.main;
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      sx={{
        mb: 2,
        pb: 1,
        borderBottom: `2px solid ${alpha(primary, 0.25)}`,
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <Box
          sx={{
            width: 4,
            height: 24,
            borderRadius: 2,
            background: `linear-gradient(180deg, ${primary}, ${alpha(primary, 0.4)})`,
          }}
        />
        <Typography
          fontWeight={700}
          sx={{ fontSize: { xs: "1rem", sm: "1.15rem" }, color: primary, letterSpacing: "-0.01em" }}
        >
          {title}
        </Typography>
      </Box>
      {action}
    </Box>
  );
};

// Download icon button
const DownloadBtn = ({ onClick, label, primaryColor }) => (
  <Tooltip title="Download PDF" arrow>
    <IconButton
      onClick={onClick}
      size="small"
      sx={{
        color: primaryColor,
        border: `2px solid ${alpha(primaryColor, 0.9)}`,
        borderRadius: '50%',
        p: 1,
        transition: "all 0.2s",
        "&:hover": {
          border: `2px solid ${primaryColor}`,
          boxShadow: `0 0 12px ${alpha(primaryColor, 0.4)}`,
          transform: "translateY(-1px)",
        },
      }}
    >
      <CloudDownloadIcon sx={{ fontSize: 20 }} />
    </IconButton>
  </Tooltip>
);

const TABS = [
  { label: "Overview", icon: <AssessmentIcon sx={{ fontSize: 18 }} /> },
  { label: "KPI & ROI", icon: <TrendingUpIcon sx={{ fontSize: 18 }} /> },
  { label: "Returns", icon: <SwapHorizIcon sx={{ fontSize: 18 }} /> },
  { label: "Inventory", icon: <InventoryIcon sx={{ fontSize: 18 }} /> },
];

export default function Dashboard() {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab]   = useState(0);

  // Filter state
  const [selectedMonth,   setSelectedMonth]   = useState("");
  const [selectedYear,    setSelectedYear]    = useState(new Date().getFullYear());
  const [selectedWeek,    setSelectedWeek]    = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState("");
  const [selectedBillingAddress, setSelectedBillingAddress] = useState("");
  const [billingAddresses, setBillingAddresses] = useState([]);

  // Data
  const [monthlyTrend,     setMonthlyTrend]     = useState([]);
  const [topProducts,      setTopProducts]      = useState([]);
  const [gstByUser,        setGstByUser]        = useState([]);
  const [stockMovements,   setStockMovements]   = useState([]);
  const [highGstInvoices,  setHighGstInvoices]  = useState([]);
  const [discountsByProduct, setDiscountsByProduct] = useState([]);
  const [categorySales,    setCategorySales]    = useState([]);
  const [advanceInvoices,  setAdvanceInvoices]  = useState([]);
  const [summary,          setSummary]          = useState(null);
  const [kpiMetrics,       setKpiMetrics]       = useState(null);
  const [salesReturnsSummary,   setSalesReturnsSummary]   = useState(null);
  const [salesReturnsMonthly,   setSalesReturnsMonthly]   = useState([]);
  const [purchaseReturnsSummary, setPurchaseReturnsSummary] = useState(null);
  const [purchaseReturnsMonthly, setPurchaseReturnsMonthly] = useState([]);
  const [returnStockSummary, setReturnStockSummary] = useState(null);
  const [returnStockByProduct, setReturnStockByProduct] = useState([]);
  const [subscriptionType, setSubscriptionType] = useState("invoice");

  const theme   = useTheme();
  const { palette } = theme;
  const primary = palette.primary.main;
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [customers, setCustomers] = useState([]);

  const safeToFixed       = (v, d = 2) => { const n = Number(v); return !isNaN(n) ? n.toFixed(d) : "-"; };
  const safeToLocaleString = (v)       => { const n = Number(v); return !isNaN(n) ? n.toLocaleString() : "-"; };

  const buildParams = useCallback(() => {
    const p = {};
    if (selectedMonth)   p.month   = selectedMonth;
    if (selectedYear)    p.year    = selectedYear;
    if (selectedWeek)    p.week    = selectedWeek;
    if (selectedQuarter) p.quarter = selectedQuarter;
    if (selectedDateFilter) p.date_filter = selectedDateFilter;
    if (selectedBillingAddress) p.billing_address_id = selectedBillingAddress;
    return p;
  }, [selectedMonth, selectedYear, selectedWeek, selectedQuarter, selectedDateFilter, selectedBillingAddress]);

 const fetchAll = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setFetchError(null);
    const params = buildParams();

    try {
      const endpoints = [
        { key: "summary",                url: `/api/gst-reports/summary` },
        { key: "monthlyTrend",           url: `/api/gst-reports/monthly` },
        { key: "topProducts",            url: `/api/gst-reports/top-products` },
        { key: "gstByUser",              url: `/api/gst-reports/gst-by-user` },
        { key: "stockMovements",         url: `/api/gst-reports/stock-movements` },
        { key: "highGstInvoices",        url: `/api/gst-reports/high-gst-invoices` },
        { key: "discountsByProduct",     url: `/api/gst-reports/discounts-by-product` },
        { key: "categorySales",          url: `/api/gst-reports/category-sales` },
        { key: "advanceInvoices",        url: `/api/gst-reports/advance-invoices` },
        { key: "kpiMetrics",             url: `/api/gst-reports/kpi-metrics` },
        { key: "salesReturnsSummary",    url: `/api/gst-reports/sales-returns-summary` },
        { key: "salesReturnsMonthly",    url: `/api/gst-reports/sales-returns-monthly` },
        { key: "purchaseReturnsSummary", url: `/api/gst-reports/purchase-returns-summary` },
        { key: "purchaseReturnsMonthly", url: `/api/gst-reports/purchase-returns-monthly` },
        { key: "returnStockSummary",     url: `/api/gst-reports/return-stock-summary` },
        { key: "returnStockByProduct",   url: `/api/gst-reports/return-stock-by-product` },
        { key: "billingAddresses",       url: `/api/gst-reports/billing-addresses` },
      ];

      const results = await Promise.allSettled(
        endpoints.map(e =>
          axiosInstance.get(e.url, {
            params: e.key === "billingAddresses" ? {} : params,
          })
        )
      );

      const handlers = {
        summary:                (v) => { setSummary(v || null); setSubscriptionType(v?.subscription_type || "invoice"); },
        monthlyTrend:           setMonthlyTrend,
        topProducts:            setTopProducts,
        gstByUser:              setGstByUser,
        stockMovements:         setStockMovements,
        highGstInvoices:        setHighGstInvoices,
        discountsByProduct:     setDiscountsByProduct,
        categorySales:          setCategorySales,
        advanceInvoices:        setAdvanceInvoices,
        kpiMetrics:             setKpiMetrics,
        salesReturnsSummary:    setSalesReturnsSummary,
        salesReturnsMonthly:    setSalesReturnsMonthly,
        purchaseReturnsSummary: setPurchaseReturnsSummary,
        purchaseReturnsMonthly: setPurchaseReturnsMonthly,
        returnStockSummary:     setReturnStockSummary,
        returnStockByProduct:   setReturnStockByProduct,
        billingAddresses:       setBillingAddresses,
      };

      let failedEssential = false;

      results.forEach((res, i) => {
        const { key, url } = endpoints[i];

        if (res.status === "fulfilled") {
          handlers[key](res.value.data);
        } else {
          // ── Detailed error breakdown ──────────────────────────────
          const err = res.reason;
          const httpStatus  = err?.response?.status;
          const serverMsg   = err?.response?.data?.message || err?.response?.data?.error;
          const serverError = err?.response?.data?.error   || err?.response?.data;

          console.group(`❌ [${key}] fetch failed`);
          console.error("URL        :", url);
          console.error("HTTP Status:", httpStatus  ?? "No response (network/CORS?)");
          console.error("Server Msg :", serverMsg   ?? "—");
          console.error("Server Err :", serverError ?? "—");
          console.error("Raw reason :", err?.message);
          console.groupEnd();

          if (key === "summary") failedEssential = true;
        }
      });

      if (failedEssential) {
        setFetchError("Essential dashboard data failed to load. Please try again.");
      }

    } catch (err) {
      console.error("Dashboard fetch error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to load dashboard data";
      setFetchError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildParams]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const docName       = subscriptionType === "bill" ? "Bill" : "Invoice";
  const docNamePlural = subscriptionType === "bill" ? "Bills" : "Invoices";

const TotalReturns = React.useMemo(() => {
  const salesReturns = Number(salesReturnsSummary?.total_returns) || 0;
  const purchaseReturns = Number(purchaseReturnsSummary?.total_returns) || 0;
  return salesReturns + purchaseReturns;
}, [salesReturnsSummary, purchaseReturnsSummary]);

const PendingReturns = React.useMemo(() => {
  const pendingSalesReturns = Number(salesReturnsSummary?.pending_count) || 0;
  const pendingPurchaseReturns = Number(purchaseReturnsSummary?.pending_count) || 0;
  return pendingSalesReturns + pendingPurchaseReturns;
}, [salesReturnsSummary, purchaseReturnsSummary]);


  if (loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 2 }}>
        <CircularProgress size={48} thickness={3} />
        <Typography color="text.secondary" sx={{ fontSize: "0.9rem", letterSpacing: "0.05em" }}>
          Loading dashboard data…
        </Typography>
      </Box>
    );
  }

  if (fetchError) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 2, p: 3 }}>
        <Typography color="error" variant="h6" fontWeight={700}>⚠️ Dashboard Error</Typography>
        <Typography color="text.secondary" sx={{ fontSize: "0.9rem", textAlign: "center", maxWidth: 480 }}>
          {fetchError}
        </Typography>
        <Button variant="outlined" onClick={() => fetchAll()} sx={{ mt: 1 }}>Retry</Button>
      </Box>
    );
  }

  const activeFiltersCount = [selectedMonth, selectedWeek, selectedQuarter, selectedDateFilter, selectedBillingAddress]
    .filter(Boolean).length;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3.5 }, mt: { xs: 5, sm: 3 }, maxWidth: "100vw", overflowX: "hidden" }}>

      {/* ── Top bar ── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" mb={2} gap={1}>
        <Box>
          <Typography
            sx={{
              color: primary,
              fontSize: { xs: "22px", sm: "26px", md: "30px" },
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </Typography>
        </Box>

        <Box display="flex" gap={1} alignItems="center">
  <Tooltip title="Refresh data" arrow>
    <IconButton
      onClick={() => fetchAll(true)}
      disabled={refreshing}
      sx={{
        width: 40,
        height: 40,
        border: `1.5px solid ${alpha(primary, 0.35)}`,
        borderRadius: 1.5,
        color: primary,
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        "&:hover": {
          boxShadow: `0 0 10px ${alpha(primary, 0.3)}`
        }
      }}
    >
      <RefreshIcon
        sx={{
          fontSize: 20,
          animation: refreshing ? "spin 1s linear infinite" : "none",
          "@keyframes spin": {
            from: { transform: "rotate(0deg)" },
            to: { transform: "rotate(360deg)" }
          }
        }}
      />
    </IconButton>
  </Tooltip>

  <Tooltip title="Toggle Filters" arrow>
    <IconButton
      onClick={() => setShowFilters(p => !p)}
      sx={{
        width: 40,
        height: 40,
        border: `1.5px solid ${
          showFilters ? primary : alpha(primary, 0.35)
        }`,
        borderRadius: 1.5,
        color: primary,
        background: showFilters
          ? alpha(primary, 0.08)
          : "transparent",
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        "&:hover": {
          boxShadow: `0 0 10px ${alpha(primary, 0.3)}`
        }
      }}
    >
      <Box position="relative" display="flex" alignItems="center">
        <FilterAltIcon sx={{ fontSize: 20 }} />

        {activeFiltersCount > 0 && (
          <Box
            sx={{
              position: "absolute",
              top: -6,
              right: -6,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Typography
              sx={{
                fontSize: 9,
                color: "#fff",
                fontWeight: 700,
                lineHeight: 1
              }}
            >
              {activeFiltersCount}
            </Typography>
          </Box>
        )}
      </Box>
    </IconButton>
  </Tooltip>
</Box>
      </Box>

      {/* ── Filter Panel ── */}
      <FilterCollapse
        showFilters={showFilters}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        selectedWeek={selectedWeek}
        selectedQuarter={selectedQuarter}
        selectedDateFilter={selectedDateFilter}
        selectedBillingAddress={selectedBillingAddress}
        billingAddresses={billingAddresses}
        setSelectedMonth={setSelectedMonth}
        setSelectedYear={setSelectedYear}
        setSelectedWeek={setSelectedWeek}
        setSelectedQuarter={setSelectedQuarter}
        setSelectedDateFilter={setSelectedDateFilter}
        setSelectedBillingAddress={setSelectedBillingAddress}
      />

      {/* ── Active Filter Chips ── */}
      {activeFiltersCount > 0 && (
        <Box display="flex" gap={0.75} flexWrap="wrap" mb={2}>
          {selectedDateFilter && (
            <Chip label={selectedDateFilter === "today" ? "Today" : "Yesterday"} size="small" onDelete={() => setSelectedDateFilter("")}
              sx={{ borderColor: primary, color: primary, border: `1px solid ${alpha(primary,0.5)}`, textTransform: 'capitalize' }} variant="outlined" />
          )}
          {selectedQuarter && (
            <Chip label={`Q${selectedQuarter}`} size="small" onDelete={() => setSelectedQuarter("")}
              sx={{ borderColor: primary, color: primary, border: `1px solid ${alpha(primary,0.5)}` }} variant="outlined" />
          )}
          {selectedWeek && (
            <Chip label={`Week ${selectedWeek}`} size="small" onDelete={() => setSelectedWeek("")}
              sx={{ borderColor: primary, color: primary, border: `1px solid ${alpha(primary,0.5)}` }} variant="outlined" />
          )}
          {selectedBillingAddress && (
            <Chip
              label={billingAddresses.find(b => b.billing_address_id === Number(selectedBillingAddress))?.address_name || "Address"}
              size="small" onDelete={() => setSelectedBillingAddress("")}
              sx={{ borderColor: primary, color: primary, border: `1px solid ${alpha(primary,0.5)}` }} variant="outlined"
            />
          )}
        </Box>
      )}

      {/* ── Tab Navigation ── */}
      <Box
        sx={{
          mb: 3,
          borderRadius: 2,
          background: theme.palette.mode === "dark" ? alpha("#fff", 0.04) : alpha(primary, 0.04),
          border: `1px solid ${alpha(primary, 0.12)}`,
          p: 0.5,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons="auto"
          sx={{
            minHeight: 40,
            "& .MuiTab-root": {
              minHeight: 38, fontSize: "0.8rem", fontWeight: 600,
              textTransform: "none", borderRadius: 1.5,
              transition: "all 0.2s", gap: 0.5, py: 0.75,
            },
            "& .Mui-selected": {
              background: alpha(primary, 0.12),
              color: `${primary} !important`,
            },
            "& .MuiTabs-indicator": { display: "none" },
          }}
        >
          {TABS.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Box>

      {/* ══════════════════════════════════════════════════
          TAB 0 — OVERVIEW
      ══════════════════════════════════════════════════ */}
      {activeTab === 0 && (
        <>
          <SectionHeader title={`Overall ${docName} Summary`} />
          <GSTSummaryCards pendingReturns={PendingReturns} summary={summary} subscriptionType={subscriptionType} kpiMetrics={kpiMetrics} totalReturns={TotalReturns} />

          <Grid
  container
  spacing={3}
  sx={{ mt: 5, mb: 1, width: "100%" }}
  alignItems="stretch" // 🔥 KEY FIX
>
  {/* LEFT GRID */}
  <Grid
    item
    xs={12}
    lg={7}
    sx={{
      width: {
        xs: "100%",
        sm: "100%",
        md: "48%",
        lg: "48%",
        xl: "58%",
      },
      display: "flex", // 🔥 IMPORTANT
      flexDirection: "column",
    }}
  >
    <SectionHeader title="Monthly GST & Sales Trend" />

    <Box
      sx={{
        flex: 1, // 🔥 Makes it stretch fully
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ overflowX: "auto", flex: 1 }}>
        <MonthlyTrendChart
          monthlyTrend={monthlyTrend}
          subscriptionType={subscriptionType}
        />
      </Box>
    </Box>
  </Grid>

  {/* RIGHT GRID */}
  <Grid
    item
    xs={12}
    lg={5}
    sx={{
      width: {
        xs: "100%",
        sm: "100%",
        md: "48%",
        lg: "48%",
        xl: "42%",
      },
      display: "flex", // 🔥 IMPORTANT
      flexDirection: "column",
    }}
  >
    <SectionHeader title="Category-wise Sales" />

    <Box
      sx={{
        flex: 1, // 🔥 Matches left height automatically
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CategorySalesPieChart
        categorySales={categorySales}
        subscriptionType={subscriptionType}
      />
    </Box>
  </Grid>
</Grid>

          <Box sx={{ mb: 3 }}>
            <SectionHeader
              title="Top GST Contributing Products"
              action={
                <DownloadBtn
                  onClick={() => generateTopGSTProductsPDF(topProducts, subscriptionType)}
                  label={`Download ${docNamePlural} PDF`}
                  primaryColor={primary}
                />
              }
            />
            <Box sx={{ overflowX: "auto" }}>
              <TopGSTProductsTable
                topProducts={topProducts}
                safeToFixed={safeToFixed}
                safeToLocaleString={safeToLocaleString}
                subscriptionType={subscriptionType}
              />
            </Box>
          </Box>

          <Grid container spacing={0} sx={{ mb: 3, width: '100%' }}>
            <Grid item xs={12} lg={6} sx={{width: '100%'}}>
              <SectionHeader
                title="GST Reported by User"
                action={
                  <DownloadBtn
                    onClick={() => generateGstByUserPDF(gstByUser, subscriptionType)}
                    label="Download PDF"
                    primaryColor={primary}
                  />
                }
              />
              <GstByUserTable
                gstByUser={gstByUser}
                safeToFixed={safeToFixed}
                safeToLocaleString={safeToLocaleString}
                subscriptionType={subscriptionType}
              />
            </Grid>
            <Grid item xs={12} lg={6} sx={{width: '100%'}}>
              <SectionHeader
                title={`Top GST ${docNamePlural}`}
                action={
                  <DownloadBtn
                    onClick={() => generateHighGSTInvoicesPDF(highGstInvoices, subscriptionType)}
                    label="Download PDF"
                    primaryColor={primary}
                  />
                }
              />
              <HighGstInvoicesTable
                highGstInvoices={highGstInvoices}
                safeToFixed={safeToFixed}
                subscriptionType={subscriptionType}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3} sx={{ mb: 0, width: '100%' }}>
            <Grid item xs={12} lg={6} sx={{width: '100%'}}>
              <SectionHeader
                title="Product-wise Discount"
                action={
                  <DownloadBtn
                    onClick={() => generateDiscountsByProductPDF(discountsByProduct, subscriptionType)}
                    label="Download PDF"
                    primaryColor={primary}
                  />
                }
              />
              <DiscountsByProductTable
                discountsByProduct={discountsByProduct}
                safeToFixed={safeToFixed}
                subscriptionType={subscriptionType}
              />
            </Grid>
            <Grid item xs={12} lg={6} sx={{width: '100%'}}>
              <SectionHeader
                title="Advance Payment Summary"
                action={
                  <DownloadBtn
                    onClick={() => generateAdvanceInvoicesPDF(advanceInvoices, subscriptionType)}
                    label="Download PDF"
                    primaryColor={primary}
                  />
                }
              />
              <AdvanceInvoiceTable
                advanceInvoices={advanceInvoices}
                safeToFixed={safeToFixed}
                subscriptionType={subscriptionType}
              />
            </Grid>
          </Grid>


          <Grid container spacing={3} sx={{ mb: 3, width: '100%' }}>
            <Grid item xs={12} lg={6} sx={{width: '100%'}}>
              <SectionHeader
                title="Customer Management"
                action={
                  <DownloadBtn

onClick={() => generateCustomersPDF(customers)}
                    label="Download PDF"
                    primaryColor={primary}
                  />
                }
              />
              <CustomerTable
                advanceInvoices={advanceInvoices}
                safeToFixed={safeToFixed}
                subscriptionType={subscriptionType}
                setExportCustomers={setCustomers}
              />
            </Grid>
          </Grid>
        </>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 1 — KPI & ROI
      ══════════════════════════════════════════════════ */}
      {activeTab === 1 && (
        <KPIMetricsSection
          kpiMetrics={kpiMetrics}
          monthlyTrend={monthlyTrend}
          salesReturnsMonthly={salesReturnsMonthly}
          purchaseReturnsMonthly={purchaseReturnsMonthly}
          subscriptionType={subscriptionType}
          safeToFixed={safeToFixed}
          safeToLocaleString={safeToLocaleString}
        />
      )}

      {/* ══════════════════════════════════════════════════
          TAB 2 — RETURNS
      ══════════════════════════════════════════════════ */}
      {activeTab === 2 && (
        <ReturnsSection
          salesReturnsSummary={salesReturnsSummary}
          salesReturnsMonthly={salesReturnsMonthly}
          purchaseReturnsSummary={purchaseReturnsSummary}
          purchaseReturnsMonthly={purchaseReturnsMonthly}
          safeToFixed={safeToFixed}
          safeToLocaleString={safeToLocaleString}
        />
      )}

      {/* ══════════════════════════════════════════════════
          TAB 3 — INVENTORY / RETURN STOCK
      ══════════════════════════════════════════════════ */}
      {activeTab === 3 && (
        <>
          <ReturnStockSection
            returnStockSummary={returnStockSummary}
            returnStockByProduct={returnStockByProduct}
            safeToLocaleString={safeToLocaleString}
          />
          <Box sx={{ mt: 3 }}>
            <SectionHeader
              title="Recent Stock Movements"
              action={
                <DownloadBtn
                  onClick={() => generateStockMovementsPDF(stockMovements, subscriptionType)}
                  label="Download PDF"
                  primaryColor={primary}
                />
              }
            />
            <RecentStockMovementsTable
              stockMovements={stockMovements}
              safeToLocaleString={safeToLocaleString}
              subscriptionType={subscriptionType}
            />
          </Box>
        </>
      )}
    </Box>
  );
}