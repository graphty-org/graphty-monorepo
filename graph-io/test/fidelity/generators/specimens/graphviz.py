#!/usr/bin/env python3
"""Writes the Graphviz DOT style specimen sheets (graph-io/test/fidelity/specimens/dot/), deterministic.

    python3 graphviz.py [out-dir]        (default: ../../specimens/dot)

Every value in graphviz-vocabulary.json (Graphviz's own documentation, read by graphviz_vocabulary.py) is drawn on a
sheet, or named in NOT_DRAWN / NOT_SWEPT with the reason; the script fails otherwise, so a new Graphviz release
shows up as a missing specimen. Sheet rules: graph-io/test/fidelity/specimens/README.md.

Units: a sheet pixel is a Graphviz point. Positions are pinned (pos="x,y!", y up), drawn by neato -n2 with
size="12.5,9.375!" and pad 17 pt, so the 1200 x 900 pt drawing scales to exactly 1200 x 900 px. Every specimen
writes every neutral attribute explicitly; only mappings-bypass uses node [] / edge [] default statements.
"""
import json
import os
import re
import struct
import sys
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from sheet_layout import ANCHORS, LAYOUT, cells  # noqa: E402

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "../../specimens/dot")
VOCAB = json.load(open(os.path.join(HERE, "graphviz-vocabulary.json"), encoding="ascii"))
NEU = LAYOUT["neutral"]
H = LAYOUT["canvas"]["height"]
CAP = LAYOUT["captionFontSize"]
FONT = NEU["fontFamily"]
# The anchors' outer edges sit 17 px inside the canvas; a 17 pt pad makes the drawing exactly the canvas.
PAD = "0.2361"
GENERATOR = "graph-io/test/fidelity/generators/specimens/graphviz.py"


class Html(str):
    """An HTML-like label: written as <...>, never quoted."""


def num(v):
    s = f"{v:.4f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def inch(px):
    return num(px / 72)


def pos(x, y):
    return f"{num(x)},{num(H - y)}!"


def pt(x, y):
    return f"{num(x)},{num(H - y)}"


# The root graph's bounding box, as Graphviz's own laid-out output (-Tdot) writes it: the corner anchors' outer edges,
# in points, y up. A pinned pos="x,y!" alone is neato INPUT, read in inches; the bb says the file is laid out, so
# its positions are points, as neato -n2 draws them (graph-io's DOT reader decides the unit by it).
_ax = [v for a in ANCHORS for v in (a["x"] - a["size"] / 2, a["x"] + a["size"] / 2)]
_ay = [H - v for a in ANCHORS for v in (a["y"] - a["size"] / 2, a["y"] + a["size"] / 2)]
ROOT_BB = f"{num(min(_ax))},{num(min(_ay))},{num(max(_ax))},{num(max(_ay))}"


def q(v):
    """A DOT value: an HTML label as <...>; otherwise a quoted string whose backslash escapes (\\n, \\l, \\N ...)
    are Graphviz's own, so only double quotes are escaped."""
    if isinstance(v, Html):
        return f"<{v}>"
    return '"' + str(v).replace('"', '\\"') + '"'


def qcap(v):
    """A caption: shown literally, so a backslash is doubled."""
    return '"' + str(v).replace("\\", "\\\\").replace('"', '\\"') + '"'


def slug(v):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", str(v).lower())).strip("-")


def attrs(d):
    return ", ".join(f"{k}={q(v)}" for k, v in d.items() if v is not None)


NODE = {"shape": "ellipse", "width": inch(NEU["size"]), "height": inch(NEU["size"]), "fixedsize": "true",
        "style": "filled", "fillcolor": NEU["fill"], "color": NEU["border"], "penwidth": num(NEU["borderWidth"]),
        "label": "", "fontname": FONT, "fontsize": num(NEU["fontSize"]), "fontcolor": NEU["labelColor"]}
END = {**NODE, "shape": "circle", "width": inch(12), "height": inch(12)}
EDGE = {"color": NEU["edgeColor"], "penwidth": num(NEU["edgeWidth"]), "style": "solid", "dir": "forward",
        "arrowhead": "normal", "arrowtail": "none", "arrowsize": "1", "fontname": FONT,
        "fontsize": num(NEU["fontSize"]), "fontcolor": NEU["labelColor"]}
CLUSTER = {"style": "solid", "color": NEU["border"], "penwidth": num(NEU["borderWidth"]), "fontname": FONT,
           "fontsize": num(NEU["fontSize"]), "fontcolor": NEU["labelColor"], "labelloc": "t", "labeljust": "c"}

USED = {}  # attribute -> set of sheet ids, for the vocabulary check
STYLES = set()  # every style value drawn (style=a,b -> a, b; setlinewidth(4) -> setlinewidth)
HTML_USED = {}  # HTML-like label element -> the attributes drawn on it


def use(sheet, d):
    for k, v in d.items():
        USED.setdefault(k, set()).add(sheet)
        if k == "style" and isinstance(v, str):
            STYLES.update(re.sub(r"\(.*?\)", "", x).strip() for x in v.split(",") if x.strip())
        if isinstance(v, Html):
            for el, body in re.findall(r"<([A-Z]+)((?:\s+[A-Z-]+=\"[^\"]*\")*)\s*/?>", v):
                HTML_USED.setdefault(el, set()).update(re.findall(r"([A-Z-]+)=", body))


class Sheet:
    def __init__(self, sid, about, graph=None, columns=None, kind="digraph"):
        self.id, self.about, self.graph, self.columns, self.kind = sid, about, dict(graph or {}), columns, kind
        self.items = []  # (kind, ...) in order; laid out on write
        self.lines = []

    def node(self, sid, cap, **over):
        self.items.append(("node", sid, cap, over))

    def edge(self, sid, cap, **over):
        self.items.append(("edge", sid, cap, over))

    def custom(self, sid, cap, fn):
        """fn(cell) -> DOT lines, for specimens that need more than one element (clusters, ports, parallels)."""
        self.items.append(("custom", sid, cap, fn))

    def emit(self, line):
        self.lines.append("  " + line)

    def write(self):
        cl = cells(len(self.items), self.columns or fit_columns([cap for _, _, cap, _ in self.items]))
        use(self.id, self.graph)
        head = [f"// THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT {GENERATOR}",
                f"// Graphviz DOT style specimen sheet {self.id}: {self.about}",
                "// Positions are pinned (pos \"x,y!\", points, y up). Drawn with:",
                "//   neato -n2 -Tsvg -Gsize=\"12.5,9.375!\" <file>   (graph-io/test/fidelity/oracles/tools/graphviz.mjs)",
                f"{self.kind} {q(self.id)} {{",
                f"  graph [{attrs({'layout': 'neato', 'pad': PAD, 'bb': ROOT_BB, **self.graph})}];"]
        for a in ANCHORS:
            s = inch(a["size"])
            self.emit(f"{q(a['id'])} [{attrs({**NODE, 'shape': 'box', 'width': s, 'height': s, 'pos': pos(a['x'], a['y'])})}];")
        for (kind, sid, cap, over), c in zip(self.items, cl):
            if kind == "node":
                d = {k: v for k, v in {**NODE, **over}.items() if v is not None}
                if sid == "default":
                    d = {}
                use(self.id, over)
                self.emit(f"{q(sid)} [{attrs({**d, 'pos': pos(c['x'], c['y'])})}];")
            elif kind == "edge":
                self.end(sid + "-s", c["source"])
                self.end(sid + "-t", c["target"])
                d = {} if sid == "default" else {k: v for k, v in {**EDGE, **over}.items() if v is not None}
                use(self.id, over)
                d = {"id": sid, **d} if d else {}
                self.emit(f"{q(sid + '-s')} -> {q(sid + '-t')}" + (f" [{attrs(d)}];" if d else ";"))
            else:
                for line in over(c):
                    self.emit(line)
            self.emit(caption_line(sid, cap, c))
        ids = [sid for _, sid, _, _ in self.items]
        if len(ids) != len(set(ids)):
            raise SystemExit(f"{self.id}: duplicate specimen ids {sorted({i for i in ids if ids.count(i) > 1})}")
        if self.kind == "graph":  # an undirected graph's edge operator
            self.lines = [x.replace('" -> "', '" -- "') for x in self.lines]
        os.makedirs(OUT, exist_ok=True)
        with open(os.path.join(OUT, self.id + ".gv"), "w", encoding="ascii", newline="\n") as f:
            f.write("\n".join(head + self.lines + ["}", ""]))
        SHEETS.append(self)
        return len(self.items)

    def end(self, sid, p, **over):
        self.emit(f"{q(sid)} [{attrs({**END, **over, 'pos': pos(p['x'], p['y'])})}];")


SHEETS = []


def fit_columns(captions, limit=None):
    """The most columns (at most the layout's) whose cells are wide enough for the longest caption."""
    widest = max(len(c) for c in captions) * CAP * 0.62 + 10
    a = LAYOUT["area"]
    return max(1, min(limit or LAYOUT["columns"], int((a["x1"] - a["x0"]) // widest)))


ID = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def caption_line(sid, cap, c, reset=False):
    if not ID.match(sid):
        raise SystemExit(f"specimen id {sid!r} is not lowercase letters, digits and hyphens")
    extra = ', width="0", height="0", margin="0", fixedsize="false", style=""' if reset else ""
    return (f"{q('cap-' + sid)} [shape=\"plain\", label={qcap(cap)}, fontname={q(FONT)}, fontsize={q(num(CAP))}, "
            f"fontcolor=\"#000000\"{extra}, pos={q(pos(c['caption']['x'], c['caption']['y']))}];")


def edge_line(sid, src, dst, over, base=None):
    d = {k: v for k, v in {**(EDGE if base is None else base), **over}.items() if v is not None}
    return f"{q(src)} -> {q(dst)} [{attrs({'id': sid, **d})}];"


def lower(v):
    return slug(v)


# ------------------------------------------------------------------------------------------------ node shapes
def node_shapes():
    s = Sheet("specimen-node-shapes", "every polygon shape (shapes.html), on the neutral 36 pt node")
    s.node("default", "default")
    for shape in VOCAB["polygonShapes"]:
        s.node(f"shape-{lower(shape)}", f"shape={shape}", shape=shape)
    s.write()
    p = Sheet("specimen-node-shapes-p2", "records and the polygon parameters (sides, skew, distortion, orientation, "
              "regular, peripheries)")
    p.node("default", "default")
    big = {"width": inch(80), "height": inch(40)}
    p.node("shape-record", "shape=record", shape="record", label="a|b|c", **big)
    p.node("shape-mrecord", "shape=Mrecord", shape="Mrecord", label="a|b|c", **big)
    p.node("record-nested", "label={a|{b|c}}", shape="record", label="{a|{b|c}}", **big)
    p.node("record-vertical", "label={a|b|c}", shape="record", label="{a|b|c}", **big)
    p.node("record-ports", "label=<p1> a|<p2> b", shape="record", label="<p1> a|<p2> b", **big)
    p.node("record-escapes", "label=left\\lright\\r|c", shape="record", label="left\\lright\\r|c", **big)
    for v in (3, 4, 5, 6, 7, 8, 10, 12):
        p.node(f"sides-{v}", f"sides={v}", shape="polygon", sides=str(v))
    for v in ("0.4", "-0.4", "1"):
        p.node(f"skew-{v.replace('.', '').replace('-', 'm')}", f"skew={v}", shape="polygon", sides="4", skew=v)
    for v in ("0.6", "-0.6", "1"):
        p.node(f"distortion-{v.replace('.', '').replace('-', 'm')}", f"distortion={v}", shape="polygon", sides="4",
               distortion=v)
    for v in ("15", "30", "45", "90"):
        p.node(f"orientation-{v}", f"orientation={v}", shape="polygon", sides="5", orientation=v)
    p.node("orientation-box-30", "box orientation=30", shape="box", orientation="30")
    p.node("regular-true", "regular=true", shape="polygon", sides="6", regular="true", width=inch(60),
           height=inch(30))
    for v in ("0", "2", "3"):
        p.node(f"peripheries-{v}", f"peripheries={v}", shape="box", peripheries=v)
    p.node("peripheries-2-ellipse", "ellipse peripheries=2", peripheries="2")
    p.node("peripheries-0-circle", "circle peripheries=0", shape="circle", peripheries="0")
    p.node("doublecircle-peripheries-3", "doublecircle peripheries=3", shape="doublecircle", peripheries="3")
    p.node("point-width", "point width=0.2", shape="point", width=inch(14), height=inch(14))
    p.write()
    # rankdir is a layout setting, but it also turns record fields: under LR or RL a record's top-level fields stack
    # vertically, even at pinned positions (neato -n2). One page per value that turns them.
    for n, v in enumerate(("LR", "RL")):
        r = Sheet(f"specimen-node-shapes-p{n + 3}", f"rankdir={v} (a graph setting): record fields are turned",
                  graph={"rankdir": v}, columns=5)
        r.node("default", "default")
        r.node("shape-record", f"rankdir={v} record a|b|c", shape="record", label="a|b|c", **big)
        r.node("shape-mrecord", f"rankdir={v} Mrecord a|b|c", shape="Mrecord", label="a|b|c", **big)
        r.node("record-nested", f"rankdir={v} {{a|{{b|c}}}}", shape="record", label="{a|{b|c}}", **big)
        r.node("record-ports", f"rankdir={v} <p1> a|<p2> b", shape="record", label="<p1> a|<p2> b", **big)
        r.write()


# ------------------------------------------------------------------------------------------------ fills, borders
COLOR_SYNTAX = [
    ("fill-rgb-hex", "fillcolor=#e41a1c", {"fillcolor": "#e41a1c"}),
    ("fill-rgb-hex-upper", "fillcolor=#377EB8", {"fillcolor": "#377EB8"}),
    ("fill-rgba-hex", "fillcolor=#4daf4a80", {"fillcolor": "#4daf4a80"}),
    ("fill-hsv-space", "fillcolor=0.08 0.9 1.0", {"fillcolor": "0.08 0.9 1.0"}),
    ("fill-hsv-comma", "fillcolor=0.75,0.6,0.8", {"fillcolor": "0.75,0.6,0.8"}),
    ("fill-x11-name", "fillcolor=gold", {"fillcolor": "gold"}),
    ("fill-x11-numbered", "fillcolor=antiquewhite3", {"fillcolor": "antiquewhite3"}),
    ("fill-x11-gray", "fillcolor=gray42", {"fillcolor": "gray42"}),
    ("fill-x11-grey", "fillcolor=grey80", {"fillcolor": "grey80"}),
    ("fill-x11-case", "fillcolor=DarkOrchid", {"fillcolor": "DarkOrchid"}),
    ("fill-x11-green", "fillcolor=green (x11)", {"fillcolor": "green"}),
    ("fill-svg-green", "colorscheme=svg green", {"colorscheme": "svg", "fillcolor": "green"}),
    ("fill-svg-gray", "colorscheme=svg gray", {"colorscheme": "svg", "fillcolor": "gray"}),
    ("fill-svg-maroon", "colorscheme=svg maroon", {"colorscheme": "svg", "fillcolor": "maroon"}),
    ("fill-svg-purple", "colorscheme=svg purple", {"colorscheme": "svg", "fillcolor": "purple"}),
    ("fill-scheme-path-x11", "fillcolor=/x11/purple", {"fillcolor": "/x11/purple"}),
    ("fill-scheme-path-svg", "fillcolor=/svg/purple", {"fillcolor": "/svg/purple"}),
    ("fill-brewer-scheme", "colorscheme=blues9 fillcolor=7", {"colorscheme": "blues9", "fillcolor": "7"}),
    ("fill-brewer-path", "fillcolor=/accent8/5", {"fillcolor": "/accent8/5"}),
    ("fill-brewer-path-2", "fillcolor=/rdylgn11/2", {"fillcolor": "/rdylgn11/2"}),
    ("fill-transparent", "fillcolor=transparent", {"fillcolor": "transparent"}),
    ("fill-none", "fillcolor=none", {"fillcolor": "none"}),
    ("fill-from-color", "style=filled color=#e41a1c", {"fillcolor": None, "color": "#e41a1c"}),
    ("fill-not-filled", "fillcolor without style=filled", {"style": "solid", "fillcolor": "#e41a1c"}),
    ("fill-unstyled", "style=\"\" fillcolor=#e41a1c", {"style": "", "fillcolor": "#e41a1c"}),
]
GRADIENTS = [
    ("gradient-linear", "fillcolor=#e41a1c:#377eb8", {"fillcolor": "#e41a1c:#377eb8"}),
    ("gradient-three", "fillcolor=red:white:blue", {"fillcolor": "red:white:blue"}),
    ("gradient-weighted", "fillcolor=red;0.3:blue", {"fillcolor": "red;0.3:blue"}),
    ("gradient-angle-45", "gradientangle=45", {"fillcolor": "#e41a1c:#377eb8", "gradientangle": "45"}),
    ("gradient-angle-90", "gradientangle=90", {"fillcolor": "#e41a1c:#377eb8", "gradientangle": "90"}),
    ("gradient-angle-180", "gradientangle=180", {"fillcolor": "#e41a1c:#377eb8", "gradientangle": "180"}),
    ("gradient-angle-270", "gradientangle=270", {"fillcolor": "#e41a1c:#377eb8", "gradientangle": "270"}),
    ("gradient-radial", "style=radial", {"style": "radial", "fillcolor": "white:#377eb8"}),
    ("gradient-radial-angle", "radial gradientangle=90", {"style": "radial", "fillcolor": "white:#377eb8",
                                                          "gradientangle": "90"}),
    ("gradient-radial-one", "style=radial one color", {"style": "radial", "fillcolor": "#377eb8"}),
    ("gradient-box", "box fillcolor=a:b", {"shape": "box", "fillcolor": "#e41a1c:#377eb8"}),
]
BORDERS = [
    ("border-color", "color=#e41a1c", {"color": "#e41a1c"}),
    ("border-color-name", "color=blue", {"color": "blue"}),
    ("border-color-alpha", "color=#e41a1c60", {"color": "#e41a1c60"}),
    ("border-color-list", "color=red:blue", {"color": "red:blue"}),
    ("border-pencolor", "pencolor=#e41a1c (node)", {"pencolor": "#e41a1c"}),
    ("border-width-0", "penwidth=0", {"penwidth": "0"}),
    ("border-width-05", "penwidth=0.5", {"penwidth": "0.5"}),
    ("border-width-2", "penwidth=2", {"penwidth": "2"}),
    ("border-width-4", "penwidth=4", {"penwidth": "4"}),
    ("border-width-8", "penwidth=8", {"penwidth": "8"}),
    ("border-style-solid", "style=filled,solid", {"style": "filled,solid"}),
    ("border-style-dashed", "style=filled,dashed", {"style": "filled,dashed"}),
    ("border-style-dotted", "style=filled,dotted", {"style": "filled,dotted"}),
    ("border-style-bold", "style=filled,bold", {"style": "filled,bold", "penwidth": None}),
    ("border-style-bold-penwidth", "bold with penwidth=1", {"style": "filled,bold"}),
    ("border-style-setlinewidth", "setlinewidth(4)", {"style": "filled,setlinewidth(4)", "penwidth": None}),
    ("border-style-dashed-only", "style=dashed", {"style": "dashed"}),
    ("border-style-rounded", "box style=filled,rounded", {"shape": "box", "style": "filled,rounded"}),
    ("border-style-rounded-dashed", "rounded,dashed", {"shape": "box", "style": "filled,rounded,dashed"}),
    ("border-style-diagonals", "box style=filled,diagonals", {"shape": "box", "style": "filled,diagonals"}),
    ("border-style-diagonals-ellipse", "ellipse diagonals", {"style": "filled,diagonals"}),
    ("border-peripheries-color", "peripheries=2 color=red", {"peripheries": "2", "color": "#e41a1c"}),
    ("border-style-rounded-hexagon", "hexagon style=filled,rounded", {"shape": "hexagon", "style": "filled,rounded"}),
]


def fills_borders():
    s = Sheet("specimen-node-fills-borders", "fill colors in every color syntax and scheme, and gradients")
    s.node("default", "default")
    for sid, cap, over in COLOR_SYNTAX + GRADIENTS:
        s.node(sid, cap, **over)
    s.write()
    p = Sheet("specimen-node-fills-borders-p2", "border colors, widths and styles")
    p.node("default", "default")
    for sid, cap, over in BORDERS:
        p.node(sid, cap, **over)
    p.write()


# ------------------------------------------------------------------------------------------------ sizes, opacity
def sizes_opacity():
    s = Sheet("specimen-node-sizes-opacity", "width, height, fixedsize, margins, opacity, visibility, overlap order")
    s.node("default", "default")
    for v in (12, 24, 48, 72, 96):
        s.node(f"width-{v}", f"width={inch(v)}", width=inch(v))
    for v in (12, 24, 48, 72, 96):
        s.node(f"height-{v}", f"height={inch(v)}", height=inch(v))
    s.node("size-box-wide", "box 72x24", shape="box", width=inch(72), height=inch(24))
    s.node("fixedsize-false", "fixedsize=false + label", fixedsize="false", label="a longer label")
    s.node("fixedsize-false-small", "fixedsize=false w=0.2", fixedsize="false", width=inch(14), height=inch(14))
    s.node("fixedsize-shape", "fixedsize=shape + label", fixedsize="shape", label="a longer label")
    s.node("fixedsize-true-overflow", "fixedsize=true + label", label="a longer label")
    s.node("margin-04", "fixedsize=false margin=0.4", fixedsize="false", label="m", margin="0.4", width="0",
           height="0")
    s.node("margin-xy", "margin=0.3,0.05", fixedsize="false", label="m", margin="0.3,0.05", width="0", height="0")
    s.node("margin-default", "fixedsize=false label=m", fixedsize="false", label="m", width="0", height="0")
    s.node("regular-ellipse", "regular=true w=1 h=0.4", regular="true", width=inch(72), height=inch(29))
    for a in ("c0", "80", "40", "00"):
        s.node(f"fill-alpha-{a}", f"fillcolor=#e41a1c{a}", fillcolor=f"#e41a1c{a}")
    for a in ("80", "00"):
        s.node(f"border-alpha-{a}", f"color=#505050{a} pw=3", color=f"#505050{a}", penwidth="3")
    s.node("both-alpha-40", "fill and border alpha 40", fillcolor="#e41a1c40", color="#00000040", penwidth="3")
    s.node("style-invis", "style=invis", style="invis")
    s.node("style-invis-label", "style=invis + label", style="invis", label="hidden")
    s.node("style-invisible", "style=invisible", style="invisible")
    s.node("point-default", "shape=point (defaults)", shape="point", width=None, height=None, fixedsize=None,
           style=None, fillcolor=None, color=None, penwidth=None)

    def overlap(first, second):
        def fn(c):
            a = {**NODE, "fillcolor": "#e41a1c", "pos": pos(c["x"] - 9, c["y"])}
            b = {**NODE, "fillcolor": "#377eb8", "pos": pos(c["x"] + 9, c["y"])}
            use(s.id, a)
            return [f"{q(first)} [{attrs(a)}];", f"{q(second)} [{attrs(b)}];"]
        return fn
    s.custom("zorder", "declared order: red then blue", overlap("zorder", "zorder-b"))
    s.custom("edge-through-node", "edge drawn across a node", through(s))
    s.write()
    # outputorder is a graph setting: one page per value, the same z-order problems on each
    for n, v in enumerate(("nodesfirst", "edgesfirst")):
        p = Sheet(f"specimen-node-sizes-opacity-p{n + 2}", f"outputorder={v} (a graph setting): which of nodes and "
                  "edges is drawn on top", graph={"outputorder": v}, columns=4)
        p.node("default", "default")
        p.custom("edge-through-node", f"outputorder={v} edge across a node", through(p))
        p.custom("zorder", f"outputorder={v} red then blue", overlap("zorder", "zorder-b"))
        p.write()
    # quantum rounds a sized-to-label node's width and height up to a multiple of it (a graph setting)
    qp = Sheet("specimen-node-sizes-opacity-p4", "quantum=0.5 (a graph setting): node sizes rounded up to 0.5 inch",
               graph={"quantum": "0.5"}, columns=4)
    qp.node("default", "default")
    qp.node("quantum-label", "quantum=0.5 fixedsize=false + label", fixedsize="false", label="a longer label",
            width="0", height="0")
    qp.node("quantum-box", "quantum=0.5 box label=m", shape="box", fixedsize="false", label="m", width="0",
            height="0")
    qp.node("quantum-fixed", "quantum=0.5 fixedsize=true w=0.61", width=inch(44), height=inch(44))
    qp.write()


def through(sheet):
    """An edge whose straight segment crosses a node declared before it, so the drawing order shows."""
    def fn(c):
        sid = "edge-through-node"
        a, b = c["source"], c["target"]
        use(sheet.id, {"outputorder": 1} if sheet.graph.get("outputorder") else {})
        return [f"{q(sid + '-n')} [{attrs({**NODE, 'pos': pos(c['x'], c['y'])})}];",
                f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(a['x'] - 10, a['y'])})}];",
                f"{q(sid + '-t')} [{attrs({**END, 'pos': pos(b['x'] + 10, b['y'])})}];",
                edge_line(sid, sid + "-s", sid + "-t", {**LINE, "color": "#e41a1c", "penwidth": "3"})]
    return fn


# ------------------------------------------------------------------------------------------------ labels
def labels():
    s = Sheet("specimen-labels", "label text, escapes, fonts, sizes, colors, positions and external labels")
    s.node("default", "default")
    lab = {"label": "Abc", "fixedsize": "false", "width": inch(36), "height": inch(36)}
    s.node("label-text", "label=Abc", **lab)
    s.node("label-node-name", "no label (node name)", label=None, fixedsize="false")
    s.node("label-escape-n", "label=\\N", label="\\N", fixedsize="false")
    s.node("label-escape-g", "label=\\G", label="\\G", fixedsize="false")
    s.node("label-escape-l", "label=\\L", label="\\L", fixedsize="false")
    s.node("label-newline", "label=a\\nbb\\nccc", **{**lab, "label": "a\\nbb\\nccc"})
    s.node("label-left", "label=left\\lwide line\\l", **{**lab, "label": "left\\lwide line\\l"})
    s.node("label-right", "label=right\\rwide line\\r", **{**lab, "label": "right\\rwide line\\r"})
    s.node("label-unicode-escape", "label=&amp;#946;", **{**lab, "label": "a&#946;&amp;"})
    for f in ("DejaVu Sans", "DejaVu Serif", "DejaVu Sans Mono", "Liberation Sans", "Liberation Serif",
              "Lato", "FreeSans", "Times-Roman", "Helvetica", "Courier", "Arial", "serif", "sans-serif",
              "monospace"):
        s.node(f"fontname-{slug(f)}", f"fontname={f}", **{**lab, "fontname": f})
    for f in ("Helvetica-Bold", "Times-Italic", "Courier-BoldOblique", "DejaVu Sans:bold", "DejaVu Sans:italic",
              "DejaVu Sans Bold", "DejaVu Serif:bold:italic", "Lato:light"):
        s.node(f"fontname-{slug(f.replace(':', ' style '))}", f"fontname={f}", **{**lab, "fontname": f})
    for v in ("6", "8", "14", "20", "28"):
        s.node(f"fontsize-{v}", f"fontsize={v}", **{**lab, "fontsize": v})
    for v in ("#e41a1c", "blue", "#377eb880", "/blues9/8"):
        s.node(f"fontcolor-{slug(v)}", f"fontcolor={v}", **{**lab, "fontcolor": v})
    tall = {**lab, "fixedsize": "true", "height": inch(64), "width": inch(48)}
    for v in ("t", "c", "b"):
        s.node(f"labelloc-{v}", f"labelloc={v}", **{**tall, "labelloc": v})
    s.node("nojustify", "nojustify=true", **{**tall, "label": "wide line\\lx\\l", "nojustify": "true"})
    s.node("xlabel", "xlabel=ext", xlabel="ext")

    def xlp(c):
        d = {**NODE, "xlabel": "ext", "xlp": pt(c["x"] + 26, c["y"] - 26), "pos": pos(c["x"], c["y"])}
        use(s.id, d)
        return [f"{q('xlabel-xlp')} [{attrs(d)}];"]
    s.custom("xlabel-xlp", "xlabel xlp stored", xlp)
    s.node("label-overflow", "label wider than node", **{**lab, "fixedsize": "true", "label": "overflowing text"})
    s.node("label-empty", "label=\"\"", label="")
    s.write()
    h = Sheet("specimen-labels-p2", "HTML-like labels: text markup, fonts, line breaks and tables "
              "(shapes.html#html)")
    h.node("default", "default")
    hl = {"fixedsize": "false", "width": "0", "height": "0", "margin": "0.04"}
    for tag in VOCAB["htmlLabel"]["textElements"]:
        if tag in ("BR", "FONT"):
            continue
        h.node(f"html-{tag.lower()}", f"<{tag}>", label=Html(f"a<{tag}>bc</{tag}>d"), **hl)
    h.node("html-font-color", "<FONT COLOR>", label=Html('<FONT COLOR="#e41a1c">red</FONT>'), **hl)
    h.node("html-font-face", "<FONT FACE=DejaVu Serif>", label=Html('<FONT FACE="DejaVu Serif">serif</FONT>'), **hl)
    h.node("html-font-point-size", "<FONT POINT-SIZE=16>", label=Html('<FONT POINT-SIZE="16">big</FONT>'), **hl)
    h.node("html-nested", "<B><I><U>", label=Html("<B><I><U>all</U></I></B>"), **hl)
    for al in ("CENTER", "LEFT", "RIGHT"):
        h.node(f"html-br-{al.lower()}", f"<BR ALIGN={al}/>", label=Html(f'wide line<BR ALIGN="{al}"/>x<BR ALIGN="{al}"/>'), **hl)
    tb = {**hl, "shape": "plain"}

    def table(inner="<TR><TD>a</TD><TD>b</TD></TR>", **ta):
        a = "".join(f' {k.upper().replace("_", "-")}="{v}"' for k, v in ta.items())
        return Html(f"<TABLE{a}>{inner}</TABLE>")
    h.node("html-table", "<TABLE> shape=plain", label=table(), **tb)
    h.node("html-table-none", "<TABLE> shape=none", label=table(), **{**tb, "shape": "none"})
    h.node("html-table-in-box", "<TABLE> in shape=box", label=table(), **{**tb, "shape": "box"})
    for k, v in (("bgcolor", "#ffd700"), ("bgcolor", "#e41a1c:#377eb8"), ("border", "0"), ("border", "3"),
                 ("cellborder", "0"), ("cellpadding", "6"), ("cellspacing", "0"), ("cellspacing", "6"),
                 ("color", "#e41a1c"), ("style", "rounded"), ("style", "radial"), ("sides", "TB"),
                 ("width", "80"), ("height", "40"), ("columns", "*"), ("rows", "*")):
        extra = {k: v}
        if k == "style" and v == "radial":
            extra["bgcolor"] = "white:#377eb8"
        sid = f"html-table-{k}-{slug(v) or 'star'}"
        h.node(sid, f"<TABLE {k.upper()}={v}>", label=table(**extra), **tb)
    for k, v in (("bgcolor", "#ffd700"), ("border", "2"), ("color", "#e41a1c"), ("sides", "B"),
                 ("align", "LEFT"), ("align", "RIGHT"), ("valign", "TOP"), ("valign", "BOTTOM"),
                 ("balign", "LEFT"), ("width", "60"), ("style", "rounded"), ("gradientangle", "90")):
        cell = f'<TD {k.upper()}="{v}"' + (' BGCOLOR="#e41a1c:#377eb8"' if k == "gradientangle" else "") + \
            ">a" + ("<BR/>wide" if k == "balign" else "") + "</TD>"
        inner = f'<TR>{cell}<TD HEIGHT="30" WIDTH="30">b</TD></TR>' if k in ("align", "valign", "balign") or \
            k == "width" else f"<TR>{cell}<TD>b</TD></TR>"
        h.node(f"html-td-{k}-{slug(v)}", f"<TD {k.upper()}={v}>", label=table(inner), **tb)
    h.node("html-td-colspan", "<TD COLSPAN=2>", label=table("<TR><TD COLSPAN=\"2\">ab</TD></TR><TR><TD>a</TD><TD>b</TD></TR>"), **tb)
    h.node("html-td-rowspan", "<TD ROWSPAN=2>", label=table("<TR><TD ROWSPAN=\"2\">a</TD><TD>b</TD></TR><TR><TD>c</TD></TR>"), **tb)
    h.node("html-hr", "<HR/>", label=table("<TR><TD>a</TD></TR><HR/><TR><TD>b</TD></TR>"), **tb)
    h.node("html-vr", "<VR/>", label=table("<TR><TD>a</TD><VR/><TD>b</TD></TR>"), **tb)
    h.write()
    t = Sheet("specimen-labels-p3", "HTML-like labels: the remaining TABLE and TD attributes (alignment of a table "
              "in its cell, fixed sizes, gradient angle, padding, spacing, height, radial cells, text alignment)")
    t.node("default", "default")

    def outer(inner_table):
        return table(f'<TR><TD WIDTH="80" HEIGHT="50" FIXEDSIZE="TRUE">{inner_table}</TD></TR>')
    small = "<TR><TD>a</TD></TR>"
    for k, v in (("align", "LEFT"), ("align", "RIGHT"), ("valign", "TOP"), ("valign", "BOTTOM")):
        # the inner table is fixed smaller than its 80 x 50 cell, so its alignment has room to show
        t.node(f"html-table-{k}-{slug(v)}", f"inner <TABLE {k.upper()}={v}> 36x26",
               label=outer(f'<TABLE {k.upper()}="{v}" WIDTH="36" HEIGHT="26" FIXEDSIZE="TRUE">{small}</TABLE>'), **tb)
    t.node("html-table-fixedsize-true", "<TABLE FIXEDSIZE=TRUE 70x30>",
           label=table(fixedsize="TRUE", width="70", height="30"), **tb)
    t.node("html-table-gradientangle-90", "<TABLE GRADIENTANGLE=90>",
           label=table(bgcolor="#e41a1c:#377eb8", gradientangle="90"), **tb)
    for k, v in (("cellpadding", "8"), ("cellspacing", "6"), ("height", "40"), ("fixedsize", "TRUE")):
        size = ' WIDTH="40" HEIGHT="30"' if k == "fixedsize" else ""
        t.node(f"html-td-{k}-{slug(v)}", f"<TD {k.upper()}={v}>",
               label=table(f'<TR><TD {k.upper()}="{v}"{size}>a</TD><TD>b</TD></TR>'), **tb)
    t.node("html-td-style-radial", "<TD STYLE=radial>",
           label=table('<TR><TD STYLE="radial" BGCOLOR="white:#377eb8">a</TD><TD>b</TD></TR>'), **tb)
    t.node("html-td-align-text", "<TD ALIGN=TEXT>",
           label=table('<TR><TD ALIGN="TEXT" WIDTH="90">wide line<BR ALIGN="LEFT"/>x<BR ALIGN="RIGHT"/></TD></TR>'),
           **tb)
    t.node("html-td-port-cell", "<TD PORT=p> (no mark)", label=table('<TR><TD PORT="p">a</TD><TD>b</TD></TR>'), **tb)
    # shapes.html documents only ROUNDED and RADIAL for STYLE, but Graphviz also draws these (an unknown value warns
    # "Illegal value ... for STYLE"; these do not), so the program's own list is drawn
    for v in HTML_STYLE_UNDOCUMENTED:
        t.node(f"html-table-style-{v}", f"<TABLE STYLE={v}>", label=table(style=v), **tb)
        t.node(f"html-td-style-{v}", f"<TD STYLE={v}>",
               label=table(f'<TR><TD STYLE="{v}">a</TD><TD>b</TD></TR>'), **tb)
    t.write()
    f = Sheet("specimen-labels-p4", "forcelabels=false (a graph setting): an external label that would overlap "
              "another node is dropped", graph={"forcelabels": "false"}, columns=4)
    f.node("default", "default")
    f.node("xlabel-free", "forcelabels=false xlabel with room", xlabel="ext")

    def crowded(c):
        sid = "xlabel-crowded"
        d = {**NODE, "xlabel": "a long external label", "pos": pos(c["x"], c["y"])}
        use(f.id, d)
        ring = [(-26, -26), (0, -30), (26, -26), (-30, 0), (30, 0), (-26, 26), (0, 30), (26, 26)]
        return [f"{q(sid)} [{attrs(d)}];"] + [
            f"{q(f'{sid}-{i + 1}')} [{attrs({**END, 'pos': pos(c['x'] + dx, c['y'] + dy)})}];"
            for i, (dx, dy) in enumerate(ring)]
    f.custom("xlabel-crowded", "forcelabels=false xlabel with no room", crowded)
    f.write()


# ------------------------------------------------------------------------------------------------ edges, lines
LINE = {"dir": "none"}


def edges_lines():
    s = Sheet("specimen-edges-lines", "edge colors, color lists, widths, styles, ports, loops, parallels and stored "
              "routes (dir=none; splines unset: neato draws line segments)")
    s.edge("default", "default")
    for sid, cap, over in [
        ("color-hex", "color=#e41a1c", {"color": "#e41a1c"}),
        ("color-name", "color=blue", {"color": "blue"}),
        ("color-hsv", "color=0.33 1 0.6", {"color": "0.33 1 0.6"}),
        ("color-alpha", "color=#e41a1c60", {"color": "#e41a1c60"}),
        ("color-brewer", "colorscheme=set19 color=3", {"colorscheme": "set19", "color": "3"}),
        ("color-list-2", "color=red:blue", {"color": "red:blue"}),
        ("color-list-3", "color=red:green:blue", {"color": "red:green:blue"}),
        ("color-segments", "color=red;0.5:blue", {"color": "red;0.5:blue"}),
        ("color-segments-3", "red;0.2:green;0.3:blue", {"color": "red;0.2:green;0.3:blue"}),
        ("color-list-width", "red:blue penwidth=3", {"color": "red:blue", "penwidth": "3"}),
        ("width-05", "penwidth=0.5", {"penwidth": "0.5"}),
        ("width-1", "penwidth=1", {"penwidth": "1"}),
        ("width-3", "penwidth=3", {"penwidth": "3"}),
        ("width-6", "penwidth=6", {"penwidth": "6"}),
        ("width-0", "penwidth=0", {"penwidth": "0"}),
        ("style-dashed", "style=dashed", {"style": "dashed"}),
        ("style-dotted", "style=dotted", {"style": "dotted"}),
        ("style-bold", "style=bold", {"style": "bold", "penwidth": None}),
        ("style-bold-penwidth", "bold with penwidth=1.5", {"style": "bold"}),
        ("style-invis", "style=invis", {"style": "invis"}),
        ("style-setlinewidth", "setlinewidth(4)", {"style": "setlinewidth(4)", "penwidth": None}),
        ("style-dashed-width", "dashed penwidth=3", {"style": "dashed", "penwidth": "3"}),
        ("style-tapered", "tapered penwidth=7 dir=forward", {"style": "tapered", "penwidth": "7", "dir": "forward",
                                                             "arrowhead": "none"}),
        ("style-tapered-both", "tapered dir=both", {"style": "tapered", "penwidth": "7", "dir": "both",
                                                    "arrowhead": "none"}),
        ("style-tapered-back", "tapered dir=back", {"style": "tapered", "penwidth": "7", "dir": "back",
                                                    "arrowhead": "none"}),
    ]:
        s.edge(sid, cap, **{**LINE, **over})

    def port(sid, x):
        def fn(c):
            a, b = c["source"], c["target"]
            box = {**END, "shape": "box", "width": inch(24), "height": inch(24)}
            use(s.id, x)
            return [f"{q(sid + '-s')} [{attrs({**box, 'pos': pos(a['x'] - 8, a['y'])})}];",
                    f"{q(sid + '-t')} [{attrs({**box, 'pos': pos(b['x'] + 8, b['y'])})}];",
                    edge_line(sid, sid + "-s", sid + "-t", {**LINE, **x})]
        return fn
    for cp in VOCAB["compassPoints"]:
        sid = "headport-under" if cp == "_" else f"headport-{cp}"
        s.custom(sid, f"headport={cp}", port(sid, {"headport": cp}))
    for cp in ("n", "s"):
        s.custom(f"tailport-{cp}", f"tailport={cp}", port(f"tailport-{cp}", {"tailport": cp}))

    def named_port(sid, head, html=False):
        """An edge into a named port: a record field (<p2>) or an HTML-like label's <TD PORT>."""
        def fn(c):
            a, b = c["source"], c["target"]
            if html == "table":
                label = Html('<TABLE PORT="p2"><TR><TD>a</TD></TR><TR><TD>b</TD></TR></TABLE>')
            else:
                label = Html('<TABLE><TR><TD PORT="p1">a</TD></TR><TR><TD PORT="p2">b</TD></TR></TABLE>')
            if html:
                t = {**END, "shape": "plain", "fixedsize": "false", "width": "0", "height": "0", "label": label}
            else:
                t = {**END, "shape": "record", "width": inch(24), "height": inch(36), "label": "{<p1> a|<p2> b}"}
            use(s.id, {"headport": 1, **t})
            return [f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(a['x'] - 8, a['y'] - 20)})}];",
                    f"{q(sid + '-t')} [{attrs({**t, 'pos': pos(b['x'] + 6, b['y'])})}];",
                    edge_line(sid, sid + "-s", sid + "-t", {**LINE, "headport": head})]
        return fn
    s.custom("headport-record-field", "headport=p2 (record field)", named_port("headport-record-field", "p2"))
    s.custom("headport-record-field-compass", "headport=p2:w (record)",
             named_port("headport-record-field-compass", "p2:w"))
    s.custom("headport-html-port", "headport=p2 (HTML TD PORT)", named_port("headport-html-port", "p2", html=True))
    s.custom("headport-html-table-port", "headport=p2:w (HTML TABLE PORT)",
             named_port("headport-html-table-port", "p2:w", html="table"))

    def loop(sid, extra, n=1):
        def fn(c):
            out = [f"{q(sid + '-s')} [{attrs({**END, 'width': inch(24), 'height': inch(24), 'pos': pos(c['x'], c['y']), 'shape': 'circle'})}];"]
            for i in range(n):
                out.append(edge_line(f"{sid}-{i + 1}" if n > 1 else sid, sid + "-s", sid + "-s", {**LINE, **extra}))
            return out
        return fn
    s.custom("loop", "self-loop", loop("loop", {}))
    s.custom("loop-2", "two self-loops", loop("loop-2", {}, 2))
    s.custom("loop-port", "self-loop headport=n tailport=e", loop("loop-port", {"headport": "n", "tailport": "e"}))

    def parallel(sid, n):
        def fn(c):
            out = [f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(c['source']['x'], c['source']['y'])})}];",
                   f"{q(sid + '-t')} [{attrs({**END, 'pos': pos(c['target']['x'], c['target']['y'])})}];"]
            for i in range(n):
                out.append(edge_line(f"{sid}-{i + 1}", sid + "-s", sid + "-t", LINE))
            return out
        return fn
    s.custom("parallel-2", "two parallel edges", parallel("parallel-2", 2))
    s.custom("parallel-3", "three parallel edges", parallel("parallel-3", 3))

    def opposite(c):
        sid = "antiparallel"
        return [f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(c['source']['x'], c['source']['y'])})}];",
                f"{q(sid + '-t')} [{attrs({**END, 'pos': pos(c['target']['x'], c['target']['y'])})}];",
                edge_line(sid + "-1", sid + "-s", sid + "-t", {"dir": "forward"}),
                edge_line(sid + "-2", sid + "-t", sid + "-s", {"dir": "forward"})]
    s.custom("antiparallel", "a->b and b->a", opposite)

    def stored(sid, shape):
        def fn(c):
            a, b, x, y = c["source"], c["target"], c["x"], c["y"]
            if shape == "curve":
                pts = [(a["x"], a["y"]), (a["x"] + 15, y - 40), (b["x"] - 15, y - 40), (b["x"], b["y"])]
            elif shape == "s":
                pts = [(a["x"], a["y"]), (x, y - 50), (x, y + 40), (b["x"], b["y"])]
            elif shape == "bend":  # a polyline as collinear control points: two straight segments
                m = (x, y - 35)
                pts = [(a["x"], a["y"]), (a["x"], a["y"]), m, m, m, (b["x"], b["y"]), (b["x"], b["y"])]
            else:  # two cubic pieces
                pts = [(a["x"], a["y"]), (a["x"] + 10, y - 40), (x - 10, y - 40), (x, y),
                       (x + 10, y + 40), (b["x"] - 10, y + 40), (b["x"], b["y"])]
            use(s.id, {"pos": 1})
            return [f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(a['x'], a['y'])})}];",
                    f"{q(sid + '-t')} [{attrs({**END, 'pos': pos(b['x'], b['y'])})}];",
                    edge_line(sid, sid + "-s", sid + "-t", {**LINE, "pos": " ".join(pt(*p) for p in pts)})]
        return fn
    s.custom("pos-curve", "pos: one cubic", stored("pos-curve", "curve"))
    s.custom("pos-s", "pos: s-curve", stored("pos-s", "s"))
    s.custom("pos-bend", "pos: polyline bend", stored("pos-bend", "bend"))
    s.custom("pos-two-pieces", "pos: two cubics", stored("pos-two-pieces", "two"))

    def arrow_pos(c):
        sid = "pos-arrow-endpoint"
        a, b, y = c["source"], c["target"], c["y"]
        pts = [(a["x"] + 6, a["y"]), (a["x"] + 20, y - 30), (b["x"] - 30, y - 30), (b["x"] - 16, b["y"] - 3)]
        return [f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(a['x'], a['y'])})}];",
                f"{q(sid + '-t')} [{attrs({**END, 'pos': pos(b['x'], b['y'])})}];",
                edge_line(sid, sid + "-s", sid + "-t", {"pos": f"e,{pt(b['x'] - 6, b['y'])} " +
                                                          " ".join(pt(*p) for p in pts)})]
    s.custom("pos-arrow-endpoint", "pos with e,x,y", arrow_pos)

    # Graphviz's own laid-out output writes the tail arrow's tip as "s,x,y" before the spline (dir=back or both),
    # as it writes the head's as "e,x,y"; the spline then stops short of the tail node by the arrow's length
    def start_pos(sid, both):
        def fn(c):
            a, b, y = c["source"], c["target"], c["y"]
            pts = [(a["x"] + 16, a["y"] - 3), (a["x"] + 30, y - 30), (b["x"] - 20, y - 30),
                   (b["x"] - (16 if both else 6), b["y"] - (3 if both else 0))]
            head = f" e,{pt(b['x'] - 6, b['y'])}" if both else ""
            return [f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(a['x'], a['y'])})}];",
                    f"{q(sid + '-t')} [{attrs({**END, 'pos': pos(b['x'], b['y'])})}];",
                    edge_line(sid, sid + "-s", sid + "-t", {"dir": "both" if both else "back", "arrowtail": "normal",
                                                            "pos": f"s,{pt(a['x'] + 6, a['y'])}{head} " +
                                                            " ".join(pt(*p) for p in pts)})]
        return fn
    s.write()

    # one page per splines value: the same few routing problems drawn under each. true, false and "" are the
    # documented aliases of spline, line and none; files use them as often as the names, so they get pages too.
    order = ["spline", "polyline", "curved", "ortho", "line", "none", "true", "false", '""']
    if sorted(order) != sorted(VOCAB["splines"]):
        raise SystemExit(f"splines values changed: {sorted(VOCAB['splines'])}")
    for v in order:
        p = Sheet(f"specimen-edges-lines-p{2 + order.index(v)}",
                  f"splines={v} (a graph setting): straight, around an obstacle, loops, parallels, ports",
                  graph={"splines": "" if v == '""' else v}, columns=4)
        routes(p, v)
        p.write()

    # its own page, so the first page's specimens keep their cells
    p = Sheet(f"specimen-edges-lines-p{2 + len(order)}", "stored edge pos with the tail arrow's point (s,x,y)",
              columns=4)
    p.edge("default", "default")
    p.custom("pos-arrow-startpoint", "pos with s,x,y dir=back", start_pos("pos-arrow-startpoint", False))
    p.custom("pos-arrow-both-points", "pos with s and e dir=both", start_pos("pos-arrow-both-points", True))
    p.write()


def routes(p, v):
    p.edge("default", "default")
    p.edge("straight", f"splines={v} straight", **LINE)

    def obstacle(c):
        sid = "obstacle"
        a, b = c["source"], c["target"]
        a = {"x": a["x"] - 40, "y": a["y"]}
        b = {"x": b["x"] + 40, "y": b["y"]}
        return [f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(a['x'], a['y'])})}];",
                f"{q(sid + '-t')} [{attrs({**END, 'pos': pos(b['x'], b['y'])})}];",
                f"{q(sid + '-block')} [{attrs({**NODE, 'shape': 'box', 'width': inch(30), 'height': inch(40), 'pos': pos(c['x'], c['y'])})}];",
                edge_line(sid, sid + "-s", sid + "-t", LINE)]
    p.custom("obstacle", f"splines={v} around a node", obstacle)

    def diag(c):
        sid = "diagonal"
        return [f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(c['x'] - 60, c['y'] - 50)})}];",
                f"{q(sid + '-t')} [{attrs({**END, 'pos': pos(c['x'] + 60, c['y'] + 10)})}];",
                edge_line(sid, sid + "-s", sid + "-t", {"dir": "forward"})]
    p.custom("diagonal", f"splines={v} diagonal arrow", diag)

    def loop(c):
        sid = "loop"
        return [f"{q(sid + '-s')} [{attrs({**END, 'width': inch(24), 'height': inch(24), 'pos': pos(c['x'], c['y'])})}];",
                edge_line(sid, sid + "-s", sid + "-s", LINE)]
    p.custom("loop", f"splines={v} self-loop", loop)

    def par(c):
        sid = "parallel"
        return [f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(c['source']['x'] - 30, c['source']['y'])})}];",
                f"{q(sid + '-t')} [{attrs({**END, 'pos': pos(c['target']['x'] + 30, c['target']['y'])})}];",
                edge_line(sid + "-1", sid + "-s", sid + "-t", LINE),
                edge_line(sid + "-2", sid + "-s", sid + "-t", LINE)]
    p.custom("parallel", f"splines={v} two parallels", par)

    def ports(c):
        sid = "ports"
        box = {**END, "shape": "box", "width": inch(24), "height": inch(24)}
        return [f"{q(sid + '-s')} [{attrs({**box, 'pos': pos(c['x'] - 50, c['y'] + 10)})}];",
                f"{q(sid + '-t')} [{attrs({**box, 'pos': pos(c['x'] + 50, c['y'] - 40)})}];",
                edge_line(sid, sid + "-s", sid + "-t", {**LINE, "tailport": "n", "headport": "s"})]
    p.custom("ports", f"splines={v} tailport=n headport=s", ports)

    def label(c):
        sid = "label"
        return [f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(c['source']['x'] - 40, c['source']['y'])})}];",
                f"{q(sid + '-t')} [{attrs({**END, 'pos': pos(c['target']['x'] + 40, c['target']['y'])})}];",
                edge_line(sid, sid + "-s", sid + "-t", {**LINE, "label": "lbl"})]
    p.custom("label", f"splines={v} with a label", label)
    if v == "ortho":
        def radius(c):
            sid = "radius"
            use(p.id, {"radius": 1})
            return [f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(c['x'] - 50, c['y'] + 10)})}];",
                    f"{q(sid + '-t')} [{attrs({**END, 'pos': pos(c['x'] + 50, c['y'] - 40)})}];",
                    edge_line(sid, sid + "-s", sid + "-t", {**LINE, "radius": "8"})]
        p.custom("radius", "splines=ortho radius=8", radius)


# ------------------------------------------------------------------------------------------------ arrows
def arrows():
    a = VOCAB["arrows"]
    s = Sheet("specimen-arrows", "every single arrow shape (arrows.html), the backward-compatible names and "
              "multi-shape arrows, at the head")
    s.edge("default", "default")
    for name in a["single"]:
        s.edge(f"arrowhead-{name}", f"arrowhead={name}", arrowhead=name)
    for name in a["legacy"] + ["invdot", "invodot"]:
        s.edge(f"arrowhead-{name}", f"arrowhead={name}", arrowhead=name)
    for name in ("normalnormal", "nonenormal", "lteeoldiamond", "boxdotnormal", "invinvinv", "dotodotdotodot",
                 "crowtee", "veevee"):
        s.edge(f"arrowhead-{name}", f"arrowhead={name}", arrowhead=name)
    s.write()
    p = Sheet("specimen-arrows-p2", "every single arrow shape at the tail (dir=back), dir values, arrow size, "
              "color, fill and clipping")
    p.edge("default", "default")
    for name in a["single"]:
        p.edge(f"arrowtail-{name}", f"arrowtail={name}", dir="back", arrowhead="none", arrowtail=name)
    for d in ("forward", "back", "both", "none"):
        p.edge(f"dir-{d}", f"dir={d}", dir=d, arrowtail="normal")
    for v in ("0.5", "1.5", "2", "0"):
        p.edge(f"arrowsize-{v.replace('.', '')}", f"arrowsize={v}", arrowsize=v)
    p.edge("arrow-color", "color=#e41a1c", color="#e41a1c")
    p.edge("arrow-color-list", "color=red:blue", color="red:blue")
    p.edge("arrow-fillcolor", "fillcolor=#ffd700", fillcolor="#ffd700")
    p.edge("arrow-penwidth", "penwidth=3", penwidth="3")
    p.edge("arrow-style-dashed", "style=dashed", style="dashed")
    p.edge("arrow-headclip-false", "headclip=false", headclip="false")
    p.edge("arrow-tailclip-false", "tailclip=false dir=both", tailclip="false", dir="both", arrowtail="normal")
    p.edge("arrow-both-shapes", "dir=both tail=odot head=diamond", dir="both", arrowtail="odot", arrowhead="diamond")
    p.write()
    u = Sheet("specimen-arrows-p3", "an undirected graph (graph { a -- b }): no arrows unless dir is set",
              kind="graph", columns=4)
    u.edge("default", "default")
    u.edge("undirected-dir-unset", "graph: arrowhead=normal, dir unset", dir=None)
    for d in ("forward", "back", "both", "none"):
        u.edge(f"undirected-dir-{d}", f"graph: dir={d}", dir=d, arrowtail="normal")
    u.edge("undirected-arrowhead-diamond", "graph: dir=forward arrowhead=diamond", arrowhead="diamond")
    u.write()
    st = Sheet("specimen-arrows-p4", "a strict digraph: a repeated edge is one edge, its attributes merged",
               kind="strict digraph", columns=4)
    st.edge("default", "default")

    def repeated(c):
        sid = "strict-repeated-edge"
        use(st.id, {"color": 1, "penwidth": 1})
        return [f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(c['source']['x'], c['source']['y'])})}];",
                f"{q(sid + '-t')} [{attrs({**END, 'pos': pos(c['target']['x'], c['target']['y'])})}];",
                edge_line(sid, sid + "-s", sid + "-t", {"color": "#e41a1c"}),
                f"{q(sid + '-s')} -> {q(sid + '-t')} [penwidth=\"3\"];"]
    st.custom("strict-repeated-edge", "strict: a->b red, a->b penwidth=3", repeated)

    def opposite(c):
        sid = "strict-antiparallel"
        return [f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(c['source']['x'], c['source']['y'])})}];",
                f"{q(sid + '-t')} [{attrs({**END, 'pos': pos(c['target']['x'], c['target']['y'])})}];",
                edge_line(sid + "-1", sid + "-s", sid + "-t", {}),
                edge_line(sid + "-2", sid + "-t", sid + "-s", {})]
    st.custom("strict-antiparallel", "strict: a->b and b->a", opposite)
    st.write()


# ------------------------------------------------------------------------------------------------ edge labels
def edge_labels():
    s = Sheet("specimen-edge-labels", "edge label text, fonts, head and tail labels, label angle and distance, "
              "external labels, decoration and stored label positions", columns=4)
    s.edge("default", "default")
    L = {"label": "lbl"}
    for sid, cap, over in [
        ("label", "label=lbl", L),
        ("label-escape-e", "label=\\E", {"label": "\\E"}),
        ("label-multiline", "label=a\\nbb", {"label": "a\\nbb"}),
        ("label-fontsize-16", "fontsize=16", {**L, "fontsize": "16"}),
        ("label-escape-t-h", "label=\\T to \\H", {"label": "\\T to \\H"}),
        ("label-fontcolor", "fontcolor=#e41a1c", {**L, "fontcolor": "#e41a1c"}),
        ("label-fontname", "fontname=DejaVu Serif", {**L, "fontname": "DejaVu Serif"}),
        ("label-fontname-bold", "fontname=Helvetica-Bold", {**L, "fontname": "Helvetica-Bold"}),
        ("label-html", "label=<<B>b</B><I>i</I>>", {"label": Html("<B>b</B><I>i</I>")}),
        ("label-html-table", "label=<TABLE>", {"label": Html('<TABLE BGCOLOR="#ffd700"><TR><TD>t</TD></TR></TABLE>')}),
        ("headlabel", "headlabel=H", {"headlabel": "H"}),
        ("taillabel", "taillabel=T", {"taillabel": "T"}),
        ("labelfontsize", "labelfontsize=16", {"headlabel": "H", "labelfontsize": "16"}),
        ("labelfontcolor", "labelfontcolor=#e41a1c", {"headlabel": "H", "labelfontcolor": "#e41a1c"}),
        ("labelfontname", "labelfontname=DejaVu Serif", {"headlabel": "H", "labelfontname": "DejaVu Serif"}),
        ("labelangle-0", "labelangle=0", {"headlabel": "H", "labelangle": "0"}),
        ("labelangle-90", "labelangle=90", {"headlabel": "H", "labelangle": "90"}),
        ("labelangle-m60", "labelangle=-60", {"headlabel": "H", "labelangle": "-60"}),
        ("labeldistance-2", "labeldistance=2", {"headlabel": "H", "labeldistance": "2"}),
        ("labeldistance-3", "labeldistance=3", {"headlabel": "H", "labeldistance": "3"}),
        ("xlabel", "xlabel=x", {"xlabel": "x"}),
        ("decorate", "decorate=true", {**L, "decorate": "true"}),
        ("labelfloat", "labelfloat=true", {**L, "labelfloat": "true"}),
        ("label-and-head-tail", "label, headlabel, taillabel", {**L, "headlabel": "H", "taillabel": "T"}),
        ("label-color-edge", "color=#377eb8 label", {**L, "color": "#377eb8"}),
    ]:
        s.edge(sid, cap, **over)

    def stored(sid, extra_fn, cap_extra):
        def fn(c):
            a, b = c["source"], c["target"]
            use(s.id, {k: 1 for k in cap_extra})
            return [f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(a['x'], a['y'])})}];",
                    f"{q(sid + '-t')} [{attrs({**END, 'pos': pos(b['x'], b['y'])})}];",
                    edge_line(sid, sid + "-s", sid + "-t", extra_fn(c))]
        return fn
    s.custom("lp", "label lp stored (above)", stored("lp", lambda c: {**L, "lp": pt(c["x"], c["y"] - 22)}, ["lp"]))
    s.custom("head-lp", "headlabel head_lp stored", stored("head-lp", lambda c: {
        "headlabel": "H", "head_lp": pt(c["target"]["x"], c["y"] + 20)}, ["head_lp"]))
    s.custom("tail-lp", "taillabel tail_lp stored", stored("tail-lp", lambda c: {
        "taillabel": "T", "tail_lp": pt(c["source"]["x"], c["y"] + 20)}, ["tail_lp"]))
    s.custom("xlp", "xlabel xlp stored", stored("xlp", lambda c: {"xlabel": "x", "xlp": pt(c["x"], c["y"] + 20)},
                                                 ["xlp"]))
    s.write()


# ------------------------------------------------------------------------------------------------ groups
def cluster(sheet, sid, cap_unused, over, inner_style=None, name=None, nested=False, extra=None):
    def fn(c):
        x, y = c["x"], c["y"]
        w, h = min(c["w"] - 24, 140), 84
        bb = f"{num(x - w / 2)},{num(H - (y + 26))},{num(x + w / 2)},{num(H - (y - h + 26))}"
        d = {k: v for k, v in {**CLUSTER, "label": sid, **over}.items() if v is not None}
        if sid == "default":
            d = {}
        use(sheet.id, over)
        nm = name or f"cluster-{sid}"
        out = [f"subgraph {q(nm)} {{", f"  graph [{attrs({**d, 'bb': bb})}];" if d else f"  graph [bb={q(bb)}];"]
        if nested:
            ib = f"{num(x - w / 2 + 12)},{num(H - (y + 18))},{num(x + w / 2 - 12)},{num(H - (y - h + 50))}"
            out += [f"  subgraph {q(nm + '-inner')} {{",
                    f"    graph [{attrs({**CLUSTER, 'label': 'inner', 'bb': ib})}];",
                    f"    {q(sid + '-n')} [{attrs({**NODE, 'width': inch(20), 'height': inch(20), 'pos': pos(x, y)})}];",
                    "  }"]
        else:
            out.append(f"  {q(sid + '-n')} [{attrs({**NODE, 'width': inch(20), 'height': inch(20), 'pos': pos(x, y)})}];")
        out.append("}")
        return out + (extra(c) if extra else [])
    return fn


def groups():
    s = Sheet("specimen-groups", "clusters at stored bounding boxes (bb): labels, label placement, fonts, styles, "
              "colors, gradients, nesting, compound edges", graph={"compound": "true"}, columns=6)
    for sid, cap, over in [
        ("default", "default", {}),
        ("label", "label=label", {}),
        ("labelloc-b", "labelloc=b", {"labelloc": "b"}),
        ("labeljust-l", "labeljust=l", {"labeljust": "l"}),
        ("labeljust-r", "labeljust=r", {"labeljust": "r"}),
        ("fontsize-16", "fontsize=16", {"fontsize": "16"}),
        ("fontcolor", "fontcolor=#e41a1c", {"fontcolor": "#e41a1c"}),
        ("fontname-serif", "fontname=DejaVu Serif", {"fontname": "DejaVu Serif"}),
        ("color", "color=#e41a1c", {"color": "#e41a1c"}),
        ("pencolor", "pencolor=#377eb8", {"pencolor": "#377eb8"}),
        ("pencolor-and-color", "pencolor + color=red", {"pencolor": "#377eb8", "color": "#e41a1c",
                                                        "style": "filled"}),
        ("bgcolor", "bgcolor=#ffd700", {"bgcolor": "#ffd700"}),
        ("fillcolor", "style=filled fillcolor", {"style": "filled", "fillcolor": "#c8e6c9"}),
        ("filled-color-only", "style=filled color=#c8e6c9", {"style": "filled", "color": "#c8e6c9"}),
        ("bgcolor-and-fill", "bgcolor + fillcolor filled", {"style": "filled", "fillcolor": "#c8e6c9",
                                                            "bgcolor": "#ffd700"}),
        ("penwidth-0", "penwidth=0", {"penwidth": "0"}),
        ("penwidth-3", "penwidth=3", {"penwidth": "3"}),
        ("peripheries-0", "peripheries=0", {"peripheries": "0"}),
        ("style-dashed", "style=dashed", {"style": "dashed"}),
        ("style-dotted", "style=dotted", {"style": "dotted"}),
        ("style-bold", "style=bold", {"style": "bold"}),
        ("style-rounded", "style=rounded", {"style": "rounded"}),
        ("style-filled-rounded", "style=filled,rounded", {"style": "filled,rounded", "fillcolor": "#c8e6c9"}),
        ("style-striped", "style=striped", {"style": "striped", "fillcolor": "#e41a1c:#4daf4a:#377eb8"}),
        ("style-radial", "style=radial", {"style": "radial", "fillcolor": "white:#377eb8"}),
        ("gradient", "fillcolor=a:b gradientangle=90", {"style": "filled", "fillcolor": "#e41a1c:#377eb8",
                                                        "gradientangle": "90"}),
        ("style-invis", "style=invis", {"style": "invis"}),
        ("colorscheme", "colorscheme=blues9 color=7", {"colorscheme": "blues9", "color": "7"}),
        ("label-html", "label=<<B>b</B><I>i</I>>", {"label": Html('<B>b</B><I>i</I><FONT COLOR="#e41a1c">r</FONT>')}),
    ]:
        s.custom(sid, cap, cluster(s, sid, cap, over))
    s.custom("nested", "nested clusters", cluster(s, "nested", "", {}, nested=True))
    s.custom("cluster-attr", "subgraph cluster=true", cluster(s, "cluster-attr", "", {"cluster": "true"},
                                                              name="attr-cluster-true"))
    s.custom("plain-subgraph", "subgraph (not a cluster)", cluster(s, "plain-subgraph", "", {}, name="plain-subgraph"))

    def lp(c):
        return cluster(s, "lp", "", {"lp": pt(c["x"] - 30, c["y"] - 50)})(c)
    s.custom("lp", "lp stored", lp)

    def compound(sid, kind):
        def edge(c):
            use(s.id, {kind: 1})
            o = {"pos": pos(c["x"] - c["w"] / 2 + 6, c["y"] + 40)}
            return [f"{q(sid + '-o')} [{attrs({**END, **o})}];",
                    edge_line(sid, sid + "-o", sid + "-n", {kind: f"cluster-{sid}"}) if kind == "lhead" else
                    edge_line(sid, sid + "-n", sid + "-o", {kind: f"cluster-{sid}"})]
        return cluster(s, sid, "", {}, extra=edge)
    s.custom("lhead", "lhead=cluster", compound("lhead", "lhead"))
    s.custom("ltail", "ltail=cluster", compound("ltail", "ltail"))
    s.write()
    for n, (sid, about, g) in enumerate([
        ("bgcolor", "the root graph's bgcolor", {"bgcolor": "#e8f0ff"}),
        ("bgcolor-gradient", "the root graph's gradient background", {"bgcolor": "white:#a0c0ff", "gradientangle": "90"}),
        ("graph-label", "the root graph's label (labelloc=t, labeljust=l, fontsize=20)",
         {"label": "graph-label", "labelloc": "t", "labeljust": "l", "fontsize": "20", "fontname": FONT,
          "fontcolor": "#000000"}),
        ("graph-label-default", "the root graph's label with its defaults (bottom, centered)", {"label": "graph-label"}),
        ("bgcolor-radial", "the root graph's radial gradient background", {"style": "radial",
                                                                            "bgcolor": "white:#a0c0ff"}),
        ("graph-label-right", "the root graph's label at the right (labeljust=r)", {"label": "graph-label",
                                                                                   "labeljust": "r"}),
        ("graph-label-html", "the root graph's HTML-like label", {
            "label": Html('<B>graph</B> <I>label</I> <FONT COLOR="#e41a1c">html</FONT>'), "labelloc": "t"}),
        # the whole drawing turned a quarter turn counterclockwise; the three spellings Graphviz documents
        ("rotate-90", "rotate=90: the whole drawing turned", {"rotate": "90"}),
        ("landscape-true", "landscape=true: the same as rotate=90", {"landscape": "true"}),
        ("orientation-landscape", "orientation=landscape on the root graph: the same as rotate=90",
         {"orientation": "landscape"}),
        # ratio stretches the stored positions to the given height / width before size scales the drawing
        ("ratio-2", "ratio=2: positions stretched to twice as tall as wide", {"ratio": "2"}),
        # one font setting each, the other two pinned to the neutral label font (the caption names only the swept one)
        ("graph-label-fontcolor", "the root graph's label color (fontcolor)",
         {"label": "graph-label", "fontcolor": "#e41a1c", "fontname": FONT, "fontsize": num(NEU["fontSize"])}),
        ("graph-label-fontname", "the root graph's label font (fontname)",
         {"label": "graph-label", "fontname": "DejaVu Serif", "fontcolor": NEU["labelColor"],
          "fontsize": num(NEU["fontSize"])}),
    ]):
        p = Sheet(f"specimen-groups-p{n + 2}", about, graph=g)
        p.node("default", "default")
        hidden = {"fontname", "fontcolor", "fontsize"} - {sid[len("graph-label-"):]} if sid.startswith(
            "graph-label-font") else {"fontname", "fontcolor"}
        p.node(sid, " ".join(f"{k}={v}" for k, v in g.items() if k not in hidden))
        p.write()


# ------------------------------------------------------------------------------------------------ images, charts
def png(path, w, h, quad=True):
    """A small PNG: four colored quadrants (shows position, scale and orientation), or a two-color stripe."""
    colors = [(228, 26, 28), (55, 126, 184), (77, 175, 74), (255, 215, 0)]
    rows = []
    for y in range(h):
        row = b"\x00"
        for x in range(w):
            i = (1 if x >= w // 2 else 0) + (2 if y >= h // 2 else 0)
            row += bytes(colors[i] if quad else colors[(x * 2) // w])
        rows.append(row)

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b""))


def images_charts():
    os.makedirs(OUT, exist_ok=True)
    png(os.path.join(OUT, "img-quadrants.png"), 24, 24)
    png(os.path.join(OUT, "img-wide.png"), 32, 16)
    with open(os.path.join(OUT, "img-quadrants.svg"), "w", encoding="ascii", newline="\n") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="24pt" height="24pt" viewBox="0 0 24 24">'
                '<rect width="12" height="12" fill="#e41a1c"/><rect x="12" width="12" height="12" fill="#377eb8"/>'
                '<rect y="12" width="12" height="12" fill="#4daf4a"/><rect x="12" y="12" width="12" height="12" '
                'fill="#ffd700"/></svg>\n')
    s = Sheet("specimen-images-charts", "node images (image, imagescale, imagepos), HTML <IMG>, and the striped and "
              "wedged fills, Graphviz's charts")
    s.node("default", "default")
    img = {"image": "img-quadrants.png", "shape": "box", "width": inch(48), "height": inch(48)}
    s.node("image", "image=png", **img)
    s.node("image-svg", "image=svg", **{**img, "image": "img-quadrants.svg"})
    s.node("image-shape-none", "image shape=none", **{**img, "shape": "none"})
    s.node("image-ellipse", "image on ellipse", **{**img, "shape": "ellipse"})
    s.node("image-wide", "image wide png", **{**img, "image": "img-wide.png"})
    for v in ("false", "true", "width", "height", "both"):
        s.node(f"imagescale-{v}", f"imagescale={v}", **{**img, "image": "img-wide.png", "imagescale": v})
    for v in ("tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"):
        s.node(f"imagepos-{v}", f"imagepos={v}", **{**img, "imagepos": v})
    s.node("image-label", "image + label", **{**img, "label": "lbl", "labelloc": "b"})
    s.node("image-fixedsize-false", "image fixedsize=false", **{**img, "fixedsize": "false", "width": "0",
                                                               "height": "0"})
    tb = {"shape": "plain", "fixedsize": "false", "width": "0", "height": "0"}
    for v in VOCAB["htmlLabel"]["values"]["IMG"]["SCALE"].split("|"):
        s.node(f"html-img-scale-{v.lower()}", f"<IMG SCALE={v}>", label=Html(
            f'<TABLE><TR><TD WIDTH="40" HEIGHT="30" FIXEDSIZE="TRUE"><IMG SRC="img-wide.png" SCALE="{v}"/></TD></TR></TABLE>'), **tb)
    rect = {"shape": "box", "width": inch(60), "height": inch(40)}
    for sid, cap, fc in [("striped", "striped red:green:blue", "#e41a1c:#4daf4a:#377eb8"),
                         ("striped-weighted", "striped red;0.6:green:blue", "#e41a1c;0.6:#4daf4a:#377eb8"),
                         ("striped-two", "striped two colors", "#e41a1c:#377eb8"),
                         ("striped-five", "striped five colors", "#e41a1c:#377eb8:#4daf4a:#984ea3:#ff7f00")]:
        s.node(sid, cap, **{**rect, "style": "striped", "fillcolor": fc})
    s.node("striped-rounded", "style=striped,rounded", **{**rect, "style": "striped,rounded",
                                                          "fillcolor": "#e41a1c:#4daf4a:#377eb8"})
    s.node("striped-penwidth", "striped penwidth=3", **{**rect, "style": "striped", "penwidth": "3",
                                                        "fillcolor": "#e41a1c:#4daf4a:#377eb8"})
    disc = {"width": inch(48), "height": inch(48)}
    for sid, cap, fc in [("wedged", "wedged red:green:blue", "#e41a1c:#4daf4a:#377eb8"),
                         ("wedged-weighted", "wedged red;0.5:green;0.25:blue", "#e41a1c;0.5:#4daf4a;0.25:#377eb8"),
                         ("wedged-two", "wedged two colors", "#e41a1c:#377eb8"),
                         ("wedged-five", "wedged five colors", "#e41a1c:#377eb8:#4daf4a:#984ea3:#ff7f00"),
                         ("wedged-partial", "wedged red;0.3 (rest empty)", "#e41a1c;0.3:#4daf4a;0.3")]:
        s.node(sid, cap, **{**disc, "style": "wedged", "fillcolor": fc})
    s.node("wedged-ellipse", "wedged ellipse 72x40", **{"width": inch(72), "height": inch(40), "style": "wedged",
                                                        "fillcolor": "#e41a1c:#4daf4a:#377eb8"})
    s.write()


# ------------------------------------------------------------------------------------------------ mappings vs bypass
def mappings_bypass():
    """The same values reached through node [] / edge [] defaults, subgraph and cluster defaults, and per element."""
    s = Sheet("specimen-mappings-bypass", "values reached through node [] and edge [] default statements, subgraph "
              "and cluster defaults, and the same values set per element", columns=6)
    pairs = [
        ("fillcolor", "#e41a1c"), ("shape", "box"), ("color", "#377eb8"), ("penwidth", "3"),
        ("style", "filled,dashed"), ("width", inch(56)), ("fontcolor", "#e41a1c"), ("fontsize", "16"),
        ("label", "lbl"), ("peripheries", "2"),
    ]
    # the sheet's one specimen with nothing set: declared before the neutral node [] statement, so Graphviz's own
    # defaults apply
    items = [("node", "default", "default", None, None)]
    for k, v in pairs:
        items.append(("node", f"default-{k}", f"node [{k}={v}]", k, v))
        items.append(("node", f"element-{k}", f"element {k}={v}", k, v))
    for k, v in (("color", "#e41a1c"), ("style", "dashed"), ("arrowhead", "diamond"), ("penwidth", "3")):
        items.append(("edge", f"default-edge-{k}", f"edge [{k}={v}]", k, v))
        items.append(("edge", f"element-edge-{k}", f"element edge {k}={v}", k, v))
    extra = [
        ("node", "default-colorscheme", "node [colorscheme=blues9] fill=7", "colorscheme", "blues9"),
        ("node", "element-colorscheme", "element colorscheme=blues9 fill=7", "colorscheme", "blues9"),
        ("node", "override", "node [fill=red], element fill=blue", "fillcolor", "#377eb8"),
        ("node", "default-after", "node [] after the node: not applied", "fillcolor", "#e41a1c"),
        ("node", "style-replaces", "node [style=filled], element style=dashed", "style", "dashed"),
        ("node", "subgraph-default", "subgraph { node [fill=red] }", "fillcolor", "#e41a1c"),
        ("node", "cluster-default", "cluster { node [fill=red] }", "fillcolor", "#e41a1c"),
        ("node", "default-node-name-label", "node [label=\"\\N\"]", "label", "\\N"),
        ("edge", "edge-chain", "a -> b -> c [color=red]: both edges", "color", "#e41a1c"),
        ("edge", "edge-to-subgraph", "a -> { b c } [color=red]", "color", "#e41a1c"),
        ("edge", "subgraph-edge-default", "subgraph { edge [color=red] }", "color", "#e41a1c"),
        ("node", "cluster-statement", "cluster: color=red as a statement", "color", "#e41a1c"),
    ]
    cl = cells(len(items) + len(extra), fit_columns([x[2] for x in items + extra], 6))
    lines = []
    neutral_node = {k: v for k, v in NODE.items()}
    neutral_edge = dict(EDGE)
    use(s.id, {**neutral_node, **neutral_edge})

    def capl(sid, cap, c):
        return caption_line(sid, cap, c, reset=True)
    # Everything below is declared under neutral defaults; a specimen changes one default, declares its element,
    # and puts the default back.
    lines.append(f"node [{attrs(neutral_node)}];")
    lines.append(f"edge [{attrs(neutral_edge)}];")
    pre = []
    for (kind, sid, cap, k, v), c in zip(items + extra, cl):
        if sid == "default":
            pre += [f"{q(sid)} [pos={q(pos(c['x'], c['y']))}];", capl(sid, cap, c)]
            continue
        use(s.id, {k: 1})
        back = neutral_node if kind == "node" else neutral_edge
        if sid.startswith("default-") and kind == "node" and sid not in ("default-after", "default-colorscheme",
                                                                         "default-node-name-label"):
            text = ', label="Abc"' if k in ("fontcolor", "fontsize") else ""
            lines += [f"node [{k}={q(v)}];", f"{q(sid)} [pos={q(pos(c['x'], c['y']))}{text}];",
                      f"node [{k}={q(back.get(k, ''))}];"]
        elif sid.startswith("element-") and kind == "node" and sid != "element-colorscheme":
            text = ', label="Abc"' if k in ("fontcolor", "fontsize") else ""
            lines.append(f"{q(sid)} [{k}={q(v)}, pos={q(pos(c['x'], c['y']))}{text}];")
        elif sid.startswith("default-edge-"):
            lines += [f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(c['source']['x'], c['source']['y'])})}];",
                      f"{q(sid + '-t')} [{attrs({**END, 'pos': pos(c['target']['x'], c['target']['y'])})}];",
                      f"edge [{k}={q(v)}];", f"{q(sid + '-s')} -> {q(sid + '-t')} [id={q(sid)}];",
                      f"edge [{k}={q(back[k])}];"]
        elif sid.startswith("element-edge-"):
            lines += [f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(c['source']['x'], c['source']['y'])})}];",
                      f"{q(sid + '-t')} [{attrs({**END, 'pos': pos(c['target']['x'], c['target']['y'])})}];",
                      f"{q(sid + '-s')} -> {q(sid + '-t')} [id={q(sid)}, {k}={q(v)}];"]
        elif sid == "default-colorscheme":
            lines += ["node [colorscheme=\"blues9\"];", f"{q(sid)} [fillcolor=\"7\", pos={q(pos(c['x'], c['y']))}];",
                      "node [colorscheme=\"x11\"];"]
        elif sid == "element-colorscheme":
            lines.append(f"{q(sid)} [colorscheme=\"blues9\", fillcolor=\"7\", pos={q(pos(c['x'], c['y']))}];")
        elif sid == "override":
            lines += ["node [fillcolor=\"#e41a1c\"];", f"{q(sid)} [fillcolor=\"#377eb8\", pos={q(pos(c['x'], c['y']))}];",
                      f"node [fillcolor={q(NODE['fillcolor'])}];"]
        elif sid == "default-after":
            lines += [f"{q(sid)} [pos={q(pos(c['x'], c['y']))}];", "node [fillcolor=\"#e41a1c\"];",
                      f"{q(sid)};", f"node [fillcolor={q(NODE['fillcolor'])}];"]
        elif sid == "style-replaces":
            lines.append(f"{q(sid)} [style=\"dashed\", pos={q(pos(c['x'], c['y']))}];")
        elif sid == "subgraph-default":
            lines += ["subgraph \"defaults\" {", "  node [fillcolor=\"#e41a1c\"];",
                      f"  {q(sid)} [pos={q(pos(c['x'], c['y']))}];", "}"]
        elif sid == "cluster-default":
            x, y = c["x"], c["y"]
            bb = f"{num(x - 40)},{num(H - (y + 26))},{num(x + 40)},{num(H - (y - 30))}"
            lines += ["subgraph \"cluster-defaults\" {", f"  graph [{attrs({**CLUSTER, 'label': '', 'bb': bb})}];",
                      "  node [fillcolor=\"#e41a1c\"];", f"  {q(sid)} [pos={q(pos(x, y))}];", "}"]
        elif sid == "default-node-name-label":
            lines += ["node [label=\"\\N\"];", f"{q(sid)} [fixedsize=\"false\", pos={q(pos(c['x'], c['y']))}];",
                      "node [label=\"\"];"]
        elif sid in ("edge-chain", "edge-to-subgraph"):
            a, b, x, y = c["source"], c["target"], c["x"], c["y"]
            ends = ([(sid + "-s", a["x"], a["y"]), (sid + "-m", x, y - 18), (sid + "-t", b["x"], b["y"])]
                    if sid == "edge-chain" else
                    [(sid + "-s", a["x"], y), (sid + "-t", b["x"], y - 14), (sid + "-u", b["x"], y + 14)])
            lines += [f"{q(n)} [{attrs({**END, 'pos': pos(px, py)})}];" for n, px, py in ends]
            if sid == "edge-chain":
                lines.append(f"{q(sid + '-s')} -> {q(sid + '-m')} -> {q(sid + '-t')} [color=\"#e41a1c\"];")
            else:
                lines.append(f"{q(sid + '-s')} -> {{ {q(sid + '-t')} {q(sid + '-u')} }} [color=\"#e41a1c\"];")
        elif sid == "subgraph-edge-default":
            lines += [f"{q(sid + '-s')} [{attrs({**END, 'pos': pos(c['source']['x'], c['source']['y'])})}];",
                      f"{q(sid + '-t')} [{attrs({**END, 'pos': pos(c['target']['x'], c['target']['y'])})}];",
                      "subgraph \"edge-defaults\" {", "  edge [color=\"#e41a1c\"];",
                      f"  {q(sid + '-s')} -> {q(sid + '-t')} [id={q(sid)}];", "}"]
        elif sid == "cluster-statement":
            x, y = c["x"], c["y"]
            bb = f"{num(x - 40)},{num(H - (y + 26))},{num(x + 40)},{num(H - (y - 30))}"
            cl_attrs = {**CLUSTER, "label": "", "bb": bb}
            cl_attrs.pop("color")
            lines += ["subgraph \"cluster-statement-form\" {", f"  graph [{attrs(cl_attrs)}];",
                      "  color=\"#e41a1c\";", f"  {q(sid)} [pos={q(pos(x, y))}];", "}"]
        lines.append(capl(sid, cap, c))
    head = [f"// THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT {GENERATOR}",
            f"// Graphviz DOT style specimen sheet {s.id}: {s.about}",
            "// Positions are pinned (pos \"x,y!\", points, y up). Drawn with:",
            "//   neato -n2 -Tsvg -Gsize=\"12.5,9.375!\" <file>   (graph-io/test/fidelity/oracles/tools/graphviz.mjs)",
            f"digraph {q(s.id)} {{", f"  graph [{attrs({'layout': 'neato', 'pad': PAD, 'bb': ROOT_BB})}];"]
    anchors = []
    for a in ANCHORS:
        z = inch(a["size"])
        anchors.append(f"{q(a['id'])} [{attrs({'shape': 'box', 'width': z, 'height': z, 'pos': pos(a['x'], a['y'])})}];")
    # The anchors take the neutral node defaults (declared first) plus their own shape and size.
    body = pre + lines[:2] + anchors + lines[2:]
    with open(os.path.join(OUT, s.id + ".gv"), "w", encoding="ascii", newline="\n") as f:
        f.write("\n".join(head + ["  " + x for x in body] + ["}", ""]))
    SHEETS.append(s)


# ------------------------------------------------------------------------------------------------ vocabulary check
# Attributes that draw nothing in an SVG drawn at stored positions, with the reason.
NOT_DRAWN = {
    **{a: "layout-engine parameter: changes where a layout run puts things, and specimens are pinned (neato -n2)"
       for a in ("Damping", "K", "beautify", "clusterrank", "concentrate", "constraint", "defaultdist", "dim",
                 "dimen", "diredgeconstraints", "epsilon", "esep", "group", "len", "levels", "levelsgap",
                 "maxiter", "mclimit", "mindist", "minlen", "mode", "model", "newrank", "nodesep", "normalize",
                 "nslimit", "nslimit1", "oneblock", "ordering", "overlap", "overlap_scaling", "overlap_shrink",
                 "pack", "packmode", "pin", "quadtree", "rank", "ranksep", "remincross",
                 "repulsiveforce", "root", "rotation", "samehead", "sametail", "searchsize", "sep", "smoothing",
                 "sortv", "start", "voro_margin", "weight", "TBbalance", "area", "label_scheme")},
    "inputscale": "scales input positions for neato's own layout; neato -n2 draws a pinned file identically with or "
                  "without it (checked with Graphviz 14.1.2)",
    **{a: "places, pages or scales the whole drawing uniformly (or, for viewport, picks the part of it shown); no "
          "element looks different, and the comparison fits the frame on the corner anchors"
       for a in ("center", "size", "page", "pagedir", "dpi", "resolution", "viewport", "notranslate", "pad")},
    **{a: "where Graphviz finds or how it names fonts and image files; every specimen font is pinned and every image "
          "sits beside its sheet" for a in ("fontnames", "fontpath", "imagepath")},
    "charset": "how the file's bytes are decoded; specimen files are ASCII, and decoding is graph-io's byte layer, "
               "covered by its conformance tests",
    **{a: "a bitmap, xdot or 3D (VRML) output setting, not drawn in SVG" for a in ("truecolor", "xdotversion", "z")},
    **{a: "written by Graphviz's layout output, never read as a style" for a in ("vertices", "rects", "lheight",
                                                                                 "lwidth")},
    "layout": "which layout engine runs; every specimen is drawn by neato -n2 at its stored positions",
    **{a: "output metadata (links, tooltips, ids, comments, classes): no drawn mark"
       for a in ("URL", "href", "target", "tooltip", "edgeURL", "edgehref", "edgetarget", "edgetooltip",
                 "headURL", "headhref", "headtarget", "headtooltip", "tailURL", "tailhref", "tailtarget",
                 "tailtooltip", "labelURL", "labelhref", "labeltarget", "labeltooltip", "comment", "class", "id",
                 "stylesheet", "showboxes")},
    "layer": "layers select which output page an element is drawn on; one-page SVG output draws every layer",
    "layers": "see layer", "layerlistsep": "see layer", "layerselect": "see layer", "layersep": "see layer",
    "_background": "an xdot drawing string, written by -Txdot output, not read from a hand-written file's style",
    "bb": "draws nothing: every sheet writes the root bb its laid-out output would carry, so a reader takes the "
          "positions as points (see ROOT_BB), and clusters are drawn at their stored bb (specimen-groups)",
    "shapefile": "deprecated since Graphviz 2.x in favor of image (specimen-images-charts covers image)",
    "samplepoints": "only for -Tcmap/imap output, not SVG",
    "linelength": "only for -Tdot/-Tplain output line wrapping",
    "scale": "a global scale before -Gsize scales again; pinned specimens never set it",
}
# HTML-like label attributes that draw nothing (shapes.html#html): links, tooltips and ids are output metadata.
HTML_NOT_DRAWN = {"HREF", "ID", "TARGET", "TITLE", "TOOLTIP"}
# STYLE values on <TABLE> and <TD> that Graphviz draws but shapes.html does not list (it documents ROUNDED and RADIAL)
HTML_STYLE_UNDOCUMENTED = ("dashed", "dotted", "solid", "invis", "invisible")
NOT_SWEPT = {
    "x11 color names": "every X11 name is a lookup in Graphviz's color table; 10 representative names (numbered, "
                       "gray/grey, case) are drawn, and all 679 are checked against Graphviz's own colors "
                       "(graphviz_colors.py, graph-io/test/formats/dot/color-names.test.ts)",
    "svg color names": "4 names whose SVG and X11 values differ are drawn; all 147 are checked as the X11 names are",
    "brewer schemes": "3 of 265 schemes are drawn; all 1,689 colors of the 265 are checked as the X11 names are",
    "ratio values": "ratio=2 is drawn (specimen-groups-p12); fill, compress, expand and auto only fit the drawing to "
                    "size, which the oracle route fixes at the sheet's own 4:3 shape, so Graphviz draws them as the "
                    "default (checked with Graphviz 14.1.2: fill moves positions by under 1%)",
    "arrow combinations": "3,111,696 multi-shape arrows exist; 8 representative 2- to 4-shape combinations are drawn",
}


def check():
    used = set(USED)
    for k in ("margin", "xlp", "pos", "lp", "head_lp", "tail_lp"):
        used.add(k)
    missing = [a["name"] for a in VOCAB["attributes"] if a["name"] not in used and a["name"] not in NOT_DRAWN]
    if missing:
        raise SystemExit(f"graphviz-vocabulary.json attributes on no sheet and not in NOT_DRAWN: {missing}")
    styles = {v for vs in VOCAB["styles"].values() for v in vs}
    if styles - STYLES:
        raise SystemExit(f"style values on no sheet: {sorted(styles - STYLES)}")
    html_attrs = VOCAB["htmlLabel"]["attributes"]
    gaps = sorted(f"{el} {a}" for el, attrs_ in html_attrs.items() for a in attrs_
                  if a not in HTML_USED.get(el, set()) and a not in HTML_NOT_DRAWN)
    gaps += sorted(el for el in VOCAB["htmlLabel"]["textElements"] + VOCAB["htmlLabel"]["tableElements"]
                   if el not in HTML_USED)
    if gaps:
        raise SystemExit(f"HTML-like label elements or attributes on no sheet and not in HTML_NOT_DRAWN: {gaps}")
    known = {a["name"] for a in VOCAB["attributes"]}
    stray = sorted(k for k in used if k not in known)
    if stray:
        raise SystemExit(f"attributes used that the vocabulary does not list: {stray}")


if __name__ == "__main__":
    for fn in (node_shapes, fills_borders, sizes_opacity, labels, edges_lines, arrows, edge_labels, groups,
               images_charts, mappings_bypass):
        fn()
    check()
    drawn = sorted(set(USED) - set(NOT_DRAWN))
    print(f"{len(SHEETS)} sheets; attributes drawn: {len(drawn)}; not drawing: {len(NOT_DRAWN)}")
    for sh in SHEETS:
        print(f"  {sh.id}: {len(sh.items) if sh.items else '-'}")
