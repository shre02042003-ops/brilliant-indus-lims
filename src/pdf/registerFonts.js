import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerCertificateFonts() {
  if (registered) return;
  registered = true;
  Font.register({
    family: "TimesNewRoman",
    fonts: [
      { src: "/@fs/C:/Windows/Fonts/times.ttf", fontWeight: 400 },
      { src: "/@fs/C:/Windows/Fonts/timesbd.ttf", fontWeight: 700 },
    ],
  });
}
