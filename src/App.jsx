import React from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import theme from "./theme";
import CertificatePage from "./pages/CertificatePage";
import BulkCalibrationPage from "./pages/BulkCalibrationPage";
import EntityLookupPage from "./pages/EntityLookupPage";
import BulkEntriesProvider from "./context/BulkEntriesContext";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<CertificatePage />} />
            <Route element={<BulkEntriesProvider />}>
              <Route path="/bulk" element={<BulkCalibrationPage />} />
              <Route path="/lookup/:entityType" element={<EntityLookupPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
