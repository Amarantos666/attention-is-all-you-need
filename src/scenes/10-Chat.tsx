import React from "react";
import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { hexToRgb } from "../components/CanvasLayer";
import { useT } from "../components/SceneShell";
import { Caption, Flash } from "../components/Text";
import { clamp, Ease, lerp, prog } from "../lib/anim";
import { C, MONO, SANS, glow, softGlow } from "../theme";

/**
 * 10 从会接话到会聊天（设计时长 11 秒）
 * A 0–3.3s   预训练后的模型只会续写文字
 * B 3.3–6.4s 第二步：指令微调——人类写示范问答
 * C 6.4–9.6s 第三步：RLHF——AI 给出多个回答，人类排序，模型朝"人类更喜欢"的方向调整
 * D 9.6–11s  "从一个续写机器，变成一个助手"
 */
/** 震撼段（设计秒）：调整时长时保持原速 */
export const KEEP: [number, number][] = [[9.6, 10.25]];
export const DESIGN = 11;

const T_SFT = 3.3;
const T_RLHF = 6.4;
const T_END = 9.6;

const Step: React.FC<{ t: number; at: number; until: number; n: string; title: string; en: string; color: string }> = ({ t, at, until, n, title, en, color }) => {
  const a = prog(t, at, 0.3) * (1 - prog(t, until, 0.25));
  if (a <= 0) return null;
  const k = prog(t, at, 0.4, Ease.outCubic);
  return (
    <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", opacity: a, transform: `translateY(${(1 - k) * 30}px)` }}>
      <div style={{ display: "inline-block", fontFamily: SANS, fontWeight: 900, fontSize: 30, color: "#0A0C18", background: color, borderRadius: 30, padding: "4px 22px", boxShadow: `0 0 24px ${color}` }}>{n}</div>
      <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 62, color: C.white, marginTop: 14, textShadow: softGlow() }}>{title}</div>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 30, color }}>{en}</div>
    </div>
  );
};

const Bubble: React.FC<{
  side: "user" | "ai";
  text: string;
  y: number;
  at: number;
  t: number;
  color?: string;
  typing?: number; // 每秒字数
  width?: number;
}> = ({ side, text, y, at, t, color, typing, width = 760 }) => {
  const k = prog(t, at, 0.3, Ease.outBack);
  if (k <= 0) return null;
  const chars = Array.from(text);
  const n = typing ? Math.floor(clamp((t - at - 0.15) * typing, 0, chars.length)) : chars.length;
  const col = color ?? (side === "user" ? C.cyan : C.violet);
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        [side === "user" ? "right" : "left"]: 70,
        maxWidth: width,
        transform: `scale(${k})`,
        transformOrigin: side === "user" ? "right top" : "left top",
        opacity: clamp(k),
        padding: "18px 28px",
        borderRadius: side === "user" ? "28px 28px 6px 28px" : "28px 28px 28px 6px",
        border: `3px solid ${col}`,
        background: `rgba(${hexToRgb(col)},0.12)`,
        boxShadow: `0 0 24px rgba(${hexToRgb(col)},0.35)`,
        fontFamily: SANS,
        fontWeight: 900,
        fontSize: 44,
        lineHeight: 1.45,
        color: C.white,
      }}
    >
      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 24, color: col, marginBottom: 4 }}>{side === "user" ? "你" : "AI"}</div>
      {chars.slice(0, n).join("")}
      {typing && n < chars.length ? <span style={{ color: col }}>▌</span> : null}
    </div>
  );
};

/* -------------------------------- B：示范问答卡片 -------------------------------- */

const DEMOS = [
  { q: "法国的首都是哪里？", a: "法国的首都是巴黎。" },
  { q: "帮我写一句生日祝福", a: "祝你生日快乐，天天开心！" },
  { q: "1 + 1 等于几？", a: "等于 2。" },
];

const DemoCards: React.FC<{ t: number }> = ({ t }) => {
  const out = prog(t, T_RLHF - 0.25, 0.3);
  if (t < T_SFT || out >= 1) return null;
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      {/* 模型 */}
      <div
        style={{
          position: "absolute",
          left: 540 - 110,
          top: 1010,
          width: 220,
          height: 150,
          borderRadius: 26,
          border: `4px solid ${C.violet}`,
          background: "rgba(155,92,255,0.15)",
          boxShadow: `0 0 ${30 + 30 * Math.sin(t * 6) ** 2}px rgba(155,92,255,0.6)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 48,
          color: C.white,
          opacity: prog(t, T_SFT, 0.3),
        }}
      >
        模型
      </div>
      {DEMOS.map((d, i) => {
        const at = T_SFT + 0.35 + i * 0.6;
        const k = prog(t, at, 0.4, Ease.outCubic);
        const feed = prog(t, at + 1.0, 0.45, Ease.inCubic);
        if (k <= 0 || feed >= 1) return null;
        const x = lerp(1200, 540, k);
        const y = lerp(470 + i * 170, 1085, feed);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, 0) scale(${1 - feed * 0.8}) rotate(${(1 - k) * 8}deg)`,
              width: 820,
              padding: "16px 28px",
              borderRadius: 22,
              border: `3px solid ${C.green}`,
              background: "rgba(10,30,24,0.92)",
              boxShadow: `0 0 24px rgba(77,255,176,0.35)`,
              opacity: 1 - feed * 0.6,
            }}
          >
            <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 36, color: C.white }}>
              <span style={{ color: C.cyan }}>问：</span>
              {d.q}
            </div>
            <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 36, color: C.white, marginTop: 4 }}>
              <span style={{ color: C.green }}>答：</span>
              {d.a}
            </div>
            <div style={{ position: "absolute", right: 20, top: 12, fontFamily: SANS, fontSize: 22, color: "rgba(160,255,210,0.8)" }}>人类示范</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* -------------------------------- C：RLHF -------------------------------- */

const ANSWERS = [
  { id: "A", text: "巴黎。", rank: 2, score: 0.71 },
  { id: "B", text: "法国的首都是巴黎，也是法国最大的城市。", rank: 1, score: 0.92 },
  { id: "C", text: "我不知道。", rank: 3, score: 0.08 },
];
const RY0 = 590;
const RDY = 190;

const Rlhf: React.FC<{ t: number }> = ({ t }) => {
  const out = prog(t, T_END - 0.2, 0.3);
  if (t < T_RLHF || out >= 1) return null;
  const sort = prog(t, T_RLHF + 1.2, 0.6, Ease.inOutCubic);
  const scoreK = prog(t, T_RLHF + 2.0, 0.4);
  const nudge = prog(t, T_RLHF + 2.5, 0.5, Ease.outBack);
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <div style={{ position: "absolute", top: 515, left: 70, fontFamily: SANS, fontWeight: 500, fontSize: 28, color: C.dim, opacity: prog(t, T_RLHF + 0.2, 0.3) }}>
        问：法国的首都是哪里？ AI 给出几个不同的回答 ↓
      </div>
      {ANSWERS.map((a, i) => {
        const k = prog(t, T_RLHF + 0.3 + i * 0.15, 0.35, Ease.outBack);
        const y = lerp(RY0 + i * RDY, RY0 + (a.rank - 1) * RDY, sort);
        const col = a.rank === 1 ? C.gold : a.rank === 2 ? C.cyan : "#8C95C8";
        return (
          <div
            key={a.id}
            style={{
              position: "absolute",
              left: 70,
              right: 70,
              top: y,
              height: 150,
              transform: `scale(${k})`,
              opacity: clamp(k),
              borderRadius: 24,
              border: `3px solid ${sort > 0.5 ? col : "rgba(155,92,255,0.8)"}`,
              background: "rgba(16,18,36,0.9)",
              boxShadow: sort > 0.5 && a.rank === 1 ? `0 0 34px rgba(255,201,77,0.5)` : undefined,
              display: "flex",
              alignItems: "center",
              padding: "0 26px",
            }}
          >
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 44, color: C.violet, width: 60 }}>{a.id}</div>
            <div style={{ flex: 1, fontFamily: SANS, fontWeight: 900, fontSize: 38, color: C.white, lineHeight: 1.35 }}>{a.text}</div>
            {/* 人类排名 */}
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 42,
                marginLeft: 16,
                background: col,
                color: "#0A0C18",
                fontFamily: SANS,
                fontWeight: 900,
                fontSize: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${prog(t, T_RLHF + 0.9 + a.rank * 0.12, 0.3, Ease.outBack)})`,
                boxShadow: `0 0 20px ${col}`,
              }}
            >
              第{a.rank}
            </div>
            {/* 奖励模型打分 */}
            <div style={{ position: "absolute", right: 30, top: -36, fontFamily: MONO, fontWeight: 800, fontSize: 30, color: col, opacity: scoreK }}>
              奖励 {a.score.toFixed(2)}
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", top: RY0 + 3 * RDY + 10, left: 0, right: 0, textAlign: "center", opacity: scoreK }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 34, color: C.white }}>
          人类排序 → <span style={{ color: C.cyan }}>奖励模型</span>学会打分 → 模型往<span style={{ color: C.gold }}>高分</span>方向调
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 24, color: "#FFE3A3", marginTop: 8 }}>分数为示意</div>
        <div style={{ marginTop: 10, fontFamily: SANS, fontWeight: 900, fontSize: 60, color: C.gold, transform: `translateY(${-(nudge * 10)}px) scale(${nudge})`, textShadow: glow(C.gold, 0.5) }}>↑</div>
      </div>
    </AbsoluteFill>
  );
};

export const Chat: React.FC = () => {
  const t = useT();
  const aOut = prog(t, T_SFT - 0.25, 0.3);
  const final = prog(t, T_END, 0.3);
  return (
    <AbsoluteFill>
      <Backdrop hue="mixed" intensity={0.9} />
      <Step t={t} at={0.05} until={T_SFT - 0.2} n="第一步" title="预训练：只会“续写”" en="Pre-training" color={C.cyan} />
      <Step t={t} at={T_SFT} until={T_RLHF - 0.2} n="第二步" title="指令微调" en="Instruction Tuning" color={C.green} />
      <Step t={t} at={T_RLHF} until={T_END - 0.2} n="第三步" title="RLHF" en="基于人类反馈的强化学习" color={C.gold} />

      {/* A：只会续写 */}
      {aOut < 1 ? (
        <AbsoluteFill style={{ opacity: 1 - aOut }}>
          <Bubble side="user" text="法国的首都是哪里？" y={540} at={0.3} t={t} />
          <Bubble side="ai" text="德国的首都是哪里？意大利的首都是哪里？西班牙的首都是……" y={760} at={0.9} t={t} typing={16} color={C.red} />
          <div style={{ position: "absolute", top: 1110, left: 70, fontFamily: SANS, fontSize: 24, color: "#FFE3A3", opacity: prog(t, 1.4, 0.3) }}>
            示意：它把问题当成一篇文章，接着往下写
          </div>
        </AbsoluteFill>
      ) : null}

      <DemoCards t={t} />
      <Rlhf t={t} />

      {/* D：变成助手 */}
      {final > 0 ? (
        <AbsoluteFill style={{ opacity: final }}>
          <Bubble side="user" text="法国的首都是哪里？" y={560} at={T_END} t={t} />
          <Bubble side="ai" text="法国的首都是巴黎。有什么我还能帮你的吗？" y={780} at={T_END + 0.25} t={t} typing={26} color={C.gold} />
        </AbsoluteFill>
      ) : null}

      <Caption lines={["它不会回答，只会[接着写]"]} at={1.6} until={T_SFT - 0.2} y={1380} size={64} hiColor={C.red} />
      <Caption lines={["人类写示范问答，", "教它[好好回答问题]"]} at={T_SFT + 0.6} until={T_RLHF - 0.25} y={1380} size={62} hiColor={C.green} />
      <Caption lines={["模型朝着[人类更喜欢]的方向调整"]} at={T_RLHF + 2.3} until={T_END - 0.2} y={1430} size={52} hiColor={C.gold} />
      <Caption lines={["从一个[续写机器]，", "变成一个[助手]"]} at={T_END + 0.5} y={1250} size={84} hiColor={C.gold} />

      <Flash at={T_END} peak={0.45} dur={0.22} color="#FFE3A3" />
    </AbsoluteFill>
  );
};
