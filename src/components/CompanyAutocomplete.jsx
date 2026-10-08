import React, { useEffect, useMemo, useState } from "react";
import { Autocomplete, TextField, Box, Typography, Popper } from "@mui/material";
import axios from "axios";

const MIN_CHARS = 3;
const MAX_RESULTS = 5;

let companiesPromise = null;
function loadCompanies() {
  if (!companiesPromise) {
    companiesPromise = axios
      .get("/api/companies")
      .then((res) => (Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        companiesPromise = null;
        throw err;
      });
  }
  return companiesPromise;
}

function WidePopper(props) {
  const anchorWidth = props.anchorEl?.clientWidth || 0;
  return (
    <Popper
      {...props}
      placement="bottom-start"
      style={{ ...props.style, width: Math.max(anchorWidth, 420) }}
    />
  );
}

function rankByName(company, q) {
  const name = String(company.name || "").toLowerCase();
  const address = String(company.address || "").toLowerCase();
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.split(/\s+/).some((w) => w.startsWith(q))) return 2;
  if (name.includes(q)) return 3;
  const tokens = q.split(/\s+/).filter(Boolean);
  const haystack = `${name} ${address}`;
  if (tokens.length && tokens.every((t) => haystack.includes(t))) return 4;
  return -1;
}

function rank(company, q) {
  const id = String(company.id || "").toLowerCase();
  const name = String(company.name || "").toLowerCase();
  const address = String(company.address || "").toLowerCase();
  if (id === q) return 0;
  if (id.startsWith(q)) return 1;
  if (name.startsWith(q)) return 2;
  if (id.includes(q) || name.includes(q)) return 3;
  const tokens = q.split(/\s+/).filter(Boolean);
  const haystack = `${id} ${name} ${address}`;
  if (tokens.length && tokens.every((t) => haystack.includes(t))) return 4;
  return -1;
}

export default function CompanyAutocomplete({
  value,
  onSelect,
  searchBy = "id",
  label = searchBy === "name" ? "Company Name" : "Company ID",
}) {
  const byName = searchBy === "name";
  const [companies, setCompanies] = useState([]);
  const [input, setInput] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    loadCompanies()
      .then(setCompanies)
      .catch(() => setLoadError("Could not load companies"));
  }, []);

  const selected = companies.find((c) => c.id === value) || null;
  const displayValue = byName ? selected?.name || "" : value || "";

  useEffect(() => {
    setInput(displayValue);
  }, [displayValue]);

  const q = input.trim().toLowerCase();
  const options = useMemo(() => {
    if (q.length < MIN_CHARS) return [];
    return companies
      .map((c) => ({ c, r: byName ? rankByName(c, q) : rank(c, q) }))
      .filter((x) => x.r >= 0)
      .sort((a, b) => a.r - b.r || String(a.c.id).localeCompare(String(b.c.id)))
      .slice(0, MAX_RESULTS)
      .map((x) => x.c);
  }, [companies, q, byName]);

  const field = byName ? "name" : "id";

  return (
    <Autocomplete
      size="small"
      fullWidth
      freeSolo
      value={selected}
      inputValue={input}
      options={options}
      filterOptions={(opts) => opts}
      getOptionLabel={(o) => (typeof o === "string" ? o : o[field] || "")}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      onInputChange={(_, v, reason) => {
        if (reason !== "reset") setInput(byName ? v : v.toUpperCase());
      }}
      onChange={(_, v) => {
        if (v && typeof v === "object") {
          setInput(v[field]);
          onSelect(v);
        } else if (typeof v === "string") {
          const typed = v.trim().toLowerCase();
          const exact = companies.find(
            (c) => String(c[field] || "").trim().toLowerCase() === typed,
          );
          onSelect(exact || null, byName ? "" : v.trim().toUpperCase());
        }
      }}
      noOptionsText={
        q.length < MIN_CHARS ? `Type at least ${MIN_CHARS} characters` : "No matching company"
      }
      PopperComponent={WidePopper}
      sx={{ minWidth: 200 }}
      renderOption={(props, o) => {
        const { key, ...rest } = props;
        return (
          <Box component="li" key={o.id} {...rest} sx={{ py: 0.75 }}>
            <Box sx={{ minWidth: 0, width: "100%" }}>
              <Typography variant="body2" noWrap>
                <Box component="span" sx={{ fontWeight: 700, mr: 1 }}>
                  {o.id}
                </Box>
                {o.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap component="div">
                {o.address}
              </Typography>
            </Box>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={byName ? "Type 3+ letters of the name" : "Type 3+ letters of ID or name"}
          error={Boolean(loadError)}
          helperText={loadError || undefined}
        />
      )}
    />
  );
}
