function firstText(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

export function getCertificateProfile(uuc = {}) {
  const uucUnit = firstText(
    uuc.unit,
    uuc.uuc_unit,
    uuc.parameter_unit,
    uuc.display_unit,
    uuc.si_unit,
  );
  const masterUnit = firstText(uuc.master_unit, uuc.unit_alt, uucUnit);
  const dual =
    Boolean(uucUnit) &&
    Boolean(masterUnit) &&
    uucUnit !== masterUnit;
  const pressurePair =
    /kg\s*\/\s*cm/i.test(uucUnit) && /^bar$/i.test(masterUnit);

  return {
    uucUnit,
    masterUnit: masterUnit || uucUnit,
    showDualUnits: dual,
    conversionFactor: pressurePair ? 0.9806 : 1,
    conversionNote: pressurePair
      ? "7. Conversion used 1kg/cm² = 0.9806bar"
      : null,
    discipline: firstText(uuc.discipline),
    method: firstText(uuc.method, uuc.method_of_measurement, "Comparison method"),
    procedure: firstText(uuc.procedure, uuc.cal_procedure),
    parameter: firstText(uuc.parameter, uuc.parameter_name),
    result_used: firstText(uuc.result_used, uuc.resultUsed).toUpperCase(),
    cmc_unit: firstText(uuc.cmc_unit, uuc.cmcUnit),
  };
}
