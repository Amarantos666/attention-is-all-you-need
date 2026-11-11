import { Config } from "@remotion/cli/config";
import fs from "node:fs";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setCodec("h264");
Config.setCrf(20);
Config.setPixelFormat("yuv420p");
Config.setConcurrency(4);
Config.setChromiumOpenGlRenderer("swangle");

// 如果 Remotion 自动下载浏览器失败，就使用系统自带的 Chrome。
// 也可以用环境变量 REMOTION_BROWSER=/path/to/chrome 指定。
const candidates = [
  process.env.REMOTION_BROWSER,
  "/usr/bin/google-chrome",
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
].filter(Boolean) as string[];
const found = candidates.find((p) => fs.existsSync(p));
if (found && process.env.REMOTION_USE_BUNDLED_BROWSER !== "1") {
  Config.setBrowserExecutable(found);
}
