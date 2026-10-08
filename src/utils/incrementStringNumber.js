export function incrementStringNumber(str, index) {
  if (!str) return "";
  return String(str).replace(/(\d+)(?!.*\d)/, (match) => {
    const numLength = match.length;
    const incrementedNum = (parseInt(match, 10) + Number(index || 0)).toString();
    return incrementedNum.padStart(numLength, "0");
  });
}
