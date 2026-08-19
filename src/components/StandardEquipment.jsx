import React from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from "@mui/material";

export default function StandardEquipment({ equipment }) {
  if (!equipment) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography fontWeight="bold" gutterBottom>
          STANDARD EQUIPMENT USED FOR CALIBRATION
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Enter a valid UUC range to auto-select the standard equipment.
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
            <TableRow>
              <TableCell>{equipment.sr_no}</TableCell>
              <TableCell>{equipment.name}</TableCell>
              <TableCell>{equipment.id_no}</TableCell>
              <TableCell style={{ whiteSpace: "pre-line" }}>{equipment.cal_agency}</TableCell>
              <TableCell>{equipment.range_text}</TableCell>
              <TableCell>{equipment.cert_no}</TableCell>
              <TableCell>{equipment.cal_date}</TableCell>
              <TableCell>{equipment.due_date}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic" }}>
        All the measurements performed are traceable to national/int.standards through NABL accredited calibration lab.
      </Typography>
    </Paper>
  );
}
