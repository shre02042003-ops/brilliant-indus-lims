import React, { useEffect, useRef, useState } from "react";
import {
  Grid,
  TextField,
  Paper,
  Typography,
  MenuItem,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import { ACCURACY_OPTIONS } from "../utils/accuracyOptions";
import { getCertificateProfile } from "../utils/certificateProfile";
import { resultLayout } from "../utils/resultTable";
import {
  RANGE_LIMIT_MESSAGE,
  authorizedLimits,
  isRangeInputOutsideAuthorized,
  isElectroTechnicalRow,
  ELECTRO_RANGE_FIELDS,
  isR14Row,
  inferElectroTemplate,
  persistElectroResultUsed,
  overrideFetchedUucTemplate,
  matchesR14UucId,
  matchesR15UucId,
  isR15Row,
  isD20Row,
  r14UnitDefaults,
  r14UnitsForRow,
} from "../utils/readings";
import {
  PRESSURE_UNITS,
  coercePressureUnit,
} from "../utils/pressureUnits";

export default function UUCDetails({ form, setForm, onSearchMaster }) {
  const [instrumentId, setInstrumentId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rangeWarning, setRangeWarning] = useState(null);
  const warnedSigRef = useRef("");
  const limits = {
    authorized_range_min: form.authorized_range_min,
    authorized_range_max: form.authorized_range_max,
    instrumentId: form.instrumentId,
    uuc_id: form.uuc_id,
    descriptionOfUUC: form.descriptionOfUUC,
  };
  const bounds = authorizedLimits(limits);

  const checkRangeValues = (rangeMin, rangeMax, whileTyping = false) => {
    if (form.is_test_row) return;
    if (isD20Row(form)) {
      const angleMin = rangeMin == null || String(rangeMin).trim() === "" ? null : Number(rangeMin);
      const angleMax = rangeMax == null || String(rangeMax).trim() === "" ? null : Number(rangeMax);
      const lenMinRaw = form.range_min_len;
      const lenMaxRaw = form.range_max_len;
      const lenMin = lenMinRaw == null || String(lenMinRaw).trim() === "" ? null : Number(lenMinRaw);
      const lenMax = lenMaxRaw == null || String(lenMaxRaw).trim() === "" ? null : Number(lenMaxRaw);
      const angleMinBad = angleMin != null && angleMin < 0;
      const angleMaxBad = angleMax != null && angleMax > 60;
      const lenMinBad = lenMin != null && lenMin < 3.2;
      const lenMaxBad = lenMax != null && lenMax > 25.4;
      if (angleMinBad || angleMaxBad || lenMinBad || lenMaxBad) {
        const sig = `d20|${angleMin}|${angleMax}|${lenMin}|${lenMax}`;
        if (warnedSigRef.current === sig) return;
        warnedSigRef.current = sig;
        setRangeWarning({
          message: "Authorized range for this UUC: Angle (0 - 60) & Length (3.2 - 25.4)",
          minBad: angleMinBad,
          maxBad: angleMaxBad,
          lenMinBad,
          lenMaxBad,
        });
      }
      return;
    }
    if (!bounds || !Number.isFinite(bounds.max) || Number(bounds.max) === 0) return;
    if (
      form.template === "R-14" ||
      form.template === "R-15" ||
      isR14Row(form) ||
      isR15Row(form) ||
      matchesR14UucId(form.uuc_id, form.instrumentId, form.descriptionOfUUC) ||
      matchesR15UucId(form.uuc_id, form.instrumentId, form.descriptionOfUUC)
    ) {
      return;
    }
    const opts = { whileTyping };
    const minBad = isRangeInputOutsideAuthorized(rangeMin, limits, opts);
    const maxBad = isRangeInputOutsideAuthorized(rangeMax, limits, opts);
    if (!minBad && !maxBad) return;
    const sig = `${rangeMin}|${rangeMax}|${bounds?.min}|${bounds?.max}`;
    if (warnedSigRef.current === sig) return;
    warnedSigRef.current = sig;
    setRangeWarning({ rangeMin, rangeMax, minBad, maxBad });
  };

  useEffect(() => {
    if (
      isR14Row(form) ||
      isR15Row(form) ||
      form.template === "R-14" ||
      form.template === "R-15" ||
      matchesR14UucId(form.uuc_id, form.instrumentId, form.descriptionOfUUC) ||
      matchesR15UucId(form.uuc_id, form.instrumentId, form.descriptionOfUUC)
    ) {
      return;
    }
    checkRangeValues(form.rangeMin, form.rangeMax);
  }, [form.authorized_range_min, form.authorized_range_max]);

  const handleRangeChange = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    const nextMin = field === "rangeMin" ? value : form.rangeMin;
    const nextMax = field === "rangeMax" ? value : form.rangeMax;
    checkRangeValues(nextMin, nextMax, true);
  };

  const handleRangeFieldBlur = (field) => (e) => {
    const value = e.target.value;
    const nextMin = field === "rangeMin" ? value : form.rangeMin;
    const nextMax = field === "rangeMax" ? value : form.rangeMax;
    checkRangeValues(nextMin, nextMax);
    if (onSearchMaster) onSearchMaster();
  };

  const closeRangeWarning = (proceed) => {
    if (!proceed && rangeWarning) {
      warnedSigRef.current = "";
      setForm((prev) => ({
        ...prev,
        ...(rangeWarning.minBad ? { rangeMin: "", range_min: "" } : {}),
        ...(rangeWarning.maxBad ? { rangeMax: "", range_max: "" } : {}),
        ...(rangeWarning.lenMinBad ? { range_min_len: "" } : {}),
        ...(rangeWarning.lenMaxBad ? { range_max_len: "" } : {}),
      }));
    }
    setRangeWarning(null);
  };

  const fetchInstrument = async () => {
    if (!instrumentId.trim()) {
      setError("Please enter an Instrument ID");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `/api/instruments/${encodeURIComponent(instrumentId.trim())}`,
      );
      const inst = overrideFetchedUucTemplate(res.data);
      setForm((prev) => {
        const template = inst.template || inferElectroTemplate(prev, inst);
        const units = r14UnitDefaults(prev, inst);
        return {
        ...prev,
        instrumentId: inst.id,
        descriptionOfUUC: inst.description,
        uucSubType: inst.sub_type,
        unit: coercePressureUnit(inst.unit) || inst.unit || "",
        masterUnit: inst.master_unit || "",
        discipline: inst.discipline || "",
        method: inst.method || "",
        procedure: inst.procedure || "",
        parameter: inst.parameter || "",
        template,
        result_used: persistElectroResultUsed(template, inst.result_used) || template || "",
        ...(template === "R-14"
          ? {
              r14_min_unit: inst.r14_min_unit || units.r14_min_unit,
              r14_max_unit: inst.r14_max_unit || units.r14_max_unit,
            }
          : {}),
        cmc_unit: inst.cmc_unit || "",
        authorized_range_min: inst.authorized_range_min ?? null,
        authorized_range_max: inst.authorized_range_max ?? null,
      };
      });
      if (typeof onSearchMaster === "function") {
        onSearchMaster(inst.id);
      }
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

  const profile = getCertificateProfile(form);
  const isR06 = resultLayout(form.result_used) === "R-06";
  const isR07 = resultLayout(form.result_used) === "R-07";
  const isR08 = resultLayout(form.result_used) === "R-08";
  const isElectro = isElectroTechnicalRow(form);
  const r14Units = r14UnitsForRow(form);
  const isR14 =
    isR14Row(form) ||
    form.template === "R-14" ||
    matchesR14UucId(form.uuc_id, form.instrumentId, form.descriptionOfUUC);
  const isR15 =
    isR15Row(form) ||
    form.template === "R-15" ||
    matchesR15UucId(form.uuc_id, form.instrumentId, form.descriptionOfUUC);
  const lockRangeAndLc = isR06 || isR07;
  const lockRangeInputs = lockRangeAndLc;
  const selectedPressureUnit = coercePressureUnit(form.unit || profile.uucUnit);
  const pressureUnitOptions = PRESSURE_UNITS.some(
    (item) => item.value === selectedPressureUnit,
  )
    ? PRESSURE_UNITS
    : selectedPressureUnit
      ? [{ value: selectedPressureUnit, label: selectedPressureUnit }, ...PRESSURE_UNITS]
      : PRESSURE_UNITS;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={1.5} alignItems="center">
        <Grid size={12}>
          <Typography variant="subtitle1" fontWeight="bold">
            UUC Details
          </Typography>
        </Grid>

        <Grid size={2}>
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
        <Grid size={2}>
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
        <Grid size={8} />

        {error && (
          <Grid size={12}>
            <Alert severity="error" sx={{ py: 0 }}>
              {error}
            </Alert>
          </Grid>
        )}

        <Grid size={3}>
          <TextField
            label="Description of UUC"
            value={form.descriptionOfUUC}
            onChange={handleChange("descriptionOfUUC")}
            fullWidth
            InputProps={{ readOnly: true }}
          />
        </Grid>
        <Grid size={9}>
          <TextField
            label="UUC Sub-type"
            value={form.uucSubType}
            onChange={handleChange("uucSubType")}
            fullWidth
            placeholder="(Hydraulic bourden type)"
          />
        </Grid>

        <Grid size={1}>
          <Typography fontWeight="bold">Range:</Typography>
        </Grid>
        {isElectro ? (
          <>
            <Grid size={5.5}>
              <Stack spacing={0.25}>
                {ELECTRO_RANGE_FIELDS.map((field) => (
                  <div
                    key={field.minKey}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <TextField
                      placeholder={field.minPlaceholder}
                      type="number"
                      value={form[field.minKey] ?? ""}
                      onChange={handleChange(field.minKey)}
                      size="small"
                      sx={{ flex: 1, minWidth: 0 }}
                      inputProps={{ "aria-label": field.minPlaceholder }}
                    />
                    <select
                      aria-label={`${field.label} unit`}
                      value={form[field.minUnitKey] || field.defaultUnit}
                      onChange={handleChange(field.minUnitKey)}
                      style={{
                        fontSize: 13,
                        height: 32,
                        minWidth: 64,
                        flexShrink: 0,
                      }}
                    >
                      {field.units.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </Stack>
            </Grid>
            <Grid size={5.5}>
              <Stack spacing={0.25}>
                {ELECTRO_RANGE_FIELDS.map((field) => (
                  <div
                    key={field.maxKey}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <TextField
                      placeholder={field.maxPlaceholder}
                      type="number"
                      value={form[field.maxKey] ?? ""}
                      onChange={handleChange(field.maxKey)}
                      size="small"
                      sx={{ flex: 1, minWidth: 0 }}
                      inputProps={{ "aria-label": field.maxPlaceholder }}
                    />
                    <select
                      aria-label={`${field.label} unit`}
                      value={form[field.maxUnitKey] || field.defaultUnit}
                      onChange={handleChange(field.maxUnitKey)}
                      style={{
                        fontSize: 13,
                        height: 32,
                        minWidth: 64,
                        flexShrink: 0,
                      }}
                    >
                      {field.units.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </Stack>
            </Grid>
          </>
        ) : (
          <>
        <Grid size={isR14 ? 1.5 : 2}>
          <TextField
            label={isR15 ? "Min (min)" : "Min"}
            type="number"
            value={form.rangeMin}
            onChange={handleRangeChange("rangeMin")}
            onBlur={handleRangeFieldBlur("rangeMin")}
            disabled={lockRangeInputs}
            fullWidth
            size="small"
            inputProps={{ min: 0 }}
          />
        </Grid>
        {isR14 ? (
          <Grid size={1}>
            <TextField
              label="Unit"
              select
              value={
                r14Units.includes(form.r14_min_unit)
                  ? form.r14_min_unit
                  : r14UnitDefaults(form).r14_min_unit
              }
              onChange={handleChange("r14_min_unit")}
              fullWidth
              size="small"
            >
              {r14Units.map((option) => (
                <MenuItem key={`min-${option}`} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        ) : null}
        <Grid size={1}>
          <Typography textAlign="center">–</Typography>
        </Grid>
        <Grid size={isR14 ? 1.5 : 2}>
          <TextField
            label={isR15 ? "Max (min)" : "Max"}
            type="number"
            value={form.rangeMax}
            onChange={handleRangeChange("rangeMax")}
            onBlur={handleRangeFieldBlur("rangeMax")}
            disabled={isR07}
            fullWidth
            size="small"
            inputProps={{ min: 0 }}
          />
        </Grid>
        {isR14 ? (
          <Grid size={1}>
            <TextField
              label="Unit"
              select
              value={
                r14Units.includes(form.r14_max_unit)
                  ? form.r14_max_unit
                  : r14UnitDefaults(form).r14_max_unit
              }
              onChange={handleChange("r14_max_unit")}
              fullWidth
              size="small"
            >
              {r14Units.map((option) => (
                <MenuItem key={`max-${option}`} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        ) : null}
        {isR14 ? (
          <Grid size={2}>
            <TextField
              label="Test Voltage"
              value={form.test_voltage ?? "@5000V DC"}
              onChange={handleChange("test_voltage")}
              fullWidth
              size="small"
            />
          </Grid>
        ) : null}
          </>
        )}
        <Grid size={2}>
          {isR08 ? (
            <TextField
              label="Unit"
              select
              value={selectedPressureUnit}
              onChange={handleChange("unit")}
              fullWidth
              size="small"
            >
              {pressureUnitOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              value={profile.uucUnit}
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
            />
          )}
        </Grid>
        <Grid size={4}>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => onSearchMaster()}
            fullWidth
            sx={{ height: "40px" }}
          >
            Search for Appropriate Master
          </Button>
        </Grid>

        <Grid size={3}>
          <TextField
            label="Resolution"
            type="number"
            value={form.resolution}
            onChange={handleChange("resolution")}
            disabled={lockRangeAndLc}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid size={2}>
          <TextField
            value={isR08 ? selectedPressureUnit : profile.uucUnit}
            fullWidth
            size="small"
            InputProps={{ readOnly: true }}
          />
        </Grid>
        <Grid size={7} />

        <Grid size={3}>
          <TextField
            label="Make"
            value={form.make}
            onChange={handleChange("make")}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid size={3}>
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
        <Grid size={3}>
          <TextField
            label="Idno./Srno."
            value={form.idNumber}
            onChange={handleChange("idNumber")}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>
      <Dialog
        open={Boolean(rangeWarning)}
        onClose={() => closeRangeWarning(false)}
      >
        <DialogTitle>Range limit</DialogTitle>
        <DialogContent>
          <DialogContentText>{RANGE_LIMIT_MESSAGE}</DialogContentText>
          {rangeWarning?.message ? (
            <DialogContentText sx={{ mt: 1 }}>{rangeWarning.message}</DialogContentText>
          ) : bounds ? (
            <DialogContentText sx={{ mt: 1 }}>
              Authorized range for this UUC: {bounds.min} – {bounds.max}
            </DialogContentText>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => closeRangeWarning(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => closeRangeWarning(true)}>
            Proceed
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
