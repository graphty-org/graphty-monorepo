#!/usr/bin/env python3
"""Reference scene from a GEXF file's own viz values (route "gexf-file"): an independent reading of
the viz module with ElementTree, nothing filled in beyond what the GEXF spec and Gephi's documented
defaults say. It judges what Gephi's preview cannot (Gephi draws every node a circle, ignores alpha,
edge shapes and edge labels): node shape, fill alpha, edge color, alpha, thickness, edge shape,
edge labels, arrows, and hierarchy groups.

    python3 gexf_file.py <file.gexf[.gz]> | node common.mjs finish <out.json>

Spec: https://gexf.net/schema.html, viz module https://gexf.net/1.3/viz.xsd (1.2draft: /1.2draft/viz.xsd).
Geometry follows Gephi so the comparer's fitted scale lines up with the gephi-noscale route: y is
flipped (GEXF y grows up), a node is drawn GEPHI_DIAMETER * viz:size wide (measured from Gephi
0.11.3's preview on gexfjs-miserables: 39.323 / 21.37143), an edge is viz:thickness wide, else its
weight (Gephi's default), else 1.
"""

import gzip
import hashlib
import json
import re
import sys
import datetime
import xml.etree.ElementTree as ET

GEPHI_DIAMETER = 1.84
SHAPES = {"disc": "ellipse", "square": "rect", "triangle": "triangle", "diamond": "diamond", "image": "image"}
EDGE_SHAPES = {"solid": "solid", "dotted": "dotted", "dashed": "dashed", "double": "other"}


def local(tag):
    return tag.rsplit("}", 1)[-1]


def child(el, name):
    for c in el:
        if local(c.tag) == name:
            return c
    return None


def viz(el, name):
    """The viz:<name> child of a node or edge (any namespace whose URI mentions viz)."""
    for c in el:
        if local(c.tag) == name and ("viz" in c.tag or c.tag.startswith("{")):
            return c
    return None


def color(el):
    """(#rrggbb, alpha) of a viz:color, or (None, 1)."""
    if el is None:
        return None, 1.0
    a = float(el.get("a", 1))
    hx = el.get("hex")
    if hx:
        h = hx.strip().lstrip("#").lower()
        if len(h) in (3, 4):
            h = "".join(c + c for c in h)
        if len(h) == 8:
            a, h = int(h[6:], 16) / 255, h[:6]
        return "#" + h[:6], a
    try:
        r, g, b = (max(0, min(255, int(round(float(el.get(k, 0)))))) for k in "rgb")
    except ValueError:
        return None, 1.0
    return f"#{r:02x}{g:02x}{b:02x}", a


def num(v, d=None):
    try:
        return float(v)
    except (TypeError, ValueError):
        return d


def scene(path):
    raw = open(path, "rb").read()
    if path.endswith(".gz"):
        raw = gzip.decompress(raw)
    root = ET.fromstring(raw)
    graph = next(c for c in root.iter() if local(c.tag) == "graph")
    default_type = graph.get("defaultedgetype", "undirected")
    nodes, groups, pos, fills, gaps = [], [], {}, {}, []
    parent_of = {}
    placed = 0

    def walk(container, parent):
        nonlocal placed
        for n in container:
            if local(n.tag) != "node":
                continue
            nid = n.get("id")
            if parent is not None:
                parent_of[nid] = parent
            if n.get("pid"):
                parent_of[nid] = n.get("pid")
            fill, alpha = color(viz(n, "color"))
            p = viz(n, "position")
            x, y = (num(p.get("x"), 0), -num(p.get("y"), 0)) if p is not None else (0.0, 0.0)
            placed += p is not None
            size = num(viz(n, "size").get("value"), 10) if viz(n, "size") is not None else 10.0
            sh = viz(n, "shape")
            shape = SHAPES.get((sh.get("value") or "").lower(), "other") if sh is not None else "ellipse"
            label = n.get("label")
            d = GEPHI_DIAMETER * size
            pos[nid] = (x, y, d, d, shape)
            fills[nid] = fill or "#000000"
            nodes.append({"id": nid, "x": x, "y": y, "w": d, "h": d, "shape": shape,
                          "fill": fill or "#000000", "fillOpacity": alpha,
                          "border": {"color": None, "width": 0, "style": "solid"},
                          "label": {"text": label, "fontSize": 12, "color": "#000000", "position": "inside", "visible": True}
                          if label else None,
                          "visible": True, "z": len(nodes)})
            inner = child(n, "nodes")
            if inner is not None:
                walk(inner, nid)

    walk(child(graph, "nodes") if child(graph, "nodes") is not None else [], None)
    # groups: every node with children, members are its descendants
    kids = {}
    for c, p in parent_of.items():
        kids.setdefault(p, []).append(c)

    def desc(g):
        out = []
        for c in kids.get(g, []):
            out += [c] + desc(c)
        return out

    for g in kids:
        members = [m for m in desc(g) if m in pos]
        if not members:
            continue
        xs = [pos[m][0] - pos[m][2] / 2 for m in members] + [pos[m][0] + pos[m][2] / 2 for m in members]
        ys = [pos[m][1] - pos[m][3] / 2 for m in members] + [pos[m][1] + pos[m][3] / 2 for m in members]
        groups.append({"id": g, "members": members, "bbox": {"x": min(xs), "y": min(ys), "w": max(xs) - min(xs), "h": max(ys) - min(ys)},
                       "fill": None, "border": None, "label": next((n["label"]["text"] for n in nodes if n["id"] == g and n["label"]), None)})
    edges, ordinal = [], {}
    eroot = child(graph, "edges")
    for e in (eroot if eroot is not None else []):
        if local(e.tag) != "edge":
            continue
        s, t = e.get("source"), e.get("target")
        if s not in pos or t not in pos:
            continue
        eid = e.get("id") or f"{s}->{t}"
        if not e.get("id"):
            k = ordinal.get((s, t), 0)
            ordinal[(s, t)] = k + 1
            eid += f"#{k}" if k else ""
        c, a = color(viz(e, "color"))
        th = viz(e, "thickness")
        width = num(th.get("value")) if th is not None else None
        if width is None:
            w = num(e.get("weight"), 1)
            width = w if w and w > 0 else 1
        sh = viz(e, "shape")
        style = EDGE_SHAPES.get((sh.get("value") or "").lower(), "other") if sh is not None else "solid"
        typ = (e.get("type") or default_type).lower()
        arrow = {"source": "filled-triangle" if typ == "mutual" else "none",
                 "target": "filled-triangle" if typ in ("directed", "mutual") else "none"}
        edges.append({"id": eid, "source": s, "target": t, "points": [list(pos[s][:2]), list(pos[t][:2])], "curved": False,
                      "color": c or fills[s], "opacity": a, "width": width, "style": style, "arrow": arrow,
                      "label": e.get("label")})
    for prop, why in (("fontSize", "GEXF has no font size; Gephi's is a preview setting"),
                      ("labelColor", "GEXF has no label color; Gephi's is a preview setting"),
                      ("labelPosition", "GEXF has no label position; Gephi's is a preview setting"),
                      ("borderColor", "GEXF has no node border; Gephi's outline is a preview setting"),
                      ("borderWidth", "GEXF has no node border"), ("borderStyle", "GEXF has no node border"),
                      ("zOrder", "GEXF has no drawing order"), ("background", "GEXF has no background")):
        gaps.append({"property": prop, "reason": why})
    if not any(viz(e, "color") is not None for e in (eroot if eroot is not None else [])):
        gaps.append({"property": "edgeColor", "reason": "no edge has a viz:color; the default is the reading tool's"})
    if placed < len(nodes):
        gaps.append({"property": "position", "reason": f"{len(nodes) - placed} of {len(nodes)} nodes have no viz:position"})
        gaps.append({"property": "size", "reason": "without stored positions the fitted scale is meaningless"})
        gaps.append({"property": "edgeWidth", "reason": "without stored positions the fitted scale is meaningless"})
        gaps.append({"property": "edgePath", "reason": "without stored positions the path is the layout's"})
    sha = hashlib.sha256(open(path, "rb").read()).hexdigest()
    return {"provenance": {"side": "reference", "route": "gexf-file", "tool": "gexf_file.py (Python ElementTree), the file's own viz values",
                           "version": sys.version.split()[0], "command": "python3 gexf_file.py <file>", "sourceSha256": sha,
                           "generatedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")},
            "canCarry": {}, "nodes": nodes, "edges": edges, "groups": groups, "gaps": gaps}


if __name__ == "__main__":
    json.dump(scene(sys.argv[1]), sys.stdout)
