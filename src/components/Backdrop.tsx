import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, random } from "remotion";
import { useT } from "./SceneShell";

/** 深空背景：径向渐变 + 缓慢漂浮的光尘（带景深） */
export const Backdrop: React.FC<{
  hue?: "blue" | "violet" | "mixed";
  dust?: number;
  intensity?: number;
}> = ({ hue = "mixed", dust = 90, intensity = 1 }) => {
  const t = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < dust; i++) {
      const depth = 0.2 + random(`bd${i}`) * 0.8; // 0.2 远 .. 1 近
      const x0 = random(`bx${i}`) * 1080;
      const y0 = random(`by${i}`) * 1920;
      const sp = 6 + depth * 26;
      const x = (x0 + Math.sin(t * 0.3 + i) * 20 * depth + 1080) % 1080;
      const y = (((y0 - t * sp) % 1920) + 1920) % 1920;
      const r = 0.6 + depth * depth * 3.2;
      const a = (0.1 + 0.35 * depth) * intensity * (0.6 + 0.4 * Math.sin(t * 2 + i * 1.7));
      const col = random(`bc${i}`) > 0.5 ? "61,224,255" : "155,92,255";
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
      g.addColorStop(0, `rgba(${col},${a})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [t, dust, intensity]);

  const grad =
    hue === "blue"
      ? "radial-gradient(ellipse 90% 60% at 50% 45%, #0B1A33 0%, #070B16 45%, #05060A 100%)"
      : hue === "violet"
        ? "radial-gradient(ellipse 90% 60% at 50% 45%, #1A0F33 0%, #0A0716 45%, #05060A 100%)"
        : "radial-gradient(ellipse 90% 60% at 50% 40%, #12153A 0%, #0A0A1C 45%, #05060A 100%)";
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: grad, opacity: intensity }} />
      <canvas ref={ref} width={1080} height={1920} style={{ position: "absolute", inset: 0 }} />
    </AbsoluteFill>
  );
};
