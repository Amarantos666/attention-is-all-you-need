/**
 * 时间映射：实际秒 → 设计秒。
 *
 * 每一幕按"设计时长"编排动画，并标出若干"震撼段"（keep，设计秒区间）。
 * 当 timeline.ts 里的实际时长与设计时长不同时：
 *   - 震撼段保持原速播放（冲击感不被拖慢）；
 *   - 其余讲解段统一按比例伸缩，吸收全部差值。
 */
export type Range = [number, number];

export const makeWarp = (design: number, keep: Range[], actual: number) => {
  const ranges = keep
    .map(([a, b]) => [Math.max(0, a), Math.min(design, b)] as Range)
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  const keepTotal = ranges.reduce((s, [a, b]) => s + (b - a), 0);
  const free = design - keepTotal;
  // 实际时长连震撼段都放不下时，整体等比缩放
  if (free <= 1e-6 || actual <= keepTotal) {
    const k = design / actual;
    return (sec: number) => sec * k;
  }
  const r = (actual - keepTotal) / free; // 讲解段的拉伸倍数
  const segs: { d0: number; d1: number; a0: number; a1: number }[] = [];
  let d = 0;
  let a = 0;
  const push = (d1: number, rate: number) => {
    if (d1 <= d) return;
    const a1 = a + (d1 - d) * rate;
    segs.push({ d0: d, d1, a0: a, a1 });
    d = d1;
    a = a1;
  };
  for (const [k0, k1] of ranges) {
    push(k0, r);
    push(k1, 1);
  }
  push(design, r);
  return (sec: number) => {
    for (const s of segs) {
      if (sec <= s.a1) return s.d0 + ((sec - s.a0) / Math.max(1e-9, s.a1 - s.a0)) * (s.d1 - s.d0);
    }
    return design;
  };
};

/** 给定讲解段放慢倍数，算出应有的实际时长 */
export const stretchedDuration = (design: number, keep: Range[], factor: number) => {
  const keepTotal = keep.reduce((s, [a, b]) => s + (Math.min(design, b) - Math.max(0, a)), 0);
  return keepTotal + (design - keepTotal) * factor;
};
