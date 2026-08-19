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
  Tooltip,
  Stack,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import CompanyLookupBar from "../components/bulk/CompanyLookupBar";
import BulkRow from "../components/bulk/BulkRow";
import NewCompanyDialog from "../components/bulk/NewCompanyDialog";
import NewInstrumentDialog from "../components/bulk/NewInstrumentDialog";
import NewMasterDialog from "../components/bulk/NewMasterDialog";
import ExpandableLookupButton from "../components/bulk/ExpandableLookupButton";
import { isRowEmpty } from "../utils/emptyBulkRow";
import { useBulkEntries } from "../context/BulkEntriesContext";

const COLUMN_HEADERS = [
  "Sr. No",
  "Description of UUC",
  "Make",
  "Range Min",
  "Range Max",
  "LC",
  "Accuracy",
  "Id No.",
  "Cal Date",
  "Due Date",
  "Matched Master",
  "Actions",
];

export default function BulkCalibrationPage() {
  const {
    company,
    setCompany,
    rows,
    patchRow,
    handleInstrumentBlur,
    handleRangeBlur,
    handleCopyRow,
    handleCopyAbove,
    handleAddRow,
    handleDeleteRow,
  } = useBulkEntries();

  const [newCompanyOpen, setNewCompanyOpen] = useState(false);
  const [newInstrumentOpen, setNewInstrumentOpen] = useState(false);
  const [newMasterOpen, setNewMasterOpen] = useState(false);

  return (
    <Container maxWidth={false} sx={{ py: 3, px: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5" fontWeight="bold">
          Bulk Calibration Entries
        </Typography>
        <Button component={RouterLink} to="/" variant="outlined" size="small">
          ← Back to Certificate
        </Button>
      </Box>

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
        <CompanyLookupBar company={company} onCompanyChange={setCompany} />
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
                    onInstrumentBlur={handleInstrumentBlur}
                    onRangeBlur={handleRangeBlur}
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
            justifyContent: "space-between",
            alignItems: "center",
            mt: 2,
            px: 1,
          }}
        >
          <Button startIcon={<AddIcon />} onClick={handleAddRow}>
            Add Row
          </Button>
          <Tooltip title="Bulk certificate generation is not implemented yet">
            <span>
              <Button variant="contained" disabled>
                Submit
              </Button>
            </span>
          </Tooltip>
        </Box>
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
    </Container>
  );
}
