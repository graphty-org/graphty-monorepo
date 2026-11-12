"""Reference scene from a yFiles for HTML / yEd Live GraphML file's own stored drawing (route yed-file),
read with the Python standard library, independently of graph-io (yed_facts.py reads yFiles for Java 2.x,
yEd desktop, GraphML).

    python3 yfiles_html_facts.py <file.graphml> | node common.mjs finish <out.json>

What it reads: node boxes (y:RectD in NodeGeometry / NodeLayout), node styles (ShapeNodeStyle,
RectangleNodeStyle, FlowchartNodeStyle, GraphvizNodeStyle, GroupNodeStyle, PanelNodeStyle,
ArcEdgeStyle..), their fill and stroke (attribute, child property element, or a SharedData
reference; yFiles colors are #AARRGGBB or names), the first label's text, size and color,
nested graphs as groups, edge bends (y:Bend), ports (FreeNodePortLocationModelParameter Ratio), edge
stroke, thickness and dash style, arrow types. A node style with no fill or stroke facts (a demo
or template style drawn by its own script) is listed in `gaps` for fill and border.
"""

import gzip
import re
import sys
import xml.etree.ElementTree as ET

from refcommon import clip_path, emit, label_position, node, provenance, python_version

G = "{http://graphml.graphdrawing.org/xmlns}"
NAMES = {"black": "#000000", "white": "#ffffff", "red": "#ff0000", "green": "#008000", "blue": "#0000ff",
         "gray": "#808080", "grey": "#808080", "lightgray": "#d3d3d3", "darkgray": "#a9a9a9",
         "yellow": "#ffff00", "orange": "#ffa500", "transparent": None, "lightblue": "#add8e6",
         "darkorange": "#ff8c00", "silver": "#c0c0c0", "whitesmoke": "#f5f5f5", "gainsboro": "#dcdcdc",
         "dimgray": "#696969", "navy": "#000080", "teal": "#008080", "purple": "#800080", "maroon": "#800000"}


def local(tag):
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def color(v, shared):
    """yFiles color text -> ('#rrggbb', alpha) or None."""
    if v is None:
        return None
    v = v.strip()
    m = re.fullmatch(r"\{y:GraphMLReference (\S+)\}", v)
    if m:
        el = shared.get(m.group(1))
        return paint(el, shared) if el is not None else None
    m = re.fullmatch(r"#([0-9a-fA-F]{8})", v)
    if m:
        h = m.group(1).lower()
        return "#" + h[2:], int(h[:2], 16) / 255
    m = re.fullmatch(r"#([0-9a-fA-F]{6})", v)
    if m:
        return "#" + m.group(1).lower(), 1.0
    n = NAMES.get(v.lower().replace(" ", ""), "?")
    if n == "?":
        # a stroke string "2px solid #ff0000" or "red"
        parts = v.split()
        for p in parts:
            c = color(p, shared) if p != v else None
            if c:
                return c
        return None
    return (n, 1.0) if n else None


def paint(el, shared):
    """A fill / stroke element (SolidColorFill, Color, LinearGradient, Stroke) -> color."""
    if el is None:
        return None
    k = local(el.tag)
    if k in ("SolidColorFill", "Color"):
        return color(el.get("color") or el.get("value"), shared)
    if k in ("LinearGradient", "RadialGradient"):
        stops = [s for s in el.iter() if local(s.tag) == "GradientStop"]
        return color(stops[0].get("color"), shared) if stops else None
    if k == "Stroke":
        return color(el.get("fill"), shared) or paint(prop(el, "fill"), shared)
    return None


def prop(style, name):
    """A style's property given as a child element <Style.name>…</Style.name>."""
    for c in style:
        if local(c.tag).lower().endswith("." + name.lower()):
            return next(iter(c), None)
    return None


def stroke_of(style, shared):
    """(color, alpha, width, dash) of a style's stroke."""
    raw = style.get("stroke")
    el = None
    if raw is not None:
        m = re.fullmatch(r"\{y:GraphMLReference (\S+)\}", raw.strip())
        el = shared.get(m.group(1)) if m else None
        if el is None:
            c = color(raw, shared)
            w = re.search(r"([\d.]+)px", raw)
            dash = "dashed" if "dash" in raw.lower() else "dotted" if "dot" in raw.lower() else "solid"
            return (c[0] if c else None), (c[1] if c else 0), float(w.group(1)) if w else 1.0, dash
    el = el if el is not None else prop(style, "stroke")
    if el is None:
        return None
    if local(el.tag) != "Stroke":
        c = paint(el, shared)
        return (c[0] if c else None), (c[1] if c else 0), 1.0, "solid"
    c = paint(el, shared)
    dash = (el.get("dashStyle") or "solid").lower()
    ds = prop(el, "dashStyle")
    if ds is not None:
        dash = (ds.get("Member") or ds.get("dashes") or "dashed").lower()
    return (c[0] if c else None), (c[1] if c else 0), float(el.get("thickness", 1)), \
        "dotted" if "dot" in dash else "dashed" if "dash" in dash else "solid"


def fill_of(style, shared):
    raw = style.get("fill")
    if raw is not None:
        return color(raw, shared)
    return paint(prop(style, "fill"), shared)


SHAPE_ATTRS = ("shape", "type")


def shape_of(style):
    k = local(style.tag)
    s = next((style.get(a) for a in SHAPE_ATTRS if style.get(a)), None)
    if k == "RectangleNodeStyle":
        return "roundrectangle" if float(style.get("cornerSize", 0) or 0) > 0 else "rectangle"
    if k == "ShapeNodeStyle":
        return (s or "rectangle").replace("_", "")
    if s:
        return {"data": "parallelogram", "process": "rectangle", "decision": "diamond",
                "terminator": "roundrectangle", "start1": "ellipse", "start2": "ellipse"}.get(s, s)
    if k in ("ImageNodeStyle", "IconLabelStyle", "SvgNodeStyle"):
        return "image"
    return "other"


def data(el, keys, name):
    for d in el.findall(G + "data"):
        if keys.get(d.get("key")) == name:
            return d
    return None


def scene(path):
    root = ET.parse(gzip.open(path) if path.endswith(".gz") else path).getroot()
    keys = {k.get("id"): (k.get("attr.name") or "") for k in root.findall(G + "key")}
    shared = {}
    for el in root.iter():
        if el.get("{http://www.yworks.com/xml/yfiles-common/markup/3.0}Key") is not None:
            shared[el.get("{http://www.yworks.com/xml/yfiles-common/markup/3.0}Key")] = el
        elif el.get("{http://www.yworks.com/xml/yfiles-common/markup/2.0}Key") is not None:
            shared[el.get("{http://www.yworks.com/xml/yfiles-common/markup/2.0}Key")] = el
    nodes, groups, geo, ports = [], [], {}, {}
    unknown_styles = set()

    def label(el, w, h, key):
        d = data(el, keys, key)
        if d is None:
            return None
        labs = [lab for lab in d.iter() if local(lab.tag) == "Label"]
        for lab in labs:
            t = next((c for c in lab if local(c.tag) == "Label.Text"), None)
            text = (t.text if t is not None else lab.get("Text")) or ""
            if not text.strip():
                continue
            st = lab.get("Style")
            sel = None
            if st:
                m = re.fullmatch(r"\{y:GraphMLReference (\S+)\}", st)
                sel = shared.get(m.group(1)) if m else None
            if sel is None:
                sc = next((c for c in lab if local(c.tag) == "Label.Style"), None)
                sel = next(iter(sc), None) if sc is not None else None
            size, col = 12.0, "#000000"
            if sel is not None:
                f = next((x for x in sel.iter() if local(x.tag) == "Font"), None)
                size = float(sel.get("textSize") or (f.get("fontSize") if f is not None else None) or 12)
                c = color(sel.get("textFill"), {**shared}) or paint(prop(sel, "textFill"), shared)
                col = c[0] if c else "#000000"
            return {"text": text.strip(), "fontSize": size, "color": col, "position": "inside", "visible": True}
        return None

    def walk(graph, ancestors):
        for n in graph.findall(G + "node"):
            nid = n.get("id")
            d = data(n, keys, "NodeGeometry")
            d = d if d is not None else data(n, keys, "NodeLayout")
            r = next((x for x in d.iter() if local(x.tag) == "RectD"), None) if d is not None else None
            if r is None:
                continue
            x, y, w, h = (float(r.get(k)) for k in ("X", "Y", "Width", "Height"))
            sd = data(n, keys, "NodeStyle")
            style = next(iter(sd), None) if sd is not None else None
            if style is not None and local(style.tag) in ("StaticResource", "GraphMLReference"):
                style = shared.get(style.get("ResourceKey"))
            if style is not None and re.fullmatch(r"\{y:GraphMLReference (\S+)\}", (sd.text or "").strip() or "-"):
                pass
            fill = fill_of(style, shared) if style is not None else None
            stroke = stroke_of(style, shared) if style is not None else None
            if style is not None and fill is None and stroke is None:
                unknown_styles.add(local(style.tag))
            shp = shape_of(style) if style is not None else "rectangle"
            geo[nid] = (x + w / 2, y + h / 2, w, h, "ellipse" if shp == "ellipse" else "rect")
            for p in n.findall(G + "port"):
                pd = data(p, keys, "PortLocationParameter")
                pr = next((q for q in pd.iter() if local(q.tag) == "FreeNodePortLocationModelParameter"), None) if pd is not None else None
                if pr is not None and pr.get("Ratio"):
                    rx, ry = (float(v) for v in pr.get("Ratio").split(","))
                    ports[(nid, p.get("name"))] = [x + rx * w, y + ry * h]
            lab = label(n, w, h, "NodeLabels")
            sub = n.find(G + "graph")
            if sub is not None:
                groups.append({"id": nid, "members": [], "bbox": {"x": x, "y": y, "w": w, "h": h},
                               "fill": fill[0] if fill else None, "border": stroke[0] if stroke else None,
                               "label": lab["text"] if lab else None})
                walk(sub, ancestors + [len(groups) - 1])
                continue
            nodes.append(node(nid, x + w / 2, y + h / 2, w, h, shape_of(style) if style is not None else "rectangle",
                              fill[0] if fill else None, fill[1] if fill else 0.0,
                              stroke[0] if stroke else None, stroke[2] if stroke else 0,
                              stroke[3] if stroke else "solid", lab, len(nodes) + len(groups)))
            for gi in ancestors:
                groups[gi]["members"].append(nid)

    walk(root.find(G + "graph"), [])
    edges = []
    for e in root.iter(G + "edge"):
        s, t = e.get("source"), e.get("target")
        if s not in geo or t not in geo:
            continue
        sd = data(e, keys, "EdgeStyle")
        style = next(iter(sd), None) if sd is not None else None
        if style is not None and local(style.tag) in ("StaticResource", "GraphMLReference"):
            style = shared.get(style.get("ResourceKey"))
        gd = data(e, keys, "EdgeGeometry")
        gd = gd if gd is not None else data(e, keys, "EdgeLayout")
        bends = [[float(v) for v in b.get("Location").split(",")] for b in (gd.iter() if gd is not None else [])
                 if local(b.tag) == "Bend" and b.get("Location")]
        a = ports.get((s, e.get("sourceport")), list(geo[s][:2]))
        b = ports.get((t, e.get("targetport")), list(geo[t][:2]))
        pts = clip_path([a, *bends, b], geo[s], geo[t])
        st = stroke_of(style, shared) if style is not None else None

        def arrow(which):
            if style is None:
                return "none"
            v = style.get(which)
            el = None
            if v:
                m = re.fullmatch(r"\{y:GraphMLReference (\S+)\}", v)
                if m:
                    el = shared.get(m.group(1))
                else:
                    return v.lower()
            el = el if el is not None else prop(style, which)
            if el is None:
                return "none"
            return (el.get("type") or "default").lower().replace("default", "standard")

        lab = label(e, 0, 0, "EdgeLabels")
        edges.append({"id": e.get("id") or f"{s}->{t}", "source": s, "target": t, "points": pts,
                      "curved": style is not None and (local(style.tag) in ("ArcEdgeStyle", "BezierEdgeStyle")
                                                       or float(style.get("smoothingLength", 0) or 0) > 0),
                      "color": (st[0] if st and st[0] else "#000000"), "opacity": st[1] if st else 1.0,
                      "width": st[2] if st else 1.0, "style": st[3] if st else "solid",
                      "arrow": {"source": arrow("sourceArrow"), "target": arrow("targetArrow")},
                      "label": lab["text"] if lab else None})
    gaps = []
    if unknown_styles:
        why = "node styles drawn by their own script carry no fill or stroke facts: " + ", ".join(sorted(unknown_styles))
        gaps = [{"property": p, "reason": why} for p in ("fill", "fillOpacity", "borderColor", "borderWidth", "borderStyle")]
    return {"provenance": provenance("yed-file", "yfiles_html_facts.py (Python stdlib ElementTree, corpus run)",
                                     python_version(), "python3 yfiles_html_facts.py <file>", path),
            "canCarry": {}, "nodes": nodes, "edges": edges, "groups": groups, "gaps": gaps}


if __name__ == "__main__":
    emit(scene(sys.argv[1]))
