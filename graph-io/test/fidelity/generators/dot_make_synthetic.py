#!/usr/bin/env python3
"""Writes the two synthetic DOT coverage files (seeded, deterministic).

  synth-nodes.gv          every node shape, node style, color syntax, label/font feature; splines=ortho, LR, bgcolor
  synth-edges-clusters.gv every arrow type and modifier, edge style/color/label/port feature, nested
                          clusters with every cluster style, rank constraints, compound edges; splines=polyline

Spec: https://graphviz.org/doc/info/attrs.html, https://graphviz.org/doc/info/shapes.html,
https://graphviz.org/doc/info/arrows.html, https://graphviz.org/doc/info/colors.html,
https://graphviz.org/docs/attr-types/style/
"""
import os
import random
import struct
import sys
import zlib

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
rnd = random.Random(7)

SHAPES = """box polygon ellipse oval circle point egg triangle plaintext plain diamond trapezium parallelogram
house pentagon hexagon septagon octagon doublecircle doubleoctagon tripleoctagon invtriangle invtrapezium invhouse
Mdiamond Msquare Mcircle rect rectangle square star none underline cylinder note tab folder box3d component promoter
cds terminator utr primersite restrictionsite fivepoverhang threepoverhang noverhang assembly signature insulator
ribosite rnastab proteasesite proteinstab rpromoter rarrow larrow lpromoter record Mrecord""".split()

PALETTE = ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf", "#999999",
           "lightblue", "palegreen", "gold", "salmon", "orchid", "khaki", "turquoise"]


def q(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def png(path, rgb):
    """A 16x16 solid PNG, for the image= node."""
    raw = b"".join(b"\x00" + bytes(rgb) * 16 for _ in range(16))
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 16, 16, 8, 2, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


# ---------------------------------------------------------------- synth-nodes.gv
L = ['digraph synth_nodes {',
     '  graph [rankdir=LR, splines=ortho, bgcolor="#f8f4e8", label="Synthetic node coverage", labelloc=t,',
     '         fontsize=28, fontcolor="#333366", fontname="Helvetica", nodesep=0.25, ranksep=0.6];',
     '  node [style=filled, fillcolor="#ffffff", fontname="Helvetica", fontsize=12];',
     '  edge [color="#888888", arrowsize=0.6];']
ids = []
# 1. every shape, filled with a palette color, label = shape name
for i, s in enumerate(SHAPES):
    nid = f"s_{s}"
    ids.append(nid)
    extra = ""
    if s in ("record", "Mrecord"):
        extra = ', label="{<f0> left|<f1> mid\\nline|<f2> right}"'
    elif s == "point":
        extra = ", width=0.2"
    elif s in ("plaintext", "plain", "none", "underline"):
        extra = ""
    L.append(f'  {nid} [shape={s}, fillcolor="{PALETTE[i % len(PALETTE)]}", label="{s}"{extra}];')
# 2. node styles
STYLES = [("dashed", 'style="dashed", fillcolor=none, color=blue, penwidth=2'),
          ("dotted", 'style="dotted", color="#cc0000", penwidth=2'),
          ("bold", 'style="bold,filled", fillcolor=lightyellow'),
          ("rounded", 'shape=box, style="rounded,filled", fillcolor=lightcyan'),
          ("diagonals", 'shape=box, style="diagonals,filled", fillcolor=wheat'),
          ("striped", 'shape=box, style=striped, fillcolor="red:green:blue"'),
          ("wedged", 'shape=ellipse, style=wedged, fillcolor="red;0.3:yellow;0.3:blue"'),
          ("radial", 'style=radial, fillcolor="white:darkorange"'),
          ("lingrad", 'shape=box, fillcolor="yellow:purple", gradientangle=90'),
          ("lingrad2", 'shape=box, fillcolor="#00ff00:#0000ff", gradientangle=315'),
          ("invis", 'style=invis'),
          ("unfilled", 'style="", color=darkgreen'),
          ("pen0", 'penwidth=0, fillcolor=pink'),
          ("pen5", 'penwidth=5, color="#2222aa", fillcolor=white'),
          ("periph2", 'shape=circle, peripheries=2, fillcolor=lightgrey'),
          ("periph3", 'shape=box, peripheries=3, color=purple, fillcolor=white'),
          ("periph0", 'shape=box, peripheries=0, fillcolor=lightsalmon'),
          ("alpha", 'fillcolor="#0000ff40", color="#ff000080"'),
          ("hsv", 'fillcolor="0.650 0.700 0.700", fontcolor=white'),
          ("hsv2", 'fillcolor="0.1,0.9,0.9"'),
          ("brewer", 'colorscheme=blues9, fillcolor=7, color=9, fontcolor=1'),
          ("brewer2", 'fillcolor="/accent8/3"'),
          ("x11", 'fillcolor=crimson, fontcolor=white, color=navy'),
          ("svgname", 'colorscheme=svg, fillcolor=mediumvioletred, fontcolor=white'),
          ("fixed", 'shape=box, fixedsize=true, width=2.5, height=0.3, label="fixedsize 2.5 x 0.3 long label clipped"'),
          ("big", 'width=2, height=1.5, fillcolor=lightblue'),
          ("tiny", 'width=0.1, height=0.1, fontsize=6, label="t"'),
          ("regular", 'shape=hexagon, regular=true, fillcolor=gold'),
          ("sides7", 'shape=polygon, sides=7, skew=0.4, distortion=0.3, orientation=20, fillcolor=thistle'),
          ("font8", 'fontsize=8'),
          ("font36", 'fontsize=36, fontcolor="#aa0000"'),
          ("fontserif", 'fontname="Times-Bold", fontsize=16'),
          ("fontmono", 'fontname="Courier", fontcolor=blue'),
          ("ltop", 'shape=box, height=1, labelloc=t, label="label top"'),
          ("lbot", 'shape=box, height=1, labelloc=b, label="label bottom"'),
          ("ljust", 'shape=box, width=2.5, label="left line\\lright line\\rcenter"'),
          ("xlabel", 'xlabel="outside xlabel", label="has xlabel"'),
          ("escN", 'label="\\N in \\G"'),
          ("multi", 'label="line one\\nline two\\nline three"'),
          ("empty", 'label=""'),
          ("image", 'shape=box, image="icon.png", label="image", imagescale=true, labelloc=b'),
          ("tooltip", 'tooltip="a tooltip", URL="https://graphviz.org", label="URL+tooltip"'),
          ("html1", 'shape=none, fillcolor=none, label=<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" BGCOLOR="lightyellow"><TR><TD BGCOLOR="#4477aa"><FONT COLOR="white"><B>Header</B></FONT></TD></TR><TR><TD PORT="p1" ALIGN="LEFT">row <I>one</I></TD></TR><TR><TD>row two</TD></TR></TABLE>>'),
          ("html2", 'shape=box, label=<<FONT POINT-SIZE="20" COLOR="red">big red</FONT><BR/><FONT FACE="Courier">mono</FONT> <U>u</U> <S>s</S> x<SUP>2</SUP>>'),
          ("html3", 'shape=plaintext, label=<<TABLE BORDER="2" COLOR="darkgreen" STYLE="rounded" BGCOLOR="#ddffdd:#88cc88" GRADIENTANGLE="90"><TR><TD>A</TD><TD BGCOLOR="pink">B</TD></TR><TR><TD COLSPAN="2">wide</TD></TR></TABLE>>'),
          ]
for name, attrs in STYLES:
    ids.append(f"n_{name}")
    lab = "" if "label=" in attrs else f', label="{name}"'
    L.append(f"  n_{name} [{attrs}{lab}];")
# chain everything in rows of 12 so ortho has something to route; a few cross links
for r in range(0, len(ids), 8):
    row = ids[r:r + 8]
    L.append("  " + " -> ".join(row) + ";")
for _ in range(15):
    a, b = rnd.sample(ids, 2)
    L.append(f"  {a} -> {b} [constraint=false];")
L.append('  s_record:f0 -> s_Mrecord:f2;')
L.append('  n_html1:p1 -> n_html2;')
L.append("}")
open(os.path.join(out, "synth-nodes.gv"), "w").write("\n".join(L) + "\n")
png(os.path.join(out, "icon.png"), (30, 120, 220))

# ---------------------------------------------------------------- synth-edges-clusters.gv
ARROWS = """normal inv dot invdot odot invodot none tee empty invempty diamond odiamond ediamond crow box obox open
halfopen vee curve icurve lnormal rnormal onormal olnormal ornormal lteeoldiamond normalnormal dotodot invnormal
lbox rcrow ltee oinv""".split()
E = ['digraph synth_edges {',
     '  graph [compound=true, splines=polyline, fontname="Helvetica", label="Synthetic edge and cluster coverage",',
     '         labelloc=b, labeljust=r, fontsize=20, newrank=true];',
     '  node [shape=box, style="filled,rounded", fillcolor="#eef2ff", fontname="Helvetica", fontsize=11];',
     '  edge [fontname="Helvetica", fontsize=9];']
# clusters: every cluster style
CL = [("plain", 'label="plain cluster"'),
      ("filled", 'style=filled, fillcolor="#ffeecc", color="#cc8800", label="filled"'),
      ("rounded", 'style="rounded,filled", fillcolor=lightcyan, pencolor=teal, penwidth=3, label="rounded, pen 3", labeljust=l'),
      ("dashed", 'style=dashed, color=red, label="dashed", labeljust=r, fontcolor=red'),
      ("grad", 'style=filled, fillcolor="yellow:skyblue", gradientangle=90, label="gradient", labelloc=b'),
      ("radial", 'style=radial, fillcolor="white:lightpink", label="radial"'),
      ("striped", 'style=striped, fillcolor="#ffdddd:#ddffdd:#ddddff", label="striped"'),
      ("bg", 'bgcolor="#e8e8e8", pencolor=none, label="bgcolor, no pen"'),
      ("periph0", 'peripheries=0, style=filled, fillcolor="#f0fff0", label="peripheries 0"'),
      ("alpha", 'style=filled, fillcolor="#0000ff22", color="#0000ff88", label="alpha fill", fontsize=18, fontname="Times-Italic"'),
      ]
nodes_in = {}
k = 0
for ci, (name, attrs) in enumerate(CL):
    E.append(f"  subgraph cluster_{name} {{ {attrs.replace(', ', '; ')};")
    members = []
    for j in range(5):
        nid = f"c{ci}_{j}"
        members.append(nid)
        E.append(f"    {nid};")
    if name == "rounded":  # nested cluster two levels deep
        E.append('    subgraph cluster_inner { style=filled; fillcolor=white; color=blue; label="nested";')
        for j in range(3):
            E.append(f"      inner_{j} [fillcolor=lightblue];")
        E.append('      subgraph cluster_inner2 { style="dotted"; label="nested twice"; inner2_0; inner2_1; }')
        E.append("    }")
    E.append("  }")
    nodes_in[name] = members
free = [f"f{i}" for i in range(12)]
for f in free:
    E.append(f'  {f} [fillcolor="{rnd.choice(PALETTE)}"];')
E.append('  rec [shape=record, style=filled, fillcolor=white, label="<a> port a|<b> port b|<c> port c"];')
E.append("  { rank=same; f0; f1; f2; }")
E.append("  { rank=min; f3; }")
E.append("  { rank=max; f4; }")
E.append("  { rank=source; f5; }")
E.append("  { rank=sink; f6; }")
pool = [m for ms in nodes_in.values() for m in ms] + free
def pair():
    return rnd.sample(pool, 2)
# every arrow shape as head, some as tail with dir=both
for i, a in enumerate(ARROWS):
    s, t = pair()
    E.append(f'  {s} -> {t} [arrowhead={a}, label="{a}", color="{PALETTE[i % 9]}"];')
for i, a in enumerate(["dot", "odiamond", "crow", "inv", "tee", "box"]):
    s, t = pair()
    E.append(f'  {s} -> {t} [dir=both, arrowtail={a}, arrowhead=normal, taillabel="{a}", labelfontcolor=blue];')
for s, t in [pair(), pair()]:
    E.append(f"  {s} -> {t} [dir=back];")
for s, t in [pair(), pair()]:
    E.append(f"  {s} -> {t} [dir=none, color=gray40];")
# sizes, widths, styles
for v in (0.4, 1.0, 1.6, 2.5):
    s, t = pair()
    E.append(f'  {s} -> {t} [arrowsize={v}, xlabel="arrowsize {v}"];')
for v in (0.5, 1, 2, 4, 7):
    s, t = pair()
    E.append(f"  {s} -> {t} [penwidth={v}];")
for st in ("dashed", "dotted", "bold", "solid", "invis"):
    s, t = pair()
    E.append(f'  {s} -> {t} [style={st}, label="{st}"];')
s, t = pair()
E.append(f'  {s} -> {t} [style=tapered, penwidth=7, arrowhead=none, color=darkorange];')
# colors
for c in ('"#ff000080"', '"red:green:blue"', '"red;0.3:blue"', '"/dark28/4"', "steelblue", '"0.3 0.9 0.7"'):
    s, t = pair()
    E.append(f"  {s} -> {t} [color={c}, penwidth=2];")
# labels
s, t = pair()
E.append(f'  {s} -> {t} [label="decorated", decorate=true, fontcolor=purple, fontsize=14];')
s, t = pair()
E.append(f'  {s} -> {t} [headlabel="head", taillabel="tail", labelangle=45, labeldistance=2, labelfontsize=12, labelfontcolor=darkgreen];')
s, t = pair()
E.append(f'  {s} -> {t} [label=<<B>html</B> <FONT COLOR="red">edge</FONT>>];')
# ports
E.append("  rec:a -> f7 [tailport=e];")
E.append("  f8 -> rec:c:w;")
E.append("  f9:n -> f10:s [color=brown];")
# compound edges to and from clusters
E.append("  f11 -> c1_0 [lhead=cluster_filled, color=blue, label=lhead];")
E.append("  c3_1 -> f11 [ltail=cluster_dashed, color=red, label=ltail];")
E.append("  c2_0 -> inner_1 [lhead=cluster_inner];")
# multi-edges, self loops, constraint, minlen, weight
for _ in range(3):
    E.append('  f0 -> f1 [color="#555555"];')
E.append('  f2 -> f2 [label="self loop"];')
E.append('  f3 -> f3 [color=red];')
E.append('  f4 -> f5 [constraint=false, style=dashed];')
E.append('  f6 -> f7 [minlen=3, weight=5];')
E.append('  inner2_0 -> inner2_1 [arrowhead=diamond];')
# fill the clusters with a few internal edges
for ms in nodes_in.values():
    E.append(f"  {ms[0]} -> {ms[1]}; {ms[1]} -> {ms[2]};")
E.append("}")
open(os.path.join(out, "synth-edges-clusters.src.gv"), "w").write("\n".join(E) + "\n")
print("ok", len(ids), "node-file nodes")
