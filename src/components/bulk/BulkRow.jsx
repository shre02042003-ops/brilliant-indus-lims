import React, { useEffect, useRef, useState } from "react";
import {
  TableRow,
  TableCell,
  TextField,
  MenuItem,
  IconButton,
  Chip,
  CircularProgress,
  Tooltip,
  Typography,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { ACCURACY_OPTIONS } from "../../utils/accuracyOptions";
import { mappedMasters } from "../../utils/mappedMasters";
import {
  POINT_COUNT_OPTIONS,
  RANGE_LIMIT_MESSAGE,
  authorizedLimits,
  isRangeInputOutsideAuthorized,
  isThermoHygrometerRow,
  isElectroTechnicalRow,
  ELECTRO_RANGE_FIELDS,
  eTechBaseConfig,
  eTechUnitsForParameter,
  electroTemplateCode,
  preserveManualElectroCustomPoints,
  isR12Row,
  isR14Row,
  isR15Row,
  R12_UNITS,
  matchesR14UucId,
  matchesR15UucId,
  r14UnitDefaults,
  r14UnitsForRow,
  limitsForRow,
  normalizePointCount,
  isRodRow,
  isD22Row,
  isD19Row,
  isD31Row,
  isD20Row,
} from "../../utils/readings";
import { resultLayout } from "../../utils/resultTable";
import {
  PRESSURE_UNITS,
  coercePressureUnit,
} from "../../utils/pressureUnits";

const cellSx = { verticalAlign: "top", p: 0.5 };

function formatUucId(raw) {
  let rawValue = String(raw ?? "").toUpperCase();
  if (rawValue.length > 0 && !rawValue.startsWith("U-")) {
    if (rawValue !== "U" && rawValue !== "U-") {
      rawValue = `U-${rawValue.replace(/^U-?/, "")}`;
    }
  }
  return rawValue;
}

const electroInputSx = {
  "& .MuiInputBase-input": {
    fontSize: 11,
    py: 0.15,
    height: 16,
  },
};

const electroSelectSx = {
  fontSize: 11,
  height: 20,
  maxWidth: 62,
  flexShrink: 0,
  border: "1px solid #c5c5c5",
  borderRadius: 2,
  background: "#fff",
  padding: "0 2px",
};

function ElectroCustomPointPanel({ customPoints, onAdd }) {
  const [tempParam, setTempParam] = useState("DC VOLTAGE");
  const units = eTechUnitsForParameter(tempParam);
  const [tempUnit, setTempUnit] = useState("mV");
  const [tempValue, setTempValue] = useState("");

  const handleParamChange = (nextParam) => {
    setTempParam(nextParam);
    const nextUnits = eTechUnitsForParameter(nextParam);
    if (!nextUnits.includes(tempUnit)) setTempUnit(nextUnits[0] || "mV");
  };

  const handleAddCustomPoint = () => {
    if (String(tempValue).trim() === "" || !Number.isFinite(Number(tempValue))) {
      return;
    }
    const newPoint = {
      parameter: tempParam,
      unit: tempUnit,
      value: Number(tempValue),
    };
    onAdd?.(newPoint);
    setTempValue("");
  };

  return (
    <Stack spacing={0.4} className="add-custom-point-container">
      <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
        Add Custom Point
      </Typography>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        <select
          aria-label="Custom point parameter"
          value={tempParam}
          onChange={(e) => handleParamChange(e.target.value)}
          style={{ ...electroSelectSx, maxWidth: 150, height: 22 }}
        >
          {eTechBaseConfig.map((group) => (
            <option key={group.parameter} value={group.parameter}>
              {group.parameter}
            </option>
          ))}
        </select>
        <select
          aria-label="Custom point unit"
          value={tempUnit}
          onChange={(e) => setTempUnit(e.target.value)}
          style={electroSelectSx}
        >
          {units.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          type="number"
          aria-label="Custom point value"
          placeholder="Value"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddCustomPoint()}
          style={{
            width: 64,
            height: 22,
            fontSize: 11,
            border: "1px solid #c5c5c5",
            borderRadius: 2,
            padding: "0 4px",
          }}
        />
        <button
          type="button"
          onClick={handleAddCustomPoint}
          style={{
            height: 22,
            fontSize: 11,
            padding: "0 8px",
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>
      {(Array.isArray(customPoints) && customPoints.length > 0) && (
        <div
          className="mt-2 flex flex-col gap-1 max-h-32 overflow-y-auto"
          style={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            maxHeight: 128,
            overflowY: "auto",
          }}
        >
          {customPoints.map((pt, idx) => (
            <div
              key={`${pt.parameter}-${pt.unit}-${pt.value}-${idx}`}
              className="text-xs text-gray-500"
              style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.3 }}
            >
              {pt.value} {pt.unit} ({pt.parameter})
            </div>
          ))}
        </div>
      )}
    </Stack>
  );
}

function ElectroRangeStack({ row, patchRow, side, onBlur }) {
  return (
    <Stack spacing={0.15}>
      {ELECTRO_RANGE_FIELDS.map((field) => {
        const key = side === "min" ? field.minKey : field.maxKey;
        const unitKey = side === "min" ? field.minUnitKey : field.maxUnitKey;
        const placeholder = side === "min" ? field.minPlaceholder : field.maxPlaceholder;
        const unit = row[unitKey] || field.defaultUnit;
        return (
          <div
            key={key}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <TextField
              variant="standard"
              type="number"
              placeholder={placeholder}
              value={row[key] ?? ""}
              onChange={(e) => patchRow(row.key, { [key]: e.target.value })}
              onBlur={onBlur}
              size="small"
              sx={{ ...electroInputSx, flex: 1, minWidth: 0 }}
              inputProps={{ "aria-label": placeholder }}
            />
            <select
              aria-label={`${field.label} ${side} unit`}
              value={unit}
              onChange={(e) =>
                patchRow(row.key, { [unitKey]: e.target.value })
              }
              style={electroSelectSx}
            >
              {field.units.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </Stack>
  );
}

function MasterCell({ row }) {
  if (row.masterLoading) return <CircularProgress size={16} />;
  const masters = Array.isArray(row.masters) && row.masters.length
    ? row.masters
    : mappedMasters(row.masterMatch);
  if (masters.length > 0) {
    return (
      <Stack spacing={0.5} alignItems="flex-start">
        {masters.map((master, index) => (
          <Tooltip
            key={master.id || master.id_no || index}
            title={master.name || master.id_no || ""}
          >
            <Chip
              size="small"
              color="success"
              label={master.id_no || master.name || `Master ${index + 1}`}
            />
          </Tooltip>
        ))}
      </Stack>
    );
  }
  if (row.masterError) {
    return <Chip size="small" color="warning" label={row.masterError} />;
  }
  return null;
}

export default function BulkRow({
  index,
  row,
  patchRow,
  addElectroCustomPoint,
  onInstrumentBlur,
  onRangeBlur,
  onReadingInputsBlur,
  onCopyRow,
  onCopyAbove,
  onDeleteRow,
  suggestedCopyRow,
}) {
  const set = (field) => (e) => patchRow(row.key, { [field]: e.target.value });
  const cmcLabel = [row.cmc || row.cmc_min, row.cmc_unit].filter(Boolean).join(" ");
  const warnedSigRef = useRef("");
  const feelerInputRefs = useRef([]);
  const feelerFocusIndex = useRef(null);
  const [rangeWarning, setRangeWarning] = useState(null);
  useEffect(() => {
    const index = feelerFocusIndex.current;
    if (index == null) return;
    feelerFocusIndex.current = null;
    feelerInputRefs.current[index]?.focus();
  }, [row.feeler_points, row.radius_points]);
  const limits = limitsForRow(row);
  const bounds = authorizedLimits(limits);

  const readD20Number = (value) => {
    if (value == null || String(value).trim() === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const checkD20Ranges = ({
    rangeMin = row.rangeMin ?? row.range_min,
    rangeMax = row.rangeMax ?? row.range_max,
    rangeMinLen = row.range_min_len,
    rangeMaxLen = row.range_max_len,
  } = {}) => {
    const angleMin = readD20Number(rangeMin);
    const angleMax = readD20Number(rangeMax);
    const lenMin = readD20Number(rangeMinLen);
    const lenMax = readD20Number(rangeMaxLen);
    const angleMinBad = angleMin != null && angleMin < 0;
    const angleMaxBad = angleMax != null && angleMax > 60;
    const lenMinBad = lenMin != null && lenMin < 3.2;
    const lenMaxBad = lenMax != null && lenMax > 25.4;
    if (!angleMinBad && !angleMaxBad && !lenMinBad && !lenMaxBad) return;
    const sig = `d20|${row.key}|${angleMin}|${angleMax}|${lenMin}|${lenMax}`;
    if (warnedSigRef.current === sig) return;
    warnedSigRef.current = sig;
    setRangeWarning({
      message: "Authorized range for this UUC: Angle (0 - 60) & Length (3.2 - 25.4)",
      minBad: angleMinBad,
      maxBad: angleMaxBad,
      lenMinBad,
      lenMaxBad,
    });
  };

  const checkRangeValues = (rangeMin, rangeMax, whileTyping = false) => {
    if (row.is_test_row) return;
    if (isD20Row(row)) {
      checkD20Ranges({ rangeMin, rangeMax });
      return;
    }
    if (!bounds || !Number.isFinite(bounds.max) || Number(bounds.max) === 0) return;
    if (
      row.template === "R-14" ||
      row.template === "R-15" ||
      isR14Row(row) ||
      isR15Row(row) ||
      matchesR14UucId(row.uuc_id, row.instrumentId, row.descriptionOfUUC) ||
      matchesR15UucId(row.uuc_id, row.instrumentId, row.descriptionOfUUC)
    ) {
      return;
    }
    const opts = { whileTyping };
    const minBad = isRangeInputOutsideAuthorized(rangeMin, limits, opts);
    const maxBad = isRangeInputOutsideAuthorized(rangeMax, limits, opts);
    if (!minBad && !maxBad) return;
    const sig = `${row.key}|${rangeMin}|${rangeMax}|${bounds?.min}|${bounds?.max}`;
    if (warnedSigRef.current === sig) return;
    warnedSigRef.current = sig;
    setRangeWarning({ rangeMin, rangeMax, minBad, maxBad });
  };

  useEffect(() => {
    if (
      row.is_test_row ||
      isElectroTechnicalRow(row) ||
      isR12Row(row) ||
      isR14Row(row) ||
      isR15Row(row) ||
      matchesR14UucId(row.uuc_id, row.instrumentId, row.descriptionOfUUC) ||
      matchesR15UucId(row.uuc_id, row.instrumentId, row.descriptionOfUUC)
    ) {
      return;
    }
    checkRangeValues(row.rangeMin, row.rangeMax);
  }, [row.authorized_range_min, row.authorized_range_max, row.uucData, row.result_used]);

  const handleRangeChange = (field) => (e) => {
    const value = e.target.value;
    patchRow(row.key, { [field]: value });
    const nextMin = field === "rangeMin" ? value : row.rangeMin;
    const nextMax = field === "rangeMax" ? value : row.rangeMax;
    if (
      !bounds &&
      !row.instrumentLoading &&
      !String(row.instrumentId || "").trim() &&
      String(row.descriptionOfUUC || "").trim()
    ) {
      onInstrumentBlur(row.key);
    }
    checkRangeValues(nextMin, nextMax, true);
  };

  const closeRangeWarning = (proceed) => {
    if (!proceed && rangeWarning) {
      warnedSigRef.current = "";
      patchRow(row.key, {
        ...(rangeWarning.minBad ? { rangeMin: "", range_min: "" } : {}),
        ...(rangeWarning.maxBad ? { rangeMax: "", range_max: "" } : {}),
        ...(rangeWarning.lenMinBad ? { range_min_len: "" } : {}),
        ...(rangeWarning.lenMaxBad ? { range_max_len: "" } : {}),
      });
    }
    setRangeWarning(null);
  };

  const handleRangeFieldBlur = (field) => (e) => {
    const value = e.target.value;
    const nextMin = field === "rangeMin" ? value : row.rangeMin;
    const nextMax = field === "rangeMax" ? value : row.rangeMax;
    checkRangeValues(nextMin, nextMax);
    onRangeBlur(row.key);
  };

  const isR06 =
    resultLayout(row.result_used || row.uucData?.result_used) === "R-06";
  const isR07 =
    resultLayout(row.result_used || row.uucData?.result_used) === "R-07";
  const isR08 =
    resultLayout(row.result_used || row.uucData?.result_used) === "R-08";
  const isDualRange = isThermoHygrometerRow(row);
  const template = electroTemplateCode(row.template);
  const lockRangeAndLc = isR06 || isR07;
  const lockRangeInputs = lockRangeAndLc;
  const selectedPressureUnit = coercePressureUnit(row.unit);
  const pressureUnitOptions = PRESSURE_UNITS.some(
    (item) => item.value === selectedPressureUnit,
  )
    ? PRESSURE_UNITS
    : selectedPressureUnit
      ? [{ value: selectedPressureUnit, label: selectedPressureUnit }, ...PRESSURE_UNITS]
      : PRESSURE_UNITS;

  let rangeCells;
  const manualPoints = isD19Row(row)
    ? {
        field: "feeler_points",
        label: "Feeler size",
        min: "0.01",
        max: "1.00",
        step: "0.01",
        low: 0.01,
        high: 1,
        lowText: "0.01",
        highText: "1.00",
        message: "Feeler Gauge limit enforced: Readings must be between 0.01 and 1.00 mm.",
      }
    : isD31Row(row)
      ? {
          field: "radius_points",
          label: "Radius size",
          min: "0.6",
          max: "25",
          step: "any",
          low: 0.6,
          high: 25,
          lowText: "0.6",
          highText: "25",
          message: "Radius Gauge limit enforced: Readings must be between 0.6 and 25 mm.",
        }
      : null;
  if (manualPoints) {
    const points = Array.isArray(row[manualPoints.field]) ? row[manualPoints.field] : [];
    const savePoints = (next, focusIndex) => {
      if (focusIndex != null) feelerFocusIndex.current = focusIndex;
      patchRow(row.key, { [manualPoints.field]: next });
    };
    rangeCells = (
      <TableCell colSpan={2} sx={{ ...cellSx, minWidth: 140 }}>
        <div>
          {points.map((val, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
              <input
                type="number"
                min={manualPoints.min}
                max={manualPoints.max}
                step={manualPoints.step}
                value={val}
                aria-label={`${manualPoints.label} ${idx + 1}`}
                ref={(element) => {
                  feelerInputRefs.current[idx] = element;
                }}
                onChange={(e) => {
                  const newPoints = [...points];
                  newPoints[idx] = e.target.value;
                  savePoints(newPoints);
                }}
                onBlur={(e) => {
                  const raw = String(e.target.value ?? "").trim();
                  if (raw === "") return;
                  const num = Number(raw);
                  if (!Number.isFinite(num) || num === 0) return;
                  if (num < manualPoints.low || num > manualPoints.high) {
                    window.alert(manualPoints.message);
                    const newPoints = [...points];
                    newPoints[idx] = num > manualPoints.high ? manualPoints.highText : manualPoints.lowText;
                    savePoints(newPoints);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const newPoints = [...points, ""];
                  savePoints(newPoints, newPoints.length - 1);
                }}
                style={{ width: "60px", padding: "2px" }}
              />
              <button
                type="button"
                onClick={() => savePoints(points.filter((_, i) => i !== idx))}
                style={{ cursor: "pointer", color: "red", background: "none", border: "none", fontWeight: "bold" }}
                title="Remove reading"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const newPoints = [...points, ""];
              savePoints(newPoints, newPoints.length - 1);
            }}
            style={{ marginTop: "4px", padding: "2px 8px" }}
          >
            + Add Reading
          </button>
        </div>
      </TableCell>
    );
  } else if (isD20Row(row)) {
    const fieldLabel = { fontSize: 10, lineHeight: 1.1, color: "#6b7280" };
    rangeCells = (
      <>
        <TableCell sx={{ ...cellSx, minWidth: 90 }}>
          <div>
            <div style={fieldLabel}>Angle</div>
            <TextField
              variant="standard"
              type="number"
              placeholder="0"
              value={row.rangeMin ?? row.range_min ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                patchRow(row.key, { rangeMin: value, range_min: value });
              }}
              onBlur={handleRangeFieldBlur("rangeMin")}
              fullWidth
              size="small"
              inputProps={{ "aria-label": "Angle range min" }}
            />
            <div style={{ ...fieldLabel, marginTop: 4 }}>Length</div>
            <TextField
              variant="standard"
              type="number"
              placeholder="5"
              value={row.range_min_len ?? ""}
              onChange={set("range_min_len")}
              onBlur={(e) => {
                checkD20Ranges({ rangeMinLen: e.target.value });
                onReadingInputsBlur?.(row.key);
              }}
              fullWidth
              size="small"
              inputProps={{ "aria-label": "Length range min" }}
            />
          </div>
        </TableCell>
        <TableCell sx={{ ...cellSx, minWidth: 90 }}>
          <div>
            <div style={fieldLabel}>Angle</div>
            <TextField
              variant="standard"
              type="number"
              placeholder="60"
              value={row.rangeMax ?? row.range_max ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                patchRow(row.key, { rangeMax: value, range_max: value });
              }}
              onBlur={handleRangeFieldBlur("rangeMax")}
              fullWidth
              size="small"
              inputProps={{ "aria-label": "Angle range max" }}
            />
            <div style={{ ...fieldLabel, marginTop: 4 }}>Length</div>
            <TextField
              variant="standard"
              type="number"
              placeholder="35"
              value={row.range_max_len ?? ""}
              onChange={set("range_max_len")}
              onBlur={(e) => {
                checkD20Ranges({ rangeMaxLen: e.target.value });
                onReadingInputsBlur?.(row.key);
              }}
              fullWidth
              size="small"
              inputProps={{ "aria-label": "Length range max" }}
            />
          </div>
        </TableCell>
      </>
    );
  } else if (template === "E01" || template === "E02") {
    rangeCells = (
      <TableCell
        colSpan={2}
        className="add-custom-point-container"
        sx={{ ...cellSx, minWidth: 280 }}
      >
        <ElectroCustomPointPanel
          customPoints={preserveManualElectroCustomPoints(row.customPoints)}
          onAdd={(newPoint) => addElectroCustomPoint?.(row.key, newPoint)}
        />
      </TableCell>
    );
  } else if (
    template === "R-14" ||
    isR14Row(row) ||
    matchesR14UucId(row.uuc_id, row.instrumentId, row.descriptionOfUUC)
  ) {
    const unitDefaults = r14UnitDefaults(row);
    const r14Units = r14UnitsForRow(row);
    const minUnit = r14Units.includes(row.r14_min_unit)
      ? row.r14_min_unit
      : unitDefaults.r14_min_unit;
    const maxUnit = r14Units.includes(row.r14_max_unit)
      ? row.r14_max_unit
      : unitDefaults.r14_max_unit;
    rangeCells = (
      <>
        <TableCell sx={{ ...cellSx, minWidth: 110 }}>
          <div
            className="flex gap-1"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <TextField
              variant="standard"
              type="number"
              placeholder="Min"
              value={row.rangeMin}
              onChange={handleRangeChange("rangeMin")}
              onBlur={handleRangeFieldBlur("rangeMin")}
              size="small"
              sx={{ flex: 1, minWidth: 56 }}
              inputProps={{ "aria-label": "Range Min" }}
            />
            <select
              aria-label="R-14 min unit"
              value={minUnit}
              onChange={(e) => patchRow(row.key, { r14_min_unit: e.target.value })}
              style={electroSelectSx}
            >
              {r14Units.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </TableCell>
        <TableCell sx={{ ...cellSx, minWidth: 170 }}>
          <div
            className="flex gap-1"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <TextField
              variant="standard"
              type="number"
              placeholder="Max"
              value={row.rangeMax}
              onChange={handleRangeChange("rangeMax")}
              onBlur={handleRangeFieldBlur("rangeMax")}
              size="small"
              sx={{ flex: 1, minWidth: 48 }}
              inputProps={{ "aria-label": "Range Max" }}
            />
            <select
              aria-label="R-14 max unit"
              value={maxUnit}
              onChange={(e) => patchRow(row.key, { r14_max_unit: e.target.value })}
              style={electroSelectSx}
            >
              {r14Units.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <TextField
              variant="standard"
              placeholder="@5000V DC"
              value={row.test_voltage ?? "@5000V DC"}
              onChange={set("test_voltage")}
              size="small"
              sx={{ width: 78, "& .MuiInputBase-input": { fontSize: 11 } }}
              inputProps={{ "aria-label": "Test voltage" }}
            />
          </div>
        </TableCell>
      </>
    );
  } else if (
    template === "R-15" ||
    isR15Row(row) ||
    matchesR15UucId(row.uuc_id, row.instrumentId, row.descriptionOfUUC)
  ) {
    rangeCells = (
      <>
        <TableCell sx={{ ...cellSx, minWidth: 80 }}>
          <TextField
            variant="standard"
            type="number"
            placeholder="Min (min)"
            value={row.rangeMin}
            onChange={handleRangeChange("rangeMin")}
            onBlur={handleRangeFieldBlur("rangeMin")}
            fullWidth
            size="small"
            inputProps={{ "aria-label": "Range Min minutes" }}
          />
        </TableCell>
        <TableCell sx={{ ...cellSx, minWidth: 80 }}>
          <TextField
            variant="standard"
            type="number"
            placeholder="Max (min)"
            value={row.rangeMax}
            onChange={handleRangeChange("rangeMax")}
            onBlur={handleRangeFieldBlur("rangeMax")}
            fullWidth
            size="small"
            inputProps={{ "aria-label": "Range Max minutes" }}
          />
        </TableCell>
      </>
    );
  } else if (
    (template === "R-12" || isR12Row(row)) &&
    !matchesR14UucId(row.uuc_id, row.instrumentId, row.descriptionOfUUC) &&
    !matchesR15UucId(row.uuc_id, row.instrumentId, row.descriptionOfUUC)
  ) {
    rangeCells = (
      <>
        <TableCell sx={{ ...cellSx, minWidth: 110 }}>
          <div
            className="flex gap-1"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <TextField
              variant="standard"
              type="number"
              placeholder="Min"
              value={row.rangeMin}
              onChange={handleRangeChange("rangeMin")}
              onBlur={handleRangeFieldBlur("rangeMin")}
              size="small"
              sx={{ flex: 1, minWidth: 56 }}
              inputProps={{ "aria-label": "Range Min" }}
            />
            <select
              aria-label="R-12 unit"
              value={row.r12_unit || "V"}
              onChange={(e) => patchRow(row.key, { r12_unit: e.target.value })}
              style={electroSelectSx}
            >
              {R12_UNITS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </TableCell>
        <TableCell sx={{ ...cellSx, minWidth: 80 }}>
          <TextField
            variant="standard"
            type="number"
            placeholder="Max"
            value={row.rangeMax}
            onChange={handleRangeChange("rangeMax")}
            onBlur={handleRangeFieldBlur("rangeMax")}
            fullWidth
            size="small"
            inputProps={{ "aria-label": "Range Max" }}
          />
        </TableCell>
      </>
    );
  } else if (isRodRow(row) || isD22Row(row)) {
    const rods =
      Array.isArray(row.rods) && row.rods.length > 0
        ? row.rods
        : [{ min: row.rangeMin ?? "", max: row.rangeMax ?? "" }];
    const saveRods = (next) => {
      patchRow(row.key, {
        rods: next,
        rangeMin: next[0]?.min ?? "",
        rangeMax: next[0]?.max ?? "",
      });
    };
    const updateRod = (index, field, value) => {
      const next = rods.map((rod, i) =>
        i === index ? { ...rod, [field]: value } : rod,
      );
      saveRods(next);
    };
    rangeCells = (
      <TableCell colSpan={2} sx={{ ...cellSx, minWidth: 180 }}>
        <Stack spacing={0.5}>
          {rods.map((rod, index) => (
            <Stack key={index} direction="row" spacing={0.5} alignItems="center">
              <TextField
                variant="standard"
                type="number"
                placeholder="Min"
                value={rod.min ?? ""}
                onChange={(e) => updateRod(index, "min", e.target.value)}
                onBlur={handleRangeFieldBlur("rangeMin")}
                size="small"
                sx={{ width: 64 }}
                inputProps={{ "aria-label": `Rod ${index + 1} min` }}
              />
              <TextField
                variant="standard"
                type="number"
                placeholder="Max"
                value={rod.max ?? ""}
                onChange={(e) => updateRod(index, "max", e.target.value)}
                onBlur={handleRangeFieldBlur("rangeMax")}
                size="small"
                sx={{ width: 64 }}
                inputProps={{ "aria-label": `Rod ${index + 1} max` }}
              />
              {index > 0 ? (
                <Button
                  size="small"
                  color="error"
                  onClick={() => saveRods(rods.filter((_, i) => i !== index))}
                  sx={{ minWidth: 28, px: 0.5 }}
                >
                  −
                </Button>
              ) : null}
            </Stack>
          ))}
          <Button
            size="small"
            variant="outlined"
            onClick={() => saveRods([...rods, { min: "", max: "" }])}
            sx={{ alignSelf: "flex-start", minWidth: 32, px: 1 }}
          >
            +
          </Button>
        </Stack>
      </TableCell>
    );
  } else if (template === "R-11") {
    rangeCells = (
      <>
        <TableCell
          className="stacked-inputs-container"
          sx={{ ...cellSx, minWidth: 132 }}
        >
          <ElectroRangeStack
            row={row}
            patchRow={patchRow}
            side="min"
            onBlur={() => onReadingInputsBlur?.(row.key)}
          />
        </TableCell>
        <TableCell
          className="stacked-inputs-container"
          sx={{ ...cellSx, minWidth: 132 }}
        >
          <ElectroRangeStack
            row={row}
            patchRow={patchRow}
            side="max"
            onBlur={() => onReadingInputsBlur?.(row.key)}
          />
        </TableCell>
      </>
    );
  } else {
    rangeCells = (
      <>
        <TableCell sx={{ ...cellSx, minWidth: isDualRange ? 92 : 80 }}>
          {isDualRange ? (
            <Stack spacing={0.25}>
              <TextField
                variant="standard"
                type="number"
                placeholder="Temp Min °C"
                value={row.rangeMin}
                onChange={handleRangeChange("rangeMin")}
                onBlur={handleRangeFieldBlur("rangeMin")}
                disabled={lockRangeInputs}
                fullWidth
                size="small"
                inputProps={{ "aria-label": "Temp Min °C" }}
              />
              <TextField
                variant="standard"
                type="number"
                placeholder="RH Min %RH"
                value={row.rhRangeMin ?? row.rh_range_min ?? ""}
                onChange={set("rhRangeMin")}
                onBlur={() => onReadingInputsBlur?.(row.key)}
                fullWidth
                size="small"
                inputProps={{ "aria-label": "RH Min %RH" }}
              />
            </Stack>
          ) : (
            <TextField
              variant="standard"
              type="number"
              value={row.rangeMin}
              onChange={handleRangeChange("rangeMin")}
              onBlur={handleRangeFieldBlur("rangeMin")}
              disabled={lockRangeInputs}
              fullWidth
              size="small"
            />
          )}
        </TableCell>
        <TableCell sx={{ ...cellSx, minWidth: isDualRange ? 92 : 80 }}>
          {isDualRange ? (
            <Stack spacing={0.25}>
              <TextField
                variant="standard"
                type="number"
                placeholder="Temp Max °C"
                value={row.rangeMax}
                onChange={handleRangeChange("rangeMax")}
                onBlur={handleRangeFieldBlur("rangeMax")}
                disabled={isR07}
                fullWidth
                size="small"
                inputProps={{ "aria-label": "Temp Max °C" }}
              />
              <TextField
                variant="standard"
                type="number"
                placeholder="RH Max %RH"
                value={row.rhRangeMax ?? row.rh_range_max ?? ""}
                onChange={set("rhRangeMax")}
                onBlur={() => onReadingInputsBlur?.(row.key)}
                fullWidth
                size="small"
                inputProps={{ "aria-label": "RH Max %RH" }}
              />
            </Stack>
          ) : (
            <TextField
              variant="standard"
              type="number"
              value={row.rangeMax}
              onChange={handleRangeChange("rangeMax")}
              onBlur={handleRangeFieldBlur("rangeMax")}
              disabled={isR07}
              fullWidth
              size="small"
            />
          )}
        </TableCell>
      </>
    );
  }

  return (
    <>
    <TableRow hover>
      <TableCell sx={{ ...cellSx, textAlign: "center", fontWeight: "bold" }}>
        {index + 1}
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 180 }}>
        <Stack spacing={1}>
          <TextField
            variant="standard"
            placeholder="Description of UUC"
            value={row.descriptionOfUUC || ""}
            onChange={(e) =>
              patchRow(row.key, { descriptionOfUUC: e.target.value })
            }
            fullWidth
            size="small"
            inputProps={{ "aria-label": "Description of UUC" }}
          />
          <TextField
            variant="standard"
            placeholder="e.g. U-A01"
            value={row.instrumentId || row.uuc_id || "U-"}
            onChange={(e) => {
              const rawValue = formatUucId(e.target.value);
              patchRow(row.key, { instrumentId: rawValue, uuc_id: rawValue });
            }}
            onBlur={(e) => {
              const exactValue = formatUucId(e.target.value);
              patchRow(row.key, { instrumentId: exactValue, uuc_id: exactValue });
              if (exactValue && exactValue !== "U-") {
                onInstrumentBlur?.(row.key, exactValue);
              }
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              e.target.blur();
            }}
            fullWidth
            size="small"
            inputProps={{
              "aria-label": "UUC ID",
              style: { fontSize: 12, color: "#6b7280" },
            }}
          />
        </Stack>
        {row.instrumentLoading && (
          <Typography variant="caption" color="text.secondary">Looking up…</Typography>
        )}
        {!row.instrumentLoading && row.instrumentError && (
          <Typography variant="caption" color="error">{row.instrumentError}</Typography>
        )}
        {!row.instrumentLoading && !row.instrumentError && row.uucSubType && (
          <Typography variant="caption" color="text.secondary">
            {row.uucSubType}
          </Typography>
        )}
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 100 }}>
        <TextField variant="standard" value={row.make} onChange={set("make")} fullWidth size="small" />
      </TableCell>

      {rangeCells}

      <TableCell sx={{ ...cellSx, minWidth: 90 }}>
        {isD20Row(row) ? (
          <div>
            <div style={{ fontSize: 10, lineHeight: 1.1, color: "#6b7280" }}>Angle</div>
            <TextField
              variant="standard"
              type="number"
              placeholder="2"
              value={row.leastCount ?? row.lc ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                patchRow(row.key, { leastCount: value, lc: value });
              }}
              onBlur={() => onReadingInputsBlur?.(row.key)}
              fullWidth
              size="small"
              inputProps={{ "aria-label": "Angle least count" }}
            />
            <div style={{ fontSize: 10, lineHeight: 1.1, color: "#6b7280", marginTop: 4 }}>Length</div>
            <TextField
              variant="standard"
              type="number"
              placeholder="1"
              value={row.lc_len ?? ""}
              onChange={set("lc_len")}
              onBlur={() => onReadingInputsBlur?.(row.key)}
              fullWidth
              size="small"
              inputProps={{ "aria-label": "Length least count" }}
            />
          </div>
        ) : (
          <TextField
            variant="standard"
            placeholder="e.g. 0.01"
            value={row.leastCount ?? ""}
            onChange={set("leastCount")}
            onBlur={() => onReadingInputsBlur?.(row.key)}
            disabled={lockRangeAndLc}
            fullWidth
            size="small"
          />
        )}
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 110 }}>
        <TextField
          variant="standard"
          select
          value={row.accuracy}
          onChange={set("accuracy")}
          onBlur={() => onReadingInputsBlur?.(row.key)}
          fullWidth
          size="small"
        >
          {ACCURACY_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.value}
            </MenuItem>
          ))}
        </TextField>
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 110 }}>
        <TextField
          variant="standard"
          select
          value={normalizePointCount(row.pointCount)}
          onChange={(e) =>
            patchRow(row.key, { pointCount: Number(e.target.value) })
          }
          fullWidth
          size="small"
        >
          {POINT_COUNT_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 90 }}>
        <TextField variant="standard" value={row.idNo} onChange={set("idNo")} fullWidth size="small" />
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 130 }}>
        <DatePicker
          value={row.calDate}
          onChange={(v) => patchRow(row.key, { calDate: v })}
          slotProps={{ textField: { variant: "standard", size: "small", fullWidth: true } }}
        />
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 130 }}>
        <DatePicker
          value={row.dueDate}
          onChange={(v) => patchRow(row.key, { dueDate: v })}
          slotProps={{ textField: { variant: "standard", size: "small", fullWidth: true } }}
        />
      </TableCell>

      <TableCell sx={{ ...cellSx, textAlign: "center", minWidth: 90 }}>
        {row.result_used || row.uucData?.result_used ? (
          <Stack spacing={0.5} alignItems="center">
            <Chip
              size="small"
              variant="outlined"
              color="primary"
              label={row.result_used || row.uucData.result_used}
            />
            {cmcLabel ? (
              <Typography variant="caption" color="text.secondary">
                CMC {cmcLabel}
              </Typography>
            ) : null}
            {isR08 ? (
              <TextField
                variant="standard"
                select
                label="Unit"
                value={selectedPressureUnit}
                onChange={set("unit")}
                size="small"
                sx={{ minWidth: 88 }}
              >
                {pressureUnitOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">—</Typography>
        )}
      </TableCell>

      <TableCell sx={{ ...cellSx, textAlign: "center", minWidth: 70 }}>
        <MasterCell row={row} />
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 150 }}>
        {suggestedCopyRow != null && (
          <Chip
            size="small"
            color="info"
            variant="outlined"
            icon={<ContentCopyIcon fontSize="inherit" />}
            label={`Copy row ${suggestedCopyRow}?`}
            onClick={() => onCopyAbove(row.key, suggestedCopyRow)}
            sx={{ mb: 0.5, cursor: "pointer" }}
          />
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <TextField
            variant="standard"
            type="number"
            placeholder="Row #"
            value={row.copyFromIndex}
            onChange={set("copyFromIndex")}
            size="small"
            sx={{ width: 56 }}
          />
          <Tooltip title="Copy row">
            <IconButton size="small" onClick={() => onCopyRow(row.key)}>
              <ContentCopyIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete row">
            <IconButton size="small" color="error" onClick={() => onDeleteRow(row.key)}>
              <DeleteOutlineIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </div>
        {row.copyError && (
          <Typography variant="caption" color="error">{row.copyError}</Typography>
        )}
      </TableCell>
    </TableRow>
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
    </>
  );
}
