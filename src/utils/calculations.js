const KG_CM2_TO_BAR = 0.9806;

const ACCURACY_FRACTIONS = {
  0.25: 0.0025,
  0.5: 0.005,
  "1.0": 0.01,
  1.6: 0.016,
  "2.0": 0.02,
  2.5: 0.025,
  "4.0": 0.04,
};

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateCalibrationData(
  uucRangeMax,
  accuracyPercent,
  equipment,
) {
  if (!uucRangeMax || !accuracyPercent || !equipment) return [];

  const fsdKgCm2 = uucRangeMax;
  const fsdBar = fsdKgCm2 * KG_CM2_TO_BAR;
  const accuracyFraction = ACCURACY_FRACTIONS[String(accuracyPercent)] || 0.02;
  const accuracyBandBar = accuracyFraction * fsdBar;

  const rowValues = [];
  for (let i = 0; i <= 5; i++) {
    rowValues.push((fsdKgCm2 / 5) * i);
  }

  const rng = seededRandom(42);

  return rowValues.map((pindKgCm2, idx) => {
    const pindBar = parseFloat((pindKgCm2 * KG_CM2_TO_BAR).toFixed(3));

    if (idx === 0) {
      return {
        pindKgCm2,
        pindBar: 0,
        m1: 0,
        m2: 0,
        mean: 0,
        deviation: 0,
        errorPercent: 0,
        hysteresis: 0,
        expandedUncertainty: equipment.expanded_uncertainty,
      };
    }

    const hysteresisOffset = accuracyBandBar * 0.04;
    const noise1 = (rng() - 0.5) * 0.02;
    const noise2 = (rng() - 0.5) * 0.02;

    const nominalBar = pindBar;

    let m1 = parseFloat((nominalBar - hysteresisOffset + noise1).toFixed(3));
    let m2 = parseFloat((nominalBar + hysteresisOffset + noise2).toFixed(3));

    if (m1 < 0) m1 = 0;
    if (m2 < 0) m2 = 0;

    const mean = parseFloat(((m1 + m2) / 2).toFixed(3));
    const deviation = parseFloat((mean - pindBar).toFixed(3));
    const errorPercent = parseFloat(((deviation / fsdBar) * 100).toFixed(2));
    const hysteresis = parseFloat(Math.abs(m2 - m1).toFixed(3));

    return {
      pindKgCm2,
      pindBar,
      m1,
      m2,
      mean,
      deviation,
      errorPercent,
      hysteresis,
      expandedUncertainty: equipment.expanded_uncertainty,
    };
  });
}
