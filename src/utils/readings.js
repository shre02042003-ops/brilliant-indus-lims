import { toBarFactor, normalizePressureUnit } from "./pressureUnits";
import {
  resultLayout,
  cmcForPoint,
  cmcNumericText,
  resolveCmcBands,
} from "./resultTable";

export { cmcForPoint, cmcNumericText, resolveCmcBands };

export const READING_ROW_COUNT = 11;

export const RANGE_OUTSIDE_MESSAGE =
  "Warning: This reading is outside the UUC range. Do you want to proceed?";

export const RANGE_LIMIT_MESSAGE =
  "Warning: This range exceeds the authorized limits for this UUC. Proceed?";

const OHM = "\u03A9";
const KILO_OHM = `k${OHM}`;
const MEGA_OHM = `M${OHM}`;
const GIGA_OHM = `G${OHM}`;

export const R14_UUC_ID_RE = /U-E09|U-E10|U-E11/i;
export const R15_UUC_ID_RE = /U-E12|U-E13/i;

const r14FixedPoints = [
  { val: 5, unit: MEGA_OHM, cmc: 5 },
  { val: 10, unit: MEGA_OHM, cmc: 5 },
  { val: 100, unit: MEGA_OHM, cmc: 5 },
  { val: 200, unit: MEGA_OHM, cmc: 5 },
  { val: 500, unit: MEGA_OHM, cmc: 5 },
  { val: 1, unit: GIGA_OHM, cmc: 5 },
  { val: 10, unit: GIGA_OHM, cmc: 7.5 },
  { val: 100, unit: GIGA_OHM, cmc: 10 },
  { val: 500, unit: GIGA_OHM, cmc: 10 },
  { val: 1000, unit: GIGA_OHM, cmc: 10 },
];

const unitScales = {
  DCV: ["mV", "V", "kV"],
  ACV: ["mV", "V", "kV"],
  DCA: ["mA", "A"],
  ACA: ["mA", "A"],
  RES: [`m${OHM}`, OHM, `k${OHM}`, `M${OHM}`, `G${OHM}`],
};

export const eTechBaseConfig = [
  {
    parameter: "DC VOLTAGE",
    tiers: [
      { unit: "mV", basePoints: [100, 500, 900] },
      { unit: "V", basePoints: [1, 5, 10] },
    ],
  },
  {
    parameter: "AC VOLTAGE (50 Hz)",
    tiers: [
      { unit: "mV", basePoints: [100, 500, 900] },
      { unit: "V", basePoints: [1, 5, 10] },
    ],
  },
  {
    parameter: "DC CURRENT",
    tiers: [
      { unit: "mA", basePoints: [10, 50, 90] },
      { unit: "A", basePoints: [1, 5, 10] },
    ],
  },
  {
    parameter: "AC CURRENT(50 Hz)",
    tiers: [
      { unit: "mA", basePoints: [10, 50, 90] },
      { unit: "A", basePoints: [1, 5, 10] },
    ],
  },
  {
    parameter: "RESISTANCE",
    tiers: [
      { unit: OHM, basePoints: [10, 50, 90] },
      { unit: `k${OHM}`, basePoints: [10, 50, 90] },
      { unit: `M${OHM}`, basePoints: [1, 5, 10] },
    ],
  },
];

export function eTechUnitsForParameter(parameter) {
  const group = eTechBaseConfig.find((item) => item.parameter === parameter);
  return group ? group.tiers.map((tier) => tier.unit) : [];
}

export function normalizeElectroUnit(unit) {
  return String(unit ?? "")
    .replace(/\u2126/g, OHM)
    .replace(/ohm/gi, OHM)
    .replace(/@/g, OHM);
}

export function isElectroBaselinePoint(point = {}) {
  const wantedParam = String(point.parameter || "").trim().toUpperCase();
  const wantedUnit = normalizeElectroUnit(point.unit);
  const value = Number(point.value);
  if (!wantedParam || !Number.isFinite(value)) return false;
  return eTechBaseConfig.some((group) => {
    if (String(group.parameter || "").trim().toUpperCase() !== wantedParam) {
      return false;
    }
    return group.tiers.some(
      (tier) =>
        normalizeElectroUnit(tier.unit) === wantedUnit &&
        (tier.basePoints || []).some((base) => Number(base) === value),
    );
  });
}

export function manualElectroCustomPoints(customPoints) {
  if (!Array.isArray(customPoints)) return [];
  return customPoints
    .filter(
      (point) =>
        Number.isFinite(Number(point?.value)) &&
        String(point?.parameter || "").trim() !== "",
    )
    .map((point) => ({
      parameter: point.parameter,
      unit: point.unit,
      value: Number(point.value),
    }));
}

function electroBaselinePointList() {
  return eTechBaseConfig.flatMap((group) =>
    group.tiers.flatMap((tier) =>
      (tier.basePoints || []).map((value) => ({
        parameter: group.parameter,
        unit: tier.unit,
        value: Number(value),
      })),
    ),
  );
}

function sameElectroCustomPoint(a, b) {
  return (
    String(a?.parameter || "").trim().toUpperCase() ===
      String(b?.parameter || "").trim().toUpperCase() &&
    normalizeElectroUnit(a?.unit) === normalizeElectroUnit(b?.unit) &&
    Number(a?.value) === Number(b?.value)
  );
}

export function preserveManualElectroCustomPoints(customPoints) {
  const manual = manualElectroCustomPoints(customPoints);
  const baseline = electroBaselinePointList();
  if (baseline.length === 0 || manual.length === 0) return manual;
  const looksHydrated = baseline.every((base) =>
    manual.some((point) => sameElectroCustomPoint(point, base)),
  );
  if (!looksHydrated) return manual;
  return manual.filter((point) => !isElectroBaselinePoint(point));
}

function getTechCmc(parameter, unit, value) {
  const p = String(parameter || "").toUpperCase();
  const u = normalizeElectroUnit(unit);
  const v = Number(value);

  if (p.includes("DC VOLTAGE")) {
    if (u === "mV") return 1.53;
    if (u === "V") return v <= 200 ? 0.12 : 0.16;
  }
  if (p.includes("AC VOLTAGE")) {
    if (u === "mV") return 1.14;
    if (u === "V") return v <= 200 ? 0.3 : 0.22;
  }
  if (p.includes("DC CURRENT")) {
    if (u === "mA") return 0.21;
    if (u === "A") return v <= 2 ? 0.23 : v <= 10 ? 2.07 : 1.0;
  }
  if (p.includes("AC CURRENT")) {
    if (u === "mA") return 0.5;
    if (u === "A") return v <= 2 ? 0.5 : v <= 10 ? 0.67 : 2.02;
  }
  if (p.includes("RESISTANCE")) {
    if (u === OHM) return 1.36;
    if (u === `k${OHM}`) return v <= 100 ? 1.36 : 1.63;
    if (u === `M${OHM}`) return v <= 10 ? 0.58 : 1.82;
  }
  return 0.26;
}

export function lcDecimals(lcString) {
  const s = String(lcString ?? "").trim();
  return s.includes(".") ? s.split(".")[1].length : 0;
}

export function leastCountDecimals(lc) {
  return lcDecimals(lc);
}

export function formatUucReading(value, lc) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return num.toFixed(lcDecimals(lc));
}

export function formatMasterReading(value, lc) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return num.toFixed(lcDecimals(lc) + 2);
}

export function isPressureGauge(row = {}) {
  const ids = [
    row.instrumentId,
    row.descriptionOfUUC,
    row.uuc_id,
    row.uucData?.remark,
    row.uucData?.id,
    row.uucData?.instrumentId,
  ];
  if (
    ids.some((id) => String(id || "").trim().toUpperCase().startsWith("U-P"))
  ) {
    return true;
  }
  return (
    resultLayout(row.result_used || row.uucData?.result_used) === "R-08"
  );
}

export function pressureUucDecimals(leastCount, row = {}) {
  const lc = lcDecimals(leastCount);
  if (isPressureGauge(row)) return Math.min(lc, 2);
  return lc;
}

export const POINT_COUNT_OPTIONS = [
  { value: 1, label: "1 Point" },
  { value: 5, label: "5 Points" },
  { value: 10, label: "10 Points" },
];

export function normalizePointCount(value) {
  const n = Number(value);
  if (n === 1) return 1;
  if (n === 5) return 5;
  return 10;
}

/** Contact / non-contact tachometers — absolute ±2 RPM, ignore accuracy %. */
export const UA_TACHOMETER_ID_RE = /U-A01|U-A02/i;

export function isUaTachometerRow(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => UA_TACHOMETER_ID_RE.test(String(value || "")));
}

export function isTachometerReadings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      String(readings.type || "").toUpperCase() === "TACHOMETER" &&
      Array.isArray(readings.points),
  );
}

export function hasReadings(readings) {
  if (isD20Readings(readings) || isD22Readings(readings) || isD31Readings(readings)) return true;
  if (Array.isArray(readings)) return readings.length > 0;
  if (readings && Array.isArray(readings.points) && readings.points.length > 0) {
    return true;
  }
  return false;
}

export function tachometerReadingOf(readings) {
  if (isTachometerReadings(readings)) {
    return { type: "TACHOMETER", points: readings.points || [] };
  }
  return { type: "TACHOMETER", points: [] };
}

/** Map generator strings straight to table rows — no extra toFixed. */
export function tachometerDisplayRows(readings) {
  return tachometerReadingOf(readings).points.map((pt) => {
    const set_rpm = String(pt?.set_rpm ?? "");
    const master_rpm = String(pt?.master_rpm ?? "");
    const error = String(pt?.error ?? "");
    const cmc = String(pt?.cmc ?? "");
    return {
      type: "TACHOMETER",
      set_rpm,
      master_rpm,
      error,
      cmc,
      pindKgCm2: set_rpm,
      mean: master_rpm,
      deviation: error,
      expandedUncertainty: cmc,
    };
  });
}

// A compound (vacuum + pressure) range must land on an absolute 0 point, so it
// is swept as two independent halves instead of one uniform run.
function uucPointValues(range_min, range_max, pointCount) {
  const isCompound = range_min < 0 && range_max > 0;
  const points = [];
  if (!isCompound) {
    const divisor = pointCount === 5 ? 4 : 10;
    const step = (range_max - range_min) / divisor;
    for (let i = 0; i <= divisor; i += 1) {
      points.push(range_min + step * i);
    }
    return points;
  }
  const vacDiv = pointCount === 5 ? 2 : 5;
  const posDiv = pointCount === 5 ? 2 : 5;
  const stepVac = Math.abs(range_min) / vacDiv;
  const stepPos = range_max / posDiv;
  for (let i = 0; i <= vacDiv + posDiv; i += 1) {
    if (i < vacDiv) points.push(range_min + stepVac * i);
    else if (i === vacDiv) points.push(0);
    else points.push(stepPos * (i - vacDiv));
  }
  return points;
}

const R09_RH_POINTS = [35, 60, 90];
const R09_TEMP_POINTS = [25, 30, 40];

export function isR09Row(row = {}) {
  return resultLayout(row.result_used || row.uucData?.result_used || row.template) === "R-09";
}

export function isThermoHygrometerRow(row = {}) {
  if (isR09Row(row)) return true;
  const ids = [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ];
  return ids.some((id) => String(id || "").toUpperCase().includes("U-T01"));
}

function rhRangeOf(row = {}) {
  return {
    min: row.rhRangeMin ?? row.rh_range_min ?? "",
    max: row.rhRangeMax ?? row.rh_range_max ?? "",
  };
}

export const ELECTRO_RANGE_FIELDS = [
  {
    minKey: "dcv_min",
    maxKey: "dcv_max",
    minUnitKey: "dcv_min_unit",
    maxUnitKey: "dcv_max_unit",
    label: "DCV",
    scaleKey: "DCV",
    parameter: "DC VOLTAGE",
    minPlaceholder: "DCV Min",
    maxPlaceholder: "DCV Max",
    units: unitScales.DCV,
    defaultUnit: "V",
  },
  {
    minKey: "acv_min",
    maxKey: "acv_max",
    minUnitKey: "acv_min_unit",
    maxUnitKey: "acv_max_unit",
    label: "ACV",
    scaleKey: "ACV",
    parameter: "AC VOLTAGE",
    r11Parameter: "AC VOLTAGE (50 Hz)",
    minPlaceholder: "ACV Min",
    maxPlaceholder: "ACV Max",
    units: unitScales.ACV,
    defaultUnit: "V",
  },
  {
    minKey: "dca_min",
    maxKey: "dca_max",
    minUnitKey: "dca_min_unit",
    maxUnitKey: "dca_max_unit",
    label: "DCA",
    scaleKey: "DCA",
    parameter: "DC CURRENT",
    minPlaceholder: "DCA Min",
    maxPlaceholder: "DCA Max",
    units: unitScales.DCA,
    defaultUnit: "A",
  },
  {
    minKey: "aca_min",
    maxKey: "aca_max",
    minUnitKey: "aca_min_unit",
    maxUnitKey: "aca_max_unit",
    label: "ACA",
    scaleKey: "ACA",
    parameter: "AC CURRENT",
    r11Parameter: "AC CURRENT(50 Hz)",
    minPlaceholder: "ACA Min",
    maxPlaceholder: "ACA Max",
    units: unitScales.ACA,
    defaultUnit: "A",
  },
  {
    minKey: "res_min",
    maxKey: "res_max",
    minUnitKey: "res_min_unit",
    maxUnitKey: "res_max_unit",
    label: "Res",
    scaleKey: "RES",
    parameter: "RESISTANCE",
    minPlaceholder: "Res Min",
    maxPlaceholder: "Res Max",
    units: unitScales.RES,
    defaultUnit: OHM,
  },
];

export function formatElectroRangeDisplay(row = {}) {
  const displayRange = [];
  for (const field of ELECTRO_RANGE_FIELDS) {
    const min = String(row[field.minKey] ?? "").trim();
    const max = String(row[field.maxKey] ?? "").trim();
    if (min || max) {
      const minUnit = normalizeElectroUnit(
        row[field.minUnitKey] || field.defaultUnit || "",
      );
      const maxUnit = normalizeElectroUnit(
        row[field.maxUnitKey] || field.defaultUnit || "",
      );
      displayRange.push(
        `${field.label}: ${min} ${minUnit} to ${max} ${maxUnit}`,
      );
    }
  }
  if (displayRange.length > 0) return displayRange.join(", ");
  const fallbackMin = row.rangeMin ?? row.range_min ?? "";
  const fallbackMax = row.rangeMax ?? row.range_max ?? "";
  if (!String(fallbackMin).trim() && !String(fallbackMax).trim()) return "";
  return `${fallbackMin} - ${fallbackMax}`;
}

export function formatUucRangeDisplay(row = {}, unit = "") {
  if (isR15Row(row) || resultLayout(row.template) === "R-15") {
    const tMin = row.rangeMin ?? row.range_min ?? "";
    const tMax = row.rangeMax ?? row.range_max ?? "";
    return `${tMin} to ${tMax} min`.replace(/\s+/g, " ").trim();
  }
  if (isR14Row(row) || resultLayout(row.template) === "R-14") {
    const tMin = row.rangeMin ?? row.range_min ?? "";
    const tMax = row.rangeMax ?? row.range_max ?? "";
    const units = r14UnitDefaults(row);
    const minUnit = row.r14_min_unit || units.r14_min_unit;
    const maxUnit = row.r14_max_unit || units.r14_max_unit;
    const voltage = String(row.test_voltage || "").trim();
    const range = `${tMin} ${minUnit} to ${tMax} ${maxUnit}`
      .replace(/\s+/g, " ")
      .trim();
    return voltage ? `${range} ${voltage}` : range;
  }
  if (isR12Row(row) || resultLayout(row.template) === "R-12") {
    const tMin = row.rangeMin ?? row.range_min ?? "";
    const tMax = row.rangeMax ?? row.range_max ?? "";
    const unitText = String(row.r12_unit || row.r12_range_unit || unit || "").trim();
    return unitText ? `${tMin} to ${tMax} ${unitText}` : `${tMin} to ${tMax}`;
  }
  if (isElectroTechnicalRow(row)) {
    return formatElectroRangeDisplay(row);
  }
  if (isThermoHygrometerRow(row) || isR09Row(row)) {
    const rh = rhRangeOf(row);
    const tMin = row.rangeMin ?? row.range_min ?? "";
    const tMax = row.rangeMax ?? row.range_max ?? "";
    return `${tMin} to ${tMax} °C  &  ${rh.min} to ${rh.max} %RH`;
  }
  const tMin = row.rangeMin ?? row.range_min ?? "";
  const tMax = row.rangeMax ?? row.range_max ?? "";
  const unitText = String(unit || "").trim();
  return unitText ? `${tMin} – ${tMax} ${unitText}` : `${tMin} – ${tMax}`;
}

export const VERNIER_ID_RE = /U-D03|U-D04/i;

export function isVernierRow(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => VERNIER_ID_RE.test(String(value || "")));
}

export function isVernierReadings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      String(readings.type || "").toUpperCase() === "VERNIER" &&
      Array.isArray(readings.points),
  );
}

export function vernierReadingOf(readings) {
  if (isVernierReadings(readings)) {
    return { type: "VERNIER", points: readings.points || [] };
  }
  return { type: "VERNIER", points: [] };
}

/** Preformatted slip-gauge strings for the external/internal jaw table. */
export function vernierDisplayRows(readings) {
  return vernierReadingOf(readings).points.map((pt) => {
    const standard = String(pt?.standard ?? "");
    const uucExt = String(pt?.uuc_ext ?? "");
    const uucInt = String(pt?.uuc_int ?? "");
    const errorExt = String(pt?.error_ext ?? "");
    const errorInt = String(pt?.error_int ?? "");
    const cmc = String(pt?.cmc ?? "");
    return {
      type: "VERNIER",
      standard,
      uuc_ext: uucExt,
      uuc_int: uucInt,
      error_ext: errorExt,
      error_int: errorInt,
      cmc,
      pindKgCm2: standard,
      m1: uucExt,
      m2: uucInt,
      errorExt,
      errorInt,
      expandedUncertainty: cmc,
    };
  });
}

const VERNIER_LADDER = [0, 20.2, 50.4, 80.6, 110.8, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600];

function generateVernierReadings(row = {}) {
  const max = Number(row.rangeMax ?? row.range_max);
  if (!Number.isFinite(max)) return { type: "VERNIER", points: [] };
  const lcStr = String(row.lc || row.leastCount || row.resolution || "0.01");
  const lcNum = Number(lcStr);
  const lcStep = Number.isFinite(lcNum) ? lcNum : 0.01;
  const decimals = lcStr.includes(".") ? lcStr.split(".")[1].length : 2;

  let validPoints = VERNIER_LADDER.filter((point) => point <= max + 1e-9);
  if (validPoints.length > 10) {
    const end = validPoints[validPoints.length - 1];
    const reduced = [];
    validPoints.forEach((point, index) => {
      if (point === 0 || point === max || point === end || index % 2 !== 0) {
        if (reduced.length < 10) reduced.push(point);
      }
    });
    if (!reduced.includes(end)) reduced[reduced.length - 1] = end;
    if (!reduced.includes(0)) reduced[0] = 0;
    validPoints = [...new Set(reduced)].sort((a, b) => a - b);
  }

  const numErrorPoints = Math.random() > 0.5 ? 2 : 3;
  const errorIndices = [];
  while (
    errorIndices.length < numErrorPoints &&
    errorIndices.length < validPoints.length - 1
  ) {
    const randIdx = Math.floor(Math.random() * (validPoints.length - 1)) + 1;
    if (!errorIndices.includes(randIdx)) errorIndices.push(randIdx);
  }

  const bands = resolveCmcBands(row.cmc_bands, row.uucData, row);
  const cmcFallback = Number(
    cmcNumericText(row.cmc_value || row.cmc || pickCmc(row.uucData) || 13.5) || 13.5,
  );
  const generatedPoints = validPoints.map((standardVal, idx) => {
    let extError = 0;
    let intError = 0;
    if (errorIndices.includes(idx)) {
      extError = (Math.random() > 0.5 ? 1 : -1) * (2 * lcStep);
      intError = (Math.random() > 0.5 ? 1 : -1) * (2 * lcStep);
    }
    const bandText = bands.length
      ? cmcForPoint(standardVal, bands, cmcFallback)
      : "";
    const cmcNum = Number(cmcNumericText(bandText));
    const cmc = Number.isFinite(cmcNum)
      ? cmcNum.toFixed(1)
      : Number.isFinite(cmcFallback)
        ? cmcFallback.toFixed(1)
        : "13.5";
    return {
      standard: Number(standardVal).toFixed(3),
      uuc_ext: Number(standardVal + extError).toFixed(decimals),
      uuc_int: Number(standardVal + intError).toFixed(decimals),
      error_ext: Number(extError).toFixed(decimals),
      error_int: Number(intError).toFixed(decimals),
      cmc,
    };
  });

  return { type: "VERNIER", points: generatedPoints };
}

export const DIMENSIONAL_UM_ID_RE = /U-D05|U-D06/i;

export function isDimensionalUmRow(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => DIMENSIONAL_UM_ID_RE.test(String(value || "")));
}

export function isDimensionalUmReadings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      String(readings.type || "").toUpperCase() === "DIMENSIONAL_UM" &&
      Array.isArray(readings.points),
  );
}

export function dimensionalUmDisplayRows(readings) {
  const points = isDimensionalUmReadings(readings) ? readings.points : [];
  return points.map((pt) => ({
    type: "DIMENSIONAL_UM",
    standard: String(pt?.standard ?? ""),
    uuc: String(pt?.uuc ?? ""),
    error: String(pt?.error ?? ""),
    cmc: String(pt?.cmc ?? ""),
  }));
}

const DIMENSIONAL_UM_LADDER = [10, 25, 51, 126, 251, 502, 715, 920, 1500];

function generateDimensionalUmReadings(row = {}) {
  const minRaw = Number(row.rangeMin ?? row.range_min);
  const maxRaw = Number(row.rangeMax ?? row.range_max);
  const min_um = Number.isFinite(minRaw) ? minRaw : 10;
  const max_um = Number.isFinite(maxRaw) ? maxRaw : 1500;
  const lcRaw = Number(row.lc || row.leastCount || row.resolution || 1);
  const lc_um = Number.isFinite(lcRaw) ? lcRaw : 1;
  const lc_um_str = String(row.lc || row.leastCount || row.resolution || lc_um);
  const lcDecimals = lc_um_str.includes(".") ? lc_um_str.split(".")[1].length : 0;

  const validPoints = DIMENSIONAL_UM_LADDER.filter(
    (point) => point + 1e-9 >= min_um && point <= max_um + 1e-9,
  );
  const errorIndices = [];
  const numErrorPoints = Math.min(Math.random() > 0.5 ? 3 : 4, validPoints.length);
  while (errorIndices.length < numErrorPoints) {
    const randIdx = Math.floor(Math.random() * validPoints.length);
    if (!errorIndices.includes(randIdx)) errorIndices.push(randIdx);
  }

  const bands = resolveCmcBands(row.cmc_bands, row.uucData, row);
  const cmcFallback = Number(
    cmcNumericText(row.cmc_value || row.cmc || pickCmc(row.uucData) || 1.4) || 1.4,
  );
  const generatedPoints = validPoints.map((standardVal, idx) => {
    let error = 0;
    if (errorIndices.includes(idx)) {
      error = (Math.random() > 0.5 ? 1 : -1) * lc_um;
    }
    const bandText = bands.length ? cmcForPoint(standardVal, bands, cmcFallback) : "";
    const cmcNum = Number(cmcNumericText(bandText));
    const cmc = Number.isFinite(cmcNum)
      ? cmcNum.toFixed(1)
      : Number.isFinite(cmcFallback)
        ? cmcFallback.toFixed(1)
        : "1.4";
    return {
      standard: Number(standardVal).toFixed(lcDecimals),
      uuc: Number(standardVal + error).toFixed(lcDecimals),
      error: Number(error).toFixed(lcDecimals),
      cmc,
    };
  });

  return { type: "DIMENSIONAL_UM", points: generatedPoints };
}

export const ANGULAR_ID_RE = /U-D07|U-D08/i;

export function isAngularRow(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => ANGULAR_ID_RE.test(String(value || "")));
}

export function isAngularReadings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      String(readings.type || "").toUpperCase() === "ANGULAR_DEG_MIN" &&
      Array.isArray(readings.points),
  );
}

export function angularDisplayRows(readings) {
  if (!isAngularReadings(readings)) {
    return { description: "", points: [] };
  }
  return {
    description:
      readings.description || "Angular Measurement of Protractor Head",
    points: readings.points.map((pt) => ({
      type: "ANGULAR_DEG_MIN",
      uuc_deg: pt?.uuc_deg ?? "",
      uuc_min: pt?.uuc_min ?? "",
      master_deg: pt?.master_deg ?? "",
      master_min: pt?.master_min ?? "",
      error_deg: pt?.error_deg ?? "",
      error_min: pt?.error_min ?? "",
      cmc: pt?.cmc || pt?.uncertainty || "",
      uncertainty: pt?.uncertainty || pt?.cmc || "",
    })),
  };
}

const ANGULAR_FIXED_POINTS = [30, 45, 60, 90];

function generateAngularReadings(row = {}) {
  const errorIndices = [];
  const numErrorPoints = Math.random() > 0.5 ? 2 : 3;
  while (errorIndices.length < numErrorPoints) {
    const randIdx = Math.floor(Math.random() * ANGULAR_FIXED_POINTS.length);
    if (!errorIndices.includes(randIdx)) errorIndices.push(randIdx);
  }

  const rawCmc = row.cmc_value || row.cmc || pickCmc(row.uucData);
  const cmcNum = Number(rawCmc);
  const finalCmc = (Number.isFinite(cmcNum) && cmcNum !== 0 ? cmcNum : 20).toFixed(4);
  const generatedPoints = ANGULAR_FIXED_POINTS.map((point, idx) => {
    let errorTotalMin = 0;
    if (errorIndices.includes(idx)) {
      errorTotalMin = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 5) + 1);
    }
    const uucTotalMin = point * 60;
    const masterTotalMin = uucTotalMin + errorTotalMin;
    const masterDeg = Math.floor(masterTotalMin / 60);
    const masterMin = masterTotalMin % 60;
    const errorDeg = Math.trunc(errorTotalMin / 60);
    const errorMin = errorTotalMin % 60;
    return {
      uuc_deg: point,
      uuc_min: 0,
      master_deg: masterDeg,
      master_min: masterMin,
      error_deg: errorDeg,
      error_min: errorMin,
      cmc: finalCmc,
      uncertainty: finalCmc,
    };
  });

  return {
    type: "ANGULAR_DEG_MIN",
    points: generatedPoints,
    description:
      row.description ||
      row.descriptionOfUUC ||
      row.parameter ||
      "Angular Measurement of Protractor Head",
  };
}

export const D09_ID_RE = /U-D09|U-D10/i;

export function isD09Row(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => D09_ID_RE.test(String(value || "")));
}

export function isD09Readings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      ["DIMENSIONAL_D09", "CUBE_MOULD"].includes(
        String(readings.type || "").toUpperCase(),
      ) &&
      Array.isArray(readings.points),
  );
}

export function d09DisplayRows(readings) {
  const points = isD09Readings(readings) ? readings.points : [];
  return points.map((pt) => ({
    type: "CUBE_MOULD",
    parameter: String(pt?.parameter ?? ""),
    standard: String(pt?.standard ?? ""),
    tolerance: String(pt?.tolerance ?? "0.20"),
    uuc: String(pt?.uuc ?? pt?.measured ?? ""),
    error: String(pt?.error ?? ""),
    cmc: String(pt?.cmc ?? pt?.uncertainty ?? ""),
  }));
}

const CUBE_MOULD_PARAMETERS = [
  "Internal Width Between Opposite Face1",
  "Internal Width Between Opposite Face2",
  "Internal Height",
];

function generateD09Readings(row = {}) {
  const maxRaw = Number(row.rangeMax ?? row.range_max);
  const standardVal = Number.isFinite(maxRaw) ? maxRaw : 150;
  const lcText = String(row.lc || row.leastCount || row.resolution || "0.01");
  const lcNum = Number(lcText);
  const lc = Number.isFinite(lcNum) && lcNum > 0 ? lcNum : 0.01;
  const maxErrorSteps = Math.floor(0.09 / lc);
  const rawCmc = row.cmc_value || row.cmc || pickCmc(row.uucData);
  const cmcNum = Number(rawCmc);
  const cmc = (Number.isFinite(cmcNum) && cmcNum !== 0 ? cmcNum : 30).toFixed(4);

  const points = CUBE_MOULD_PARAMETERS.map((parameter) => {
    let error = 0;
    if (maxErrorSteps > 0) {
      const errorSteps = Math.floor(Math.random() * (maxErrorSteps + 1));
      const signed = errorSteps * lc * (Math.random() > 0.5 ? 1 : -1);
      error = Number(signed.toFixed(2));
    }
    return {
      parameter,
      standard: Number(standardVal).toFixed(2),
      tolerance: "0.20",
      uuc: Number(standardVal + error).toFixed(2),
      error: Number(error).toFixed(2),
      cmc,
      uncertainty: cmc,
    };
  });

  return { type: "CUBE_MOULD", points };
}

export const ROD_ID_RE = /U-D12/i;

export function isRodRow(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => ROD_ID_RE.test(String(value || "")));
}

export function isRodReadings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      String(readings.type || "").toUpperCase() === "TWO_COLUMN_RODS" &&
      Array.isArray(readings.points),
  );
}

export function rodDisplayRows(readings) {
  const points = isRodReadings(readings) ? readings.points : [];
  return points.map((pt) => ({
    type: "TWO_COLUMN_RODS",
    standard: String(pt?.standard ?? ""),
    uuc: String(pt?.uuc ?? ""),
    error: String(pt?.error ?? ""),
    cmc: String(pt?.cmc ?? "7.12"),
  }));
}

const ROD_BASE_GAUGES = [
  0, 2.5, 5.1, 7.7, 10.3, 12.9, 15, 17.6, 20.2, 22.8, 25,
  50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300,
];

function generateRodReadings(row = {}) {
  const lcText = String(row.lc || row.leastCount || row.resolution || "0.001");
  const lcNum = Number(lcText);
  const lc = Number.isFinite(lcNum) && lcNum > 0 ? lcNum : 0.001;
  const lcDecimals = lcText.includes(".") ? lcText.split(".")[1].length : 3;
  const fallbackMin = Number(row.rangeMin ?? row.range_min ?? 0);
  const fallbackMax = Number(row.rangeMax ?? row.range_max ?? 25);
  const rods =
    Array.isArray(row.rods) && row.rods.length > 0
      ? row.rods
      : [{ min: Number.isFinite(fallbackMin) ? fallbackMin : 0, max: Number.isFinite(fallbackMax) ? fallbackMax : 25 }];

  const seen = new Set();
  const validPoints = [];
  rods.forEach((rod) => {
    const min = Number(rod.min);
    const max = Number(rod.max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return;
    ROD_BASE_GAUGES.forEach((gauge) => {
      const standardVal = Number((min + gauge).toFixed(4));
      if (standardVal <= max + 1e-9 && !seen.has(standardVal)) {
        seen.add(standardVal);
        validPoints.push(standardVal);
      }
    });
  });
  validPoints.sort((a, b) => a - b);

  const numErrorPoints = Math.min(Math.random() > 0.5 ? 5 : 6, validPoints.length);
  const errorIndices = [];
  while (errorIndices.length < numErrorPoints) {
    const randIdx = Math.floor(Math.random() * validPoints.length);
    if (!errorIndices.includes(randIdx)) errorIndices.push(randIdx);
  }

  const points = validPoints.map((standardVal, idx) => {
    const error = errorIndices.includes(idx) ? lc * (Math.random() > 0.5 ? 1 : -1) : 0;
    return {
      standard: Number(standardVal).toFixed(3),
      uuc: Number(standardVal + error).toFixed(lcDecimals),
      error: Number(error).toFixed(lcDecimals),
      cmc: "7.12",
    };
  });

  return { type: "TWO_COLUMN_RODS", points };
}

export function isR10Row(row = {}) {
  return resultLayout(row.result_used || row.uucData?.result_used || row.template) === "R-10";
}

function generateR10Readings(row = {}) {
  const minText = String(row.rangeMin ?? "").trim();
  const maxText = String(row.rangeMax ?? "").trim();
  const lcText =
    String(row.leastCount ?? row.resolution ?? "").trim() || "0.1";
  const accText = String(row.accuracy ?? "").trim() || "2.0";
  if (!minText || !maxText) return null;
  const range_min = Number(minText);
  const range_max = Number(maxText);
  const accuracy = Number(accText);
  if (
    !Number.isFinite(range_min) ||
    !Number.isFinite(range_max) ||
    !Number.isFinite(accuracy)
  ) {
    return null;
  }
  const pointCount = normalizePointCount(row.pointCount);
  const divisor = pointCount === 5 ? 4 : 10;
  const step = (range_max - range_min) / divisor;
  const uucDecimals = lcDecimals(lcText);
  const refDecimals = uucDecimals + 2;
  const readings = [];
  for (let i = 0; i <= divisor; i += 1) {
    const nominal = range_min + step * i;
    const uucVal = nominal + (Math.random() * accuracy - accuracy / 2);
    const refVal = nominal + (Math.random() * accuracy - accuracy / 2);
    readings.push({
      nominal: Number(nominal).toFixed(0),
      uuc: uucVal.toFixed(uucDecimals),
      standard: refVal.toFixed(refDecimals),
    });
  }
  return readings;
}

export function isR10Readings(readings) {
  return (
    Array.isArray(readings) &&
    readings.some(
      (reading) =>
        String(reading?.nominal || "").trim() !== "" &&
        String(reading?.uuc || "").trim() !== "" &&
        String(reading?.standard || "").trim() !== "",
    )
  );
}

function electroLayoutOf(row = {}) {
  const fromTemplate = resultLayout(row.template);
  if (
    fromTemplate === "E01" ||
    fromTemplate === "E02" ||
    fromTemplate === "R-11" ||
    fromTemplate === "R-12" ||
    fromTemplate === "R-14" ||
    fromTemplate === "R-15"
  ) {
    return fromTemplate;
  }
  return resultLayout(
    row.result_used || row.uucData?.result_used || row.template,
  );
}

export function electroTemplateCode(value) {
  const layout = resultLayout(value);
  if (
    layout === "E01" ||
    layout === "E02" ||
    layout === "R-11" ||
    layout === "R-12" ||
    layout === "R-14" ||
    layout === "R-15"
  ) {
    return layout;
  }
  return "";
}

export const R12_UNITS = ["mV", "V", "mA", "A"];
export const R14_UNITS = [MEGA_OHM, GIGA_OHM];
export const R14_EARTH_UNITS = [MEGA_OHM, GIGA_OHM];
export const R14_INSULATION_UNITS = [MEGA_OHM, GIGA_OHM];

function electroIdentityTexts(row = {}, incoming = {}) {
  return [
    incoming.id,
    incoming.uuc_id,
    incoming.remark,
    incoming.instrumentId,
    incoming.description,
    incoming.descriptionOfUUC,
    row.uuc_id,
    row.instrumentId,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.uuc_id,
    row.uucData?.remark,
    row.uucData?.description,
  ];
}

export function matchesR14UucId(...values) {
  return values.some((value) => R14_UUC_ID_RE.test(String(value || "")));
}

export function isR14Instrument(row = {}, incoming = {}) {
  return electroIdentityTexts(row, incoming).some((id) => {
    const text = String(id || "");
    return (
      R14_UUC_ID_RE.test(text) ||
      /insulation\s*tester|megohm|earth\s*resistance/i.test(text)
    );
  });
}

export function r14UnitDefaults(row = {}, incoming = {}) {
  return { r14_min_unit: MEGA_OHM, r14_max_unit: GIGA_OHM };
}

export function r14UnitsForRow(row = {}) {
  return R14_INSULATION_UNITS;
}

export function overrideFetchedUucAsR14(fetchedData = {}) {
  const next = { ...fetchedData };
  const id = next.uuc_id || next.id || next.instrumentId || next.remark || "";
  if (R14_UUC_ID_RE.test(String(id)) || isR14Instrument({}, next)) {
    next.template = "R-14";
    next.result_used = "R-14";
    Object.assign(next, r14UnitDefaults({}, next));
  }
  return next;
}

export function matchesR15UucId(...values) {
  return values.some((value) => R15_UUC_ID_RE.test(String(value || "")));
}

export function isR15Instrument(row = {}, incoming = {}) {
  return electroIdentityTexts(row, incoming).some((id) => {
    const text = String(id || "");
    return (
      R15_UUC_ID_RE.test(text) || /stop\s*watch|\btimer\b/i.test(text)
    );
  });
}

export function overrideFetchedUucAsR15(fetchedData = {}) {
  const next = { ...fetchedData };
  const id = next.uuc_id || next.id || next.instrumentId || next.remark || "";
  if (R15_UUC_ID_RE.test(String(id)) || isR15Instrument({}, next)) {
    next.template = "R-15";
    next.result_used = "R-15";
  }
  return next;
}

export function overrideFetchedUucTemplate(fetchedData = {}) {
  return overrideFetchedUucAsR15(overrideFetchedUucAsR14(fetchedData));
}

export function inferElectroTemplate(row = {}, incoming = {}) {
  if (isR15Instrument(row, incoming)) return "R-15";
  if (isR14Instrument(row, incoming)) return "R-14";
  const ids = electroIdentityTexts(row, incoming);
  if (ids.some((id) => /U-E01/i.test(String(id || "")))) return "E01";
  if (ids.some((id) => /U-E02/i.test(String(id || "")))) return "E02";
  if (ids.some((id) => /U-E03|U-E04|U-E05|U-E06/i.test(String(id || "")))) {
    return "R-12";
  }
  const current = electroTemplateCode(row.template);
  const next = electroTemplateCode(
    incoming.template ||
      incoming.result_used ||
      row.result_used ||
      incoming.uuc?.result_used ||
      row.uucData?.result_used,
  );
  if (
    current === "E01" ||
    current === "E02" ||
    current === "R-12" ||
    current === "R-14" ||
    current === "R-15"
  ) {
    if (next === "R-11") return current;
    if ((current === "R-14" || current === "R-15") && next === "R-12") {
      return current;
    }
    return next || current;
  }
  if (next) return next;
  return current;
}

export function persistElectroResultUsed(template, incomingResultUsed) {
  const code = electroTemplateCode(template);
  const next = electroTemplateCode(incomingResultUsed);
  if (
    (code === "E01" ||
      code === "E02" ||
      code === "R-12" ||
      code === "R-14" ||
      code === "R-15") &&
    next === "R-11"
  ) {
    return code;
  }
  if (
    (code === "R-14" || code === "R-15") &&
    (next === "R-12" || !incomingResultUsed)
  ) {
    return code;
  }
  if (code === "R-12" && !incomingResultUsed) return "R-12";
  return incomingResultUsed || code || "";
}

export function isR11Row(row = {}) {
  return electroLayoutOf(row) === "R-11";
}

export function isE01Row(row = {}) {
  return electroLayoutOf(row) === "E01";
}

export function isE02Row(row = {}) {
  return electroLayoutOf(row) === "E02";
}

export function isR15Row(row = {}) {
  if (isR15Instrument(row)) return true;
  if (
    matchesR15UucId(
      row.uuc_id,
      row.instrumentId,
      row.descriptionOfUUC,
      row.uucData?.id,
    )
  ) {
    return true;
  }
  if (electroLayoutOf(row) === "R-15") return true;
  return resultLayout(row.result_used || row.uucData?.result_used || row.template) === "R-15";
}

export function isR14Row(row = {}) {
  if (isR14Instrument(row)) return true;
  if (
    matchesR14UucId(
      row.uuc_id,
      row.instrumentId,
      row.descriptionOfUUC,
      row.uucData?.id,
    )
  ) {
    return true;
  }
  if (electroLayoutOf(row) === "R-14") return true;
  return resultLayout(row.result_used || row.uucData?.result_used || row.template) === "R-14";
}

export function isR12Row(row = {}) {
  if (isR14Row(row) || isR14Instrument(row) || isR15Row(row) || isR15Instrument(row)) {
    return false;
  }
  if (electroLayoutOf(row) === "R-12") return true;
  if (resultLayout(row.result_used || row.uucData?.result_used) === "R-12") {
    return true;
  }
  const ids = [
    row.uuc_id,
    row.instrumentId,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ];
  return ids.some((id) => /U-E03|U-E04|U-E05|U-E06/i.test(String(id || "")));
}

export function isElectroTechnicalRow(row = {}) {
  const layout = electroLayoutOf(row);
  if (layout === "R-11" || layout === "E01" || layout === "E02") return true;
  const template = String(row.template || "").trim().toUpperCase();
  if (["E01", "E02", "R-11", "E-01", "E-02"].includes(template)) return true;
  const ids = [
    row.uuc_id,
    row.instrumentId,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ];
  return ids.some((id) => /U-E01|U-E02/i.test(String(id || "")));
}

export function isR15Readings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      Array.isArray(readings.points) &&
      readings.points.some(
        (point) =>
          point &&
          (point.min != null || point.uucSec != null || point.refSec != null),
      ),
  );
}

export function r15ReadingOf(readings) {
  if (isR15Readings(readings)) {
    return {
      points: Array.isArray(readings.points) ? readings.points : [],
    };
  }
  return { points: [] };
}

export function isR14Readings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      Array.isArray(readings.tiers),
  );
}

export function r14ReadingOf(readings) {
  if (isR14Readings(readings)) {
    return {
      test_voltage: readings.test_voltage || "@5000V DC",
      parameter: readings.parameter || "RESISTANCE",
      tiers: (Array.isArray(readings.tiers) ? readings.tiers : []).map(
        (tier) => ({
          ...tier,
          unit: String(tier?.unit || "")
            .replace(/\u00A9/g, "\u03A9")
            .replace(/©/g, "\u03A9")
            .replace(/\u2126/g, "\u03A9"),
        }),
      ),
    };
  }
  return { test_voltage: "@5000V DC", parameter: "RESISTANCE", tiers: [] };
}

export function isR12Readings(readings) {
  if (isR15Readings(readings) || isTachometerReadings(readings) || isVernierReadings(readings) || isDimensionalUmReadings(readings) || isAngularReadings(readings) || isD09Readings(readings) || isRodReadings(readings) || isD17Readings(readings) || isTapeReadings(readings) || isD25Readings(readings) || isUtgReadings(readings) || isD42Readings(readings) || isD18Readings(readings) || isD19Readings(readings) || isD20Readings(readings) || isD21Readings(readings) || isD22Readings(readings) || isD31Readings(readings) || isD32Readings(readings)) {
    return false;
  }
  if (readings && !Array.isArray(readings) && Array.isArray(readings.points)) {
    return readings.points.some(
      (point) =>
        point &&
        (point.uuc != null ||
          point.std != null ||
          point.uucReading != null ||
          point.refStandard != null),
    );
  }
  return (
    Array.isArray(readings) &&
    readings.some(
      (group) =>
        Array.isArray(group?.points) &&
        group.points.some(
          (point) =>
            point &&
            (point.range != null || point.errorPct != null) &&
            (point.std != null ||
              point.uuc != null ||
              point.refStandard != null ||
              point.uucReading != null),
        ),
    )
  );
}

export function r12ReadingOf(readings) {
  if (readings && !Array.isArray(readings) && Array.isArray(readings.points)) {
    return readings;
  }
  if (isR12Readings(readings) && Array.isArray(readings)) {
    const first = readings[0] || {};
    return {
      parameter: first.parameter || "",
      unit: first.unit || "",
      rangeMax: first.rangeMax ?? first.points?.[0]?.range ?? "",
      points: readings.flatMap((group) => group?.points || []),
    };
  }
  return { parameter: "", unit: "", rangeMax: "", points: [] };
}

export function isElectroReadings(readings) {
  if (isR12Readings(readings) || isR14Readings(readings) || isR15Readings(readings) || isTachometerReadings(readings)) {
    return false;
  }
  return (
    Array.isArray(readings) &&
    readings.some((group) => {
      if (!group || String(group.parameter || "").trim() === "") return false;
      if (Array.isArray(group.tiers)) {
        return group.tiers.some(
          (tier) => Array.isArray(tier?.points) && tier.points.length > 0,
        );
      }
      if (Array.isArray(group.points) && group.points.length > 0) return true;
      return (
        Array.isArray(group.ranges) &&
        group.ranges.some(
          (range) => Array.isArray(range?.points) && range.points.length > 0,
        )
      );
    })
  );
}

function formatElectroNumber(value, decimals) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  const places = Math.max(0, Number(decimals) || 0);
  return num.toFixed(places);
}

function electroDecimals(unit) {
  const normalized = normalizeElectroUnit(unit);
  if (normalized === "mV" || normalized === "mA" || normalized === `m${OHM}`) {
    return 2;
  }
  if (normalized === "kV" || normalized === `G${OHM}`) return 4;
  if (normalized === `k${OHM}`) return 3;
  return 4;
}

function electroCmcOf(row = {}) {
  return String(
    row.cmc_value ||
      row.cmcValue ||
      pickCmc(row.uucData) ||
      row.cmc ||
      row.cmc_min ||
      "",
  ).trim();
}

function electroAccuracyOf(row = {}) {
  const acc = Number(row.accuracy);
  return Number.isFinite(acc) ? acc : 2.0;
}

function mapElectroPoint(point = {}) {
  const cal = point.cal ?? point.std ?? point.stdVal ?? "";
  const std = point.std ?? point.stdVal ?? cal;
  const uuc = point.uuc ?? point.uucVal ?? "";
  return {
    cal,
    calPoint: cal,
    std,
    uuc,
    dev: point.dev ?? point.deviation ?? "",
    cmc: point.cmc ?? point.pointCmc ?? "",
  };
}

function electroLcDecimals(row = {}) {
  return lcDecimals(row.leastCount || row.lc || row.resolution || "0.01");
}

function generateE01E02Readings(row = {}) {
  const accuracy = electroAccuracyOf(row);
  const lcDec = electroLcDecimals(row);
  const cloned = eTechBaseConfig.map((group) => ({
    parameter: group.parameter,
    tiers: group.tiers.map((tier) => ({
      unit: tier.unit,
      basePoints: [...tier.basePoints],
    })),
  }));
  // Read a snapshot only. Never push baseline points into row.customPoints.
  const customPointsSnapshot = manualElectroCustomPoints(row.customPoints);
  for (const custom of customPointsSnapshot) {
    const value = Number(custom?.value);
    if (!Number.isFinite(value)) continue;
    const wantedParam = String(custom.parameter || "").trim();
    const wantedUnit = normalizeElectroUnit(custom.unit);
    let group = cloned.find(
      (item) =>
        String(item.parameter || "").trim().toUpperCase() ===
        wantedParam.toUpperCase(),
    );
    if (!group) {
      group = { parameter: wantedParam, tiers: [] };
      cloned.push(group);
    }
    let tier = group.tiers.find(
      (item) => normalizeElectroUnit(item.unit) === wantedUnit,
    );
    if (!tier) {
      tier = { unit: wantedUnit || custom.unit, basePoints: [] };
      group.tiers.push(tier);
    }
    if (!tier.basePoints.some((point) => Number(point) === value)) {
      tier.basePoints.push(value);
    }
  }
  return cloned.map((group) => ({
    parameter: group.parameter,
    tiers: group.tiers.map((tier) => {
      const uniquePoints = Array.from(
        new Set(
          (tier.basePoints || [])
            .map((point) => Number(point))
            .filter((point) => Number.isFinite(point)),
        ),
      ).sort((a, b) => a - b);
      return {
        unit: tier.unit,
        points: uniquePoints.map((pointVal) => {
          const nominal = Number(pointVal);
          const maxError = nominal * (Number(accuracy) / 100);
          const calVal = nominal;
          const stdVal = nominal;
          const uucVal = nominal + (Math.random() * (2 * maxError) - maxError);
          const dev = uucVal - stdVal;
          const cmc = getTechCmc(group.parameter, tier.unit, nominal);
          return {
            cal: Number(calVal.toFixed(lcDec)),
            std: Number(stdVal.toFixed(lcDec + 2)),
            uuc: Number(uucVal.toFixed(lcDec)),
            dev: Number(dev.toFixed(lcDec + 2)),
            cmc,
            uucVal: Number(uucVal.toFixed(lcDec)),
            stdVal: Number(stdVal.toFixed(lcDec + 2)),
            deviation: Number(dev.toFixed(lcDec + 2)),
            pointCmc: cmc,
          };
        }),
      };
    }),
  }));
}

function generateR11ElectroReadings(row = {}) {
  const accuracy = electroAccuracyOf(row);
  const cmc = electroCmcOf(row);
  const groups = [];
  for (const field of ELECTRO_RANGE_FIELDS) {
    const maxText = String(row[field.maxKey] ?? "").trim();
    if (!maxText) continue;
    const maxVal = Number(maxText);
    if (!Number.isFinite(maxVal)) continue;
    const unit = normalizeElectroUnit(
      row[field.maxUnitKey] || field.defaultUnit,
    );
    const decimals = electroDecimals(unit);
    groups.push({
      kind: "parameter",
      parameter: field.r11Parameter || field.parameter,
      unit,
      points: [0.1, 0.5, 0.9].map((percent) => {
        const uucVal = maxVal * percent;
        const stdVal = uucVal + (Math.random() * (2 * accuracy) - accuracy);
        const deviation = stdVal - uucVal;
        const uuc = formatElectroNumber(uucVal, decimals);
        const std = formatElectroNumber(stdVal, decimals);
        const dev = formatElectroNumber(deviation, decimals);
        return {
          uuc,
          std,
          dev,
          cmc,
          uucVal: uuc,
          stdVal: std,
          deviation: dev,
          pointCmc: cmc,
        };
      }),
    });
  }
  return groups;
}

function generateElectroReadings(row = {}) {
  if (electroLayoutOf(row) === "R-11") return generateR11ElectroReadings(row);
  return generateE01E02Readings(row);
}

export function electroDisplayGroups(readings) {
  if (!Array.isArray(readings)) return [];
  return readings.map((group) => {
    const parameter = group?.parameter || "";
    if (Array.isArray(group?.tiers) && group.tiers.length > 0) {
      return {
        parameter,
        tiers: group.tiers.map((tier) => {
          const unit = normalizeElectroUnit(tier?.unit);
          return {
            unit,
            stdUnit: unit,
            points: (tier?.points || []).map(mapElectroPoint),
          };
        }),
      };
    }
    const fromPoints = Array.isArray(group?.points) ? group.points : [];
    const points =
      fromPoints.length > 0
        ? fromPoints.map(mapElectroPoint)
        : (group?.ranges || []).flatMap((range) =>
            (range.points || []).map((point, idx) => ({
              calPoint: idx === 0 ? range.rangeVal ?? "" : "",
              std: point.stdVal ?? point.std ?? "",
              uuc: point.uucVal ?? point.uuc ?? "",
              dev: point.deviation ?? point.dev ?? "",
              cmc: point.pointCmc ?? point.cmc ?? "",
            })),
          );
    return {
      parameter,
      tiers: [
        {
          unit: normalizeElectroUnit(group?.unit),
          stdUnit: normalizeElectroUnit(group?.unit),
          points,
        },
      ],
    };
  });
}

export function isR09Readings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      (Array.isArray(readings.rh) || Array.isArray(readings.temp)),
  );
}

function generateR09Channel(points, accuracy, uucDecimals, refDecimals) {
  return points.map((uucVal) => {
    const refVal = uucVal + (Math.random() * (2 * accuracy) - accuracy);
    const error = uucVal - refVal;
    const uucText = uucVal.toFixed(uucDecimals);
    return {
      uucVal: uucText,
      refVal: refVal.toFixed(refDecimals),
      error: error.toFixed(refDecimals),
      uuc: uucText,
      standard: refVal.toFixed(refDecimals),
    };
  });
}

function generateR09Readings(row = {}) {
  const accText = String(row.accuracy ?? "").trim();
  const accuracy = Number(accText);
  if (!Number.isFinite(accuracy)) return null;
  const lcText = String(row.leastCount ?? "").trim() || "0.1";
  const uucDecimals = lcDecimals(lcText) || 1;
  const refDecimals = uucDecimals + 1;
  return {
    rh: generateR09Channel(R09_RH_POINTS, accuracy, uucDecimals, refDecimals),
    temp: generateR09Channel(R09_TEMP_POINTS, accuracy, uucDecimals, refDecimals),
  };
}

export function r09CmcForChannel(cmcValue, channel) {
  const raw = String(cmcValue ?? "").trim();
  if (!raw) return "";
  const parts = raw
    .split(/[;/]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  const stripUnit = (text) =>
    String(text || "")
      .replace(/\s*(%RH|°\s*C|deg(?:ree)?s?\s*C|RH|%)\s*$/i, "")
      .trim();
  const rhPart = parts.find((part) => /rh/i.test(part));
  const tempPart = parts.find(
    (part) => /°\s*c|\bdeg|\bc\b/i.test(part) && !/rh/i.test(part),
  );
  if (channel === "rh") {
    return stripUnit(rhPart || parts[parts.length - 1] || raw);
  }
  return stripUnit(tempPart || parts[0] || raw);
}

export function r10Error(row, leastCount) {
  const uuc = Number(row?.uuc);
  const standard = Number(row?.standard);
  if (!Number.isFinite(uuc) || !Number.isFinite(standard)) return "";
  return (uuc - standard).toFixed(lcDecimals(leastCount) + 2);
}

function generateR12Readings(row = {}) {
  const min = Number(row.rangeMin ?? row.range_min);
  const max = Number(row.rangeMax ?? row.range_max);
  const accText = String(row.accuracy ?? "").trim();
  if (!Number.isFinite(min) || !Number.isFinite(max) || !accText) return null;
  const accuracy = Number(accText);
  if (!Number.isFinite(accuracy)) return null;
  const lcDec = lcDecimals(row.leastCount || row.lc || row.resolution || "0.01");
  const pointCount = Number(row.pointCount) === 5 ? 4 : 10;
  const step = pointCount === 0 ? 0 : (max - min) / pointCount;
  const cmc = String(
    row.cmc_value || row.cmc || pickCmc(row.uucData) || row.cmc_min || "",
  ).trim();
  const generatedPoints = [];
  for (let i = 0; i <= pointCount; i += 1) {
    const uucVal = min + step * i;
    const maxError = max * (accuracy / 100);
    const stdVal = uucVal + (Math.random() * (2 * maxError) - maxError);
    const errorAbs = uucVal - stdVal;
    const errorPct = max === 0 ? 0 : (errorAbs / max) * 100;
    generatedPoints.push({
      uuc: Number(uucVal.toFixed(lcDec)),
      std: Number(stdVal.toFixed(lcDec + 2)),
      error: Number(errorAbs.toFixed(lcDec + 2)),
      errorPct: Number(errorPct.toFixed(2)),
      cmc,
      range: max,
      refStandard: Number(stdVal.toFixed(lcDec + 2)),
      uucReading: Number(uucVal.toFixed(lcDec)),
      errorPercent: Number(errorPct.toFixed(2)),
      uncertainty: cmc,
    });
  }
  return {
    parameter:
      row.description ||
      row.descriptionOfUUC ||
      row.parameter ||
      row.uucData?.parameter ||
      "",
    unit: row.r12_unit || row.r12_range_unit || "V",
    rangeMax: max,
    points: generatedPoints,
  };
}

function resistanceToMegaOhm(value, unit) {
  const num = Number(value);
  if (!Number.isFinite(num)) return NaN;
  const u = normalizeElectroUnit(unit);
  if (u === GIGA_OHM || /^g/i.test(String(unit || "").replace(/ohm/gi, ""))) {
    return num * 1000;
  }
  if (u === `k${OHM}`) return num / 1000;
  if (u === OHM) return num / 1e6;
  return num;
}

const R15_FIRST_MIN = 5;
const R15_CMC_UP_TO_5 = 3.7;
const R15_CMC_ABOVE_5 = 4.28;

function r15CmcForMinutes(pMin) {
  return pMin <= R15_FIRST_MIN ? R15_CMC_UP_TO_5 : R15_CMC_ABOVE_5;
}

function r15ErrorUnder1Sec() {
  const magnitude = Number((Math.random() * 0.98 + 0.01).toFixed(2));
  return Math.random() < 0.5 ? -magnitude : magnitude;
}

function r15PointMinutes(endMin) {
  const points = [R15_FIRST_MIN];
  if (!(endMin > R15_FIRST_MIN)) return points;
  for (let value = 15; value < endMin - 1e-9; value += 15) {
    points.push(value);
  }
  if (points[points.length - 1] !== endMin) points.push(endMin);
  return points;
}

function generateR15Readings(row = {}) {
  const minText = String(row.rangeMin ?? row.range_min ?? "").trim();
  const maxText = String(row.rangeMax ?? row.range_max ?? "").trim();
  if (!minText && !maxText) return null;
  const min = Number(minText);
  const max = Number(maxText);
  const endCandidate = maxText && Number.isFinite(max) ? max : min;
  if (!Number.isFinite(endCandidate)) return null;
  const endMin = endCandidate > R15_FIRST_MIN ? endCandidate : R15_FIRST_MIN;
  const formatMin = (value) => {
    if (!Number.isFinite(value)) return value;
    return Number.isInteger(value) || Math.abs(value - Math.round(value)) < 1e-9
      ? Math.round(value)
      : Number(value.toFixed(2));
  };
  const makePoint = (pMin) => {
    const uucSec = pMin * 60;
    const errorSec = r15ErrorUnder1Sec();
    const refSec = Number((uucSec - errorSec).toFixed(2));
    const error = Number((uucSec - refSec).toFixed(2));
    return {
      min: formatMin(pMin),
      uucSec: Number(uucSec.toFixed(2)),
      refSec,
      error,
      cmc: r15CmcForMinutes(pMin),
    };
  };
  return { points: r15PointMinutes(endMin).map(makePoint) };
}

function generateR14Readings(row = {}) {
  const accuracy = Number(String(row.accuracy ?? "2.0").trim());
  const acc = Number.isFinite(accuracy) ? accuracy : 2;
  const generatedPoints = r14FixedPoints.map((pt) => {
    const nominal = pt.val;
    const maxError = nominal * (acc / 100);
    const refVal =
      nominal + (Math.random() * (maxError * 0.5) - maxError * 0.25);
    const uucVal = nominal + (Math.random() * (2 * maxError) - maxError);
    const dev = uucVal - refVal;
    const errorPct = nominal === 0 ? 0 : (dev / nominal) * 100;
    return {
      nominal,
      unit: pt.unit,
      ref: Number(refVal.toFixed(3)),
      uuc: Number(uucVal.toFixed(2)),
      dev: Number(dev.toFixed(3)),
      errorPct: Number(errorPct.toFixed(2)),
      cmc: pt.cmc,
    };
  });
  return {
    test_voltage: row.test_voltage || "@5000V DC",
    parameter: "RESISTANCE",
    tiers: [
      {
        unit: MEGA_OHM,
        points: generatedPoints.filter(
          (pt) => normalizeElectroUnit(pt.unit) === MEGA_OHM,
        ),
      },
      {
        unit: GIGA_OHM,
        points: generatedPoints.filter(
          (pt) => normalizeElectroUnit(pt.unit) === GIGA_OHM,
        ),
      },
    ],
  };
}

function formatTachometerCmc(nominal, row) {
  const bands = resolveCmcBands(row.cmc_bands, row.uucData, row);
  const fallback = row.cmc_value || row.cmc || pickCmc(row.uucData) || row.cmc_min || 4.1;
  if (bands.length) {
    const fromBand = cmcForPoint(nominal, bands, fallback);
    return fromBand || Number(fallback).toFixed(1);
  }
  const num = Number(cmcNumericText(fallback));
  return Number.isFinite(num) ? num.toFixed(1) : "4.1";
}

function generateTachometerReadings(row = {}) {
  const min = Number(row.rangeMin ?? row.range_min);
  const max = Number(row.rangeMax ?? row.range_max);
  if (!Number.isFinite(max)) {
    return { type: "TACHOMETER", points: [] };
  }
  const start = Number.isFinite(min) ? min : 0;
  const isSinglePoint = String(row.pointCount) === "1" || Number(row.pointCount) === 1;
  const numPoints = isSinglePoint ? 1 : String(row.pointCount) === "5" ? 4 : 10;

  const targetNominals = [];
  if (isSinglePoint) {
    targetNominals.push(max);
  } else {
    const step = (max - start) / numPoints;
    targetNominals.push(start);
    for (let i = 1; i < numPoints; i++) {
      const rawVal = start + step * i;
      let roundedVal;
      if (max <= 5000) {
        roundedVal = Math.round(rawVal / 500) * 500;
      } else if (max <= 10000) {
        roundedVal = Math.round(rawVal / 1000) * 1000;
      } else {
        roundedVal = Math.round(rawVal / 10000) * 10000;
      }
      if (
        roundedVal > start &&
        roundedVal < max &&
        !targetNominals.includes(roundedVal)
      ) {
        targetNominals.push(roundedVal);
      }
    }
    targetNominals.push(max);
  }

  const lcStr = String(row.lc || row.leastCount || row.resolution || "1");
  const baseLcDecimals = lcDecimals(lcStr);

  const generatedPoints = [];
  const fallbackCmc = Number(
    cmcNumericText(row.cmc_value || row.cmc || pickCmc(row.uucData) || 4.1) || 4.1,
  );
  const cmcFallback = Number.isFinite(fallbackCmc) ? fallbackCmc : 4.1;

  targetNominals.forEach((nominal) => {
    let maxErr = 1;
    if (nominal > 1000 && nominal <= 5000) maxErr = 2;
    else if (nominal > 5000) maxErr = 5;
    if (nominal === 0) maxErr = 0;

    const error = Math.random() * (2 * maxErr) - maxErr;
    const masterDecimals = nominal < 1000 ? 1 : 0;
    const uucDecimals = nominal < 1000 ? baseLcDecimals : 0;
    let masterVal = nominal - error;
    masterVal = Number(masterVal.toFixed(masterDecimals));
    const actualError = nominal - masterVal;
    const errorDecimals = Math.max(uucDecimals, masterDecimals);
    const bandText = cmcNumericText(formatTachometerCmc(nominal, row));
    const cmcNum = Number(bandText);
    const cmc = Number.isFinite(cmcNum)
      ? (String(bandText).includes(".") && String(bandText).split(".")[1].length > 1
          ? String(bandText)
          : cmcNum.toFixed(1))
      : cmcFallback.toFixed(1);
    generatedPoints.push({
      set_rpm: Number(nominal).toFixed(uucDecimals),
      master_rpm: masterVal.toFixed(masterDecimals),
      error: Number(actualError).toFixed(errorDecimals),
      cmc,
    });
  });

  return {
    type: "TACHOMETER",
    points: generatedPoints,
  };
}

export const D17_ID_RE = /U-D17/i;

export function isD17Row(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => D17_ID_RE.test(String(value || "")));
}

export function isD17Readings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      ["DIMENSIONAL_D17", "LENGTH_GAUGE_D17"].includes(
        String(readings.type || "").toUpperCase(),
      ) &&
      Array.isArray(readings.points),
  );
}

export function d17DisplayRows(readings) {
  const points = isD17Readings(readings) ? readings.points : [];
  return points.map((pt) => ({
    type: "LENGTH_GAUGE_D17",
    pass: String(pt?.pass ?? ""),
    retain: String(pt?.retain ?? ""),
    standard: String(pt?.standard ?? ""),
    uuc: String(pt?.uuc ?? ""),
    error: String(pt?.error ?? ""),
  }));
}

const D17_LADDER = [
  { pass: "50", retain: "40", std: 81.0 },
  { pass: "40", retain: "25", std: 58.5 },
  { pass: "25", retain: "20", std: 40.5 },
  { pass: "20", retain: "16", std: 32.4 },
  { pass: "16", retain: "12.5", std: 25.6 },
  { pass: "12.5", retain: "10", std: 20.2 },
  { pass: "10", retain: "6.3", std: 14.7 },
];

function generateD17Readings(row = {}) {
  const lcText = String(row.lc || row.leastCount || row.resolution || "0.01");
  const lcNum = Number(lcText);
  const lc = Number.isFinite(lcNum) && lcNum > 0 ? lcNum : 0.01;
  const lcDecimals = lcText.includes(".") ? lcText.split(".")[1].length : 3;
  const numErrorPoints = Math.min(Math.random() > 0.5 ? 3 : 4, D17_LADDER.length);
  const errorIndices = [];
  while (errorIndices.length < numErrorPoints) {
    const randIdx = Math.floor(Math.random() * D17_LADDER.length);
    if (!errorIndices.includes(randIdx)) errorIndices.push(randIdx);
  }
  const maxErrorSteps = Math.floor(0.04 / lc);

  return {
    type: "LENGTH_GAUGE_D17",
    points: D17_LADDER.map((item, idx) => {
      let error = 0;
      if (errorIndices.includes(idx) && maxErrorSteps > 0) {
        const errorSteps = Math.floor(Math.random() * maxErrorSteps) + 1;
        error = Number((errorSteps * lc * (Math.random() > 0.5 ? 1 : -1)).toFixed(lcDecimals));
      }
      return {
        pass: item.pass,
        retain: item.retain,
        standard: Number(item.std).toFixed(1),
        uuc: Number(item.std + error).toFixed(lcDecimals),
        error: Math.abs(error).toFixed(lcDecimals),
      };
    }),
  };
}

export const TAPE_ID_RE = /U-D23|U-D24/i;

export function isTapeRow(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => TAPE_ID_RE.test(String(value || "")));
}

export function isTapeReadings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      String(readings.type || "").toUpperCase() === "MEASURING_TAPE_D23" &&
      Array.isArray(readings.points),
  );
}

export function tapeDisplayRows(readings) {
  const points = isTapeReadings(readings) ? readings.points : [];
  return points.map((pt) => ({
    type: "MEASURING_TAPE_D23",
    standard: String(pt?.standard ?? ""),
    uuc: String(pt?.uuc ?? ""),
    error: String(pt?.error ?? ""),
  }));
}

const TAPE_STD_TO_6K = [100, 500, 1000, 2000, 3000, 4000, 5000, 6000];

function roundTapeMark(value, max) {
  const step = max > 20000 && value >= 10000 ? 5000 : 1000;
  const rounded = Math.round(value / step) * step;
  if (rounded >= max) return max;
  if (rounded < 1000) return 1000;
  return rounded;
}

function tapeStandardPoints(max) {
  if (max <= 6000) {
    return TAPE_STD_TO_6K.filter((value) => value <= max + 1e-9);
  }
  if (max <= 10000) {
    const points = [100];
    for (let value = 1000; value <= max + 1e-9; value += 1000) points.push(value);
    if (points[points.length - 1] !== max) points.push(max);
    while (points.length > 10) {
      const skip = points.indexOf(7000);
      if (skip > 0) points.splice(skip, 1);
      else points.splice(Math.max(1, points.length - 2), 1);
    }
    if (points.length < 10 && max >= 500 && !points.includes(500)) {
      points.splice(1, 0, 500);
    }
    return points;
  }
  const fractions = [0.005, 0.05, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1];
  const points = [];
  fractions.forEach((fraction, index) => {
    const value =
      index === 0
        ? 100
        : index === fractions.length - 1
          ? max
          : roundTapeMark(max * fraction, max);
    if (value <= max && !points.includes(value)) points.push(value);
  });
  if (!points.includes(max)) points.push(max);
  points.sort((a, b) => a - b);
  return points;
}

function generateTapeReadings(row = {}) {
  const maxRaw = Number(row.rangeMax ?? row.range_max);
  const maxRange = Number.isFinite(maxRaw) ? maxRaw : 50000;
  const finalLadder = tapeStandardPoints(maxRange);
  const numErrorPoints = Math.min(Math.random() > 0.5 ? 4 : 5, finalLadder.length);
  const errorIndices = [];
  while (errorIndices.length < numErrorPoints) {
    const randIdx = Math.floor(Math.random() * finalLadder.length);
    if (!errorIndices.includes(randIdx)) errorIndices.push(randIdx);
  }
  return {
    type: "MEASURING_TAPE_D23",
    points: finalLadder.map((standardVal, idx) => {
      let error = 0;
      if (errorIndices.includes(idx)) {
        const randomError = Math.random() * 0.13;
        error = randomError * (Math.random() > 0.5 ? 1 : -1);
      }
      return {
        standard: Number(standardVal).toFixed(1),
        uuc: Number(standardVal + error).toFixed(3),
        error: Number(error).toFixed(3),
      };
    }),
  };
}

export const D25_ID_RE = /U-D25/i;

export function isD25Row(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => D25_ID_RE.test(String(value || "")));
}

export function isD25Readings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      String(readings.type || "").toUpperCase() === "MEASURING_D25" &&
      Array.isArray(readings.points),
  );
}

export function d25DisplayRows(readings) {
  const points = isD25Readings(readings) ? readings.points : [];
  return points.map((pt) => ({
    type: "MEASURING_D25",
    standard: String(pt?.standard ?? ""),
    uuc: String(pt?.uuc ?? ""),
    error: String(pt?.error ?? ""),
  }));
}

const D25_NICE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];

function d25StandardPoints(min, max, numPoints) {
  if (!(max > min)) return [max];
  const span = max - min;
  const intervals = numPoints <= 1 ? 1 : numPoints;
  const target = span / intervals;
  let step = D25_NICE_STEPS[0];
  for (const candidate of D25_NICE_STEPS) {
    if (candidate <= target + 1e-9) step = candidate;
  }
  const divisors = D25_NICE_STEPS.filter(
    (candidate) =>
      candidate <= step + 1e-9 &&
      Math.abs(span / candidate - Math.round(span / candidate)) < 1e-6,
  );
  if (divisors.length) step = divisors[divisors.length - 1];
  const points = [];
  for (let value = min; value <= max + 1e-6; value += step) {
    points.push(Number(value.toFixed(4)));
  }
  if (Math.abs(points[points.length - 1] - max) > 1e-6) points.push(max);
  return points;
}

function generateD25Readings(row = {}) {
  const minRaw = Number(row.rangeMin ?? row.range_min);
  const maxRaw = Number(row.rangeMax ?? row.range_max);
  const min = Number.isFinite(minRaw) ? minRaw : 0;
  const max = Number.isFinite(maxRaw) ? maxRaw : 1000;
  const lcText = String(row.lc || row.leastCount || row.resolution || "0.01");
  const lcDecimals = lcText.includes(".") ? lcText.split(".")[1].length : 3;
  const parsedPoints = parseInt(String(row.pointCount ?? row.points ?? "5").split(" ")[0], 10);
  const numPoints = parsedPoints === 1 || parsedPoints === 10 ? parsedPoints : 5;
  const standards = d25StandardPoints(min, max, numPoints);
  const displayDecimals = Math.max(lcDecimals, 3);
  const eligible = standards
    .map((value, index) => ({ value, index }))
    .filter((item) => item.value !== 0);
  const numErrorPoints = Math.min(Math.random() > 0.5 ? 4 : 5, eligible.length);
  const errorIndices = [];
  while (errorIndices.length < numErrorPoints) {
    const pick = eligible[Math.floor(Math.random() * eligible.length)].index;
    if (!errorIndices.includes(pick)) errorIndices.push(pick);
  }
  const points = standards.map((standardVal, idx) => {
    let maxErrorLimit = 0.1;
    if (standardVal > 300 && standardVal <= 500) maxErrorLimit = 0.2;
    else if (standardVal > 500) maxErrorLimit = 0.3;
    let error = 0;
    if (errorIndices.includes(idx)) {
      error = Math.random() * maxErrorLimit * (Math.random() > 0.5 ? 1 : -1);
    }
    return {
      standard: Number(standardVal).toFixed(1),
      uuc: Number(standardVal + error).toFixed(displayDecimals),
      error: Number(error).toFixed(displayDecimals),
    };
  });
  return { type: "MEASURING_D25", points };
}

export const UTG_ID_RE = /U-D40/i;

export function isUtgRow(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => UTG_ID_RE.test(String(value || "")));
}

export function isUtgReadings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      String(readings.type || "").toUpperCase() === "UTG_D40" &&
      Array.isArray(readings.points),
  );
}

export function utgDisplayRows(readings) {
  const points = isUtgReadings(readings) ? readings.points : [];
  return points.map((pt) => ({
    type: "UTG_D40",
    standard: String(pt?.standard ?? ""),
    uuc: String(pt?.uuc ?? ""),
    error: String(pt?.error ?? ""),
    cmc: String(pt?.cmc ?? ""),
  }));
}

const UTG_SIZES = [10, 15.5, 20.5, 25, 50, 75, 100, 150, 200];

function formatUtgStandard(value) {
  if (Math.abs(value - Math.round(value)) < 1e-6) return String(Math.round(value));
  return Number(value).toFixed(1);
}

function generateUtgReadings(row = {}) {
  const lcText = String(row.lc || row.leastCount || row.resolution || "0.01");
  const formLcNum = Number(lcText);
  const formLc = Number.isFinite(formLcNum) && formLcNum > 0 ? formLcNum : 0.01;
  const formLcDecimals = lcText.includes(".") ? lcText.split(".")[1].length : 2;
  const rawCmc = row.cmc_value || row.cmc || pickCmc(row.uucData);
  const cmcNum = Number(rawCmc);
  const cmc = (Number.isFinite(cmcNum) && cmcNum !== 0 ? cmcNum : 65).toFixed(4);
  const maxRange = Number(row.rangeMax ?? row.range_max ?? row.uucData?.range_max ?? 200);
  const rangeCap = Number.isFinite(maxRange) && maxRange > 0 ? maxRange : 200;
  const validSizes = UTG_SIZES.filter((size) => size <= rangeCap + 1e-9);
  const points = validSizes.map((stdVal) => {
    let error = 0;
    let decimals = formLcDecimals;
    if (stdVal <= 25) {
      error = 0;
    } else if (stdVal <= 100) {
      const steps = Math.floor(Math.random() * 3) + 1;
      error = Number((steps * formLc * (Math.random() > 0.5 ? 1 : -1)).toFixed(formLcDecimals));
    } else {
      decimals = 1;
      error = 0.1 * (Math.random() > 0.5 ? 1 : -1);
    }
    return {
      standard: formatUtgStandard(stdVal),
      uuc: Number(stdVal + error).toFixed(decimals),
      error: Number(error).toFixed(decimals),
      cmc,
    };
  });
  return { type: "UTG_D40", points };
}

export const D42_ID_RE = /U-D42/i;

export function isD42Row(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => D42_ID_RE.test(String(value || "")));
}

export function isD42Readings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      String(readings.type || "").toUpperCase() === "DIMENSIONAL_D42" &&
      Array.isArray(readings.points),
  );
}

export function d42DisplayRows(readings) {
  const points = isD42Readings(readings) ? readings.points : [];
  return points.map((pt) => ({
    type: "DIMENSIONAL_D42",
    standard: String(pt?.standard ?? ""),
    uuc: String(pt?.uuc ?? ""),
    error: String(pt?.error ?? ""),
    cmc: String(pt?.cmc ?? ""),
  }));
}

const D42_SIZES = [20.2, 50.4, 80.6, 110.8, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600];

function generateD42Readings(row = {}) {
  const lcText = String(row.lc || row.leastCount || row.resolution || "0.001");
  const lcNum = Number(lcText);
  const lc = Number.isFinite(lcNum) && lcNum > 0 ? lcNum : 0.001;
  const lcDecimals = lcText.includes(".") ? lcText.split(".")[1].length : 3;
  const rawCmc = row.cmc_value || row.cmc || pickCmc(row.uucData);
  const cmcNum = Number(rawCmc);
  const cmc = (Number.isFinite(cmcNum) && cmcNum !== 0 ? cmcNum : 1.5).toFixed(4);
  const maxRange = Number(row.rangeMax ?? row.range_max ?? row.uucData?.range_max ?? 600);
  const rangeCap = Number.isFinite(maxRange) && maxRange > 0 ? maxRange : 600;
  const validSizes = D42_SIZES.filter((size) => size <= rangeCap + 1e-9);
  const errorCount = Math.min(Math.random() > 0.5 ? 3 : 4, validSizes.length);
  const errorIndices = [];
  while (errorIndices.length < errorCount) {
    const randIdx = Math.floor(Math.random() * validSizes.length);
    if (!errorIndices.includes(randIdx)) errorIndices.push(randIdx);
  }
  const maxErrorSteps = Math.floor((0.01 + lc * 1e-6) / lc);
  const points = validSizes.map((stdVal, idx) => {
    let error = 0;
    if (errorIndices.includes(idx)) {
      const sign = Math.random() > 0.5 ? 1 : -1;
      if (maxErrorSteps > 0) {
        const errorSteps = Math.floor(Math.random() * maxErrorSteps) + 1;
        error = Number((errorSteps * lc * sign).toFixed(lcDecimals));
        if (Math.abs(error) > 0.01) error = Number((0.01 * sign).toFixed(lcDecimals));
      } else {
        error = Number((0.01 * sign).toFixed(lcDecimals));
      }
    }
    return {
      standard: formatUtgStandard(stdVal),
      uuc: Number(stdVal + error).toFixed(lcDecimals),
      error: Number(error).toFixed(lcDecimals),
      cmc,
    };
  });
  return { type: "DIMENSIONAL_D42", points };
}

export const D18_ID_RE = /U-D18/i;

export function isD18Row(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => D18_ID_RE.test(String(value || "")));
}

export function isD18Readings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      String(readings.type || "").toUpperCase() === "MICROMETER_D18" &&
      Array.isArray(readings.points),
  );
}

export function d18DisplayRows(readings) {
  const points = isD18Readings(readings) ? readings.points : [];
  return points.map((pt) => ({
    type: "MICROMETER_D18",
    standard: String(pt?.standard ?? ""),
    uuc: String(pt?.uuc ?? ""),
    error: String(pt?.error ?? ""),
    cmc: String(pt?.cmc ?? ""),
  }));
}

const D18_INTERVALS = [0, 2.5, 5.1, 7.7, 10.3, 12.9, 15, 17.6, 20.2, 22.8, 25];

function generateD18Readings(row = {}) {
  const lcText = String(row.lc || row.leastCount || row.resolution || "0.001");
  const lcDecimals = lcText.includes(".") ? lcText.split(".")[1].length : 3;
  const rawMax = Number(row.rangeMax ?? row.range_max ?? row.uucData?.range_max);
  const maxRange = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 25;
  const baseValue = maxRange - 25;
  const standardLadder = D18_INTERVALS.map((interval) => baseValue + interval);
  const errorCount = Math.min(Math.random() > 0.5 ? 1 : 2, standardLadder.length);
  const errorIndices = [];
  while (errorIndices.length < errorCount) {
    const randIdx = Math.floor(Math.random() * standardLadder.length);
    if (!errorIndices.includes(randIdx)) errorIndices.push(randIdx);
  }
  const rawCmc = row.cmc_value || row.cmc || pickCmc(row.uucData);
  const cmcNum = Number(rawCmc);
  const cmc = (Number.isFinite(cmcNum) && cmcNum !== 0 ? cmcNum : 1.5).toFixed(1);
  const points = standardLadder.map((stdVal, idx) => {
    const error = errorIndices.includes(idx) ? 0.001 * (Math.random() > 0.5 ? 1 : -1) : 0;
    return {
      standard: Number(stdVal).toFixed(3),
      uuc: Number(stdVal + error).toFixed(lcDecimals),
      error: Number(error).toFixed(3),
      cmc,
    };
  });
  return { type: "MICROMETER_D18", points };
}

export const D20_ID_RE = /U-D20/i;

export function isD20Row(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => D20_ID_RE.test(String(value || "")));
}

export function isD20Readings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      String(readings.type || "").toUpperCase() === "FILLET_WELD_D20" &&
      Array.isArray(readings.lengthPoints) &&
      Array.isArray(readings.anglePoints),
  );
}

const D20_LENGTH_LADDER = [3.2, 5, 10, 15, 20, 25];
const D20_ANGLE_LADDER = [10, 20, 30, 40, 50, 60];

function d20Bound(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function d20InRange(value, min, max) {
  if (min != null && value < min - 1e-9) return false;
  if (max != null && value > max + 1e-9) return false;
  return true;
}

function generateD20Readings(row = {}) {
  const angleMin = d20Bound(row.rangeMin ?? row.range_min);
  const angleMax = d20Bound(row.rangeMax ?? row.range_max);
  const lenMin = d20Bound(row.range_min_len);
  const lenMax = d20Bound(row.range_max_len);
  const lengthLadder = D20_LENGTH_LADDER.filter((value) => d20InRange(value, lenMin, lenMax));
  const angleLadder = D20_ANGLE_LADDER.filter((value) => d20InRange(value, angleMin, angleMax));
  const lengthPoints = lengthLadder.map((stdVal) => {
    const sign = Math.random() > 0.5 ? 1 : -1;
    const error = Number((Math.random() * 0.1 * sign).toFixed(2));
    return {
      uuc: stdVal === 3.2 ? "3.2 mm" : `${stdVal} mm`,
      master: `${(stdVal + error).toFixed(2)} mm`,
      error: `${error.toFixed(2)} mm`,
      cmc: "10 µm",
    };
  });
  const anglePoints = angleLadder.map((stdVal) => {
    const errorMins = Math.floor(Math.random() * 16) * (Math.random() > 0.5 ? 1 : -1);
    let masterDeg = stdVal;
    let masterMin = errorMins;
    if (masterMin < 0) {
      masterDeg -= 1;
      masterMin += 60;
    }
    if (masterMin === 60) {
      masterDeg += 1;
      masterMin = 0;
    }
    return {
      uuc: `${stdVal}°`,
      master: `${masterDeg}°${String(masterMin).padStart(2, "0")}'`,
      error: `${errorMins}'`,
      cmc: "20'",
    };
  });
  return { type: "FILLET_WELD_D20", lengthPoints, anglePoints };
}

export const D21_ID_RE = /U-D21/i;

export function isD21Row(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => D21_ID_RE.test(String(value || "")));
}

export function isD21Readings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      String(readings.type || "").toUpperCase() === "AGGREGATE_D21" &&
      Array.isArray(readings.points),
  );
}

const D21_LADDER = [
  { pass: "63", ret: "50", lenStd: 100.0, lenUUC: 99.977, lenErr: 0.023, widStd: 33.9, widUUC: 33.897, widErr: 0.003, static: true },
  { pass: "50", ret: "40", lenStd: 90.0, lenUUC: 89.981, lenErr: 0.019, widStd: 27.0, widUUC: 26.998, widErr: 0.002, static: true },
  { pass: "40", ret: "25", lenStd: 80.0, lenUUC: 79.987, lenErr: 0.013, widStd: 19.5, widUUC: 19.498, widErr: 0.002, static: true },
  { pass: "31.5", ret: "25", lenStd: 70.0, widStd: 16.95, static: false },
  { pass: "25", ret: "20", lenStd: 65.0, widStd: 13.5, static: false },
  { pass: "20", ret: "16", lenStd: 50.0, lenUUC: 49.997, lenErr: 0.003, widStd: 10.8, widUUC: 10.799, widErr: 0.001, static: true },
  { pass: "16", ret: "12.5", lenStd: 40.0, widStd: 8.55, static: false },
  { pass: "12.5", ret: "10", lenStd: 35.0, widStd: 6.75, static: false },
  { pass: "10", ret: "6.3", lenStd: 25.0, lenUUC: 24.999, lenErr: 0.001, widStd: 4.89, widUUC: 4.89, widErr: 0.0, static: true },
];

function d21DynamicError(lc) {
  const maxErrorSteps = Math.floor((0.004 + lc * 1e-6) / lc);
  const sign = Math.random() > 0.5 ? 1 : -1;
  if (maxErrorSteps > 0) {
    return Math.floor(Math.random() * (maxErrorSteps + 1)) * lc * sign;
  }
  return Math.random() * 0.004 * sign;
}

function generateD21Readings(row = {}) {
  const lcRaw = Number(row.lc || row.leastCount || "0.001");
  const lc = Number.isFinite(lcRaw) && lcRaw > 0 ? lcRaw : 0.001;
  const rawCmc = row.cmc_value || row.cmc || pickCmc(row.uucData);
  const cmcNum = Number(rawCmc);
  const cmc = (Number.isFinite(cmcNum) && cmcNum !== 0 ? cmcNum : 1.5).toFixed(4);
  const points = D21_LADDER.map((item) => {
    if (item.static) {
      return {
        pass: item.pass,
        ret: item.ret,
        lenStd: item.lenStd.toFixed(2),
        lenUUC: item.lenUUC.toFixed(3),
        lenErr: item.lenErr.toFixed(3),
        widStd: item.widStd.toFixed(2),
        widUUC: item.widUUC.toFixed(3),
        widErr: item.widErr.toFixed(3),
        cmc,
      };
    }
    const lenError = d21DynamicError(lc);
    const widError = d21DynamicError(lc);
    return {
      pass: item.pass,
      ret: item.ret,
      lenStd: item.lenStd.toFixed(2),
      lenUUC: (item.lenStd + lenError).toFixed(3),
      lenErr: Math.abs(lenError).toFixed(3),
      widStd: item.widStd.toFixed(2),
      widUUC: (item.widStd + widError).toFixed(3),
      widErr: Math.abs(widError).toFixed(3),
      cmc,
    };
  });
  return { type: "AGGREGATE_D21", points };
}

export const D22_ID_RE = /U-D22/i;

export function isD22Row(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => D22_ID_RE.test(String(value || "")));
}

export function isD22Readings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      String(readings.type || "").toUpperCase() === "TUBULAR_MICROMETER_D22" &&
      Array.isArray(readings.micPoints),
  );
}

const D22_MIC_OFFSETS = [2.5, 5.1, 7.7, 10.3, 13];

function d22Bound(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function d22Error(maxLimit, lc) {
  const maxSteps = Math.floor((maxLimit + lc * 1e-6) / lc);
  if (maxSteps > 0) {
    const steps = Math.floor(Math.random() * (maxSteps + 1));
    return steps * lc * (Math.random() > 0.5 ? 1 : -1);
  }
  return 0;
}

function generateD22Readings(row = {}) {
  const lcText = String(row.lc || row.leastCount || "0.001");
  const lcRaw = Number(lcText);
  const lc = Number.isFinite(lcRaw) && lcRaw > 0 ? lcRaw : 0.001;
  const lcDecimals = lcText.includes(".") ? lcText.split(".")[1].length : 3;
  const rods = Array.isArray(row.rods) ? row.rods : [];
  const primaryMin = d22Bound(row.rangeMin ?? row.range_min ?? rods[0]?.min) ?? 50;
  const rawCmc = row.cmc_value || row.cmc || pickCmc(row.uucData);
  const cmcNum = Number(rawCmc);
  const cmc = (Number.isFinite(cmcNum) && cmcNum !== 0 ? cmcNum : 1.5).toFixed(1);
  const micPoints = D22_MIC_OFFSETS.map((offset) => {
    const stdVal = primaryMin + offset;
    const error = d22Error(0.001, lc);
    return {
      standard: stdVal.toFixed(lcDecimals),
      uuc: (stdVal + error).toFixed(lcDecimals),
      error: error.toFixed(lcDecimals),
      cmc,
    };
  });
  const extPoints = rods.slice(1).flatMap((rod) => {
    const maxVal = d22Bound(rod?.max);
    if (maxVal == null) return [];
    const error = d22Error(0.005, lc);
    return [{
      standard: String(maxVal),
      uuc: "-",
      error: error.toFixed(lcDecimals),
      cmc,
    }];
  });
  return { type: "TUBULAR_MICROMETER_D22", micPoints, extPoints };
}

export const D19_ID_RE = /U-D19/i;
const D19_FALLBACK_POINTS = [0.01, 0.02, 0.03, 0.04, 0.05, 0.08, 0.1, 0.15, 0.2];

export function isD19Row(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => D19_ID_RE.test(String(value || "")));
}

export function isD19Readings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      String(readings.type || "").toUpperCase() === "FEELER_GAUGE_D19" &&
      Array.isArray(readings.points),
  );
}

export function feelerRangeText(points) {
  const nums = (Array.isArray(points) ? points : [])
    .filter((value) => value !== "" && value != null)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const values = nums.length ? nums : D19_FALLBACK_POINTS;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return `${min.toFixed(2)} to ${max.toFixed(2)} mm`;
}

function generateD19Readings(row = {}) {
  const lcText = String(row.lc || row.leastCount || "0.001");
  const lcDecimals = lcText.includes(".") ? lcText.split(".")[1].length : 3;
  const entered = Array.isArray(row.feeler_points) ? row.feeler_points : [];
  const numeric = entered
    .map((value) => (value === "" || value == null ? NaN : Number(value)))
    .filter((value) => Number.isFinite(value));
  const points = (numeric.length ? numeric : D19_FALLBACK_POINTS)
    .slice()
    .sort((a, b) => a - b);
  const validIndices = points.map((_, index) => index).filter((index) => index >= 2);
  const wanted = Math.random() > 0.5 ? 3 : 4;
  const pool = validIndices.slice();
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = pool[i];
    pool[i] = pool[j];
    pool[j] = swap;
  }
  const errorIndices = pool.slice(0, Math.min(wanted, pool.length));
  const rawCmc = row.cmc_value || row.cmc || pickCmc(row.uucData);
  const cmcNum = Number(rawCmc);
  const cmc = (Number.isFinite(cmcNum) && cmcNum !== 0 ? cmcNum : 1.5).toFixed(1);
  const generatedPoints = points.map((stdVal, idx) => {
    const error = errorIndices.includes(idx) ? 0.001 * (Math.random() > 0.5 ? 1 : -1) : 0;
    return {
      standard: stdVal.toFixed(lcDecimals),
      uuc: (stdVal + error).toFixed(lcDecimals),
      error: error.toFixed(lcDecimals),
      cmc,
    };
  });
  return { type: "FEELER_GAUGE_D19", points: generatedPoints };
}

export const D31_ID_RE = /U-D31/i;
const D31_FALLBACK_POINTS = [0.1, 0.2, 0.3, 0.4];

export function isD31Row(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => D31_ID_RE.test(String(value || "")));
}

export function isD31Readings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      String(readings.type || "").toUpperCase() === "RADIUS_GAUGE_D31" &&
      Array.isArray(readings.internalPoints) &&
      Array.isArray(readings.externalPoints),
  );
}

export function radiusRangeText(points) {
  const nums = (Array.isArray(points) ? points : [])
    .filter((value) => value !== "" && value != null)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const values = nums.length ? nums : D31_FALLBACK_POINTS;
  return `${Math.min(...values)} to ${Math.max(...values)} mm`;
}

function d31Standard(stdVal) {
  return stdVal % 1 === 0 ? String(stdVal) : stdVal.toFixed(2);
}

function generateD31Section(points, lc, lcDecimals, cmc) {
  const wanted = Math.random() > 0.5 ? 3 : 4;
  const errorIndices = [];
  while (errorIndices.length < wanted && errorIndices.length < points.length) {
    const randIdx = Math.floor(Math.random() * points.length);
    if (!errorIndices.includes(randIdx)) errorIndices.push(randIdx);
  }
  return points.map((stdVal, idx) => {
    let error = 0;
    if (errorIndices.includes(idx)) {
      const maxErrorSteps = Math.floor((0.003 + lc * 1e-6) / lc);
      if (maxErrorSteps > 0) {
        const steps = Math.floor(Math.random() * maxErrorSteps) + 1;
        error = steps * lc * (Math.random() > 0.5 ? 1 : -1);
      } else {
        error = 0.003 * (Math.random() > 0.5 ? 1 : -1);
      }
    }
    return {
      standard: d31Standard(stdVal),
      uuc: (stdVal + error).toFixed(lcDecimals),
      error: error.toFixed(3),
      cmc,
    };
  });
}

function generateD31Readings(row = {}) {
  const lcText = String(row.lc || row.leastCount || "0.01");
  const lcRaw = Number(lcText);
  const lc = Number.isFinite(lcRaw) && lcRaw > 0 ? lcRaw : 0.01;
  const lcDecimals = lcText.includes(".") ? lcText.split(".")[1].length : 2;
  const entered = Array.isArray(row.radius_points) ? row.radius_points : [];
  const numeric = entered
    .map((value) => (value === "" || value == null ? NaN : Number(value)))
    .filter((value) => Number.isFinite(value));
  const points = (numeric.length ? numeric : D31_FALLBACK_POINTS)
    .slice()
    .sort((a, b) => a - b);
  const rawCmc = row.cmc_value || row.cmc || pickCmc(row.uucData);
  const cmcNum = Number(rawCmc);
  const cmc = (Number.isFinite(cmcNum) && cmcNum !== 0 ? cmcNum : 1.5).toFixed(1);
  return {
    type: "RADIUS_GAUGE_D31",
    internalPoints: generateD31Section(points, lc, lcDecimals, cmc),
    externalPoints: generateD31Section(points, lc, lcDecimals, cmc),
  };
}

export const D32_ID_RE = /U-D32|U-D33|U-D34/i;
const D32_SIZES = [0, 50, 100, 150, 200, 250, 300];

export function isD32Row(row = {}) {
  return [
    row.instrumentId,
    row.uuc_id,
    row.descriptionOfUUC,
    row.uucData?.id,
    row.uucData?.remark,
  ].some((value) => D32_ID_RE.test(String(value || "")));
}

export function isD32Readings(readings) {
  return Boolean(
    readings &&
      !Array.isArray(readings) &&
      String(readings.type || "").toUpperCase() === "MASTER_MEASUREMENT_D32" &&
      Array.isArray(readings.points),
  );
}

function generateD32Readings(row = {}) {
  const rawMax = row.rangeMax ?? row.range_max ?? row.uucData?.range_max;
  const parsedMax = Number(rawMax);
  const maxRange =
    rawMax === "" || rawMax == null || !Number.isFinite(parsedMax) || parsedMax <= 0
      ? 300
      : parsedMax;
  const uucLcStr = String(row.lc || row.leastCount || "0.01");
  const uucDecimals = uucLcStr.includes(".") ? uucLcStr.split(".")[1].length : 2;
  const validSizes = D32_SIZES.filter((size) => size <= maxRange + 1e-9);
  const wanted = Math.random() > 0.5 ? 3 : 4;
  const errorIndices = [];
  while (errorIndices.length < wanted && errorIndices.length < validSizes.length) {
    const randIdx = Math.floor(Math.random() * validSizes.length);
    if (!errorIndices.includes(randIdx)) errorIndices.push(randIdx);
  }
  const rawCmc = row.cmc_value || row.cmc || pickCmc(row.uucData);
  const cmcNum = Number(rawCmc);
  const cmc = (Number.isFinite(cmcNum) && cmcNum !== 0 ? cmcNum : 1.5).toFixed(3);
  const points = validSizes.map((stdVal, idx) => {
    let error = 0;
    if (errorIndices.includes(idx)) {
      const steps = Math.floor(Math.random() * 25) + 1;
      error = steps * 0.001 * (Math.random() > 0.5 ? 1 : -1);
    }
    return {
      standard: stdVal.toFixed(uucDecimals),
      uuc: (stdVal + error).toFixed(3),
      error: error.toFixed(3),
      cmc,
    };
  });
  return { type: "MASTER_MEASUREMENT_D32", points };
}

export function generateAutomatedReadings(row = {}) {
  if (isD32Row(row)) return generateD32Readings(row);
  if (isD31Row(row)) return generateD31Readings(row);
  if (isD19Row(row)) return generateD19Readings(row);
  if (isD22Row(row)) return generateD22Readings(row);
  if (isD21Row(row)) return generateD21Readings(row);
  if (isD20Row(row)) return generateD20Readings(row);
  if (isD18Row(row)) return generateD18Readings(row);
  if (isD42Row(row)) return generateD42Readings(row);
  if (isUtgRow(row)) return generateUtgReadings(row);
  if (isD25Row(row)) return generateD25Readings(row);
  if (isTapeRow(row)) return generateTapeReadings(row);
  if (isD17Row(row)) return generateD17Readings(row);
  if (isRodRow(row)) return generateRodReadings(row);
  if (isD09Row(row)) return generateD09Readings(row);
  if (isAngularRow(row)) return generateAngularReadings(row);
  if (isDimensionalUmRow(row)) return generateDimensionalUmReadings(row);
  if (isVernierRow(row)) return generateVernierReadings(row);
  if (isUaTachometerRow(row)) return generateTachometerReadings(row);
  if (isR09Row(row)) return generateR09Readings(row);
  if (isR10Row(row)) return generateR10Readings(row);
  if (isR14Row(row)) return generateR14Readings(row);
  if (
    isR15Row(row) ||
    String(row.template || "").toUpperCase() === "R-15"
  ) {
    return generateR15Readings(row);
  }
  if (isR12Row(row)) return generateR12Readings(row);
  if (isR11Row(row) || isE01Row(row) || isE02Row(row) || isElectroTechnicalRow(row)) {
    return generateElectroReadings(row);
  }
  const minText = String(row.rangeMin ?? row.range_min ?? "").trim();
  const maxText = String(row.rangeMax ?? row.range_max ?? "").trim();
  const lcText = String(row.leastCount ?? "").trim();
  const accText = String(row.accuracy ?? "").trim();
  if (!minText || !maxText || !lcText || !accText) return null;
  const range_min = Number(minText);
  const range_max = Number(maxText);
  const accuracy = Number(accText);
  if (
    !Number.isFinite(range_min) ||
    !Number.isFinite(range_max) ||
    !Number.isFinite(accuracy)
  ) {
    return null;
  }
  const pointCount = normalizePointCount(row.pointCount);
  const finalUucDecimals = pressureUucDecimals(lcText, row);
  const masterDecimals = finalUucDecimals + 2;
  const readings = [];
  for (const uucVal of uucPointValues(range_min, range_max, pointCount)) {
    // Vacuum and pressure sides of a compound gauge have different spans, so
    // the noise band is a percentage of the side currently being simulated.
    const localSpan = uucVal < 0 ? Math.abs(range_min) : range_max;
    const varianceLimit = (accuracy / 100) * localSpan * 0.5;
    let m1 = uucVal + (Math.random() * (2 * varianceLimit) - varianceLimit);
    let m2 = uucVal + (Math.random() * (2 * varianceLimit) - varianceLimit);
    if (uucVal === 0) {
      m1 = 0;
      m2 = 0;
    }
    const m1Text = m1.toFixed(masterDecimals);
    readings.push({
      parameter: "",
      uuc: uucVal.toFixed(finalUucDecimals),
      m1: m1Text,
      m2: m2.toFixed(masterDecimals),
      standard: m1Text,
    });
  }
  return readings;
}

export function makeEmptyReadings(count = READING_ROW_COUNT) {
  return Array.from({ length: count }, () => ({
    parameter: "",
    nominal: "",
    standard: "",
    m1: "",
    m2: "",
    uuc: "",
  }));
}

export function ensureReadings(readings, count) {
  const list = Array.isArray(readings)
    ? readings.map((row) => ({
        parameter: row?.parameter ?? row?.description ?? "",
        nominal: row?.nominal ?? "",
        standard: row?.standard ?? row?.m1 ?? "",
        m1: row?.m1 ?? row?.standard ?? "",
        m2: row?.m2 ?? "",
        uuc: row?.uuc ?? "",
      }))
    : [];
  // A generated set is already the right length for its point count, so only
  // fall back to the default when there is nothing to preserve.
  const target = Number.isFinite(Number(count))
    ? Number(count)
    : list.length || READING_ROW_COUNT;
  while (list.length < target) {
    list.push({ parameter: "", nominal: "", standard: "", m1: "", m2: "", uuc: "" });
  }
  return list.slice(0, target);
}

export function pickCmc(uuc) {
  if (!uuc) return "";
  if (uuc.cmc_min != null && uuc.cmc_min !== "") return uuc.cmc_min;
  if (uuc.cmc_max != null && uuc.cmc_max !== "") return uuc.cmc_max;
  return "";
}

const THREE_STEP_RE = /\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?\s*-\s*\d/;

export function isThreeStepRange(uucData, fallbackText = "") {
  const candidates = [
    uucData?.range_text,
    uucData?.range_min,
    uucData?.range_max,
    fallbackText,
  ];
  return candidates.some((value) => {
    if (value == null || value === "") return false;
    return THREE_STEP_RE.test(String(value));
  });
}

export function isOutsideUucRange(value, uucData, row = {}) {
  if (isThreeStepRange(uucData, row.rangeMin)) return false;
  const num = Number(value);
  if (!Number.isFinite(num)) return false;
  const min = Number(uucData?.range_min ?? row.rangeMin);
  const max = Number(uucData?.range_max ?? row.rangeMax);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
  return num < min || num > max;
}

function scaleDimensionalUmLimit(value) {
  const scaled = Math.round(Number(value) * 1000 * 1e6) / 1e6;
  return Object.is(scaled, -0) ? 0 : scaled;
}

function withDimensionalUmScale(limits, source) {
  if (!limits || !(isDimensionalUmRow(source) || isTapeRow(source))) return limits;
  return {
    min: scaleDimensionalUmLimit(limits.min),
    max: scaleDimensionalUmLimit(limits.max),
  };
}

function rejectEmptyLimits(limits) {
  if (!limits) return null;
  if (!Number.isFinite(limits.max) || Number(limits.max) === 0) return null;
  return limits;
}

export function authorizedLimits(uucData) {
  if (!uucData || isThreeStepRange(uucData)) return null;
  const authMin = Number(uucData.authorized_range_min);
  const authMax = Number(uucData.authorized_range_max);
  if (Number.isFinite(authMin) && Number.isFinite(authMax)) {
    return rejectEmptyLimits(withDimensionalUmScale({ min: authMin, max: authMax }, uucData));
  }
  const min = Number(uucData.range_min);
  const max = Number(uucData.range_max);
  if (Number.isFinite(min) && Number.isFinite(max)) {
    return rejectEmptyLimits(withDimensionalUmScale({ min, max }, uucData));
  }
  const nums = [uucData.range_min, uucData.range_max, uucData.range_text]
    .flatMap((value) => {
      if (value == null || value === "") return [];
      const text = String(value).trim();
      if (THREE_STEP_RE.test(text)) return [];
      if (/^-?\d+(?:\.\d+)?$/.test(text)) {
        const n = Number(text);
        return Number.isFinite(n) ? [n] : [];
      }
      return (text.match(/-?\d+(?:\.\d+)?/g) || [])
        .map(Number)
        .filter(Number.isFinite);
    });
  if (nums.length === 0) return null;
  return rejectEmptyLimits(withDimensionalUmScale(
    { min: Math.min(...nums), max: Math.max(...nums) },
    uucData,
  ));
}

export function limitsForRow(row) {
  if (!row) return null;
  return {
    template: row.template,
    result_used: row.result_used,
    is_test_row: row.is_test_row === true,
    uuc_id: row.uuc_id || row.instrumentId || row.uucData?.id,
    instrumentId: row.instrumentId,
    descriptionOfUUC: row.descriptionOfUUC,
    uucData: row.uucData,
    authorized_range_min:
      row.authorized_range_min ?? row.uucData?.authorized_range_min,
    authorized_range_max:
      row.authorized_range_max ?? row.uucData?.authorized_range_max,
    range_min: row.uucData?.range_min ?? row.authorized_range_min,
    range_max: row.uucData?.range_max ?? row.authorized_range_max,
    range_text: row.uucData?.range_text,
  };
}

function couldBecomeAuthorized(value, limits) {
  const text = String(value ?? "").trim();
  if (text === "" || text === "-" || text === "." || text === "-.") return true;
  const num = Number(text);
  if (!Number.isFinite(num)) return true;
  if (num >= limits.min && num <= limits.max) return true;
  if (num > limits.max) return false;
  if (text.includes(".") || num < 0) return false;
  for (let extraDigits = 1; extraDigits <= 8; extraDigits += 1) {
    const lo = num * 10 ** extraDigits;
    const hi = lo + 10 ** extraDigits - 1;
    if (lo > limits.max) break;
    if (hi >= limits.min && lo <= limits.max) return true;
  }
  return false;
}

export function isRangeInputOutsideAuthorized(value, source, options = {}) {
  if (
    options.bypass === true ||
    source?.is_test_row === true ||
    source?.template === "R-14" ||
    source?.template === "R-15" ||
    isR14Row(source) ||
    isR15Row(source) ||
    matchesR14UucId(
      source?.uuc_id,
      source?.instrumentId,
      source?.descriptionOfUUC,
      source?.uucData?.id,
    ) ||
    matchesR15UucId(
      source?.uuc_id,
      source?.instrumentId,
      source?.descriptionOfUUC,
      source?.uucData?.id,
    ) ||
    resultLayout(source?.template) === "R-14" ||
    resultLayout(source?.template) === "R-15"
  ) {
    return false;
  }
  const limits = authorizedLimits(source);
  if (!limits) return false;
  if (value == null || String(value).trim() === "") return false;
  const num = Number(value);
  if (!Number.isFinite(num)) return false;
  const outside =
    (limits.min != null && num < limits.min) ||
    (limits.max != null && num > limits.max);
  if (!outside) return false;
  if (options.whileTyping && couldBecomeAuthorized(value, limits)) return false;
  return true;
}

const STANDARD_KEYS_BY_LAYOUT = {
  "R-01": ["mean", "m1", "m2", "pindBar"],
  "R-02": ["pindKgCm2", "standard", "refStandard"],
  "R-03": ["pindKgCm2", "standard", "refStandard"],
  "R-05": ["masterReading"],
  "R-06": ["standard"],
  "R-07": ["standard"],
  "R-08": ["m1", "m2", "mean", "pindBar"],
  "R-09": ["refVal", "standard"],
  "R-10": ["standard", "nominal"],
  "R-11": ["stdVal", "std", "calPoint"],
  "E01": ["stdVal", "std"],
  "E02": ["stdVal", "std"],
  "R-12": ["refStandard", "range"],
  "R-14": ["ref", "nominal"],
  "R-15": ["refSec"],
  DEFAULT: ["m1", "m2", "mean", "pindBar"],
};

const UUC_KEYS_BY_LAYOUT = {
  "R-01": ["pindKgCm2"],
  "R-02": ["mean", "m1", "m2", "measured", "uuc"],
  "R-03": ["mean", "m1", "m2", "measured", "uuc"],
  "R-05": ["setOnUuc"],
  "R-06": ["measured"],
  "R-07": ["measured"],
  "R-08": ["pindKgCm2"],
  "R-09": ["uucVal", "uuc"],
  "R-10": ["uuc", "nominal"],
  "R-11": ["uucVal", "uuc"],
  "E01": ["uucVal", "uuc"],
  "E02": ["uucVal", "uuc"],
  "R-12": ["uucReading"],
  "R-14": ["uuc"],
  "R-15": ["uucSec"],
  DEFAULT: ["pindKgCm2"],
};

function keysForLayout(map, resultUsed) {
  const layout = resultLayout(resultUsed);
  return map[layout] || map.DEFAULT;
}

function formatLcValue(value, decimals) {
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return num.toFixed(decimals);
}

export function applyCalibrationFormats(rows, leastCount, cmcValue, resultUsed, options = {}) {
  const readingType = String(rows?.type || "").toUpperCase();
  if (readingType === "TACHOMETER" || readingType === "VERNIER" || readingType === "DIMENSIONAL_UM" || readingType === "ANGULAR_DEG_MIN" || readingType === "DIMENSIONAL_D09" || readingType === "CUBE_MOULD" || readingType === "TWO_COLUMN_RODS" || readingType === "DIMENSIONAL_D17" || readingType === "LENGTH_GAUGE_D17" || readingType === "MEASURING_TAPE_D23" || readingType === "MEASURING_D25" || readingType === "UTG_D40" || readingType === "DIMENSIONAL_D42" || readingType === "MICROMETER_D18" || readingType === "FILLET_WELD_D20" || readingType === "AGGREGATE_D21" || readingType === "TUBULAR_MICROMETER_D22" || readingType === "FEELER_GAUGE_D19" || readingType === "RADIUS_GAUGE_D31" || readingType === "MASTER_MEASUREMENT_D32") {
    return rows;
  }
  const uucDecimals = lcDecimals(leastCount);
  const standardDecimals = uucDecimals + 2;
  const cmcText =
    cmcValue != null && cmcValue !== "" ? String(cmcValue).trim() : "";
  const cmcBands = resolveCmcBands(options.cmcBands, options.cmc_bands, options);
  const standardKeys = keysForLayout(STANDARD_KEYS_BY_LAYOUT, resultUsed);
  const uucKeys = keysForLayout(UUC_KEYS_BY_LAYOUT, resultUsed);
  const errorKeys = ["deviation", "error", "errorExt", "errorInt", "hysteresis"];
  const layout = resultLayout(resultUsed);
  const skipLc =
    layout === "R-05" ||
    layout === "R-06" ||
    layout === "R-07" ||
    layout === "R-08" ||
    layout === "R-09" ||
    layout === "R-10" ||
    layout === "R-11" ||
    layout === "E01" ||
    layout === "E02" ||
    layout === "R-12" ||
    layout === "R-14" ||
    layout === "R-15";
  if (
    isElectroReadings(rows) ||
    isR12Readings(rows) ||
    isR14Readings(rows) ||
    isR15Readings(rows) ||
    isTachometerReadings(rows) ||
    isVernierReadings(rows) ||
    isDimensionalUmReadings(rows) ||
    isAngularReadings(rows) ||
    isD09Readings(rows) ||
    isRodReadings(rows) ||
    isD17Readings(rows) ||
    isTapeReadings(rows) ||
    isD25Readings(rows) ||
    isUtgReadings(rows) ||
    isD42Readings(rows) ||
    isD18Readings(rows) ||
    isD20Readings(rows) ||
    isD21Readings(rows) ||
    isD22Readings(rows) ||
    isD19Readings(rows) ||
    isD31Readings(rows) ||
    isD32Readings(rows) ||
    !Array.isArray(rows)
  ) {
    return rows;
  }
  return (rows || []).map((row) => {
    if (!row || row.kind === "group") return row;
    const next = { ...row };
    if (!skipLc) {
      standardKeys.forEach((key) => {
        if (next[key] != null && next[key] !== "") {
          next[key] = formatLcValue(next[key], standardDecimals);
        }
      });
      uucKeys.forEach((key) => {
        if (next[key] != null && next[key] !== "") {
          next[key] = formatLcValue(next[key], uucDecimals);
        }
      });
      errorKeys.forEach((key) => {
        if (next[key] != null && next[key] !== "") {
          next[key] = formatLcValue(next[key], uucDecimals);
        }
      });
    }
    const setPoint =
      next.pindKgCm2 ?? next.standard ?? next.setOnUuc ?? next.refStandard;
    const rowCmc =
      cmcBands.length > 0
        ? cmcForPoint(setPoint, cmcBands, cmcText)
        : cmcNumericText(cmcText);
    if (rowCmc) {
      next.expandedUncertainty = rowCmc;
      next.uncertainty = rowCmc;
      next.cmc_value = rowCmc;
    }
    return next;
  });
}

export function generateUucReading(standardReading, accuracy, lc, options = {}) {
  const standard = Number(standardReading);
  if (!Number.isFinite(standard)) return "";
  const band = isUaTachometerRow(options)
    ? 2
    : Number(accuracy);
  if (!Number.isFinite(band)) return "";
  const uuc = standard + (Math.random() * (2 * band) - band);
  return formatUucReading(uuc, lc);
}

function formatError(error, uucRaw, leastCount) {
  const decimals =
    leastCount != null && String(leastCount).trim() !== ""
      ? lcDecimals(leastCount)
      : String(uucRaw ?? "").includes(".")
        ? String(uucRaw).split(".")[1].length
        : leastCountDecimals("");
  return error.toFixed(decimals);
}

export function readingsToCalibrationData(readings, cmcValue, options = {}) {
  const cmc = cmcValue != null && cmcValue !== "" ? cmcValue : "";
  const accuracy = options.accuracy;
  const leastCount = options.leastCount;
  const fallbackParameter = options.parameter || "";
  const cmcBands = resolveCmcBands(options.cmcBands, options.cmc_bands, options);
  return ensureReadings(readings)
    .filter(
      (row) =>
        String(row.parameter ?? "").trim() !== "" ||
        String(row.standard ?? "").trim() !== "" ||
        String(row.uuc ?? "").trim() !== "",
    )
    .map((row) => {
      const standard = String(row.standard ?? "").trim();
      const uuc = String(row.uuc ?? "").trim();
      const parameter =
        String(row.parameter ?? row.description ?? "").trim() ||
        fallbackParameter;
      const standardNum = Number(standard);
      const uucNum = Number(uuc);
      const bothNumeric =
        Number.isFinite(standardNum) && Number.isFinite(uucNum);
      const error = bothNumeric
        ? formatError(uucNum - standardNum, uuc, leastCount)
        : "";
      const measured =
        bothNumeric && leastCount != null && String(leastCount).trim() !== ""
          ? formatUucReading(uucNum, leastCount)
          : uuc;
      const rowCmc =
        cmcBands.length > 0
          ? cmcForPoint(standard, cmcBands, cmc)
          : cmcNumericText(cmc);
      return {
        pindKgCm2: standard,
        pindBar: standard,
        m1: uuc,
        m2: uuc,
        mean: uuc,
        deviation: error,
        errorPercent: "",
        hysteresis: 0,
        expandedUncertainty: rowCmc,
        errorExt: error,
        errorInt: error,
        parameter,
        description: parameter,
        standard,
        standardTol: accuracy ?? "",
        measured,
        uuc,
        uucReading: uuc,
        refStandard: standard,
        setOnUuc: standard,
        masterReading: uuc,
        error,
        uncertainty: rowCmc,
        cmc_value: rowCmc,
      };
    });
}

function formatR08(value, digits) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return num.toFixed(digits);
}

function r08SourceValue(row, keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value != null && String(value).trim() !== "") return value;
  }
  return "";
}

// Compound CMCs are stored as one string ("0.0082 ; 0.4"). Vacuum readings
// take the first part and pressure readings take the last.
export function compoundCmcForReading(cmcValue, uucVal) {
  const raw =
    cmcValue == null || cmcValue === "" ? "" : String(cmcValue).trim();
  if (!raw) return "";
  if (!raw.includes(";") && !raw.includes("/")) return raw;
  const cmcParts = raw
    .split(/[;/]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const uucNum = Number(uucVal);
  if (cmcParts.length === 0 || !Number.isFinite(uucNum)) return raw;
  if (uucNum < 0) return cmcParts[0];
  if (uucNum > 0 && cmcParts.length > 1) return cmcParts[cmcParts.length - 1];
  if (uucNum === 0) return cmcParts[0];
  return raw;
}

function r08UucValue(row) {
  return r08SourceValue(row, ["uuc", "pindDisplay", "pindKgCm2", "pind"]);
}

function r08CmcSource(row, fallback = "") {
  return r08SourceValue(row, [
    "cmc_value",
    "expandedUncertainty",
    "uncertainty",
  ]) || fallback;
}

export function expandR08Rows(sourceRows, options = {}) {
  const key = normalizePressureUnit(options.unit);
  const map = options.toBar;
  const factor = map
    ? (map[key] ?? map[options.unit] ?? 1)
    : toBarFactor(options.unit);
  const lc = pressureUucDecimals(options.leastCount, options);
  const barDigits = lc + 2;
  const rangeMax = Number(options.rangeMax);
  const cmc =
    options.cmcValue != null && options.cmcValue !== ""
      ? String(options.cmcValue).trim()
      : "";

  return (sourceRows || [])
    .map((row) => {
      if (!row || row.kind === "group") return null;
      if (
        row.pindBar != null &&
        row.pindBar !== "" &&
        row.mean != null &&
        row.hysteresis != null &&
        row.m1 != null &&
        row.m2 != null
      ) {
        const rowCmc = compoundCmcForReading(r08CmcSource(row, cmc), r08UucValue(row));
        return {
          ...row,
          expandedUncertainty: rowCmc,
          uncertainty: rowCmc,
        };
      }
      const uucRaw = r08UucValue(row);
      const m1Raw = r08SourceValue(row, ["m1", "standard", "pstd"]);
      const m2Raw = r08SourceValue(row, ["m2"]);
      if (String(uucRaw).trim() === "") return null;
      const uuc = Number(uucRaw);
      if (!Number.isFinite(uuc)) return null;

      const uucBar = uuc * factor;
      const m1Src = Number(m1Raw);
      const m2Src = Number(m2Raw);
      const m1 =
        Number.isFinite(m1Src) ? m1Src * factor : uucBar;
      const m2 =
        Number.isFinite(m2Src) ? m2Src * factor : m1;
      const mean = (m1 + m2) / 2;
      const deviation = Math.abs(uucBar - mean);
      const fsdBar = Number.isFinite(rangeMax) ? rangeMax * factor : NaN;
      const errorPercent =
        Number.isFinite(fsdBar) && fsdBar !== 0
          ? (deviation / fsdBar) * 100
          : 0;
      const hysteresis = Math.abs(m2 - m1);
      const rowCmc = compoundCmcForReading(cmc, uuc);

      return {
        pindDisplay: formatR08(uuc, lc),
        pindKgCm2: formatR08(uuc, lc),
        pindBar: formatR08(uucBar, barDigits),
        m1: formatR08(m1, barDigits),
        m2: formatR08(m2, barDigits),
        mean: formatR08(mean, barDigits),
        deviation: formatR08(deviation, barDigits),
        errorPercent: formatR08(errorPercent, 2),
        hysteresis: formatR08(hysteresis, barDigits),
        expandedUncertainty: rowCmc,
        uncertainty: rowCmc,
        cmc_value: rowCmc,
      };
    })
    .filter(Boolean);
}
