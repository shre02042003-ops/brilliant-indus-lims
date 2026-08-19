import React, { useState } from "react";
import {
  Grid,
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";

export default function CustomerSection({ form, setForm }) {
  const [customerId, setCustomerId] = useState(form.customerId || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchCompany = async () => {
    if (!customerId.trim()) {
      setError("Please enter a Customer ID");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`/api/companies/${customerId.trim()}`);
      setForm((prev) => ({
        ...prev,
        customerId: res.data.id,
        customerName: res.data.name,
        customerAddress: res.data.address,
      }));
    } catch {
      setError("Company not found");
      setForm((prev) => ({
        ...prev,
        customerId: customerId.trim(),
        customerName: "",
        customerAddress: "",
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchCompany();
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={1.5} alignItems="center">
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight="bold">
            Customer
          </Typography>
        </Grid>

        <Grid item xs={2}>
          <TextField
            label="Customer ID"
            placeholder="C101"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value.toUpperCase())}
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
        <Grid item xs={8} />

        <Grid item xs={2}>
          <Typography fontWeight="bold">Company Name:</Typography>
        </Grid>
        <Grid item xs={10}>
          <TextField
            value={form.customerName}
            fullWidth
            size="small"
            InputProps={{ readOnly: true }}
          />
        </Grid>

        <Grid item xs={2}>
          <Typography fontWeight="bold">Address:</Typography>
        </Grid>
        <Grid item xs={10}>
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
          <Grid item xs={12}>
            <Alert severity="error" sx={{ py: 0 }}>
              {error}
            </Alert>
          </Grid>
        )}

        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
            Challan No.
          </Typography>
        </Grid>
        <Grid item xs={2}>
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
        <Grid item xs={2}>
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
        <Grid item xs={2}>
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
