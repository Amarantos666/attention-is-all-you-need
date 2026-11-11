"""把若干张关键帧拼成一张缩略对照图（检查用）。用法：python3 scripts/sheet.py out.png a.png b.png ..."""
import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
W = 360
H = 640
sheet = Image.new("RGB", (W * len(files) + 8 * (len(files) - 1), H + 30), (40, 40, 40))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB").resize((W, H), Image.LANCZOS)
    sheet.paste(im, (i * (W + 8), 30))
    d.text((i * (W + 8) + 6, 8), f.split("/")[-1], fill=(255, 255, 0))
sheet.save(out)
