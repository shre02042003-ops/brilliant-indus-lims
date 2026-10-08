import { resultLayout } from "./resultTable";
import {
  applyCalibrationFormats,
  expandR08Rows,
  generateAutomatedReadings,
  isR15Row,
  isUaTachometerRow,
  isVernierRow,
  isDimensionalUmRow,
  isAngularRow,
  isRodRow,
  isD09Row,
  isD17Row,
  isTapeRow,
  isD25Row,
  isUtgRow,
  isD42Row,
  isD18Row,
  isD20Row,
  isD21Row,
  isD22Row,
  isD19Row,
  isD31Row,
  isD32Row,
  matchesR15UucId,
  cmcForPoint,
  resolveCmcBands,
} from "./readings";
import { toBarFactor } from "./pressureUnits";

const KG_CM2_TO_BAR = 0.9806;

const ACCURACY_FRACTIONS = {
  0.25: 0.0025,
  0.5: 0.005,
  "1.0": 0.01,
  1.6: 0.016,
  "2.0": 0.02,
  2.5: 0.025,
  "4.0": 0.04,
};

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function round4(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return parseFloat(num.toFixed(4));
}

export function generateCalibrationData(
  uucRangeMax,
  accuracyPercent,
  equipment,
  conversionFactor = KG_CM2_TO_BAR,
  options = {},
) {
  if (!uucRangeMax || !accuracyPercent || !equipment) return [];

  const factor = Number(conversionFactor);
  const convert = Number.isFinite(factor) ? factor : KG_CM2_TO_BAR;
  const tachometer = isUaTachometerRow(options);

  const fsdUuc = uucRangeMax;
  const fsdMaster = fsdUuc * convert;
  const accuracyFraction = ACCURACY_FRACTIONS[String(accuracyPercent)] || 0.02;
  // U-A01 / U-A02: ignore accuracy % — readings only drift by ±2 RPM.
  const accuracyBand = tachometer ? 2 : accuracyFraction * fsdMaster;

  const rowValues = [];
  for (let i = 0; i <= 5; i++) {
    rowValues.push(round4((fsdUuc / 5) * i));
  }

  const rng = seededRandom(42);
  const cmcBands = resolveCmcBands(options.cmcBands, options.cmc_bands, options);
  const fallbackCmc =
    options.cmcValue != null && options.cmcValue !== ""
      ? options.cmcValue
      : equipment.expanded_uncertainty;

  return rowValues.map((pindUuc, idx) => {
    const pindMaster = round4(pindUuc * convert);

    if (idx === 0) {
      const zeroCmc = cmcBands.length
        ? cmcForPoint(0, cmcBands, fallbackCmc)
        : round4(fallbackCmc);
      return {
        pindKgCm2: pindUuc,
        pindBar: 0,
        m1: 0,
        m2: 0,
        mean: 0,
        deviation: 0,
        errorPercent: 0,
        hysteresis: 0,
        expandedUncertainty: zeroCmc,
        errorExt: 0,
        errorInt: 0,
      };
    }

    const hysteresisOffset = tachometer
      ? (rng() - 0.5) * 4
      : accuracyBand * 0.04;
    const noise1 = tachometer ? 0 : (rng() - 0.5) * 0.02;
    const noise2 = tachometer ? 0 : (rng() - 0.5) * 0.02;

    const nominal = pindMaster;

    if (tachometer) {
      const deviation = round4(Math.max(-2, Math.min(2, hysteresisOffset)));
      const measured = round4(nominal + deviation);
      const rowCmc = cmcBands.length
        ? cmcForPoint(pindUuc, cmcBands, fallbackCmc)
        : round4(fallbackCmc);
      return {
        pindKgCm2: pindUuc,
        pindBar: pindMaster,
        m1: measured,
        m2: measured,
        mean: measured,
        deviation,
        errorPercent: 0,
        hysteresis: 0,
        expandedUncertainty: rowCmc,
        errorExt: deviation,
        errorInt: deviation,
      };
    }

    let m1 = round4(nominal - hysteresisOffset + noise1);
    let m2 = round4(nominal + hysteresisOffset + noise2);

    if (m1 < 0) m1 = 0;
    if (m2 < 0) m2 = 0;

    const mean = round4((m1 + m2) / 2);
    const deviation = round4(mean - pindMaster);
    const errorPercent = parseFloat(((deviation / fsdMaster) * 100).toFixed(2));
    const hysteresis = round4(Math.abs(m2 - m1));
    const errorExt = round4(m1 - pindMaster);
    const errorInt = round4(m2 - pindMaster);
    const rowCmc = cmcBands.length
      ? cmcForPoint(pindUuc, cmcBands, fallbackCmc)
      : round4(equipment.expanded_uncertainty);

    return {
      pindKgCm2: pindUuc,
      pindBar: pindMaster,
      m1,
      m2,
      mean,
      deviation,
      errorPercent,
      hysteresis,
      expandedUncertainty: rowCmc,
      errorExt,
      errorInt,
    };
  });
}

function randomErrorUnder1mm(rng) {
  const magnitude = 0.05 + rng() * 0.9;
  return parseFloat(((rng() < 0.5 ? -1 : 1) * magnitude).toFixed(2));
}

const R06_PARAMETERS = [
  "Internal Width Between Opposite Face1",
  "Internal Width Between Opposite Face2",
  "Internal Height",
];

function generateR06Data({ rangeMax, accuracy, cmcValue, equipment } = {}) {
  const raw = rangeMax == null ? "" : String(rangeMax).trim();
  const nominal = Number(raw);
  if (!raw || !Number.isFinite(nominal)) return [];
  const uncertainty =
    cmcValue != null && cmcValue !== ""
      ? cmcValue
      : equipment?.expanded_uncertainty ?? "";
  const rng = seededRandom(42);
  return R06_PARAMETERS.map((parameter) => {
    const error = randomErrorUnder1mm(rng);
    const measured = parseFloat((nominal + error).toFixed(2));
    return {
      parameter,
      standard: raw,
      standardTol: accuracy ?? "",
      measured,
      error,
      uncertainty,
    };
  });
}

function generateR05Data({ rangeMax, equipment, parameter, description } = {}) {
  const maxDeg = Number(rangeMax) > 0 ? Number(rangeMax) : 90;
  const rng = seededRandom(42);
  const title =
    description || parameter || "Angular Measurement of Protractor Head";
  const uncertainty = equipment?.expanded_uncertainty;
  return [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const setDeg = Math.round(fraction * maxDeg);
    const masterMin = 1 + Math.floor(rng() * 9);
    return {
      description: title,
      setOnUuc: `${setDeg}:00`,
      masterReading: `${setDeg}:${String(masterMin).padStart(2, "0")}`,
      error: `0:${String(masterMin).padStart(2, "0")}`,
      setOnUucDeg: setDeg,
      setOnUucMin: 0,
      masterDeg: setDeg,
      masterMin,
      errorDeg: 0,
      errorMin: masterMin,
      uncertainty,
    };
  });
}

function generateR07Data({ equipment, cmcValue } = {}) {
  const uncertainty = 25;
  const rng = seededRandom(42);
  const sieves = [
    { passing: "50", retained: "40", standard: 81.5 },
    { passing: "40", retained: "25", standard: 58.5 },
    { passing: "25", retained: "20", standard: 40.58 },
    { passing: "20", retained: "16", standard: 32.41 },
    { passing: "16", retained: "12.5", standard: 25.62 },
    { passing: "12.5", retained: "10", standard: 20.18 },
    { passing: "10", retained: "6.3", standard: 14.67 },
  ];
  return sieves.map((row) => {
    const error = randomErrorUnder1mm(rng);
    const measured = parseFloat((row.standard + error).toFixed(2));
    return {
      passing: row.passing,
      retained: row.retained,
      standard: row.standard,
      measured,
      error,
      uncertainty,
    };
  });
}

function generateR08Data(opts = {}) {
  const source = generateAutomatedReadings({
    rangeMin: opts.rangeMin ?? 0,
    rangeMax: opts.rangeMax,
    leastCount: opts.leastCount || "0.01",
    accuracy: opts.accuracy || "2.0",
    pointCount: opts.pointCount,
    instrumentId: opts.instrumentId,
    descriptionOfUUC: opts.descriptionOfUUC,
    result_used: opts.result_used || "R-08",
  });
  if (!source) return [];
  return expandR08Rows(source, {
    ...opts,
    result_used: opts.result_used || "R-08",
  });
}

export function generateResultTableData(resultUsed, opts = {}) {
  const layoutRaw = resultLayout(resultUsed);
  const layout =
    isR15Row(opts) ||
    matchesR15UucId(
      opts.instrumentId,
      opts.uuc_id,
      opts.descriptionOfUUC,
    ) ||
    String(opts.template || "").toUpperCase() === "R-15"
      ? "R-15"
      : layoutRaw;
  let rows;
  if (layout === "R-05") rows = generateR05Data(opts);
  else if (isD09Row(opts)) {
    return (
      generateAutomatedReadings({
        ...opts,
        rangeMax: opts.rangeMax,
        leastCount: opts.leastCount,
        lc: opts.leastCount,
        cmc_value: opts.cmcValue,
        cmc: opts.cmcValue,
      }) || { type: "CUBE_MOULD", points: [] }
    );
  }
  else if (layout === "R-06") rows = generateR06Data(opts);
  else if (isD32Row(opts)) {
    return (
      generateAutomatedReadings({
        ...opts,
        rangeMax: opts.rangeMax,
        leastCount: opts.leastCount,
        lc: opts.leastCount,
        cmc_value: opts.cmcValue,
        cmc: opts.cmcValue,
      }) || { type: "MASTER_MEASUREMENT_D32", points: [] }
    );
  }
  else if (isD31Row(opts)) {
    return (
      generateAutomatedReadings({
        ...opts,
        leastCount: opts.leastCount,
        lc: opts.leastCount,
        cmc_value: opts.cmcValue,
        cmc: opts.cmcValue,
        radius_points: opts.radius_points,
      }) || { type: "RADIUS_GAUGE_D31", internalPoints: [], externalPoints: [] }
    );
  }
  else if (isD19Row(opts)) {
    return (
      generateAutomatedReadings({
        ...opts,
        leastCount: opts.leastCount,
        lc: opts.leastCount,
        cmc_value: opts.cmcValue,
        cmc: opts.cmcValue,
        feeler_points: opts.feeler_points,
      }) || { type: "FEELER_GAUGE_D19", points: [] }
    );
  }
  else if (isD22Row(opts)) {
    return (
      generateAutomatedReadings({
        ...opts,
        leastCount: opts.leastCount,
        lc: opts.leastCount,
        cmc_value: opts.cmcValue,
        cmc: opts.cmcValue,
        rods: opts.rods,
      }) || { type: "TUBULAR_MICROMETER_D22", micPoints: [], extPoints: [] }
    );
  }
  else if (isD21Row(opts)) {
    return (
      generateAutomatedReadings({
        ...opts,
        leastCount: opts.leastCount,
        lc: opts.leastCount,
        cmc_value: opts.cmcValue,
        cmc: opts.cmcValue,
      }) || { type: "AGGREGATE_D21", points: [] }
    );
  }
  else if (isD20Row(opts)) {
    return (
      generateAutomatedReadings(opts) || { type: "FILLET_WELD_D20", lengthPoints: [], anglePoints: [] }
    );
  }
  else if (isD18Row(opts)) {
    return (
      generateAutomatedReadings({
        ...opts,
        leastCount: opts.leastCount,
        lc: opts.leastCount,
        cmc_value: opts.cmcValue,
        cmc: opts.cmcValue,
      }) || { type: "MICROMETER_D18", points: [] }
    );
  }
  else if (isD42Row(opts)) {
    return (
      generateAutomatedReadings({
        ...opts,
        leastCount: opts.leastCount,
        lc: opts.leastCount,
        cmc_value: opts.cmcValue,
        cmc: opts.cmcValue,
      }) || { type: "DIMENSIONAL_D42", points: [] }
    );
  }
  else if (isUtgRow(opts)) {
    return (
      generateAutomatedReadings({
        ...opts,
        leastCount: opts.leastCount,
        lc: opts.leastCount,
        cmc_value: opts.cmcValue,
        cmc: opts.cmcValue,
      }) || { type: "UTG_D40", points: [] }
    );
  }
  else if (isD25Row(opts)) {
    return (
      generateAutomatedReadings({
        ...opts,
        rangeMin: opts.rangeMin,
        rangeMax: opts.rangeMax,
        leastCount: opts.leastCount,
        lc: opts.leastCount,
        pointCount: opts.pointCount,
      }) || { type: "MEASURING_D25", points: [] }
    );
  }
  else if (isTapeRow(opts)) {
    return (
      generateAutomatedReadings({
        ...opts,
        rangeMax: opts.rangeMax,
        leastCount: opts.leastCount,
        lc: opts.leastCount,
      }) || { type: "MEASURING_TAPE_D23", points: [] }
    );
  }
  else if (isD17Row(opts)) {
    return (
      generateAutomatedReadings({
        ...opts,
        leastCount: opts.leastCount,
        lc: opts.leastCount,
        cmc_value: opts.cmcValue,
        cmc: opts.cmcValue,
      }) || { type: "LENGTH_GAUGE_D17", points: [] }
    );
  }
  else if (layout === "R-07") rows = generateR07Data(opts);
  else if (layout === "R-08") rows = generateR08Data(opts);
  else if (layout === "R-09") {
    return (
      generateAutomatedReadings({
        ...opts,
        result_used: opts.result_used || "R-09",
      }) || { rh: [], temp: [] }
    );
  }
  else if (layout === "R-10") {
    return (
      generateAutomatedReadings({
        ...opts,
        result_used: opts.result_used || "R-10",
      }) || []
    );
  }
  else if (layout === "R-11") {
    return (
      generateAutomatedReadings({
        ...opts,
        result_used: opts.result_used || "R-11",
      }) || []
    );
  }
  else if (layout === "E01" || layout === "E02") {
    return (
      generateAutomatedReadings({
        ...opts,
        result_used: opts.result_used || layout,
      }) || []
    );
  }
  else if (layout === "R-12") {
    return (
      generateAutomatedReadings({
        ...opts,
        result_used: opts.result_used || "R-12",
        r12_unit: opts.r12_unit,
      }) || { parameter: "", unit: "", rangeMax: "", points: [] }
    );
  }
  else if (layout === "R-14") {
    return (
      generateAutomatedReadings({
        ...opts,
        result_used: opts.result_used || "R-14",
        template: opts.template || "R-14",
        test_voltage: opts.test_voltage,
        r14_min_unit: opts.r14_min_unit,
        r14_max_unit: opts.r14_max_unit,
      }) || { test_voltage: opts.test_voltage || "@5000V DC", parameter: "RESISTANCE", tiers: [] }
    );
  }
  else if (layout === "R-15") {
    return (
      generateAutomatedReadings({
        ...opts,
        result_used: opts.result_used || "R-15",
        template: opts.template || "R-15",
      }) || { points: [] }
    );
  }
  else if (isRodRow(opts)) {
    return (
      generateAutomatedReadings({
        ...opts,
        rangeMin: opts.rangeMin,
        rangeMax: opts.rangeMax,
        leastCount: opts.leastCount,
        lc: opts.leastCount,
        rods: opts.rods,
      }) || { type: "TWO_COLUMN_RODS", points: [] }
    );
  }
  else if (isAngularRow(opts)) {
    return (
      generateAutomatedReadings({
        ...opts,
        description: opts.description || opts.descriptionOfUUC,
        cmc_value: opts.cmcValue,
        cmc: opts.cmcValue,
        cmc_bands: opts.cmcBands || opts.cmc_bands,
      }) || { type: "ANGULAR_DEG_MIN", points: [], description: "" }
    );
  }
  else if (isDimensionalUmRow(opts)) {
    return (
      generateAutomatedReadings({
        ...opts,
        rangeMin: opts.rangeMin,
        rangeMax: opts.rangeMax,
        leastCount: opts.leastCount,
        lc: opts.leastCount,
        cmc_value: opts.cmcValue,
        cmc: opts.cmcValue,
        cmc_bands: opts.cmcBands || opts.cmc_bands,
      }) || { type: "DIMENSIONAL_UM", points: [] }
    );
  }
  else if (isVernierRow(opts)) {
    return (
      generateAutomatedReadings({
        ...opts,
        rangeMin: opts.rangeMin,
        rangeMax: opts.rangeMax,
        leastCount: opts.leastCount,
        lc: opts.leastCount,
        cmc_value: opts.cmcValue,
        cmc: opts.cmcValue,
        cmc_bands: opts.cmcBands || opts.cmc_bands,
      }) || { type: "VERNIER", points: [] }
    );
  }
  else if (isUaTachometerRow(opts)) {
    return (
      generateAutomatedReadings({
        ...opts,
        rangeMin: opts.rangeMin,
        rangeMax: opts.rangeMax,
        pointCount: opts.pointCount,
        cmc_bands: opts.cmcBands || opts.cmc_bands,
        cmc_value: opts.cmcValue,
        cmc: opts.cmcValue,
      }) || { type: "TACHOMETER", points: [] }
    );
  }
  else {
    rows = generateCalibrationData(
      opts.rangeMax,
      opts.accuracy,
      opts.equipment,
      opts.conversionFactor,
      opts,
    );
  }
  return applyCalibrationFormats(
    rows,
    opts.leastCount,
    opts.cmcValue,
    resultUsed,
    { cmcBands: opts.cmcBands || opts.cmc_bands },
  );
}
