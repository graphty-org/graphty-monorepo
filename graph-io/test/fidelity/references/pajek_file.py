"""Reference scene from a Pajek .net file's own values (route pajek-file): an independent tokenizer of
each vertex and line's own keys, so nothing a line leaves out is filled in (igraph's reader fills
every key a line omits with its own defaults once any line sets it, so it is not used).

    python3 pajek_file.py <sample.net> | node common.mjs finish <out.json>

Colors: dvips names from the vendored dvipsnam.def (converted from CMYK the way dvips does),
RGBrrggbb, and GrayNN (NN percent gray). Pajek knows more names than dvips (LightCyan, LightOrange,
...) whose RGB is not published; a node or line using one has no color here and the scene lists it as
a gap. Coordinates are the file's (0..1) times UNIT, as stored: Pajek's EPS export draws the [0,1] square as
[0,500] points ("Pajek to EPS", http://mrvar.fdv.uni-lj.si/pajek/DrawEPS.htm). Lengths are those points: a node is
BASE times its x_fact / y_fact (and s_size), bw, w and fos as written.

Pajek's defaults the manual names but does not state (Export Options: Size of Vertices, Interior Color, Font Size) are
ASSUMED here, as in graph-io's Pajek tool defaults: BASE 5 points, fill Yellow, font size 10. Confirm them in Pajek.
"""

import re
import shlex
import sys

from refcommon import dvips_colors, emit, node, provenance, python_version

UNIT = 500.0
BASE = 5.0
DEFAULT_FILL = "#ffff00"  # assumed: Yellow
DEFAULT_FONT_SIZE = 10.0  # assumed
SHAPES = {"ellipse", "box", "diamond", "triangle", "cross", "empty", "man", "woman"}
VERTEX_KEYS = {"x_fact": 1, "y_fact": 1, "s_size": 1, "phi": 1, "r": 1, "q": 1, "ic": 1, "bc": 1, "bw": 1, "lc": 1, "la": 1,
               "lr": 1, "lphi": 1, "fos": 1, "font": 1, "w": 1}
LINE_KEYS = {"w": 1, "c": 1, "p": 1, "s": 1, "a": 1, "ap": 1, "a1": 1, "k1": 1, "k2": 1, "l": 1, "lp": 1, "lr": 1, "lphi": 1,
             "lc": 1, "fos": 1, "font": 1, "h1": 1, "h2": 1, "a2": 1}


def num(t):
    try:
        return float(t)
    except ValueError:
        return None


class Colors:
    def __init__(self):
        self.dvips = dvips_colors()
        self.unknown = set()

    def __call__(self, name):
        if name is None:
            return None
        if name in self.dvips:
            return self.dvips[name]
        m = re.fullmatch(r"RGB([0-9A-Fa-f]{6})", name)
        if m:
            return "#" + m.group(1).lower()
        m = re.fullmatch(r"RGB\(([0-9.]+),([0-9.]+),([0-9.]+)\)", name)
        if m and all(0 <= float(c) <= 1 for c in m.groups()):
            return "#" + "".join(f"{round(255 * float(c)):02x}" for c in m.groups())
        m = re.fullmatch(r"Gray(\d{1,3})", name)
        if m:
            v = round(255 * (1 - int(m.group(1)) / 100))
            return f"#{v:02x}{v:02x}{v:02x}"
        self.unknown.add(name)
        return None


COLOR_KEYS = {"ic", "bc", "lc", "c"}


def keyed(tokens, keys):
    out, i = {}, 0
    while i < len(tokens):
        k = tokens[i]
        triple = tokens[i + 1:i + 4]
        if k in COLOR_KEYS and len(triple) == 3 and all(num(t) is not None and 0 <= num(t) <= 1 for t in triple):
            out[k] = "RGB(" + ",".join(triple) + ")"  # a color written as three fractions, `c 0.7 0.7 0.7`
            i += 4
        elif k in keys and i + 1 < len(tokens):
            out[k] = tokens[i + 1].strip('"')
            i += 2
        else:
            i += 1
    return out


def scene(path):
    colors = Colors()
    sec, nodes, edges, ordinal = None, [], [], {}
    pos, placed = {}, False
    for raw in open(path, encoding="utf-8", errors="replace"):
        line = raw.strip()
        if not line or line.startswith("%"):
            continue
        if line.startswith("*"):
            sec = line.split()[0].lower()
            continue
        toks = shlex.split(line, posix=False)
        if sec == "*vertices":
            vid, rest = toks[0], toks[1:]
            label = rest[0].strip('"') if rest and num(rest[0]) is None else None
            rest = rest[1:] if label is not None else rest
            coords = []
            while rest and num(rest[0]) is not None and len(coords) < 3:
                coords.append(num(rest.pop(0)))
            shape = rest.pop(0).lower() if rest and rest[0].lower() in SHAPES else "ellipse"
            k = keyed(rest, VERTEX_KEYS)
            x, y = (coords + [0.0, 0.0])[:2]
            placed = placed or bool(coords)
            size = float(k.get("s_size", 1))
            w, h = BASE * size * float(k.get("x_fact", 1)), BASE * size * float(k.get("y_fact", 1))
            fill, border = (colors(k["ic"]) if "ic" in k else DEFAULT_FILL), colors(k.get("bc", "Black"))
            pos[vid] = (x * UNIT, y * UNIT)
            lab = None
            if label:
                lab = {"text": label, "fontSize": float(k.get("fos", DEFAULT_FONT_SIZE)), "color": colors(k.get("lc", "Black")) or "#000000",
                       "position": "other" if "lr" in k or "la" in k or "lphi" in k else "right", "visible": True}
            nodes.append(node(vid, x * UNIT, y * UNIT, w, h, {"box": "rect"}.get(shape, shape), fill, 1.0 if fill else 0.0,
                              border, float(k.get("bw", 1)), "solid", lab, len(nodes)))
        elif sec in ("*arcs", "*edges"):
            s, t, rest = toks[0], toks[1], toks[2:]
            if rest and num(rest[0]) is not None:
                rest = rest[1:]  # the weight
            k = keyed(rest, LINE_KEYS)
            n = ordinal.get((s, t), 0)
            ordinal[(s, t)] = n + 1
            color = colors(k.get("c", "Black")) or "#000000"
            pattern = k.get("p", "Solid").lower()
            edges.append({"id": f"{s}->{t}" + (f"#{n}" if n else ""), "source": s, "target": t,
                          "points": [list(pos[s]), list(pos[t])], "curved": any(float(k.get(h, 0)) != 0 for h in ("h1", "h2")), "color": color,
                          "opacity": 1.0, "width": float(k.get("w", 1)),
                          "style": {"dots": "dotted", "dashes": "dashed"}.get(pattern, pattern),
                          "arrow": {"source": "none", "target": "filled-triangle" if sec == "*arcs" else "none"},
                          "label": k.get("l")})
        # ponytail: *Arcslist, *Edgeslist and *Matrix sections are not read; add them when a sample uses them
    gaps = []
    if not placed:
        gaps.append({"property": "position", "reason": "the file stores no coordinates; Pajek lays it out when it draws"})
    if colors.unknown:
        gaps.append({"property": "fill", "reason": "Pajek color names with no published RGB (not in dvipsnam.def): "
                     + ", ".join(sorted(colors.unknown)) + "; those nodes have no fill here"})
    gaps.append({"property": "labelPosition", "reason": "Pajek places labels by its own radius and angle defaults, which are viewer settings"})
    return {"provenance": provenance("pajek-file", "pajek_file.py (Python standard library) with dvipsnam.def", python_version(),
                                     "python3 pajek_file.py <file>", path),
            "canCarry": {}, "nodes": nodes, "edges": edges, "groups": [], "gaps": gaps}


if __name__ == "__main__":
    emit(scene(sys.argv[1]))
