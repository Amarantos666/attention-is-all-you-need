import React, { useLayoutEffect, useRef } from "react";

/** 每帧重绘的 Canvas 层（1080×1920 坐标系） */
export const CanvasLayer: React.FC<{
  draw: (ctx: CanvasRenderingContext2D) => void;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
}> = ({ draw, style, width = 1080, height = 1920 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.save();
    ctx.scale(c.width / 1080, c.height / 1920);
    draw(ctx);
    ctx.restore();
  });
  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...style }} />;
};

const spriteCache = new Map<string, HTMLCanvasElement>();
/** 预渲染的发光圆点贴图，比 shadowBlur 快得多 */
export const glowSprite = (rgb: string) => {
  const hit = spriteCache.get(rgb);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, `rgba(255,255,255,1)`);
  g.addColorStop(0.12, `rgba(${rgb},1)`);
  g.addColorStop(0.35, `rgba(${rgb},0.35)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  spriteCache.set(rgb, c);
  return c;
};

/** 在 (x,y) 画一个半径 r 的发光点 */
export const drawGlow = (ctx: CanvasRenderingContext2D, rgb: string, x: number, y: number, r: number, alpha = 1) => {
  if (alpha <= 0.002 || r <= 0.05) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(glowSprite(rgb), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
};

export const hexToRgb = (hex: string) => {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};
