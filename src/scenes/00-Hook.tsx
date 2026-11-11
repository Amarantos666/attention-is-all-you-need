import React from "react";
import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { CanvasLayer, drawGlow } from "../components/CanvasLayer";
import { useT } from "../components/SceneShell";
import { Flash, Scramble, Slam, Typewriter } from "../components/Text";
import { clamp, Ease, prog, rnd, shake } from "../lib/anim";
import { C, MONO, SANS, softGlow } from "../theme";

/**
 * 钩子（设计时长 5 秒）
 * "你和 AI 说的每一句话……" → "背后都是数学" → 数字洪流淹没屏幕 → 收缩成一个光点
 */
/** 震撼段（设计秒）：调整时长时保持原速 */
export const KEEP: [number, number][] = [[1.95, 5]];
export const DESIGN = 5;

const CX = 540;
const CY = 960;

// —— 时间点（设计秒）——
const T_LINE1 = 0.25;
const T_SLAM = 2.0;
const T_FLOOD = 2.2;
const T_DROWN = 3.0;
const T_COLLAPSE = 3.62;
const T_POINT = 4.45;

type Tok = {
  size: number;
  rx: number;
  ry: number;
  spawn: number;
  col: string;
  alpha: number;
  kind: number;
  seed: number;
  cDelay: number;
};

const N = 1150;
const TOKENS: Tok[] = (() => {
  const arr: Tok[] = [];
  for (let i = 0; i < N; i++) {
    const r = rnd(`hs${i}`);
    const size = Math.round((16 + r * r * 58) / 4) * 4;
    const rx = rnd(`hx${i}`) * 1200 - 60;
    const ry = rnd(`hy${i}`) * 2040 - 60;
    const spawn = T_FLOOD + Math.sqrt(rnd(`ht${i}`)) * 1.25;
    const c = rnd(`hc${i}`);
    const col = c < 0.55 ? "61,224,255" : c < 0.85 ? "155,92,255" : "235,240,255";
    const d = Math.hypot(rx - CX, ry - CY) / 1100;
    arr.push({
      size,
      rx,
      ry,
      spawn,
      col,
      alpha: 0.28 + 0.72 * ((size - 16) / 58),
      kind: Math.floor(rnd(`hk${i}`) * 10),
      seed: i,
      cDelay: d * 0.22 + rnd(`hd${i}`) * 0.08,
    });
  }
  return arr.sort((a, b) => a.size - b.size);
})();

const SYMS = ["Σ", "×", "√", "∂", "≈", "e", "π", "λ"];
const tokText = (tk: Tok, frame: number) => {
  const step = Math.floor((frame + tk.seed * 7) / 7);
  const r = rnd(`hv${tk.seed}-${step}`);
  if (tk.kind < 5) return (r < 0.3 ? "-" : "") + (r * 9.9999).toFixed(4);
  if (tk.kind < 7) return Math.floor(r * 100000).toString();
  if (tk.kind < 9) return (r > 0.5 ? "1" : "0") + (rnd(`hb${tk.seed}-${step}`) > 0.5 ? "1" : "0") + "01";
  return SYMS[Math.floor(r * SYMS.length)];
};

const drawStorm = (ctx: CanvasRenderingContext2D, t: number) => {
  const frame = Math.floor(t * 60);
  ctx.globalCompositeOperation = "lighter";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let curSize = -1;
  let sumE = 0;
  for (const tk of TOKENS) {
    if (t < tk.spawn) continue;
    const fly = prog(t, tk.spawn, 0.55, Ease.outCubic);
    // 从屏幕外飞入
    let x = CX + (tk.rx - CX) * (1 + (1 - fly) * 1.6);
    let y = CY + (tk.ry - CY) * (1 + (1 - fly) * 1.6);
    let size = tk.size;
    let a = tk.alpha * clamp(fly * 1.5);
    // 收缩成一个点
    const e = prog(t, T_COLLAPSE + tk.cDelay, 0.62, Ease.inCubic);
    sumE += e;
    if (e > 0) {
      const ang = e * 1.9;
      const dx = (x - CX) * (1 - e);
      const dy = (y - CY) * (1 - e);
      x = CX + dx * Math.cos(ang) - dy * Math.sin(ang);
      y = CY + dx * Math.sin(ang) + dy * Math.cos(ang);
      size = size * (1 - 0.8 * e);
      a = a * (1 + e * 1.5) * (1 - prog(e, 0.82, 0.18, Ease.linear));
    }
    if (a <= 0.01) continue;
    if (size !== curSize) {
      curSize = size;
      ctx.font = `800 ${Math.max(4, size)}px "JetBrains Mono"`;
    }
    ctx.fillStyle = `rgba(${tk.col},${Math.min(1, a)})`;
    ctx.fillText(tokText(tk, frame), x, y);
  }

  // 中央光核
  const avg = sumE / N;
  if (t > T_COLLAPSE) {
    const grow = avg;
    const r = 18 + grow * 220;
    drawGlow(ctx, "61,224,255", CX, CY, r, 0.35 + grow * 0.6);
    drawGlow(ctx, "180,140,255", CX, CY, r * 0.55, 0.5 + grow * 0.5);
  }
  if (t > T_POINT - 0.05) {
    const k = prog(t, T_POINT - 0.05, 0.25, Ease.outExpo);
    const pulse = 1 + 0.12 * Math.sin((t - T_POINT) * 18);
    // 压缩成锐利光点
    drawGlow(ctx, "255,255,255", CX, CY, (90 - 50 * k) * pulse, 1);
    drawGlow(ctx, "61,224,255", CX, CY, (260 - 120 * k) * pulse, 0.8);
    // 水平镜头光晕
    ctx.save();
    ctx.translate(CX, CY);
    ctx.scale(9, 0.22);
    drawGlow(ctx, "61,224,255", 0, 0, 70 * (0.6 + 0.4 * k), 0.75);
    ctx.restore();
  }
  ctx.globalCompositeOperation = "source-over";
};

/** 冲击波圆环 */
const Shockwave: React.FC<{ at: number; x: number; y: number; color?: string; max?: number }> = ({ at, x, y, color = C.cyan, max = 760 }) => {
  const t = useT();
  const k = prog(t, at, 0.55, Ease.outCubic);
  if (t < at || k >= 1) return null;
  const r = 20 + k * max;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={22 * (1 - k) + 1} opacity={1 - k} style={{ filter: `drop-shadow(0 0 18px ${color})` }} />
      <circle cx={x} cy={y} r={r * 0.72} fill="none" stroke="#fff" strokeWidth={6 * (1 - k)} opacity={(1 - k) * 0.6} />
    </svg>
  );
};

export const Hook: React.FC = () => {
  const t = useT();
  const sh = shake(t, T_SLAM, 0.5, 24, 3);
  const line1Shift = prog(t, T_SLAM, 0.35, Ease.outCubic);
  const drown = prog(t, T_DROWN, 0.5, Ease.inQuad);

  return (
    <AbsoluteFill>
      <Backdrop intensity={0.8} dust={60} />
      <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)` }}>
        {/* 第一行：逐字打出 */}
        <div
          style={{
            position: "absolute",
            top: 770 - line1Shift * 50,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: SANS,
            fontWeight: 900,
            fontSize: 68,
            color: C.white,
            textShadow: softGlow(),
            opacity: (1 - 0.4 * line1Shift) * (1 - drown),
            filter: drown > 0 ? `blur(${drown * 8}px)` : undefined,
          }}
        >
          <Typewriter text="你和 AI 说的每一句话……" at={T_LINE1} cps={11} cursorUntil={T_SLAM} />
        </div>

        {/* 第二行：放大冲击 */}
        <Slam
          at={T_SLAM}
          from={3.4}
          style={{ position: "absolute", top: 880, left: 0, right: 0, textAlign: "center" }}
        >
          <div
            style={{
              display: "inline-block",
              filter: `drop-shadow(0 0 18px rgba(61,224,255,0.9)) drop-shadow(0 0 50px rgba(155,92,255,0.8))`,
            }}
          >
            <Scramble
              text="背后都是数学"
              at={T_DROWN + 0.05}
              dur={0.55}
              reverse
              style={{ fontFamily: SANS, fontWeight: 900, fontSize: 150, letterSpacing: 6 }}
              charStyle={() => ({
                background: "linear-gradient(180deg, #FFFFFF 0%, #9FEFFF 45%, #9B5CFF 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              })}
            />
          </div>
        </Slam>
        <Shockwave at={T_SLAM + 0.03} x={CX} y={960} />
      </AbsoluteFill>

      {/* 数字洪流 */}
      <CanvasLayer draw={(ctx) => drawStorm(ctx, t)} />

      {/* 洪流时的轻微暗化，突出数字层次 */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0%, rgba(5,6,10,0.5) 100%)",
          opacity: prog(t, T_FLOOD, 1, Ease.linear) * (1 - prog(t, T_COLLAPSE, 0.6)),
        }}
      />
      <Flash at={T_SLAM} peak={0.45} dur={0.18} />
      <Flash at={T_POINT} peak={0.55} dur={0.22} color="#BFF4FF" />
      {/* 字体名提示（JetBrains Mono 用于数字） */}
      <div style={{ position: "absolute", opacity: 0, fontFamily: MONO }}>0</div>
    </AbsoluteFill>
  );
};
