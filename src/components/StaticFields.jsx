import React from "react";
import { Grid, TextField, Paper, Typography } from "@mui/material";

const STATIC_FIELDS = [
  { label: "Location", value: "--" },
  { label: "Condition when received", value: "Satisfactory" },
  { label: "Environmental Conditions", value: "" },
  { label: "Method of measurement", value: "+Ve Pressure by comparison method(medium- oil)" },
  { label: "Place of calibration", value: "At-Site" },
  { label: "Discipline", value: "Mechanical Calibration(Pressure/Vacuum)" },
  { label: "Reference Standard/Cal. Procedure No.", value: "IS 3624-1987(Reaff.2018), DKD-R6-1-2020/WI-01-09-01" },
];

export default function StaticFields() {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={1} alignItems="center">
        {STATIC_FIELDS.map((field) => (
          <React.Fragment key={field.label}>
            <Grid item xs={3}>
              <Typography fontWeight="bold">{field.label}:</Typography>
            </Grid>
            <Grid item xs={9}>
              <TextField
                value={field.value}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
              />
            </Grid>
          </React.Fragment>
        ))}
      </Grid>
    </Paper>
  );
}
