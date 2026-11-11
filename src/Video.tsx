import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { SceneShell } from "./components/SceneShell";
import { SCENES } from "./scenes";
import { TIMELINE, toFrames } from "./timeline";
import { C } from "./theme";

/** 根据 timeline.ts 计算每一幕的起点与帧数 */
export const getLayout = () => {
  let from = 0;
  return SCENES.map((s) => {
    const durationInFrames = toFrames(TIMELINE[s.key]);
    const item = { ...s, from, durationInFrames };
    from += durationInFrames;
    return item;
  });
};

export const getTotalFrames = () => getLayout().reduce((acc, s) => acc + s.durationInFrames, 0);

/** 主视频：按顺序拼接所有幕 */
export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {getLayout().map((s) => {
        const Comp = s.component;
        return (
          <Sequence key={s.key} from={s.from} durationInFrames={s.durationInFrames} name={s.id}>
            <SceneShell design={s.design} durationInFrames={s.durationInFrames} chapter={s.chapter}>
              <Comp />
            </SceneShell>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/** 单幕预览（方便在 Studio 里单独查看、单独截图） */
export const SingleScene: React.FC<{ sceneKey: string }> = ({ sceneKey }) => {
  const s = getLayout().find((x) => x.key === sceneKey)!;
  const Comp = s.component;
  return (
    <SceneShell design={s.design} durationInFrames={s.durationInFrames} chapter={s.chapter}>
      <Comp />
    </SceneShell>
  );
};
