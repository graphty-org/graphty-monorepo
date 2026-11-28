"""Reference scene from a yEd-style GML file's own values (route yed-file), for the corpus samples.
Independent of graph-io (networkx read_gml + stdlib). It reads more than yed_gml.py:

- node border width is yEd's `outlineWidth` (yEd writes `width` only on edges); `hasOutline 0` = no border
- `hasFill 0` = no fill; a `fill2` gradient is `paintedOver` (the flat `fill` is not the color drawn)
- label position from LabelGraphics `anchor` (yEd's internal model: c, t, b, ... and n/s/e/w)
- edge label from LabelGraphics `text` as well as the edge's `label` key
- legacy `arrow "last" | "first" | "both"` on edges
- in a file yEd drew (`Creator` yFiles or yEd, or no `Creator` and yEd's `isGroup`, `gid` or `hierarchic`), a
  polyline's head whose neighboring bend sits on its port (`edgeAnchor`, else the Line's end) is not drawn: yEd has
  no direction to aim it (gml-synthetic-coverage 7->8, as yEd's own SVG export shows)
- groups from `isGroup 1` / `gid` (BioNetGen and yEd group exports); members are the leaf descendants
- a file with no coordinates gets gaps for position, size and edgePath (and groups' boxes are unknown,
  so groups get a gap)

    PYTHONPATH=<dir holding networkx> python3 yed_gml_ext.py <file.gml> | node common.mjs finish <out.json>
"""

import math
import re
import sys

import networkx as nx

from refcommon import clip_path, emit, hex_color, node, provenance

FLOWCHART = {"com.yworks.flowchart.data": "parallelogram", "com.yworks.flowchart.process": "rectangle",
             "com.yworks.flowchart.decision": "diamond", "com.yworks.flowchart.terminator": "roundrectangle",
             "com.yworks.flowchart.start1": "ellipse", "com.yworks.flowchart.start2": "ellipse"}
ANCHOR = {"c": "inside", "s": "below", "n": "above", "e": "right", "w": "left",
          "t": "inside", "b": "inside", "l": "inside", "r": "inside", "tl": "inside", "tr": "inside",
          "bl": "inside", "br": "inside", "nw": "other", "ne": "other", "sw": "other", "se": "other"}
ARROW = {"last": ("none", "standard"), "first": ("standard", "none"), "both": ("standard", "standard"),
         "none": ("none", "none")}


def first_label(lg):
    if isinstance(lg, list):
        lg = next((x for x in lg if isinstance(x, dict) and x.get("text")), lg[0] if lg else {})
    return lg if isinstance(lg, dict) else {}


def drawn_by_yed(path, g):
    """Whether yEd wrote the file, as graph-io's GML reader decides it (its `writerOf`)."""
    m = re.search(r'^\s*Creator\s+"([^"]*)"', open(path, encoding="utf-8", errors="replace").read(), re.M)
    creator = m.group(1) if m else ""
    if re.match(r"\s*(yfiles|yed)\b", creator, re.I):
        return True
    return creator.strip() == "" and ("hierarchic" in g.graph or any(
        "isGroup" in d or "gid" in d for _, d in g.nodes(data=True)))


def lost_heads(arrow, ends, bends):
    """yEd draws no head where the polyline's bend next to that end sits on its port."""
    def on(b, e):
        return math.hypot(b[0] - e[0], b[1] - e[1]) < 1e-6
    if bends and on(bends[0], ends[0]):
        arrow["source"] = "none"
    if bends and on(bends[-1], ends[1]):
        arrow["target"] = "none"


def scene(path):
    g = nx.read_gml(path, label="id")
    yed = drawn_by_yed(path, g)
    placed = any("x" in d.get("graphics", {}) for _, d in g.nodes(data=True))
    nodes, geo, groups = [], {}, {}
    parent = {}
    for i, (n, d) in enumerate(g.nodes(data=True)):
        gr = d.get("graphics", {})
        lg = first_label(d.get("LabelGraphics", {}))
        x, y = float(gr.get("x", 0)), float(gr.get("y", 0))
        w, h = float(gr.get("w", 30)), float(gr.get("h", 30))
        shape = gr.get("type") or FLOWCHART.get(gr.get("customconfiguration"), "rectangle")
        geo[n] = (x, y, w, h, "ellipse" if shape in ("ellipse", "circle", "oval") else "rect")
        if "gid" in d:
            parent[n] = d["gid"]
        fill = None if gr.get("hasFill") == 0 else hex_color(gr.get("fill"))
        outline = None if gr.get("hasOutline") == 0 else hex_color(gr.get("outline"))
        text = lg.get("text", d.get("label"))
        label = None
        if text not in (None, ""):
            label = {"text": str(text), "fontSize": float(lg.get("fontSize", 12)),
                     "color": (hex_color(lg.get("color", "#000000")) or ("#000000",))[0],
                     "position": ANCHOR.get(lg.get("anchor", "c"), "other"), "visible": True}
        if d.get("isGroup") == 1:
            groups[n] = {"id": str(n), "members": [], "bbox": {"x": x - w / 2, "y": y - h / 2, "w": w, "h": h},
                         "fill": fill[0] if fill else None, "border": outline[0] if outline else None,
                         "label": str(text) if text else None}
            continue
        nodes.append(node(str(n), x, y, w, h, shape, fill[0] if fill else None, fill[1] if fill else 0.0,
                          outline[0] if outline else None,
                          float(gr.get("outlineWidth", 1)) if outline else 0,
                          gr.get("outlineStyle", "line"), label, i))
        # a `fill2` is a gradient yEd paints across the node from `fill` (its SVG export of gml-synthetic-coverage
        # reflects it, so a side shows neither color alone): `fill` is not the color drawn, the oracle judges the ramp
        if fill and gr.get("fill2") is not None:
            nodes[-1]["paintedOver"] = True
    for n in [k for k in geo if k not in groups]:
        p, seen = parent.get(n), set()
        while p is not None and p in groups and p not in seen:
            seen.add(p)
            groups[p]["members"].append(str(n))
            p = parent.get(p)
    edges, ordinal = [], {}
    for s, t, d in g.edges(data=True):
        if s in groups or t in groups:
            # an edge to a group box: kept, the group box is its end
            pass
        gr = d.get("graphics", {})
        line = gr.get("Line", {})
        pts = line.get("point", []) if isinstance(line, dict) else []
        pts = [[float(p["x"]), float(p["y"])] for p in (pts if isinstance(pts, list) else [pts])]
        bent = len(pts) > 2
        if len(pts) < 2:
            pts = [list(geo[s][:2]), list(geo[t][:2])]
        k = ordinal.get((s, t), 0)
        ordinal[(s, t)] = k + 1
        color = hex_color(gr.get("fill", "#000000")) or ("#000000", 1.0)
        src, tgt = ARROW.get(str(gr.get("arrow", "")).lower(), ("none", "none"))
        lg = first_label(d.get("LabelGraphics", {}))
        arrow = {"source": gr.get("sourceArrow", src), "target": gr.get("targetArrow", tgt)}
        arc = str(gr.get("type", "")).strip().lower() == "arc" and s != t
        if yed and bent and not arc:
            a = d.get("edgeAnchor", {})
            a = a if isinstance(a, dict) else {}

            def port(n, kx, ky, fallback):
                if kx not in a and ky not in a:
                    return fallback
                x, y, w, h = geo[n][:4]
                return [x + float(a.get(kx, 0)) * w / 2, y + float(a.get(ky, 0)) * h / 2]
            lost_heads(arrow, (port(s, "xSource", "ySource", pts[0]), port(t, "xTarget", "yTarget", pts[-1])),
                       pts[1:-1])
        edges.append({"id": f"{s}->{t}" + (f"#{k}" if k else ""), "source": str(s), "target": str(t),
                      "points": clip_path(pts, geo[s], geo[t]), "curved": bent and gr.get("smoothBends") == 1,
                      "color": color[0], "opacity": color[1], "width": float(gr.get("width", 1)),
                      "style": gr.get("style", "line"),
                      "arrow": arrow,
                      "label": (lg.get("text") or d.get("label") or None)})
    gaps = []
    if not placed:
        why = "the file stores no coordinates; the reader lays it out"
        gaps = [{"property": p, "reason": why} for p in ("position", "size", "edgePath", "groups", "zOrder")]
    return {"provenance": provenance("yed-file", "yed_gml_ext.py over networkx read_gml (corpus run)",
                                     f"networkx {nx.__version__}", "python3 yed_gml_ext.py <file>", path),
            "canCarry": {}, "nodes": nodes, "edges": edges, "groups": list(groups.values()), "gaps": gaps}


if __name__ == "__main__":
    emit(scene(sys.argv[1]))
