import React from "react";
import { Composition, Folder } from "remotion";
import { loadAllFonts } from "./fonts";
import { getLayout, getTotalFrames, SingleScene, Video } from "./Video";
import { FPS, HEIGHT, WIDTH } from "./timeline";

loadAllFonts();

export const Root: React.FC = () => {
  return (
    <>
      <Composition id="Main" component={Video} durationInFrames={getTotalFrames()} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Folder name="Scenes">
        {getLayout().map((s) => (
          <Composition
            key={s.key}
            id={s.id}
            component={SingleScene}
            defaultProps={{ sceneKey: s.key }}
            durationInFrames={s.durationInFrames}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        ))}
      </Folder>
    </>
  );
};
