import React from "react";
import { Page, View, Text } from "@react-pdf/renderer";
import { styles } from "./certificateStyles";
import { registerCertificateFonts } from "./registerFonts";
import { getCertificateProfile } from "../utils/certificateProfile";
import { mappedMasters } from "../utils/mappedMasters";
import CalibrationResultsPdf from "./CalibrationResultsPdf";
import {
  formatUucRangeDisplay,
  normalizeElectroUnit,
  isR14Row,
  isR15Row,
  r14UnitDefaults,
  matchesR14UucId,
  matchesR15UucId,
  isDimensionalUmRow,
  isRodRow,
  isD22Row,
  isD19Row,
  feelerRangeText,
  isD31Row,
  radiusRangeText,
  isTapeRow,
  isUtgRow,
  isD20Row,
} from "../utils/readings";

registerCertificateFonts();

const BASE_NOTES = [
  "1. The reported Expanded Uncertainty is calculated at 95.45% C.L. with coverage factor k=2",
  "2. The calibration results reported in this certificate are valid at the time of & the stated condition of measurements.",
  "3. This certificate should not be reproduced except in full without prior permission of BCLLP.",
  "4. This report refers only to particular item(s) submitted for calibration",
  "5. Readings given above are as on received condition of the instrument.",
  "6. Calibration certificate issued is meant for scientific and industrial purpose only. However if used for commercial trading, additional recognition/approval shall be complied as required by Dept. of Legal metrology, Regulatory bodies etc.",
];

const MASTER_COLS = [
  { key: "sr_no", label: "SR.NO", width: "7%" },
  { key: "name", label: "Description", width: "20%" },
  { key: "make", label: "Make", width: "12%" },
  { key: "id_no", label: "ID.NO", width: "12%" },
  { key: "cert_no", label: "CERT. NO.", width: "14%" },
  { key: "cal_date", label: "CAL. DATE", width: "11%" },
  { key: "due_date", label: "DUE DATE", width: "11%" },
  { key: "cal_agency", label: "CAL. AGENCY", width: "13%" },
];

function PdfCell({ width, last, header, fontFamily, children }) {
  return (
    <Text
      style={[
        header ? styles.th : styles.td,
        { width },
        fontFamily ? { fontFamily, fontWeight: header ? 700 : 400 } : null,
        last ? styles.lastCol : null,
      ]}
    >
      {children == null || children === "" ? " " : children}
    </Text>
  );
}

function sanitizePdfText(value) {
  return String(value ?? "")
    .replace(/\u00A9/g, "\u03A9")
    .replace(/©/g, "\u03A9")
    .replace(/\u2126/g, "\u03A9")
    .replace(/([0-9.\s]|k|m|M|G)@/g, "$1\u03A9")
    .replace(/\+/g, "°C")
    .replace(/Â°/g, "°")
    .replace(/\uFFFD/g, "°")
    .replace(/\?\s*C\b/g, "°C")
    .replace(/deg(?:ree)?s?\s*C\b/gi, "°C")
    .replace(/°C\s*C\b/g, "°C");
}

function Meta({ label, value }) {
  return (
    <View style={styles.metaCell}>
      <Text style={styles.metaLabel}>{label}</Text>
      {typeof value === "function" ? (
        <Text style={styles.metaValue} render={value} />
      ) : (
        <Text style={styles.metaValue}>{value || " "}</Text>
      )}
    </View>
  );
}

function ColonRow({ label, children, bold = false }) {
  const labelFont = bold ? "Times-Bold" : "Times-Roman";
  const textStyle = { fontFamily: labelFont, fontSize: 10, lineHeight: 1.05 };
  return (
    <View style={styles.colonRow} wrap={false}>
      <View style={{ width: "35%" }}>
        <Text style={textStyle}>{label}</Text>
      </View>
      <View style={{ width: "3%" }}>
        <Text style={textStyle}>:</Text>
      </View>
      <View style={{ width: "62%" }}>
        {typeof children === "string" || children == null ? (
          <Text style={{ fontSize: 10, lineHeight: 1.05 }}>{children || " "}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

function buildRangeDisplay(cert, profile) {
  const rangeRow = {
    ...cert,
    result_used: cert.result_used || profile.result_used,
    instrumentId: cert.instrumentId,
    template: cert.template,
    rangeMin: cert.rangeMin,
    rangeMax: cert.rangeMax,
    range_min: cert.rangeMin,
    range_max: cert.rangeMax,
    r12_unit: cert.r12_unit || cert.r12_range_unit,
    r14_min_unit: cert.r14_min_unit,
    r14_max_unit: cert.r14_max_unit,
    test_voltage: cert.test_voltage,
    dcv_min: cert.dcv_min,
    dcv_max: cert.dcv_max,
    dcv_min_unit: normalizeElectroUnit(cert.dcv_min_unit),
    dcv_max_unit: normalizeElectroUnit(cert.dcv_max_unit),
    acv_min: cert.acv_min,
    acv_max: cert.acv_max,
    acv_min_unit: normalizeElectroUnit(cert.acv_min_unit),
    acv_max_unit: normalizeElectroUnit(cert.acv_max_unit),
    dca_min: cert.dca_min,
    dca_max: cert.dca_max,
    dca_min_unit: normalizeElectroUnit(cert.dca_min_unit),
    dca_max_unit: normalizeElectroUnit(cert.dca_max_unit),
    aca_min: cert.aca_min,
    aca_max: cert.aca_max,
    aca_min_unit: normalizeElectroUnit(cert.aca_min_unit),
    aca_max_unit: normalizeElectroUnit(cert.aca_max_unit),
    res_min: cert.res_min,
    res_max: cert.res_max,
    res_min_unit: normalizeElectroUnit(cert.res_min_unit),
    res_max_unit: normalizeElectroUnit(cert.res_max_unit),
    rhRangeMin: cert.rhRangeMin ?? cert.rh_range_min,
    rhRangeMax: cert.rhRangeMax ?? cert.rh_range_max,
    rh_range_min: cert.rhRangeMin ?? cert.rh_range_min,
    rh_range_max: cert.rhRangeMax ?? cert.rh_range_max,
  };
  if (isTapeRow(cert) || isTapeRow({ instrumentId: cert.instrumentId, uuc_id: cert.uuc_id })) {
    const min = cert.rangeMin ?? cert.range_min ?? "";
    const max = cert.rangeMax ?? cert.range_max ?? "";
    const minText = String(min).trim();
    const maxText = String(max).trim();
    if (minText && maxText) return `${minText} to ${maxText} mm`;
    return `${maxText || minText} mm`.trim();
  }
  if (
    isRodRow(cert) ||
    isD22Row(cert) ||
    isRodRow({ instrumentId: cert.instrumentId, uuc_id: cert.uuc_id }) ||
    isD22Row({ instrumentId: cert.instrumentId, uuc_id: cert.uuc_id })
  ) {
    const rods =
      Array.isArray(cert.rods) && cert.rods.length
        ? cert.rods
        : [{ min: cert.rangeMin ?? "", max: cert.rangeMax ?? "" }];
    const unit = profile.uucUnit || "mm";
    return rods
      .map((rod) => `${rod.min} to ${rod.max} ${unit}`.replace(/\s+/g, " ").trim())
      .join(", ");
  }
  if (
    isDimensionalUmRow(cert) ||
    isDimensionalUmRow({ instrumentId: cert.instrumentId, uuc_id: cert.uuc_id })
  ) {
    const minUm = cert.rangeMin ?? cert.range_min ?? "";
    const maxUm = cert.rangeMax ?? cert.range_max ?? "";
    return `${minUm} to ${maxUm} µm`.replace(/\s+/g, " ").trim();
  }
  if (
    isR15Row(rangeRow) ||
    String(cert.template || "").toUpperCase() === "R-15" ||
    matchesR15UucId(cert.instrumentId, cert.uuc_id, cert.descriptionOfUUC)
  ) {
    const min = cert.rangeMin ?? cert.range_min ?? "";
    const max = cert.rangeMax ?? cert.range_max ?? "";
    return `${min} to ${max} min`.replace(/\s+/g, " ").trim();
  }
  if (
    isR14Row(rangeRow) ||
    String(cert.template || "").toUpperCase() === "R-14" ||
    matchesR14UucId(cert.instrumentId, cert.uuc_id, cert.descriptionOfUUC)
  ) {
    const min = cert.rangeMin ?? cert.range_min ?? "";
    const max = cert.rangeMax ?? cert.range_max ?? "";
    const units = r14UnitDefaults(rangeRow);
    const minUnit = cert.r14_min_unit || units.r14_min_unit;
    const maxUnit = cert.r14_max_unit || units.r14_max_unit;
    const voltage = cert.test_voltage || "";
    return `${min} ${minUnit} to ${max} ${maxUnit} ${voltage}`
      .replace(/\s+/g, " ")
      .trim();
  }
  const isR12 =
    !matchesR14UucId(cert.instrumentId, cert.uuc_id, cert.descriptionOfUUC) &&
    !matchesR15UucId(cert.instrumentId, cert.uuc_id, cert.descriptionOfUUC) &&
    (String(cert.template || "").toUpperCase() === "R-12" ||
      String(cert.result_used || profile.result_used || "").toUpperCase() ===
        "R-12" ||
      /U-E03|U-E04|U-E05|U-E06/i.test(
        String(cert.instrumentId || cert.uuc_id || cert.descriptionOfUUC || ""),
      ));
  if (isR12) {
    const min = cert.rangeMin ?? cert.range_min ?? "";
    const max = cert.rangeMax ?? cert.range_max ?? "";
    const unit = cert.r12_unit || cert.r12_range_unit || "";
    return `${min} to ${max} ${unit}`.replace(/\s+/g, " ").trim();
  }
  return formatUucRangeDisplay(rangeRow, profile.uucUnit);
}

function formatRangeString(rangeStr) {
  if (!rangeStr) return "";
  let formatted = String(rangeStr)
    .trim()
    .replace(/[–—]/g, "-");
  if (formatted.startsWith("-")) {
    const rest = formatted.substring(1).trim();
    if (!/^\d/.test(formatted.charAt(1) || "")) return rest;
  }
  if (formatted.includes("-")) {
    const parts = formatted.split("-");
    if (parts.length === 2 && parts[0].trim() !== "" && parts[1].trim() !== "") {
      return `${parts[0].trim()} to ${parts[1].trim()}`;
    }
  }
  return formatted;
}

function displayUlrFromCert(cert) {
  const rowCertNo = cert.certificateNo || "";
  const certDigits = String(rowCertNo).split("/").pop() || "";
  const paddedCert = String(certDigits).replace(/\D/g, "").padStart(4, "0");
  return `CC39112600000${paddedCert}F`;
}

function CertificateMetaHeader({ cert, displayULR }) {
  return (
    <View style={styles.headerSection}>
      <View style={styles.metaGrid}>
        <Meta label="CERTIFICATE NO." value={cert.certificateNo} />
        <Meta label="ULR" value={displayULR} />
        <Meta label="Date of Issue" value={cert.dateOfIssue} />
        <Meta label="Date of Calibration" value={cert.dateOfCalibration} />
        <Meta label="Next Due Date" value={cert.nextDueDate} />
        <Meta
          label="Page No. / No. of Pages"
          value={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
      </View>
    </View>
  );
}

export default function CertificatePagePdf({ cert }) {
  const masters = Array.isArray(cert.masters)
    ? cert.masters
    : mappedMasters(cert.equipment);
  const uucData = cert.uucData || cert.equipment?.uuc || {};
  const profile =
    cert.profile ||
    getCertificateProfile({
      descriptionOfUUC: cert.descriptionOfUUC,
      uucSubType: cert.uucSubType,
      result_used: cert.result_used,
      ...uucData,
    });
  const notes = profile.conversionNote
    ? [...BASE_NOTES, profile.conversionNote]
    : BASE_NOTES;
  const displayULR = cert.ulrNo || displayUlrFromCert(cert);
  const rangeText = sanitizePdfText(buildRangeDisplay(cert, profile));
  const description = [cert.descriptionOfUUC, cert.uucSubType]
    .filter(Boolean)
    .join(" ");
  const resolution = (() => {
    if (!cert.resolution) return "";
    if (isDimensionalUmRow(cert) || isDimensionalUmRow({ instrumentId: cert.instrumentId })) {
      return `${cert.resolution} µm`;
    }
    if (isTapeRow(cert) || isTapeRow({ instrumentId: cert.instrumentId, uuc_id: cert.uuc_id })) {
      return `${cert.resolution} mm`;
    }
    return `${cert.resolution} ${profile.uucUnit || ""}`.trim();
  })();
  const challanValue = `LETTER dtd: ${cert.letterDate || cert.challanLetterDtd || ""} SRF: ${cert.srfNo || cert.challanSrfNo || ""} dtd: ${cert.srfDate || cert.challanDtd || ""}`;

  return (
    <Page size="A4" style={styles.page} wrap>
      {/* Closed outer border on every page */}
      <View style={styles.pageFrame} fixed />

      {/* Certificate header on every page */}
      <View style={styles.fixedHeader} fixed>
        <CertificateMetaHeader cert={cert} displayULR={displayULR} />
      </View>

      <View style={styles.section} wrap={false}>
        <ColonRow label="CUSTOMER DETAILS" bold>
          <View style={{ flexDirection: "column" }}>
            <Text
              style={{
                fontFamily: "Times-Bold",
                fontSize: 10,
                textTransform: "uppercase",
              }}
            >
              {`M/S. ${cert.customerName || ""}`.trim()}
            </Text>
            <Text
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                marginTop: 1,
                lineHeight: 1.1,
              }}
            >
              {cert.customerAddress || " "}
            </Text>
          </View>
        </ColonRow>

        <ColonRow label="CHALLAN NO & DATE">{challanValue}</ColonRow>

        <ColonRow label="Description" bold>
          {description}
        </ColonRow>
        <ColonRow label="Range">
          {isD31Row(cert) || isD31Row({ instrumentId: cert.instrumentId, uuc_id: cert.uuc_id })
            ? radiusRangeText(cert.radius_points)
            : isD19Row(cert) || isD19Row({ instrumentId: cert.instrumentId, uuc_id: cert.uuc_id })
            ? feelerRangeText(cert.feeler_points)
            : isD20Row(cert) || isD20Row({ instrumentId: cert.instrumentId, uuc_id: cert.uuc_id })
            ? `${cert.range_min || cert.rangeMin || 0} To ${cert.range_max || cert.rangeMax || 60}° & ${cert.range_min_len || 5} To ${cert.range_max_len || 35} mm`
            : formatRangeString(rangeText)}
        </ColonRow>
        <ColonRow label="Resolution / LC">
          {isD20Row(cert) || isD20Row({ instrumentId: cert.instrumentId, uuc_id: cert.uuc_id }) ? (
            `${cert.lc || cert.leastCount || cert.resolution || "2"}° & ${cert.lc_len || "1"} mm`
          ) : isUtgRow(cert) || isUtgRow({ instrumentId: cert.instrumentId, uuc_id: cert.uuc_id }) ? (
            <View>
              <Text style={{ fontSize: 10, lineHeight: 1.05 }}>
                {`${cert.resolution || "0.01"} mm (0.00 to 99.99mm)`}
              </Text>
              <Text style={{ fontSize: 10, lineHeight: 1.05 }}>
                0.1 mm (100.0 to 600.0mm)
              </Text>
            </View>
          ) : (
            resolution
          )}
        </ColonRow>

        <ColonRow label="MAKE">{cert.make || " "}</ColonRow>
        <ColonRow label="ACCURACY">{cert.accuracy || " "}</ColonRow>
        <ColonRow label="ID.NO" bold>
          {cert.idNumber || " "}
        </ColonRow>

        <ColonRow label="Location">{cert.location || "--"}</ColonRow>
        <ColonRow label="Condition when received">Satisfactory</ColonRow>
        <ColonRow label="Environmental Conditions">
          {cert.environmentalConditions || " "}
        </ColonRow>
        <ColonRow label="Method of measurement">
          {profile.method || " "}
        </ColonRow>
        <ColonRow label="Place of calibration">At-Site</ColonRow>
        <ColonRow label="Discipline" bold>
          {profile.discipline || " "}
        </ColonRow>
        <ColonRow label="Reference Standard/Cal. Procedure No.">
          {profile.procedure || " "}
        </ColonRow>
      </View>

      <View style={styles.section} wrap={false}>
        <Text style={styles.sectionTitle}>
          STANDARD EQUIPMENT USED FOR CALIBRATION
        </Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            {MASTER_COLS.map((col, i) => (
              <PdfCell
                key={col.key}
                header
                width={col.width}
                last={i === MASTER_COLS.length - 1}
              >
                {col.label}
              </PdfCell>
            ))}
          </View>
          {masters.map((master, index) => (
            <View
              key={master.id || master.id_no || index}
              style={styles.tableRow}
              wrap={false}
            >
              {MASTER_COLS.map((col, i) => (
                <PdfCell
                  key={col.key}
                  width={col.width}
                  fontFamily="TimesNewRoman"
                  last={i === MASTER_COLS.length - 1}
                >
                  {col.key === "sr_no"
                    ? String(index + 1)
                    : sanitizePdfText(
                        master[col.key] != null
                          ? String(master[col.key])
                          : " ",
                      )}
                </PdfCell>
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Results may wrap to page 2 only when the table is long */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: "center" }]}>
          CALIBRATION RESULTS
        </Text>
        <CalibrationResultsPdf cert={cert} profile={profile} />
      </View>

      {/* Keep footer together on page 1 when there is room (tighter bottom margin) */}
      <View style={styles.closingBlock} wrap={false}>
        <View style={styles.sigRow}>
          <View style={styles.sigBlock}>
            <Text style={{ fontFamily: "Times-Bold", lineHeight: 1.1 }}>Calibrated by:</Text>
            <Text style={{ lineHeight: 1.1 }}>R.B.V</Text>
            <Text style={{ lineHeight: 1.1 }}>(Tech.Asst.)</Text>
          </View>
          <View style={styles.sigRight}>
            <Text style={{ fontFamily: "Times-Bold", lineHeight: 1.1 }}>Authorized by:</Text>
            <Text style={{ lineHeight: 1.1 }}>M.D.CHAVAN</Text>
            <Text style={{ lineHeight: 1.1 }}>(L.I / Q.M)</Text>
          </View>
        </View>

        {notes.map((note) => (
          <Text key={note} style={styles.note}>
            {note}
          </Text>
        ))}

        <Text style={styles.endMark}>--End of certificate--</Text>
        <Text style={styles.formRef}>FR-01-03-0    dtd. 14.08.2024</Text>
      </View>
    </Page>
  );
}
