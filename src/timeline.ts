/**
 * 全片时间轴 —— 唯一需要改的地方
 *
 * 配乐：秋成《We Never (Remix)（若如初见）》，约 112.8 BPM（每拍 ≈ 0.532 秒，每小节 4 拍 ≈ 2.128 秒）。
 * 为了卡点，每一幕的时长用"拍"来写：beats(11) = 11 拍。
 *   - 每一幕会自动接在上一幕后面，总时长自动重新计算，所以只要每幕都是整拍，切换点就一直落在拍子上；
 *   - 也可以直接写秒数（例如 hook: 5.4），只是那样切换点就不一定在拍子上了。
 *
 * 每一幕里标记为"震撼段"的瞬间（冲击、爆发、镜头急推急拉）保持原速；
 * 其余讲解段自动伸缩来吸收差值。震撼段的位置写在每个场景文件顶部的 KEEP 里。
 *
 * SYNC（卡点钉）：把某一幕里的某个设计时刻，钉在这一幕的第 N 拍上。
 *   例：neuron: [[7.35, beats(17)]] —— 01 幕设计时间 7.35 秒（镜头急速拉远）落在这一幕的第 17 拍，
 *   也就是音乐第一次 drop 的位置。两个钉子之间的讲解段各自伸缩。
 */
export const FPS = 60;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/* ---------------------------------- 音乐 ---------------------------------- */

export const BPM = 112.794;
/** 一拍的秒数 */
export const BEAT = 60 / BPM;
/** n 拍 → 秒 */
export const beats = (n: number) => n * BEAT;

export const MUSIC = {
  /** 放在 public/ 下的音频文件；文件不存在时自动渲染成无声版 */
  file: "bgm.mp3",
  /** 视频第 0 秒对应歌曲的第几秒（从歌曲第 2 小节的第一拍开始） */
  songOffset: 2.5665,
  volume: 0.9,
  /** 开头淡入、结尾淡出（秒） */
  fadeIn: 0.12,
  fadeOut: 2.4,
};

/* ---------------------------------- 各幕时长 ---------------------------------- */

export const TIMELINE = {
  hook: beats(11), // 钩子
  neuron: beats(27), // 01 神经元 —— 第 17 拍（音乐第一次 drop）镜头急速拉远
  tokens: beats(26), // 02 文字变数字
  paper: beats(24), // 03 一篇论文
  attention: beats(36), // 04 注意力
  formula: beats(24), // 05 核心公式
  transformer: beats(29), // 06 Transformer
  nextToken: beats(32), // 07 猜下一个词 —— 第 11 拍（音乐第二次 drop）循环加速
  training: beats(43), // 08 怎么学会的
  scaling: beats(25), // 09 越大越强 —— 从副歌高潮的第一拍开始
  chat: beats(23), // 10 会聊天了
  outro: beats(26), // 收尾 —— 音乐进入尾声时只剩一句话
} as const;

export type SceneKey = keyof typeof TIMELINE;

/** 卡点钉：[设计秒, 这一幕里的实际秒]。不需要的幕可以不写。 */
export const SYNC: Partial<Record<SceneKey, [number, number][]>> = {
  hook: [
    [2.0, beats(4)], // "背后都是数学" 砸下
    [4.45, beats(9)], // 数字洪流收缩成光点
  ],
  neuron: [[7.35, beats(17)]], // 镜头急速拉远成网络（第一次 drop）
  tokens: [[6.6, beats(14)]], // 词飞进 3D 星空
  paper: [[6.45, beats(16)]], // 论文标题砸下
  attention: [
    [2.2, beats(5)], // 所有词同时亮起
    [11.3, beats(28)], // it 吸收 animal 的颜色
  ],
  formula: [[3.45, beats(8)]], // 公式全息启动
  transformer: [[8.0, beats(16)]], // 堆成双塔
  nextToken: [
    [4.5, beats(11)], // 循环加速（第二次 drop）
    [11.25, beats(26)], // "ChatGPT 的每一句话……"
  ],
  training: [[15.2, beats(32)]], // 预训练：计数器狂飙
  scaling: [
    [7.0, beats(15)], // 柱子冲出屏幕
    [10.05, beats(21)], // "量变，引起了质变"
  ],
  chat: [[9.6, beats(20)]], // "从一个续写机器，变成一个助手"
  outro: [
    [5.0, beats(12)], // 音乐停顿：家族树暗下
    [5.5, beats(16)], // 尾声第一拍："Attention is all you need."
    [8.9, beats(24)], // 跟着音乐一起淡出
  ],
};

/** 秒 → 帧 */
export const toFrames = (seconds: number) => Math.max(1, Math.round(seconds * FPS));
