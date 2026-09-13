#!/usr/bin/env python3
"""Measure the real contrast inside a rectangle of a UAT screenshot.

Why this exists: design/ui/UAT.md asks a reader to verify that text RENDERS
readably, not merely that the DOM carries the right colour token. Two of the
places that matters most are not reachable by getComputedStyle at all -- the
node labels and the node colours are painted by graphty-element into a WebGL
canvas, so the only honest evidence is the pixels. The other rendering judge
the UAT uses (the Nanobanana MCP) agrees with whatever it is asked, so it is
used for shape-and-layout questions only; this script is the numeric half.

What it does: inside the given box it finds the modal (most common) colour and
calls that the ground, then finds the pixel farthest from the ground in
relative luminance and calls that the ink, and reports the WCAG 2.1 contrast
ratio between the two. On a box containing text on a flat ground that ratio is
the text's contrast. On a box containing no text it is close to 1.0, which is
why the box matters: crop tightly around the string under test.

Usage:
    python3 /abs/path/to/tools/uat-contrast.py /abs/path/SHOT.png X Y W H [MIN_RATIO]
    python3 /abs/path/to/tools/uat-contrast.py /abs/path/SHOT.png   (whole image)

Both paths are named ABSOLUTELY above on purpose, and UAT.md names them that way
in every command: this script lives at the repo root while the document's own
setup section works in the `graphty` package, and a runner whose working
directory resets between calls (Claude's does) cannot hold either one. A
relative path still works when the caller happens to be in the right directory;
a missing image reports which path was tried rather than raising.

X Y W H are in image pixels, which equal CSS pixels when the screenshot was
taken with the Playwright MCP's default scale of "css". MIN_RATIO defaults to
4.5, the WCAG AA threshold for body text.

Exit status is 0 when the ratio is at or above MIN_RATIO and 1 when it is not,
so a scenario can be scripted as well as read.
"""

import os
import sys
from collections import Counter

from PIL import Image

# WCAG 2.1 relative-luminance constants (w3.org/TR/WCAG21/#dfn-relative-luminance).
SRGB_LOW_SLOPE = 12.92
SRGB_LOW_CUT = 0.04045
SRGB_OFFSET = 0.055
SRGB_SCALE = 1.055
SRGB_GAMMA = 2.4
LUMA_R = 0.2126
LUMA_G = 0.7152
LUMA_B = 0.0722
CONTRAST_OFFSET = 0.05
DEFAULT_MIN_RATIO = 4.5


def channel(value):
    """Linearise one 0-255 sRGB channel."""
    v = value / 255.0
    if v <= SRGB_LOW_CUT:
        return v / SRGB_LOW_SLOPE
    return ((v + SRGB_OFFSET) / SRGB_SCALE) ** SRGB_GAMMA


def luminance(rgb):
    """Relative luminance of an (r, g, b) triple."""
    r, g, b = rgb[0], rgb[1], rgb[2]
    return LUMA_R * channel(r) + LUMA_G * channel(g) + LUMA_B * channel(b)


def ratio(first, second):
    """WCAG contrast ratio between two colours, lighter first or not."""
    a = luminance(first)
    b = luminance(second)
    if a < b:
        a, b = b, a
    return (a + CONTRAST_OFFSET) / (b + CONTRAST_OFFSET)


def main(argv):
    """Read the box, print the measurement, and return the exit status."""
    if len(argv) < 2:
        sys.stderr.write(__doc__)
        return 2

    path = argv[1]

    try:
        image = Image.open(path).convert("RGB")
    except FileNotFoundError:
        # The likeliest cause is a relative path run from the wrong directory, so
        # say which path was tried and where from rather than raising a traceback
        # a UAT reader would have to decode.
        sys.stderr.write("no such image: %s\n" % path)
        sys.stderr.write("tried from: %s (name the screenshot absolutely)\n" % os.getcwd())
        return 2

    if len(argv) >= 6:
        x, y, w, h = (int(argv[2]), int(argv[3]), int(argv[4]), int(argv[5]))
        box = image.crop((x, y, x + w, y + h))
    else:
        x, y, w, h = 0, 0, image.width, image.height
        box = image

    min_ratio = float(argv[6]) if len(argv) >= 7 else DEFAULT_MIN_RATIO

    pixels = list(box.getdata())
    if not pixels:
        sys.stderr.write("empty box\n")
        return 2

    ground = Counter(pixels).most_common(1)[0][0]
    ground_luma = luminance(ground)
    ink = max(pixels, key=lambda p: abs(luminance(p) - ground_luma))
    measured = ratio(ground, ink)

    print("image:  %s" % path)
    print("box:    x=%d y=%d w=%d h=%d (%d pixels)" % (x, y, w, h, len(pixels)))
    print("ground: rgb(%d, %d, %d)  luminance %.4f" % (ground[0], ground[1], ground[2], ground_luma))
    print("ink:    rgb(%d, %d, %d)  luminance %.4f" % (ink[0], ink[1], ink[2], luminance(ink)))
    print("ratio:  %.2f:1  (threshold %.2f:1)" % (measured, min_ratio))
    print("result: %s" % ("PASS" if measured >= min_ratio else "FAIL"))

    return 0 if measured >= min_ratio else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
