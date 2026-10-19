#!/usr/bin/env python3
"""Writes graphviz-vocabulary.json: Graphviz's documented style vocabulary, read from graphviz.org itself.

    python3 graphviz_vocabulary.py [--cache <dir>]

Sources (the pages the Graphviz project publishes for its own attributes):
  https://graphviz.org/doc/info/attrs.html        every attribute: name, used by, type, default, notes
  https://graphviz.org/doc/info/shapes.html       polygon shapes, records, HTML-like label elements and attributes
  https://graphviz.org/doc/info/arrows.html       the arrow grammar and its 42 single shapes
  https://graphviz.org/docs/attr-types/arrowType/ the backward-compatible arrow names
  https://graphviz.org/docs/attr-types/style/     style names per element kind
  https://graphviz.org/docs/attrs/splines/        splines values
  https://graphviz.org/docs/attr-types/portPos/   compass points
  https://graphviz.org/doc/info/colors.html       X11, SVG and Brewer color schemes

graphviz.py reads the JSON and fails when an attribute or value in it is neither on a specimen sheet nor listed with
the reason it is not, so a new Graphviz release (a new attribute, shape or arrow) shows up as a missing specimen.
"""
import html
import json
import os
import re
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
PAGES = {
    "attrs": "https://graphviz.org/doc/info/attrs.html",
    "shapes": "https://graphviz.org/doc/info/shapes.html",
    "arrows": "https://graphviz.org/doc/info/arrows.html",
    "arrowType": "https://graphviz.org/docs/attr-types/arrowType/",
    "style": "https://graphviz.org/docs/attr-types/style/",
    "splines": "https://graphviz.org/docs/attrs/splines/",
    "portPos": "https://graphviz.org/docs/attr-types/portPos/",
    "colors": "https://graphviz.org/doc/info/colors.html",
}


def fetch(name, cache):
    path = os.path.join(cache, name + ".html") if cache else None
    if path and os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return f.read()
    with urllib.request.urlopen(PAGES[name], timeout=60) as r:
        text = r.read().decode("utf-8")
    if path:
        os.makedirs(cache, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
    return text


def plain(s):
    """The page's main text, tags removed and whitespace collapsed."""
    i = s.find("<main")
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s[i if i >= 0 else 0:]))).strip()


def attributes(page):
    out = []
    for m in re.finditer(r"<TR>\s*(<TD><A ID=\"a:[^\"]+\".*?)</TR>", page, re.S):
        tds = [plain(c) for c in re.findall(r"<TD>(.*?)</TD>", m.group(1), re.S)]
        name, used, typ, default, minimum, notes = (tds + [""] * 6)[:6]
        out.append({"name": name, "usedBy": [u.strip() for u in used.split(",") if u.strip()], "type": typ,
                    "default": default, "minimum": minimum, "notes": notes})
    return out


def between(text, start, end):
    i = text.index(start) + len(start)
    return text[i:text.index(end, i)]


def main():
    cache = sys.argv[sys.argv.index("--cache") + 1] if "--cache" in sys.argv else None
    p = {k: fetch(k, cache) for k in PAGES}
    shapes = plain(p["shapes"])
    polygon = re.search(r'Polygon-based Nodes The possible polygon-based shapes are displayed below\.\s*([^"<]+)"',
                        p["shapes"]).group(1).split()
    html_elems = {}
    for m in re.finditer(r"<(TABLE|TD|FONT|BR|IMG)\s((?:[A-Z-]+ =\"[^\"]*\" )+)", between(
            shapes, "Each of the HTML elements has a set of optional attributes.", "ALIGN specifies")):
        html_elems[m.group(1)] = re.findall(r"([A-Z-]+) =\"([^\"]*)\"", m.group(2))
    arrows = plain(p["arrows"])
    single = between(arrows, "would appear on the right side of the edge.", "Last modified").split()
    single = [w for w in single if re.fullmatch(r"[a-z]+", w)][:42]
    primitives = between(arrows, "shape : ", " Primitive Shapes").replace("|", " ").split()
    legacy = between(plain(p["arrowType"]), "backward-compatibility (", ")").replace(",", " ").split()
    basic = between(plain(p["arrowType"]), "Edge arrowhead shape ", " The examples above").split()
    style = plain(p["style"])
    styles = {
        "nodesAndEdges": re.findall(r'"(\w+)"', between(style, "For nodes and edges:", "For edges only")),
        "edges": re.findall(r'"(\w+)"', between(style, "For edges only:", "For nodes only")),
        "nodes": re.findall(r'"(\w+)"', between(style, "For nodes only:", "For clusters")),
        "clusters": re.findall(r'"(\w+)"', between(style, "For clusters:", "The style \"radial\"")),
        "nodesClustersGraphs": ["radial"],
        "deviceDependent": ["setlinewidth"],
    }
    splines = sorted(set(re.findall(r"splines=(\w+|\"\")", plain(p["splines"]))))
    compass = re.findall(r'"(\w+)"', between(plain(p["portPos"]), "it must have the form", ". This modifies"))
    colors = plain(p["colors"])
    x11 = between(colors, "The X11 color scheme ", " The SVG color scheme").split()
    svg = between(colors, "SVG color scheme ", " Brewer color schemes").split()
    # A Brewer scheme is a name (which may end in a digit: dark2, pastel1, set3) and a size of 3 to 12: dark23 is
    # dark2 with 3 colors, set312 is set3 with 12.
    brewer = {m.group(1) + m.group(2): int(m.group(2))
              for m in re.finditer(r"\b([a-z]+\d?)(1[0-2]|[3-9]) color scheme", colors)}
    vocab = {
        "about": "Graphviz's documented style vocabulary, read from graphviz.org by graphviz_vocabulary.py; "
                 "graphviz.py builds the DOT specimen sheets from it and checks that every entry is drawn or "
                 "listed as not drawn, with the reason.",
        "sources": PAGES,
        "attributes": attributes(p["attrs"]),
        "polygonShapes": polygon,
        "recordShapes": ["record", "Mrecord"],
        "htmlLabel": {
            "textElements": ["BR", "FONT", "I", "B", "U", "O", "SUB", "SUP", "S"],
            "tableElements": ["TABLE", "TR", "TD", "HR", "VR", "IMG"],
            "attributes": {k: [a for a, _ in v] for k, v in html_elems.items()},
            "values": {k: {a: v for a, v in vals if "|" in v} for k, vals in html_elems.items()},
        },
        "arrows": {"primitives": primitives, "single": single, "legacy": legacy, "basic": basic,
                   "maxPerEnd": 4},
        "styles": styles,
        "splines": splines,
        "compassPoints": compass,
        "colorSchemes": {"x11": x11, "svg": svg, "brewer": brewer},
    }
    out = os.path.join(HERE, "graphviz-vocabulary.json")
    with open(out, "w", encoding="ascii") as f:
        json.dump(vocab, f, indent=1, ensure_ascii=True)
        f.write("\n")
    print(f"{out}: {len(vocab['attributes'])} attributes, {len(polygon)} polygon shapes, {len(single)} arrows, "
          f"{len(x11)} x11, {len(svg)} svg colors, {len(brewer)} brewer schemes")


if __name__ == "__main__":
    main()
