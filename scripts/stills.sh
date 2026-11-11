#!/usr/bin/env bash
# 用法：scripts/stills.sh <合成ID> <输出前缀> <秒1> [秒2] ...
# 例：  scripts/stills.sh S01-Neuron stills/01-neuron 2.5 5.8 9.4
# 先打包一次，再用 npx remotion still 逐张渲染关键帧。
set -euo pipefail
cd "$(dirname "$0")/.."
COMP="$1"; PREFIX="$2"; shift 2
if [ "${SKIP_BUNDLE:-0}" != "1" ]; then
  npx remotion bundle --out-dir=out/bundle --log=error >/dev/null
fi
mkdir -p "$(dirname "$PREFIX")"
for SEC in "$@"; do
  FRAME=$(node -e "console.log(Math.round(parseFloat('$SEC')*60))")
  OUT="${PREFIX}-${SEC}s.png"
  npx remotion still out/bundle "$COMP" "$OUT" --frame="$FRAME" --log=error >/dev/null 2>&1
  echo "$OUT"
done
