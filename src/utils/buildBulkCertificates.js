import axios from "axios";
import dayjs from "dayjs";
import { isRowEmpty } from "./emptyBulkRow";
import { generateResultTableData } from "./calculations";
import { getCertificateProfile } from "./certificateProfile";
import { normalizeMatchPayload, primaryMaster } from "./mappedMasters";
import { pickCmc, readingsToCalibrationData, applyCalibrationFormats, expandR08Rows, ensureReadings, generateUucReading, generateAutomatedReadings, isR09Readings, isR10Readings, isElectroReadings, isR12Readings, isR14Readings, isR15Readings, inferElectroTemplate, persistElectroResultUsed, isR15Row, matchesR15UucId, isUaTachometerRow, isTachometerReadings, isVernierRow, isVernierReadings, isDimensionalUmRow, isDimensionalUmReadings, isAngularRow, isAngularReadings, isD09Row, isD09Readings, isRodRow, isRodReadings, isD17Row, isD17Readings, isTapeRow, isTapeReadings, isD25Row, isD25Readings, isUtgRow, isUtgReadings, isD42Row, isD42Readings, isD18Row, isD18Readings, isD20Row, isD20Readings, isD21Row, isD21Readings, isD22Row, isD22Readings, isD19Row, isD19Readings, isD31Row, isD31Readings, isD32Row, isD32Readings, hasReadings, resolveCmcBands } from "./readings";
import { resultLayout } from "./resultTable";
import { incrementStringNumber } from "./incrementStringNumber";

function formatDate(value) {
  if (!value) return "";
  return dayjs(value).isValid() ? dayjs(value).format("DD.MM.YYYY") : "";
}

async function ensureMaster(row) {
  const uucId = (row.instrumentId || "").trim();
  if (!uucId) {
    throw new Error("Missing UUC id");
  }
  const res = await axios.get("/api/match-master", {
    params: {
      uuc_id: uucId,
      rangeMax: row.rangeMax || undefined,
      rangeMin: row.rangeMin || undefined,
    },
  });
  return normalizeMatchPayload(res.data);
}

export async function buildBulkCertificates(company, rows, batchDetails = {}) {
  if (!company?.id || !company?.name) {
    throw new Error("Fetch a company before submitting.");
  }

  const filled = rows.filter((r) => !isRowEmpty(r));
  if (filled.length === 0) {
    throw new Error("Add at least one completed row.");
  }

  const certificates = [];
  const skipped = [];
  let certSeq = 0;

  for (let i = 0; i < filled.length; i++) {
    const row = filled[i];
    const rowLabel = `Row ${i + 1}`;
    try {
      const { masters, uuc } = await ensureMaster(row);
      if (!masters.length) {
        skipped.push(`${rowLabel}: no mapped masters`);
        continue;
      }
      const uucData = {
        descriptionOfUUC: row.descriptionOfUUC,
        uucSubType: row.uucSubType,
        master_unit: row.masterUnit,
        discipline: row.discipline,
        method: row.method,
        procedure: row.procedure,
        parameter: row.parameter,
        result_used: row.result_used,
        cmc_unit: row.cmc_unit,
        ...(uuc || {}),
        unit: row.unit || uuc?.unit,
      };
      const profile = getCertificateProfile(uucData);
      const rangeMax = Number(row.rangeMax);
      const cmcValue = row.cmc || pickCmc(uucData);
      const cmcBands = resolveCmcBands(
        row.cmc_bands,
        uucData.cmc_bands,
        uuc?.cmc_bands,
      );
      const template = inferElectroTemplate(row, uucData);
      const resultUsed =
        persistElectroResultUsed(
          template,
          profile.result_used || uucData.result_used || row.result_used || row.template,
        ) || template;
      const layoutRaw = resultLayout(resultUsed);
      const layout =
        isR15Row(row) ||
        matchesR15UucId(
          row.instrumentId,
          row.uuc_id,
          row.descriptionOfUUC,
        )
          ? "R-15"
          : layoutRaw;
      const r08Opts = {
        unit: row.unit || uucData.unit,
        leastCount: row.leastCount,
        rangeMax: row.rangeMax,
        cmcValue,
        instrumentId: row.instrumentId,
        descriptionOfUUC: row.descriptionOfUUC,
        result_used: resultUsed,
        uucData,
      };
      const sourceReadings = (() => {
        if (layout === "R-09") {
          if (isR09Readings(row.readings)) return row.readings;
          return (
            generateAutomatedReadings({ ...row, result_used: resultUsed }) ||
            row.readings
          );
        }
        if (layout === "R-10") {
          if (isR10Readings(row.readings)) return row.readings;
          return (
            generateAutomatedReadings({ ...row, result_used: resultUsed }) ||
            row.readings
          );
        }
        if (layout === "R-11") {
          if (isElectroReadings(row.readings)) return row.readings;
          return (
            generateAutomatedReadings({ ...row, result_used: resultUsed }) ||
            row.readings
          );
        }
        if (layout === "E01" || layout === "E02") {
          return (
            generateAutomatedReadings({
              ...row,
              result_used: resultUsed,
              customPoints: row.customPoints,
            }) || row.readings
          );
        }
        if (layout === "R-12") {
          return (
            generateAutomatedReadings({
              ...row,
              result_used: resultUsed,
              template: row.template || "R-12",
              r12_unit: row.r12_unit,
            }) || row.readings
          );
        }
        if (layout === "R-14") {
          return (
            generateAutomatedReadings({
              ...row,
              result_used: resultUsed,
              template: row.template || "R-14",
              test_voltage: row.test_voltage,
              r14_min_unit: row.r14_min_unit,
              r14_max_unit: row.r14_max_unit,
            }) || row.readings
          );
        }
        if (layout === "R-15") {
          return (
            generateAutomatedReadings({
              ...row,
              result_used: resultUsed,
              template: row.template || "R-15",
            }) || row.readings
          );
        }
        // U-A01 / U-A02 return { type: "TACHOMETER", points: [...] } — never treat as an array.
        if (isUaTachometerRow(row) || isUaTachometerRow(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        if (isVernierRow(row) || isVernierRow(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        if (isDimensionalUmRow(row) || isDimensionalUmRow(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        if (isAngularRow(row) || isAngularRow(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        if (isD09Row(row) || isD09Row(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        if (isRodRow(row) || isRodRow(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        if (isD17Row(row) || isD17Row(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        if (isTapeRow(row) || isTapeRow(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        if (isD25Row(row) || isD25Row(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        if (isUtgRow(row) || isUtgRow(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        if (isD42Row(row) || isD42Row(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        if (isD18Row(row) || isD18Row(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        if (isD20Row(row) || isD20Row(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        if (isD21Row(row) || isD21Row(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        if (isD22Row(row) || isD22Row(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        if (isD19Row(row) || isD19Row(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        if (isD31Row(row) || isD31Row(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        if (isD32Row(row) || isD32Row(uucData)) {
          return generateAutomatedReadings(row) || row.readings;
        }
        const hasReadingsData = Array.isArray(row.readings)
          ? row.readings.length > 0
          : hasReadings(row.readings);
        const filled =
          Array.isArray(row.readings) &&
          row.readings.some(
            (reading) =>
              (String(reading?.nominal || "").trim() !== "" &&
                String(reading?.standard || "").trim() !== "" &&
                String(reading?.uuc || "").trim() !== "") ||
              (String(reading?.m1 || "").trim() !== "" &&
                String(reading?.m2 || "").trim() !== "" &&
                String(reading?.uuc || "").trim() !== ""),
          );
        if (filled || hasReadingsData) {
          if (isTachometerReadings(row.readings)) return row.readings;
          if (filled) return row.readings;
        }
        return generateAutomatedReadings(row) || row.readings;
      })();
      const readingsReady =
        isR09Readings(sourceReadings) ||
        isElectroReadings(sourceReadings) ||
        isR12Readings(sourceReadings) ||
        isR14Readings(sourceReadings) ||
        isR15Readings(sourceReadings) ||
        isTachometerReadings(sourceReadings) ||
        isVernierReadings(sourceReadings) ||
        isDimensionalUmReadings(sourceReadings) ||
        isAngularReadings(sourceReadings) ||
        isD09Readings(sourceReadings) ||
        isRodReadings(sourceReadings) ||
        isD17Readings(sourceReadings) ||
        isTapeReadings(sourceReadings) ||
        isD25Readings(sourceReadings) ||
        isUtgReadings(sourceReadings) ||
        isD42Readings(sourceReadings) ||
        isD18Readings(sourceReadings) ||
        isD20Readings(sourceReadings) ||
        isD21Readings(sourceReadings) ||
        isD22Readings(sourceReadings) ||
        isD19Readings(sourceReadings) ||
        isD31Readings(sourceReadings) ||
        isD32Readings(sourceReadings)
        ? sourceReadings
        : ensureReadings(sourceReadings).map((reading) => {
        const hasStd =
          String(reading.standard || "").trim() !== "" ||
          String(reading.m1 || "").trim() !== "";
        const hasUuc = String(reading.uuc || "").trim() !== "";
        if (hasStd && !hasUuc) {
          return {
            ...reading,
            uuc: generateUucReading(reading.standard, row.accuracy, row.leastCount, {
              instrumentId: row.instrumentId,
              descriptionOfUUC: row.descriptionOfUUC,
              uucData,
            }),
          };
        }
        return reading;
      });
      const fromReadings =
        isR09Readings(readingsReady) ||
        isElectroReadings(readingsReady) ||
        isR12Readings(readingsReady) ||
        isR14Readings(readingsReady) ||
        isR15Readings(readingsReady) ||
        isTachometerReadings(readingsReady) ||
        isVernierReadings(readingsReady) ||
        isDimensionalUmReadings(readingsReady) ||
        isAngularReadings(readingsReady) ||
        isD09Readings(readingsReady) ||
        isRodReadings(readingsReady) ||
        isD17Readings(readingsReady) ||
        isTapeReadings(readingsReady) ||
        isD25Readings(readingsReady) ||
        isUtgReadings(readingsReady) ||
        isD42Readings(readingsReady) ||
        isD18Readings(readingsReady) ||
        isD20Readings(readingsReady) ||
        isD21Readings(readingsReady) ||
        isD22Readings(readingsReady) ||
        isD19Readings(readingsReady) ||
        isD31Readings(readingsReady) ||
        isD32Readings(readingsReady)
        ? readingsReady
        : applyCalibrationFormats(
        readingsToCalibrationData(readingsReady, cmcValue, {
          accuracy: row.accuracy,
          leastCount: row.leastCount,
          cmcBands,
        }),
        row.leastCount,
        cmcValue,
        resultUsed,
        { cmcBands },
      );
      const fromR08Readings =
        isR09Readings(readingsReady) ||
        isElectroReadings(readingsReady) ||
        isR12Readings(readingsReady) ||
        isR14Readings(readingsReady) ||
        isR15Readings(readingsReady) ||
        isTachometerReadings(readingsReady) ||
        isVernierReadings(readingsReady) ||
        isDimensionalUmReadings(readingsReady) ||
        isAngularReadings(readingsReady) ||
        isD09Readings(readingsReady) ||
        isRodReadings(readingsReady) ||
        isD17Readings(readingsReady) ||
        isTapeReadings(readingsReady) ||
        isD25Readings(readingsReady) ||
        isUtgReadings(readingsReady) ||
        isD42Readings(readingsReady) ||
        isD18Readings(readingsReady) ||
        isD20Readings(readingsReady) ||
        isD21Readings(readingsReady) ||
        isD22Readings(readingsReady) ||
        isD19Readings(readingsReady) ||
        isD31Readings(readingsReady) ||
        isD32Readings(readingsReady)
        ? []
        : expandR08Rows(readingsReady, r08Opts);
      const generated = () =>
        generateResultTableData(resultUsed, {
          rods: row.rods,
          rangeMax: layout === "R-06" || layout === "R-07" ? row.rangeMax : rangeMax,
          rangeMin: row.rangeMin,
          accuracy: row.accuracy,
          equipment: primaryMaster({ masters }),
          conversionFactor: profile.conversionFactor,
          leastCount: row.leastCount,
          pointCount: row.pointCount,
          cmcValue,
          cmcBands,
          parameter: uucData.parameter,
          description: uucData.parameter,
          unit: row.unit || uucData.unit,
          instrumentId: row.instrumentId,
          descriptionOfUUC: row.descriptionOfUUC,
          result_used: resultUsed,
          customPoints: row.customPoints,
          r12_unit: row.r12_unit,
          template,
          test_voltage: row.test_voltage,
          r14_min_unit: row.r14_min_unit,
          r14_max_unit: row.r14_max_unit,
          dcv_min: row.dcv_min,
          dcv_max: row.dcv_max,
          dcv_min_unit: row.dcv_min_unit,
          dcv_max_unit: row.dcv_max_unit,
          acv_min: row.acv_min,
          acv_max: row.acv_max,
          acv_min_unit: row.acv_min_unit,
          acv_max_unit: row.acv_max_unit,
          dca_min: row.dca_min,
          dca_max: row.dca_max,
          dca_min_unit: row.dca_min_unit,
          dca_max_unit: row.dca_max_unit,
          aca_min: row.aca_min,
          aca_max: row.aca_max,
          aca_min_unit: row.aca_min_unit,
          aca_max_unit: row.aca_max_unit,
          res_min: row.res_min,
          res_max: row.res_max,
          res_min_unit: row.res_min_unit,
          res_max_unit: row.res_max_unit,
        });
      const calibrationData =
        isD09Row(row) || isD09Row(uucData) || isD17Row(row) || isD17Row(uucData)
          ? generateAutomatedReadings(row) || generated()
          : layout === "R-06" || layout === "R-07"
          ? generated()
          : layout === "R-08"
            ? fromR08Readings.length
              ? fromR08Readings
              : generated()
            : layout === "R-09"
              ? isR09Readings(fromReadings)
                ? fromReadings
                : generated()
            : layout === "R-10"
              ? (isR10Readings(sourceReadings)
                  ? sourceReadings
                  : generateAutomatedReadings({
                      ...row,
                      result_used: resultUsed,
                    }) || generated())
            : layout === "R-11"
              ? (isElectroReadings(sourceReadings)
                  ? sourceReadings
                  : generateAutomatedReadings({
                      ...row,
                      result_used: resultUsed,
                    }) || generated())
            : layout === "E01" || layout === "E02"
              ? (generateAutomatedReadings({
                  ...row,
                  result_used: resultUsed,
                  customPoints: row.customPoints,
                }) || generated())
            : layout === "R-12"
              ? (generateAutomatedReadings({
                  ...row,
                  result_used: resultUsed,
                  template: row.template || "R-12",
                  r12_unit: row.r12_unit,
                }) || generated())
            : layout === "R-14"
              ? (generateAutomatedReadings({
                  ...row,
                  result_used: resultUsed,
                  template: row.template || "R-14",
                  test_voltage: row.test_voltage,
                  r14_min_unit: row.r14_min_unit,
                  r14_max_unit: row.r14_max_unit,
                }) || generated())
            : layout === "R-15"
              ? (generateAutomatedReadings({
                  ...row,
                  result_used: resultUsed,
                  template: row.template || "R-15",
                }) || generated())
            : isTachometerReadings(fromReadings) || isVernierReadings(fromReadings) || isDimensionalUmReadings(fromReadings) || isAngularReadings(fromReadings) || isD09Readings(fromReadings) || isRodReadings(fromReadings) || isD17Readings(fromReadings) || isTapeReadings(fromReadings) || isD25Readings(fromReadings) || isUtgReadings(fromReadings) || isD42Readings(fromReadings) || isD18Readings(fromReadings) || isD20Readings(fromReadings) || isD21Readings(fromReadings) || isD22Readings(fromReadings) || isD19Readings(fromReadings) || isD31Readings(fromReadings) || isD32Readings(fromReadings)
              ? fromReadings
            : fromReadings.length
              ? fromReadings
              : generated();
      const rowCertNo = incrementStringNumber(batchDetails.startCertNo, certSeq);
      const certDigits = String(rowCertNo).split("/").pop() || "";
      const paddedCert = String(certDigits).replace(/\D/g, "").padStart(4, "0");
      const displayULR = `CC39112600000${paddedCert}F`;
      certSeq += 1;
      certificates.push({
        certificateNo: rowCertNo,
        ulrNo: displayULR,
        letterDate: formatDate(batchDetails.letterDate),
        srfNo: batchDetails.srfNo || "",
        srfDate: formatDate(batchDetails.srfDate),
        challanLetterDtd: formatDate(batchDetails.letterDate),
        challanSrfNo: batchDetails.srfNo || "",
        challanDtd: formatDate(batchDetails.srfDate),
        location: batchDetails.location || "",
        dateOfIssue:
          formatDate(batchDetails.dateOfIssue) ||
          formatDate(row.calDate) ||
          dayjs().format("DD.MM.YYYY"),
        dateOfCalibration: formatDate(row.calDate),
        nextDueDate: formatDate(row.dueDate),
        customerId: company.id,
        customerName: company.name,
        customerAddress: company.address,
        descriptionOfUUC: row.descriptionOfUUC,
        uucSubType: row.uucSubType,
        instrumentId: row.instrumentId || "",
        rangeMin: row.rangeMin ?? row.range_min ?? "",
        rangeMax: row.rangeMax ?? row.range_max ?? "",
        rods: Array.isArray(row.rods) ? row.rods : [],
        feeler_points: Array.isArray(row.feeler_points) ? row.feeler_points : [],
        radius_points: Array.isArray(row.radius_points) ? row.radius_points : [],
        range_min: row.rangeMin ?? row.range_min ?? "",
        range_max: row.rangeMax ?? row.range_max ?? "",
        range_min_len: row.range_min_len ?? "",
        range_max_len: row.range_max_len ?? "",
        lc: row.leastCount ?? row.lc ?? "",
        lc_len: row.lc_len ?? "",
        uuc_id: row.uuc_id || row.instrumentId || "",
        r12_unit: row.r12_unit || row.r12_range_unit || "V",
        r14_min_unit: row.r14_min_unit || "MΩ",
        r14_max_unit: row.r14_max_unit || "GΩ",
        test_voltage: row.test_voltage || "@5000V DC",
        template: template || row.template || "",
        dcv_min: row.dcv_min || "",
        dcv_max: row.dcv_max || "",
        dcv_min_unit: row.dcv_min_unit || "V",
        dcv_max_unit: row.dcv_max_unit || "V",
        acv_min: row.acv_min || "",
        acv_max: row.acv_max || "",
        acv_min_unit: row.acv_min_unit || "V",
        acv_max_unit: row.acv_max_unit || "V",
        dca_min: row.dca_min || "",
        dca_max: row.dca_max || "",
        dca_min_unit: row.dca_min_unit || "A",
        dca_max_unit: row.dca_max_unit || "A",
        aca_min: row.aca_min || "",
        aca_max: row.aca_max || "",
        aca_min_unit: row.aca_min_unit || "A",
        aca_max_unit: row.aca_max_unit || "A",
        res_min: row.res_min || "",
        res_max: row.res_max || "",
        res_min_unit: row.res_min_unit || "Ω",
        res_max_unit: row.res_max_unit || "Ω",
        rhRangeMin: row.rhRangeMin ?? row.rh_range_min ?? "",
        rhRangeMax: row.rhRangeMax ?? row.rh_range_max ?? "",
        rh_range_min: row.rhRangeMin ?? row.rh_range_min ?? "",
        rh_range_max: row.rhRangeMax ?? row.rh_range_max ?? "",
        resolution: row.leastCount,
        make: row.make,
        accuracy: row.accuracy,
        idNumber: row.idNo,
        result_used: resultUsed || profile.result_used || uucData.result_used || "",
        cmc_value: cmcValue,
        masters,
        uucData: {
          ...uucData,
          result_used: resultUsed || uucData.result_used,
          cmc: cmcValue,
          cmc_min: uucData.cmc_min || cmcValue,
          cmc_bands: cmcBands,
        },
        equipment: { masters, uuc },
        profile,
        calibrationData,
        readings: calibrationData,
      });
    } catch {
      skipped.push(`${rowLabel}: no matching master or incomplete data`);
    }
  }

  if (certificates.length === 0) {
    throw new Error(
      skipped[0] || "No rows were complete enough to generate certificates.",
    );
  }

  return { certificates, skipped };
}
