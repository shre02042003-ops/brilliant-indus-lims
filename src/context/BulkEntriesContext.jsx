import React, { createContext, useContext, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import axios from "axios";
import { makeEmptyRow } from "../utils/emptyBulkRow";

const BulkEntriesContext = createContext(null);

export function useBulkEntries() {
  const ctx = useContext(BulkEntriesContext);
  if (!ctx) {
    throw new Error("useBulkEntries must be used within BulkEntriesProvider");
  }
  return ctx;
}

export default function BulkEntriesProvider() {
  const [company, setCompany] = useState({ id: "", name: "", address: "" });
  const [rows, setRows] = useState(() => [makeEmptyRow(0), makeEmptyRow(1), makeEmptyRow(2)]);
  const keyCounterRef = useRef(3);
  const matchTokensRef = useRef({});

  const patchRow = (key, patch) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const handleInstrumentBlur = async (key) => {
    const row = rows.find((r) => r.key === key);
    if (!row) return;
    const typed = (row.descriptionOfUUC || "").trim();
    if (!typed || typed === row.lastResolvedDescription) return;
    patchRow(key, { instrumentLoading: true, instrumentError: null });
    try {
      const res = await axios.get(`/api/instruments/${typed.toUpperCase()}`);
      patchRow(key, {
        instrumentId: res.data.id,
        descriptionOfUUC: res.data.description,
        lastResolvedDescription: res.data.description,
        uucSubType: res.data.sub_type,
        instrumentLoading: false,
        instrumentError: null,
      });
    } catch {
      patchRow(key, { instrumentLoading: false, instrumentError: "Instrument not found" });
    }
  };

  const triggerMasterMatch = async (key, rangeMin, rangeMax) => {
    const max = Number(rangeMax);
    if (!rangeMax || Number.isNaN(max) || max <= 0) {
      patchRow(key, { masterMatch: null, masterError: null, masterLoading: false });
      return;
    }
    const token = (matchTokensRef.current[key] || 0) + 1;
    matchTokensRef.current[key] = token;
    patchRow(key, { masterLoading: true, masterError: null });
    try {
      const res = await axios.get("/api/match-master", {
        params: { rangeMin: rangeMin || "0", rangeMax: max },
      });
      if (matchTokensRef.current[key] !== token) return;
      patchRow(key, { masterMatch: res.data, masterLoading: false, masterError: null });
    } catch (err) {
      if (matchTokensRef.current[key] !== token) return;
      patchRow(key, {
        masterMatch: null,
        masterLoading: false,
        masterError: err.response?.status === 404 ? "No master match" : "Match lookup failed",
      });
    }
  };

  const handleRangeBlur = (key) => {
    const row = rows.find((r) => r.key === key);
    if (!row) return;
    triggerMasterMatch(key, row.rangeMin, row.rangeMax);
  };

  const copyFromRowNumber = (destKey, srcPos) => {
    const destRow = rows.find((r) => r.key === destKey);
    if (!destRow) return;

    if (!srcPos || srcPos < 1 || srcPos > rows.length) {
      patchRow(destKey, { copyError: "Invalid row #" });
      return;
    }
    const srcRow = rows[srcPos - 1];
    if (srcRow.key === destRow.key) {
      patchRow(destKey, { copyError: "Cannot copy from itself" });
      return;
    }

    setRows((prev) =>
      prev.map((r) =>
        r.key === destKey
          ? {
              ...r,
              instrumentId: srcRow.instrumentId,
              descriptionOfUUC: srcRow.descriptionOfUUC,
              lastResolvedDescription: srcRow.lastResolvedDescription,
              uucSubType: srcRow.uucSubType,
              instrumentError: null,
              make: srcRow.make,
              rangeMin: srcRow.rangeMin,
              rangeMax: srcRow.rangeMax,
              location: srcRow.location,
              accuracy: srcRow.accuracy,
              idNo: srcRow.idNo,
              calDate: srcRow.calDate,
              dueDate: srcRow.dueDate,
              masterMatch: null,
              masterError: null,
              masterLoading: false,
              copyFromIndex: "",
              copyError: null,
            }
          : r,
      ),
    );
    triggerMasterMatch(destKey, srcRow.rangeMin, srcRow.rangeMax);
  };

  const handleCopyRow = (destKey) => {
    const destRow = rows.find((r) => r.key === destKey);
    if (!destRow) return;
    copyFromRowNumber(destKey, parseInt(destRow.copyFromIndex, 10));
  };

  const handleCopyAbove = (destKey, srcSrNo) => {
    copyFromRowNumber(destKey, srcSrNo);
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, makeEmptyRow(keyCounterRef.current++)]);
  };

  const handleDeleteRow = (key) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
    delete matchTokensRef.current[key];
  };

  const value = {
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
  };

  return (
    <BulkEntriesContext.Provider value={value}>
      <Outlet />
    </BulkEntriesContext.Provider>
  );
}
