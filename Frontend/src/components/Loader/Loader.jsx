// src/components/Loader.jsx
import React from "react";
import { Box, CircularProgress } from "@mui/material";

const Loader = () => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "70vh",
        width: "100%",
      }}
    >
      <CircularProgress size={60} thickness={4} />
    </Box>
  );
};

export default Loader;
