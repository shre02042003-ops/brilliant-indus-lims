import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import axios from "axios";

const ENTITY_CONFIG = {
  companies: {
    title: "Existing Companies",
    label: "companies",
    apiPath: "/api/companies",
    idField: "id",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "address", label: "Address" },
    ],
  },
  instruments: {
    title: "Existing UUC Instruments",
    label: "UUC instruments",
    apiPath: "/api/instruments",
    idField: "id",
    columns: [
      { key: "id", label: "ID" },
      { key: "description", label: "Description" },
      { key: "sub_type", label: "Sub-type" },
    ],
  },
  masters: {
    title: "Existing Master Equipment",
    label: "master equipment",
    apiPath: "/api/masters",
    idField: "id",
    columns: [
      { key: "id", label: "ID" },
      { key: "sr_no", label: "Sr. No." },
      { key: "name", label: "Name" },
      { key: "id_no", label: "ID No." },
      { key: "cal_agency", label: "Cal. Agency" },
      { key: "range_text", label: "Range" },
      { key: "cert_no", label: "Cert No." },
      { key: "cal_date", label: "Cal Date" },
      { key: "due_date", label: "Due Date" },
      { key: "expanded_uncertainty", label: "Uncertainty" },
    ],
  },
};

function matchesSearch(row, tokens, columns) {
  if (tokens.length === 0) return true;
  const haystack = columns
    .map((c) => String(row[c.key] ?? ""))
    .join(" ")
    .toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

export default function EntityLookupPage() {
  const { entityType } = useParams();
  const config = ENTITY_CONFIG[entityType];

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (!config) return;
    setLoading(true);
    setError("");
    axios
      .get(config.apiPath)
      .then((res) => setRows(res.data))
      .catch(() => setError(`Failed to load ${config.label}`))
      .finally(() => setLoading(false));
  }, [config]);

  const tokens = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [query],
  );

  const filteredRows = useMemo(
    () => rows.filter((row) => matchesSearch(row, tokens, config?.columns || [])),
    [rows, tokens, config],
  );

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
  };

  if (!config) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error">Unknown lookup type "{entityType}".</Alert>
        <Button component={RouterLink} to="/bulk" sx={{ mt: 2 }}>
          ← Back to Bulk Calibration Entries
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5" fontWeight="bold">
          {config.title}
        </Typography>
        <Button component={RouterLink} to="/bulk" variant="outlined" size="small">
          ← Back to Bulk Calibration Entries
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={`Search ${config.label} by any word…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
              {filteredRows.length} of {rows.length} {config.label}
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: "bold", bgcolor: "action.hover" } }}>
                    {config.columns.map((c) => (
                      <TableCell key={c.key}>{c.label}</TableCell>
                    ))}
                    <TableCell align="center">Copy ID</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow hover key={row[config.idField]}>
                      {config.columns.map((c) => (
                        <TableCell
                          key={c.key}
                          sx={c.key === "id" ? { fontWeight: "bold" } : { whiteSpace: "pre-line" }}
                        >
                          {c.key === "id" ? (
                            <Chip size="small" label={row[c.key]} />
                          ) : (
                            String(row[c.key] ?? "")
                          )}
                        </TableCell>
                      ))}
                      <TableCell align="center">
                        <Tooltip title={copiedId === row[config.idField] ? "Copied!" : "Copy ID"}>
                          <IconButton size="small" onClick={() => handleCopyId(row[config.idField])}>
                            <ContentCopyIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={config.columns.length + 1} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          No {config.label} match your search.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>
    </Container>
  );
}
