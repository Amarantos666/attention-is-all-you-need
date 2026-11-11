/**
 * 时间映射：实际秒 → 设计秒。
 *
 * 每一幕按"设计时长"编排动画，并标出若干"震撼段"（keep，设计秒区间）。
 * 当 timeline.ts 里的实际时长与设计时长不同时：
 *   - 震撼段保持原速播放（冲击感不被拖慢）；
 *   - 其余讲解段统一按比例伸缩，吸收全部差值。
 *
 * pins（卡点钉）：[设计秒, 实际秒] 列表，把某个设计时刻钉在某个实际时刻上（比如音乐的某一拍）。
 * 钉子把这一幕切成几段，每一段各自按上面的规则伸缩。
 * 如果某一段实际时长连其中的震撼段都放不下（或者整段都是震撼段），这一段整体等比缩放。
 */
export type Range = [number, number];
export type Pin = [number, number];

const keepIn = (keep: Range[], a: number, b: number) =>
  keep.reduce((s, [x, y]) => s + Math.max(0, Math.min(b, y) - Math.max(a, x)), 0);

export const makeWarp = (design: number, keep: Range[], actual: number, pins: Pin[] = []) => {
  const ranges = keep
    .map(([a, b]) => [Math.max(0, a), Math.min(design, b)] as Range)
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);

  // 端点 + 合法的钉子（严格递增，且在本幕范围内）
  const pts: Pin[] = [[0, 0]];
  for (const [d, a] of [...pins].sort((x, y) => x[0] - y[0])) {
    const [pd, pa] = pts[pts.length - 1];
    if (d > pd && d < design && a > pa && a < actual) pts.push([d, a]);
  }
  pts.push([design, actual]);

  // 分段：{设计起止, 实际起止}
  const segs: { d0: number; d1: number; a0: number; a1: number }[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [D0, A0] = pts[i];
    const [D1, A1] = pts[i + 1];
    const span = A1 - A0;
    const kd = keepIn(ranges, D0, D1);
    const fd = D1 - D0 - kd;
    if (fd <= 1e-6 || span <= kd) {
      segs.push({ d0: D0, d1: D1, a0: A0, a1: A1 });
      continue;
    }
    const r = (span - kd) / fd; // 讲解段的拉伸倍数
    let d = D0;
    let a = A0;
    const push = (d1: number, rate: number) => {
      if (d1 <= d) return;
      const a1 = a + (d1 - d) * rate;
      segs.push({ d0: d, d1, a0: a, a1 });
      d = d1;
      a = a1;
    };
    for (const [k0, k1] of ranges) {
      if (k1 <= D0 || k0 >= D1) continue;
      push(Math.max(D0, k0), r);
      push(Math.min(D1, k1), 1);
    }
    push(D1, r);
  }

  return (sec: number) => {
    for (const s of segs) {
      if (sec <= s.a1) return s.d0 + ((sec - s.a0) / Math.max(1e-9, s.a1 - s.a0)) * (s.d1 - s.d0);
    }
    return design;
  };
};

/** 给定讲解段放慢倍数，算出应有的实际时长 */
export const stretchedDuration = (design: number, keep: Range[], factor: number) => {
  const k = keepIn(keep, 0, design);
  return k + (design - k) * factor;
};
