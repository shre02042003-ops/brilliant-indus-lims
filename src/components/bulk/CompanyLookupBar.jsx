import React, { useState } from "react";
import { Grid, TextField, Alert } from "@mui/material";
import CompanyAutocomplete from "../CompanyAutocomplete";

export default function CompanyLookupBar({ company, onCompanyChange }) {
  const [error, setError] = useState("");

  const handleSelect = (found, typedId) => {
    if (found) {
      setError("");
      onCompanyChange({ id: found.id, name: found.name, address: found.address });
    } else {
      setError("Company not found");
      onCompanyChange({ id: typedId || "", name: "", address: "" });
    }
  };

  return (
    <Grid container spacing={1.5} alignItems="center">
      <Grid size={4}>
        <CompanyAutocomplete value={company.id} onSelect={handleSelect} />
      </Grid>
      <Grid size={4}>
        <CompanyAutocomplete searchBy="name" value={company.id} onSelect={handleSelect} />
      </Grid>
      <Grid size={4}>
        <TextField
          label="Address"
          value={company.address}
          fullWidth
          size="small"
          InputProps={{ readOnly: true }}
        />
      </Grid>
      {error && (
        <Grid size={12}>
          <Alert severity="error" sx={{ py: 0 }}>
            {error}
          </Alert>
        </Grid>
      )}
    </Grid>
  );
}
