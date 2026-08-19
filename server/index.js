const express = require("express");
const cors = require("cors");
const db = require("./database");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/companies", (req, res) => {
  const companies = db.prepare("SELECT * FROM companies ORDER BY id").all();
  res.json(companies);
});

app.get("/api/companies/:id", (req, res) => {
  const company = db
    .prepare("SELECT * FROM companies WHERE id = ?")
    .get(req.params.id);
  if (company) {
    res.json(company);
  } else {
    res.status(404).json({ error: "Company not found" });
  }
});
app.get("/api/instruments", (req, res) => {
  const instruments = db.prepare("SELECT * FROM uuc_instruments ORDER BY id").all();
  res.json(instruments);
});

app.get("/api/instruments/:id", (req, res) => {
  const instrument = db
    .prepare("SELECT * FROM uuc_instruments WHERE id = ?")
    .get(req.params.id);
  if (instrument) {
    res.json(instrument);
  } else {
    res.status(404).json({ error: "Instrument not found" });
  }
});

app.get("/api/match-master", (req, res) => {
  const { rangeMin, rangeMax } = req.query;
  if (!rangeMax || isNaN(rangeMax) || Number(rangeMax) <= 0) {
    return res.status(400).json({ error: "Invalid range parameters" });
  }
  const kgCm2ToBar = 0.9806;
  const minKg = rangeMin && !isNaN(rangeMin) ? Number(rangeMin) : 0;
  const maxKg = Number(rangeMax);
  const minBar = minKg * kgCm2ToBar;
  const maxBar = maxKg * kgCm2ToBar;

  const candidates = db
    .prepare(
      "SELECT * FROM master_equipment WHERE range_max >= ? AND range_min <= ?",
    )
    .all(maxBar, minBar);

  if (candidates.length === 0) {
    return res
      .status(404)
      .json({ error: "No matching master equipment found" });
  }

  const RANGE_WEIGHT = 0.8;
  const UNCERTAINTY_WEIGHT = 0.2;

  let optimal = candidates[0];
  let bestScore = Infinity;

  for (const m of candidates) {
    const gap = m.range_max - maxBar;
    const score =
      gap * RANGE_WEIGHT + m.expanded_uncertainty * UNCERTAINTY_WEIGHT;
    if (score < bestScore) {
      bestScore = score;
      optimal = m;
    }
  }

  res.json(optimal);
});

const insertCompany = db.transaction((name, address) => {
  const id = db.nextId("companies", "C");
  db.prepare("INSERT INTO companies (id, name, address) VALUES (?, ?, ?)").run(
    id,
    name,
    address,
  );
  return id;
});

app.post("/api/companies", (req, res) => {
  const { name, address } = req.body || {};
  if (!name || !address) {
    return res.status(400).json({ error: "name and address are required" });
  }
  const id = insertCompany(name, address);
  res.status(201).json({ id, name, address });
});

const insertInstrument = db.transaction((description, subType) => {
  const id = db.nextId("uuc_instruments", "U");
  db.prepare(
    "INSERT INTO uuc_instruments (id, description, sub_type) VALUES (?, ?, ?)",
  ).run(id, description, subType);
  return id;
});

app.post("/api/instruments", (req, res) => {
  const { description, sub_type } = req.body || {};
  if (!description) {
    return res.status(400).json({ error: "description is required" });
  }
  const id = insertInstrument(description, sub_type || "");
  res.status(201).json({ id, description, sub_type: sub_type || "" });
});

const insertMaster = db.transaction((body) => {
  const id = db.nextId("master_equipment", "M");
  const srNo = db
    .prepare("SELECT COALESCE(MAX(sr_no), 0) + 1 AS n FROM master_equipment")
    .get().n;
  db.prepare(
    `INSERT INTO master_equipment
       (id, sr_no, name, id_no, cal_agency, range_text, range_min, range_max,
        cert_no, cal_date, due_date, expanded_uncertainty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    srNo,
    body.name,
    body.id_no,
    body.cal_agency,
    body.range_text,
    body.range_min ?? 0,
    body.range_max,
    body.cert_no ?? "",
    body.cal_date ?? "",
    body.due_date ?? "",
    body.expanded_uncertainty ?? 0,
  );
  return id;
});

app.post("/api/masters", (req, res) => {
  const body = req.body || {};
  const rangeMaxNum = Number(body.range_max);
  if (
    !body.name ||
    !body.id_no ||
    !body.cal_agency ||
    !body.range_text ||
    !body.range_max ||
    isNaN(rangeMaxNum) ||
    rangeMaxNum <= 0
  ) {
    return res.status(400).json({
      error:
        "name, id_no, cal_agency, range_text and a valid range_max are required",
    });
  }
  const id = insertMaster(body);
  const created = db
    .prepare("SELECT * FROM master_equipment WHERE id = ?")
    .get(id);
  res.status(201).json(created);
});

app.get("/api/masters", (req, res) => {
  const masters = db
    .prepare("SELECT * FROM master_equipment ORDER BY sr_no")
    .all();
  res.json(masters);
});

app.get("/api/masters/:id", (req, res) => {
  const master = db
    .prepare("SELECT * FROM master_equipment WHERE id = ?")
    .get(req.params.id);
  if (master) {
    res.json(master);
  } else {
    res.status(404).json({ error: "Master not found" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
