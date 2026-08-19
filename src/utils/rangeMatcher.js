const KG_CM2_TO_BAR = 0.9806;

export function matchEquipment(uucRangeMax, mastersList) {
  if (
    !uucRangeMax ||
    uucRangeMax <= 0 ||
    !mastersList ||
    mastersList.length === 0
  )
    return null;

  const uucBar = uucRangeMax * KG_CM2_TO_BAR;

  const candidates = mastersList.filter((eq) => eq.range_max >= uucBar);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.range_max - b.range_max);

  return candidates[0];
}
