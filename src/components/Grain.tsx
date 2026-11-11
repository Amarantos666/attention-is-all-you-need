import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";

const SIZE = 256;
let noiseTile: HTMLCanvasElement | null = null;
const getTile = () => {
  if (noiseTile) return noiseTile;
  const c = document.createElement("canvas");
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(SIZE, SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const v = Math.floor(random(`grain${i}`) * 255);
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
};

/** 胶片颗粒 + 暗角，让画面更有电影质感 */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const tile = getTile();
    const ox = Math.floor(random(`gx${frame}`) * SIZE);
    const oy = Math.floor(random(`gy${frame}`) * SIZE);
    ctx.clearRect(0, 0, c.width, c.height);
    for (let x = -ox; x < c.width; x += SIZE) {
      for (let y = -oy; y < c.height; y += SIZE) {
        ctx.drawImage(tile, x, y);
      }
    }
  }, [frame]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <canvas
        ref={ref}
        width={540}
        height={960}
        style={{ width: "100%", height: "100%", opacity, mixBlendMode: "overlay" }}
      />
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.75) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
