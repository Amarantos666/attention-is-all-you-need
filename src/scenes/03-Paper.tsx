import React from "react";
import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { CanvasLayer } from "../components/CanvasLayer";
import { useT } from "../components/SceneShell";
import { Caption, Flash, Holo, Scramble, Slam, Typewriter } from "../components/Text";
import { clamp, Ease, lerp, prog, rnd, shake } from "../lib/anim";
import { C, MONO, SANS, glow, softGlow } from "../theme";

/**
 * 03 一篇论文改变一切（设计时长 10 秒）
 * A 0–3.35s   旧方法 RNN：单词排队逐个处理，越往后越模糊 —— "慢，而且会忘"
 * B 3.35–3.7s 一刀切开
 * C 3.7–6.4s  2017 年，Google 团队的 8 位作者
 * D 6.4–10s   论文标题砸到屏幕中央 + 彩蛋
 */
/** 震撼段（设计秒）：调整时长时保持原速 */
export const KEEP: [number, number][] = [
  [3.3, 3.75],
  [6.35, 7.05],
];
export const DESIGN = 10;

const T_CUT = 3.35;
const T_AUTHORS = 3.75;
const T_TITLE = 6.45;

/* ---------------------------------- A：RNN ---------------------------------- */

const WORDS = ["我", "今天", "早上", "在", "公园", "看到", "一只", "很", "可爱", "的", "猫"];
const STEP = 0.24; // 每处理一个词的时间
const T_RNN = 0.35;
const BOX_Y = 640;

const Rnn: React.FC<{ t: number }> = ({ t }) => {
  const step = (t - T_RNN) / STEP; // 已处理的词数（连续）
  const done = Math.floor(clamp(step, 0, WORDS.length));
  const boxPulse = step > 0 && step < WORDS.length ? Math.pow(1 - (step % 1), 3) : 0;
  return (
    <AbsoluteFill>
      {/* 标题 */}
      <div style={{ position: "absolute", top: 290, left: 0, right: 0, textAlign: "center", opacity: prog(t, 0, 0.3) }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 56, color: C.white, textShadow: softGlow() }}>
          旧方法：<span style={{ fontFamily: MONO, color: "#FF8DA0" }}>RNN</span>
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 30, color: C.dim, marginTop: 8 }}>循环神经网络 · 一次只能读一个词</div>
      </div>

      {/* 记忆条：处理过的词越来越模糊 */}
      <div style={{ position: "absolute", top: 450, left: 60, right: 60, height: 80, display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
        {WORDS.slice(0, done).map((w, i) => {
          const age = done - 1 - i;
          const fadeK = clamp(age / 6);
          return (
            <span
              key={i}
              style={{
                fontFamily: SANS,
                fontWeight: 900,
                fontSize: 40,
                color: C.white,
                opacity: 1 - 0.85 * fadeK,
                filter: `blur(${fadeK * 7}px)`,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 528, left: 0, right: 0, textAlign: "center", fontFamily: SANS, fontSize: 26, color: "rgba(255,141,160,0.8)", opacity: prog(t, 1.0, 0.3) }}>
        ← 越早读到的词，记得越模糊
      </div>

      {/* 处理器 */}
      <div
        style={{
          position: "absolute",
          left: 540 - 150,
          top: BOX_Y,
          width: 300,
          height: 150,
          borderRadius: 26,
          border: `4px solid #FF8DA0`,
          background: `rgba(255,77,106,${0.08 + boxPulse * 0.25})`,
          boxShadow: `0 0 ${20 + boxPulse * 50}px rgba(255,77,106,${0.4 + boxPulse * 0.5})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: MONO,
          fontWeight: 800,
          fontSize: 54,
          color: "#FFC2CC",
        }}
      >
        RNN
        <div style={{ position: "absolute", left: -175, top: 52, width: 150, textAlign: "right", fontFamily: SANS, fontWeight: 500, fontSize: 30, color: C.dim }}>
          第 {Math.max(1, Math.min(WORDS.length, done + 1))} 步
        </div>
      </div>
      {/* 循环箭头 */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <path d={`M 690 ${BOX_Y + 40} C 800 ${BOX_Y - 30}, 800 ${BOX_Y + 180}, 690 ${BOX_Y + 110}`} fill="none" stroke="#FF8DA0" strokeWidth={4} strokeDasharray="10 8" opacity={0.7} />
      </svg>

      {/* 排队的词 */}
      {WORDS.map((w, i) => {
        const pos = i - step; // >0 在排队，<=0 已被吸入
        if (pos < -0.6) return null;
        const y = BOX_Y + 300 + Math.max(0, pos) * 96 + (pos < 0 ? pos * 200 : 0);
        const k = pos < 0 ? 1 + pos / 0.6 : 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 540,
              top: y,
              transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * k})`,
              opacity: k * prog(t, 0.1 + i * 0.03, 0.25) * (y > 1480 ? 0 : 1),
              fontFamily: SANS,
              fontWeight: 900,
              fontSize: 54,
              color: C.white,
              padding: "6px 26px",
              borderRadius: 16,
              border: "2px solid rgba(255,255,255,0.25)",
              background: "rgba(20,24,40,0.8)",
            }}
          >
            {w}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ---------------------------------- B：一刀切开 ---------------------------------- */

// 刀口：从 (0, 55%) 到 (100%, 31%) 的斜线
const CUT_Y0 = 1920 * 0.55;
const CUT_Y1 = 1920 * 0.31;
const cutY = (x: number) => CUT_Y0 + ((CUT_Y1 - CUT_Y0) * x) / 1080;
const CUT_LEN = Math.hypot(1080, CUT_Y1 - CUT_Y0);
// 刀口法线（指向下半部分）
const NX = -(CUT_Y1 - CUT_Y0) / CUT_LEN;
const NY = 1080 / CUT_LEN;

/* ---------------------------------- C：作者 ---------------------------------- */

const AUTHORS = [
  "Ashish Vaswani",
  "Noam Shazeer",
  "Niki Parmar",
  "Jakob Uszkoreit",
  "Llion Jones",
  "Aidan N. Gomez",
  "Łukasz Kaiser",
  "Illia Polosukhin",
];
const T_NAMES = T_AUTHORS + 0.55;
const NAME_DUR = 0.2;
const T_GRID = T_NAMES + AUTHORS.length * NAME_DUR + 0.05;

const Authors: React.FC<{ t: number }> = ({ t }) => {
  const titleHit = prog(t, T_TITLE, 0.4, Ease.outCubic);
  const idx = Math.floor((t - T_NAMES) / NAME_DUR);
  const grid = prog(t, T_GRID, 0.35, Ease.outCubic);
  return (
    <AbsoluteFill style={{ opacity: 1 - 0.75 * titleHit, filter: titleHit > 0 ? `blur(${titleHit * 6}px)` : undefined, transform: `scale(${1 + titleHit * 0.25})` }}>
      <div style={{ position: "absolute", top: 400, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 120, color: C.cyan, textShadow: glow(C.cyan, 0.7), lineHeight: 1 }}>
          <Scramble text="2017" at={T_AUTHORS} dur={0.35} />
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 52, color: C.white, marginTop: 22, textShadow: softGlow() }}>
          <Typewriter text="Google 团队的 8 位作者" at={T_AUTHORS + 0.2} cps={26} cursor={false} />
        </div>
      </div>
      {/* 名字快速闪过 */}
      {grid < 1 && idx >= 0 && idx < AUTHORS.length ? (
        <div
          style={{
            position: "absolute",
            top: 900,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: SANS,
            fontWeight: 900,
            fontSize: 84,
            color: C.white,
            textShadow: `-3px 0 rgba(255,40,120,0.7), 3px 0 rgba(40,255,255,0.7), ${glow(C.violet, 0.5)}`,
            transform: `scale(${1.15 - 0.15 * prog((t - T_NAMES) % NAME_DUR, 0, 0.08, Ease.outCubic)})`,
            opacity: 1 - grid,
            whiteSpace: "nowrap",
          }}
        >
          {AUTHORS[idx]}
          <div style={{ fontFamily: MONO, fontSize: 30, color: C.dim, marginTop: 8, textShadow: "none" }}>
            {idx + 1} / 8
          </div>
        </div>
      ) : null}
      {/* 汇总成名单 */}
      {grid > 0
        ? AUTHORS.map((a, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const k = prog(t, T_GRID + i * 0.03, 0.3, Ease.outCubic);
            return (
              <div
                key={a}
                style={{
                  position: "absolute",
                  left: col === 0 ? 90 : 560,
                  top: 760 + row * 78,
                  width: 430,
                  fontFamily: SANS,
                  fontWeight: 900,
                  fontSize: 40,
                  color: "rgba(230,236,255,0.92)",
                  opacity: k,
                  transform: `translateY(${(1 - k) * 30}px)`,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontFamily: MONO, color: C.cyan, fontSize: 28, marginRight: 12 }}>0{i + 1}</span>
                {a}
              </div>
            );
          })
        : null}
    </AbsoluteFill>
  );
};

/* ---------------------------------- D：标题 ---------------------------------- */

const debris = new Array(60).fill(0).map((_, i) => ({
  ang: rnd(`da${i}`) * Math.PI * 2,
  sp: 400 + rnd(`ds${i}`) * 1400,
  w: 8 + rnd(`dw${i}`) * 40,
  h: 4 + rnd(`dh${i}`) * 18,
  rot: rnd(`dr${i}`) * 6,
  col: rnd(`dc${i}`) > 0.5 ? "61,224,255" : "220,230,255",
}));

const drawDebris = (ctx: CanvasRenderingContext2D, t: number) => {
  const dt = t - T_TITLE - 0.12;
  if (dt < 0 || dt > 1.5) return;
  ctx.globalCompositeOperation = "lighter";
  for (const d of debris) {
    const dist = d.sp * (1 - Math.exp(-dt * 3)) / 3;
    const x = 540 + Math.cos(d.ang) * dist;
    const y = 900 + Math.sin(d.ang) * dist + 200 * dt * dt;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(d.rot + dt * 4);
    ctx.fillStyle = `rgba(${d.col},${Math.max(0, 1 - dt / 1.3)})`;
    ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
    ctx.restore();
  }
  ctx.globalCompositeOperation = "source-over";
};

const Title: React.FC<{ t: number }> = ({ t }) => {
  if (t < T_TITLE) return null;
  const ring = prog(t, T_TITLE + 0.12, 0.6, Ease.outCubic);
  const lines = ["Attention", "Is All", "You Need"];
  return (
    <AbsoluteFill>
      {/* 冲击波 */}
      {ring < 1 ? (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <circle cx={540} cy={900} r={60 + ring * 900} fill="none" stroke={C.cyan} strokeWidth={30 * (1 - ring) + 1} opacity={1 - ring} style={{ filter: `drop-shadow(0 0 20px ${C.cyan})` }} />
          <circle cx={540} cy={900} r={40 + ring * 600} fill="none" stroke="#fff" strokeWidth={8 * (1 - ring)} opacity={(1 - ring) * 0.7} />
        </svg>
      ) : null}
      {/* 背后的光束 */}
      <div
        style={{
          position: "absolute",
          left: 540 - 6,
          top: 0,
          width: 12,
          height: 1920,
          background: "linear-gradient(180deg, rgba(61,224,255,0) 0%, rgba(61,224,255,0.7) 47%, rgba(61,224,255,0) 100%)",
          filter: "blur(8px)",
          opacity: prog(t, T_TITLE + 0.1, 0.3) * (0.4 + 0.2 * Math.sin(t * 6)),
          transform: `scaleX(${1 + 30 * prog(t, T_TITLE + 0.1, 0.5)})`,
        }}
      />
      <Slam at={T_TITLE} dur={0.18} from={6} style={{ position: "absolute", top: 640, left: 0, right: 0, textAlign: "center" }}>
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              fontFamily: SANS,
              fontWeight: 900,
              fontSize: 132,
              lineHeight: 1.08,
              color: C.white,
              letterSpacing: -1,
              textShadow: `0 0 20px rgba(140,220,255,0.9), 0 0 60px rgba(61,224,255,0.6), 0 0 120px rgba(155,92,255,0.5)`,
            }}
          >
            {l}
          </div>
        ))}
      </Slam>
      <div style={{ position: "absolute", top: 1110, left: 0, right: 0, textAlign: "center", fontFamily: MONO, fontSize: 30, color: C.cyan }}>
        <Holo at={T_TITLE + 0.55}>arXiv:1706.03762 · NeurIPS 2017</Holo>
      </div>
      {/* 彩蛋 */}
      <div
        style={{
          position: "absolute",
          top: 1250,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: prog(t, 7.9, 0.4),
          transform: `translateY(${(1 - prog(t, 7.9, 0.4, Ease.outBack)) * 24}px)`,
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontFamily: SANS,
            fontWeight: 500,
            fontSize: 32,
            color: "#FFE3A3",
            padding: "12px 30px",
            borderRadius: 30,
            lineHeight: 1.5,
            border: "2px solid rgba(255,201,77,0.6)",
            background: "rgba(40,30,10,0.55)",
          }}
        >
          ♪ 彩蛋：作者 Llion Jones 说，
          <br />
          标题致敬了披头士的《All You Need Is Love》
        </span>
      </div>
    </AbsoluteFill>
  );
};

export const Paper: React.FC = () => {
  const t = useT();
  const cut = prog(t, T_CUT, 0.12, Ease.outCubic); // 刀光划过
  const split = prog(t, T_CUT + 0.08, 0.4, Ease.inCubic); // 两半分开
  const sh = shake(t, T_TITLE + 0.05, 0.6, 30, 7);
  // 两半沿刀口法线方向分开
  const sep = split * 900;
  const nx = NX;
  const ny = NY;
  const showRnn = t < T_CUT + 0.6;
  const rnnLayer = (half: 0 | 1) => (
    <AbsoluteFill
      style={{
        clipPath: half === 0 ? "polygon(0 0, 100% 0, 100% 31%, 0 55%)" : "polygon(0 55%, 100% 31%, 100% 100%, 0 100%)",
        transform: `translate(${(half === 0 ? -1 : 1) * nx * sep}px, ${(half === 0 ? -1 : 1) * ny * sep}px) rotate(${(half === 0 ? -1 : 1) * split * 6}deg)`,
        opacity: 1 - split * 0.6,
      }}
    >
      <Backdrop hue="violet" intensity={0.8} dust={40} />
      <Rnn t={t} />
      <Caption lines={["[慢]，而且[会忘]"]} at={2.0} y={1430} hiColor="#FF8DA0" size={80} />
    </AbsoluteFill>
  );

  return (
    <AbsoluteFill>
      <Backdrop hue="blue" intensity={0.9} />
      <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)` }}>
        {t >= T_AUTHORS - 0.1 ? <Authors t={t} /> : null}
        <Title t={t} />
        <CanvasLayer draw={(ctx) => drawDebris(ctx, t)} />
      </AbsoluteFill>

      {showRnn ? (
        <>
          {rnnLayer(0)}
          {rnnLayer(1)}
        </>
      ) : null}

      {/* 刀光 */}
      {t >= T_CUT && t < T_CUT + 0.5 ? (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <line
            x1={-100}
            y1={cutY(-100)}
            x2={lerp(-100, 1180, cut)}
            y2={cutY(lerp(-100, 1180, cut))}
            stroke="#fff"
            strokeWidth={10 * (1 - prog(t, T_CUT + 0.15, 0.35))}
            style={{ filter: `drop-shadow(0 0 16px ${C.cyan}) drop-shadow(0 0 40px #fff)` }}
          />
        </svg>
      ) : null}
      <Flash at={T_CUT + 0.05} peak={0.55} dur={0.18} />
      <Flash at={T_TITLE + 0.1} peak={0.7} dur={0.25} />
    </AbsoluteFill>
  );
};
