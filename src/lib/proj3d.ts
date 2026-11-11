export type V3 = [number, number, number];

export type Cam = {
  target: V3;
  yaw: number; // 绕 Y 轴（弧度）
  pitch: number; // 绕 X 轴（弧度）
  dist: number; // 相机到目标距离
  f: number; // 焦距（像素）
  cx: number;
  cy: number;
};

export type Projected = { x: number; y: number; s: number; z: number };

/** 简单透视投影：不依赖 WebGL，逐帧完全确定 */
export const project = (p: V3, cam: Cam): Projected | null => {
  const x0 = p[0] - cam.target[0];
  const y0 = p[1] - cam.target[1];
  const z0 = p[2] - cam.target[2];
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const x1 = x0 * cy + z0 * sy;
  const z1 = -x0 * sy + z0 * cy;
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const y2 = y0 * cp - z1 * sp;
  const z2 = y0 * sp + z1 * cp;
  const z = z2 + cam.dist;
  if (z < 20) return null;
  const s = cam.f / z;
  return { x: cam.cx + x1 * s, y: cam.cy + y2 * s, s, z };
};

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const mix = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
