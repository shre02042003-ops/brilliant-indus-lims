const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "companies.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS uuc_instruments (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    sub_type TEXT DEFAULT ''
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS master_equipment (
    id TEXT PRIMARY KEY,
    sr_no INTEGER DEFAULT 0,
    name TEXT NOT NULL,
    id_no TEXT NOT NULL,
    cal_agency TEXT NOT NULL,
    range_text TEXT NOT NULL,
    range_min REAL DEFAULT 0,
    range_max REAL DEFAULT 0,
    cert_no TEXT DEFAULT '',
    cal_date TEXT DEFAULT '',
    due_date TEXT DEFAULT '',
    expanded_uncertainty REAL DEFAULT 0
  )
`);

const compCount = db.prepare("SELECT COUNT(*) as cnt FROM companies").get();
if (compCount.cnt === 0) {
  const insert = db.prepare(
    "INSERT INTO companies (id, name, address) VALUES (?, ?, ?)",
  );
  const seed = db.transaction(() => {
    insert.run(
      "C101",
      "DEMBLA VALVES PVT LTD.",
      "UNIT-II C-30, JAI MATA DI COMPOUND, KALHER, THANE BHIWANDI AGRA ROAD, DIST - THANE - 421302.",
    );
    insert.run(
      "C102",
      "MAHARASHTRA INDUSTRIES LTD.",
      "PLOT NO. 15, MIDC INDUSTRIAL AREA, BHOSARI, PUNE - 411026.",
    );
    insert.run(
      "C103",
      "PRECISION ENGINEERING CO.",
      "UNIT 7, GUT NO. 12, WAGHOLE, PALGHAR - 401404.",
    );
    insert.run(
      "C104",
      "BHARAT PETROLEUM CORP. LTD.",
      "MAHA REFINERY, P.O. UMROLI, TAL. PALGHAR, DIST. THANE - 401404.",
    );
    insert.run(
      "C105",
      "TATA CHEMICALS LTD.",
      "RALLI DIVASION, P.O. RALLI SION, MUMBAI - 400022.",
    );
  });
  seed();
}

const instCount = db
  .prepare("SELECT COUNT(*) as cnt FROM uuc_instruments")
  .get();
if (instCount.cnt === 0) {
  const insert = db.prepare(
    "INSERT INTO uuc_instruments (id, description, sub_type) VALUES (?, ?, ?)",
  );
  const seed = db.transaction(() => {
    insert.run("U101", "PRESSURE GAUGE", "(Hydraulic bourden type)");
    insert.run("U102", "PRESSURE GAUGE", "(Bourden tube type)");
    insert.run("U103", "VACUUM GAUGE", "(Bourden tube type)");
    insert.run("U104", "COMPOUND GAUGE", "(Bourden tube type)");
    insert.run("U105", "DIAPHRAGM GAUGE", "(Diaphragm type)");
  });
  seed();
}

const masterCount = db
  .prepare("SELECT COUNT(*) as cnt FROM master_equipment")
  .get();
if (masterCount.cnt === 0) {
  const insert = db.prepare(
    "INSERT INTO master_equipment (id, sr_no, name, id_no, cal_agency, range_text, range_min, range_max, cert_no, cal_date, due_date, expanded_uncertainty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const seed = db.transaction(() => {
    insert.run(
      "M101",
      1,
      "DIGITAL PRESSURE GAUGE",
      "BI/PG/101",
      "NISHITRONICS\nCC-2294",
      "0-1000 bar",
      0,
      1000,
      "NI2026/01/0013",
      "03.01.2026",
      "02.01.2027",
      1.15,
    );
    insert.run(
      "M102",
      2,
      "DIGITAL PRESSURE GAUGE",
      "BI/PG/68",
      "NISHITRONICS\nCC-2294",
      "0-35 bar",
      0,
      35,
      "NI2026/02/0215",
      "21.02.2026",
      "20.02.2027",
      1.13,
    );
    insert.run(
      "M103",
      3,
      "DIGITAL PRESSURE GAUGE",
      "BI/PG/69",
      "NISHITRONICS\nCC-2294",
      "0-350 bar",
      0,
      350,
      "NI2026/02/0217",
      "21.02.2026",
      "20.02.2027",
      1.13,
    );
    insert.run(
      "M104",
      4,
      "DIGITAL PRESSURE GAUGE",
      "BI/PG/70",
      "NISHITRONICS\nCC-2294",
      "0-700 bar",
      0,
      700,
      "NI2026/02/0218",
      "21.02.2026",
      "20.02.2027",
      1.14,
    );
  });
  seed();
}

function nextId(table, prefix) {
  const rows = db.prepare(`SELECT id FROM ${table}`).all();
  const re = new RegExp(`^${prefix}(\\d+)$`);
  let max = 100; // empty/never-seeded table starts at prefix+101, matching seed convention
  for (const { id } of rows) {
    const m = typeof id === "string" && id.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `${prefix}${max + 1}`;
}
db.nextId = nextId;

module.exports = db;
