#!/usr/bin/env python3
"""gen_repros.py <corpus/styles dir>: small files that reproduce, in the same structure, defects
found in corpus files that may not be committed (their licenses do not allow redistribution).
Seeded; written for this project, MIT.

- cx/fidelity/repro-locked-own-size.cx (like DDRAM, CC BY-NC-ND): "lock node width and height" on,
  a continuous size mapping, and every node but two setting its own width and height. Cytoscape
  draws each node at its own size.
- cx2/fidelity/repro-shared-interaction.cx2 (like imatinib-smpdb): edge colors, dashes and arrows
  mapped from the `shared interaction` column and labels from `shared name`, which the file does
  not hold; Cytoscape fills them from `interaction` and `name`. Hexagon nodes.
- xgmml/fidelity/repro-name-only-labels.xgmml (like the Cytoscape 2.x networkportal and pathguide
  exports): no label style at all; some nodes carry a `name` attribute, the rest only the XML
  `label=`. Cytoscape's default style labels each node by its name.
- cx/fidelity/repro-unplaced-boxes.cx (like radiation-bibliography): no node positions, wide
  rectangles (145 x 40) with long labels.
- gml/fidelity/repro-groups-no-creator.gml (like BioNetGen's visualize output): yEd-only keys
  (`LabelGraphics`, `isGroup`, `gid`) with no `Creator` line, nested groups, labels anchored "c",
  edges with and without `targetArrow`.
"""
import json
import os
import random
import sys

out = sys.argv[1]
rnd = random.Random(20261016)


def write(path, text):
    full = os.path.join(out, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


WORDS = ["kinase", "repair", "complex", "damage", "response", "signal", "binding", "assembly", "protein",
         "factor", "pathway", "stress", "receptor", "ligand", "cycle", "checkpoint"]


def phrase(n):
    return " ".join(rnd.choice(WORDS) for _ in range(n)).capitalize()


def cx1(nodes, edges, node_attrs, layout, vps):
    """A CX (v1) document as Cytoscape writes one."""
    aspects = [
        {"nodes": nodes},
        {"edges": edges},
        {"nodeAttributes": node_attrs},
        {"networkAttributes": [{"n": "name", "v": "repro"}]},
        {"cyVisualProperties": vps},
    ]
    if layout:
        aspects.insert(2, {"cartesianLayout": layout})
    meta = [{"name": list(a)[0], "version": "1.0", "elementCount": len(list(a.values())[0])} for a in aspects]
    doc = [{"numberVerification": [{"longNumber": 281474976710655}]}, {"metaData": meta}, *aspects,
           {"status": [{"error": "", "success": True}]}]
    return json.dumps(doc, indent=1) + "\n"


NETWORK_VP = {"properties_of": "network", "properties": {"NETWORK_BACKGROUND_PAINT": "#FFFFFF"}}
EDGE_VP = {"properties_of": "edges:default",
           "properties": {"EDGE_WIDTH": "2.0", "EDGE_STROKE_UNSELECTED_PAINT": "#848484",
                          "EDGE_TARGET_ARROW_SHAPE": "NONE", "EDGE_SOURCE_ARROW_SHAPE": "NONE"}}


def locked_own_size():
    n = 12
    nodes = [{"@id": i, "n": f"Assembly {i}"} for i in range(n)]
    edges = [{"@id": 100 + i, "s": i, "t": (i * 5 + 1) % n, "i": "pp"} for i in range(n)]
    attrs = [{"po": i, "n": "asmSize", "v": str(rnd.randint(3, 600)), "d": "integer"} for i in range(n)]
    layout = [{"node": i, "x": 220.0 * (i % 4), "y": 220.0 * (i // 4)} for i in range(n)]
    vps = [NETWORK_VP, {
        "properties_of": "nodes:default",
        "properties": {"NODE_SHAPE": "ELLIPSE", "NODE_SIZE": "35.0", "NODE_WIDTH": "75.0", "NODE_HEIGHT": "35.0",
                       "NODE_FILL_COLOR": "#4292C6", "NODE_BORDER_WIDTH": "0.0", "NODE_LABEL_COLOR": "#000000"},
        "dependencies": {"nodeSizeLocked": "true"},
        "mappings": {
            "NODE_SIZE": {"type": "CONTINUOUS",
                          "definition": "COL=asmSize,T=integer,L=0=10.0,E=0=10.0,G=0=10.0,OV=0=3.0,"
                                        "L=1=30.0,E=1=30.0,G=1=30.0,OV=1=605.0"},
            "NODE_LABEL": {"type": "PASSTHROUGH", "definition": "COL=name,T=string"},
        },
    }, EDGE_VP]
    for i in range(n - 2):
        side = f"{rnd.uniform(14, 190):.4f}"
        vps.append({"properties_of": "nodes", "applies_to": i, "properties": {"NODE_WIDTH": side, "NODE_HEIGHT": side}})
    write("cx/fidelity/repro-locked-own-size.cx", cx1(nodes, edges, attrs, layout, vps))


def unplaced_boxes():
    n = 24
    nodes = [{"@id": i, "n": phrase(rnd.randint(2, 5))} for i in range(n)]
    edges = [{"@id": 100 + i, "s": rnd.randrange(n), "t": rnd.randrange(n), "i": "cites"} for i in range(30)]
    edges = [e for e in edges if e["s"] != e["t"]]
    vps = [NETWORK_VP, {
        "properties_of": "nodes:default",
        "properties": {"NODE_SHAPE": "RECTANGLE", "NODE_SIZE": "40.0", "NODE_WIDTH": "145.0", "NODE_HEIGHT": "40.0",
                       "NODE_FILL_COLOR": "#FFFFCC", "NODE_BORDER_WIDTH": "1.0", "NODE_BORDER_PAINT": "#333333",
                       "NODE_LABEL_COLOR": "#000000", "NODE_LABEL_FONT_SIZE": "12"},
        "dependencies": {"nodeSizeLocked": "false"},
        "mappings": {"NODE_LABEL": {"type": "PASSTHROUGH", "definition": "COL=name,T=string"}},
    }, EDGE_VP]
    write("cx/fidelity/repro-unplaced-boxes.cx", cx1(nodes, edges, [], None, vps))


def shared_interaction():
    kinds = ["reaction-product", "reaction-reactant", "reaction-inhibitor", "reaction-modifier"]
    n = 16
    nodes = [{"id": i, "x": 160.0 * (i % 4), "y": 160.0 * (i // 4), "v": {"name": f"S{i}"}} for i in range(n)]
    edges = [{"id": 100 + i, "s": i, "t": (i * 3 + 2) % n, "v": {"i": kinds[i % len(kinds)]}} for i in range(n)]
    color = [{"v": "reaction-product", "vp": "#000000"}, {"v": "reaction-reactant", "vp": "#000000"},
             {"v": "reaction-inhibitor", "vp": "#FF3333"}, {"v": "reaction-modifier", "vp": "#3333FF"}]
    doc = [
        {"CXVersion": "2.0", "hasFragments": False},
        {"metaData": [{"name": "attributeDeclarations", "elementCount": 1}, {"name": "networkAttributes", "elementCount": 1},
                      {"name": "nodes", "elementCount": n}, {"name": "edges", "elementCount": len(edges)},
                      {"name": "visualProperties", "elementCount": 1}, {"name": "visualEditorProperties", "elementCount": 1}]},
        {"attributeDeclarations": [{"nodes": {"name": {"d": "string"}}, "edges": {"interaction": {"a": "i", "d": "string"}},
                                    "networkAttributes": {"name": {"d": "string"}}}]},
        {"networkAttributes": [{"name": "repro"}]},
        {"nodes": nodes},
        {"edges": edges},
        {"visualProperties": [{
            "default": {
                "network": {"NETWORK_BACKGROUND_COLOR": "#FFFFFF"},
                "node": {"NODE_SHAPE": "hexagon", "NODE_WIDTH": 40.0, "NODE_HEIGHT": 40.0, "NODE_BACKGROUND_COLOR": "#FFCC99",
                         "NODE_BORDER_WIDTH": 1.0, "NODE_BORDER_COLOR": "#000000", "NODE_LABEL_COLOR": "#000000"},
                "edge": {"EDGE_WIDTH": 2.0, "EDGE_LINE_COLOR": "#CCCCCC", "EDGE_LINE_STYLE": "solid",
                         "EDGE_TARGET_ARROW_SHAPE": "none", "EDGE_SOURCE_ARROW_SHAPE": "none",
                         "EDGE_SOURCE_ARROW_COLOR": "#CCCCCC", "EDGE_TARGET_ARROW_COLOR": "#CCCCCC"},
            },
            "nodeMapping": {"NODE_LABEL": {"type": "PASSTHROUGH", "definition": {"attribute": "shared name", "type": "string"}}},
            "edgeMapping": {
                "EDGE_LINE_COLOR": {"type": "DISCRETE", "definition": {"map": color, "attribute": "shared interaction", "type": "string"}},
                "EDGE_SOURCE_ARROW_COLOR": {"type": "DISCRETE", "definition": {"map": color, "attribute": "shared interaction", "type": "string"}},
                "EDGE_LINE_STYLE": {"type": "DISCRETE", "definition": {
                    "map": [{"v": "reaction-modifier", "vp": "dashed"}, {"v": "reaction-inhibitor", "vp": "dotted"}],
                    "attribute": "shared interaction", "type": "string"}},
                "EDGE_SOURCE_ARROW_SHAPE": {"type": "DISCRETE", "definition": {
                    "map": [{"v": "reaction-inhibitor", "vp": "tee"}, {"v": "reaction-modifier", "vp": "circle"}],
                    "attribute": "shared interaction", "type": "string"}},
            },
        }]},
        {"visualEditorProperties": [{"properties": {"nodeSizeLocked": False, "arrowColorMatchesEdge": False}}]},
        {"status": [{"error": "", "success": True}]},
    ]
    write("cx2/fidelity/repro-shared-interaction.cx2", json.dumps(doc, indent=1) + "\n")


def name_only_labels():
    lines = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
             '<graph label="repro" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xlink="http://www.w3.org/1999/xlink" '
             'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:cy="http://www.cytoscape.org" '
             'xmlns="http://www.cs.rpi.edu/XGMML" directed="1">',
             '  <att name="documentVersion" value="1.1"/>',
             '  <att type="string" name="backgroundColor" value="#ffffff"/>']
    n = 14
    for i in range(n):
        label = f"DB-{i:02d}"
        lines.append(f'  <node label="{label}" id="{-1 - i}">')
        lines.append(f'    <att type="string" name="canonicalName" value="{label}"/>')
        if i % 2 == 0:
            lines.append(f'    <att type="string" name="name" value="{label}"/>')
        fill = ["#00cc00", "#ff9900", "#3366ff"][i % 3]
        lines.append(f'    <graphics type="ELLIPSE" h="40.0" w="40.0" x="{120.0 * (i % 5):.1f}" y="{120.0 * (i // 5):.1f}" '
                     f'fill="{fill}" width="1" outline="#ffffff" cy:nodeTransparency="1.0" '
                     'cy:nodeLabelFont="SansSerif.bold-0-12" cy:borderLineType="solid"/>')
        lines.append('  </node>')
    for i in range(n):
        s, t = -1 - i, -1 - ((i * 4 + 3) % n)
        if s == t:
            continue
        lines.append(f'  <edge label="e{i}" source="{s}" target="{t}">')
        lines.append('    <att type="string" name="interaction" value="pp"/>')
        lines.append('    <graphics width="1" fill="#0000ff" cy:sourceArrow="0" cy:targetArrow="0" '
                     'cy:sourceArrowColor="#000000" cy:targetArrowColor="#000000" cy:edgeLineType="SOLID" cy:curved="STRAIGHT_LINES"/>')
        lines.append('  </edge>')
    lines.append('</graph>')
    write("xgmml/fidelity/repro-name-only-labels.xgmml", "\n".join(lines) + "\n")


def groups_no_creator():
    lines = ["graph", "[", "  hierarchic 1", "  directed 1"]
    nid = 0
    groups = []

    def node(label, x, y, w, h, fill, gid=None, group=False, shape="roundrectangle"):
        nonlocal nid
        lines.extend(["  node", "  [", f"    id {nid}", f'    label "{label}"'])
        if group:
            lines.append("    isGroup 1")
        if gid is not None:
            lines.append(f"    gid {gid}")
        lines.extend(["    graphics", "    [", f"      x {x:.1f}", f"      y {y:.1f}", f"      w {w:.1f}", f"      h {h:.1f}",
                      f'      type "{shape}"', f'      fill "{fill}"', '      outline "#000000"', "    ]",
                      "    LabelGraphics", "    [", f'      text "{label}"', '      anchor "c"', "    ]", "  ]"])
        nid += 1
        return nid - 1

    members = []
    for r in range(3):
        rule = node(f"Rule{r}", 300.0 * r + 100, 150.0, 260.0, 240.0, "#FFFFCC", group=True)
        groups.append(rule)
        for m in range(2):
            mol = node(f"M{r}{m}", 300.0 * r + 40 + 120 * m, 150.0, 100.0, 160.0, "#CCFFCC", gid=rule, group=True)
            for c in range(2):
                members.append(node(f"c{r}{m}{c}", 300.0 * r + 40 + 120 * m, 110.0 + 80 * c, 40.0, 40.0, "#FFFFFF", gid=mol,
                                    shape="ellipse"))
    for i in range(len(members) - 1):
        lines.extend(["  edge", "  [", f"    source {members[i]}", f"    target {members[i + 1]}",
                      "    graphics", "    [", '      fill "#000000"'] + (['      targetArrow "standard"'] if i % 2 else [])
                     + ["    ]", "  ]"])
    lines.append("]")
    write("gml/fidelity/repro-groups-no-creator.gml", "\n".join(lines) + "\n")


locked_own_size()
unplaced_boxes()
shared_interaction()
name_only_labels()
groups_no_creator()
