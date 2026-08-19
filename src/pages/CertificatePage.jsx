import React, { useState } from "react";
import { Container, Box, Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import axios from "axios";
import dayjs from "dayjs";
import CertificateHeader from "../components/CertificateHeader";
import CustomerSection from "../components/CustomerSection";
import UUCDetails from "../components/UUCDetails";
import StaticFields from "../components/StaticFields";
import StandardEquipment from "../components/StandardEquipment";
import CalibrationTable from "../components/CalibrationTable";
import CertificateFooter from "../components/CertificateFooter";
import { generateCalibrationData } from "../utils/calculations";

const initialForm = {
  certificateNo: "26 /M- 1667",
  ulrNo: "CC391126000001667F",
  dateOfIssue: dayjs(),
  dateOfCalibration: dayjs(),
  nextDueDate: dayjs(),
  customerId: "",
  customerName: "",
  customerAddress: "",
  challanLetterDtd: "14.04.2026",
  challanSrfNo: "26/04-93",
  challanDtd: "14.04.2026",
  instrumentId: "",
  descriptionOfUUC: "PRESSURE GAUGE",
  uucSubType: "(Hydraulic bourden type)",
  rangeMin: "",
  rangeMax: "",
  resolution: "",
  make: "",
  accuracy: "2.0",
  idNumber: "",
};

export default function CertificatePage() {
  const [form, setForm] = useState(initialForm);
  const [equipment, setEquipment] = useState(null);

  const rangeMax = Number(form.rangeMax);

  const handleSearchMaster = async () => {
    if (!rangeMax || rangeMax <= 0) {
      setEquipment(null);
      return;
    }
    try {
      const res = await axios.get("/api/match-master", {
        params: {
          rangeMin: form.rangeMin || "0",
          rangeMax: form.rangeMax,
        },
      });
      setEquipment(res.data);
    } catch {
      setEquipment(null);
    }
  };

  const calibrationData = generateCalibrationData(
    rangeMax,
    form.accuracy,
    equipment,
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
        <Button component={RouterLink} to="/bulk" variant="outlined" size="small">
          Bulk Calibration Entries →
        </Button>
      </Box>
      <Box
        sx={{
          border: "2px solid #000",
          p: 3,
          bgcolor: "#fff",
        }}
      >
        <CertificateHeader form={form} setForm={setForm} />
        <CustomerSection form={form} setForm={setForm} />
        <UUCDetails
          form={form}
          setForm={setForm}
          onSearchMaster={handleSearchMaster}
        />
        <StaticFields />
        <StandardEquipment equipment={equipment} />
        <CalibrationTable data={calibrationData} />
        <CertificateFooter />
      </Box>
    </Container>
  );
}
