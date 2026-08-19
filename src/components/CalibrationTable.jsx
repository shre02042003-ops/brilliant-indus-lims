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
} from "@mui/material";

export default function CalibrationTable({ data }) {
  if (!data || data.length === 0) {
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
          <TableHead>
            <TableRow>
              <TableCell
                colSpan={2}
                align="center"
                sx={{
                  fontWeight: "bold",
                  border: "1px solid #000",
                  minWidth: 80,
                }}
              >
                UUC Reading
                <br />P<sub>ind</sub>
              </TableCell>
              <TableCell
                colSpan={2}
                align="center"
                sx={{
                  fontWeight: "bold",
                  border: "1px solid #000",
                  minWidth: 180,
                }}
              >
                Reading of Master
                <br />P<sub>std</sub>
              </TableCell>
              <TableCell
                rowSpan={2}
                align="center"
                sx={{
                  fontWeight: "bold",
                  border: "1px solid #000",
                  minWidth: 100,
                }}
              >
                Mean value
                <br />
                P&#772;=(M1+M2)/2
              </TableCell>
              <TableCell
                rowSpan={2}
                align="center"
                sx={{
                  fontWeight: "bold",
                  border: "1px solid #000",
                  minWidth: 100,
                }}
              >
                Deviation
                <br />
                &Delta;P=P&#772; - P<sub>ind</sub>
              </TableCell>
              <TableCell
                rowSpan={2}
                align="center"
                sx={{
                  fontWeight: "bold",
                  border: "1px solid #000",
                  minWidth: 70,
                }}
              >
                Error
                <br />
                F.S
              </TableCell>
              <TableCell
                rowSpan={2}
                align="center"
                sx={{
                  fontWeight: "bold",
                  border: "1px solid #000",
                  minWidth: 100,
                }}
              >
                Hysteresis
                <br />
                h= |M2-M1|
              </TableCell>
              <TableCell
                rowSpan={2}
                align="center"
                sx={{
                  fontWeight: "bold",
                  border: "1px solid #000",
                  minWidth: 130,
                }}
              >
                &plusmn;Expanded
                <br />
                uncertainty
                <br />
                (k=2) U
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell
                align="center"
                sx={{ fontWeight: "bold", border: "1px solid #000" }}
              >
                kg/cm²
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: "bold", border: "1px solid #000" }}
              >
                bar
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: "bold", border: "1px solid #000" }}
              >
                &uarr;M1
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: "bold", border: "1px solid #000" }}
              >
                &darr;M2
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell align="center" sx={{ border: "1px solid #ccc" }}>
                  {row.pindKgCm2}
                </TableCell>
                <TableCell align="center" sx={{ border: "1px solid #ccc" }}>
                  {row.pindBar.toFixed(3)}
                </TableCell>
                <TableCell align="center" sx={{ border: "1px solid #ccc" }}>
                  {row.m1.toFixed(3)}
                </TableCell>
                <TableCell align="center" sx={{ border: "1px solid #ccc" }}>
                  {row.m2.toFixed(3)}
                </TableCell>
                <TableCell align="center" sx={{ border: "1px solid #ccc" }}>
                  {row.mean.toFixed(3)}
                </TableCell>
                <TableCell align="center" sx={{ border: "1px solid #ccc" }}>
                  {row.deviation.toFixed(3)}
                </TableCell>
                <TableCell align="center" sx={{ border: "1px solid #ccc" }}>
                  {row.errorPercent.toFixed(2)}
                </TableCell>
                <TableCell align="center" sx={{ border: "1px solid #ccc" }}>
                  {row.hysteresis.toFixed(3)}
                </TableCell>
                <TableCell align="center" sx={{ border: "1px solid #ccc" }}>
                  {row.expandedUncertainty.toFixed(4)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
