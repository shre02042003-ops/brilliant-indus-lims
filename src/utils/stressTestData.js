import dayjs from "dayjs";
import { ACCURACY_OPTIONS } from "./accuracyOptions";
import { makeEmptyRow } from "./emptyBulkRow";
import {
  inferElectroTemplate,
  overrideFetchedUucTemplate,
  persistElectroResultUsed,
  preserveManualElectroCustomPoints,
} from "./readings";
import { resultLayout as layoutOf } from "./resultTable";

function coerceAccuracy(value) {
  const raw = String(value || "").trim();
  if (ACCURACY_OPTIONS.some((opt) => opt.value === raw)) return raw;
  const num = Number(raw);
  if (!Number.isFinite(num)) return "1.0";
  let best = "1.0";
  let bestDiff = Infinity;
  for (const opt of ACCURACY_OPTIONS) {
    const diff = Math.abs(Number(opt.value) - num);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = opt.value;
    }
  }
  return best;
}

const TEST_CAL_DATE = dayjs("2026-09-08");

export function generateMockRow(uuc = {}, baseEmptyRow = makeEmptyRow(0)) {
  const fetched = overrideFetchedUucTemplate({
    ...uuc,
    uuc_id: uuc.uuc_id || uuc.id,
    instrumentId: uuc.instrumentId || uuc.id,
    descriptionOfUUC: uuc.description || uuc.name || "",
    result_used: uuc.result_used || uuc.template || "",
  });
  const id = String(fetched.uuc_id || fetched.id || fetched.instrumentId || "");
  const inferred = inferElectroTemplate(
    { instrumentId: id, descriptionOfUUC: fetched.description || id },
    fetched,
  );
  let template =
    inferred ||
    fetched.template ||
    fetched.result_used ||
    "";

  const mockData = {
    ...baseEmptyRow,
    instrumentId: id,
    descriptionOfUUC: fetched.description || fetched.name || id || "Test Instrument",
    lastResolvedDescription:
      fetched.description || fetched.name || id || "Test Instrument",
    uucSubType: fetched.sub_type || "",
    template,
    result_used: persistElectroResultUsed(template, fetched.result_used) || template,
    make: fetched.make || "TestMake",
    accuracy: coerceAccuracy(fetched.accuracy || "1.0"),
    leastCount: String(
      fetched.resolution || fetched.leastCount || fetched.least_count || "0.01",
    ),
    calDate: TEST_CAL_DATE,
    dueDate: TEST_CAL_DATE.add(1, "year"),
    pointCount: 5,
    is_test_row: true,
    unit: fetched.unit || "",
    masterUnit: fetched.master_unit || "",
    discipline: fetched.discipline || "",
    method: fetched.method || "",
    procedure: fetched.procedure || "",
    parameter: fetched.parameter || "",
    cmc: fetched.cmc_min ?? fetched.cmc ?? "",
    cmc_min: fetched.cmc_min ?? "",
    cmc_unit: fetched.cmc_unit || "",
    cmc_bands: Array.isArray(fetched.cmc_bands) ? fetched.cmc_bands : [],
    authorized_range_min: fetched.authorized_range_min ?? null,
    authorized_range_max: fetched.authorized_range_max ?? null,
    uucData: fetched,
  };

  const temp = String(mockData.template || mockData.result_used || "").trim();
  const layout = layoutOf(temp);

  if (temp === "E01" || temp === "E02" || temp === "R-11" || layout === "E01" || layout === "E02" || layout === "R-11") {
    mockData.customPoints = preserveManualElectroCustomPoints([
      { parameter: "DC VOLTAGE", unit: "V", value: 10 },
      { parameter: "AC VOLTAGE (50 Hz)", unit: "V", value: 230 },
    ]);
    mockData.dcv_min = "0";
    mockData.dcv_max = "10";
    mockData.acv_min = "0";
    mockData.acv_max = "230";
  } else if (temp === "R-12" || layout === "R-12" || /U-E03|U-E04|U-E05|U-E06/i.test(id)) {
    mockData.template = "R-12";
    mockData.result_used = "R-12";
    mockData.rangeMin = "0";
    mockData.rangeMax = "300";
    mockData.r12_unit = "V";
  } else if (/U-E09/i.test(id)) {
    mockData.template = "R-14";
    mockData.result_used = "R-14";
    mockData.rangeMin = "1";
    mockData.rangeMax = "100";
    mockData.test_voltage = "@500V DC";
  } else if (/U-E10|U-E11/i.test(id)) {
    mockData.template = "R-14";
    mockData.result_used = "R-14";
    mockData.rangeMin = "5";
    mockData.rangeMax = "10";
    mockData.test_voltage = "@5000V DC";
  } else if (temp === "R-15" || layout === "R-15" || /U-E12|U-E13/i.test(id)) {
    mockData.template = "R-15";
    mockData.result_used = "R-15";
    mockData.rangeMin = "5";
    mockData.rangeMax = "60";
  } else if (temp === "R-09" || layout === "R-09" || /U-T01/i.test(id)) {
    mockData.template = "R-09";
    mockData.result_used = "R-09";
    mockData.rhRangeMin = "30";
    mockData.rhRangeMax = "90";
    mockData.rangeMin = "20";
    mockData.rangeMax = "50";
  } else if (temp === "R-10" || layout === "R-10") {
    mockData.rangeMin = String(
      fetched.range_min ??
        fetched.authorized_range_min ??
        uuc.range_min ??
        "0",
    );
    mockData.rangeMax = String(
      fetched.range_max ??
        fetched.authorized_range_max ??
        uuc.range_max ??
        "100",
    );
  } else {
    const min =
      uuc.range_min ??
      uuc.rangeMin ??
      fetched.range_min ??
      fetched.authorized_range_min;
    const max =
      uuc.range_max ??
      uuc.rangeMax ??
      fetched.range_max ??
      fetched.authorized_range_max;
    mockData.rangeMin = min !== undefined && min !== null ? String(min) : "0";
    mockData.rangeMax = max !== undefined && max !== null ? String(max) : "100";
  }

  return mockData;
}

export function mapInstrumentsToMockRows(instruments = []) {
  const stamp = Date.now();
  return instruments.map((uuc, idx) =>
    generateMockRow(uuc, makeEmptyRow(stamp + idx)),
  );
}
