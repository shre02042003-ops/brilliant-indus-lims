function isMasterLike(row) {
  return Boolean(row && (row.id_no || row.name || row.cert_no || row.range_text));
}

function unwrapSingleMaster(payload) {
  if (!isMasterLike(payload)) return [];
  const { uuc, masters, uucData, equipment, masterMatch, ...master } = payload;
  return [master];
}

export function mappedMasters(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload.filter(Boolean);
  if (Array.isArray(payload.masters)) return payload.masters.filter(Boolean);
  if (Array.isArray(payload.mapped_masters)) return payload.mapped_masters.filter(Boolean);
  if (payload.masterMatch) return mappedMasters(payload.masterMatch);
  if (payload.equipment && payload.equipment !== payload) {
    return mappedMasters(payload.equipment);
  }
  return unwrapSingleMaster(payload);
}

export function primaryMaster(payload) {
  return mappedMasters(payload)[0] || null;
}

export function normalizeMatchPayload(data) {
  const masters = mappedMasters(data);
  const uuc = data?.uuc || data?.uucData || null;
  if (uuc) {
    if (data.cmc_min != null && data.cmc_min !== "") uuc.cmc_min = data.cmc_min;
    if (data.cmc_max != null && data.cmc_max !== "") uuc.cmc_max = data.cmc_max;
    if (data.cmc_unit) uuc.cmc_unit = data.cmc_unit;
    if (Array.isArray(data.cmc_bands) && data.cmc_bands.length) {
      uuc.cmc_bands = data.cmc_bands;
    } else if (Array.isArray(uuc.cmc_bands) && uuc.cmc_bands.length) {
      // already on nested uuc
    } else if (Array.isArray(data.cmcBands) && data.cmcBands.length) {
      uuc.cmc_bands = data.cmcBands;
    }
    if (data.result_used) uuc.result_used = data.result_used;
    if (data.unit) uuc.unit = data.unit;
    if (data.parameter) uuc.parameter = data.parameter;
    if (data.make) uuc.make = data.make;
    if (data.accuracy) uuc.accuracy = data.accuracy;
    if (data.resolution) uuc.resolution = data.resolution;
    if (data.range_min != null && data.range_min !== "") uuc.range_min = data.range_min;
    if (data.range_max != null && data.range_max !== "") uuc.range_max = data.range_max;
    if (data.rh_range_min != null && data.rh_range_min !== "") {
      uuc.rh_range_min = data.rh_range_min;
    }
    if (data.rh_range_max != null && data.rh_range_max !== "") {
      uuc.rh_range_max = data.rh_range_max;
    }
    if (data.range_text) uuc.range_text = data.range_text;
    if (data.authorized_range_min != null && data.authorized_range_min !== "") {
      uuc.authorized_range_min = data.authorized_range_min;
    }
    if (data.authorized_range_max != null && data.authorized_range_max !== "") {
      uuc.authorized_range_max = data.authorized_range_max;
    }
  }
  return { masters, uuc };
}
