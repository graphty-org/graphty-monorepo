# usage: python3 metrics.py <key>  (after node check.mjs, which writes shots/<key>.png and shots/ref-2d*.png)
#  -- per-bend overlap / hole / spill against shots/ref-2d.png (2D only)
import sys
import numpy as np
from PIL import Image
CASES = ["179", "170", "135", "90", "45", "20", "5", "U-turn", "U-short"]
W = [1, 3, 8, 24]; A = [1, 0.5]
CR = 0.12 * 255
def cov(p): return np.clip((255 - p[..., 0].astype(float)) / (255 - CR), 0, None)
mine = cov(np.array(Image.open(f"shots/{sys.argv[1]}.png").convert("RGB")))
ref = cov(np.array(Image.open("shots/ref-2d-dash.png" if "dash" in sys.argv[1] else "shots/ref-2d.png").convert("RGB")))
tot = {"overlap": 0, "hole": 0, "spill": 0}
for r, case in enumerate(CASES):
    for ai, a in enumerate(A):
        for wi, w in enumerate(W):
            c = ai * 4 + wi
            m = mine[r * 160:(r + 1) * 160, c * 160:(c + 1) * 160] / a
            q = ref[r * 160:(r + 1) * 160, c * 160:(c + 1) * 160] / a
            o = int((m > 1.2).sum()) if a < 1 else 0
            h = int(((q > 0.85) & (m < 0.25)).sum())
            s = int(((q < 0.15) & (m > 0.75)).sum())
            tot["overlap"] += o; tot["hole"] += h; tot["spill"] += s
            if o or h or s:
                print(f"{case:8} w={w:2} a={a}: overlap {o} hole {h} spill {s}")
print(sys.argv[1], "TOTAL", tot)
