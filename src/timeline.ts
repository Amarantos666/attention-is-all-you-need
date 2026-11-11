/**
 * 全片时间轴 —— 唯一需要改的地方（单位：秒）
 *
 * 想按音乐节拍调整，只改下面的数字即可：
 *   - 每一幕会自动接在上一幕后面，总时长自动重新计算；
 *   - 每一幕内部的动画节奏会按比例伸缩（拉长就变慢，缩短就变快），
 *     所以不会出现动画被截断或末尾空等的情况。
 */
export const FPS = 60;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const TIMELINE = {
  hook: 5, // 钩子
  neuron: 12, // 01 神经元
  tokens: 12, // 02 文字变数字
  paper: 10, // 03 一篇论文
  attention: 15, // 04 注意力
  formula: 10, // 05 核心公式
  transformer: 12, // 06 Transformer
  nextToken: 14, // 07 猜下一个词
  training: 20, // 08 怎么学会的
  scaling: 12, // 09 越大越强
  chat: 10, // 10 会聊天了
  outro: 8, // 收尾
} as const;

export type SceneKey = keyof typeof TIMELINE;

/** 秒 → 帧 */
export const toFrames = (seconds: number) => Math.max(1, Math.round(seconds * FPS));
