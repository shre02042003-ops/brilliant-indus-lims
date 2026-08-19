import React from "react";
import {
  TableRow,
  TableCell,
  TextField,
  MenuItem,
  IconButton,
  Chip,
  CircularProgress,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { ACCURACY_OPTIONS } from "../../utils/accuracyOptions";

const cellSx = { verticalAlign: "top", p: 0.5 };

function MasterCell({ row }) {
  if (row.masterLoading) return <CircularProgress size={16} />;
  if (row.masterMatch) {
    return (
      <Tooltip
        title={`${row.masterMatch.range_text} · Uncertainty ${row.masterMatch.expanded_uncertainty}`}
      >
        <Chip size="small" color="success" label={row.masterMatch.id_no} />
      </Tooltip>
    );
  }
  if (row.masterError) {
    return <Chip size="small" color="warning" label={row.masterError} />;
  }
  return null;
}

export default function BulkRow({
  index,
  row,
  patchRow,
  onInstrumentBlur,
  onRangeBlur,
  onCopyRow,
  onCopyAbove,
  onDeleteRow,
  suggestedCopyRow,
}) {
  const set = (field) => (e) => patchRow(row.key, { [field]: e.target.value });

  return (
    <TableRow hover>
      <TableCell sx={{ ...cellSx, textAlign: "center", fontWeight: "bold" }}>
        {index + 1}
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 160 }}>
        <TextField
          variant="standard"
          placeholder="Instrument ID or description"
          value={row.descriptionOfUUC}
          onChange={(e) => patchRow(row.key, { descriptionOfUUC: e.target.value.toUpperCase() })}
          onBlur={() => onInstrumentBlur(row.key)}
          onKeyDown={(e) => e.key === "Enter" && onInstrumentBlur(row.key)}
          fullWidth
          size="small"
        />
        {row.instrumentLoading && (
          <Typography variant="caption" color="text.secondary">Looking up…</Typography>
        )}
        {!row.instrumentLoading && row.instrumentError && (
          <Typography variant="caption" color="error">{row.instrumentError}</Typography>
        )}
        {!row.instrumentLoading && !row.instrumentError && row.instrumentId && (
          <Typography variant="caption" color="text.secondary">
            {row.instrumentId} · {row.uucSubType}
          </Typography>
        )}
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 100 }}>
        <TextField variant="standard" value={row.make} onChange={set("make")} fullWidth size="small" />
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 80 }}>
        <TextField
          variant="standard"
          type="number"
          value={row.rangeMin}
          onChange={set("rangeMin")}
          onBlur={() => onRangeBlur(row.key)}
          fullWidth
          size="small"
        />
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 80 }}>
        <TextField
          variant="standard"
          type="number"
          value={row.rangeMax}
          onChange={set("rangeMax")}
          onBlur={() => onRangeBlur(row.key)}
          fullWidth
          size="small"
        />
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 90 }}>
        <TextField variant="standard" value={row.location} onChange={set("location")} fullWidth size="small" />
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 110 }}>
        <TextField
          variant="standard"
          select
          value={row.accuracy}
          onChange={set("accuracy")}
          fullWidth
          size="small"
        >
          {ACCURACY_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.value}
            </MenuItem>
          ))}
        </TextField>
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 90 }}>
        <TextField variant="standard" value={row.idNo} onChange={set("idNo")} fullWidth size="small" />
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 130 }}>
        <DatePicker
          value={row.calDate}
          onChange={(v) => patchRow(row.key, { calDate: v })}
          slotProps={{ textField: { variant: "standard", size: "small", fullWidth: true } }}
        />
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 130 }}>
        <DatePicker
          value={row.dueDate}
          onChange={(v) => patchRow(row.key, { dueDate: v })}
          slotProps={{ textField: { variant: "standard", size: "small", fullWidth: true } }}
        />
      </TableCell>

      <TableCell sx={{ ...cellSx, textAlign: "center", minWidth: 70 }}>
        <MasterCell row={row} />
      </TableCell>

      <TableCell sx={{ ...cellSx, minWidth: 150 }}>
        {suggestedCopyRow != null && (
          <Chip
            size="small"
            color="info"
            variant="outlined"
            icon={<ContentCopyIcon fontSize="inherit" />}
            label={`Copy row ${suggestedCopyRow}?`}
            onClick={() => onCopyAbove(row.key, suggestedCopyRow)}
            sx={{ mb: 0.5, cursor: "pointer" }}
          />
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <TextField
            variant="standard"
            type="number"
            placeholder="Row #"
            value={row.copyFromIndex}
            onChange={set("copyFromIndex")}
            size="small"
            sx={{ width: 56 }}
          />
          <Tooltip title="Copy row">
            <IconButton size="small" onClick={() => onCopyRow(row.key)}>
              <ContentCopyIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete row">
            <IconButton size="small" color="error" onClick={() => onDeleteRow(row.key)}>
              <DeleteOutlineIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </div>
        {row.copyError && (
          <Typography variant="caption" color="error">{row.copyError}</Typography>
        )}
      </TableCell>
    </TableRow>
  );
}
