import React from "react";
import { Grid, TextField, Paper, Typography } from "@mui/material";

export default function StaticFields({ profile }) {
  const fields = [
    { label: "Location", value: "--" },
    { label: "Condition when received", value: "Satisfactory" },
    { label: "Environmental Conditions", value: "" },
    {
      label: "Method of measurement",
      value: profile?.method || "",
    },
    { label: "Place of calibration", value: "At-Site" },
    {
      label: "Discipline",
      value: profile?.discipline || "",
    },
    {
      label: "Reference Standard/Cal. Procedure No.",
      value: profile?.procedure || "",
    },
  ];

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={1} alignItems="center">
        {fields.map((field) => (
          <React.Fragment key={field.label}>
            <Grid size={3}>
              <Typography fontWeight="bold">{field.label}:</Typography>
            </Grid>
            <Grid size={9}>
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
