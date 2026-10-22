#!/usr/bin/env python3
"""Writes yed-vocabulary.json: the style vocabulary of yEd GraphML and of yEd Live (yFiles for HTML) GraphML, read
from yWorks' own schema and API documentation, plus what yEd itself writes in the corpus.

    python3 yed_vocabulary.py [--cache <dir>]

Sources:
  yEd GraphML (yFiles for Java 2.x, the library yEd is built on):
    https://www.yworks.com/xml/schema/graphml/1.1/ygraphics.xsd   the GraphML extension schema: every enumeration
                                                                  and every attribute of every y: element
    https://docs.yworks.com/yfiles/doc/api/y/view/ShapeNodeRealizer.html, .../Arrow.html
                                                                  the shape and arrow constants of yFiles 2.19, which
                                                                  name the shapes and arrows yEd added after the
                                                                  schema (star5, crows_foot_many, ...)
    graph-io/test/corpus/**/*.graphml(.gz) "Created by yEd"       what yEd really writes: realizers and attributes
                                                                  the schema predates (SVGNode, UMLClassNode,
                                                                  BorderStyle raised, ...)
    GENERIC_CONFIGURATIONS below                                  yEd's GenericNode palette ids (no schema lists them)
    BPMN_PROPERTIES below                                         the BPMN palette's style properties (no yWorks
                                                                  document lists them): corpus and draw.io's importer
    https://docs.yworks.com/ybpmn/doc/api/com/yworks/yfiles/bpmn/view/<Enum>.html
                                                                  the yFiles BPMN extension yEd's BPMN palette is built
                                                                  on: every value of its type, activity type, marker,
                                                                  task type, data object type and event characteristic
  yEd Live GraphML (yFiles for HTML 3, the library yEd Live is built on):
    https://docs.yworks.com/yfiles-html/api/<Type>.html           every enumeration (ShapeNodeShape, ArrowType, ...)
                                                                  and the GraphML-visible properties of every style
  yEd Live GraphML as yEd Live wrote it before its yFiles for HTML 3 update (yFiles for HTML 2.x markup):
    https://docs.yworks.com/yfiles-html-2.6/api/<Type>.html       the 2.6 enumerations and style properties
    yfiles-for-html-demos v2.6 .../flowchart/style/FlowchartStyle.ts
                                                                  FlowchartNodeType: yEd Live's flowchart palette
    yfiles-for-html-demos v2.6 .../showcase/bpmn/bpmn-view.ts     yEd Live's BPMN palette (the bpmn: namespace, in
                                                                  2.x and 3.0 files alike): every style's stored
                                                                  properties and every enumeration

yed.py reads the JSON and fails when a value in it is neither on a specimen sheet nor listed with the reason it is
not, so a new yEd or yFiles release (a new shape, arrow or label model) shows up as a missing specimen.
"""
import gzip
from html import unescape
import json
import os
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "../../../../.."))
CORPUS = os.path.join(REPO, "graph-io/test/corpus")
XSD = "https://www.yworks.com/xml/schema/graphml/1.1/ygraphics.xsd"
JAVADOC = "https://docs.yworks.com/yfiles/doc/api/y/view/{}.html"
HTMLDOC = "https://docs.yworks.com/yfiles-html/api/{}.html"
HTML2DOC = "https://docs.yworks.com/yfiles-html-2.6/api/{}.html"
FLOWCHART_STYLE = ("https://raw.githubusercontent.com/yWorks/yfiles-for-html-demos/v2.6/demos/showcase/flowchart/"
                   "style/FlowchartStyle.ts")
BPMN_VIEW = "https://raw.githubusercontent.com/yWorks/yfiles-for-html-demos/v2.6/demos/showcase/bpmn/bpmn-view.ts"
# A bpmn-view.ts style property typed number: the enumeration it takes (per style, then for every style), or a number.
BPMN_VIEW_ENUM = {
    ("ChoreographyNodeStyle", "type"): "ChoreographyType", ("BpmnEdgeStyle", "type"): "EdgeType",
    ("DataObjectNodeStyle", "type"): "DataObjectType", ("ConversationNodeStyle", "type"): "ConversationType",
    ("EventNodeStyle", "type"): "EventType", ("GatewayNodeStyle", "type"): "GatewayType", ("EventPortStyle", "type"): "EventType",
    "activityType": "ActivityType", "taskType": "TaskType", "triggerEventType": "EventType",
    "triggerEventCharacteristic": "EventCharacteristic", "characteristic": "EventCharacteristic",
    "loopCharacteristic": "LoopCharacteristic", "subState": "SubState",
}
BPMN_VIEW_NUMBERS = {("BpmnEdgeStyle", "smoothing"), ("AnnotationLabelStyle", "insets")}
YBPMN = "https://docs.yworks.com/ybpmn/doc/api/com/yworks/yfiles/bpmn/view/{}.html"
XS = "{http://www.w3.org/2001/XMLSchema}"

# yFiles for HTML enumerations whose members are values a GraphML file stores.
HTML_ENUMS = ["ShapeNodeShape", "ArrowType", "DashStyle", "LabelShape", "TextWrapping", "HorizontalTextAlignment",
              "VerticalTextAlignment", "TextDecorations", "InteriorNodeLabelModelPosition", "ExteriorNodeLabelModelPosition",
              "StretchNodeLabelModelPosition", "NinePositionsEdgeLabelModelPosition", "EdgeSides", "FontStyle",
              "LineCap", "LineJoin", "RectangleCornerStyle", "ArrowStyleShape", "ArrowNodeDirection",
              "GroupNodeStyleTabPosition", "GroupNodeStyleIconType", "GroupNodeStyleIconBackgroundShape",
              "GroupNodeStyleIconPosition"]
# yFiles for HTML style and model types whose properties a GraphML file stores.
HTML_TYPES = ["ShapeNodeStyle", "RectangleNodeStyle", "GroupNodeStyle", "ImageNodeStyle", "ArrowNodeStyle",
              "PolylineEdgeStyle", "BezierEdgeStyle", "ArcEdgeStyle", "LabelStyle", "Stroke", "Arrow", "Font",
              "LinearGradient", "RadialGradient", "SmartEdgeLabelModel", "SmartEdgeLabelModelParameter",
              "EdgePathLabelModel", "EdgeSegmentLabelModel", "NinePositionsEdgeLabelModel", "FreeEdgeLabelModel",
              "FreeNodeLabelModel", "InteriorNodeLabelModel", "ExteriorNodeLabelModel", "StretchNodeLabelModel"]

# yFiles for HTML 2.6 (what yEd Live wrote before its yFiles for HTML 3 update, and what most yEd Live files in the
# corpus are): its enumerations and the style types whose properties a GraphML file stores, from the 2.6 API reference.
HTML2_ENUMS = ["ShapeNodeShape", "ArrowType", "DashStyle", "FontStyle", "FontWeight", "TextDecoration", "TextWrapping",
               "LabelShape", "HorizontalTextAlignment", "VerticalTextAlignment", "InteriorLabelModelPosition",
               "ExteriorLabelModelPosition", "InteriorStretchLabelModelPosition"]
HTML2_TYPES = ["ShapeNodeStyle", "BevelNodeStyle", "ShinyPlateNodeStyle", "PanelNodeStyle", "DefaultLabelStyle", "Font",
               "Arrow", "PolylineEdgeStyle", "InteriorLabelModel", "ExteriorLabelModel", "InteriorStretchLabelModel",
               "SandwichLabelModel"]
# a 2.6 API page's member anchors that are methods, not stored properties
HTML2_METHOD = re.compile(r"^(get|create|clone|apply|freeze|is[A-Z]|as[A-Z]|equals|hashCode|toString|lookup)")

# The yEd BPMN palette's style properties (y:StyleProperties of a com.yworks.bpmn.* GenericNode): no yWorks document
# lists them. "observed": the value as a yEd-written corpus file spells it; "inferred": the value as draw.io 32.4.1's yEd
# importer (mxGraphMlCodec's bpmnSymbol and bpmnOutline tables, which match yEd's values case-insensitively) lists it,
# upper-cased like its observed siblings. Each property's Java class is the one yEd writes in the corpus.
BPMN_PROPERTIES = {
    "com.yworks.bpmn.type": ("com.yworks.yfiles.bpmn.view.BPMNTypeEnum", [
        "EVENT_TYPE_PLAIN", "EVENT_TYPE_MESSAGE", "EVENT_TYPE_TIMER", "EVENT_TYPE_ESCALATION", "EVENT_TYPE_CONDITIONAL",
        "EVENT_TYPE_LINK", "EVENT_TYPE_ERROR", "EVENT_TYPE_CANCEL", "EVENT_TYPE_COMPENSATION", "EVENT_TYPE_SIGNAL",
        "EVENT_TYPE_MULTIPLE", "EVENT_TYPE_PARALLEL_MULTIPLE", "EVENT_TYPE_TERMINATE",
        "GATEWAY_TYPE_PLAIN", "GATEWAY_TYPE_DATA_BASED_EXCLUSIVE", "GATEWAY_TYPE_INCLUSIVE", "GATEWAY_TYPE_PARALLEL",
        "GATEWAY_TYPE_COMPLEX", "GATEWAY_TYPE_EVENT_BASED_EXCLUSIVE", "GATEWAY_TYPE_EVENT_BASED_EXCLUSIVE_START_PROCESS",
        "GATEWAY_TYPE_PARALLEL_EVENT_BASED_EXCLUSIVE_START_PROCESS",
        "ARTIFACT_TYPE_DATA_OBJECT", "ARTIFACT_TYPE_ANNOTATION", "ARTIFACT_TYPE_GROUP", "ARTIFACT_TYPE_DATA_STORE",
        "ARTIFACT_TYPE_REPLY_MESSAGE", "ARTIFACT_TYPE_REQUEST_MESSAGE"]),
    "com.yworks.bpmn.characteristic": ("com.yworks.yfiles.bpmn.view.EventCharEnum", [
        "EVENT_CHARACTERISTIC_START", "EVENT_CHARACTERISTIC_START_EVENT_SUB_PROCESS_INTERRUPTING",
        "EVENT_CHARACTERISTIC_START_EVENT_SUB_PROCESS_NON_INTERRUPTING", "EVENT_CHARACTERISTIC_INTERMEDIATE_CATCHING",
        "EVENT_CHARACTERISTIC_INTERMEDIATE_BOUNDARY_INTERRUPTING",
        "EVENT_CHARACTERISTIC_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING", "EVENT_CHARACTERISTIC_INTERMEDIATE_THROWING",
        "EVENT_CHARACTERISTIC_END"]),
    "com.yworks.bpmn.taskType": ("com.yworks.yfiles.bpmn.view.TaskTypeEnum", [
        "TASK_TYPE_ABSTRACT", "TASK_TYPE_SEND", "TASK_TYPE_RECEIVE", "TASK_TYPE_USER", "TASK_TYPE_MANUAL",
        "TASK_TYPE_BUSINESS_RULE", "TASK_TYPE_SERVICE", "TASK_TYPE_SCRIPT"]),
    "com.yworks.bpmn.dataObjectType": ("com.yworks.yfiles.bpmn.view.DataObjectTypeEnum", [
        "DATA_OBJECT_TYPE_PLAIN", "DATA_OBJECT_TYPE_INPUT", "DATA_OBJECT_TYPE_OUTPUT"]),
    "com.yworks.bpmn.icon.fill": ("java.awt.Color", []),
    "com.yworks.bpmn.icon.fill2": ("java.awt.Color", []),
    "com.yworks.bpmn.icon.line.color": ("java.awt.Color", []),
    # no corpus file writes these: the class is the yFiles BPMN enum's (same package as TaskTypeEnum), the values its
    # constants with the prefix yEd writes (draw.io's importer reads activity_type_transaction and bpmn_marker_loop)
    "com.yworks.bpmn.activityType": ("com.yworks.yfiles.bpmn.view.ActivityTypeEnum", []),
    "com.yworks.bpmn.marker1": ("com.yworks.yfiles.bpmn.view.MarkerTypeEnum", []),
    "com.yworks.bpmn.marker2": ("com.yworks.yfiles.bpmn.view.MarkerTypeEnum", []),
    "com.yworks.bpmn.marker3": ("com.yworks.yfiles.bpmn.view.MarkerTypeEnum", []),
    "com.yworks.bpmn.marker4": ("com.yworks.yfiles.bpmn.view.MarkerTypeEnum", []),
}
# Each property's full value list, from the yFiles BPMN javadoc: (enum page, prefix yEd writes before a constant).
# The values above must all be among them; a constant the javadoc adds shows up as a missing specimen.
BPMN_ENUMS = {
    "com.yworks.bpmn.type": ("BpmnTypeEnum", ""),
    "com.yworks.bpmn.characteristic": ("EventCharEnum", ""),
    "com.yworks.bpmn.taskType": ("TaskTypeEnum", "TASK_TYPE_"),
    "com.yworks.bpmn.dataObjectType": ("DataObjectTypeEnum", "DATA_OBJECT_TYPE_"),
    "com.yworks.bpmn.activityType": ("ActivityTypeEnum", "ACTIVITY_TYPE_"),
    "com.yworks.bpmn.marker1": ("MarkerTypeEnum", "BPMN_MARKER_"),
}
# Other style properties yEd's palettes write that no corpus file shows, with their Java class: draw.io 32.4.1's
# mxGraphMlCodec reads them (SBGN corner radius and clone marker, the table lane style, section color and header height).
STYLE_PROPERTIES = {
    "com.yworks.sbgn.style.radius": "java.lang.Double",
    "com.yworks.sbgn.style.inverse": "java.lang.Boolean",
    "yed.table.lane.style": "java.lang.String",
    "yed.table.section.color": "java.awt.Color",
    "yed.table.header.height": "java.lang.Double",
    # SBGN multimer count and a complex's corner radius, as yEd-made SBGN maps write them (YED_SBGN_FILES below)
    "com.yworks.sbgn.style.mcount": "java.lang.Integer",
    "com.yworks.sbgn.style.radiusY": "java.lang.Integer",
}

# yEd's GenericNode palette ids, which no schema lists: yEd's Flowchart, BPMN, Entity Relationship, SBGN and
# "Modern Nodes" palette sections. "observed": spelled as a yEd-written corpus file spells it; "inferred": the id's
# letters as draw.io 32.4.1's yEd importer (mxGraphMlShapesMap) lists them, cased like its observed siblings.
GENERIC_CONFIGURATIONS = {
    "flowchart": ["start1", "start2", "terminator", "process", "predefinedProcess", "decision", "loopLimit",
                  "loopLimitEnd", "document", "data", "directData", "storedData", "sequentialData", "dataBase",
                  "internalStorage", "manualInput", "card", "paperType", "cloud", "delay", "display",
                  "manualOperation", "preparation", "onPageReference", "offPageReference", "userMessage",
                  "networkMessage", "annotation"],
    "bpmn": ["Activity", "Activity.withShadow", "Event", "Event.withShadow", "Gateway", "Gateway.withShadow",
             "Conversation", "Conversation.withShadow", "Artifact", "Artifact.withShadow"],
    "entityRelationship": ["big_entity", "small_entity", "relationship", "attribute"],
    # SBGN ids are spelled as yEd writes them (YED_SBGN_FILES), not as draw.io's lower-cased table suggests
    "sbgn": ["UnspecifiedEntity", "SimpleChemical", "Macromolecule", "NucleicAcidFeature", "PerturbingAgent",
             "Phenotype", "EmptySet", "Submap", "UnitOfInformation", "StateVariable", "Tag", "Process", "Operator"],
    "yjava": ["BevelNode", "BevelNode2", "BevelNode3", "BevelNodeWithShadow", "ShinyPlateNode", "ShinyPlateNode2",
              "ShinyPlateNode3", "ShinyPlateNodeWithShadow"],
}
# yEd's GenericGroupNode palette ids beyond the corpus's PanelNode and DemoGroup: the SBGN palette's complex.
GENERIC_GROUP_CONFIGURATIONS = {"sbgn": ["Complex"]}
# Where the SBGN spellings come from (no corpus file is an SBGN map): a file saved by yEd 3.17.1 (Process,
# SimpleChemical), the ACSN maps the ySBGN project ships for yEd (every other id, Complex as a GenericGroupNode,
# mcount, radiusY), and ySBGN's own table of yEd's ids (ConverterDefines.java), which agrees with both.
YED_SBGN_FILES = [
    "https://raw.githubusercontent.com/sbgn/ySBGN/master/example_files/process_port_diagrams/ProcessPorts.graphml",
    "https://raw.githubusercontent.com/sbgn/ySBGN/master/acsn_diagrams/apoptosis_v1.graphml",
    "https://raw.githubusercontent.com/sbgn/ySBGN/master/src/main/java/fr/eisbm/GRAPHML2SBGNML/ConverterDefines.java",
]
PREFIX = {"flowchart": "com.yworks.flowchart.", "bpmn": "com.yworks.bpmn.",
          "entityRelationship": "com.yworks.entityRelationship.", "sbgn": "com.yworks.sbgn.", "yjava": "com.yjava."}

# yFiles 2.19 label models and the positions each takes (y.view.NodeLabel / EdgeLabel javadoc: the model constants
# and the position constants documented for each).
NODE_LABEL_POSITIONS = {
    "internal": ["c", "t", "b", "l", "r", "tl", "tr", "bl", "br"],
    "sandwich": ["n", "s"],
    "sides": ["n", "s", "e", "w"],
    "corners": ["nw", "ne", "sw", "se"],
    "eight_pos": ["n", "ne", "e", "se", "s", "sw", "w", "nw"],
    "free": ["anywhere"],
    "custom": ["anywhere"],
}
EDGE_LABEL_POSITIONS = {
    "centered": ["center"],
    "two_pos": ["head", "tail"],
    "three_center": ["scentr", "center", "tcentr"],
    "six_pos": ["shead", "head", "thead", "stail", "tail", "ttail"],
    "center_slider": ["center"],
    "side_slider": ["center"],
    "free": ["anywhere"],
    "custom": ["anywhere"],
}


def fetch(url, cache):
    name = re.sub(r"[^A-Za-z0-9.]+", "_", url.split("//", 1)[1])
    path = os.path.join(cache, name) if cache else None
    if path and os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return f.read()
    with urllib.request.urlopen(url, timeout=60) as r:
        text = r.read().decode("utf-8")
    if path:
        os.makedirs(cache, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
    return text


def schema(text):
    root = ET.fromstring(text)
    enums = {}
    for st in root.iter(XS + "simpleType"):
        vals = [e.get("value") for e in st.iter(XS + "enumeration")]
        if vals:
            enums[st.get("name").removesuffix(".type")] = vals
    types = {}
    for ct in root.findall(XS + "complexType"):
        attrs = [a.get("name") for a in ct.iter(XS + "attribute") if a.get("name")]
        base = [e.get("base").removesuffix(".type") for e in ct.iter(XS + "extension")]
        types[ct.get("name").removesuffix(".type")] = {"attributes": attrs, "extends": base}
    elements = {e.get("name"): (e.get("type") or "").removesuffix(".type") for e in root.findall(XS + "element")}
    return enums, types, elements


def javadoc_constants(text):
    return sorted(set(re.findall(r'<[Aa] [Hh][Rr][Ee][Ff]="[^"]*#([A-Z][A-Z0-9_]+)"', text)))


def yed_spelling(constant):
    """A yFiles 2.x ShapeNodeRealizer constant as yEd's GraphML spells it (RECT_3D -> rectangle3d)."""
    special = {"RECT": "rectangle", "ROUND_RECT": "roundrectangle", "RECT_3D": "rectangle3d"}
    return special.get(constant, constant.lower().replace("_", ""))


def html_members(text, cls):
    out = {}
    for kind, name in re.findall(r"--tl-" + cls + r"-(field|property)-([A-Za-z0-9_]+)", text):
        if name not in out.setdefault(kind, []):
            out[kind].append(name)
    return out


def html2_members(text):
    """A yFiles for HTML 2.6 API page's members: its constants (upper case) and its stored properties."""
    ids = [i for i in re.findall(r'id="([A-Za-z][A-Za-z0-9_]*)"', text)]
    skip = {"constants", "from", "properties", "methods", "fields", "constructors", "defaults", "events", "implements",
            "extends", "inheritance", "introduction", "features"}
    out = {"field": [], "property": []}
    for i in ids:
        if i in skip or "_" in i and not i.isupper():
            continue
        kind = "field" if i.isupper() else "property"
        if kind == "property" and HTML2_METHOD.match(i):
            continue
        if i not in out[kind]:
            out[kind].append(i)
    return out


def ybpmn_fields(text):
    """A yFiles BPMN javadoc enum page's constants (its field summary)."""
    return sorted(set(re.findall(r"static\s+\S+\s+([A-Z][A-Z0-9_]+)", unescape(re.sub(r"<[^>]+>", " ", text)))))


def bpmn_view(text):
    """yEd Live's BPMN palette from bpmn-view.ts: its enumerations, and each exported *Style class's stored
    properties (a public getter with a setter) with their type, an enumeration's name for a number."""
    enums = {}
    for m in re.finditer(r"export const (\w+) = \(Enum as any\)\('\w+', \{(.*?)\n\}\)", text, re.S):
        body = re.sub(r"/\*.*?\*/", "", m.group(2), flags=re.S)
        enums[m.group(1)] = re.findall(r"^\s*([A-Z][A-Z0-9_]*)\s*:", body, re.M)
    starts = [(m.start(), m.group(1)) for m in re.finditer(r"^export class (\w+Style) extends", text, re.M)]
    ends = [m.start() for m in re.finditer(r"^export ", text, re.M)]
    styles, defaults = {}, {}
    for s, name in starts:
        e = min([x for x in ends if x > s] + [len(text)])
        body = text[s:e]
        sets = set(re.findall(r"^  set (\w+)\(", body, re.M))
        props = {}
        for g, ty in re.findall(r"^  get (\w+)\(\): ([^{]+?) \{", body, re.M):
            if g not in sets:
                continue
            ty = ty.strip()
            if ty == "number" and (name, g) not in BPMN_VIEW_NUMBERS:
                ty = BPMN_VIEW_ENUM.get((name, g)) or BPMN_VIEW_ENUM[g]
                if ty not in enums:
                    raise SystemExit(f"bpmn-view.ts: {name}.{g} names enumeration {ty}, which it does not define")
            props[g] = ty
            d = re.search(rf"^  private _{g}(?:: boolean)? = (true|false)$", body, re.M)
            if ty == "boolean" and d:
                defaults.setdefault(name, {})[g] = d.group(1)
        styles[name] = props
    if not enums or not styles:
        raise SystemExit("bpmn-view.ts: no enumerations or styles read")
    return {"enums": enums, "styles": styles, "booleanDefaults": defaults}


def flowchart_types(text):
    """The FlowchartNodeType values of yFiles for HTML 2.6's flowchart demo style (yEd Live's flowchart palette)."""
    block = re.search(r"export enum FlowchartNodeType \{(.*?)\}", text, re.S)
    return re.findall(r"=\s*'([A-Za-z0-9]+)'", block.group(1)) if block else []


def corpus_files(marker, also=None):
    for dp, _, fs in os.walk(CORPUS):
        for f in sorted(fs):
            if not (f.endswith(".graphml") or f.endswith(".graphml.gz")):
                continue
            p = os.path.join(dp, f)
            b = open(p, "rb").read()
            t = (gzip.decompress(b) if f.endswith(".gz") else b).decode("utf8", "replace")
            if marker in t[:600] or also is not None and also in t[:2000]:
                yield os.path.relpath(p, REPO), t


def observed_yed():
    pats = {
        "realizers": r"<y:([A-Z][A-Za-z]+(?:Node|Edge))\b",
        "shapes": r'<y:Shape [^>]*type="([^"]+)"',
        "arrows": r'<y:Arrows [^>]*(?:source|target)="([^"]+)"',
        "lineTypes": r'<y:(?:LineStyle|BorderStyle) [^>]*type="([^"]+)"',
        "configurations": r'<y:Generic(?:Group)?Node [^>]*configuration="([^"]+)"',
        "edgeConfigurations": r'<y:GenericEdge [^>]*configuration="([^"]+)"',
        "borderStyleAttributes": r"<y:BorderStyle ((?:\w+=\"[^\"]*\"\s*)+)",
        "labelChildren": r"<y:(Smart\w+LabelModel\w*|PreferredPlacementDescriptor)\b",
        "labelModels": r"<y:(\w+LabelModel)\b",
        "labelConfigurations": r'<y:(?:Node|Edge)Label [^>]*configuration="([^"]+)"',
        "styleProperties": r'<y:Property class="[^"]+" name="([^"]+)"',
        "bpmnValues": r'name="(com\.yworks\.bpmn\.[\w.]+)" value="([A-Z_]+)"',
    }
    found = {k: set() for k in pats}
    files = []
    for rel, t in corpus_files("Created by yEd"):
        files.append(rel)
        for k, rx in pats.items():
            for m in re.findall(rx, t):
                if k == "borderStyleAttributes":
                    found[k].update(re.findall(r"(\w+)=", m))
                elif k == "bpmnValues":
                    found[k].add(m[1])
                else:
                    found[k].add(m)
        for m in re.findall(r'<y:Arrows source="([^"]+)" target="([^"]+)"', t):
            found["arrows"].update(m)
    return {k: sorted(v) for k, v in found.items()}, files


def observed_yfiles_html():
    found = {"styles": set(), "elements": set(), "prefixedElements": set()}
    files = []
    # yFiles for HTML files: the writer's comment, or (a file saved without it) a yjs namespace on the root
    for rel, t in corpus_files("Created by yFiles for HTML", 'xmlns:yjs="'):
        if "/generated/" in rel:
            continue  # graph-io's own synthetic test files, not a program's output
        files.append(rel)
        found["styles"].update(re.findall(r"<yjs:(\w+Style)\b", t))
        found["elements"].update(re.findall(r"<(?:y|yx|yjs):(\w+)\b", t))
        # every element in every namespace, prefix kept: yEd Live's palette styles live in their own namespaces
        found["prefixedElements"].update(f"{p}:{n}" for p, n in re.findall(r"<([A-Za-z][\w-]*):([A-Za-z]\w*)\b", t))
    return {k: sorted(v) for k, v in found.items()}, files


def main():
    cache = sys.argv[sys.argv.index("--cache") + 1] if "--cache" in sys.argv else None
    enums, types, elements = schema(fetch(XSD, cache))
    shape_consts = [c for c in javadoc_constants(fetch(JAVADOC.format("ShapeNodeRealizer"), cache))
                    if not c.startswith(("HOTSPOT", "KEY_", "VALUE_"))]
    arrow_consts = [c for c in javadoc_constants(fetch(JAVADOC.format("Arrow"), cache))
                    if not c.endswith("_TYPE")]
    seen, yed_files = observed_yed()
    shapes = list(enums["shapeType"])
    for s in [yed_spelling(c) for c in shape_consts] + seen["shapes"]:
        if s not in shapes:
            shapes.append(s)
    arrows = list(enums["arrowType"])
    for a in [c.lower() for c in arrow_consts] + seen["arrows"]:
        if a not in arrows:
            arrows.append(a)
    configurations = [{"id": PREFIX[g] + n, "palette": g,
                       "spelling": "observed" if PREFIX[g] + n in seen["configurations"] else ("ySBGN" if g == "sbgn" else "inferred")}
                      for g, names in GENERIC_CONFIGURATIONS.items() for n in names]
    group_configurations = [{"id": PREFIX[g] + n, "palette": g, "spelling": "ySBGN"}
                            for g, names in GENERIC_GROUP_CONFIGURATIONS.items() for n in names]
    html_seen, html_files = observed_yfiles_html()
    html = {}
    for cls in HTML_ENUMS + HTML_TYPES:
        page = fetch(HTMLDOC.format(cls), cache)
        html[cls] = html_members(page, cls)
        if cls == "Font":
            # fontWeight is a string union, not an enumeration: "fontWeight : 'normal' | 'bold' | ... | string"
            union = re.search(r"fontWeight\s*:\s*((?:&#39;[a-z]+&#39;\s*\|\s*)+)", re.sub(r"<[^>]+>", " ", page))
            html["FontWeight"] = {"field": re.findall(r"&#39;([a-z]+)&#39;", union.group(1)) if union else []}
    html2 = {cls: html2_members(fetch(HTML2DOC.format(cls), cache)) for cls in HTML2_ENUMS + HTML2_TYPES}
    flow = flowchart_types(fetch(FLOWCHART_STYLE, cache))
    bpmn_html = bpmn_view(fetch(BPMN_VIEW, cache))
    for name, (enum, prefix) in BPMN_ENUMS.items():
        consts = [prefix + c for c in ybpmn_fields(fetch(YBPMN.format(enum), cache))]
        if not consts:
            raise SystemExit(f"no constants read from {YBPMN.format(enum)}")
        listed = BPMN_PROPERTIES[name][1]
        stray = [v for v in listed if v not in consts]
        if stray:
            raise SystemExit(f"{name}: values the yFiles BPMN javadoc does not list: {stray}")
        listed.extend(v for v in consts if v not in listed)
    bpmn = {name: {"class": cls, "values": [{"value": v, "spelling": "observed" if v in seen["bpmnValues"] else "inferred"}
                                            for v in vals]}
            for name, (cls, vals) in BPMN_PROPERTIES.items()}
    vocab = {
        "about": "The style vocabulary of yEd GraphML and yEd Live GraphML, read by yed_vocabulary.py from yWorks' "
                 "schema and API documentation and from what yEd writes in the corpus; yed.py builds both formats' "
                 "specimen sheets from it and checks that every value is drawn or listed as not drawn, with the reason.",
        "sources": {
            "schema": XSD,
            "javadoc": [JAVADOC.format("ShapeNodeRealizer"), JAVADOC.format("Arrow")],
            "yfilesHtml2": HTML2DOC.format("<Type>"),
            "bpmn": "the yEd BPMN palette's style properties: yEd-written corpus files and draw.io 32.4.1's mxGraphMlCodec",
            "ybpmn": YBPMN.format("<Enum>"),
            "ysbgn": YED_SBGN_FILES,
            "yfilesHtml": HTMLDOC.format("<Type>"),
            "corpus": "graph-io/test/corpus: files whose header says 'Created by yEd' / 'Created by yFiles for HTML'",
        },
        "yed-graphml": {
            "schemaEnums": enums,
            "schemaTypes": types,
            "schemaElements": elements,
            "shapes": shapes,
            "arrows": arrows,
            "lineTypes": enums["lineType"],
            "nodeLabelPositions": NODE_LABEL_POSITIONS,
            "edgeLabelPositions": EDGE_LABEL_POSITIONS,
            "genericConfigurations": configurations,
            "genericGroupConfigurations": group_configurations,
            "bpmnStyleProperties": bpmn,
            "styleProperties": STYLE_PROPERTIES,
            "observedInCorpus": seen,
            "corpusFiles": len(yed_files),
        },
        "yed-live-graphml": {
            "types": html,
            "yfilesHtml2": {"types": html2, "flowchartNodeTypes": flow, "source": HTML2DOC.format("<Type>"),
                            "flowchartSource": FLOWCHART_STYLE},
            "bpmn": {"source": BPMN_VIEW, "namespace": "http://www.yworks.com/xml/yfiles-bpmn/2.0", **bpmn_html},
            "observedInCorpus": html_seen,
            "corpusFiles": len(html_files),
        },
    }
    out = os.path.join(HERE, "yed-vocabulary.json")
    with open(out, "w", encoding="ascii") as f:
        json.dump(vocab, f, indent=4, ensure_ascii=True)
        f.write("\n")
    print(f"{out}: {len(shapes)} shapes, {len(arrows)} arrows, {len(configurations)} GenericNode configurations, "
          f"{len(html)} yFiles for HTML 3 types, {len(html2)} 2.6 types, {len(flow)} flowchart types; corpus files: yEd {len(yed_files)}, yFiles for HTML {len(html_files)}")


if __name__ == "__main__":
    main()
