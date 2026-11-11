import React from "react";
import { AbsoluteFill, Audio, getStaticFiles, interpolate, Sequence, staticFile } from "remotion";
import { SceneShell } from "./components/SceneShell";
import { SCENES } from "./scenes";
import { FPS, MUSIC, SYNC, TIMELINE } from "./timeline";
import { C } from "./theme";

/**
 * 根据 timeline.ts 计算每一幕的起点与帧数。
 * 起点按累计秒数取整（而不是每幕各自取整再相加），所以几十幕之后也不会和音乐节拍错开。
 */
export const getLayout = () => {
  let acc = 0;
  return SCENES.map((s) => {
    const from = Math.round(acc * FPS);
    acc += TIMELINE[s.key];
    const durationInFrames = Math.max(1, Math.round(acc * FPS) - from);
    return { ...s, from, durationInFrames, pins: SYNC[s.key] ?? [] };
  });
};

export const getTotalFrames = () => {
  const last = getLayout().at(-1)!;
  return last.from + last.durationInFrames;
};

const hasMusic = () => getStaticFiles().some((f) => f.name === MUSIC.file);

/** 配乐：从 songOffset 开始播放，开头淡入、结尾淡出；public/ 下没有音频文件时不加 */
const Music: React.FC = () => {
  if (!hasMusic()) return null;
  const total = getTotalFrames();
  return (
    <Audio
      src={staticFile(MUSIC.file)}
      trimBefore={Math.round(MUSIC.songOffset * FPS)}
      volume={(f) =>
        MUSIC.volume *
        interpolate(f, [0, MUSIC.fadeIn * FPS, total - MUSIC.fadeOut * FPS, total], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
  );
};

/** 主视频：按顺序拼接所有幕 */
export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {getLayout().map((s) => {
        const Comp = s.component;
        return (
          <Sequence key={s.key} from={s.from} durationInFrames={s.durationInFrames} name={s.id}>
            <SceneShell design={s.design} durationInFrames={s.durationInFrames} keep={s.keep} pins={s.pins} chapter={s.chapter}>
              <Comp />
            </SceneShell>
          </Sequence>
        );
      })}
      <Music />
    </AbsoluteFill>
  );
};

/** 单幕预览（方便在 Studio 里单独查看、单独截图） */
export const SingleScene: React.FC<{ sceneKey: string }> = ({ sceneKey }) => {
  const s = getLayout().find((x) => x.key === sceneKey)!;
  const Comp = s.component;
  return (
    <SceneShell design={s.design} durationInFrames={s.durationInFrames} keep={s.keep} pins={s.pins} chapter={s.chapter}>
      <Comp />
    </SceneShell>
  );
};
