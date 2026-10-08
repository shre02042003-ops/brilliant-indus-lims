import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles } from "./certificateStyles";
import { registerCertificateFonts } from "./registerFonts";
import {
  cellText,
  cmcUnit,
  expandR05Rows,
  formatAnglePart,
  formatNum,
  formatSignedTolerance,
  r01CellText,
  r02CellText,
  R05_DEFAULT_DESCRIPTION,
  r05AngleUnits,
  r06DataRows,
  resolveCmcBands,
  resultLayout,
  resultRows,
  resultUnit,
  uncertaintyUnitLabel,
  withCmcValue,
} from "../utils/resultTable";
import { pickCmc, expandR08Rows, compoundCmcForReading, r09CmcForChannel, isR09Readings, r10Error, isElectroReadings, electroDisplayGroups, isR12Readings, r12ReadingOf, isR14Readings, r14ReadingOf, isR15Readings, r15ReadingOf, isR15Row, matchesR15UucId, isTachometerReadings, tachometerDisplayRows, isVernierReadings, vernierDisplayRows, isDimensionalUmReadings, dimensionalUmDisplayRows, isAngularReadings, angularDisplayRows, isD09Readings, d09DisplayRows, isRodReadings, rodDisplayRows, isD17Readings, d17DisplayRows, isTapeReadings, tapeDisplayRows, isD25Readings, d25DisplayRows, isUtgReadings, utgDisplayRows, isD42Readings, d42DisplayRows, isD18Readings, d18DisplayRows, isD20Readings, isD21Readings, isD22Readings, isD19Readings, isD31Readings, isD32Readings } from "../utils/readings";
import {
  normalizePressureUnit,
  pressureUnitLabel,
} from "../utils/pressureUnits";

registerCertificateFonts();

const toBar = {
  'bar': 1,
  'kg/cm^2': 0.980665,
  'psi': 0.0689476,
  'mmHg': 0.00133322,
  'mbar': 0.001,
  'kPa': 0.01,
  'inwc': 0.00249089,
  'mmwc': 0.0000980665,
  'inHg': 0.0338639
};

function PdfCell({ width, last, header, fontFamily, noBottom, children }) {
  return (
    <Text
      style={[
        header ? styles.th : styles.td,
        { width },
        fontFamily ? { fontFamily, fontWeight: header ? 700 : 400 } : null,
        last ? styles.lastCol : null,
        noBottom ? { borderBottom: 0 } : null,
      ]}
    >
      {children == null || children === "" ? " " : children}
    </Text>
  );
}

function pdfSafeOhm(unit) {
  return String(unit ?? "")
    .replace(/\u00A9/g, "\u03A9")
    .replace(/©/g, "\u03A9")
    .replace(/\u2126/g, "\u03A9")
    .replace(/ohm/gi, "\u03A9");
}

function PdfUnitRow({ cells, widths }) {
  return (
    <View style={styles.tableRow}>
      {cells.map((text, i) => (
        <PdfCell
          key={`${text}-${i}`}
          header
          width={widths[i]}
          last={i === cells.length - 1}
        >
          {text || " "}
        </PdfCell>
      ))}
    </View>
  );
}

function resultCols(profile) {
  const uucUnit = profile.uucUnit || "";
  const masterUnit = profile.masterUnit || uucUnit;
  const dual = Boolean(profile.showDualUnits);
  const cols = [
    { key: "pindKgCm2", label: uucUnit, width: dual ? "9%" : "12%" },
  ];
  if (dual) {
    cols.push({ key: "pindBar", label: masterUnit, width: "9%" });
  }
  cols.push(
    { key: "m1", label: `↑M1 (${masterUnit})`, width: "10%" },
    { key: "m2", label: `↓M2 (${masterUnit})`, width: "10%" },
    { key: "mean", label: "Mean", width: "12%" },
    { key: "deviation", label: "Δ", width: "10%" },
    { key: "errorPercent", label: "Error F.S", width: "10%" },
    { key: "hysteresis", label: "Hysteresis", width: "10%" },
    {
      key: "expandedUncertainty",
      label: "±U (k=2)",
      width: dual ? "10%" : "14%",
    },
  );
  return cols;
}

function R01ResultsTable({ unit, cmc, rows }) {
  const widths = ["32%", "32%", "18%", "18%"];
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <PdfCell header width={widths[0]}>
          {`Set ${unit || ""} on Unit Under Calibration`}
        </PdfCell>
        <PdfCell header width={widths[1]}>
          Measured reading on Master (avg of 3 rdgs.)
        </PdfCell>
        <PdfCell header width={widths[2]}>Error</PdfCell>
        <PdfCell header last width={widths[3]}>Uncertainty (±)</PdfCell>
      </View>
      <PdfUnitRow
        widths={widths}
        cells={[unit, unit, unit, `± ${cmc}`]}
      />
      {rows.map((row, idx) => (
        <View key={idx} style={styles.tableRow}>
          <PdfCell width={widths[0]}>
            {r01CellText(row, ["set_rpm", "pindKgCm2"])}
          </PdfCell>
          <PdfCell width={widths[1]}>
            {r01CellText(row, ["master_rpm", "mean"])}
          </PdfCell>
          <PdfCell width={widths[2]}>
            {r01CellText(row, ["error", "deviation"])}
          </PdfCell>
          <PdfCell last width={widths[3]}>
            {r01CellText(row, ["cmc", "expandedUncertainty"])}
          </PdfCell>
        </View>
      ))}
    </View>
  );
}

function R02ResultsTable({ unit, cmc, rows }) {
  const widths = ["18%", "16%", "16%", "16%", "16%", "18%"];
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <PdfCell header width={widths[0]}>Standard Reading</PdfCell>
        <PdfCell header width="32%">
          Measured reading on UUC (avg. of 3 rdgs.)
        </PdfCell>
        <PdfCell header width="32%">Error</PdfCell>
        <PdfCell header last width={widths[5]}>Uncertainty (±)</PdfCell>
      </View>
      <View style={styles.tableRow}>
        <PdfCell header width={widths[0]}> </PdfCell>
        <PdfCell header width={widths[1]}>External Jaw</PdfCell>
        <PdfCell header width={widths[2]}>Internal Jaw</PdfCell>
        <PdfCell header width={widths[3]}>External Jaw</PdfCell>
        <PdfCell header width={widths[4]}>Internal Jaw</PdfCell>
        <PdfCell header last width={widths[5]}> </PdfCell>
      </View>
      <PdfUnitRow
        widths={widths}
        cells={[unit, unit, unit, unit, unit, `± ${cmc}`]}
      />
      {rows.map((row, idx) => (
        <View key={idx} style={styles.tableRow}>
          <PdfCell width={widths[0]}>
            {r02CellText(row, ["standard", "pindKgCm2"])}
          </PdfCell>
          <PdfCell width={widths[1]}>
            {r02CellText(row, ["uuc_ext", "m1"])}
          </PdfCell>
          <PdfCell width={widths[2]}>
            {r02CellText(row, ["uuc_int", "m2"])}
          </PdfCell>
          <PdfCell width={widths[3]}>
            {r02CellText(row, ["error_ext", "errorExt"])}
          </PdfCell>
          <PdfCell width={widths[4]}>
            {r02CellText(row, ["error_int", "errorInt"])}
          </PdfCell>
          <PdfCell last width={widths[5]}>
            {r02CellText(row, ["cmc", "expandedUncertainty"])}
          </PdfCell>
        </View>
      ))}
    </View>
  );
}

function DimensionalUmResultsTable({ rows }) {
  const widths = ["25%", "25%", "25%", "25%"];
  const unit = "µm";
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <PdfCell header width={widths[0]}>Standard Reading</PdfCell>
        <PdfCell header width={widths[1]}>
          Measured reading on UUC (avg of 3 rdgs.)
        </PdfCell>
        <PdfCell header width={widths[2]}>Error</PdfCell>
        <PdfCell header last width={widths[3]}>Uncertainty (±)</PdfCell>
      </View>
      <PdfUnitRow widths={widths} cells={[unit, unit, unit, `± ${unit}`]} />
      {rows.map((row, idx) => (
        <View key={idx} style={styles.tableRow}>
          <PdfCell width={widths[0]}>{row.standard || " "}</PdfCell>
          <PdfCell width={widths[1]}>{row.uuc || " "}</PdfCell>
          <PdfCell width={widths[2]}>{row.error || " "}</PdfCell>
          <PdfCell last width={widths[3]}>{row.cmc || " "}</PdfCell>
        </View>
      ))}
    </View>
  );
}

function R03ResultsTable({ unit, cmc, rows }) {
  const widths = ["32%", "32%", "18%", "18%"];
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <PdfCell header width={widths[0]}>Standard Dimension</PdfCell>
        <PdfCell header width={widths[1]}>
          Measured Reading on UUC (avg. of 3 rdgs.)
        </PdfCell>
        <PdfCell header width={widths[2]}>Error</PdfCell>
        <PdfCell header last width={widths[3]}>Uncertainty (±)</PdfCell>
      </View>
      <PdfUnitRow
        widths={widths}
        cells={[unit, unit, unit, `± ${cmc}`]}
      />
      {rows.map((row, idx) => (
        <View key={idx} style={styles.tableRow}>
          <PdfCell width={widths[0]}>{formatNum(row.pindKgCm2)}</PdfCell>
          <PdfCell width={widths[1]}>{formatNum(row.mean)}</PdfCell>
          <PdfCell width={widths[2]}>{formatNum(row.deviation)}</PdfCell>
          <PdfCell last width={widths[3]}>
            {formatNum(row.expandedUncertainty)}
          </PdfCell>
        </View>
      ))}
    </View>
  );
}

function TwoColumnRodsResultsTable({ rows }) {
  const points = Array.isArray(rows) ? rows : [];
  const half = Math.ceil(points.length / 2);
  const col1 = points.slice(0, half);
  const col2 = points.slice(half);
  const show = (value) => (value == null || value === "" ? " " : String(value));
  const widths = ["16.66%", "16.66%", "16.68%", "16.66%", "16.66%", "16.68%"];
  const cmc = points[0]?.cmc || "7.12";
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <PdfCell header width={widths[0]}>Standard</PdfCell>
        <PdfCell header width={widths[1]}>UUC</PdfCell>
        <PdfCell header width={widths[2]}>Error</PdfCell>
        <PdfCell header width={widths[3]}>Standard</PdfCell>
        <PdfCell header width={widths[4]}>UUC</PdfCell>
        <PdfCell header last width={widths[5]}>Error</PdfCell>
      </View>
      <PdfUnitRow widths={widths} cells={["mm", "mm", "mm", "mm", "mm", "mm"]} />
      {col1.map((pt1, idx) => {
        const pt2 = col2[idx];
        return (
          <View key={idx} style={styles.tableRow}>
            <PdfCell width={widths[0]}>{show(pt1.standard)}</PdfCell>
            <PdfCell width={widths[1]}>{show(pt1.uuc)}</PdfCell>
            <PdfCell width={widths[2]}>{show(pt1.error)}</PdfCell>
            <PdfCell width={widths[3]}>{pt2 ? show(pt2.standard) : " "}</PdfCell>
            <PdfCell width={widths[4]}>{pt2 ? show(pt2.uuc) : " "}</PdfCell>
            <PdfCell last width={widths[5]}>{pt2 ? show(pt2.error) : " "}</PdfCell>
          </View>
        );
      })}
      <View style={styles.tableRow}>
        <PdfCell header width="50%">Uncertainty (±)</PdfCell>
        <PdfCell header last width="50%">{cmc}</PdfCell>
      </View>
    </View>
  );
}

function FilletQuad({ points }) {
  const widths = ["25%", "25%", "25%", "25%"];
  const show = (value) => (value == null || value === "" ? " " : String(value));
  return (
    <View style={[styles.table, { width: "49%" }]}>
      <View style={styles.tableRow}>
        <PdfCell header width={widths[0]}>Standard Dimensions On UUC</PdfCell>
        <PdfCell header width={widths[1]}>Measured reading On Master (avg. of 3 rdgs.)</PdfCell>
        <PdfCell header width={widths[2]}>Error</PdfCell>
        <PdfCell header last width={widths[3]}>Uncertainty (±)</PdfCell>
      </View>
      {points.map((pt, idx) => (
        <View key={idx} style={styles.tableRow}>
          <PdfCell width={widths[0]}>{show(pt.uuc)}</PdfCell>
          <PdfCell width={widths[1]}>{show(pt.master)}</PdfCell>
          <PdfCell width={widths[2]}>{show(pt.error)}</PdfCell>
          <PdfCell last width={widths[3]}>{show(pt.cmc)}</PdfCell>
        </View>
      ))}
    </View>
  );
}

const D21_FLEX = [1, 1, 1.2, 1.2, 1, 1.2, 1.2, 1, 1];
const D21_HEADERS = [
  "Passing through IS Sieve",
  "Retained on IS Sieve",
  "Length Gauge - Length",
  "Reading Measured on UUC- Length",
  "Error - Length",
  "Height Gauge - Width",
  "Reading Measured on UUC - Width",
  "Error - Width",
  "Uncertainty (±)",
];

function D21Cell({ flex, last, header, children }) {
  return (
    <View
      style={{
        flex,
        borderRightWidth: last ? 0 : 0.5,
        borderRightColor: "#000",
        borderRightStyle: "solid",
        borderBottomWidth: 0.5,
        borderBottomColor: "#000",
        borderBottomStyle: "solid",
        paddingVertical: 2,
        paddingHorizontal: 1,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: header ? 6 : 7,
          fontFamily: header ? "Times-Bold" : "Times-Roman",
          textAlign: "center",
        }}
      >
        {children == null || children === "" ? " " : String(children)}
      </Text>
    </View>
  );
}

function AggregateD21ResultsTable({ data }) {
  const points = Array.isArray(data?.points) ? data.points : [];
  const valuesOf = (pt) => [
    pt.pass,
    pt.ret,
    pt.lenStd,
    pt.lenUUC,
    pt.lenErr,
    pt.widStd,
    pt.widUUC,
    pt.widErr,
    pt.cmc,
  ];
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        {D21_HEADERS.map((label, idx) => (
          <D21Cell key={label} flex={D21_FLEX[idx]} header last={idx === D21_HEADERS.length - 1}>
            {label}
          </D21Cell>
        ))}
      </View>
      {points.map((pt, idx) => (
        <View key={idx} style={styles.tableRow}>
          {valuesOf(pt).map((value, col) => (
            <D21Cell key={col} flex={D21_FLEX[col]} last={col === D21_FLEX.length - 1}>
              {value}
            </D21Cell>
          ))}
        </View>
      ))}
    </View>
  );
}

function FeelerHalfTable({ points }) {
  const widths = ["25%", "25%", "25%", "25%"];
  const show = (value) => (value == null || value === "" ? " " : String(value));
  return (
    <View style={[styles.table, { width: "48%" }]}>
      <View style={styles.tableRow}>
        <PdfCell header width={widths[0]}>Specified Size</PdfCell>
        <PdfCell header width={widths[1]}>Observed Size (avg. of 3 rdgs.)</PdfCell>
        <PdfCell header width={widths[2]}>Error</PdfCell>
        <PdfCell header last width={widths[3]}>Uncertainty (±)</PdfCell>
      </View>
      {points.map((pt, idx) => (
        <View key={idx} style={styles.tableRow}>
          <PdfCell width={widths[0]}>{show(pt.standard)}</PdfCell>
          <PdfCell width={widths[1]}>{show(pt.uuc)}</PdfCell>
          <PdfCell width={widths[2]}>{show(pt.error)}</PdfCell>
          <PdfCell last width={widths[3]}>{show(pt.cmc)}</PdfCell>
        </View>
      ))}
    </View>
  );
}

function FeelerGaugeResultsTable({ data }) {
  const points = Array.isArray(data?.points) ? data.points : [];
  const half = Math.ceil(points.length / 2);
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <FeelerHalfTable points={points.slice(0, half)} />
      <FeelerHalfTable points={points.slice(half)} />
    </View>
  );
}

function RadiusSection({ title, points }) {
  const list = Array.isArray(points) ? points : [];
  const half = Math.ceil(list.length / 2);
  const col2 = list.slice(half);
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 10, fontFamily: "Times-Bold", marginBottom: 4, textAlign: "center" }}>
        {title}
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <FeelerHalfTable points={list.slice(0, half)} />
        {col2.length > 0 ? <FeelerHalfTable points={col2} /> : <View style={{ width: "48%" }} />}
      </View>
    </View>
  );
}

function MasterMeasurementResultsTable({ data }) {
  const widths = ["26%", "36%", "18%", "20%"];
  const show = (value) => (value == null || value === "" ? " " : String(value));
  const points = Array.isArray(data?.points) ? data.points : [];
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <PdfCell header width={widths[0]}>Standard Dimension on UUC</PdfCell>
        <PdfCell header width={widths[1]}>Measured on Master (avg of 3 rdgs.)</PdfCell>
        <PdfCell header width={widths[2]}>Error</PdfCell>
        <PdfCell header last width={widths[3]}>Uncertainty</PdfCell>
      </View>
      {points.map((pt, idx) => (
        <View key={idx} style={styles.tableRow}>
          <PdfCell width={widths[0]}>{show(pt.standard)}</PdfCell>
          <PdfCell width={widths[1]}>{show(pt.uuc)}</PdfCell>
          <PdfCell width={widths[2]}>{show(pt.error)}</PdfCell>
          <PdfCell last width={widths[3]}>{show(pt.cmc)}</PdfCell>
        </View>
      ))}
    </View>
  );
}

function RadiusGaugeResultsTable({ data }) {
  return (
    <View>
      <RadiusSection title="Internal Radius" points={data?.internalPoints} />
      <RadiusSection title="External Radius" points={data?.externalPoints} />
    </View>
  );
}

function TubularMicrometerResultsTable({ data }) {
  const widths = ["25%", "25%", "25%", "25%"];
  const show = (value) => (value == null || value === "" ? " " : String(value));
  const micPoints = Array.isArray(data?.micPoints) ? data.micPoints : [];
  const extPoints = Array.isArray(data?.extPoints) ? data.extPoints : [];
  const dataRow = (pt, key) => (
    <View key={key} style={styles.tableRow}>
      <PdfCell width={widths[0]}>{show(pt.standard)}</PdfCell>
      <PdfCell width={widths[1]}>{show(pt.uuc)}</PdfCell>
      <PdfCell width={widths[2]}>{show(pt.error)}</PdfCell>
      <PdfCell last width={widths[3]}>{show(pt.cmc)}</PdfCell>
    </View>
  );
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <PdfCell header width={widths[0]}>Standard Dimension (mm)</PdfCell>
        <PdfCell header width={widths[1]}>Measured Dimension on UUC (mm)</PdfCell>
        <PdfCell header width={widths[2]}>Error (mm)</PdfCell>
        <PdfCell header last width={widths[3]}>Uncertainty (µm)</PdfCell>
      </View>
      {micPoints.map((pt, idx) => dataRow(pt, `mic-${idx}`))}
      {extPoints.length > 0 ? (
        <>
          <View style={styles.tableRow}>
            <PdfCell header last width="100%">Extension Rod</PdfCell>
          </View>
          {extPoints.map((pt, idx) => dataRow(pt, `ext-${idx}`))}
        </>
      ) : null}
    </View>
  );
}

function FilletWeldResultsTable({ data }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <FilletQuad points={data.lengthPoints || []} />
      <FilletQuad points={data.anglePoints || []} />
    </View>
  );
}

function D18ResultsTable({ rows }) {
  const widths = ["25%", "25%", "25%", "25%"];
  const show = (value) => (value == null || value === "" ? " " : String(value));
  return (
    <View>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <PdfCell header width={widths[0]}>Standard Dimension</PdfCell>
          <PdfCell header width={widths[1]}>Measured Reading on U.U.C.</PdfCell>
          <PdfCell header width={widths[2]}>Error</PdfCell>
          <PdfCell header last width={widths[3]}>Uncertainty (±)</PdfCell>
        </View>
        <PdfUnitRow widths={widths} cells={["mm", "mm", "mm", "µm"]} />
        {rows.map((pt, idx) => (
          <View key={idx} style={styles.tableRow}>
            <PdfCell width={widths[0]}>{show(pt.standard)}</PdfCell>
            <PdfCell width={widths[1]}>{show(pt.uuc)}</PdfCell>
            <PdfCell width={widths[2]}>{show(pt.error)}</PdfCell>
            <PdfCell last width={widths[3]}>{show(pt.cmc)}</PdfCell>
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 9, marginTop: 8 }}>
        Parallelism Error In Measuring Faces is within 0.001 mm
      </Text>
    </View>
  );
}

function D42ResultsTable({ rows }) {
  const widths = ["25%", "25%", "25%", "25%"];
  const show = (value) => (value == null || value === "" ? " " : String(value));
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <PdfCell header width={widths[0]}>Standard Dimension</PdfCell>
        <PdfCell header width={widths[1]}>Measured Reading</PdfCell>
        <PdfCell header width={widths[2]}>Error</PdfCell>
        <PdfCell header last width={widths[3]}>Uncertainty (±)</PdfCell>
      </View>
      <PdfUnitRow widths={widths} cells={["mm", "mm", "mm", "µm"]} />
      {rows.map((pt, idx) => (
        <View key={idx} style={styles.tableRow}>
          <PdfCell width={widths[0]}>{show(pt.standard)}</PdfCell>
          <PdfCell width={widths[1]}>{show(pt.uuc)}</PdfCell>
          <PdfCell width={widths[2]}>{show(pt.error)}</PdfCell>
          <PdfCell last width={widths[3]}>{show(pt.cmc)}</PdfCell>
        </View>
      ))}
    </View>
  );
}

function UtgResultsTable({ rows }) {
  const widths = ["25%", "25%", "25%", "25%"];
  const show = (value) => (value == null || value === "" ? " " : String(value));
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <PdfCell header width={widths[0]}>Specified Size</PdfCell>
        <PdfCell header width={widths[1]}>Observed Size on U. U. C.</PdfCell>
        <PdfCell header width={widths[2]}>Error</PdfCell>
        <PdfCell header last width={widths[3]}>Uncertainty (±)</PdfCell>
      </View>
      <PdfUnitRow widths={widths} cells={["mm", "mm", "mm", "µm"]} />
      {rows.map((pt, idx) => (
        <View key={idx} style={styles.tableRow}>
          <PdfCell width={widths[0]}>{show(pt.standard)}</PdfCell>
          <PdfCell width={widths[1]}>{show(pt.uuc)}</PdfCell>
          <PdfCell width={widths[2]}>{show(pt.error)}</PdfCell>
          <PdfCell last width={widths[3]}>{show(pt.cmc)}</PdfCell>
        </View>
      ))}
    </View>
  );
}

function D25ResultsTable({ rows }) {
  const show = (value) => (value == null || value === "" ? " " : String(value));
  const widths = ["34%", "33%", "33%"];
  return (
    <View>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <PdfCell header width={widths[0]}>Standard Reading (mm)</PdfCell>
          <PdfCell header width={widths[1]}>Measured reading on UUC (mm)</PdfCell>
          <PdfCell header last width={widths[2]}>Error (mm)</PdfCell>
        </View>
        {rows.map((pt, idx) => (
          <View key={idx} style={styles.tableRow}>
            <PdfCell width={widths[0]}>{show(pt.standard)}</PdfCell>
            <PdfCell width={widths[1]}>{show(pt.uuc)}</PdfCell>
            <PdfCell last width={widths[2]}>{show(pt.error)}</PdfCell>
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 9, fontStyle: "italic", marginTop: 8 }}>
        Uncertainty of Measurement (at 95.45%C.L.) = ± 145 x sqrt(L) µm (L in m) with coverage factor k=2
      </Text>
    </View>
  );
}

function TapeResultsTable({ rows }) {
  const show = (value) => (value == null || value === "" ? " " : String(value));
  const widths = ["34%", "33%", "33%"];
  return (
    <View>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <PdfCell header width={widths[0]}>Standard Reading (mm)</PdfCell>
          <PdfCell header width={widths[1]}>Measured reading on UUC (mm)</PdfCell>
          <PdfCell header last width={widths[2]}>Error (mm)</PdfCell>
        </View>
        {rows.map((pt, idx) => (
          <View key={idx} style={styles.tableRow}>
            <PdfCell width={widths[0]}>{show(pt.standard)}</PdfCell>
            <PdfCell width={widths[1]}>{show(pt.uuc)}</PdfCell>
            <PdfCell last width={widths[2]}>{show(pt.error)}</PdfCell>
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 9, fontStyle: "italic", marginTop: 8 }}>
        Uncertainty of Measurement (at 95.45%C.L.) = ± 290.37 x sqrt(L) µm (L in m) with coverage factor k=2
      </Text>
    </View>
  );
}

function D17ResultsTable({ rows }) {
  const widths = ["16%", "16%", "24%", "28%", "16%"];
  const show = (value) => (value == null || value === "" ? " " : String(value));
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <PdfCell header width={widths[0]}>Passing through IS Sieve</PdfCell>
        <PdfCell header width={widths[1]}>Retained on IS Sieve</PdfCell>
        <PdfCell header width={widths[2]}>Standard Reading (Length Gauge)</PdfCell>
        <PdfCell header width={widths[3]}>
          Measured reading on Unit under calibration (avg. of 3 rdgs.)
        </PdfCell>
        <PdfCell header last width={widths[4]}>Error</PdfCell>
      </View>
      {rows.map((pt, idx) => (
        <View key={idx} style={styles.tableRow}>
          <PdfCell width={widths[0]}>{show(pt.pass)}</PdfCell>
          <PdfCell width={widths[1]}>{show(pt.retain)}</PdfCell>
          <PdfCell width={widths[2]}>{show(pt.standard)}</PdfCell>
          <PdfCell width={widths[3]}>{show(pt.uuc)}</PdfCell>
          <PdfCell last width={widths[4]}>{show(pt.error)}</PdfCell>
        </View>
      ))}
    </View>
  );
}

function D09ResultsTable({ rows }) {
  const widths = ["22%", "14%", "14%", "22%", "14%", "14%"];
  const show = (value) => (value == null || value === "" ? " " : String(value));
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <PdfCell header width={widths[0]}>Parameter</PdfCell>
        <PdfCell header width={widths[1]}>Standard Dimension</PdfCell>
        <PdfCell header width={widths[2]}>± mm</PdfCell>
        <PdfCell header width={widths[3]}>
          Measured reading on Unit under calibration (avg. of 3 rdgs.)
        </PdfCell>
        <PdfCell header width={widths[4]}>Error</PdfCell>
        <PdfCell header last width={widths[5]}>Uncertainty ±</PdfCell>
      </View>
      <PdfUnitRow widths={widths} cells={[" ", "mm", "mm", "mm", "mm", "mm"]} />
      {rows.map((pt, idx) => (
        <View key={idx} style={styles.tableRow}>
          <PdfCell width={widths[0]}>{show(pt.parameter)}</PdfCell>
          <PdfCell width={widths[1]}>{show(pt.standard)}</PdfCell>
          <PdfCell width={widths[2]}>{`± ${show(pt.tolerance)}`}</PdfCell>
          <PdfCell width={widths[3]}>{show(pt.uuc)}</PdfCell>
          <PdfCell width={widths[4]}>{show(pt.error)}</PdfCell>
          <PdfCell last width={widths[5]}>{show(pt.cmc || pt.uncertainty)}</PdfCell>
        </View>
      ))}
    </View>
  );
}

function angleCell(value) {
  if (value == null || value === "") return " ";
  return String(value);
}

function AngularDegMinResultsTable({ data }) {
  const points = Array.isArray(data?.points) ? data.points : [];
  const title = data?.description || "Angular Measurement of Protractor Head";
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <View
          style={[
            styles.th,
            { width: "18%", justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Text style={{ fontFamily: "Times-Bold", fontSize: 6.5, textAlign: "center" }}>
            Description
          </Text>
        </View>
        <View style={{ width: "82%" }}>
          <View style={styles.tableRow}>
            <PdfCell header width="26.829%">Readings set on UUC</PdfCell>
            <PdfCell header width="26.829%">
              Reading on master (avg. of 3 rdgs.)
            </PdfCell>
            <PdfCell header width="26.829%">Error</PdfCell>
            <PdfCell header last width="19.513%">Uncertainty ±</PdfCell>
          </View>
          <View style={styles.tableRow}>
            <PdfCell header width="13.4145%">deg</PdfCell>
            <PdfCell header width="13.4145%">min</PdfCell>
            <PdfCell header width="13.4145%">deg</PdfCell>
            <PdfCell header width="13.4145%">min</PdfCell>
            <PdfCell header width="13.4145%">deg</PdfCell>
            <PdfCell header width="13.4145%">min</PdfCell>
            <PdfCell header last width="19.513%">min</PdfCell>
          </View>
        </View>
      </View>
      {points.length > 0 ? (
        <View style={styles.tableRow}>
          <View
            style={[
              styles.td,
              { width: "18%", justifyContent: "center", alignItems: "center" },
            ]}
          >
            <Text style={{ fontSize: 7, textAlign: "center" }}>{title}</Text>
          </View>
          <View style={{ width: "82%" }}>
            {points.map((pt, idx) => (
              <View key={idx} style={styles.tableRow}>
                <PdfCell width="13.4145%">{angleCell(pt.uuc_deg)}</PdfCell>
                <PdfCell width="13.4145%">{angleCell(pt.uuc_min)}</PdfCell>
                <PdfCell width="13.4145%">{angleCell(pt.master_deg)}</PdfCell>
                <PdfCell width="13.4145%">{angleCell(pt.master_min)}</PdfCell>
                <PdfCell width="13.4145%">{angleCell(pt.error_deg)}</PdfCell>
                <PdfCell width="13.4145%">{angleCell(pt.error_min)}</PdfCell>
                <PdfCell last width="19.513%">
                  {angleCell(pt.cmc || pt.uncertainty)}
                </PdfCell>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function R06ResultsTable({ unit, cmc, rows }) {
  const widths = ["22%", "14%", "14%", "22%", "14%", "14%"];
  const data = r06DataRows(rows);
  const unitLabel = unit || " ";
  const plusUnit = unit ? `± ${unit}` : "±";

  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <View
          style={[
            styles.th,
            {
              width: widths[0],
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <Text
            style={{
              fontFamily: "Times-Bold",
              fontSize: 6.5,
              textAlign: "center",
            }}
          >
            Parameter
          </Text>
        </View>
        <View style={{ width: "78%" }}>
          <View style={styles.tableRow}>
            <PdfCell header width="35.897%">Standard Dimension</PdfCell>
            <PdfCell header width="28.205%">
              Measured reading on Unit under calibration (avg. of 3 rdgs.)
            </PdfCell>
            <PdfCell header width="17.949%">Error</PdfCell>
            <PdfCell header last width="17.949%">
              Uncertainty ±
            </PdfCell>
          </View>
          <View style={styles.tableRow}>
            <PdfCell header width="17.949%">{unitLabel}</PdfCell>
            <PdfCell header width="17.948%">{plusUnit}</PdfCell>
            <PdfCell header width="28.205%">{unitLabel}</PdfCell>
            <PdfCell header width="17.949%">{unitLabel}</PdfCell>
            <PdfCell header last width="17.949%">
              {cmc || " "}
            </PdfCell>
          </View>
        </View>
      </View>
      {data.map((row, idx) => (
        <View key={row.parameter || idx} style={styles.tableRow}>
          <PdfCell width={widths[0]}>{cellText(row.parameter)}</PdfCell>
          <PdfCell width={widths[1]}>{formatNum(row.standard, 2)}</PdfCell>
          <PdfCell width={widths[2]}>
            {formatSignedTolerance(row.standardTol)}
          </PdfCell>
          <PdfCell width={widths[3]}>{formatNum(row.measured, 2)}</PdfCell>
          <PdfCell width={widths[4]}>{formatNum(row.error, 2)}</PdfCell>
          <PdfCell last width={widths[5]}>
            {formatNum(row.uncertainty)}
          </PdfCell>
        </View>
      ))}
    </View>
  );
}

function ElectroResultsTable({ data, cmcValue, headers }) {
  const widths = ["22%", "20%", "20%", "18%", "20%"];
  const groups = electroDisplayGroups(data);
  const titles = headers || [
    "Cal. Point/Range",
    "Std. Reading",
    "UUC Reading",
    "Deviation",
    "Expanded Uncertainty",
  ];
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        {titles.map((title, i) => (
          <PdfCell
            key={title}
            header
            width={widths[i]}
            last={i === titles.length - 1}
          >
            {title}
          </PdfCell>
        ))}
      </View>
      {groups.map((group, gIdx) => (
        <View key={`g-${group.parameter}-${gIdx}`}>
          <View style={styles.tableRow}>
            <Text
              style={[
                styles.th,
                styles.lastCol,
                {
                  width: "100%",
                  textAlign: "left",
                  fontFamily: "TimesNewRoman",
                  fontWeight: 700,
                },
              ]}
            >
              {group.parameter}
            </Text>
          </View>
          {(group.tiers || []).map((tier, tIdx) => {
            const unit = tier.unit || " ";
            return (
              <View key={`t-${unit}-${tIdx}`}>
                <View style={styles.tableRow}>
                  <PdfCell header fontFamily="TimesNewRoman" width={widths[0]}>
                    {unit}
                  </PdfCell>
                  <PdfCell header fontFamily="TimesNewRoman" width={widths[1]}>
                    {unit}
                  </PdfCell>
                  <PdfCell header fontFamily="TimesNewRoman" width={widths[2]}>
                    {unit}
                  </PdfCell>
                  <PdfCell header fontFamily="TimesNewRoman" width={widths[3]}>
                    {unit}
                  </PdfCell>
                  <PdfCell
                    header
                    fontFamily="TimesNewRoman"
                    last
                    width={widths[4]}
                  >
                    %
                  </PdfCell>
                </View>
                {(tier.points || []).map((pt, ptIdx) => (
                  <View key={`p-${ptIdx}`} style={styles.tableRow}>
                    <PdfCell width={widths[0]}>{cellText(pt.cal ?? pt.calPoint)}</PdfCell>
                    <PdfCell width={widths[1]}>{cellText(pt.std)}</PdfCell>
                    <PdfCell width={widths[2]}>{cellText(pt.uuc)}</PdfCell>
                    <PdfCell width={widths[3]}>{cellText(pt.dev)}</PdfCell>
                    <PdfCell last width={widths[4]}>
                      {cellText(pt.cmc || cmcValue)}
                    </PdfCell>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function r08SelectedUnit(unit) {
  const key = normalizePressureUnit(unit);
  return Object.prototype.hasOwnProperty.call(toBar, key)
    ? pressureUnitLabel(key)
    : pressureUnitLabel(unit);
}

function R08ResultsTable({
  unit,
  cmc,
  rows,
  leastCount,
  rangeMax,
  cmcValue,
  instrumentId,
  descriptionOfUUC,
  result_used,
  uucData,
}) {
  const selectedUnit = r08SelectedUnit(unit);
  const expanded = expandR08Rows(rows, {
    unit,
    leastCount,
    rangeMax,
    cmcValue,
    toBar,
    instrumentId,
    descriptionOfUUC,
    result_used,
    uucData,
  });
  // A 5-point sweep is a deliberate choice, so don't pad it out to the
  // default minimum with blank rows.
  const data = resultRows(expanded, expanded.length || undefined);
  const widths = ["11%", "11%", "11%", "11%", "12%", "11%", "10%", "11%", "12%"];
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <PdfCell header width="22%">UUC Reading</PdfCell>
        <PdfCell header width="22%">Reading of Master</PdfCell>
        <PdfCell header width={widths[4]}>Mean Value</PdfCell>
        <PdfCell header width={widths[5]}>Deviation</PdfCell>
        <PdfCell header width={widths[6]}>Error</PdfCell>
        <PdfCell header width={widths[7]}>Hysteresis</PdfCell>
        <PdfCell header last width={widths[8]}>
          ± Expanded uncertainty
        </PdfCell>
      </View>
      <View style={styles.tableRow}>
        <PdfCell header width="22%">Pind</PdfCell>
        <PdfCell header width="22%">Pstd</PdfCell>
        <PdfCell header fontFamily="TimesNewRoman" width={widths[4]}>
          Ṕ=(M1+M2)/2
        </PdfCell>
        <PdfCell header fontFamily="TimesNewRoman" width={widths[5]}>
          ΔP=Pind(bar)-Ṕ
        </PdfCell>
        <PdfCell header width={widths[6]}>F.S</PdfCell>
        <PdfCell header width={widths[7]}>h= |M2-M1|</PdfCell>
        <PdfCell header last width={widths[8]}>
          (k=2) U
        </PdfCell>
      </View>
      <View style={styles.tableRow}>
        <PdfCell header width={widths[0]}>{selectedUnit}</PdfCell>
        <PdfCell header width={widths[1]}>bar</PdfCell>
        <PdfCell header fontFamily="TimesNewRoman" width={widths[2]}>
          bar M1 ↑
        </PdfCell>
        <PdfCell header fontFamily="TimesNewRoman" width={widths[3]}>
          bar M2 ↓
        </PdfCell>
        <PdfCell header width={widths[4]}>bar</PdfCell>
        <PdfCell header width={widths[5]}>bar</PdfCell>
        <PdfCell header width={widths[6]}>%</PdfCell>
        <PdfCell header width={widths[7]}>bar</PdfCell>
        <PdfCell header last width={widths[8]}>
          {cmc || " "}
        </PdfCell>
      </View>
      {data.map((row, idx) => (
        <View key={idx} style={styles.tableRow}>
          <PdfCell width={widths[0]}>
            {cellText(row.pindDisplay ?? row.pindKgCm2)}
          </PdfCell>
          <PdfCell width={widths[1]}>{cellText(row.pindBar)}</PdfCell>
          <PdfCell width={widths[2]}>{cellText(row.m1)}</PdfCell>
          <PdfCell width={widths[3]}>{cellText(row.m2)}</PdfCell>
          <PdfCell width={widths[4]}>{cellText(row.mean)}</PdfCell>
          <PdfCell width={widths[5]}>{cellText(row.deviation)}</PdfCell>
          <PdfCell width={widths[6]}>{cellText(row.errorPercent)}</PdfCell>
          <PdfCell width={widths[7]}>{cellText(row.hysteresis)}</PdfCell>
          <PdfCell last width={widths[8]}>
            {cellText(
              compoundCmcForReading(
                row.cmc_value ??
                  row.expandedUncertainty ??
                  row.uncertainty ??
                  cmcValue,
                row.uuc ?? row.pindDisplay ?? row.pindKgCm2,
              ),
            )}
          </PdfCell>
        </View>
      ))}
    </View>
  );
}

function R07ResultsTable({ cmc, rows }) {
  const widths = ["16%", "16%", "18%", "22%", "14%", "14%"];
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <PdfCell header width={widths[0]}>Passing through IS Sieve</PdfCell>
        <PdfCell header width={widths[1]}>Retained on IS Sieve</PdfCell>
        <PdfCell header width={widths[2]}>Standard Reading (Length Gauge)</PdfCell>
        <PdfCell header width={widths[3]}>Measured reading on Unit under calibration</PdfCell>
        <PdfCell header width={widths[4]}>Error</PdfCell>
        <PdfCell header last width={widths[5]}>Uncertainty</PdfCell>
      </View>
      <PdfUnitRow
        widths={widths}
        cells={["mm", "mm", "mm", "mm", "mm", cmc || "mm"]}
      />
      {rows.map((row, idx) => (
        <View key={idx} style={styles.tableRow}>
          <PdfCell width={widths[0]}>{cellText(row.passing)}</PdfCell>
          <PdfCell width={widths[1]}>{cellText(row.retained)}</PdfCell>
          <PdfCell width={widths[2]}>{formatNum(row.standard, 2)}</PdfCell>
          <PdfCell width={widths[3]}>{formatNum(row.measured, 2)}</PdfCell>
          <PdfCell width={widths[4]}>{formatNum(row.error, 2)}</PdfCell>
          <PdfCell last width={widths[5]}>{formatNum(row.uncertainty, 0)}</PdfCell>
        </View>
      ))}
    </View>
  );
}

function R05ResultsTable({ unit, cmc, rows = [], description }) {
  const { major, minor } = r05AngleUnits(unit);
  const widths = ["18%", "11%", "11%", "11%", "11%", "11%", "11%", "16%"];
  const title =
    description ||
    rows.find((row) => row?.description)?.description ||
    R05_DEFAULT_DESCRIPTION;
  const data = expandR05Rows(rows);

  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <View
          style={[
            styles.th,
            {
              width: widths[0],
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <Text
            style={{
              fontFamily: "Times-Bold",
              fontSize: 6.5,
              textAlign: "center",
            }}
          >
            Description
          </Text>
        </View>
        <View style={{ width: "82%" }}>
          <View style={styles.tableRow}>
            <PdfCell header width="26.829%">Readings set on UUC</PdfCell>
            <PdfCell header width="26.829%">
              Reading on master (avg. of 3 rdgs.)
            </PdfCell>
            <PdfCell header width="26.829%">Error</PdfCell>
            <PdfCell header last width="19.513%">
              Uncertainty ±
            </PdfCell>
          </View>
          <View style={styles.tableRow}>
            <PdfCell header width="13.4145%">{major}</PdfCell>
            <PdfCell header width="13.4145%">{minor}</PdfCell>
            <PdfCell header width="13.4145%">{major}</PdfCell>
            <PdfCell header width="13.4145%">{minor}</PdfCell>
            <PdfCell header width="13.4145%">{major}</PdfCell>
            <PdfCell header width="13.4145%">{minor}</PdfCell>
            <PdfCell header last width="19.513%">
              {cmc || " "}
            </PdfCell>
          </View>
        </View>
      </View>
      {data.length > 0 ? (
        <View style={styles.tableRow}>
          <View
            style={[
              styles.td,
              {
                width: widths[0],
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <Text style={{ fontSize: 7, textAlign: "center" }}>
              {cellText(title)}
            </Text>
          </View>
          <View style={{ width: "82%" }}>
            {data.map((row, idx) => (
              <View key={idx} style={styles.tableRow}>
                <PdfCell width="13.4145%">{formatAnglePart(row.setOnUucDeg)}</PdfCell>
                <PdfCell width="13.4145%">{formatAnglePart(row.setOnUucMin)}</PdfCell>
                <PdfCell width="13.4145%">{formatAnglePart(row.masterDeg)}</PdfCell>
                <PdfCell width="13.4145%">{formatAnglePart(row.masterMin)}</PdfCell>
                <PdfCell width="13.4145%">{formatAnglePart(row.errorDeg)}</PdfCell>
                <PdfCell width="13.4145%">{formatAnglePart(row.errorMin)}</PdfCell>
                <PdfCell last width="19.513%">
                  {formatNum(row.uncertainty)}
                </PdfCell>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function R12ResultsTable({ data, cmcValue }) {
  const widths = ["16%", "20%", "18%", "14%", "14%", "18%"];
  const innerWidths = ["23.81%", "21.43%", "16.67%", "16.67%", "21.42%"];
  const payload = r12ReadingOf(data);
  const unit = payload.unit || " ";
  const points = Array.isArray(payload.points) ? payload.points : [];
  return (
    <View>
      <Text
        style={{
          fontFamily: "Times-Bold",
          fontSize: 8,
          marginBottom: 4,
        }}
      >
        {`Parameter: ${payload.parameter || ""}`}
      </Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <PdfCell header width={widths[0]}>Range</PdfCell>
          <PdfCell header width={widths[1]}>Measured on Ref. Standard</PdfCell>
          <PdfCell header width={widths[2]}>
            Measured on UUC (Unit under calibration)
          </PdfCell>
          <PdfCell header width={widths[3]}>Error</PdfCell>
          <PdfCell header width={widths[4]}>Error</PdfCell>
          <PdfCell header last width={widths[5]}>
            Expanded Uncertainty
          </PdfCell>
        </View>
        <View style={styles.tableRow}>
          <PdfCell header fontFamily="TimesNewRoman" width={widths[0]}>
            {unit}
          </PdfCell>
          <PdfCell header fontFamily="TimesNewRoman" width={widths[1]}>
            {unit}
          </PdfCell>
          <PdfCell header fontFamily="TimesNewRoman" width={widths[2]}>
            {unit}
          </PdfCell>
          <PdfCell header fontFamily="TimesNewRoman" width={widths[3]}>
            {unit}
          </PdfCell>
          <PdfCell header fontFamily="TimesNewRoman" width={widths[4]}>
            %
          </PdfCell>
          <PdfCell header fontFamily="TimesNewRoman" last width={widths[5]}>
            %
          </PdfCell>
        </View>
        {points.length > 0 ? (
          <View style={styles.tableRow}>
            <View
              style={{
                width: widths[0],
                borderRight: "0.5pt solid #000",
                borderBottom: "0.5pt solid #000",
                justifyContent: "center",
                alignItems: "center",
                padding: 2,
              }}
            >
              <Text style={{ fontSize: 7, textAlign: "center" }}>
                {cellText(payload.rangeMax)}
              </Text>
            </View>
            <View style={{ width: "84%", flexDirection: "column" }}>
              {points.map((pt, ptIdx) => (
                <View key={ptIdx} style={styles.tableRow}>
                  <PdfCell width={innerWidths[0]}>
                    {cellText(pt.std ?? pt.refStandard)}
                  </PdfCell>
                  <PdfCell width={innerWidths[1]}>
                    {cellText(pt.uuc ?? pt.uucReading)}
                  </PdfCell>
                  <PdfCell width={innerWidths[2]}>{cellText(pt.error)}</PdfCell>
                  <PdfCell width={innerWidths[3]}>
                    {cellText(pt.errorPct ?? pt.errorPercent)}
                  </PdfCell>
                  <PdfCell last width={innerWidths[4]}>
                    {cellText(pt.cmc ?? pt.uncertainty ?? cmcValue)}
                  </PdfCell>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function R15ResultsTable({ data, cmcValue }) {
  const widths = ["16.6%", "16.6%", "16.6%", "17%", "16.6%", "17.2%"];
  const payload = r15ReadingOf(data);
  const points = Array.isArray(payload.points) ? payload.points : [];
  const headerCell = (width, last, line1, line2) => (
    <View
      style={{
        width,
        borderRight: last ? 0 : "0.5pt solid #000",
        borderBottom: "0.5pt solid #000",
        justifyContent: "center",
        alignItems: "center",
        padding: 2,
      }}
    >
      <Text
        style={{
          fontFamily: "Times-Bold",
          fontSize: 6.5,
          textAlign: "center",
        }}
      >
        {line1}
      </Text>
      <Text
        style={{
          fontFamily: "Times-Bold",
          fontSize: 6.5,
          textAlign: "center",
        }}
      >
        {line2}
      </Text>
    </View>
  );
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        {headerCell(widths[0], false, "Calibration Points in", "Min")}
        {headerCell(widths[1], false, "Calibration Points In", "Sec")}
        {headerCell(widths[2], false, "Measured on Ref. Standard", "Sec")}
        {headerCell(
          widths[3],
          false,
          "Measured on UUC (Unit under calibration)",
          "Sec",
        )}
        {headerCell(widths[4], false, "Error", "Sec")}
        {headerCell(widths[5], true, "±Expanded Uncertainty", "Sec")}
      </View>
      {points.map((pt, idx) => {
        const isLast = idx === points.length - 1;
        return (
          <View key={idx} style={styles.tableRow}>
            <PdfCell width={widths[0]} noBottom={isLast}>
              {cellText(pt.min)}
            </PdfCell>
            <PdfCell width={widths[1]} noBottom={isLast}>
              {cellText(pt.uucSec)}
            </PdfCell>
            <PdfCell width={widths[2]} noBottom={isLast}>
              {cellText(pt.refSec)}
            </PdfCell>
            <PdfCell width={widths[3]} noBottom={isLast}>
              {cellText(pt.uucSec)}
            </PdfCell>
            <PdfCell width={widths[4]} noBottom={isLast}>
              {cellText(pt.error)}
            </PdfCell>
            <PdfCell last width={widths[5]} noBottom={isLast}>
              {cellText(pt.cmc ?? cmcValue ?? 4.28)}
            </PdfCell>
          </View>
        );
      })}
    </View>
  );
}

function R14ResultsTable({ data, testVoltage }) {
  const innerWidths = ["16.6%", "16.6%", "16.6%", "16.6%", "16.6%", "17%"];
  const payload = r14ReadingOf(data);
  const voltage = payload.test_voltage || testVoltage || "@5000V DC";
  const tiers = Array.isArray(payload.tiers) ? payload.tiers : [];
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, { padding: 0, margin: 0 }]}>
        <View
          style={{
            width: "15%",
            justifyContent: "center",
            alignItems: "center",
            borderRight: "0.5pt solid #000",
            borderBottom: "0.5pt solid #000",
            padding: 2,
          }}
        >
          <Text
            style={{
              fontFamily: "Times-Bold",
              fontSize: 7,
              textAlign: "center",
            }}
          >
            {cellText(voltage)}
          </Text>
        </View>
        <View style={{ width: "85%", flexDirection: "column" }}>
          <View style={styles.tableRow}>
            <PdfCell header last width="100%">
              RESISTANCE
            </PdfCell>
          </View>
          <View style={styles.tableRow}>
            <PdfCell header width={innerWidths[0]}>
              Calibration Point/Range
            </PdfCell>
            <PdfCell header width={innerWidths[1]}>
              Assigned Values of Reference Standards
            </PdfCell>
            <PdfCell header width={innerWidths[2]}>UUC Reading</PdfCell>
            <PdfCell header width={innerWidths[3]}>Deviation</PdfCell>
            <PdfCell header width={innerWidths[4]}>Error</PdfCell>
            <PdfCell header last width={innerWidths[5]}>
              Expanded Uncertainty
            </PdfCell>
          </View>
          {tiers.map((tier, tierIdx) => {
            const safeUnit = pdfSafeOhm(tier.unit);
            const points = Array.isArray(tier.points) ? tier.points : [];
            return (
              <React.Fragment key={`${safeUnit || "tier"}-${tierIdx}`}>
                <View style={styles.tableRow}>
                  <PdfCell
                    header
                    fontFamily="TimesNewRoman"
                    width={innerWidths[0]}
                  >
                    {safeUnit}
                  </PdfCell>
                  <PdfCell
                    header
                    fontFamily="TimesNewRoman"
                    width={innerWidths[1]}
                  >
                    {safeUnit}
                  </PdfCell>
                  <PdfCell
                    header
                    fontFamily="TimesNewRoman"
                    width={innerWidths[2]}
                  >
                    {safeUnit}
                  </PdfCell>
                  <PdfCell
                    header
                    fontFamily="TimesNewRoman"
                    width={innerWidths[3]}
                  >
                    {safeUnit}
                  </PdfCell>
                  <PdfCell header width={innerWidths[4]}>%</PdfCell>
                  <PdfCell header last width={innerWidths[5]}>%</PdfCell>
                </View>
                {points.map((pt, ptIdx) => {
                  const isLastOverall =
                    tierIdx === tiers.length - 1 &&
                    ptIdx === points.length - 1;
                  return (
                    <View key={`${tierIdx}-${ptIdx}`} style={styles.tableRow}>
                      <PdfCell
                        width={innerWidths[0]}
                        noBottom={isLastOverall}
                      >
                        {cellText(pt.nominal)}
                      </PdfCell>
                      <PdfCell
                        width={innerWidths[1]}
                        noBottom={isLastOverall}
                      >
                        {cellText(pt.ref)}
                      </PdfCell>
                      <PdfCell
                        width={innerWidths[2]}
                        noBottom={isLastOverall}
                      >
                        {cellText(pt.uuc)}
                      </PdfCell>
                      <PdfCell
                        width={innerWidths[3]}
                        noBottom={isLastOverall}
                      >
                        {cellText(pt.dev)}
                      </PdfCell>
                      <PdfCell
                        width={innerWidths[4]}
                        noBottom={isLastOverall}
                      >
                        {cellText(pt.errorPct)}
                      </PdfCell>
                      <PdfCell
                        last
                        width={innerWidths[5]}
                        noBottom={isLastOverall}
                      >
                        {cellText(pt.cmc)}
                      </PdfCell>
                    </View>
                  );
                })}
              </React.Fragment>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function R09ChannelTable({ title, unit, rows, cmc }) {
  const widths = ["20%", "20%", "20%", "20%", "20%"];
  const data = Array.isArray(rows) ? rows : [];
  return (
    <View>
      <Text
        style={{
          fontFamily: "TimesNewRoman",
          fontWeight: 700,
          fontSize: 8,
          marginBottom: 4,
          textAlign: "left",
        }}
      >
        {title}
      </Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <PdfCell header width={widths[0]}>Calibration Points</PdfCell>
          <PdfCell header width={widths[1]}>
            Measured rdgs. on Ref. Standard
          </PdfCell>
          <PdfCell header width={widths[2]}>
            Measured rdgs. on UUC (Unit under calibration)
          </PdfCell>
          <PdfCell header width={widths[3]}>Error</PdfCell>
          <PdfCell header last width={widths[4]}>
            ± Expanded Uncertainty
          </PdfCell>
        </View>
        <View style={styles.tableRow}>
          <PdfCell header fontFamily="TimesNewRoman" width={widths[0]}>
            {unit}
          </PdfCell>
          <PdfCell header fontFamily="TimesNewRoman" width={widths[1]}>
            {unit}
          </PdfCell>
          <PdfCell header fontFamily="TimesNewRoman" width={widths[2]}>
            {unit}
          </PdfCell>
          <PdfCell header fontFamily="TimesNewRoman" width={widths[3]}>
            {unit}
          </PdfCell>
          <PdfCell header fontFamily="TimesNewRoman" last width={widths[4]}>
            {unit}
          </PdfCell>
        </View>
        {data.map((row, idx) => (
          <View key={idx} style={styles.tableRow}>
            <PdfCell width={widths[0]}>
              {cellText(row.uucVal ?? row.uuc)}
            </PdfCell>
            <PdfCell width={widths[1]}>
              {cellText(row.refVal ?? row.standard)}
            </PdfCell>
            <PdfCell width={widths[2]}>
              {cellText(row.uucVal ?? row.uuc)}
            </PdfCell>
            <PdfCell width={widths[3]}>{cellText(row.error)}</PdfCell>
            <PdfCell last width={widths[4]}>
              {cellText(cmc)}
            </PdfCell>
          </View>
        ))}
      </View>
    </View>
  );
}

function R09ResultsTable({ data, cmcValue }) {
  const payload = isR09Readings(data) ? data : { rh: [], temp: [] };
  return (
    <View>
      <R09ChannelTable
        title="At Set Temperature 25°C"
        unit="%RH"
        rows={payload.rh}
        cmc={r09CmcForChannel(cmcValue, "rh")}
      />
      <View style={{ marginTop: 12 }}>
        <R09ChannelTable
          title="At Set Humidity 50%"
          unit="°C"
          rows={payload.temp}
          cmc={r09CmcForChannel(cmcValue, "temp")}
        />
      </View>
    </View>
  );
}

function R10ResultsTable({ rows, cmcValue, leastCount }) {
  const widths = ["18%", "24%", "24%", "16%", "18%"];
  const data = Array.isArray(rows)
    ? rows.filter((point) => point && point.kind !== "group")
    : [];
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <PdfCell header width={widths[0]}>
          Calibration Points In
        </PdfCell>
        <PdfCell header width={widths[1]}>
          Measured Temp. on Ref. Standard
        </PdfCell>
        <PdfCell header width={widths[2]}>
          Measured Temp. on UUC (Unit under calibration)
        </PdfCell>
        <PdfCell header width={widths[3]}>Error</PdfCell>
        <PdfCell header last width={widths[4]}>
          ±Expanded Uncertainty
        </PdfCell>
      </View>
      <View style={styles.tableRow}>
        <PdfCell header fontFamily="TimesNewRoman" width={widths[0]}>
          °C
        </PdfCell>
        <PdfCell header fontFamily="TimesNewRoman" width={widths[1]}>
          °C
        </PdfCell>
        <PdfCell header fontFamily="TimesNewRoman" width={widths[2]}>
          °C
        </PdfCell>
        <PdfCell header fontFamily="TimesNewRoman" width={widths[3]}>
          °C
        </PdfCell>
        <PdfCell header fontFamily="TimesNewRoman" last width={widths[4]}>
          °C
        </PdfCell>
      </View>
      {data.map((point, index) => (
        <View key={index} style={styles.tableRow}>
          <PdfCell width={widths[0]}>{cellText(point.nominal)}</PdfCell>
          <PdfCell width={widths[1]}>{cellText(point.standard)}</PdfCell>
          <PdfCell width={widths[2]}>{cellText(point.uuc)}</PdfCell>
          <PdfCell width={widths[3]}>
            {cellText(r10Error(point, leastCount))}
          </PdfCell>
          <PdfCell last width={widths[4]}>
            {cellText(point.cmc_value ?? point.expandedUncertainty ?? cmcValue)}
          </PdfCell>
        </View>
      ))}
    </View>
  );
}

function DefaultResultsTable({ cols, calibrationData, unitCells }) {
  const rows = resultRows(calibrationData);
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <Text style={[styles.th, { width: "18%" }]}>UUC Reading Pind</Text>
        <Text style={[styles.th, { width: "20%" }]}>Reading of Master Pstd</Text>
        <Text style={[styles.th, { width: "12%" }]}>Mean value{"\n"}P̄=(M1+M2)/2</Text>
        <Text style={[styles.th, { width: "10%" }]}>Deviation{"\n"}ΔP=P̄-Pind</Text>
        <Text style={[styles.th, { width: "10%" }]}>Error{"\n"}F.S</Text>
        <Text style={[styles.th, { width: "10%" }]}>Hysteresis{"\n"}h=|M2-M1|</Text>
        <Text style={[styles.th, styles.lastCol, { width: "20%" }]}>
          ±Expanded uncertainty{"\n"}(k=2) U
        </Text>
      </View>
      <View style={styles.tableRow}>
        {cols.map((col, i) => (
          <PdfCell
            key={col.key}
            header
            width={col.width}
            last={i === cols.length - 1}
          >
            {col.label}
          </PdfCell>
        ))}
      </View>
      <PdfUnitRow
        widths={cols.map((col) => col.width)}
        cells={unitCells}
      />
      {rows.map((row, idx) => (
        <View key={idx} style={styles.tableRow}>
          {cols.map((col, i) => (
            <PdfCell
              key={col.key}
              width={col.width}
              last={i === cols.length - 1}
            >
              {col.key === "errorPercent"
                ? formatNum(row[col.key], 2)
                : formatNum(row[col.key])}
            </PdfCell>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function CalibrationResultsPdf({ cert, profile }) {
  const uucData = cert.uucData || cert.equipment?.uuc || {};
  const layoutRaw = resultLayout(
    cert.template ||
      uucData.result_used ||
      cert.result_used ||
      profile.result_used,
  );
  const layout =
    isR15Row(cert) ||
    isR15Row(uucData) ||
    isR15Readings(cert.calibrationData) ||
    isR15Readings(cert.readings) ||
    matchesR15UucId(
      cert.instrumentId,
      cert.uuc_id,
      cert.descriptionOfUUC,
      uucData.id,
    )
      ? "R-15"
      : layoutRaw;
  const unit = resultUnit(uucData, profile);
  const cmc = cmcUnit(uucData, profile);
  const cmcValue = cert.cmc_value || pickCmc(uucData) || uucData.cmc;
  const cmcBands = resolveCmcBands(
    cert.cmc_bands,
    uucData.cmc_bands,
    uucData.cmcBands,
    uucData,
  );
  const electroData = isElectroReadings(cert.calibrationData)
    ? cert.calibrationData
    : isElectroReadings(cert.readings)
      ? cert.readings
      : cert.calibrationData;
  const r12Data = isR12Readings(cert.calibrationData)
    ? cert.calibrationData
    : isR12Readings(cert.readings)
      ? cert.readings
      : cert.calibrationData;
  const r14Data = isR14Readings(cert.calibrationData)
    ? cert.calibrationData
    : isR14Readings(cert.readings)
      ? cert.readings
      : cert.calibrationData;
  const r15Data = isR15Readings(cert.calibrationData)
    ? cert.calibrationData
    : isR15Readings(cert.readings)
      ? cert.readings
      : cert.calibrationData;
  const tachometerData = isTachometerReadings(cert.calibrationData)
    ? cert.calibrationData
    : isTachometerReadings(cert.readings)
      ? cert.readings
      : null;
  const vernierData = isVernierReadings(cert.calibrationData)
    ? cert.calibrationData
    : isVernierReadings(cert.readings)
      ? cert.readings
      : null;
  const dimensionalUmData = isDimensionalUmReadings(cert.calibrationData)
    ? cert.calibrationData
    : isDimensionalUmReadings(cert.readings)
      ? cert.readings
      : null;
  const angularData = isAngularReadings(cert.calibrationData)
    ? cert.calibrationData
    : isAngularReadings(cert.readings)
      ? cert.readings
      : null;
  const d09Data = isD09Readings(cert.calibrationData)
    ? cert.calibrationData
    : isD09Readings(cert.readings)
      ? cert.readings
      : null;
  const rodData = isRodReadings(cert.calibrationData)
    ? cert.calibrationData
    : isRodReadings(cert.readings)
      ? cert.readings
      : null;
  const d17Data = isD17Readings(cert.calibrationData)
    ? cert.calibrationData
    : isD17Readings(cert.readings)
      ? cert.readings
      : null;
  const tapeData = isTapeReadings(cert.calibrationData)
    ? cert.calibrationData
    : isTapeReadings(cert.readings)
      ? cert.readings
      : null;
  const d25Data = isD25Readings(cert.calibrationData)
    ? cert.calibrationData
    : isD25Readings(cert.readings)
      ? cert.readings
      : null;
  const utgData = isUtgReadings(cert.calibrationData)
    ? cert.calibrationData
    : isUtgReadings(cert.readings)
      ? cert.readings
      : null;
  const d42Data = isD42Readings(cert.calibrationData)
    ? cert.calibrationData
    : isD42Readings(cert.readings)
      ? cert.readings
      : null;
  const d18Data = isD18Readings(cert.calibrationData)
    ? cert.calibrationData
    : isD18Readings(cert.readings)
      ? cert.readings
      : null;
  const d20Data = isD20Readings(cert.calibrationData)
    ? cert.calibrationData
    : isD20Readings(cert.readings)
      ? cert.readings
      : null;
  const d21Data = isD21Readings(cert.calibrationData)
    ? cert.calibrationData
    : isD21Readings(cert.readings)
      ? cert.readings
      : null;
  const d22Data = isD22Readings(cert.calibrationData)
    ? cert.calibrationData
    : isD22Readings(cert.readings)
      ? cert.readings
      : null;
  const d19Data = isD19Readings(cert.calibrationData)
    ? cert.calibrationData
    : isD19Readings(cert.readings)
      ? cert.readings
      : null;
  const d32Data = isD32Readings(cert.calibrationData)
    ? cert.calibrationData
    : isD32Readings(cert.readings)
      ? cert.readings
      : null;
  const d31Data = isD31Readings(cert.calibrationData)
    ? cert.calibrationData
    : isD31Readings(cert.readings)
      ? cert.readings
      : null;
  if (d32Data) {
    return <MasterMeasurementResultsTable data={d32Data} />;
  }
  if (d31Data) {
    return <RadiusGaugeResultsTable data={d31Data} />;
  }
  if (d19Data) {
    return <FeelerGaugeResultsTable data={d19Data} />;
  }
  if (d22Data) {
    return <TubularMicrometerResultsTable data={d22Data} />;
  }
  if (d21Data) {
    return <AggregateD21ResultsTable data={d21Data} />;
  }
  if (d20Data) {
    return <FilletWeldResultsTable data={d20Data} />;
  }
  const rows =
    d18Data
      ? d18DisplayRows(d18Data)
    : d42Data
      ? d42DisplayRows(d42Data)
    : utgData
      ? utgDisplayRows(utgData)
    : d25Data
      ? d25DisplayRows(d25Data)
    : tapeData
      ? tapeDisplayRows(tapeData)
    : d17Data
      ? d17DisplayRows(d17Data)
    : rodData
      ? rodDisplayRows(rodData)
    : d09Data
      ? d09DisplayRows(d09Data)
    : angularData
      ? angularDisplayRows(angularData)
    : dimensionalUmData
      ? dimensionalUmDisplayRows(dimensionalUmData)
    : vernierData
      ? vernierDisplayRows(vernierData)
    : tachometerData
      ? tachometerDisplayRows(tachometerData)
    : layout === "R-09"
      ? cert.calibrationData
      : layout === "R-11" || layout === "E01" || layout === "E02"
        ? electroData
        : layout === "R-12"
          ? r12Data
        : layout === "R-14"
          ? r14Data
        : layout === "R-15"
          ? r15Data
        : withCmcValue(
            layout === "R-10"
              ? cert.calibrationData || cert.readings
              : cert.calibrationData,
            cmcValue,
            { cmcBands },
          );

  if (d18Data) {
    return <D18ResultsTable rows={rows} />;
  }
  if (d42Data) {
    return <D42ResultsTable rows={rows} />;
  }
  if (utgData) {
    return <UtgResultsTable rows={rows} />;
  }
  if (d25Data) {
    return <D25ResultsTable rows={rows} />;
  }
  if (tapeData) {
    return <TapeResultsTable rows={rows} />;
  }
  if (d17Data) {
    return <D17ResultsTable rows={rows} />;
  }
  if (rodData) {
    return <TwoColumnRodsResultsTable rows={rows} />;
  }
  if (d09Data) {
    return <D09ResultsTable rows={rows} />;
  }
  if (angularData) {
    return <AngularDegMinResultsTable data={rows} />;
  }
  if (dimensionalUmData) {
    return <DimensionalUmResultsTable rows={rows} />;
  }
  if (vernierData) {
    return <R02ResultsTable unit={unit} cmc={cmc} rows={rows} />;
  }
  if (layout === "R-01" || tachometerData) {
    return (
      <R01ResultsTable
        unit={unit}
        cmc={cmc}
        rows={tachometerData ? rows : resultRows(rows)}
      />
    );
  }
  if (layout === "R-02") {
    return <R02ResultsTable unit={unit} cmc={cmc} rows={resultRows(rows)} />;
  }
  if (layout === "R-03") {
    return <R03ResultsTable unit={unit} cmc={cmc} rows={resultRows(rows)} />;
  }
  if (layout === "R-05") {
    return (
      <R05ResultsTable
        unit={unit}
        cmc={cmc}
        rows={rows || []}
        description={
          uucData.parameter ||
          profile.parameter ||
          rows?.[0]?.description
        }
      />
    );
  }
  if (layout === "R-06") {
    return <R06ResultsTable unit={unit} cmc={cmc} rows={rows || []} />;
  }
  if (layout === "R-07") {
    return <R07ResultsTable cmc={cmc} rows={rows || []} />;
  }
  if (layout === "R-08") {
    return (
      <R08ResultsTable
        unit={unit}
        cmc={cmc}
        rows={rows || []}
        leastCount={cert.resolution || uucData.resolution || uucData.leastCount}
        rangeMax={cert.rangeMax || uucData.rangeMax || uucData.range_max}
        cmcValue={cert.cmc_value || pickCmc(uucData) || uucData.cmc}
        instrumentId={cert.instrumentId || cert.idNumber || uucData.instrumentId}
        descriptionOfUUC={cert.descriptionOfUUC || uucData.descriptionOfUUC}
        result_used={
          uucData.result_used || cert.result_used || profile.result_used
        }
        uucData={uucData}
      />
    );
  }
  if (layout === "R-09") {
    return <R09ResultsTable data={rows} cmcValue={cmcValue} />;
  }
  if (layout === "R-10") {
    return (
      <R10ResultsTable
        rows={rows || []}
        cmcValue={cmcValue}
        leastCount={cert.resolution || uucData.resolution || uucData.leastCount}
      />
    );
  }
  if (layout === "R-11") {
    return (
      <ElectroResultsTable
        data={rows || []}
        cmcValue={cmcValue}
        headers={[
          "Cal. Point/Range",
          "Std. Reading",
          "UUC Reading",
          "Deviation",
          "Expanded Uncertainty",
        ]}
      />
    );
  }
  if (layout === "E01" || layout === "E02") {
    return (
      <ElectroResultsTable
        data={rows || []}
        cmcValue={cmcValue}
        headers={[
          "Cal. Point/Range",
          "Std. Reading",
          "UUC Reading",
          "Deviation",
          "Expanded Uncertainty",
        ]}
      />
    );
  }
  if (layout === "R-12") {
    return <R12ResultsTable data={rows || []} cmcValue={cmcValue} />;
  }
  if (layout === "R-14") {
    return (
      <R14ResultsTable
        data={rows || []}
        testVoltage={cert.test_voltage}
      />
    );
  }
  if (layout === "R-15") {
    return <R15ResultsTable data={rows || []} cmcValue={cmcValue} />;
  }

  const cols = resultCols(profile);
  const unitCells = cols.map((col, i) => {
    if (i === cols.length - 1) return uncertaintyUnitLabel(uucData, profile);
    if (col.key === "pindKgCm2") return profile.uucUnit || unit;
    return profile.masterUnit || unit;
  });
  return (
    <DefaultResultsTable
      cols={cols}
      calibrationData={rows}
      unitCells={unitCells}
    />
  );
}
