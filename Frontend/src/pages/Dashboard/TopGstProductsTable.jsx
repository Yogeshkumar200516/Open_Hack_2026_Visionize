import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  useTheme,
  TablePagination,
  TableSortLabel,
} from "@mui/material";

const TopGSTProductsTable = ({
  topProducts,
  safeToFixed,
  safeToLocaleString,
  subscriptionType,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [orderBy, setOrderBy] = useState("total_sales");
  const [order, setOrder] = useState("desc");

  const handleChangePage = (event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const comparator = (a, b) => {
    let valueA = a[orderBy];
    let valueB = b[orderBy];

    if (typeof valueA === "number" && typeof valueB === "number") {
      return order === "asc" ? valueA - valueB : valueB - valueA;
    }

    return order === "asc"
      ? String(valueA).localeCompare(String(valueB))
      : String(valueB).localeCompare(String(valueA));
  };

  const sortedData = useMemo(() => {
    return [...topProducts].sort(comparator);
  }, [topProducts, order, orderBy]);

  const paginatedProducts = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const columns = [
    { label: "S.No", id: null },
    { label: "Product Name", id: "product_name" },
    { label: "HSN", id: "hsn_code" },
    { label: "Category", id: "category_name" },
    { label: "Quantity Sold", id: "total_quantity" },
    { label: "Total Sales (₹)", id: "total_sales" },
    { label: "Avg. GST Rate (₹)", id: "avg_gst_rate" },
    { label: "Total Discount (₹)", id: "total_discount_given" },
    { label: "Total GST (₹)", id: "gst_collected" },
  ];

  return (
    <Paper
      elevation={3}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: `2px solid ${primaryColor}`,
        boxShadow: `0 0 10px ${primaryColor}66`,
      }}
    >
      <TableContainer
        sx={{
          maxHeight: 460,
          overflowX: "auto",
          "&::-webkit-scrollbar": { height: 6, width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: primaryColor,
            borderRadius: 4,
          },
        }}
      >
        <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5" }}>
              {columns.map((col) => (
                <TableCell
                  key={col.label}
                  sx={{
                    color: primaryColor,
                    fontWeight: "bold",
                    fontSize: { xs: "0.85rem", sm: "0.95rem" },
                    whiteSpace: "nowrap",
                    py: 2,
                    backgroundColor: isDark ? "#1e1e1e" : "#f5f5f5",
                  }}
                >
                  {col.id ? (
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : "asc"}
                      onClick={() => handleSort(col.id)}
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
            {paginatedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography
                    align="center"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    No data found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map((product, index) => (
                <TableRow
                  key={product.product_id}
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
                  <TableCell>{product.product_name}</TableCell>
                  <TableCell>{product.hsn_code}</TableCell>
                  <TableCell>{product.category_name}</TableCell>
                  <TableCell align="center">
                    {safeToLocaleString(product.total_quantity)}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: primaryColor,
                      textAlign: "right",
                    }}
                  >
                    ₹{safeToFixed(product.total_sales)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    ₹{safeToFixed(product.avg_gst_rate)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    ₹{safeToFixed(product.total_discount_given)}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: primaryColor,
                      textAlign: "right",
                    }}
                  >
                    ₹{safeToFixed(product.gst_collected)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={topProducts.length}
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
        }}
      />
    </Paper>
  );
};

export default TopGSTProductsTable;