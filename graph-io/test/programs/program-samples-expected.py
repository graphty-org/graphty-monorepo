#!/usr/bin/env python3
"""
Writes program-samples-expected.json: what each styled program sample's file states for every node (by id) and every
edge (by its place in the file), read from the file alone with the program's own meaning of each value, never from
graph-io. program-samples.test.ts checks graph-io reads every one of them. Each sample lists the properties its file
states (nodeProperties, edgeProperties) and one row of values per node and per edge, null where the file states none
for it.

Run it again only on purpose (a sample changed, or a value is found to be stated differently): python3
test/programs/program-samples-expected.py, from graph-io. Standard library only.
"""

import csv
import gzip
import io
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
TEST = os.path.dirname(HERE)


def path(rel):
    return os.path.join(TEST, rel)


def local(tag):
    return tag.rsplit("}", 1)[-1]


def kids(el, name):
    return [c for c in el if local(c.tag) == name]


def kid(el, name):
    found = kids(el, name)
    return found[0] if found else None


def hex_color(value):
    """#rgb, #rrggbb or #rrggbbaa as lowercase #rrggbb, and the alpha 0..1 when stated."""
    v = value.strip().lstrip("#").lower()
    if len(v) == 3:
        v = "".join(c * 2 for c in v)
    alpha = None
    if len(v) == 8:
        v, alpha = v[:6], int(v[6:], 16) / 255
    return "#" + v, alpha


def put(values, key, value):
    if value is not None:
        values[key] = value


# --- yEd (desktop): y:ShapeNode / y:GroupNode, y:PolyLineEdge -----------------------------------------------------

YED_SHAPES = {
    "rectangle": "rectangle",
    "roundrectangle": "round-rectangle",
    "ellipse": "ellipse",
    "hexagon": "hexagon",
    "octagon": "octagon",
    "parallelogram": "parallelogram",
    "diamond": "diamond",
    "triangle": "triangle",
    "parallelogram2": "parallelogram",
    "trapezoid": "trapezoid",
    # drawn as graphty's own shapes do not draw them (a star with a point down, a triangle pointing down, an arrow
    # box): an outline of corners
    "star5": "polygon",
    "star6": "polygon",
    "star8": "polygon",
    "triangle2": "polygon",
    "fatarrow": "polygon",
    "fatarrow2": "polygon",
}
YED_LINES = {"line": "solid", "dashed": "dashed", "dotted": "dotted", "dashed_dotted": "dash-dot"}
# yEd's "standard" arrow is a filled head with a notched back: a vee
YED_ARROWS = {"none": "none", "standard": "vee", "delta": "triangle", "white_delta": "triangle-open"}
# yEd paints an open group inside another group 20 darker in each channel than its stored fill
YED_NESTED_DARKER = 20
YED_INSETS = 15


def yed_node(realizer):
    values = {}
    shape = kid(realizer, "Shape")
    # a ShapeNode with no y:Shape is a rectangle; a group node's y:Shape is its outline
    put(values, "shape", YED_SHAPES[shape.get("type") if shape is not None else "rectangle"])
    geometry = kid(realizer, "Geometry")
    values["width"] = float(geometry.get("width"))
    values["height"] = float(geometry.get("height"))
    fill = kid(realizer, "Fill")
    if fill is not None:
        if fill.get("hasColor") == "false" or fill.get("transparent") == "true":
            values["fillOpacity"] = 0
        else:
            color, alpha = hex_color(fill.get("color"))
            values["fill"] = color
            if alpha is not None:
                values["fillOpacity"] = alpha
    border = kid(realizer, "BorderStyle")
    if border is not None and border.get("hasColor") != "false":
        values["borderColor"] = hex_color(border.get("color"))[0]
        values["borderStyle"] = YED_LINES[border.get("type", "line")]
    label = kid(realizer, "NodeLabel")
    if label is not None and (label.text or "") != "":
        values["label"] = label.text
        if label.get("textColor"):
            values["labelColor"] = hex_color(label.get("textColor"))[0]
    return values


def yed_realizer(node):
    """A node's active realizer, and whether it is an open group (a folder whose state is not closed)."""
    for data in kids(node, "data"):
        for graphics in data:
            if local(graphics.tag) == "ShapeNode":
                return graphics, False
            if local(graphics.tag) == "ProxyAutoBoundsNode":
                realizers = kid(graphics, "Realizers")
                realizer = list(realizers)[int(realizers.get("active", "0"))]
                state = kid(realizer, "State")
                return realizer, state is None or state.get("closed") != "true"
    return None, False


def yed_label_height(label):
    """The height yEd draws a label at: each line its font's ascent and descent (1.164 of its size), and 4 of box
    padding (what yEd 3.25 measures, not the height the file stores)."""
    lines = (label.text or "").count("\n") + 1
    return lines * 1.164 * float(label.get("fontSize", "12")) + 4


def yed_open_group_box(realizer, member_boxes):
    """yEd draws an open group round its members (with their labels): their box grown by its insets, by how far the
    reader dragged its sides out (its border insets) and by its labels inside its top and bottom, whatever box the
    file stores."""
    insets, border = kid(realizer, "Insets"), kid(realizer, "BorderInsets")

    def side(element, name, unset):
        return unset if element is None else float(element.get(name + "F", element.get(name)))

    def inset(name):
        return side(insets, name, YED_INSETS) + side(border, name, 0)

    top = bottom = 0.0
    for label in kids(realizer, "NodeLabel"):
        shown = label.get("visible") != "false" and (label.text or "").strip() != ""
        if shown and label.get("modelName", "internal") == "internal":
            position = label.get("modelPosition", "c")
            if position in ("t", "tl", "tr"):
                top = max(top, yed_label_height(label))
            elif position in ("b", "bl", "br"):
                bottom = max(bottom, yed_label_height(label))
    left = min(b[0] for b in member_boxes) - inset("left")
    right = max(b[2] for b in member_boxes) + inset("right")
    upper = min(b[1] for b in member_boxes) - inset("top") - top
    lower = max(b[3] for b in member_boxes) + inset("bottom") + bottom
    return left, upper, right, lower


def yed_box_with_labels(realizer, box):
    """A member's box as its group encloses it: its own box and its labels' boxes."""
    boxes = [box]
    for label in kids(realizer, "NodeLabel"):
        x, y = box[0] + float(label.get("x")), box[1] + float(label.get("y"))
        boxes.append((x, y, x + float(label.get("width")), y + float(label.get("height"))))
    return tuple(f(b[i] for b in boxes) for i, f in ((0, min), (1, min), (2, max), (3, max)))


def yed(file):
    root = ET.parse(path(file)).getroot()
    nodes, edges = {}, []

    def walk(graph, depth):
        """Reads a graph's nodes, members first; returns each node's drawn box (left, top, right, bottom)."""
        boxes = []
        for node in kids(graph, "node"):
            realizer, open_group = yed_realizer(node)
            values = yed_node(realizer)
            inner = kid(node, "graph")
            member_boxes = walk(inner, depth + 1) if inner is not None else []
            if open_group and member_boxes:
                box = yed_open_group_box(realizer, member_boxes)
                values["width"] = box[2] - box[0]
                values["height"] = box[3] - box[1]
            else:
                geometry = kid(realizer, "Geometry")
                x, y = float(geometry.get("x")), float(geometry.get("y"))
                box = (x, y, x + values["width"], y + values["height"])
            if open_group and inner is not None and depth > 0 and "fill" in values:
                channels = [int(values["fill"][i : i + 2], 16) for i in (1, 3, 5)]
                values["fill"] = "#" + "".join("%02x" % max(0, c - YED_NESTED_DARKER) for c in channels)
            nodes[node.get("id")] = values
            boxes.append(yed_box_with_labels(realizer, box))
        return boxes

    walk(kid(root, "graph"), 0)
    for el in root.iter():
        if local(el.tag) == "edge":
            values = {}
            for data in kids(el, "data"):
                for graphics in data:
                    if local(graphics.tag) == "PolyLineEdge":
                        line = kid(graphics, "LineStyle")
                        values["color"] = hex_color(line.get("color"))[0]
                        values["lineStyle"] = YED_LINES[line.get("type")]
                        values["width"] = float(line.get("width"))
                        values["targetArrow"] = YED_ARROWS[kid(graphics, "Arrows").get("target")]
            edges.append(values)
    return nodes, edges


# --- yEd Live (yFiles for HTML): yjs:ShapeNodeStyle, yjs:PolylineEdgeStyle, shared resources by key ---------------

YJS_SHAPES = {
    "RECTANGLE": "rectangle",
    "ROUND_RECTANGLE": "round-rectangle",
    "ELLIPSE": "ellipse",
    "SHEARED_RECTANGLE": "parallelogram",
    "HEXAGON": "hexagon",
    "OCTAGON": "octagon",
    "DIAMOND": "diamond",
    "TRIANGLE": "triangle",
}
YJS_DASHES = {"Solid": "solid", "Dash": "dashed", "Dot": "dotted", "DashDot": "dash-dot"}
# yFiles' SIMPLE arrow is two strokes, an open V; its DEFAULT is a filled head with a notched back
YJS_ARROWS = {"NONE": "none", "SIMPLE": "open-vee", "DEFAULT": "vee", "TRIANGLE": "triangle"}
NAMED = {"black": "#000000", "white": "#ffffff", "darkorange": "#ff8c00"}


def yjs_color(value):
    """A yFiles color: #AARRGGBB (alpha first) or a color name; the color and its alpha 0..1."""
    if value.startswith("#"):
        v = value[1:].lower()
        return ("#" + v[2:], int(v[:2], 16) / 255) if len(v) == 8 else ("#" + v, 1)
    return NAMED[value.lower()], 1


def yed_live(file):
    root = ET.parse(path(file)).getroot()
    resources = {}
    for el in root.iter():
        for name, key in el.attrib.items():
            if local(name) == "Key" and name.startswith("{"):
                resources[key] = el

    def ref(el):
        """An element that is a reference to a shared resource, as that resource."""
        if el is not None and local(el.tag) == "GraphMLReference":
            return resources[el.get("ResourceKey")]
        return el

    def prop(el, name):
        """A style's property: an attribute (a value or a {y:GraphMLReference k}), or a <Style.name> child element;
        a string, an element, or None."""
        value = el.get(name)
        if value is not None:
            found = re.fullmatch(r"\{y:GraphMLReference (\S+)\}", value)
            return resources[found.group(1)] if found else value
        for child in el:
            if local(child.tag).endswith("." + name):
                return ref(list(child)[0])
        return None

    def paint(value, unset):
        """A fill: a color string or a SolidColorFill; the color and its alpha."""
        if value is None:
            return yjs_color(unset)
        if isinstance(value, str):
            return yjs_color(value)
        return yjs_color(value.get("color"))

    nodes, edges = {}, []
    graph = kid(root, "graph")
    keys = {k.get("id"): k.get("attr.name") for k in kids(root, "key")}
    for node in kids(graph, "node"):
        values = {}
        data = {keys[d.get("key")]: d for d in kids(node, "data")}
        rect = kid(data["NodeGeometry"], "RectD")
        values["width"], values["height"] = float(rect.get("Width")), float(rect.get("Height"))
        # yFiles' ShapeNodeStyle draws a white rectangle with a black outline unless it says otherwise
        style = ref(list(data["NodeStyle"])[0]) if "NodeStyle" in data else None
        shape = style.get("shape") if style is not None else None
        values["shape"] = YJS_SHAPES[shape or "RECTANGLE"]
        fill, alpha = paint(prop(style, "fill") if style is not None else None, "WHITE")
        if alpha == 0:
            values["fillOpacity"] = 0
        else:
            values["fill"] = fill
            if alpha < 1:
                values["fillOpacity"] = alpha
        stroke = prop(style, "stroke") if style is not None else None
        if isinstance(stroke, str):
            stroke_color = yjs_color(stroke)
        elif stroke is not None:
            stroke_color = paint(prop(stroke, "fill"), "BLACK")
        else:
            stroke_color = yjs_color("BLACK")
        if stroke_color[1] > 0:
            values["borderColor"] = stroke_color[0]
        if stroke is not None and not isinstance(stroke, str):
            values["borderStyle"] = YJS_DASHES[stroke.get("dashStyle", "Solid")]
        labels = data.get("NodeLabels")
        if labels is not None:
            for label in kid(labels, "List"):
                text = kid(label, "Label.Text")
                if text is not None and (text.text or "") != "":
                    values["label"] = text.text
                    break
        nodes[node.get("id")] = values
    for edge in kids(graph, "edge"):
        values = {}
        data = {keys[d.get("key")]: d for d in kids(edge, "data")}
        style = ref(list(data["EdgeStyle"])[0]) if "EdgeStyle" in data else None
        stroke = prop(style, "stroke") if style is not None else None
        if isinstance(stroke, str):
            values["color"], values["lineStyle"], values["width"] = yjs_color(stroke)[0], "solid", 1.0
        else:
            values["color"] = paint(prop(stroke, "fill") if stroke is not None else None, "BLACK")[0]
            dash = stroke.get("dashStyle", "Solid") if stroke is not None else "Solid"
            values["lineStyle"] = YJS_DASHES[dash]
            values["width"] = float(stroke.get("thickness", "1")) if stroke is not None else 1.0
        arrow = prop(style, "targetArrow") if style is not None else None
        values["targetArrow"] = YJS_ARROWS[arrow.get("type", "NONE") if arrow is not None else "NONE"]
        edges.append(values)
    return nodes, edges


# --- Cytoscape's visual properties (XGMML graphics, sessions, CX and CX2 styles) -----------------------------------

CY_SHAPES = {
    "ELLIPSE": "ellipse",
    "RECTANGLE": "rectangle",
    "ROUND_RECTANGLE": "round-rectangle",
    "TRIANGLE": "triangle",
    "DIAMOND": "diamond",
    "HEXAGON": "hexagon",
    "OCTAGON": "octagon",
    "PARALLELOGRAM": "parallelogram",
    "VEE": "vee",
}
CY_LINES = {
    "SOLID": "solid",
    "EQUAL_DASH": "dashed",
    "LONG_DASH": "long-dash",
    "DOT": "dotted",
    "DASH_DOT": "dash-dot",
}
CY_ARROWS = {
    "NONE": "none",
    "DELTA": "triangle",
    # Cytoscape draws its ARROW as a filled delta with only a shallow notch in its back, as long and wide as DELTA
    "ARROW": "triangle",
    "T": "tee",
    "DIAMOND": "diamond",
    "CIRCLE": "circle",
    "OPEN_DELTA": "triangle-open",
    "OPEN_DIAMOND": "diamond-open",
    "OPEN_CIRCLE": "circle-open",
    "SQUARE": "square",
}


def cy_node(vp):
    """A node's values from its Cytoscape visual properties (name to string value)."""
    values = {}
    put(values, "shape", CY_SHAPES.get(vp.get("NODE_SHAPE")))
    if "NODE_FILL_COLOR" in vp:
        values["fill"] = hex_color(vp["NODE_FILL_COLOR"])[0]
    transparency = float(vp.get("NODE_TRANSPARENCY", "255"))
    if transparency < 255:
        values["fillOpacity"] = transparency / 255
    if "NODE_BORDER_PAINT" in vp:
        values["borderColor"] = hex_color(vp["NODE_BORDER_PAINT"])[0]
    put(values, "borderStyle", CY_LINES.get(vp.get("NODE_BORDER_STROKE")))
    for name, key in (("NODE_WIDTH", "width"), ("NODE_HEIGHT", "height")):
        if name in vp:
            values[key] = float(vp[name])
    if vp.get("NODE_LABEL", "") != "":
        values["label"] = vp["NODE_LABEL"]
        if "NODE_LABEL_COLOR" in vp:
            values["labelColor"] = hex_color(vp["NODE_LABEL_COLOR"])[0]
    return values


def cy_edge(vp):
    values = {}
    color = vp.get("EDGE_STROKE_UNSELECTED_PAINT", vp.get("EDGE_UNSELECTED_PAINT"))
    if color is not None:
        values["color"] = hex_color(color)[0]
    put(values, "lineStyle", CY_LINES.get(vp.get("EDGE_LINE_TYPE")))
    if "EDGE_WIDTH" in vp:
        values["width"] = float(vp["EDGE_WIDTH"])
    put(values, "targetArrow", CY_ARROWS.get(vp.get("EDGE_TARGET_ARROW_SHAPE")))
    return values


def xgmml_graphics(element):
    """An XGMML element's visual properties: its graphics attributes under their visual property names, and the
    graphics' own att children."""
    graphics = kid(element, "graphics")
    if graphics is None:
        return {}
    named = {
        "type": "NODE_SHAPE",
        "w": "NODE_WIDTH",
        "h": "NODE_HEIGHT",
        "outline": "NODE_BORDER_PAINT",
        "width": "NODE_BORDER_WIDTH" if local(element.tag) == "node" else "EDGE_WIDTH",
        "fill": "NODE_FILL_COLOR" if local(element.tag) == "node" else "EDGE_STROKE_UNSELECTED_PAINT",
    }
    vp = {named[k]: v for k, v in graphics.attrib.items() if k in named}
    for att in kids(graphics, "att"):
        vp[att.get("name")] = att.get("value")
    return vp


def xgmml(file):
    with gzip.open(path(file)) as f:
        root = ET.parse(f).getroot()
    nodes = {n.get("id"): cy_node(xgmml_graphics(n)) for n in root.iter() if local(n.tag) == "node"}
    edges = [cy_edge(xgmml_graphics(e)) for e in root.iter() if local(e.tag) == "edge"]
    return nodes, edges


def cy_definition(text):
    """A CX mapping definition (COL=..,T=..,K=0=..,V=0=..; a comma inside a value doubled) as its fields."""
    parts = [p.replace("\0", ",") for p in text.replace(",,", "\0").split(",")]
    fields, keyed = {}, {}
    for part in parts:
        name, _, rest = part.partition("=")
        if name in ("COL", "T"):
            fields[name] = rest
        else:
            index, _, value = rest.partition("=")
            keyed.setdefault(int(index), {})[name] = value
    fields["points"] = [keyed[i] for i in sorted(keyed)]
    return fields


def cy_text(value):
    """A data value as Cytoscape compares and passes it through: booleans as true/false, numbers as written."""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, float) and value.is_integer():
        return repr(value)
    return str(value)


def cy_style(defaults, mappings, bypass, data):
    """The visual properties Cytoscape draws an element with: a bypass, else its mapping's value for the element's
    data, else the style's default. mappings: property to (type, column, points), points as CX writes them."""
    vp = dict(defaults)
    for prop, (kind, column, points) in mappings.items():
        value = data.get(column)
        if value is None:
            continue
        if kind == "PASSTHROUGH":
            vp[prop] = cy_text(value)
        elif kind == "DISCRETE":
            for point in points:
                if point["K"] == cy_text(value):
                    vp[prop] = point["V"]
        elif kind == "CONTINUOUS":
            vp[prop] = cy_continuous(points, float(value), vp.get(prop))
    vp.update(bypass)
    return vp


def cy_continuous(points, x, unset):
    """A continuous mapping's value at x: below the first point its L, above the last its G, at a point its E, and
    between two points the straight line from the lower's G to the upper's L (a color channel by channel)."""
    ov = [float(p["OV"]) for p in points]
    if x < ov[0]:
        return points[0]["L"]
    if x > ov[-1]:
        return points[-1]["G"]
    for i, v in enumerate(ov):
        if x == v:
            return points[i]["E"]
    for i in range(len(ov) - 1):
        if ov[i] < x < ov[i + 1]:
            t = (x - ov[i]) / (ov[i + 1] - ov[i])
            low, high = points[i]["G"], points[i + 1]["L"]
            if low.startswith("#"):
                a, b = hex_color(low)[0], hex_color(high)[0]
                channels = [
                    round(int(a[j : j + 2], 16) + t * (int(b[j : j + 2], 16) - int(a[j : j + 2], 16))) for j in (1, 3, 5)
                ]
                return "#" + "".join("%02x" % c for c in channels)
            return repr(float(low) + t * (float(high) - float(low)))
    return unset


def cy_sized(vp, dependencies):
    """With node sizes locked, NODE_SIZE gives both the width and the height."""
    if dependencies.get("nodeSizeLocked") == "true" and "NODE_SIZE" in vp:
        vp = dict(vp, NODE_WIDTH=vp["NODE_SIZE"], NODE_HEIGHT=vp["NODE_SIZE"])
    return vp


def cx(file):
    aspects = {}
    for fragment in json.load(open(path(file))):
        for name, value in fragment.items():
            aspects.setdefault(name, []).extend(value if isinstance(value, list) else [value])
    node_data = {n["@id"]: {"name": n.get("n"), "represents": n.get("r")} for n in aspects["nodes"]}
    edge_data = {e["@id"]: {"interaction": e.get("i")} for e in aspects["edges"]}
    for attribute in aspects.get("nodeAttributes", []):
        node_data[attribute["po"]][attribute["n"]] = attribute["v"]
    for attribute in aspects.get("edgeAttributes", []):
        edge_data[attribute["po"]][attribute["n"]] = attribute["v"]
    styles, bypass = {}, {"nodes": {}, "edges": {}}
    for vp in aspects["cyVisualProperties"]:
        of = vp["properties_of"]
        if of in ("nodes:default", "edges:default"):
            mappings = {
                prop: (m["type"], d["COL"], d["points"])
                for prop, m in vp.get("mappings", {}).items()
                for d in [cy_definition(m["definition"])]
            }
            styles[of] = (vp.get("properties", {}), mappings, vp.get("dependencies", {}))
        elif of in ("nodes", "edges"):
            bypass[of].setdefault(vp["applies_to"], {}).update(vp.get("properties", {}))
    defaults, mappings, dependencies = styles["nodes:default"]
    nodes = {
        str(i): cy_node(cy_sized(cy_style(defaults, mappings, bypass["nodes"].get(i, {}), data), dependencies))
        for i, data in node_data.items()
    }
    defaults, mappings, _ = styles["edges:default"]
    edges = [cy_edge(cy_style(defaults, mappings, bypass["edges"].get(i, {}), data)) for i, data in edge_data.items()]
    return nodes, edges


def cx2_match(value, key):
    """Whether a data value is a discrete mapping's key, compared as values (a number as a number)."""
    if isinstance(key, bool) or isinstance(value, bool):
        return cy_text(value) == cy_text(key)
    if isinstance(key, (int, float)) and isinstance(value, (int, float)):
        return float(key) == float(value)
    return str(value) == str(key)


def cx2_style(defaults, mappings, bypass, data):
    """CX2's visual properties of an element: a bypass, else its mapping's value for its data, else the default."""
    vp = dict(defaults)
    for prop, mapping in mappings.items():
        definition = mapping["definition"]
        value = data.get(definition["attribute"])
        if value is None:
            continue
        if mapping["type"] == "PASSTHROUGH":
            vp[prop] = value
        elif mapping["type"] == "DISCRETE":
            for entry in definition["map"]:
                if cx2_match(value, entry["v"]):
                    vp[prop] = entry["vp"]
        else:
            raise ValueError("no reading here of a %s mapping" % mapping["type"])
    vp.update(bypass)
    return vp


def cx2_node(vp):
    values = {"shape": vp["NODE_SHAPE"]}
    values["fill"] = hex_color(vp["NODE_BACKGROUND_COLOR"])[0]
    if float(vp.get("NODE_BACKGROUND_OPACITY", 1)) < 1:
        values["fillOpacity"] = float(vp["NODE_BACKGROUND_OPACITY"])
    values["borderColor"] = hex_color(vp["NODE_BORDER_COLOR"])[0]
    values["borderStyle"] = vp["NODE_BORDER_STYLE"]
    values["width"], values["height"] = float(vp["NODE_WIDTH"]), float(vp["NODE_HEIGHT"])
    if str(vp.get("NODE_LABEL", "")) != "":
        values["label"] = str(vp["NODE_LABEL"])
        values["labelColor"] = hex_color(vp["NODE_LABEL_COLOR"])[0]
    return values


# Cytoscape draws a CX2 edge's "dashed" in its long dashes (LONG_DASH) and "equal_dash" in equal ones
CX2_LINES = {"dashed": "long-dash", "equal_dash": "dashed", "long_dash": "long-dash", "dash_dot": "dash-dot"}


def cx2_edge(vp):
    line = vp["EDGE_LINE_STYLE"]
    return {
        "color": hex_color(vp["EDGE_LINE_COLOR"])[0],
        "lineStyle": CX2_LINES.get(line, line),
        "width": float(vp["EDGE_WIDTH"]),
        "targetArrow": vp["EDGE_TARGET_ARROW_SHAPE"],
    }


def cx2(file):
    aspects = {}
    for fragment in json.load(open(path(file))):
        for name, value in fragment.items():
            aspects.setdefault(name, []).extend(value if isinstance(value, list) else [value])
    declared = aspects["attributeDeclarations"][0]
    style = aspects["visualProperties"][0]
    locked = aspects.get("visualEditorProperties", [{}])[0].get("properties", {}).get("nodeSizeLocked") is True

    def data_of(element, target):
        """An element's data under the declared names (an alias resolved), the declared defaults filled in."""
        aliases = {d["a"]: name for name, d in declared.get(target, {}).items() if "a" in d}
        data = {name: d["v"] for name, d in declared.get(target, {}).items() if "v" in d}
        data.update({aliases.get(k, k): v for k, v in element.get("v", {}).items()})
        return data

    results = {}
    for target, elements, render in (("nodes", "nodes", cx2_node), ("edges", "edges", cx2_edge)):
        single = target[:-1]
        bypasses = {b["id"]: b["v"] for b in aspects.get(single + "Bypasses", [])}
        out = []
        for element in aspects[elements]:
            vp = cx2_style(
                style["default"][single],
                style.get(single + "Mapping", {}),
                bypasses.get(element["id"], {}),
                data_of(element, target),
            )
            if locked and target == "nodes" and "NODE_SIZE" in vp:
                vp["NODE_WIDTH"] = vp["NODE_HEIGHT"] = vp["NODE_SIZE"]
            out.append((str(element["id"]), render(vp)))
        results[target] = out
    return dict(results["nodes"]), [values for _, values in results["edges"]]


# --- Cytoscape.js: a stylesheet of selectors over the elements' data --------------------------------------------

# what Cytoscape.js draws where its stylesheet says nothing
CYJS_DEFAULTS = {
    "node": {
        "shape": "ellipse",
        "background-color": "#999",
        "width": 30,
        "height": 30,
        "border-color": "#000",
        "color": "#000",
        "label": "",
    },
    "edge": {"line-color": "#999", "width": 3, "line-style": "solid", "target-arrow-shape": "none"},
}
CYJS_COLORS = {"white": "#ffffff", "black": "#000000"}


def cyjs_selects(selector, group, element):
    """Whether a selector (`node`, `edge`, `node[key = "value"]`, `node:selected`) selects an element."""
    found = re.fullmatch(r'(node|edge)(?:\[(\w+) = "([^"]*)"\])?(:selected)?', selector)
    if found is None:
        raise ValueError("no reading here of the selector " + selector)
    kind, key, value, selected = found.groups()
    if kind != group or (selected and not element.get("selected")):
        return False
    return key is None or str(element["data"].get(key)) == value


def cyjs_value(value, data):
    """A style value: data(key), mapData(key, low, high, from, to) (clamped), or the value itself."""
    if isinstance(value, str):
        found = re.fullmatch(r"data\((\w+)\)", value)
        if found:
            return data.get(found.group(1))
        found = re.fullmatch(r"mapData\((\w+), *([-\d.]+), *([-\d.]+), *([-\d.]+), *([-\d.]+)\)", value)
        if found:
            key, low, high, start, end = found.group(1), *map(float, found.groups()[1:])
            t = min(1, max(0, (float(data[key]) - low) / (high - low)))
            return start + t * (end - start)
    return value


def cyjs_color(value):
    return CYJS_COLORS.get(value) or hex_color(value)[0]


def cytoscape_js(file):
    document = json.load(open(path(file)))

    def style_of(group, element):
        style = dict(CYJS_DEFAULTS[group])
        for rule in document["style"]:
            if cyjs_selects(rule["selector"], group, element):
                style.update(rule["style"])
        return {k: cyjs_value(v, element["data"]) for k, v in style.items()}

    nodes = {}
    for element in document["elements"]["nodes"]:
        style = style_of("node", element)
        label = style.get("label") or style.get("content") or ""
        values = {
            "shape": style["shape"],
            "fill": cyjs_color(style["background-color"]),
            "width": float(style["width"]),
            "height": float(style["height"]),
            "borderColor": cyjs_color(style["border-color"]),
        }
        if label != "":
            values["label"], values["labelColor"] = str(label), cyjs_color(style["color"])
        nodes[str(element["data"]["id"])] = values
    edges = []
    for element in document["elements"]["edges"]:
        style = style_of("edge", element)
        edges.append(
            {
                "color": cyjs_color(style["line-color"]),
                "width": float(style["width"]),
                "lineStyle": style["line-style"],
                "targetArrow": style["target-arrow-shape"],
            }
        )
    return nodes, edges


# --- Gephi: GEXF with viz: colors, sizes and positions ----------------------------------------------------------


# the nodes whose labels Gephi's Preview hides as crowded (node.label.avoidOverlap, on by default), as Gephi draws
# the sample
GEPHI_CROWDED = {"3", "38", "71"}


def gephi(file):
    root = ET.parse(path(file)).getroot()
    nodes, colors = {}, {}
    for node in root.iter():
        if local(node.tag) != "node":
            continue
        color = kid(node, "color")
        rgb = "#" + "".join("%02x" % int(color.get(c)) for c in "rgb")
        colors[node.get("id")] = rgb
        # viz:size is the disc's radius
        diameter = 2 * float(kid(node, "size").get("value"))
        values = {"shape": "ellipse", "fill": rgb, "width": diameter, "height": diameter}
        if node.get("id") not in GEPHI_CROWDED:
            put(values, "label", node.get("label") or None)
        nodes[node.get("id")] = values
    edges = []
    for edge in root.iter():
        if local(edge.tag) != "edge":
            continue
        # Gephi's Preview draws an edge with no color of its own in the mix of its ends' colors (each channel's mean,
        # cut to a whole number), as thick as its weight
        ends = [colors[edge.get("source")], colors[edge.get("target")]]
        mixed = [sum(int(c[i : i + 2], 16) for c in ends) // 2 for i in (1, 3, 5)]
        edges.append(
            {
                "color": "#" + "".join("%02x" % c for c in mixed),
                "width": float(edge.get("weight", "1")),
            }
        )
    return nodes, edges


# --- Graphviz: DOT statements, defaults scoped to their subgraph -------------------------------------------------

DOT_TOKEN = re.compile(
    r'\s+|//[^\n]*|#[^\n]*|/\*.*?\*/|(?P<q>"(?:[^"\\]|\\.)*")|(?P<op>->|--|[{}\[\];,=])|(?P<id>[^\s{}\[\];,="]+)',
    re.S,
)
DOT_SHAPES = {
    "box": "rectangle",
    "rect": "rectangle",
    "rectangle": "rectangle",
    "square": "rectangle",
    "ellipse": "ellipse",
    "oval": "ellipse",
    "circle": "ellipse",
    "point": "ellipse",
    "octagon": "octagon",
    "hexagon": "hexagon",
    "diamond": "diamond",
    "triangle": "triangle",
    "plaintext": "none",
    "plain": "none",
    "none": "none",
}
DOT_ARROWS = {"normal": "triangle", "none": "none", "vee": "vee", "tee": "tee", "dot": "circle", "diamond": "diamond"}
# Graphviz's SVG writes a color name SVG knows as that name, so it draws as CSS does (gray is #808080 there)
DOT_COLORS = {"white": "#ffffff", "black": "#000000", "lightgrey": "#d3d3d3", "lightgray": "#d3d3d3", "gray": "#808080"}


def dot_tokens(text):
    for found in DOT_TOKEN.finditer(text):
        if found.group("q") is not None:
            yield ("id", re.sub(r"\\(.)", lambda m: m.group(0) if m.group(1) in "nlrN" else m.group(1),
                                found.group("q")[1:-1]))
        elif found.group("op") is not None:
            yield ("op", found.group("op"))
        elif found.group("id") is not None:
            yield ("id", found.group("id"))


def dot_parse(text):
    """The nodes (name to attributes, in order) and edges (attributes, in order) of a DOT graph, each with the
    defaults in scope where it is first named."""
    tokens = list(dot_tokens(text))
    at = 0
    nodes, edges = {}, []

    def peek():
        return tokens[at] if at < len(tokens) else (None, None)

    def take():
        nonlocal at
        at += 1
        return tokens[at - 1]

    def attrs():
        out = {}
        while peek() == ("op", "["):
            take()
            while peek() != ("op", "]"):
                if peek()[1] in (",", ";"):
                    take()
                    continue
                key = take()[1]
                take()  # =
                out[key] = take()[1]
            take()
        return out

    def node(name, scope):
        if name not in nodes:
            nodes[name] = dict(scope["node"])
        return name

    def body(scope):
        """Statements up to the closing brace; the names of the nodes named in them."""
        named = []
        while peek() != ("op", "}"):
            kind, value = peek()
            if value in (";", ","):
                take()
                continue
            if value in ("graph", "node", "edge") and tokens[at + 1] == ("op", "["):
                take()
                scope[value] = dict(scope[value], **attrs())
                continue
            if kind == "id" and tokens[at + 1] == ("op", "="):
                take(), take(), take()
                continue
            ends = [endpoint(scope)]
            named.extend(ends[-1])
            while peek()[1] in ("->", "--"):
                take()
                ends.append(endpoint(scope))
                named.extend(ends[-1])
            own = attrs()
            if len(ends) == 1:
                for name in ends[0]:
                    nodes[name].update(own)
            for tails, heads in zip(ends, ends[1:]):
                for tail in tails:
                    for head in heads:
                        edges.append(dict(scope["edge"], **own))
        take()
        return named

    def endpoint(scope):
        if peek() == ("id", "subgraph"):
            take()
            if peek() != ("op", "{"):
                take()  # its name
        if peek() == ("op", "{"):
            take()
            return body({k: dict(v) for k, v in scope.items()})
        return [node(take()[1], scope)]

    while take() != ("op", "{"):
        pass
    body({"graph": {}, "node": {}, "edge": {}})
    return nodes, edges


def dot_color(value):
    return DOT_COLORS.get(value.lower()) or hex_color(value)[0]


def dot_label(text, name):
    return re.sub(r"\\[nlr]", "\n", text.replace("\\N", name)).rstrip("\n")


def graphviz(file):
    parsed_nodes, parsed_edges = dot_parse(open(path(file)).read())
    nodes = {}
    for name, a in parsed_nodes.items():
        styles = [p.strip() for p in a.get("style", "").split(",")]
        values = {"shape": DOT_SHAPES[a.get("shape", "ellipse")]}
        color = a.get("color", "black")
        if "filled" in styles:
            values["fill"] = dot_color(a.get("fillcolor", a.get("color", "lightgrey")))
        # an invis node is laid out in its shape but paints no fill, outline or label
        if "invis" in styles:
            nodes[name] = values
            continue
        if values["shape"] != "none":
            values["borderColor"] = dot_color(color)
        label = dot_label(a.get("label", "\\N"), name)
        # a point draws no label
        if label.strip() != "" and a.get("shape") != "point":
            values["label"] = label
            values["labelColor"] = dot_color(a.get("fontcolor", "black"))
        nodes[name] = values
    edges = []
    for a in parsed_edges:
        styles = [p.strip() for p in a.get("style", "").split(",")]
        arrow = a.get("arrowhead", "normal") or "normal"
        values = {"color": dot_color(a.get("color", "black")), "targetArrow": DOT_ARROWS[arrow]}
        for line in ("dashed", "dotted"):
            if line in styles:
                values["lineStyle"] = line
        edges.append(values)
    return nodes, edges


# --- OGDF: GML graphics, written by ogdf::GraphAttributes::writeGML ---------------------------------------------

GML_TOKEN = re.compile(r'\s+|#[^\n]*|(?P<q>"(?:[^"\\]|\\.)*")|(?P<op>[\[\]])|(?P<w>[^\s\[\]"]+)')
# OGDF's StrokeType, as its GML writes it in `stipple`
OGDF_STROKES = {"1": "solid", "2": "dashed", "3": "dotted", "4": "dash-dot"}
OGDF_SHAPES = {"rectangle": "rectangle", "oval": "ellipse", "ellipse": "ellipse", "rhomb": "diamond"}
OGDF_ARROWS = {"none": "none", "last": "triangle", "first": "none", "both": "triangle"}


def gml_parse(text):
    """GML as nested lists of (key, value) pairs; a value a string, a number's text or such a list."""
    stack = [[]]
    key = None
    for found in GML_TOKEN.finditer(text):
        if found.group("op") == "[":
            stack.append([])
            stack[-2].append((key, stack[-1]))
            key = None
        elif found.group("op") == "]":
            stack.pop()
        elif found.group("q") is not None or found.group("w") is not None:
            word = found.group("q")[1:-1].replace('\\"', '"') if found.group("q") else found.group("w")
            if key is None:
                key = word
            else:
                stack[-1].append((key, word))
                key = None
    return stack[0]


def gml_get(pairs, key, unset=None):
    return next((v for k, v in pairs if k == key), unset)


def ogdf(file):
    graph = gml_get(gml_parse(open(path(file)).read()), "graph")
    nodes, edges = {}, []
    for key, node in graph:
        if key != "node":
            continue
        graphics = gml_get(node, "graphics", [])
        values = {
            "shape": OGDF_SHAPES[gml_get(graphics, "type")],
            "fill": hex_color(gml_get(graphics, "fill"))[0],
            "borderColor": hex_color(gml_get(graphics, "line"))[0],
            "borderStyle": OGDF_STROKES[gml_get(graphics, "stipple", "1")],
            "width": float(gml_get(graphics, "w")),
            "height": float(gml_get(graphics, "h")),
        }
        # the label's text inside OGDF's rich text markup, in its textColor (ARGB)
        label = gml_get(node, "label", "")
        found = re.fullmatch(r"<label[^>]*?(?:textColor=\"([0-9a-fA-F]{8})\")?[^>]*>(.*)</label>", label, re.S)
        if found:
            values["label"] = found.group(2)
            if found.group(1):
                values["labelColor"] = "#" + found.group(1)[2:].lower()
        elif label != "":
            values["label"] = label
        nodes[gml_get(node, "id")] = values
    for key, edge in graph:
        if key != "edge":
            continue
        graphics = gml_get(edge, "graphics", [])
        edges.append(
            {
                "color": hex_color(gml_get(graphics, "fill"))[0],
                "lineStyle": OGDF_STROKES[gml_get(graphics, "stipple", "1")],
                "width": float(gml_get(graphics, "lineWidth", "1")),
                "targetArrow": OGDF_ARROWS[gml_get(graphics, "arrow", "none")],
            }
        )
    return nodes, edges


# --- Pajek: .net vertices with their drawing parameters, arcs -----------------------------------------------------


def cmyk(c, m, y, k=0.0):
    """A CMYK color as dvips turns it into RGB: each channel 1 - min(1, its ink + black), rounded half up."""
    return "#" + "".join("%02x" % int(255 * (1 - min(1, v + k)) + 0.5) for v in (c, m, y))


# the colors this sample names, as Pajek defines them in CMYK (the light ones are Pajek's own additions to the dvips
# names); LightOrange is drawn #ffd9bc, Pajek's default vertex fill, rather than its CMYK
PAJEK_COLORS = {
    "White": cmyk(0, 0, 0),
    "LightCyan": cmyk(0.2, 0, 0),
    "LightMagenta": cmyk(0, 0.2, 0),
    "LightGreen": cmyk(0.2, 0, 0.3),
    "LightPurple": cmyk(0.2, 0.2, 0),
    "LightYellow": cmyk(0, 0, 0.4),
    "LightOrange": "#ffd9bc",
}
# Pajek's diamond is its own six-cornered outline
PAJEK_SHAPES = {"ellipse": "ellipse", "box": "rectangle", "diamond": "polygon", "triangle": "triangle"}
# what Pajek draws where a vertex or line names no color: a Brown border, a gray line
PAJEK_BORDER = cmyk(0, 0.81, 1, 0.6)
PAJEK_LINE = "#999999"


def pajek(file):
    nodes, edges = {}, []
    section = None
    # a drawing parameter, once given, holds for the lines after it until given again
    sticky = {}
    for line in open(path(file)):
        if line.startswith("*"):
            section = line.split()[0].lower()
            sticky = {}
            continue
        if not line.strip():
            continue
        if section == "*vertices":
            found = re.match(r'\s*(\d+)\s+"([^"]*)"\s+\S+\s+\S+\s+(\S+)?(.*)', line)
            number, label, shape, rest = found.groups()
            words = rest.split()
            params = sticky = dict(sticky, **dict(zip(words[::2], words[1::2])))
            values = {"shape": PAJEK_SHAPES[shape], "fill": PAJEK_COLORS[params["ic"]], "label": label}
            values["borderColor"] = PAJEK_COLORS[params["bc"]] if "bc" in params else PAJEK_BORDER
            nodes[number] = values
        elif section in ("*arcs", "*edges"):
            words = line.split()
            params = sticky = dict(sticky, **dict(zip(words[3::2], words[4::2])))
            values = {"color": PAJEK_COLORS[params["c"]] if "c" in params else PAJEK_LINE}
            # w is the line's width, 1 where unsaid
            values["width"] = float(params.get("w", "1"))
            values["targetArrow"] = "triangle" if section == "*arcs" else "none"
            edges.append(values)
    return nodes, edges


# --- Cytoscape sessions (.cys): the first network of the session's list, its view's style over its tables -------


def cytable(text):
    """A session table (CyCSV: names, types, mutability and title rows, then one row per element) by SUID, each
    value as Cytoscape compares it in a mapping."""
    rows = list(csv.reader(io.StringIO(text)))
    names = rows[1]
    return {row[0]: dict(zip(names, row)) for row in rows[5:] if row}


def vizmap_style(element):
    """A vizmap.xml style's defaults and mappings for nodes or edges, as cy_style takes them."""
    defaults, mappings = {}, {}
    for vp in kids(element, "visualProperty"):
        name = vp.get("name")
        if vp.get("default") is not None:
            defaults[name] = vp.get("default")
        for mapping in vp:
            kind = local(mapping.tag)
            column = mapping.get("attributeName")
            if kind == "discreteMapping":
                points = [{"K": e.get("attributeValue"), "V": e.get("value")} for e in mapping]
                mappings[name] = ("DISCRETE", column, points)
            elif kind == "passthroughMapping":
                mappings[name] = ("PASSTHROUGH", column, [])
            elif kind == "continuousMapping":
                points = [
                    {"OV": p.get("attrValue"), "E": p.get("equalValue"), "G": p.get("greaterValue"),
                     "L": p.get("lesserValue")}
                    for p in mapping
                ]
                mappings[name] = ("CONTINUOUS", column, points)
    dependencies = {}
    for dependency in kids(element, "dependency"):
        dependencies[dependency.get("name")] = dependency.get("value")
    return defaults, mappings, dependencies


def cytoscape_session(file):
    archive = zipfile.ZipFile(path(file))
    names = archive.namelist()

    def member(pattern):
        return [n for n in names if re.search(pattern, n)]

    network = kid(ET.fromstring(archive.read(member(r"/network_list\.xml$")[0])), "network").get("id")
    view = next(
        root
        for root in (ET.fromstring(archive.read(n)) for n in member(r"/views/"))
        if root.get("{http://www.cytoscape.org}networkId") == network
    )
    style_name = view.get("{http://www.cytoscape.org}visualStyle")
    vizmap = ET.fromstring(archive.read(member(r"/session_vizmap\.xml$")[0]))
    style = next(s for s in kids(vizmap, "visualStyle") if s.get("name") == style_name)
    graph = next(
        g
        for n in member(r"/networks/")
        for g in ET.fromstring(archive.read(n)).iter()
        if local(g.tag) == "graph" and g.get("id") == network
    )
    # an element's data: its root network's shared columns and this network's own
    data = {"node": {}, "edge": {}}
    for name in member(r"/tables/.*(SHARED_ATTRS|LOCAL_ATTRS)-org\.cytoscape\.model\.Cy(Node|Edge)-"):
        kind = "node" if "CyNode" in name else "edge"
        local_table = "LOCAL_ATTRS" in name
        if local_table and not re.search(r"/tables/%s-" % network, name):
            continue
        for suid, row in cytable(archive.read(name).decode("utf-8")).items():
            data[kind].setdefault(suid, {}).update(row)
    node_style = vizmap_style(kid(style, "node"))
    edge_defaults, edge_mappings, _ = vizmap_style(kid(style, "edge"))
    nodes = {}
    for node in kids(graph, "node"):
        vp = cy_style(node_style[0], node_style[1], {}, data["node"].get(node.get("id"), {}))
        nodes[node.get("id")] = cy_node(cy_sized(vp, node_style[2]))
    edges = []
    for edge in kids(graph, "edge"):
        vp = cy_style(edge_defaults, edge_mappings, {}, data["edge"].get(edge.get("id"), {}))
        # a style that maps the edge's paint draws its stroke in it, mapped or by the paint's default
        if "EDGE_UNSELECTED_PAINT" in edge_mappings:
            vp["EDGE_STROKE_UNSELECTED_PAINT"] = vp["EDGE_UNSELECTED_PAINT"]
        edges.append(cy_edge(vp))
    return nodes, edges


READERS = {
    "cytoscape": cytoscape_session,
    "yed": yed,
    "yed-live": yed_live,
    "cytoscape-xgmml": xgmml,
    "ndex-cx": cx,
    "ndex-cx2": cx2,
    "cytoscape-js": cytoscape_js,
    "gephi": gephi,
    "graphviz": graphviz,
    "ogdf": ogdf,
    "pajek": pajek,
}


def columns(elements):
    """Elements' values as one row each under a shared list of the properties any of them states (null where one
    states none)."""
    properties = []
    for values in elements:
        properties.extend(p for p in values if p not in properties)
    return properties, [[values.get(p) for p in properties] for values in elements]


def line(indent, prefix, value, last):
    """One JSON member or element on one line, or spread over several where it passes 120 columns (as prettier
    prints it)."""
    text = " " * indent + prefix + json.dumps(value) + ("" if last else ",")
    if len(text) <= 120:
        return text
    inner = json.dumps(value, indent=4).replace("\n", "\n" + " " * indent)
    return " " * indent + prefix + inner + ("" if last else ",")


def main():
    samples = json.load(open(path("corpus/programs/samples.json")))
    out = []
    styled = [s for s in samples if s["styled"]]
    for n, sample in enumerate(styled):
        nodes, edges = READERS[sample["id"]](sample["file"])
        node_properties, node_rows = columns(nodes.values())
        edge_properties, edge_rows = columns(edges)
        out.append('    "%s": {' % sample["id"])
        out.append(line(8, '"nodeProperties": ', node_properties, False))
        out.append('        "nodes": {')
        for i, (node, row) in enumerate(zip(nodes, node_rows)):
            out.append(line(12, json.dumps(node) + ": ", row, i == len(node_rows) - 1))
        out.append("        },")
        out.append(line(8, '"edgeProperties": ', edge_properties, False))
        out.append('        "edges": [')
        for i, row in enumerate(edge_rows):
            out.append(line(12, "", row, i == len(edge_rows) - 1))
        out.append("        ]")
        out.append("    }" + ("" if n == len(styled) - 1 else ","))
    with open(os.path.join(HERE, "program-samples-expected.json"), "w") as f:
        f.write("{\n" + "\n".join(out) + "\n}\n")


if __name__ == "__main__":
    sys.exit(main())
