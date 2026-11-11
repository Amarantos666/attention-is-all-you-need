import React from "react";
import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { useT } from "../components/SceneShell";
import { Caption, Flash, Slam } from "../components/Text";
import { Ease, lerp, prog, rnd } from "../lib/anim";
import { C, MONO, SANS, glow, softGlow } from "../theme";

/**
 * 09 越大越强（设计时长 12 秒）
 * A 0–6s    对数坐标：算力 / 数据量 / 参数量增加，损失沿直线稳定下降（规模定律，Kaplan 等 2020）
 * B 6–10s   参数量对比：原论文 Transformer 约 6500 万 → GPT-3 1750 亿，柱子冲出屏幕
 * C 10–12s  "量变，引起了质变"
 */
/** 震撼段（设计秒）：调整时长时保持原速 */
export const KEEP: [number, number][] = [
  [7.0, 9.6],
  [10.0, 10.6],
];
export const DESIGN = 12;

const T_BARS = 6.0;
const T_QUAL = 10.0;

/* -------------------------------- A：规模定律 -------------------------------- */

const PANELS = [
  { x: "算力", en: "Compute", color: C.cyan, at: 0.6 },
  { x: "数据量", en: "Data", color: C.violet, at: 1.4 },
  { x: "参数量", en: "Parameters", color: C.gold, at: 2.2 },
];
const PW = 820;
const PH = 250;
const PX = 150;
const PY0 = 380;
const PDY = 300;

const Panel: React.FC<{ t: number; i: number }> = ({ t, i }) => {
  const p = PANELS[i];
  const y0 = PY0 + i * PDY;
  const a = prog(t, p.at, 0.35);
  const line = prog(t, p.at + 0.25, 1.0, Ease.inOutCubic);
  const N = 9;
  return (
    <div style={{ position: "absolute", left: PX, top: y0, width: PW, height: PH, opacity: a }}>
      <svg width={PW} height={PH + 60} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {/* 网格：对数坐标，每格 ×10 */}
        {new Array(6).fill(0).map((_, k) => (
          <line key={`v${k}`} x1={(k / 5) * PW} y1={0} x2={(k / 5) * PW} y2={PH} stroke="rgba(140,160,255,0.16)" strokeWidth={2} />
        ))}
        {new Array(4).fill(0).map((_, k) => (
          <line key={`h${k}`} x1={0} y1={(k / 3) * PH} x2={PW} y2={(k / 3) * PH} stroke="rgba(140,160,255,0.16)" strokeWidth={2} />
        ))}
        <line x1={0} y1={PH} x2={PW} y2={PH} stroke="#8FA0D8" strokeWidth={3} />
        <line x1={0} y1={0} x2={0} y2={PH} stroke="#8FA0D8" strokeWidth={3} />
        {/* 趋势直线 */}
        <line
          x1={20}
          y1={30}
          x2={lerp(20, PW - 20, line)}
          y2={lerp(30, PH - 30, line)}
          stroke={p.color}
          strokeWidth={6}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 10px ${p.color})` }}
        />
        {/* 数据点 */}
        {new Array(N).fill(0).map((_, k) => {
          const u = k / (N - 1);
          const show = prog(t, p.at + 0.25 + u * 1.0, 0.2, Ease.outBack);
          const x = lerp(20, PW - 20, u);
          const y = lerp(30, PH - 30, u) + (rnd(`sp${i}-${k}`) - 0.5) * 18;
          return <circle key={k} cx={x} cy={y} r={9 * show} fill="#fff" stroke={p.color} strokeWidth={4} />;
        })}
        <text x={PW} y={PH + 44} textAnchor="end" fontFamily={SANS} fontWeight={900} fontSize={34} fill={p.color}>
          {p.x} →
        </text>
        <text x={PW - 150} y={PH + 44} textAnchor="end" fontFamily={MONO} fontSize={24} fill="rgba(200,210,255,0.6)">
          {p.en}
        </text>
      </svg>
      <div style={{ position: "absolute", left: -110, top: 0, width: 96, textAlign: "right", fontFamily: SANS, fontWeight: 900, fontSize: 30, color: C.dim, lineHeight: 1.2 }}>
        损失
        <br />
        <span style={{ fontFamily: MONO, fontSize: 22 }}>Loss</span>
        <br />↓
      </div>
    </div>
  );
};

const ScalingLaw: React.FC<{ t: number }> = ({ t }) => {
  const out = prog(t, T_BARS - 0.3, 0.4);
  if (out >= 1) return null;
  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `translateY(${-out * 80}px)` }}>
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", opacity: prog(t, 0.1, 0.3) }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 46, color: C.white, textShadow: softGlow() }}>投入越多，错得越少，而且非常有规律</div>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 26, color: C.dim, marginTop: 8 }}>
          对数坐标：每一格 = ×10 · 依据 Kaplan 等人 2020 年的研究 · 示意
        </div>
      </div>
      {PANELS.map((_, i) => (
        <Panel key={i} t={t} i={i} />
      ))}
    </AbsoluteFill>
  );
};

/* -------------------------------- B：参数量柱子 -------------------------------- */

const SMALL = 65e6; // 原论文 base 模型约 6500 万参数
const BIG = 175e9; // GPT-3
const PX_PER = 48 / SMALL; // 6500 万 = 48 像素（线性刻度，真实比例）
const BASE_Y = 1250;
const MARKS = [
  { v: 1e8, label: "1 亿" },
  { v: 1e9, label: "10 亿" },
  { v: 1e10, label: "100 亿" },
  { v: 5e10, label: "500 亿" },
  { v: 1e11, label: "1000 亿" },
  { v: 1.5e11, label: "1500 亿" },
];

const fmtParams = (v: number) => {
  if (v >= 1e8) return `${(v / 1e8).toFixed(v >= 1e10 ? 0 : 1)} 亿`;
  return `${Math.round(v / 1e4)} 万`;
};

const Bars: React.FC<{ t: number }> = ({ t }) => {
  const a = prog(t, T_BARS, 0.4);
  if (a <= 0) return null;
  const grow = prog(t, 7.0, 2.4, Ease.inQuad);
  // 指数增长的数值（看起来越来越快），高度按真实线性比例
  const v = grow <= 0 ? 0 : SMALL * Math.pow(BIG / SMALL, grow);
  const h = v * PX_PER;
  // 镜头跟着柱顶往上走，最后追不上
  const follow = Math.max(0, h - 820);
  const lag = prog(t, 9.0, 0.6, Ease.inCubic);
  const pan = follow * (1 - 0.35 * lag);
  const blur = Math.min(12, (grow > 0 && grow < 1 ? Math.pow(grow, 3) : 0) * 14);
  const fadeOut = prog(t, T_QUAL - 0.1, 0.3);
  return (
    <AbsoluteFill style={{ opacity: a * (1 - fadeOut * 0.85) }}>
      <AbsoluteFill style={{ transform: `translateY(${pan}px)`, filter: blur > 0.5 ? `blur(${blur * 0.25}px)` : undefined }}>
        {/* 刻度线 */}
        {MARKS.map((m) => {
          const y = BASE_Y - m.v * PX_PER;
          return (
            <div key={m.label} style={{ position: "absolute", left: 60, right: 60, top: y, height: 2, background: "rgba(160,180,255,0.35)" }}>
              <div style={{ position: "absolute", left: 0, top: -40, fontFamily: SANS, fontWeight: 900, fontSize: 32, color: "rgba(200,210,255,0.85)" }}>{m.label}</div>
            </div>
          );
        })}
        {/* 小柱：原论文 */}
        <div style={{ position: "absolute", left: 200, top: BASE_Y - SMALL * PX_PER, width: 200, height: SMALL * PX_PER, borderRadius: "10px 10px 0 0", background: `linear-gradient(180deg, ${C.cyan}, rgba(61,224,255,0.3))`, boxShadow: `0 0 30px rgba(61,224,255,0.6)` }} />
        <div style={{ position: "absolute", left: 300, top: BASE_Y + 20, transform: "translateX(-50%)", textAlign: "center", whiteSpace: "nowrap" }}>
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 34, color: C.cyan }}>原论文 Transformer</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 30, color: C.white }}>约 6500 万</div>
        </div>
        {/* 大柱：GPT-3 */}
        <div
          style={{
            position: "absolute",
            left: 640,
            top: BASE_Y - h,
            width: 220,
            height: h,
            borderRadius: "12px 12px 0 0",
            background: `linear-gradient(180deg, #FFFFFF, ${C.gold} 6%, rgba(255,201,77,0.35))`,
            boxShadow: `0 0 50px rgba(255,201,77,0.7)`,
          }}
        />
        <div style={{ position: "absolute", left: 750, top: BASE_Y + 20, transform: "translateX(-50%)", textAlign: "center", whiteSpace: "nowrap", opacity: prog(t, 6.4, 0.3) }}>
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 34, color: C.gold }}>GPT-3（2020）</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 30, color: C.white }}>1750 亿</div>
        </div>
      </AbsoluteFill>
      {/* 跟随柱顶的读数（固定在屏幕上） */}
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", opacity: prog(t, 7.0, 0.3) }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 40, color: C.white }}>参数量</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 96, color: C.gold, textShadow: glow(C.gold, 0.7) }}>{fmtParams(v)}</div>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 44, color: C.cyan, opacity: prog(t, 9.5, 0.3), marginTop: 6 }}>
          ≈ 2700 倍
        </div>
      </div>
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: SANS, fontWeight: 500, fontSize: 26, color: C.dim, opacity: prog(t, T_BARS + 0.2, 0.3) * (1 - prog(t, 7.0, 0.2)) }}>
        真实比例：每根柱子的高度 = 参数量
      </div>
    </AbsoluteFill>
  );
};

export const Scaling: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill>
      <Backdrop hue="blue" intensity={0.9} />
      <ScalingLaw t={t} />
      <Bars t={t} />
      <Caption lines={["[规模定律]"]} sub="Scaling Law" at={3.5} until={T_BARS - 0.3} y={1430} size={84} />
      {t >= T_QUAL ? (
        <Slam at={T_QUAL + 0.05} from={3} style={{ position: "absolute", top: 820, left: 0, right: 0, textAlign: "center" }}>
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 120, color: C.white, lineHeight: 1.25, textShadow: `0 0 30px rgba(255,201,77,0.6), 0 0 80px rgba(155,92,255,0.5)` }}>
            量变，
            <br />
            引起了<span style={{ color: C.gold, textShadow: glow(C.gold, 0.9) }}>质变</span>
          </div>
        </Slam>
      ) : null}
      <Flash at={T_QUAL + 0.05} peak={0.6} dur={0.25} color="#FFE3A3" />
    </AbsoluteFill>
  );
};
