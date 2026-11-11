# AI 到底是怎么工作的 —— 竖屏科普视频（Remotion）

从一个神经元讲到 ChatGPT，核心是论文《Attention Is All You Need》（2017）。

- 规格：1080×1920 竖屏，60fps，约 140 秒，无音频
- 技术：Remotion 4 + React + TypeScript；3D 效果用纯数学透视投影（不依赖 WebGL），逐帧确定、可复现

## 快速开始

```bash
npm install
npm start            # 打开 Remotion Studio 预览
npm run build        # 渲染成片 out/final.mp4（1080×1920）
npm run preview      # 渲染低分辨率预览 out/preview.mp4（432×768）
```

单幕截图（先打包一次，再逐张渲染）：

```bash
scripts/stills.sh S01-Neuron stills/01 2.5 5.8 9.4   # 合成ID  输出前缀  秒数...
```

## 按音乐节拍调整时长

只改 `src/timeline.ts` 里的秒数：

```ts
export const TIMELINE = {
  hook: 5,
  neuron: 12,
  tokens: 12,
  ...
};
```

- 每一幕自动接在上一幕后面，总时长自动重算；
- 每一幕内部的动画按比例伸缩（每幕都按"设计时长"编排，见各场景文件里的 `DESIGN`），所以改长改短都不会截断动画。

## 目录结构

```
src/
  timeline.ts          所有幕的时长（秒）
  Video.tsx            用 <Sequence> 按顺序拼接
  Root.tsx             主合成 Main + 每一幕的单独合成（Scenes 文件夹）
  scenes/              每一幕一个文件：00-Hook.tsx、01-Neuron.tsx ……
  components/          公共组件：字幕、逐字打出、冲击字、全息投影、章节标签、背景、颗粒……
  lib/                 动画缓动、3D 投影
public/fonts/          思源黑体 Noto Sans SC、JetBrains Mono（本地加载，离线可渲染）
previews/              阶段性关键帧截图与低分辨率预览
```

## 浏览器

Remotion 默认会自动下载 Headless Chrome。若下载失败，`remotion.config.ts` 会自动使用系统里的
Chrome（`/usr/bin/google-chrome` 等），也可以用环境变量 `REMOTION_BROWSER=/path/to/chrome` 指定。

## 字体许可

Noto Sans SC 与 JetBrains Mono 均为 SIL Open Font License 1.1。
