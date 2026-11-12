"""The GML specimen sheets Graphviz writes: gv2gml's dialect (Graphviz 14.1.2, cmd/tools/gv2gml.c).

gml.py imports this module and runs `sheets()`. Each sheet is a DOT file (../../specimens/gml/graphviz/<sheet>.gv) with
every node pinned; Graphviz lays it out (neato -n2 -Tdot) and gv2gml writes the GML sheet, byte for byte as Graphviz
prints it. The oracle is Graphviz's own drawing of that same DOT file (oracles/tools/graphviz.mjs, route "graphviz"),
so the program that wrote the GML file also draws it: no stand-in.

Only DOT attributes gv2gml carries into the GML are set on a specimen (gv2gml.c emitNodeAttrs, emitEdgeAttrs): shape,
width, height, color, fillcolor, pencolor, penwidth, style (filled, dashed, dotted, solid, bold, invis), label,
fontname, fontsize, fontcolor, dir, arrowhead, arrowtail. Every other attribute gv2gml copies as a plain key
graph-io keeps as data, so a sheet that set one would hold a drawing the GML file cannot say.

Ids: gv2gml numbers nodes in the order Graphviz holds them, so every DOT node is named by that number and the GML id
and the oracle's node title agree; the setting id is the DOT `comment`, which gv2gml copies as the GML `comment`.
Units: a sheet pixel is a Graphviz point; y is up in DOT and in gv2gml's GML.
"""
import json
import os
import re
import subprocess

from sheet_layout import ANCHORS, LAYOUT, cells

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "../../../../.."))
MAIN = os.path.abspath(os.path.join(REPO, "../.."))
BIN = os.environ.get("GRAPHVIZ_BIN", os.path.join(MAIN, "tmp/style-fidelity/tools/conda-graphviz/bin"))
FONTS = os.path.join(REPO, "visual-fonts/fonts.conf")
GV_VOCAB = json.load(open(os.path.join(HERE, "graphviz-vocabulary.json"), encoding="ascii"))
GENERATOR = "graph-io/test/fidelity/generators/specimens/gml_graphviz.py"
ROUTE = "graphviz"
NEU = LAYOUT["neutral"]
H = LAYOUT["canvas"]["height"]
CAP = LAYOUT["captionFontSize"]
FONT = NEU["fontFamily"]
PAD = "0.2361"
ID = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def num(v):
    s = f"{v:.4f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def inch(px):
    return num(px / 72)


def q(v):
    return '"' + str(v).replace('"', '\\"') + '"'


def attrs(d):
    return ", ".join(f"{k}={q(v)}" for k, v in d.items() if v is not None)


_ax = [v for a in ANCHORS for v in (a["x"] - a["size"] / 2, a["x"] + a["size"] / 2)]
_ay = [H - v for a in ANCHORS for v in (a["y"] - a["size"] / 2, a["y"] + a["size"] / 2)]
ROOT_BB = f"{num(min(_ax))},{num(min(_ay))},{num(max(_ax))},{num(max(_ay))}"

# color before fillcolor: gv2gml reads a node's attributes in the order the file declares them, and color sets the
# fill as well as the outline, so a fillcolor declared first would be overwritten
NODE = {"comment": None, "shape": "ellipse", "width": inch(NEU["size"]), "height": inch(NEU["size"]),
        "fixedsize": "true", "color": NEU["border"], "fillcolor": NEU["fill"], "style": "filled",
        "penwidth": num(NEU["borderWidth"]), "label": "", "fontname": FONT, "fontsize": num(NEU["fontSize"]),
        "fontcolor": NEU["labelColor"]}
END = {**NODE, "shape": "circle", "width": inch(12), "height": inch(12)}
EDGE = {"comment": None, "color": NEU["edgeColor"], "penwidth": num(NEU["edgeWidth"]), "style": "solid",
        "fontname": FONT, "fontsize": num(NEU["fontSize"]), "fontcolor": NEU["labelColor"]}

SHEETS = []


class Sheet:
    def __init__(self, sid, about, directed=False, yworks=False, columns=None):
        self.id, self.about, self.directed, self.yworks, self.columns = sid, about, directed, yworks, columns
        self.items = []
        self.nodes = []  # attribute dicts, named by index
        self.edges = []  # (source index, target index, attribute dict)
        self.flavor, self.route = "graphviz", ROUTE

    def node(self, sid, cap, **over):
        self.items.append(("node", sid, cap, over))

    def edge(self, sid, cap, **over):
        self.items.append(("edge", sid, cap, over))

    def add(self, x, y, d):
        self.nodes.append({**d, "pos": f"{num(x)},{num(H - y)}!"})
        return len(self.nodes) - 1

    def write(self):
        if len(self.items) > LAYOUT["maxSpecimens"]:
            raise SystemExit(f"{self.id}: {len(self.items)} specimens")
        widest = max(len(cap) for _, _, cap, _ in self.items) * CAP * 0.62 + 10
        a = LAYOUT["area"]
        cols = self.columns or max(1, min(LAYOUT["columns"], int((a["x1"] - a["x0"]) // widest)))
        for an in ANCHORS:
            s = inch(an["size"])
            self.add(an["x"], an["y"], {**NODE, "comment": an["id"], "shape": "box", "width": s, "height": s})
        for (kind, sid, cap, over), c in zip(self.items, cells(len(self.items), cols)):
            if not ID.match(sid):
                raise SystemExit(f"{self.id}: specimen id {sid!r} is not lowercase letters, digits and hyphens")
            if kind == "node":
                d = {"comment": sid} if sid == "default" else {**NODE, **over, "comment": sid}
                self.add(c["x"], c["y"], {k: v for k, v in d.items() if v is not None})
            else:
                s = self.add(c["source"]["x"], c["source"]["y"], {**END, "comment": sid + "-s"})
                t = self.add(c["target"]["x"], c["target"]["y"], {**END, "comment": sid + "-t"})
                d = {"comment": sid} if sid == "default" else {**EDGE, **over, "comment": sid}
                self.edges.append((s, t, {k: v for k, v in d.items() if v is not None}))
            # white on white, as the other GML sheets' captions: GML ids are numbers, so the comparator judges
            # captions as nodes, and a box both programs draw is one it finds on both sides
            w = max(20, round(len(cap) * CAP * 0.62 + 6))
            self.add(c["caption"]["x"], c["caption"]["y"],
                     {"comment": "cap-" + sid, "shape": "box", "width": inch(w), "height": inch(CAP + 4),
                      "fixedsize": "true", "color": "#ffffff", "fillcolor": "#ffffff", "style": "filled",
                      "penwidth": "0", "label": cap, "fontname": FONT, "fontsize": num(CAP), "fontcolor": "#000000"})
        ids = [sid for _, sid, _, _ in self.items]
        if len(ids) != len(set(ids)):
            raise SystemExit(f"{self.id}: duplicate specimen ids")
        self.save()
        SHEETS.append(self)

    def save(self):
        kind, op = ("digraph", "->") if self.directed else ("graph", "--")
        lines = [f"// THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT {GENERATOR}",
                 f"// GML style specimen sheet {self.id} (gv2gml keys): {self.about}",
                 "// Graphviz lays it out (neato -n2 -Tdot) and gv2gml" + (" -y" if self.yworks else "") +
                 f" writes ../{self.id}.gml; Graphviz's drawing of this file is the oracle.",
                 f"{kind} {q(self.id)} {{",
                 f"  graph [{attrs({'layout': 'neato', 'pad': PAD, 'bb': ROOT_BB})}];"]
        lines += [f"  {i} [{attrs(d)}];" for i, d in enumerate(self.nodes)]
        lines += [f"  {s} {op} {t}" + (f" [{attrs(d)}];" if d else ";") for s, t, d in self.edges]
        src_dir = os.path.join(OUT, "graphviz")
        os.makedirs(src_dir, exist_ok=True)
        src = os.path.join(src_dir, self.id + ".gv")
        with open(src, "w", encoding="ascii", newline="\n") as f:
            f.write("\n".join(lines + ["}", ""]))
        env = {**os.environ, "FONTCONFIG_FILE": FONTS}
        laid = subprocess.run([os.path.join(BIN, "neato"), "-n2", "-Tdot", src], env=env, capture_output=True,
                              check=True)
        # a label larger than its fixed-size node is drawn anyway, and Graphviz says so: the specimens that show it
        warnings = [w for w in laid.stderr.decode().splitlines() if w.strip() and "size too small for label" not in w]
        if warnings:
            raise SystemExit(f"{self.id}: neato: {warnings}")
        gml = subprocess.run([os.path.join(BIN, "gv2gml")] + (["-y"] if self.yworks else []), input=laid.stdout,
                             env=env, capture_output=True, check=True)
        if gml.stderr.strip():
            raise SystemExit(f"{self.id}: gv2gml: {gml.stderr.decode()}")
        with open(os.path.join(OUT, self.id + ".gml"), "wb") as f:
            f.write(gml.stdout)
        self.gml = gml.stdout.decode("ascii")


OUT = None


def shapes():
    names = GV_VOCAB["polygonShapes"] + GV_VOCAB["recordShapes"]
    half = (len(names) + 1) // 2
    for page, part in (("p6", names[:half]), ("p7", names[half:])):
        s = Sheet(f"specimen-node-shapes-{page}", "Graphviz shapes, as gv2gml writes them in type")
        s.node("default", "(nothing set)")
        for n in part:
            # plain is sized to its label alone (width, height and margin 0): fixed in size, Graphviz 14.1.2 draws
            # its fill at nan, so it is sized by a label
            plain = {"label": "Abc", "fixedsize": "false"} if n == "plain" else {}
            s.node("type-" + n.lower(), f"type={n}", shape=n, **plain)
        s.write()


def fills_borders():
    s = Sheet("specimen-node-fills-borders-p6", "fill (filled or not), outline, width and outlineStyle")
    s.node("default", "(nothing set)")
    s.node("not-filled", "fill, no hasFill", style=None, fillcolor=None, color="#ff8800")
    s.node("filled-color", "hasFill fill=#ff8800", color="#ff8800", fillcolor=None)
    s.node("fill-ff8800", "fill=#ff8800", fillcolor="#ff8800")
    s.node("fill-orange", "fill=orange", fillcolor="orange")
    s.node("fill-lightblue", "fill=lightblue", fillcolor="lightblue")
    s.node("fill-hsv", "fill=0.6 0.5 1.0", fillcolor="0.6 0.5 1.0")
    s.node("fill-scheme", "fill=/accent3/1", fillcolor="/accent3/1")
    s.node("fill-rgba", "fill=#ff880080", fillcolor="#ff880080")
    # a node's outline is its color (gv2gml writes color as fill and outline, and the fillcolor declared after it
    # as fill); pencolor, which gv2gml also writes as outline, is a cluster's alone and Graphviz ignores it on a node
    s.node("outline-0000ff", "outline=#0000ff", color="#0000ff")
    s.node("outline-red", "outline=red", color="red")
    for w in (0, 2, 4):
        s.node(f"width-{w}", f"width={w}", penwidth=str(w))
    s.node("outline-style-dashed", "outlineStyle=dashed", style="filled,dashed")
    s.node("outline-style-dotted", "outlineStyle=dotted", style="filled,dotted")
    s.node("outline-style-line", "outlineStyle=line", style="filled,solid")
    s.write()


def sizes_opacity():
    s = Sheet("specimen-node-sizes-opacity-p6", "w and H (gv2gml's height key), visible and alpha")
    s.node("default", "(nothing set)")
    for w, h in ((18, 18), (54, 54), (72, 36), (36, 72), (90, 24)):
        s.node(f"size-{w}x{h}", f"w={w} H={h}", width=inch(w), height=inch(h))
    s.node("visible-0", "visible=0", style="filled,invis")
    s.node("fill-alpha-80", "fill=#c8c8c880", fillcolor="#c8c8c880")
    s.node("fill-alpha-00", "fill=#c8c8c800", fillcolor="#c8c8c800")
    s.write()


def labels(page, yworks):
    color_key = "color" if yworks else "fontColor"
    s = Sheet(f"specimen-labels-{page}", "node label text and LabelGraphics" + (" (gv2gml -y)" if yworks else ""),
              yworks=yworks)
    s.node("default", "(nothing set)")
    s.node("label-abc", "text=Abc", label="Abc")
    s.node("label-name", "label=node name", label="\\N")
    s.node("label-long", "text=long", label="a much longer label than its node")
    s.node("label-entity", "text=A&B", label="A&B")
    s.node("label-two-lines", "text=two lines", label="two\\nlines")
    s.node("font-color-ff0000", f"{color_key}=#ff0000", label="Abc", fontcolor="#ff0000")
    s.node("font-color-blue", f"{color_key}=blue", label="Abc", fontcolor="blue")
    for size in (6, 14, 20):
        s.node(f"font-size-{size}", f"fontSize={size}", label="Abc", fontsize=str(size))
    for name in ("DejaVu Serif", "DejaVu Sans Mono", "Times"):
        s.node("font-name-" + name.lower().replace(" ", "-"), f"fontName={name}", label="Abc", fontname=name)
    s.write()


def edges_lines():
    s = Sheet("specimen-edges-lines-p6", "edge fill, width and style")
    s.edge("default", "(nothing set)")
    s.edge("fill-ff0000", "fill=#ff0000", color="#ff0000")
    s.edge("fill-blue", "fill=blue", color="blue")
    s.edge("fill-alpha", "fill=#ff000080", color="#ff000080")
    for w in (1, 2, 4, 8):
        s.edge(f"width-{w}", f"width={w}", penwidth=str(w))
    s.edge("style-dashed", "style=dashed", style="dashed")
    s.edge("style-dotted", "style=dotted", style="dotted")
    s.edge("style-line", "style=line", style="solid")
    s.edge("style-bold", "bold: width=2", style="bold", penwidth=None)
    s.edge("visible-0", "visible=0", style="invis")
    s.write()


ARROWS = GV_VOCAB["arrows"]["single"] + GV_VOCAB["arrows"]["legacy"]


def arrows():
    head = Sheet("specimen-arrows-p7", "targetArrow (arrowhead) with arrow first (dir=forward)", directed=True)
    head.edge("default", "(nothing set)")
    for a in ARROWS:
        head.edge("target-arrow-" + a, f"targetArrow={a}", dir="forward", arrowhead=a)
    head.write()
    tail = Sheet("specimen-arrows-p8", "sourceArrow (arrowtail) with arrow last (dir=back), and arrow", directed=True)
    tail.edge("default", "(nothing set)")
    for a in ARROWS:
        tail.edge("source-arrow-" + a, f"sourceArrow={a}", dir="back", arrowtail=a)
    for d, gml in (("forward", "first"), ("back", "last"), ("both", "both"), ("none", "none")):
        tail.edge("arrow-" + gml, f"arrow={gml}", dir=d)
    tail.write()


def edge_labels():
    s = Sheet("specimen-edge-labels-p5", "edge label text and LabelGraphics")
    s.edge("default", "(nothing set)")
    s.edge("label-abc", "text=Abc", label="Abc")
    s.edge("font-color-ff0000", "fontColor=#ff0000", label="Abc", fontcolor="#ff0000")
    for size in (6, 14, 20):
        s.edge(f"font-size-{size}", f"fontSize={size}", label="Abc", fontsize=str(size))
    s.edge("font-name-dejavu-serif", "fontName=DejaVu Serif", label="Abc", fontname="DejaVu Serif")
    s.write()


def sheets(out):
    global OUT
    OUT = out
    shapes()
    fills_borders()
    sizes_opacity()
    labels("p7", False)
    labels("p8", True)
    edges_lines()
    arrows()
    edge_labels()
    check()
    return SHEETS


def gml_items(text):
    """A GML text as (key, value) lists, values as written (strings unquoted)."""
    stack = [("", [])]
    key = None
    for tok in re.findall(r'"[^"]*"|\[|\]|[^\s\[\]"]+', text):
        if tok == "[":
            stack.append((key, []))
            key = None
        elif tok == "]":
            k, body = stack.pop()
            stack[-1][1].append((k, body))
        elif key is None:
            key = tok
        else:
            stack[-1][1].append((key, tok.strip('"')))
            key = None
    return stack[0][1]

# gv2gml.c's keys (emitNodeAttrs, emitEdgeAttrs, emitSpline): every one must be on a sheet the GML holds
KEYS = ["graph.version", "graph.node.name", "graph.node.label", "graph.node.graphics.x", "graph.node.graphics.y",
        "graph.node.graphics.w", "graph.node.graphics.H", "graph.node.graphics.visible",
        "graph.node.graphics.hasFill", "graph.node.graphics.type", "graph.node.graphics.fill",
        "graph.node.graphics.outline", "graph.node.graphics.width", "graph.node.graphics.outlineStyle",
        "graph.node.LabelGraphics.text", "graph.node.LabelGraphics.fontColor", "graph.node.LabelGraphics.color",
        "graph.node.LabelGraphics.fontSize", "graph.node.LabelGraphics.fontName", "graph.edge.label",
        "graph.edge.graphics.Line.point.x", "graph.edge.graphics.Line.point.y", "graph.edge.graphics.visible",
        "graph.edge.graphics.fill", "graph.edge.graphics.width", "graph.edge.graphics.targetArrow",
        "graph.edge.graphics.sourceArrow", "graph.edge.graphics.style", "graph.edge.graphics.arrow",
        "graph.edge.LabelGraphics.text", "graph.edge.LabelGraphics.fontColor",
        "graph.edge.LabelGraphics.fontSize", "graph.edge.LabelGraphics.fontName"]
VALUES = {"graph.node.graphics.outlineStyle": ["line", "dashed", "dotted"],
          "graph.edge.graphics.style": ["line", "dashed", "dotted"],
          "graph.edge.graphics.arrow": ["first", "last", "both", "none"],
          "graph.node.graphics.type": GV_VOCAB["polygonShapes"] + GV_VOCAB["recordShapes"],
          "graph.edge.graphics.targetArrow": ARROWS, "graph.edge.graphics.sourceArrow": ARROWS}


def check():
    paths, vals = set(), set()

    def walk(items, path):
        for k, v in items:
            p = f"{path}.{k}" if path else k
            paths.add(p)
            if isinstance(v, list):
                walk(v, p)
            else:
                vals.add((p, v))

    for s in SHEETS:
        walk(gml_items(s.gml), "")
    missing = [k for k in KEYS if k not in paths]
    missing += [f"{k}={v}" for k, vs in VALUES.items() for v in vs if (k, v) not in vals]
    if missing:
        raise SystemExit("gv2gml keys or values on no sheet:\n  " + "\n  ".join(missing))
