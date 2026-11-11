"""设计秒 → 实际秒（检查用）。用法：python3 scripts/d2a.py <场景文件前缀如 03> <timeline键> <设计秒>..."""
import re, sys, glob
pre, key, secs = sys.argv[1], sys.argv[2], [float(x) for x in sys.argv[3:]]
src = open(glob.glob(f"src/scenes/{pre}-*.tsx")[0]).read()
design = float(re.search(r"export const DESIGN = ([\d.]+)", src).group(1))
keep = [tuple(map(float, m)) for m in re.findall(r"\[([\d.]+),\s*([\d.]+)\]", re.search(r"export const KEEP[^=]*= (\[[\s\S]*?\]);", src).group(1))]
actual = float(re.search(rf"\b{key}: ([\d.]+)", open("src/timeline.ts").read()).group(1))
K = sum(b - a for a, b in keep)
r = (actual - K) / (design - K)
def d2a(d):
    out, pos = 0.0, 0.0
    for a, b in sorted(keep):
        if d <= a: return out + (d - pos) * r
        out += (a - pos) * r
        if d <= b: return out + (d - a)
        out += b - a; pos = b
    return out + (d - pos) * r
print(" ".join(f"{min(d2a(d), actual - 1/60):.3f}" for d in secs))
