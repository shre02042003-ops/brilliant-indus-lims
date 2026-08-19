import React, { useState } from "react";
import { Grid, TextField, Button, Alert } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";

export default function CompanyLookupBar({ company, onCompanyChange }) {
  const [inputId, setInputId] = useState(company.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCompany = async () => {
    if (!inputId.trim()) {
      setError("Please enter a Company ID");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`/api/companies/${inputId.trim()}`);
      onCompanyChange({ id: res.data.id, name: res.data.name, address: res.data.address });
    } catch {
      setError("Company not found");
      onCompanyChange({ id: inputId.trim(), name: "", address: "" });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchCompany();
  };

  return (
    <Grid container spacing={1.5} alignItems="center">
      <Grid item xs={2}>
        <TextField
          label="Company ID"
          placeholder="C101"
          value={inputId}
          onChange={(e) => setInputId(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          fullWidth
          size="small"
        />
      </Grid>
      <Grid item xs={2}>
        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={fetchCompany}
          disabled={loading}
          fullWidth
          sx={{ height: "40px" }}
        >
          Fetch Company
        </Button>
      </Grid>
      <Grid item xs={4}>
        <TextField
          label="Company Name"
          value={company.name}
          fullWidth
          size="small"
          InputProps={{ readOnly: true }}
        />
      </Grid>
      <Grid item xs={4}>
        <TextField
          label="Address"
          value={company.address}
          fullWidth
          size="small"
          InputProps={{ readOnly: true }}
        />
      </Grid>
      {error && (
        <Grid item xs={12}>
          <Alert severity="error" sx={{ py: 0 }}>
            {error}
          </Alert>
        </Grid>
      )}
    </Grid>
  );
}
