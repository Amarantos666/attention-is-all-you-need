export const C = {
  bg: "#05060A",
  bg2: "#0A0D1A",
  cyan: "#3DE0FF",
  blue: "#3D7BFF",
  violet: "#9B5CFF",
  magenta: "#FF3DCB",
  gold: "#FFC94D",
  red: "#FF4D6A",
  green: "#4DFFB0",
  white: "#F4F7FF",
  dim: "rgba(220,230,255,0.55)",
};

export const SANS = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
export const MONO = '"JetBrains Mono", "Noto Sans SC", monospace';

/** 霓虹发光 text-shadow */
export const glow = (color: string, k = 1) =>
  [
    `0 0 ${4 * k}px ${color}`,
    `0 0 ${14 * k}px ${color}`,
    `0 0 ${36 * k}px ${color}`,
    `0 0 ${80 * k}px ${color}88`,
  ].join(", ");

/** 白色文字的柔光 */
export const softGlow = (color = "rgba(120,170,255,0.9)") => `0 0 10px ${color}, 0 0 30px ${color}66`;

/** 8 种多头注意力颜色等调色板 */
export const PALETTE = ["#3DE0FF", "#9B5CFF", "#FF3DCB", "#FFC94D", "#4DFFB0", "#3D7BFF", "#FF7A3D", "#C6FF3D"];

/** 安全区：避开 TikTok 顶部导航、右侧按钮栏与底部文案区 */
export const SAFE = { top: 150, bottom: 1500, left: 70, right: 1010 };
