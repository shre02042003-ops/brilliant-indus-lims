import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: { main: "#1a237e" },
    secondary: { main: "#0d47a1" },
    background: { default: "#f5f5f5" },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 13,
  },
  components: {
    MuiTextField: {
      defaultProps: { size: "small", variant: "outlined" },
    },
    MuiSelect: {
      defaultProps: { size: "small", variant: "outlined" },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { border: "1px solid #000", padding: "4px 8px", fontSize: 12 },
        head: { fontWeight: "bold", backgroundColor: "#e8eaf6" },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: { "& .MuiTableCell-root": { fontWeight: "bold", backgroundColor: "#e8eaf6" } },
      },
    },
  },
});

export default theme;
