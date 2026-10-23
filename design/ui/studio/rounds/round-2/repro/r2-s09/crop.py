# Crops the bottom-left pair (Dev/Eli) and the Chloe/Farah pair, plus the label statement,
# from the final screenshot of each run, into one image per run.
import sys, os
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__))
for n in (1, 2):
    run = os.path.join(here, f"run-{n}")
    last = sorted(f for f in os.listdir(run) if f.endswith(".png"))[-1]
    im = Image.open(os.path.join(run, last))
    a = im.crop((520, 690, 800, 790)).resize((840, 300))
    b = im.crop((1205, 350, 1440, 395)).resize((840, 160))
    out = Image.new("RGB", (840, 460), "white"); out.paste(a, (0, 0)); out.paste(b, (0, 300))
    out.save(os.path.join(here, f"run-{n}-overlap.png")); print(run, last)
