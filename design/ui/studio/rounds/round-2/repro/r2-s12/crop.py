# Stacks the label line's count text from steps 05-09 of both runs into one image, scaled 3x.
import sys, os
from PIL import Image, ImageDraw
here = os.path.dirname(os.path.abspath(__file__))
rows = []
for run in ("run-1", "run-2"):
    for s in ("05", "06", "07", "08", "09"):
        im = Image.open(f"{here}/{run}/{s}.png").convert("RGB")
        sx = im.width / 1440
        c = im.crop((int(1205*sx), int(406*sx), int(1400*sx), int(426*sx))).resize((585, 60))
        lab = Image.new("RGB", (700, 60), "white"); lab.paste(c, (115, 0))
        ImageDraw.Draw(lab).text((5, 22), f"{run} {s}", fill="black")
        rows.append(lab)
out = Image.new("RGB", (700, 60*len(rows)), "white")
for i, r in enumerate(rows): out.paste(r, (0, 60*i))
out.save(f"{here}/counts.png")
