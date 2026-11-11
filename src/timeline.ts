/**
 * 全片时间轴 —— 唯一需要改的地方（单位：秒）
 *
 * 想按音乐节拍调整，只改下面的数字即可：
 *   - 每一幕会自动接在上一幕后面，总时长自动重新计算；
 *   - 每一幕里标记为"震撼段"的瞬间（冲击、爆发、镜头急推急拉）始终保持原速；
 *     其余讲解段自动伸缩来吸收差值（拉长就变慢，缩短就变快），
 *     所以不会出现动画被截断或末尾空等的情况。
 *   - 震撼段的位置写在每个场景文件顶部的 KEEP 里。
 */
export const FPS = 60;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const TIMELINE = {
  hook: 5.4, // 钩子
  neuron: 13.7, // 01 神经元
  tokens: 14, // 02 文字变数字
  paper: 11.8, // 03 一篇论文
  attention: 17.6, // 04 注意力
  formula: 11.9, // 05 核心公式
  transformer: 15.7, // 06 Transformer
  nextToken: 16.1, // 07 猜下一个词
  training: 23.4, // 08 怎么学会的
  scaling: 13.8, // 09 越大越强
  chat: 13.1, // 10 会聊天了
  outro: 9, // 收尾
} as const;

export type SceneKey = keyof typeof TIMELINE;

/** 秒 → 帧 */
export const toFrames = (seconds: number) => Math.max(1, Math.round(seconds * FPS));
