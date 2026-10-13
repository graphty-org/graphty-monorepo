"""Reference scene from a yEd GML file's own stored drawing (route yed-file), read with networkx's
GML reader, independently of graph-io.

    PYTHONPATH=<dir holding networkx> python3 yed_gml.py <sample.gml> | node common.mjs finish <out.json>

yEd writes node centers (x, y, y down) and sizes (w, h) in `graphics`, the label in
`LabelGraphics`, and an edge's whole route in `Line`, from the source center through the bends to the
target center; the route's ends are clipped where they leave the source and meet the target. What yEd
leaves out it draws with its defaults: a 1 px border and edge, a 12 pt black label, no arrowheads
unless sourceArrow / targetArrow name one.
"""

import sys

import networkx as nx

from refcommon import clip_path, emit, hex_color, node, provenance


def scene(path):
    g = nx.read_gml(path, label="id")
    nodes, geo = [], {}
    for i, (n, d) in enumerate(g.nodes(data=True)):
        gr, lg = d.get("graphics", {}), d.get("LabelGraphics", {})
        x, y, w, h = (float(gr.get(k, 0)) for k in ("x", "y", "w", "h"))
        shape = gr.get("type", "rectangle")
        geo[n] = (x, y, w, h, "ellipse" if shape in ("ellipse", "circle", "oval") else "rect")
        fill = hex_color(gr.get("fill"))
        outline = hex_color(gr.get("outline"))
        text = lg.get("text", d.get("label"))
        anchor = lg.get("anchor", "c")
        label = None
        if text:
            label = {"text": str(text), "fontSize": float(lg.get("fontSize", 12)),
                     "color": (hex_color(lg.get("color", "#000000")) or ("#000000",))[0],
                     "position": {"c": "inside", "s": "below", "n": "above", "e": "right", "w": "left"}.get(anchor, "other"),
                     "visible": True}
        nodes.append(node(str(n), x, y, w, h, shape, fill[0] if fill else None, fill[1] if fill else 0.0,
                          outline[0] if outline else None, float(gr.get("width", 1)) if "outline" in gr else 0,
                          gr.get("outlineStyle", "line"), label, i))
    edges, ordinal = [], {}
    for s, t, d in g.edges(data=True):
        gr = d.get("graphics", {})
        pts = gr.get("Line", {}).get("point", [])
        pts = [[float(p["x"]), float(p["y"])] for p in (pts if isinstance(pts, list) else [pts])]
        if len(pts) < 2:
            pts = [list(geo[s][:2]), list(geo[t][:2])]
        k = ordinal.get((s, t), 0)
        ordinal[(s, t)] = k + 1
        color = hex_color(gr.get("fill", "#000000")) or ("#000000", 1.0)
        edges.append({"id": f"{s}->{t}" + (f"#{k}" if k else ""), "source": str(s), "target": str(t),
                      "points": clip_path(pts, geo[s], geo[t]), "curved": gr.get("smoothBends") == 1,
                      "color": color[0], "opacity": color[1], "width": float(gr.get("width", 1)),
                      "style": gr.get("style", "line"),
                      "arrow": {"source": gr.get("sourceArrow", "none"), "target": gr.get("targetArrow", "none")},
                      "label": d.get("label") or None})
    return {"provenance": provenance("yed-file", "yed_gml.py over networkx read_gml", f"networkx {nx.__version__}",
                                     "python3 yed_gml.py <file>", path),
            "canCarry": {}, "nodes": nodes, "edges": edges, "groups": [], "gaps": []}


if __name__ == "__main__":
    emit(scene(sys.argv[1]))
