import React, { createContext, useContext, useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { makeWarp, Range } from "../lib/warp";
import { C } from "../theme";
import { ChapterTag } from "./ChapterTag";
import { Grain } from "./Grain";

type Ctx = { design: number; warp: (sec: number) => number };
const SceneContext = createContext<Ctx>({ design: 1, warp: (s) => s });

/**
 * 每一幕的外壳：
 *  - 提供"设计时间" t（秒）。每幕按 design 秒来编排动画，
 *    实际时长由 timeline.ts 决定：震撼段（keep）保持原速，其余讲解段自动伸缩。
 *  - 右上角章节标签、胶片颗粒。
 */
export const SceneShell: React.FC<{
  design: number;
  durationInFrames: number;
  keep?: Range[];
  chapter?: string;
  children: React.ReactNode;
}> = ({ design, durationInFrames, keep = [], chapter, children }) => {
  const { fps } = useVideoConfig();
  const warp = useMemo(() => makeWarp(design, keep, durationInFrames / fps), [design, keep, durationInFrames, fps]);
  return (
    <SceneContext.Provider value={{ design, warp }}>
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
  const { fps } = useVideoConfig();
  const { warp } = useContext(SceneContext);
  return warp(frame / fps);
};

/** 当前幕的设计总时长（秒） */
export const useDesign = () => useContext(SceneContext).design;
