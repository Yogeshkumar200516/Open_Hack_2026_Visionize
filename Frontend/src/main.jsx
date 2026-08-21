import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import App from "./App";
import { getTheme } from "./components/ToggleTheme/ToggleTheme.jsx";
import { ColorModeContext } from "./Context/ThemeContext.jsx";
import { AuthProvider } from "./Context/AuthContext.jsx";

const Main = () => {
  // 1️⃣ Read theme mode from localStorage (default: light)
  const storedMode = localStorage.getItem("appThemeMode") || "light";
  const [mode, setMode] = useState(storedMode);

  // 2️⃣ Define toggle logic and persist it
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prev) => {
          const nextMode = prev === "light" ? "dark" : "light";
          localStorage.setItem("appThemeMode", nextMode);
          return nextMode;
        });
      },
    }),
    []
  );

  // 3️⃣ Generate MUI theme based on mode
  const theme = useMemo(() => getTheme(mode), [mode]);

  // 4️⃣ Use container ref for portals (Modals, Menus, etc.)
  const container =
    typeof window !== "undefined"
      ? document.getElementById("root") || document.body
      : undefined;

  return (
    <React.StrictMode>
      <ColorModeContext.Provider value={colorMode}>
        {/* ThemeProvider should wrap everything */}
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <BrowserRouter>
              <AuthProvider>
                {/* Pass container down via context or props if needed */}
                <App modalContainer={container} />
              </AuthProvider>
            </BrowserRouter>
          </LocalizationProvider>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </React.StrictMode>
  );
};

// 🔥 Render app inside the same container used for portals
ReactDOM.createRoot(document.getElementById("root")).render(<Main />);
