#!/usr/bin/env python3
"""Writes the GML style specimen sheets (graph-io/test/fidelity/specimens/gml/), deterministic.

    python3 gml.py [out-dir]        (default: ../../specimens/gml)

Every value in gml-vocabulary.json (gml_vocabulary.py: Himsolt's GML draft and Tk for the Graphlet keys, yEd's own
enumerations and files for yEd's keys, Cytoscape's GML reader for Cytoscape 2.x's numbered arrows) is drawn on a
sheet or named in NOT_SWEPT with the reason; the script fails otherwise. Sheet rules:
graph-io/test/fidelity/specimens/README.md.

Six vocabularies, never mixed in one file: a "graphlet" sheet has no Creator line and only the keys of the GML
draft and Tk; a "yed" sheet has yEd's Creator "yFiles" line and yEd's keys, written the way yEd writes them (reals for
x, y, w and h, integers for fontSize and outlineWidth, label beside LabelGraphics text); a "cytoscape" sheet has
Creator "Cytoscape" and the keys Cytoscape 2.x's GML writer wrote (outline_width, its shape names, its numbered
arrows); an "ogdf" sheet has OGDF's Creator line and OGDF's keys (lineWidth, stipple and pattern names, fillbg, Line
holding the bends only, clusters under rootcluster). An ogdf sheet is then read and written again by OGDF itself
(oracles/tools/ogdf.mjs --rewrite), so the committed file is OGDF's own writing. A "gephi" sheet is written the way
Gephi's GML exporter writes (Creator "Gephi" inside the graph, graphics x, y, z, w, h, d and fill, edges with an id
and a value), and Gephi itself draws it (oracles/tools/gephi.mjs). A "graphviz" sheet is written by Graphviz's gv2gml
from a DOT file, which Graphviz draws as the oracle (gml_graphviz.py says how).

Ids: GML ids are integers (the draft; Cytoscape's GML reader and gml2gv reject any other id), so every element's
setting id is written in its `comment` key (an ogdf sheet's node: its `template` key, the one string OGDF keeps per
node), which the draft defines for every object and every reader ignores. (Not
the draft's `name` key: Cytoscape's GML reader makes `name` the node's name, and its default style draws the name as
the label, so every node would show its setting id.) Anchors are `anchor-*`, captions `cap-<specimen id>`, an edge
specimen's end nodes `<edge id>-s` and `<edge id>-t`.

Oracles: a graphlet sheet (the GML draft's own keys) is drawn by OGDF (oracles/tools/ogdf.mjs, route ogdf-draw: the
sheet as written, read by GraphIO::readGML and drawn by GraphIO::drawSVG; a Line holding only an edge's two end points,
which crashes OGDF's reader, is dropped from the copy OGDF reads, the draft's straight edge either way). OGDF draws only
part of the draft's keys, so each graphlet sheet is also drawn by the two stand-ins (standIns: Cytoscape desktop's GML
reader and gml2gv | neato -n2, into oracles/stand-ins/), and specimens/gml/judges.json says which of them, or the
draft itself, judges each property of each setting. No program that writes yEd's GML can
be automated here (yEd's license forbids it), so a yed sheet's oracle is a stand-in, drawn by the reader that reads
its keys: Cytoscape desktop's GML reader (fills, borders, shapes, sizes, arrows, groups) or Graphviz's gml2gv |
neato -n2 (labels, lines, bends, edge labels). The cytoscape sheets are Cytoscape's own dialect, which Cytoscape
reads, and the ogdf sheets OGDF writes and draws itself (route ogdf).
oracle-routes.json beside the sheets says which, and the two oracle scripts read it.

Units: a sheet pixel is a GML pixel (the draft: 72 dpi, y down), as sheet-layout.json places them.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from sheet_layout import ANCHORS, LAYOUT, cells  # noqa: E402

sys.path.insert(0, HERE)
import gml_graphviz  # noqa: E402

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "../../specimens/gml")
VOCAB = json.load(open(os.path.join(HERE, "gml-vocabulary.json"), encoding="ascii"))
GENERATOR = "graph-io/test/fidelity/generators/specimens/gml.py"
NEU = LAYOUT["neutral"]
CAP = LAYOUT["captionFontSize"]
FONT = NEU["fontFamily"]
CY = "cytoscape-gml"
GV = "gml2gv"
OG = "ogdf"
# OGDF draws a graphlet sheet as written (no rewrite: the draft's keys are not OGDF's to write)
OGD = "ogdf-draw"
# the GML draft caps a line at 254 characters, and OGDF's reader refuses a longer one
GML_LINE_MAX = 254
GE = "gephi"
# OGDF's GraphIO::drawSVG draws every label in its default 10 px font (SVGSettings)
OG_LABEL_PX = 10
# Gephi's Preview draws a label at 0.6 of its node's size (proportional label size); a caption node's size is 14
GE_CAPTION_SIZE = 14
GE_LABEL_PX = 0.6 * GE_CAPTION_SIZE
# Cytoscape's GML reader cannot set a label font: it draws every label in its default 12 px font
CY_LABEL_PX = 12
# gml2gv files a LabelGraphics fontSize under fontname (gmlparse.y: FONTSIZE INTEGER makes a FONTNAME attribute), so
# Graphviz draws every label in its default 14 pt
GV_LABEL_PX = 14

ID = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


class Real(float):
    """A GML real: always written with a decimal point (gml2gv reads y, w and h only as reals)."""


def real(v):
    s = f"{float(v):.4f}".rstrip("0")
    return s + "0" if s.endswith(".") else s


def text(v):
    """A GML string: ISO 8859-1 text with & and " written as entities (the draft, chapter 4)."""
    return '"' + str(v).replace("&", "&amp;").replace('"', "&quot;") + '"'


def raw_text(v):
    """A string whose entities are already written (a specimen of GML's entity syntax itself)."""
    return '"' + str(v) + '"'


class Raw(str):
    """A string value written as is, entities included."""


def value(v):
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, Real):
        return real(v)
    if isinstance(v, int):
        return str(v)
    if isinstance(v, float):
        return real(v)
    if isinstance(v, Raw):
        return raw_text(v)
    return text(v)


def emit(lines, items, depth):
    """A GML list: key value lines, one level of tab per depth, as yEd writes them."""
    pad = "\t" * depth
    for k, v in items:
        if v is None:
            continue
        if isinstance(v, list):
            lines.append(f"{pad}{k}")
            lines.append(f"{pad}[")
            emit(lines, v, depth + 1)
            lines.append(f"{pad}]")
        else:
            lines.append(f"{pad}{k}\t{value(v)}")


def kv(d):
    return [(k, v) for k, v in d.items() if v is not None]


def color(c):
    return c.upper() if c.startswith("#") else c


NEUTRAL = {
    "graphlet": {"type": "oval", "fill": color(NEU["fill"]), "outline": color(NEU["border"]),
                 "width": float(NEU["borderWidth"])},
    "yed": {"type": "ellipse", "fill": color(NEU["fill"]), "outline": color(NEU["border"]), "outlineStyle": "line",
            "outlineWidth": int(NEU["borderWidth"])},
    "cytoscape": {"type": "ellipse", "fill": color(NEU["fill"]), "outline": color(NEU["border"]),
                  "outline_width": float(NEU["borderWidth"])},
    "ogdf": {"type": "Ellipse", "fill": color(NEU["fill"]), "outline": color(NEU["border"]), "pattern": "Solid",
             "stipple": "Solid", "lineWidth": float(NEU["borderWidth"])},
    # Gephi's GML has a fill and a size alone (its Preview draws every node a disc with a darker border)
    "gephi": {"z": 0.0, "fill": color(NEU["fill"])},
}
EDGE_NEUTRAL = {
    "graphlet": {"fill": color(NEU["edgeColor"]), "width": float(NEU["edgeWidth"]), "arrow": "none"},
    "yed": {"fill": color(NEU["edgeColor"]), "width": float(NEU["edgeWidth"]), "style": "line",
            "sourceArrow": "none", "targetArrow": "none"},
    "cytoscape": {"fill": color(NEU["edgeColor"]), "width": float(NEU["edgeWidth"])},
    "ogdf": {"fill": color(NEU["edgeColor"]), "lineWidth": float(NEU["edgeWidth"]), "stipple": "Solid",
             "arrow": "none"},
    "gephi": {},
}
LABEL_NEUTRAL = {"fontSize": int(NEU["fontSize"]), "fontName": FONT, "fontStyle": "plain",
                 "color": color(NEU["labelColor"]), "anchor": "c", "model": "null"}
CREATOR = {"graphlet": None, "yed": "yFiles", "cytoscape": "Cytoscape", "ogdf": VOCAB["ogdf"]["creator"],
           "gephi": "Gephi"}
# the key an element's setting id is written in
ID_KEY = {"graphlet": "comment", "yed": "comment", "cytoscape": "comment", "ogdf": "template", "gephi": "comment"}

# values listed in gml-vocabulary.json that no sheet draws, with the reason
NOT_SWEPT = {
}

USED = set()  # ("path", key path) and ("value", key path, value) and ("tag", tag) seen in the written records
SHEETS = []


def record_use(items, path):
    for k, v in items:
        if v is None:
            continue
        p = f"{path}.{k}"
        USED.add(("path", p))
        if isinstance(v, list):
            record_use(v, p)
        else:
            USED.add(("value", p, str(v)))


class Sheet:
    def __init__(self, sid, about, flavor, route, directed=False, columns=None, cap_px=None):
        if flavor not in CREATOR:
            raise SystemExit(f"{sid}: unknown flavor {flavor}")
        self.id, self.about, self.flavor, self.route = sid, about, flavor, route
        # a sheet of the draft's keys is drawn by both stand-ins too: OGDF draws only part of them (judges.json)
        self.stand_ins = [CY, GV] if route == OGD else []
        self.directed, self.columns = directed, columns
        px = {CY: CY_LABEL_PX, OG: OG_LABEL_PX, OGD: OG_LABEL_PX, GE: GE_LABEL_PX}
        self.cap_px = cap_px or px.get(route, GV_LABEL_PX)
        self.items = []
        self.nodes = []  # (name, items)
        self.edges = []  # (name, source name, target name, items)
        self.clusters = []  # (name, parent cluster name or None, graphics, label, member node names)

    # ---- what a sheet holds
    def node(self, sid, cap, graphics=None, label=None, keys=None, tags=(), neutral=True):
        """A node specimen: graphics keys over the neutral ones, LabelGraphics (yEd) or a label (graphlet)."""
        self.items.append(("node", sid, cap, dict(graphics=graphics or {}, label=label, keys=keys or {},
                                                  neutral=neutral, tags=tags)))

    def edge(self, sid, cap, graphics=None, label=None, line=None, keys=None, tags=(), neutral=True):
        """An edge specimen between two neutral end nodes; line: bend points as offsets from the cell center."""
        self.items.append(("edge", sid, cap, dict(graphics=graphics or {}, label=label, line=line, keys=keys or {},
                                                  neutral=neutral, tags=tags)))

    def custom(self, sid, cap, fn, tags=()):
        """fn(sheet, cell): adds its own nodes and edges (groups, loops, parallel edges)."""
        self.items.append(("custom", sid, cap, dict(fn=fn, tags=tags)))

    # ---- records
    def add_node(self, name, x, y, graphics, label="", label_graphics=None, keys=None, w=None, h=None):
        # Gephi's coordinates are y up (its Preview draws y = 100 above y = 0): a Gephi sheet stores the canvas's
        # height minus the layout's y, so Gephi draws it the way up the layout says
        g = {"x": Real(x), "y": Real(LAYOUT["canvas"]["height"] - y if self.flavor == "gephi" else y)}
        if w is not None:
            g["w"] = Real(w)
            g["h"] = Real(h)
        if self.flavor == "gephi" and w is not None:
            # the layout's sizes are diameters, and Gephi's w is a node's size, a radius
            g["w"], g["h"] = Real(w / 2), Real(h / 2)
        g.update({k: v for k, v in graphics.items() if k not in ("size", "size_h")})
        if self.flavor == "gephi" and "size" in graphics:
            # a specimen's own w (and h), written as is
            g["w"] = Real(graphics["size"])
            g["h"] = Real(graphics.get("size_h", graphics["size"]))
        if self.flavor == "gephi":
            # Gephi writes x, y, z, w, h, d and fill, in that order, d as large as w
            g = {k: g[k] for k in ("x", "y", "z", "w", "h", "fill") if k in g}
            if "w" in g:
                g = {**{k: v for k, v in g.items() if k != "fill"}, "d": g["w"],
                     **({"fill": g["fill"]} if "fill" in g else {})}
        items = [(ID_KEY[self.flavor], name), ("label", label)]
        items += [(k, v) for k, v in (keys or {}).items() if k in ("isGroup",)]
        items.append(("graphics", kv(g)))
        if label_graphics is not None:
            items.append(("LabelGraphics", kv(label_graphics)))
        items += [(k, v) for k, v in (keys or {}).items() if k not in ("isGroup",)]
        self.nodes.append((name, items))

    def end_node(self, name, p):
        self.add_node(name, p["x"], p["y"], NEUTRAL[self.flavor], w=12, h=12)

    def add_edge(self, name, s, t, graphics, label=None, label_graphics=None, points=None, keys=None):
        g = dict(graphics)
        if points is not None and self.flavor == "ogdf":
            # OGDF's Line holds the bends only (GraphIO::writeGML), not the end points the GML draft puts in it
            points = points[1:-1]
        if points is not None:
            g["Line"] = [("point", [("x", Real(px)), ("y", Real(py))]) for px, py in points]
        items = [] if self.flavor == "ogdf" else [("comment", name)]
        if label is not None:
            items.append(("label", label))
        if g:
            items.append(("graphics", kv(g)))
        if label_graphics is not None:
            items.append(("LabelGraphics", kv(label_graphics)))
        items += list((keys or {}).items())
        self.edges.append((name, s, t, items))

    def caption(self, sid, cap, c):
        if not ID.match(sid):
            raise SystemExit(f"{self.id}: specimen id {sid!r} is not lowercase letters, digits and hyphens")
        x, y = c["caption"]["x"], c["caption"]["y"]
        w = max(20, round(len(cap) * self.cap_px * 0.62 + 6))
        if self.flavor == "yed":
            self.add_node(f"cap-{sid}", x, y,
                          {"type": "rectangle", "fill": "#FFFFFF", "hasFill": 0, "outline": "#FFFFFF",
                           "hasOutline": 0},
                          label=cap, label_graphics={"text": cap, **LABEL_NEUTRAL, "fontSize": CAP},
                          w=w, h=CAP + 4)
        elif self.flavor == "gephi":
            # Gephi draws every node a disc: a small white one under the caption, as the GEXF sheets do
            self.add_node(f"cap-{sid}", x, y, {"z": 0.0, "fill": "#FFFFFF"}, label=cap, w=2 * GE_CAPTION_SIZE,
                          h=2 * GE_CAPTION_SIZE)
        elif self.flavor == "ogdf":
            # text only: no outline (stipple None) and no fill (pattern None)
            self.add_node(f"cap-{sid}", x, y, {"type": "Rect", "fill": "#FFFFFF", "outline": "#FFFFFF",
                                                "pattern": "None", "stipple": "None", "lineWidth": 0.0},
                          label=cap, w=w, h=CAP + 4)
        else:
            # graphlet: a text object; Cytoscape and gml2gv still draw a node, so it is white on white
            ow = "outline_width" if self.flavor == "cytoscape" else "width"
            self.add_node(f"cap-{sid}", x, y, {"type": "text", "fill": "#FFFFFF", "outline": "#FFFFFF", ow: 0.0},
                          label=cap, w=w, h=CAP + 4)

    def write(self):
        caps = [cap for _, _, cap, _ in self.items]
        cl = cells(len(self.items), self.columns or fit_columns(caps, self.cap_px))
        a = LAYOUT["anchors"]["size"]
        for an in ANCHORS:
            box = "Rect" if self.flavor == "ogdf" else "rectangle"
            self.add_node(an["id"], an["x"], an["y"], {**NEUTRAL[self.flavor], "type": box}, w=a, h=a)
        size = NEU["size"]
        for (kind, sid, cap, o), c in zip(self.items, cl):
            if kind == "node":
                g = {**(NEUTRAL[self.flavor] if o["neutral"] else {}), **o["graphics"]}
                g = {k: v for k, v in g.items() if v is not None}
                if sid == "default":
                    g, wh = {}, (None, None)
                else:
                    wh = (g.pop("w", size), g.pop("h", size))
                lab, lg = self.label_of(o["label"])
                self.add_node(sid, c["x"], c["y"], g, label=lab, label_graphics=lg, keys=o["keys"],
                              w=wh[0], h=wh[1])
            elif kind == "edge":
                self.end_node(sid + "-s", c["source"])
                self.end_node(sid + "-t", c["target"])
                g = {} if sid == "default" else {
                    k: v for k, v in {**(EDGE_NEUTRAL[self.flavor] if o["neutral"] else {}), **o["graphics"]}.items()
                    if v is not None}
                pts = None
                if o["line"] is not None:
                    pts = [(c["source"]["x"], c["source"]["y"])] + [(c["x"] + dx, c["y"] + dy) for dx, dy in
                                                                   o["line"]] + [(c["target"]["x"], c["target"]["y"])]
                lab, lg = self.label_of(o["label"], edge=True)
                self.add_edge(sid, sid + "-s", sid + "-t", g, label=lab, label_graphics=lg, points=pts,
                              keys=o["keys"])
            else:
                o["fn"](self, c, sid)
            for t in o["tags"]:
                USED.add(("tag", t))
            self.caption(sid, cap, c)
        ids = [sid for _, sid, _, _ in self.items]
        if len(ids) != len(set(ids)):
            raise SystemExit(f"{self.id}: duplicate specimen ids {sorted({i for i in ids if ids.count(i) > 1})}")
        names = [n for n, _ in self.nodes]
        if len(names) != len(set(names)):
            raise SystemExit(f"{self.id}: duplicate node names {sorted({n for n in names if names.count(n) > 1})}")
        self.save()
        SHEETS.append(self)
        return len(self.items)

    def label_of(self, spec, edge=False):
        """A specimen's label: None (no label), or {"text": ..., LabelGraphics keys...} (yEd) / {"text"} (graphlet)."""
        if spec is None:
            return (None, None) if edge else ("", None)
        t = spec.get("text", "Abc")
        if self.flavor == "yed" and not spec.get("bare"):
            lg = {"text": t, **{k: v for k, v in LABEL_NEUTRAL.items() if not (edge and k == "anchor")}}
            if edge:
                lg.pop("model")
                lg["model"] = "centered"
                lg["position"] = "center"
            lg.update({k: v for k, v in spec.items() if k not in ("text", "bare")})
            lg = {k: v for k, v in lg.items() if v is not None}
            return t, lg
        return t, None

    def cluster(self, name, parent, graphics, label, members):
        """An OGDF cluster: its box (x, y the center, width, height) and its member nodes' names."""
        self.clusters.append((name, parent, graphics, label, members))

    def cluster_items(self, parent, index):
        """OGDF's rootcluster: each cluster with its graphics, its sub-clusters and its vertex keys (node ids)."""
        items = []
        for k, (name, p, g, label, members) in enumerate(self.clusters):
            if p != parent:
                continue
            body = [("id", k + 1), ("template", name), ("label", label), ("graphics", kv(g))]
            body += self.cluster_items(name, index)
            body += [("vertex", str(index[m])) for m in members]
            items.append(("cluster", body))
        if parent is None:
            inner = {m for _, _, _, _, ms in self.clusters for m in ms}
            items += [("vertex", str(index[n])) for n, _ in self.nodes if n not in inner]
        return items

    def save(self):
        index = {n: i for i, (n, _) in enumerate(self.nodes)}
        graph = []
        if self.flavor == "yed":
            graph.append(("hierarchic", 1))
            graph.append(("label", ""))
        graph.append(("directed", 1 if self.directed else 0))
        for i, (n, items) in enumerate(self.nodes):
            graph.append(("node", [("id", i)] + items))
        for k, (n, s, t, items) in enumerate(self.edges):
            head = [("id", k)] if self.flavor == "gephi" else []
            graph.append(("edge", head + [("source", index[s]), ("target", index[t])] + items))
        top = []
        if self.flavor == "gephi":
            # Gephi writes its Creator line inside the graph
            graph.insert(0, ("Creator", CREATOR[self.flavor]))
        elif CREATOR[self.flavor]:
            top.append(("Creator", CREATOR[self.flavor]))
            if self.flavor == "yed":
                top.append(("Version", "2.23"))
        if self.flavor != "ogdf":
            # (an ogdf sheet is OGDF's own writing once ogdf.mjs has rewritten it, and OGDF keeps no comment; its
            # reader also refuses a string longer than it buffers)
            warning = f"THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT {GENERATOR}."
            about = f"GML style specimen sheet {self.id} ({self.flavor} keys): {self.about}"
            if self.route == OGD:
                # a sheet OGDF reads keeps to the draft's line length: two comments
                top += [("comment", warning), ("comment", about)]
            else:
                top.append(("comment", f"{warning} {about}"))
        top.append(("graph", graph))
        if self.clusters:
            top.append(("rootcluster", self.cluster_items(None, index)))
        record_use(top, "")
        lines = []
        emit(lines, top, 0)
        if self.route == OGD:
            long = [n + 1 for n, ln in enumerate(lines) if len(ln) > GML_LINE_MAX]
            if long:
                raise SystemExit(f"{self.id}: lines {long} are longer than the GML draft's {GML_LINE_MAX} characters")
        os.makedirs(OUT, exist_ok=True)
        with open(os.path.join(OUT, self.id + ".gml"), "w", encoding="ascii", newline="\n") as f:
            f.write("\n".join(lines) + "\n")


def fit_columns(captions, px, limit=None):
    """The most columns (at most the layout's) whose cells are wide enough for the longest caption."""
    widest = max(len(c) for c in captions) * px * 0.62 + 10
    a = LAYOUT["area"]
    return max(1, min(limit or LAYOUT["columns"], int((a["x1"] - a["x0"]) // widest)))


def slug(v):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", str(v).lower())).strip("-")


# ============================================================ the sheets

G = VOCAB["graphlet"]
Y = VOCAB["yed"]


def node_shapes():
    s = Sheet("specimen-node-shapes", "every graphics type of the GML draft", "graphlet", OGD)
    s.node("default", "(nothing set)")
    for t in G["node.graphics.type"]["values"]:
        extra = {}
        if t == "image":
            extra = {"image": "img-quadrants.png"}
        elif t == "bitmap":
            extra = {"bitmap": "img-quadrants.xbm"}
        s.node(f"type-{t}", f"type={t}", {"type": t, **extra})
    s.write()

    s = Sheet("specimen-node-shapes-p2", "every yEd shape type", "yed", CY)
    s.node("default", "(nothing set)")
    for t in Y["shapes"]:
        s.node(f"type-{slug(t)}", f"type={t}", {"type": t, "w": 48, "h": 36})
    s.write()

    s = Sheet("specimen-node-shapes-p3", "every yEd flowchart configuration (customconfiguration)", "yed", CY)
    s.node("default", "(nothing set)")
    for c in Y["flowchart"]:
        short = c.rsplit(".", 1)[1]
        g = {**NEUTRAL["yed"], "type": None, "customconfiguration": c, "w": 48, "h": 36}
        s.node(f"flowchart-{slug(short)}", f"flowchart={short}", g)
    s.write()


def node_fills_borders():
    s = Sheet("specimen-node-fills-borders", "fill color syntaxes, outline colors, outline widths, stipples (Tk)",
              "graphlet", OGD)
    s.node("default", "(nothing set)")
    fills = [("#rgb", "#F80", "fill-hex3"), ("#rrggbb", "#FF8800", "fill-hex6"),
             ("#rrrgggbbb", "#FFF888000", "fill-hex9"), ("#rrrrggggbbbb", "#FFFF88880000", "fill-hex12"),
             ("name", "orange", "fill-name"), ("name-with-space", "light blue", "fill-name-space"),
             ("name-uppercase", "ORANGE", "fill-name-upper")]
    for tag, v, sid in fills:
        s.node(sid, f"fill={v}", {"fill": v}, tags=[f"node.graphics.fill:{tag}"])
    for tag, v, sid in [("#rrggbb", "#0000FF", "outline-hex6"), ("name", "red", "outline-name")]:
        s.node(sid, f"outline={v}", {"outline": v, "width": 3.0}, tags=[f"node.graphics.outline:{tag}"])
    for w in [0, 2, 4, 6]:
        s.node(f"width-{w}", f"width={w}", {"width": float(w)})
    for b in G["node.graphics.stipple"]["values"]:
        s.node(f"stipple-{b}", f"stipple={b}", {"stipple": b})
    s.write()

    s = Sheet("specimen-node-fills-borders-p2", "yEd fills, gradients, outlines and outline styles", "yed", CY)
    s.node("default", "(nothing set)")
    s.node("fill-rrggbb", "fill=#FF8800", {"fill": "#FF8800"})
    s.node("fill-rrggbbaa-80", "fill=#FF880080", {"fill": "#FF880080"})
    s.node("fill-rrggbbaa-00", "fill=#FF880000", {"fill": "#FF880000"})
    s.node("fill-lowercase", "fill=#ff8800", {"fill": "#ff8800"})
    s.node("hasfill-0", "hasFill=0", {"hasFill": 0})
    for c2 in ["#FFFFFF", "#0000FF", "#FF880080"]:
        s.node(f"fill2-{slug(c2)}", f"fill2={c2}", {"fill": "#FF8800", "fill2": c2})
    s.node("fill2-rectangle", "fill2 (rectangle)", {"type": "rectangle", "fill": "#FF8800", "fill2": "#0000FF"})
    for c in ["#0000FF", "#0000FF80"]:
        s.node(f"outline-{slug(c)}", f"outline={c}", {"outline": c, "outlineWidth": 3})
    s.node("hasoutline-0", "hasOutline=0", {"hasOutline": 0})
    for st in Y["lineTypes"]:
        s.node(f"outlinestyle-{slug(st)}", f"outlineStyle={st}", {"outlineStyle": st, "outlineWidth": 3})
    for w in [0, 2, 4, 6]:
        s.node(f"outlinewidth-{w}", f"outlineWidth={w}", {"outlineWidth": w})
    for r in [0, 1]:
        s.node(f"raisedborder-{r}", f"raisedBorder={r}", {"type": "rectangle3d", "raisedBorder": r})
    s.write()


def node_sizes_opacity():
    s = Sheet("specimen-node-sizes-opacity", "w and h of the GML draft", "graphlet", OGD)
    s.node("default", "(nothing set)")
    for w, h in [(12, 12), (24, 24), (36, 36), (60, 60), (90, 90), (80, 40), (40, 80), (90, 20), (20, 90)]:
        s.node(f"size-{w}x{h}", f"w={w} h={h}", {"w": w, "h": h})
    for w, h, t in [(80, 40, "rectangle"), (40, 80, "rectangle")]:
        s.node(f"rect-{w}x{h}", f"rectangle {w}x{h}", {"type": t, "w": w, "h": h})
    s.write()

    s = Sheet("specimen-node-sizes-opacity-p2", "yEd sizes and the alpha of yEd's #RRGGBBAA colors", "yed", CY)
    s.node("default", "(nothing set)")
    for w, h in [(12, 12), (36, 36), (90, 90), (80, 40), (40, 80)]:
        s.node(f"size-{w}x{h}", f"w={w} h={h}", {"w": w, "h": h})
    for a in ["FF", "C0", "80", "40", "00"]:
        s.node(f"fill-alpha-{a.lower()}", f"fill alpha={a}", {"fill": f"#FF8800{a}"})
    s.node("z-10", "z=10", {"z": Real(10)})
    for a in ["80", "00"]:
        s.node(f"outline-alpha-{a.lower()}", f"outline alpha={a}", {"outline": f"#0000FF{a}", "outlineWidth": 4})
    s.write()


def labels():
    s = Sheet("specimen-labels", "the node label key of the GML draft", "graphlet", OGD)
    s.node("default", "(nothing set)")
    s.node("label-text", "label=Abc", label={"text": "Abc"}, tags=["node.label:text"])
    s.node("label-entity", "label=A&amp;B", label={"text": Raw("A&amp;B &quot;q&quot;")}, tags=["node.label:entity"])
    s.node("label-char-ref", "label=&#233;", label={"text": Raw("caf&#233;")}, tags=["node.label:char-ref"])
    s.node("label-long", "label=long", label={"text": "a much longer label than its node"},
           tags=["node.label:long"])
    s.node("label-empty", "label=\"\"", label={"text": ""})
    s.write()

    s = Sheet("specimen-labels-p2", "yEd LabelGraphics: fonts, sizes, styles, colors, boxes, alignment", "yed", GV)
    s.node("default", "(nothing set)")
    s.node("text", "text=Abc", label={})
    for z in [6, 8, 10, 12, 16, 20, 24]:
        s.node(f"fontsize-{z}", f"fontSize={z}", label={"fontSize": z})
    for f in ["Dialog", "SansSerif", "Serif", "Monospaced", "Arial", "'Arial'", "Times New Roman", "Courier New",
              "DejaVu Sans", "DejaVu Serif"]:
        quoted = "-quoted" if f.startswith("'") else ""
        s.node(f"fontname-{slug(f)}{quoted}", f"fontName={f}", label={"fontName": f})
    for st in Y["fontStyles"]:
        s.node(f"fontstyle-{st}", f"fontStyle={st}", label={"fontStyle": st})
    for c in ["#FF0000", "#0000FF", "#00800080"]:
        s.node(f"color-{slug(c)}", f"color={c}", label={"color": c})
    s.node("label-fill", "fill=#FFFF00", label={"fill": "#FFFF00"})
    s.node("label-outline", "outline=#FF0000", label={"outline": "#FF0000"})
    s.node("label-fill-outline", "fill+outline", label={"fill": "#FFFF00", "outline": "#FF0000"})
    for al in Y["alignments"]:
        s.node(f"alignment-{al}", f"alignment={al}", label={"text": "a\nlonger line", "alignment": al})
    s.node("underlined", "underlinedText=1", label={"underlinedText": 1})
    s.node("visible-0", "visible=0", label={"visible": 0})
    for p in Y["autoSizePolicies"]:
        if f"yed.autoSizePolicies:{p}" in NOT_SWEPT:
            continue
        s.node(f"autosize-{slug(p)}", f"autoSizePolicy={p}", label={"text": "a longer text", "autoSizePolicy": p})
    s.node("label-multiline", "text=two lines", label={"text": "two\nlines"})
    s.write()

    s = Sheet("specimen-labels-p3", "yEd node label models and positions (model, anchor) and free offsets", "yed",
              GV)
    s.node("default", "(nothing set)")
    for model, positions in Y["nodeLabelPositions"].items():
        if model in ("free", "custom"):
            continue
        for p in positions:
            s.node(f"model-{slug(model)}-{p}", f"{model} {p}", label={"text": "Ab", "model": model, "anchor": p},
                   tags=[f"nodeLabel:{model}:{p}"])
    for dx, dy in [(-30, -30), (20, 10)]:
        s.node(f"free-{slug(dx)}-{slug(dy)}", f"free x={dx} y={dy}",
               label={"text": "Ab", "model": "free", "anchor": "c", "x": Real(dx), "y": Real(dy)},
               tags=["nodeLabel:free:anywhere"])
    s.node("model-null", "model=null", label={"text": "Ab", "model": "null"})
    for d in [0, 8]:
        s.node(f"borderdistance-{d}", f"sides n borderDistance={d}",
               label={"text": "Ab", "model": "sides", "anchor": "n", "borderDistance": Real(d)})
    s.write()


def edges_lines():
    s = Sheet("specimen-edges-lines", "edge fill, width, Line bends, loops, parallels, smooth, stipple (GML draft and "
                                      "Tk)", "graphlet", OGD)
    s.edge("default", "(nothing set)")
    for c, tag in [("#FF0000", "#rrggbb"), ("blue", "name")]:
        s.edge(f"fill-{slug(c)}", f"fill={c}", {"fill": c}, tags=[f"edge.graphics.fill:{tag}"])
    for w in [0.5, 1, 2, 4, 8]:
        s.edge(f"width-{slug(w)}", f"width={w}", {"width": float(w)})
    s.edge("line-straight", "Line (ends only)", line=[], tags=["edge.graphics.Line.point:straight"])
    s.edge("line-one-bend", "Line 1 bend", line=[(0, -30)], tags=["edge.graphics.Line.point:one-bend"])
    s.edge("line-two-bends", "Line 2 bends", line=[(-20, 25), (20, 25)], tags=["edge.graphics.Line.point:two-bends"])
    s.custom("loop", "loop", loop("graphlet"), tags=["edge.graphics.Line.point:loop"])
    s.custom("parallel", "two parallel", parallel("graphlet"), tags=["edge.graphics.Line.point:parallel"])
    for sm in ["0", "1"]:
        s.edge(f"smooth-{sm}", f"smooth={sm}", {"smooth": int(sm)}, line=[(-20, -30), (20, 30)])
    for b in G["edge.graphics.stipple"]["values"]:
        s.edge(f"stipple-{b}", f"stipple={b}", {"stipple": b, "width": 4.0})
    s.write()

    s = Sheet("specimen-edges-lines-p2", "yEd edge styles, widths, colors, bends, smoothed bends, arcs, loops",
              "yed", GV)
    s.edge("default", "(nothing set)")
    for st in Y["lineTypes"]:
        s.edge(f"style-{slug(st)}", f"style={st}", {"style": st, "width": 2.0})
    for w in [1, 3, 6]:
        s.edge(f"width-{w}", f"width={w}", {"width": float(w)})
    for c in ["#FF0000", "#FF000080"]:
        s.edge(f"fill-{slug(c)}", f"fill={c}", {"fill": c, "width": 3.0})
    s.edge("bends", "Line 2 bends", line=[(-20, -25), (20, -25)])
    for sb in [0, 1]:
        s.edge(f"smoothbends-{sb}", f"smoothBends={sb}", {"smoothBends": sb}, line=[(-20, -30), (20, 25)])
    for at, key, v in [("fixedRatio", "arcRatio", 1.0), ("fixedRatio", "arcRatio", -0.5),
                       ("fixedHeight", "arcHeight", 30.0), ("fixedHeight", "arcHeight", -15.0)]:
        s.edge(f"arc-{slug(at)}-{slug(v)}", f"arc {at} {v}", {"type": "arc", "arcType": at, key: v})
    s.custom("loop", "loop", loop("yed"))
    s.custom("parallel", "two parallel", parallel("yed"))
    s.write()


def loop(flavor):
    def fn(sheet, c, sid):
        x, y = c["x"], c["y"]
        sheet.add_node(sid + "-n", x, y + 10, NEUTRAL[flavor], w=24, h=24)
        pts = [(x, y + 10), (x - 20, y - 25), (x + 20, y - 25), (x, y + 10)]
        sheet.add_edge(sid, sid + "-n", sid + "-n", EDGE_NEUTRAL[flavor], points=pts)
    return fn


def parallel(flavor):
    def fn(sheet, c, sid):
        sheet.end_node(sid + "-s", c["source"])
        sheet.end_node(sid + "-t", c["target"])
        sx, sy, tx, ty = c["source"]["x"], c["source"]["y"], c["target"]["x"], c["target"]["y"]
        for k, dy in [(1, -12), (2, 12)]:
            pts = [(sx, sy), (c["x"], c["y"] + dy), (tx, ty)]
            sheet.add_edge(f"{sid}-{k}", sid + "-s", sid + "-t", EDGE_NEUTRAL[flavor], points=pts)
    return fn


def arrows():
    s = Sheet("specimen-arrows", "the arrow key (Tk): which ends have an arrow", "graphlet", OGD, directed=True)
    s.edge("default", "(nothing set)")
    for a in G["edge.graphics.arrow"]["values"]:
        s.edge(f"arrow-{a}", f"arrow={a}", {"arrow": a})
    s.write()

    # yEd: every arrow at the target, then every arrow at the source
    yed_arrows = Y["arrows"]
    s = Sheet("specimen-arrows-p2", "every yEd arrow at the target end", "yed", CY, directed=True)
    s.edge("default", "(nothing set)")
    for a in yed_arrows:
        s.edge(f"target-{slug(a)}", f"targetArrow={a}", {"targetArrow": a, "width": 2.0})
    s.edge("arrow-both", "arrow=both", {"arrow": "both", "sourceArrow": None, "targetArrow": None})
    s.write()
    s = Sheet("specimen-arrows-p3", "every yEd arrow at the source end, and arrow colors", "yed", CY, directed=True)
    s.edge("default", "(nothing set)")
    for a in yed_arrows:
        s.edge(f"source-{slug(a)}", f"sourceArrow={a}", {"sourceArrow": a, "width": 2.0})
    s.edge("color-red", "fill=#FF0000", {"fill": "#FF0000", "targetArrow": "standard", "width": 2.0})
    s.write()

    s = Sheet("specimen-arrows-p4", "Cytoscape 2.x's numbered arrows (source_arrow, target_arrow)", "cytoscape",
              CY, directed=True)
    s.edge("default", "(nothing set)")
    for n in sorted(VOCAB["cytoscape2Arrows"], key=int):
        s.edge(f"target-arrow-{n}", f"target_arrow={n}", {"target_arrow": int(n), "width": 2.0})
    for n in sorted(VOCAB["cytoscape2Arrows"], key=int):
        s.edge(f"source-arrow-{n}", f"source_arrow={n}", {"source_arrow": int(n), "width": 2.0})
    s.write()


def edge_labels():
    s = Sheet("specimen-edge-labels", "the edge label key of the GML draft", "graphlet", OGD)
    s.edge("default", "(nothing set)")
    s.edge("label-text", "label=Abc", label={"text": "Abc"}, tags=["edge.label:text"])
    s.edge("label-bend", "label on a bent edge", label={"text": "Abc"}, line=[(0, -30)])
    s.write()

    s = Sheet("specimen-edge-labels-p2", "yEd edge LabelGraphics: fonts, colors, boxes, models and positions",
              "yed", GV)
    s.edge("default", "(nothing set)")
    s.edge("text", "text=Abc", label={})
    for z in [8, 14, 20]:
        s.edge(f"fontsize-{z}", f"fontSize={z}", label={"fontSize": z})
    for f in ["Dialog", "Times New Roman", "Courier New"]:
        s.edge(f"fontname-{slug(f)}", f"fontName={f}", label={"fontName": f})
    for st in Y["fontStyles"]:
        s.edge(f"fontstyle-{st}", f"fontStyle={st}", label={"fontStyle": st})
    s.edge("color-red", "color=#FF0000", label={"color": "#FF0000"})
    s.edge("label-fill", "fill=#FFFF00", label={"fill": "#FFFF00"})
    for model, positions in Y["edgeLabelPositions"].items():
        if model in ("free", "custom"):
            continue
        for p in positions:
            s.edge(f"model-{slug(model)}-{p}", f"{model} {p}", label={"model": model, "position": p},
                   tags=[f"edgeLabel:{model}:{p}"])
    s.edge("free-offset", "free x=10 y=-20", label={"model": "free", "position": "anywhere", "x": Real(10),
                                                     "y": Real(-20)},
           tags=["edgeLabel:free:anywhere"])
    s.edge("alignment-left", "alignment=left", label={"text": "a\nlonger line", "alignment": "left"})
    s.edge("configuration-autoflipping", "AutoFlippingLabel", label={"configuration": "AutoFlippingLabel"},
           line=[(0, -30)])
    s.write()


def group(spec):
    """A yEd group node (isGroup 1) at the cell, its members (gid) inside it."""
    def fn(sheet, c, sid):
        gw, gh = spec.get("w", 96), spec.get("h", 80)
        # the box's bottom edge 15 px under the cell center, so the caption below it stays clear
        x, y = c["x"], c["y"] + 15 - gh / 2
        g = {"type": "roundrectangle", "fill": "#F5F5F5", "outline": "#000000", "outlineStyle": "dashed",
             **spec.get("graphics", {})}
        lg = {"text": spec.get("label", "Group"), "fill": "#EBEBEB", **LABEL_NEUTRAL, "anchor": "t",
              **spec.get("lg", {})}
        lg = {k: v for k, v in lg.items() if v is not None}
        keys = {"isGroup": 1}
        sheet.add_node(sid, x, y, g, label=lg["text"], label_graphics=lg, keys=keys, w=gw, h=gh)
        index_of = len(sheet.nodes) - 1
        members = spec.get("members", 2)
        for k in range(members):
            mx = x - gw / 4 + (gw / 2) * (k / max(1, members - 1)) if members > 1 else x
            sheet.add_node(f"{sid}-m{k + 1}", mx, y + 12, NEUTRAL["yed"], w=18, h=18, keys={"gid": index_of})
        if spec.get("nested"):
            sheet.add_node(sid + "-inner", x + gw / 5, y + 14, {**g, "fill": "#E0E0FF"}, label="Inner",
                           label_graphics={**lg, "text": "Inner"}, keys={"isGroup": 1, "gid": index_of}, w=gw / 2.4,
                           h=gh / 2.2)
            inner = len(sheet.nodes) - 1
            sheet.add_node(sid + "-inner-m1", x + gw / 5, y + 20, NEUTRAL["yed"], w=12, h=12, keys={"gid": inner})
        if spec.get("edge"):
            sheet.add_edge(sid + "-e", f"{sid}-m1", f"{sid}-m{members}", EDGE_NEUTRAL["yed"])
    return fn


def groups():
    s = Sheet("specimen-groups", "yEd groups (isGroup, gid): boxes, labels, nesting", "yed", CY, columns=5)
    s.custom("group", "isGroup=1", group({}))
    s.custom("group-empty", "empty group", group({"members": 0}))
    s.custom("group-nested", "nested group", group({"nested": True, "members": 1}))
    s.custom("group-fill", "group fill=#FFE0C0", group({"graphics": {"fill": "#FFE0C0"}}))
    s.custom("group-outline", "outline=#0000FF line", group({"graphics": {"outline": "#0000FF", "outlineStyle": "line",
                                                                            "outlineWidth": 3}}))
    s.custom("group-rectangle", "type=rectangle", group({"graphics": {"type": "rectangle"}}))
    s.custom("group-label-bottom", "label anchor=b", group({"lg": {"anchor": "b"}}))
    s.custom("group-label-plain", "label no fill", group({"lg": {"fill": None}}))
    s.custom("group-edge", "edge inside", group({"edge": True}))
    s.custom("group-large", "w=140 h=110", group({"w": 140, "h": 110, "members": 3}))
    s.write()


def images_charts():
    s = Sheet("specimen-images-charts", "image and bitmap files (the GML draft)", "graphlet", OGD)
    s.node("default", "(nothing set)")
    s.node("image-png", "image=png", {"type": "image", "image": "img-quadrants.png"})
    s.node("image-png-wide", "image w=72 h=36", {"type": "image", "image": "img-quadrants.png", "w": 72, "h": 36})
    s.node("image-on-oval", "oval + image", {"image": "img-quadrants.png"})
    s.node("bitmap-xbm", "bitmap=xbm", {"type": "bitmap", "bitmap": "img-quadrants.xbm"})
    s.node("bitmap-fill", "bitmap fill=#0000FF", {"type": "bitmap", "bitmap": "img-quadrants.xbm", "fill": "#0000FF"})
    s.write()


def write_images():
    """The image files the sheets name: a 4-color PNG (copied from the DOT sheets) and the same quadrants as XBM."""
    src = os.path.join(HERE, "../../specimens/dot/img-quadrants.png")
    with open(src, "rb") as f:
        png = f.read()
    with open(os.path.join(OUT, "img-quadrants.png"), "wb") as f:
        f.write(png)
    w = h = 16
    rows = []
    for y in range(h):
        bits = 0
        for x in range(w):
            if (x < w // 2) == (y < h // 2):
                bits |= 1 << x
        rows += [bits & 0xFF, bits >> 8]
    body = ", ".join(f"0x{b:02x}" for b in rows)
    with open(os.path.join(OUT, "img-quadrants.xbm"), "w", encoding="ascii", newline="\n") as f:
        f.write(f"#define img_quadrants_width {w}\n#define img_quadrants_height {h}\n"
                f"static unsigned char img_quadrants_bits[] = {{\n  {body} }};\n")


C = VOCAB["cytoscape"]
O = VOCAB["ogdf"]


def cytoscape_sheets():
    """Cytoscape 2.x's GML (Creator "Cytoscape"), drawn by Cytoscape's own GML reader."""
    s = Sheet("specimen-node-shapes-p4", "Cytoscape's node shape names, as Cytoscape 3 names them and in the lower "
                                         "case Cytoscape 2.x wrote, and Cytoscape 2.x's own names", "cytoscape", CY)
    s.node("default", "(nothing set)")
    for t in C["shapes"]:
        s.node(f"type-{slug(t)}", f"type={t}", {"type": t, "w": 48, "h": 36})
    for t in C["shapes"]:
        s.node(f"type-{slug(t)}-lower", f"type={t.lower()}", {"type": t.lower(), "w": 48, "h": 36})
    for t in C["legacyShapes"]:
        s.node(f"type-{slug(t)}-2x", f"type={t}", {"type": t, "w": 48, "h": 36})
    s.write()

    s = Sheet("specimen-node-fills-borders-p3", "Cytoscape 2.x's fill, outline and outline_width", "cytoscape", CY)
    s.node("default", "(nothing set)")
    for c in ["#ffcc66", "#FF8800"]:
        s.node(f"fill-{slug(c)}", f"fill={c}", {"fill": c})
    s.node("outline-0000ff", "outline=#0000FF", {"outline": "#0000FF", "outline_width": 3.0})
    for w in [0, 2, 4, 6]:
        s.node(f"outline-width-{w}", f"outline_width={w}", {"outline_width": float(w)})
    s.node("width-4", "width=4 (border)", {"outline_width": None, "width": 4.0})
    s.write()

    s = Sheet("specimen-node-sizes-opacity-p3", "Cytoscape 2.x's w and h", "cytoscape", CY)
    s.node("default", "(nothing set)")
    for w, h in [(12, 12), (35, 35), (80, 40), (40, 80), (90, 20)]:
        s.node(f"size-{w}x{h}", f"w={w} h={h}", {"w": w, "h": h})
    s.write()

    s = Sheet("specimen-labels-p4", "the label key under Creator Cytoscape (the node's name and drawn label)",
              "cytoscape", CY)
    s.node("default", "(nothing set)")
    s.node("label-text", "label=Abc", label={"text": "Abc"})
    s.node("label-long", "label=long", label={"text": "a much longer label than its node"})
    s.write()

    s = Sheet("specimen-edges-lines-p3", "Cytoscape 2.x's edge fill, width and type", "cytoscape", CY)
    s.edge("default", "(nothing set)")
    for c in ["#FF0000", "#0000ff"]:
        s.edge(f"fill-{slug(c)}", f"fill={c}", {"fill": c})
    for w in [1, 2, 4, 8]:
        s.edge(f"width-{w}", f"width={w}", {"width": float(w)})
    s.edge("type-line", "type=line", {"type": "line"})
    s.write()


def ogdf_cluster(spec):
    """An OGDF cluster at the cell: its box and its member nodes (and a nested cluster)."""
    def fn(sheet, c, sid):
        gw, gh = spec.get("w", 96), spec.get("h", 70)
        # the box's center; its bottom edge 15 px under the cell center, so the caption below it stays clear
        x, y = c["x"], c["y"] + 15 - gh / 2
        # an OGDF cluster's x and y are its box's top left corner (ClusterGraphAttributes), not its center
        g = {"x": Real(x - gw / 2), "y": Real(y - gh / 2), "width": Real(gw), "height": Real(gh), "fill": "#F5F5F5",
             "fillbg": "#000000", "pattern": "Solid", "color": "#000000", "lineWidth": 1.0, "stipple": "Solid",
             **spec.get("graphics", {})}
        members = []
        for k in range(spec.get("members", 2)):
            n = spec.get("members", 2)
            mx = x - gw / 4 + (gw / 2) * (k / max(1, n - 1)) if n > 1 else x
            sheet.add_node(f"{sid}-m{k + 1}", mx, y + 12, NEUTRAL["ogdf"], w=18, h=18)
            members.append(f"{sid}-m{k + 1}")
        sheet.cluster(sid, None, g, spec.get("label", "Group"), members)
        if spec.get("nested"):
            sheet.add_node(sid + "-inner-m1", x + gw / 5, y + 14, NEUTRAL["ogdf"], w=12, h=12)
            iw, ih = gw / 2.4, gh / 2.2
            sheet.cluster(sid + "-inner", sid, {**g, "x": Real(x + gw / 5 - iw / 2), "y": Real(y + 14 - ih / 2),
                                                "width": Real(iw), "height": Real(ih), "fill": "#E0E0FF"}, "Inner",
                          [sid + "-inner-m1"])
        if spec.get("edge") and len(members) > 1:
            sheet.add_edge(sid + "-e", members[0], members[-1], EDGE_NEUTRAL["ogdf"])
    return fn


def ogdf_sheets():
    """OGDF's GML (GraphIO::writeGML), drawn by OGDF itself (GraphIO::drawSVG)."""
    s = Sheet("specimen-node-shapes-p5", "every OGDF Shape", "ogdf", OG)
    s.node("default", "(nothing set)")
    for t in O["shapes"]:
        s.node(f"type-{slug(t)}", f"type={t}", {"type": t, "w": 48, "h": 36})
    s.write()

    s = Sheet("specimen-node-fills-borders-p4", "OGDF fill, fillbg and pattern, outline, stipple and lineWidth", "ogdf",
              OG)
    s.node("default", "(nothing set)")
    s.node("fill-ff8800", "fill=#FF8800", {"fill": "#FF8800"})
    s.node("fill-ff8800-lower", "fill=#ff8800", {"fill": "#ff8800"})
    s.node("outline-0000ff", "outline=#0000FF", {"outline": "#0000FF", "lineWidth": 3.0})
    for w in [0, 2, 4, 6]:
        s.node(f"linewidth-{w}", f"lineWidth={w}", {"lineWidth": float(w)})
    for st in O["strokes"]:
        s.node(f"stipple-{slug(st)}", f"stipple={st}", {"stipple": st, "lineWidth": 3.0})
    for pt in O["patterns"]:
        s.node(f"pattern-{slug(pt)}", f"pattern={pt}", {"pattern": pt, "fill": "#FF8800", "fillbg": "#0000FF"})
    s.write()

    s = Sheet("specimen-node-sizes-opacity-p4", "OGDF w and h", "ogdf", OG)
    s.node("default", "(nothing set)")
    for w, h in [(12, 12), (36, 36), (60, 60), (80, 40), (40, 80), (90, 20)]:
        s.node(f"size-{w}x{h}", f"w={w} h={h}", {"w": w, "h": h})
    s.write()

    s = Sheet("specimen-labels-p5", "OGDF node labels and their offsets (graphics label x, y)", "ogdf", OG)
    s.node("default", "(nothing set)")
    s.node("label-text", "label=Abc", label={"text": "Abc"})
    s.node("label-long", "label=long", label={"text": "a much longer label than its node"})
    for side, dx, dy in [("n", 0, -24), ("e", 30, 0), ("s", 0, 24), ("w", -30, 0)]:
        s.node(f"label-offset-{side}", f"label x={dx} y={dy}", {
            "label": [("x", Real(dx)), ("y", Real(dy)), ("z", Real(0))]}, label={"text": "Abc"})
    s.write()

    s = Sheet("specimen-edges-lines-p4", "OGDF edge fill, lineWidth, stipple and bends", "ogdf", OG)
    s.edge("default", "(nothing set)")
    for c in ["#FF0000", "#0000ff"]:
        s.edge(f"fill-{slug(c)}", f"fill={c}", {"fill": c})
    for w in [1, 2, 4, 8]:
        s.edge(f"linewidth-{w}", f"lineWidth={w}", {"lineWidth": float(w)})
    for st in O["strokes"]:
        s.edge(f"stipple-{slug(st)}", f"stipple={st}", {"stipple": st, "lineWidth": 3.0})
    s.edge("line-one-bend", "Line 1 bend", line=[(0, -30)])
    s.edge("line-two-bends", "Line 2 bends", line=[(-20, 25), (20, 25)])
    s.custom("loop", "loop", loop("ogdf"))
    s.custom("parallel", "two parallel", parallel("ogdf"))
    s.write()

    s = Sheet("specimen-arrows-p5", "OGDF's arrow key, and an arrow's color and width", "ogdf", OG, directed=True)
    s.edge("default", "(nothing set)")
    for a in O["arrows"]:
        s.edge(f"arrow-{a}", f"arrow={a}", {"arrow": a})
    s.edge("arrow-color", "arrow=last fill=#FF0000", {"arrow": "last", "fill": "#FF0000"})
    s.edge("arrow-width", "arrow=last lineWidth=3", {"arrow": "last", "lineWidth": 3.0})
    s.write()

    s = Sheet("specimen-edge-labels-p3", "OGDF edge labels", "ogdf", OG)
    s.edge("default", "(nothing set)")
    s.edge("label-text", "label=Abc", label={"text": "Abc"})
    s.edge("label-bend", "label on a bent edge", label={"text": "Abc"}, line=[(0, -30)])
    s.write()

    s = Sheet("specimen-groups-p2", "OGDF clusters (rootcluster): boxes, labels, nesting", "ogdf", OG, columns=5)
    s.custom("cluster", "cluster", ogdf_cluster({}))
    s.custom("cluster-empty", "empty cluster", ogdf_cluster({"members": 0}))
    s.custom("cluster-nested", "nested cluster", ogdf_cluster({"nested": True, "members": 1}))
    s.custom("cluster-fill", "fill=#FFE0C0", ogdf_cluster({"graphics": {"fill": "#FFE0C0"}}))
    s.custom("cluster-color", "color=#0000FF lineWidth=3", ogdf_cluster({"graphics": {"color": "#0000FF",
                                                                                     "lineWidth": 3.0}}))
    s.custom("cluster-stipple", "stipple=Dash", ogdf_cluster({"graphics": {"stipple": "Dash"}}))
    s.custom("cluster-pattern", "pattern=Cross", ogdf_cluster({"graphics": {"pattern": "Cross",
                                                                           "fillbg": "#0000FF"}}))
    s.custom("cluster-edge", "edge inside", ogdf_cluster({"edge": True}))
    s.custom("cluster-label-empty", "label empty", ogdf_cluster({"label": ""}))
    s.custom("cluster-large", "width=140 height=100", ogdf_cluster({"w": 140, "h": 100, "members": 3}))
    s.write()


def gephi_mixed(fills):
    """An edge between two end nodes of their own colors (Gephi's Preview mixes them into the edge's)."""
    def fn(sheet, c, sid):
        for end, fill in zip(("s", "t"), fills):
            p = c["source" if end == "s" else "target"]
            sheet.add_node(f"{sid}-{end}", p["x"], p["y"], {**NEUTRAL["gephi"], "fill": fill}, w=12, h=12)
        sheet.add_edge(sid, sid + "-s", sid + "-t", EDGE_NEUTRAL["gephi"])
    return fn


def gephi_sheets():
    """Gephi's GML (its GML exporter's keys), drawn by Gephi itself."""
    s = Sheet("specimen-node-fills-borders-p5", "Gephi's fill", "gephi", GE)
    s.node("default", "(nothing set)", {"fill": None})
    for c in ["#FF8800", "#ff8800", "#0000FF", "#000000", "#FFFFFF"]:
        s.node(f"fill-{slug(c)}{'-lower' if c == '#ff8800' else ''}", f"fill={c}", {"fill": c})
    s.write()

    s = Sheet("specimen-node-sizes-opacity-p5", "Gephi's w, h and d (its size)", "gephi", GE)
    s.node("default", "(nothing set)", neutral=False)
    for w in [2, 5, 10, 20, 25]:
        s.node(f"size-{w}", f"w={w}", {"size": w})
    s.node("size-20x5", "w=20 h=5", {"size": 20, "size_h": 5})
    s.node("size-5x20", "w=5 h=20", {"size": 5, "size_h": 20})
    s.write()

    s = Sheet("specimen-labels-p6", "Gephi's node label (drawn at a size proportional to its node's)", "gephi", GE)
    s.node("default", "(nothing set)")
    s.node("label-text", "label=Abc", label={"text": "Abc"})
    s.node("label-long", "label=long", label={"text": "a much longer label than its node"})
    s.node("label-large-node", "label on w=25", {"size": 25}, label={"text": "Abc"})
    s.write()

    s = Sheet("specimen-edges-lines-p5", "Gephi's edge value (its weight, drawn as the line's width) and its color "
                                         "mixed from its end nodes'", "gephi", GE)
    s.edge("default", "(nothing set)")
    for v in [0.5, 1, 2, 5, 10]:
        s.edge(f"value-{slug(v)}", f"value={v}", keys={"value": float(v)})
    s.custom("mixed-colors", "ends #FF8800, #0000FF", gephi_mixed(["#FF8800", "#0000FF"]))
    # Gephi's exporter writes an edge's own color as the edge's fill (not in a graphics record); its Preview's default
    # edge color mode, MIXED, draws the end nodes' mixed color instead
    s.edge("fill-ff0000", "fill=#ff0000", keys={"fill": "#ff0000"})
    s.write()

    s = Sheet("specimen-edge-labels-p4", "Gephi's edge label (its Preview's default draws no edge label)", "gephi", GE)
    s.edge("default", "(nothing set)")
    s.edge("label-text", "label=Abc", label={"text": "Abc"})
    s.write()

    s = Sheet("specimen-arrows-p6", "a directed Gephi graph: an arrow on every edge", "gephi", GE, directed=True)
    s.edge("default", "(nothing set)")
    for v in [1, 5]:
        s.edge(f"value-{v}", f"value={v}", keys={"value": float(v)})
    # an edge's own directed key, which Gephi's exporter writes on every edge of a mixed graph
    for d in [0, 1]:
        s.edge(f"directed-{d}", f"directed={d}", keys={"directed": d})
    s.write()


# ============================================================ the vocabulary check

def check():
    missing = []
    vals = {(k, v) for kind, *rest in USED if kind == "value" for k, v in [rest]}
    paths = {rest[0] for kind, *rest in USED if kind == "path"}
    tags = {rest[0] for kind, *rest in USED if kind == "tag"}

    def has_value(suffix, v):
        return any(p.endswith(suffix) and val == v for p, val in vals)

    for key, entry in G.items():
        path = "." + key.replace("node.", "graph.node.").replace("edge.", "graph.edge.")
        for v in entry["values"]:
            if v in ("number", "file"):
                ok = any(p.endswith(path) for p in paths)
            elif key in ("node.graphics.type", "node.graphics.stipple", "edge.graphics.arrow", "edge.graphics.stipple",
                         "edge.graphics.smooth"):
                ok = has_value(path, v)
            else:
                ok = f"{key}:{v}" in tags
            if not ok:
                missing.append(f"graphlet {key}={v}")
    for k in Y["shapes"]:
        if not has_value(".graphics.type", k):
            missing.append(f"yed shape {k}")
    for k in Y["flowchart"]:
        if not has_value(".graphics.customconfiguration", k):
            missing.append(f"yed flowchart {k}")
    for a in Y["arrows"]:
        for end in ("targetArrow", "sourceArrow"):
            if not has_value(f".graphics.{end}", a):
                missing.append(f"yed {end} {a}")
    for t in Y["lineTypes"]:
        for key in (".graphics.outlineStyle", ".graphics.style"):
            if not has_value(key, t):
                missing.append(f"yed {key} {t}")
    for model, positions in Y["nodeLabelPositions"].items():
        for p in positions:
            if f"nodeLabel:{model}:{p}" not in tags and model != "custom":
                missing.append(f"yed node label {model} {p}")
    for model, positions in Y["edgeLabelPositions"].items():
        for p in positions:
            if f"edgeLabel:{model}:{p}" not in tags and model != "custom":
                missing.append(f"yed edge label {model} {p}")
    for key, field in [("fontStyles", ".LabelGraphics.fontStyle"), ("alignments", ".LabelGraphics.alignment"),
                       ("autoSizePolicies", ".LabelGraphics.autoSizePolicy"), ("arcTypes", ".graphics.arcType")]:
        for v in Y[key]:
            if f"yed.{key}:{v}" in NOT_SWEPT:
                continue
            if not has_value(field, v):
                missing.append(f"yed {key} {v}")
    for p in list(Y["corpusKeys"]["keys"]) + Y["keysBeyondCorpus"]:
        full = "." + p.replace("node.", "graph.node.", 1).replace("edge.", "graph.edge.", 1)
        if full not in paths:
            missing.append(f"yed key {p}")
    for n in VOCAB["cytoscape2Arrows"]:
        for end in ("target_arrow", "source_arrow"):
            if not has_value(f".graphics.{end}", n):
                missing.append(f"cytoscape {end} {n}")
    for t in C["shapes"] + [t.lower() for t in C["shapes"]] + C["legacyShapes"]:
        if not has_value(".graphics.type", t):
            missing.append(f"cytoscape shape {t}")
    for key, field in [("shapes", ".graphics.type"), ("strokes", ".graphics.stipple"),
                       ("patterns", ".graphics.pattern"), ("arrows", ".graphics.arrow")]:
        for v in O[key]:
            if not has_value(field, v):
                missing.append(f"ogdf {key} {v}")
    for kind, keys in [("node", C["nodeKeys"]), ("edge", C["edgeKeys"])]:
        for k in keys:
            if f".graph.{kind}.{k}" not in paths:
                missing.append(f"cytoscape key {kind}.{k}")
    for kind, keys in [("node", O["nodeKeys"]), ("edge", O["edgeKeys"])]:
        for k in keys:
            if not any(p.startswith(f".graph.{kind}.{k}") for p in paths):
                missing.append(f"ogdf key {kind}.{k}")
    for kind, keys in [("node", VOCAB["gephi"]["nodeKeys"]), ("edge", VOCAB["gephi"]["edgeKeys"])]:
        for k in keys:
            if f".graph.{kind}.{k}" not in paths:
                missing.append(f"gephi key {kind}.{k}")
    for k in O["clusterKeys"]:
        if not any(p.startswith(".rootcluster.cluster." + k) for p in paths):
            missing.append(f"ogdf cluster key {k}")
    if missing:
        raise SystemExit("not on any sheet and not in NOT_SWEPT:\n  " + "\n  ".join(missing))


def main():
    node_shapes()
    node_fills_borders()
    node_sizes_opacity()
    labels()
    edges_lines()
    arrows()
    edge_labels()
    groups()
    images_charts()
    cytoscape_sheets()
    ogdf_sheets()
    gephi_sheets()
    write_images()
    check()
    # gv2gml's sheets: Graphviz writes the GML from a DOT file and draws that DOT file as the oracle
    SHEETS.extend(gml_graphviz.sheets(OUT))
    for s in SHEETS:
        if len(s.items) > LAYOUT["maxSpecimens"]:
            raise SystemExit(f"{s.id}: {len(s.items)} specimens")
    routes = {s.id: {"route": s.route, "flavor": s.flavor, "directed": s.directed, "specimens": len(s.items),
                     "about": s.about, **({"standIns": s.stand_ins} if getattr(s, "stand_ins", None) else {})} for s in SHEETS}
    with open(os.path.join(OUT, "oracle-routes.json"), "w", encoding="ascii", newline="\n") as f:
        json.dump({"about": "Which program draws each GML sheet's oracle (written by "
                            f"{GENERATOR}): cytoscape-gml (Cytoscape desktop's GML reader), gml2gv "
                            "(gml2gv | neato -n2), ogdf (OGDF's own GraphIO::drawSVG of its own GraphIO::writeGML of the sheet), "
                            "ogdf-draw (OGDF's GraphIO::readGML and GraphIO::drawSVG of the sheet as written), gephi (Gephi's own Preview) or graphviz (Graphviz's "
                            "own drawing of the DOT file its gv2gml converted to the sheet). standIns: the programs that also draw the "
                            "sheet into oracles/stand-ins/, for the settings its oracle does not draw (judges.json).",
                   "sheets": routes}, f,
                  indent=2)
        f.write("\n")
    total = sum(len(s.items) for s in SHEETS)
    print(f"{len(SHEETS)} sheets, {total} specimens")
    for s in SHEETS:
        print(f"  {s.id}: {len(s.items)} ({s.flavor}, {s.route})")


if __name__ == "__main__":
    main()
