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
import { generateResultTableData } from "../utils/calculations";
import { getCertificateProfile } from "../utils/certificateProfile";
import { normalizeMatchPayload, primaryMaster } from "../utils/mappedMasters";
import { pickCmc, inferElectroTemplate, persistElectroResultUsed, overrideFetchedUucTemplate, r14UnitDefaults } from "../utils/readings";
import { coercePressureUnit } from "../utils/pressureUnits";

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
  descriptionOfUUC: "",
  uucSubType: "",
  unit: "",
  masterUnit: "",
  discipline: "",
  method: "",
  procedure: "",
  parameter: "",
  result_used: "",
  template: "",
  test_voltage: "@5000V DC",
  r14_min_unit: "MΩ",
  r14_max_unit: "GΩ",
  cmc_unit: "",
  cmc_min: "",
  cmc_bands: [],
  authorized_range_min: null,
  authorized_range_max: null,
  rangeMin: "",
  rangeMax: "",
  dcv_min: "",
  dcv_max: "",
  dcv_min_unit: "V",
  dcv_max_unit: "V",
  acv_min: "",
  acv_max: "",
  acv_min_unit: "V",
  acv_max_unit: "V",
  dca_min: "",
  dca_max: "",
  dca_min_unit: "A",
  dca_max_unit: "A",
  aca_min: "",
  aca_max: "",
  aca_min_unit: "A",
  aca_max_unit: "A",
  res_min: "",
  res_max: "",
  res_min_unit: "Ω",
  res_max_unit: "Ω",
  resolution: "",
  make: "",
  accuracy: "2.0",
  idNumber: "",
};

export default function CertificatePage() {
  const [form, setForm] = useState(initialForm);
  const [masters, setMasters] = useState([]);
  const [uucData, setUucData] = useState(null);

  const rangeMax = Number(form.rangeMax);

  const handleSearchMaster = async (explicitId) => {
    const uucId =
      typeof explicitId === "string" && explicitId
        ? explicitId
        : form.instrumentId;
    if (!uucId) {
      setMasters([]);
      setUucData(null);
      return;
    }
    try {
      const res = await axios.get("/api/match-master", {
        params: {
          uuc_id: uucId,
          rangeMax: form.rangeMax || undefined,
          rangeMin: form.rangeMin || undefined,
        },
      });
      const payload = normalizeMatchPayload(res.data);
      const uuc = overrideFetchedUucTemplate(payload.uuc || {});
      setMasters(payload.masters);
      setUucData(uuc);
      if (uuc && uuc.id) {
        setForm((prev) => {
          const template = uuc.template || inferElectroTemplate(prev, uuc);
          const units = r14UnitDefaults(prev, uuc);
          return {
          ...prev,
          unit: coercePressureUnit(uuc.unit) || uuc.unit || prev.unit,
          masterUnit: uuc.master_unit || prev.masterUnit,
          discipline: uuc.discipline || prev.discipline,
          method: uuc.method || prev.method,
          procedure: uuc.procedure || prev.procedure,
          parameter: uuc.parameter || prev.parameter,
          template,
          result_used: persistElectroResultUsed(
            template,
            uuc.result_used || prev.result_used,
          ) || template || prev.result_used,
          ...(template === "R-14"
            ? {
                r14_min_unit: uuc.r14_min_unit || units.r14_min_unit,
                r14_max_unit: uuc.r14_max_unit || units.r14_max_unit,
              }
            : {}),
          cmc_unit: uuc.cmc_unit || prev.cmc_unit,
          cmc_min: uuc.cmc_min ?? prev.cmc_min,
          cmc_max: uuc.cmc_max ?? prev.cmc_max,
          cmc_bands: Array.isArray(uuc.cmc_bands) ? uuc.cmc_bands : prev.cmc_bands,
          authorized_range_min:
            uuc.authorized_range_min ?? prev.authorized_range_min,
          authorized_range_max:
            uuc.authorized_range_max ?? prev.authorized_range_max,
        };
        });
      }
    } catch {
      setMasters([]);
      setUucData(null);
    }
  };

  const profile = getCertificateProfile({
    ...form,
    ...(uucData || {}),
    descriptionOfUUC: form.descriptionOfUUC,
    uucSubType: form.uucSubType,
    unit: form.unit || uucData?.unit,
    template: form.template,
    result_used: form.template || form.result_used || uucData?.result_used,
  });

  const calibrationData = generateResultTableData(
    form.template || form.result_used || uucData?.result_used,
    {
      rangeMax,
      rangeMin: form.rangeMin,
      accuracy: form.accuracy,
      equipment: primaryMaster({ masters }),
      conversionFactor: profile.conversionFactor,
      leastCount: form.resolution,
      pointCount: form.pointCount,
      cmcValue: form.cmc_min || pickCmc(uucData),
      cmcBands: form.cmc_bands || uucData?.cmc_bands,
      parameter: form.parameter || uucData?.parameter,
      description: form.parameter || uucData?.parameter,
      unit: form.unit || profile.uucUnit,
      instrumentId: form.instrumentId,
      descriptionOfUUC: form.descriptionOfUUC,
      result_used: form.template || form.result_used || uucData?.result_used,
      template: form.template,
      test_voltage: form.test_voltage,
      r14_min_unit: form.r14_min_unit,
      r14_max_unit: form.r14_max_unit,
      dcv_min: form.dcv_min,
      dcv_max: form.dcv_max,
      dcv_min_unit: form.dcv_min_unit,
      dcv_max_unit: form.dcv_max_unit,
      acv_min: form.acv_min,
      acv_max: form.acv_max,
      acv_min_unit: form.acv_min_unit,
      acv_max_unit: form.acv_max_unit,
      dca_min: form.dca_min,
      dca_max: form.dca_max,
      dca_min_unit: form.dca_min_unit,
      dca_max_unit: form.dca_max_unit,
      aca_min: form.aca_min,
      aca_max: form.aca_max,
      aca_min_unit: form.aca_min_unit,
      aca_max_unit: form.aca_max_unit,
      res_min: form.res_min,
      res_max: form.res_max,
      res_min_unit: form.res_min_unit,
      res_max_unit: form.res_max_unit,
    },
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
        <StaticFields profile={profile} />
        <StandardEquipment masters={masters} />
        <CalibrationTable
          data={calibrationData}
          profile={profile}
          uucData={{ ...(uucData || {}), ...form }}
        />
        <CertificateFooter conversionNote={profile.conversionNote} />
      </Box>
    </Container>
  );
}
