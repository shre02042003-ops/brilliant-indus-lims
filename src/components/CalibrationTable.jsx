import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
} from "@mui/material";
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
import { pickCmc, expandR08Rows, compoundCmcForReading, r09CmcForChannel, isR09Readings, r10Error, electroDisplayGroups, r12ReadingOf, r14ReadingOf, r15ReadingOf, isR15Readings, isR15Row, matchesR15UucId, isTachometerReadings, tachometerDisplayRows, isVernierReadings, vernierDisplayRows, isDimensionalUmReadings, dimensionalUmDisplayRows, isAngularReadings, angularDisplayRows, isD09Readings, d09DisplayRows, isRodReadings, rodDisplayRows, isD17Readings, d17DisplayRows, isTapeReadings, tapeDisplayRows, isD25Readings, d25DisplayRows, isUtgReadings, utgDisplayRows, isD42Readings, d42DisplayRows, isD18Readings, d18DisplayRows, isD20Readings, isD21Readings, isD22Readings, isD19Readings, isD31Readings, isD32Readings } from "../utils/readings";
import { pressureUnitLabel, toBar } from "../utils/pressureUnits";

const cellHead = {
  fontWeight: "bold",
  border: "1px solid #000",
};

const cellBody = {
  border: "1px solid #ccc",
  height: 28,
};

function ResultsShell({ children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography
        fontWeight="bold"
        gutterBottom
        textAlign="center"
        variant="subtitle1"
      >
        CALIBRATION RESULTS
      </Typography>
      <TableContainer sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ borderCollapse: "collapse" }}>
          {children}
        </Table>
      </TableContainer>
    </Paper>
  );
}

function UnitCells({ cells }) {
  return (
    <TableRow>
      {cells.map((text, i) => (
        <TableCell key={`${text}-${i}`} align="center" sx={cellHead}>
          {text || " "}
        </TableCell>
      ))}
    </TableRow>
  );
}

function R01Table({ unit, cmc, rows }) {
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead}>
            Set {unit || ""} on Unit Under Calibration
          </TableCell>
          <TableCell align="center" sx={cellHead}>
            Measured reading on Master (avg of 3 rdgs.)
          </TableCell>
          <TableCell align="center" sx={cellHead}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>Uncertainty (±)</TableCell>
        </TableRow>
        <UnitCells cells={[unit, unit, unit, `± ${cmc}`]} />
      </TableHead>
      <TableBody>
        {rows.map((row, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>
              {r01CellText(row, ["set_rpm", "pindKgCm2"])}
            </TableCell>
            <TableCell align="center" sx={cellBody}>
              {r01CellText(row, ["master_rpm", "mean"])}
            </TableCell>
            <TableCell align="center" sx={cellBody}>
              {r01CellText(row, ["error", "deviation"])}
            </TableCell>
            <TableCell align="center" sx={cellBody}>
              {r01CellText(row, ["cmc", "expandedUncertainty"])}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function R02Table({ unit, cmc, rows }) {
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead}>Standard Reading</TableCell>
          <TableCell colSpan={2} align="center" sx={cellHead}>
            Measured reading on UUC (avg. of 3 rdgs.)
          </TableCell>
          <TableCell colSpan={2} align="center" sx={cellHead}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>Uncertainty (±)</TableCell>
        </TableRow>
        <TableRow>
          <TableCell align="center" sx={cellHead} />
          <TableCell align="center" sx={cellHead}>External Jaw</TableCell>
          <TableCell align="center" sx={cellHead}>Internal Jaw</TableCell>
          <TableCell align="center" sx={cellHead}>External Jaw</TableCell>
          <TableCell align="center" sx={cellHead}>Internal Jaw</TableCell>
          <TableCell align="center" sx={cellHead} />
        </TableRow>
        <UnitCells cells={[unit, unit, unit, unit, unit, `± ${cmc}`]} />
      </TableHead>
      <TableBody>
        {rows.map((row, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>
              {r02CellText(row, ["standard", "pindKgCm2"])}
            </TableCell>
            <TableCell align="center" sx={cellBody}>
              {r02CellText(row, ["uuc_ext", "m1"])}
            </TableCell>
            <TableCell align="center" sx={cellBody}>
              {r02CellText(row, ["uuc_int", "m2"])}
            </TableCell>
            <TableCell align="center" sx={cellBody}>
              {r02CellText(row, ["error_ext", "errorExt"])}
            </TableCell>
            <TableCell align="center" sx={cellBody}>
              {r02CellText(row, ["error_int", "errorInt"])}
            </TableCell>
            <TableCell align="center" sx={cellBody}>
              {r02CellText(row, ["cmc", "expandedUncertainty"])}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function FilletQuadTable({ points }) {
  const show = (value) => (value == null || value === "" ? " " : String(value));
  return (
    <Table size="small" sx={{ borderCollapse: "collapse", width: "49%" }}>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead}>Standard Dimensions On UUC</TableCell>
          <TableCell align="center" sx={cellHead}>Measured reading On Master (avg. of 3 rdgs.)</TableCell>
          <TableCell align="center" sx={cellHead}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>Uncertainty (±)</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {points.map((pt, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>{show(pt.uuc)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.master)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.error)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.cmc)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AggregateD21Table({ data }) {
  const points = Array.isArray(data?.points) ? data.points : [];
  const headers = [
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
  const show = (value) => (value == null || value === "" ? " " : String(value));
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
    <ResultsShell>
      <TableHead>
        <TableRow>
          {headers.map((label) => (
            <TableCell key={label} align="center" sx={{ ...cellHead, fontSize: 11, lineHeight: 1.2 }}>
              {label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {points.map((pt, idx) => (
          <TableRow key={idx}>
            {valuesOf(pt).map((value, col) => (
              <TableCell key={col} align="center" sx={cellBody}>{show(value)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function FeelerHalf({ points }) {
  const show = (value) => (value == null || value === "" ? " " : String(value));
  return (
    <Table size="small" sx={{ borderCollapse: "collapse", width: "49%" }}>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead}>Specified Size</TableCell>
          <TableCell align="center" sx={cellHead}>Observed Size (avg. of 3 rdgs.)</TableCell>
          <TableCell align="center" sx={cellHead}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>Uncertainty (±)</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {points.map((pt, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>{show(pt.standard)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.uuc)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.error)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.cmc)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function FeelerGaugeTable({ data }) {
  const points = Array.isArray(data?.points) ? data.points : [];
  const half = Math.ceil(points.length / 2);
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography fontWeight="bold" gutterBottom textAlign="center" variant="subtitle1">
        CALIBRATION RESULTS
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
        <FeelerHalf points={points.slice(0, half)} />
        <FeelerHalf points={points.slice(half)} />
      </Box>
    </Paper>
  );
}

function MasterMeasurementTable({ data }) {
  const show = (value) => (value == null || value === "" ? " " : String(value));
  const points = Array.isArray(data?.points) ? data.points : [];
  const headers = [
    "Standard Dimension on UUC",
    "Measured on Master (avg of 3 rdgs.)",
    "Error",
    "Uncertainty",
  ];
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          {headers.map((label) => (
            <TableCell key={label} align="center" sx={cellHead}>{label}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {points.map((pt, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>{show(pt.standard)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.uuc)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.error)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.cmc)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function RadiusGaugeTable({ data }) {
  const section = (title, points) => {
    const list = Array.isArray(points) ? points : [];
    const half = Math.ceil(list.length / 2);
    return (
      <Box sx={{ mb: 2 }}>
        <Typography fontWeight="bold" textAlign="center" sx={{ mb: 0.5 }}>
          {title}
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <FeelerHalf points={list.slice(0, half)} />
          {list.slice(half).length > 0 ? <FeelerHalf points={list.slice(half)} /> : <Box sx={{ width: "49%" }} />}
        </Box>
      </Box>
    );
  };
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography fontWeight="bold" gutterBottom textAlign="center" variant="subtitle1">
        CALIBRATION RESULTS
      </Typography>
      {section("Internal Radius", data?.internalPoints)}
      {section("External Radius", data?.externalPoints)}
    </Paper>
  );
}

function TubularMicrometerTable({ data }) {
  const show = (value) => (value == null || value === "" ? " " : String(value));
  const micPoints = Array.isArray(data?.micPoints) ? data.micPoints : [];
  const extPoints = Array.isArray(data?.extPoints) ? data.extPoints : [];
  const headers = [
    "Standard Dimension (mm)",
    "Measured Dimension on UUC (mm)",
    "Error (mm)",
    "Uncertainty (µm)",
  ];
  const cells = (pt) => [pt.standard, pt.uuc, pt.error, pt.cmc];
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          {headers.map((label) => (
            <TableCell key={label} align="center" sx={cellHead}>{label}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {micPoints.map((pt, idx) => (
          <TableRow key={`mic-${idx}`}>
            {cells(pt).map((value, col) => (
              <TableCell key={col} align="center" sx={cellBody}>{show(value)}</TableCell>
            ))}
          </TableRow>
        ))}
        {extPoints.length > 0 ? (
          <TableRow>
            <TableCell align="center" colSpan={4} sx={{ ...cellHead, fontWeight: "bold" }}>
              Extension Rod
            </TableCell>
          </TableRow>
        ) : null}
        {extPoints.map((pt, idx) => (
          <TableRow key={`ext-${idx}`}>
            {cells(pt).map((value, col) => (
              <TableCell key={col} align="center" sx={cellBody}>{show(value)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function FilletWeldTable({ data }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography fontWeight="bold" gutterBottom textAlign="center" variant="subtitle1">
        CALIBRATION RESULTS
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
        <FilletQuadTable points={data.lengthPoints || []} />
        <FilletQuadTable points={data.anglePoints || []} />
      </Box>
    </Paper>
  );
}

function D18Table({ rows }) {
  const show = (value) => (value == null || value === "" ? " " : String(value));
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead}>Standard Dimension</TableCell>
          <TableCell align="center" sx={cellHead}>Measured Reading on U.U.C.</TableCell>
          <TableCell align="center" sx={cellHead}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>Uncertainty (±)</TableCell>
        </TableRow>
        <UnitCells cells={["mm", "mm", "mm", "µm"]} />
      </TableHead>
      <TableBody>
        {rows.map((pt, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>{show(pt.standard)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.uuc)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.error)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.cmc)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <Typography sx={{ mt: 1, fontSize: 12 }}>
        Parallelism Error In Measuring Faces is within 0.001 mm
      </Typography>
    </ResultsShell>
  );
}

function D42Table({ rows }) {
  const show = (value) => (value == null || value === "" ? " " : String(value));
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead}>Standard Dimension</TableCell>
          <TableCell align="center" sx={cellHead}>Measured Reading</TableCell>
          <TableCell align="center" sx={cellHead}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>Uncertainty (±)</TableCell>
        </TableRow>
        <UnitCells cells={["mm", "mm", "mm", "µm"]} />
      </TableHead>
      <TableBody>
        {rows.map((pt, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>{show(pt.standard)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.uuc)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.error)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.cmc)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function UtgTable({ rows }) {
  const show = (value) => (value == null || value === "" ? " " : String(value));
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead}>Specified Size</TableCell>
          <TableCell align="center" sx={cellHead}>Observed Size on U. U. C.</TableCell>
          <TableCell align="center" sx={cellHead}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>Uncertainty (±)</TableCell>
        </TableRow>
        <UnitCells cells={["mm", "mm", "mm", "µm"]} />
      </TableHead>
      <TableBody>
        {rows.map((pt, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>{show(pt.standard)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.uuc)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.error)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.cmc)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function D25Table({ rows }) {
  const show = (value) => (value == null || value === "" ? " " : String(value));
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead}>Standard Reading (mm)</TableCell>
          <TableCell align="center" sx={cellHead}>Measured reading on UUC (mm)</TableCell>
          <TableCell align="center" sx={cellHead}>Error (mm)</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((pt, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>{show(pt.standard)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.uuc)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.error)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <Typography sx={{ mt: 1, fontSize: 12, fontStyle: "italic" }}>
        Uncertainty of Measurement (at 95.45%C.L.) = ± 145 x sqrt(L) µm (L in m) with coverage factor k=2
      </Typography>
    </ResultsShell>
  );
}

function TapeTable({ rows }) {
  const show = (value) => (value == null || value === "" ? " " : String(value));
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead}>Standard Reading (mm)</TableCell>
          <TableCell align="center" sx={cellHead}>Measured reading on UUC (mm)</TableCell>
          <TableCell align="center" sx={cellHead}>Error (mm)</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((pt, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>{show(pt.standard)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.uuc)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.error)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <Typography sx={{ mt: 1, fontSize: 12, fontStyle: "italic" }}>
        Uncertainty of Measurement (at 95.45%C.L.) = ± 290.37 x sqrt(L) µm (L in m) with coverage factor k=2
      </Typography>
    </ResultsShell>
  );
}

function D17Table({ rows }) {
  const show = (value) => (value == null || value === "" ? " " : String(value));
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead}>Passing through IS Sieve</TableCell>
          <TableCell align="center" sx={cellHead}>Retained on IS Sieve</TableCell>
          <TableCell align="center" sx={cellHead}>Standard Reading (Length Gauge)</TableCell>
          <TableCell align="center" sx={cellHead}>
            Measured reading on Unit under calibration (avg. of 3 rdgs.)
          </TableCell>
          <TableCell align="center" sx={cellHead}>Error</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((pt, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>{show(pt.pass)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.retain)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.standard)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.uuc)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.error)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function TwoColumnRodsTable({ rows }) {
  const points = Array.isArray(rows) ? rows : [];
  const half = Math.ceil(points.length / 2);
  const col1 = points.slice(0, half);
  const col2 = points.slice(half);
  const show = (value) => (value == null || value === "" ? " " : String(value));
  const cmc = points[0]?.cmc || "7.12";
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          {["Standard", "UUC", "Error", "Standard", "UUC", "Error"].map((label, i) => (
            <TableCell key={`${label}-${i}`} align="center" sx={cellHead}>{label}</TableCell>
          ))}
        </TableRow>
        <UnitCells cells={["mm", "mm", "mm", "mm", "mm", "mm"]} />
      </TableHead>
      <TableBody>
        {col1.map((pt1, idx) => {
          const pt2 = col2[idx];
          return (
            <TableRow key={idx}>
              <TableCell align="center" sx={cellBody}>{show(pt1.standard)}</TableCell>
              <TableCell align="center" sx={cellBody}>{show(pt1.uuc)}</TableCell>
              <TableCell align="center" sx={cellBody}>{show(pt1.error)}</TableCell>
              <TableCell align="center" sx={cellBody}>{pt2 ? show(pt2.standard) : " "}</TableCell>
              <TableCell align="center" sx={cellBody}>{pt2 ? show(pt2.uuc) : " "}</TableCell>
              <TableCell align="center" sx={cellBody}>{pt2 ? show(pt2.error) : " "}</TableCell>
            </TableRow>
          );
        })}
        <TableRow>
          <TableCell align="center" sx={cellHead} colSpan={3}>Uncertainty (±)</TableCell>
          <TableCell align="center" sx={cellBody} colSpan={3}>{cmc}</TableCell>
        </TableRow>
      </TableBody>
    </ResultsShell>
  );
}

function D09Table({ rows }) {
  const show = (value) => (value == null || value === "" ? " " : String(value));
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead}>Parameter</TableCell>
          <TableCell align="center" sx={cellHead}>Standard Dimension</TableCell>
          <TableCell align="center" sx={cellHead}>± mm</TableCell>
          <TableCell align="center" sx={cellHead}>
            Measured reading on Unit under calibration (avg. of 3 rdgs.)
          </TableCell>
          <TableCell align="center" sx={cellHead}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>Uncertainty ±</TableCell>
        </TableRow>
        <UnitCells cells={[" ", "mm", "mm", "mm", "mm", "mm"]} />
      </TableHead>
      <TableBody>
        {rows.map((pt, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>{show(pt.parameter)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.standard)}</TableCell>
            <TableCell align="center" sx={cellBody}>{`± ${show(pt.tolerance)}`}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.uuc)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.error)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.cmc || pt.uncertainty)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function AngularDegMinTable({ data }) {
  const points = Array.isArray(data?.points) ? data.points : [];
  const title = data?.description || "Angular Measurement of Protractor Head";
  const show = (value) => (value == null || value === "" ? " " : String(value));
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead} rowSpan={2}>Description</TableCell>
          <TableCell align="center" sx={cellHead} colSpan={2}>Readings set on UUC</TableCell>
          <TableCell align="center" sx={cellHead} colSpan={2}>
            Reading on master (avg. of 3 rdgs.)
          </TableCell>
          <TableCell align="center" sx={cellHead} colSpan={2}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>Uncertainty ±</TableCell>
        </TableRow>
        <TableRow>
          {["deg", "min", "deg", "min", "deg", "min", "min"].map((text, i) => (
            <TableCell key={`${text}-${i}`} align="center" sx={cellHead}>{text}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {points.map((pt, idx) => (
          <TableRow key={idx}>
            {idx === 0 ? (
              <TableCell
                align="center"
                sx={{ ...cellBody, verticalAlign: "middle" }}
                rowSpan={points.length}
              >
                {title}
              </TableCell>
            ) : null}
            <TableCell align="center" sx={cellBody}>{show(pt.uuc_deg)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.uuc_min)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.master_deg)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.master_min)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.error_deg)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.error_min)}</TableCell>
            <TableCell align="center" sx={cellBody}>{show(pt.cmc || pt.uncertainty)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function DimensionalUmTable({ rows }) {
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead}>Standard Reading</TableCell>
          <TableCell align="center" sx={cellHead}>
            Measured reading on UUC (avg of 3 rdgs.)
          </TableCell>
          <TableCell align="center" sx={cellHead}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>Uncertainty (±)</TableCell>
        </TableRow>
        <UnitCells cells={["µm", "µm", "µm", "± µm"]} />
      </TableHead>
      <TableBody>
        {rows.map((row, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>{row.standard || " "}</TableCell>
            <TableCell align="center" sx={cellBody}>{row.uuc || " "}</TableCell>
            <TableCell align="center" sx={cellBody}>{row.error || " "}</TableCell>
            <TableCell align="center" sx={cellBody}>{row.cmc || " "}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function R03Table({ unit, cmc, rows }) {
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead}>Standard Dimension</TableCell>
          <TableCell align="center" sx={cellHead}>
            Measured Reading on UUC (avg. of 3 rdgs.)
          </TableCell>
          <TableCell align="center" sx={cellHead}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>Uncertainty (±)</TableCell>
        </TableRow>
        <UnitCells cells={[unit, unit, unit, `± ${cmc}`]} />
      </TableHead>
      <TableBody>
        {rows.map((row, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>{formatNum(row.pindKgCm2)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.mean)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.deviation)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.expandedUncertainty)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function R06Table({ unit, cmc, rows }) {
  const data = r06DataRows(rows);
  const unitLabel = unit || "";
  const plusUnit = unit ? `± ${unit}` : "±";

  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead} rowSpan={2}>
            Parameter
          </TableCell>
          <TableCell colSpan={2} align="center" sx={cellHead}>
            Standard Dimension
          </TableCell>
          <TableCell align="center" sx={cellHead}>
            Measured reading on Unit under calibration (avg. of 3 rdgs.)
          </TableCell>
          <TableCell align="center" sx={cellHead}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>Uncertainty ±</TableCell>
        </TableRow>
        <TableRow>
          <TableCell align="center" sx={cellHead}>{unitLabel}</TableCell>
          <TableCell align="center" sx={cellHead}>{plusUnit}</TableCell>
          <TableCell align="center" sx={cellHead}>{unitLabel}</TableCell>
          <TableCell align="center" sx={cellHead}>{unitLabel}</TableCell>
          <TableCell align="center" sx={cellHead}>{cmc || ""}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((row, idx) => (
          <TableRow key={row.parameter || idx}>
            <TableCell align="center" sx={cellBody}>{cellText(row.parameter)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.standard, 2)}</TableCell>
            <TableCell align="center" sx={cellBody}>
              {formatSignedTolerance(row.standardTol)}
            </TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.measured, 2)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.error, 2)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.uncertainty)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function R05Table({ unit, cmc, rows = [], description }) {
  const { major, minor } = r05AngleUnits(unit);
  const title =
    description ||
    rows.find((row) => row?.description)?.description ||
    R05_DEFAULT_DESCRIPTION;
  const data = expandR05Rows(rows);
  const unitCells = [major, minor, major, minor, major, minor, cmc || " "];

  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead} rowSpan={2}>
            Description
          </TableCell>
          <TableCell align="center" sx={cellHead} colSpan={2}>
            Readings set on UUC
          </TableCell>
          <TableCell align="center" sx={cellHead} colSpan={2}>
            Reading on master (avg. of 3 rdgs.)
          </TableCell>
          <TableCell align="center" sx={cellHead} colSpan={2}>
            Error
          </TableCell>
          <TableCell align="center" sx={cellHead}>
            Uncertainty ±
          </TableCell>
        </TableRow>
        <TableRow>
          {unitCells.map((text, i) => (
            <TableCell key={`${text}-${i}`} align="center" sx={cellHead}>
              {text}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((row, idx) => (
          <TableRow key={idx}>
            {idx === 0 ? (
              <TableCell
                align="center"
                sx={{ ...cellBody, verticalAlign: "middle" }}
                rowSpan={data.length}
              >
                {cellText(title)}
              </TableCell>
            ) : null}
            <TableCell align="center" sx={cellBody}>{formatAnglePart(row.setOnUucDeg)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatAnglePart(row.setOnUucMin)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatAnglePart(row.masterDeg)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatAnglePart(row.masterMin)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatAnglePart(row.errorDeg)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatAnglePart(row.errorMin)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.uncertainty)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function R07Table({ cmc, rows }) {
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead}>Passing through IS Sieve</TableCell>
          <TableCell align="center" sx={cellHead}>Retained on IS Sieve</TableCell>
          <TableCell align="center" sx={cellHead}>Standard Reading (Length Gauge)</TableCell>
          <TableCell align="center" sx={cellHead}>Measured reading on Unit under calibration</TableCell>
          <TableCell align="center" sx={cellHead}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>Uncertainty</TableCell>
        </TableRow>
        <UnitCells cells={["mm", "mm", "mm", "mm", "mm", cmc || "mm"]} />
      </TableHead>
      <TableBody>
        {rows.map((row, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>{cellText(row.passing)}</TableCell>
            <TableCell align="center" sx={cellBody}>{cellText(row.retained)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.standard, 2)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.measured, 2)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.error, 2)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.uncertainty, 0)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function R08Table({ unit, cmc, rows }) {
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" colSpan={2} sx={cellHead}>UUC Reading</TableCell>
          <TableCell align="center" colSpan={2} sx={cellHead}>Reading of Master</TableCell>
          <TableCell align="center" sx={cellHead}>Mean Value</TableCell>
          <TableCell align="center" sx={cellHead}>Deviation</TableCell>
          <TableCell align="center" sx={cellHead}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>Hysteresis</TableCell>
          <TableCell align="center" sx={cellHead}>± Expanded uncertainty</TableCell>
        </TableRow>
        <TableRow>
          <TableCell align="center" colSpan={2} sx={cellHead}>Pind</TableCell>
          <TableCell align="center" colSpan={2} sx={cellHead}>Pstd</TableCell>
          <TableCell align="center" sx={cellHead}>Ṕ=(M1+M2)/2</TableCell>
          <TableCell align="center" sx={cellHead}>ΔP=Pind(bar)-Ṕ</TableCell>
          <TableCell align="center" sx={cellHead}>F.S</TableCell>
          <TableCell align="center" sx={cellHead}>h= |M2-M1|</TableCell>
          <TableCell align="center" sx={cellHead}>(k=2) U</TableCell>
        </TableRow>
        <UnitCells
          cells={[unit, "bar", "bar M1 ↑", "bar M2 ↓", "bar", "bar", "%", "bar", cmc]}
        />
      </TableHead>
      <TableBody>
        {rows.map((row, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>
              {cellText(row.pindDisplay ?? row.pindKgCm2)}
            </TableCell>
            <TableCell align="center" sx={cellBody}>{cellText(row.pindBar)}</TableCell>
            <TableCell align="center" sx={cellBody}>{cellText(row.m1)}</TableCell>
            <TableCell align="center" sx={cellBody}>{cellText(row.m2)}</TableCell>
            <TableCell align="center" sx={cellBody}>{cellText(row.mean)}</TableCell>
            <TableCell align="center" sx={cellBody}>{cellText(row.deviation)}</TableCell>
            <TableCell align="center" sx={cellBody}>{cellText(row.errorPercent)}</TableCell>
            <TableCell align="center" sx={cellBody}>{cellText(row.hysteresis)}</TableCell>
            <TableCell align="center" sx={cellBody}>
              {cellText(
                compoundCmcForReading(
                  row.cmc_value ?? row.expandedUncertainty ?? row.uncertainty,
                  row.uuc ?? row.pindDisplay ?? row.pindKgCm2,
                ),
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function ElectroTable({ data, cmcValue, headers }) {
  const groups = electroDisplayGroups(data);
  const titles = headers || [
    "Cal. Point/Range",
    "Std. Reading",
    "UUC Reading",
    "Deviation",
    "Expanded Uncertainty",
  ];
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          {titles.map((title) => (
            <TableCell key={title} align="center" sx={cellHead}>
              {title}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {groups.map((group, gIdx) => (
          <React.Fragment key={`g-${group.parameter}-${gIdx}`}>
            <TableRow>
              <TableCell colSpan={5} align="left" sx={cellHead}>
                {group.parameter}
              </TableCell>
            </TableRow>
            {(group.tiers || []).map((tier, tIdx) => {
              const unit = tier.unit || " ";
              return (
                <React.Fragment key={`t-${unit}-${tIdx}`}>
                  <TableRow>
                    <TableCell align="center" sx={cellHead}>{unit}</TableCell>
                    <TableCell align="center" sx={cellHead}>{unit}</TableCell>
                    <TableCell align="center" sx={cellHead}>{unit}</TableCell>
                    <TableCell align="center" sx={cellHead}>{unit}</TableCell>
                    <TableCell align="center" sx={cellHead}>%</TableCell>
                  </TableRow>
                  {(tier.points || []).map((pt, pIdx) => (
                    <TableRow key={`p-${pIdx}`}>
                      <TableCell align="center" sx={cellBody}>
                        {cellText(pt.cal ?? pt.calPoint)}
                      </TableCell>
                      <TableCell align="center" sx={cellBody}>
                        {cellText(pt.std)}
                      </TableCell>
                      <TableCell align="center" sx={cellBody}>
                        {cellText(pt.uuc)}
                      </TableCell>
                      <TableCell align="center" sx={cellBody}>
                        {cellText(pt.dev)}
                      </TableCell>
                      <TableCell align="center" sx={cellBody}>
                        {cellText(pt.cmc || cmcValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function R12Table({ data, cmcValue }) {
  const payload = r12ReadingOf(data);
  const unit = payload.unit || " ";
  const points = Array.isArray(payload.points) ? payload.points : [];
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell colSpan={6} align="left" sx={{ ...cellHead, textAlign: "left" }}>
            Parameter: {payload.parameter || ""}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell align="center" sx={cellHead}>Range</TableCell>
          <TableCell align="center" sx={cellHead}>Measured on Ref. Standard</TableCell>
          <TableCell align="center" sx={cellHead}>Measured on UUC (Unit under calibration)</TableCell>
          <TableCell align="center" sx={cellHead}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>Expanded Uncertainty</TableCell>
        </TableRow>
        <TableRow>
          <TableCell align="center" sx={cellHead}>{unit}</TableCell>
          <TableCell align="center" sx={cellHead}>{unit}</TableCell>
          <TableCell align="center" sx={cellHead}>{unit}</TableCell>
          <TableCell align="center" sx={cellHead}>{unit}</TableCell>
          <TableCell align="center" sx={cellHead}>%</TableCell>
          <TableCell align="center" sx={cellHead}>%</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {points.map((pt, pIdx) => (
          <TableRow key={pIdx}>
            {pIdx === 0 ? (
              <TableCell
                align="center"
                sx={cellBody}
                rowSpan={points.length || 1}
              >
                {cellText(payload.rangeMax)}
              </TableCell>
            ) : null}
            <TableCell align="center" sx={cellBody}>
              {cellText(pt.std ?? pt.refStandard)}
            </TableCell>
            <TableCell align="center" sx={cellBody}>
              {cellText(pt.uuc ?? pt.uucReading)}
            </TableCell>
            <TableCell align="center" sx={cellBody}>
              {cellText(pt.error)}
            </TableCell>
            <TableCell align="center" sx={cellBody}>
              {cellText(pt.errorPct ?? pt.errorPercent)}
            </TableCell>
            <TableCell align="center" sx={cellBody}>
              {cellText(pt.cmc ?? pt.uncertainty ?? cmcValue)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function R14Table({ data, testVoltage }) {
  const payload = r14ReadingOf(data);
  const voltage = payload.test_voltage || testVoltage || "@5000V DC";
  const tiers = Array.isArray(payload.tiers) ? payload.tiers : [];
  const bodyRowCount = tiers.reduce(
    (count, tier) => count + 1 + (tier.points || []).length,
    2,
  );
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead} rowSpan={2}>
            Test Voltage
          </TableCell>
          <TableCell align="center" sx={cellHead} colSpan={6}>
            RESISTANCE
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell align="center" sx={cellHead}>Calibration Point/Range</TableCell>
          <TableCell align="center" sx={cellHead}>Assigned Values of Reference Standards</TableCell>
          <TableCell align="center" sx={cellHead}>UUC Reading</TableCell>
          <TableCell align="center" sx={cellHead}>Deviation</TableCell>
          <TableCell align="center" sx={cellHead}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>Expanded Uncertainty</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {tiers.map((tier, tierIdx) => (
          <React.Fragment key={`${tier.unit || "tier"}-${tierIdx}`}>
            <TableRow>
              {tierIdx === 0 ? (
                <TableCell
                  align="center"
                  sx={{ ...cellBody, fontWeight: "bold" }}
                  rowSpan={Math.max(bodyRowCount - 2, 1)}
                >
                  {cellText(voltage)}
                </TableCell>
              ) : null}
              <TableCell align="center" sx={cellHead}>{tier.unit}</TableCell>
              <TableCell align="center" sx={cellHead}>{tier.unit}</TableCell>
              <TableCell align="center" sx={cellHead}>{tier.unit}</TableCell>
              <TableCell align="center" sx={cellHead}>{tier.unit}</TableCell>
              <TableCell align="center" sx={cellHead}>%</TableCell>
              <TableCell align="center" sx={cellHead}>%</TableCell>
            </TableRow>
            {(tier.points || []).map((pt, ptIdx) => (
              <TableRow key={`${tierIdx}-${ptIdx}`}>
                <TableCell align="center" sx={cellBody}>{cellText(pt.nominal)}</TableCell>
                <TableCell align="center" sx={cellBody}>{cellText(pt.ref)}</TableCell>
                <TableCell align="center" sx={cellBody}>{cellText(pt.uuc)}</TableCell>
                <TableCell align="center" sx={cellBody}>{cellText(pt.dev)}</TableCell>
                <TableCell align="center" sx={cellBody}>{cellText(pt.errorPct)}</TableCell>
                <TableCell align="center" sx={cellBody}>{cellText(pt.cmc)}</TableCell>
              </TableRow>
            ))}
          </React.Fragment>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function R15Table({ data, cmcValue }) {
  const payload = r15ReadingOf(data);
  const points = Array.isArray(payload.points) ? payload.points : [];
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead}>
            Calibration Points in
            <br />
            Min
          </TableCell>
          <TableCell align="center" sx={cellHead}>
            Calibration Points In
            <br />
            Sec
          </TableCell>
          <TableCell align="center" sx={cellHead}>
            Measured on Ref. Standard
            <br />
            Sec
          </TableCell>
          <TableCell align="center" sx={cellHead}>
            Measured on UUC (Unit under calibration)
            <br />
            Sec
          </TableCell>
          <TableCell align="center" sx={cellHead}>
            Error
            <br />
            Sec
          </TableCell>
          <TableCell align="center" sx={cellHead}>
            ±Expanded Uncertainty
            <br />
            Sec
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {points.map((pt, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>{cellText(pt.min)}</TableCell>
            <TableCell align="center" sx={cellBody}>{cellText(pt.uucSec)}</TableCell>
            <TableCell align="center" sx={cellBody}>{cellText(pt.refSec)}</TableCell>
            <TableCell align="center" sx={cellBody}>{cellText(pt.uucSec)}</TableCell>
            <TableCell align="center" sx={cellBody}>{cellText(pt.error)}</TableCell>
            <TableCell align="center" sx={cellBody}>
              {cellText(pt.cmc ?? cmcValue ?? 4.28)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function DefaultTable({ data, profile, uucData }) {
  const uucUnit = profile?.uucUnit || "";
  const masterUnit = profile?.masterUnit || uucUnit;
  const showDualUnits = Boolean(profile?.showDualUnits);
  const unitCells = [
    uucUnit,
    ...(showDualUnits ? [masterUnit] : []),
    masterUnit,
    masterUnit,
    masterUnit,
    masterUnit,
    masterUnit,
    masterUnit,
    uncertaintyUnitLabel(uucData, profile),
  ];

  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell
            colSpan={showDualUnits ? 2 : 1}
            align="center"
            sx={{ ...cellHead, minWidth: 80 }}
          >
            UUC Reading
            <br />P<sub>ind</sub>
          </TableCell>
          <TableCell
            colSpan={2}
            align="center"
            sx={{ ...cellHead, minWidth: 180 }}
          >
            Reading of Master
            <br />P<sub>std</sub>
          </TableCell>
          <TableCell rowSpan={2} align="center" sx={{ ...cellHead, minWidth: 100 }}>
            Mean value
            <br />
            P&#772;=(M1+M2)/2
          </TableCell>
          <TableCell rowSpan={2} align="center" sx={{ ...cellHead, minWidth: 100 }}>
            Deviation
            <br />
            &Delta;P=P&#772; - P<sub>ind</sub>
          </TableCell>
          <TableCell rowSpan={2} align="center" sx={{ ...cellHead, minWidth: 70 }}>
            Error
            <br />
            F.S
          </TableCell>
          <TableCell rowSpan={2} align="center" sx={{ ...cellHead, minWidth: 100 }}>
            Hysteresis
            <br />
            h= |M2-M1|
          </TableCell>
          <TableCell rowSpan={2} align="center" sx={{ ...cellHead, minWidth: 130 }}>
            &plusmn;Expanded
            <br />
            uncertainty
            <br />
            (k=2) U
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell align="center" sx={cellHead}>
            {uucUnit}
          </TableCell>
          {showDualUnits && (
            <TableCell align="center" sx={cellHead}>
              {masterUnit}
            </TableCell>
          )}
          <TableCell align="center" sx={cellHead}>
            &uarr;M1 ({masterUnit})
          </TableCell>
          <TableCell align="center" sx={cellHead}>
            &darr;M2 ({masterUnit})
          </TableCell>
        </TableRow>
        <UnitCells cells={unitCells} />
      </TableHead>
      <TableBody>
        {resultRows(data).map((row, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>{formatNum(row.pindKgCm2)}</TableCell>
            {showDualUnits && (
              <TableCell align="center" sx={cellBody}>{formatNum(row.pindBar)}</TableCell>
            )}
            <TableCell align="center" sx={cellBody}>{formatNum(row.m1)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.m2)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.mean)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.deviation)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.errorPercent, 2)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.hysteresis)}</TableCell>
            <TableCell align="center" sx={cellBody}>{formatNum(row.expandedUncertainty)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

function R09Table({ data, cmcValue }) {
  const payload = isR09Readings(data) ? data : { rh: [], temp: [] };
  const channel = (title, unit, rows, cmc) => (
    <Box sx={{ mb: 2 }}>
      <Typography fontWeight="bold" sx={{ mb: 0.75 }}>
        {title}
      </Typography>
      <TableContainer>
        <Table size="small" sx={{ borderCollapse: "collapse" }}>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={cellHead}>Calibration Points</TableCell>
              <TableCell align="center" sx={cellHead}>
                Measured rdgs. on Ref. Standard
              </TableCell>
              <TableCell align="center" sx={cellHead}>
                Measured rdgs. on UUC (Unit under calibration)
              </TableCell>
              <TableCell align="center" sx={cellHead}>Error</TableCell>
              <TableCell align="center" sx={cellHead}>
                ± Expanded Uncertainty
              </TableCell>
            </TableRow>
            <UnitCells cells={[unit, unit, unit, unit, unit]} />
          </TableHead>
          <TableBody>
            {(rows || []).map((row, idx) => (
              <TableRow key={idx}>
                <TableCell align="center" sx={cellBody}>
                  {cellText(row.uucVal ?? row.uuc)}
                </TableCell>
                <TableCell align="center" sx={cellBody}>
                  {cellText(row.refVal ?? row.standard)}
                </TableCell>
                <TableCell align="center" sx={cellBody}>
                  {cellText(row.uucVal ?? row.uuc)}
                </TableCell>
                <TableCell align="center" sx={cellBody}>
                  {cellText(row.error)}
                </TableCell>
                <TableCell align="center" sx={cellBody}>
                  {cellText(cmc)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography fontWeight="bold" gutterBottom textAlign="center">
        CALIBRATION RESULTS
      </Typography>
      {channel(
        "At Set Temperature 25°C",
        "%RH",
        payload.rh,
        r09CmcForChannel(cmcValue, "rh"),
      )}
      {channel(
        "At Set Humidity 50%",
        "°C",
        payload.temp,
        r09CmcForChannel(cmcValue, "temp"),
      )}
    </Paper>
  );
}

function R10Table({ rows, cmcValue, leastCount }) {
  const data = Array.isArray(rows) ? rows.filter((row) => row && row.kind !== "group") : [];
  return (
    <ResultsShell>
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={cellHead}>Calibration Points In</TableCell>
          <TableCell align="center" sx={cellHead}>
            Measured Temp. on Ref. Standard
          </TableCell>
          <TableCell align="center" sx={cellHead}>
            Measured Temp. on UUC (Unit under calibration)
          </TableCell>
          <TableCell align="center" sx={cellHead}>Error</TableCell>
          <TableCell align="center" sx={cellHead}>±Expanded Uncertainty</TableCell>
        </TableRow>
        <UnitCells cells={["°C", "°C", "°C", "°C", "°C"]} />
      </TableHead>
      <TableBody>
        {data.map((row, idx) => (
          <TableRow key={idx}>
            <TableCell align="center" sx={cellBody}>{cellText(row.nominal)}</TableCell>
            <TableCell align="center" sx={cellBody}>{cellText(row.standard)}</TableCell>
            <TableCell align="center" sx={cellBody}>{cellText(row.uuc)}</TableCell>
            <TableCell align="center" sx={cellBody}>
              {cellText(r10Error(row, leastCount))}
            </TableCell>
            <TableCell align="center" sx={cellBody}>
              {cellText(row.cmc_value ?? row.expandedUncertainty ?? cmcValue)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ResultsShell>
  );
}

export default function CalibrationTable({ data, profile, uucData }) {
  const layoutRaw = resultLayout(
    uucData?.template || uucData?.result_used || profile?.result_used,
  );
  const layout =
    isR15Row(uucData) ||
    isR15Readings(data) ||
    matchesR15UucId(
      uucData?.instrumentId,
      uucData?.uuc_id,
      uucData?.id,
      uucData?.descriptionOfUUC,
    )
      ? "R-15"
      : layoutRaw;
  const unit = resultUnit(uucData, profile);
  const cmc = cmcUnit(uucData, profile);
  const cmcValue = pickCmc(uucData) || uucData?.cmc;
  const cmcBands = resolveCmcBands(uucData?.cmc_bands, uucData?.cmcBands, uucData);
  const tachometerData = isTachometerReadings(data) ? data : null;
  const vernierData = isVernierReadings(data) ? data : null;
  const dimensionalUmData = isDimensionalUmReadings(data) ? data : null;
  const angularData = isAngularReadings(data) ? data : null;
  const d09Data = isD09Readings(data) ? data : null;
  const rodData = isRodReadings(data) ? data : null;
  const d17Data = isD17Readings(data) ? data : null;
  const tapeData = isTapeReadings(data) ? data : null;
  const d25Data = isD25Readings(data) ? data : null;
  const utgData = isUtgReadings(data) ? data : null;
  const d42Data = isD42Readings(data) ? data : null;
  const d18Data = isD18Readings(data) ? data : null;
  const d20Data = isD20Readings(data) ? data : null;
  const d21Data = isD21Readings(data) ? data : null;
  const d22Data = isD22Readings(data) ? data : null;
  const d19Data = isD19Readings(data) ? data : null;
  const d32Data = isD32Readings(data) ? data : null;
  const d31Data = isD31Readings(data) ? data : null;
  if (d32Data) {
    return <MasterMeasurementTable data={d32Data} />;
  }
  if (d31Data) {
    return <RadiusGaugeTable data={d31Data} />;
  }
  if (d19Data) {
    return <FeelerGaugeTable data={d19Data} />;
  }
  if (d22Data) {
    return <TubularMicrometerTable data={d22Data} />;
  }
  if (d21Data) {
    return <AggregateD21Table data={d21Data} />;
  }
  if (d20Data) {
    return <FilletWeldTable data={d20Data} />;
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
    : layout === "R-09" || layout === "R-11" || layout === "E01" || layout === "E02" || layout === "R-12" || layout === "R-14" || layout === "R-15"
      ? data
      : withCmcValue(data, cmcValue, { cmcBands });

  if (d18Data) {
    return <D18Table rows={rows} />;
  }
  if (d42Data) {
    return <D42Table rows={rows} />;
  }
  if (utgData) {
    return <UtgTable rows={rows} />;
  }
  if (d25Data) {
    return <D25Table rows={rows} />;
  }
  if (tapeData) {
    return <TapeTable rows={rows} />;
  }
  if (d17Data) {
    return <D17Table rows={rows} />;
  }
  if (rodData) {
    return <TwoColumnRodsTable rows={rows} />;
  }
  if (d09Data) {
    return <D09Table rows={rows} />;
  }
  if (angularData) {
    return <AngularDegMinTable data={rows} />;
  }
  if (dimensionalUmData) {
    return <DimensionalUmTable rows={rows} />;
  }
  if (vernierData) {
    return <R02Table unit={unit} cmc={cmc} rows={rows} />;
  }
  if (layout === "R-01" || tachometerData) {
    return (
      <R01Table
        unit={unit}
        cmc={cmc}
        rows={tachometerData ? rows : resultRows(rows)}
      />
    );
  }
  if (layout === "R-02") return <R02Table unit={unit} cmc={cmc} rows={resultRows(rows)} />;
  if (layout === "R-03") return <R03Table unit={unit} cmc={cmc} rows={resultRows(rows)} />;
  if (layout === "R-05") {
    return (
      <R05Table
        unit={unit}
        cmc={cmc}
        rows={rows || []}
        description={uucData?.parameter || profile?.parameter}
      />
    );
  }
  if (layout === "R-06") return <R06Table unit={unit} cmc={cmc} rows={rows || []} />;
  if (layout === "R-07") return <R07Table cmc={cmc} rows={rows || []} />;
  if (layout === "R-09") {
    return <R09Table data={rows} cmcValue={cmcValue} />;
  }
  if (layout === "R-10") {
    return (
      <R10Table
        rows={rows || []}
        cmcValue={cmcValue}
        leastCount={uucData?.resolution ?? uucData?.leastCount}
      />
    );
  }
  if (layout === "R-08") {
    const expanded = expandR08Rows(rows, {
      unit,
      toBar,
      leastCount: uucData?.resolution ?? uucData?.leastCount,
      rangeMax: uucData?.rangeMax ?? uucData?.range_max,
      cmcValue: pickCmc(uucData) || uucData?.cmc,
      instrumentId: uucData?.instrumentId,
      descriptionOfUUC: uucData?.descriptionOfUUC,
      result_used: uucData?.result_used,
      uucData,
    });
    const data = resultRows(expanded, expanded.length || undefined);
    return (
      <R08Table
        unit={pressureUnitLabel(unit)}
        cmc={cmc}
        rows={data}
      />
    );
  }
  if (layout === "R-11") {
    return (
      <ElectroTable
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
      <ElectroTable
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
    return <R12Table data={rows || []} cmcValue={cmcValue} />;
  }
  if (layout === "R-14") {
    return <R14Table data={rows || []} testVoltage={uucData?.test_voltage} />;
  }
  if (layout === "R-15") {
    return <R15Table data={rows || []} cmcValue={cmcValue} />;
  }

  if (!rows || rows.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography fontWeight="bold" gutterBottom textAlign="center">
          CALIBRATION RESULTS
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Enter UUC range and accuracy to generate calibration data.
        </Typography>
      </Paper>
    );
  }

  return <DefaultTable data={rows} profile={profile} uucData={uucData} />;
}
