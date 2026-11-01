"""Reference scene from a yEd GraphML file's own stored drawing (route yed-file), read with the
Python standard library, independently of graph-io: yEd writes the geometry and style it drew, so
the file is the reference.

    python3 yed_facts.py <sample.graphml> | node common.mjs finish <out.json>

Node kinds: ShapeNode, GenericNode, UMLNoteNode, UMLClassNode, SVGNode, ImageNode, TableNode, and
group nodes (ProxyAutoBoundsNode, the realizer its `active` attribute names), which become groups.
yEd's coordinates are already y down; a node's Geometry is its top-left corner. Edge paths run from
each port through the bends, clipped where they leave the source outline and meet the target; a Bezier
or quad curve edge's bends are control points, so its path is the curve they pull (`curve_points`).
"""

import gzip
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


def curve_points(kind, ctrl, straightness, steps=16):
    """The points yEd's curve passes through, from its port, bend and port control points (yFiles'
    developer's guide, "Bringing Graph Elements to Life": a Bezier or quad curve edge's bends are
    control points that are not on its path). BezierEdge: a cubic Bezier per three bends, the points
    3k on it (a count that is not 3n + 1 is left as the control polygon). QuadCurveEdge: a quadratic
    spline, each bend pulling the curve that runs from the middle of the leg before it to the middle of
    the leg after (the ports on the end legs); straightness (0..1) keeps that share of every leg
    straight, the control polygon at 1."""
    def lerp(a, b, t):
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    out = [ctrl[0]]
    if kind == "BezierEdge":
        if (len(ctrl) - 1) % 3:
            return ctrl
        for i in range(0, len(ctrl) - 1, 3):
            p0, p1, p2, p3 = ctrl[i:i + 4]
            for k in range(1, steps + 1):
                t = k / steps
                w = [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3]
                out.append([sum(w[j] * q[0] for j, q in enumerate((p0, p1, p2, p3))),
                            sum(w[j] * q[1] for j, q in enumerate((p0, p1, p2, p3)))])
        return out
    s = min(1.0, max(0.0, straightness))
    n = len(ctrl) - 1
    for i in range(1, n):
        c = ctrl[i]
        a = lerp(c, ctrl[0] if i == 1 else lerp(ctrl[i - 1], c, 0.5), 1 - s)
        b = lerp(c, ctrl[n] if i == n - 1 else lerp(c, ctrl[i + 1], 0.5), 1 - s)
        for k in range(steps + 1):
            t = k / steps
            out.append([(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
                        (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]])
    out.append(ctrl[n])
    return out


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
    root = ET.parse(gzip.open(path) if path.endswith(".gz") else path).getroot()
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
        route = [[s[0] + sx, s[1] + sy], *bends, [t[0] + tx, t[1] + ty]]
        if local(r.tag) in ("BezierEdge", "QuadCurveEdge") and bends:
            route = curve_points(local(r.tag), route, float(r.get("straightness", 0.1)))
        pts = clip_path(route, s, t)
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
