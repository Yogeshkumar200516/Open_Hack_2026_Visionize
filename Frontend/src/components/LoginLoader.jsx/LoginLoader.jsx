import React, { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import MyLogo from "../../assets/images/logo2.svg"; // ⬅️ update path to your logo

// Array of colors for bouncing dots
const colors = ["#FF4C60", "#4CD964", "#4CB5FF", "#FFD93D"];

const LoadingPage = ({ onLoaded }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onLoaded();
    }, 3000); // 2 seconds delay

    return () => clearTimeout(timer);
  }, [onLoaded]);

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "#121212" : "#f4f6f8",
      }}
    >
      {/* Company Logo */}
      <Box
        component="img"
        src={MyLogo}
        alt="Company Logo"
        sx={{
          width: 120,
          height: "auto",
          mb: 4, // space below logo
        }}
      />

      {/* Bouncing Dots Loader */}
      <Box sx={{ display: "flex", gap: 2 }}>
        {colors.map((color, index) => (
          <motion.div
            key={index}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: color,
            }}
            animate={{
              y: ["0%", "-50%", "0%"], // bounce up & down
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.2, // staggered bounce
            }}
          />
        ))}
      </Box>

      {/* Gradient Loading Text */}
      <Typography
        mt={3}
        variant="h6"
        sx={{
          fontWeight: 500,
          letterSpacing: "1px",
          background: "linear-gradient(90deg, #FF4C60, #4CB5FF, #4CD964, #FFD93D)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Welcome to Nexora ERP...
      </Typography>
    </Box>
  );
};

export default LoadingPage;
