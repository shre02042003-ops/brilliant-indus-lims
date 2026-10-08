import React, { useState } from "react";
import {
  Grid,
  TextField,
  Paper,
  Typography,
  Alert,
} from "@mui/material";
import CompanyAutocomplete from "./CompanyAutocomplete";

export default function CustomerSection({ form, setForm }) {
  const [error, setError] = useState("");

  const handleSelect = (found, typedId) => {
    setError(found ? "" : "Company not found");
    setForm((prev) => ({
      ...prev,
      customerId: found ? found.id : typedId || "",
      customerName: found ? found.name : "",
      customerAddress: found ? found.address : "",
    }));
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={1.5} alignItems="center">
        <Grid size={12}>
          <Typography variant="subtitle1" fontWeight="bold">
            Customer
          </Typography>
        </Grid>

        <Grid size={4}>
          <CompanyAutocomplete
            label="Customer ID"
            value={form.customerId}
            onSelect={handleSelect}
          />
        </Grid>
        <Grid size={8} />

        <Grid size={2}>
          <Typography fontWeight="bold">Company Name:</Typography>
        </Grid>
        <Grid size={10}>
          <CompanyAutocomplete
            searchBy="name"
            label=""
            value={form.customerId}
            onSelect={handleSelect}
          />
        </Grid>

        <Grid size={2}>
          <Typography fontWeight="bold">Address:</Typography>
        </Grid>
        <Grid size={10}>
          <TextField
            value={form.customerAddress}
            fullWidth
            size="small"
            multiline
            minRows={2}
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

        <Grid size={12}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
            Challan No.
          </Typography>
        </Grid>
        <Grid size={2}>
          <TextField
            label="LETTER DTD"
            value={form.challanLetterDtd}
            onChange={(e) =>
              setForm((p) => ({ ...p, challanLetterDtd: e.target.value }))
            }
            fullWidth
            size="small"
          />
        </Grid>
        <Grid size={2}>
          <TextField
            label="SRF NO"
            value={form.challanSrfNo}
            onChange={(e) =>
              setForm((p) => ({ ...p, challanSrfNo: e.target.value }))
            }
            fullWidth
            size="small"
          />
        </Grid>
        <Grid size={2}>
          <TextField
            label="DTD"
            value={form.challanDtd}
            onChange={(e) =>
              setForm((p) => ({ ...p, challanDtd: e.target.value }))
            }
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>
    </Paper>
  );
}
