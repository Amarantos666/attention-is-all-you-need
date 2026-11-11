import React from "react";
import type { SceneKey } from "../timeline";
import type { Range } from "../lib/warp";
import { Hook, DESIGN as D00, KEEP as K00 } from "./00-Hook";
import { Neuron, DESIGN as D01, KEEP as K01 } from "./01-Neuron";
import { Tokens, DESIGN as D02, KEEP as K02 } from "./02-Tokens";
import { Paper, DESIGN as D03, KEEP as K03 } from "./03-Paper";
import { Attention, DESIGN as D04, KEEP as K04 } from "./04-Attention";
import { Formula05, DESIGN as D05, KEEP as K05 } from "./05-Formula";
import { Transformer, DESIGN as D06, KEEP as K06 } from "./06-Transformer";
import { NextToken, DESIGN as D07, KEEP as K07 } from "./07-NextToken";
import { Training, DESIGN as D08, KEEP as K08 } from "./08-Training";

export type SceneDef = {
  key: SceneKey;
  /** 用于 Studio 中的单幕预览合成 ID */
  id: string;
  component: React.FC;
  /** 这一幕编排动画时使用的时长（秒）。实际时长看 timeline.ts，动画按比例伸缩。 */
  design: number;
  /** 震撼段（设计秒区间）：调整时长时这些段保持原速，只伸缩其余讲解段 */
  keep: Range[];
  /** 右上角章节标签；不填则不显示 */
  chapter?: string;
};

/** 按播放顺序排列 */
export const SCENES: SceneDef[] = [
  { key: "hook", id: "S00-Hook", component: Hook, design: D00, keep: K00 },
  { key: "neuron", id: "S01-Neuron", component: Neuron, design: D01, keep: K01, chapter: "01 神经元" },
  { key: "tokens", id: "S02-Tokens", component: Tokens, design: D02, keep: K02, chapter: "02 文字变数字" },
  { key: "paper", id: "S03-Paper", component: Paper, design: D03, keep: K03, chapter: "03 一篇论文" },
  { key: "attention", id: "S04-Attention", component: Attention, design: D04, keep: K04, chapter: "04 注意力" },
  { key: "formula", id: "S05-Formula", component: Formula05, design: D05, keep: K05, chapter: "05 核心公式" },
  { key: "transformer", id: "S06-Transformer", component: Transformer, design: D06, keep: K06, chapter: "06 Transformer" },
  { key: "nextToken", id: "S07-NextToken", component: NextToken, design: D07, keep: K07, chapter: "07 猜下一个词" },
  { key: "training", id: "S08-Training", component: Training, design: D08, keep: K08, chapter: "08 怎么学会的" },
];
