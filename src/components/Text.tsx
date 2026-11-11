import React from "react";
import { C, MONO, SANS, glow, softGlow } from "../theme";
import { clamp, Ease, prog, rnd } from "../lib/anim";
import { useT } from "./SceneShell";

/**
 * 简单的高亮标记：方括号里的内容会高亮，例如 "一个神经元 = [乘法] + [加法]"
 */
const parseMarks = (line: string) => {
  const out: { ch: string; hi: boolean }[] = [];
  let hi = false;
  for (const ch of Array.from(line)) {
    if (ch === "[") {
      hi = true;
      continue;
    }
    if (ch === "]") {
      hi = false;
      continue;
    }
    out.push({ ch, hi });
  }
  return out;
};

/**
 * 大字幕：逐字上浮 + 去模糊入场，淡出离场。
 * 方括号里的字高亮。sub 为英文术语小字。
 */
export const Caption: React.FC<{
  lines: string[];
  sub?: string;
  at: number;
  until?: number;
  y?: number;
  size?: number;
  color?: string;
  hiColor?: string;
  stagger?: number;
  plate?: boolean;
}> = ({ lines, sub, at, until = Infinity, y = 1340, size = 74, color = C.white, hiColor = C.cyan, stagger = 0.028, plate = true }) => {
  const t = useT();
  if (t < at - 0.01 || t > until + 0.4) return null;
  const out = prog(t, until, 0.3, Ease.inQuad);
  let idx = 0;
  const parsed = lines.map(parseMarks);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: 1 - out,
        filter: out > 0 ? `blur(${out * 10}px)` : undefined,
      }}
    >
      {plate ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: -60,
            bottom: -60,
            background: "linear-gradient(180deg, rgba(5,6,10,0) 0%, rgba(5,6,10,0.6) 30%, rgba(5,6,10,0.6) 70%, rgba(5,6,10,0) 100%)",
            opacity: prog(t, at, 0.3),
          }}
        />
      ) : null}
      {parsed.map((line, li) => (
        <div
          key={li}
          style={{
            position: "relative",
            fontFamily: SANS,
            fontWeight: 900,
            fontSize: size,
            lineHeight: 1.28,
            color,
            letterSpacing: 2,
            whiteSpace: "nowrap",
            textShadow: softGlow(),
          }}
        >
          {line.map(({ ch, hi }, i) => {
            const k = prog(t, at + idx++ * stagger, 0.35, Ease.outCubic);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  minWidth: ch === " " ? size * 0.3 : undefined,
                  opacity: k,
                  transform: `translateY(${(1 - k) * 30}px) scale(${0.9 + 0.1 * k})`,
                  filter: k < 1 ? `blur(${(1 - k) * 12}px)` : undefined,
                  color: hi ? hiColor : undefined,
                  textShadow: hi ? glow(hiColor, 0.6) : undefined,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      ))}
      {sub ? (
        <div
          style={{
            position: "relative",
            marginTop: 14,
            fontFamily: MONO,
            fontWeight: 500,
            fontSize: Math.round(size * 0.48),
            color: C.cyan,
            letterSpacing: 3,
            opacity: prog(t, at + idx * stagger + 0.1, 0.4),
            textShadow: glow(C.cyan, 0.35),
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
};

/** 逐字打出（带闪烁光标）。未显示的字保留占位，布局不跳动。 */
export const Typewriter: React.FC<{
  text: string;
  at: number;
  cps?: number;
  style?: React.CSSProperties;
  cursor?: boolean;
  cursorUntil?: number;
  cursorColor?: string;
}> = ({ text, at, cps = 12, style, cursor = true, cursorUntil = Infinity, cursorColor = C.cyan }) => {
  const t = useT();
  const chars = Array.from(text);
  const n = clamp(Math.floor((t - at) * cps), 0, chars.length);
  const showCursor = cursor && t >= at - 0.4 && t < cursorUntil && (n < chars.length || Math.floor(t * 2.4) % 2 === 0);
  const cursorEl = (
    <span style={{ position: "relative", display: "inline-block", width: 0 }}>
      <span
        style={{
          position: "absolute",
          left: 4,
          top: "0.12em",
          width: "0.09em",
          height: "0.95em",
          background: cursorColor,
          boxShadow: `0 0 12px ${cursorColor}`,
          opacity: showCursor ? 1 : 0,
        }}
      />
    </span>
  );
  return (
    <span style={{ whiteSpace: "pre", ...style }}>
      {n === 0 ? cursorEl : null}
      {chars.map((ch, i) => (
        <React.Fragment key={i}>
          <span style={{ opacity: i < n ? 1 : 0 }}>{ch}</span>
          {i === n - 1 ? cursorEl : null}
        </React.Fragment>
      ))}
    </span>
  );
};

/** 放大冲击入场：从很大、模糊、透明砸到正常尺寸 */
export const Slam: React.FC<{
  at: number;
  dur?: number;
  from?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at, dur = 0.24, from = 3, children, style }) => {
  const t = useT();
  const k = prog(t, at, dur, Ease.outExpo);
  if (t < at) return null;
  const s = from + (1 - from) * k;
  return (
    <div
      style={{
        ...style,
        opacity: clamp(k * 2.5),
        transform: `${style?.transform ?? ""} scale(${s})`,
        filter: k < 1 ? `blur(${(1 - k) * 18}px)` : undefined,
      }}
    >
      {children}
    </div>
  );
};

const GLYPHS = "01234567890.−+×ΣλθαβΔ∂√≈";

/** 乱码解码：每个字先随机跳动，再定格成正确字符（"碎裂重组"） */
export const Scramble: React.FC<{
  text: string;
  at: number;
  dur?: number;
  reverse?: boolean;
  style?: React.CSSProperties;
  charStyle?: (i: number) => React.CSSProperties;
}> = ({ text, at, dur = 0.6, reverse = false, style, charStyle }) => {
  const t = useT();
  const chars = Array.from(text);
  const f = Math.floor(t * 30);
  return (
    <span style={{ whiteSpace: "pre", ...style }}>
      {chars.map((ch, i) => {
        const local = (t - at) / dur - (i / chars.length) * 0.6;
        const settled = reverse ? local < 0 : local > 0.4;
        const visible = reverse ? local < 1 : local > 0;
        const g = GLYPHS[Math.floor(rnd(`sc${i}-${f}`) * GLYPHS.length)];
        return (
          <span
            key={i}
            style={{ display: "inline-block", opacity: visible ? 1 : 0, visibility: visible ? "visible" : "hidden", ...(charStyle ? charStyle(i) : {}) }}
          >
            {ch === " " ? " " : settled ? ch : g}
          </span>
        );
      })}
    </span>
  );
};

/** 白闪（转场 / 冲击） */
export const Flash: React.FC<{ at: number; dur?: number; peak?: number; color?: string }> = ({
  at,
  dur = 0.2,
  peak = 0.8,
  color = "#FFFFFF",
}) => {
  const t = useT();
  if (t < at || t > at + dur) return null;
  const a = peak * Math.pow(1 - (t - at) / dur, 2);
  return <div style={{ position: "absolute", inset: 0, background: color, opacity: a, mixBlendMode: "screen" }} />;
};

/**
 * 全息投影：扫描线 + 色散 + 入场闪烁 + 一条亮扫描带。
 */
export const Holo: React.FC<{
  at: number;
  color?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  tilt?: number;
  until?: number;
}> = ({ at, color = C.cyan, children, style, tilt = 0, until = Infinity }) => {
  const t = useT();
  if (t < at) return null;
  const local = t - at;
  const flickerSeq = [0, 0.9, 0.2, 1, 0.5, 1];
  const fi = Math.floor(local / 0.04);
  const flick = fi < flickerSeq.length ? flickerSeq[fi] : 0.93 + 0.07 * Math.sin(t * 40);
  const out = prog(t, until, 0.3, Ease.inQuad);
  const scan = prog(t, at, 0.5, Ease.inOutCubic);
  const jitter = local < 0.3 ? (rnd(`hj${Math.floor(t * 60)}`) - 0.5) * 10 : 0;
  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        opacity: flick * (1 - out),
        transform: `perspective(900px) rotateX(${tilt}deg) translateX(${jitter}px)`,
        ...style,
      }}
    >
      <div
        style={{
          color,
          textShadow: `-2px 0 rgba(255,40,120,0.55), 2px 0 rgba(40,255,255,0.55), ${glow(color, 0.55)}`,
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          inset: -6,
          background: "repeating-linear-gradient(180deg, rgba(5,6,10,0) 0px, rgba(5,6,10,0) 3px, rgba(5,6,10,0.35) 3px, rgba(5,6,10,0.35) 5px)",
          pointerEvents: "none",
        }}
      />
      {scan > 0 && scan < 1 ? (
        <div
          style={{
            position: "absolute",
            left: -20,
            right: -20,
            top: `${scan * 100}%`,
            height: 6,
            background: color,
            boxShadow: `0 0 20px ${color}, 0 0 50px ${color}`,
            opacity: 0.9,
          }}
        />
      ) : null}
    </div>
  );
};
