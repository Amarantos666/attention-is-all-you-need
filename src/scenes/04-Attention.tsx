import React from "react";
import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { CanvasLayer, drawGlow, hexToRgb } from "../components/CanvasLayer";
import { useT } from "../components/SceneShell";
import { Caption, Flash } from "../components/Text";
import { clamp, Ease, lerp, prog, rnd } from "../lib/anim";
import { C, MONO, SANS, glow, softGlow } from "../theme";

/**
 * 04 注意力（设计时长 15 秒）
 * A 0–2.15s   例句 + "it 指的是谁？"
 * B 2.15–3.4s 所有词同时亮起（并行计算）
 * C 3.4–6.8s  it 与每个词做点积打分："方向越接近，分数越高"
 * D 6.8–9.8s  softmax 变成百分比（数值为示意）
 * E 9.8–12.4s it 按比例吸收信息，颜色变成 animal 的颜色
 * F 12.4–15s  回到句子："它读懂了上下文"
 */
/** 震撼段（设计秒）：调整时长时保持原速 */
export const KEEP: [number, number][] = [
  [2.15, 2.8],
  [10.2, 11.6],
];
export const DESIGN = 15;

const T_PAR = 2.2;
const T_LIST = 3.4;
const T_SCORE = 4.2;
const T_SOFT = 6.9;
const T_ABSORB = 9.9;
const T_BACK = 12.4;

// —— 例句与示意分数（softmax 由分数真实计算）——
const WORDS = ["The", "animal", "didn't", "cross", "the", "street", "because", "it", "was", "too", "tired"];
const IT = 7;
const SCORES = [0.2, 4.1, 0.5, 1.0, 0.3, 2.6, 0.4, 1.5, 0.8, 0.3, 2.0];
const EXP = SCORES.map((s) => Math.exp(s));
const SUM = EXP.reduce((a, b) => a + b, 0);
const PCT = EXP.map((e) => (e / SUM) * 100);
const WCOLOR: Record<number, string> = { 1: C.gold, 5: C.cyan, 10: C.green };
const colorOf = (i: number) => WCOLOR[i] ?? "#8C95C8";

// —— 句子布局（用 canvas 量字宽，保证位置精确）——
const FS = 58;
const PADX = 22;
const GAPX = 18;
const ROWS = [
  [0, 1, 2, 3],
  [4, 5, 6],
  [7, 8, 9, 10],
];
const ROW_Y = [600, 720, 840];
let measurer: CanvasRenderingContext2D | null = null;
const textW = (s: string, size: number) => {
  if (!measurer) measurer = document.createElement("canvas").getContext("2d");
  measurer!.font = `900 ${size}px "Noto Sans SC"`;
  return measurer!.measureText(s).width;
};
type Box = { x: number; y: number; w: number };
const sentenceLayout = (): Box[] => {
  const boxes: Box[] = new Array(WORDS.length);
  ROWS.forEach((row, ri) => {
    const ws = row.map((i) => textW(WORDS[i], FS) + PADX * 2);
    const total = ws.reduce((a, b) => a + b, 0) + GAPX * (row.length - 1);
    let x = 540 - total / 2;
    row.forEach((i, k) => {
      boxes[i] = { x: x + ws[k] / 2, y: ROW_Y[ri], w: ws[k] };
      x += ws[k] + GAPX;
    });
  });
  return boxes;
};
// 竖排列表
const LIST_X = 200;
const LIST_Y0 = 380;
const LIST_DY = 84;
const listPos = (i: number) => ({ x: LIST_X, y: LIST_Y0 + i * LIST_DY });
const BAR_X = 380;
const BAR_MAX = 470;
// it 的"查询"光球
const ORB = { x: 880, y: 640 };

const fmtPct = (p: number) => (p >= 10 ? p.toFixed(0) : p.toFixed(1)) + "%";

/* -------------------------------- 词块 -------------------------------- */

const Chips: React.FC<{ t: number; boxes: Box[] }> = ({ t, boxes }) => {
  const toList = prog(t, T_LIST, 0.7, Ease.inOutCubic);
  const back = prog(t, T_BACK, 0.7, Ease.inOutCubic);
  const lit = prog(t, T_PAR, 0.12, Ease.outCubic);
  const litFade = 1 - 0.6 * prog(t, T_PAR + 0.5, 0.6);
  const itAbsorb = prog(t, T_ABSORB + 0.6, 1.5, Ease.inOutCubic);
  return (
    <>
      {WORDS.map((w, i) => {
        const sp = boxes[i];
        const lp = listPos(i);
        const k = toList * (1 - back);
        const x = lerp(sp.x, lp.x, k);
        const y = lerp(sp.y, lp.y, k);
        const appear = prog(t, 0.1 + i * 0.06, 0.3, Ease.outBack);
        const isIt = i === IT;
        const itPulse = isIt ? prog(t, 1.0, 0.3) * (1 - prog(t, T_PAR, 0.3)) : 0;
        const color = isIt ? (itAbsorb > 0.5 && t > T_ABSORB ? C.gold : C.magenta) : colorOf(i);
        const parallelGlow = lit * litFade;
        // 回到句子后：it 与 animal 高亮，其余变暗
        const finalDim = back > 0 && !isIt && i !== 1 ? 1 - 0.55 * back : 1;
        const softDim = t > T_SOFT && t < T_BACK ? 0.55 + 0.45 * clamp(PCT[i] / 15) : 1;
        const border = isIt || (back > 0 && i === 1) ? color : parallelGlow > 0.05 ? C.cyan : "rgba(255,255,255,0.22)";
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${appear * lerp(1, 0.8, k) * (1 + 0.12 * itPulse * Math.sin(t * 20) + 0.06 * parallelGlow * (1 - litFade))})`,
              opacity: clamp(appear) * finalDim * softDim,
              padding: `4px ${PADX - 3}px 8px`,
              borderRadius: 16,
              border: `3px solid ${border}`,
              background: isIt ? `rgba(${hexToRgb(color)},0.18)` : `rgba(${parallelGlow > 0.05 ? "61,224,255" : "20,24,40"},${0.15 + 0.25 * parallelGlow})`,
              boxShadow: isIt || parallelGlow > 0.05 ? `0 0 ${18 + 30 * parallelGlow}px rgba(${hexToRgb(isIt ? color : C.cyan)},${0.4 + 0.4 * parallelGlow})` : undefined,
              fontFamily: SANS,
              fontWeight: 900,
              fontSize: FS,
              color: isIt ? color : i === 1 && back > 0 ? C.gold : C.white,
              whiteSpace: "nowrap",
              textShadow: softGlow(),
            }}
          >
            {w}
          </div>
        );
      })}
    </>
  );
};

/* -------------------------------- 打分光束 / 吸收粒子 -------------------------------- */

const drawBeams = (ctx: CanvasRenderingContext2D, t: number) => {
  const inList = prog(t, T_LIST + 0.5, 0.3) * (1 - prog(t, T_BACK - 0.2, 0.3));
  if (inList <= 0) return;
  ctx.globalCompositeOperation = "lighter";
  // 光束：it → 每个词
  const beamA = prog(t, T_SCORE - 0.2, 0.4) * (1 - 0.6 * prog(t, T_SOFT, 0.5));
  for (let i = 0; i < WORDS.length; i++) {
    const p = listPos(i);
    const k = prog(t, T_SCORE + i * 0.09, 0.35, Ease.outCubic);
    if (k <= 0) continue;
    const sx = ORB.x - 70;
    const sy = ORB.y;
    const ex = lerp(sx, p.x + 110, k);
    const ey = lerp(sy, p.y, k);
    const w = t > T_SOFT ? 1 + PCT[i] * 0.22 : 2.5;
    ctx.strokeStyle = `rgba(255,61,203,${0.55 * beamA * inList})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + ex) / 2, (sy + ey) / 2 - 40, ex, ey);
    ctx.stroke();
    // 沿光束跑动的小光点
    const ph = ((t * 1.4 + i * 0.13) % 1) * k;
    const qx = lerp(lerp(sx, (sx + ex) / 2, ph), lerp((sx + ex) / 2, ex, ph), ph);
    const qy = lerp(lerp(sy, (sy + ey) / 2 - 40, ph), lerp((sy + ey) / 2 - 40, ey, ph), ph);
    drawGlow(ctx, "255,61,203", qx, qy, 10, beamA * inList);
  }
  // 吸收：信息按权重流向 it
  if (t > T_ABSORB) {
    for (let i = 0; i < WORDS.length; i++) {
      const n = Math.round(4 + PCT[i] * 1.6);
      const p = listPos(i);
      const sx = BAR_X + (PCT[i] / PCT[1]) * BAR_MAX;
      const sy = p.y;
      const rgb = hexToRgb(colorOf(i));
      for (let k = 0; k < n; k++) {
        const start = T_ABSORB + 0.1 + rnd(`ab${i}-${k}`) * 1.6;
        const u = prog(t, start, 0.75, Ease.inCubic);
        if (u <= 0 || u >= 1) continue;
        const cx = (sx + ORB.x) / 2 + 60;
        const cy = (sy + ORB.y) / 2 + (rnd(`ac${i}-${k}`) - 0.5) * 160;
        const x = lerp(lerp(sx, cx, u), lerp(cx, ORB.x, u), u);
        const y = lerp(lerp(sy, cy, u), lerp(cy, ORB.y, u), u);
        drawGlow(ctx, rgb, x, y, 9 + PCT[i] * 0.12, Math.sin(u * Math.PI) * inList);
      }
    }
  }
  ctx.globalCompositeOperation = "source-over";
};

/* -------------------------------- it 光球 -------------------------------- */

const Orb: React.FC<{ t: number }> = ({ t }) => {
  const a = prog(t, T_LIST + 0.4, 0.4, Ease.outBack) * (1 - prog(t, T_BACK - 0.1, 0.4));
  if (a <= 0) return null;
  const mix = prog(t, T_ABSORB + 0.6, 1.5, Ease.inOutCubic);
  const rgbA = [255, 61, 203];
  const rgbB = [255, 201, 77];
  const col = rgbA.map((v, i) => Math.round(lerp(v, rgbB[i], mix)));
  const c = `rgb(${col.join(",")})`;
  const pulse = 1 + 0.06 * Math.sin(t * 8) + 0.25 * Math.max(0, Math.sin((t - T_ABSORB) * 6)) * prog(t, T_ABSORB, 0.3) * (1 - mix);
  return (
    <div style={{ position: "absolute", left: ORB.x, top: ORB.y, transform: `translate(-50%, -50%) scale(${a})`, textAlign: "center" }}>
      <div
        style={{
          width: 150,
          height: 150,
          borderRadius: 75,
          border: `5px solid ${c}`,
          background: `radial-gradient(circle, rgba(${col.join(",")},0.5) 0%, rgba(${col.join(",")},0.08) 70%)`,
          boxShadow: `0 0 ${40 * pulse}px ${c}, 0 0 ${90 * pulse}px rgba(${col.join(",")},0.5)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 64,
          color: "#fff",
          transform: `scale(${pulse})`,
        }}
      >
        it
      </div>
      <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 26, color: c, whiteSpace: "nowrap" }}>{mix > 0.5 ? "≈ 吸收了 animal" : "我在找谁？"}</div>
    </div>
  );
};

/* -------------------------------- 分数 / 百分比 -------------------------------- */

const ScoresAndBars: React.FC<{ t: number }> = ({ t }) => {
  const vis = 1 - prog(t, T_BACK - 0.2, 0.3);
  if (t < T_SCORE || vis <= 0) return null;
  const soft = prog(t, T_SOFT + 0.3, 0.8, Ease.inOutCubic);
  return (
    <>
      {WORDS.map((_, i) => {
        const p = listPos(i);
        const k = prog(t, T_SCORE + 0.25 + i * 0.09, 0.3, Ease.outBack);
        const barW = soft * (PCT[i] / PCT[1]) * BAR_MAX;
        const col = colorOf(i);
        return (
          <React.Fragment key={i}>
            {/* 点积分数 */}
            <div
              style={{
                position: "absolute",
                left: BAR_X,
                top: p.y,
                transform: `translateY(-50%) scale(${k})`,
                transformOrigin: "left center",
                fontFamily: MONO,
                fontWeight: 800,
                fontSize: 36,
                color: C.gold,
                opacity: clamp(k) * (1 - soft) * vis,
                textShadow: glow(C.gold, 0.3),
              }}
            >
              {SCORES[i].toFixed(1)}
            </div>
            {/* 百分比条 */}
            {soft > 0 ? (
              <div style={{ position: "absolute", left: BAR_X, top: p.y - 20, height: 40, display: "flex", alignItems: "center", opacity: vis }}>
                <div
                  style={{
                    width: Math.max(4, barW),
                    height: 34,
                    borderRadius: 8,
                    background: `linear-gradient(90deg, rgba(${hexToRgb(col)},0.35), ${col})`,
                    boxShadow: `0 0 18px rgba(${hexToRgb(col)},0.6)`,
                  }}
                />
                <div style={{ marginLeft: 14, fontFamily: MONO, fontWeight: 800, fontSize: 32, color: col, opacity: soft, whiteSpace: "nowrap" }}>{fmtPct(PCT[i])}</div>
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );
};

/** 点积小示意：方向越接近，分数越高 */
const DotDiagram: React.FC<{ t: number }> = ({ t }) => {
  const a = prog(t, T_SCORE + 0.6, 0.4) * (1 - prog(t, T_SOFT, 0.35));
  if (a <= 0) return null;
  const ox = 760;
  const oy = 1160;
  const L = 230;
  const arrow = (ang: number, color: string, label: string, k: number, key: string) => {
    const x = ox + Math.cos(ang) * L * k;
    const y = oy - Math.sin(ang) * L * k;
    const h = 22;
    const back = Math.atan2(oy - y, x - ox);
    return (
      <g key={key}>
        <line x1={ox} y1={oy} x2={x} y2={y} stroke={color} strokeWidth={7} strokeLinecap="round" />
        <polygon
          points={`${x},${y} ${x - h * Math.cos(back - 0.45)},${y + h * Math.sin(back - 0.45)} ${x - h * Math.cos(back + 0.45)},${y + h * Math.sin(back + 0.45)}`}
          fill={color}
        />
        <text x={ox + Math.cos(ang) * (L + 46)} y={oy - Math.sin(ang) * (L + 46) + 12} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={32} fill={color}>
          {label}
        </text>
      </g>
    );
  };
  const k1 = prog(t, T_SCORE + 0.7, 0.4);
  const k2 = prog(t, T_SCORE + 1.0, 0.4);
  const k3 = prog(t, T_SCORE + 1.3, 0.4);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: a }}>
      <path d={`M ${ox + 90 * Math.cos(0.62)} ${oy - 90 * Math.sin(0.62)} A 90 90 0 0 0 ${ox + 90 * Math.cos(0.92)} ${oy - 90 * Math.sin(0.92)}`} stroke={C.gold} strokeWidth={4} fill="none" opacity={k2} />
      {arrow(0.62, C.magenta, "it", k1, "it")}
      {arrow(0.92, C.gold, "animal", k2, "an")}
      {arrow(2.3, "#8C95C8", "The", k3, "th")}
      <text x={ox - 10} y={oy - 290} fontFamily={SANS} fontWeight={900} fontSize={28} fill={C.gold} opacity={k2}>
        夹角小 → 高分
      </text>
      <text x={ox - 230} y={oy + 50} fontFamily={SANS} fontWeight={900} fontSize={28} fill="#AEB6E0" opacity={k3}>
        夹角大 → 低分
      </text>
      <circle cx={ox} cy={oy} r={6} fill="#fff" />
    </svg>
  );
};

/* -------------------------------- 场景 -------------------------------- */

export const Attention: React.FC = () => {
  const t = useT();
  const boxes = sentenceLayout();
  const back = prog(t, T_BACK, 0.7, Ease.inOutCubic);
  const it = boxes[IT];
  const an = boxes[1];
  return (
    <AbsoluteFill>
      <Backdrop hue="mixed" intensity={0.9} />

      {/* A：问题 */}
      {t < T_PAR + 0.3 ? (
        <div
          style={{
            position: "absolute",
            top: 1040,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: SANS,
            fontWeight: 900,
            fontSize: 84,
            color: C.white,
            textShadow: softGlow(),
            opacity: prog(t, 1.0, 0.25) * (1 - prog(t, T_PAR, 0.2)),
            transform: `scale(${0.7 + 0.3 * prog(t, 1.0, 0.3, Ease.outBack)})`,
          }}
        >
          <span style={{ color: C.magenta, textShadow: glow(C.magenta, 0.6), fontFamily: SANS }}>it</span> 指的是谁？
        </div>
      ) : null}

      {/* B：并行 */}
      {t > T_PAR - 0.05 && t < T_LIST + 0.4 ? (
        <div
          style={{
            position: "absolute",
            top: 1010,
            left: 0,
            right: 0,
            textAlign: "center",
            opacity: prog(t, T_PAR + 0.05, 0.2) * (1 - prog(t, T_LIST, 0.3)),
          }}
        >
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 70, color: C.cyan, textShadow: glow(C.cyan, 0.6) }}>所有词，同时处理</div>
          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 34, color: C.dim, marginTop: 14 }}>不用再排队 → 可以并行计算，快得多</div>
        </div>
      ) : null}

      {/* D：softmax 标题 */}
      <div
        style={{
          position: "absolute",
          top: 248,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: prog(t, T_SOFT, 0.3) * (1 - prog(t, T_BACK - 0.2, 0.3)),
        }}
      >
        <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 44, color: C.cyan, textShadow: glow(C.cyan, 0.4) }}>softmax</span>
        <span style={{ fontFamily: SANS, fontWeight: 900, fontSize: 40, color: C.white }}> ：分数 → 百分比</span>
        <span
          style={{
            marginLeft: 16,
            fontFamily: SANS,
            fontSize: 24,
            color: "#FFE3A3",
            border: "1.5px solid rgba(255,201,77,0.6)",
            borderRadius: 20,
            padding: "2px 12px",
            verticalAlign: "middle",
          }}
        >
          数值为示意
        </span>
      </div>
      {/* C：打分标题 */}
      <div
        style={{
          position: "absolute",
          top: 248,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 40,
          color: C.white,
          opacity: prog(t, T_SCORE, 0.3) * (1 - prog(t, T_SOFT - 0.2, 0.2)),
        }}
      >
        <span style={{ color: C.magenta }}>it</span> 和每个词的向量做<span style={{ color: C.gold }}>点积</span>，打分
        <span
          style={{
            marginLeft: 16,
            fontFamily: SANS,
            fontWeight: 500,
            fontSize: 24,
            color: "#FFE3A3",
            border: "1.5px solid rgba(255,201,77,0.6)",
            borderRadius: 20,
            padding: "2px 12px",
            verticalAlign: "middle",
          }}
        >
          示意
        </span>
      </div>

      <CanvasLayer draw={(ctx) => drawBeams(ctx, t)} />
      <ScoresAndBars t={t} />
      <DotDiagram t={t} />
      <Orb t={t} />
      {/* F：it ↔ animal 的连接弧 */}
      {back > 0.6 ? (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <path
            d={`M ${it.x} ${it.y} C ${it.x - 40} ${it.y - 140}, ${an.x + 40} ${an.y + 140}, ${an.x} ${an.y}`}
            fill="none"
            stroke={C.gold}
            strokeWidth={6}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - prog(t, T_BACK + 0.5, 0.6, Ease.inOutCubic)}
            style={{ filter: `drop-shadow(0 0 12px ${C.gold})` }}
          />
        </svg>
      ) : null}

      <Chips t={t} boxes={boxes} />

      <Caption lines={["方向越接近，分数越高"]} sub="点积 Dot Product" at={T_SCORE + 0.9} until={T_SOFT - 0.2} y={1360} />
      <Caption lines={["把分数变成[百分比]"]} sub="加起来 = 100%" at={T_SOFT + 0.6} until={T_ABSORB - 0.1} y={1360} />
      <Caption lines={["it 按比例[吸收]其它词的信息"]} at={T_ABSORB + 0.3} until={T_BACK - 0.1} y={1360} hiColor={C.gold} size={68} />
      <Caption lines={["它读懂了[上下文]"]} sub="自注意力 Self-Attention" at={T_BACK + 0.9} y={1340} hiColor={C.gold} size={84} />

      <Flash at={T_PAR} peak={0.45} dur={0.2} color="#BFF4FF" />
      <Flash at={T_ABSORB + 1.4} peak={0.3} dur={0.25} color="#FFE3A3" />
    </AbsoluteFill>
  );
};
