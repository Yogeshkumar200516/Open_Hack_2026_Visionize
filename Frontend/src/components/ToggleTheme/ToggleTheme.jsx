import { createTheme } from "@mui/material/styles";

export const getDesignTokens = (mode) => ({
  palette: {
    mode,
    ...(mode === "dark"
      ? {
          background: {
            default: "#121212",
            paper: "#1e1e1e",
          },
          primary: {
            main: "#00bcd4",
            second: "#d7d6d6",
          },
          text: {
            primary: "#ffffff",
          },
        }
      : {
          background: {
            default: "#f4f4f4",
            paper: "#ffffff",
          },
          primary: {
            main: "#136919",
            second: "#626161",
          },
          text: {
            primary: "#000000",
          },
        }),
  },
  typography: {
    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
  },
});

export const getTheme = (mode) => createTheme(getDesignTokens(mode));
