import React from 'react';
import { Grid, TextField, Paper } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

export default function CertificateHeader({ form, setForm }) {
  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleDateChange = (field) => (date) => {
    setForm((prev) => ({ ...prev, [field]: date }));
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={1.5} alignItems="center">
        <Grid size={3}>
          <TextField
            label="Certificate No"
            value={form.certificateNo}
            onChange={handleChange('certificateNo')}
            fullWidth
            InputProps={{ readOnly: true }}
          />
        </Grid>
        <Grid size={4}>
          <TextField
            label="ULR No"
            value={form.ulrNo}
            onChange={handleChange('ulrNo')}
            fullWidth
            InputProps={{ readOnly: true }}
          />
        </Grid>
        <Grid size={5}>
          <DatePicker
            label="Date of Issue"
            value={form.dateOfIssue}
            onChange={handleDateChange('dateOfIssue')}
            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
          />
        </Grid>

        <Grid size={3}>
          <DatePicker
            label="Date of Calibration"
            value={form.dateOfCalibration}
            onChange={handleDateChange('dateOfCalibration')}
            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
          />
        </Grid>
        <Grid size={4}>
          <DatePicker
            label="Next Due Date"
            value={form.nextDueDate}
            onChange={handleDateChange('nextDueDate')}
            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
          />
        </Grid>
        <Grid size={2.5}>
          <TextField label="Page No." value="1" fullWidth InputProps={{ readOnly: true }} />
        </Grid>
        <Grid size={2.5}>
          <TextField label="No. of Pages" value="1" fullWidth InputProps={{ readOnly: true }} />
        </Grid>
      </Grid>
    </Paper>
  );
}
