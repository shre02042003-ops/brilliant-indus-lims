export function makeEmptyRow(key) {
  return {
    key, // stable React-list identity; Sr.No is derived from position, never stored here

    instrumentId: "",
    descriptionOfUUC: "",
    lastResolvedDescription: "",
    uucSubType: "",
    instrumentLoading: false,
    instrumentError: null,

    make: "",
    rangeMin: "",
    rangeMax: "",
    location: "",
    accuracy: "2.0",
    idNo: "",
    calDate: null,
    dueDate: null,

    masterLoading: false,
    masterMatch: null,
    masterError: null,

    copyFromIndex: "",
    copyError: null,
  };
}

export function isRowEmpty(row) {
  return (
    !row.descriptionOfUUC &&
    !row.make &&
    !row.rangeMin &&
    !row.rangeMax &&
    !row.location &&
    !row.idNo
  );
}
