import React from "react";
import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { CanvasLayer, drawGlow, hexToRgb } from "../components/CanvasLayer";
import { useT } from "../components/SceneShell";
import { Caption, Flash, Slam } from "../components/Text";
import { clamp, Ease, lerp, prog, rnd } from "../lib/anim";
import { C, MONO, SANS, glow, softGlow } from "../theme";

/**
 * 07 猜下一个词（设计时长 14 秒）
 * A 0–4.5s    "今天天气很" 流入塔中，塔一层层亮起，塔顶射出概率柱状图，"好" 飞出接到句子后面
 * B 4.5–7.5s  新句子再次流入，循环加速 3 次
 * C 7.5–11.2s 温度旋钮：调低变尖，调高变平
 * D 11.2–14s  "ChatGPT 的每一句话，都是一个词一个词猜出来的"
 */
/** 震撼段（设计秒）：调整时长时保持原速 */
export const KEEP: [number, number][] = [
  [4.5, 7.4],
  [11.2, 11.8],
];
export const DESIGN = 14;

const T_TEMP = 7.6;
const T_END = 11.2;

type Cand = { w: string; p: number };
// 各轮的候选词与概率（示意）
const ROUNDS: { prefix: string; cands: Cand[] }[] = [
  {
    prefix: "今天天气很",
    cands: [
      { w: "好", p: 0.38 },
      { w: "热", p: 0.21 },
      { w: "冷", p: 0.15 },
      { w: "不", p: 0.08 },
      { w: "闷", p: 0.05 },
      { w: "差", p: 0.03 },
      { w: "棒", p: 0.02 },
    ],
  },
  {
    prefix: "今天天气很好",
    cands: [
      { w: "，", p: 0.52 },
      { w: "！", p: 0.18 },
      { w: "。", p: 0.12 },
      { w: "啊", p: 0.06 },
      { w: "呀", p: 0.04 },
      { w: "的", p: 0.03 },
      { w: "哦", p: 0.02 },
    ],
  },
  {
    prefix: "今天天气很好，",
    cands: [
      { w: "适合", p: 0.31 },
      { w: "我", p: 0.22 },
      { w: "阳光", p: 0.14 },
      { w: "我们", p: 0.1 },
      { w: "天空", p: 0.06 },
      { w: "出", p: 0.04 },
      { w: "风", p: 0.03 },
    ],
  },
  {
    prefix: "今天天气很好，适合",
    cands: [
      { w: "出去", p: 0.4 },
      { w: "出门", p: 0.25 },
      { w: "散步", p: 0.12 },
      { w: "去", p: 0.08 },
      { w: "晒", p: 0.05 },
      { w: "运动", p: 0.03 },
      { w: "读", p: 0.02 },
    ],
  },
];
const FINAL = "今天天气很好，适合出去";

// 每一轮的时间：[开始, 时长]
const ROUND_T: [number, number][] = [
  [0.85, 3.65],
  [4.5, 1.2],
  [5.7, 0.8],
  [6.5, 0.6],
];

// 长尾：几万个候选词里剩下的部分（示意）
const TAIL_N = 90;
const TAIL = new Array(TAIL_N).fill(0).map((_, i) => 0.012 * Math.pow(0.955, i) * (0.7 + 0.6 * rnd(`tl${i}`)));

/* -------------------------------- 布局 -------------------------------- */

const BASE_Y = 760;
// 概率 = 1 时的高度（温度演示时缩小，避免冲出画面）
const barH = (t: number) => lerp(820, 470, prog(t, T_TEMP - 0.3, 0.4));
const BAR_X0 = 70;
const BAR_W = 78;
const BAR_GAP = 16;
const TAIL_X0 = BAR_X0 + 7 * (BAR_W + BAR_GAP) + 6;
const TOWER_Y0 = 1210;
const LAYERS = 6;
const LAYER_DY = 64;
const TEXT_Y = 1325;

/* -------------------------------- 状态 -------------------------------- */

const roundAt = (t: number) => {
  let r = 0;
  ROUND_T.forEach(([s], i) => {
    if (t >= s) r = i;
  });
  const [s, d] = ROUND_T[r];
  return { r, u: clamp((t - s) / d) };
};

// 每一轮内部的相位（占该轮时长的比例）
const PH = { flow: [0, 0.22], layers: [0.12, 0.42], bars: [0.42, 0.62], flash: [0.66, 0.76], fly: [0.76, 1] };
const ph = (u: number, [a, b]: number[]) => clamp((u - a) / (b - a));

// 第 0 轮节奏单独设定（讲解用，较慢）
const round0 = (t: number) => {
  const s = ROUND_T[0][0];
  return {
    flow: prog(t, s, 0.5, Ease.inOutCubic),
    layers: prog(t, s + 0.25, 0.9, Ease.linear),
    bars: prog(t, s + 1.2, 0.7, Ease.outCubic),
    flash: prog(t, s + 2.7, 0.25),
    fly: prog(t, s + 2.95, 0.6, Ease.inOutCubic),
  };
};

const phases = (t: number) => {
  const { r, u } = roundAt(t);
  if (r === 0) return { r, ...round0(t) };
  return {
    r,
    flow: Ease.inOutCubic(ph(u, PH.flow)),
    layers: ph(u, PH.layers),
    bars: Ease.outCubic(ph(u, PH.bars)),
    flash: ph(u, PH.flash),
    fly: Ease.inOutCubic(ph(u, PH.fly)),
  };
};

/** 温度：p_i^(1/T) 再归一化 */
const withTemp = (cands: Cand[], T: number) => {
  const all = [...cands.map((c) => c.p), ...TAIL];
  const pw = all.map((p) => Math.pow(p, 1 / T));
  const s = pw.reduce((a, b) => a + b, 0);
  return pw.map((v) => v / s);
};

const tempAt = (t: number) => {
  const down = prog(t, T_TEMP + 0.7, 0.8, Ease.inOutCubic);
  const up = prog(t, T_TEMP + 2.2, 0.9, Ease.inOutCubic);
  return lerp(lerp(1, 0.35, down), 2.2, up);
};

/* -------------------------------- 绘制 -------------------------------- */

const barX = (i: number) => BAR_X0 + i * (BAR_W + BAR_GAP);

const currentProbs = (t: number) => {
  if (t >= T_TEMP) return withTemp(ROUNDS[0].cands, tempAt(t));
  const s = phases(t);
  const cur = [...ROUNDS[s.r].cands.map((c) => c.p), ...TAIL];
  if (s.r === 0) return cur.map((p) => p * s.bars);
  const prev = [...ROUNDS[s.r - 1].cands.map((c) => c.p), ...TAIL];
  // 新一轮：旧柱子先缩下去，再长出新的
  const k = s.bars;
  return cur.map((p, i) => (k < 0.5 ? prev[i] * (1 - k * 2) : p * (k - 0.5) * 2));
};

const drawScene = (ctx: CanvasRenderingContext2D, t: number) => {
  const towerA = 1 - prog(t, T_TEMP - 0.2, 0.4);
  const s = phases(t);
  ctx.globalCompositeOperation = "lighter";
  // —— 塔 ——
  if (towerA > 0) {
    for (let i = 0; i < LAYERS; i++) {
      const y = TOWER_Y0 - i * LAYER_DY;
      const lit = clamp(s.layers * LAYERS - i);
      const fade = t >= T_TEMP ? 0 : lit * (1 - s.fly * 0.6);
      ctx.fillStyle = `rgba(155,92,255,${(0.12 + 0.35 * fade) * towerA})`;
      ctx.strokeStyle = `rgba(190,150,255,${(0.5 + 0.5 * fade) * towerA})`;
      ctx.lineWidth = 3;
      const w = 440;
      ctx.beginPath();
      ctx.roundRect(540 - w / 2, y - 26, w, 52, 12);
      ctx.fill();
      ctx.stroke();
      if (fade > 0.05) drawGlow(ctx, "180,140,255", 540, y, 160, fade * 0.35 * towerA);
    }
    // 流入的粒子
    for (let k = 0; k < 40; k++) {
      const u = (s.flow * 1.3 - rnd(`fl${k}`) * 0.3);
      if (u <= 0 || u >= 1) continue;
      const x = 540 + (rnd(`fx${k}`) - 0.5) * 360 * (1 - u * 0.6);
      const y = lerp(TEXT_Y - 50, TOWER_Y0 + 30, u);
      drawGlow(ctx, "61,224,255", x, y, 10, towerA * Math.sin(u * Math.PI));
    }
    // 塔顶射向柱状图的光束
    const beam = s.bars > 0 && s.bars < 1 ? Math.sin(s.bars * Math.PI) : 0;
    if (beam > 0) {
      const g = ctx.createLinearGradient(0, TOWER_Y0 - LAYERS * LAYER_DY, 0, BASE_Y - 420);
      g.addColorStop(0, `rgba(190,150,255,${0.6 * beam * towerA})`);
      g.addColorStop(1, `rgba(190,150,255,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(540 - 200, TOWER_Y0 - LAYERS * LAYER_DY + 30);
      ctx.lineTo(540 + 200, TOWER_Y0 - LAYERS * LAYER_DY + 30);
      ctx.lineTo(1080, BASE_Y - 420);
      ctx.lineTo(0, BASE_Y - 420);
      ctx.closePath();
      ctx.fill();
    }
  }
  // —— 长尾细柱 ——
  const probs = currentProbs(t);
  const chartA = t < T_END ? 1 : 1 - prog(t, T_END, 0.3);
  for (let i = 0; i < TAIL_N; i++) {
    const p = probs[7 + i];
    const h = Math.max(1, p * barH(t));
    const x = TAIL_X0 + i * 7;
    if (x > 1080) break;
    ctx.fillStyle = `rgba(61,224,255,${0.55 * chartA})`;
    ctx.fillRect(x, BASE_Y - h, 4, h);
  }
  ctx.globalCompositeOperation = "source-over";
};

/* -------------------------------- DOM 元素 -------------------------------- */

const Bars: React.FC<{ t: number }> = ({ t }) => {
  const probs = currentProbs(t);
  const s = phases(t);
  const r = t >= T_TEMP ? 0 : s.r;
  const cands = ROUNDS[r].cands;
  const chartA = (t < T_END ? 1 : 1 - prog(t, T_END, 0.3)) * prog(t, 1.9, 0.3);
  const labelsSwitch = t < T_TEMP && s.r > 0 && s.bars < 0.5 ? ROUNDS[s.r - 1].cands : cands;
  if (chartA <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: chartA }}>
      {/* 基线 */}
      <div style={{ position: "absolute", left: 50, right: 0, top: BASE_Y, height: 3, background: "rgba(160,180,255,0.5)" }} />
      {labelsSwitch.map((c, i) => {
        const p = probs[i];
        const h = Math.max(2, p * barH(t));
        const top = i === 0 && t < T_TEMP;
        const flash = top ? Math.sin(s.flash * Math.PI) : 0;
        const col = i === 0 ? C.gold : C.cyan;
        const flying = top && s.fly > 0;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: barX(i),
                top: BASE_Y - h,
                width: BAR_W,
                height: h,
                borderRadius: "10px 10px 0 0",
                background: `linear-gradient(180deg, ${col}, rgba(${hexToRgb(col)},0.25))`,
                boxShadow: `0 0 ${20 + 60 * flash}px rgba(${hexToRgb(col)},${0.5 + 0.5 * flash})`,
                filter: flash > 0 ? `brightness(${1 + flash * 1.2})` : undefined,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: barX(i) + BAR_W / 2,
                top: BASE_Y - h - 46,
                transform: "translateX(-50%)",
                fontFamily: MONO,
                fontWeight: 800,
                fontSize: 28,
                color: col,
                whiteSpace: "nowrap",
                opacity: clamp(p * 40),
              }}
            >
              {Math.round(p * 100)}%
            </div>
            <div
              style={{
                position: "absolute",
                left: barX(i) + BAR_W / 2,
                top: BASE_Y + 14,
                transform: "translateX(-50%)",
                fontFamily: SANS,
                fontWeight: 900,
                fontSize: c.w.length > 1 ? 34 : 44,
                color: i === 0 ? C.gold : C.white,
                whiteSpace: "nowrap",
                opacity: flying ? 0.3 : 1,
              }}
            >
              {c.w}
            </div>
          </React.Fragment>
        );
      })}
      <div style={{ position: "absolute", left: TAIL_X0, top: BASE_Y - 200, fontFamily: SANS, fontWeight: 500, fontSize: 26, color: "rgba(160,230,255,0.85)", lineHeight: 1.4 }}>
        长尾 →
        <br />
        词表里还有
        <br />
        几万个候选词
      </div>
    </AbsoluteFill>
  );
};

/** 生成中的句子（底部） */
const Sentence: React.FC<{ t: number }> = ({ t }) => {
  const s = phases(t);
  const out = prog(t, T_END - 0.1, 0.3);
  let text = ROUNDS[s.r].prefix;
  if (t >= T_TEMP) text = ROUNDS[0].prefix;
  else if (s.r === ROUNDS.length - 1 && s.fly >= 1) text = FINAL;
  const typed = t < 0.9 ? Math.floor(clamp((t - 0.2) * 9, 0, 5)) : Array.from(text).length;
  const chars = Array.from(text).slice(0, typed);
  // 正在飞出的词
  const flyTok = t < T_TEMP ? ROUNDS[s.r].cands[0].w : "";
  const flyK = t < T_TEMP && !(s.r === ROUNDS.length - 1 && s.fly >= 1) ? s.fly : 0;
  const size = 72;
  const textW = chars.length * size;
  const endX = 540 + textW / 2;
  const fromX = barX(0) + BAR_W / 2;
  const fromY = BASE_Y + 40;
  const fx = lerp(fromX, endX + size * 0.5 * flyTok.length, flyK);
  const fy = lerp(fromY, TEXT_Y, flyK) - Math.sin(flyK * Math.PI) * 180;
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: TEXT_Y,
          left: 0,
          right: 0,
          textAlign: "center",
          transform: "translateY(-50%)",
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: size,
          color: C.white,
          textShadow: softGlow(),
          opacity: 1 - out,
          whiteSpace: "nowrap",
        }}
      >
        {chars.join("")}
        <span style={{ display: "inline-block", width: 6, height: size * 0.9, background: C.cyan, marginLeft: 8, verticalAlign: "middle", opacity: Math.floor(t * 2.5) % 2 ? 1 : 0.2, boxShadow: `0 0 12px ${C.cyan}` }} />
      </div>
      {flyK > 0 && flyK < 1 ? (
        <div
          style={{
            position: "absolute",
            left: fx,
            top: fy,
            transform: `translate(-50%, -50%) scale(${1.4 - 0.4 * flyK})`,
            fontFamily: SANS,
            fontWeight: 900,
            fontSize: size,
            color: C.gold,
            textShadow: glow(C.gold, 0.8),
            whiteSpace: "nowrap",
          }}
        >
          {flyTok}
        </div>
      ) : null}
    </>
  );
};

/** 温度旋钮 */
const Knob: React.FC<{ t: number }> = ({ t }) => {
  const a = prog(t, T_TEMP, 0.4) * (1 - prog(t, T_END, 0.3));
  if (a <= 0) return null;
  const T = tempAt(t);
  // 0.2 → -135°, 2.4 → +135°
  const ang = lerp(-135, 135, clamp((T - 0.2) / 2.2));
  const col = T < 0.7 ? C.cyan : T > 1.5 ? C.magenta : C.gold;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 880, textAlign: "center", opacity: a }}>
      <svg width={300} height={260} viewBox="-150 -140 300 260" style={{ overflow: "visible" }}>
        {new Array(23).fill(0).map((_, i) => {
          const d = lerp(-135, 135, i / 22);
          const r1 = 112;
          const r2 = i % 5 === 0 ? 132 : 124;
          const rad = ((d - 90) * Math.PI) / 180;
          return <line key={i} x1={Math.cos(rad) * r1} y1={Math.sin(rad) * r1} x2={Math.cos(rad) * r2} y2={Math.sin(rad) * r2} stroke="rgba(200,210,255,0.6)" strokeWidth={3} />;
        })}
        <circle r={95} fill="#10142A" stroke={col} strokeWidth={5} style={{ filter: `drop-shadow(0 0 16px ${col})` }} />
        <g transform={`rotate(${ang})`}>
          <line x1={0} y1={-20} x2={0} y2={-80} stroke={col} strokeWidth={10} strokeLinecap="round" />
        </g>
        <text x={-140} y={110} fill={C.cyan} fontFamily={SANS} fontWeight={900} fontSize={26}>
          稳
        </text>
        <text x={118} y={110} fill={C.magenta} fontFamily={SANS} fontWeight={900} fontSize={26}>
          野
        </text>
      </svg>
      <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 46, color: C.white, marginTop: -6 }}>
        温度 <span style={{ fontFamily: MONO, color: col, textShadow: glow(col, 0.4) }}>T = {T.toFixed(1)}</span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 26, color: C.dim, marginTop: 4 }}>Temperature</div>
    </div>
  );
};

/** 结尾背景里飞快生成的文字 */
const STREAM = ["今天天气很好，适合出去走走。", "Transformer 让模型一次看完整句话。", "我可以帮你写一首关于秋天的诗。", "一只猫坐在窗台上晒太阳。", "下面是这个问题的三种解法：", "Once upon a time, there was a robot", "这段代码的作用是读取文件并统计行数。", "明天会下雨吗？我来帮你查一下。"];
const StreamBg: React.FC<{ t: number }> = ({ t }) => {
  const a = prog(t, T_END, 0.4);
  if (a <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: a * 0.13 }}>
      {new Array(18).fill(0).map((_, i) => {
        const line = STREAM[i % STREAM.length];
        const chars = Array.from(line);
        const n = Math.floor(clamp((t - T_END - rnd(`sb${i}`) * 0.8) * 22, 0, chars.length));
        return (
          <div key={i} style={{ position: "absolute", left: 60 + (i % 2) * 40, top: 230 + i * 72, fontFamily: SANS, fontWeight: 500, fontSize: 34, color: i % 3 === 0 ? C.cyan : "#C9D4FF", whiteSpace: "nowrap" }}>
            {chars.slice(0, n).join("")}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const NextToken: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill>
      <Backdrop hue="violet" intensity={0.9} />
      <div
        style={{
          position: "absolute",
          top: 250,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 40,
          color: C.white,
          opacity: prog(t, 1.9, 0.3) * (1 - prog(t, T_END, 0.3)),
        }}
      >
        {t < T_TEMP ? "塔顶输出：下一个词的概率" : "同一句话，换个温度"}
        <span style={{ marginLeft: 14, fontFamily: SANS, fontWeight: 500, fontSize: 24, color: "#FFE3A3", border: "1.5px solid rgba(255,201,77,0.6)", borderRadius: 20, padding: "2px 12px", verticalAlign: "middle" }}>示意</span>
      </div>
      <StreamBg t={t} />
      <CanvasLayer draw={(ctx) => drawScene(ctx, t)} />
      <Bars t={t} />
      <Sentence t={t} />
      <Knob t={t} />

      <Caption lines={["挑出概率最高的，接到句子后面"]} at={ROUND_T[0][0] + 2.6} until={4.4} y={1440} size={56} />
      <Caption lines={["然后，再猜下一个……"]} at={4.6} until={T_TEMP - 0.25} y={1440} size={56} hiColor={C.gold} />
      <Caption lines={["调低：总挑[最稳]的词"]} at={T_TEMP + 0.9} until={T_TEMP + 2.1} y={1440} size={60} hiColor={C.cyan} />
      <Caption lines={["调高：更有[创意]，也更容易[胡说]"]} at={T_TEMP + 2.4} until={T_END - 0.1} y={1440} size={56} hiColor={C.magenta} />

      {t >= T_END ? (
        <AbsoluteFill>
          <div style={{ position: "absolute", left: 0, right: 0, top: 690, height: 400, background: "linear-gradient(180deg, rgba(5,6,10,0), rgba(5,6,10,0.85) 25%, rgba(5,6,10,0.85) 75%, rgba(5,6,10,0))", opacity: prog(t, T_END, 0.3) }} />
          <Slam at={T_END + 0.05} from={2.6} style={{ position: "absolute", top: 760, left: 0, right: 0, textAlign: "center" }}>
            <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 70, color: C.white, lineHeight: 1.35, textShadow: softGlow() }}>
              ChatGPT 的每一句话，
              <br />
              都是一个词一个词
              <span style={{ color: C.gold, textShadow: glow(C.gold, 0.8) }}>猜</span>
              出来的
            </div>
          </Slam>
          <div style={{ position: "absolute", top: 1010, left: 0, right: 0, textAlign: "center", fontFamily: SANS, fontWeight: 500, fontSize: 30, color: C.dim, opacity: prog(t, T_END + 0.8, 0.4) }}>
            （准确说：是一个 token 一个 token 地猜）
          </div>
        </AbsoluteFill>
      ) : null}

      <Flash at={T_END + 0.05} peak={0.5} dur={0.2} />
    </AbsoluteFill>
  );
};
