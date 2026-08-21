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

export default function DiscountsByProductTable({
  discountsByProduct,
  safeToFixed,
  subscriptionType,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("");

  const handleChangePage = (_, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const getComparator = (order, orderBy) => (a, b) => {
    let valA = a[orderBy];
    let valB = b[orderBy];

    if (orderBy !== "product_name") {
      valA = Number(valA || 0);
      valB = Number(valB || 0);
    } else {
      valA = (valA || "").toLowerCase();
      valB = (valB || "").toLowerCase();
    }

    if (valA < valB) return order === "asc" ? -1 : 1;
    if (valA > valB) return order === "asc" ? 1 : -1;
    return 0;
  };

  const sortedData = useMemo(() => {
    if (!orderBy) return discountsByProduct;
    return [...discountsByProduct].sort(getComparator(order, orderBy));
  }, [discountsByProduct, order, orderBy]);

  const paginatedDiscounts = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const columns = [
    { id: "serial", label: "S.No", sortable: false },
    { id: "product_name", label: "Product", sortable: true },
    { id: "avg_discount", label: "Avg. Discount (₹)", sortable: true },
    { id: "min_discount", label: "Min. Discount (₹)", sortable: true },
    { id: "max_discount", label: "Max. Discount (₹)", sortable: true },
    { id: "total_discount_amount", label: "Total Discount (₹)", sortable: true },
  ];

  return (
    <Paper elevation={3} sx={{ borderRadius: 3, overflow: "hidden", border: `2px solid ${primaryColor}`, mb: 1 }}>
      <TableContainer sx={{ maxHeight: 420, overflowX: "auto", "&::-webkit-scrollbar": { height: 6, width: "4px" }, "&::-webkit-scrollbar-thumb": { backgroundColor: primaryColor, borderRadius: 4 } }}>
        <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5" }}>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.label === "Product" ? "left" : "right"}
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
            {paginatedDiscounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography align="center" sx={{ color: theme.palette.text.secondary }}>
                    No data found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedDiscounts.map((disc, index) => (
                <TableRow key={disc.product_name} hover sx={{ transition: "background 0.2s ease", "&:hover": { backgroundColor: isDark ? "#2a2a2a" : "#fafafa" } }}>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    {page * rowsPerPage + index + 1}
                  </TableCell>
                  <TableCell align="left">{disc.product_name}</TableCell>
                  <TableCell align="right">{safeToFixed(disc.avg_discount)}</TableCell>
                  <TableCell align="right">{safeToFixed(disc.min_discount)}</TableCell>
                  <TableCell align="right">{safeToFixed(disc.max_discount)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold", color: primaryColor }}>
                    {safeToFixed(disc.total_discount_amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={sortedData.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 20, 50]}
        sx={{
          "& .MuiTablePagination-toolbar": { backgroundColor: isDark ? "#1e1e1e" : "#fafafa", color: primaryColor },
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontWeight: "bold", fontSize: "0.875rem" },
        }}
      />
    </Paper>
  );
}