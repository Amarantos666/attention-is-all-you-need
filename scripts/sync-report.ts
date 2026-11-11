/**
 * 卡点报告：每一幕从第几拍开始、卡点钉落在第几拍、各段讲解的伸缩倍数。
 * 用法：npm run sync
 */
import { makeWarp } from "../src/lib/warp";
import { SCENES } from "../src/scenes";
import { BEAT, FPS, SYNC, TIMELINE } from "../src/timeline";

const keepIn = (keep: [number, number][], a: number, b: number) =>
  keep.reduce((s, [x, y]) => s + Math.max(0, Math.min(b, y) - Math.max(a, x)), 0);
const fmtBeat = (sec: number) => {
  const b = sec / BEAT;
  return `${sec.toFixed(2)}s（第 ${Math.floor(b / 4) + 1} 小节第 ${(Math.round(b) % 4) + 1} 拍${Math.abs(b - Math.round(b)) > 0.05 ? "，不在拍上" : ""}）`;
};

let acc = 0;
for (const s of SCENES) {
  const from = Math.round(acc * FPS);
  acc += TIMELINE[s.key];
  const dur = Math.round(acc * FPS) - from;
  const pins = SYNC[s.key] ?? [];
  const warp = makeWarp(s.design, s.keep, dur / FPS, pins);
  console.log(`\n${s.id}  开始 ${fmtBeat(from / FPS)}  时长 ${(dur / FPS).toFixed(2)}s`);
  const pts: [number, number][] = [[0, 0], ...pins, [s.design, dur / FPS]];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [d0, a0] = pts[i];
    const [d1, a1] = pts[i + 1];
    const kd = keepIn(s.keep, d0, d1);
    const fd = d1 - d0 - kd;
    const r = fd > 1e-6 && a1 - a0 >= kd ? `讲解段 ×${((a1 - a0 - kd) / fd).toFixed(2)}` : `整段 ×${((a1 - a0) / (d1 - d0)).toFixed(2)}`;
    console.log(`  设计 ${d0.toFixed(2)}→${d1.toFixed(2)}s  ${r}`);
  }
  for (const [d] of pins) {
    let f = 0;
    while (f < dur && warp(f / FPS) < d) f++;
    console.log(`  钉：设计 ${d}s → ${fmtBeat((from + f) / FPS)}`);
  }
}
console.log(`\n总时长 ${acc.toFixed(2)}s`);
