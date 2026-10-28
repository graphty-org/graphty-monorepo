#!/usr/bin/env python3
"""Writes the Pajek style specimen sheets (graph-io/test/fidelity/specimens/pajek/), deterministic.

    python3 pajek.py [out-dir]        (default: ../../specimens/pajek)

Every value in pajek-vocabulary.json (Pajek 6.02's manual, sections 5.3 and 5.2, Figure 19, and the Draw window and
export options Pajek writes to its ini file) is drawn on a sheet or named in NOT_SWEPT with the reason; the script
fails otherwise. Sheet rules: graph-io/test/fidelity/specimens/README.md.

The sheets are the pages of pages.json beside them: each category's .net file drawn by Pajek under its defaults, and
again under one Draw window or export option per further page (Pajek's options live in its ini file, not in the
.net file, so a page's file is the same file as its category's first page; pages.json names the option). The
edge-labels sheet's first page is drawn with Options / Lines / Mark Lines / with Labels, since Pajek draws no line
label without it; its second page is Pajek's default, which draws none.

Ids: a Pajek vertex is its number (graph-io's node id and the `<!-- Vertex: N -->` comment of Pajek's SVG); a
label is drawn text, so it cannot carry the setting id. The setting id of every vertex is in pages.json `names`
(vertex number -> id) and in the comment block at the top of each file: anchors `anchor-*`, captions
`cap-<specimen id>`, an edge specimen's end vertices `<edge id>-s` and `<edge id>-t`, a node specimen its id.

Units: Pajek draws the file's 0..1 coordinates across its Draw window, one axis at a time; the oracle's window is
1200 x 900 (tools/pajek.mjs), so a vertex at sheet pixel (x, y) is written at (x / 1200, y / 900), y down as Pajek
draws it. Sizes are Pajek's own: a vertex is 20 px across at x_fact 1, so the neutral 36 px is x_fact 1.8.

Carry: Pajek draws a vertex line that sets nothing exactly as the line before it, and a line that leaves out c, w,
p or ap with the previous line's value (ISSUES.md, "Pajek 6.02's own drawings"). So the `default` specimen, the one
with nothing set, is always the first vertex line or the first line of the first section, and every other line
sets every neutral key.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from sheet_layout import ANCHORS, LAYOUT, cells  # noqa: E402

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "../../specimens/pajek")
VOCAB = json.load(open(os.path.join(HERE, "pajek-vocabulary.json"), encoding="ascii"))
GENERATOR = "graph-io/test/fidelity/generators/specimens/pajek.py"
W, H = LAYOUT["canvas"]["width"], LAYOUT["canvas"]["height"]
NEU = LAYOUT["neutral"]
ID = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
# Pajek's vertex size unit: 20 px across at x_fact 1 (measured: ellipse rx 10)
UNIT = 20.0


def num(v):
    s = f"{float(v):.4f}".rstrip("0").rstrip(".")
    return s if s not in ("", "-0") else "0"


def hexcolor(c):
    return "RGB" + c.lstrip("#").upper()


# Pajek's font is a single PostScript word (a quoted family name breaks the line: `font "DejaVu Sans"` draws the
# family `"DejaVu` and drops the keys after it), so the neutral sans is Helvetica; the PNG maps it to DejaVu Sans.
FONT = "Helvetica"
NEUTRAL_V = [("x_fact", num(NEU["size"] / UNIT)), ("y_fact", num(NEU["size"] / UNIT)), ("ic", hexcolor(NEU["fill"])),
             ("bc", hexcolor(NEU["border"])), ("bw", num(NEU["borderWidth"])), ("phi", "0"), ("lc", "Black"),
             ("fos", num(NEU["fontSize"])), ("font", FONT), ("la", "0"), ("lr", "0"), ("lphi", "0")]
END_V = [("x_fact", "0.6"), ("y_fact", "0.6")] + NEUTRAL_V[2:]
ANCHOR_V = [("x_fact", num(LAYOUT["anchors"]["size"] / UNIT)), ("y_fact", num(LAYOUT["anchors"]["size"] / UNIT))] + \
    NEUTRAL_V[2:]
CAPTION_V = [("x_fact", "0.01"), ("y_fact", "0.01"), ("ic", "White"), ("bc", "White"), ("bw", "0"), ("phi", "0"),
             ("lc", "Black"), ("fos", num(LAYOUT["captionFontSize"])), ("font", FONT), ("la", "0"), ("lr", "0"),
             ("lphi", "0")]
# A project sheet's values for a vertex that sets none: Pajek's partition cluster 0 and vector value 1 (size as the
# file gives it); anchors are cluster 12 (Gray) and captions cluster 6 (White), so their tiny dots stay quiet.
NEUTRAL_PART, NEUTRAL_VEC, ANCHOR_PART, CAPTION_PART = "0", "1", "12", "6"
NEUTRAL_LINE = [("w", num(NEU["edgeWidth"])), ("c", hexcolor(NEU["edgeColor"])), ("p", "Solid")]
NEUTRAL_ARC = NEUTRAL_LINE + [("s", "1"), ("a", "A"), ("ap", "0")]
NEUTRAL_LABEL = [("lp", "0.5"), ("lr", "0"), ("lphi", "0"), ("lc", "Black"), ("la", "0"), ("fos", num(NEU["fontSize"])),
                 ("font", FONT)]


def merge(base, over):
    """base's keys in order with over's values, then over's other keys; a None value removes the key."""
    over = list(over)
    keys = {k for k, _ in over}
    out = [(k, dict(over)[k] if k in keys else v) for k, v in base]
    have = {k for k, _ in base}
    out += [(k, v) for k, v in over if k not in have]
    return [(k, v) for k, v in out if v is not None]


def quote(t):
    return '"' + t + '"'


COVERED = set()


class Sheet:
    def __init__(self, sid, about, project=False):
        """project: a Pajek project file (.paj): the network, then a *Partition and two *Vector objects, one value
        per vertex (a specimen's `part` / `vec` / `vec2`; every other vertex NEUTRAL_PART / NEUTRAL_VEC)."""
        self.id, self.about, self.project = sid, about, project
        self.ext = "paj" if project else "net"
        self.specimens = []

    def add(self, sid, caption, kind, cov=(), **spec):
        if '"' in caption:
            raise ValueError(f"{self.id}: caption {caption!r}: Pajek ends a quoted label at its next quote")
        if not ID.match(sid):
            raise ValueError(f"{self.id}: specimen id {sid!r} is not a setting id")
        if any(s["id"] == sid for s in self.specimens):
            raise ValueError(f"{self.id}: duplicate specimen {sid}")
        self.specimens.append({"id": sid, "caption": caption, "kind": kind, **spec})
        COVERED.update(cov)

    def node(self, sid, caption, shape="ellipse", params=(), label="", cov=(), raw=None, z="0.5", part=None,
             vec=None, vec2=None):
        """A vertex specimen: neutral but for `params` (raw: the whole parameter text, written as is; z: the third
        coordinate, None to write none; part / vec / vec2: its partition, first and second vector values on a
        project sheet)."""
        self.add(sid, caption, "node", cov, shape=shape, params=list(params), label=label, raw=raw, z=z, part=part,
                 vec=vec, vec2=vec2)

    def line(self, sid, caption, section="*Edges", params=(), value="1", loop=False, cov=(), pair=False, raw=None,
             label=None, ends="ellipse"):
        """A line specimen between its own two neutral vertices (one for a loop); pair: a bidirected pair; ends: the
        end vertices' shape (a user hook h1 / h2 names one of that shape's HOOKS in SHAPES.CFG)."""
        self.add(sid, caption, "line", cov, section=section, params=list(params), value=value, loop=loop,
                 pair=pair, raw=raw, label=label, ends=ends)

    def write(self, out):
        if len(self.specimens) > LAYOUT["maxSpecimens"]:
            raise ValueError(f"{self.id}: {len(self.specimens)} specimens; split it into pages")
        if self.specimens[0]["id"] != "default":
            raise ValueError(f"{self.id}: the first specimen must be the default one")
        cs = cells(len(self.specimens))
        verts, lines, names = [], [], {}

        def vertex(name, label, x, y, shape, params, raw=None, z="0.5", part=None, vec=None, vec2=None):
            verts.append((name, label, x, y, shape, params, raw, z,
                          NEUTRAL_PART if part is None else part, NEUTRAL_VEC if vec is None else vec,
                          NEUTRAL_VEC if vec2 is None else vec2))
            names[str(len(verts))] = name
            return len(verts)

        caps = []
        for spec, c in zip(self.specimens, cs):
            if spec["kind"] == "node":
                if spec["id"] == "default":
                    vertex("default", spec["label"], c["x"], c["y"], None, [], raw="", part=spec["part"],
                           vec=spec["vec"], vec2=spec["vec2"])
                else:
                    vertex(spec["id"], spec["label"], c["x"], c["y"], spec["shape"],
                           merge(NEUTRAL_V, spec["params"]), spec["raw"], spec["z"], spec["part"], spec["vec"],
                           spec["vec2"])
            else:
                s = vertex(f"{spec['id']}-s", "", c["source"]["x"], c["source"]["y"], spec["ends"], END_V)
                t = s if spec["loop"] else vertex(f"{spec['id']}-t", "", c["target"]["x"], c["target"]["y"],
                                                  spec["ends"], END_V)
                arc = spec["section"].startswith("*Arcs")
                if spec["id"] == "default":
                    params = []
                else:
                    params = merge(NEUTRAL_ARC if arc else NEUTRAL_LINE, spec["params"])
                    if spec["label"] is not None:
                        params = merge(params, [("l", quote(spec["label"]))] + NEUTRAL_LABEL)
                        params = merge(params, spec["params"])
                lines.append((spec["section"], s, t, spec["value"], params, spec["raw"]))
                if spec["pair"]:
                    lines.append((spec["section"], t, s, spec["value"], params, spec["raw"]))
            caps.append((spec["id"], spec["caption"], c["caption"]))
        for a in ANCHORS:
            vertex(a["id"], "", a["x"], a["y"], "ellipse", ANCHOR_V, part=ANCHOR_PART)
        for sid, text, p in caps:
            vertex(f"cap-{sid}", text, p["x"], p["y"], "ellipse", CAPTION_V, part=CAPTION_PART)

        out_lines = [f"% THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT {GENERATOR}.",
                     f"% Pajek style specimen sheet {self.id}: {self.about}",
                     "% Vertex number -> setting id:"]
        out_lines += [f"%   {n} {name}" for n, name in names.items()]
        if self.project:
            out_lines.append(f"*Network {self.id}")
        out_lines.append(f"*Vertices {len(verts)}")
        for i, (name, label, x, y, shape, params, raw, z, _, _, _) in enumerate(verts, 1):
            row = f"{i} {quote(label)} {x / W:.6f} {y / H:.6f}" + (f" {z}" if z is not None else "")
            if raw is not None:
                row += (" " + raw) if raw else ""
            else:
                row += f" {shape}" if shape else ""
                row += "".join(f" {k} {v}" for k, v in params)
            out_lines.append(row)
        sections = []
        for ln in lines:
            if ln[0] not in sections:
                sections.append(ln[0])
        for sec in sections:
            out_lines.append(sec)
            if sec == "*Matrix":
                # one row per vertex, one column per vertex: a line s -> t is its value in row s, column t
                m = [["0"] * len(verts) for _ in verts]
                for _, s, t, value, _, _ in (ln for ln in lines if ln[0] == sec):
                    m[s - 1][t - 1] = value
                out_lines += [" ".join(r) for r in m]
                continue
            if sec.endswith("list"):
                by = {}
                for _, s, t, _, _, _ in (ln for ln in lines if ln[0] == sec):
                    by.setdefault(s, []).append(t)
                out_lines += [f"{s} " + " ".join(str(t) for t in ts) for s, ts in by.items()]
                continue
            for _, s, t, value, params, raw in (ln for ln in lines if ln[0] == sec):
                row = f"{s} {t} {value}"
                if raw is not None:
                    row += " " + raw
                else:
                    row += "".join(f" {k} {v}" for k, v in params)
                out_lines.append(row)
        if self.project:
            for kind, name, at in (("Partition", self.id, 8), ("Vector", self.id, 9), ("Vector", f"{self.id}-2", 10)):
                out_lines += ["", f"*{kind} {name}", f"*Vertices {len(verts)}"] + [str(v[at]) for v in verts]
        with open(os.path.join(out, f"{self.id}.{self.ext}"), "w", encoding="ascii", newline="") as f:
            # LF: the repository stores .net text with LF line ends (eol=lf), and Pajek reads them
            f.write("\n".join(out_lines) + "\n")
        return names


def slug(v):
    return re.sub(r"[^a-z0-9]+", "-", str(v).lower()).strip("-")


COLOR_NAMES = VOCAB["colors"]["names"]["values"]
SHEETS, PAGES = [], []


def page(sheet, ini=None, varies="Pajek's defaults", cov=(), base=False, variant=False, draw=None):
    """A page: the sheet file itself (no ini, or base: its first page), or the file under ini options, numbered
    after every sheet file of its category. draw: the arguments of Pajek's Draw command (`E 1 DRAW <draw>`, the
    partition and vector numbers first), "0 0 0 0 0" (Draw > Network) when None."""
    own = base or not (ini or variant)
    entry = {"id": sheet.id if own else None, "file": f"{sheet.id}.{sheet.ext}", "ini": ini or {}, "varies": varies}
    if draw:
        entry["draw"] = draw
    PAGES.append(entry)
    COVERED.update(cov)


def number_pages():
    taken = {p["id"] for p in PAGES if p["id"]}
    for p in PAGES:
        if p["id"] is None:
            cat = re.sub(r"-p\d+$", "", p["file"].rsplit(".", 1)[0])
            n = 2
            while f"{cat}-p{n}" in taken:
                n += 1
            p["id"] = f"{cat}-p{n}"
            taken.add(p["id"])


# ---------------------------------------------------------------- node shapes
s = Sheet("specimen-node-shapes", "every vertex shape, its rotation phi, its corner radius r and the diamond's q")
s.node("default", "default")
# Pajek draws man and woman about 2.5 x 6.5 times the size of the other shapes at the same x_fact / y_fact (an
# ellipse is 20 px across at x_fact 1, a man 50 x 130), so at the neutral size they would cover their neighbors:
# they are drawn at x_fact / y_fact 0.5, which the caption says.
FIGURE = [("x_fact", "0.5"), ("y_fact", "0.5")]
for sh in VOCAB["vertex"]["shape"]["values"]:
    big = sh in ("man", "woman")
    s.node(f"shape-{sh}", f"shape={sh}" + (" (0.5)" if big else ""), shape=sh, params=FIGURE if big else [],
           cov=[f"vertex.shape={sh}"])
for sh in ("box", "triangle", "house", "man"):
    for a in (30, 90):
        s.node(f"phi-{a}-{sh}", f"{sh} phi={a}", shape=sh, params=[("phi", str(a))] + (FIGURE if sh == "man" else []),
               cov=["vertex.phi=number"])
for r in (0.1, 0.3, 0.5):
    s.node(f"r-{slug(r)}-box", f"box r={r}", shape="box", params=[("r", num(r))], cov=["vertex.r=number"])
    s.node(f"r-{slug(r)}-diamond", f"diamond r={r}", shape="diamond", params=[("r", num(r))], cov=["vertex.r=number"])
for q in (0.01, 0.5, 1, 2):
    s.node(f"q-{slug(q)}-diamond", f"diamond q={q}", shape="diamond", params=[("q", num(q))], cov=["vertex.q=number"])
# phi on the shapes whose rotation only shows when they are not round: a wide ellipse, a diamond, a cross; and
# x_fact / y_fact on the shapes the sizes sheet leaves out
s.node("phi-30-ellipse-wide", "ellipse 3x1.2 phi=30", params=[("x_fact", "3"), ("y_fact", "1.2"), ("phi", "30")])
s.node("phi-30-diamond", "diamond phi=30", shape="diamond", params=[("phi", "30")])
s.node("diamond-x-fact-3", "diamond x_fact=3", shape="diamond", params=[("x_fact", "3"), ("y_fact", "1.5")])
s.node("house-y-fact-2-5", "house y_fact=2.5", shape="house", params=[("y_fact", "2.5")])
# how Pajek reads the shape keyword (ISSUES.md: capital letters, no keyword)
s.node("shape-box-capitalized", "shape=Box", shape="Box")
s.node("shape-triangle-capitalized", "shape=Triangle", shape="Triangle")
s.node("shape-omitted", "no shape keyword", shape=None)
SHEETS.append(s)
page(s)
page(s, {"Form10.effect3d": ""}, "SVG Vertices 3D Effect", cov=["ini.Form10.effect3d=on"])

# ---------------------------------------------------------------- fills and borders
for n, chunk in enumerate((COLOR_NAMES[:48], COLOR_NAMES[48:])):
    s = Sheet(f"specimen-node-fills-borders{'' if n == 0 else '-p2'}",
              f"interior colors ic, Pajek's named colors {n * 48 + 1}-{n * 48 + len(chunk)} of Figure 19")
    s.node("default", "default")
    for name in chunk:
        s.node(f"ic-{slug(name)}", f"ic={name}", params=[("ic", name)], cov=[f"color={name}", "vertex.ic=color"])
    SHEETS.append(s)
    page(s, varies="Pajek's defaults" if n == 0 else "named colors 49-96")
s = Sheet("specimen-node-fills-borders-p3", "color syntaxes, boundary colors bc and boundary widths bw")
s.node("default", "default")
FORMS = [("rgb-hex", "RGBFF8800", "RGBhex"), ("rgb-fractions", "RGB(1,0.5,0)", "RGB()"),
         ("cmyk-hex", "CMYK00FF8800", "CMYKhex"), ("cmyk-fractions", "CMYK(0,1,0.5,0)", "CMYK()")]
for fid, v, form in FORMS:
    s.node(f"ic-{fid}", f"ic={v}", params=[("ic", v)], cov=[f"colorform={form}"])
s.node("ic-lowercase-name", "ic=red", params=[("ic", "red")])
s.node("ic-unknown-name", "ic=Chartreuse", params=[("ic", "Chartreuse")])
s.node("ic-gray50", "ic=Gray50", params=[("ic", "Gray50")])
for name in ("Red", "Blue", "Black", "White", "ForestGreen"):
    s.node(f"bc-{slug(name)}", f"bc={name}", params=[("bc", name), ("bw", "3")], cov=["vertex.bc=color"])
for fid, v, _ in FORMS:
    s.node(f"bc-{fid}", f"bc={v}", params=[("bc", v), ("bw", "3")])
for bw in (0, 0.5, 2, 4, 8):
    s.node(f"bw-{slug(bw)}", f"bw={bw}", params=[("bw", num(bw))], cov=["vertex.bw=number"])
for sh in ("box", "diamond", "triangle", "house", "man", "woman", "cross"):
    s.node(f"bw-4-{sh}", f"{sh} bw=4", shape=sh,
           params=[("bw", "4"), ("bc", "Red")] + (FIGURE if sh in ("man", "woman") else []))
SHEETS.append(s)
page(s, varies="color syntaxes, bc and bw")

# ---------------------------------------------------------------- sizes and opacity
s = Sheet("specimen-node-sizes-opacity", "x_fact, y_fact and s_size; the Draw window's size and the SVG opacity")
s.node("default", "default")
for f in (0.5, 1, 2.5, 3.5):
    s.node(f"x-fact-{slug(f)}", f"x_fact={f}", params=[("x_fact", num(f))], cov=["vertex.x_fact=number"])
for f in (0.5, 1, 2.5, 3.5):
    s.node(f"y-fact-{slug(f)}", f"y_fact={f}", params=[("y_fact", num(f))], cov=["vertex.y_fact=number"])
s.node("x-fact-0", "x_fact=0 y_fact=0", params=[("x_fact", "0"), ("y_fact", "0")])
for f in (0.5, 2, 3):
    s.node(f"s-size-{slug(f)}", f"s_size={f}", params=[("s_size", num(f))], cov=["vertex.s_size=number"])
    s.node(f"s-size-{slug(f)}-box", f"box s_size={f}", shape="box", params=[("s_size", num(f))])
s.node("s-size-no-shape", "s_size=2 (no shape)", shape=None, raw="s_size 2 ic Red")
for z, zid in (("0", "0"), ("1", "1"), (None, "none")):
    s.node(f"z-{zid}", f"z={z if z is not None else '(none)'}", z=z, cov=[f"vertex.z={'none' if z is None else 'number'}"])
for f in (0.5, 2):
    s.node(f"box-x-fact-{slug(f)}", f"box x_fact={f}", shape="box", params=[("x_fact", num(f))])
    s.node(f"triangle-y-fact-{slug(f)}", f"triangle y_fact={f}", shape="triangle", params=[("y_fact", num(f))])
SHEETS.append(s)
page(s)
page(s, {"Form8.SizeofVertices": "16.0000000000"}, "Options / Size / of Vertices = 16",
     cov=["ini.Form8.SizeofVertices=number"])
page(s, {"TransparencyofVertices": "0.50"}, "SVG Opacity of Vertices = 0.5",
     cov=["ini.TransparencyofVertices=number"])

# ---------------------------------------------------------------- labels
s = Sheet("specimen-labels", "vertex label text, color lc, angle la, position lr / lphi, size fos and font")
s.node("default", "default", label="Ab")
s.node("label-word", "label=Ab", label="Ab", cov=["vertex.label=word"])
s.node("label-quoted", "label=Ab Cd (quoted)", label="Ab Cd", cov=["vertex.label=quoted"])
s.node("label-empty", "label=(empty)", label="", cov=["vertex.label=empty"])
s.node("label-ncr", "label=NCR", label="&#945;&#946;", cov=["vertex.label=ncr"])
s.node("label-long", "label=long", label="Abcdefghijklmnop")
for name in ("Red", "Blue", "RGB00A000", "CMYK(0,0,1,0.5)"):
    s.node(f"lc-{slug(name)}", f"lc={name}", label="Ab", params=[("lc", name)], cov=["vertex.lc=color"])
for a in (30, 90, 180, 270, 360, 400):
    s.node(f"la-{a}", f"la={a}", label="Ab", params=[("la", str(a))],
           cov=["vertex.la=360" if a >= 360 else "vertex.la=number"])
for r in (5, 10, 20, 40):
    s.node(f"lr-{r}", f"lr={r}", label="Ab", params=[("lr", str(r))], cov=["vertex.lr=number"])
s.node("lr-0", "lr=0", label="Ab", params=[("lr", "0")], cov=["vertex.lr=0"])
for a in range(0, 360, 45):
    s.node(f"lphi-{a}", f"lr=20 lphi={a}", label="Ab", params=[("lr", "20"), ("lphi", str(a))],
           cov=["vertex.lphi=number"])
for fs in (6, 8, 14, 20, 30):
    s.node(f"fos-{fs}", f"fos={fs}", label="Ab", params=[("fos", str(fs))], cov=["vertex.fos=number"])
for font in VOCAB["vertex"]["font"]["values"] + ["Helvetica-Oblique", "Courier-Bold"]:
    s.node(f"font-{slug(font)}", f"font={font}", label="Ab", params=[("font", font)],
           cov=[f"vertex.font={font}"])
SHEETS.append(s)
page(s)
page(s, {"Form8.MarkVerticesUsing": "2"}, "Options / Mark Vertices Using / Numbers",
     cov=["ini.Form8.MarkVerticesUsing=2"])
page(s, {"Form8.MarkVerticesUsing": "3"}, "Options / Mark Vertices Using / No Labels",
     cov=["ini.Form8.MarkVerticesUsing=3"])

# ---------------------------------------------------------------- edges and lines
s = Sheet("specimen-edges-lines", "line width w, color c, pattern p, negative values and the sections")
s.line("default", "default", cov=["line.section=*Edges"])
# right after the default line, which sets no p to carry: a negative value is dotted only when the line sets no p
s.line("value-negative", "value=-1", value="-1", params=[("p", None)],
       cov=["line.value=negative", "line.value=positive"])
for w in (0.5, 1, 3, 5, 8):
    s.line(f"w-{slug(w)}", f"w={w}", params=[("w", num(w))], cov=["line.w=number"])
for name in ("Red", "Blue", "ForestGreen", "Black", "MidnightBlue", "Orange"):
    s.line(f"c-{slug(name)}", f"c={name}", params=[("c", name)], cov=["line.c=color"])
for fid, v, _ in FORMS:
    s.line(f"c-{fid}", f"c={v}", params=[("c", v)])
s.line("c-lowercase-name", "c=red", params=[("c", "red")])
s.line("c-three-fractions", "c=0.7 0.2 0.2", raw="w 1.5 c 0.7 0.2 0.2 p Solid")
s.line("p-solid", "p=Solid", params=[("p", "Solid")], cov=["line.p=Solid"])
s.line("p-dots", "p=Dots", params=[("p", "Dots")], cov=["line.p=Dots"])
s.line("value-negative-solid", "value=-1 p=Solid", value="-1", params=[("p", "Solid")])
s.line("value-zero", "value=0", value="0")
s.line("value-large", "value=7", value="7")
s.line("arc", "arcs", section="*Arcs", cov=["line.section=*Arcs"])
s.line("arc-w-4", "arcs w=4", section="*Arcs", params=[("w", "4")])
s.line("relation-2", 'arcs relation 2', section='*Arcs :2 "r2"', cov=["line.section=relation"])
s.line("arcslist", "arcslist", section="*Arcslist", cov=["line.section=*Arcslist"])
s.line("edgeslist", "edgeslist", section="*Edgeslist", cov=["line.section=*Edgeslist"])
# a *Matrix section's lines are arcs, drawn with the arrows and the curved pair of any arc
s.line("matrix", "matrix", section="*Matrix", cov=["line.section=*Matrix"])
s.line("matrix-pair", "matrix both ways", section="*Matrix", pair=True)
s.line("p-dashed", "p=Dashed", params=[("p", "Dashed")])
s.line("p-dots-lowercase", "p=dots", params=[("p", "dots")])
s.line("w-0", "w=0", params=[("w", "0")])
SHEETS.append(s)
page(s)
page(s, {"TransparencyofLines": "0.50"}, "SVG Opacity of Lines = 0.5",
     cov=["ini.TransparencyofLines=number"])

s = Sheet("specimen-edges-lines-p2", "line routes (a1 k1 a2 k2), loops, bidirected arcs, parallel lines and hooks")
s.line("default", "default")
ROUTES = [("bezier-opposite", "a1=40 a2=-40", [("a1", "40"), ("k1", "1.5"), ("a2", "-40"), ("k2", "1.5")]),
          ("bezier-same", "a1=40 a2=40", [("a1", "40"), ("k1", "1.5"), ("a2", "40"), ("k2", "1.5")]),
          ("oval+", "k1=-1 k2=20", [("a1", "0"), ("k1", "-1"), ("a2", "0"), ("k2", "20")]),
          ("oval-", "k1=-1 k2=-20", [("a1", "0"), ("k1", "-1"), ("a2", "0"), ("k2", "-20")]),
          ("arc2+", "k1=-2 k2=50", [("a1", "0"), ("k1", "-2"), ("a2", "0"), ("k2", "50")]),
          ("arc2-", "k1=-2 k2=-50", [("a1", "0"), ("k1", "-2"), ("a2", "0"), ("k2", "-50")]),
          ("arc3+", "k1=-3 k2=50", [("a1", "0"), ("k1", "-3"), ("a2", "0"), ("k2", "50")]),
          ("arc3-", "k1=-3 k2=-50", [("a1", "0"), ("k1", "-3"), ("a2", "0"), ("k2", "-50")]),
          ("double", "k1=-4", [("a1", "0"), ("k1", "-4"), ("a2", "0"), ("k2", "1")]),
          ("straight", "k1=1 k2=1", [("a1", "0"), ("k1", "1"), ("a2", "0"), ("k2", "1")])]
for rid, cap, params in ROUTES:
    sid = "route-" + rid.replace("+", "-pos").replace("-", "-neg" if rid.endswith("-") else "-").rstrip("-")
    if rid.endswith("-"):
        sid = "route-" + rid[:-1] + "-neg"
    s.line(sid, cap, params=params, cov=[f"line.route={rid}", "line.a1=number"])
    s.line(sid + "-arc", f"arcs {cap}", section="*Arcs", params=params)
for k in (0.5, 3):
    s.line(f"bezier-k-{slug(k)}", f"bezier k={k}", params=[("a1", "40"), ("k1", str(k)), ("a2", "-40"),
                                                                ("k2", str(k))])
s.line("loop", "loop", loop=True, cov=["line.loop=loop"])
s.line("loop-arc", "arcs loop", section="*Arcs", loop=True)
s.line("loop-bezier", "bezier loop", loop=True,
       params=[("a1", "-130"), ("k1", "0.6"), ("a2", "-130"), ("k2", "0.6")])
s.line("bidirected", "arcs both ways", section="*Arcs", pair=True, cov=["line.bidirected=pair"])
s.line("parallel-edges", "two edges", pair=True)
s.line("h1-closest", "h1=-1 h2=-1", params=[("h1", "-1"), ("h2", "-1")], cov=["line.h1=-1", "line.h2=-1"])
s.line("h1-center", "h1=0 h2=0", params=[("h1", "0"), ("h2", "0")], cov=["line.h1=0", "line.h2=0"])
# user hooks: the HOOKS of the end vertices' shape in Pajek's shipped SHAPES.CFG (ellipse: CIRC 10 1, hook k at k
# degrees; box: CART, 400 points round its border; cross: POLAR, 1-4 at 90, 180, 270, 0 degrees)
s.line("h-ellipse-90-270", "ellipse h1=90 h2=270", params=[("h1", "90"), ("h2", "270")],
       cov=["line.h1=user", "line.h2=user"])
s.line("h-ellipse-1-1", "ellipse h1=1 h2=1", params=[("h1", "1"), ("h2", "1")])
s.line("h-box-1-100", "box h1=1 h2=100", params=[("h1", "1"), ("h2", "100")], ends="box")
s.line("h-cross-1-3", "cross h1=1 h2=3", params=[("h1", "1"), ("h2", "3")], ends="cross")
SHEETS.append(s)
page(s, varies="routes, loops, pairs and hooks")
page(s, {"Form10.StraightLinesOnly1": ""}, "Export Line Default / Straight Lines",
     cov=["ini.Form10.StraightLinesOnly1=on"])
page(s, {"Form10.ColorGradientLines": ""}, "SVG Lines Color as Gradient of EndVertices",
     cov=["ini.Form10.ColorGradientLines=on"])

# ---------------------------------------------------------------- arrows
s = Sheet("specimen-arrows", "arc arrows: type a, size s, position ap, color and width")
s.line("default", "default", section="*Arcs")
s.line("arrow-negative", "value=-1", section="*Arcs", value="-1", params=[("p", None)])
for a in ("A", "B"):
    s.line(f"a-{a.lower()}", f"a={a}", section="*Arcs", params=[("a", a)], cov=[f"line.a={a}"])
for sz in (0.5, 2, 3, 5):
    s.line(f"s-{slug(sz)}", f"s={sz}", section="*Arcs", params=[("s", num(sz))], cov=["line.s=number"])
    s.line(f"s-{slug(sz)}-b", f"a=B s={sz}", section="*Arcs", params=[("a", "B"), ("s", num(sz))])
for ap in (0.25, 0.5, 1):
    s.line(f"ap-{slug(ap)}", f"ap={ap}", section="*Arcs", params=[("ap", num(ap))], cov=["line.ap=fraction"])
s.line("ap-0", "ap=0", section="*Arcs", params=[("ap", "0")], cov=["line.ap=0"])
for ap in (10, 30):
    s.line(f"ap-{ap}", f"ap={ap}", section="*Arcs", params=[("ap", str(ap))], cov=["line.ap=absolute"])
s.line("arrow-color-red", "c=Red", section="*Arcs", params=[("c", "Red")])
s.line("arrow-w-4", "w=4", section="*Arcs", params=[("w", "4")])
s.line("arrow-bezier", "bezier arc", section="*Arcs",
       params=[("a1", "40"), ("k1", "1.5"), ("a2", "-40"), ("k2", "1.5")])
s.line("arrow-edge", "edges a=B s=3", params=[("a", "B"), ("s", "3")])
SHEETS.append(s)
page(s)
page(s, {"Form8.MarkVerticesUsing": "4"}, "Options / Mark Vertices Using / No Labels no Arrows",
     cov=["ini.Form8.MarkVerticesUsing=4"])
page(s, {"Form10.LinesFinishedatBorder": ""}, "Lines finished at Vertex Border",
     cov=["ini.Form10.LinesFinishedatBorder=on"])

# ---------------------------------------------------------------- edge labels
s = Sheet("specimen-edge-labels", "line labels l: position lp, lr / lphi, color lc, angle la, size fos and font")
s.line("default", "default", label="Ab")
s.line("l-word", "l=Ab", label="Ab", cov=["line.l=text"])
s.line("l-quoted", "l=Ab Cd", label="Ab Cd")
for lp in (0.2, 0.8):
    s.line(f"lp-{slug(lp)}", f"lp={lp}", label="Ab", params=[("lp", num(lp))], cov=["line.lp=fraction"])
s.line("lp-20", "lp=20", label="Ab", params=[("lp", "20")], cov=["line.lp=absolute"])
for r in (8, 16):
    s.line(f"lr-{r}", f"lr={r}", label="Ab", params=[("lr", str(r))], cov=["line.lr=number"])
for a in (0, 90, 180, 270):
    s.line(f"lphi-{a}", f"lr=12 lphi={a}", label="Ab", params=[("lr", "12"), ("lphi", str(a))],
           cov=["line.lphi=number"])
for name in ("Red", "Blue", "RGB00A000"):
    s.line(f"lc-{slug(name)}", f"lc={name}", label="Ab", params=[("lc", name)], cov=["line.lc=color"])
for a in (45, 90, 360, 405):
    s.line(f"la-{a}", f"la={a}", label="Ab", params=[("la", str(a))],
           cov=["line.la=360" if a >= 360 else "line.la=number"])
for fs in (6, 14, 20):
    s.line(f"fos-{fs}", f"fos={fs}", label="Ab", params=[("fos", str(fs))], cov=["line.fos=number"])
for font in VOCAB["line"]["font"]["values"]:
    s.line(f"font-{slug(font)}", f"font={font}", label="Ab", params=[("font", font)], cov=[f"line.font={font}"])
s.line("on-arc", "arcs l=Ab", section="*Arcs", label="Ab")
s.line("on-bezier", "bezier l=Ab", label="Ab",
       params=[("a1", "40"), ("k1", "1.5"), ("a2", "-40"), ("k2", "1.5")])
s.line("on-loop", "loop l=Ab", label="Ab", loop=True)
s.line("value-only", "value=7, no l", value="7")
SHEETS.append(s)
page(s, {"Form8.withLabels1": ""}, "Options / Lines / Mark Lines / with Labels", base=True, cov=["ini.Form8.withLabels1=on"])
page(s, {}, "Pajek's default: Mark Lines / No", variant=True)

# ---------------------------------------------------------------- mappings: a project file's partition and vector
s = Sheet("specimen-mappings-bypass", "a project file's *Partition (cluster -> color, Figure 20) and two *Vector "
          "objects (size; width and height), drawn by Draw > Network + First Partition + First Vector (+ Second "
          "Vector); a partition color over the vertex's own ic",
          project=True)
s.node("default", "default")
for k in range(40):
    s.node(f"part-{k}", f"partition={k}", part=str(k), cov=["project.partition=number"])
for k, kid in (("40", "40"), ("45", "45"), ("100", "100"), ("-2", "neg-2")):
    s.node(f"part-{kid}", f"partition={k}", part=k)
s.node("part-3-over-ic", "partition=3 ic=Black", params=[("ic", "Black")], part="3",
       cov=["project.partitionOverIc=on"])
for v, vid in (("0.5", "0-5"), ("2", "2"), ("4", "4"), ("9", "9"), ("0", "0"), ("-1", "neg-1")):
    s.node(f"vec-{vid}", f"vector={v}", vec=v, cov=["project.vector=number"])
s.node("vec-4-box", "box vector=4", shape="box", vec="4")
s.node("vec-4-x-fact-3", "x_fact=3 vector=4", params=[("x_fact", "3")], vec="4")
# The second vector: Draw > ... + First Vector + Second Vector sizes a vertex's width by the first vector and its
# height by the second, each value a plain factor (one vector alone scales by its square root). Every other vertex's
# second value is NEUTRAL_VEC, so on the one-vector pages these specimens are neutral vertices.
for v, vid in (("0.5", "0-5"), ("2", "2"), ("3", "3")):
    s.node(f"vec2-{vid}", f"vector2={v}", vec2=v, cov=["project.vector2=number"])
s.node("vec-2-vec2-3", "vector=2 vector2=3", vec="2", vec2="3")
SHEETS.append(s)
page(s, varies="Draw > Network + First Partition + First Vector", draw="1 1 0 0 0")
page(s, varies="Draw > Network (no partition, no vector)", variant=True)
page(s, varies="Draw > Network + First Partition + First Vector + Second Vector", variant=True, draw="1 1 2 0 0")

# ---------------------------------------------------------------- coverage
NOT_SWEPT = {
    "vertex.HOOKS=CART": "hooks are defined per shape in SHAPES.CFG, not in the .net file; the edges-lines-p2 sheet "
                         "reaches the shipped SHAPES.CFG's hooks (box CART, ellipse CIRC, cross POLAR) through h1 / h2",
    "vertex.HOOKS=POLAR": "as CART",
    "vertex.HOOKS=CIRC": "as CART",
    "ini.Form8.SizeofVertexBorder=number": "Options / Size / of Vertex Border changes only the Draw window: the SVG "
                                           "export of a sheet drawn with it at 3 is byte for byte the default one",
    "ini.CenterLabels=on": "Labels Centered changes only the Draw window: the labels sheet's SVG export with it is "
                           "byte for byte the default one",
    "ini.LabelswithTransparentBackGround1=on": "changes only the Draw window: the labels sheet's SVG export with it is "
                                               "byte for byte the default one (the SVG never draws a label background)",
    "ini.Form8.SizeofFont=number": "changes only the Draw window: the labels sheet's SVG export at 16 is byte for byte "
                                   "the default one",
    "ini.Form8.SizeofLines=number": "changes only the Draw window: the edges-lines sheet's SVG export at 3 is byte for "
                                    "byte the default one",
    "ini.Arrowsinthemiddle1=on": "changes only the Draw window: the arrows sheet's SVG export with it is byte for byte "
                                 "the default one (an arc's own ap moves its arrow)",
    "ini.Form8.SizeofArrows=number": "changes only the Draw window: the arrows sheet's SVG export at 14 is byte for byte "
                                     "the default one",
    "ini.Form8.withValues1=on": "not reached: with Form8.withValues1 in the ini (the flag as SAVEINI names it) the "
                                "edge-labels sheet's SVG export draws no line values, byte for byte the default one; "
                                "the option may need the Draw window's menu, which the headless route cannot click",
}


def expected():
    out = set()
    for group in ("vertex", "line", "project"):
        for k, d in VOCAB[group].items():
            for v in d["values"]:
                if v == "color":
                    continue
                out.add(f"{group}.{k}={v}")
    out |= {f"color={c}" for c in COLOR_NAMES}
    out |= {f"colorform={f}" for f in VOCAB["colors"]["forms"]["values"]}
    out |= {f"ini.{k}={v}" for k, d in VOCAB["ini"].items() for v in d["values"] if not (k.endswith("Using") and v == "1")}
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    names = {s.id: s.write(OUT) for s in SHEETS}
    number_pages()
    cov = {c for c in COVERED if not c.endswith("=color")}
    missing = sorted(expected() - cov - set(NOT_SWEPT))
    if missing:
        raise SystemExit(f"pajek.py: not on any sheet and not in NOT_SWEPT: {missing}")
    pages = []
    for p in PAGES:
        sheet = p["file"].rsplit(".", 1)[0]
        pages.append({**p, "specimens": len(next(s for s in SHEETS if s.id == sheet).specimens), "names": names[sheet]})
    doc = {"about": "The Pajek specimen pages: each sheet file drawn by Pajek 6.02 under its defaults with the Draw window "
                    "1200 x 900, plus the ini options a page names (a flag option is written as its name alone). names: "
                    "vertex number -> setting id. Written by " + GENERATOR + ".",
           "vocabularyValues": len(expected()), "notSwept": NOT_SWEPT, "pages": pages}
    with open(os.path.join(OUT, "pages.json"), "w", encoding="ascii") as f:
        json.dump(doc, f, indent=4)
        f.write("\n")
    total = sum(len(s.specimens) for s in SHEETS)
    print(f"pajek.py: {len(SHEETS)} sheet files, {len(PAGES)} pages, {total} specimens, "
          f"{len(expected() - set(NOT_SWEPT))}/{len(expected())} vocabulary values swept")


main()
