import React from "react";
import { Paper, Typography, Grid } from "@mui/material";

const NOTES = [
  "1. The reported Expanded Uncertainty is calculated at 95.45% C.L. with coverage factor k=2",
  "2. The calibration results reported in this certificate are valid at the time of & the stated condition of measurements.",
  "3. This certificate should not be reproduced except in full without prior permission of BCLLP.",
  "4. This report refers only to particular item(s) submitted for calibration",
  "5. Readings given above are as on received condition of the instrument.",
  "6. Calibration certificate issued is meant for scientific and industrial purpose only. However if used for commercial trading, additional recognition/approval shall be complied as required by Dept. of Legal metrology, Regulatory bodies etc.",
  "7. Conversion used 1kg/cm² = 0.9806bar",
];

export default function CertificateFooter() {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Typography fontWeight="bold">Calibrated by:</Typography>
          <Typography>R.B.V</Typography>
          <Typography>(Tech.Asst.)</Typography>
        </Grid>
        <Grid item xs={6} textAlign="right">
          <Typography fontWeight="bold">Authorized by:</Typography>
          <Typography>M.D.CHAVAN</Typography>
          <Typography>(L.I / Q.M)</Typography>
        </Grid>

        <Grid item xs={12} sx={{ mt: 2 }}>
          {NOTES.map((note) => (
            <Typography key={note} variant="body2" sx={{ mb: 0.5, pl: 2 }}>
              {note}
            </Typography>
          ))}
        </Grid>

        <Grid item xs={12} sx={{ mt: 1 }}>
          <Typography variant="body2" textAlign="center" fontWeight="bold">
            --End of certificate--
          </Typography>
          <Typography variant="body2" textAlign="right" sx={{ mt: 1 }}>
            FR-01-03-0 &nbsp; dtd. 14.08.2024
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
}
