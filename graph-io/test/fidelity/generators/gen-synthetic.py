"""Synthetic yEd coverage files for the corpus run (seeded, deterministic).

Writes, in yEd's own spelling (yFiles for Java 2.x GraphML extension, ygraphml.xsd; yEd GML), the style
features the real corpus files leave out, so that in aggregate every feature yEd can store is exercised:

  graphml-yed/synthetic-nodes.graphml   every node realizer, ShapeNode type, fill / gradient / transparent,
                                        border type and width, label font, style, size, color, background,
                                        model and position, multiple labels, groups (open, nested, closed folder)
  graphml-yed/synthetic-edges.graphml   every edge realizer, every arrow type, line type and width, alpha,
                                        ports (sx..ty), bends, smoothed bends, edge labels
  gml-yed/synthetic-coverage.gml        the yEd GML keys: node types, fill / fill2 / hasFill, outline /
                                        outlineStyle / outlineWidth / hasOutline, LabelGraphics anchor / font /
                                        color, groups (isGroup / gid), edge fill / width / style / arrows /
                                        smoothBends / Line bends / labels / edgeAnchor ports

yEd itself cannot run here (no display, proprietary): the GraphML is written as yEd writes it, element by
element, and validated by decoding it with draw.io's mxGraphMlCodec and the branch's yed_facts.py. The GML
is written through networkx's write_gml (a real GML writer) with yEd's `Creator "yFiles"` line added.

    python3 gen-synthetic.py <out root>
"""

import io
import random
import sys
from xml.sax.saxutils import escape

import networkx as nx

OUT = sys.argv[1]
rnd = random.Random(20261016)

PALETTE = ["#FFCC00", "#99CCFF", "#FF99CC", "#CCFFCC", "#C0C0C0", "#FF6600", "#3366FF", "#993366",
           "#00CC99", "#FFFFFF", "#333333", "#E8EEF7", "#B7C9E3", "#FFCC99", "#66FF66"]
SHAPES = ["rectangle", "roundrectangle", "ellipse", "parallelogram", "parallelogram2", "hexagon", "octagon",
          "diamond", "triangle", "trapezoid", "trapezoid2", "rectangle3d", "star5", "star6", "star8",
          "fatarrow", "fatarrow2", "hexagon2", "octagon2"]  # the last few: shapes newer yEd versions add
BORDER = ["line", "dashed", "dotted", "dashed_dotted"]
FONT_STYLES = ["plain", "bold", "italic", "bolditalic"]
FONTS = ["Dialog", "Arial", "Times New Roman", "Courier New"]
INTERNAL = ["c", "t", "b", "l", "r", "tl", "tr", "bl", "br"]
SIDES = ["n", "s", "e", "w"]
CORNERS = ["nw", "ne", "sw", "se"]
GENERIC = ["com.yworks.flowchart.process", "com.yworks.flowchart.decision", "com.yworks.flowchart.terminator",
           "com.yworks.flowchart.data", "com.yworks.flowchart.start1", "com.yworks.flowchart.preparation",
           "com.yworks.flowchart.manualOperation", "com.yworks.flowchart.document", "com.yworks.flowchart.storedData",
           "com.yworks.flowchart.directData", "com.yworks.flowchart.delay", "com.yworks.flowchart.annotation",
           "com.yjava.BevelNode", "com.yjava.BevelNode2", "com.yjava.ShinyPlateNode", "com.yjava.ShinyPlateNode3",
           "com.yworks.bpmn.Activity.withShadow", "com.yworks.bpmn.Event.withShadow", "com.yworks.bpmn.Gateway.withShadow",
           "com.yworks.entityRelationship.big_entity", "com.yworks.entityRelationship.attribute"]
ARROWS = ["none", "standard", "delta", "white_delta", "diamond", "white_diamond", "short", "plain", "concave",
          "convex", "circle", "transparent_circle", "white_circle", "dash", "skewed_dash", "t_shape",
          "crows_foot_one_mandatory", "crows_foot_many_mandatory", "crows_foot_many_optional", "crows_foot_one",
          "crows_foot_many", "crows_foot_optional", "cross"]
EDGE_TYPES = ["PolyLineEdge", "ArcEdge", "BezierEdge", "QuadCurveEdge", "SplineEdge", "GenericEdge"]

SVG = ('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" '
       'fill="#3366FF" stroke="#000" stroke-width="2"/><rect x="12" y="12" width="16" height="16" fill="#FFCC00"/></svg>')
# a 2x2 PNG (red, green / blue, white), base64
PNG = ("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==")

HEAD = """<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:java="http://www.yworks.com/xml/yfiles-common/1.0/java" xmlns:sys="http://www.yworks.com/xml/yfiles-common/markup/primitives/2.0" xmlns:x="http://www.yworks.com/xml/yfiles-common/markup/2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:y="http://www.yworks.com/xml/graphml" xmlns:yed="http://www.yworks.com/xml/yed/3" xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://www.yworks.com/xml/schema/graphml/1.1/ygraphml.xsd">
  <!--Created by yEd 3.23.2 (corpus-run synthetic: written in yEd's spelling by gen-synthetic.py)-->
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


def label(text, i, **kw):
    model, pos = kw.get("model", ("internal", "c"))
    a = {"alignment": kw.get("align", "center"), "autoSizePolicy": "content", "fontFamily": kw.get("font", "Dialog"),
         "fontSize": str(kw.get("size", 12)), "fontStyle": kw.get("style", "plain"),
         "hasBackgroundColor": "false" if not kw.get("bg") else "true", "hasLineColor": "false" if not kw.get("line") else "true",
         "height": "18.0", "horizontalTextPosition": "center", "iconTextGap": "4", "modelName": model,
         "modelPosition": pos, "textColor": kw.get("color", "#000000"), "verticalTextPosition": "bottom",
         "visible": kw.get("visible", "true"), "width": str(8 * len(text))}
    if kw.get("bg"):
        a["backgroundColor"] = kw["bg"]
    if kw.get("line"):
        a["lineColor"] = kw["line"]
    if kw.get("underline"):
        a["underlinedText"] = "true"
    if kw.get("rotation"):
        a["rotationAngle"] = str(kw["rotation"])
    attrs = " ".join(f'{k}="{escape(v)}"' for k, v in a.items())
    return f'<y:NodeLabel {attrs} xml:space="preserve">{escape(text)}</y:NodeLabel>'


def fill(i, kind):
    c = PALETTE[i % len(PALETTE)]
    if kind == "gradient":
        return f'<y:Fill color="{c}" color2="{PALETTE[(i + 5) % len(PALETTE)]}" transparent="false"/>'
    if kind == "transparent":
        return '<y:Fill hasColor="false" transparent="false"/>'
    if kind == "alpha":
        return f'<y:Fill color="{c}80" transparent="false"/>'
    return f'<y:Fill color="{c}" transparent="false"/>'


def border(i, width=None, kind=None, none=False):
    if none:
        return '<y:BorderStyle hasColor="false" raised="false" type="line" width="1.0"/>'
    return (f'<y:BorderStyle color="{PALETTE[(i + 3) % len(PALETTE)]}" raised="{str(i % 11 == 0).lower()}" '
            f'type="{kind or BORDER[i % 4]}" width="{width or [1.0, 2.0, 3.0, 0.5, 5.0][i % 5]}"/>')


def geom(x, y, w, h):
    return f'<y:Geometry height="{h}" width="{w}" x="{x}" y="{y}"/>'


def nodes_file():
    out = [HEAD]
    i = 0
    pos = {}

    def place(i):
        return 120.0 * (i % 10), 110.0 * (i // 10)

    def emit(body, nid, text=None):
        out.append(f'    <node id="{nid}">\n      <data key="d5"><![CDATA[{text or nid}]]></data>\n'
                   f'      <data key="d6">\n        {body}\n      </data>\n    </node>\n')

    # 1. every ShapeNode type, cycling fills, borders and label looks
    for k, shape in enumerate(SHAPES):
        x, y = place(i)
        w, h = [(60.0, 40.0), (80.0, 30.0), (40.0, 40.0), (90.0, 50.0)][k % 4]
        kind = ["solid", "gradient", "alpha", "transparent"][k % 4]
        lab = label(shape, i, size=[8, 10, 12, 14, 18, 24][k % 6], style=FONT_STYLES[k % 4], font=FONTS[k % 4],
                    color=["#000000", "#FF0000", "#0000FF", "#006600"][k % 4], model=("internal", INTERNAL[k % 9]),
                    underline=k % 7 == 0)
        emit(f'<y:ShapeNode>{geom(x, y, w, h)}{fill(k, kind)}{border(k)}{lab}<y:Shape type="{shape}"/></y:ShapeNode>',
             f"shape-{shape}")
        pos[f"shape-{shape}"] = (x, y, w, h)
        i += 1
    # 2. label models outside the node (sides, corners, eight_pos, free), background / line color, rotation,
    #    two labels, an invisible label, an empty label
    for k, (model, p) in enumerate([("sides", s) for s in SIDES] + [("corners", c) for c in CORNERS] +
                                   [("eight_pos", "n"), ("eight_pos", "se"), ("free", "anywhere"), ("sandwich", "n")]):
        x, y = place(i)
        lab = label(f"{model}:{p}", i, model=(model, p), bg="#FFFF99" if k % 2 else None,
                    line="#FF0000" if k % 3 == 0 else None, rotation=90 if k == 5 else None)
        if k == 6:
            lab += label("second label", i, model=("internal", "b"), color="#990000")
        if k == 7:
            lab = label("hidden", i, visible="false") + label("shown", i, model=("internal", "t"))
        emit(f'<y:ShapeNode>{geom(x, y, 50.0, 30.0)}{fill(k + 2, "solid")}{border(k, 1.0, "line")}{lab}'
             f'<y:Shape type="rectangle"/></y:ShapeNode>', f"label-{model}-{p}")
        pos[f"label-{model}-{p}"] = (x, y, 50.0, 30.0)
        i += 1
    # 3. GenericNode configurations (flowchart, BevelNode, ShinyPlate, BPMN, ER)
    for k, conf in enumerate(GENERIC):
        x, y = place(i)
        extra = ""
        if "bpmn" in conf:
            extra = ('<y:StyleProperties><y:Property class="com.yworks.yfiles.bpmn.view.TaskTypeEnum" '
                     'name="com.yworks.bpmn.taskType" value="TASK_TYPE_ABSTRACT"/></y:StyleProperties>')
        emit(f'<y:GenericNode configuration="{conf}">{geom(x, y, 70.0, 40.0)}{fill(k + 4, "gradient" if k % 3 == 0 else "solid")}'
             f'{border(k + 1)}{label(conf.rsplit(".", 1)[-1], i, size=11)}{extra}</y:GenericNode>', f"generic-{k}")
        pos[f"generic-{k}"] = (x, y, 70.0, 40.0)
        i += 1
    # 4. SVG, image, UML class, UML note, table nodes; a no-border, no-fill text-only node
    x, y = place(i)
    emit(f'<y:SVGNode>{geom(x, y, 40.0, 40.0)}<y:Fill color="#CCCCFF" transparent="false"/>'
         f'<y:BorderStyle color="#000000" type="line" width="1.0"/>{label("svg icon", i, model=("sandwich", "s"))}'
         f'<y:SVGNodeProperties usingVisualBounds="true"/><y:SVGModel svgBoundsPolicy="0">'
         f'<y:SVGContent refid="1"/></y:SVGModel></y:SVGNode>', "svg-node")
    pos["svg-node"] = (x, y, 40, 40)
    i += 1
    x, y = place(i)
    emit(f'<y:ImageNode>{geom(x, y, 32.0, 32.0)}<y:Fill color="#CCCCFF" transparent="false"/>'
         f'<y:BorderStyle color="#000000" type="line" width="1.0"/>{label("image icon", i, model=("sandwich", "s"))}'
         f'<y:Image alphaImage="true" refid="2"/></y:ImageNode>', "image-node")
    pos["image-node"] = (x, y, 32, 32)
    i += 1
    x, y = place(i)
    emit(f'<y:UMLClassNode>{geom(x, y, 100.0, 80.0)}<y:Fill color="#FFCC00" transparent="false"/>'
         f'<y:BorderStyle color="#000000" type="line" width="1.0"/>{label("Customer", i, style="bold", model=("internal", "t"))}'
         f'<y:UML clipContent="true" constraint="" hasDetailsColor="false" omitDetails="false" stereotype="entity" use3DEffect="true">'
         f'<y:AttributeLabel xml:space="preserve">-id: int\n-name: String</y:AttributeLabel>'
         f'<y:MethodLabel xml:space="preserve">+order(): void</y:MethodLabel></y:UML></y:UMLClassNode>', "uml-class")
    pos["uml-class"] = (x, y, 100, 80)
    i += 1
    x, y = place(i)
    emit(f'<y:UMLNoteNode>{geom(x, y, 90.0, 50.0)}<y:Fill color="#FFFFCC" transparent="false"/>'
         f'<y:BorderStyle color="#808080" type="line" width="1.0"/>{label("a UML note", i, align="left")}</y:UMLNoteNode>',
         "uml-note")
    pos["uml-note"] = (x, y, 90, 50)
    i += 1
    x, y = place(i)
    emit(f'<y:TableNode configuration="YED_TABLE_NODE">{geom(x, y, 110.0, 90.0)}<y:Fill color="#ECF5FF" color2="#0042F440" transparent="false"/>'
         f'<y:BorderStyle hasColor="false" type="line" width="1.0"/>{label("Pool", i, model=("internal", "t"))}'
         f'<y:StyleProperties><y:Property class="java.awt.Color" name="yed.table.lane.color.main" value="#C0C0C0"/></y:StyleProperties>'
         f'<y:State autoResize="true" closed="false" closedHeight="80.0" closedWidth="100.0"/>'
         f'<y:Table autoResizeTable="true" defaultColumnWidth="110.0" defaultMinimumColumnWidth="30.0" defaultMinimumRowHeight="30.0" defaultRowHeight="60.0">'
         f'<y:DefaultColumnInsets bottom="0.0" left="0.0" right="0.0" top="0.0"/><y:DefaultRowInsets bottom="0.0" left="0.0" right="0.0" top="0.0"/>'
         f'<y:Insets bottom="0.0" left="0.0" right="0.0" top="30.0"/><y:Columns><y:Column id="column_0" minimumWidth="30.0" width="110.0">'
         f'<y:Insets bottom="0.0" left="0.0" right="0.0" top="0.0"/></y:Column></y:Columns><y:Rows><y:Row height="60.0" id="row_0" minimumHeight="30.0">'
         f'<y:Insets bottom="0.0" left="0.0" right="0.0" top="0.0"/></y:Row></y:Rows></y:Table></y:TableNode>', "table-node")
    pos["table-node"] = (x, y, 110, 90)
    i += 1
    x, y = place(i)
    emit(f'<y:ShapeNode>{geom(x, y, 80.0, 20.0)}{fill(0, "transparent")}{border(0, none=True)}'
         f'{label("text only", i, size=16, style="italic")}<y:Shape type="rectangle"/></y:ShapeNode>', "text-only")
    pos["text-only"] = (x, y, 80, 20)
    i += 1
    # 5. groups: an open group with 6 members, a group nested inside it, and a closed folder
    gy = 110.0 * (i // 10 + 1) + 60
    members = []
    out.append('    <node id="grp-open" yfiles.foldertype="group">\n      <data key="d6">\n'
               f'        <y:ProxyAutoBoundsNode><y:Realizers active="0"><y:GroupNode>{geom(0.0, gy, 560.0, 260.0)}'
               '<y:Fill color="#F5F5F5" transparent="false"/><y:BorderStyle color="#000000" type="dashed" width="1.0"/>'
               '<y:NodeLabel alignment="right" autoSizePolicy="node_width" backgroundColor="#EBEBEB" borderDistance="0.0" fontFamily="Dialog" fontSize="15" fontStyle="plain" hasLineColor="false" height="21.0" modelName="internal" modelPosition="t" textColor="#000000" visible="true" width="560.0" x="0.0" y="0.0">Open group</y:NodeLabel>'
               '<y:Shape type="roundrectangle"/><y:State closed="false" closedHeight="50.0" closedWidth="50.0" innerGraphDisplayEnabled="false"/>'
               '<y:Insets bottom="15" bottomF="15.0" left="15" leftF="15.0" right="15" rightF="15.0" top="15" topF="15.0"/>'
               '<y:BorderInsets bottom="0" bottomF="0.0" left="0" leftF="0.0" right="0" rightF="0.0" top="0" topF="0.0"/></y:GroupNode>'
               f'<y:GroupNode>{geom(0.0, gy, 80.0, 50.0)}<y:Fill color="#F5F5F5" transparent="false"/><y:BorderStyle color="#000000" type="dashed" width="1.0"/>'
               '<y:NodeLabel alignment="right" autoSizePolicy="node_width" fontFamily="Dialog" fontSize="15" fontStyle="plain" modelName="internal" modelPosition="t" textColor="#000000" visible="true">Open group</y:NodeLabel>'
               '<y:Shape type="roundrectangle"/><y:State closed="true" closedHeight="50.0" closedWidth="80.0" innerGraphDisplayEnabled="false"/></y:GroupNode>'
               '</y:Realizers></y:ProxyAutoBoundsNode>\n      </data>\n      <graph edgedefault="directed" id="grp-open:">\n')
    for k in range(6):
        nid = f"grp-open::m{k}"
        x, y = 20.0 + 90 * (k % 3), gy + 40 + 70 * (k // 3)
        emit(f'<y:ShapeNode>{geom(x, y, 60.0, 30.0)}{fill(k, "solid")}{border(k, 1.0, "line")}{label(f"m{k}", i)}'
             f'<y:Shape type="ellipse"/></y:ShapeNode>', nid)
        pos[nid] = (x, y, 60, 30)
        members.append(nid)
    out.append('    <node id="grp-open::inner" yfiles.foldertype="group">\n      <data key="d6">\n'
               f'        <y:ProxyAutoBoundsNode><y:Realizers active="0"><y:GroupNode>{geom(300.0, gy + 30, 240.0, 200.0)}'
               '<y:Fill color="#CAECFF84" transparent="false"/><y:BorderStyle color="#666699" type="dotted" width="2.0"/>'
               '<y:NodeLabel alignment="right" autoSizePolicy="node_width" backgroundColor="#99CCFF" fontFamily="Dialog" fontSize="13" fontStyle="bold" modelName="internal" modelPosition="t" textColor="#000000" visible="true">Nested group</y:NodeLabel>'
               '<y:Shape type="rectangle"/><y:State closed="false" closedHeight="50.0" closedWidth="50.0" innerGraphDisplayEnabled="false"/></y:GroupNode>'
               '</y:Realizers></y:ProxyAutoBoundsNode>\n      </data>\n      <graph edgedefault="directed" id="grp-open::inner:">\n')
    for k in range(4):
        nid = f"grp-open::inner::n{k}"
        x, y = 320.0 + 110 * (k % 2), gy + 70 + 80 * (k // 2)
        emit(f'<y:ShapeNode>{geom(x, y, 60.0, 30.0)}{fill(k + 7, "solid")}{border(k + 7, 2.0, "line")}{label(f"n{k}", i)}'
             f'<y:Shape type="hexagon"/></y:ShapeNode>', nid)
        pos[nid] = (x, y, 60, 30)
    out.append('      </graph>\n    </node>\n      </graph>\n    </node>\n')
    out.append('    <node id="grp-closed" yfiles.foldertype="folder">\n      <data key="d6">\n'
               f'        <y:ProxyAutoBoundsNode><y:Realizers active="1"><y:GroupNode>{geom(600.0, gy, 300.0, 200.0)}'
               '<y:Fill color="#F2F0D8" transparent="false"/><y:BorderStyle color="#000000" type="line" width="1.0"/>'
               '<y:NodeLabel modelName="internal" modelPosition="t" fontSize="15" textColor="#000000" visible="true">Closed folder (open view)</y:NodeLabel>'
               '<y:Shape type="rectangle"/><y:State closed="false" closedHeight="50.0" closedWidth="50.0" innerGraphDisplayEnabled="false"/></y:GroupNode>'
               f'<y:GroupNode>{geom(600.0, gy, 120.0, 60.0)}<y:Fill color="#B6DCFF" transparent="false"/><y:BorderStyle color="#000000" type="line" width="2.0"/>'
               '<y:NodeLabel modelName="internal" modelPosition="c" fontSize="13" textColor="#000099" visible="true">Closed folder</y:NodeLabel>'
               '<y:Shape type="roundrectangle"/><y:State closed="true" closedHeight="60.0" closedWidth="120.0" innerGraphDisplayEnabled="false"/></y:GroupNode>'
               '</y:Realizers></y:ProxyAutoBoundsNode>\n      </data>\n      <graph edgedefault="directed" id="grp-closed:">\n')
    for k in range(3):
        nid = f"grp-closed::h{k}"
        emit(f'<y:ShapeNode>{geom(620.0 + 80 * k, gy + 60, 50.0, 30.0)}{fill(k, "solid")}{border(k, 1.0, "line")}'
             f'{label(f"hidden {k}", i)}<y:Shape type="rectangle"/></y:ShapeNode>', nid)
        pos[nid] = (620.0 + 80 * k, gy + 60, 50, 30)
    out.append('      </graph>\n    </node>\n')
    # a few plain edges so the graph is connected-ish (edge styling is the other file's job)
    ids = list(pos)
    for k in range(len(ids) - 1):
        if k % 3 == 0:
            out.append(f'    <edge id="e{k}" source="{ids[k]}" target="{ids[k + 1]}">\n      <data key="d10">\n'
                       '        <y:PolyLineEdge><y:Path sx="0.0" sy="0.0" tx="0.0" ty="0.0"/><y:LineStyle color="#000000" type="line" width="1.0"/>'
                       '<y:Arrows source="none" target="standard"/><y:BendStyle smoothed="false"/></y:PolyLineEdge>\n      </data>\n    </edge>\n')
    out.append('  </graph>\n  <data key="d7">\n    <y:Resources>\n'
               f'      <y:Resource id="1" type="java.lang.String">{escape(SVG)}</y:Resource>\n'
               f'      <y:Resource id="2" type="java.awt.image.BufferedImage">{PNG}</y:Resource>\n'
               '    </y:Resources>\n  </data>\n</graphml>\n')
    return "".join(out)


def edges_file():
    out = [HEAD]
    n = 40
    pos = {}
    for k in range(n):
        x, y = 200.0 * (k % 8), 160.0 * (k // 8)
        w, h = (50.0, 50.0) if k % 2 else (80.0, 36.0)
        pos[k] = (x, y, w, h)
        shape = "ellipse" if k % 2 else "roundrectangle"
        out.append(f'    <node id="n{k}">\n      <data key="d6">\n        <y:ShapeNode>{geom(x, y, w, h)}'
                   f'{fill(k, "solid")}{border(k, 1.0, "line")}{label(f"n{k}", k)}<y:Shape type="{shape}"/></y:ShapeNode>\n'
                   '      </data>\n    </node>\n')
    e = 0

    def center(k):
        x, y, w, h = pos[k]
        return x + w / 2, y + h / 2

    def edge(s, t, realizer, arrows, line, extra="", path_pts=(), ports=(0.0, 0.0, 0.0, 0.0), lab=None, smoothed=None):
        nonlocal e
        pts = "".join(f'<y:Point x="{px}" y="{py}"/>' for px, py in path_pts)
        conf = ' configuration="com.yworks.edge.framed"' if realizer == "GenericEdge" else ""
        lab_xml = ""
        if lab:
            text, color, size = lab
            lab_xml = (f'<y:EdgeLabel alignment="center" configuration="AutoFlippingLabel" distance="2.0" fontFamily="Dialog" '
                       f'fontSize="{size}" fontStyle="plain" hasBackgroundColor="false" hasLineColor="false" '
                       f'modelName="custom" preferredPlacement="anywhere" ratio="0.5" textColor="{color}" visible="true">{escape(text)}'
                       '<y:PreferredPlacementDescriptor angle="0.0" angleOffsetOnRightSide="0" angleReference="absolute" '
                       'angleRotationOnRightSide="co" distance="-1.0" frozen="true" placement="anywhere" side="anywhere" '
                       'sideReference="relative_to_edge_flow"/></y:EdgeLabel>')
        bend = f'<y:BendStyle smoothed="{str(smoothed).lower()}"/>' if smoothed is not None else ""
        out.append(f'    <edge id="e{e}" source="n{s}" target="n{t}">\n      <data key="d10">\n'
                   f'        <y:{realizer}{conf}><y:Path sx="{ports[0]}" sy="{ports[1]}" tx="{ports[2]}" ty="{ports[3]}">{pts}</y:Path>'
                   f'<y:LineStyle color="{line[0]}" type="{line[1]}" width="{line[2]}"/>'
                   f'<y:Arrows source="{arrows[0]}" target="{arrows[1]}"/>{lab_xml}{extra}{bend}</y:{realizer}>\n'
                   '      </data>\n    </edge>\n')
        e += 1

    # every arrow at the target and at the source, straight polylines between row neighbours
    for k, a in enumerate(ARROWS):
        s, t = k % n, (k + 1) % n
        edge(s, t, "PolyLineEdge", ("none", a), ("#000000", "line", 1.0))
        edge(t, (t + 8) % n, "PolyLineEdge", (a, "standard"), ("#333333", "line", 1.0))
    # every line type and a range of widths and colors, with alpha
    for k, (lt, w) in enumerate([(t, w) for t in ["line", "dashed", "dotted", "dashed_dotted"] for w in (0.5, 1.0, 2.0, 4.0, 7.0)]):
        s = (k * 3) % n
        t = (s + 9) % n
        col = PALETTE[k % len(PALETTE)] + ("80" if k % 4 == 3 else "")
        edge(s, t, "PolyLineEdge", ("none", "standard"), (col, lt, w))
    # every realizer, with control points; ArcEdge with its arc height
    for k, r in enumerate(EDGE_TYPES * 3):
        s = (5 * k + 2) % n
        t = (s + 10) % n
        (sx, sy), (tx, ty) = center(s), center(t)
        mid = ((sx + tx) / 2 + 40 * (1 if k % 2 else -1), (sy + ty) / 2 + 30)
        extra = ""
        pts = [mid]
        if r == "ArcEdge":
            extra = '<y:Arc height="{}" ratio="1.0" type="fixedRatio"/>'.format(25.0 if k % 2 else -40.0)
            pts = [mid]
        if r == "BezierEdge" or r == "SplineEdge":
            pts = [mid, ((sx + 3 * tx) / 4, (sy + 3 * ty) / 4 - 40)]
        if r == "QuadCurveEdge":
            extra = '<y:QuadCurveEdge straightness="0.1"/>'
            extra = ""
        edge(s, t, r, ("none", ["standard", "delta", "white_delta"][k % 3]), (PALETTE[(k + 6) % len(PALETTE)], "line", 2.0),
             extra=extra, path_pts=pts)
    # orthogonal bends, smoothed and not; off-center ports
    for k in range(12):
        s = (7 * k + 1) % n
        t = (s + 17) % n
        (sx, sy), (tx, ty) = center(s), center(t)
        pts = [(sx, (sy + ty) / 2), (tx, (sy + ty) / 2)]
        edge(s, t, "PolyLineEdge", ("none", "standard"), ("#3366FF", "line", 1.5), path_pts=pts,
             ports=(10.0, 5.0, -10.0, -5.0) if k % 3 == 0 else (0.0, 0.0, 0.0, 0.0), smoothed=k % 2 == 0)
    # edge labels: colors and sizes
    for k in range(10):
        s = (3 * k + 4) % n
        t = (s + 1) % n
        edge(s, t, "PolyLineEdge", ("none", "standard"), ("#000000", "line", 1.0),
             lab=(f"label {k}", ["#000000", "#FF0000", "#0000FF", "#006600", "#996600"][k % 5], [8, 10, 12, 14, 18][k % 5]))
    # a self loop and a pair of parallel edges
    edge(0, 0, "PolyLineEdge", ("none", "standard"), ("#000000", "line", 1.0),
         path_pts=[(center(0)[0] - 20, center(0)[1] - 60), (center(0)[0] + 20, center(0)[1] - 60)])
    edge(1, 2, "PolyLineEdge", ("none", "standard"), ("#FF0000", "line", 1.0))
    edge(1, 2, "PolyLineEdge", ("none", "standard"), ("#0000FF", "line", 1.0))
    out.append("  </graph>\n  <data key=\"d7\">\n    <y:Resources/>\n  </data>\n</graphml>\n")
    return "".join(out)


def gml_file():
    g = nx.DiGraph()
    types = ["rectangle", "roundrectangle", "ellipse", "parallelogram", "hexagon", "octagon", "diamond", "triangle",
             "trapezoid", "trapezoid2", "rectangle3d", "star5", "star6", "star8", "fatarrow", "parallelogram2"]
    anchors = ["c", "n", "s", "e", "w", "t", "b", "l", "r", "nw", "ne", "sw", "se", "tl", "tr", "bl", "br"]
    nid = 0
    gid = {}
    # groups: two groups, one nested
    groups = [(1000, "Group A", None, (300.0, 900.0, 520.0, 260.0)), (1001, "Group B (nested)", 1000, (420.0, 920.0, 240.0, 180.0))]
    for gnum, text, parent, (x, y, w, h) in groups:
        d = {"isGroup": 1,
             "graphics": {"x": x, "y": y, "w": w, "h": h, "type": "roundrectangle", "fill": "#F5F5F5",
                          "outline": "#000000", "outlineStyle": "dashed"},
             "LabelGraphics": {"text": text, "fill": "#EBEBEB", "fontSize": 15, "fontName": "Dialog",
                               "anchor": "t", "model": "null"}}
        if parent is not None:
            d["gid"] = parent - 1000  # networkx numbers ids in insertion order: the groups are 0 and 1
        g.add_node(text, **d)
    for k in range(80):
        x, y = 110.0 * (k % 10), 90.0 * (k // 10)
        if 60 <= k < 66:  # inside Group A, left of Group B
            x, y = 90.0 + 90 * ((k - 60) % 2), 830.0 + 70 * ((k - 60) // 2)
        if 66 <= k < 70:  # inside Group B
            x, y = 370.0 + 100 * ((k - 66) % 2), 890.0 + 70 * ((k - 66) // 2)
        gr = {"x": x, "y": y, "w": [60.0, 40.0, 80.0, 30.0][k % 4], "h": [30.0, 40.0, 40.0, 30.0][k % 4],
              "type": types[k % len(types)]}
        if k % 9 == 4:
            gr["hasFill"] = 0
        else:
            gr["fill"] = PALETTE[k % len(PALETTE)] + ("80" if k % 11 == 5 else "")
        if k % 6 == 1:
            gr["fill2"] = PALETTE[(k + 4) % len(PALETTE)]
        if k % 13 == 7:
            gr["hasOutline"] = 0
        else:
            gr["outline"] = PALETTE[(k + 3) % len(PALETTE)]
            gr["outlineStyle"] = BORDER[k % 4]
            gr["outlineWidth"] = [1, 2, 3, 5][k % 4]
        if k % 17 == 3:
            gr["customconfiguration"] = "com.yworks.flowchart.decision"
            del gr["type"]
        lg = {"text": f"v{k}", "fontSize": [8, 10, 12, 14, 18, 24][k % 6], "fontName": FONTS[k % 4],
              "fontStyle": FONT_STYLES[k % 4], "color": ["#000000", "#FF0000", "#0000FF", "#006600"][k % 4],
              "anchor": anchors[k % len(anchors)]}
        if k % 10 == 9:
            lg["model"] = "sides"
        d = {"graphics": gr, "LabelGraphics": lg}
        if 60 <= k < 66:
            d["gid"] = 0
        if 66 <= k < 70:
            d["gid"] = 1
        g.add_node(f"v{k}", **d)
    arrows = ["none", "standard", "delta", "white_delta", "diamond", "white_diamond", "short", "plain", "concave",
              "convex", "circle", "transparent_circle", "dash", "skewed_dash", "t_shape", "crows_foot_many"]
    styles = ["line", "dashed", "dotted", "dashed_dotted"]
    rnd2 = random.Random(7)
    for k in range(130):
        s = k % 80
        t = (s + [1, 10, 11, 9, 22][k % 5]) % 80
        if s == t or g.has_edge(f"v{s}", f"v{t}"):
            continue
        gr = {"fill": PALETTE[(k + 2) % len(PALETTE)] + ("80" if k % 15 == 7 else ""), "width": [1, 2, 3, 0.5, 5][k % 5],
              "style": styles[k % 4], "targetArrow": arrows[k % len(arrows)]}
        if k % 3 == 0:
            gr["sourceArrow"] = arrows[(k * 5) % len(arrows)]
        if k % 7 == 0:
            del gr["targetArrow"]
            gr["arrow"] = ["last", "first", "both"][k % 3]
        if k % 4 == 1:
            sx, sy = g.nodes[f"v{s}"]["graphics"]["x"], g.nodes[f"v{s}"]["graphics"]["y"]
            tx, ty = g.nodes[f"v{t}"]["graphics"]["x"], g.nodes[f"v{t}"]["graphics"]["y"]
            pts = [{"x": sx, "y": sy}, {"x": sx, "y": (sy + ty) / 2 + 20}, {"x": tx, "y": (sy + ty) / 2 + 20}, {"x": tx, "y": ty}]
            gr["Line"] = {"point": pts}
            if k % 8 == 1:
                gr["smoothBends"] = 1
        d = {"graphics": gr}
        if k % 9 == 2:
            d["label"] = f"e{k}"
            d["LabelGraphics"] = {"text": f"e{k}", "fontSize": [10, 12, 14][k % 3], "fontName": "Dialog",
                                  "color": ["#000000", "#990000", "#000099"][k % 3], "model": "side_slider",
                                  "position": "center"}
        if k % 11 == 5:
            d["edgeAnchor"] = {"xSource": -1.0, "yTarget": 1.0}
        g.add_edge(f"v{s}", f"v{t}", **d)
    buf = io.BytesIO()
    nx.write_gml(g, buf)
    text = buf.getvalue().decode()
    return 'Creator "yFiles"\nVersion "2.23"\n' + text


import os  # noqa: E402

os.makedirs(f"{OUT}/graphml-yed/synthetic-nodes", exist_ok=True)
os.makedirs(f"{OUT}/graphml-yed/synthetic-edges", exist_ok=True)
os.makedirs(f"{OUT}/gml-yed/synthetic-coverage", exist_ok=True)
open(f"{OUT}/graphml-yed/synthetic-nodes/source.graphml", "w").write(nodes_file())
open(f"{OUT}/graphml-yed/synthetic-edges/source.graphml", "w").write(edges_file())
open(f"{OUT}/gml-yed/synthetic-coverage/source.gml", "w").write(gml_file())
print("written")
