const express = require("express");
const cors = require("cors");
const supabase = require("./supabaseClient");

const app = express();
app.use(cors());
app.use(express.json());

function firstVal(row, keys, fallback = undefined) {
  if (!row) return fallback;
  for (const key of keys) {
    if (row[key] != null && row[key] !== "") return row[key];
  }
  return fallback;
}

function mapCompany(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.address,
  };
}

function mapInstrument(row) {
  if (!row) return null;
  return {
    id: row.id,
    description: row.description,
    sub_type: row.sub_type ?? "",
    unit:
      row.unit ??
      row.uuc_unit ??
      row.parameter_unit ??
      row.display_unit ??
      row.si_unit ??
      "",
    master_unit: row.master_unit ?? row.unit_alt ?? "",
    discipline: row.discipline ?? "",
    method: row.method ?? row.method_of_measurement ?? "",
    procedure: row.procedure ?? row.cal_procedure ?? "",
    parameter: row.parameter ?? row.parameter_name ?? "",
    result_used: row.result_used ?? row.resultUsed ?? "",
    cmc_unit: row.cmc_unit ?? row.cmcUnit ?? "",
    cmc_min: row.cmc_min ?? row.cmcMin ?? null,
    authorized_range_min: row.authorized_range_min ?? null,
    authorized_range_max: row.authorized_range_max ?? null,
  };
}

function mapMaster(row) {
  if (!row) return null;
  return {
    id: row.id,
    sr_no: row.sr_no ?? 0,
    name: firstVal(row, ["equipment_name", "name"], ""),
    make: firstVal(row, ["make", "Make", "manufacturer"], "") || "",
    id_no: row.id_no,
    cal_agency: row.cal_agency,
    range_text: firstVal(row, ["range", "range_text"], ""),
    range_min: Number(row.range_min) || 0,
    range_max: Number(row.range_max) || 0,
    cert_no: firstVal(row, ["cert_no", "model_no"], ""),
    cal_date: row.cal_date ?? "",
    due_date: row.due_date ?? "",
    accuracy: row.accuracy ?? "",
    expanded_uncertainty: Number(row.expanded_uncertainty) || 0,
  };
}

function publicError(err) {
  if (!err) return "Unexpected server error";
  const code = err.cause?.code || err.code;
  if (
    err.message === "fetch failed" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    code === "UND_ERR_CONNECT_TIMEOUT"
  ) {
    return "Cannot reach Supabase. Check SUPABASE_URL in server/.env — copy Project URL from Supabase → Project Settings → API.";
  }
  if (
    /row-level security/i.test(err.message || "") ||
    err.code === "42501"
  ) {
    return "Supabase blocked this save (row-level security). In SQL Editor run the policies in server/rls-policies.sql, or set SUPABASE_SERVICE_ROLE_KEY in server/.env.";
  }
  return err.message || "Unexpected server error";
}

function nextId(ids, prefix) {
  const re = new RegExp(`^${prefix}(\\d+)$`);
  let max = 100;
  for (const id of ids) {
    const m = typeof id === "string" && id.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `${prefix}${max + 1}`;
}

async function allocateId(table, prefix) {
  const { data, error } = await supabase.from(table).select("id");
  if (error) throw error;
  return nextId((data || []).map((r) => r.id), prefix);
}

app.get("/api/companies", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, address")
      .order("id", { ascending: true });

    // Empty table, RLS filtering, or a query error must not 500 the UI —
    // the frontend expects a JSON array and maps `name` (not companyName).
    if (error) {
      console.error("GET /api/companies:", publicError(error));
      return res.json([]);
    }

    const rows = Array.isArray(data) ? data : [];
    res.json(rows.map(mapCompany));
  } catch (err) {
    console.error("GET /api/companies:", publicError(err));
    res.json([]);
  }
});

app.get("/api/companies/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: "Company not found" });
  }
  res.json(mapCompany(data));
});

async function findInstrument(raw) {
  const key = decodeURIComponent(String(raw || "")).trim();
  if (!key) return null;

  const byId = await supabase
    .from("uuc_registry")
    .select("*")
    .eq("id", key)
    .maybeSingle();
  if (byId.data) return byId.data;

  const byIdUpper = await supabase
    .from("uuc_registry")
    .select("*")
    .eq("id", key.toUpperCase())
    .maybeSingle();
  if (byIdUpper.data) return byIdUpper.data;

  const byDesc = await supabase
    .from("uuc_registry")
    .select("*")
    .ilike("description", key)
    .limit(5);
  const descRows = byDesc.data || [];
  const exactDesc = descRows.filter(
    (row) => String(row.description || "").toLowerCase() === key.toLowerCase(),
  );
  if (exactDesc.length === 1) return exactDesc[0];
  if (descRows.length === 1) return descRows[0];

  const partial = await supabase
    .from("uuc_registry")
    .select("*")
    .ilike("description", `%${key}%`)
    .limit(5);
  const partialRows = partial.data || [];
  if (partialRows.length === 1) return partialRows[0];

  const byRemark = await supabase
    .from("uuc_final")
    .select("*")
    .eq("remark", key.toUpperCase())
    .limit(1);
  if (byRemark.data && byRemark.data[0]) {
    const row = byRemark.data[0];
    return {
      id: firstVal(row, ["remark", "uuc_id"], key.toUpperCase()),
      description: firstVal(row, ["Description of UUC", "description"], ""),
      sub_type: "",
    };
  }

  const byFinalDesc = await supabase
    .from("uuc_final")
    .select("*")
    .ilike("Description of UUC", key)
    .limit(1);
  if (byFinalDesc.data && byFinalDesc.data[0]) {
    const row = byFinalDesc.data[0];
    return {
      id: firstVal(row, ["remark", "uuc_id"], ""),
      description: firstVal(row, ["Description of UUC", "description"], ""),
      sub_type: "",
    };
  }

  return null;
}

app.get("/api/instruments", async (req, res) => {
  const { data, error } = await supabase
    .from("uuc_registry")
    .select("*")
    .order("id");
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json((data || []).map(mapInstrument));
});

app.get("/api/instruments/:id", async (req, res) => {
  try {
    const data = await findInstrument(req.params.id);
    if (!data) {
      return res.status(404).json({ error: "Instrument not found" });
    }
    res.json(await withAuthorizedRange(await withCmcUnit(mapInstrument(data))));
  } catch (err) {
    res.status(500).json({ error: err.message || "Instrument lookup failed" });
  }
});

async function withCmcUnit(mapped) {
  if (!mapped?.id) return mapped;
  if (mapped.cmc_unit) return mapped;
  const { data, error } = await supabase
    .from("uuc_cmc_ranges")
    .select("cmc_unit")
    .eq("uuc_id", mapped.id)
    .limit(1);
  if (!error && data && data[0]) {
    mapped.cmc_unit = firstVal(data[0], ["cmc_unit"]) || mapped.unit || "";
  } else {
    mapped.cmc_unit = mapped.unit || "";
  }
  return mapped;
}

async function withAuthorizedRange(mapped) {
  if (!mapped?.id && !mapped?.description) return mapped;
  let result = mapped.id
    ? await fetchUucFinalRows(mapped.id)
    : { data: null, error: null };
  if (
    (!result.data || result.data.length === 0) &&
    mapped.description &&
    mapped.description !== mapped.id
  ) {
    result = await fetchUucFinalRows(mapped.description);
  }
  if (result.error || !result.data || result.data.length === 0) {
    return mapped;
  }
  const envelope = authorizedEnvelope(result.data);
  mapped.authorized_range_min = envelope.authorized_range_min;
  mapped.authorized_range_max = envelope.authorized_range_max;
  return mapped;
}

const UUC_ID_KEYS = ["uuc_id", "remark", "UUC ID"];
const RANGE_MIN_KEYS = ["range_min", "Range Min"];
const RANGE_MAX_KEYS = ["range_max", "Range Max"];
const MASTER_USED_KEYS = ["master_used", "Master Used"];
const RESULT_USED_KEYS = ["result_used", "Result Used"];
const CMC_MIN_KEYS = ["cmc_min", "CMC min"];
const CMC_MAX_KEYS = ["cmc_max", "CMC max"];
const CMC_UNIT_KEYS = ["cmc_unit", "CMC UNIT", "cmc unit"];
const UNIT_KEYS = ["unit", "Unit"];
const PARAMETER_KEYS = ["parameter", "Parameter"];
const DESCRIPTION_KEYS = ["description", "Description of UUC"];
const SR_KEYS = ["Sr. No.", "sr_no", "id"];

function parseUserRange(query) {
  const raw = firstVal(query, ["range", "rangeMax", "range_max"]);
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function rowHasNumericBand(row) {
  const minRaw = firstVal(row, RANGE_MIN_KEYS);
  const maxRaw = firstVal(row, RANGE_MAX_KEYS);
  if (minRaw == null || maxRaw == null) return false;
  const min = Number(minRaw);
  const max = Number(maxRaw);
  return Number.isFinite(min) && Number.isFinite(max);
}

function selectFinalRow(rows, userRange) {
  if (!rows.length) return null;
  const numericRows = rows.filter(rowHasNumericBand);
  if (userRange == null || numericRows.length === 0) {
    return rows[0];
  }
  return (
    numericRows.find((row) => {
      const min = Number(firstVal(row, RANGE_MIN_KEYS));
      const max = Number(firstVal(row, RANGE_MAX_KEYS));
      return userRange >= min && userRange <= max;
    }) || rows[0]
  );
}

function dedupeIds(ids) {
  const seen = new Set();
  const unique = [];
  for (const id of ids) {
    const key = id.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(id);
  }
  return unique;
}

// master_used may list several masters for one band, e.g. "M-D02; M-D16".
function parseMasterIds(masterUsed) {
  return dedupeIds(
    String(masterUsed || "")
      .split(/[;,&+\n]/)
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

function parseUserSpan(query) {
  const min = Number(firstVal(query, ["rangeMin", "range_min"]));
  const max = Number(firstVal(query, ["rangeMax", "range_max", "range"]));
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

function rowCovering(rows, value) {
  return (
    rows.filter(rowHasNumericBand).find((row) => {
      const min = Number(firstVal(row, RANGE_MIN_KEYS));
      const max = Number(firstVal(row, RANGE_MAX_KEYS));
      return value >= min && value <= max;
    }) || null
  );
}

// A compound (vacuum + pressure) UUC is stored as one uuc_final row per side,
// each naming its own master, so calibrating the full span needs both of them.
// Single-sided requests keep the existing one-band selection.
function mapCmcBands(rows) {
  return (rows || [])
    .filter(rowHasNumericBand)
    .map((row) => {
      const cmc = firstVal(row, CMC_MIN_KEYS);
      if (cmc == null || String(cmc).trim() === "") return null;
      return {
        range_min: Number(firstVal(row, RANGE_MIN_KEYS)),
        range_max: Number(firstVal(row, RANGE_MAX_KEYS)),
        cmc: String(cmc).trim(),
        cmc_unit:
          String(
            firstVal(row, CMC_UNIT_KEYS) || firstVal(row, UNIT_KEYS) || "",
          ).trim() || "",
      };
    })
    .filter(Boolean);
}

function rowsOverlappingSpan(rows, span) {
  if (!span) return [];
  return (rows || []).filter((row) => {
    if (!rowHasNumericBand(row)) return false;
    const min = Number(firstVal(row, RANGE_MIN_KEYS));
    const max = Number(firstVal(row, RANGE_MAX_KEYS));
    return max >= span.min && min <= span.max;
  });
}

function contributingRows(rows, span, selected) {
  const list = (rows || []).filter(Boolean);
  const isR09 = list.some((row) => {
    const used = String(firstVal(row, RESULT_USED_KEYS) || "")
      .trim()
      .toUpperCase();
    return used === "R-09";
  });
  if (isR09) return list.length ? list : [selected];
  // Multi-band UUCs (e.g. tachometer CMC tiers) — keep every band the
  // entered span touches so per-point uncertainty can follow Supabase.
  const overlapping = rowsOverlappingSpan(list, span);
  if (overlapping.length > 1) return overlapping;
  if (!span || !(span.min < 0 && span.max > 0)) return [selected];
  const sides = [rowCovering(rows, span.min), rowCovering(rows, span.max)];
  const unique = [...new Set(sides.filter(Boolean))];
  return unique.length ? unique : [selected];
}

function joinCmcWithUnits(rows) {
  const values = [];
  for (const row of rows) {
    const cmc = firstVal(row, CMC_MIN_KEYS);
    if (cmc == null || String(cmc).trim() === "") continue;
    const unit = firstVal(row, CMC_UNIT_KEYS) || firstVal(row, UNIT_KEYS) || "";
    const text = `${String(cmc).trim()}${unit ? ` ${String(unit).trim()}` : ""}`.trim();
    if (!values.includes(text)) values.push(text);
  }
  return values.join(" ; ");
}

function joinRowValues(rows, keys) {
  const values = [];
  for (const row of rows) {
    const value = firstVal(row, keys);
    if (value == null || String(value).trim() === "") continue;
    const text = String(value).trim();
    if (!values.includes(text)) values.push(text);
  }
  return values.join(" ; ");
}

// Compound CMC/master figures stay whole (e.g. "0.0082 ; 0.4") so the
// certificate can report every side, and the range covers the full span.
function isRhUnit(unit) {
  return /rh|humid/i.test(String(unit || ""));
}

function isTempUnit(unit) {
  const text = String(unit || "");
  if (isRhUnit(text)) return false;
  return /°\s*c|\bdeg|\bcelsius|\bc\b|temp/i.test(text);
}

function parseCombinedRangePairs(text) {
  const out = { temp: null, rh: null };
  const re =
    /(-?\d+(?:\.\d+)?)\s*(?:to|-|–)\s*(-?\d+(?:\.\d+)?)\s*(°\s*C|%?\s*RH|deg(?:ree)?s?\s*C|\bC\b)?/gi;
  let match = re.exec(String(text || ""));
  while (match) {
    const pair = { min: match[1], max: match[2] };
    const unit = match[3] || "";
    if (isRhUnit(unit)) out.rh = pair;
    else if (isTempUnit(unit) || /c/i.test(unit)) out.temp = pair;
    match = re.exec(String(text || ""));
  }
  return out;
}

function applyThermoHygrometerUuc(uuc, rows) {
  applyCompoundUuc(uuc, rows);
  let tempMin;
  let tempMax;
  let rhMin;
  let rhMax;
  for (const row of rows || []) {
    const unit = firstVal(row, UNIT_KEYS);
    const min = firstVal(row, RANGE_MIN_KEYS);
    const max = firstVal(row, RANGE_MAX_KEYS);
    if (min == null && max == null) continue;
    if (isRhUnit(unit)) {
      rhMin = min;
      rhMax = max;
    } else if (isTempUnit(unit) || !isRhUnit(unit)) {
      tempMin = min;
      tempMax = max;
    }
  }
  const combined = parseCombinedRangePairs(
    uuc.range_text || joinRowValues(rows, ["range_text", "Range Text", "Range"]),
  );
  if (combined.temp) {
    tempMin = tempMin ?? combined.temp.min;
    tempMax = tempMax ?? combined.temp.max;
  }
  if (combined.rh) {
    rhMin = rhMin ?? combined.rh.min;
    rhMax = rhMax ?? combined.rh.max;
  }
  if (tempMin != null && tempMin !== "") uuc.range_min = tempMin;
  if (tempMax != null && tempMax !== "") uuc.range_max = tempMax;
  uuc.rh_range_min = rhMin ?? uuc.rh_range_min ?? "";
  uuc.rh_range_max = rhMax ?? uuc.rh_range_max ?? "";
  uuc.range_text = `${uuc.range_min ?? ""} to ${uuc.range_max ?? ""} °C  &  ${uuc.rh_range_min || ""} to ${uuc.rh_range_max || ""} %RH`;
  return uuc;
}

function applyCompoundUuc(uuc, rows) {
  const mins = rows
    .map((row) => Number(firstVal(row, RANGE_MIN_KEYS)))
    .filter((n) => Number.isFinite(n));
  const maxs = rows
    .map((row) => Number(firstVal(row, RANGE_MAX_KEYS)))
    .filter((n) => Number.isFinite(n));
  uuc.cmc_min = joinCmcWithUnits(rows) || joinRowValues(rows, CMC_MIN_KEYS) || uuc.cmc_min;
  uuc.cmc_max = joinRowValues(rows, CMC_MAX_KEYS) || uuc.cmc_max;
  uuc.master_used = joinRowValues(rows, MASTER_USED_KEYS) || uuc.master_used;
  if (mins.length && maxs.length) {
    const min = Math.min(...mins);
    const max = Math.max(...maxs);
    uuc.range_min = min;
    uuc.range_max = max;
    uuc.range_text = `${min}-${max}`;
  }
  return uuc;
}

function mapRangeText(row) {
  const explicit = firstVal(row, ["range_text", "Range Text", "Range"]);
  if (explicit != null && explicit !== "") return String(explicit);
  const min = firstVal(row, RANGE_MIN_KEYS);
  const max = firstVal(row, RANGE_MAX_KEYS);
  if (min == null || min === "") return "";
  if (max == null || max === "") return String(min);
  return `${min}-${max}`;
}

function authorizedEnvelope(rows) {
  let min = Infinity;
  let max = -Infinity;
  let found = false;
  for (const row of rows || []) {
    if (!rowHasNumericBand(row)) continue;
    found = true;
    min = Math.min(min, Number(firstVal(row, RANGE_MIN_KEYS)));
    max = Math.max(max, Number(firstVal(row, RANGE_MAX_KEYS)));
  }
  if (!found) {
    return { authorized_range_min: null, authorized_range_max: null };
  }
  return { authorized_range_min: min, authorized_range_max: max };
}

function mapUucFinal(row, uucId, envelope = {}) {
  return {
    id: firstVal(row, UUC_ID_KEYS, uucId),
    description: firstVal(row, DESCRIPTION_KEYS, ""),
    sub_type: "",
    parameter: firstVal(row, PARAMETER_KEYS, "") || "",
    unit: firstVal(row, UNIT_KEYS, "") || "",
    result_used: firstVal(row, RESULT_USED_KEYS, "") || "",
    cmc_min: firstVal(row, CMC_MIN_KEYS, null),
    cmc_max: firstVal(row, CMC_MAX_KEYS, null),
    cmc_unit: firstVal(row, CMC_UNIT_KEYS, "") || "",
    master_used: firstVal(row, MASTER_USED_KEYS, "") || "",
    range_min: firstVal(row, RANGE_MIN_KEYS, null),
    range_max: firstVal(row, RANGE_MAX_KEYS, null),
    rh_range_min: "",
    rh_range_max: "",
    range_text: mapRangeText(row),
    make: firstVal(row, ["make", "Make"], "") || "",
    accuracy: firstVal(row, ["accuracy", "Accuracy"], "") || "",
    resolution:
      firstVal(
        row,
        ["resolution", "Resolution", "least_count", "leastCount", "LC", "lc"],
        "",
      ) || "",
    authorized_range_min: envelope.authorized_range_min ?? null,
    authorized_range_max: envelope.authorized_range_max ?? null,
  };
}

async function fetchUucFinalRows(uucId) {
  const key = String(uucId || "").trim();
  const byId = await supabase.from("uuc_final").select("*").eq("uuc_id", key);
  if (!byId.error && byId.data && byId.data.length) {
    return byId;
  }
  const byRemark = await supabase.from("uuc_final").select("*").eq("remark", key);
  if (!byRemark.error && byRemark.data && byRemark.data.length) {
    return byRemark;
  }
  const byRemarkUpper = await supabase
    .from("uuc_final")
    .select("*")
    .eq("remark", key.toUpperCase());
  if (!byRemarkUpper.error && byRemarkUpper.data && byRemarkUpper.data.length) {
    return byRemarkUpper;
  }
  const byDesc = await supabase
    .from("uuc_final")
    .select("*")
    .ilike("Description of UUC", key);
  const descMatch = rowsForSingleUuc(key, byDesc);
  if (descMatch) return descMatch;
  const byDescPartial = await supabase
    .from("uuc_final")
    .select("*")
    .ilike("Description of UUC", `%${key}%`);
  const partialMatch = rowsForSingleUuc(key, byDescPartial);
  if (partialMatch) return partialMatch;
  return byId.error && !byRemark.data ? byId : byRemark;
}

function rowsForSingleUuc(key, result) {
  if (result.error || !result.data || result.data.length === 0) return null;
  const remarks = [
    ...new Set(result.data.map((row) => row.remark || row.uuc_id)),
  ];
  if (remarks.length === 1) return result;
  const exact = result.data.filter(
    (row) =>
      String(row["Description of UUC"] || "").toLowerCase() ===
      String(key).toLowerCase(),
  );
  const exactRemarks = [
    ...new Set(exact.map((row) => row.remark || row.uuc_id)),
  ];
  if (exactRemarks.length === 1) return { data: exact, error: null };
  return null;
}

app.get("/api/match-master", async (req, res) => {
  const uucId = String(req.query.uuc_id || req.query.uucId || "").trim();
  if (!uucId) {
    return res.status(400).json({ error: "uuc_id is required" });
  }

  const { data: finalRows, error: finalError } = await fetchUucFinalRows(uucId);
  if (finalError) {
    return res.status(500).json({ error: finalError.message });
  }
  if (!finalRows || finalRows.length === 0) {
    return res.status(404).json({ error: "No uuc_final row for this UUC" });
  }

  const ordered = [...finalRows].sort((a, b) => {
    const sa = Number(firstVal(a, SR_KEYS, 0)) || 0;
    const sb = Number(firstVal(b, SR_KEYS, 0)) || 0;
    return sa - sb;
  });

  const userRange = parseUserRange(req.query);
  const selected = selectFinalRow(ordered, userRange);
  if (!selected) {
    return res.status(404).json({ error: "No uuc_final row for this UUC" });
  }

  const envelope = authorizedEnvelope(ordered);
  const uuc = mapUucFinal(selected, uucId, envelope);
  const cmc_bands = mapCmcBands(ordered);
  uuc.cmc_bands = cmc_bands;

  const rowsUsed = contributingRows(ordered, parseUserSpan(req.query), selected);
  const usedR09 =
    String(uuc.result_used || "").toUpperCase() === "R-09" ||
    String(uucId).toUpperCase().includes("U-T01") ||
    rowsUsed.some(
      (row) =>
        String(firstVal(row, RESULT_USED_KEYS) || "")
          .trim()
          .toUpperCase() === "R-09",
    );
  if (usedR09) {
    applyThermoHygrometerUuc(uuc, rowsUsed.length ? rowsUsed : ordered);
  } else if (rowsUsed.length > 1) {
    applyCompoundUuc(uuc, rowsUsed);
  }

  const masterIds = dedupeIds(
    rowsUsed.flatMap((row) => parseMasterIds(firstVal(row, MASTER_USED_KEYS))),
  );
  if (masterIds.length === 0) {
    return res.status(404).json({ error: "No masters listed in master_used" });
  }

  const { data: masterRows, error: masterError } = await supabase
    .from("master_fullnfinal")
    .select("*")
    .in("id", masterIds);
  if (masterError) {
    return res.status(500).json({ error: masterError.message });
  }

  const byId = new Map(
    (masterRows || []).map((row) => [String(row.id).trim().toUpperCase(), row]),
  );
  const masters = masterIds
    .map((id) => byId.get(id.toUpperCase()))
    .filter(Boolean)
    .map(mapMaster);

  if (masters.length === 0) {
    return res.status(404).json({ error: "Listed master not found in master_fullnfinal" });
  }

  res.json({
    masters,
    uuc,
    result_used: uuc.result_used,
    cmc_min: uuc.cmc_min,
    cmc_max: uuc.cmc_max,
    cmc_unit: uuc.cmc_unit,
    cmc_bands,
    unit: uuc.unit,
    parameter: uuc.parameter,
    range_min: uuc.range_min,
    range_max: uuc.range_max,
    rh_range_min: uuc.rh_range_min,
    rh_range_max: uuc.rh_range_max,
    range_text: uuc.range_text,
    make: uuc.make,
    accuracy: uuc.accuracy,
    resolution: uuc.resolution,
    authorized_range_min: uuc.authorized_range_min,
    authorized_range_max: uuc.authorized_range_max,
  });
});

app.post("/api/companies", async (req, res) => {
  const { name, address } = req.body || {};
  if (!name || !address) {
    return res.status(400).json({ error: "name and address are required" });
  }
  try {
    const id = await allocateId("companies", "C");
    const { data, error } = await supabase
      .from("companies")
      .insert({ id, name, address })
      .select()
      .single();
    if (error) {
      return res.status(500).json({ error: publicError(error) });
    }
    res.status(201).json(mapCompany(data));
  } catch (err) {
    res.status(500).json({ error: publicError(err) });
  }
});

app.post("/api/instruments", async (req, res) => {
  const { description, sub_type } = req.body || {};
  if (!description) {
    return res.status(400).json({ error: "description is required" });
  }
  try {
    const id = await allocateId("uuc_registry", "U");
    const { data, error } = await supabase
      .from("uuc_registry")
      .insert({ id, description, sub_type: sub_type || "" })
      .select()
      .single();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(mapInstrument(data));
  } catch (err) {
    res
      .status(500)
      .json({ error: err.message || "Failed to create instrument" });
  }
});

app.post("/api/masters", async (req, res) => {
  const body = req.body || {};
  const rangeMaxNum = Number(body.range_max);
  if (
    !body.name ||
    !body.id_no ||
    !body.cal_agency ||
    !body.range_text ||
    !body.range_max ||
    isNaN(rangeMaxNum) ||
    rangeMaxNum <= 0
  ) {
    return res.status(400).json({
      error:
        "name, id_no, cal_agency, range_text and a valid range_max are required",
    });
  }
  try {
    const id = await allocateId("master_instruments", "M");
    const { data: existing, error: srError } = await supabase
      .from("master_instruments")
      .select("sr_no")
      .order("sr_no", { ascending: false })
      .limit(1);
    if (srError) {
      return res.status(500).json({ error: srError.message });
    }
    const srNo = (existing && existing[0] && existing[0].sr_no
      ? Number(existing[0].sr_no)
      : 0) + 1;

    const payload = {
      id,
      sr_no: srNo,
      name: body.name,
      id_no: body.id_no,
      cal_agency: body.cal_agency,
      range_text: body.range_text,
      range_min: body.range_min ?? 0,
      range_max: rangeMaxNum,
      cert_no: body.cert_no ?? "",
      cal_date: body.cal_date ?? "",
      due_date: body.due_date ?? "",
      expanded_uncertainty: body.expanded_uncertainty ?? 0,
    };

    const { data, error } = await supabase
      .from("master_instruments")
      .insert(payload)
      .select()
      .single();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(mapMaster(data));
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to create master" });
  }
});

app.get("/api/masters", async (req, res) => {
  const { data, error } = await supabase
    .from("master_fullnfinal")
    .select("*")
    .order("sr_no");
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json((data || []).map(mapMaster));
});

app.get("/api/masters/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("master_fullnfinal")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: "Master not found" });
  }
  res.json(mapMaster(data));
});

const PORT = Number(process.env.PORT) || 3001;
const server = app.listen(PORT);

server.on("listening", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process using that port and try again.`,
    );
  } else {
    console.error("Failed to start server:", err);
  }
  process.exit(1);
});
