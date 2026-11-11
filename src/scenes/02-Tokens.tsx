import React from "react";
import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { CanvasLayer, drawGlow, hexToRgb } from "../components/CanvasLayer";
import { useT } from "../components/SceneShell";
import { Caption, Flash, Holo, Slam } from "../components/Text";
import { clamp, Ease, lerp, prog, rnd } from "../lib/anim";
import { add, Cam, project, sub, V3 } from "../lib/proj3d";
import { C, MONO, SANS, glow, softGlow } from "../theme";

/**
 * 02 文字变数字（设计时长 12 秒）
 * A 0–1.9s   "AI 看不懂字，只看得懂数字"（冲击 + 碎成数字）
 * B 1.9–3.9s 句子被激光切成词块 Token
 * C 3.9–6.6s 每个词块展开成一长串跳动的数字（原论文 d_model = 512）
 * D 6.6–9.2s 词飞进 3D 星空，意思相近的词自动聚在一起
 * E 9.2–12s  经典示例：国王 − 男人 + 女人 ≈ 女王（word2vec，2013）
 */
/** 震撼段（设计秒）：调整时长时保持原速 */
export const KEEP: [number, number][] = [
  [1.5, 2.05],
  [2.7, 3.25],
  [6.5, 7.3],
  [10.8, 11.15],
];
export const DESIGN = 12;

const T_SHATTER = 1.55;
const T_SENT = 1.95;
const T_SLICE = 2.7;
const T_STRIP = 3.9;
const T_SPACE = 6.6;
const T_KING = 9.2;

/* ---------------------------------- A：标题碎裂 ---------------------------------- */

const TITLE = [
  { text: "AI 看不懂字，", y: 770, at: 0.1 },
  { text: "只看得懂数字", y: 910, at: 0.5 },
];
const TITLE_SIZE = 104;
const charW = (ch: string) => (/[\u0000-\u007f]/.test(ch) ? (ch === " " ? 0.3 : ch === "I" ? 0.32 : 0.66) : 1);

const shardSeeds = (() => {
  const out: { x: number; y: number; vx: number; vy: number; s: number; d: string; col: string }[] = [];
  TITLE.forEach((line, li) => {
    const chars = Array.from(line.text);
    const total = chars.reduce((a, ch) => a + charW(ch) * TITLE_SIZE, 0);
    let x = 540 - total / 2;
    chars.forEach((ch, ci) => {
      const w = charW(ch) * TITLE_SIZE;
      const cx = x + w / 2;
      x += w;
      if (ch === " ") return;
      for (let k = 0; k < 14; k++) {
        const ang = rnd(`sa${li}${ci}${k}`) * Math.PI * 2;
        const sp = 300 + rnd(`sv${li}${ci}${k}`) * 900;
        out.push({
          x: cx + (rnd(`sx${li}${ci}${k}`) - 0.5) * w * 0.8,
          y: line.y + 50 + (rnd(`sy${li}${ci}${k}`) - 0.5) * TITLE_SIZE * 0.8,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 150,
          s: 18 + rnd(`ss${li}${ci}${k}`) * 30,
          d: Math.floor(rnd(`sd${li}${ci}${k}`) * 10).toString(),
          col: rnd(`sc${li}${ci}${k}`) > 0.5 ? "61,224,255" : "155,92,255",
        });
      }
    });
  });
  return out;
})();

const drawShards = (ctx: CanvasRenderingContext2D, t: number) => {
  const dt = t - T_SHATTER;
  if (dt < 0 || dt > 1.2) return;
  ctx.globalCompositeOperation = "lighter";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const p of shardSeeds) {
    const drag = (1 - Math.exp(-dt * 2.2)) / 2.2;
    const x = p.x + p.vx * drag;
    const y = p.y + p.vy * drag + 120 * dt * dt;
    const a = Math.max(0, 1 - dt / 1.1);
    ctx.font = `800 ${Math.round(p.s)}px "JetBrains Mono"`;
    ctx.fillStyle = `rgba(${p.col},${a})`;
    ctx.fillText(p.d, x, y);
  }
  ctx.globalCompositeOperation = "source-over";
};

const Title: React.FC<{ t: number }> = ({ t }) => {
  if (t > T_SHATTER + 0.3) return null;
  const k = prog(t, T_SHATTER, 0.22, Ease.inQuad);
  return (
    <AbsoluteFill style={{ opacity: 1 - k, transform: `scale(${1 + k * 0.15})`, filter: k > 0 ? `blur(${k * 14}px)` : undefined }}>
      {TITLE.map((line, i) => (
        <Slam key={i} at={line.at} from={2.8} style={{ position: "absolute", top: line.y, left: 0, right: 0, textAlign: "center" }}>
          <span style={{ fontFamily: SANS, fontWeight: 900, fontSize: TITLE_SIZE, color: C.white, textShadow: softGlow(), letterSpacing: 0 }}>
            {i === 1 ? (
              <>
                只看得懂<span style={{ color: C.cyan, textShadow: glow(C.cyan, 0.8) }}>数字</span>
              </>
            ) : (
              line.text
            )}
          </span>
        </Slam>
      ))}
    </AbsoluteFill>
  );
};

/* ---------------------------------- B/C：词块与数字 ---------------------------------- */

const TOKENS = [
  { text: "我", color: C.cyan },
  { text: "喜欢", color: C.violet },
  { text: "吃", color: C.magenta },
  { text: "苹果", color: C.gold },
];
const FS = 110;
const PAD = 20;
const GAP = 26;
// 阶段 1：连在一起的句子
const joinedCenters = (() => {
  const total = TOKENS.reduce((a, tk) => a + tk.text.length * FS, 0);
  let x = 540 - total / 2;
  return TOKENS.map((tk) => {
    const w = tk.text.length * FS;
    const c = x + w / 2;
    x += w;
    return c;
  });
})();
// 阶段 2：切开后
const slicedCenters = (() => {
  const total = TOKENS.reduce((a, tk) => a + tk.text.length * FS + PAD * 2, 0) + GAP * (TOKENS.length - 1);
  let x = 540 - total / 2;
  return TOKENS.map((tk) => {
    const w = tk.text.length * FS + PAD * 2;
    const c = x + w / 2;
    x += w + GAP;
    return c;
  });
})();
const ROW_CENTERS = [178, 408, 642, 880];
const SENT_Y = 820;
const ROW_Y = 360;
const ROW_SCALE = 0.72;

const STRIP_TOP = 470;
const ROW_H = 38;
const N_ROWS = 20;

const numAt = (i: number, dim: number, t: number) => {
  const jitter = Math.floor(t * 12 + dim * 3 + i * 7) % 9 === 0 ? 1 : 0;
  const v = (rnd(`emb${i}-${dim}-${jitter ? Math.floor(t * 12) : 0}`) - 0.5) * 2;
  return (v < 0 ? "−" : "+") + Math.abs(v).toFixed(3);
};

const TokenRow: React.FC<{ t: number }> = ({ t }) => {
  const nChars = Math.floor(clamp((t - T_SENT) * 16, 0, 6));
  const slice = prog(t, T_SLICE + 0.3, 0.45, Ease.outBack);
  const up = prog(t, T_STRIP, 0.5, Ease.inOutCubic);
  const collapse = prog(t, T_SPACE - 0.2, 0.45, Ease.inCubic);
  if (t < T_SENT || t > T_SPACE + 0.3) return null;
  let charIdx = 0;
  return (
    <>
      {TOKENS.map((tk, i) => {
        const cx = lerp(lerp(joinedCenters[i], slicedCenters[i], clamp(slice, 0, 1.2)), ROW_CENTERS[i], up);
        const cy = lerp(SENT_Y, ROW_Y, up);
        const sc = lerp(1, ROW_SCALE, up) * (1 - collapse * 0.9);
        const tx = lerp(cx, 540, collapse);
        const ty = lerp(cy, 900, collapse);
        const chars = Array.from(tk.text);
        const border = clamp(slice);
        const startIdx = charIdx;
        charIdx += chars.length;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: tx,
              top: ty,
              transform: `translate(-50%, -50%) scale(${sc})`,
              padding: `${4 + border * 10}px ${border * PAD}px`,
              borderRadius: 22,
              border: `4px solid ${tk.color}`,
              borderColor: `rgba(${hexToRgb(tk.color)},${border})`,
              background: `rgba(${hexToRgb(tk.color)},${border * 0.12})`,
              boxShadow: border > 0 ? `0 0 ${30 * border}px rgba(${hexToRgb(tk.color)},${0.6 * border}), inset 0 0 20px rgba(${hexToRgb(tk.color)},${0.3 * border})` : undefined,
              fontFamily: SANS,
              fontWeight: 900,
              fontSize: FS,
              lineHeight: 1.1,
              color: C.white,
              whiteSpace: "nowrap",
              textShadow: softGlow(),
              opacity: 1 - prog(t, T_SPACE + 0.05, 0.2),
            }}
          >
            {chars.map((ch, ci) => (
              <span key={ci} style={{ opacity: startIdx + ci < nChars ? 1 : 0 }}>
                {ch}
              </span>
            ))}
          </div>
        );
      })}
    </>
  );
};

/** 激光切割 */
const Lasers: React.FC<{ t: number }> = ({ t }) => {
  const cuts = [0, 1, 2].map((i) => (joinedCenters[i] + TOKENS[i].text.length * FS * 0.5));
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {cuts.map((x, i) => {
        const at = T_SLICE + i * 0.1;
        const k = prog(t, at, 0.18, Ease.outCubic);
        const out = prog(t, at + 0.18, 0.3);
        if (t < at || out >= 1) return null;
        const y0 = SENT_Y - 260;
        const y1 = y0 + 520 * k;
        return (
          <g key={i} opacity={1 - out}>
            <line x1={x} y1={y0} x2={x} y2={y1} stroke={C.cyan} strokeWidth={14} opacity={0.4} style={{ filter: "blur(6px)" }} />
            <line x1={x} y1={y0} x2={x} y2={y1} stroke="#fff" strokeWidth={4} />
            {new Array(8).fill(0).map((_, s) => {
              const a = rnd(`ls${i}${s}`) * Math.PI * 2;
              const d = 20 + 90 * out;
              return <circle key={s} cx={x + Math.cos(a) * d} cy={SENT_Y + Math.sin(a) * d} r={4} fill={C.cyan} />;
            })}
          </g>
        );
      })}
    </svg>
  );
};

const Strips: React.FC<{ t: number }> = ({ t }) => {
  if (t < T_STRIP + 0.2 || t > T_SPACE + 0.2) return null;
  const scroll = prog(t, T_STRIP + 0.9, T_SPACE - T_STRIP - 1.2, Ease.inQuad) * 490;
  const off = Math.floor(scroll);
  const frac = scroll - off;
  const collapse = prog(t, T_SPACE - 0.35, 0.4, Ease.inCubic);
  return (
    <AbsoluteFill
      style={{
        opacity: 1 - collapse,
        transform: `translateY(${-collapse * 200}px) scaleY(${1 - collapse * 0.6})`,
        transformOrigin: "540px 420px",
        WebkitMaskImage: "linear-gradient(180deg, transparent 430px, black 470px, black 1020px, transparent 1210px)",
        maskImage: "linear-gradient(180deg, transparent 430px, black 470px, black 1020px, transparent 1210px)",
      }}
    >
      {/* 维度编号 */}
      {new Array(N_ROWS).fill(0).map((_, r) => {
        const appear = prog(t, T_STRIP + 0.3 + r * 0.03, 0.3);
        return (
          <div
            key={`idx${r}`}
            style={{
              position: "absolute",
              left: 22,
              width: 70,
              textAlign: "right",
              top: STRIP_TOP + (r - frac) * ROW_H,
              fontFamily: MONO,
              fontSize: 22,
              color: "rgba(160,180,230,0.55)",
              opacity: appear,
            }}
          >
            {off + r + 1}
          </div>
        );
      })}
      {TOKENS.map((tk, i) =>
        new Array(N_ROWS).fill(0).map((_, r) => {
          const appear = prog(t, T_STRIP + 0.3 + r * 0.03 + i * 0.05, 0.3);
          return (
            <div
              key={`${i}-${r}`}
              style={{
                position: "absolute",
                left: ROW_CENTERS[i],
                top: STRIP_TOP + (r - frac) * ROW_H,
                transform: `translateX(-50%) translateX(${(1 - appear) * 30}px)`,
                fontFamily: MONO,
                fontWeight: 800,
                fontSize: 30,
                color: tk.color,
                opacity: appear * 0.92,
                textShadow: glow(tk.color, 0.25),
              }}
            >
              {numAt(i, off + r, t)}
            </div>
          );
        }),
      )}
    </AbsoluteFill>
  );
};

const StripLabel: React.FC<{ t: number }> = ({ t }) => {
  const out = prog(t, T_SPACE - 0.3, 0.3);
  if (t < T_STRIP + 0.8 || out >= 1) return null;
  return (
    <div style={{ position: "absolute", top: 1215, left: 0, right: 0, textAlign: "center", opacity: 1 - out }}>
      <div style={{ fontFamily: MONO, fontSize: 38, color: C.gold, opacity: prog(t, T_STRIP + 0.9, 0.3), marginBottom: 20 }}>
        ⋮ 一直排到第 512 个
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 60 }}>
        <Holo at={T_STRIP + 1.1} color={C.white}>
          原论文中，每个词 = <span style={{ color: C.gold, fontFamily: MONO }}>512</span> 个数字
        </Holo>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 34, color: C.cyan, marginTop: 14, opacity: prog(t, T_STRIP + 1.4, 0.3), textShadow: glow(C.cyan, 0.3) }}>
        d_model = 512
      </div>
    </div>
  );
};

/* ---------------------------------- D/E：3D 语义空间 ---------------------------------- */

type Word = { text: string; cluster: number; pos: V3; from: V3; hl?: string };
const CLUSTERS: { name: string; c: V3 }[] = [
  { name: "人物", c: [560, -80, 160] },
  { name: "动物", c: [-640, -520, -260] },
  { name: "水果", c: [-480, 520, 320] },
  { name: "交通工具", c: [700, 640, -440] },
  { name: "动作", c: [-60, 160, -780] },
  { name: "情感", c: [80, -780, -60] },
  { name: "代词", c: [-960, 60, 480] },
];
const RC = CLUSTERS[0].c;
const P_MAN = add(RC, [-150, 120, 0]);
const P_WOMAN = add(RC, [95, 150, 40]);
const P_KING = add(RC, [-170, -130, -20]);
const GENDER = sub(P_WOMAN, P_MAN);
const P_LAND = add(P_KING, GENDER); // 国王 − 男人 + 女人 的落点
const P_QUEEN = add(P_LAND, [14, -12, 10]); // 女王就在附近（≈）

const rawWords: { text: string; cluster: number; pos?: V3; hl?: string }[] = [
  { text: "国王", cluster: 0, pos: P_KING },
  { text: "女王", cluster: 0, pos: P_QUEEN },
  { text: "男人", cluster: 0, pos: P_MAN },
  { text: "女人", cluster: 0, pos: P_WOMAN },
  { text: "猫", cluster: 1 },
  { text: "狗", cluster: 1 },
  { text: "兔子", cluster: 1 },
  { text: "老虎", cluster: 1 },
  { text: "苹果", cluster: 2, hl: C.gold },
  { text: "香蕉", cluster: 2 },
  { text: "葡萄", cluster: 2 },
  { text: "橙子", cluster: 2 },
  { text: "汽车", cluster: 3 },
  { text: "火车", cluster: 3 },
  { text: "飞机", cluster: 3 },
  { text: "吃", cluster: 4, hl: C.magenta },
  { text: "喝", cluster: 4 },
  { text: "跑", cluster: 4 },
  { text: "喜欢", cluster: 5, hl: C.violet },
  { text: "爱", cluster: 5 },
  { text: "开心", cluster: 5 },
  { text: "我", cluster: 6, hl: C.cyan },
  { text: "你", cluster: 6 },
  { text: "他", cluster: 6 },
];
const WORDS: Word[] = rawWords.map((w, i) => {
  const c = CLUSTERS[w.cluster].c;
  // 同一簇的词围成一个小环，避免互相遮挡
  const members = rawWords.filter((x) => x.cluster === w.cluster);
  const k = members.indexOf(w);
  const ang = (k / members.length) * Math.PI * 2 + w.cluster * 0.9;
  const pos: V3 = w.pos ?? [c[0] + Math.cos(ang) * 175, c[1] + Math.sin(ang) * 125, c[2] + (rnd(`wz${i}`) - 0.5) * 140];
  const from: V3 = [(rnd(`fx${i}`) - 0.5) * 1700, (rnd(`fy${i}`) - 0.5) * 1900, (rnd(`fz${i}`) - 0.5) * 1500];
  return { text: w.text, cluster: w.cluster, pos, from, hl: w.hl };
});

const STARS: V3[] = new Array(800)
  .fill(0)
  .map((_, i) => [(rnd(`stx${i}`) - 0.5) * 4200, (rnd(`sty${i}`) - 0.5) * 4200, (rnd(`stz${i}`) - 0.5) * 4200] as V3);

const camAt = (t: number): Cam => {
  const fly = prog(t, T_SPACE, 1.2, Ease.outCubic);
  const focus = prog(t, T_KING, 1.0, Ease.inOutCubic);
  const yawFree = -0.55 + (t - T_SPACE) * 0.2;
  const yawFocus = 0.18 + (t - T_KING) * 0.025;
  const target: V3 = [lerp(0, RC[0] - 40, focus), lerp(0, RC[1] - 10, focus), lerp(0, RC[2], focus)];
  return {
    target,
    yaw: lerp(yawFree, yawFocus, focus),
    pitch: lerp(0.22, 0.12, focus),
    dist: lerp(lerp(3800, 2250, fly), 820, focus),
    f: 1000,
    cx: 540,
    cy: lerp(820, 860, focus),
  };
};

const wordPos = (w: Word, i: number, t: number): V3 => {
  const k = prog(t, T_SPACE + 0.35 + rnd(`wd${i}`) * 0.35, 1.05, Ease.inOutCubic);
  return [lerp(w.from[0], w.pos[0], k), lerp(w.from[1], w.pos[1], k), lerp(w.from[2], w.pos[2], k)];
};

const drawSpace = (ctx: CanvasRenderingContext2D, t: number) => {
  const cam = camAt(t);
  const appear = prog(t, T_SPACE - 0.05, 0.5);
  ctx.globalCompositeOperation = "lighter";
  // 星尘
  for (let i = 0; i < STARS.length; i++) {
    const p = project(STARS[i], cam);
    if (!p) continue;
    const r = Math.min(10, 2.4 * p.s * 1.6);
    drawGlow(ctx, i % 3 === 0 ? "155,92,255" : "61,224,255", p.x, p.y, r * 2.5, appear * Math.min(0.9, 0.25 + p.s * 0.6));
  }
  // 地面网格（增强 3D 感）
  ctx.strokeStyle = `rgba(80,120,255,${0.16 * appear})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const Y = 700;
  for (let g = -1500; g <= 1500; g += 150) {
    const a = project([g, Y, -1500], cam);
    const b = project([g, Y, 1500], cam);
    if (a && b) {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    const c = project([-1500, Y, g], cam);
    const d = project([1500, Y, g], cam);
    if (c && d) {
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
    }
  }
  ctx.stroke();
  // 词的光点
  const focus = prog(t, T_KING, 0.6);
  WORDS.forEach((w, i) => {
    const p = project(wordPos(w, i, t), cam);
    if (!p) return;
    const isRoyal = i < 4;
    const dim = isRoyal ? 1 : 1 - 0.9 * focus;
    const rgb = w.hl ? hexToRgb(w.hl) : "61,224,255";
    drawGlow(ctx, rgb, p.x, p.y, 16 * p.s * 1.6, appear * dim);
  });
  ctx.globalCompositeOperation = "source-over";
};

const SpaceLabels: React.FC<{ t: number }> = ({ t }) => {
  if (t < T_SPACE - 0.05) return null;
  const cam = camAt(t);
  const appear = prog(t, T_SPACE, 0.6);
  const focus = prog(t, T_KING, 0.6);
  const queenLit = prog(t, 10.95, 0.25);
  const clusterA = prog(t, 7.85, 0.5) * (1 - prog(t, T_KING, 0.5));
  const items = WORDS.map((w, i) => ({ w, i, p: project(wordPos(w, i, t), cam) })).sort((a, b) => (b.p?.z ?? 0) - (a.p?.z ?? 0));
  return (
    <AbsoluteFill>
      {/* 聚类光环 */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {CLUSTERS.map((c, ci) => {
          const p = project(c.c, cam);
          if (!p || clusterA <= 0) return null;
          const r = 230 * p.s * 1.35;
          return (
            <g key={ci} opacity={clusterA}>
              <circle cx={p.x} cy={p.y} r={r} fill="rgba(61,224,255,0.04)" stroke="rgba(61,224,255,0.45)" strokeWidth={2} strokeDasharray="8 10" />
              <text x={p.x} y={p.y - r - 12} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={Math.max(22, 30 * p.s * 1.3)} fill="rgba(160,230,255,0.85)">
                {c.name}
              </text>
            </g>
          );
        })}
      </svg>
      {items.map(({ w, i, p }) => {
        if (!p) return null;
        const isRoyal = i < 4;
        const dim = isRoyal ? 1 : (1 - 0.94 * focus) * (1 - clamp((p.s - 1.1) * 2));
        const size = Math.min(96, 44 * p.s * 1.6 * (isRoyal ? 1 : 1.45));
        const blur = Math.min(6, Math.abs(p.z - cam.dist) * 0.004) * (isRoyal && focus > 0 ? 0 : 1);
        const isQueen = i === 1;
        const isKing = i === 0;
        const kingLit = prog(t, 9.6, 0.3);
        const color = isQueen && queenLit > 0 ? C.gold : isKing && kingLit > 0 ? C.gold : w.hl ?? C.white;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y - size * 0.95,
              transform: `translate(-50%, -50%) scale(${isQueen ? 1 + 0.25 * queenLit * (1 - prog(t, 11.2, 0.4)) : 1})`,
              fontFamily: SANS,
              fontWeight: 900,
              fontSize: size,
              color,
              opacity: appear * dim * clamp(p.s * 2),
              filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
              textShadow: (isQueen && queenLit > 0) || (isKing && kingLit > 0) ? glow(C.gold, 0.6) : softGlow(w.hl ? w.hl : undefined),
              whiteSpace: "nowrap",
            }}
          >
            {w.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** 向量箭头：男人→女人 的方向，平移到国王身上，落在女王旁边 */
const Arrows: React.FC<{ t: number }> = ({ t }) => {
  if (t < T_KING) return null;
  const cam = camAt(t);
  const arrow = (a: V3, b: V3, k: number, color: string, dashed: boolean, key: string, label?: string) => {
    const pa = project(a, cam);
    const pb = project(b, cam);
    if (!pa || !pb || k <= 0) return null;
    const x2 = lerp(pa.x, pb.x, k);
    const y2 = lerp(pa.y, pb.y, k);
    const ang = Math.atan2(y2 - pa.y, x2 - pa.x);
    const h = 26;
    return (
      <g key={key}>
        <line x1={pa.x} y1={pa.y} x2={x2} y2={y2} stroke={color} strokeWidth={8} strokeDasharray={dashed ? "16 12" : undefined} style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
        <polygon
          points={`${x2},${y2} ${x2 - h * Math.cos(ang - 0.45)},${y2 - h * Math.sin(ang - 0.45)} ${x2 - h * Math.cos(ang + 0.45)},${y2 - h * Math.sin(ang + 0.45)}`}
          fill={color}
        />
        {label && k > 0.6 ? (
          <text
            x={(pa.x + pb.x) / 2}
            y={(pa.y + pb.y) / 2 + 52}
            textAnchor="middle"
            fontFamily={SANS}
            fontWeight={900}
            fontSize={34}
            fill={color}
            opacity={prog(k, 0.6, 0.4, Ease.linear)}
          >
            {label}
          </text>
        ) : null}
      </g>
    );
  };
  const land = project(P_LAND, cam);
  const ring = prog(t, 10.85, 0.6);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {arrow(P_MAN, P_WOMAN, prog(t, 9.95, 0.45, Ease.inOutCubic), C.magenta, true, "g", "−男人 +女人")}
      {arrow(P_KING, P_LAND, prog(t, 10.4, 0.5, Ease.inOutCubic), C.gold, false, "k")}
      {land && ring > 0 && ring < 1 ? (
        <circle cx={land.x} cy={land.y} r={20 + ring * 120} fill="none" stroke={C.gold} strokeWidth={6 * (1 - ring)} opacity={1 - ring} />
      ) : null}
    </svg>
  );
};

const Equation: React.FC<{ t: number }> = ({ t }) => {
  if (t < 9.45) return null;
  const term = (at: number, text: string, color: string = C.white) => (
    <span style={{ opacity: prog(t, at, 0.2), display: "inline-block", transform: `translateY(${(1 - prog(t, at, 0.25, Ease.outBack)) * 20}px)`, color, marginRight: 14 }}>
      {text}
    </span>
  );
  return (
    <div style={{ position: "absolute", top: 270, left: 0, right: 0, textAlign: "center" }}>
      <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 70 }}>
        <Holo at={9.45} color={C.white}>
          {term(9.5, "国王", C.gold)}
          {term(9.95, "−", C.magenta)}
          {term(9.95, "男人", C.white)}
          {term(10.2, "+", C.magenta)}
          {term(10.2, "女人", C.white)}
          {term(10.85, "≈", C.gold)}
          {term(10.85, "女王", C.gold)}
        </Holo>
      </div>
      <div
        style={{
          marginTop: 14,
          display: "inline-block",
          fontFamily: SANS,
          fontWeight: 500,
          fontSize: 28,
          color: "#CDB4FF",
          padding: "4px 18px",
          border: "2px solid rgba(155,92,255,0.7)",
          borderRadius: 30,
          opacity: prog(t, 9.7, 0.3),
        }}
      >
        经典示例 · word2vec（2013）
      </div>
    </div>
  );
};

export const Tokens: React.FC = () => {
  const t = useT();
  const spaceDim = prog(t, T_SPACE - 0.1, 0.4);
  return (
    <AbsoluteFill>
      <Backdrop hue="violet" intensity={0.9 - 0.4 * spaceDim} />
      <Title t={t} />
      <CanvasLayer draw={(ctx) => drawShards(ctx, t)} />
      <Lasers t={t} />
      <Strips t={t} />
      <TokenRow t={t} />
      {t > T_SLICE + 0.4 && t < T_STRIP + 0.4 ? (
        <div
          style={{
            position: "absolute",
            top: 1000,
            left: 0,
            right: 0,
            textAlign: "center",
            opacity: prog(t, T_SLICE + 0.45, 0.3) * (1 - prog(t, T_STRIP, 0.3)),
          }}
        >
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 64, color: C.white, textShadow: softGlow() }}>
            切成词块 <span style={{ fontFamily: MONO, color: C.cyan, textShadow: glow(C.cyan, 0.5) }}>Token</span>
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: C.dim, marginTop: 12 }}>（切分方式为示意）</div>
        </div>
      ) : null}
      <StripLabel t={t} />

      {t > T_SPACE - 0.1 ? <CanvasLayer draw={(ctx) => drawSpace(ctx, t)} /> : null}
      <SpaceLabels t={t} />
      <Arrows t={t} />
      <Equation t={t} />

      <Caption lines={["意思相近的词，", "[自动靠在一起]"]} at={7.75} until={T_KING - 0.15} />
      <Caption lines={["每个词，都是", "高维空间里的[一个点]"]} sub="词向量 Embedding" at={10.95} y={1300} />
      <div
        style={{
          position: "absolute",
          top: 1462,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: SANS,
          fontSize: 26,
          color: "rgba(200,210,240,0.6)",
          opacity: prog(t, 11.3, 0.4),
        }}
      >
        示意：真实的词向量有几百维，这里压缩成 3 维来看
      </div>

      <Flash at={0} peak={0.35} dur={0.2} />
      <Flash at={T_SHATTER} peak={0.35} dur={0.2} color="#BFF4FF" />
      <Flash at={T_SPACE} peak={0.45} dur={0.25} color="#BFF4FF" />
    </AbsoluteFill>
  );
};
