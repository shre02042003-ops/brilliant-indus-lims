import React, { createContext, useContext, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import axios from "axios";
import {
  isRowEmpty,
  makeEmptyRow,
  makeInitialParentRows,
} from "../utils/emptyBulkRow";
import { mapInstrumentsToMockRows } from "../utils/stressTestData";
import { normalizeMatchPayload } from "../utils/mappedMasters";
import {
  generateAutomatedReadings,
  makeEmptyReadings,
  pickCmc,
  isR09Readings,
  isElectroReadings,
  inferElectroTemplate,
  normalizeElectroUnit,
  preserveManualElectroCustomPoints,
  isR12Readings,
  isR14Readings,
  isR15Readings,
  isTachometerReadings,
  isVernierReadings,
  isDimensionalUmReadings,
  isAngularReadings,
  isD09Readings,
  isRodReadings,
  isD17Readings,
  isTapeReadings,
  isD25Readings,
  isUtgReadings,
  isD42Readings,
  isD18Readings,
  isD20Readings,
  isD21Readings,
  isD22Readings,
  isD19Readings,
  isD31Readings,
  isD32Readings,
  persistElectroResultUsed,
  overrideFetchedUucTemplate,
} from "../utils/readings";
import { coercePressureUnit } from "../utils/pressureUnits";
import { ACCURACY_OPTIONS } from "../utils/accuracyOptions";

const BulkEntriesContext = createContext(null);

export function useBulkEntries() {
  const ctx = useContext(BulkEntriesContext);
  if (!ctx) {
    throw new Error("useBulkEntries must be used within BulkEntriesProvider");
  }
  return ctx;
}

export default function BulkEntriesProvider() {
  const [company, setCompany] = useState({ id: "", name: "", address: "" });
  const [rows, setRows] = useState(makeInitialParentRows);
  const matchTokensRef = useRef({});
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const withTrailingEmpty = (nextRows) => {
    if (nextRows.length === 0 || !isRowEmpty(nextRows[nextRows.length - 1])) {
      const maxKey = nextRows.reduce((max, row) => {
        const n = Number(row.key);
        return Number.isFinite(n) && n > max ? n : max;
      }, -1);
      return [...nextRows, makeEmptyRow(maxKey + 1)];
    }
    return nextRows;
  };

  const READING_INPUT_KEYS = [
    "rods",
    "feeler_points",
    "radius_points",
    "rangeMin",
    "rangeMax",
    "r12_unit",
    "r14_min_unit",
    "r14_max_unit",
    "test_voltage",
    "rhRangeMin",
    "rhRangeMax",
    "leastCount",
    "range_min",
    "range_max",
    "range_min_len",
    "range_max_len",
    "lc",
    "lc_len",
    "accuracy",
    "pointCount",
    "instrumentId",
    "result_used",
    "template",
    "cmc",
    "cmc_min",
    "dcv_min",
    "dcv_max",
    "dcv_min_unit",
    "dcv_max_unit",
    "acv_min",
    "acv_max",
    "acv_min_unit",
    "acv_max_unit",
    "dca_min",
    "dca_max",
    "dca_min_unit",
    "dca_max_unit",
    "aca_min",
    "aca_max",
    "aca_min_unit",
    "aca_max_unit",
    "res_min",
    "res_max",
    "res_min_unit",
    "res_max_unit",
  ];

  const readingsFilled = (readings) => {
    if (isR09Readings(readings)) {
      const rhFilled = (readings.rh || []).some(
        (reading) =>
          String(reading?.uucVal || reading?.uuc || "").trim() !== "",
      );
      const tempFilled = (readings.temp || []).some(
        (reading) =>
          String(reading?.uucVal || reading?.uuc || "").trim() !== "",
      );
      return rhFilled && tempFilled;
    }
    if (isElectroReadings(readings)) return true;
    if (isR12Readings(readings) || isR14Readings(readings) || isR15Readings(readings) || isTachometerReadings(readings) || isVernierReadings(readings) || isDimensionalUmReadings(readings) || isAngularReadings(readings) || isD09Readings(readings) || isRodReadings(readings) || isD17Readings(readings) || isTapeReadings(readings) || isD25Readings(readings) || isUtgReadings(readings) || isD42Readings(readings) || isD18Readings(readings) || isD20Readings(readings) || isD21Readings(readings) || isD22Readings(readings) || isD19Readings(readings) || isD31Readings(readings) || isD32Readings(readings)) return true;
    if (!Array.isArray(readings)) {
      return Boolean(readings?.points && readings.points.length > 0);
    }
    return readings.some(
      (reading) =>
        (String(reading?.nominal || "").trim() !== "" &&
          String(reading?.standard || "").trim() !== "" &&
          String(reading?.uuc || "").trim() !== "") ||
        (String(reading?.m1 || "").trim() !== "" &&
          String(reading?.m2 || "").trim() !== "" &&
          String(reading?.uuc || "").trim() !== ""),
    );
  };

  const withAutomatedReadings = (row, force = false) => {
    const generated = generateAutomatedReadings(row);
    const customPoints = preserveManualElectroCustomPoints(row.customPoints);
    if (!generated) {
      return force
        ? { ...row, readings: makeEmptyReadings(), customPoints }
        : { ...row, customPoints };
    }
    if (!force && readingsFilled(row.readings)) return { ...row, customPoints };
    return { ...row, readings: generated, customPoints };
  };

  const applyGeneratedReadings = (row, { force = false } = {}) => {
    const generated = generateAutomatedReadings(row);
    const customPoints = preserveManualElectroCustomPoints(row.customPoints);
    if (generated != null) return { ...row, readings: generated, customPoints };
    if (force) return { ...row, readings: makeEmptyReadings(), customPoints };
    return { ...row, customPoints };
  };

  const patchRow = (key, patch) => {
    setRows((prev) => {
      const nextRows = withTrailingEmpty(
        prev.map((r) => {
          if (r.key !== key) return r;
          const next = { ...r, ...patch };
          const inputsChanged = READING_INPUT_KEYS.some((field) =>
            Object.prototype.hasOwnProperty.call(patch, field),
          );
          if (inputsChanged) {
            const template = inferElectroTemplate(next);
            return applyGeneratedReadings({ ...next, template });
          }
          return withAutomatedReadings({
            ...next,
            template: next.template || inferElectroTemplate(next),
          });
        }),
      );
      rowsRef.current = nextRows;
      return nextRows;
    });
  };

  const regenerateRowReadings = (key) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const template = inferElectroTemplate(r);
        return applyGeneratedReadings({ ...r, template }, { force: true });
      }),
    );
  };

  const addElectroCustomPoint = (key, newPoint) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const value = Number(newPoint?.value);
        if (!Number.isFinite(value)) return r;
        const template = inferElectroTemplate(r) || r.template;
        const customPoints = preserveManualElectroCustomPoints([
          ...(Array.isArray(r.customPoints) ? r.customPoints : []),
        ]);
        const alreadyAdded = customPoints.some(
          (point) =>
            point.parameter === newPoint.parameter &&
            normalizeElectroUnit(point.unit) ===
              normalizeElectroUnit(newPoint.unit) &&
            Number(point.value) === value,
        );
        if (!alreadyAdded) {
          customPoints.push({
            parameter: newPoint.parameter,
            unit: newPoint.unit,
            value,
          });
        }
        const next = { ...r, template, customPoints };
        return {
          ...next,
          readings: generateAutomatedReadings(next) || next.readings,
        };
      }),
    );
  };

  const handleInstrumentBlur = async (key, rawValue) => {
    const row = rowsRef.current.find((r) => r.key === key);
    if (!row) return;
    const typed = String(rawValue ?? row.instrumentId ?? "")
      .trim()
      .toUpperCase();
    if (!typed || typed === "U-" || typed === String(row.lastResolvedInstrumentId || "").trim().toUpperCase()) {
      return;
    }
    patchRow(key, {
      instrumentId: typed,
      instrumentLoading: true,
      instrumentError: null,
      masters: [],
      uucData: null,
      masterMatch: null,
    });
    try {
      const res = await axios.get(
        `/api/instruments/${encodeURIComponent(typed)}`,
      );
      const fetched = overrideFetchedUucTemplate(res.data);
      const template =
        fetched.template ||
        inferElectroTemplate(
          rowsRef.current.find((r) => r.key === key) || {},
          fetched,
        );
      patchRow(key, {
        instrumentId: fetched.id || typed,
        lastResolvedInstrumentId: fetched.id || typed,
        descriptionOfUUC: fetched.description,
        lastResolvedDescription: fetched.description,
        uucSubType: fetched.sub_type,
        unit: coercePressureUnit(fetched.unit) || fetched.unit || "",
        masterUnit: fetched.master_unit || "",
        discipline: fetched.discipline || "",
        method: fetched.method || "",
        procedure: fetched.procedure || "",
        parameter: fetched.parameter || "",
        ...(fetched.result_used
          ? {
              result_used: persistElectroResultUsed(
                template,
                fetched.result_used,
              ),
            }
          : template
            ? { result_used: template }
            : {}),
        template,
        ...(fetched.r14_min_unit ? { r14_min_unit: fetched.r14_min_unit } : {}),
        ...(fetched.r14_max_unit ? { r14_max_unit: fetched.r14_max_unit } : {}),
        cmc_unit: fetched.cmc_unit || "",
        authorized_range_min: fetched.authorized_range_min ?? null,
        authorized_range_max: fetched.authorized_range_max ?? null,
        instrumentLoading: false,
        instrumentError: null,
      });
      triggerMasterMatch(key, res.data.id, {
        rangeMin: row.rangeMin,
        rangeMax: row.rangeMax,
      });
    } catch {
      patchRow(key, {
        instrumentLoading: false,
        instrumentError: "Instrument not found",
        masters: [],
        uucData: null,
        masterMatch: null,
      });
    }
  };

  const triggerMasterMatch = async (key, uucId, range = {}, options = {}) => {
    const id = (uucId || "").trim();
    if (!id) {
      patchRow(key, {
        masters: [],
        uucData: null,
        masterMatch: null,
        masterError: null,
        masterLoading: false,
      });
      return;
    }
    const token = (matchTokensRef.current[key] || 0) + 1;
    matchTokensRef.current[key] = token;
    patchRow(key, { masterLoading: true, masterError: null });
    try {
      const res = await axios.get("/api/match-master", {
        params: {
          uuc_id: id,
          // Both ends are needed so a compound range resolves to a master per side.
          rangeMin: range.rangeMin || undefined,
          rangeMax: range.rangeMax || undefined,
        },
      });
      if (matchTokensRef.current[key] !== token) return;
      const { masters, uuc: rawUuc } = normalizeMatchPayload(res.data);
      const uuc = overrideFetchedUucTemplate(rawUuc || {});
      const cmc = pickCmc(uuc);
      const current = rowsRef.current.find((r) => r.key === key) || {};
      const template =
        uuc.template ||
        inferElectroTemplate(current, {
          ...uuc,
          result_used: uuc?.result_used,
        });
      patchRow(key, {
        masters,
        uucData: uuc,
        masterMatch: { masters, uuc },
        masterLoading: false,
        masterError: masters.length ? null : "No master mapping",
        template,
        ...(uuc?.result_used
          ? {
              result_used: persistElectroResultUsed(template, uuc.result_used),
            }
          : template
            ? { result_used: template }
            : {}),
        ...(uuc.r14_min_unit ? { r14_min_unit: uuc.r14_min_unit } : {}),
        ...(uuc.r14_max_unit ? { r14_max_unit: uuc.r14_max_unit } : {}),
        ...(uuc?.cmc_unit ? { cmc_unit: uuc.cmc_unit } : {}),
        ...(cmc !== "" ? { cmc } : {}),
        ...(uuc?.cmc_min != null && uuc.cmc_min !== "" ? { cmc_min: uuc.cmc_min } : {}),
        ...(uuc?.cmc_max != null && uuc.cmc_max !== "" ? { cmc_max: uuc.cmc_max } : {}),
        ...(Array.isArray(uuc?.cmc_bands) && uuc.cmc_bands.length
          ? { cmc_bands: uuc.cmc_bands }
          : {}),
        ...(uuc?.unit ? { unit: coercePressureUnit(uuc.unit) || uuc.unit } : {}),
        ...(uuc?.master_unit ? { masterUnit: uuc.master_unit } : {}),
        ...(uuc?.discipline ? { discipline: uuc.discipline } : {}),
        ...(uuc?.method ? { method: uuc.method } : {}),
        ...(uuc?.procedure ? { procedure: uuc.procedure } : {}),
        ...(uuc?.parameter ? { parameter: uuc.parameter } : {}),
        ...(uuc?.authorized_range_min != null
          ? { authorized_range_min: uuc.authorized_range_min }
          : {}),
        ...(uuc?.authorized_range_max != null
          ? { authorized_range_max: uuc.authorized_range_max }
          : {}),
        ...(uuc?.make ? { make: String(uuc.make) } : {}),
        ...(ACCURACY_OPTIONS.some((opt) => opt.value === String(uuc?.accuracy || "").trim())
          ? { accuracy: String(uuc.accuracy).trim() }
          : {}),
        ...(uuc?.resolution || uuc?.leastCount || uuc?.least_count
          ? {
              leastCount: String(
                uuc.resolution || uuc.leastCount || uuc.least_count,
              ),
            }
          : {}),
      });
    } catch (err) {
      if (matchTokensRef.current[key] !== token) return;
      patchRow(key, {
        masters: [],
        uucData: null,
        masterMatch: null,
        masterLoading: false,
        masterError: err.response?.status === 404 ? "No master mapping" : "Match lookup failed",
      });
    }
  };

  const handleRangeBlur = (key) => {
    regenerateRowReadings(key);
    const row = rowsRef.current.find((r) => r.key === key);
    if (!row?.instrumentId) return;
    triggerMasterMatch(
      key,
      row.instrumentId,
      { rangeMin: row.rangeMin, rangeMax: row.rangeMax },
      { enforceRange: false },
    );
  };

  const handleReadingInputsBlur = (key) => {
    regenerateRowReadings(key);
  };

  const copyFromRowNumber = (destKey, srcPos) => {
    const destRow = rows.find((r) => r.key === destKey);
    if (!destRow) return;

    if (!srcPos || srcPos < 1 || srcPos > rows.length) {
      patchRow(destKey, { copyError: "Invalid row #" });
      return;
    }
    const srcRow = rows[srcPos - 1];
    if (srcRow.key === destRow.key) {
      patchRow(destKey, { copyError: "Cannot copy from itself" });
      return;
    }

    setRows((prev) =>
      withTrailingEmpty(
        prev.map((r) =>
          r.key === destKey
            ? {
                ...r,
                instrumentId: srcRow.instrumentId,
                lastResolvedInstrumentId: srcRow.lastResolvedInstrumentId,
                descriptionOfUUC: srcRow.descriptionOfUUC,
                lastResolvedDescription: srcRow.lastResolvedDescription,
                uucSubType: srcRow.uucSubType,
                unit: srcRow.unit,
                masterUnit: srcRow.masterUnit,
                discipline: srcRow.discipline,
                method: srcRow.method,
                procedure: srcRow.procedure,
                parameter: srcRow.parameter,
                result_used: srcRow.result_used,
                template: srcRow.template,
                cmc: srcRow.cmc,
                cmc_unit: srcRow.cmc_unit,
                cmc_min: srcRow.cmc_min,
                cmc_max: srcRow.cmc_max,
                authorized_range_min: srcRow.authorized_range_min,
                authorized_range_max: srcRow.authorized_range_max,
                instrumentError: null,
                make: srcRow.make,
                rangeMin: srcRow.rangeMin,
                rangeMax: srcRow.rangeMax,
                rods: Array.isArray(srcRow.rods) ? srcRow.rods.map((rod) => ({ ...rod })) : [],
                feeler_points: Array.isArray(srcRow.feeler_points) ? srcRow.feeler_points.slice() : [],
                radius_points: Array.isArray(srcRow.radius_points) ? srcRow.radius_points.slice() : [],
                r12_unit: srcRow.r12_unit || srcRow.r12_range_unit || "V",
                r14_min_unit: srcRow.r14_min_unit || "MΩ",
                r14_max_unit: srcRow.r14_max_unit || "GΩ",
                test_voltage: srcRow.test_voltage || "@5000V DC",
                dcv_min: srcRow.dcv_min,
                dcv_max: srcRow.dcv_max,
                dcv_min_unit: srcRow.dcv_min_unit,
                dcv_max_unit: srcRow.dcv_max_unit,
                acv_min: srcRow.acv_min,
                acv_max: srcRow.acv_max,
                acv_min_unit: srcRow.acv_min_unit,
                acv_max_unit: srcRow.acv_max_unit,
                dca_min: srcRow.dca_min,
                dca_max: srcRow.dca_max,
                dca_min_unit: srcRow.dca_min_unit,
                dca_max_unit: srcRow.dca_max_unit,
                aca_min: srcRow.aca_min,
                aca_max: srcRow.aca_max,
                aca_min_unit: srcRow.aca_min_unit,
                aca_max_unit: srcRow.aca_max_unit,
                res_min: srcRow.res_min,
                res_max: srcRow.res_max,
                res_min_unit: srcRow.res_min_unit,
                res_max_unit: srcRow.res_max_unit,
                rhRangeMin: srcRow.rhRangeMin,
                rhRangeMax: srcRow.rhRangeMax,
                leastCount: srcRow.leastCount,
                range_min: srcRow.rangeMin ?? srcRow.range_min ?? "",
                range_max: srcRow.rangeMax ?? srcRow.range_max ?? "",
                range_min_len: srcRow.range_min_len ?? "",
                range_max_len: srcRow.range_max_len ?? "",
                lc: srcRow.leastCount ?? srcRow.lc ?? "",
                lc_len: srcRow.lc_len ?? "",
                accuracy: srcRow.accuracy,
                pointCount: srcRow.pointCount,
                idNo: srcRow.idNo,
                calDate: srcRow.calDate,
                dueDate: srcRow.dueDate,
                customPoints: preserveManualElectroCustomPoints(
                  srcRow.customPoints,
                ),
                readings:
                  generateAutomatedReadings(srcRow) ||
                  makeEmptyReadings(),
                masters: [],
                uucData: null,
                masterMatch: null,
                masterError: null,
                masterLoading: false,
                copyFromIndex: "",
                copyError: null,
              }
            : r,
        ),
      ),
    );
    triggerMasterMatch(destKey, srcRow.instrumentId, {
      rangeMin: srcRow.rangeMin,
      rangeMax: srcRow.rangeMax,
    });
  };

  const handleCopyRow = (destKey) => {
    const destRow = rows.find((r) => r.key === destKey);
    if (!destRow) return;
    copyFromRowNumber(destKey, parseInt(destRow.copyFromIndex, 10));
  };

  const handleCopyAbove = (destKey, srcSrNo) => {
    copyFromRowNumber(destKey, srcSrNo);
  };

  const handleAddRow = () => {
    setRows((prev) => withTrailingEmpty(prev));
  };

  const handleDeleteRow = (key) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.key !== key);
      return withTrailingEmpty(next);
    });
    delete matchTokensRef.current[key];
  };

  const loadStressTestRows = async () => {
    let list = [];
    try {
      const res = await axios.get("/api/instruments");
      list = Array.isArray(res.data) ? res.data : [];
    } catch {
      return { ok: false, error: "Could not load the instrument list." };
    }
    if (!list.length) {
      return { ok: false, error: "Instrument list not loaded yet!" };
    }
    const mapped = mapInstrumentsToMockRows(list).map((row) =>
      applyGeneratedReadings(
        {
          ...row,
          template: row.template || inferElectroTemplate(row),
        },
        { force: true },
      ),
    );
    setRows(withTrailingEmpty(mapped));
    return { ok: true, count: mapped.length };
  };

  const value = {
    company,
    setCompany,
    rows,
    patchRow,
    addElectroCustomPoint,
    handleInstrumentBlur,
    handleRangeBlur,
    handleReadingInputsBlur,
    handleCopyRow,
    handleCopyAbove,
    handleAddRow,
    handleDeleteRow,
    loadStressTestRows,
  };

  return (
    <BulkEntriesContext.Provider value={value}>
      <Outlet />
    </BulkEntriesContext.Provider>
  );
}
