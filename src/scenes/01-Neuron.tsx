import React from "react";
import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { CanvasLayer, drawGlow } from "../components/CanvasLayer";
import { useT } from "../components/SceneShell";
import { Caption, Flash, Holo } from "../components/Text";
import { clamp, Ease, fmt, lerp, prog, rnd } from "../lib/anim";
import { C, MONO, SANS, glow } from "../theme";

/**
 * 01 神经元（设计时长 12 秒）
 * A 0–3.8s   输入 × 权重 → 求和 + 偏置
 * B 3.8–7.4s 推进到神经元内部：激活函数 ReLU（开关）
 * C 7.4–12s  镜头急速拉远：1 → 几百 → 几百万，连成网络；"这些权重，就是参数"
 */
export const DESIGN = 12;

// —— 示例数值（真实可算）——
const X = [0.8, -0.5, 1.2];
const W = [1.5, 0.6, 0.5];
const B = -0.4;
const PROD = X.map((x, i) => x * W[i]); // 1.2, -0.3, 0.6
const Z = PROD.reduce((a, b) => a + b, 0) + B; // 1.1

// —— 布局 ——
const NX = 590;
const NY = 720;
const NR = 80;
const IX = 165;
const IY = [480, 720, 960];
const IR = 62;

const T_PUSH = 3.75; // 推进到神经元内部
const T_ZOOM = 7.35; // 拉远成网络

/* ---------------------------------- A：神经元 ---------------------------------- */

const NeuronDiagram: React.FC<{ t: number }> = ({ t }) => {
  const appear = prog(t, 0, 0.7, Ease.outExpo);
  const nx = lerp(540, NX, appear);
  const ny = lerp(960, NY, appear);
  const nr = lerp(8, NR, appear);
  const sumGlow = prog(t, 2.45, 0.3) * (1 - prog(t, 2.9, 0.6)) + prog(t, 3.25, 0.2) * 0.8;
  const showResult = t > 3.25;

  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <defs>
        <radialGradient id="nodeFill" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#2B3C78" />
          <stop offset="100%" stopColor="#0B1030" />
        </radialGradient>
        <filter id="gl" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 连线 */}
      {IY.map((iy, i) => {
        const k = prog(t, 0.6 + i * 0.12, 0.5, Ease.inOutCubic);
        return (
          <line
            key={`l${i}`}
            x1={IX + IR}
            y1={iy}
            x2={nx - nr * 0.9}
            y2={ny + (iy - NY) * 0.25}
            stroke={C.cyan}
            strokeWidth={4}
            strokeOpacity={0.55}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - k}
            filter="url(#gl)"
          />
        );
      })}

      {/* 信号沿连线流动（乘法结果随之流入） */}
      {IY.map((iy, i) => {
        const k = prog(t, 1.85 + i * 0.12, 0.7, Ease.inOutCubic);
        if (k <= 0 || k >= 1) return null;
        const x = lerp(IX + IR, nx - nr * 0.9, k);
        const y = lerp(iy, ny + (iy - NY) * 0.25, k);
        return (
          <g key={`p${i}`}>
            <circle cx={x} cy={y} r={11} fill="#fff" filter="url(#gl)" />
            <circle cx={x} cy={y} r={22} fill={C.cyan} opacity={0.35} />
            <text
              x={x}
              y={y - 30}
              textAnchor="middle"
              fontFamily={MONO}
              fontWeight={800}
              fontSize={34}
              fill={C.gold}
              opacity={prog(k, 0.52, 0.12, Ease.linear)}
            >
              {fmt(PROD[i], 1)}
            </text>
          </g>
        );
      })}

      {/* 输入节点 */}
      {IY.map((iy, i) => {
        const k = prog(t, 0.5 + i * 0.12, 0.45, Ease.outBack);
        return (
          <g key={`i${i}`} transform={`translate(${IX} ${iy}) scale(${k})`} opacity={clamp(k)}>
            <circle r={IR} fill="url(#nodeFill)" stroke={C.cyan} strokeWidth={4} filter="url(#gl)" />
            <text textAnchor="middle" dy={14} fontFamily={MONO} fontWeight={800} fontSize={40} fill={C.white}>
              {fmt(X[i], 1)}
            </text>
          </g>
        );
      })}

      {/* 权重标签 */}
      {IY.map((iy, i) => {
        const k = prog(t, 1.2 + i * 0.12, 0.4, Ease.outBack);
        const mx = lerp(IX + IR, nx - nr * 0.9, 0.5);
        const my = lerp(iy, ny + (iy - NY) * 0.25, 0.5);
        return (
          <g key={`w${i}`} transform={`translate(${mx} ${my - 4}) scale(${k})`} opacity={clamp(k)}>
            <rect x={-62} y={-30} width={124} height={56} rx={14} fill="#1A0F33" stroke={C.violet} strokeWidth={3} />
            <text textAnchor="middle" dy={12} fontFamily={MONO} fontWeight={800} fontSize={34} fill="#D9C2FF">
              ×{W[i].toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* 神经元本体 */}
      <circle cx={nx} cy={ny} r={nr * (1.5 + 0.25 * sumGlow)} fill={C.cyan} opacity={0.08 + 0.18 * sumGlow} />
      <circle cx={nx} cy={ny} r={nr} fill="url(#nodeFill)" stroke={C.cyan} strokeWidth={5} filter="url(#gl)" />
      <circle cx={nx} cy={ny} r={nr * 0.82} fill="none" stroke={C.violet} strokeWidth={2} strokeDasharray="6 10" transform={`rotate(${t * 40} ${nx} ${ny})`} opacity={appear} />
      <text
        x={nx}
        y={ny}
        dy={showResult ? 15 : 22}
        textAnchor="middle"
        fontFamily={showResult ? MONO : SANS}
        fontWeight={900}
        fontSize={showResult ? 46 : 64}
        fill={showResult ? C.gold : C.white}
        opacity={appear}
      >
        {showResult ? fmt(Z, 1) : "Σ"}
      </text>

      {/* 偏置 */}
      <g opacity={prog(t, 2.9, 0.4)}>
        <line x1={nx} y1={ny - nr - 70} x2={nx} y2={ny - nr - 6} stroke={C.magenta} strokeWidth={4} />
        <text x={nx} y={ny - nr - 86} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={34} fill="#FF9BE4">
          偏置 b = {fmt(B, 1)}
        </text>
      </g>

      {/* 输出 */}
      <g opacity={prog(t, 3.3, 0.3)}>
        <line
          x1={nx + nr}
          y1={ny}
          x2={nx + nr + 170}
          y2={ny}
          stroke={C.gold}
          strokeWidth={5}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - prog(t, 3.3, 0.35)}
          filter="url(#gl)"
        />
        <polygon points={`${nx + nr + 170},${ny - 14} ${nx + nr + 196},${ny} ${nx + nr + 170},${ny + 14}`} fill={C.gold} />
      </g>

      {/* 标签 */}
      <text x={IX} y={380} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={36} fill={C.cyan} opacity={prog(t, 0.7, 0.4)}>
        输入
      </text>
      <text
        x={lerp(IX + IR, NX - NR, 0.5)}
        y={380}
        textAnchor="middle"
        fontFamily={SANS}
        fontWeight={900}
        fontSize={36}
        fill="#C9A8FF"
        opacity={prog(t, 1.3, 0.4)}
      >
        权重
      </text>
    </svg>
  );
};

const FormulaBlock: React.FC<{ t: number }> = ({ t }) => {
  const line = (y: number, at: number, children: React.ReactNode, color: string = C.cyan, size = 46) => (
    <div style={{ position: "absolute", top: y, left: 0, right: 0, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: size }}>
      <Holo at={at} color={color}>
        {children}
      </Holo>
    </div>
  );
  const chip = (y: number, at: number, text: string, color: string) => (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 0,
        right: 0,
        textAlign: "center",
        opacity: prog(t, at, 0.3),
        transform: `translateY(${(1 - prog(t, at, 0.3)) * 16}px)`,
      }}
    >
      <span
        style={{
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 34,
          color,
          padding: "6px 22px",
          border: `2px solid ${color}`,
          borderRadius: 40,
          background: "rgba(10,12,30,0.7)",
        }}
      >
        {text}
      </span>
    </div>
  );
  return (
    <>
      {chip(1030, 1.6, "① 乘法：输入 × 权重", "#C9A8FF")}
      {line(1095, 1.75, "0.8×1.5 + (−0.5)×0.6 + 1.2×0.5")}
      {line(1160, 2.5, "= 1.2 − 0.3 + 0.6")}
      {chip(1240, 2.85, "② 加法：求和 + 偏置", "#FF9BE4")}
      {line(1305, 3.15, "1.5 − 0.4 = 1.1", C.gold, 56)}
    </>
  );
};

/* ---------------------------------- B：ReLU ---------------------------------- */

const GX0 = 540; // 原点
const GY0 = 900;
const U = 125; // 每单位像素
const gx = (v: number) => GX0 + v * U;
const gy = (v: number) => GY0 - v * U;

const ReluPanel: React.FC<{ t: number }> = ({ t }) => {
  const axes = prog(t, 4.05, 0.45, Ease.inOutCubic);
  const curve = prog(t, 4.4, 0.7, Ease.inOutCubic);
  // 探针：先停在负数，再滑到正数 1.1
  const zIn = t < 5.55 ? -2.0 : lerp(-2.0, Z, prog(t, 5.55, 0.9, Ease.inOutCubic));
  const zOut = Math.max(0, zIn);
  const probe = prog(t, 5.0, 0.3);
  const on = zIn > 0;
  const stateColor = on ? C.green : C.red;

  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <defs>
        <filter id="gl2" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* 网格 */}
      {[-3, -2, -1, 1, 2, 3].map((v) => (
        <g key={`gx${v}`} opacity={axes * 0.5}>
          <line x1={gx(v)} y1={gy(3.2)} x2={gx(v)} y2={gy(-0.6)} stroke="rgba(120,140,255,0.18)" strokeWidth={2} />
          <text x={gx(v)} y={GY0 + 46} textAnchor="middle" fontFamily={MONO} fontSize={28} fill="rgba(200,210,255,0.8)">
            {v < 0 ? `−${-v}` : v}
          </text>
        </g>
      ))}
      {[1, 2, 3].map((v) => (
        <g key={`gy${v}`} opacity={axes * 0.5}>
          <line x1={gx(-3)} y1={gy(v)} x2={gx(3)} y2={gy(v)} stroke="rgba(120,140,255,0.18)" strokeWidth={2} />
          <text x={GX0 - 18} y={gy(v) + 10} textAnchor="end" fontFamily={MONO} fontSize={28} fill="rgba(200,210,255,0.8)">
            {v}
          </text>
        </g>
      ))}
      {/* 坐标轴 */}
      <line x1={gx(-3.2)} y1={GY0} x2={gx(-3.2) + (gx(3.3) - gx(-3.2)) * axes} y2={GY0} stroke="#8FA0D8" strokeWidth={3} />
      <line x1={GX0} y1={gy(-0.6)} x2={GX0} y2={gy(-0.6) - (gy(-0.6) - gy(3.4)) * axes} stroke="#8FA0D8" strokeWidth={3} />
      <text x={gx(3.3)} y={GY0 - 16} textAnchor="end" fontFamily={MONO} fontSize={30} fill="#BFD0FF" opacity={axes}>
        输入 z
      </text>
      <text x={GX0 + 16} y={gy(3.35)} fontFamily={MONO} fontSize={30} fill="#BFD0FF" opacity={axes}>
        输出
      </text>

      {/* ReLU 曲线 */}
      <path
        d={`M ${gx(-3)} ${gy(0)} L ${gx(0)} ${gy(0)} L ${gx(3)} ${gy(3)}`}
        fill="none"
        stroke={C.cyan}
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - curve}
        filter="url(#gl2)"
      />

      {/* 区域说明 */}
      <g opacity={prog(t, 4.9, 0.35)}>
        <text x={gx(-1.25)} y={gy(0) - 64} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={38} fill="#FF8DA0">
          负数 → 归零
        </text>
      </g>
      <g opacity={prog(t, 5.1, 0.35)}>
        <text x={gx(0.55)} y={gy(2.55)} textAnchor="middle" fontFamily={SANS} fontWeight={900} fontSize={38} fill="#8DFFD0">
          正数 → 原样输出
        </text>
      </g>

      {/* 探针 */}
      <g opacity={probe}>
        <line x1={gx(zIn)} y1={GY0 + 70} x2={gx(zIn)} y2={gy(zOut)} stroke={stateColor} strokeWidth={3} strokeDasharray="8 8" />
        {zOut > 0 ? <line x1={GX0} y1={gy(zOut)} x2={gx(zIn)} y2={gy(zOut)} stroke={stateColor} strokeWidth={3} strokeDasharray="8 8" /> : null}
        <polygon points={`${gx(zIn) - 14},${GY0 + 86} ${gx(zIn) + 14},${GY0 + 86} ${gx(zIn)},${GY0 + 64}`} fill={stateColor} />
        <circle cx={gx(zIn)} cy={gy(zOut)} r={16} fill="#fff" filter="url(#gl2)" />
        <circle cx={gx(zIn)} cy={gy(zOut)} r={30} fill={stateColor} opacity={0.3} />
      </g>
    </svg>
  );
};

const ReluTexts: React.FC<{ t: number }> = ({ t }) => {
  const zIn = t < 5.55 ? -2.0 : lerp(-2.0, Z, prog(t, 5.55, 0.9, Ease.inOutCubic));
  const zOut = Math.max(0, zIn);
  const on = zIn > 0;
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 300,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 58,
          color: C.white,
          opacity: prog(t, 3.95, 0.4),
          transform: `translateY(${(1 - prog(t, 3.95, 0.4)) * 24}px)`,
        }}
      >
        ③ 开关：激活函数{" "}
        <span style={{ fontFamily: MONO, color: C.cyan, textShadow: glow(C.cyan, 0.5) }}>ReLU</span>
      </div>
      <div style={{ position: "absolute", top: 1070, left: 0, right: 0, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 50 }}>
        <Holo at={5.0} color={on ? C.green : "#FF8DA0"}>
          max(0, {fmt(zIn, 1)}) = {fmt(zOut, 1)}
          <span style={{ fontFamily: SANS, fontSize: 40, marginLeft: 24 }}>{on ? "开" : "关"}</span>
        </Holo>
      </div>
    </>
  );
};

/* ---------------------------------- C：网络拉远 ---------------------------------- */

const ANCHOR_X = 540;
const ANCHOR_Y = 860;
// 一个"块"：9 列 × 13 行 = 117 个神经元
const COLS = 9;
const ROWS = 13;
const DX = 190;
const DY = 140;
const NODE_R = 34;
const BLOCK = 2500;

type P2 = { x: number; y: number };
const blockNodes: P2[] = [];
for (let c = 0; c < COLS; c++) {
  for (let r = 0; r < ROWS; r++) {
    blockNodes.push({ x: (c - (COLS - 1) / 2) * DX, y: (r - (ROWS - 1) / 2) * DY });
  }
}
const nodeIdx = (c: number, r: number) => c * ROWS + r;

// 周围的其它块（5×5，去掉中心）
const blockOffsets: P2[] = [];
for (let i = -2; i <= 2; i++) {
  for (let j = -2; j <= 2; j++) {
    if (i === 0 && j === 0) continue;
    blockOffsets.push({ x: i * BLOCK + (rnd(`bo${i}${j}`) - 0.5) * 300, y: j * BLOCK + (rnd(`bp${i}${j}`) - 0.5) * 300 });
  }
}
// 其它块的稀疏连线：每个节点连向下一列的 2 个节点
const sparseEdges: [number, number][] = [];
for (let c = 0; c < COLS - 1; c++) {
  for (let r = 0; r < ROWS; r++) {
    for (let k = 0; k < 2; k++) {
      sparseEdges.push([nodeIdx(c, r), nodeIdx(c + 1, Math.floor(rnd(`se${c}-${r}-${k}`) * ROWS))]);
    }
  }
}

// "几百万"的星系：旋臂结构 + 近邻连线
const GAL_N = 22000;
const GAL_R = 75000;
const gal: { x: number; y: number; b: number; c: number }[] = [];
for (let i = 0; i < GAL_N; i++) {
  const arm = i % 3;
  const rr = 7000 + Math.pow(rnd(`gr${i}`), 0.75) * GAL_R;
  const ang = (arm * Math.PI * 2) / 3 + (rr / GAL_R) * 4.2 + (rnd(`ga${i}`) - 0.5) * (0.9 + (1 - rr / GAL_R) * 0.6);
  gal.push({
    x: Math.cos(ang) * rr,
    y: Math.sin(ang) * rr * 0.78,
    b: 0.35 + rnd(`gb${i}`) * 0.65,
    c: rnd(`gc${i}`) > 0.6 ? 1 : 0,
  });
}
const galEdges: [number, number][] = (() => {
  const cell = 2600;
  const grid = new Map<string, number[]>();
  gal.forEach((p, i) => {
    const key = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)}`;
    const arr = grid.get(key);
    if (arr) arr.push(i);
    else grid.set(key, [i]);
  });
  const edges: [number, number][] = [];
  gal.forEach((p, i) => {
    const cx = Math.floor(p.x / cell);
    const cy = Math.floor(p.y / cell);
    let best1 = -1;
    let best2 = -1;
    let d1 = Infinity;
    let d2 = Infinity;
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        const arr = grid.get(`${cx + a},${cy + b}`);
        if (!arr) continue;
        for (const j of arr) {
          if (j <= i) continue;
          const d = (gal[j].x - p.x) ** 2 + (gal[j].y - p.y) ** 2;
          if (d < d1) {
            d2 = d1;
            best2 = best1;
            d1 = d;
            best1 = j;
          } else if (d < d2) {
            d2 = d;
            best2 = j;
          }
        }
      }
    }
    if (best1 >= 0) edges.push([i, best1]);
    if (best2 >= 0) edges.push([i, best2]);
  });
  return edges;
})();

const S0 = 2.3; // 起始缩放：中心神经元与 A 段大小一致
const S1 = 0.0105;
const zoomAt = (t: number) => {
  const k = prog(t, T_ZOOM + 0.1, 2.9, Ease.inOutCubic);
  const drift = prog(t, T_ZOOM + 3.0, 1.7, Ease.linear) * 0.18;
  return Math.exp(lerp(Math.log(S0), Math.log(S1), k) - drift);
};

const drawNetwork = (ctx: CanvasRenderingContext2D, t: number) => {
  const s = zoomAt(t);
  const rot = (t - T_ZOOM) * 0.045;
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  const tx = (p: P2) => ANCHOR_X + (p.x * cr - p.y * sr) * s;
  const ty = (p: P2) => ANCHOR_Y + (p.x * sr + p.y * cr) * s;
  const appear = prog(t, T_ZOOM, 0.35);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  // —— 星系（远景）——
  const galA = prog(Math.log(1 / s), Math.log(1 / 0.6), 2.2, Ease.inOutSine);
  if (galA > 0) {
    const ea = Math.min(0.32, 0.03 + 3000 * s * 0.0002) * galA;
    ctx.strokeStyle = `rgba(110,140,255,${ea})`;
    ctx.lineWidth = Math.max(0.6, Math.min(2, 30 * s));
    ctx.beginPath();
    for (const [a, b] of galEdges) {
      const pa = gal[a];
      const pb = gal[b];
      const ax = tx(pa);
      const ay = ty(pa);
      if (ax < -200 || ax > 1280 || ay < -200 || ay > 2120) continue;
      ctx.moveTo(ax, ay);
      ctx.lineTo(tx(pb), ty(pb));
    }
    ctx.stroke();
    const pr = Math.max(1.2, Math.min(14, NODE_R * s * 1.8));
    for (let i = 0; i < GAL_N; i++) {
      const p = gal[i];
      const x = tx(p);
      const y = ty(p);
      if (x < -20 || x > 1100 || y < -20 || y > 1940) continue;
      const tw = 0.7 + 0.3 * Math.sin(t * 3 + i);
      drawGlow(ctx, p.c ? "180,120,255" : "61,224,255", x, y, pr * (0.8 + p.b), galA * p.b * tw);
    }
  }

  // —— 周围的块（中景）——
  const midA = prog(Math.log(1 / s), Math.log(1 / 0.55), 1.2, Ease.inOutSine);
  if (midA > 0) {
    ctx.strokeStyle = `rgba(61,224,255,${0.16 * midA})`;
    ctx.lineWidth = Math.max(0.6, 3 * s);
    ctx.beginPath();
    for (const off of blockOffsets) {
      for (const [a, b] of sparseEdges) {
        const pa = { x: blockNodes[a].x + off.x, y: blockNodes[a].y + off.y };
        const pb = { x: blockNodes[b].x + off.x, y: blockNodes[b].y + off.y };
        ctx.moveTo(tx(pa), ty(pa));
        ctx.lineTo(tx(pb), ty(pb));
      }
    }
    ctx.stroke();
    for (const off of blockOffsets) {
      for (const n of blockNodes) {
        const p = { x: n.x + off.x, y: n.y + off.y };
        drawGlow(ctx, "120,200,255", tx(p), ty(p), Math.max(1.5, NODE_R * s * 2.2), 0.85 * midA);
      }
    }
  }

  // —— 中心块（近景，全连接）——
  const edgeA = appear * (s > 1 ? 0.1 : 0.22) * (0.6 + 0.4 * prog(t, T_ZOOM, 1.2));
  ctx.strokeStyle = `rgba(61,224,255,${edgeA})`;
  ctx.lineWidth = Math.max(0.6, 2.2 * s);
  ctx.beginPath();
  for (let c = 0; c < COLS - 1; c++) {
    for (let r = 0; r < ROWS; r++) {
      const a = blockNodes[nodeIdx(c, r)];
      const ax = tx(a);
      const ay = ty(a);
      for (let r2 = 0; r2 < ROWS; r2++) {
        const b = blockNodes[nodeIdx(c + 1, r2)];
        ctx.moveTo(ax, ay);
        ctx.lineTo(tx(b), ty(b));
      }
    }
  }
  ctx.stroke();

  // 信号脉冲
  for (let i = 0; i < 70; i++) {
    const c = Math.floor(rnd(`pc${i}`) * (COLS - 1));
    const r1 = Math.floor(rnd(`pr${i}`) * ROWS);
    const r2 = Math.floor(rnd(`pq${i}`) * ROWS);
    const period = 0.9 + rnd(`pp${i}`) * 0.8;
    const ph = ((t + rnd(`ph${i}`) * period) % period) / period;
    const a = blockNodes[nodeIdx(c, r1)];
    const b = blockNodes[nodeIdx(c + 1, r2)];
    const p = { x: lerp(a.x, b.x, ph), y: lerp(a.y, b.y, ph) };
    drawGlow(ctx, "255,230,150", tx(p), ty(p), Math.max(2, 14 * s), appear * Math.sin(ph * Math.PI));
  }

  for (let i = 0; i < blockNodes.length; i++) {
    const n = blockNodes[i];
    const x = tx(n);
    const y = ty(n);
    const isCenter = n.x === 0 && n.y === 0;
    const pulse = 0.75 + 0.25 * Math.sin(t * 4 + i * 0.7);
    const rr = NODE_R * s;
    if (rr > 4) {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#0B1030";
      ctx.strokeStyle = isCenter ? C.gold : C.cyan;
      ctx.lineWidth = Math.max(1.5, 4 * s);
      ctx.globalAlpha = appear;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "lighter";
    }
    drawGlow(ctx, isCenter ? "255,201,77" : "61,224,255", x, y, Math.max(2, rr * 2.4), appear * pulse * (isCenter ? 1 : 0.7));
  }
  ctx.globalCompositeOperation = "source-over";
};

/** 拉远时漂浮的权重数字 */
const FloatingWeights: React.FC<{ t: number }> = ({ t }) => {
  const a = prog(t, 9.7, 0.6);
  if (a <= 0) return null;
  return (
    <>
      {new Array(16).fill(0).map((_, i) => {
        const x = 90 + rnd(`fw${i}`) * 900;
        const y = 300 + rnd(`fy${i}`) * 820;
        const v = (rnd(`fv${i}`) * 4 - 2).toFixed(2);
        const k = prog(t, 9.7 + rnd(`fd${i}`) * 0.8, 0.4);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y - k * 30 - (t - 9.7) * 12,
              fontFamily: MONO,
              fontWeight: 800,
              fontSize: 26 + rnd(`fs${i}`) * 14,
              color: rnd(`fc${i}`) > 0.5 ? "#9FEFFF" : "#CDB4FF",
              opacity: a * k * 0.75,
              textShadow: glow(C.violet, 0.3),
            }}
          >
            {Number(v) < 0 ? `−${Math.abs(Number(v)).toFixed(2)}` : v}
          </div>
        );
      })}
    </>
  );
};

const ScaleCounter: React.FC<{ t: number }> = ({ t }) => {
  const s = zoomAt(t);
  const label = s > 0.75 ? "1 个" : s > 0.07 ? "几百个" : "几百万个";
  const key = s > 0.75 ? 0 : s > 0.07 ? 1 : 2;
  const switchAt = key === 0 ? T_ZOOM : key === 1 ? 8.25 : 9.05;
  const a = prog(t, T_ZOOM + 0.25, 0.3) * (1 - prog(t, 10.4, 0.4));
  if (a <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 280,
        left: 0,
        right: 0,
        textAlign: "center",
        opacity: a,
        fontFamily: SANS,
        fontWeight: 900,
        fontSize: 92,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: -70,
          bottom: -70,
          background: "linear-gradient(180deg, rgba(5,6,10,0) 0%, rgba(5,6,10,0.85) 35%, rgba(5,6,10,0.85) 65%, rgba(5,6,10,0) 100%)",
        }}
      />
      <span style={{ fontSize: 40, color: C.dim, marginRight: 16, verticalAlign: "middle" }}>神经元 ×</span>
      <Holo at={Math.max(switchAt, T_ZOOM + 0.25)} color={key === 2 ? C.gold : C.cyan} key={key}>
        {label}
      </Holo>
    </div>
  );
};

export const Neuron: React.FC = () => {
  const t = useT();

  // A → B：镜头推进神经元
  const push = prog(t, T_PUSH, 0.55, Ease.inCubic);
  const aOpacity = 1 - prog(t, T_PUSH + 0.15, 0.4);
  const formulaOut = 1 - prog(t, T_PUSH - 0.1, 0.3);

  // B 面板：从神经元的位置放大出现，C 前缩回中心
  const bIn = prog(t, T_PUSH + 0.25, 0.55, Ease.outExpo);
  const bOut = prog(t, T_ZOOM - 0.25, 0.4, Ease.inCubic);
  const bScale = (0.12 + 0.88 * bIn) * (1 - 0.96 * bOut);
  const bx = lerp(NX - 540, 0, bIn) + lerp(0, ANCHOR_X - 540, bOut);
  const by = lerp(NY - 900, 0, bIn) + lerp(0, ANCHOR_Y - 900, bOut);
  const bOpacity = clamp(bIn * 1.5) * (1 - prog(t, T_ZOOM - 0.05, 0.25));

  return (
    <AbsoluteFill>
      <Backdrop hue="blue" intensity={0.9} />

      {t < T_PUSH + 0.6 ? (
        <AbsoluteFill
          style={{
            transformOrigin: `${NX}px ${NY}px`,
            transform: `scale(${1 + push * 7})`,
            opacity: aOpacity,
            filter: push > 0 ? `blur(${push * 10}px)` : undefined,
          }}
        >
          <NeuronDiagram t={t} />
        </AbsoluteFill>
      ) : null}
      {t < T_PUSH + 0.3 ? (
        <AbsoluteFill style={{ opacity: formulaOut }}>
          <FormulaBlock t={t} />
        </AbsoluteFill>
      ) : null}

      {t > T_PUSH && t < T_ZOOM + 0.3 ? (
        <AbsoluteFill
          style={{
            transformOrigin: "540px 900px",
            transform: `translate(${bx}px, ${by}px) scale(${bScale})`,
            opacity: bOpacity,
          }}
        >
          <ReluPanel t={t} />
          <ReluTexts t={t} />
        </AbsoluteFill>
      ) : null}

      {t > T_ZOOM - 0.1 ? <CanvasLayer draw={(ctx) => drawNetwork(ctx, t)} /> : null}
      <ScaleCounter t={t} />
      <FloatingWeights t={t} />

      <Caption lines={["一个神经元 =", "[乘法] + [加法] + 一个[开关]"]} at={5.45} until={T_ZOOM - 0.2} />
      <Caption lines={["这些权重，", "就是 AI 的[“参数”]"]} sub="Parameters" at={9.85} hiColor={C.gold} />

      <Flash at={0} peak={0.5} dur={0.25} color="#BFF4FF" />
      <Flash at={T_PUSH + 0.35} peak={0.25} dur={0.2} />
      <Flash at={T_ZOOM} peak={0.3} dur={0.2} color="#BFF4FF" />
    </AbsoluteFill>
  );
};
