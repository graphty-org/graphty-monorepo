# Crops the same label area from the 2x and 4x exports, scales both to the same size, and
# measures edge sharpness (mean absolute gradient) so the two can be compared by number too.
import sys
from PIL import Image, ImageChops, ImageFilter, ImageStat
d = sys.argv[1]
a = Image.open(d + "/run/downloads/les-miserables_current-view.png").convert("L")
b = Image.open(d + "/run/downloads/les-miserables_current-view (2).png").convert("L")
# box in 2x pixels around Myriel's name and the names below it
box2 = (180, 600, 420, 840)
ca = a.crop(box2).resize((960, 960), Image.NEAREST)
cb = b.crop(tuple(v * 2 for v in box2)).resize((960, 960), Image.NEAREST)
out = Image.new("L", (1920, 960), 255); out.paste(ca, (0, 0)); out.paste(cb, (960, 0))
out.save(d + "/labels-2x-left-4x-right.png")
def sharp(img):
    e = img.filter(ImageFilter.FIND_EDGES)
    return ImageStat.Stat(e).mean[0]
print("edge mean 2x crop (native):", round(sharp(a.crop(box2)), 2))
print("edge mean 4x crop (native):", round(sharp(b.crop(tuple(v * 2 for v in box2))), 2))
# Is the 4x file just the 2x picture enlarged? Enlarge the 2x file to 4x size and compare.
up = a.resize(b.size, Image.BICUBIC)
diff = ImageStat.Stat(ImageChops.difference(up, b)).mean[0]
print("mean abs difference, 2x enlarged vs 4x (0-255):", round(diff, 2))
