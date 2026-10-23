#!/usr/bin/env python3
"""gen_gexf.py <out dir>: the two synthetic GEXF coverage files, seeded.

A: synth-nx-viz.gexf, written by networkx's GEXF writer (GEXF 1.2draft) from a MultiDiGraph: 96 nodes
   in 4 clusters, every node shape but image, fill alpha 1 / .75 / .5 / .25, sizes 3..30, stored
   positions (some with z), edges with thickness, every edge shape, colors with alpha, labels,
   weights without thickness, self-loops, parallel edges, and elements with no viz values at all.
B: synth-gexf13-hierarchy.gexf, written by hand to the GEXF 1.3 schema: hex colors, an undirected
   default with directed and mutual edges, a node hierarchy (nested <nodes> and pid), image shapes
   with a data: URI, edge kinds, edge labels, nodes with no color.
"""
import math
import os
import random
import sys

import networkx as nx  # noqa: E402

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
rnd = random.Random(20261016)
PALETTE = [(228, 26, 28), (55, 126, 184), (77, 175, 74), (152, 78, 163)]
SHAPES = ["disc", "square", "triangle", "diamond"]
ESHAPES = ["solid", "dotted", "dashed", "double"]

# ---------------------------------------------------------------- A
G = nx.MultiDiGraph()
centers = [(-300, 200), (300, 200), (-300, -200), (300, -200)]
for i in range(96):
    c = i % 4
    k = i // 4
    ang = 2 * math.pi * k / 24
    rad = 60 + 90 * (k % 3)
    x, y = centers[c][0] + rad * math.cos(ang), centers[c][1] + rad * math.sin(ang)
    viz = {"position": {"x": round(x, 2), "y": round(y, 2), "z": 0.0 if i % 10 else 5.0}}
    if i % 16 != 7:  # 6 nodes have no viz:color
        r, g, b = PALETTE[c]
        viz["color"] = {"r": r, "g": g, "b": b, "a": [1.0, 0.75, 0.5, 0.25][k % 4]}
    if i % 24 != 5:  # 4 nodes have no viz:size
        viz["size"] = float(3 + (i * 7) % 28)
    viz["shape"] = SHAPES[(i // 4 + c) % 4]
    attrs = {"viz": viz, "cluster": c}
    if i % 24 != 11:  # 4 nodes have no label
        attrs["label"] = f"n{i} {SHAPES[(i // 4 + c) % 4]}"
    G.add_node(f"v{i}", **attrs)
eid = 0
for i in range(96):
    for j in (i + 4, i + 8):  # ring edges inside each cluster
        if j < 96:
            e = {"id": f"e{eid}"}
            mode = eid % 6
            if mode != 5:  # every sixth edge has no viz at all
                r, g, b = PALETTE[(eid // 3) % 4]
                v = {"shape": ESHAPES[eid % 4]}
                if mode in (0, 1, 2):
                    v["color"] = {"r": r, "g": g, "b": b, "a": [1.0, 0.6, 0.3][mode]}
                if mode in (0, 1, 3):
                    v["thickness"] = float(1 + eid % 8)
                e["viz"] = v
            if mode == 4:
                e["weight"] = float(1 + eid % 5)
            if eid % 7 == 0:
                e["label"] = f"edge {eid}"
            G.add_edge(f"v{i}", f"v{j}", **e)
            eid += 1
for i in range(0, 96, 12):  # cross-cluster edges
    G.add_edge(f"v{i}", f"v{(i + 13) % 96}", id=f"e{eid}", label=f"cross {eid}",
               viz={"color": {"r": 30, "g": 30, "b": 30, "a": 0.8}, "thickness": 3.0, "shape": "dashed"})
    eid += 1
for i in (1, 2):  # self-loops
    G.add_edge(f"v{i}", f"v{i}", id=f"e{eid}", viz={"color": {"r": 0, "g": 0, "b": 0, "a": 1.0}, "thickness": 2.0})
    eid += 1
for _ in range(3):  # parallel edges v40 -> v44
    G.add_edge("v40", "v44", id=f"e{eid}", viz={"color": {"r": 255, "g": 127, "b": 0, "a": 1.0}, "thickness": 2.0})
    eid += 1
nx.write_gexf(G, os.path.join(out, "synth-nx-viz.gexf"), version="1.2draft")

# ---------------------------------------------------------------- B
L = []
w = L.append
w('<?xml version="1.0" encoding="UTF-8"?>')
w('<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" '
  'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
  'xsi:schemaLocation="http://gexf.net/1.3 http://gexf.net/1.3/gexf.xsd" version="1.3">')
w('  <meta lastmodifieddate="2026-10-16"><creator>graphty file-styles-corpus gen_gexf.py</creator>'
  '<description>GEXF 1.3 coverage: hierarchy, hex colors, mutual edges, images</description></meta>')
w('  <graph mode="static" defaultedgetype="undirected">')
w('    <nodes>')
IMG = ("data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMCAxMCc+"
       "PGNpcmNsZSBjeD0nNScgY3k9JzUnIHI9JzUnIGZpbGw9JyNmZjk5MDAnLz48L3N2Zz4=")
HEX = ["#1b9e77", "#d95f02", "#7570b3", "#e7298a"]
ids = []


def node_xml(nid, label, x, y, size, ind, hexc=None, alpha=None, shape=None, uri=None, pid=None):
    a = f' a="{alpha}"' if alpha is not None else ""
    p = f' pid="{pid}"' if pid else ""
    s = [f'{ind}<node id="{nid}" label="{label}"{p}>']
    if hexc:
        s.append(f'{ind}  <viz:color hex="{hexc}"{a}/>')
    s.append(f'{ind}  <viz:position x="{x:.2f}" y="{y:.2f}" z="0.0"/>')
    s.append(f'{ind}  <viz:size value="{size}"/>')
    if shape:
        s.append(f'{ind}  <viz:shape value="{shape}"' + (f' uri="{uri}"' if uri else "") + "/>")
    return s


for g in range(4):  # 4 groups with nested children
    gx, gy = [(-250, 180), (250, 180), (-250, -180), (250, -180)][g]
    head = node_xml(f"g{g}", f"Group {g}", gx, gy, 40, "      ", HEX[g], 0.3, "square")
    L.extend(head[:-0] if False else head)
    w('        <nodes>')
    for k in range(12):
        ang = 2 * math.pi * k / 12
        nid = f"g{g}c{k}"
        ids.append(nid)
        shape = ["disc", "square", "triangle", "diamond"][k % 4]
        uri = None
        if g == 0 and k in (0, 6):
            shape, uri = "image", IMG
        hexc = None if k == 11 else (HEX[(g + k) % 4] if k % 3 else HEX[g].upper()[:4] if False else HEX[g])
        L.extend(node_xml(nid, f"{shape} {g}.{k}", gx + 110 * math.cos(ang), gy + 110 * math.sin(ang), 6 + k,
                          "          ", hexc, None if k % 2 else 0.6, shape, uri))
        w('          </node>')
    w('        </nodes>')
    w('      </node>')
for k in range(8):  # pid children of g3 declared at the top level
    nid = f"p{k}"
    ids.append(nid)
    L.extend(node_xml(nid, f"pid child {k}", 0 + 30 * k - 105, 0, 8, "      ", "#666666", None, "disc", None, "g3"))
    w('      </node>')
w('    </nodes>')
w('    <edges>')
eid = 0
for i, a in enumerate(ids):
    b = ids[(i + 1) % len(ids)]
    kind = ["", ' type="directed"', ' type="mutual"', ""][i % 4]
    lab = f' label="L{eid}"' if i % 5 == 0 else ""
    wt = f' weight="{1 + i % 4}"'
    w(f'      <edge id="x{eid}" source="{a}" target="{b}"{kind}{lab}{wt}>')
    if i % 3:
        w(f'        <viz:color hex="{HEX[i % 4]}"' + (' a="0.5"' if i % 6 == 1 else "") + "/>")
    if i % 4 == 1:
        w(f'        <viz:thickness value="{1 + i % 6}"/>')
    if i % 7 in (1, 2, 3):
        w(f'        <viz:shape value="{["dotted", "dashed", "double"][i % 7 - 1]}"/>')
    w('      </edge>')
    eid += 1
for k in range(3):  # edge kinds between the same pair
    w(f'      <edge id="x{eid}" source="g1c0" target="g1c6" kind="{["friend", "work", "family"][k]}" label="{["friend", "work", "family"][k]}"/>')
    eid += 1
w('    </edges>')
w('  </graph>')
w('</gexf>')
open(os.path.join(out, "synth-gexf13-hierarchy.gexf"), "w").write("\n".join(L) + "\n")
print("wrote", out)
