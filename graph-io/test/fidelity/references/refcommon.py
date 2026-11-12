"""Shared by the Python reference extractors (stdlib only).

Each extractor prints a scene as JSON on stdout with the tools' own shape, arrow and dash names;
`node common.mjs finish <out.json>` maps those names to the scene vocabulary, stamps canCarry from
routes.ts, validates the scene against scene.schema.json and writes it.

    python3 -m unittest refcommon   (from this directory) runs the self-tests.
"""

import datetime
import hashlib
import json
import math
import os
import platform
import re
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))


def sha256_file(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def provenance(route, tool, version, command, sample):
    return {"side": "reference", "route": route, "tool": tool, "version": version, "command": command,
            "sourceSha256": sha256_file(sample),
            "generatedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"}


def python_version():
    return f"Python {platform.python_version()}"


def hex_color(value):
    """'#rgb', '#rrggbb' or '#rrggbbaa' -> ('#rrggbb', alpha 0..1), or None."""
    if not value:
        return None
    v = value.strip().lower()
    m = re.fullmatch(r"#([0-9a-f]{3})", v)
    if m:
        return "#" + "".join(c + c for c in m.group(1)), 1.0
    m = re.fullmatch(r"#([0-9a-f]{6})([0-9a-f]{2})?", v)
    if m:
        return "#" + m.group(1), (int(m.group(2), 16) / 255 if m.group(2) else 1.0)
    return None


def dvips_colors(path=os.path.join(HERE, "dvipsnam.def")):
    """dvips color names -> '#rrggbb', converted from dvipsnam.def's CMYK the way dvips does:
    r = 1 - min(1, c + k), and the same for g (m) and b (y)."""
    out = {}
    for name, c, m, y, k in re.findall(r"\\DefineNamedColor\{named\}\{(\w+)\}\s*\{cmyk\}\{([\d.]+),([\d.]+),([\d.]+),([\d.]+)\}",
                                       open(path).read()):
        rgb = [1 - min(1.0, float(v) + float(k)) for v in (c, m, y)]
        out[name] = "#" + "".join(f"{round(x * 255):02x}" for x in rgb)
    return out


def clip_to_node(cx, cy, w, h, shape, px, py):
    """Where the segment from a node's center (cx, cy) toward (px, py) leaves the node's outline:
    an ellipse for ellipse-like shapes, else the bounding box. Returns (x, y); the center itself when
    (px, py) lies inside the node."""
    dx, dy = px - cx, py - cy
    if dx == 0 and dy == 0 or w <= 0 or h <= 0:
        return cx, cy
    if shape in ("ellipse", "circle", "oval"):
        t = 1 / math.sqrt((dx / (w / 2)) ** 2 + (dy / (h / 2)) ** 2)
    else:
        t = min(w / 2 / abs(dx) if dx else math.inf, h / 2 / abs(dy) if dy else math.inf)
    if t >= 1:
        return cx, cy
    return cx + dx * t, cy + dy * t


def clip_path(points, src, dst):
    """A path from the source node's port to the target node's port, with its ends moved to where it
    leaves the source outline and meets the target outline. src / dst: (cx, cy, w, h, shape)."""
    if len(points) < 2:
        return points
    first = clip_to_node(*src[:4], src[4], *points[1])
    last = clip_to_node(*dst[:4], dst[4], *points[-2])
    # a port off the center keeps its own point: clip only a path that starts at the center
    a = first if (points[0][0], points[0][1]) == (src[0], src[1]) else points[0]
    b = last if (points[-1][0], points[-1][1]) == (dst[0], dst[1]) else points[-1]
    return [list(a), *[list(p) for p in points[1:-1]], list(b)]


def label_position(nw, nh, lx, ly, lw, lh):
    """The position class of a label box (lx, ly, lw, lh) relative to its node's top-left corner."""
    cx, cy = lx + lw / 2, ly + lh / 2
    if 0 <= cx <= nw and 0 <= cy <= nh:
        return "inside"
    if ly >= nh - 0.5:
        return "below"
    if ly + lh <= 0.5:
        return "above"
    if lx >= nw - 0.5:
        return "right"
    if lx + lw <= 0.5:
        return "left"
    return "other"


def node(id_, x, y, w, h, shape, fill, fill_opacity, border, border_width, border_style, label, z, visible=True):
    return {"id": id_, "x": x, "y": y, "w": w, "h": h, "shape": shape, "fill": fill, "fillOpacity": fill_opacity,
            "border": {"color": border, "width": border_width if border else 0, "style": border_style or "solid"},
            "label": label, "visible": visible, "z": z}


def emit(scene):
    json.dump(scene, sys.stdout)


class SelfTest(unittest.TestCase):
    def test_hex(self):
        self.assertEqual(hex_color("#FFCC00"), ("#ffcc00", 1.0))
        self.assertEqual(hex_color("#ffcc0080")[0], "#ffcc00")
        self.assertAlmostEqual(hex_color("#ffcc0080")[1], 128 / 255)
        self.assertEqual(hex_color("#abc"), ("#aabbcc", 1.0))
        self.assertIsNone(hex_color("red"))

    def test_dvips(self):
        d = dvips_colors()
        self.assertEqual(len(d), 68)
        self.assertEqual(d["GreenYellow"], "#d9ff4f")  # cmyk 0.15,0,0.69,0
        self.assertEqual(d["Gray"], "#808080")  # k 0.50
        self.assertEqual(d["Black"], "#000000")

    def test_clip_box_and_ellipse(self):
        self.assertEqual(clip_to_node(0, 0, 20, 10, "rect", 100, 0), (10, 0))
        self.assertEqual(clip_to_node(0, 0, 20, 10, "rect", 0, -100), (0, -5))
        x, y = clip_to_node(0, 0, 20, 20, "ellipse", 30, 40)
        self.assertAlmostEqual(math.hypot(x, y), 10)
        self.assertEqual(clip_to_node(0, 0, 20, 20, "rect", 3, 3), (0, 0))  # target inside the node

    def test_clip_path_keeps_off_center_ports(self):
        p = clip_path([[0, 0], [100, 0]], (0, 0, 20, 20, "rect"), (100, 0, 20, 20, "rect"))
        self.assertEqual(p, [[10, 0], [90, 0]])
        p = clip_path([[0, 5], [100, 0]], (0, 0, 20, 20, "rect"), (100, 0, 20, 20, "rect"))
        self.assertEqual(p[0], [0, 5])

    def test_label_position(self):
        self.assertEqual(label_position(40, 20, 5, 2, 30, 16), "inside")
        self.assertEqual(label_position(40, 20, 0, 22, 40, 16), "below")
        self.assertEqual(label_position(40, 20, 0, -18, 40, 16), "above")
        self.assertEqual(label_position(40, 20, 44, 2, 30, 16), "right")


if __name__ == "__main__":
    unittest.main()
