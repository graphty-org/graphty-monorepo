#!/usr/bin/env python3
"""Writes the yEd GraphML and yEd Live GraphML style specimen sheets, deterministic.

    python3 yed.py [specimens-dir]        (default: ../../specimens; writes yed-graphml/ and yed-live-graphml/)

yEd GraphML is yEd desktop's own markup (yFiles for Java 2.x: y:ShapeNode, y:GenericNode, y:PolyLineEdge ...);
yEd Live GraphML is yFiles for HTML 3's (yjs:ShapeNodeStyle, yjs:PolylineEdgeStyle, yx: label models ...), a
different vocabulary, so each gets its own sheets. Every value in yed-vocabulary.json (yWorks' schema and API
documentation, read by yed_vocabulary.py) is drawn on a sheet, or named in a NOT_DRAWN table with the reason; the
script fails otherwise, so a new yEd or yFiles release shows up as a missing specimen. Sheet rules:
graph-io/test/fidelity/specimens/README.md.

Neither program can be automated (yEd's license forbids it), so the sheets are written here, element by element,
in each program's own spelling: yEd's as its saved files in the corpus spell it, yEd Live's as yFiles for HTML
3.0.0.2 writes it (the corpus file OmniOneID__did-doc-architecture__genKey_iOS.graphml); markup that no corpus file
shows (edge label model parameters, gradients, arrow scales) follows the API documentation's property names in the
same casing. Units: a sheet pixel is a yEd / yFiles world unit, y down, positions stored as node bounds (yEd's
y:Geometry and yFiles' y:RectD are the top-left corner), so the sheets need no layout run.
"""
import json
import os
import re
import struct
import sys
import zlib
from xml.sax.saxutils import escape, quoteattr

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from sheet_layout import ANCHORS, LAYOUT, cells  # noqa: E402

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "../../specimens")
VOCAB = json.load(open(os.path.join(HERE, "yed-vocabulary.json"), encoding="ascii"))
NEU = LAYOUT["neutral"]
CAP = LAYOUT["captionFontSize"]
FONT = NEU["fontFamily"]
SIZE = NEU["size"]
END = 10  # an edge specimen's end nodes
GENERATOR = "graph-io/test/fidelity/generators/specimens/yed.py"


def num(v):
    s = f"{v:.3f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def fnum(v):
    """A yEd double, written the way yEd writes them (always with a decimal point)."""
    s = num(v)
    return s if "." in s else s + ".0"


def attrs(d):
    return " ".join(f"{k}={quoteattr(str(v))}" for k, v in d.items() if v is not None)


def png(w, h, px):
    """A PNG of w x h RGB pixels; px(x, y) -> (r, g, b)."""
    raw = b"".join(b"\0" + b"".join(bytes(px(x, y)) for x in range(w)) for y in range(h))

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def quadrants(x, y, n=16):
    """Red, green / blue, yellow: the orientation of an image shows in its drawing."""
    top, left = y < n // 2, x < n // 2
    return (220, 40, 40) if top and left else (40, 160, 40) if top else (40, 70, 220) if left else (240, 200, 0)


QUADRANT_PNG = png(16, 16, quadrants)
SVG_ICON = ('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">'
            '<rect x="0" y="0" width="20" height="20" fill="#dc2828"/><rect x="20" y="0" width="20" height="20" '
            'fill="#28a028"/><rect x="0" y="20" width="20" height="20" fill="#2846dc"/><rect x="20" y="20" '
            'width="20" height="20" fill="#f0c800"/></svg>')


def b64(data):
    import base64
    return base64.b64encode(data).decode("ascii")


def text_box(text, size):
    """The box a label of this text takes: about what Java and the browser measure for DejaVu Sans."""
    lines = text.split("\n")
    return round(0.62 * size * max(len(s) for s in lines) + 4, 2), round(size * 1.3 * len(lines) + 4, 2)


USED = {}  # (format, kind) -> set of values drawn


def use(fmt, kind, *values):
    USED.setdefault((fmt, kind), set()).update(values)


SHEETS = []


def fit_columns(captions):
    """The most columns (up to the layout's) whose cells hold every caption, keeping at most 10 rows."""
    area = LAYOUT["area"]["x1"] - LAYOUT["area"]["x0"]
    widest = max(text_box(c, CAP)[0] for c in captions)
    for cols in range(LAYOUT["columns"], 3, -1):
        if widest <= area / cols - 6 and -(-len(captions) // cols) <= 10:
            return cols
    raise SystemExit(f"captions too wide for any grid: {max(captions, key=len)!r}")


class Sheet:
    """One sheet: specimens laid out on the shared grid; each specimen's fn(cell, out) writes its elements."""

    def __init__(self, fmt, sid, about, columns=None, caption_dy=None, writer=None):
        self.fmt, self.id, self.about, self.columns, self.caption_dy = fmt, sid, about, columns, caption_dy
        self.writer = writer
        self.items = []
        SHEETS.append(self)

    def add(self, sid, cap, fn):
        assert sid == "default" or all(ch.isalnum() and ch.islower() or ch.isdigit() or ch == "-" for ch in sid), sid
        assert sid not in [i[0] for i in self.items], (self.id, sid)
        self.items.append((sid, cap, fn))

    def write(self):
        writer = (self.writer or (YedWriter if self.fmt == "yed-graphml" else YjsWriter))(self)
        cl = cells(len(self.items), self.columns or fit_columns([cap for _, cap, _ in self.items]))
        for a in ANCHORS:
            writer.anchor(a)
        for (sid, cap, fn), c in zip(self.items, cl):
            fn(c, writer)
            cy = c["caption"]["y"] if self.caption_dy is None else c["y"] + self.caption_dy
            writer.caption(f"cap-{sid}", cap, c["x"], cy)
        path = os.path.join(OUT, self.fmt, f"{self.id}.graphml")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(writer.document())
        return path


# --------------------------------------------------------------------------------------------------------------
# yEd GraphML (yFiles for Java 2.x markup, as yEd 3.x saves it)

YED_HEAD = """<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:java="http://www.yworks.com/xml/yfiles-common/1.0/java" xmlns:sys="http://www.yworks.com/xml/yfiles-common/markup/primitives/2.0" xmlns:x="http://www.yworks.com/xml/yfiles-common/markup/2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:y="http://www.yworks.com/xml/graphml" xmlns:yed="http://www.yworks.com/xml/yed/3" xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://www.yworks.com/xml/schema/graphml/1.1/ygraphml.xsd">
  <!--Created by yEd 3.23.2-->
  <!--THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT {generator}-->
  <!--yEd GraphML style specimen sheet {sid}: {about}-->
  <key attr.name="Description" attr.type="string" for="graph" id="d0"/>
  <key for="port" id="d1" yfiles.type="portgraphics"/>
  <key for="port" id="d2" yfiles.type="portgeometry"/>
  <key for="port" id="d3" yfiles.type="portuserdata"/>
  <key attr.name="url" attr.type="string" for="node" id="d4"/>
  <key attr.name="description" attr.type="string" for="node" id="d5"/>
  <key for="node" id="d6" yfiles.type="nodegraphics"/>
  <key for="graphml" id="d7" yfiles.type="resources"/>
  <key attr.name="url" attr.type="string" for="edge" id="d8"/>
  <key attr.name="description" attr.type="string" for="edge" id="d9"/>
  <key for="edge" id="d10" yfiles.type="edgegraphics"/>
  <graph edgedefault="directed" id="G">
"""

YED_RESOURCES = {"1": ("java.lang.String", escape(SVG_ICON)), "2": ("java.awt.image.BufferedImage", b64(QUADRANT_PNG))}


def ygeom(cx, cy, w, h):
    return f'<y:Geometry height="{fnum(h)}" width="{fnum(w)}" x="{fnum(cx - w / 2)}" y="{fnum(cy - h / 2)}"/>'


def yfill(color=NEU["fill"], **kw):
    return f"<y:Fill {attrs({'color': color, **kw, 'transparent': kw.get('transparent', 'false')})}/>" if color \
        else f"<y:Fill {attrs({'hasColor': 'false', **kw, 'transparent': kw.get('transparent', 'false')})}/>"


def yborder(color=NEU["border"], width=NEU["borderWidth"], kind="line", **kw):
    if color is None:
        return f'<y:BorderStyle hasColor="false" raised="false" type="{kind}" width="{fnum(width)}"/>'
    return f"<y:BorderStyle {attrs({'color': color, 'raised': kw.get('raised', 'false'), 'type': kind, 'width': fnum(width)})}/>"


def node_label_offset(model, pos, w, h, lw, lh, d=4.0):
    """Where yEd puts a label of this model and position: its top-left corner relative to the node's."""
    cx, cy = (w - lw) / 2, (h - lh) / 2
    inside = {"c": (cx, cy), "t": (cx, d), "b": (cx, h - lh - d), "l": (d, cy), "r": (w - lw - d, cy),
              "tl": (d, d), "tr": (w - lw - d, d), "bl": (d, h - lh - d), "br": (w - lw - d, h - lh - d)}
    outside = {"n": (cx, -lh - d), "s": (cx, h + d), "e": (w + d, cy), "w": (-lw - d, cy),
               "nw": (-lw - d, -lh - d), "ne": (w + d, -lh - d), "sw": (-lw - d, h + d), "se": (w + d, h + d)}
    if model == "internal":
        return inside[pos]
    if model == "corners":
        return outside[pos]
    return outside.get(pos, (cx, cy))


def ylabel(text, w=SIZE, h=SIZE, fmt="yed-graphml", model="internal", pos="c", free=None, smart=None, **over):
    size = over.get("fontSize", NEU["fontSize"])
    lw, lh = text_box(text, size)
    x, y = free if free is not None else node_label_offset(model, pos, w, h, lw, lh)
    a = {"alignment": "center", "autoSizePolicy": "content", "fontFamily": FONT, "fontSize": str(size),
         "fontStyle": "plain", "hasBackgroundColor": "false", "hasLineColor": "false", "height": fnum(lh),
         "horizontalTextPosition": "center", "iconTextGap": "4", "modelName": model, "modelPosition": pos,
         "textColor": NEU["labelColor"], "verticalTextPosition": "bottom", "visible": "true", "width": fnum(lw),
         "x": fnum(x), "y": fnum(y)}
    a.update({k: str(v) for k, v in over.items()})
    use(fmt, "nodeLabelPosition", f"{model}:{pos}")
    child = ""
    if model == "custom":
        sx, sy, ox, oy = smart or (0.0, 0.0, 0.0, 0.0)
        child = ('<y:LabelModel><y:SmartNodeLabelModel distance="4.0"/></y:LabelModel><y:ModelParameter>'
                 f'<y:SmartNodeLabelModelParameter labelRatioX="{fnum(sx)}" labelRatioY="{fnum(sy)}" '
                 f'nodeRatioX="{fnum(sx)}" nodeRatioY="{fnum(sy)}" offsetX="{fnum(ox)}" offsetY="{fnum(oy)}" '
                 'upX="0.0" upY="-1.0"/></y:ModelParameter>')
        a.pop("modelPosition")
    return f'<y:NodeLabel {attrs(a)} xml:space="preserve">{escape(text)}{child}</y:NodeLabel>'


def yedge_label(text, length, model="centered", pos="center", fmt="yed-graphml", smart=None, **over):
    size = over.get("fontSize", NEU["fontSize"])
    lw, lh = text_box(text, size)
    a = {"alignment": "center", "configuration": "AutoFlippingLabel", "distance": "2.0", "fontFamily": FONT,
         "fontSize": str(size), "fontStyle": "plain", "hasBackgroundColor": "false", "hasLineColor": "false",
         "height": fnum(lh), "horizontalTextPosition": "center", "iconTextGap": "4", "modelName": model,
         "modelPosition": pos, "preferredPlacement": "anywhere", "ratio": "0.5", "textColor": NEU["labelColor"],
         "verticalTextPosition": "bottom", "visible": "true", "width": fnum(lw),
         "x": fnum(length / 2 - lw / 2), "y": fnum(-lh / 2)}
    a.update({k: str(v) for k, v in over.items()})
    use(fmt, "edgeLabelPosition", f"{model}:{pos}")
    child = ""
    if model == "custom":
        ratio, dist, seg = smart or (0.5, 0.0, 0)
        child = ('<y:LabelModel><y:SmartEdgeLabelModel autoRotationEnabled="false" defaultAngle="0.0" '
                 'defaultDistance="10.0"/></y:LabelModel><y:ModelParameter><y:SmartEdgeLabelModelParameter '
                 f'angle="0.0" distance="{fnum(dist)}" distanceToCenter="true" position="center" '
                 f'ratio="{fnum(ratio)}" segment="{seg}"/></y:ModelParameter>')
    child += ('<y:PreferredPlacementDescriptor angle="0.0" angleOffsetOnRightSide="0" angleReference="absolute" '
              'angleRotationOnRightSide="co" distance="-1.0" frozen="true" placement="anywhere" side="anywhere" '
              'sideReference="relative_to_edge_flow"/>')
    return f'<y:EdgeLabel {attrs(a)} xml:space="preserve">{escape(text)}{child}</y:EdgeLabel>'


class YedWriter:
    fmt = "yed-graphml"

    def __init__(self, sheet):
        self.sheet = sheet
        self.nodes, self.edges = [], []
        self.resources = set()

    def raw_node(self, nid, realizer, inner=None, folder=None):
        ft = f' yfiles.foldertype="{folder}"' if folder else ""
        body = f'    <node id={quoteattr(nid)}{ft}>\n      <data key="d6">\n        {realizer}\n      </data>\n'
        if inner is not None:
            body += f'      <graph edgedefault="directed" id={quoteattr(nid + ":")}>\n' + "".join(inner) + "      </graph>\n"
        return body + "    </node>\n"

    def shape(self, nid, cx, cy, w=SIZE, h=SIZE, shape="ellipse", fill=None, border=None, label="", extra="",
              realizer="ShapeNode", conf=None, into=None):
        fill = yfill() if fill is None else fill
        border = yborder() if border is None else border
        shp = f'<y:Shape type="{shape}"/>' if realizer == "ShapeNode" and shape else ""
        if realizer == "ShapeNode" and shape:
            use(self.fmt, "shape", shape)
        cattr = f" configuration={quoteattr(conf)}" if conf else ""
        xml = self.raw_node(nid, f"<y:{realizer}{cattr}>{ygeom(cx, cy, w, h)}{fill}{border}{label}{extra}{shp}</y:{realizer}>")
        (self.nodes if into is None else into).append(xml)
        use(self.fmt, "realizer", realizer)
        return xml

    def default_node(self, nid, cx, cy):
        self.nodes.append(self.raw_node(nid, f"<y:ShapeNode>{ygeom(cx, cy, SIZE, SIZE)}</y:ShapeNode>"))

    def anchor(self, a):
        self.shape(a["id"], a["x"], a["y"], a["size"], a["size"], shape="rectangle")

    def caption(self, nid, text, x, y):
        lw, lh = text_box(text, CAP)
        self.shape(nid, x, y, lw, lh, shape="rectangle", fill=yfill(None), border=yborder(None),
                   label=ylabel(text, lw, lh, fontSize=CAP))

    def end(self, nid, p):
        self.shape(nid, p["x"], p["y"], END, END, shape="ellipse")

    def edge(self, eid, s, t, sp, tp, points=(), color=NEU["edgeColor"], width=NEU["edgeWidth"], kind="line",
             arrows=("none", "standard"), realizer="PolyLineEdge", label="", extra="", ports=(0.0, 0.0, 0.0, 0.0),
             conf=None, smoothed="false", path_attrs=None, raw_style=None):
        pts = "".join(f'<y:Point x="{fnum(x)}" y="{fnum(y)}"/>' for x, y in points)
        pa = attrs({"sx": fnum(ports[0]), "sy": fnum(ports[1]), "tx": fnum(ports[2]), "ty": fnum(ports[3]),
                    **(path_attrs or {})})
        line = raw_style if raw_style is not None else f'<y:LineStyle color="{color}" type="{kind}" width="{fnum(width)}"/>'
        arr = f'<y:Arrows source="{arrows[0]}" target="{arrows[1]}"/>' if arrows else ""
        use(self.fmt, "arrow", *(arrows or ()))
        use(self.fmt, "lineType", kind)
        use(self.fmt, "realizer", realizer)
        bend = f'<y:BendStyle smoothed="{smoothed}"/>' if realizer == "PolyLineEdge" else ""
        cattr = f" configuration={quoteattr(conf)}" if conf else ""
        self.edges.append(f'    <edge id={quoteattr(eid)} source={quoteattr(s)} target={quoteattr(t)}>\n      <data key="d10">\n'
                          f'        <y:{realizer}{cattr}><y:Path {pa}>{pts}</y:Path>{line}{arr}{label}{extra}{bend}</y:{realizer}>\n'
                          "      </data>\n    </edge>\n")

    def straight(self, eid, c, **kw):
        """An edge specimen between two neutral end nodes at the cell's source and target points."""
        self.end(f"{eid}-s", c["source"])
        self.end(f"{eid}-t", c["target"])
        self.edge(eid, f"{eid}-s", f"{eid}-t", c["source"], c["target"], **kw)

    def document(self):
        res = ""
        if self.resources:
            res = "".join(f'      <y:Resource id="{k}" type="{YED_RESOURCES[k][0]}">{YED_RESOURCES[k][1]}</y:Resource>\n'
                          for k in sorted(self.resources))
            res = f"    <y:Resources>\n{res}    </y:Resources>\n"
        else:
            res = "    <y:Resources/>\n"
        head = YED_HEAD.format(generator=GENERATOR, sid=self.sheet.id, about=escape(self.sheet.about))
        return head + "".join(self.nodes) + "".join(self.edges) + f'  </graph>\n  <data key="d7">\n{res}  </data>\n</graphml>\n'


YED = "yed-graphml"


def yed_node_shapes():
    yv = VOCAB[YED]
    s = Sheet(YED, "specimen-node-shapes", "every ShapeNode shape type (ygraphics.xsd shapeType and yFiles 2.19 ShapeNodeRealizer)")
    s.add("default", "ShapeNode=nothing set", lambda c, w: w.default_node("default", c["x"], c["y"]))
    for shape in yv["shapes"]:
        sid = f"shape-{shape}"
        s.add(sid, f"type={shape}", lambda c, w, sid=sid, shape=shape: w.shape(sid, c["x"], c["y"], shape=shape))
    confs = [g["id"] for g in yv["genericConfigurations"]]
    pages = [[x for x in confs if x.startswith(("com.yworks.flowchart.", "com.yworks.entityRelationship.", "com.yjava."))],
             [x for x in confs if x.startswith(("com.yworks.bpmn.", "com.yworks.sbgn."))]]
    for k, page in enumerate(pages, start=2):
        p = Sheet(YED, f"specimen-node-shapes-p{k}", "GenericNode configurations (yEd's Flowchart, Entity Relationship and Modern Nodes palettes)"
                  if k == 2 else "GenericNode configurations (yEd's BPMN and SBGN palettes), UML class and note nodes")
        p.add("default", "GenericNode=nothing set",
              lambda c, w: w.nodes.append(w.raw_node("default", f"<y:GenericNode>{ygeom(c['x'], c['y'], SIZE, SIZE)}</y:GenericNode>")))
        for conf in page:
            sid = "generic-" + conf.split(".", 2)[2].replace(".", "-").replace("_", "-").lower() if not conf.startswith("com.yjava.") \
                else "generic-" + conf[len("com.yjava."):].lower()
            if conf.startswith("com.yworks.entityRelationship."):
                sid = "generic-er-" + conf.rsplit(".", 1)[1].replace("_", "-")
            if conf.startswith("com.yworks.sbgn."):
                sid = "generic-sbgn-" + conf.rsplit(".", 1)[1].lower()
            use(YED, "configuration", conf)
            p.add(sid, f"configuration={conf.split('.', 3)[3] if conf.startswith('com.yworks') else conf.split('.', 2)[2]}",
                  lambda c, w, sid=sid, conf=conf: w.shape(sid, c["x"], c["y"], 56, 36, realizer="GenericNode", conf=conf))
        if k == 2:
            # older yEd versions write the Modern Nodes palette's ids without the com.yjava. prefix (corpus)
            for conf in [x for x in yv["observedInCorpus"]["configurations"] if "." not in x and "Group" not in x
                         and x != "PanelNode"]:
                sid = "generic-legacy-" + conf.lower()
                use(YED, "configuration", conf)
                p.add(sid, f"configuration={conf}",
                      lambda c, w, sid=sid, conf=conf: w.shape(sid, c["x"], c["y"], 56, 36, realizer="GenericNode", conf=conf))
        if k == 3:
            uml = [("uml-class", "UMLClassNode", 'clipContent="true" constraint="" omitDetails="false" stereotype="" use3DEffect="true"'),
                   ("uml-use3deffect-false", "use3DEffect=false", 'clipContent="true" constraint="" omitDetails="false" stereotype="" use3DEffect="false"'),
                   ("uml-stereotype", "stereotype=entity", 'clipContent="true" constraint="" omitDetails="false" stereotype="entity" use3DEffect="true"'),
                   ("uml-constraint", "constraint=abstract", 'clipContent="true" constraint="abstract" omitDetails="false" stereotype="" use3DEffect="true"'),
                   ("uml-omitdetails", "omitDetails=true", 'clipContent="true" constraint="" omitDetails="true" stereotype="" use3DEffect="true"')]
            for sid, cap, ua in uml:
                p.add(sid, cap, lambda c, w, sid=sid, ua=ua: w.shape(
                    sid, c["x"], c["y"], 76, 56, realizer="UMLClassNode", fill=yfill(),
                    label=ylabel("Cls", 76, 56, model="internal", pos="t"),
                    extra=f'<y:UML {ua}><y:AttributeLabel xml:space="preserve">-a: int</y:AttributeLabel>'
                          '<y:MethodLabel xml:space="preserve">+m()</y:MethodLabel></y:UML>'))
                use(YED, "umlAttribute", *[x.split("=")[0] for x in ua.split()])
            p.add("uml-note", "UMLNoteNode", lambda c, w: w.shape("uml-note", c["x"], c["y"], 56, 36, realizer="UMLNoteNode"))
            for sid, prop, val in [("sbgn-style-radius-20", "com.yworks.sbgn.style.radius", "20.0"),
                                   ("sbgn-style-inverse-true", "com.yworks.sbgn.style.inverse", "true"),
                                   ("sbgn-style-mcount-2", "com.yworks.sbgn.style.mcount", "2")]:
                p.add(sid, f"{prop[len('com.yworks.sbgn.'):]}={val} (macromolecule)",
                      lambda c, w, sid=sid, prop=prop, val=val: w.shape(
                          sid, c["x"], c["y"], 56, 36, realizer="GenericNode", conf="com.yworks.sbgn.Macromolecule",
                          extra=style_props(**{prop: val})))
    yed_bpmn_properties()
    return s


def style_props(**props):
    """y:StyleProperties holding style properties of yed-vocabulary.json's styleProperties table (name: value)."""
    table = VOCAB[YED]["styleProperties"]
    use(YED, "styleProperty", *props)
    return "<y:StyleProperties>" + "".join(f'<y:Property class="{table[n]}" name="{n}" value="{v}"/>'
                                          for n, v in props.items()) + "</y:StyleProperties>"


def bpmn_props(**props):
    """y:StyleProperties holding BPMN palette properties, each with the Java class yEd writes for it."""
    table = VOCAB[YED]["bpmnStyleProperties"]
    out = ""
    for name, value in props.items():
        name = "com.yworks.bpmn." + name.replace("_", ".")
        out += f'<y:Property class="{table[name]["class"]}" name="{name}" value="{value}"/>'
        use(YED, "bpmnProperty", f"{name}={value}" if table[name]["values"] else name)
    return f"<y:StyleProperties>{out}</y:StyleProperties>"


def yed_bpmn_properties():
    """The BPMN palette's style properties: event types and characteristics (p4), gateway, task, artifact and data
    object types (p5), each on the configuration yEd uses it with, the others at the value yEd writes first, and the
    icon colors. Captions drop the value's kind prefix (EVENT_TYPE_, GATEWAY_TYPE_, ...)."""
    table = {k: [v["value"] for v in b["values"]] for k, b in VOCAB[YED]["bpmnStyleProperties"].items()}
    conf = {"EVENT": "com.yworks.bpmn.Event", "GATEWAY": "com.yworks.bpmn.Gateway", "ARTIFACT": "com.yworks.bpmn.Artifact",
            "ACTIVITY": "com.yworks.bpmn.Activity", "CONVERSATION": "com.yworks.bpmn.Conversation"}
    size = {"EVENT": (36, 36), "GATEWAY": (40, 40), "ARTIFACT": (36, 44), "ACTIVITY": (56, 36), "CONVERSATION": (40, 36)}
    p4 = Sheet(YED, "specimen-node-shapes-p4", "GenericNode BPMN events: com.yworks.bpmn.type, characteristic and icon colors", columns=4)
    p5 = Sheet(YED, "specimen-node-shapes-p5", "GenericNode BPMN gateways, tasks and artifacts: com.yworks.bpmn.type, taskType, dataObjectType", columns=4)
    p6 = Sheet(YED, "specimen-node-shapes-p6", "GenericNode BPMN activities and conversations: com.yworks.bpmn.type, activityType, marker1 to marker4", columns=4)
    page_of = {"EVENT": p4, "GATEWAY": p5, "ARTIFACT": p5, "ACTIVITY": p6, "CONVERSATION": p6}

    def node(page, sid, cap, kind, **props):
        page.add(sid, cap, lambda c, w: w.shape(sid, c["x"], c["y"], *size[kind], realizer="GenericNode", conf=conf[kind],
                                                extra=bpmn_props(**props)))

    def short(v):
        return v.split("_TYPE_", 1)[-1].replace("EVENT_CHARACTERISTIC_", "").replace("EXCLUSIVE", "EXCL")

    for page, kind in [(p4, "EVENT"), (p5, "GATEWAY"), (p6, "ACTIVITY")]:
        page.add("default", f"{conf[kind].rsplit('.', 1)[1]}=no StyleProperties", lambda c, w, kind=kind: w.shape(
            "default", c["x"], c["y"], *size[kind], realizer="GenericNode", conf=conf[kind]))
    for t in table["com.yworks.bpmn.type"]:
        kind = t.split("_", 1)[0]
        if kind not in page_of:
            continue  # connections: edges-lines; pools: groups-p2; CHOREOGRAPHY_TYPE: YED_NOT_DRAWN
        extra = {"characteristic": "EVENT_CHARACTERISTIC_START"} if kind == "EVENT" else {}
        if t == "ARTIFACT_TYPE_DATA_OBJECT":
            extra = {"dataObjectType": "DATA_OBJECT_TYPE_PLAIN"}
        node(page_of[kind], "bpmn-" + t.lower().replace("_", "-"), f"type={short(t)}", kind, type=t, **extra)
    for ch in table["com.yworks.bpmn.characteristic"][1:]:
        node(p4, "bpmn-" + ch.lower().replace("_", "-"), f"char={short(ch)}", "EVENT",
             type="EVENT_TYPE_PLAIN", characteristic=ch)
    for prop, col in [("icon_fill", "#ff0000"), ("icon_fill2", "#0000ff"), ("icon_line_color", "#ff0000")]:
        node(p4, "bpmn-" + prop.replace("_", "-"), f"{prop.replace('_', '.')}={col}", "EVENT",
             type="EVENT_TYPE_MESSAGE", characteristic="EVENT_CHARACTERISTIC_START", **{prop: col})
    for tt in table["com.yworks.bpmn.taskType"]:
        node(p5, "bpmn-" + tt.lower().replace("_", "-"), f"taskType={short(tt)}", "ACTIVITY", taskType=tt)
    for dt in table["com.yworks.bpmn.dataObjectType"][1:]:
        node(p5, "bpmn-" + dt.lower().replace("_", "-"), f"dataObjectType={short(dt)}", "ARTIFACT",
             type="ARTIFACT_TYPE_DATA_OBJECT", dataObjectType=dt)
    for at in table["com.yworks.bpmn.activityType"]:
        node(p6, "bpmn-" + at.lower().replace("_", "-"), f"activityType={short(at)}", "ACTIVITY", activityType=at)
    for mk in table["com.yworks.bpmn.marker1"]:
        node(p6, "bpmn-marker1-" + mk[len("BPMN_MARKER_"):].lower().replace("_", "-"),
             f"marker1={mk[len('BPMN_MARKER_'):]}", "ACTIVITY", marker1=mk)
    node(p6, "bpmn-markers-1-to-4", "marker1..4=LOOP,PARALLEL,COMPENSATION,AD_HOC", "ACTIVITY",
         marker1="BPMN_MARKER_LOOP", marker2="BPMN_MARKER_PARALLEL", marker3="BPMN_MARKER_COMPENSATION",
         marker4="BPMN_MARKER_AD_HOC")


def yed_fills_borders():
    s = Sheet(YED, "specimen-node-fills-borders", "Fill color, color syntaxes, no fill, gradients (color2); BorderStyle color, width, type, raised; DropShadow")
    s.add("default", "ShapeNode=nothing set", lambda c, w: w.default_node("default", c["x"], c["y"]))

    def node(sid, cap, **kw):
        s.add(sid, cap, lambda c, w: w.shape(sid, c["x"], c["y"], shape="rectangle", **kw))

    for col in ["#FF0000", "#00AA00", "#0000FF", "#FFCC00", "#ffcc00", "#000000", "#FFFFFF"]:
        node(f"fill-{col[1:].lower()}{'-lower' if col != col.upper() else ''}", f"color={col}", fill=yfill(col))
    use(YED, "fillAttribute", "color", "transparent")
    node("fill-hascolor-false", "hasColor=false", fill=yfill(None))
    node("fill-transparent-true", "transparent=true", fill=yfill(NEU["fill"], transparent="true"))
    use(YED, "fillAttribute", "hasColor")
    for c1, c2 in [("#FFFFFF", "#0000FF"), ("#FF0000", "#FFCC00"), ("#C8C8C8", "#00000000")]:
        node(f"gradient-{c1[1:].lower()}-{c2[1:].lower()}", f"color2={c2} (color={c1})", fill=yfill(c1, color2=c2))
    use(YED, "fillAttribute", "color2")
    for col in ["#FF0000", "#0000FF", "#00AA00"]:
        node(f"border-color-{col[1:].lower()}", f"border color={col}", border=yborder(col))
    node("border-hascolor-false", "border hasColor=false", border=yborder(None))
    for wd in [0.5, 2, 3, 5, 8]:
        node(f"border-width-{num(wd).replace('.', '-')}", f"border width={num(wd)}", border=yborder(width=wd))
    for kind in VOCAB[YED]["lineTypes"]:
        node(f"border-type-{kind.replace('_', '-')}", f"border type={kind}", border=yborder(width=2, kind=kind))
    node("border-raised-true", "border raised=true", border=yborder(width=2, raised="true"))
    use(YED, "borderAttribute", "color", "hasColor", "width", "type", "raised")
    for sid, col, dx, dy in [("dropshadow-default", "#B3A691", 4, 4), ("dropshadow-offset-8", "#B3A691", 8, 8),
                             ("dropshadow-color-ff0000", "#FF0000", 4, 4), ("dropshadow-offset-negative", "#808080", -4, -4)]:
        node(sid, f"DropShadow {col} {dx},{dy}", extra=f'<y:DropShadow color="{col}" offsetX="{dx}" offsetY="{dy}"/>')
    use(YED, "dropShadowAttribute", "color", "offsetX", "offsetY")
    for v in ["true", "false"]:
        sid = f"shadow-painting-{v}"
        s.add(sid, f"SHADOW_PAINTING={v} (flowchart process)", lambda c, w, sid=sid, v=v: w.shape(
            sid, c["x"], c["y"], 56, 36, realizer="GenericNode", conf="com.yworks.flowchart.process",
            extra='<y:StyleProperties><y:Property class="java.lang.Boolean" name="y.view.ShadowNodePainter.SHADOW_PAINTING" '
                  f'value="{v}"/></y:StyleProperties>'))
    use(YED, "styleProperty", "y.view.ShadowNodePainter.SHADOW_PAINTING")
    # a few shapes with a gradient: the gradient's direction shows on a tall shape
    node("gradient-tall", "color2=#0000FF on 24x60", fill=yfill("#FFFFFF", color2="#0000FF"), w=24, h=60)
    return s


def yed_sizes_opacity():
    s = Sheet(YED, "specimen-node-sizes-opacity", "Geometry width and height, fill and border alpha (#RRGGBBAA)", columns=8)
    s.add("default", "ShapeNode=nothing set", lambda c, w: w.default_node("default", c["x"], c["y"]))
    for wd, ht in [(12, 12), (24, 24), (48, 48), (72, 72), (80, 20), (20, 80), (60, 36), (36, 60), (36.5, 36.5), (100, 50)]:
        sid = f"size-{num(wd).replace('.', '-')}x{num(ht).replace('.', '-')}"
        s.add(sid, f"width={num(wd)} height={num(ht)}",
              lambda c, w, sid=sid, wd=wd, ht=ht: w.shape(sid, c["x"], c["y"], wd, ht, shape="rectangle"))
    for a in ["00", "40", "80", "C0"]:
        sid = f"fill-alpha-{a.lower()}"
        s.add(sid, f"color=#3366FF{a}", lambda c, w, sid=sid, a=a: w.shape(sid, c["x"], c["y"], shape="rectangle", fill=yfill(f"#3366FF{a}")))
    for a in ["40", "80"]:
        sid = f"border-alpha-{a.lower()}"
        s.add(sid, f"border color=#000000{a}", lambda c, w, sid=sid, a=a: w.shape(
            sid, c["x"], c["y"], shape="rectangle", border=yborder(f"#000000{a}", 3)))
    s.add("gradient-alpha", "color=#FF000080 color2=#0000FF80", lambda c, w: w.shape(
        "gradient-alpha", c["x"], c["y"], shape="rectangle", fill=yfill("#FF000080", color2="#0000FF80")))
    return s


def yed_labels():
    s = Sheet(YED, "specimen-labels", "NodeLabel text, fontFamily, fontSize, fontStyle, textColor, underline, alignment, background, line, rotation, visibility, autoSizePolicy")
    W, H = 60.0, 30.0

    def lab(sid, cap, text="Label", w=W, h=H, **kw):
        s.add(sid, cap, lambda c, wr: wr.shape(sid, c["x"], c["y"], w, h, shape="rectangle", label=ylabel(text, w, h, **kw)))

    s.add("default", "NodeLabel=text only", lambda c, w: w.shape(
        "default", c["x"], c["y"], W, H, shape="rectangle", label='<y:NodeLabel xml:space="preserve">Label</y:NodeLabel>'))
    for fam in ["Dialog", "DialogInput", "SansSerif", "Serif", "Monospaced", "DejaVu Sans", "DejaVu Serif",
                "DejaVu Sans Mono", "Arial", "Times New Roman", "Courier New"]:
        lab(f"font-family-{fam.lower().replace(' ', '-')}", f"fontFamily={fam}", "Agj", fontFamily=fam)
    for size in [6, 8, 12, 16, 20, 24]:
        lab(f"font-size-{size}", f"fontSize={size}", "Ag", fontSize=size)
    for st in VOCAB[YED]["schemaEnums"]["fontStyle"]:
        lab(f"font-style-{st}", f"fontStyle={st}", fontStyle=st)
        use(YED, "fontStyle", st)
    for col in ["#FF0000", "#0000FF", "#00AA00"]:
        lab(f"text-color-{col[1:].lower()}", f"textColor={col}", textColor=col)
    lab("underlined-text", "underlinedText=true", underlinedText="true")
    for al in VOCAB[YED]["schemaEnums"]["alignment"]:
        lab(f"alignment-{al}", f"alignment={al}", "Wide line\nab", h=40, alignment=al)
        use(YED, "alignment", al)
    lab("background-color", "backgroundColor=#FFFF99", hasBackgroundColor="true", backgroundColor="#FFFF99")
    lab("line-color", "lineColor=#FF0000", hasLineColor="true", lineColor="#FF0000")
    for ang in [45, 90, 180, 270]:
        lab(f"rotation-{ang}", f"rotationAngle={ang}", rotationAngle=f"{ang}.0")
    lab("visible-false", "visible=false", visible="false")
    lab("has-text-false", "hasText=false", hasText="false")
    for pol in VOCAB[YED]["schemaEnums"]["autoSizePolicy"]:
        lab(f"autosize-{pol.replace('_', '-')}", f"autoSizePolicy={pol}", "Auto size", autoSizePolicy=pol)
        use(YED, "autoSizePolicy", pol)
    lab("multi-line", "text=two lines", "First\nSecond", h=40)
    s.add("two-labels", "two NodeLabels", lambda c, w: w.shape(
        "two-labels", c["x"], c["y"], W, H, shape="rectangle",
        label=ylabel("Top", W, H, model="internal", pos="t") + ylabel("Bottom", W, H, model="internal", pos="b")))
    lab("border-distance", "borderDistance=8 (sides n)", "Out", model="sides", pos="n", borderDistance="8.0")
    # label configurations: a label painter by name (corpus); CroppingLabel crops the text at the label's box
    lab("configuration-cropping-label", "configuration=CroppingLabel", "Cropped long text", autoSizePolicy="node_width",
        configuration="CroppingLabel")
    use(YED, "labelConfiguration", "CroppingLabel", "AutoFlippingLabel")

    def er(c, w, sid="configuration-er-labels"):
        ew, eh = 76.0, 56.0
        name = ylabel("Entity", ew, eh, pos="t", backgroundColor="#B7C9E3", hasBackgroundColor="true",
                      autoSizePolicy="node_width", configuration="com.yworks.entityRelationship.label.name")
        lw, lh = text_box("id\nname", NEU["fontSize"])
        attributes = (f'<y:NodeLabel {attrs({"alignment": "left", "autoSizePolicy": "content", "configuration": "com.yworks.entityRelationship.label.attributes", "fontFamily": FONT, "fontSize": str(NEU["fontSize"]), "fontStyle": "plain", "hasBackgroundColor": "false", "hasLineColor": "false", "height": fnum(lh), "horizontalTextPosition": "center", "iconTextGap": "4", "modelName": "custom", "textColor": NEU["labelColor"], "verticalTextPosition": "top", "visible": "true", "width": fnum(lw), "x": "2.0", "y": "22.0"})} xml:space="preserve">id\nname'
                      '<y:LabelModel><y:ErdAttributesNodeLabelModel/></y:LabelModel><y:ModelParameter>'
                      '<y:ErdAttributesNodeLabelModelParameter/></y:ModelParameter></y:NodeLabel>')
        w.shape(sid, c["x"], c["y"], ew, eh, realizer="GenericNode", conf="com.yworks.entityRelationship.big_entity",
                label=name + attributes)
        use(YED, "labelConfiguration", "com.yworks.entityRelationship.label.name",
            "com.yworks.entityRelationship.label.attributes")
        use(YED, "labelModel", "ErdAttributesNodeLabelModel")

    s.add("configuration-er-labels", "ER name + attributes labels", er)
    use(YED, "labelAttribute", "alignment", "textColor", "lineColor", "hasLineColor", "backgroundColor",
        "hasBackgroundColor", "hasText", "fontFamily", "fontSize", "fontStyle", "rotationAngle", "underlinedText",
        "visible", "autoSizePolicy", "borderDistance", "modelName", "modelPosition")

    p = Sheet(YED, "specimen-labels-p2", "NodeLabel models and positions: internal, sandwich, sides, corners, eight_pos, free, custom (SmartNodeLabelModel)", caption_dy=54)
    p.add("default", "NodeLabel=text only", lambda c, w: w.shape(
        "default", c["x"], c["y"], 40, 26, shape="rectangle", label='<y:NodeLabel xml:space="preserve">Lbl</y:NodeLabel>'))
    for model, positions in VOCAB[YED]["nodeLabelPositions"].items():
        if model in ("free", "custom"):
            continue
        for pos in positions:
            sid = f"model-{model.replace('_', '-')}-{pos}"
            p.add(sid, f"{model}:{pos}", lambda c, w, sid=sid, model=model, pos=pos: w.shape(
                sid, c["x"], c["y"], 40, 26, shape="rectangle", label=ylabel("Lbl", 40, 26, model=model, pos=pos)))
    for sid, off in [("model-free-anywhere", (30.0, -18.0)), ("model-free-offset-left", (-30.0, 30.0))]:
        p.add(sid, f"free x={num(off[0])} y={num(off[1])}", lambda c, w, sid=sid, off=off: w.shape(
            sid, c["x"], c["y"], 40, 26, shape="rectangle", label=ylabel("Lbl", 40, 26, model="free", pos="anywhere", free=off)))
    for sid, smart in [("model-smart-center", (0.0, 0.0, 0.0, 0.0)), ("model-smart-top-left", (-0.5, -0.5, 0.0, 0.0)),
                       ("model-smart-offset", (0.0, 0.0, 12.0, -10.0))]:
        p.add(sid, f"SmartNodeLabelModel {','.join(num(v) for v in smart)}", lambda c, w, sid=sid, smart=smart: w.shape(
            sid, c["x"], c["y"], 40, 26, shape="rectangle", label=ylabel("Lbl", 40, 26, model="custom", pos="anywhere", smart=smart)))
    return s


def yed_edges_lines():
    s = Sheet(YED, "specimen-edges-lines", "LineStyle color, width, type, alpha; edge realizers PolyLine (bends, smoothed), Arc, Bezier, QuadCurve, Spline, Generic; ports, loops, parallel edges")
    s.add("default", "PolyLineEdge=nothing set", lambda c, w: (
        w.end("default-s", c["source"]), w.end("default-t", c["target"]),
        w.edges.append('    <edge id="default" source="default-s" target="default-t">\n      <data key="d10">\n'
                       '        <y:PolyLineEdge/>\n      </data>\n    </edge>\n')))

    def e(sid, cap, **kw):
        s.add(sid, cap, lambda c, w: w.straight(sid, c, **kw))

    for col in ["#FF0000", "#0000FF", "#00AA00"]:
        e(f"color-{col[1:].lower()}", f"color={col}", color=col)
    e("color-alpha-80", "color=#00000080", color="#00000080", width=4)
    for wd in [0.5, 1, 2, 3, 5, 8]:
        e(f"width-{num(wd).replace('.', '-')}", f"width={num(wd)}", width=wd)
    for kind in VOCAB[YED]["lineTypes"]:
        e(f"type-{kind.replace('_', '-')}", f"type={kind}", kind=kind, width=2)
    e("line-has-color-false", "LineStyle hasColor=false",
      raw_style='<y:LineStyle hasColor="false" type="line" width="1.5"/>')
    use(YED, "lineStyleAttribute", "color", "hasColor", "type", "width")

    def bend(c):
        return [(c["x"], c["y"] - 30)]

    s.add("bends-one", "Path 1 point", lambda c, w: w.straight("bends-one", c, points=bend(c)))
    s.add("bends-two", "Path 2 points", lambda c, w: w.straight(
        "bends-two", c, points=[(c["x"] - 20, c["y"] - 30), (c["x"] + 20, c["y"] + 30)]))
    s.add("bends-smoothed", "BendStyle smoothed=true", lambda c, w: w.straight(
        "bends-smoothed", c, points=[(c["x"] - 20, c["y"] - 30), (c["x"] + 20, c["y"] - 30)], smoothed="true"))
    for sid, typ, ht in [("arc-fixed-height-20", "fixedHeight", 20.0), ("arc-fixed-height-minus-20", "fixedHeight", -20.0),
                         ("arc-fixed-ratio-1", "fixedRatio", 25.0), ("arc-fixed-ratio-0-5", "fixedRatio", 10.0)]:
        ratio = "1.0" if "ratio-1" in sid else "0.5" if "ratio-0-5" in sid else "1.0"
        s.add(sid, f"ArcEdge {typ} {num(ht)}", lambda c, w, sid=sid, typ=typ, ht=ht, ratio=ratio: w.straight(
            sid, c, realizer="ArcEdge", points=[(c["x"], c["y"] - ht)],
            extra=f'<y:Arc height="{fnum(ht)}" ratio="{ratio}" type="{typ}"/>'))
        use(YED, "arc", typ)
    use(YED, "arcAttribute", "type", "height", "ratio")
    s.add("bezier", "BezierEdge 2 points", lambda c, w: w.straight(
        "bezier", c, realizer="BezierEdge", points=[(c["x"] - 20, c["y"] - 35), (c["x"] + 20, c["y"] + 35)]))
    for st in [0.1, 0.5, 1.0]:
        sid = f"quadcurve-straightness-{num(st).replace('.', '-')}"
        # QuadCurveEdge's straightness is an attribute of the realizer element itself
        s.add(sid, f"QuadCurveEdge straightness={num(st)}", lambda c, w, sid=sid, st=st: quad(w, sid, c, st))
    use(YED, "quadCurveAttribute", "straightness")
    s.add("spline", "SplineEdge 2 points", lambda c, w: w.straight(
        "spline", c, realizer="SplineEdge", points=[(c["x"] - 20, c["y"] - 30), (c["x"] + 20, c["y"] + 30)]))
    s.add("generic-framed", "GenericEdge com.yworks.edge.framed", lambda c, w: w.straight(
        "generic-framed", c, realizer="GenericEdge", conf="com.yworks.edge.framed", width=6,
        extra='<y:StyleProperties><y:Property class="java.awt.Color" name="FramedEdgePainter.fillColor" value="#FFCC00"/></y:StyleProperties>'))
    use(YED, "edgeConfiguration", "com.yworks.edge.framed")
    # the BPMN palette's connections: a GenericEdge whose com.yworks.bpmn.type names the connection type
    for t in [v["value"] for v in VOCAB[YED]["bpmnStyleProperties"]["com.yworks.bpmn.type"]["values"]
              if v["value"].startswith("CONNECTION_TYPE_")]:
        sid = "bpmn-" + t.lower().replace("_", "-")
        s.add(sid, f"bpmn.type={t[len('CONNECTION_TYPE_'):]}", lambda c, w, sid=sid, t=t: w.straight(
            sid, c, realizer="GenericEdge", conf="com.yworks.bpmn.Connection", extra=bpmn_props(type=t)))
    use(YED, "edgeConfiguration", "com.yworks.bpmn.Connection")
    s.add("ports-offset", "Path sx=0 sy=-4 tx=0 ty=4", lambda c, w: w.straight(
        "ports-offset", c, ports=(0.0, -4.0, 0.0, 4.0)))
    s.add("reversed-path-rendering", "reversedPathRendering=true", lambda c, w: w.straight(
        "reversed-path-rendering", c, path_attrs={"reversedPathRendering": "true"}))
    use(YED, "pathAttribute", "sx", "sy", "tx", "ty", "reversedPathRendering")

    def loop(c, w):
        w.shape("loop-n", c["x"], c["y"], 24, 24, shape="ellipse")
        w.edge("loop", "loop-n", "loop-n", c, c, points=[(c["x"] - 6, c["y"] - 34), (c["x"] + 6, c["y"] - 34)])

    s.add("loop", "self loop", loop)

    def parallel(c, w):
        w.end("parallel-s", c["source"])
        w.end("parallel-t", c["target"])
        w.edge("parallel-a", "parallel-s", "parallel-t", c["source"], c["target"], color="#FF0000",
               points=[(c["x"], c["y"] - 14)])
        w.edge("parallel-b", "parallel-s", "parallel-t", c["source"], c["target"], color="#0000FF",
               points=[(c["x"], c["y"] + 14)])

    s.add("parallel", "two parallel edges", parallel)
    return s


def quad(w, sid, c, st):
    w.end(f"{sid}-s", c["source"])
    w.end(f"{sid}-t", c["target"])
    pts = "".join(f'<y:Point x="{fnum(x)}" y="{fnum(y)}"/>' for x, y in [(c["x"] - 15, c["y"] - 30), (c["x"] + 15, c["y"] - 30)])
    w.edges.append(f'    <edge id="{sid}" source="{sid}-s" target="{sid}-t">\n      <data key="d10">\n'
                   f'        <y:QuadCurveEdge straightness="{fnum(st)}"><y:Path sx="0.0" sy="0.0" tx="0.0" ty="0.0">{pts}</y:Path>'
                   f'<y:LineStyle color="{NEU["edgeColor"]}" type="line" width="{fnum(NEU["edgeWidth"])}"/>'
                   '<y:Arrows source="none" target="standard"/></y:QuadCurveEdge>\n      </data>\n    </edge>\n')
    use(YED, "realizer", "QuadCurveEdge")


def yed_arrows():
    s = Sheet(YED, "specimen-arrows", "every arrow type at the target and at the source (ygraphics.xsd arrowType and yFiles 2.19 Arrow)")
    s.add("default", "Arrows=nothing set", lambda c, w: w.straight("default", c, arrows=None))
    s.add("arrows-none", "source=none target=none", lambda c, w: w.straight("arrows-none", c, arrows=("none", "none")))
    for a in VOCAB[YED]["arrows"]:
        if a == "none":
            continue
        sid = f"target-{a.replace('_', '-')}"
        s.add(sid, f"target={a}", lambda c, w, sid=sid, a=a: w.straight(sid, c, arrows=("none", a)))
    for a in VOCAB[YED]["arrows"]:
        if a == "none":
            continue
        sid = f"source-{a.replace('_', '-')}"
        s.add(sid, f"source={a}", lambda c, w, sid=sid, a=a: w.straight(sid, c, arrows=(a, "none")))
    return s


def yed_edge_labels():
    s = Sheet(YED, "specimen-edge-labels", "EdgeLabel text, font, color, background, line, rotation, visibility; edge label models and positions")
    L = 2 * LAYOUT["edgeHalfSpan"]

    def el(sid, cap, text="Lbl", **kw):
        s.add(sid, cap, lambda c, w: w.straight(sid, c, label=yedge_label(text, L, **kw)))

    s.add("default", "EdgeLabel=text only", lambda c, w: w.straight(
        "default", c, label='<y:EdgeLabel xml:space="preserve">Lbl</y:EdgeLabel>'))
    for fam in ["Dialog", "Serif", "Monospaced", "DejaVu Sans"]:
        el(f"font-family-{fam.lower().replace(' ', '-')}", f"fontFamily={fam}", "Agj", fontFamily=fam)
    for size in [6, 12, 18]:
        el(f"font-size-{size}", f"fontSize={size}", "Ag", fontSize=size)
    for st in VOCAB[YED]["schemaEnums"]["fontStyle"]:
        el(f"font-style-{st}", f"fontStyle={st}", fontStyle=st)
    for col in ["#FF0000", "#0000FF"]:
        el(f"text-color-{col[1:].lower()}", f"textColor={col}", textColor=col)
    el("background-color", "backgroundColor=#FFFF99", hasBackgroundColor="true", backgroundColor="#FFFF99")
    el("line-color", "lineColor=#FF0000", hasLineColor="true", lineColor="#FF0000")
    el("underlined-text", "underlinedText=true", underlinedText="true")
    for ang in [45, 90]:
        el(f"rotation-{ang}", f"rotationAngle={ang}", rotationAngle=f"{ang}.0")
    el("visible-false", "visible=false", visible="false")
    el("multi-line", "text=two lines", "One\nTwo")
    for model, positions in VOCAB[YED]["edgeLabelPositions"].items():
        if model in ("free", "custom"):
            continue
        for pos in positions:
            el(f"model-{model.replace('_', '-')}-{pos}", f"{model}:{pos}", model=model, pos=pos)
    for sid, ratio in [("model-center-slider-0-25", 0.25), ("model-side-slider-0-75", 0.75)]:
        model = "center_slider" if "center" in sid else "side_slider"
        el(sid, f"{model} ratio={num(ratio)}", model=model, pos="center", ratio=fnum(ratio))
    el("model-free-anywhere", "free x=10 y=-24", model="free", pos="anywhere", x="10.0", y="-24.0")
    for sid, smart in [("model-smart-center", (0.5, 0.0, 0)), ("model-smart-ratio-0-2", (0.2, 0.0, 0)),
                       ("model-smart-distance-12", (0.5, 12.0, 0))]:
        el(sid, f"SmartEdgeLabelModel {','.join(num(v) for v in smart)}", model="custom", pos="anywhere", smart=smart)
    el("distance-10", "distance=10 (side_slider)", model="side_slider", pos="center", distance="10.0")
    use(YED, "edgeLabelAttribute", "modelName", "modelPosition", "distance", "ratio", "preferredPlacement")
    return s


def group_xml(w, gid, cx, cy, gw, gh, members, closed=False, fill="#F5F5F5", border=None, shape="roundrectangle",
              label_kw=None, insets=15, extra="", label_text="Group", realizer="GroupNode", conf=None, label_pos="t"):
    border = border or yborder(NEU["border"], 1, "dashed")
    lab = ylabel(label_text, gw, gh, model="internal", pos=label_pos, **({"autoSizePolicy": "node_width",
                                                                         "backgroundColor": "#EBEBEB",
                                                                         "hasBackgroundColor": "true"} | (label_kw or {})))
    ins = (f'<y:Insets bottom="{insets}" bottomF="{fnum(insets)}" left="{insets}" leftF="{fnum(insets)}" right="{insets}" '
           f'rightF="{fnum(insets)}" top="{insets}" topF="{fnum(insets)}"/>'
           '<y:BorderInsets bottom="0" bottomF="0.0" left="0" leftF="0.0" right="0" rightF="0.0" top="0" topF="0.0"/>')
    cattr = f" configuration={quoteattr(conf)}" if conf else ""
    shp = f'<y:Shape type="{shape}"/>' if realizer == "GroupNode" else ""

    def real(state_closed, bw, bh):
        return (f"<y:{realizer}{cattr}>{ygeom(cx, cy, bw, bh)}{yfill(fill)}{border}{lab}{shp}"
                f'<y:State closed="{str(state_closed).lower()}" closedHeight="50.0" closedWidth="80.0" innerGraphDisplayEnabled="false"/>'
                f"{ins}{extra}</y:{realizer}>")

    opened, folded = real(False, gw, gh), real(True, 80.0, 50.0)
    active = 1 if closed else 0
    proxy = f'<y:ProxyAutoBoundsNode><y:Realizers active="{active}">{opened}{folded}</y:Realizers></y:ProxyAutoBoundsNode>'
    if closed:
        # a closed folder is stored with its folded realizer active and its own bounds
        folded = real(True, 80.0, 50.0)
        proxy = f'<y:ProxyAutoBoundsNode><y:Realizers active="1">{opened}{folded}</y:Realizers></y:ProxyAutoBoundsNode>'
    use(YED, "realizer", "ProxyAutoBoundsNode", realizer)
    return w.raw_node(gid, proxy, inner=members, folder="folder" if closed else "group")


def yed_groups():
    s = Sheet(YED, "specimen-groups", "GroupNode (ProxyAutoBoundsNode) open, closed folder, nested; group shape, fill, border, label, insets; GenericGroupNode; TableNode",
              columns=4, caption_dy=62)
    GW, GH = 150.0, 90.0

    def members(w, gid, cx, cy, n=2):
        out = []
        for k in range(n):
            w.shape(f"{gid}-m{k}", cx - 30 + 60 * k, cy + 10, 24, 24, shape="ellipse", into=out)
        return out

    def grp(sid, cap, **kw):
        def fn(c, w):
            w.nodes.append(group_xml(w, sid, c["x"], c["y"], GW, GH, members(w, sid, c["x"], c["y"]), **kw))
        s.add(sid, cap, fn)

    grp("group-open", "GroupNode open")
    grp("group-closed", "folder closed=true", closed=True)
    grp("group-shape-rectangle", "Shape type=rectangle", shape="rectangle")
    grp("group-fill-ffcc00", "Fill color=#FFCC00", fill="#FFCC00")
    grp("group-border-line-red", "BorderStyle line #FF0000 2", border=yborder("#FF0000", 2, "line"))
    grp("group-label-right", "label alignment=right", label_kw={"alignment": "right"})
    grp("group-label-bottom", "label internal:b", label_pos="b")
    grp("group-insets-30", "Insets 30", insets=30)

    def nested(c, w):
        inner_m = members(w, "group-nested-inner", c["x"], c["y"])
        inner = group_xml(w, "group-nested-inner", c["x"], c["y"] + 8, GW - 30, GH - 34, inner_m, fill="#CAECFF",
                          label_text="Inner")
        w.nodes.append(group_xml(w, "group-nested", c["x"], c["y"], GW, GH, [inner], label_text="Outer"))

    s.add("group-nested", "group in a group", nested)

    def generic(c, w):
        w.nodes.append(group_xml(w, "genericgroup-panelnode", c["x"], c["y"], GW, GH,
                                 members(w, "genericgroup-panelnode", c["x"], c["y"]), realizer="GenericGroupNode",
                                 conf="PanelNode"))

    s.add("genericgroup-panelnode", "GenericGroupNode PanelNode", generic)
    use(YED, "configuration", "PanelNode")

    for sid, extra in [("genericgroup-demogroup", ""),
                       ("genericgroup-demogroup-header", '<y:StyleProperties><y:Property class="java.awt.Color" '
                                                         'name="headerBackground" value="#68b0e3"/></y:StyleProperties>')]:
        s.add(sid, "DemoGroup" + (" headerBackground=#68b0e3" if extra else ""), lambda c, w, sid=sid, extra=extra: w.nodes.append(
            group_xml(w, sid, c["x"], c["y"], GW, GH, members(w, sid, c["x"], c["y"]), realizer="GenericGroupNode",
                      conf="DemoGroup", extra=extra)))
    use(YED, "configuration", "DemoGroup")
    use(YED, "styleProperty", "headerBackground")

    def table(c, w, sid="table-node", props=None):
        tw, th = GW, GH
        rows = (th - 30) / 2
        xml = (f'<y:TableNode configuration="YED_TABLE_NODE">{ygeom(c["x"], c["y"], tw, th)}'
               '<y:Fill color="#ECF5FF" color2="#0042F440" transparent="false"/><y:BorderStyle hasColor="false" type="line" width="1.0"/>'
               f'{ylabel("Pool", tw, th, model="internal", pos="t")}'
               '<y:StyleProperties><y:Property class="java.awt.Color" name="yed.table.lane.color.main" value="#C0C0C0"/>'
               + "".join(f'<y:Property class="{v[0] if isinstance(v, tuple) else "java.awt.Color"}" name="{k}" '
                         f'value="{v[1] if isinstance(v, tuple) else v}"/>' for k, v in (props or {}).items())
               + '</y:StyleProperties>'
               f'<y:State autoResize="true" closed="false" closedHeight="80.0" closedWidth="100.0"/>'
               f'<y:Table autoResizeTable="true" defaultColumnWidth="{fnum(tw)}" defaultMinimumColumnWidth="30.0" defaultMinimumRowHeight="20.0" defaultRowHeight="{fnum(rows)}">'
               '<y:DefaultColumnInsets bottom="0.0" left="0.0" right="0.0" top="0.0"/><y:DefaultRowInsets bottom="0.0" left="0.0" right="0.0" top="0.0"/>'
               f'<y:Insets bottom="0.0" left="0.0" right="0.0" top="30.0"/><y:Columns><y:Column id="column_0" minimumWidth="30.0" width="{fnum(tw)}">'
               '<y:Insets bottom="0.0" left="0.0" right="0.0" top="0.0"/></y:Column></y:Columns><y:Rows>'
               f'<y:Row height="{fnum(rows)}" id="row_0" minimumHeight="20.0"><y:Insets bottom="0.0" left="0.0" right="0.0" top="0.0"/></y:Row>'
               f'<y:Row height="{fnum(rows)}" id="row_1" minimumHeight="20.0"><y:Insets bottom="0.0" left="0.0" right="0.0" top="0.0"/></y:Row>'
               '</y:Rows></y:Table></y:TableNode>')
        w.nodes.append(w.raw_node(sid, xml, inner=[], folder="group"))
        use(YED, "styleProperty", "yed.table.lane.color.main", *(props or {}))
        if (props or {}).get("com.yworks.bpmn.type"):
            use(YED, "bpmnProperty", f"com.yworks.bpmn.type={props['com.yworks.bpmn.type'][1]}")
        use(YED, "realizer", "TableNode")
        use(YED, "tableAttribute", "autoResizeTable", "defaultColumnWidth", "defaultMinimumColumnWidth",
            "defaultRowHeight", "defaultMinimumRowHeight")

    s.add("table-node", "TableNode 1 column 2 rows", table)
    # the table's color properties as yEd's Properties dialog writes them (names as draw.io's yEd importer reads them)
    for sid, prop, col in [("table-lane-color-alternating", "yed.table.lane.color.alternating", "#FFCC00"),
                           ("table-header-color-main", "yed.table.header.color.main", "#FF9999"),
                           ("table-header-color-alternating", "yed.table.header.color.alternating", "#99CCFF")]:
        s.add(sid, f"{prop[len('yed.table.'):]}={col}", lambda c, w, sid=sid, prop=prop, col=col: table(c, w, sid, {prop: col}))
    use(YED, "groupAttribute", "closed", "innerGraphDisplayEnabled")

    t2 = Sheet(YED, "specimen-groups-p2", "TableNode lane style, section color and header height; BPMN pools (com.yworks.bpmn.type POOL_TYPE_*)",
               columns=4, caption_dy=62)
    t2.add("table-node", "TableNode 1 column 2 rows", table)
    sp = VOCAB[YED]["styleProperties"]
    for sid, prop, val in [("table-lane-style-rows", "yed.table.lane.style", "LANE_STYLE_ROWS"),
                           ("table-lane-style-columns", "yed.table.lane.style", "LANE_STYLE_COLUMNS"),
                           ("table-section-color", "yed.table.section.color", "#99CC99"),
                           ("table-header-height-40", "yed.table.header.height", "40.0")]:
        t2.add(sid, f"{prop[len('yed.table.'):]}={val}", lambda c, w, sid=sid, prop=prop, val=val: table(
            c, w, sid, {prop: (sp[prop], val)}))
    # table lane labels: a row's or column's header label, placed by yEd's row and column label models
    for sid, cap, kind, axis in [("table-row-label", "row label (RowNodeLabelModel)", "Row", "row_0"),
                                 ("table-column-label", "column label (ColumnNodeLabelModel)", "Column", "column_0")]:
        def lane_label(c, w, sid=sid, kind=kind, axis=axis):
            table(c, w, sid)
            lw, lh = text_box("Lane", NEU["fontSize"])
            rot = ' rotationAngle="270.0"' if kind == "Row" else ""
            x, y = (3.0, 30.0) if kind == "Row" else (GW / 2 - lw / 2, 30.0 + 3.0)
            lab = (f'<y:NodeLabel alignment="center" autoSizePolicy="content" fontFamily="{FONT}" fontSize="{NEU["fontSize"]}" '
                   f'fontStyle="plain" hasBackgroundColor="false" hasLineColor="false" height="{fnum(lh)}" '
                   f'horizontalTextPosition="center" iconTextGap="4" modelName="custom"{rot} textColor="{NEU["labelColor"]}" '
                   f'verticalTextPosition="bottom" visible="true" width="{fnum(lw)}" x="{fnum(x)}" y="{fnum(y)}" '
                   f'xml:space="preserve">Lane<y:LabelModel><y:{kind}NodeLabelModel offset="3.0"/></y:LabelModel>'
                   f'<y:ModelParameter><y:{kind}NodeLabelModelParameter id="{axis}" inside="true"/></y:ModelParameter></y:NodeLabel>')
            node = w.nodes[-1]
            w.nodes[-1] = node.replace("<y:StyleProperties>", lab + "<y:StyleProperties>", 1)
        t2.add(sid, cap, lane_label)
    t2.add("genericgroup-sbgn-complex", "GenericGroupNode com.yworks.sbgn.Complex", lambda c, w: w.nodes.append(
        group_xml(w, "genericgroup-sbgn-complex", c["x"], c["y"], GW, GH, members(w, "genericgroup-sbgn-complex", c["x"], c["y"]),
                  realizer="GenericGroupNode", conf="com.yworks.sbgn.Complex")))
    t2.add("genericgroup-sbgn-complex-radiusy-20", "Complex style.radiusY=20", lambda c, w: w.nodes.append(
        group_xml(w, "genericgroup-sbgn-complex-radiusy-20", c["x"], c["y"], GW, GH,
                  members(w, "genericgroup-sbgn-complex-radiusy-20", c["x"], c["y"]), realizer="GenericGroupNode",
                  conf="com.yworks.sbgn.Complex", extra=style_props(**{"com.yworks.sbgn.style.radiusY": "20"}))))
    use(YED, "groupConfiguration", "com.yworks.sbgn.Complex")
    use(YED, "styleProperty", "com.yworks.sbgn.style.radiusY", "com.yworks.sbgn.style.mcount")
    bt = VOCAB[YED]["bpmnStyleProperties"]["com.yworks.bpmn.type"]
    for t in [v["value"] for v in bt["values"] if v["value"].startswith("POOL_TYPE_")]:
        sid = "bpmn-" + t.lower().replace("_", "-")
        t2.add(sid, f"bpmn.type={t[len('POOL_TYPE_'):]}", lambda c, w, sid=sid, t=t: table(
            c, w, sid, {"com.yworks.bpmn.type": (bt["class"], t)}))
    return s


def yed_images():
    s = Sheet(YED, "specimen-images-charts", "ImageNode, SVGNode, label icons and the label's text position against its icon", columns=6)
    s.add("default", "ImageNode=nothing set", lambda c, w: w.nodes.append(w.raw_node(
        "default", f"<y:ImageNode>{ygeom(c['x'], c['y'], SIZE, SIZE)}</y:ImageNode>")))

    def image(sid, cap, alpha="true", wd=SIZE, ht=SIZE):
        def fn(c, w):
            w.resources.add("2")
            w.shape(sid, c["x"], c["y"], wd, ht, realizer="ImageNode", extra=f'<y:Image alphaImage="{alpha}" refid="2"/>')
        s.add(sid, cap, fn)

    image("image-node", "ImageNode PNG")
    image("image-alpha-false", "alphaImage=false", alpha="false")
    image("image-wide", "ImageNode 60x30", wd=60, ht=30)
    use(YED, "imageAttribute", "alphaImage", "refid")

    def svg(sid, cap, visual):
        def fn(c, w):
            w.resources.add("1")
            w.shape(sid, c["x"], c["y"], SIZE, SIZE, realizer="SVGNode",
                    extra=f'<y:SVGNodeProperties usingVisualBounds="{visual}"/><y:SVGModel svgBoundsPolicy="0"><y:SVGContent refid="1"/></y:SVGModel>')
        s.add(sid, cap, fn)

    svg("svg-node", "SVGNode", "true")
    svg("svg-visual-bounds-false", "usingVisualBounds=false", "false")

    def icon(sid, cap, **kw):
        def fn(c, w):
            w.resources.add("2")
            w.shape(sid, c["x"], c["y"], 70, 40, shape="rectangle", label=ylabel("Txt", 70, 40, iconData="2", **kw))
        s.add(sid, cap, fn)

    icon("label-icon", "NodeLabel iconData")
    for hp in VOCAB[YED]["schemaEnums"]["horizontalTextPosition"]:
        icon(f"icon-text-h-{hp.replace('_', '-')}", f"horizontalTextPosition={hp}", horizontalTextPosition=hp)
        use(YED, "horizontalTextPosition", hp)
    for vp in VOCAB[YED]["schemaEnums"]["verticalTextPosition"]:
        icon(f"icon-text-v-{vp}", f"verticalTextPosition={vp}", verticalTextPosition=vp)
        use(YED, "verticalTextPosition", vp)
    icon("icon-text-gap-12", "iconTextGap=12", iconTextGap="12")
    use(YED, "labelAttribute", "iconData", "horizontalTextPosition", "verticalTextPosition", "iconTextGap")
    return s


# --------------------------------------------------------------------------------------------------------------
# yEd Live GraphML (yFiles for HTML 3 markup)

YJS = "yed-live-graphml"
YJS_HEAD = """<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!--Created by yFiles for HTML 3.0.0.2-->
<!--THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT {generator}-->
<!--yEd Live GraphML style specimen sheet {sid}: {about}-->
<graphml xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://www.yworks.com/xml/schema/graphml.html/2.0/ygraphml.xsd " xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:yx="http://www.yworks.com/xml/yfiles-common/4.0" xmlns:y="http://www.yworks.com/xml/yfiles-common/3.0" xmlns:x="http://www.yworks.com/xml/yfiles-common/markup/3.0" xmlns:yjs="http://www.yworks.com/xml/yfiles-for-html/3.0/xaml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
\t<key id="d0" for="node" attr.type="int" attr.name="zOrder" y:attr.uri="http://www.yworks.com/xml/yfiles-z-order/1.0/zOrder"/>
\t<key id="d1" for="node" attr.type="boolean" attr.name="Expanded" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/folding/Expanded">
\t\t<default>true</default>
\t</key>
\t<key id="d4" for="node" attr.name="NodeLabels" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/NodeLabels"/>
\t<key id="d5" for="node" attr.name="NodeGeometry" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/NodeGeometry"/>
\t<key id="d7" for="node" attr.name="NodeStyle" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/NodeStyle"{node_default}
\t<key id="d11" for="edge" attr.name="EdgeLabels" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/EdgeLabels"/>
\t<key id="d12" for="edge" attr.name="EdgeGeometry" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/EdgeGeometry"/>
\t<key id="d13" for="edge" attr.name="EdgeStyle" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/EdgeStyle"{edge_default}
\t<key id="d16" for="port" attr.name="PortLocationParameter" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/PortLocationParameter">
\t\t<default>
\t\t\t<x:Static Member="y:FreeNodePortLocationModel.NodeCenterAnchored"/>
\t\t</default>
\t</key>
\t<key id="d19" attr.name="SharedData" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/SharedData"/>
\t<data key="d19">
\t\t<y:SharedData>
{shared}\t\t</y:SharedData>
\t</data>
\t<graph id="G" edgedefault="directed">
"""

# the label models every label parameter refers to, defined once in SharedData as yFiles writes them
YJS_MODELS = {
    "interior": '<yx:InteriorNodeLabelModel x:Key="m-interior"/>',
    "exterior": '<yx:ExteriorNodeLabelModel x:Key="m-exterior" Margins="5"/>',
    "stretch": '<yx:StretchNodeLabelModel x:Key="m-stretch"/>',
    "smart": '<yx:SmartEdgeLabelModel x:Key="m-smart"/>',
    "nine": '<yx:NinePositionsEdgeLabelModel x:Key="m-nine" Distance="5"/>',
    "path": '<yx:EdgePathLabelModel x:Key="m-path" Distance="5"/>',
    "segment": '<yx:EdgeSegmentLabelModel x:Key="m-segment" Distance="5"/>',
}


def argb(hex6, alpha="FF"):
    """yFiles' color spelling: #AARRGGBB."""
    return f"#{alpha}{hex6.lstrip('#').upper()}"


def pascal(enum):
    """An enumeration member as yFiles' GraphML spells it: TOP_LEFT -> TopLeft."""
    return "".join(p.capitalize() for p in enum.split("_"))


def ystroke(color=NEU["border"], thickness=NEU["borderWidth"], owner="ShapeNodeStyle", prop="stroke", **kw):
    a = attrs({"fill": argb(color) if color and color.startswith("#") and len(color) == 7 else color,
               "thickness": num(thickness), **kw})
    use(YJS, "property", f"Stroke.fill", f"Stroke.thickness", *[f"Stroke.{k}" for k in kw if kw[k] is not None])
    return f"<yjs:{owner}.{prop}><yjs:Stroke {a}/></yjs:{owner}.{prop}>"


def yjs_font(owner="LabelStyle", **kw):
    a = {"fontFamily": FONT, "fontSize": num(NEU["fontSize"])}
    a.update(kw)
    use(YJS, "property", *[f"Font.{k}" for k in a])
    return f"<yjs:{owner}.font><yjs:Font {attrs(a)}/></yjs:{owner}.font>"


def yjs_label_style(size=NEU["fontSize"], font=None, children="", **kw):
    a = {"textFill": argb(NEU["labelColor"]), "horizontalTextAlignment": "CENTER", "verticalTextAlignment": "CENTER"}
    a.update(kw)
    use(YJS, "property", *[f"LabelStyle.{k}" for k in a])
    use(YJS, "LabelStyle.font")
    return (f"<y:Label.Style><yjs:LabelStyle {attrs(a)}>{yjs_font(fontSize=num(size), **(font or {}))}{children}"
            "</yjs:LabelStyle></y:Label.Style>")


def yjs_param(kind, position=None, **kw):
    """A label model parameter, referring to its model in SharedData."""
    tag = {"interior": "InteriorNodeLabelModelParameter", "exterior": "ExteriorNodeLabelModelParameter",
           "stretch": "StretchNodeLabelModelParameter", "smart": "SmartEdgeLabelModelParameter",
           "nine": "NinePositionsEdgeLabelModelParameter", "path": "EdgePathLabelModelParameter",
           "segment": "EdgeSegmentLabelModelParameter"}[kind]
    a = {"Position": position} if position else {}
    a.update(kw)
    a["Model"] = f"{{y:GraphMLReference m-{kind}}}"
    return f"<y:Label.LayoutParameter><yx:{tag} {attrs(a)}/></y:Label.LayoutParameter>"


class YjsWriter:
    fmt = YJS

    def __init__(self, sheet):
        self.sheet = sheet
        self.nodes, self.edges = [], []
        self.shared = {}
        self.node_default = None
        self.edge_default = None

    def model(self, kind):
        self.shared[f"m-{kind}"] = YJS_MODELS[kind]

    def node_xml(self, nid, cx, cy, w, h, style, labels="", inner=None, extra_data=""):
        lab = f'\t\t\t<data key="d4">\n\t\t\t\t<x:List>{labels}</x:List>\n\t\t\t</data>\n' if labels else ""
        sty = f'\t\t\t<data key="d7">\n\t\t\t\t{style}\n\t\t\t</data>\n' if style is not None else ""
        body = (f"\t\t<node id={quoteattr(nid)}>\n{lab}\t\t\t<data key=\"d5\">\n"
                f'\t\t\t\t<y:RectD X="{num(cx - w / 2)}" Y="{num(cy - h / 2)}" Width="{num(w)}" Height="{num(h)}"/>\n'
                f"\t\t\t</data>\n{sty}{extra_data}")
        if inner is not None:
            body += f"\t\t\t<graph id={quoteattr(nid + ':')} edgedefault=\"directed\">\n" + "".join(inner) + "\t\t\t</graph>\n"
        return body + "\t\t</node>\n"

    def shape(self, nid, cx, cy, w=SIZE, h=SIZE, shape="ELLIPSE", fill=None, stroke=None, labels="", style=None,
              into=None, **kw):
        if style is None:
            a = {"shape": shape, "fill": argb(NEU["fill"]) if fill is None else fill, **kw}
            use(YJS, "ShapeNodeShape", shape)
            use(YJS, "property", *[f"ShapeNodeStyle.{k}" for k in a])
            st = ystroke() if stroke is None else stroke
            use(YJS, "property", "ShapeNodeStyle.stroke")
            style = f"<yjs:ShapeNodeStyle {attrs(a)}>{st}</yjs:ShapeNodeStyle>" if st else f"<yjs:ShapeNodeStyle {attrs(a)}/>"
        xml = self.node_xml(nid, cx, cy, w, h, style, labels)
        (self.nodes if into is None else into).append(xml)
        return xml

    def label(self, text, kind="interior", position="CENTER", style=None, param=None, **kw):
        """A label; position is the model's enumeration member (TOP_LEFT), written as yFiles spells it (TopLeft)."""
        self.model(kind)
        p = param if param is not None else yjs_param(kind, pascal(position) if position else None, **kw)
        if param is None and kind in ("interior", "exterior", "stretch"):
            use(YJS, f"{kind.capitalize()}NodeLabelModelPosition", position)
        return f"<y:Label Text={quoteattr(text)}>{p}{style if style is not None else yjs_label_style()}</y:Label>"

    def anchor(self, a):
        self.shape(a["id"], a["x"], a["y"], a["size"], a["size"], shape="RECTANGLE")

    def caption(self, nid, text, x, y):
        lw, lh = text_box(text, CAP)
        # text only: a fully transparent fill and stroke (yFiles writes #AARRGGBB, alpha first)
        self.shape(nid, x, y, lw, lh, style='<yjs:ShapeNodeStyle shape="RECTANGLE" fill="#00FFFFFF" stroke="#00FFFFFF"/>',
                   labels=self.label(text, style=yjs_label_style(CAP)))

    def end(self, nid, p):
        self.shape(nid, p["x"], p["y"], END, END, shape="ELLIPSE")

    def edge(self, eid, s, t, bends=(), style=None, labels="", ports=None):
        lab = f'\t\t\t<data key="d11">\n\t\t\t\t<x:List>{labels}</x:List>\n\t\t\t</data>\n' if labels else ""
        geo = ""
        if bends:
            geo = ('\t\t\t<data key="d12">\n\t\t\t\t<x:List>'
                   + "".join(f'<y:Bend Location="{num(x)},{num(y)}"/>' for x, y in bends) + "</x:List>\n\t\t\t</data>\n")
        sty = f'\t\t\t<data key="d13">\n\t\t\t\t{style}\n\t\t\t</data>\n' if style is not None else ""
        pa = f" sourceport={quoteattr(ports[0])} targetport={quoteattr(ports[1])}" if ports else ""
        self.edges.append(f"\t\t<edge id={quoteattr(eid)} source={quoteattr(s)} target={quoteattr(t)}{pa}>\n{lab}{geo}{sty}\t\t</edge>\n")

    def straight(self, eid, c, bends=(), style=None, labels=""):
        self.end(f"{eid}-s", c["source"])
        self.end(f"{eid}-t", c["target"])
        self.edge(eid, f"{eid}-s", f"{eid}-t", bends, poly() if style is None else style, labels)

    def document(self):
        shared = "".join(f"\t\t\t{v}\n" for _, v in sorted(self.shared.items()))
        nd = f">\n\t\t<default>\n\t\t\t{self.node_default}\n\t\t</default>\n\t</key>" if self.node_default else "/>"
        ed = f">\n\t\t<default>\n\t\t\t{self.edge_default}\n\t\t</default>\n\t</key>" if self.edge_default else "/>"
        head = YJS_HEAD.format(generator=GENERATOR, sid=self.sheet.id, about=escape(self.sheet.about), shared=shared,
                               node_default=nd, edge_default=ed)
        return head + "".join(self.nodes) + "".join(self.edges) + "\t</graph>\n</graphml>\n"


def yarrow(prop, typ="TRIANGLE", owner="PolylineEdgeStyle", **kw):
    a = {"type": typ, "fill": argb(NEU["edgeColor"]), "stroke": argb(NEU["edgeColor"]), **kw}
    use(YJS, "ArrowType", typ)
    use(YJS, "property", f"{owner}.{prop}", *[f"Arrow.{k}" for k in a])
    return f"<yjs:{owner}.{prop}><yjs:Arrow {attrs(a)}/></yjs:{owner}.{prop}>"


def poly(owner="PolylineEdgeStyle", stroke=None, target=None, source=None, **kw):
    use(YJS, "property", *[f"{owner}.{k}" for k in kw], f"{owner}.stroke")
    st = ystroke(NEU["edgeColor"], NEU["edgeWidth"], owner=owner) if stroke is None else stroke
    tg = yarrow("targetArrow", owner=owner) if target is None else target
    sc = yarrow("sourceArrow", "NONE", owner=owner) if source is None else source
    return f"<yjs:{owner} {attrs(kw)}>{st}{sc}{tg}</yjs:{owner}>"


def yjs_node_shapes():
    tv = VOCAB[YJS]["types"]
    s = Sheet(YJS, "specimen-node-shapes", "ShapeNodeStyle shapes, RectangleNodeStyle corners, ArrowNodeStyle shapes and directions")
    s.add("default", "ShapeNodeStyle=nothing set", lambda c, w: w.shape("default", c["x"], c["y"], style="<yjs:ShapeNodeStyle/>"))
    for shape in tv["ShapeNodeShape"]["field"]:
        sid = f"shape-{shape.lower().replace('_', '-')}"
        s.add(sid, f"shape={shape}", lambda c, w, sid=sid, shape=shape: w.shape(sid, c["x"], c["y"], shape=shape))
    s.add("shape-keep-aspect", "keepIntrinsicAspectRatio=true (STAR5 60x30)", lambda c, w: w.shape(
        "shape-keep-aspect", c["x"], c["y"], 60, 30, shape="STAR5", keepIntrinsicAspectRatio="true"))

    def rect(sid, cap, **kw):
        a = {"fill": argb(NEU["fill"]), **kw}
        use(YJS, "property", *[f"RectangleNodeStyle.{k}" for k in a], "RectangleNodeStyle.stroke")
        s.add(sid, cap, lambda c, w: w.shape(sid, c["x"], c["y"], 48, 36,
                                             style=f"<yjs:RectangleNodeStyle {attrs(a)}>{ystroke(owner='RectangleNodeStyle')}</yjs:RectangleNodeStyle>"))

    rect("rectangle-style", "RectangleNodeStyle")
    for cs in tv["RectangleCornerStyle"]["field"]:
        rect(f"corner-style-{cs.lower()}", f"cornerStyle={cs} cornerSize=10", cornerStyle=cs, cornerSize="10")
        use(YJS, "RectangleCornerStyle", cs)
    rect("corner-size-16", "cornerSize=16", cornerSize="16", cornerStyle="ROUND")
    rect("corners-top", "corners=TOP", corners="TOP", cornerSize="12", cornerStyle="ROUND")
    rect("scale-corner-size", "scaleCornerSize=true cornerSize=0.3", scaleCornerSize="true", cornerSize="0.3", cornerStyle="ROUND")

    def arrow_node(sid, cap, **kw):
        a = {"shape": "ARROW", "direction": "RIGHT", "fill": argb(NEU["fill"]), **kw}
        use(YJS, "ArrowStyleShape", a["shape"])
        use(YJS, "ArrowNodeDirection", a["direction"])
        use(YJS, "property", *[f"ArrowNodeStyle.{k}" for k in a], "ArrowNodeStyle.stroke")
        s.add(sid, cap, lambda c, w: w.shape(sid, c["x"], c["y"], 56, 32,
                                             style=f"<yjs:ArrowNodeStyle {attrs(a)}>{ystroke(owner='ArrowNodeStyle')}</yjs:ArrowNodeStyle>"))

    for shp in tv["ArrowStyleShape"]["field"]:
        arrow_node(f"arrow-node-{shp.lower().replace('_', '-')}", f"ArrowNodeStyle shape={shp}", shape=shp)
    for d in tv["ArrowNodeDirection"]["field"]:
        if d != "RIGHT":
            arrow_node(f"arrow-node-direction-{d.lower()}", f"direction={d}", direction=d)
    arrow_node("arrow-node-angle", "angle=0.6", angle="0.6")
    arrow_node("arrow-node-shaft-ratio", "shaftRatio=0.8", shaftRatio="0.8")
    return s


def yjs_fills_borders():
    tv = VOCAB[YJS]["types"]
    s = Sheet(YJS, "specimen-node-fills-borders", "fill color syntaxes (ARGB, named, CSS), linear and radial gradients; stroke color, thickness, dash styles, caps, joins")
    s.add("default", "ShapeNodeStyle=nothing set", lambda c, w: w.shape("default", c["x"], c["y"], style="<yjs:ShapeNodeStyle/>"))

    def node(sid, cap, **kw):
        s.add(sid, cap, lambda c, w: w.shape(sid, c["x"], c["y"], shape="RECTANGLE", **kw))

    for col in ["#FFFF0000", "#FF00AA00", "#FF0000FF", "#FFFFCC00", "#FF000000", "#FFFFFFFF"]:
        node(f"fill-{col[3:].lower()}", f"fill={col}", fill=col)
    for name in ["RED", "BLUE", "FIREBRICK", "CORNFLOWER_BLUE"]:
        node(f"fill-named-{name.lower().replace('_', '-')}", f"fill={name}", fill=name)
        use(YJS, "namedColor", name)
    node("fill-null", "fill={x:Null}", fill="{x:Null}")

    def styled(sid, cap, fill_child):
        s.add(sid, cap, lambda c, w: w.shape(sid, c["x"], c["y"], style=(
            '<yjs:ShapeNodeStyle shape="RECTANGLE"><yjs:ShapeNodeStyle.fill>' + fill_child +
            f"</yjs:ShapeNodeStyle.fill>{ystroke()}</yjs:ShapeNodeStyle>")))

    styled("fill-css-hex", "CssFill #3366ff", '<yjs:CssFill cssString="#3366ff"/>')
    styled("fill-css-rgb", "CssFill rgb(255,128,0)", '<yjs:CssFill cssString="rgb(255,128,0)"/>')
    styled("fill-css-named", "CssFill rebeccapurple", '<yjs:CssFill cssString="rebeccapurple"/>')
    styled("fill-solid-color-fill", "SolidColorFill #FF3366FF", '<yjs:SolidColorFill color="#FF3366FF"/>')
    use(YJS, "fillKind", "CssFill", "SolidColorFill", "Color")

    def grad(sid, cap, start, end, spread="PAD", stops=(("#FFFFFFFF", 0), ("#FF0000FF", 1))):
        st = "".join(f'<yjs:GradientStop color="{c_}" offset="{o}"/>' for c_, o in stops)
        styled(sid, cap, f'<yjs:LinearGradient spreadMethod="{spread}" startPoint="{start}" endPoint="{end}">{st}</yjs:LinearGradient>')
        use(YJS, "property", "LinearGradient.startPoint", "LinearGradient.endPoint", "LinearGradient.spreadMethod",
            "LinearGradient.gradientStops")

    grad("linear-gradient-diagonal", "LinearGradient 0,0 -> 1,1", "0,0", "1,1")
    grad("linear-gradient-horizontal", "LinearGradient 0,0.5 -> 1,0.5", "0,0.5", "1,0.5")
    grad("linear-gradient-vertical", "LinearGradient 0.5,0 -> 0.5,1", "0.5,0", "0.5,1")
    grad("linear-gradient-three-stops", "LinearGradient 3 stops", "0,0.5", "1,0.5",
         stops=(("#FFFF0000", 0), ("#FFFFCC00", 0.5), ("#FF0000FF", 1)))
    grad("linear-gradient-reflect", "spreadMethod=REFLECT", "0.4,0.5", "0.6,0.5", spread="REFLECT")
    styled("radial-gradient", "RadialGradient center 0.5,0.5 r 0.5",
           '<yjs:RadialGradient center="0.5,0.5" gradientOrigin="0.5,0.5" radius="0.5"><yjs:GradientStop color="#FFFFFFFF" offset="0"/>'
           '<yjs:GradientStop color="#FF0000FF" offset="1"/></yjs:RadialGradient>')
    styled("radial-gradient-origin", "RadialGradient origin 0.2,0.2",
           '<yjs:RadialGradient center="0.5,0.5" gradientOrigin="0.2,0.2" radius="0.5"><yjs:GradientStop color="#FFFFFFFF" offset="0"/>'
           '<yjs:GradientStop color="#FF0000FF" offset="1"/></yjs:RadialGradient>')
    styled("radial-gradient-reflect", "RadialGradient REFLECT r=0.25",
           '<yjs:RadialGradient center="0.5,0.5" gradientOrigin="0.5,0.5" radius="0.25" spreadMethod="REFLECT"><yjs:GradientStop color="#FFFFFFFF" offset="0"/>'
           '<yjs:GradientStop color="#FF0000FF" offset="1"/></yjs:RadialGradient>')
    use(YJS, "property", "RadialGradient.center", "RadialGradient.gradientOrigin", "RadialGradient.radius",
        "RadialGradient.gradientStops")
    for col in ["#FF0000", "#0000FF"]:
        node(f"stroke-color-{col[1:].lower()}", f"stroke fill={argb(col)}", stroke=ystroke(col, 2))
    s.add("stroke-null", "stroke={x:Null}", lambda c, w: w.shape(
        "stroke-null", c["x"], c["y"], style=f'<yjs:ShapeNodeStyle shape="RECTANGLE" fill="{argb(NEU["fill"])}" stroke="{{x:Null}}"/>'))
    for t in [0.5, 2, 3, 5, 8]:
        node(f"stroke-thickness-{num(t).replace('.', '-')}", f"thickness={num(t)}", stroke=ystroke(thickness=t))
    for d in ["SOLID", "DASH", "DOT", "DASH_DOT", "DASH_DOT_DOT"]:
        node(f"dash-{d.lower().replace('_', '-')}", f"dashStyle={d}", stroke=ystroke(thickness=2, dashStyle=d))
        use(YJS, "DashStyle", d)
    s.add("dash-custom", "DashStyle dashes=3 1 offset=0.5", lambda c, w: w.shape("dash-custom", c["x"], c["y"], shape="RECTANGLE", stroke=(
        f'<yjs:ShapeNodeStyle.stroke><yjs:Stroke fill="{argb(NEU["border"])}" thickness="2"><yjs:Stroke.dashStyle>'
        '<yjs:DashStyle dashes="3 1" offset="0.5"/></yjs:Stroke.dashStyle></yjs:Stroke></yjs:ShapeNodeStyle.stroke>')))
    use(YJS, "property", "DashStyle.dashes", "DashStyle.offset", "Stroke.dashStyle")
    for cap in tv["LineCap"]["field"]:
        node(f"line-cap-{cap.lower()}", f"lineCap={cap} (DASH 4)", stroke=ystroke(thickness=4, dashStyle="DASH", lineCap=cap))
        use(YJS, "LineCap", cap)
    for j in tv["LineJoin"]["field"]:
        s.add(f"line-join-{j.lower()}", f"lineJoin={j} (TRIANGLE 6)", lambda c, w, j=j: w.shape(
            f"line-join-{j.lower()}", c["x"], c["y"], shape="TRIANGLE", stroke=ystroke(thickness=6, lineJoin=j)))
        use(YJS, "LineJoin", j)
    s.add("miter-limit-1", "miterLimit=1 (TRIANGLE 6)", lambda c, w: w.shape(
        "miter-limit-1", c["x"], c["y"], shape="TRIANGLE", stroke=ystroke(thickness=6, miterLimit="1")))
    return s


def yjs_sizes_opacity():
    s = Sheet(YJS, "specimen-node-sizes-opacity", "RectD width and height, fill and stroke alpha (#AARRGGBB)", columns=8)
    s.add("default", "ShapeNodeStyle=nothing set", lambda c, w: w.shape("default", c["x"], c["y"], style="<yjs:ShapeNodeStyle/>"))
    for wd, ht in [(12, 12), (24, 24), (48, 48), (72, 72), (80, 20), (20, 80), (60, 36), (36, 60), (36.5, 36.5), (100, 50)]:
        sid = f"size-{num(wd).replace('.', '-')}x{num(ht).replace('.', '-')}"
        s.add(sid, f"Width={num(wd)} Height={num(ht)}",
              lambda c, w, sid=sid, wd=wd, ht=ht: w.shape(sid, c["x"], c["y"], wd, ht, shape="RECTANGLE"))
    for a in ["00", "40", "80", "C0"]:
        sid = f"fill-alpha-{a.lower()}"
        s.add(sid, f"fill=#{a}3366FF", lambda c, w, sid=sid, a=a: w.shape(sid, c["x"], c["y"], shape="RECTANGLE", fill=f"#{a}3366FF"))
    for a in ["40", "80"]:
        sid = f"stroke-alpha-{a.lower()}"
        s.add(sid, f"stroke fill=#{a}000000", lambda c, w, sid=sid, a=a: w.shape(
            sid, c["x"], c["y"], shape="RECTANGLE", stroke=ystroke(f"#{a}000000", 3)))
    return s


def yjs_labels():
    tv = VOCAB[YJS]["types"]
    s = Sheet(YJS, "specimen-labels", "LabelStyle font (family, size, style, weight, decoration, line spacing), text fill, background, shape, padding, alignment, wrapping")
    W, H = 60.0, 30.0

    def lab(sid, cap, text="Label", w=W, h=H, size=NEU["fontSize"], font=None, children="", **kw):
        s.add(sid, cap, lambda c, wr: wr.shape(sid, c["x"], c["y"], w, h, shape="RECTANGLE", labels=wr.label(
            text, style=yjs_label_style(size, font, children, **kw))))

    s.add("default", "Label=text only", lambda c, w: w.shape("default", c["x"], c["y"], W, H, shape="RECTANGLE",
                                                           labels='<y:Label Text="Label"/>'))
    for fam in ["DejaVu Sans", "DejaVu Serif", "DejaVu Sans Mono", "Arial", "Times New Roman", "Courier New", "sans-serif", "serif", "monospace"]:
        lab(f"font-family-{fam.lower().replace(' ', '-')}", f"fontFamily={fam}", "Agj", font={"fontFamily": fam})
    for size in [6, 8, 12, 16, 20, 24]:
        lab(f"font-size-{size}", f"fontSize={size}", "Ag", size=size)
    for st in tv["FontStyle"]["field"]:
        lab(f"font-style-{st.lower()}", f"fontStyle={st}", font={"fontStyle": st})
        use(YJS, "FontStyle", st)
    for wt in tv["FontWeight"]["field"]:
        lab(f"font-weight-{wt}", f"fontWeight={wt}", font={"fontWeight": wt})
        use(YJS, "FontWeight", wt)
    lab("font-weight-700", "fontWeight=700", font={"fontWeight": "700"})
    for d in tv["TextDecorations"]["field"]:
        lab(f"text-decoration-{d.lower().replace('_', '-')}", f"textDecoration={d}", font={"textDecoration": d})
        use(YJS, "TextDecorations", d)
    lab("line-spacing-1", "lineSpacing=1 (two lines)", "One\nTwo", h=48, font={"lineSpacing": "1"})
    for col in ["#FF0000", "#0000FF"]:
        lab(f"text-fill-{col[1:].lower()}", f"textFill={argb(col)}", textFill=argb(col))
    lab("background-fill", "backgroundFill=#FFFFFF99", backgroundFill="#FFFFFF99")
    lab("background-stroke", "backgroundStroke=#FFFF0000", backgroundStroke="#FFFF0000")
    for shp in tv["LabelShape"]["field"]:
        lab(f"label-shape-{shp.lower().replace('_', '-')}", f"shape={shp}", backgroundFill="#FFFFFF99",
            backgroundStroke="#FF000000", shape=shp)
        use(YJS, "LabelShape", shp)
    lab("padding-6", "padding=6", backgroundFill="#FFFFFF99", padding="6")
    for al in tv["HorizontalTextAlignment"]["field"]:
        lab(f"h-align-{al.lower()}", f"horizontalTextAlignment={al}", "Wide line\nab", h=40, horizontalTextAlignment=al)
        use(YJS, "HorizontalTextAlignment", al)
    for al in tv["VerticalTextAlignment"]["field"]:
        lab(f"v-align-{al.lower()}", f"verticalTextAlignment={al}", verticalTextAlignment=al, minimumSize="50,26")
        use(YJS, "VerticalTextAlignment", al)
    for wr in tv["TextWrapping"]["field"]:
        lab(f"wrapping-{wr.lower().replace('_', '-')}", f"wrapping={wr}", "A long label text", wrapping=wr,
            maximumSize="56,26")
        use(YJS, "TextWrapping", wr)
    lab("multi-line", "Text=two lines", "First\nSecond", h=40)
    s.add("two-labels", "two Labels", lambda c, w: w.shape("two-labels", c["x"], c["y"], W, H, shape="RECTANGLE", labels=(
        w.label("Top", position="TOP") + w.label("Bottom", position="BOTTOM"))))
    use(YJS, "property", "LabelStyle.minimumSize", "LabelStyle.maximumSize")

    p = Sheet(YJS, "specimen-labels-p2", "LabelStyle wrapping; node label models and positions: InteriorNodeLabelModel, ExteriorNodeLabelModel, StretchNodeLabelModel, FreeNodeLabelModel", caption_dy=54)
    p.add("default", "Label=text only", lambda c, w: w.shape("default", c["x"], c["y"], 40, 26, shape="RECTANGLE",
                                                           labels='<y:Label Text="Lbl"/>'))
    p.items.extend(x for x in s.items if x[0].startswith("wrapping-"))
    s.items[:] = [x for x in s.items if not x[0].startswith("wrapping-")]
    for kind, enum in [("interior", "InteriorNodeLabelModelPosition"), ("exterior", "ExteriorNodeLabelModelPosition"),
                       ("stretch", "StretchNodeLabelModelPosition")]:
        for pos in tv[enum]["field"]:
            sid = f"model-{kind}-{pos.lower().replace('_', '-')}"
            p.add(sid, f"{kind} {pos}", lambda c, w, sid=sid, kind=kind, pos=pos: w.shape(
                sid, c["x"], c["y"], 40, 26, shape="RECTANGLE", labels=w.label("Lbl", kind, pos)))
    for sid, off in [("model-free-offset", "30,-18"), ("model-free-offset-left", "-50,24")]:
        p.add(sid, f"FreeNodeLabelModel LayoutOffset={off}", lambda c, w, sid=sid, off=off: w.shape(
            sid, c["x"], c["y"], 40, 26, shape="RECTANGLE", labels=w.label(
                "Lbl", param=f'<y:Label.LayoutParameter><yx:FreeNodeLabelModelParameter LayoutOffset="{off}"/></y:Label.LayoutParameter>')))
    use(YJS, "property", "FreeNodeLabelModel.INSTANCE")
    p.add("model-interior-padding", "InteriorNodeLabelModel Padding=8", lambda c, w: (
        w.shared.__setitem__("m-interior-pad", '<yx:InteriorNodeLabelModel x:Key="m-interior-pad" Padding="8"/>'),
        w.shape("model-interior-padding", c["x"], c["y"], 40, 26, shape="RECTANGLE", labels=w.label(
            "Lbl", param='<y:Label.LayoutParameter><yx:InteriorNodeLabelModelParameter Position="TopLeft" Model="{y:GraphMLReference m-interior-pad}"/></y:Label.LayoutParameter>'))))
    p.add("model-exterior-margins", "ExteriorNodeLabelModel Margins=15", lambda c, w: (
        w.shared.__setitem__("m-exterior-15", '<yx:ExteriorNodeLabelModel x:Key="m-exterior-15" Margins="15"/>'),
        w.shape("model-exterior-margins", c["x"], c["y"], 40, 26, shape="RECTANGLE", labels=w.label(
            "Lbl", param='<y:Label.LayoutParameter><yx:ExteriorNodeLabelModelParameter Position="Top" Model="{y:GraphMLReference m-exterior-15}"/></y:Label.LayoutParameter>'))))
    p.add("model-stretch-padding", "StretchNodeLabelModel Padding=6", lambda c, w: (
        w.shared.__setitem__("m-stretch-pad", '<yx:StretchNodeLabelModel x:Key="m-stretch-pad" Padding="6"/>'),
        w.shape("model-stretch-padding", c["x"], c["y"], 40, 26, shape="RECTANGLE", labels=w.label(
            "Lbl", param='<y:Label.LayoutParameter><yx:StretchNodeLabelModelParameter Position="Top" Model="{y:GraphMLReference m-stretch-pad}"/></y:Label.LayoutParameter>'))))
    return s


def yjs_edges_lines():
    s = Sheet(YJS, "specimen-edges-lines", "PolylineEdgeStyle stroke color, thickness, dash styles, caps, smoothing; bends; BezierEdgeStyle; ArcEdgeStyle; loops, parallel edges")
    s.add("default", "EdgeStyle=nothing set", lambda c, w: w.straight("default", c, style="<yjs:PolylineEdgeStyle/>"))

    def e(sid, cap, bends=None, **kw):
        s.add(sid, cap, lambda c, w: w.straight(sid, c, bends(c) if bends else (), **kw))

    for col in ["#FF0000", "#0000FF", "#00AA00"]:
        e(f"color-{col[1:].lower()}", f"stroke fill={argb(col)}",
          style=poly(stroke=ystroke(col, NEU["edgeWidth"], owner="PolylineEdgeStyle")))
    e("color-alpha-80", "stroke fill=#80000000 thickness=4",
      style=poly(stroke=ystroke("#80000000", 4, owner="PolylineEdgeStyle")))
    for t in [0.5, 1, 2, 3, 5, 8]:
        e(f"width-{num(t).replace('.', '-')}", f"thickness={num(t)}",
          style=poly(stroke=ystroke(NEU["edgeColor"], t, owner="PolylineEdgeStyle")))
    for d in ["SOLID", "DASH", "DOT", "DASH_DOT", "DASH_DOT_DOT"]:
        e(f"dash-{d.lower().replace('_', '-')}", f"dashStyle={d}",
          style=poly(stroke=ystroke(NEU["edgeColor"], 2, owner="PolylineEdgeStyle", dashStyle=d)))
    for cap_ in ["FLAT", "ROUND", "SQUARE"]:
        e(f"line-cap-{cap_.lower()}", f"lineCap={cap_} (DASH 4)",
          style=poly(stroke=ystroke(NEU["edgeColor"], 4, owner="PolylineEdgeStyle", dashStyle="DASH", lineCap=cap_)))
    e("stroke-null", "stroke={x:Null}", style=f'<yjs:PolylineEdgeStyle stroke="{{x:Null}}">{yarrow("sourceArrow", "NONE")}{yarrow("targetArrow")}</yjs:PolylineEdgeStyle>')
    e("bends-one", "1 bend", bends=lambda c: [(c["x"], c["y"] - 30)])
    e("bends-two", "2 bends", bends=lambda c: [(c["x"] - 20, c["y"] - 30), (c["x"] + 20, c["y"] + 30)])
    for sl in [5, 20]:
        e(f"smoothing-length-{sl}", f"smoothingLength={sl}", bends=lambda c: [(c["x"] - 20, c["y"] - 30), (c["x"] + 20, c["y"] - 30)],
          style=poly(smoothingLength=str(sl)))
    e("bezier", "BezierEdgeStyle 2 control points", bends=lambda c: [(c["x"] - 20, c["y"] - 35), (c["x"] + 20, c["y"] + 35)],
      style=poly(owner="BezierEdgeStyle"))
    e("bezier-five", "BezierEdgeStyle 5 control points", bends=lambda c: [
        (c["x"] - 25, c["y"] - 30), (c["x"] - 10, c["y"] - 30), (c["x"], c["y"]), (c["x"] + 10, c["y"] + 30), (c["x"] + 25, c["y"] + 30)],
      style=poly(owner="BezierEdgeStyle"))
    for ht in [20, -20]:
        e(f"arc-height-{'minus-' if ht < 0 else ''}{abs(ht)}", f"ArcEdgeStyle height={ht}", style=poly(owner="ArcEdgeStyle", height=str(ht)))
    e("arc-fixed-height-false", "ArcEdgeStyle fixedHeight=false height=0.5", style=poly(owner="ArcEdgeStyle", height="0.5", fixedHeight="false"))

    def loop(c, w):
        w.shape("loop-n", c["x"], c["y"], 24, 24, shape="ELLIPSE")
        w.edge("loop", "loop-n", "loop-n", [(c["x"] - 8, c["y"] - 34), (c["x"] + 8, c["y"] - 34)], poly())

    s.add("loop", "self loop (2 bends)", loop)

    def parallel(c, w):
        w.end("parallel-s", c["source"])
        w.end("parallel-t", c["target"])
        w.edge("parallel-a", "parallel-s", "parallel-t", [(c["x"], c["y"] - 14)], poly(stroke=ystroke("#FF0000", 1.5, owner="PolylineEdgeStyle")))
        w.edge("parallel-b", "parallel-s", "parallel-t", [(c["x"], c["y"] + 14)], poly(stroke=ystroke("#0000FF", 1.5, owner="PolylineEdgeStyle")))

    s.add("parallel", "two parallel edges", parallel)
    return s


def yjs_arrows():
    tv = VOCAB[YJS]["types"]
    s = Sheet(YJS, "specimen-arrows", "every ArrowType at the target and at the source; arrow fill, stroke, length and width scale, crop length")
    s.add("default", "arrows=nothing set", lambda c, w: w.straight("default", c, style=f"<yjs:PolylineEdgeStyle>{ystroke(NEU['edgeColor'], NEU['edgeWidth'], owner='PolylineEdgeStyle')}</yjs:PolylineEdgeStyle>"))
    for at in tv["ArrowType"]["field"]:
        sid = f"target-{at.lower()}"
        s.add(sid, f"targetArrow={at}", lambda c, w, sid=sid, at=at: w.straight(sid, c, style=poly(target=yarrow("targetArrow", at))))
    for at in tv["ArrowType"]["field"]:
        if at == "NONE":
            continue
        sid = f"source-{at.lower()}"
        s.add(sid, f"sourceArrow={at}", lambda c, w, sid=sid, at=at: w.straight(sid, c, style=poly(
            target=yarrow("targetArrow", "NONE"), source=yarrow("sourceArrow", at))))
    for sid, cap, kw in [("arrow-fill-ff0000", "Arrow fill=#FFFF0000", {"fill": "#FFFF0000"}),
                         ("arrow-stroke-ff0000", "Arrow stroke=#FFFF0000", {"stroke": "#FFFF0000"}),
                         ("arrow-fill-null", "Arrow fill={x:Null}", {"fill": "{x:Null}"}),
                         ("arrow-length-scale-2", "lengthScale=2", {"lengthScale": "2"}),
                         ("arrow-width-scale-2", "widthScale=2", {"widthScale": "2"}),
                         ("arrow-crop-length-6", "cropLength=6", {"cropLength": "6"}),
                         ("arrow-crop-at-port-true", "cropAtPort=true", {"cropAtPort": "true"}),
                         ("arrow-length-12", "length=12", {"length": "12"})]:
        s.add(sid, cap, lambda c, w, sid=sid, kw=kw: w.straight(sid, c, style=poly(target=yarrow("targetArrow", "TRIANGLE", **kw))))
    return s


def yjs_edge_labels():
    tv = VOCAB[YJS]["types"]
    s = Sheet(YJS, "specimen-edge-labels", "edge label text and LabelStyle; SmartEdgeLabelModel, NinePositionsEdgeLabelModel, EdgePathLabelModel, EdgeSegmentLabelModel, FreeEdgeLabelModel")

    def el(sid, cap, text="Lbl", kind="smart", param=None, style=None, **kw):
        s.add(sid, cap, lambda c, w: w.straight(sid, c, labels=w.label(text, kind, None, style=style, param=param, **kw)))

    s.add("default", "Label=text only", lambda c, w: w.straight("default", c, labels='<y:Label Text="Lbl"/>'))
    for fam in ["DejaVu Serif", "DejaVu Sans Mono"]:
        el(f"font-family-{fam.lower().replace(' ', '-')}", f"fontFamily={fam}", "Agj", style=yjs_label_style(font={"fontFamily": fam}))
    for size in [6, 12, 18]:
        el(f"font-size-{size}", f"fontSize={size}", "Ag", style=yjs_label_style(size))
    el("font-style-italic", "fontStyle=ITALIC", style=yjs_label_style(font={"fontStyle": "ITALIC"}))
    el("font-weight-bold", "fontWeight=bold", style=yjs_label_style(font={"fontWeight": "bold"}))
    el("text-fill-ff0000", "textFill=#FFFF0000", style=yjs_label_style(textFill="#FFFF0000"))
    el("background-fill", "backgroundFill=#FFFFFF99", style=yjs_label_style(backgroundFill="#FFFFFF99"))
    el("background-stroke", "backgroundStroke=#FFFF0000", style=yjs_label_style(backgroundStroke="#FFFF0000"))
    el("auto-flip-false", "autoFlip=false", style=yjs_label_style(autoFlip="false"))
    use(YJS, "property", "LabelStyle.autoFlip")
    for pos in tv["NinePositionsEdgeLabelModelPosition"]["field"]:
        el(f"model-nine-{pos.lower().replace('_', '-')}", f"NinePositions {pos}", kind="nine",
           param=yjs_param("nine", pascal(pos)))
        use(YJS, "NinePositionsEdgeLabelModelPosition", pos)
    for sid, kw in [("model-smart-center", {"Ratio": "0.5", "Distance": "0"}), ("model-smart-ratio-0-2", {"Ratio": "0.2", "Distance": "0", "Segment": "0"}),
                    ("model-smart-distance-12", {"Ratio": "0.5", "Distance": "12"}),
                    ("model-smart-distance-minus-12", {"Ratio": "0.5", "Distance": "-12"}),
                    ("model-smart-place-along-false", {"Ratio": "0.5", "Distance": "10", "PlaceAlongEdge": "false"})]:
        el(sid, "Smart " + " ".join(f"{k}={v}" for k, v in kw.items() if k != "Ratio" or v != "0.5"), kind="smart",
           param=yjs_param("smart", **kw))
    use(YJS, "property", "SmartEdgeLabelModelParameter.ratio", "SmartEdgeLabelModelParameter.distance",
        "SmartEdgeLabelModelParameter.placeAlongEdge", "SmartEdgeLabelModelParameter.segment",
        "SmartEdgeLabelModelParameter.model")
    for side in tv["EdgeSides"]["field"]:
        el(f"model-path-{side.lower().replace('_', '-')}", f"EdgePath sideOfEdge={side}", kind="path",
           param=yjs_param("path", Ratio="0.5", SideOfEdge=pascal(side)))
        use(YJS, "EdgeSides", side)
    el("model-segment-0-25", "EdgeSegment Ratio=0.25 above", kind="segment",
       param=yjs_param("segment", Ratio="0.25", Segment="0", SideOfEdge="AboveEdge"))
    el("model-free-edge", "FreeEdge Ratio=0.5 Distance=-20", kind="smart",
       param='<y:Label.LayoutParameter><yx:FreeEdgeLabelModelParameter Ratio="0.5" Distance="-20" Angle="0"/></y:Label.LayoutParameter>')
    el("model-free-edge-angle", "FreeEdgeLabelModel Angle=0.7", kind="smart",
       param='<y:Label.LayoutParameter><yx:FreeEdgeLabelModelParameter Ratio="0.5" Distance="-14" Angle="0.7"/></y:Label.LayoutParameter>')
    s.add("model-smart-angle", "SmartEdgeLabelModel angle=0.7", lambda c, w: (
        w.shared.__setitem__("m-smart-angle", '<yx:SmartEdgeLabelModel x:Key="m-smart-angle" Angle="0.7"/>'),
        w.straight("model-smart-angle", c, labels=w.label("Lbl", "smart", param=(
            '<y:Label.LayoutParameter><yx:SmartEdgeLabelModelParameter Ratio="0.5" Distance="-12" '
            'Model="{y:GraphMLReference m-smart-angle}"/></y:Label.LayoutParameter>')))))
    def model_variant(sid, cap, key, model_xml, param_tag, param_attrs, bends=False):
        s.add(sid, cap, lambda c, w: (
            w.shared.__setitem__(key, model_xml),
            w.straight(sid, c, bends=[(c["x"], c["y"] - 30)] if bends else (), labels=w.label("Lbl", "smart", param=(
                f'<y:Label.LayoutParameter><yx:{param_tag} {param_attrs} Model="{{y:GraphMLReference {key}}}"/></y:Label.LayoutParameter>')))))

    model_variant("model-smart-auto-rotation-false", "Smart autoRotation=false (1 bend)", "m-smart-norot",
                  '<yx:SmartEdgeLabelModel x:Key="m-smart-norot" AutoRotation="false"/>', "SmartEdgeLabelModelParameter",
                  'Ratio="0.25" Distance="-10"', bends=True)
    model_variant("model-path-angle", "EdgePathLabelModel angle=0.7", "m-path-angle",
                  '<yx:EdgePathLabelModel x:Key="m-path-angle" Distance="5" Angle="0.7"/>', "EdgePathLabelModelParameter",
                  'Ratio="0.5" SideOfEdge="AboveEdge"')
    model_variant("model-segment-angle", "EdgeSegmentLabelModel angle=0.7", "m-segment-angle",
                  '<yx:EdgeSegmentLabelModel x:Key="m-segment-angle" Distance="5" Angle="0.7"/>', "EdgeSegmentLabelModelParameter",
                  'Ratio="0.5" Segment="0" SideOfEdge="AboveEdge"')
    model_variant("model-segment-auto-rotation-false", "Segment autoRotation=false (1 bend)", "m-segment-norot",
                  '<yx:EdgeSegmentLabelModel x:Key="m-segment-norot" Distance="5" AutoRotation="false"/>', "EdgeSegmentLabelModelParameter",
                  'Ratio="0.5" Segment="0" SideOfEdge="AboveEdge"', bends=True)
    model_variant("model-nine-angle", "NinePositionsEdgeLabelModel angle=0.7", "m-nine-angle",
                  '<yx:NinePositionsEdgeLabelModel x:Key="m-nine-angle" Distance="5" Angle="0.7"/>', "NinePositionsEdgeLabelModelParameter",
                  'Position="CenterAbove"')
    s.add("model-path-auto-rotation-false", "EdgePathLabelModel autoRotation=false", lambda c, w: (
        w.shared.__setitem__("m-path-norot", '<yx:EdgePathLabelModel x:Key="m-path-norot" Distance="5" AutoRotation="false"/>'),
        w.straight("model-path-auto-rotation-false", c, bends=[(c["x"], c["y"] - 30)], labels=w.label("Lbl", "path", param=(
            '<y:Label.LayoutParameter><yx:EdgePathLabelModelParameter Ratio="0.5" SideOfEdge="AboveEdge" '
            'Model="{y:GraphMLReference m-path-norot}"/></y:Label.LayoutParameter>')))))
    use(YJS, "property", "SmartEdgeLabelModel.angle", "SmartEdgeLabelModel.autoRotation", "EdgePathLabelModel.autoRotation",
        "EdgePathLabelModel.distance", "EdgePathLabelModel.sideOfEdge", "EdgeSegmentLabelModel.distance",
        "EdgeSegmentLabelModel.sideOfEdge", "NinePositionsEdgeLabelModel.distance", "FreeEdgeLabelModel.INSTANCE")
    return s


def yjs_groups():
    tv = VOCAB[YJS]["types"]
    items = [("group-default", "GroupNodeStyle=nothing set", {}, None)]
    for tp in tv["GroupNodeStyleTabPosition"]["field"]:
        items.append((f"tab-position-{tp.lower().replace('_', '-')}", f"tabPosition={tp}", {"tabPosition": tp}, "GroupNodeStyleTabPosition"))
    for ic in tv["GroupNodeStyleIconType"]["field"]:
        items.append((f"group-icon-{ic.lower().replace('_', '-')}", f"groupIcon={ic}", {"groupIcon": ic}, "GroupNodeStyleIconType"))
    for sh in tv["GroupNodeStyleIconBackgroundShape"]["field"]:
        items.append((f"icon-background-{sh.lower().replace('_', '-')}", f"iconBackgroundShape={sh}",
                      {"groupIcon": "MINUS", "iconBackgroundShape": sh}, "GroupNodeStyleIconBackgroundShape"))
    for ip in tv["GroupNodeStyleIconPosition"]["field"]:
        items.append((f"icon-position-{ip.lower()}", f"iconPosition={ip}", {"groupIcon": "MINUS", "iconPosition": ip}, "GroupNodeStyleIconPosition"))
    for sid, cap, kw in [("tab-fill", "tabFill=#FFFF9900", {"tabFill": "#FFFF9900"}),
                         ("tab-background-fill", "tabBackgroundFill=#FF3366FF", {"tabBackgroundFill": "#FF3366FF"}),
                         ("content-area-fill", "contentAreaFill=#FFFFFFCC", {"contentAreaFill": "#FFFFFFCC"}),
                         ("content-area-padding", "contentAreaPadding=12", {"contentAreaPadding": "12"}),
                         ("corner-radius-0", "cornerRadius=0", {"cornerRadius": "0"}),
                         ("corner-radius-12", "cornerRadius=12", {"cornerRadius": "12"}),
                         ("draw-shadow", "drawShadow=true", {"drawShadow": "true"}),
                         ("tab-height-30", "tabHeight=30", {"tabHeight": "30"}),
                         ("tab-width-90", "tabWidth=90", {"tabWidth": "90"}),
                         ("tab-slope-0-5", "tabSlope=0.5", {"tabSlope": "0.5"}),
                         ("tab-padding-8", "tabPadding=8", {"tabPadding": "8"}),
                         ("tab-size-policy-adjust", "tabSizePolicy=ADJUST_TO_LABEL", {"tabSizePolicy": "ADJUST_TO_LABEL"}),
                         ("icon-size-20", "iconSize=20", {"groupIcon": "MINUS", "iconSize": "20"}),
                         ("icon-offset-8", "iconOffset=8", {"groupIcon": "MINUS", "iconOffset": "8"}),
                         ("icon-foreground-fill", "iconForegroundFill=#FFFF0000", {"groupIcon": "MINUS", "iconForegroundFill": "#FFFF0000"}),
                         ("icon-background-fill", "iconBackgroundFill=#FF00AA00", {"groupIcon": "MINUS", "iconBackgroundFill": "#FF00AA00"}),
                         ("stroke-group", "stroke #FFFF0000 2", {"_stroke": ("#FF0000", 2)}),
                         ("render-transparent-content", "renderTransparentContentArea=true", {"contentAreaFill": "#80FFFFFF", "renderTransparentContentArea": "true"})]:
        items.append((sid, cap, kw, None))
    pages = [items[i:i + 20] for i in range(0, len(items), 20)]
    sheets = []
    for k, page in enumerate(pages, start=1):
        sid_ = "specimen-groups" if k == 1 else f"specimen-groups-p{k}"
        s = Sheet(YJS, sid_, "GroupNodeStyle: tab position, group icon, icon background, fills, corner radius, shadow, tab size; nested and collapsed groups",
                  columns=5, caption_dy=52)
        if k == 1:
            s.add("default", "GroupNodeStyle=nothing set", lambda c, w: w.nodes.append(w.node_xml(
                "default", c["x"], c["y"], 150, 80, "<yjs:GroupNodeStyle/>", inner=[w.shape("default-m0", c["x"], c["y"] + 10, 20, 20, into=[])])))
            page = [x for x in page if x[0] != "group-default"]
        for sid, cap, kw, enum in page:
            if enum:
                use(YJS, enum, kw[{"GroupNodeStyleTabPosition": "tabPosition", "GroupNodeStyleIconType": "groupIcon",
                                   "GroupNodeStyleIconBackgroundShape": "iconBackgroundShape",
                                   "GroupNodeStyleIconPosition": "iconPosition"}[enum]])

            def fn(c, w, sid=sid, kw=kw):
                kw = dict(kw)
                stroke = kw.pop("_stroke", None)
                use(YJS, "property", *[f"GroupNodeStyle.{x}" for x in kw], "GroupNodeStyle.stroke")
                st = ystroke(*stroke, owner="GroupNodeStyle") if stroke else ystroke(owner="GroupNodeStyle")
                style = f'<yjs:GroupNodeStyle {attrs({"tabFill": argb(NEU["fill"]), **kw})}>{st}</yjs:GroupNodeStyle>'
                inner = [w.shape(f"{sid}-m0", c["x"] - 25, c["y"] + 10, 20, 20, into=[]),
                         w.shape(f"{sid}-m1", c["x"] + 25, c["y"] + 10, 20, 20, into=[])]
                w.nodes.append(w.node_xml(sid, c["x"], c["y"], 150, 80, style,
                                          labels=w.label("Group", "stretch", "TOP"), inner=inner))
            s.add(sid, cap, fn)
        sheets.append(s)
    last = sheets[-1]

    def nested(c, w):
        inner_m = [w.shape("group-nested-inner-m0", c["x"], c["y"] + 14, 16, 16, into=[])]
        inner = w.node_xml("group-nested-inner", c["x"], c["y"] + 8, 110, 50, f'<yjs:GroupNodeStyle tabFill="#FF99CCFF">{ystroke(owner="GroupNodeStyle")}</yjs:GroupNodeStyle>',
                           inner=inner_m)
        w.nodes.append(w.node_xml("group-nested", c["x"], c["y"], 150, 80,
                                  f'<yjs:GroupNodeStyle tabFill="{argb(NEU["fill"])}">{ystroke(owner="GroupNodeStyle")}</yjs:GroupNodeStyle>',
                                  inner=[inner]))

    last.add("group-nested", "group in a group", nested)

    def collapsed(c, w):
        inner = [w.shape("group-collapsed-m0", c["x"], c["y"] + 10, 20, 20, into=[])]
        w.nodes.append(w.node_xml("group-collapsed", c["x"], c["y"], 150, 80,
                                  f'<yjs:GroupNodeStyle tabFill="{argb(NEU["fill"])}" groupIcon="PLUS" folderIcon="PLUS">{ystroke(owner="GroupNodeStyle")}</yjs:GroupNodeStyle>',
                                  inner=inner, extra_data='\t\t\t<data key="d1">false</data>\n'))
        use(YJS, "property", "GroupNodeStyle.folderIcon")

    last.add("group-collapsed", "Expanded=false", collapsed)
    return sheets


def yjs_images():
    s = Sheet(YJS, "specimen-images-charts", "ImageNodeStyle: image, aspect ratio, background fill, shape and stroke", columns=6)
    uri = "data:image/png;base64," + b64(QUADRANT_PNG)
    svg_uri = "data:image/svg+xml;base64," + b64(SVG_ICON.encode("ascii"))
    s.add("default", "ImageNodeStyle=nothing set", lambda c, w: w.shape("default", c["x"], c["y"], style="<yjs:ImageNodeStyle/>"))

    def img(sid, cap, wd=SIZE, ht=SIZE, **kw):
        a = {"href": uri, **kw}
        use(YJS, "property", *[f"ImageNodeStyle.{k}" for k in a])
        s.add(sid, cap, lambda c, w: w.shape(sid, c["x"], c["y"], wd, ht, style=f"<yjs:ImageNodeStyle {attrs(a)}/>"))

    img("image-png", "href=PNG data URI")
    img("image-svg", "href=SVG data URI", href=svg_uri)
    img("image-wide", "60x30 (aspectRatio unset)", 60, 30)
    img("image-aspect-ratio", "aspectRatio=1 at 60x30", 60, 30, aspectRatio="1")
    img("image-background-fill", "backgroundFill=#FFFFCC00", 48, 48, backgroundFill="#FFFFCC00")
    img("image-background-shape", "backgroundShape=ELLIPSE", 48, 48, backgroundFill="#FFFFCC00", backgroundShape="ELLIPSE")
    img("image-background-stroke", "backgroundStroke=#FFFF0000", 48, 48, backgroundFill="#FFFFCC00", backgroundStroke="#FFFF0000")
    img("image-normalized-outline", "normalizedOutline (circle)", 48, 48, normalizedOutline="{x:Null}")
    return s


def yjs_mappings():
    s = Sheet(YJS, "specimen-mappings-bypass", "the same styles reached three ways: inline, by SharedData reference (x:Key / GraphMLReference), and by the key's default")

    def setup(w):
        w.shared["s-fill"] = f'<yjs:ShapeNodeStyle x:Key="s-fill" shape="RECTANGLE" fill="#FFFF0000">{ystroke()}</yjs:ShapeNodeStyle>'
        w.shared["s-stroke"] = f'<yjs:Stroke x:Key="s-stroke" fill="#FF0000FF" thickness="4"/>'
        w.shared["s-color"] = '<yjs:SolidColorFill x:Key="s-color" color="#FF00AA00"/>'
        w.shared["s-label"] = (f'<yjs:LabelStyle x:Key="s-label" textFill="#FFFF0000" horizontalTextAlignment="CENTER" '
                               f'verticalTextAlignment="CENTER">{yjs_font()}</yjs:LabelStyle>')
        w.shared["s-edge"] = poly(stroke=ystroke("#0000FF", 3, owner="PolylineEdgeStyle")).replace("<yjs:PolylineEdgeStyle ", '<yjs:PolylineEdgeStyle x:Key="s-edge" ', 1)
        w.shared["s-arrow"] = f'<yjs:Arrow x:Key="s-arrow" type="DIAMOND" fill="{argb(NEU["edgeColor"])}" stroke="{argb(NEU["edgeColor"])}"/>'
        w.node_default = f'<yjs:ShapeNodeStyle shape="HEXAGON" fill="#FFFFCC00">{ystroke()}</yjs:ShapeNodeStyle>'
        w.edge_default = poly(stroke=ystroke("#00AA00", 3, owner="PolylineEdgeStyle"))

    once = {}

    def node(sid, cap, style):
        def fn(c, w):
            if not once.get(id(w)):
                setup(w)
                once[id(w)] = True
            w.shape(sid, c["x"], c["y"], shape="RECTANGLE", style=style)
        s.add(sid, cap, fn)

    s.add("default", "NodeStyle=key default (no data)", lambda c, w: (setup(w) if not once.get(id(w)) else None,
                                                                      once.__setitem__(id(w), True),
                                                                      w.nodes.append(w.node_xml("default", c["x"], c["y"], SIZE, SIZE, None))))
    node("fill-inline", "fill=#FFFF0000 inline", f'<yjs:ShapeNodeStyle shape="RECTANGLE" fill="#FFFF0000">{ystroke()}</yjs:ShapeNodeStyle>')
    node("fill-reference", "style by reference (s-fill)", '<y:GraphMLReference ResourceKey="s-fill"/>')
    node("stroke-inline", "stroke #FF0000FF 4 inline", f'<yjs:ShapeNodeStyle shape="RECTANGLE" fill="{argb(NEU["fill"])}">{ystroke("#0000FF", 4)}</yjs:ShapeNodeStyle>')
    node("stroke-reference", "stroke by reference (s-stroke)", f'<yjs:ShapeNodeStyle shape="RECTANGLE" fill="{argb(NEU["fill"])}" stroke="{{y:GraphMLReference s-stroke}}"/>')
    node("color-inline", "fill SolidColorFill #FF00AA00 inline", '<yjs:ShapeNodeStyle shape="RECTANGLE"><yjs:ShapeNodeStyle.fill>'
         f'<yjs:SolidColorFill color="#FF00AA00"/></yjs:ShapeNodeStyle.fill>{ystroke()}</yjs:ShapeNodeStyle>')
    node("color-reference", "fill by reference (s-color)", f'<yjs:ShapeNodeStyle shape="RECTANGLE" fill="{{y:GraphMLReference s-color}}">{ystroke()}</yjs:ShapeNodeStyle>')
    node("key-default-explicit", "the key default, written inline", f'<yjs:ShapeNodeStyle shape="HEXAGON" fill="#FFFFCC00">{ystroke()}</yjs:ShapeNodeStyle>')

    def labeled(sid, cap, style_xml):
        def fn(c, w):
            if not once.get(id(w)):
                setup(w)
                once[id(w)] = True
            w.shape(sid, c["x"], c["y"], 60, 30, shape="RECTANGLE", labels=w.label("Label", style=style_xml))
        s.add(sid, cap, fn)

    labeled("label-inline", "label textFill=#FFFF0000 inline", yjs_label_style(textFill="#FFFF0000"))
    labeled("label-reference", "label style by reference (s-label)", '<y:Label.Style><y:GraphMLReference ResourceKey="s-label"/></y:Label.Style>')

    def edge(sid, cap, style):
        def fn(c, w):
            if not once.get(id(w)):
                setup(w)
                once[id(w)] = True
            w.straight(sid, c, style=style)
        s.add(sid, cap, fn)

    edge("edge-inline", "edge stroke #FF0000FF 3 inline", poly(stroke=ystroke("#0000FF", 3, owner="PolylineEdgeStyle")))
    edge("edge-reference", "edge style by reference (s-edge)", '<y:GraphMLReference ResourceKey="s-edge"/>')
    edge("arrow-inline", "targetArrow DIAMOND inline", poly(target=yarrow("targetArrow", "DIAMOND")))
    edge("arrow-reference", "targetArrow by reference (s-arrow)", poly(target="", targetArrow="{y:GraphMLReference s-arrow}"))

    def edge_default(c, w):
        if not once.get(id(w)):
            setup(w)
            once[id(w)] = True
        w.end("edge-key-default-s", c["source"])
        w.end("edge-key-default-t", c["target"])
        w.edge("edge-key-default", "edge-key-default-s", "edge-key-default-t", style=None)

    s.add("edge-key-default", "EdgeStyle=key default (no data)", edge_default)
    edge("edge-key-default-explicit", "the edge key default, inline", poly(stroke=ystroke("#00AA00", 3, owner="PolylineEdgeStyle")))
    use(YJS, "mapping", "SharedData", "GraphMLReference", "keyDefault")
    return s


# --------------------------------------------------------------------------------------------------------------
# yEd Live GraphML as yEd Live wrote it before its yFiles for HTML 3 update (yFiles for HTML 2.6 markup: yjs 2.0
# namespace, DefaultLabelStyle, y: label models, the flowchart palette's demostyle:FlowchartNodeStyle). Most yEd Live
# files in the corpus are this markup; its vocabulary is the 2.6 API reference (yed-vocabulary.json, yfilesHtml2).

YJS2_HEAD = """<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!--Created by yFiles for HTML 2.6.0.4-->
<!--THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT {generator}-->
<!--yEd Live GraphML style specimen sheet {sid}: {about}-->
<graphml xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://www.yworks.com/xml/schema/graphml.html/2.0/ygraphml.xsd " xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:demostyle="http://www.yworks.com/yFilesHTML/demos/FlatDemoStyle/1.0" xmlns:icon-style="http://www.yworks.com/yed-live/icon-style/1.0" xmlns:y="http://www.yworks.com/xml/yfiles-common/3.0" xmlns:x="http://www.yworks.com/xml/yfiles-common/markup/3.0" xmlns:yjs="http://www.yworks.com/xml/yfiles-for-html/2.0/xaml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
\t<key id="d0" for="node" attr.type="int" attr.name="zOrder" y:attr.uri="http://www.yworks.com/xml/yfiles-z-order/1.0/zOrder"/>
\t<key id="d1" for="node" attr.type="boolean" attr.name="Expanded" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/folding/Expanded">
\t\t<default>true</default>
\t</key>
\t<key id="d4" for="node" attr.name="NodeLabels" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/NodeLabels"/>
\t<key id="d5" for="node" attr.name="NodeGeometry" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/NodeGeometry"/>
\t<key id="d7" for="node" attr.name="NodeStyle" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/NodeStyle"/>
\t<key id="d11" for="edge" attr.name="EdgeLabels" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/EdgeLabels"/>
\t<key id="d12" for="edge" attr.name="EdgeGeometry" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/EdgeGeometry"/>
\t<key id="d13" for="edge" attr.name="EdgeStyle" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/EdgeStyle"/>
\t<key id="d16" for="port" attr.name="PortLocationParameter" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/PortLocationParameter">
\t\t<default>
\t\t\t<x:Static Member="y:FreeNodePortLocationModel.NodeCenterAnchored"/>
\t\t</default>
\t</key>
\t<key id="d19" attr.name="SharedData" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/SharedData"/>
\t<data key="d19">
\t\t<y:SharedData>
{shared}\t\t</y:SharedData>
\t</data>
\t<graph id="G" edgedefault="directed">
"""

# 2.6 label models, defined once in SharedData as the corpus' 2.x files define them
YJS2_EXTRA_NS = [("bpmn", "http://www.yworks.com/xml/yfiles-bpmn/2.0"),
                 ("uml", "http://www.yworks.com/yFilesHTML/demos/UMLDemoStyle/1.0"),
                 ("GraphvizNodeStyle", "http://www.yworks.com/yFilesHTML/graphviz-node-style/1.0"),
                 ("sys", "http://www.yworks.com/xml/yfiles-common/markup/primitives/2.0")]
YJS2_EXTRA_KEYS = [
    ("d8", '\t<key id="d8" for="node" attr.name="NodeViewState" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/folding/1.1/NodeViewState"/>'),
    ("d17", '\t<key id="d17" for="port" attr.name="PortStyle" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/PortStyle"/>'),
]
YJS2_MODELS = {
    "interior": '<y:InteriorLabelModel x:Key="m-interior"/>',
    "exterior": '<y:ExteriorLabelModel x:Key="m-exterior" Insets="5"/>',
}
H2 = VOCAB[YJS]["yfilesHtml2"]
DASH2 = H2["types"]["DashStyle"]["field"]


def use2(kind, *values):
    use(YJS, "html2:" + kind, *values)


def stroke2(color=NEU["border"], thickness=NEU["borderWidth"], owner="ShapeNodeStyle", prop="stroke", **kw):
    a = attrs({"fill": argb(color) if color.startswith("#") and len(color) == 7 else color, "thickness": num(thickness), **kw})
    return f"<yjs:{owner}.{prop}><yjs:Stroke {a}/></yjs:{owner}.{prop}>"


def label_style2(size=NEU["fontSize"], font=None, children="", **kw):
    """A 2.6 DefaultLabelStyle, its font as a child element (as the corpus' 2.x files write it)."""
    a = {"textFill": argb(NEU["labelColor"]), "horizontalTextAlignment": "CENTER", "verticalTextAlignment": "CENTER"}
    a.update(kw)
    f = {"fontFamily": FONT, "fontSize": num(size)}
    f.update(font or {})
    return (f"<y:Label.Style><yjs:DefaultLabelStyle {attrs(a)}><yjs:DefaultLabelStyle.font><yjs:Font {attrs(f)}/>"
            f"</yjs:DefaultLabelStyle.font>{children}</yjs:DefaultLabelStyle></y:Label.Style>")


class Yjs2Writer(YjsWriter):
    """yFiles for HTML 2.6 markup; reuses the 3.0 writer's node, edge and document layout."""

    def model(self, kind):
        self.shared[f"m-{kind}"] = YJS2_MODELS[kind]

    def shape(self, nid, cx, cy, w=SIZE, h=SIZE, shape="ELLIPSE", fill=None, stroke=None, labels="", style=None,
              into=None, **kw):
        if style is None:
            a = {"shape": shape, "fill": argb(NEU["fill"]) if fill is None else fill, **kw}
            st = stroke2() if stroke is None else stroke
            style = f"<yjs:ShapeNodeStyle {attrs(a)}>{st}</yjs:ShapeNodeStyle>" if st else f"<yjs:ShapeNodeStyle {attrs(a)}/>"
        xml = self.node_xml(nid, cx, cy, w, h, style, labels)
        (self.nodes if into is None else into).append(xml)
        return xml

    def label(self, text, kind=None, position=None, style=None, param=None, **kw):
        """A label; kind interior / exterior with a position member (NORTH_EAST, written NorthEast), or a param."""
        if param is None and kind is not None:
            self.model(kind)
            tag = {"interior": "InteriorLabelModelParameter", "exterior": "ExteriorLabelModelParameter"}[kind]
            param = (f'<y:Label.LayoutParameter><y:{tag} Position="{pascal(position)}" '
                     f'Model="{{y:GraphMLReference m-{kind}}}"/></y:Label.LayoutParameter>')
        return (f"<y:Label><y:Label.Text>{escape(text)}</y:Label.Text>{param or ''}"
                f"{style if style is not None else label_style2()}</y:Label>")

    def caption(self, nid, text, x, y):
        lw, lh = text_box(text, CAP)
        self.shape(nid, x, y, lw, lh, style='<yjs:ShapeNodeStyle shape="RECTANGLE" fill="#00FFFFFF" stroke="#00FFFFFF"/>',
                   labels=self.label(text, style=label_style2(CAP)))

    def straight(self, eid, c, bends=(), style=None, labels=""):
        self.end(f"{eid}-s", c["source"])
        self.end(f"{eid}-t", c["target"])
        self.edge(eid, f"{eid}-s", f"{eid}-t", bends, poly2() if style is None else style, labels)

    def document(self):
        shared = "".join(f"\t\t\t{v}\n" for _, v in sorted(self.shared.items()))
        head = YJS2_HEAD.format(generator=GENERATOR, sid=self.sheet.id, about=escape(self.sheet.about), shared=shared)
        body = "".join(self.nodes) + "".join(self.edges)
        # the palettes' own namespaces and the view-state and port-style keys, declared only by a sheet that uses them
        ns = "".join(f' xmlns:{p}="{u}"' for p, u in YJS2_EXTRA_NS if f"<{p}:" in body)
        head = head.replace(' xmlns:y="http://www.yworks.com/xml/yfiles-common/3.0"',
                            ns + ' xmlns:y="http://www.yworks.com/xml/yfiles-common/3.0"', 1)
        keys = "".join(k + "\n" for kid, k in YJS2_EXTRA_KEYS if f'key="{kid}"' in body)
        head = head.replace('\t<key id="d11" ', keys + '\t<key id="d11" ', 1)
        return head + body + "\t</graph>\n</graphml>\n"


def arrow2(prop, typ="DEFAULT", **kw):
    a = {"type": typ, "fill": argb(NEU["edgeColor"]), "stroke": argb(NEU["edgeColor"]), **kw}
    use2("ArrowType", typ)
    return f"<yjs:PolylineEdgeStyle.{prop}><yjs:Arrow {attrs(a)}/></yjs:PolylineEdgeStyle.{prop}>"


def poly2(target=None, source=None, **kw):
    st = stroke2(NEU["edgeColor"], NEU["edgeWidth"], owner="PolylineEdgeStyle")
    tg = arrow2("targetArrow") if target is None else target
    sc = arrow2("sourceArrow", "NONE") if source is None else source
    return f"<yjs:PolylineEdgeStyle {attrs(kw)}>{st}{sc}{tg}</yjs:PolylineEdgeStyle>"


def yjs2_node_styles():
    t = H2["types"]
    s = Sheet(YJS, "specimen-node-shapes-p2", "yFiles for HTML 2.6 node styles: ShapeNodeStyle shapes, BevelNodeStyle, ShinyPlateNodeStyle, PanelNodeStyle", writer=Yjs2Writer)
    s.add("default", "ShapeNodeStyle=nothing set (2.6)", lambda c, w: w.shape("default", c["x"], c["y"], style="<yjs:ShapeNodeStyle/>"))
    for shape in t["ShapeNodeShape"]["field"]:
        sid = f"v2-shape-{shape.lower().replace('_', '-')}"
        s.add(sid, f"shape={shape}", lambda c, w, sid=sid, shape=shape: w.shape(sid, c["x"], c["y"], shape=shape))
        use2("ShapeNodeShape", shape)
    s.add("v2-keep-aspect", "keepIntrinsicAspectRatio=true (STAR5 60x30)", lambda c, w: w.shape(
        "v2-keep-aspect", c["x"], c["y"], 60, 30, shape="STAR5", keepIntrinsicAspectRatio="true"))

    def styled(sid, cap, tag, w_h=(56, 36), children="", **kw):
        s.add(sid, cap, lambda c, w: w.shape(sid, c["x"], c["y"], *w_h, style=(
            f"<yjs:{tag} {attrs(kw)}>{children}</yjs:{tag}>" if children else f"<yjs:{tag} {attrs(kw)}/>")))

    col = argb(NEU["fill"])
    styled("bevel", "BevelNodeStyle", "BevelNodeStyle", color=col)
    styled("bevel-color", "BevelNodeStyle color=#FF3366FF", "BevelNodeStyle", color="#FF3366FF")
    styled("bevel-radius-0", "BevelNodeStyle radius=0", "BevelNodeStyle", color=col, radius="0")
    styled("bevel-inset-8", "BevelNodeStyle inset=8", "BevelNodeStyle", color=col, inset="8")
    styled("bevel-draw-shadow", "BevelNodeStyle drawShadow=true", "BevelNodeStyle", color=col, drawShadow="true")
    styled("shiny-plate", "ShinyPlateNodeStyle", "ShinyPlateNodeStyle", fill=col)
    styled("shiny-plate-fill", "ShinyPlateNodeStyle fill=#FF3366FF", "ShinyPlateNodeStyle", fill="#FF3366FF")
    styled("shiny-plate-stroke", "ShinyPlateNodeStyle stroke #FF0000 2", "ShinyPlateNodeStyle", fill=col,
           children=stroke2("#FF0000", 2, owner="ShinyPlateNodeStyle"))
    styled("shiny-plate-radius-0", "ShinyPlateNodeStyle radius=0", "ShinyPlateNodeStyle", fill=col, radius="0")
    styled("shiny-plate-insets-8", "ShinyPlateNodeStyle insets=8", "ShinyPlateNodeStyle", fill=col, insets="8")
    styled("shiny-plate-draw-shadow", "ShinyPlateNodeStyle drawShadow=true", "ShinyPlateNodeStyle", fill=col, drawShadow="true")
    styled("panel", "PanelNodeStyle", "PanelNodeStyle", color=col)
    styled("panel-color", "PanelNodeStyle color=#FF3366FF", "PanelNodeStyle", color="#FF3366FF")
    styled("panel-label-insets-color", "labelInsetsColor=#FFFF0000 (insets 20)", "PanelNodeStyle",
           w_h=(64, 44), color=col, labelInsetsColor="#FFFF0000", insets="0,20,0,0")

    f = Sheet(YJS, "specimen-node-shapes-p3", "yEd Live's flowchart palette (yFiles for HTML 2.6 demostyle:FlowchartNodeStyle): every type, fill, stroke", writer=Yjs2Writer)
    f.add("default", "FlowchartNodeStyle=nothing set", lambda c, w: w.shape("default", c["x"], c["y"], 56, 36,
                                                                             style="<demostyle:FlowchartNodeStyle/>"))
    for ft in H2["flowchartNodeTypes"]:
        sid = "flowchart-" + re.sub(r"([A-Z])", lambda m: "-" + m.group(1).lower(), ft)
        f.add(sid, f"type={ft}", lambda c, w, sid=sid, ft=ft: w.shape(sid, c["x"], c["y"], 56, 36, style=(
            f'<demostyle:FlowchartNodeStyle type="{ft}" fill="{col}" stroke="{argb(NEU["border"])}"/>')))
        use2("FlowchartNodeType", ft)
    f.add("flowchart-fill", "fill=#FF3366FF (process)", lambda c, w: w.shape("flowchart-fill", c["x"], c["y"], 56, 36, style=(
        f'<demostyle:FlowchartNodeStyle type="process" fill="#FF3366FF" stroke="{argb(NEU["border"])}"/>')))
    f.add("flowchart-stroke", "stroke=#FFFF0000 (process)", lambda c, w: w.shape("flowchart-stroke", c["x"], c["y"], 56, 36, style=(
        f'<demostyle:FlowchartNodeStyle type="process" fill="{col}" stroke="#FFFF0000"/>')))
    return s


def yjs2_labels():
    t = H2["types"]
    W, H = 60.0, 30.0
    s = Sheet(YJS, "specimen-labels-p3", "yFiles for HTML 2.6 DefaultLabelStyle: text fill, font, alignment, background, insets, shape, clipping, wrapping", writer=Yjs2Writer)

    def lab(sid, cap, text="Label", w=W, h=H, font=None, **kw):
        s.add(sid, cap, lambda c, wr: wr.shape(sid, c["x"], c["y"], w, h, shape="RECTANGLE",
                                               labels=wr.label(text, style=label_style2(font=font, **kw))))

    s.add("default", "Label=text only (2.6)", lambda c, w: w.shape("default", c["x"], c["y"], W, H, shape="RECTANGLE",
                                                                  labels="<y:Label><y:Label.Text>Label</y:Label.Text></y:Label>"))
    for col in ["#FFFF0000", "#FF0000FF"]:
        lab(f"v2-text-fill-{col[3:].lower()}", f"textFill={col}", textFill=col)
    lab("v2-text-size-16", "textSize=16 (font 16)", "Ag", textSize="16", font={"fontSize": "16"})
    for fam in ["Arial", "Times New Roman", "Courier New"]:
        lab(f"v2-font-family-{fam.lower().replace(' ', '-')}", f"fontFamily={fam}", "Agj", font={"fontFamily": fam})
    for size in [8, 16, 24]:
        lab(f"v2-font-size-{size}", f"fontSize={size}", "Ag", font={"fontSize": str(size)})
    for v in t["FontStyle"]["field"]:
        if v != "INHERIT":
            lab(f"v2-font-style-{v.lower()}", f"fontStyle={v}", font={"fontStyle": v})
            use2("FontStyle", v)
    for v in t["FontWeight"]["field"]:
        if v != "INHERIT":
            lab(f"v2-font-weight-{v.lower()}", f"fontWeight={v}", font={"fontWeight": v})
            use2("FontWeight", v)
    for v in t["TextDecoration"]["field"]:
        lab(f"v2-text-decoration-{v.lower().replace('_', '-')}", f"textDecoration={v}", font={"textDecoration": v})
        use2("TextDecoration", v)
    lab("v2-line-spacing", "lineSpacing=1 (two lines)", "One\nTwo", h=44, font={"lineSpacing": "1"})
    for v in t["HorizontalTextAlignment"]["field"]:
        lab(f"v2-horizontal-{v.lower()}", f"horizontalTextAlignment={v}", "Wide line\nab", h=40, horizontalTextAlignment=v)
        use2("HorizontalTextAlignment", v)
    for v in t["VerticalTextAlignment"]["field"]:
        lab(f"v2-vertical-{v.lower()}", f"verticalTextAlignment={v}", h=50, verticalTextAlignment=v,
            minimumSize="60,44")
        use2("VerticalTextAlignment", v)
    lab("v2-background-fill", "backgroundFill=#FFFFFF99", backgroundFill="#FFFFFF99")
    lab("v2-background-stroke", "backgroundStroke=#FFFF0000", backgroundStroke="#FFFF0000")
    lab("v2-insets-8", "insets=8 (background)", backgroundFill="#FFFFFF99", insets="8")
    for v in t["LabelShape"]["field"]:
        lab(f"v2-label-shape-{v.lower().replace('_', '-')}", f"shape={v}", shape=v, backgroundFill="#FFFFFF99",
            backgroundStroke=argb(NEU["border"]))
        use2("LabelShape", v)
    lab("v2-clip-text-false", "clipText=false (max 30x12)", "Overflowing", clipText="false", maximumSize="30,12")
    lab("v2-maximum-size", "maximumSize=30,12", "Overflowing", maximumSize="30,12")
    for v in t["TextWrapping"]["field"]:
        lab(f"v2-wrapping-{v.lower().replace('_', '-')}", f"wrapping={v}", "Wrap this text", h=44,
            wrapping=v, maximumSize="50,40")
        use2("TextWrapping", v)
    lab("v2-text-wrapping-shape", "textWrappingShape=ELLIPSE", "Wrap this long text", h=44, wrapping="WORD",
        textWrappingShape="ELLIPSE", textWrappingPadding="2", maximumSize="56,40")

    m = Sheet(YJS, "specimen-labels-p4", "yFiles for HTML 2.6 node label models: InteriorLabelModel, ExteriorLabelModel, InteriorStretchLabelModel, SandwichLabelModel, RatioAnchoredLabelModel", caption_dy=54, writer=Yjs2Writer)
    m.add("default", "Label=text only (2.6)", lambda c, w: w.shape("default", c["x"], c["y"], 40, 26, shape="RECTANGLE",
                                                                  labels="<y:Label><y:Label.Text>Lbl</y:Label.Text></y:Label>"))
    for kind, enum in [("interior", "InteriorLabelModelPosition"), ("exterior", "ExteriorLabelModelPosition")]:
        for pos in t[enum]["field"]:
            sid = f"v2-model-{kind}-{pos.lower().replace('_', '-')}"
            m.add(sid, f"{kind} {pos}", lambda c, w, sid=sid, kind=kind, pos=pos: w.shape(
                sid, c["x"], c["y"], 40, 26, shape="RECTANGLE", labels=w.label("Lbl", kind, pos)))
            use2(enum, pos)

    def static(sid, cap, member):
        # a model's predefined parameter, as the corpus' 2.x files write it: an attribute of the label
        m.add(sid, cap, lambda c, w: w.shape(sid, c["x"], c["y"], 40, 26, shape="RECTANGLE", labels=(
            f'<y:Label LayoutParameter="{{x:Static {member}}}"><y:Label.Text>Lbl</y:Label.Text>{label_style2()}</y:Label>')))

    for pos in t["InteriorStretchLabelModelPosition"]["field"]:
        static(f"v2-model-stretch-{pos.lower().replace('_', '-')}", f"InteriorStretch {pos}",
               f"y:InteriorStretchLabelModel.{pascal(pos)}")
        use2("InteriorStretchLabelModelPosition", pos)
    for pos in t["SandwichLabelModel"]["field"]:
        static(f"v2-model-sandwich-{pos.lower()}", f"Sandwich {pos}", f"y:SandwichLabelModel.{pascal(pos)}")
        use2("SandwichLabelModel", pos)
    m.add("v2-model-ratio-anchored", "RatioAnchored LayoutOffset=30,-18", lambda c, w: w.shape(
        "v2-model-ratio-anchored", c["x"], c["y"], 40, 26, shape="RECTANGLE", labels=w.label(
            "Lbl", param='<y:Label.LayoutParameter><y:RatioAnchoredLabelModelParameter LayoutOffset="30,-18"/></y:Label.LayoutParameter>')))
    use2("labelModel", "RatioAnchoredLabelModel")

    def model_param(sid, cap, key, model_xml, tag, position):
        m.add(sid, cap, lambda c, w: (
            w.shared.__setitem__(key, model_xml),
            w.shape(sid, c["x"], c["y"], 40, 26, shape="RECTANGLE", labels=w.label("Lbl", param=(
                f'<y:Label.LayoutParameter><y:{tag} Position="{position}" Model="{{y:GraphMLReference {key}}}"/>'
                "</y:Label.LayoutParameter>")))))

    model_param("v2-model-interior-insets", "InteriorLabelModel Insets=8", "m-interior-8",
                '<y:InteriorLabelModel x:Key="m-interior-8" Insets="8"/>', "InteriorLabelModelParameter", "NorthWest")
    model_param("v2-model-exterior-insets", "ExteriorLabelModel Insets=15", "m-exterior-15",
                '<y:ExteriorLabelModel x:Key="m-exterior-15" Insets="15"/>', "ExteriorLabelModelParameter", "North")
    model_param("v2-model-stretch-insets", "InteriorStretchLabelModel Insets=6", "m-stretch-6",
                '<y:InteriorStretchLabelModel x:Key="m-stretch-6" Insets="6"/>', "InteriorStretchLabelModelParameter", "North")
    m.add("v2-model-sandwich-yoffset", "SandwichLabelModel YOffset=15 South", lambda c, w: (
        w.shared.__setitem__("m-sandwich-15", '<y:SandwichLabelModel x:Key="m-sandwich-15" YOffset="15"/>'),
        w.shape("v2-model-sandwich-yoffset", c["x"], c["y"], 40, 26, shape="RECTANGLE", labels=w.label("Lbl", param=(
            '<y:Label.LayoutParameter><y:SandwichParameter Position="South" Model="{y:GraphMLReference m-sandwich-15}"/>'
            "</y:Label.LayoutParameter>")))))
    return s


def yjs2_arrows():
    t = H2["types"]
    s = Sheet(YJS, "specimen-arrows-p2", "yFiles for HTML 2.6 arrows: every ArrowType at the target and at the source; Arrow scale, cropLength, fill, stroke; smoothingLength", writer=Yjs2Writer)
    s.add("default", "arrows=nothing set (2.6)", lambda c, w: w.straight("default", c, style=(
        f"<yjs:PolylineEdgeStyle>{stroke2(NEU['edgeColor'], NEU['edgeWidth'], owner='PolylineEdgeStyle')}</yjs:PolylineEdgeStyle>")))
    for at in t["ArrowType"]["field"]:
        sid = f"v2-target-{at.lower()}"
        s.add(sid, f"targetArrow={at}", lambda c, w, sid=sid, at=at: w.straight(sid, c, style=poly2(target=arrow2("targetArrow", at))))
    for at in t["ArrowType"]["field"]:
        if at != "NONE":
            sid = f"v2-source-{at.lower()}"
            s.add(sid, f"sourceArrow={at}", lambda c, w, sid=sid, at=at: w.straight(sid, c, style=poly2(
                target=arrow2("targetArrow", "NONE"), source=arrow2("sourceArrow", at))))
    for sid, cap, kw in [("v2-arrow-scale-2", "Arrow scale=2", {"scale": "2"}),
                         ("v2-arrow-crop-length-6", "cropLength=6", {"cropLength": "6"}),
                         ("v2-arrow-fill-ff0000", "Arrow fill=#FFFF0000", {"fill": "#FFFF0000"}),
                         ("v2-arrow-stroke-ff0000", "Arrow stroke=#FFFF0000", {"stroke": "#FFFF0000"})]:
        s.add(sid, cap, lambda c, w, sid=sid, kw=kw: w.straight(sid, c, style=poly2(target=arrow2("targetArrow", "DEFAULT", **kw))))
    s.add("v2-arrow-length-12", "Arrow length=12", lambda c, w: w.straight(
        "v2-arrow-length-12", c, style=poly2(target=arrow2("targetArrow", "DEFAULT", length="12"))))

    e = Sheet(YJS, "specimen-edges-lines-p2", "yFiles for HTML 2.6 PolylineEdgeStyle: stroke color, thickness, dash styles; smoothingLength", writer=Yjs2Writer)
    e.add("default", "EdgeStyle=nothing set (2.6)", lambda c, w: w.straight("default", c, style="<yjs:PolylineEdgeStyle/>"))

    def line(sid, cap, **kw):
        e.add(sid, cap, lambda c, w: w.straight(sid, c, style=(
            f"<yjs:PolylineEdgeStyle>{stroke2(owner='PolylineEdgeStyle', **kw)}{arrow2('sourceArrow', 'NONE')}"
            f"{arrow2('targetArrow')}</yjs:PolylineEdgeStyle>")))

    line("v2-stroke-color-ff0000", "stroke fill=#FFFF0000", color="#FF0000", thickness=NEU["edgeWidth"])
    for th in [0.5, 3, 6]:
        line(f"v2-stroke-thickness-{num(th).replace('.', '-')}", f"thickness={num(th)}", color=NEU["edgeColor"], thickness=th)
    for d in DASH2:
        line(f"v2-dash-{d.lower().replace('_', '-')}", f"dashStyle={d}", color=NEU["edgeColor"], thickness=2, dashStyle=d)
    e.add("v2-smoothing-length", "smoothingLength=20 (2 bends)", lambda c, w: w.straight(
        "v2-smoothing-length", c, bends=[(c["x"] - 20, c["y"] - 30), (c["x"] + 20, c["y"] - 30)], style=poly2(smoothingLength="20")))
    return s


# --------------------------------------------------------------------------------------------------------------
# yEd Live palettes in their own namespaces (BPMN, UML, Graphviz, colored icons), markup labels, composite and group
# label models, ports, folder state and the 2.6 edge label models: what yEd Live files in the corpus use and the
# yFiles for HTML 2.6 BPMN demo (bpmn-view.ts, yEd Live's BPMN palette) defines.

BPMN = VOCAB[YJS]["bpmn"]
BPMN_SIZE = {"ActivityNodeStyle": (60, 40), "EventNodeStyle": (30, 30), "GatewayNodeStyle": (34, 34),
             "ConversationNodeStyle": (36, 32), "DataObjectNodeStyle": (26, 34), "DataStoreNodeStyle": (34, 30),
             "AnnotationNodeStyle": (40, 30), "ChoreographyNodeStyle": (70, 50), "GroupNodeStyle": (90, 56),
             "PoolNodeStyle": (100, 60)}
# caption spellings: a long property or value shortened so the caption fits its cell
BPMN_CAP = {"triggerEventType": "trigger", "triggerEventCharacteristic": "triggerChar", "loopCharacteristic": "loop",
            "characteristic": "char", "initiatingMessage": "initMessage", "responseMessage": "respMessage",
            "initiatingAtTop": "initAtTop", "initiatingColor": "initColor", "responseColor": "respColor",
            "messageOutline": "msgOutline", "multipleInstance": "multiInstance"}
BPMN_RED = "#FFFF0000"


BPMN_CAP_CLASS = {"ActivityNodeStyle": "", "EventNodeStyle": "Ev", "GatewayNodeStyle": "Gw", "ConversationNodeStyle": "Conv",
                  "DataObjectNodeStyle": "DataObj", "DataStoreNodeStyle": "Store", "AnnotationNodeStyle": "Annot",
                  "ChoreographyNodeStyle": "Chor", "GroupNodeStyle": "Group", "PoolNodeStyle": "Pool",
                  "EventPortStyle": "Port", "BpmnEdgeStyle": "", "AnnotationLabelStyle": "Annot",
                  "MessageLabelStyle": "Msg"}


def bpmn_cap(cls, prop, value):
    v = (str(value).replace("INTERRUPTING", "INT").replace("EXCLUSIVE", "EXCL").replace("CALLING_", "CALL_")
         .replace("CONVERSATION", "CONV").replace("SUB_PROCESS", "SUBPROC"))
    tag = BPMN_CAP_CLASS[cls]
    return f"{tag + ' ' if tag else ''}{BPMN_CAP.get(prop, prop)}={v}"


def kebab(name):
    """camelCase or UPPER_CASE as a setting id: triggerEventType -> trigger-event-type, SUB_PROCESS -> sub-process."""
    if name.upper() == name:
        return name.lower().replace("_", "-")
    return re.sub(r"([A-Z])", lambda m: "-" + m.group(1).lower(), name).lstrip("-").replace("_", "-").lower()


def bpmn_specimens(cls):
    """Every stored property of a BPMN style, one specimen each: every value of an enumeration, a boolean's
    non-default value, a fill in red, insets 10, numbers 20; background and outline neutral where not the subject."""
    props = BPMN["styles"][cls]
    out = []
    for prop, ty in props.items():
        if f"{cls}.{prop}" in YJS_BPMN_NOT_DRAWN:
            continue
        if ty in BPMN["enums"]:
            vals = BPMN["enums"][ty]
        elif ty == "boolean":
            vals = ["false" if BPMN["booleanDefaults"].get(cls, {}).get(prop) == "true" else "true"]
        elif ty.startswith("Fill"):
            vals = [BPMN_RED]
        elif ty == "Insets":
            vals = ["10"]
        elif ty == "number":
            vals = ["20"] if prop == "smoothing" else ["8"]
        elif ty == "Size":
            vals = ["20,20"]
        else:
            raise SystemExit(f"bpmn {cls}.{prop}: no specimen value for type {ty}")
        for v in vals:
            a = {}
            for neutral, col in [("background", argb(NEU["fill"])), ("outline", argb(NEU["border"]))]:
                if neutral in props and neutral != prop and cls != "BpmnEdgeStyle":
                    a[neutral] = col
            if cls == "BpmnEdgeStyle" and prop != "color":
                a["color"] = argb(NEU["edgeColor"])
            if cls == "BpmnEdgeStyle" and prop == "innerColor":
                a["type"] = "CONVERSATION"  # the only edge type with an inner line
            a[prop] = v
            sid = f"bpmn-{kebab(cls.replace('NodeStyle', '').replace('Style', ''))}-{kebab(prop)}" + (
                f"-{kebab(v)}" if ty in BPMN["enums"] else "")
            use(YJS, f"bpmn:{cls}", prop)
            if ty in BPMN["enums"]:
                use(YJS, f"bpmn:{cls}.{prop}", v)
            out.append((sid, bpmn_cap(cls, prop, v), f"<bpmn:{cls} {attrs(a)}/>"))
    return out


def bpmn_node_page(sid, about, classes, columns=None):
    s = Sheet(YJS, sid, about, columns=columns, writer=Yjs2Writer)
    first = classes[0]
    s.add("default", f"{first.replace('NodeStyle', '')}=nothing set", lambda c, w: w.shape("default", c["x"], c["y"], *BPMN_SIZE[first],
                                                                    style=f"<bpmn:{first}/>"))
    for cls in classes:
        for spid, cap, style in bpmn_specimens(cls):
            s.add(spid, cap, lambda c, w, spid=spid, style=style, cls=cls: w.shape(
                spid, c["x"], c["y"], *BPMN_SIZE[cls], style=style))
    return s


def port_xml(name, ratio, style=None):
    sty = f'\t\t\t\t<data key="d17">\n\t\t\t\t\t{style}\n\t\t\t\t</data>\n' if style else ""
    return (f'\t\t\t<port name="{name}">\n\t\t\t\t<data key="d16">\n\t\t\t\t\t<y:FreeNodePortLocationModelParameter '
            f'Ratio="{ratio}"/>\n\t\t\t\t</data>\n{sty}\t\t\t</port>\n')


def ported(w, eid, c, sratio, tratio, style):
    """An edge from a port of its source node to a port of its target node (end nodes 24 x 24)."""
    for end, p, ratio in [("s", c["source"], sratio), ("t", c["target"], tratio)]:
        w.nodes.append(w.node_xml(f"{eid}-{end}", p["x"], p["y"], 24, 24, f'<yjs:ShapeNodeStyle shape="ELLIPSE" '
                                  f'fill="{argb(NEU["fill"])}" stroke="{argb(NEU["border"])}"/>',
                                  extra_data=port_xml("p0", ratio)))
    w.edge(eid, f"{eid}-s", f"{eid}-t", style=style, ports=("p0", "p0"))


def yjs_bpmn():
    bpmn_node_page("specimen-node-shapes-p4", "yEd Live's BPMN palette (bpmn:ActivityNodeStyle): activity and task types, trigger events, loop, sub-state, markers, fills",
                   ["ActivityNodeStyle"])
    bpmn_node_page("specimen-node-shapes-p5", "yEd Live's BPMN palette: EventNodeStyle, GatewayNodeStyle, ConversationNodeStyle, DataObjectNodeStyle, DataStoreNodeStyle, AnnotationNodeStyle",
                   ["EventNodeStyle", "GatewayNodeStyle", "ConversationNodeStyle", "DataObjectNodeStyle",
                    "DataStoreNodeStyle", "AnnotationNodeStyle"])
    p6 = bpmn_node_page("specimen-node-shapes-p6", "yEd Live's BPMN palette: ChoreographyNodeStyle, GroupNodeStyle; boundary events (EventPortStyle on a port)",
                        ["ChoreographyNodeStyle", "GroupNodeStyle"])
    activity = f'<bpmn:ActivityNodeStyle background="{argb(NEU["fill"])}" outline="{argb(NEU["border"])}"/>'
    for spid, cap, style in bpmn_specimens("EventPortStyle"):
        p6.add(spid, cap, lambda c, w, spid=spid, style=style: w.nodes.append(w.node_xml(
            spid, c["x"], c["y"], *BPMN_SIZE["ActivityNodeStyle"], activity, extra_data=port_xml("p0", "0.25,1", style))))

    e = Sheet(YJS, "specimen-edges-lines-p3", "yEd Live's BPMN palette edges (bpmn:BpmnEdgeStyle): every edge type, color, inner color, smoothing; edges at node ports (2.6)", writer=Yjs2Writer)
    e.add("default", "BpmnEdgeStyle=nothing set", lambda c, w: w.straight("default", c, style="<bpmn:BpmnEdgeStyle/>"))
    for spid, cap, style in bpmn_specimens("BpmnEdgeStyle"):
        bends = (lambda c: [(c["x"] - 20, c["y"] - 30), (c["x"] + 20, c["y"] - 30)]) if "smoothing" in spid else (lambda c: ())
        e.add(spid, cap, lambda c, w, spid=spid, style=style, bends=bends: w.straight(spid, c, bends=bends(c), style=style))
    for spid, cap, sr, tr in [("v2-port-top-bottom", "ports Ratio 0.5,0 to 0.5,1", "0.5,0", "0.5,1"),
                              ("v2-port-corners", "ports Ratio 1,1 to 0,0", "1,1", "0,0")]:
        e.add(spid, cap, lambda c, w, spid=spid, sr=sr, tr=tr: ported(w, spid, c, sr, tr, poly2()))


def uml_model(stereotype="", constraint="", attributes_open="true", operations_open="true"):
    return ("<uml:UMLNodeStyle.model>"
            f'<uml:UMLClassModel {attrs({"stereotype": stereotype, "constraint": constraint, "className": "Cls", "attributesOpen": attributes_open, "operationsOpen": operations_open})}>'
            '<uml:UMLClassModel.attributes><x:Array Type="sys:Object"><sys:String>a: int</sys:String></x:Array>'
            '</uml:UMLClassModel.attributes><uml:UMLClassModel.operations><x:Array Type="sys:Object">'
            "<sys:String>m()</sys:String></x:Array></uml:UMLClassModel.operations></uml:UMLClassModel></uml:UMLNodeStyle.model>")


ICON_URI = "data:image/svg+xml;charset=utf-8," + "".join(
    ch if ch.isalnum() or ch in "-_.~" else "%" + format(ord(ch), "02X") for ch in SVG_ICON)


def yjs_palette_nodes():
    s = Sheet(YJS, "specimen-node-shapes-p7", "yEd Live palette node styles in their own namespaces: GraphvizNodeStyle, uml:UMLNodeStyle, icon-style:ColoredIconNodeStyle (2.6); a stroke thickness written as sys:Double",
              columns=6, writer=Yjs2Writer)
    s.add("default", "GraphvizNodeStyle=nothing set", lambda c, w: w.shape("default", c["x"], c["y"],
                                                                         style="<GraphvizNodeStyle:GraphvizNodeStyle/>"))
    for shp in ["ellipse", "rectangle"]:  # the shapes yEd Live writes in the corpus
        s.add(f"graphviz-shape-{shp}", f"GraphvizNodeStyle shape={shp}", lambda c, w, shp=shp: w.shape(
            f"graphviz-shape-{shp}", c["x"], c["y"], 56, 36, style=f'<GraphvizNodeStyle:GraphvizNodeStyle shape="{shp}"/>'))
    neutral = {"fill": argb(NEU["fill"]), "highlightFill": argb(NEU["fill"])}
    for sid, cap, a, m in [("uml-class", "UMLNodeStyle", {}, {}),
                           ("uml-fill", "UMLNodeStyle fill=#FF607D8B", {"fill": "#FF607D8B"}, {}),
                           ("uml-highlight-fill", "highlightFill=#FFA3F1BB", {"highlightFill": "#FFA3F1BB"}, {}),
                           ("uml-stereotype", "UMLClassModel stereotype=entity", {}, {"stereotype": "entity"}),
                           ("uml-constraint", "UMLClassModel constraint=abstract", {}, {"constraint": "abstract"}),
                           ("uml-attributes-open-false", "attributesOpen=false", {}, {"attributes_open": "false"}),
                           ("uml-operations-open-false", "operationsOpen=false", {}, {"operations_open": "false"})]:
        s.add(sid, cap, lambda c, w, sid=sid, a=a, m=m: w.shape(sid, c["x"], c["y"], 90, 70, style=(
            f"<uml:UMLNodeStyle {attrs({**neutral, **a})}>{uml_model(**m)}</uml:UMLNodeStyle>")))
    for col in ["Black", "Red"]:
        s.add(f"colored-icon-{col.lower()}", f"ColoredIconNodeStyle color={col}", lambda c, w, col=col: w.shape(
            f"colored-icon-{col.lower()}", c["x"], c["y"], 40, 40, style=(
                f'<icon-style:ColoredIconNodeStyle color="{col}" clipMode="{{x:Null}}"><icon-style:ColoredIconNodeStyle.image>'
                f"{escape(ICON_URI)}</icon-style:ColoredIconNodeStyle.image></icon-style:ColoredIconNodeStyle>")))
    s.add("stroke-thickness-sys-double", "Stroke.thickness sys:Double 3", lambda c, w: w.shape(
        "stroke-thickness-sys-double", c["x"], c["y"], style=(
            f'<yjs:ShapeNodeStyle shape="ELLIPSE" fill="{argb(NEU["fill"])}"><yjs:ShapeNodeStyle.stroke>'
            f'<yjs:Stroke fill="{argb(NEU["border"])}"><yjs:Stroke.thickness><sys:Double>3</sys:Double></yjs:Stroke.thickness>'
            "</yjs:Stroke></yjs:ShapeNodeStyle.stroke></yjs:ShapeNodeStyle>")))


MARKUP = [("markup-plain", "MarkupLabelStyle plain text", "Label"),
          ("markup-bold", "Text=<b>Bold</b>", "<b>Bold</b>"),
          ("markup-italic", "Text=<i>Ital</i>", "<i>Ital</i>"),
          ("markup-underline", "Text=<u>Und</u>", "<u>Und</u>"),
          ("markup-heading", "Text=<h2>H2</h2>", "<h2>H2</h2>"),
          ("markup-span-color", "Text=<span style=color:red>", '<span style="color:#ff0000">Red</span>'),
          ("markup-line-break", "Text=One<br/>Two", "One<br/>Two")]


def markup_style2(**kw):
    a = {"textFill": argb(NEU["labelColor"]), "horizontalTextAlignment": "CENTER", "verticalTextAlignment": "CENTER", **kw}
    return (f"<y:Label.Style><yjs:MarkupLabelStyle {attrs(a)}><yjs:MarkupLabelStyle.font><yjs:Font fontFamily="
            f'"{FONT}" fontSize="{num(NEU["fontSize"])}"/></yjs:MarkupLabelStyle.font></yjs:MarkupLabelStyle></y:Label.Style>')


def yjs2_labels_more():
    s = Sheet(YJS, "specimen-labels-p5", "yFiles for HTML 2.6 MarkupLabelStyle (markup text), CompositeLabelModel; yEd Live's BPMN label styles AnnotationLabelStyle and MessageLabelStyle",
              caption_dy=54, writer=Yjs2Writer)
    W, H = 60.0, 30.0
    s.add("default", "Label=text only (2.6)", lambda c, w: w.shape("default", c["x"], c["y"], W, H, shape="RECTANGLE",
                                                                  labels="<y:Label><y:Label.Text>Label</y:Label.Text></y:Label>"))
    for sid, cap, text in MARKUP:
        s.add("v2-" + sid, cap, lambda c, w, sid=sid, text=text: w.shape("v2-" + sid, c["x"], c["y"], W, H, shape="RECTANGLE",
                                                                         labels=w.label(text, style=markup_style2())))
    s.add("v2-markup-wrapping", "Markup wrapping=CHARACTER_ELLIPSIS", lambda c, w: w.shape(
        "v2-markup-wrapping", c["x"], c["y"], W, H, shape="RECTANGLE", labels=w.label(
            "<b>A long</b> label text", style=markup_style2(wrapping="CHARACTER_ELLIPSIS", textWrappingShape="LABEL_SHAPE",
                                                            maximumSize="56,26"))))
    s.add("v2-model-composite", "CompositeLabelModel Exterior North", lambda c, w: (
        w.model("exterior"),
        w.shape("v2-model-composite", c["x"], c["y"], 40, 26, shape="RECTANGLE", labels=w.label("Lbl", param=(
            "<y:Label.LayoutParameter><y:CompositeLabelModelParameter><y:CompositeLabelModelParameter.Parameter>"
            '<y:ExteriorLabelModelParameter Position="North" Model="{y:GraphMLReference m-exterior}"/>'
            "</y:CompositeLabelModelParameter.Parameter><y:CompositeLabelModelParameter.Model><y:CompositeLabelModel>"
            '<y:CompositeLabelModel.LabelModels><y:GraphMLReference ResourceKey="m-exterior"/><y:InteriorLabelModel/>'
            "<y:FreeNodeLabelModel/></y:CompositeLabelModel.LabelModels></y:CompositeLabelModel>"
            "</y:CompositeLabelModelParameter.Model></y:CompositeLabelModelParameter></y:Label.LayoutParameter>")))))
    for cls in ["AnnotationLabelStyle", "MessageLabelStyle"]:
        for spid, cap, style in bpmn_specimens(cls):
            s.add(spid, cap, lambda c, w, spid=spid, style=style: w.shape(spid, c["x"], c["y"], W, H, shape="RECTANGLE",
                                                                         labels=w.label("Note", style=f"<y:Label.Style>{style}</y:Label.Style>")))

    g = Sheet(YJS, "specimen-groups-p4", "yFiles for HTML 2.6 groups: GroupNodeLabelModel (PlaceOnTab), a collapsed group's FolderNodeState",
              columns=4, caption_dy=52, writer=Yjs2Writer)
    gstyle = (f'<yjs:GroupNodeStyle tabFill="{argb(NEU["fill"])}" contentAreaFill="#FFFFFFFF">'
              f'{stroke2(owner="GroupNodeStyle")}</yjs:GroupNodeStyle>')

    def group(sid, label="", extra=""):
        def fn(c, w):
            inner = [w.shape(f"{sid}-m0", c["x"], c["y"] + 10, 20, 20, into=[])]
            w.nodes.append(w.node_xml(sid, c["x"], c["y"], 150, 80, gstyle, labels=label, inner=inner, extra_data=extra))
        return fn

    def glabel(place):
        a = f' PlaceOnTab="{place}"' if place is not None else ""
        return ("<y:Label><y:Label.Text>Group</y:Label.Text><y:Label.LayoutParameter>"
                f"<y:GroupNodeLabelModelParameter{a}><y:GroupNodeLabelModelParameter.Model><y:GroupNodeLabelModel/>"
                f"</y:GroupNodeLabelModelParameter.Model></y:GroupNodeLabelModelParameter></y:Label.LayoutParameter>{label_style2()}</y:Label>")

    g.add("default", "GroupNodeStyle (2.6), no label", group("default"))
    g.add("v2-group-label-model", "GroupNodeLabelModel", lambda c, w: group("v2-group-label-model", glabel(None))(c, w))
    g.add("v2-group-label-place-on-tab-false", "GroupNodeLabelModel PlaceOnTab=false",
          lambda c, w: group("v2-group-label-place-on-tab-false", glabel("false"))(c, w))
    g.add("v2-group-folder-state", "Expanded=false, FolderNodeState 60x40", lambda c, w: group(
        "v2-group-folder-state", extra=('\t\t\t<data key="d1">false</data>\n\t\t\t<data key="d8">\n\t\t\t\t<y:ViewState>'
                                        f'<y:FolderNodeState x:Key="c|view" Layout="{num(c["x"] - 30)},{num(c["y"] - 20)},60,40"/>'
                                        "</y:ViewState>\n\t\t\t</data>\n"))(c, w))

    el = Sheet(YJS, "specimen-edge-labels-p2", "yFiles for HTML 2.6 edge labels: SmartEdgeLabelModel (Distance, segment, from target), FreeEdgeLabelModel (Ratio, Distance, Angle), autoFlip",
               writer=Yjs2Writer)
    el.add("default", "Label=text only (2.6)", lambda c, w: w.straight("default", c, labels="<y:Label><y:Label.Text>Lbl</y:Label.Text></y:Label>"))
    models = {"smart": '<y:SmartEdgeLabelModel x:Key="m-smart"/>', "free": '<y:FreeEdgeLabelModel x:Key="m-free"/>'}
    for sid, cap, kind, a, style in [
            ("v2-smart-distance-0", "Smart Distance=0", "smart", {"Distance": "0"}, None),
            ("v2-smart-distance-12", "Smart Distance=12", "smart", {"Distance": "12"}, None),
            ("v2-smart-distance-minus-12", "Smart Distance=-12", "smart", {"Distance": "-12"}, None),
            ("v2-smart-segment-ratio", "Smart SegmentRatio=0.2", "smart", {"SegmentIndex": "0", "SegmentRatio": "0.2", "Distance": "0"}, None),
            ("v2-smart-from-target", "Smart Location=FromTarget 0.2", "smart", {"Location": "FromTarget", "SegmentRatio": "0.2", "Distance": "0"}, None),
            ("v2-free-ratio-distance", "Free Ratio=0.5 Distance=15", "free", {"Ratio": "0.5", "Distance": "15"}, None),
            ("v2-free-angle", "Free Distance=15 Angle=0.785", "free", {"Ratio": "0.5", "Distance": "15", "Angle": "0.785"}, None),
            ("v2-auto-flip-false", "DefaultLabelStyle autoFlip=false", "smart", {"Distance": "0"}, label_style2(autoFlip="false"))]:
        def fn(c, w, sid=sid, kind=kind, a=a, style=style):
            w.shared[f"m-{kind}"] = models[kind]
            tag = {"smart": "SmartEdgeLabelModelParameter", "free": "FreeEdgeLabelModelParameter"}[kind]
            param = (f'<y:Label.LayoutParameter><y:{tag} Model="{{y:GraphMLReference m-{kind}}}" {attrs(a)}/>'
                     "</y:Label.LayoutParameter>")
            w.straight(sid, c, labels=w.label("Lbl", param=param, style=style))
        el.add(sid, cap, fn)


def yjs_more_v3():
    """yFiles for HTML 3 additions on existing pages: markup labels and the composite label model (labels-p2), a
    SharedData color as a fill (node-fills-borders), edges at node ports (edges-lines)."""
    lp2 = next(x for x in SHEETS if x.fmt == YJS and x.id == "specimen-labels-p2")
    for sid, cap, text in MARKUP:
        lp2.add(sid, cap, lambda c, w, sid=sid, text=text: w.shape(sid, c["x"], c["y"], 40, 26, shape="RECTANGLE", labels=w.label(
            text, param="", style=(f'<y:Label.Style><yjs:MarkupLabelStyle {attrs({"textFill": argb(NEU["labelColor"]), "horizontalTextAlignment": "CENTER", "verticalTextAlignment": "CENTER"})}>'
                                   f'{yjs_font(owner="MarkupLabelStyle")}</yjs:MarkupLabelStyle></y:Label.Style>'))))
    composite = ('<yx:CompositeLabelModel x:Key="m-composite"><yx:CompositeLabelModel.Models>'
                 '<yx:CompositeLabelModelModelPair Model="{y:GraphMLReference m-exterior}"/>'
                 '<yx:CompositeLabelModelModelPair Model="{y:GraphMLReference m-interior}"/>'
                 '<yx:CompositeLabelModelModelPair Model="{x:Static yx:FreeNodeLabelModel.Instance}"/>'
                 "</yx:CompositeLabelModel.Models></yx:CompositeLabelModel>")
    lp2.add("model-composite", "CompositeLabelModel exterior Top", lambda c, w: (
        w.model("exterior"), w.model("interior"), w.shared.__setitem__("m-composite", composite),
        w.shape("model-composite", c["x"], c["y"], 40, 26, shape="RECTANGLE", labels=w.label("Lbl", param=(
            '<y:Label.LayoutParameter><yx:CompositeLabelModelParameter Model="{y:GraphMLReference m-composite}">'
            '<yx:CompositeLabelModelParameter.Parameter><yx:ExteriorNodeLabelModelParameter Position="Top" '
            'Model="{y:GraphMLReference m-exterior}"/></yx:CompositeLabelModelParameter.Parameter>'
            "</yx:CompositeLabelModelParameter></y:Label.LayoutParameter>")))))
    fb = next(x for x in SHEETS if x.fmt == YJS and x.id == "specimen-node-fills-borders")
    fb.add("fill-shared-color", "fill={SharedData yjs:Color #FFFF0000}", lambda c, w: (
        w.shared.__setitem__("c-red", '<yjs:Color x:Key="c-red" value="#FFFF0000"/>'),
        w.shape("fill-shared-color", c["x"], c["y"], shape="RECTANGLE", fill="{y:GraphMLReference c-red}")))
    ed = next(x for x in SHEETS if x.fmt == YJS and x.id == "specimen-edges-lines")
    for spid, cap, sr, tr in [("port-top-bottom", "ports Ratio 0.5,0 to 0.5,1", "0.5,0", "0.5,1"),
                              ("port-corners", "ports Ratio 1,1 to 0,0", "1,1", "0,0")]:
        ed.add(spid, cap, lambda c, w, spid=spid, sr=sr, tr=tr: ported(w, spid, c, sr, tr, poly()))


# --------------------------------------------------------------------------------------------------------------
# The vocabulary check: every value is on a sheet or listed here with the reason it is not drawn.

YED_NOT_DRAWN = {
    "bpmnValues": {
        "CHOREOGRAPHY_TYPE": "no configuration id for a choreography node is known: no corpus file, palette list or importer names one, and a guessed id would draw as an unknown GenericNode",
    },
    "nodeLabelPosition": {},
    "edgeLabelPosition": {},
    "attributes": {
        "selected": "selection state: yEd draws a selected element's handles in the editor, never in an export",
        "configuration": "a label's configuration names a yFiles label painter; the sheets keep yEd's default (and AutoFlippingLabel on edge labels, as yEd writes)",
        "icon": "a label icon by URL; drawn on images-charts through iconData (the resource form yEd writes)",
        "image": "a label icon by resource name; drawn on images-charts through iconData (the resource form yEd writes)",
        "href": "an ImageNode by URL: the sheets embed the image as a resource (the form yEd writes); a URL would make the oracle depend on the network",
        "considerNodeLabelSize": "group auto-bounds input: yEd recomputes the group bounds from it when editing; the stored bounds are drawn",
        "preferredPlacement": "a placement hint for yEd's automatic labeling; a stored label position does not depend on it",
        "id": "an identifier, not a style",
        "minimumWidth": "a table column's minimum width: an editing constraint, not a drawing",
        "minimumHeight": "a table row's minimum height: an editing constraint, not a drawing",
        "class": "a GenericEdge user-data class name: not a style",
        "value": "a GenericEdge user-data value: not a style",
        "portLocationPolicy": "node port placement policy: an editing constraint for yEd's node ports",
        "ratioX": "node port location: yEd's node ports are invisible unless port graphics are configured",
        "ratioY": "node port location: yEd's node ports are invisible unless port graphics are configured",
        "localCandidatesEnabled": "port label placement candidates: an editing setting",
        "position": "a port label position: port labels are not part of yEd's node and edge vocabulary that users draw",
        "format": "a resource's encoding format: not a style",
        "closedHeight": "a closed folder's size: drawn by group-closed", "closedWidth": "a closed folder's size: drawn by group-closed",
        "autoResize": "group auto-resize while editing: the stored bounds are drawn",
    },
    "enums": {
        "preferredPlacement": "placement hints for yEd's automatic labeling; a stored label position does not depend on them",
        "NodeScaledPortLocationModel.portLocationPolicy": "node port placement policy: an editing constraint",
        "PortLabelModelParameter.position": "port label positions: port labels are not swept",
        "nodeLabelModel": "every model is drawn through its positions (nodeLabelPositions)",
        "nodeLabelPosition": "every position is drawn through its model (nodeLabelPositions)",
        "edgeLabelModel": "every model is drawn through its positions (edgeLabelPositions)",
        "edgeLabelPosition": "every position is drawn through its model (edgeLabelPositions)",
    },
}

YJS_NOT_DRAWN = {
    "cssClass": "a CSS class for the browser's own stylesheet: yEd Live's export has no such sheet",
    "renderer": "the yFiles renderer object: code, not stored in GraphML",
    "provideHeightHandle": "an editing handle for the arc height",
    "orthogonalEditing": "an editing behavior: bends are drawn where they are stored",
    "hitTransparentContentArea": "hit testing in the editor, not drawing",
    "minimumContentAreaSize": "an editing constraint on resizing",
    "showFolderContentArea": "applies only to a collapsed group shown with its content; group-collapsed shows the folder as yEd Live stores it",
    "enlargementAbsolute": "a static rendering hint for label enlargement on zoom, not stored per label",
    "enlargementRelative": "a static rendering hint for label enlargement on zoom, not stored per label",
    "textSize": "measured by yFiles from the text, never stored",
    "textWrappingPadding": "padding for a wrapping shape: drawn with textWrappingShape",
    "textWrappingShape": "wraps the text into the label's shape (yFiles 3); not swept: the label shapes are",
    "gradientTransform": "a gradient's SVG transform: the start and end points are swept instead",
    "edgeRelativeAngle": "FreeEdgeLabelModel's angle reference: the angle itself is swept",
    "CENTER": "a FreeNodeLabelModel parameter constant (the centered position): drawn by the interior Center position",
    "INSTANCE": "the model's singleton, not a value",
    "offset": "a label model's layout offset: drawn through the free models' LayoutOffset",
    "INHERIT": "inherits the font style of the surrounding element: yFiles' default, NORMAL",
}


YJS2_NOT_DRAWN = {
    "INHERIT": "inherits the surrounding element's font style or weight: yFiles' default, NORMAL",
    "cssClass": "a CSS class for the browser's own stylesheet: yEd Live's export has no such sheet",
    "renderer": "the yFiles renderer object: code, not stored in GraphML",
    "enlargementAbsolute": "a static rendering hint for label enlargement on zoom, not stored per label",
    "enlargementRelative": "a static rendering hint for label enlargement on zoom, not stored per label",
}


YJS_BPMN_NOT_DRAWN = {
    "BpmnNodeStyle": "the base class of the BPMN node styles, not written itself",
    "BpmnNodeStyle.minimumSize": "an editing constraint on resizing",
    "AlternatingLeafStripeStyle": "the stripe style of a pool's table (rows and columns of a TableNodeStyle): yEd Live's pools are drawn with their default table",
    "PoolNodeStyle": "a pool always carries its table (a TableNodeStyle with rows, columns and stripe styles), whose markup no yEd Live file in the corpus shows; draw.io's importer fails on a pool written without one (Cannot read properties of undefined (reading 'table'))",
    "ChoreographyNodeStyle.textPlacement": "where the choreography's own task name sits, a label model parameter: the default is drawn",
    "AnnotationLabelStyle.delegateStyle": "the icon label style the annotation draws through, set by the style itself",
}
# yEd Live corpus elements (any namespace) on no sheet, with the reason
YJS_CORPUS_NOT_DRAWN = {
    "y:Json": "an application's own data (a layout setting, an item type), not a style",
    "y:FoldingEdgeState": "an edge's style and ports while one of its ends is inside a collapsed group: the sheets' collapsed groups have no edges into them",
    "y:Port": "a port inside a folding view state (FoldingEdgeState.SourcePort): ports themselves are drawn through their location parameter",
}


def check():
    """Every vocabulary value: drawn on a sheet, or listed as not drawn. Returns {format: (checked, drawn)}."""
    yv, tv = VOCAB[YED], VOCAB[YJS]["types"]
    tally = {YED: [0, 0], YJS: [0, 0]}
    missing = []

    def need(fmt, what, drawn, excused=False):
        tally[fmt][0] += 1
        tally[fmt][1] += bool(drawn)
        if not drawn and not excused:
            missing.append(f"{fmt} {what}")

    got = lambda fmt, kind: USED.get((fmt, kind), set())  # noqa: E731
    for kind, vals in [("shape", yv["shapes"]), ("arrow", yv["arrows"]), ("lineType", yv["lineTypes"]),
                       ("configuration", [x["id"] for x in yv["genericConfigurations"]]),
                       ("groupConfiguration", [x["id"] for x in yv["genericGroupConfigurations"]]),
                       ("realizer", yv["observedInCorpus"]["realizers"])]:
        for v in vals:
            need(YED, f"{kind} {v}", v in got(YED, kind))
    for name, b in yv["bpmnStyleProperties"].items():
        for v in [x["value"] for x in b["values"]] or [None]:
            need(YED, f"bpmnProperty {name}={v}", (f"{name}={v}" if v else name) in got(YED, "bpmnProperty"),
                 v in YED_NOT_DRAWN["bpmnValues"])
    for name in yv["styleProperties"]:
        need(YED, f"styleProperty {name}", name in got(YED, "styleProperty"))
    seen = yv["observedInCorpus"]
    for kind, vals in [("configuration", [c for c in seen["configurations"] if "." not in c]),
                       ("labelConfiguration", seen["labelConfigurations"]),
                       ("labelModel", [m for m in seen["labelModels"] if not m.startswith("Smart")]),
                       ("styleProperty", [n for n in seen["styleProperties"] if not n.startswith(("com.yworks.bpmn.", "FramedEdgePainter."))])]:
        for v in vals:
            need(YED, f"{kind} {v} (corpus)", v in got(YED, kind))
    for kind, table in [("nodeLabelPosition", yv["nodeLabelPositions"]), ("edgeLabelPosition", yv["edgeLabelPositions"])]:
        for m, ps in table.items():
            for p in ps:
                need(YED, f"{kind} {m}:{p}", f"{m}:{p}" in got(YED, kind))
    alias = {"shapeType": "shape", "arrowType": "arrow", "lineType": "lineType"}
    for enum, vals in yv["schemaEnums"].items():
        if enum not in YED_NOT_DRAWN["enums"]:
            for v in vals:
                need(YED, f"{enum} {v}", v in got(YED, alias.get(enum, enum)))
    yed_text = "".join(open(os.path.join(OUT, YED, f"{sh.id}.graphml"), encoding="utf-8").read()
                       for sh in SHEETS if sh.fmt == YED)
    drawn_attrs = set(re.findall(r"\s([A-Za-z][A-Za-z0-9]*)=\"", yed_text))
    for tname, t in yv["schemaTypes"].items():
        for a in t["attributes"]:
            need(YED, f"attribute {tname}.{a}", a in drawn_attrs, a in YED_NOT_DRAWN["attributes"])
    for enum in ["ShapeNodeShape", "ArrowType", "LabelShape", "TextWrapping", "HorizontalTextAlignment",
                 "VerticalTextAlignment", "InteriorNodeLabelModelPosition", "ExteriorNodeLabelModelPosition",
                 "StretchNodeLabelModelPosition", "NinePositionsEdgeLabelModelPosition", "EdgeSides", "FontStyle",
                 "FontWeight", "TextDecorations", "LineCap", "LineJoin", "RectangleCornerStyle", "ArrowStyleShape",
                 "ArrowNodeDirection", "GroupNodeStyleTabPosition", "GroupNodeStyleIconType",
                 "GroupNodeStyleIconBackgroundShape", "GroupNodeStyleIconPosition"]:
        for v in tv[enum].get("field", []):
            need(YJS, f"{enum} {v}", v in got(YJS, enum), v in YJS_NOT_DRAWN)
    for v in [x for x in tv["DashStyle"].get("property", []) if x.isupper()]:
        need(YJS, f"DashStyle {v}", v in got(YJS, "DashStyle"))
    yjs_text = "".join(open(os.path.join(OUT, YJS, f"{sh.id}.graphml"), encoding="utf-8").read()
                       for sh in SHEETS if sh.fmt == YJS and sh.writer is None)
    for typ in ["ShapeNodeStyle", "RectangleNodeStyle", "GroupNodeStyle", "ImageNodeStyle", "ArrowNodeStyle",
                "PolylineEdgeStyle", "BezierEdgeStyle", "ArcEdgeStyle", "LabelStyle", "Stroke", "Arrow", "Font",
                "LinearGradient", "RadialGradient", "DashStyle"]:
        for prop in tv[typ].get("property", []):
            if prop.isupper():
                continue
            here = re.search(rf"<yjs:{typ}\b[^>]*\b{prop}=|<yjs:{typ}\.{prop}>", yjs_text) is not None
            if prop == "gradientStops":
                here = re.search(rf"<yjs:{typ}\b[^>]*>\s*<yjs:GradientStop", yjs_text) is not None
            need(YJS, f"property {typ}.{prop}", here, prop in YJS_NOT_DRAWN)
    for typ in ["SmartEdgeLabelModelParameter", "SmartEdgeLabelModel", "EdgePathLabelModel", "EdgeSegmentLabelModel",
                "NinePositionsEdgeLabelModel", "InteriorNodeLabelModel", "ExteriorNodeLabelModel", "StretchNodeLabelModel"]:
        for prop in tv[typ].get("property", []):
            if prop.isupper():
                continue
            name = prop[0].upper() + prop[1:]
            here = re.search(rf"<yx:{typ}(?:Parameter)?\b[^>]*\b{name}=", yjs_text) is not None
            need(YJS, f"property {typ}.{prop}", here, prop in YJS_NOT_DRAWN)
    v2_text = "".join(open(os.path.join(OUT, YJS, f"{sh.id}.graphml"), encoding="utf-8").read()
                      for sh in SHEETS if sh.fmt == YJS and sh.writer is Yjs2Writer)
    h2 = VOCAB[YJS]["yfilesHtml2"]
    for enum, vals in [(e, h2["types"][e]["field"]) for e in ["ShapeNodeShape", "ArrowType", "FontStyle", "FontWeight",
                                                              "TextDecoration", "TextWrapping", "LabelShape",
                                                              "HorizontalTextAlignment", "VerticalTextAlignment",
                                                              "InteriorLabelModelPosition", "ExteriorLabelModelPosition",
                                                              "InteriorStretchLabelModelPosition"]] + [
            ("SandwichLabelModel", h2["types"]["SandwichLabelModel"]["field"]),
            ("FlowchartNodeType", h2["flowchartNodeTypes"])]:
        for v in vals:
            need(YJS, f"2.6 {enum} {v}", v in got(YJS, "html2:" + enum), v in YJS2_NOT_DRAWN)
    for typ in ["ShapeNodeStyle", "BevelNodeStyle", "ShinyPlateNodeStyle", "PanelNodeStyle", "DefaultLabelStyle", "Font",
                "Arrow", "PolylineEdgeStyle"]:
        for prop in h2["types"][typ]["property"]:
            here = re.search(rf"<yjs:{typ}\b[^>]*\b{prop}=|<yjs:{typ}\.{prop}>", v2_text) is not None
            need(YJS, f"2.6 property {typ}.{prop}", here, prop in YJS2_NOT_DRAWN)
    for typ in ["InteriorLabelModel", "ExteriorLabelModel", "InteriorStretchLabelModel", "SandwichLabelModel"]:
        for prop in h2["types"][typ]["property"]:
            name = prop[0].upper() + prop[1:]
            need(YJS, f"2.6 property {typ}.{prop}", re.search(rf"<y:{typ}\b[^>]*\b{name}=", v2_text) is not None)
    for v in DASH2:
        need(YJS, f"2.6 DashStyle {v}", f'dashStyle="{v}"' in v2_text)
    for cls, props in VOCAB[YJS]["bpmn"]["styles"].items():
        for prop, ty in props.items():
            if ty in VOCAB[YJS]["bpmn"]["enums"]:
                for v in VOCAB[YJS]["bpmn"]["enums"][ty]:
                    need(YJS, f"bpmn {cls}.{prop}={v}", v in got(YJS, f"bpmn:{cls}.{prop}"),
                         cls in YJS_BPMN_NOT_DRAWN or f"{cls}.{prop}" in YJS_BPMN_NOT_DRAWN)
            else:
                need(YJS, f"bpmn {cls}.{prop}", prop in got(YJS, f"bpmn:{cls}"),
                     cls in YJS_BPMN_NOT_DRAWN or f"{cls}.{prop}" in YJS_BPMN_NOT_DRAWN)
    all_text = "".join(open(os.path.join(OUT, YJS, f"{sh.id}.graphml"), encoding="utf-8").read()
                       for sh in SHEETS if sh.fmt == YJS)
    for el in VOCAB[YJS]["observedInCorpus"]["prefixedElements"]:
        need(YJS, f"corpus element {el}", re.search(rf"<{re.escape(el)}\b", all_text) is not None,
             el in YJS_CORPUS_NOT_DRAWN)
    if missing:
        raise SystemExit("vocabulary values on no sheet and not listed as not drawn:\n  " + "\n  ".join(missing))
    return tally


if __name__ == "__main__":
    for fn in (yed_node_shapes, yed_fills_borders, yed_sizes_opacity, yed_labels, yed_edges_lines, yed_arrows,
               yed_edge_labels, yed_groups, yed_images, yjs_node_shapes, yjs_fills_borders, yjs_sizes_opacity,
               yjs_labels, yjs_edges_lines, yjs_arrows, yjs_edge_labels, yjs_groups, yjs_images, yjs_mappings,
               yjs2_node_styles, yjs2_labels, yjs2_arrows, yjs_bpmn, yjs_palette_nodes, yjs2_labels_more, yjs_more_v3):
        fn()
    for sh in SHEETS:
        sh.write()
    tally = check()
    print(f"{len(SHEETS)} sheets; vocabulary values drawn / checked: "
          + ", ".join(f"{f} {d} / {c}" for f, (c, d) in tally.items()))
    for sh in SHEETS:
        print(f"  {sh.fmt}/{sh.id}: {len(sh.items)}")
