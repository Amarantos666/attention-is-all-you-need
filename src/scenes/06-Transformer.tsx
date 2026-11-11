import React from "react";
import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { CanvasLayer, drawGlow, hexToRgb } from "../components/CanvasLayer";
import { useT } from "../components/SceneShell";
import { Caption, Flash } from "../components/Text";
import { clamp, Ease, lerp, prog, rnd } from "../lib/anim";
import { BOX_FACES, boxCorners, Cam, project, V3 } from "../lib/proj3d";
import { C, MONO, PALETTE, SANS, glow, softGlow } from "../theme";

/**
 * 06 Transformer（设计时长 13.5 秒）
 * A 0–2.6s   多头注意力：8 种颜色的光束同时扫过句子（示意）
 * B 2.6–4.6s 位置编码：正弦波流过每个词，盖上"第几个"的印记
 * C 4.6–8.0s 组装一个积木块：注意力 → 残差+层归一化 → 前馈网络 → 残差+层归一化
 * D 8.0–13.5s 6 块堆成左右两座塔（编码器 / 解码器），镜头环绕上升；GPT 只用右塔并堆得更高
 */
/** 震撼段（设计秒）：调整时长时保持原速 */
export const KEEP: [number, number][] = [
  [0.25, 1.35],
  [8.0, 9.6],
];
export const DESIGN = 13.5;

const T_POS = 2.6;
const T_BLOCK = 4.6;
const T_TOWER = 8.0;
const T_GPT = 10.1;

/* -------------------------------- 句子 -------------------------------- */

const WORDS = ["我", "今天", "想", "吃", "苹果", "派"];
const FS = 56;
const ROW_Y = 1000;
const chipW = (w: string) => w.length * FS + 40;
const chipX = (() => {
  const total = WORDS.reduce((a, w) => a + chipW(w), 0) + 22 * (WORDS.length - 1);
  let x = 540 - total / 2;
  return WORDS.map((w) => {
    const c = x + chipW(w) / 2;
    x += chipW(w) + 22;
    return c;
  });
})();

// 每个头关注的词对（示意）
const HEAD_PAIRS = PALETTE.map((_, h) => {
  const pairs: [number, number][] = [];
  for (let k = 0; k < 3; k++) {
    const a = Math.floor(rnd(`hp${h}-${k}a`) * WORDS.length);
    let b = Math.floor(rnd(`hp${h}-${k}b`) * WORDS.length);
    if (b === a) b = (a + 1 + h) % WORDS.length;
    pairs.push([Math.min(a, b), Math.max(a, b)]);
  }
  return pairs;
});

const drawHeads = (ctx: CanvasRenderingContext2D, t: number) => {
  const out = prog(t, T_POS - 0.1, 0.4);
  if (t < 0.2 || out >= 1) return;
  ctx.globalCompositeOperation = "lighter";
  PALETTE.forEach((col, h) => {
    const rgb = hexToRgb(col);
    // 扫过的光束
    const sweep = prog(t, 0.3 + h * 0.07, 0.75, Ease.inOutCubic);
    if (sweep > 0 && sweep < 1) {
      const x = lerp(40, 1040, sweep);
      const g = ctx.createLinearGradient(x - 60, 0, x + 60, 0);
      g.addColorStop(0, `rgba(${rgb},0)`);
      g.addColorStop(0.5, `rgba(${rgb},0.45)`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - 60, 480 + h * 8, 120, 600 - h * 8);
    }
    // 弧线：每个头连接不同的词对
    HEAD_PAIRS[h].forEach(([a, b], k) => {
      const k1 = prog(t, 0.75 + h * 0.07 + k * 0.08, 0.5, Ease.outCubic);
      if (k1 <= 0) return;
      const x1 = chipX[a];
      const x2 = chipX[b];
      const lift = 90 + (x2 - x1) * 0.35 + h * 14;
      ctx.strokeStyle = `rgba(${rgb},${0.75 * (1 - out)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      const steps = 30;
      for (let s = 0; s <= steps * k1; s++) {
        const u = s / steps;
        const x = lerp(x1, x2, u);
        const y = ROW_Y - 50 - Math.sin(u * Math.PI) * lift;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  });
  ctx.globalCompositeOperation = "source-over";
};

const drawWaves = (ctx: CanvasRenderingContext2D, t: number) => {
  const a = prog(t, T_POS, 0.3) * (1 - prog(t, T_BLOCK - 0.2, 0.4));
  if (a <= 0) return;
  ctx.globalCompositeOperation = "lighter";
  const freqs = [1, 2, 4, 8];
  freqs.forEach((f, i) => {
    const col = [C.cyan, C.violet, C.magenta, C.gold][i];
    ctx.strokeStyle = `rgba(${hexToRgb(col)},${0.7 * a})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    const front = lerp(0, 1100, prog(t, T_POS + 0.1, 1.2, Ease.inOutCubic));
    for (let x = 0; x <= front; x += 4) {
      const y = 1180 + i * 70 + Math.sin((x / 1080) * Math.PI * 2 * f - t * 4) * 26;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    drawGlow(ctx, hexToRgb(col), front, 1180 + i * 70 + Math.sin((front / 1080) * Math.PI * 2 * f - t * 4) * 26, 22, a);
  });
  ctx.globalCompositeOperation = "source-over";
};

const Chips: React.FC<{ t: number }> = ({ t }) => {
  const out = prog(t, T_BLOCK - 0.1, 0.5, Ease.inCubic);
  if (out >= 1) return null;
  const front = lerp(0, 1100, prog(t, T_POS + 0.1, 1.2, Ease.inOutCubic));
  return (
    <>
      {WORDS.map((w, i) => {
        const appear = prog(t, 0.05 + i * 0.05, 0.3, Ease.outBack);
        const stamped = t > T_POS && front > chipX[i];
        const stampK = stamped ? prog(t, T_POS + 0.1 + (chipX[i] / 1100) * 1.2, 0.3, Ease.outBack) : 0;
        // 飞入积木块底部
        const x = lerp(chipX[i], 540 + (i - 2.5) * 40, out);
        const y = lerp(ROW_Y, 1180, out);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${appear * (1 - out * 0.8)})`,
              opacity: clamp(appear) * (1 - out),
              padding: "4px 20px 8px",
              borderRadius: 16,
              border: `3px solid ${stamped ? C.gold : "rgba(61,224,255,0.7)"}`,
              background: "rgba(20,24,46,0.85)",
              boxShadow: `0 0 20px rgba(61,224,255,0.4)`,
              fontFamily: SANS,
              fontWeight: 900,
              fontSize: FS,
              color: C.white,
              whiteSpace: "nowrap",
            }}
          >
            {w}
            {stampK > 0 ? (
              <div
                style={{
                  position: "absolute",
                  right: -16,
                  top: -26,
                  transform: `scale(${stampK}) rotate(${-12 * stampK}deg)`,
                  fontFamily: MONO,
                  fontWeight: 800,
                  fontSize: 26,
                  color: "#1A1205",
                  background: C.gold,
                  borderRadius: 12,
                  padding: "2px 10px",
                  boxShadow: `0 0 16px ${C.gold}`,
                }}
              >
                #{i + 1}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
};

const Header: React.FC<{ t: number; at: number; until: number; title: string; en: string; note?: string }> = ({ t, at, until, title, en, note }) => {
  const a = prog(t, at, 0.3) * (1 - prog(t, until, 0.3));
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", top: 270, left: 0, right: 0, textAlign: "center", opacity: a, transform: `translateY(${(1 - prog(t, at, 0.35, Ease.outCubic)) * 30}px)` }}>
      <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 70, color: C.white, textShadow: softGlow() }}>{title}</div>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 34, color: C.cyan, marginTop: 8, textShadow: glow(C.cyan, 0.3) }}>{en}</div>
      {note ? <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 30, color: C.dim, marginTop: 10 }}>{note}</div> : null}
    </div>
  );
};

/* -------------------------------- 积木块 -------------------------------- */

const PARTS = [
  { name: "多头注意力", en: "Multi-Head Attention", y: 1010, h: 150, color: C.magenta, at: 4.9 },
  { name: "残差连接 + 层归一化", en: "Add & Norm", y: 905, h: 74, color: C.violet, at: 5.55 },
  { name: "前馈网络", en: "Feed Forward", y: 740, h: 150, color: C.cyan, at: 6.2 },
  { name: "残差连接 + 层归一化", en: "Add & Norm", y: 635, h: 74, color: C.violet, at: 6.85 },
];

const Block: React.FC<{ t: number }> = ({ t }) => {
  const a = prog(t, T_BLOCK, 0.3);
  const out = prog(t, T_TOWER - 0.1, 0.45, Ease.inCubic);
  if (a <= 0 || out >= 1) return null;
  return (
    <AbsoluteFill style={{ opacity: a * (1 - out), transform: `scale(${1 - out * 0.6})`, transformOrigin: "540px 880px" }}>
      {/* 外框 */}
      <div style={{ position: "absolute", left: 150, right: 150, top: 600, height: 600, borderRadius: 28, border: "3px dashed rgba(160,180,255,0.5)" }} />
      <div style={{ position: "absolute", left: 66, top: 870, fontFamily: MONO, fontWeight: 800, fontSize: 40, color: C.dim }}>× N</div>
      {PARTS.map((p, i) => {
        const k = prog(t, p.at, 0.4, Ease.outBack);
        const lit = prog(t, p.at, 0.15) * (1 - 0.5 * prog(t, p.at + 0.6, 0.4));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 200,
              right: 200,
              top: p.y,
              height: p.h,
              borderRadius: 18,
              border: `4px solid ${p.color}`,
              background: `rgba(${hexToRgb(p.color)},${0.1 + 0.3 * lit})`,
              boxShadow: `0 0 ${20 + 50 * lit}px rgba(${hexToRgb(p.color)},${0.4 + 0.5 * lit})`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              transform: `scaleX(${k})`,
              opacity: clamp(k),
            }}
          >
            <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: p.h > 100 ? 50 : 34, color: C.white }}>{p.name}</div>
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: p.h > 100 ? 28 : 22, color: p.color }}>{p.en}</div>
          </div>
        );
      })}
      {/* 残差：信息抄近路 */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {[
          { y1: 1185, y2: 942, at: 7.2 },
          { y1: 893, y2: 672, at: 7.35 },
        ].map((r, i) => {
          const k = prog(t, r.at, 0.4, Ease.inOutCubic);
          return (
            <g key={i} opacity={k > 0 ? 1 : 0}>
              <path
                d={`M 880 ${r.y1} C 980 ${r.y1}, 980 ${r.y2}, 880 ${r.y2}`}
                fill="none"
                stroke={C.gold}
                strokeWidth={5}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - k}
                style={{ filter: `drop-shadow(0 0 8px ${C.gold})` }}
              />
              <polygon points={`880,${r.y2} 900,${r.y2 - 12} 900,${r.y2 + 12}`} fill={C.gold} opacity={k} />
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1240, textAlign: "center", fontFamily: SANS, fontWeight: 500, fontSize: 30, color: "#FFE3A3", opacity: prog(t, 7.4, 0.3) }}>
        金色箭头 = 残差连接：信息可以"抄近路"，堆很多层也好训练
      </div>
    </AbsoluteFill>
  );
};

/* -------------------------------- 双塔 -------------------------------- */

const BW = 300;
const BH = 64;
const BD = 200;
const GAP = 88;
const TX = 250;

const camAt = (t: number): Cam => {
  const k = prog(t, T_TOWER, 3.0, Ease.inOutCubic);
  const g = prog(t, T_GPT, 2.6, Ease.inOutSine);
  return {
    target: [lerp(0, TX, g), lerp(-150, -420, k) + lerp(0, -380, g), 0],
    yaw: lerp(-0.75, 0.45, k) + (t - T_TOWER) * 0.04,
    pitch: lerp(0.45, 0.18, k),
    dist: lerp(1250, 1380, k) + g * 620,
    f: 1050,
    cx: 540,
    cy: 900,
  };
};

type BoxDraw = { corners: V3[]; color: string; alpha: number };

const drawTowers = (ctx: CanvasRenderingContext2D, t: number) => {
  if (t < T_TOWER - 0.1) return;
  const cam = camAt(t);
  const appear = prog(t, T_TOWER - 0.1, 0.3);
  const gpt = prog(t, T_GPT, 1.0);
  const boxes: BoxDraw[] = [];
  for (const side of [-1, 1]) {
    const n = side < 0 ? 6 : 6 + Math.floor(prog(t, T_GPT + 0.5, 2.0, Ease.linear) * 10);
    for (let i = 0; i < n; i++) {
      const at = T_TOWER + 0.05 + i * 0.16 + (side > 0 ? 0.08 : 0);
      const drop = prog(t, i < 6 ? at : T_GPT + 0.5 + (i - 6) * 0.2, 0.35, Ease.outCubic);
      if (drop <= 0) continue;
      const y = -i * GAP - (1 - drop) * 400;
      const color = side < 0 ? C.cyan : C.violet;
      const alpha = drop * (side < 0 ? 1 - 0.8 * gpt : 1);
      boxes.push({ corners: boxCorners([side * TX, y, 0], BW, BH, BD), color, alpha });
    }
  }
  // 连接：编码器顶端 → 解码器每一层（交叉注意力）
  ctx.globalCompositeOperation = "lighter";
  const enc = project([-TX + BW / 2, -5 * GAP, 0], cam);
  for (let i = 0; i < 6; i++) {
    const k = prog(t, T_TOWER + 1.2 + i * 0.08, 0.3);
    const p = project([TX - BW / 2, -i * GAP, 0], cam);
    if (!enc || !p || k <= 0) continue;
    ctx.strokeStyle = `rgba(61,224,255,${0.35 * k * (1 - gpt)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(enc.x, enc.y);
    ctx.lineTo(lerp(enc.x, p.x, k), lerp(enc.y, p.y, k));
    ctx.stroke();
  }
  // 面
  for (const b of boxes) {
    const pts = b.corners.map((c) => project(c, cam));
    if (pts.some((p) => !p)) continue;
    const rgb = hexToRgb(b.color);
    const faces = BOX_FACES.map((f) => ({ f, z: f.reduce((a, i) => a + pts[i]!.z, 0) / 4 })).sort((a, b2) => b2.z - a.z);
    for (const { f } of faces) {
      ctx.beginPath();
      f.forEach((idx, j) => {
        const p = pts[idx]!;
        if (j === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fillStyle = `rgba(${rgb},${0.07 * b.alpha * appear})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${rgb},${0.85 * b.alpha * appear})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = "source-over";
};

const TowerLabels: React.FC<{ t: number }> = ({ t }) => {
  if (t < T_TOWER + 0.6) return null;
  const cam = camAt(t);
  const gpt = prog(t, T_GPT, 0.6);
  const labels = [
    { p: [-TX, -6 * GAP - 40, 0] as V3, text: "编码器", en: "Encoder", color: C.cyan, a: prog(t, T_TOWER + 1.0, 0.4) * (1 - 0.75 * gpt) },
    { p: [TX, -6 * GAP - 40, 0] as V3, text: "解码器", en: "Decoder", color: "#C9A8FF", a: prog(t, T_TOWER + 1.1, 0.4) * (1 - gpt) },
    { p: [-TX - BW / 2 - 110, -2.5 * GAP, 0] as V3, text: "× 6", en: "", color: C.white, a: prog(t, T_TOWER + 1.3, 0.4) * (1 - gpt) },
  ];
  return (
    <>
      {labels.map((l, i) => {
        const p = project(l.p, cam);
        if (!p || l.a <= 0) return null;
        return (
          <div key={i} style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%, -100%)", textAlign: "center", opacity: l.a, whiteSpace: "nowrap" }}>
            <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 52, color: l.color, textShadow: glow(l.color, 0.4) }}>{l.text}</div>
            {l.en ? <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 28, color: l.color }}>{l.en}</div> : null}
          </div>
        );
      })}
    </>
  );
};

export const Transformer: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill>
      <Backdrop hue="mixed" intensity={0.9} />
      <Header t={t} at={0.05} until={T_POS - 0.15} title="多头注意力" en="Multi-Head Attention" note="8 个头，同时从不同角度理解（示意）" />
      <Header t={t} at={T_POS} until={T_BLOCK - 0.2} title="位置编码" en="Positional Encoding" note="用正弦波，给每个词盖上“第几个”的印记" />
      <Header t={t} at={T_BLOCK + 0.05} until={T_TOWER - 0.2} title="一个 Transformer 积木块" en="Transformer Block" />
      <CanvasLayer draw={(ctx) => drawHeads(ctx, t)} />
      <CanvasLayer draw={(ctx) => drawWaves(ctx, t)} />
      <Chips t={t} />
      <Block t={t} />
      <CanvasLayer draw={(ctx) => drawTowers(ctx, t)} />
      <TowerLabels t={t} />
      <Caption lines={["原论文：6 块堆成一座塔，", "左右[两座塔]"]} at={T_TOWER + 1.0} until={T_GPT - 0.15} y={1420} size={64} />
      <Caption
        lines={["后来的 GPT 只用了[右边这座塔]，", "然后把它[堆得更高]"]}
        sub="GPT-3：96 层"
        at={T_GPT + 0.25}
        y={1400}
        size={60}
        hiColor="#C9A8FF"
      />
      <Flash at={T_TOWER} peak={0.35} dur={0.2} color="#BFF4FF" />
    </AbsoluteFill>
  );
};
