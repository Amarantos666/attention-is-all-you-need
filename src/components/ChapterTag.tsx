import React from "react";
import { C, MONO, SANS, glow } from "../theme";
import { prog, Ease, rnd } from "../lib/anim";
import { useT } from "./SceneShell";

/** 右上角小号章节标签，例如 "01 神经元" */
export const ChapterTag: React.FC<{ label: string }> = ({ label }) => {
  const t = useT();
  const [num, ...rest] = label.split(" ");
  const name = rest.join(" ");
  const k = prog(t, 0.05, 0.45, Ease.outExpo);
  const chars = Array.from(name);
  const shown = Math.floor(prog(t, 0.1, 0.5, Ease.linear) * chars.length + 0.001);
  const blink = Math.floor(t * 2) % 2 === 0 ? 1 : 0.35;
  return (
    <div
      style={{
        position: "absolute",
        top: 150,
        right: 56,
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity: k,
        transform: `translateX(${(1 - k) * 40}px)`,
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: 5, background: C.cyan, opacity: blink, boxShadow: `0 0 12px ${C.cyan}` }} />
      <div
        style={{
          fontFamily: MONO,
          fontWeight: 800,
          fontSize: 30,
          color: C.cyan,
          textShadow: glow(C.cyan, 0.4),
          letterSpacing: 2,
        }}
      >
        {num}
      </div>
      <div style={{ width: 2, height: 30, background: "rgba(61,224,255,0.5)" }} />
      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 30, color: "rgba(235,242,255,0.9)", letterSpacing: 2 }}>
        {chars.map((ch, i) => (
          <span key={i} style={{ opacity: i < shown ? 1 : 0 }}>
            {i === shown - 1 && t < 0.7 && rnd(`ct${Math.floor(t * 30)}`) > 0.5 ? "█" : ch}
          </span>
        ))}
      </div>
    </div>
  );
};
