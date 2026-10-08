import { StyleSheet } from "@react-pdf/renderer";

/** A4 points: 1cm ≈ 28.35pt */
const CM = 28.35;
const MARGIN_TOP = 4 * CM;
/** Tighter bottom so signatures/notices stay on page 1 unless results need a 2nd page */
const MARGIN_BOTTOM = 1.8 * CM;
const MARGIN_LEFT = 2 * CM;
const MARGIN_RIGHT = 1.5 * CM;
/** Keep all body text inside the outer border */
const INNER_GUTTER = 10;
const HEADER_HEIGHT = 68;

export const PAGE_MARGINS = {
  top: MARGIN_TOP,
  bottom: MARGIN_BOTTOM,
  left: MARGIN_LEFT,
  right: MARGIN_RIGHT,
  headerHeight: HEADER_HEIGHT,
  innerGutter: INNER_GUTTER,
};

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Times-Roman",
    fontSize: 10,
    paddingTop: MARGIN_TOP + HEADER_HEIGHT,
    paddingBottom: MARGIN_BOTTOM + INNER_GUTTER,
    paddingLeft: MARGIN_LEFT + INNER_GUTTER,
    paddingRight: MARGIN_RIGHT + INNER_GUTTER,
    color: "#000",
  },
  pageFrame: {
    position: "absolute",
    top: MARGIN_TOP,
    bottom: MARGIN_BOTTOM,
    left: MARGIN_LEFT,
    right: MARGIN_RIGHT,
    borderWidth: 1.5,
    borderColor: "#000",
    borderStyle: "solid",
  },
  fixedHeader: {
    position: "absolute",
    top: MARGIN_TOP,
    left: MARGIN_LEFT,
    right: MARGIN_RIGHT,
    height: HEADER_HEIGHT,
    paddingTop: 4,
    paddingBottom: 2,
    paddingHorizontal: INNER_GUTTER,
  },
  headerSection: {
    borderWidth: 0.75,
    borderColor: "#000",
    borderStyle: "solid",
    padding: 4,
  },
  section: {
    borderWidth: 0.75,
    borderColor: "#000",
    borderStyle: "solid",
    padding: 3,
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: "Times-Bold",
    fontSize: 9,
    marginBottom: 1,
  },
  colonRow: {
    flexDirection: "row",
    marginBottom: 1,
    alignItems: "flex-start",
  },
  colonLabel: {
    fontFamily: "Times-Bold",
    fontSize: 10,
    width: "35%",
  },
  colonMark: {
    fontFamily: "Times-Bold",
    fontSize: 10,
    width: "3%",
  },
  colonValue: {
    fontFamily: "TimesNewRoman",
    fontSize: 10,
    width: "62%",
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  metaCell: {
    width: "33.33%",
    marginBottom: 1,
    paddingRight: 4,
  },
  metaLabel: {
    fontFamily: "Times-Bold",
    fontSize: 8,
    marginBottom: 1,
  },
  metaValue: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#999",
    borderBottomStyle: "solid",
    paddingBottom: 1,
    minHeight: 11,
    fontSize: 10,
  },
  table: {
    borderWidth: 0.75,
    borderColor: "#000",
    borderStyle: "solid",
    width: "100%",
  },
  tableRow: {
    flexDirection: "row",
  },
  th: {
    fontFamily: "Times-Bold",
    fontSize: 6.5,
    borderRightWidth: 0.5,
    borderRightColor: "#000",
    borderRightStyle: "solid",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
    borderBottomStyle: "solid",
    paddingVertical: 1,
    paddingHorizontal: 2,
    textAlign: "center",
  },
  td: {
    fontSize: 7,
    borderRightWidth: 0.5,
    borderRightColor: "#000",
    borderRightStyle: "solid",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
    borderBottomStyle: "solid",
    paddingVertical: 1,
    paddingHorizontal: 2,
    textAlign: "center",
  },
  lastCol: {
    borderRightWidth: 0,
  },
  note: {
    fontSize: 7,
    lineHeight: 1.15,
    marginBottom: 0,
    paddingLeft: 4,
    paddingRight: 4,
  },
  sigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
    marginBottom: 1,
    paddingHorizontal: 4,
  },
  sigBlock: {
    width: "48%",
  },
  sigRight: {
    width: "48%",
    textAlign: "right",
    paddingRight: 2,
  },
  endMark: {
    fontFamily: "Times-Bold",
    textAlign: "center",
    marginTop: 1,
    marginBottom: 0,
  },
  formRef: {
    textAlign: "right",
    fontSize: 7,
    marginTop: 1,
    paddingRight: 4,
  },
  closingBlock: {
    marginTop: 1,
    paddingHorizontal: 2,
  },
});
