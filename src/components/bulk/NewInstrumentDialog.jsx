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
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import axios from "axios";

export default function NewInstrumentDialog({ open, onClose }) {
  const [description, setDescription] = useState("");
  const [subType, setSubType] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState(null);

  const reset = () => {
    setDescription("");
    setSubType("");
    setError("");
    setCreatedId(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/instruments", {
        description: description.trim(),
        sub_type: subType.trim(),
      });
      setCreatedId(res.data.id);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create instrument");
    } finally {
      setLoading(false);
    }
  };

  const copyId = () => {
    if (createdId) navigator.clipboard.writeText(createdId);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>New UUC Instrument</DialogTitle>
      <DialogContent>
        {createdId ? (
          <Stack spacing={2} sx={{ mt: 1, alignItems: "center", textAlign: "center" }}>
            <Typography>Instrument created successfully.</Typography>
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
              Paste this ID into any row's "Description of UUC" cell to use it.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Description"
              placeholder="PRESSURE GAUGE"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Sub-type"
              placeholder="(Hydraulic bourden type)"
              value={subType}
              onChange={(e) => setSubType(e.target.value)}
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
