import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Stack,
  Typography,
  Box,
  Grid,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import axios from "axios";

const initialFields = {
  name: "",
  idNo: "",
  calAgency: "",
  rangeMin: "0",
  rangeMax: "",
  rangeText: "",
  certNo: "",
  calDate: null,
  dueDate: null,
  expandedUncertainty: "0",
};

export default function NewMasterDialog({ open, onClose }) {
  const [fields, setFields] = useState(initialFields);
  const [rangeTextTouched, setRangeTextTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState(null);

  const set = (field) => (e) => setField(field, e.target.value);

  const setField = (field, value) => {
    setFields((prev) => {
      const next = { ...prev, [field]: value };
      if (!rangeTextTouched && (field === "rangeMin" || field === "rangeMax")) {
        next.rangeText = `${next.rangeMin || 0}-${next.rangeMax || 0} bar`;
      }
      return next;
    });
  };

  const reset = () => {
    setFields(initialFields);
    setRangeTextTouched(false);
    setError("");
    setCreatedId(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const maxNum = Number(fields.rangeMax);
    if (!fields.name.trim() || !fields.idNo.trim() || !fields.calAgency.trim() ||
        !fields.rangeText.trim() || !fields.rangeMax || isNaN(maxNum) || maxNum <= 0) {
      setError("Name, ID No., Cal. Agency, Range Text and a valid Range Max (bar) are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/masters", {
        name: fields.name.trim(),
        id_no: fields.idNo.trim(),
        cal_agency: fields.calAgency.trim(),
        range_text: fields.rangeText.trim(),
        range_min: Number(fields.rangeMin) || 0,
        range_max: maxNum,
        cert_no: fields.certNo.trim(),
        cal_date: fields.calDate ? fields.calDate.format("DD.MM.YYYY") : "",
        due_date: fields.dueDate ? fields.dueDate.format("DD.MM.YYYY") : "",
        expanded_uncertainty: Number(fields.expandedUncertainty) || 0,
      });
      setCreatedId(res.data.id);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create master equipment");
    } finally {
      setLoading(false);
    }
  };

  const copyId = () => {
    if (createdId) navigator.clipboard.writeText(createdId);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Master Equipment</DialogTitle>
      <DialogContent>
        {createdId ? (
          <Stack spacing={2} sx={{ mt: 1, alignItems: "center", textAlign: "center" }}>
            <Typography>Master equipment created successfully.</Typography>
            <Box
              sx={{
                fontFamily: "monospace",
                fontSize: 28,
                fontWeight: "bold",
                border: "1px dashed",
                borderColor: "divider",
                px: 3,
                py: 1,
                borderRadius: 1,
              }}
            >
              {createdId}
            </Box>
            <Button startIcon={<ContentCopyIcon />} onClick={copyId}>
              Copy ID
            </Button>
            <Typography variant="caption" color="text.secondary">
              This master is now available for auto-matching against UUC ranges.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Alert severity="info">
              Ranges here are in bar, not kg/cm² — this matches how master_equipment is stored and
              matched against UUC ranges.
            </Alert>
            <TextField label="Name" value={fields.name} onChange={set("name")} fullWidth required />
            <TextField
              label="ID No."
              placeholder="BI/PG/71"
              value={fields.idNo}
              onChange={set("idNo")}
              fullWidth
              required
            />
            <TextField
              label="Cal. Agency"
              placeholder={"NISHITRONICS\nCC-2294"}
              value={fields.calAgency}
              onChange={set("calAgency")}
              fullWidth
              required
              multiline
              minRows={2}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Range Min (bar)"
                  type="number"
                  value={fields.rangeMin}
                  onChange={set("rangeMin")}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Range Max (bar)"
                  type="number"
                  value={fields.rangeMax}
                  onChange={set("rangeMax")}
                  fullWidth
                  required
                />
              </Grid>
            </Grid>
            <TextField
              label="Range Text"
              value={fields.rangeText}
              onChange={(e) => {
                setRangeTextTouched(true);
                setField("rangeText", e.target.value);
              }}
              fullWidth
              required
            />
            <TextField label="Cert No." value={fields.certNo} onChange={set("certNo")} fullWidth />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <DatePicker
                  label="Cal Date"
                  value={fields.calDate}
                  onChange={(v) => setField("calDate", v)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={6}>
                <DatePicker
                  label="Due Date"
                  value={fields.dueDate}
                  onChange={(v) => setField("dueDate", v)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Expanded Uncertainty (k=2)"
              type="number"
              value={fields.expandedUncertainty}
              onChange={set("expandedUncertainty")}
              helperText="Used in the master-matching score"
              fullWidth
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {createdId ? (
          <Button variant="contained" onClick={handleClose}>Close</Button>
        ) : (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit} disabled={loading}>
              Create
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
