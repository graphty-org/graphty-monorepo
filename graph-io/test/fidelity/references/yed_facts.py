"""Reference scene from a yEd GraphML file's own stored drawing (route yed-file), read with the
Python standard library, independently of graph-io: yEd writes the geometry and style it drew, so
the file is the reference.

    python3 yed_facts.py <sample.graphml> | node common.mjs finish <out.json>

Node kinds: ShapeNode, GenericNode, UMLNoteNode, UMLClassNode, SVGNode, ImageNode, TableNode, and
group nodes (ProxyAutoBoundsNode, the realizer its `active` attribute names), which become groups.
yEd's coordinates are already y down; a node's Geometry is its top-left corner. Edge paths run from
each port through the bends, clipped where they leave the source outline and meet the target.
"""

import sys
import xml.etree.ElementTree as ET

from refcommon import clip_path, emit, hex_color, label_position, node, provenance, python_version

Y = "{http://www.yworks.com/xml/graphml}"
G = "{http://graphml.graphdrawing.org/xmlns}"
LEAF_KINDS = ("ShapeNode", "GenericNode", "UMLNoteNode", "UMLClassNode", "SVGNode", "ImageNode", "TableNode", "GenericGroupNode")
CURVED_EDGES = ("ArcEdge", "BezierEdge", "QuadCurveEdge", "SplineEdge")

# GenericNode configurations (the flowchart and BPMN palettes) -> a shape name common.mjs knows
GENERIC = {"process": "rect", "decision": "diamond", "terminator": "roundrect", "start1": "ellipse", "start2": "ellipse",
           "data": "parallelogram", "preparation": "hexagon", "manualOperation": "other", "BevelNode": "rect",
           "BevelNode2": "rect", "BevelNode3": "roundrect", "ShinyPlateNode": "rect", "ShinyPlateNode2": "rect",
           "ShinyPlateNode3": "roundrect"}


def local(tag):
    return tag[len(Y):] if tag.startswith(Y) else None


def realizer(n):
    """The realizer element that draws a <node>: its own, or the active one of a group proxy."""
    data = [d for d in n if d.tag == G + "data"]
    for d in data:
        for r in d:
            if local(r.tag) == "ProxyAutoBoundsNode":
                rs = r.find(Y + "Realizers")
                kids = list(rs)
                return kids[int(rs.get("active", "0"))], True
            if local(r.tag) in LEAF_KINDS:
                return r, n.get("yfiles.foldertype") == "group"
    return None, False


def shape_name(r):
    kind = local(r.tag)
    sh = r.find(Y + "Shape")
    if sh is not None:
        return sh.get("type")
    if kind in ("SVGNode", "ImageNode"):
        return "image"
    if kind in ("UMLNoteNode", "UMLClassNode", "TableNode"):
        return "rect"
    conf = (r.get("configuration") or "").rsplit(".", 1)[-1]
    return GENERIC.get(conf, conf or "other")


def fill_of(r):
    f = r.find(Y + "Fill")
    if f is None or f.get("hasColor") == "false" or f.get("transparent") == "true":
        return None, 0.0
    c = hex_color(f.get("color"))
    return (c[0], c[1]) if c else (None, 0.0)


def border_of(r):
    b = r.find(Y + "BorderStyle")
    if b is None or b.get("hasColor") == "false":
        return None, 0, "solid"
    c = hex_color(b.get("color"))
    return (c[0] if c else None), float(b.get("width", 1)), b.get("type", "line")


def label_of(r, w, h):
    labs = [lab for lab in r.findall(Y + "NodeLabel") if lab.get("visible", "true") == "true" and (lab.text or "").strip()]
    if not labs:
        return None
    first = labs[0]
    pos = "inside"
    if first.get("x") is not None:
        pos = label_position(w, h, *(float(first.get(k)) for k in ("x", "y", "width", "height")))
    return {"text": "\n".join(lab.text.strip() for lab in labs), "fontSize": float(first.get("fontSize", 12)),
            "color": (hex_color(first.get("textColor", "#000000")) or ("#000000",))[0], "position": pos, "visible": True}


def scene(path):
    root = ET.parse(path).getroot()
    nodes, groups, geo = [], [], {}

    def walk(graph, ancestors):
        for n in graph.findall(G + "node"):
            r, is_group = realizer(n)
            nid = n.get("id")
            if r is not None:
                g = r.find(Y + "Geometry")
                x, y, w, h = (float(g.get(k)) for k in ("x", "y", "width", "height"))
                shape = shape_name(r)
                geo[nid] = (x + w / 2, y + h / 2, w, h, "ellipse" if shape == "ellipse" else "rect")
                fill, alpha = fill_of(r)
                border, bw, bs = border_of(r)
                lab = label_of(r, w, h)
                if is_group:
                    groups.append({"id": nid, "members": [], "bbox": {"x": x, "y": y, "w": w, "h": h}, "fill": fill,
                                   "border": border, "label": lab["text"] if lab else None})
                else:
                    nodes.append(node(nid, x + w / 2, y + h / 2, w, h, shape, fill, alpha, border, bw, bs, lab, len(nodes) + len(groups)))
                    for gi in ancestors:
                        groups[gi]["members"].append(nid)
            sub = n.find(G + "graph")
            if sub is not None:
                here = [i for i, gr in enumerate(groups) if gr["id"] == nid]
                walk(sub, ancestors + here)

    top = root.find(G + "graph")
    walk(top, [])
    edges = []
    for e in root.iter(G + "edge"):
        r = next((c for d in e if d.tag == G + "data" for c in d if (local(c.tag) or "").endswith("Edge")), None)
        if r is None or e.get("source") not in geo or e.get("target") not in geo:
            continue
        s, t = geo[e.get("source")], geo[e.get("target")]
        p, ls, a = r.find(Y + "Path"), r.find(Y + "LineStyle"), r.find(Y + "Arrows")
        sx, sy, tx, ty = (float(p.get(k, 0)) if p is not None else 0.0 for k in ("sx", "sy", "tx", "ty"))
        bends = [[float(q.get("x")), float(q.get("y"))] for q in (p.findall(Y + "Point") if p is not None else [])]
        pts = clip_path([[s[0] + sx, s[1] + sy], *bends, [t[0] + tx, t[1] + ty]], s, t)
        color = hex_color(ls.get("color", "#000000")) or ("#000000", 1.0)
        bs = r.find(Y + "BendStyle")
        labs = [lab.text.strip() for lab in r.findall(Y + "EdgeLabel") if lab.get("visible", "true") == "true" and (lab.text or "").strip()]
        edges.append({"id": e.get("id"), "source": e.get("source"), "target": e.get("target"), "points": pts,
                      "curved": local(r.tag) in CURVED_EDGES or (bs is not None and bs.get("smoothed") == "true" and bool(bends)),
                      "color": color[0], "opacity": color[1], "width": float(ls.get("width", 1)), "style": ls.get("type", "line"),
                      "arrow": {"source": a.get("source", "none") if a is not None else "none",
                                "target": a.get("target", "none") if a is not None else "none"},
                      "label": "\n".join(labs) if labs else None})
    return {"provenance": provenance("yed-file", "yed_facts.py (Python standard library ElementTree)", python_version(),
                                     "python3 yed_facts.py <file>", path),
            "canCarry": {}, "nodes": nodes, "edges": edges, "groups": groups, "gaps": []}


if __name__ == "__main__":
    emit(scene(sys.argv[1]))
