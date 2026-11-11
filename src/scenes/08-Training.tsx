import React from "react";
import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { CanvasLayer, drawGlow } from "../components/CanvasLayer";
import { useT } from "../components/SceneShell";
import { Caption, Flash, Holo, Slam } from "../components/Text";
import { clamp, Ease, lerp, prog, rnd } from "../lib/anim";
import { Cam, project, V3 } from "../lib/proj3d";
import { C, MONO, SANS, glow, softGlow } from "../theme";

/**
 * 08 它是怎么学会的（设计时长 20 秒）
 * A 0–3.2s    一开始所有参数都是随机的，满屏乱码
 * B 3.2–7.0s  和正确答案对比：损失函数 Loss（交叉熵）
 * C 7.0–10.5s 反向传播：误差从塔顶往下逆流，每个参数旁出现调整方向
 * D 10.5–15.2s 梯度下降：3D 损失地形，小球一步步滚向谷底
 * E 15.2–20s  计数器狂飙 + 文字瀑布：预训练
 */
/** 震撼段（设计秒）：调整时长时保持原速 */
export const KEEP: [number, number][] = [
  [0.15, 0.9],
  [15.2, 17.7],
];
export const DESIGN = 20;

const T_LOSS = 3.2;
const T_BACK = 7.0;
const T_GD = 10.5;
const T_PRE = 15.2;

const GARBLE = "鼎罐蠡§Δж░▒ゑ¤µ¶ØΞ犇嚢龘ⅧΨ∰⊕夔靐爨≋◬Ω∂";
const garble = (seed: string, n: number) =>
  new Array(n)
    .fill(0)
    .map((_, i) => GARBLE[Math.floor(rnd(`${seed}-${i}`) * GARBLE.length)])
    .join("");

/* -------------------------------- A：乱码 -------------------------------- */

const drawNoise = (ctx: CanvasRenderingContext2D, t: number) => {
  const a = prog(t, 0.2, 0.3) * (1 - prog(t, T_LOSS - 0.2, 0.5));
  if (a <= 0) return;
  const f = Math.floor(t * 20);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < 260; i++) {
    const x = rnd(`nx${i}`) * 1080;
    const y = rnd(`ny${i}`) * 1920;
    const size = 26 + rnd(`ns${i}`) * 50;
    ctx.font = `900 ${Math.round(size)}px "Noto Sans SC"`;
    const ch = GARBLE[Math.floor(rnd(`nc${i}-${Math.floor(f + i * 0.37)}`) * GARBLE.length)];
    const c = rnd(`nk${i}`);
    ctx.fillStyle = c < 0.5 ? `rgba(255,77,106,${0.35 * a})` : c < 0.8 ? `rgba(155,92,255,${0.35 * a})` : `rgba(220,230,255,${0.3 * a})`;
    ctx.fillText(ch, x, y);
  }
};

/* -------------------------------- 塔 -------------------------------- */

const LAYERS = 6;
const T_X = 540;
const T_Y0 = 1180;
const L_DY = 74;
const L_W = 440;

const Tower: React.FC<{ t: number }> = ({ t }) => {
  const a = prog(t, 0.1, 0.3) * (1 - prog(t, T_GD - 0.3, 0.4)) * (1 - prog(t, T_LOSS, 0.3) + prog(t, T_BACK - 0.3, 0.3));
  if (a <= 0) return null;
  const f = Math.floor(t * 15);
  const random = 1 - prog(t, T_LOSS, 0.6);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      {new Array(LAYERS).fill(0).map((_, i) => {
        const y = T_Y0 - i * L_DY;
        // 反向传播：误差从顶层往下
        const backK = prog(t, T_BACK + 0.4 + (LAYERS - 1 - i) * 0.32, 0.3);
        const pulse = backK > 0 && backK < 1 ? Math.sin(backK * Math.PI) : 0;
        const noiseCol = `hsl(${Math.floor(rnd(`lc${i}-${f}`) * 360)}, 80%, 60%)`;
        const border = random > 0.02 ? noiseCol : pulse > 0.05 ? C.red : backK >= 1 ? "rgba(255,141,160,0.7)" : "rgba(190,150,255,0.8)";
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: T_X - L_W / 2,
              top: y - 28,
              width: L_W,
              height: 56,
              borderRadius: 12,
              border: `3px solid ${border}`,
              background: pulse > 0.05 ? `rgba(255,77,106,${0.15 + 0.4 * pulse})` : "rgba(155,92,255,0.12)",
              boxShadow: pulse > 0.05 ? `0 0 ${40 * pulse}px rgba(255,77,106,0.8)` : undefined,
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
              padding: "0 20px",
            }}
          >
            {/* 参数小点 + 调整方向 */}
            {new Array(7).fill(0).map((__, k) => {
              const up = rnd(`ar${i}-${k}`) > 0.5;
              const show = backK > 0.4;
              return (
                <div key={k} style={{ position: "relative", width: 16, height: 16, borderRadius: 8, background: random > 0.02 ? noiseCol : "#C9B8FF" }}>
                  {show ? (
                    <div
                      style={{
                        position: "absolute",
                        left: 22,
                        top: -12,
                        fontFamily: SANS,
                        fontWeight: 900,
                        fontSize: 28,
                        color: up ? C.green : C.red,
                        opacity: prog(backK, 0.4, 0.4, Ease.linear),
                        transform: `translateY(${(up ? -1 : 1) * 4 * Math.sin(t * 10 + k)}px)`,
                      }}
                    >
                      {up ? "↑" : "↓"}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}
      {/* 误差信号：从塔顶往下逆流 */}
      {(() => {
        const k = prog(t, T_BACK + 0.25, 2.1, Ease.inOutCubic);
        if (k <= 0 || k >= 1) return null;
        const y = lerp(T_Y0 - (LAYERS - 1) * L_DY - 80, T_Y0 + 40, k);
        return (
          <div
            style={{
              position: "absolute",
              left: T_X - L_W / 2 - 40,
              width: L_W + 80,
              top: y - 50,
              height: 100,
              background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,77,106,0.75), rgba(255,77,106,0))",
            }}
          />
        );
      })()}
    </AbsoluteFill>
  );
};

/* -------------------------------- B：Loss -------------------------------- */

const P_CORRECT = 0.0002; // 示意：随机模型给正确答案的概率
const LOSS0 = -Math.log(P_CORRECT); // ≈ 8.52

const LossPanel: React.FC<{ t: number }> = ({ t }) => {
  const a = prog(t, T_LOSS, 0.3) * (1 - prog(t, T_BACK - 0.2, 0.3));
  if (a <= 0) return null;
  const f = Math.floor(t * 30);
  const settle = prog(t, T_LOSS + 1.6, 0.6);
  const jitter = (1 - settle) * (rnd(`lj${f}`) * 6 - 1);
  const loss = Math.max(0, LOSS0 + jitter);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 52, color: C.white, textShadow: softGlow() }}>和正确答案对比，算出"错了多少"</div>
      </div>
      <div style={{ position: "absolute", top: 370, left: 120, right: 120, display: "flex", flexDirection: "column", gap: 18 }}>
        {[
          { k: "模型猜的", v: "鼎", sub: "（乱猜）", col: C.red, at: T_LOSS + 0.2 },
          { k: "正确答案", v: "好", sub: `模型只给了它 ${(P_CORRECT * 100).toFixed(2)}% 的概率`, col: C.green, at: T_LOSS + 0.5 },
        ].map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "14px 30px",
              borderRadius: 20,
              border: `3px solid ${r.col}`,
              background: "rgba(14,16,32,0.85)",
              opacity: prog(t, r.at, 0.3),
              transform: `translateX(${(1 - prog(t, r.at, 0.35, Ease.outCubic)) * (i ? 80 : -80)}px)`,
            }}
          >
            <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 40, color: C.dim, width: 200 }}>{r.k}</div>
            <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 70, color: r.col, textShadow: glow(r.col, 0.5), width: 100 }}>{r.v}</div>
            <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: C.dim }}>{r.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: 690, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 40, color: C.white, opacity: prog(t, T_LOSS + 0.9, 0.3) }}>
          损失函数 <span style={{ fontFamily: MONO, color: C.cyan }}>Loss</span>
          <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 30, color: C.dim }}>（这里用交叉熵 Cross-Entropy）</span>
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 150, marginTop: 10 }}>
          <Holo at={T_LOSS + 1.0} color={C.red}>
            {loss.toFixed(2)}
          </Holo>
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 32, color: "#FFC2CC", opacity: prog(t, T_LOSS + 2.0, 0.4) }}>
          Loss = −log P(正确答案) = −ln(0.0002) ≈ 8.5
        </div>
        <div style={{ marginTop: 12, display: "inline-block", fontFamily: SANS, fontSize: 24, color: "#FFE3A3", border: "1.5px solid rgba(255,201,77,0.6)", borderRadius: 20, padding: "2px 12px", opacity: prog(t, T_LOSS + 2.0, 0.4) }}>
          概率为示意
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* -------------------------------- D：损失地形 -------------------------------- */

const G = 34;
const SPAN = 1.0;
const height = (x: number, z: number) =>
  0.95 * (0.55 * x * x + 0.8 * z * z) + 0.22 * Math.sin(3.2 * x + 0.5) * Math.cos(2.6 * z) + 0.18 * Math.exp(-((x + 0.2) ** 2 + (z - 0.45) ** 2) * 9) + 0.12;
const grad = (x: number, z: number): [number, number] => {
  const e = 1e-3;
  return [(height(x + e, z) - height(x - e, z)) / (2 * e), (height(x, z + e) - height(x, z - e)) / (2 * e)];
};
// 预先算好梯度下降的路径
const PATH: [number, number][] = (() => {
  const pts: [number, number][] = [[-0.86, 0.82]];
  for (let i = 0; i < 28; i++) {
    const [x, z] = pts[pts.length - 1];
    const [gx, gz] = grad(x, z);
    pts.push([x - 0.055 * gx, z - 0.055 * gz]);
  }
  return pts;
})();
const H_MIN = Math.min(...PATH.map(([x, z]) => height(x, z)));
const H_MAX = height(PATH[0][0], PATH[0][1]);
const LOSS_END = 1.9;
const lossOf = (h: number) => lerp(LOSS_END, LOSS0, clamp((h - H_MIN) / (H_MAX - H_MIN)));

const W3 = 700; // 地形的世界尺寸
const HY = 380; // 高度放大
const world = (x: number, z: number): V3 => [x * W3 * 0.5, -height(x, z) * HY + 150, z * W3 * 0.5];

const gdCam = (t: number): Cam => ({
  target: [0, -60, 0],
  yaw: -0.5 + (t - T_GD) * 0.09,
  pitch: 0.55,
  dist: lerp(1450, 1080, prog(t, T_GD, 3.8, Ease.inOutCubic)),
  f: 1000,
  cx: 540,
  cy: 880,
});

const ballAt = (t: number) => {
  const steps = PATH.length - 1;
  const s = Ease.inOutSine(clamp((t - (T_GD + 0.9)) / 3.4)) * steps;
  const i = Math.min(steps - 1, Math.floor(s));
  const u = Ease.inOutCubic(s - i);
  const [x0, z0] = PATH[i];
  const [x1, z1] = PATH[i + 1];
  return { x: lerp(x0, x1, u), z: lerp(z0, z1, u), step: s };
};

const drawLandscape = (ctx: CanvasRenderingContext2D, t: number) => {
  const a = prog(t, T_GD - 0.2, 0.5) * (1 - prog(t, T_PRE - 0.2, 0.4));
  if (a <= 0) return;
  const cam = gdCam(t);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineWidth = 2;
  const pt = (i: number, j: number) => {
    const x = (i / (G - 1)) * 2 * SPAN - SPAN;
    const z = (j / (G - 1)) * 2 * SPAN - SPAN;
    return { p: project(world(x, z), cam), h: height(x, z) };
  };
  const grid = [] as { p: ReturnType<typeof project>; h: number }[][];
  for (let i = 0; i < G; i++) {
    grid.push([]);
    for (let j = 0; j < G; j++) grid[i].push(pt(i, j));
  }
  const colorFor = (h: number) => {
    const k = clamp((h - 0.05) / 1.3);
    // 低处青色，高处紫/品红
    const r = Math.round(lerp(61, 255, k));
    const g = Math.round(lerp(224, 61, k));
    const b = Math.round(lerp(255, 203, k));
    return `rgba(${r},${g},${b},${0.55 * a})`;
  };
  for (let i = 0; i < G; i++) {
    for (let j = 0; j < G; j++) {
      const c = grid[i][j];
      if (!c.p) continue;
      if (i + 1 < G && grid[i + 1][j].p) {
        ctx.strokeStyle = colorFor((c.h + grid[i + 1][j].h) / 2);
        ctx.beginPath();
        ctx.moveTo(c.p.x, c.p.y);
        ctx.lineTo(grid[i + 1][j].p!.x, grid[i + 1][j].p!.y);
        ctx.stroke();
      }
      if (j + 1 < G && grid[i][j + 1].p) {
        ctx.strokeStyle = colorFor((c.h + grid[i][j + 1].h) / 2);
        ctx.beginPath();
        ctx.moveTo(c.p.x, c.p.y);
        ctx.lineTo(grid[i][j + 1].p!.x, grid[i][j + 1].p!.y);
        ctx.stroke();
      }
    }
  }
  // 小球的轨迹
  const b = ballAt(t);
  if (t > T_GD + 0.7) {
    ctx.strokeStyle = `rgba(255,201,77,${0.9 * a})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    const n = Math.floor(b.step);
    for (let i = 0; i <= n; i++) {
      const p = project(world(PATH[i][0], PATH[i][1]), cam);
      if (!p) continue;
      if (i === 0) ctx.moveTo(p.x, p.y - 10);
      else ctx.lineTo(p.x, p.y - 10);
    }
    const pb = project(world(b.x, b.z), cam);
    if (pb) ctx.lineTo(pb.x, pb.y - 10);
    ctx.stroke();
    for (let i = 0; i <= n; i++) {
      const p = project(world(PATH[i][0], PATH[i][1]), cam);
      if (p) drawGlow(ctx, "255,201,77", p.x, p.y - 10, 12, a * 0.8);
    }
    if (pb) {
      // 坡度方向箭头（下坡方向）
      const [gx, gz] = grad(b.x, b.z);
      const len = Math.hypot(gx, gz) || 1;
      const ahead = project(world(b.x - (gx / len) * 0.22, b.z - (gz / len) * 0.22), cam);
      if (ahead && b.step < PATH.length - 1.5) {
        ctx.strokeStyle = `rgba(77,255,176,${a})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(pb.x, pb.y - 14);
        ctx.lineTo(ahead.x, ahead.y - 14);
        ctx.stroke();
        drawGlow(ctx, "77,255,176", ahead.x, ahead.y - 14, 16, a);
      }
      drawGlow(ctx, "255,240,200", pb.x, pb.y - 14, 46, a);
      drawGlow(ctx, "255,201,77", pb.x, pb.y - 14, 90, a * 0.6);
    }
  }
  ctx.globalCompositeOperation = "source-over";
};

const GdHud: React.FC<{ t: number }> = ({ t }) => {
  const a = prog(t, T_GD + 0.2, 0.4) * (1 - prog(t, T_PRE - 0.2, 0.4));
  if (a <= 0) return null;
  const b = ballAt(t);
  const loss = lossOf(height(b.x, b.z));
  return (
    <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", opacity: a }}>
      <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 46, color: C.white }}>
        损失地形 <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: C.dim }}>（越低 = 错得越少，示意）</span>
      </div>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 64, color: loss < 3 ? C.green : C.gold, marginTop: 8, textShadow: glow(loss < 3 ? C.green : C.gold, 0.4) }}>
        Loss {loss.toFixed(2)}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 28, color: C.dim }}>第 {Math.min(PATH.length - 1, Math.floor(b.step))} 步</div>
    </div>
  );
};

/* -------------------------------- E：预训练 -------------------------------- */

const LINES = [
  "The quick brown fox jumps over the lazy dog.",
  "床前明月光，疑是地上霜。",
  "def train(model, data): loss.backward()",
  "光合作用是植物利用光能制造有机物的过程。",
  "In 1969, humans first walked on the Moon.",
  "水的沸点在标准大气压下是 100 摄氏度。",
  "for (let i = 0; i < n; i++) { sum += a[i]; }",
  "La vie est belle.",
  "地球绕太阳公转一周大约需要 365 天。",
  "E = mc²  质能方程",
  "人工智能是计算机科学的一个分支。",
  "SELECT name FROM users WHERE age > 18;",
  "東京は日本の首都です。",
  "长江是中国最长的河流。",
  "Water is made of hydrogen and oxygen.",
  "今天天气很好，适合出去走走。",
];

const drawWaterfall = (ctx: CanvasRenderingContext2D, t: number) => {
  const a = prog(t, T_PRE - 0.1, 0.5);
  if (a <= 0) return;
  const speed = lerp(600, 3200, prog(t, T_PRE, 2.2, Ease.inQuad));
  const dt = t - T_PRE;
  ctx.textBaseline = "middle";
  for (let col = 0; col < 7; col++) {
    const x = 20 + col * 150 + (rnd(`wc${col}`) - 0.5) * 30;
    const size = 20 + Math.floor(rnd(`ws${col}`) * 12);
    ctx.font = `500 ${size}px "Noto Sans SC"`;
    const spacing = size * 1.9;
    const offset = (dt * speed * (0.7 + 0.5 * rnd(`wv${col}`))) % spacing;
    const base = Math.floor((dt * speed * (0.7 + 0.5 * rnd(`wv${col}`))) / spacing);
    for (let r = -1; r < 1920 / spacing + 1; r++) {
      const idx = Math.abs(base - r + col * 7) % LINES.length;
      const y = r * spacing + offset;
      const fadeEdge = clamp(Math.min(y, 1920 - y) / 300);
      ctx.fillStyle = col % 2 ? `rgba(61,224,255,${0.32 * a * fadeEdge})` : `rgba(190,170,255,${0.32 * a * fadeEdge})`;
      ctx.fillText(LINES[idx], x, y);
    }
  }
};

const Counter: React.FC<{ t: number }> = ({ t }) => {
  if (t < T_PRE) return null;
  const k = prog(t, T_PRE + 0.4, 1.9, Ease.inExpo);
  const N = 300_000_000_000;
  const v = Math.floor(N * k);
  const done = k >= 1;
  const s = v.toLocaleString("en-US");
  const pulse = done ? 1 + 0.08 * Math.max(0, 1 - (t - T_PRE - 2.3) * 3) : 1;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 470, height: 640, background: "linear-gradient(180deg, rgba(5,6,10,0), rgba(5,6,10,0.85) 22%, rgba(5,6,10,0.85) 78%, rgba(5,6,10,0))" }} />
      <div style={{ position: "absolute", top: 560, left: 0, right: 0, textAlign: "center" }}>
        <Slam at={T_PRE + 0.05} from={2.4}>
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 52, color: C.white, textShadow: softGlow() }}>猜下一个词这件事，练习了</div>
        </Slam>
        <div
          style={{
            marginTop: 26,
            fontFamily: MONO,
            fontWeight: 800,
            fontSize: 88,
            color: done ? C.gold : C.cyan,
            textShadow: glow(done ? C.gold : C.cyan, 0.7),
            transform: `scale(${pulse})`,
            letterSpacing: -2,
          }}
        >
          {s}
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 52, color: C.white, marginTop: 6, opacity: prog(t, T_PRE + 2.3, 0.3) }}>
          次（约 <span style={{ color: C.gold }}>3000 亿</span>）
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: C.dim, marginTop: 22, opacity: prog(t, T_PRE + 2.6, 0.4), lineHeight: 1.6 }}>
          GPT-3 预训练读了约 3000 亿个 token，每个都是一次"猜下一个词"
          <br />
          如今的大模型：十几万亿个 token
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Training: React.FC = () => {
  const t = useT();
  const f = Math.floor(t * 12);
  const outA = prog(t, 0.5, 0.3) * (1 - prog(t, T_LOSS - 0.2, 0.3));
  return (
    <AbsoluteFill>
      <Backdrop hue="mixed" intensity={0.85} />
      <CanvasLayer draw={(ctx) => drawNoise(ctx, t)} />
      <CanvasLayer draw={(ctx) => drawWaterfall(ctx, t)} />

      {/* A：随机 */}
      {t < T_LOSS + 0.2 ? (
        <AbsoluteFill>
          <div style={{ position: "absolute", left: 0, right: 0, top: 260, height: 220, background: "linear-gradient(180deg, rgba(5,6,10,0), rgba(5,6,10,0.8) 30%, rgba(5,6,10,0.8) 70%, rgba(5,6,10,0))", opacity: outA }} />
          <Slam at={0.2} from={2.6} style={{ position: "absolute", top: 290, left: 0, right: 0, textAlign: "center", opacity: 1 - prog(t, T_LOSS - 0.2, 0.3) }}>
            <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 64, color: C.white, textShadow: softGlow(), lineHeight: 1.3 }}>
              一开始，
              <br />
              所有参数都是<span style={{ color: C.red, textShadow: glow(C.red, 0.6) }}>随机</span>的
            </div>
          </Slam>
          <div style={{ position: "absolute", left: 0, right: 0, top: 590, textAlign: "center", opacity: outA }}>
            <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 32, color: C.dim }}>模型输出：</div>
            <div style={{ display: "inline-block", marginTop: 8, padding: "8px 30px", borderRadius: 18, border: `3px solid ${C.red}`, background: "rgba(40,8,16,0.8)", fontFamily: SANS, fontWeight: 900, fontSize: 64, color: "#FF8DA0", letterSpacing: 4 }}>
              {garble(`go${f}`, 7)}
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      <Tower t={t} />
      {/* 输入 */}
      <div
        style={{
          position: "absolute",
          top: 1290,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 60,
          color: C.white,
          opacity: prog(t, 0.3, 0.3) * (1 - prog(t, T_GD - 0.3, 0.4)),
        }}
      >
        今天天气很 <span style={{ color: C.dim, fontSize: 40 }}>→ ？</span>
      </div>
      <LossPanel t={t} />
      {/* C：反向传播标题 */}
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", opacity: prog(t, T_BACK, 0.3) * (1 - prog(t, T_GD - 0.3, 0.3)) }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 70, color: C.white, textShadow: softGlow() }}>反向传播</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 34, color: "#FF8DA0" }}>Backpropagation</div>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 30, color: C.dim, marginTop: 10 }}>误差从塔顶往下逆流，每个参数旁出现"该往哪调"的小箭头</div>
      </div>

      <CanvasLayer draw={(ctx) => drawLandscape(ctx, t)} />
      <GdHud t={t} />
      <Counter t={t} />

      <Caption lines={["猜得越离谱，Loss 越大"]} at={T_LOSS + 2.4} until={T_BACK - 0.2} y={1440} size={60} hiColor={C.red} />
      <Caption lines={["算出每个参数该[往哪个方向调]"]} at={T_BACK + 1.6} until={T_GD - 0.25} y={1440} size={58} />
      <Caption lines={["每一步都往[最陡的下坡]方向走"]} sub="梯度下降 Gradient Descent" at={T_GD + 1.0} until={T_PRE - 0.2} y={1400} size={60} hiColor={C.green} />
      <Caption lines={["读完互联网规模的文字", "= [预训练]"]} sub="Pre-training" at={T_PRE + 2.9} y={1340} size={64} hiColor={C.gold} />

      <Flash at={T_LOSS} peak={0.3} dur={0.2} />
      <Flash at={T_GD} peak={0.3} dur={0.2} color="#BFF4FF" />
      <Flash at={T_PRE + 2.3} peak={0.45} dur={0.25} color="#FFE3A3" />
    </AbsoluteFill>
  );
};
