import React, { useState, useMemo } from "react";
import {
  Paper,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  useTheme,
  Chip,
  TableSortLabel,
} from "@mui/material";

export default function AdvanceInvoiceTable({
  advanceInvoices,
  subscriptionType,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sorting state
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("");

  const handleChangePage = (_, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Dynamic labels
  const docLabel = subscriptionType === "bill" ? "Bill No" : "Invoice No";
  const numberKey =
    subscriptionType === "bill" ? "bill_number" : "invoice_number";
  const dateKey =
    subscriptionType === "bill" ? "bill_date" : "invoice_date";

  const formatCurrency = (val) =>
    Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Sorting logic
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const getComparator = (order, orderBy) => {
    return (a, b) => {
      let valueA = a[orderBy];
      let valueB = b[orderBy];

      // Handle Dates
      if (
        orderBy === dateKey ||
        orderBy === "due_date"
      ) {
        valueA = valueA ? new Date(valueA).getTime() : 0;
        valueB = valueB ? new Date(valueB).getTime() : 0;
      }

      // Handle Numbers
      if (
        ["total_amount", "advance_amount", "due_amount"].includes(orderBy)
      ) {
        valueA = Number(valueA || 0);
        valueB = Number(valueB || 0);
      }

      // Handle Strings
      if (typeof valueA === "string") {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      if (valueA < valueB) return order === "asc" ? -1 : 1;
      if (valueA > valueB) return order === "asc" ? 1 : -1;
      return 0;
    };
  };

  const sortedInvoices = useMemo(() => {
    if (!orderBy) return advanceInvoices;
    return [...advanceInvoices].sort(getComparator(order, orderBy));
  }, [advanceInvoices, order, orderBy]);

  const paginatedInvoices = sortedInvoices.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Column definitions
  const columns = [
    { id: "serial", label: "S.No", sortable: false },
    { id: numberKey, label: docLabel, sortable: true },
    { id: dateKey, label: "Date", sortable: true },
    { id: "customer_name", label: "Customer", sortable: true },
    { id: "customer_mobile", label: "Mobile", sortable: true },
    { id: "total_amount", label: "Total (₹)", sortable: true },
    { id: "advance_amount", label: "Advance Paid (₹)", sortable: true },
    { id: "due_amount", label: "Due (₹)", sortable: true },
    { id: "due_date", label: "Due Date", sortable: true },
    { id: "payment_completion_status", label: "Status", sortable: true },
  ];

  return (
    <Paper
      elevation={3}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: `2px solid ${primaryColor}`,
        mb: 4,
      }}
    >
      <TableContainer
        sx={{
          maxHeight: 450,
          overflowX: "auto",
          "&::-webkit-scrollbar": { height: 6, width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: primaryColor,
            borderRadius: 4,
          },
        }}
      >
        <Table stickyHeader size="small" sx={{ minWidth: 1300 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5" }}>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align="center"
                  sortDirection={orderBy === column.id ? order : false}
                  sx={{
                    color: primaryColor,
                    fontWeight: "bold",
                    fontSize: { xs: "0.85rem", sm: "0.95rem" },
                    whiteSpace: "nowrap",
                    py: 2,
                    backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5",
                  }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : "asc"}
                      onClick={() => handleRequestSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10}>
                  <Typography
                    align="center"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {`No advance ${
                      subscriptionType === "bill" ? "bills" : "invoices"
                    } found.`}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedInvoices.map((inv, index) => (
                <TableRow
                  key={inv[numberKey] + index}
                  hover
                  sx={{
                    transition: "background 0.2s ease",
                    "&:hover": {
                      backgroundColor: isDark ? "#2a2a2a" : "#fafafa",
                    },
                  }}
                >
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    {page * rowsPerPage + index + 1}
                  </TableCell>

                  <TableCell align="left">{inv[numberKey]}</TableCell>

                  <TableCell>
                    {inv[dateKey]
                      ? new Date(inv[dateKey]).toLocaleDateString("en-IN")
                      : "-"}
                  </TableCell>

                  <TableCell>{inv.customer_name || "-"}</TableCell>
                  <TableCell>{inv.customer_mobile || "-"}</TableCell>

                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    {formatCurrency(inv.total_amount)}
                  </TableCell>

                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    {formatCurrency(inv.advance_amount)}
                  </TableCell>

                  <TableCell
                    align="right"
                    sx={{ fontWeight: "bold", color: primaryColor }}
                  >
                    {formatCurrency(inv.due_amount)}
                  </TableCell>

                  <TableCell align="center">
                    {inv.due_date
                      ? new Date(inv.due_date).toLocaleDateString("en-IN")
                      : "-"}
                  </TableCell>

                  <TableCell align="center">
                    <Chip
                      label={inv.payment_completion_status}
                      size="small"
                      color={
                        inv.payment_completion_status === "Completed"
                          ? "success"
                          : "warning"
                      }
                      sx={{
                        fontWeight: "bold",
                        textTransform: "capitalize",
                        color: "white",
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={sortedInvoices.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 20, 50]}
        sx={{
          "& .MuiTablePagination-toolbar": {
            backgroundColor: isDark ? "#1e1e1e" : "#fafafa",
            color: primaryColor,
          },
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
            {
              fontWeight: "bold",
              fontSize: "0.875rem",
            },
        }}
      />
    </Paper>
  );
}