import React from "react";
import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { useT } from "../components/SceneShell";
import { Flash, Holo, Typewriter } from "../components/Text";
import { clamp, Ease, lerp, prog } from "../lib/anim";
import { C, MONO, SANS, glow, softGlow } from "../theme";
import { hexToRgb } from "../components/CanvasLayer";

/**
 * 05 核心公式（设计时长 10 秒）
 * A 0–3.4s  图书馆类比：Query = 你想找什么，Key = 书脊标签，Value = 书的内容
 * B 3.4–10s 公式全息启动，逐项亮起并配解释
 */
/** 震撼段（设计秒）：调整时长时保持原速 */
export const KEEP: [number, number][] = [[3.35, 4.1]];
export const DESIGN = 10;

const T_FORMULA = 3.45;
const T_ITEMS = [4.4, 5.7, 7.0, 8.3];

/* -------------------------------- A：图书馆 -------------------------------- */

const BOOKS = [
  { key: "猫", color: "#FFC94D", score: 0.92 },
  { key: "历史", color: "#5C7BFF", score: 0.08 },
  { key: "宇宙", color: "#9B5CFF", score: 0.05 },
  { key: "狗", color: "#4DFFB0", score: 0.71 },
  { key: "做菜", color: "#FF7A3D", score: 0.1 },
  { key: "音乐", color: "#FF3DCB", score: 0.12 },
];
const SHELF_X0 = 120;
const SPINE_W = 118;
const SPINE_GAP = 20;
const SHELF_TOP = 430;
const SHELF_H = 330;
const spineX = (i: number) => SHELF_X0 + i * (SPINE_W + SPINE_GAP);

const Library: React.FC<{ t: number }> = ({ t }) => {
  const out = prog(t, T_FORMULA - 0.15, 0.45, Ease.inCubic);
  if (out >= 1) return null;
  const scan = prog(t, 1.2, 0.8, Ease.inOutCubic);
  const beamX = lerp(spineX(0), spineX(BOOKS.length - 1) + SPINE_W, scan);
  const pull = prog(t, 2.25, 0.4, Ease.outCubic);
  const open = prog(t, 2.55, 0.45, Ease.outBack);
  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `translateY(${-out * 200}px) scale(${1 - out * 0.2})`, filter: out > 0 ? `blur(${out * 10}px)` : undefined }}>
      <div style={{ position: "absolute", top: 260, left: 0, right: 0, textAlign: "center", fontFamily: SANS, fontWeight: 900, fontSize: 50, color: C.white, opacity: prog(t, 0, 0.3), textShadow: softGlow() }}>
        先打个比方：<span style={{ color: C.gold }}>去图书馆找书</span>
      </div>
      {/* 书架 */}
      <div style={{ position: "absolute", left: 80, right: 80, top: SHELF_TOP + SHELF_H + 6, height: 14, borderRadius: 4, background: "linear-gradient(90deg, #2A2F55, #4A3F7A, #2A2F55)", opacity: prog(t, 0.1, 0.3) }} />
      {BOOKS.map((b, i) => {
        const appear = prog(t, 0.15 + i * 0.06, 0.35, Ease.outBack);
        const isCat = i === 0;
        const hit = scan > 0 && beamX > spineX(i) + SPINE_W / 2;
        const lit = hit ? b.score : 0;
        const py = isCat ? -pull * 120 : 0;
        const h = SHELF_H - (i % 3) * 30;
        return (
          <div key={i}>
            <div
              style={{
                position: "absolute",
                left: spineX(i),
                top: SHELF_TOP + SHELF_H - h + py,
                width: SPINE_W,
                height: h,
                borderRadius: 10,
                background: `linear-gradient(90deg, rgba(${hexToRgb(b.color)},0.35), rgba(${hexToRgb(b.color)},0.7), rgba(${hexToRgb(b.color)},0.35))`,
                border: `3px solid ${b.color}`,
                boxShadow: `0 0 ${10 + lit * 50}px rgba(${hexToRgb(b.color)},${0.3 + lit * 0.7})`,
                transform: `scaleY(${appear})`,
                transformOrigin: "bottom",
                opacity: isCat ? 1 - clamp(open * 1.6) : 1 - 0.75 * prog(t, 2.25, 0.3),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                writingMode: "vertical-rl",
                fontFamily: SANS,
                fontWeight: 900,
                fontSize: 50,
                color: "#fff",
                textShadow: "0 2px 6px rgba(0,0,0,0.6)",
              }}
            >
              {b.key}
            </div>
            {/* 匹配分数 */}
            <div
              style={{
                position: "absolute",
                left: spineX(i) + SPINE_W / 2,
                top: SHELF_TOP - 60 + (SHELF_H - h),
                transform: `translateX(-50%) scale(${prog(t, 1.25 + i * 0.13, 0.25, Ease.outBack)})`,
                fontFamily: MONO,
                fontWeight: 800,
                fontSize: 34,
                color: b.score > 0.5 ? C.gold : "rgba(200,210,240,0.6)",
                textShadow: b.score > 0.5 ? glow(C.gold, 0.4) : undefined,
                opacity: hit ? 1 - prog(t, 2.25, 0.2) : 0,
              }}
            >
              {b.score.toFixed(2)}
            </div>
          </div>
        );
      })}
      {/* 扫描光束 */}
      {scan > 0 && scan < 1 ? (
        <div style={{ position: "absolute", left: beamX - 4, top: SHELF_TOP - 20, width: 8, height: SHELF_H + 40, background: C.magenta, boxShadow: `0 0 30px ${C.magenta}, 0 0 60px ${C.magenta}`, borderRadius: 4 }} />
      ) : null}
      {/* 查询框 */}
      <div
        style={{
          position: "absolute",
          left: 140,
          right: 140,
          top: 840,
          height: 92,
          borderRadius: 46,
          border: `3px solid ${C.magenta}`,
          background: "rgba(255,61,203,0.1)",
          boxShadow: `0 0 30px rgba(255,61,203,0.4)`,
          display: "flex",
          alignItems: "center",
          paddingLeft: 36,
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 44,
          color: C.white,
          opacity: prog(t, 0.5, 0.3) * (1 - 0.6 * open),
          transform: `scale(${0.9 + 0.1 * prog(t, 0.5, 0.3, Ease.outBack)})`,
        }}
      >
        <svg width={44} height={44} style={{ marginRight: 18 }}>
          <circle cx={18} cy={18} r={13} stroke={C.magenta} strokeWidth={5} fill="none" />
          <line x1={28} y1={28} x2={40} y2={40} stroke={C.magenta} strokeWidth={6} strokeLinecap="round" />
        </svg>
        <Typewriter text="我想了解：宠物" at={0.65} cps={14} cursorColor={C.magenta} cursorUntil={1.3} />
      </div>
      {/* 打开的书（Value） */}
      {open > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 170,
            right: 170,
            top: 470,
            height: 330,
            borderRadius: 18,
            border: `3px solid ${C.gold}`,
            background: "linear-gradient(180deg, rgb(58,44,12), rgb(30,22,6))",
            boxShadow: `0 0 60px rgba(255,201,77,0.55)`,
            transform: `scale(${open})`,
            transformOrigin: `${spineX(0) + SPINE_W / 2 - 170}px 0px`,
            opacity: clamp(open),
            padding: "26px 34px",
            fontFamily: SANS,
            color: "#FFE9B8",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 42, color: C.gold, marginBottom: 14 }}>《猫》</div>
          {["猫是常见的宠物，", "喜欢睡觉，会抓老鼠……"].map((l, i) => (
            <div key={i} style={{ fontWeight: 500, fontSize: 36, lineHeight: 1.6, opacity: prog(t, 2.8 + i * 0.15, 0.25) }}>
              {l}
            </div>
          ))}
        </div>
      ) : null}
      {/* 图例 */}
      {[
        { at: 0.6, k: "Q", name: "Query", text: "你想找什么", color: C.magenta },
        { at: 1.35, k: "K", name: "Key", text: "书脊标签", color: C.cyan },
        { at: 2.55, k: "V", name: "Value", text: "书的内容", color: C.gold },
      ].map((it, i) => {
        const k = prog(t, it.at, 0.35, Ease.outBack);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 120,
              top: 1010 + i * 120,
              display: "flex",
              alignItems: "center",
              opacity: clamp(k),
              transform: `translateX(${(1 - k) * -60}px)`,
            }}
          >
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 20,
                border: `4px solid ${it.color}`,
                background: `rgba(${hexToRgb(it.color)},0.15)`,
                boxShadow: `0 0 24px rgba(${hexToRgb(it.color)},0.5)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontWeight: 800,
                fontSize: 50,
                color: it.color,
              }}
            >
              {it.k}
            </div>
            <div style={{ marginLeft: 26, fontFamily: MONO, fontWeight: 800, fontSize: 40, color: it.color, width: 150 }}>{it.name}</div>
            <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 46, color: C.white }}>= {it.text}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* -------------------------------- B：公式 -------------------------------- */

type Term = { text: string; group: number };
const LINE2: Term[] = [
  { text: "softmax(", group: 2 },
  { text: " QKᵀ", group: 0 },
  { text: " / √dₖ", group: 1 },
  { text: " )", group: 2 },
  { text: " V", group: 3 },
];
const GROUP_COLOR = [C.magenta, C.cyan, C.violet, C.gold];

const ITEMS = [
  { term: "QKᵀ", lines: ["拿问题去和每个标签比，", "打分"], note: "" },
  { term: "÷ √dₖ", lines: ["把分数缩小，防止数值过大", "导致训练不稳定"], note: "原论文 dₖ = 64，所以就是 ÷ 8" },
  { term: "softmax", lines: ["把分数变成", "加起来等于 100% 的权重"], note: "" },
  { term: "× V", lines: ["按权重，", "混合内容"], note: "" },
];

const activeGroup = (t: number) => {
  let g = -1;
  T_ITEMS.forEach((at, i) => {
    if (t >= at) g = i;
  });
  return g;
};

const Formula: React.FC<{ t: number }> = ({ t }) => {
  if (t < T_FORMULA) return null;
  const g = activeGroup(t);
  const allLit = prog(t, 9.3, 0.4);
  return (
    <AbsoluteFill>
      {/* 投影光锥 */}
      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          top: 300,
          height: 360,
          background: "radial-gradient(ellipse 60% 70% at 50% 100%, rgba(61,224,255,0.18), rgba(61,224,255,0) 70%)",
          opacity: prog(t, T_FORMULA, 0.5),
        }}
      />
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 56 }}>
        <Holo at={T_FORMULA} color="#CFE9FF" tilt={8}>
          Attention(Q, K, V) =
        </Holo>
      </div>
      <div style={{ position: "absolute", top: 400, left: 0, right: 0, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 66 }}>
        <Holo at={T_FORMULA + 0.15} color="#CFE9FF" tilt={8}>
          {LINE2.map((term, i) => {
            const on = term.group === g || allLit > 0;
            const col = GROUP_COLOR[term.group];
            return (
              <span
                key={i}
                style={{
                  color: on ? col : "#CFE9FF",
                  textShadow: on ? glow(col, 0.8) : undefined,
                  opacity: g >= 0 && !on ? 0.45 : 1,
                  whiteSpace: "pre",
                }}
              >
                {term.text}
              </span>
            );
          })}
        </Holo>
      </div>
      {/* 逐项解释 */}
      {ITEMS.map((it, i) => {
        const k = prog(t, T_ITEMS[i], 0.35, Ease.outCubic);
        if (k <= 0) return null;
        const active = g === i;
        const col = GROUP_COLOR[i];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 70,
              right: 70,
              top: 640 + i * 190,
              display: "flex",
              alignItems: "flex-start",
              opacity: k * (active || allLit > 0 ? 1 : 0.5),
              transform: `translateY(${(1 - k) * 40}px)`,
            }}
          >
            <div
              style={{
                flex: "0 0 230px",
                height: 92,
                borderRadius: 18,
                border: `3px solid ${col}`,
                background: `rgba(${hexToRgb(col)},${active ? 0.2 : 0.08})`,
                boxShadow: active ? `0 0 30px rgba(${hexToRgb(col)},0.6)` : undefined,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontWeight: 800,
                fontSize: 44,
                color: col,
              }}
            >
              {it.term}
            </div>
            <div style={{ marginLeft: 30, paddingTop: 2 }}>
              {it.lines.map((l, li) => (
                <div key={li} style={{ fontFamily: SANS, fontWeight: 900, fontSize: 42, lineHeight: 1.3, color: C.white, whiteSpace: "nowrap" }}>
                  {l}
                </div>
              ))}
              {it.note ? <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: C.cyan, marginTop: 6 }}>{it.note}</div> : null}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Formula05: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill>
      <Backdrop hue="blue" intensity={0.9} />
      <Library t={t} />
      <Formula t={t} />
      <Flash at={T_FORMULA} peak={0.4} dur={0.2} color="#BFF4FF" />
      <Flash at={9.3} peak={0.25} dur={0.25} color="#BFF4FF" />
    </AbsoluteFill>
  );
};
