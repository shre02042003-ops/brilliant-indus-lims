import dayjs from "dayjs";
import { makeEmptyReadings } from "./readings";

export const INITIAL_PARENT_ROW_COUNT = 10;

export function makeEmptyRow(key) {
  return {
    key, // stable React-list identity; Sr.No is derived from position, never stored here

    instrumentId: "U-",
    uuc_id: "U-",
    lastResolvedInstrumentId: "",
    descriptionOfUUC: "",
    lastResolvedDescription: "",
    uucSubType: "",
    unit: "",
    masterUnit: "",
    discipline: "",
    method: "",
    procedure: "",
    parameter: "",
    result_used: "",
    template: "",
    cmc: "",
    cmc_unit: "",
    cmc_min: "",
    cmc_max: "",
    cmc_bands: [],
    instrumentLoading: false,
    instrumentError: null,

    make: "",
    rangeMin: "",
    rangeMax: "",
    r12_unit: "V",
    r14_min_unit: "MΩ",
    r14_max_unit: "GΩ",
    test_voltage: "@5000V DC",
    dcv_min: "",
    dcv_max: "",
    dcv_min_unit: "V",
    dcv_max_unit: "V",
    acv_min: "",
    acv_max: "",
    acv_min_unit: "V",
    acv_max_unit: "V",
    dca_min: "",
    dca_max: "",
    dca_min_unit: "A",
    dca_max_unit: "A",
    aca_min: "",
    aca_max: "",
    aca_min_unit: "A",
    aca_max_unit: "A",
    res_min: "",
    res_max: "",
    res_min_unit: "Ω",
    res_max_unit: "Ω",
    rhRangeMin: "",
    rhRangeMax: "",
    rods: [],
    feeler_points: [],
    radius_points: [],
    authorized_range_min: null,
    authorized_range_max: null,
    leastCount: "",
    range_min: "",
    range_max: "",
    range_min_len: "",
    range_max_len: "",
    lc: "",
    lc_len: "",
    accuracy: "2.0",
    pointCount: 10,
    idNo: "",
    calDate: dayjs(),
    dueDate: dayjs().add(1, "year"),
    readings: makeEmptyReadings(),
    customPoints: [],

    masterLoading: false,
    masters: [],
    uucData: null,
    masterMatch: null,
    masterError: null,

    copyFromIndex: "",
    copyError: null,
    is_test_row: false,
  };
}

export function makeInitialParentRows() {
  return Array.from({ length: INITIAL_PARENT_ROW_COUNT }, (_, i) =>
    makeEmptyRow(i),
  );
}

function isBlankUucId(value) {
  const text = String(value ?? "").trim().toUpperCase();
  return !text || text === "U" || text === "U-";
}

export function isRowEmpty(row) {
  if (!row) return true;
  return (
    !row.descriptionOfUUC &&
    !row.make &&
    !row.rangeMin &&
    !row.rangeMax &&
    !row.dcv_min &&
    !row.dcv_max &&
    !row.acv_min &&
    !row.acv_max &&
    !row.dca_min &&
    !row.dca_max &&
    !row.aca_min &&
    !row.aca_max &&
    !row.res_min &&
    !row.res_max &&
    !row.rhRangeMin &&
    !row.rhRangeMax &&
    !row.leastCount &&
    !row.range_min_len &&
    !row.range_max_len &&
    !row.lc_len &&
    !row.idNo &&
    isBlankUucId(row.instrumentId) &&
    isBlankUucId(row.uuc_id)
  );
}
