import React, { useState } from "react";
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Stack,
  Alert,
  Grid,
  TextField,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { pdf } from "@react-pdf/renderer";
import { PDFDocument } from "pdf-lib";
import CompanyLookupBar from "../components/bulk/CompanyLookupBar";
import BulkRow from "../components/bulk/BulkRow";
import NewCompanyDialog from "../components/bulk/NewCompanyDialog";
import NewInstrumentDialog from "../components/bulk/NewInstrumentDialog";
import NewMasterDialog from "../components/bulk/NewMasterDialog";
import ExpandableLookupButton from "../components/bulk/ExpandableLookupButton";
import { isRowEmpty } from "../utils/emptyBulkRow";
import { useBulkEntries } from "../context/BulkEntriesContext";
import { buildBulkCertificates } from "../utils/buildBulkCertificates";
import SingleCertificateDocument from "../pdf/BulkCertificatesDocument";

const COLUMN_HEADERS = [
  "Sr. No",
  "Description of UUC",
  "Make",
  "Range Min",
  "Range Max",
  "LC",
  "Accuracy",
  "Points",
  "Id No.",
  "Cal Date",
  "Due Date",
  "Result Template",
  "Matched Master",
  "Actions",
];

export default function BulkCalibrationPage() {
  const {
    company,
    setCompany,
    rows,
    patchRow,
    addElectroCustomPoint,
    handleInstrumentBlur,
    handleRangeBlur,
    handleReadingInputsBlur,
    handleCopyRow,
    handleCopyAbove,
    handleDeleteRow,
    loadStressTestRows,
  } = useBulkEntries();

  const [newCompanyOpen, setNewCompanyOpen] = useState(false);
  const [newInstrumentOpen, setNewInstrumentOpen] = useState(false);
  const [newMasterOpen, setNewMasterOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [injecting, setInjecting] = useState(false);
  const [submitAlert, setSubmitAlert] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [batchDetails, setBatchDetails] = useState({
    startCertNo: "",
    startUlrNo: "",
    dateOfIssue: "",
    letterDate: "",
    srfNo: "",
    srfDate: "",
    location: "",
  });

  const patchBatchDetails = (field) => (e) => {
    setBatchDetails((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleInjectAllInstruments = async () => {
    setInjecting(true);
    setSubmitAlert(null);
    try {
      const result = await loadStressTestRows();
      if (!result?.ok) {
        window.alert(result?.error || "Instrument list not loaded yet!");
      }
    } finally {
      setInjecting(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitAlert(null);
    try {
      const { certificates, skipped } = await buildBulkCertificates(
        company,
        rows,
        batchDetails,
      );
      const merged = await PDFDocument.create();
      for (const cert of certificates) {
        const partBlob = await pdf(
          <SingleCertificateDocument cert={cert} />,
        ).toBlob();
        const partBytes = await partBlob.arrayBuffer();
        const partDoc = await PDFDocument.load(partBytes);
        const pages = await merged.copyPages(
          partDoc,
          partDoc.getPageIndices(),
        );
        pages.forEach((page) => merged.addPage(page));
      }
      const mergedBytes = await merged.save();
      const pdfBytes = mergedBytes.buffer.slice(
        mergedBytes.byteOffset,
        mergedBytes.byteOffset + mergedBytes.byteLength,
      );
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(pdfBlob);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(url);
      if (skipped.length) {
        setSubmitAlert({
          severity: "warning",
          message: `Generated ${certificates.length} certificate(s). Skipped: ${skipped.join("; ")}`,
        });
      } else {
        setSubmitAlert(null);
      }
    } catch (err) {
      setSubmitAlert({
        severity: "error",
        message: err.message || "Could not generate certificates",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToEdit = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
  };

  const hasPreview = Boolean(pdfUrl);

  return (
    <Container
      maxWidth={false}
      sx={{
        py: 3,
        px: 4,
        ...(hasPreview
          ? { height: "100vh", display: "flex", flexDirection: "column" }
          : {}),
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          flexShrink: 0,
        }}
      >
        <Typography variant="h5" fontWeight="bold">
          {hasPreview ? "Certificate Preview" : "Bulk Calibration Entries"}
        </Typography>
        <Button component={RouterLink} to="/" variant="outlined" size="small">
          ← Back to Certificate
        </Button>
      </Box>

      {hasPreview ? (
        <Box
          sx={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            flex: 1,
            minHeight: 0,
          }}
        >
          {submitAlert && (
            <Alert severity={submitAlert.severity} sx={{ flexShrink: 0 }}>
              {submitAlert.message}
            </Alert>
          )}
          <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
            <Button variant="outlined" onClick={handleBackToEdit}>
              Back to Edit
            </Button>
            <Button
              component="a"
              href={pdfUrl}
              download="calibration-certificates.pdf"
              variant="contained"
            >
              Export as PDF
            </Button>
          </Stack>
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0`}
            type="application/pdf"
            title="Certificate Preview"
            style={{
              width: "100%",
              flex: 1,
              minHeight: 0,
              border: "1px solid rgba(0, 0, 0, 0.12)",
              borderRadius: 4,
            }}
          />
        </Box>
      ) : (
        <>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ mb: 2 }}
              alignItems="center"
              flexWrap="wrap"
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setNewCompanyOpen(true)}
                >
                  New Company
                </Button>
                <ExpandableLookupButton label="companies" to="/lookup/companies" />
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setNewInstrumentOpen(true)}
                >
                  New UUC Instrument
                </Button>
                <ExpandableLookupButton
                  label="UUC instruments"
                  to="/lookup/instruments"
                />
                <Button
                  type="button"
                  variant="contained"
                  size="small"
                  onClick={handleInjectAllInstruments}
                  disabled={injecting}
                  sx={{
                    bgcolor: "#c62828",
                    fontWeight: 700,
                    "&:hover": { bgcolor: "#b71c1c" },
                  }}
                >
                  {injecting ? "Injecting…" : "Inject All Instruments"}
                </Button>
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setNewMasterOpen(true)}
                >
                  New Master Equipment
                </Button>
                <ExpandableLookupButton
                  label="master equipment"
                  to="/lookup/masters"
                />
              </Stack>
            </Stack>
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Starting Cert No."
                  placeholder="26/3864"
                  value={batchDetails.startCertNo}
                  onChange={patchBatchDetails("startCertNo")}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Starting ULR No."
                  placeholder="CC391126000003864F"
                  value={batchDetails.startUlrNo}
                  onChange={patchBatchDetails("startUlrNo")}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography
                    component="label"
                    htmlFor="batch-date-of-issue"
                    sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", mb: 0.5 }}
                  >
                    Date of Issue
                  </Typography>
                  <TextField
                    id="batch-date-of-issue"
                    type="date"
                    value={batchDetails.dateOfIssue}
                    onChange={patchBatchDetails("dateOfIssue")}
                    size="small"
                    fullWidth
                  />
                </Box>
              </Grid>
            </Grid>
            <CompanyLookupBar company={company} onCompanyChange={setCompany} />
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "flex-end" }}
              sx={{ mt: 2 }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 160 }}>
                <Typography
                  component="label"
                  htmlFor="batch-letter-date"
                  sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", mb: 0.5 }}
                >
                  Letter Dated
                </Typography>
                <TextField
                  id="batch-letter-date"
                  type="date"
                  value={batchDetails.letterDate}
                  onChange={patchBatchDetails("letterDate")}
                  size="small"
                  fullWidth
                />
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 160 }}>
                <Typography
                  component="label"
                  htmlFor="batch-srf-no"
                  sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", mb: 0.5 }}
                >
                  SRF No.
                </Typography>
                <TextField
                  id="batch-srf-no"
                  type="text"
                  placeholder="e.g., 26/08-213"
                  value={batchDetails.srfNo}
                  onChange={patchBatchDetails("srfNo")}
                  size="small"
                  fullWidth
                />
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 160 }}>
                <Typography
                  component="label"
                  htmlFor="batch-srf-date"
                  sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", mb: 0.5 }}
                >
                  SRF Dated
                </Typography>
                <TextField
                  id="batch-srf-date"
                  type="date"
                  value={batchDetails.srfDate}
                  onChange={patchBatchDetails("srfDate")}
                  size="small"
                  fullWidth
                />
              </Box>
            </Stack>
            <Box sx={{ display: "flex", flexDirection: "column", mt: 2 }}>
              <Typography
                component="label"
                htmlFor="batch-location"
                sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", mb: 0.5 }}
              >
                Location
              </Typography>
              <TextField
                id="batch-location"
                type="text"
                placeholder="e.g., At-Site / Lab"
                value={batchDetails.location}
                onChange={patchBatchDetails("location")}
                size="small"
                fullWidth
              />
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 1 }}>
            <TableContainer>
              <Table
                size="small"
                sx={{ "& .MuiTableCell-root": { borderColor: "divider" } }}
              >
                <TableHead>
                  <TableRow
                    sx={{ "& th": { fontWeight: "bold", bgcolor: "action.hover" } }}
                  >
                    {COLUMN_HEADERS.map((h) => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, index) => {
                    const suggestedCopyRow =
                      index > 0 && isRowEmpty(row) && !isRowEmpty(rows[index - 1])
                        ? index
                        : null;
                    return (
                      <BulkRow
                        key={row.key}
                        index={index}
                        row={row}
                        patchRow={patchRow}
                        addElectroCustomPoint={addElectroCustomPoint}
                        onInstrumentBlur={handleInstrumentBlur}
                        onRangeBlur={handleRangeBlur}
                        onReadingInputsBlur={handleReadingInputsBlur}
                        onCopyRow={handleCopyRow}
                        onCopyAbove={handleCopyAbove}
                        onDeleteRow={handleDeleteRow}
                        suggestedCopyRow={suggestedCopyRow}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 1.5,
                mt: 2,
                px: 1,
              }}
            >
              <Button
                type="button"
                variant="contained"
                onClick={handleInjectAllInstruments}
                disabled={injecting}
                sx={{
                  bgcolor: "#c62828",
                  fontWeight: 700,
                  "&:hover": { bgcolor: "#b71c1c" },
                }}
              >
                {injecting ? "Injecting…" : "Inject All Instruments"}
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Generating…" : "Submit"}
              </Button>
            </Box>
            {submitAlert && (
              <Alert severity={submitAlert.severity} sx={{ mt: 1.5, mx: 1 }}>
                {submitAlert.message}
              </Alert>
            )}
          </Paper>

          <NewCompanyDialog
            open={newCompanyOpen}
            onClose={() => setNewCompanyOpen(false)}
            onCreated={(c) => setCompany(c)}
          />
          <NewInstrumentDialog
            open={newInstrumentOpen}
            onClose={() => setNewInstrumentOpen(false)}
          />
          <NewMasterDialog
            open={newMasterOpen}
            onClose={() => setNewMasterOpen(false)}
          />
        </>
      )}
    </Container>
  );
}
