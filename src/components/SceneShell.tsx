import React, { createContext, useContext } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../theme";
import { ChapterTag } from "./ChapterTag";
import { Grain } from "./Grain";

type Ctx = { design: number; durationInFrames: number };
const SceneContext = createContext<Ctx>({ design: 1, durationInFrames: 60 });

/**
 * 每一幕的外壳：
 *  - 提供"设计时间" t（秒）。每幕按 design 秒来编排动画，
 *    实际时长由 timeline.ts 决定，内部动画自动按比例伸缩。
 *  - 右上角章节标签、胶片颗粒。
 */
export const SceneShell: React.FC<{
  design: number;
  durationInFrames: number;
  chapter?: string;
  children: React.ReactNode;
}> = ({ design, durationInFrames, chapter, children }) => {
  return (
    <SceneContext.Provider value={{ design, durationInFrames }}>
      <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>
        {children}
        {chapter ? <ChapterTag label={chapter} /> : null}
        <Grain />
      </AbsoluteFill>
    </SceneContext.Provider>
  );
};

/** 当前幕的"设计时间"（秒） */
export const useT = () => {
  const frame = useCurrentFrame();
  const { design, durationInFrames } = useContext(SceneContext);
  return (frame / durationInFrames) * design;
};

/** 当前幕的设计总时长（秒） */
export const useDesign = () => useContext(SceneContext).design;
