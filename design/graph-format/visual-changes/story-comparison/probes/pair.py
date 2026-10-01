# pair.py <dir> <safe-id> <out.png> [x0 y0 x1 y1]: before (left) and after (right) side by side
import sys
from PIL import Image, ImageDraw
d, sid, out = sys.argv[1:4]
a = Image.open(f"{d}/{sid}.baseline.png").convert("RGB"); b = Image.open(f"{d}/{sid}.head.png").convert("RGB")
if len(sys.argv) > 4:
    box = tuple(int(v) for v in sys.argv[4:8]); a = a.crop(box); b = b.crop(box)
w, h = a.size; gap = 12
im = Image.new("RGB", (2 * w + gap, h + 22), "white"); im.paste(a, (0, 22)); im.paste(b, (w + gap, 22))
dr = ImageDraw.Draw(im); dr.text((4, 4), "before", fill="black"); dr.text((w + gap + 4, 4), "after", fill="black")
dr.rectangle([w, 0, w + gap - 1, h + 22], fill=(200, 200, 200))
im.save(out, optimize=True)
