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
  useTheme,
  TablePagination,
  TableSortLabel,
} from "@mui/material";

export default function GstByUserTable({
  gstByUser,
  safeToFixed,
  safeToLocaleString,
  subscriptionType,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("");

  const docCreatedLabel = subscriptionType === "bill" ? "Bills Created" : "Invoices Created";
  const docCreatedKey = subscriptionType === "bill" ? "total_bills" : "total_invoices";
  const avgGstKey = subscriptionType === "bill" ? "avg_gst_per_bill" : "avg_gst_per_invoice";

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const comparator = (a, b) => {
    let valA = a[orderBy];
    let valB = b[orderBy];

    if (["first_name", "role"].includes(orderBy)) {
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
    if (!orderBy) return gstByUser;
    return [...gstByUser].sort(comparator);
  }, [gstByUser, order, orderBy]);

  const paginatedUsers = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const columns = [
    { id: "serial", label: "S.No", sortable: false },
    { id: "first_name", label: "User Name", sortable: true },
    { id: "role", label: "Role", sortable: true },
    { id: avgGstKey, label: "Avg. GST (₹)", sortable: true },
    { id: "total_sales", label: "Total Sales (₹)", sortable: true },
    { id: docCreatedKey, label: docCreatedLabel, sortable: true },
    { id: "total_gst_collected", label: "GST Collected (₹)", sortable: true },
  ];

  return (
    <Paper elevation={3} sx={{ borderRadius: 3, overflow: "hidden", border: `2px solid ${primaryColor}`, mb: 4 }}>
      <TableContainer sx={{ maxHeight: 420, overflowX: "auto", "&::-webkit-scrollbar": { height: 6, width: "4px" }, "&::-webkit-scrollbar-thumb": { backgroundColor: primaryColor, borderRadius: 4 } }}>
        <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5" }}>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.label === "User Name" || col.label === "Role" ? "left" : "right"}
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
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedUsers.map((user, index) => (
              <TableRow key={index} hover sx={{ transition: "background 0.2s ease", "&:hover": { backgroundColor: isDark ? "#2a2a2a" : "#fafafa" } }}>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>
                  {page * rowsPerPage + index + 1}
                </TableCell>
                <TableCell>{`${user.first_name} ${user.last_name}`}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell align="right">{safeToFixed(user[avgGstKey])}</TableCell>
                <TableCell align="right">{safeToLocaleString(user.total_sales)}</TableCell>
                <TableCell align="right">{safeToLocaleString(user[docCreatedKey])}</TableCell>
                <TableCell align="right">{safeToFixed(user.total_gst_collected)}</TableCell>
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
}