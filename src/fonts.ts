import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

const fonts = [
  { family: "Noto Sans SC", file: "fonts/NotoSansSC-500.woff2", weight: "500" },
  { family: "Noto Sans SC", file: "fonts/NotoSansSC-900.woff2", weight: "900" },
  { family: "JetBrains Mono", file: "fonts/JetBrainsMono-Medium.woff2", weight: "500" },
  { family: "JetBrains Mono", file: "fonts/JetBrainsMono-ExtraBold.woff2", weight: "800" },
];

let started = false;
export const loadAllFonts = () => {
  if (started) return;
  started = true;
  for (const f of fonts) {
    loadFont({ family: f.family, url: staticFile(f.file), weight: f.weight, format: "woff2" }).catch((e) => {
      console.error("Font failed to load", f.file, e);
    });
  }
};
