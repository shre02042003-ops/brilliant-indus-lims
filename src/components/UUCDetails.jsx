import React, { useState } from "react";
import {
  Grid,
  TextField,
  Paper,
  Typography,
  MenuItem,
  Button,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import { ACCURACY_OPTIONS } from "../utils/accuracyOptions";

export default function UUCDetails({ form, setForm, onSearchMaster }) {
  const [instrumentId, setInstrumentId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchInstrument = async () => {
    if (!instrumentId.trim()) {
      setError("Please enter an Instrument ID");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`/api/instruments/${instrumentId.trim()}`);
      const inst = res.data;
      setForm((prev) => ({
        ...prev,
        instrumentId: inst.id,
        descriptionOfUUC: inst.description,
        uucSubType: inst.sub_type,
      }));
    } catch {
      setError("Instrument not found");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchInstrument();
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={1.5} alignItems="center">
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight="bold">
            UUC Details
          </Typography>
        </Grid>

        <Grid item xs={2}>
          <TextField
            label="Instrument ID"
            placeholder="U101"
            value={instrumentId}
            onChange={(e) => setInstrumentId(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={2}>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={fetchInstrument}
            disabled={loading}
            fullWidth
            sx={{ height: "40px" }}
          >
            Fetch Instrument
          </Button>
        </Grid>
        <Grid item xs={8} />

        {error && (
          <Grid item xs={12}>
            <Alert severity="error" sx={{ py: 0 }}>
              {error}
            </Alert>
          </Grid>
        )}

        <Grid item xs={3}>
          <TextField
            label="Description of UUC"
            value={form.descriptionOfUUC}
            onChange={handleChange("descriptionOfUUC")}
            fullWidth
            InputProps={{ readOnly: true }}
          />
        </Grid>
        <Grid item xs={9}>
          <TextField
            label="UUC Sub-type"
            value={form.uucSubType}
            onChange={handleChange("uucSubType")}
            fullWidth
            placeholder="(Hydraulic bourden type)"
          />
        </Grid>

        <Grid item xs={1}>
          <Typography fontWeight="bold">Range:</Typography>
        </Grid>
        <Grid item xs={2}>
          <TextField
            label="Min"
            type="number"
            value={form.rangeMin}
            onChange={handleChange("rangeMin")}
            fullWidth
            size="small"
            inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid item xs={1}>
          <Typography textAlign="center">–</Typography>
        </Grid>
        <Grid item xs={2}>
          <TextField
            label="Max"
            type="number"
            value={form.rangeMax}
            onChange={handleChange("rangeMax")}
            fullWidth
            size="small"
            inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid item xs={2}>
          <TextField
            value="kg/cm²"
            fullWidth
            size="small"
            InputProps={{ readOnly: true }}
          />
        </Grid>
        <Grid item xs={4}>
          <Button
            variant="contained"
            color="secondary"
            onClick={onSearchMaster}
            fullWidth
            sx={{ height: "40px" }}
          >
            Search for Appropriate Master
          </Button>
        </Grid>

        <Grid item xs={3}>
          <TextField
            label="Resolution"
            type="number"
            value={form.resolution}
            onChange={handleChange("resolution")}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={2}>
          <TextField
            value="kg/cm²"
            fullWidth
            size="small"
            InputProps={{ readOnly: true }}
          />
        </Grid>
        <Grid item xs={7} />

        <Grid item xs={3}>
          <TextField
            label="Make"
            value={form.make}
            onChange={handleChange("make")}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={3}>
          <TextField
            label="Accuracy"
            select
            value={form.accuracy}
            onChange={handleChange("accuracy")}
            fullWidth
            size="small"
          >
            {ACCURACY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={3}>
          <TextField
            label="Idno./Srno."
            value={form.idNumber}
            onChange={handleChange("idNumber")}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>
    </Paper>
  );
}
