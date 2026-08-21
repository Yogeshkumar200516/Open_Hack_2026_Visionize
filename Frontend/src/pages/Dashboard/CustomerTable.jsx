import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Box,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  TableSortLabel,
  TextField,
  Typography,
  CircularProgress,
  Chip,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import API_BASE_URL from "../../Context/Api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function CustomerTable({ setExportCustomers }) {  
    const theme = useTheme();
  const primary = theme.palette.primary.main;

    const isDark = theme.palette.mode === "dark";
    const primaryColor = theme.palette.primary.main;
    

  const [customers, setCustomers] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");

  const [orderBy, setOrderBy] = useState("created_at");
  const [order, setOrder] = useState("desc");
  

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/api/gst-reports/customers`,
        {
          headers: getAuthHeaders(),
          params: {
            page,
            limit: rowsPerPage,
            search,
            sortField: orderBy,
            sortOrder: order.toUpperCase(),
          },
        }
      );

      setCustomers(data.data || []);
      if (setExportCustomers) {
  setExportCustomers(data.data || []);
}
      setTotalRows(data.total || 0);
    } catch (err) {
      console.error("Customer fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, orderBy, order]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `2px solid ${primaryColor}`,
        background: isDark ? alpha("#fff", 0.02) : "#fff",
        overflow: "hidden",
      }}
    >
      {/* Search */}
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by Name, Mobile, Email, GST..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          onKeyDown={(e) => e.key === "Enter" && fetchCustomers()}
        />
      </Box>

      <TableContainer sx={{ maxHeight: 450, overflowX: "auto", "&::-webkit-scrollbar": { height: 6, width: "4px" }, "&::-webkit-scrollbar-thumb": { backgroundColor: primaryColor, borderRadius: 4 } }}>
        <Table stickyHeader size="small" sx={{minWidth: '1100px'}}>
          <TableHead>
            <TableRow>
              {/* S.No (Non-sortable) */}
              <TableCell
                align="center"
                sx={{
                  fontWeight: 700,
                  background: isDark
                    ? alpha("#fff", 0.03)
                    : alpha(primary, 0.05),
                  color: primary,
                }}
              >
                S.No
              </TableCell>

              {[
                { id: "name", label: "Name" },
                { id: "mobile", label: "Mobile" },
                { id: "email", label: "Email" },
                { id: "gst_number", label: "GST" },
                { id: "state", label: "State" },
                { id: "created_at", label: "Created" },
              ].map((col) => (
                <TableCell
                  key={col.id}
                  align="center"
                  sx={{
                    fontWeight: 700,
                    background: isDark
                      ? alpha("#fff", 0.03)
                      : alpha(primary, 0.05),
                    color: primary,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === col.id}
                    direction={orderBy === col.id ? order : "asc"}
                    onClick={() => handleSort(col.id)}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2">
                    No customers found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c, index) => (
                <TableRow key={c.customer_id} hover>
                  
                  {/* ✅ Proper S.No with Pagination */}
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    {page * rowsPerPage + index + 1}
                  </TableCell>

                  <TableCell>{c.name}</TableCell>

                  <TableCell>
                    {c.mobile || "-"}
                  </TableCell>

                  <TableCell >
                    {c.email || "-"}
                  </TableCell>

                  <TableCell>
                    {c.gst_number ? (
                      <Chip
                        label={c.gst_number}
                        size="small"
                        color="primary"
                      />
                    ) : (
                      "-"
                    )}
                  </TableCell>

                  <TableCell>
                    {c.state || "-"}
                  </TableCell>

                  <TableCell>
                    {new Date(c.created_at).toLocaleDateString("en-IN")}
                  </TableCell>

                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalRows}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 20, 50]}
      />
    </Paper>
  );
}