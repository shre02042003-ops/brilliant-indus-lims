export const RESULT_CODES = {
  R01: "R-01",
  R02: "R-02",
  R03: "R-03",
  R05: "R-05",
  R06: "R-06",
  R07: "R-07",
  R08: "R-08",
  R09: "R-09",
  R10: "R-10",
  R11: "R-11",
  R12: "R-12",
  R14: "R-14",
  R15: "R-15",
  E01: "E01",
  E02: "E02",
};

const KNOWN_LAYOUTS = new Set(Object.values(RESULT_CODES));

const LAYOUT_ALIASES = {
  "R-30": "R-11",
  R14: "R-14",
  R15: "R-15",
  "E-01": "E01",
  "E-02": "E02",
};

export function normalizeResultUsed(value) {
  return String(value || "").trim().toUpperCase();
}

export function resultLayout(resultUsed) {
  const code = LAYOUT_ALIASES[normalizeResultUsed(resultUsed)] || normalizeResultUsed(resultUsed);
  if (KNOWN_LAYOUTS.has(code)) return code;
  return "DEFAULT";
}

export function resultUnit(uucData, profile) {
  return String(uucData?.unit || profile?.uucUnit || "").trim();
}

export function cmcUnit(uucData, profile) {
  return String(
    uucData?.cmc_unit || uucData?.cmcUnit || resultUnit(uucData, profile),
  ).trim();
}

export function uncertaintyUnitLabel(uucData, profile) {
  const unit = cmcUnit(uucData, profile);
  return unit ? `± ${unit}` : "±";
}

/** Strip unit text from CMC strings like "4.1 RPM" → "4.1". */
export function cmcNumericText(cmc) {
  const raw = String(cmc ?? "").trim();
  if (!raw) return "";
  const match = raw.match(/-?\d+(?:\.\d+)?/);
  return match ? match[0] : raw;
}

/**
 * Pick CMC for a set-point from Supabase uuc_final bands
 * (e.g. U-A02: 100–1000→2, 1000–5000→2.45, …).
 * On overlaps, the tightest band wins; outside all bands, nearest band.
 */
export function cmcForPoint(value, bands, fallback = "") {
  const fallbackText = cmcNumericText(fallback);
  if (!Array.isArray(bands) || bands.length === 0) return fallbackText;
  const num = Number(value);
  if (!Number.isFinite(num)) return fallbackText;

  const normalized = bands
    .map((band) => ({
      min: Number(band.range_min ?? band.min),
      max: Number(band.range_max ?? band.max),
      cmc: cmcNumericText(band.cmc ?? band.cmc_min),
    }))
    .filter(
      (band) =>
        Number.isFinite(band.min) &&
        Number.isFinite(band.max) &&
        band.cmc !== "",
    );
  if (!normalized.length) return fallbackText;

  const covering = normalized.filter(
    (band) => num >= band.min && num <= band.max,
  );
  if (covering.length) {
    covering.sort((a, b) => a.max - a.min - (b.max - b.min));
    return covering[0].cmc;
  }

  let best = normalized[0];
  let bestDist = Infinity;
  for (const band of normalized) {
    const dist =
      num < band.min ? band.min - num : num > band.max ? num - band.max : 0;
    if (dist < bestDist) {
      bestDist = dist;
      best = band;
    }
  }
  return best.cmc || fallbackText;
}

export function resolveCmcBands(...sources) {
  for (const source of sources) {
    if (!source) continue;
    if (Array.isArray(source) && source.length) return source;
    if (Array.isArray(source.cmc_bands) && source.cmc_bands.length) {
      return source.cmc_bands;
    }
    if (Array.isArray(source.cmcBands) && source.cmcBands.length) {
      return source.cmcBands;
    }
  }
  return [];
}

export function formatNum(value, digits = 4) {
  if (value == null || value === "") return " ";
  const num = Number(typeof value === "string" ? value.trim() : value);
  if (!Number.isFinite(num)) return String(value);
  return num.toFixed(digits);
}

/** R-02 / vernier: print preformatted slip-gauge strings as-is. */
export function r02CellText(row, keys) {
  if (!row) return " ";
  const preformatted =
    row.type === "VERNIER" ||
    row.uuc_ext != null ||
    row.error_ext != null;
  for (const key of keys) {
    const value = row[key];
    if (value == null || value === "") continue;
    if (preformatted) return String(value);
    return formatNum(value);
  }
  return " ";
}

/** R-01 / tachometer: print preformatted strings as-is (no trailing .0000). */
export function r01CellText(row, keys) {
  if (!row) return " ";
  const preformatted =
    row.type === "TACHOMETER" ||
    row.set_rpm != null ||
    row.master_rpm != null;
  for (const key of keys) {
    const value = row[key];
    if (value == null || value === "") continue;
    if (preformatted) return String(value);
    return formatNum(value);
  }
  return " ";
}

export function formatUncertainty(row, cmcValue) {
  const fromRow = row?.expandedUncertainty ?? row?.uncertainty ?? row?.cmc_value;
  const numeric = Number(fromRow);
  const emptyOrZero =
    fromRow == null ||
    fromRow === "" ||
    (Number.isFinite(numeric) && numeric === 0);
  const value =
    emptyOrZero && cmcValue != null && cmcValue !== "" ? cmcValue : fromRow;
  return formatNum(value);
}

export function withCmcValue(rows, cmcValue, options = {}) {
  const cmcText =
    cmcValue != null && cmcValue !== "" ? String(cmcValue).trim() : "";
  const cmcBands = resolveCmcBands(options.cmcBands, options.cmc_bands, options);
  if (!cmcText && !cmcBands.length) return rows || [];
  return (rows || []).map((row) => {
    if (!row || row.kind === "group") return row;
    if (row.type === "TACHOMETER" || row.set_rpm != null) return row;
    const setPoint =
      row.pindKgCm2 ?? row.standard ?? row.setOnUuc ?? row.refStandard;
    const fromBands =
      cmcBands.length > 0 ? cmcForPoint(setPoint, cmcBands, cmcText) : "";
    const current = row.expandedUncertainty ?? row.uncertainty ?? row.cmc_value;
    const n = Number(current);
    const emptyOrZero =
      current == null ||
      current === "" ||
      (Number.isFinite(n) && n === 0);
    // Prefer band CMC when available so multi-tier UUCs (U-A02) vary per point.
    const chosen =
      fromBands ||
      (!emptyOrZero ? String(current) : "") ||
      cmcNumericText(cmcText);
    if (!chosen) return row;
    return {
      ...row,
      expandedUncertainty: String(chosen),
      uncertainty: String(chosen),
      cmc_value: String(chosen),
    };
  });
}

export function resultRows(data, minRows = 6) {
  const rows = Array.isArray(data) ? data : [];
  if (rows.length >= minRows) return rows;
  return [...rows, ...Array.from({ length: minRows - rows.length }, () => ({}))];
}

export function cellText(value) {
  if (value == null || value === "") return " ";
  return String(value);
}

export function formatSignedTolerance(value) {
  if (value == null || value === "") return " ";
  const text = String(value).trim();
  if (!text) return " ";
  if (text.startsWith("±") || text.startsWith("+-")) return text;
  return `± ${text}`;
}

export function r06DataRows(rows) {
  return (rows || []).filter(
    (row) =>
      row &&
      row.kind !== "group" &&
      (String(row.parameter || "").trim() !== "" ||
        String(row.standard || "").trim() !== "" ||
        String(row.measured || row.uuc || "").trim() !== ""),
  );
}

export const R05_DEFAULT_DESCRIPTION = "Angular Measurement of Protractor Head";

export function r05AngleUnits(unit) {
  const raw = String(unit || "").trim();
  const lower = raw.toLowerCase();
  if (!raw || lower.includes("deg") || lower.includes("degree") || lower === "°") {
    return { major: "deg", minor: "min" };
  }
  return { major: raw, minor: "min" };
}

export function formatAnglePart(value) {
  if (value == null || value === "") return " ";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return String(num);
}

function emptyAngle() {
  return { deg: "", min: "" };
}

function hasAngleParts(value) {
  return (
    value &&
    typeof value === "object" &&
    (value.deg != null ||
      value.min != null ||
      value.degrees != null ||
      value.minutes != null)
  );
}

export function parseAngleToDegMin(value) {
  if (value == null || value === "") return emptyAngle();
  if (hasAngleParts(value)) {
    const deg = value.deg ?? value.degrees ?? "";
    const min = value.min ?? value.minutes ?? "";
    if (deg === "" && min === "") return emptyAngle();
    return { deg, min };
  }
  const text = String(value).trim();
  if (!text) return emptyAngle();

  const dms = text.match(
    /^(-?\d+(?:\.\d+)?)\s*(?:°|deg(?:ree)?s?)?\s*[:\s]\s*(-?\d+(?:\.\d+)?)\s*(?:'|min(?:ute)?s? of arc)?\s*$/i,
  );
  if (dms) return { deg: Number(dms[1]), min: Number(dms[2]) };

  if (/^-?\d+(?:\.\d+)?$/.test(text)) {
    const negative = text.startsWith("-");
    const unsigned = negative ? text.slice(1) : text;
    const [degPart, minPart] = unsigned.split(".");
    const deg = Number(degPart) * (negative ? -1 : 1);
    const min = minPart == null || minPart === "" ? 0 : Number(minPart);
    return { deg, min };
  }

  return { deg: text, min: "" };
}

function angleToTotalMinutes(parts) {
  const deg = Number(parts?.deg);
  const min = Number(parts?.min);
  const hasDeg = Number.isFinite(deg);
  const hasMin = Number.isFinite(min);
  if (!hasDeg && !hasMin) return null;
  return (hasDeg ? deg : 0) * 60 + (hasMin ? min : 0);
}

function totalMinutesToAngle(total) {
  if (!Number.isFinite(total)) return emptyAngle();
  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  const deg = Math.floor(abs / 60);
  const min = abs - deg * 60;
  if (deg === 0 && sign < 0) return { deg: 0, min: -min };
  return { deg: sign * deg, min };
}

function anglePartsFromRow(row, degKey, minKey, fallbackKey) {
  if (row?.[degKey] != null && row[degKey] !== "") {
    return parseAngleToDegMin({ deg: row[degKey], min: row[minKey] });
  }
  return parseAngleToDegMin(row?.[fallbackKey]);
}

export function expandR05Rows(rows) {
  return (rows || []).map((row) => {
    if (!row || row.kind === "group") return row;
    const uuc = anglePartsFromRow(row, "setOnUucDeg", "setOnUucMin", "setOnUuc");
    const master = anglePartsFromRow(
      row,
      "masterDeg",
      "masterMin",
      "masterReading",
    );
    const uucDeg = Number.isFinite(Number(uuc.deg)) ? Number(uuc.deg) : uuc.deg;
    const masterDeg = Number.isFinite(Number(master.deg))
      ? Number(master.deg)
      : master.deg;
    const uucMinutes = 0;
    const masterMinutes = r05MasterMinutes(master.min);
    const uucParts = { deg: uucDeg, min: uucMinutes };
    const masterParts = { deg: masterDeg, min: masterMinutes };
    const uucTotal = angleToTotalMinutes(uucParts);
    const masterTotal = angleToTotalMinutes(masterParts);
    const error =
      uucTotal != null && masterTotal != null
        ? totalMinutesToAngle(masterTotal - uucTotal)
        : { deg: 0, min: masterMinutes };
    return {
      ...row,
      setOnUucDeg: uucDeg,
      setOnUucMin: uucMinutes,
      masterDeg,
      masterMin: masterMinutes,
      errorDeg: error.deg,
      errorMin: error.min,
    };
  });
}

function r05MasterMinutes(value) {
  const n = Math.abs(Number(value));
  if (!Number.isFinite(n)) return 1;
  const digit = Math.round(n) % 10;
  return digit === 0 ? 1 : digit;
}
