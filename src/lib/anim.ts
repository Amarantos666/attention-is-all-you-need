import { random } from "remotion";

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const Ease = {
  linear: (x: number) => x,
  inQuad: (x: number) => x * x,
  outQuad: (x: number) => 1 - (1 - x) * (1 - x),
  inCubic: (x: number) => x * x * x,
  outCubic: (x: number) => 1 - Math.pow(1 - x, 3),
  inOutCubic: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outExpo: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x: number) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  inOutExpo: (x: number) =>
    x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
  outBack: (x: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
  inOutSine: (x: number) => -(Math.cos(Math.PI * x) - 1) / 2,
};

export type EaseFn = (x: number) => number;

/** t 从 start 开始、持续 dur 秒的进度 0..1（带缓动） */
export const prog = (t: number, start: number, dur: number, ease: EaseFn = Ease.outCubic) =>
  ease(clamp((t - start) / Math.max(1e-6, dur)));

/** 淡入淡出：在 [inAt, inAt+inDur] 淡入，在 [outAt, outAt+outDur] 淡出 */
export const fade = (t: number, inAt: number, inDur: number, outAt = Infinity, outDur = 0.3) =>
  prog(t, inAt, inDur, Ease.outQuad) * (1 - prog(t, outAt, outDur, Ease.inQuad));

/** 区间映射 */
export const map = (v: number, a: number, b: number, c: number, d: number, ease: EaseFn = Ease.linear) =>
  lerp(c, d, ease(clamp((v - a) / (b - a))));

/** 确定性随机（逐帧可复现） */
export const rnd = (seed: string | number) => random(seed);
export const rndRange = (seed: string | number, a: number, b: number) => a + random(seed) * (b - a);

/** 衰减抖动：用于冲击后的屏幕震动 */
export const shake = (t: number, at: number, dur: number, amp: number, seed = 1) => {
  const k = clamp((t - at) / dur);
  if (k <= 0 || k >= 1) return { x: 0, y: 0 };
  const a = amp * Math.pow(1 - k, 2);
  const f = Math.floor(t * 60);
  return { x: (random(`sx${seed}-${f}`) - 0.5) * 2 * a, y: (random(`sy${seed}-${f}`) - 0.5) * 2 * a };
};

export const fmt = (v: number, digits = 2) => {
  const s = Math.abs(v).toFixed(digits);
  return (v < 0 ? "−" : "") + s;
};
