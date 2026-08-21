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

export default function RecentStockMovementsTable({
  stockMovements,
  safeToLocaleString,
  subscriptionType,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = theme.palette.primary.main;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sorting State
  const [orderBy, setOrderBy] = useState("created_at");
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

    if (orderBy === "created_at") {
      valueA = new Date(valueA);
      valueB = new Date(valueB);
    }

    if (typeof valueA === "number" && typeof valueB === "number") {
      return order === "asc" ? valueA - valueB : valueB - valueA;
    }

    return order === "asc"
      ? String(valueA).localeCompare(String(valueB))
      : String(valueB).localeCompare(String(valueA));
  };

  const sortedData = useMemo(() => {
    return [...stockMovements].sort(comparator);
  }, [stockMovements, order, orderBy]);

  const paginatedStockMovements = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const columns = [
    { label: "S.No", id: null },
    { label: "Product", id: "product_name" },
    { label: "Type", id: "change_type" },
    { label: "Qty Changed", id: "quantity_changed" },
    { label: "Old Stock", id: "old_stock" },
    { label: "New Stock", id: "new_stock" },
    { label: "Updated By", id: "updated_by_name" },
    { label: "Date", id: "created_at" },
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
          maxHeight: 420,
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
                  align={
                    ["Qty Changed", "Old Stock", "New Stock"].includes(col.label)
                      ? "right"
                      : col.label === "S.No"
                      ? "center"
                      : "left"
                  }
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
            {paginatedStockMovements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography
                    align="center"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    No data found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedStockMovements.map((sm, index) => (
                <TableRow
                  key={sm.movement_id}
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
                  <TableCell>{sm.product_name}</TableCell>
                  <TableCell>{sm.change_type}</TableCell>
                  <TableCell align="center">
                    {safeToLocaleString(sm.quantity_changed)}
                  </TableCell>
                  <TableCell align="center">
                    {safeToLocaleString(sm.old_stock)}
                  </TableCell>
                  <TableCell align="center">
                    {safeToLocaleString(sm.new_stock)}
                  </TableCell>
                  <TableCell>{sm.updated_by_name || "-"}</TableCell>
                  <TableCell>
                    {new Date(sm.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={stockMovements.length}
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
}