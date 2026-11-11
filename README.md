# AI 到底是怎么工作的 —— 竖屏科普视频（Remotion）

从一个神经元讲到 ChatGPT，核心是论文《Attention Is All You Need》（2017）。

- 规格：1080×1920 竖屏，60fps，约 167 秒，无音频
- 成片：`final/how-ai-works-1080x1920.mp4`；分段低清预览与关键帧在 `previews/`
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
  hook: 5.4,
  neuron: 13.7,
  tokens: 14,
  ...
};
```

- 每一幕自动接在上一幕后面，总时长自动重算；
- 每一幕都按"设计时长"编排（场景文件顶部的 `DESIGN`），并在 `KEEP` 里标出震撼段（冲击、爆发、镜头急推急拉）；
- 改时长时，震撼段始终保持原速，只有讲解段伸缩来吸收差值，所以不会截断动画，也不会把冲击感拖慢。

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

## 分镜一览

| 幕 | 文件 | 内容 |
|---|---|---|
| 钩子 | `00-Hook.tsx` | "你和 AI 说的每一句话……背后都是数学"，数字洪流收缩成光点 |
| 01 神经元 | `01-Neuron.tsx` | 乘法 + 加法 + ReLU 开关；镜头拉远成几百万个神经元的网络 |
| 02 文字变数字 | `02-Tokens.tsx` | Token 切分、512 维向量、3D 语义空间、国王 − 男人 + 女人 ≈ 女王 |
| 03 一篇论文 | `03-Paper.tsx` | RNN 慢且会忘；2017 年 8 位作者；论文标题砸下 |
| 04 注意力 | `04-Attention.tsx` | it 指谁？并行、点积打分、softmax、吸收上下文 |
| 05 核心公式 | `05-Formula.tsx` | 图书馆类比 Q/K/V；softmax(QKᵀ/√dₖ)V 逐项讲解 |
| 06 Transformer | `06-Transformer.tsx` | 多头、位置编码、积木块、编码器/解码器双塔、GPT 只用右塔 |
| 07 猜下一个词 | `07-NextToken.tsx` | 概率柱状图、逐词生成、温度 |
| 08 怎么学会的 | `08-Training.tsx` | 随机参数、交叉熵 Loss、反向传播、梯度下降、预训练 |
| 09 越大越强 | `09-Scaling.tsx` | 规模定律、6500 万 → 1750 亿 |
| 10 会聊天了 | `10-Chat.tsx` | 预训练 → 指令微调 → RLHF |
| 收尾 | `11-Outro.tsx` | Transformer 家族树，"Attention is all you need." |

## 事实与出处

- 论文：Vaswani et al., *Attention Is All You Need*, NeurIPS 2017（arXiv:1706.03762）。d_model = 512、8 个头、编码器/解码器各 6 层、dₖ = 64、base 模型约 6500 万参数（论文 Table 3）。
- 标题致敬披头士：作者 Llion Jones 在 2023 年接受 Financial Times 采访时所说。
- "国王 − 男人 + 女人 ≈ 女王"：word2vec（Mikolov et al., 2013）的经典示例。
- 例句 "The animal didn't cross the street because it was too tired"：Google 2017 年介绍 Transformer 的博客。
- GPT-3：1750 亿参数、96 层、预训练约 3000 亿 token（Brown et al., 2020）。
- 规模定律：Kaplan et al., 2020（损失随算力、数据、参数呈幂律下降，对数坐标下为直线）。
- RLHF 流程：InstructGPT（Ouyang et al., 2022）。
- 画面上所有示意性的概率、分数都标注了"示意"。
