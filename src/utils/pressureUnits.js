export const toBar = {
  bar: 1,
  "kg/cm^2": 0.980665,
  psi: 0.0689476,
  mmHg: 0.00133322,
  mbar: 0.001,
  kPa: 0.01,
  inwc: 0.00249089,
  mmwc: 0.0000980665,
  inHg: 0.0338639,
};

export const PRESSURE_UNITS = [
  { value: "bar", label: "bar" },
  { value: "kg/cm^2", label: "kg/cm²" },
  { value: "psi", label: "psi" },
  { value: "mmHg", label: "mmHg" },
  { value: "mbar", label: "mbar" },
  { value: "kPa", label: "kPa" },
  { value: "inwc", label: "inwc" },
  { value: "mmwc", label: "mmwc" },
  { value: "inHg", label: "inHg" },
];

const UNIT_ALIASES = {
  bar: "bar",
  "kg/cm^2": "kg/cm^2",
  "kg/cm2": "kg/cm^2",
  kgcm2: "kg/cm^2",
  "kg/cm²": "kg/cm^2",
  psi: "psi",
  mmhg: "mmHg",
  mbar: "mbar",
  kpa: "kPa",
  inwc: "inwc",
  mmwc: "mmwc",
  inhg: "inHg",
};

export function normalizePressureUnit(unit) {
  const compact = String(unit || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
  if (!compact) return "bar";
  return UNIT_ALIASES[compact] || String(unit).trim();
}

export function pressureUnitLabel(unit) {
  const key = normalizePressureUnit(unit);
  const match = PRESSURE_UNITS.find((item) => item.value === key);
  return match?.label || unit || "bar";
}

export function toBarFactor(unit) {
  const key = normalizePressureUnit(unit);
  return toBar[key] ?? 1;
}

export function coercePressureUnit(unit) {
  const key = normalizePressureUnit(unit);
  return Object.prototype.hasOwnProperty.call(toBar, key)
    ? key
    : String(unit || "").trim();
}
