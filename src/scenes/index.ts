import React from "react";
import type { SceneKey } from "../timeline";
import { Hook, DESIGN as D00 } from "./00-Hook";
import { Neuron, DESIGN as D01 } from "./01-Neuron";
import { Tokens, DESIGN as D02 } from "./02-Tokens";

export type SceneDef = {
  key: SceneKey;
  /** 用于 Studio 中的单幕预览合成 ID */
  id: string;
  component: React.FC;
  /** 这一幕编排动画时使用的时长（秒）。实际时长看 timeline.ts，动画按比例伸缩。 */
  design: number;
  /** 右上角章节标签；不填则不显示 */
  chapter?: string;
};

/** 按播放顺序排列 */
export const SCENES: SceneDef[] = [
  { key: "hook", id: "S00-Hook", component: Hook, design: D00 },
  { key: "neuron", id: "S01-Neuron", component: Neuron, design: D01, chapter: "01 神经元" },
  { key: "tokens", id: "S02-Tokens", component: Tokens, design: D02, chapter: "02 文字变数字" },
];
