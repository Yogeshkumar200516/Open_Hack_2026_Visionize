import React, { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Typography, useTheme, TablePagination,
  TableSortLabel
} from "@mui/material";

function formatSafeDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return isNaN(d.getTime())
    ? "-"
    : d.toLocaleDateString("en-GB");
}

const HighGstInvoicesTable = ({ highGstInvoices, safeToFixed, subscriptionType }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("");

  const docNumberLabel = subscriptionType === "bill" ? "Bill Number" : "Invoice Number";

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const comparator = (a, b) => {
    let valA = a[orderBy];
    let valB = b[orderBy];

    if (orderBy === "invoice_date") {
      valA = new Date(valA).getTime() || 0;
      valB = new Date(valB).getTime() || 0;
    } else if (orderBy === "customer_name") {
      valA = (valA || "").toLowerCase();
      valB = (valB || "").toLowerCase();
    } else {
      valA = Number(valA || 0);
      valB = Number(valB || 0);
    }

    if (valA < valB) return order === "asc" ? -1 : 1;
    if (valA > valB) return order === "asc" ? 1 : -1;
    return 0;
  };

  const sortedData = useMemo(() => {
    if (!orderBy) return highGstInvoices;
    return [...highGstInvoices].sort(comparator);
  }, [highGstInvoices, order, orderBy]);

  const paginatedInvoices = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const columns = [
    { id: "serial", label: "S.No", sortable: false },
    { id: "customer_name", label: "Customer Name", sortable: true },
    { id: "invoice_number", label: docNumberLabel, sortable: true },
    { id: "invoice_date", label: "Date", sortable: true },
    { id: "gst_amount", label: "GST Amount (₹)", sortable: true },
    { id: "total_amount", label: "Total Amount (₹)", sortable: true },
  ];

  return (
    <Paper elevation={3} sx={{ borderRadius: 3, overflow: "hidden", border: `2px solid ${primaryColor}` }}>
      <TableContainer sx={{ maxHeight: 420, overflowX: "auto", "&::-webkit-scrollbar": { height: 6, width: "4px" }, "&::-webkit-scrollbar-thumb": { backgroundColor: primaryColor, borderRadius: 4 } }}>
        <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5" }}>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  sortDirection={orderBy === col.id ? order : false}
                  sx={{
                    color: primaryColor,
                    fontWeight: "bold",
                    fontSize: { xs: "0.85rem", sm: "0.95rem" },
                    whiteSpace: "nowrap",
                    py: 2,
                    backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5",
                  }}
                >
                  {col.sortable ? (
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : "asc"}
                      onClick={() => handleRequestSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedInvoices.map((inv, index) => (
              <TableRow key={index} hover sx={{ transition: "background 0.2s ease", "&:hover": { backgroundColor: isDark ? "#2a2a2a" : "#fafafa" } }}>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>
                  {page * rowsPerPage + index + 1}
                </TableCell>
                <TableCell>{inv.customer_name || "-"}</TableCell>
                <TableCell>{inv.invoice_number || "-"}</TableCell>
                <TableCell>{formatSafeDate(inv.invoice_date)}</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold", color: primaryColor }}>
                  ₹{safeToFixed(inv.gst_amount)}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold", color: primaryColor }}>
                  ₹{safeToFixed(inv.total_amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={sortedData.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[5, 10, 20, 50]}
        sx={{
          "& .MuiTablePagination-toolbar": { backgroundColor: isDark ? "#1e1e1e" : "#fafafa", color: primaryColor },
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontWeight: "bold", fontSize: "0.875rem" },
        }}
      />
    </Paper>
  );
};

export default HighGstInvoicesTable;