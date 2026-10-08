import React from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from "@mui/material";
import { mappedMasters } from "../utils/mappedMasters";

export default function StandardEquipment({ masters: mastersProp, equipment }) {
  const masters = Array.isArray(mastersProp)
    ? mastersProp
    : mappedMasters(equipment);

  if (masters.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography fontWeight="bold" gutterBottom>
          STANDARD EQUIPMENT USED FOR CALIBRATION
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Fetch a UUC to load the mapped standard equipment.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography fontWeight="bold" gutterBottom>
        STANDARD EQUIPMENT USED FOR CALIBRATION
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 50 }}>SR.NO</TableCell>
              <TableCell>NAME</TableCell>
              <TableCell>ID.NO</TableCell>
              <TableCell>CAL. AGENCY</TableCell>
              <TableCell>RANGE</TableCell>
              <TableCell>CERT. NO.</TableCell>
              <TableCell>CAL. DATE</TableCell>
              <TableCell>DUE DATE</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {masters.map((eq, index) => (
              <TableRow key={eq.id || eq.id_no || index}>
                <TableCell>{eq.sr_no || index + 1}</TableCell>
                <TableCell>{eq.name}</TableCell>
                <TableCell>{eq.id_no}</TableCell>
                <TableCell style={{ whiteSpace: "pre-line" }}>{eq.cal_agency}</TableCell>
                <TableCell>{eq.range_text}</TableCell>
                <TableCell>{eq.cert_no}</TableCell>
                <TableCell>{eq.cal_date}</TableCell>
                <TableCell>{eq.due_date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic" }}>
        All the measurements performed are traceable to national/int.standards through NABL accredited calibration lab.
      </Typography>
    </Paper>
  );
}
