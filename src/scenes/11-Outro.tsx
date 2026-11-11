import React from "react";
import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { CanvasLayer, drawGlow, hexToRgb } from "../components/CanvasLayer";
import { useT } from "../components/SceneShell";
import { Ease, lerp, prog, rnd } from "../lib/anim";
import { C, MONO, SANS, glow } from "../theme";

/**
 * 收尾（设计时长 8 秒）
 * A 0–5s  一棵发光的家族树从 Transformer 生长出来，枝叶铺满屏幕
 * B 5–8s  全部暗下，只留一行字 "Attention is all you need."，停留 2 秒后淡出
 */
/** 震撼段（设计秒）：调整时长时保持原速（结尾的停留严格保持 2 秒） */
export const KEEP: [number, number][] = [[5.0, 8.0]];
export const DESIGN = 8;

const T_DARK = 5.0;
const T_LINE = 5.5;
const T_FADE = 7.6;

type Node = { id: string; name: string; year: string; x: number; y: number; parent?: string; color: string; hub?: boolean };
const ROOT = { x: 540, y: 1330 };
// 先按架构分成三根主枝（hub），模型从各自的主枝上长出；
// 只有真实的传承关系才连在一起：GPT → GPT-2 → GPT-3 → ChatGPT → GPT-4，GPT-3 → DALL·E，ViT → CLIP
const NODES: Node[] = [
  { id: "hEnc", name: "只用编码器", year: "", x: 220, y: 1160, parent: "root", color: C.cyan, hub: true },
  { id: "hDec", name: "只用解码器", year: "", x: 540, y: 1140, parent: "root", color: C.violet, hub: true },
  { id: "hEd", name: "编码器 + 解码器", year: "", x: 860, y: 1160, parent: "root", color: C.green, hub: true },
  // 只用编码器
  { id: "bert", name: "BERT", year: "2018", x: 150, y: 990, parent: "hEnc", color: C.cyan },
  { id: "vit", name: "ViT", year: "2020", x: 330, y: 880, parent: "hEnc", color: C.cyan },
  { id: "clip", name: "CLIP", year: "2021", x: 190, y: 730, parent: "vit", color: C.cyan },
  // 编码器 + 解码器
  { id: "t5", name: "T5", year: "2019", x: 910, y: 990, parent: "hEd", color: C.green },
  { id: "whisper", name: "Whisper", year: "2022", x: 860, y: 810, parent: "hEd", color: C.green },
  // 只用解码器
  { id: "gpt", name: "GPT", year: "2018", x: 560, y: 1010, parent: "hDec", color: C.violet },
  { id: "gpt2", name: "GPT-2", year: "2019", x: 700, y: 890, parent: "gpt", color: C.violet },
  { id: "gpt3", name: "GPT-3", year: "2020", x: 560, y: 770, parent: "gpt2", color: C.violet },
  { id: "dalle", name: "DALL·E", year: "2021", x: 390, y: 630, parent: "gpt3", color: C.magenta },
  { id: "chatgpt", name: "ChatGPT", year: "2022", x: 720, y: 620, parent: "gpt3", color: C.gold },
  { id: "gpt4", name: "GPT-4", year: "2023", x: 580, y: 470, parent: "chatgpt", color: C.gold },
  { id: "llama", name: "LLaMA", year: "2023", x: 890, y: 560, parent: "hDec", color: C.magenta },
  { id: "gemini", name: "Gemini", year: "2023", x: 360, y: 440, parent: "hDec", color: C.magenta },
];
const pos = (id: string) => (id === "root" ? ROOT : NODES.find((n) => n.id === id)!);
const depth = (n: Node): number => (n.parent === "root" ? 0 : 1 + depth(NODES.find((m) => m.id === n.parent)!));
const growAt = (n: Node) => 0.35 + depth(n) * 0.5 + rnd(`ga${n.id}`) * 0.15;

const LEAF_NODES = NODES.filter((n) => !n.hub);

const curve = (ax: number, ay: number, bx: number, by: number) => {
  const mx = (ax + bx) / 2;
  return { c1: [ax, lerp(ay, by, 0.55)], c2: [mx + (bx - mx) * 0.6, by + 40], b: [bx, by] };
};

const drawTree = (ctx: CanvasRenderingContext2D, t: number) => {
  const dark = 1 - prog(t, T_DARK, 0.6, Ease.inQuad);
  if (dark <= 0) return;
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  // 树枝
  for (const n of NODES) {
    const p = pos(n.parent!);
    const k = prog(t, growAt(n) - 0.35, 0.45, Ease.inOutCubic);
    if (k <= 0) continue;
    const { c1, c2, b } = curve(p.x, p.y, n.x, n.y);
    const rgb = hexToRgb(n.color);
    const steps = 40;
    for (const [w, a] of [
      [16, 0.12],
      [6, 0.5],
      [2.5, 0.95],
    ] as const) {
      ctx.strokeStyle = `rgba(${rgb},${a * dark})`;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (let s = 0; s <= steps * k; s++) {
        const u = s / steps;
        const x = (1 - u) ** 3 * p.x + 3 * (1 - u) ** 2 * u * c1[0] + 3 * (1 - u) * u * u * c2[0] + u ** 3 * b[0];
        const y = (1 - u) ** 3 * p.y + 3 * (1 - u) ** 2 * u * c1[1] + 3 * (1 - u) * u * u * c2[1] + u ** 3 * b[1];
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // 沿枝流动的光点
    if (k >= 1) {
      const u = (t * 0.7 + rnd(`fl${n.id}`)) % 1;
      const x = (1 - u) ** 3 * p.x + 3 * (1 - u) ** 2 * u * c1[0] + 3 * (1 - u) * u * u * c2[0] + u ** 3 * b[0];
      const y = (1 - u) ** 3 * p.y + 3 * (1 - u) ** 2 * u * c1[1] + 3 * (1 - u) * u * u * c2[1] + u ** 3 * b[1];
      drawGlow(ctx, "255,255,255", x, y, 12, 0.8 * dark);
    }
  }
  // 树叶：越来越多的光点铺满屏幕
  const leafK = prog(t, 0.8, 3.8, Ease.inQuad);
  const nLeaves = Math.floor(leafK * 520);
  for (let i = 0; i < nLeaves; i++) {
    const n = LEAF_NODES[i % LEAF_NODES.length];
    const ang = rnd(`la${i}`) * Math.PI * 2;
    const r = 30 + Math.pow(rnd(`lr${i}`), 0.6) * 260;
    const x = n.x + Math.cos(ang) * r;
    const y = n.y + Math.sin(ang) * r * 0.8 - 30;
    const tw = 0.6 + 0.4 * Math.sin(t * 3 + i);
    const appear = prog(t, 0.8 + (i / 520) * 3.8, 0.4);
    drawGlow(ctx, hexToRgb(n.color), x, y, 6 + rnd(`ls${i}`) * 12, appear * tw * 0.7 * dark);
  }
  // 根
  drawGlow(ctx, "255,255,255", ROOT.x, ROOT.y, 90 * prog(t, 0, 0.4), dark);
  drawGlow(ctx, "61,224,255", ROOT.x, ROOT.y, 220 * prog(t, 0, 0.4), 0.6 * dark);
  ctx.globalCompositeOperation = "source-over";
};

const Labels: React.FC<{ t: number }> = ({ t }) => {
  const dark = 1 - prog(t, T_DARK, 0.6, Ease.inQuad);
  if (dark <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: dark }}>
      <div style={{ position: "absolute", left: ROOT.x, top: ROOT.y + 60, transform: "translateX(-50%)", textAlign: "center", whiteSpace: "nowrap", opacity: prog(t, 0.1, 0.3) }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 64, color: C.white, textShadow: glow(C.cyan, 0.6) }}>Transformer</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 32, color: C.cyan }}>2017</div>
      </div>
      {NODES.map((n) => {
        const k = prog(t, growAt(n), 0.35, Ease.outBack);
        if (k <= 0) return null;
        if (n.hub)
          return (
            <div key={n.id} style={{ position: "absolute", left: n.x, top: n.y + 18, transform: `translateX(-50%) scale(${k})`, fontFamily: SANS, fontWeight: 900, fontSize: 24, color: n.color, whiteSpace: "nowrap", textShadow: "0 0 8px #000, 0 0 16px #000" }}>
              {n.name}
            </div>
          );
        return (
          <div
            key={n.id}
            style={{
              position: "absolute",
              left: n.x,
              top: n.y,
              transform: `translate(-50%, -50%) scale(${k})`,
              textAlign: "center",
              whiteSpace: "nowrap",
              padding: "6px 18px",
              borderRadius: 18,
              border: `2.5px solid ${n.color}`,
              background: "rgba(8,10,22,0.85)",
              boxShadow: `0 0 24px rgba(${hexToRgb(n.color)},0.55)`,
            }}
          >
            <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 40, color: C.white, lineHeight: 1.15 }}>{n.name}</div>
            <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 22, color: n.color }}>{n.year}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", top: 260, left: 0, right: 0, textAlign: "center", fontFamily: SANS, fontWeight: 900, fontSize: 46, color: C.white, opacity: prog(t, 2.6, 0.4) }}>
        它们，都长在同一棵树上
      </div>
    </AbsoluteFill>
  );
};

const FinalLine: React.FC<{ t: number }> = ({ t }) => {
  if (t < T_LINE) return null;
  const text = "Attention is all you need.";
  const chars = Array.from(text);
  const fadeOut = prog(t, T_FADE, 0.4, Ease.inQuad);
  return (
    <div style={{ position: "absolute", top: 900, left: 0, right: 0, textAlign: "center", opacity: 1 - fadeOut }}>
      <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 74, color: C.white, letterSpacing: 1, textShadow: "0 0 18px rgba(170,220,255,0.8), 0 0 60px rgba(61,224,255,0.45)" }}>
        {chars.map((ch, i) => {
          const k = prog(t, T_LINE + i * 0.035, 0.45, Ease.outCubic);
          return (
            <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: k, filter: k < 1 ? `blur(${(1 - k) * 10}px)` : undefined, transform: `translateY(${(1 - k) * 14}px)` }}>
              {ch}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const Outro: React.FC = () => {
  const t = useT();
  const bg = 1 - prog(t, T_DARK, 0.6);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ opacity: bg }}>
        <Backdrop hue="mixed" intensity={0.9} />
      </AbsoluteFill>
      <CanvasLayer draw={(ctx) => drawTree(ctx, t)} />
      <Labels t={t} />
      <FinalLine t={t} />
    </AbsoluteFill>
  );
};
