"""Seeded synthetic coverage files for the JSON style dialects graph-io reads.

Writes into tmp/file-styles-corpus/json/<id>/input.json:
  cyjs-synth-nodes   Cytoscape.js, every node style feature (JSON stylesheet array)
  cyjs-synth-edges   Cytoscape.js, every edge and compound feature (CSS text stylesheet)
  graphology-synth   graphology / sigma.js keys
  vis-synth          vis-network keys (options.nodes / edges / groups, per-element)

    python3 gen_synthetic.py
"""
import json
import os
import random

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "json")
rnd = random.Random(20261016)


def write(name, doc):
    d = os.path.join(ROOT, name)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "input.json"), "w") as f:
        json.dump(doc, f, indent=1)
    print(name)


SHAPES = ["rectangle", "roundrectangle", "round-rectangle", "cutrectangle", "cut-rectangle",
          "bottomroundrectangle", "bottom-round-rectangle", "barrel", "ellipse", "triangle",
          "round-triangle", "square", "pentagon", "round-pentagon", "hexagon", "round-hexagon",
          "concavehexagon", "concave-hexagon", "heptagon", "round-heptagon", "octagon",
          "round-octagon", "tag", "round-tag", "star", "diamond", "round-diamond", "vee",
          "rhomboid", "right-rhomboid", "polygon"]
COLORS = ["red", "#0a0", "#1f77b4", "rgb(255,127,14)", "rgba(148,103,189,0.5)", "hsl(120,60%,40%)",
          "hsla(300,70%,50%,0.6)", "goldenrod", "#8c564bcc", "teal"]
SVG = ("data:image/svg+xml;utf8," +
       "%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E"
       "%3Ccircle cx='10' cy='10' r='8' fill='orange'/%3E%3C/svg%3E")


def cyjs_nodes():
    els, style = [], []
    i = 0

    def node(cls, data=None, bypass=None):
        nonlocal i
        x, y = (i % 12) * 110, (i // 12) * 110
        e = {"data": {"id": f"n{i}", "name": f"N{i}", **(data or {})},
             "position": {"x": x, "y": y}, "classes": cls}
        if bypass:
            e["style"] = bypass
        els.append(e)
        i += 1

    style.append({"selector": "node", "style": {"label": "data(name)", "width": 40, "height": 40,
                                                 "background-color": "#888", "font-size": 10}})
    # 31 shapes
    for s in SHAPES:
        node(f"shape-{s}")
        style.append({"selector": f"node.shape-{s}", "style": {"shape": s, "background-color": "#6baed6"}})
    style.append({"selector": "node.shape-polygon", "style": {
        "shape-polygon-points": "-1 -1 1 -1 0.5 0 1 1 -1 1"}})
    style.append({"selector": "node.shape-round-rectangle", "style": {"corner-radius": 12}})
    # border styles and widths
    for j, (bs, bw) in enumerate([("solid", 1), ("solid", 6), ("dashed", 3), ("dotted", 3), ("double", 6)]):
        node(f"border-{j}")
        style.append({"selector": f"node.border-{j}", "style": {
            "border-style": bs, "border-width": bw, "border-color": COLORS[j], "background-color": "#fff",
            "border-opacity": 1 if j else 0.4}})
    # color syntaxes and opacity
    for j, c in enumerate(COLORS):
        node(f"fill-{j}")
        style.append({"selector": f"node.fill-{j}", "style": {"background-color": c}})
    for j, (op, bop) in enumerate([(1, 0.3), (0.5, 1), (0.25, 0.5)]):
        node(f"op-{j}")
        style.append({"selector": f"node.op-{j}", "style": {"opacity": op, "background-opacity": bop,
                                                             "background-color": "#d62728"}})
    # label positions (9), fonts, colors, outline, background, wrap, rotation, margin
    for v in ["top", "center", "bottom"]:
        for h in ["left", "center", "right"]:
            node(f"lp-{v}-{h}", {"name": f"{v}/{h}"})
            style.append({"selector": f"node.lp-{v}-{h}", "style": {"text-valign": v, "text-halign": h}})
    fonts = [("serif", "bold", "normal", 14, "#d62728"), ("monospace", "300", "italic", 8, "#2ca02c"),
             ("Georgia", "normal", "oblique", 20, "blue"), ("sans-serif", 900, "normal", 12, "rgb(0,0,0)")]
    for j, (fam, w, st, sz, col) in enumerate(fonts):
        node(f"font-{j}", {"name": f"Font {fam}"})
        style.append({"selector": f"node.font-{j}", "style": {"font-family": fam, "font-weight": w,
                                                               "font-style": st, "font-size": sz, "color": col}})
    node("outline", {"name": "outlined"})
    style.append({"selector": "node.outline", "style": {"text-outline-width": 2, "text-outline-color": "#000",
                                                         "color": "#fff"}})
    node("textbg", {"name": "on a box"})
    style.append({"selector": "node.textbg", "style": {"text-background-color": "yellow",
                                                        "text-background-opacity": 1,
                                                        "text-background-shape": "round-rectangle",
                                                        "text-border-width": 1, "text-border-color": "#333",
                                                        "text-border-opacity": 1}})
    node("wrap", {"name": "a long label that wraps over several lines"})
    style.append({"selector": "node.wrap", "style": {"text-wrap": "wrap", "text-max-width": 60}})
    node("ellipsis", {"name": "a long label cut with an ellipsis at the end"})
    style.append({"selector": "node.ellipsis", "style": {"text-wrap": "ellipsis", "text-max-width": 50}})
    node("rot", {"name": "rotated"})
    style.append({"selector": "node.rot", "style": {"text-rotation": "45deg", "text-margin-x": 10,
                                                     "text-margin-y": -10}})
    node("lbl-hidden", {"name": "label hidden"})
    style.append({"selector": "node.lbl-hidden", "style": {"text-opacity": 0}})
    node("nolabel")
    style.append({"selector": "node.nolabel", "style": {"label": ""}})
    # visibility, display, z-index overlap
    node("hidden")
    style.append({"selector": "node.hidden", "style": {"visibility": "hidden"}})
    node("none")
    style.append({"selector": "node.none", "style": {"display": "none"}})
    for j, z in enumerate([5, 1, 10]):
        node(f"z-{j}")
        els[-1]["position"] = {"x": 1400 + j * 15, "y": 100 + j * 15}
        style.append({"selector": f"node.z-{j}", "style": {"z-index": z, "background-color": COLORS[j],
                                                            "width": 60, "height": 60}})
    # images, gradients, pie
    node("img")
    style.append({"selector": "node.img", "style": {"background-image": SVG, "background-fit": "contain"}})
    node("grad-lin")
    style.append({"selector": "node.grad-lin", "style": {"background-fill": "linear-gradient",
                                                          "background-gradient-stop-colors": "cyan magenta yellow"}})
    node("grad-rad")
    style.append({"selector": "node.grad-rad", "style": {"background-fill": "radial-gradient",
                                                          "background-gradient-stop-colors": "white navy"}})
    node("pie", {"a": 30, "b": 50, "c": 20})
    style.append({"selector": "node.pie", "style": {
        "pie-size": "90%", "pie-1-background-color": "#e41a1c", "pie-1-background-size": "mapData(a, 0, 100, 0, 100)",
        "pie-2-background-color": "#377eb8", "pie-2-background-size": "mapData(b, 0, 100, 0, 100)",
        "pie-3-background-color": "#4daf4a", "pie-3-background-size": "mapData(c, 0, 100, 0, 100)"}})
    node("ghost")
    style.append({"selector": "node.ghost", "style": {"ghost": "yes", "ghost-offset-x": 6, "ghost-offset-y": 6,
                                                       "ghost-opacity": 0.4}})
    node("underlay")
    style.append({"selector": "node.underlay", "style": {"underlay-color": "lime", "underlay-padding": 8,
                                                          "underlay-opacity": 0.5}})
    # mappers: data(), mapData() for size, color, border width; attribute selectors
    for j in range(24):
        node("mapped", {"score": j / 23, "deg": j, "kind": ["a", "b", "c"][j % 3], "flag": j % 2 == 0,
                        "w": 20 + j * 2, "fill": COLORS[j % len(COLORS)]})
    style += [
        {"selector": "node.mapped", "style": {
            "width": "mapData(score, 0, 1, 15, 70)", "height": "data(w)",
            "background-color": "mapData(deg, 0, 23, blue, red)",
            "border-width": "mapData(score, 0, 1, 0, 8)", "border-color": "#000"}},
        {"selector": "node.mapped[kind = 'b']", "style": {"shape": "diamond"}},
        {"selector": "node.mapped[deg >= 20]", "style": {"label": "data(deg)", "font-size": 16}},
        {"selector": "node.mapped[?flag][kind = 'c']", "style": {"border-style": "dashed"}},
        {"selector": "node.mapped[name ^= 'N9']", "style": {"color": "purple"}},
    ]
    # per-element bypass (style on the element) over the stylesheet
    for j in range(4):
        node("bypassed", bypass={"background-color": COLORS[j + 3], "shape": "star", "width": 50, "height": 30})
    # sizes in other units and label as data(missing) -> default
    node("units")
    style.append({"selector": "node.units", "style": {"width": "3em", "height": "20px", "label": "data(missing)"}})
    node("selected-state")
    els[-1]["selected"] = True
    style.append({"selector": "node:selected", "style": {"background-color": "black"}})
    return {"elements": els, "style": style}


def cyjs_edges():
    nodes, edges = [], []
    css = ["node { label: data(id); width: 24; height: 24; background-color: #9ecae1; font-size: 9; }",
           "edge { width: 2; line-color: #555; curve-style: bezier; }"]
    pos = {}

    def n(id_, x, y, parent=None, **data):
        d = {"id": id_, **data}
        if parent:
            d["parent"] = parent
        nodes.append({"data": d, "position": {"x": x, "y": y}})
        pos[id_] = (x, y)

    k = 0

    def e(s, t, cls="", **data):
        nonlocal k
        edges.append({"data": {"id": f"e{k}", "source": s, "target": t, **data}, "classes": cls})
        k += 1

    # rows of pairs, one feature per pair
    row = 0
    feats = []
    curves = ["bezier", "unbundled-bezier", "segments", "taxi", "round-taxi", "round-segments", "straight",
              "straight-triangle", "haystack"]
    for c in curves:
        feats.append(("curve-" + c, f"curve-style: {c};" + {
            "unbundled-bezier": " control-point-distances: 40 -40; control-point-weights: 0.25 0.75;",
            "segments": " segment-distances: 30 -30; segment-weights: 0.3 0.7;",
            "round-segments": " segment-distances: 30; segment-weights: 0.5; segment-radius: 10;",
            "taxi": " taxi-direction: downward; taxi-turn: 50%;",
            "round-taxi": " taxi-direction: horizontal; taxi-radius: 10;",
            "haystack": " haystack-radius: 0.5;"}.get(c, "")))
    arrows = ["tee", "triangle", "triangle-tee", "circle-triangle", "triangle-cross", "triangle-backcurve", "vee",
              "square", "circle", "diamond", "chevron"]
    for a in arrows:
        feats.append(("arrow-" + a, f"target-arrow-shape: {a}; source-arrow-shape: {a}; target-arrow-color: red;"
                      " source-arrow-color: blue;"))
    feats += [
        ("arrow-hollow", "target-arrow-shape: triangle; target-arrow-fill: hollow; arrow-scale: 2;"),
        ("arrow-mid", "mid-target-arrow-shape: triangle; mid-source-arrow-shape: circle;"),
        ("arrow-small", "target-arrow-shape: vee; arrow-scale: 0.5;"),
        ("dashed", "line-style: dashed; line-dash-pattern: 8 4; width: 3;"),
        ("dotted", "line-style: dotted; width: 4;"),
        ("thick", "width: 10; line-color: rgba(200,0,0,0.5);"),
        ("hsl", "line-color: hsl(200,80%,40%); width: 3;"),
        ("opacity", "opacity: 0.3; width: 6; line-color: black;"),
        ("line-opacity", "line-opacity: 0.5; width: 6;"),
        ("gradient", "line-fill: linear-gradient; line-gradient-stop-colors: cyan magenta; width: 5;"),
        ("label", "label: data(lbl); font-size: 12; color: #c00;"),
        ("label-auto", "label: data(lbl); edge-text-rotation: autorotate; text-background-color: #ff0;"
                       " text-background-opacity: 1;"),
        ("label-ends", "source-label: src; target-label: tgt; source-text-offset: 20; target-text-offset: 20;"),
        ("label-margin", "label: data(lbl); text-margin-y: -10; text-outline-width: 2; text-outline-color: #fff;"),
        ("hidden", "visibility: hidden;"),
        ("none", "display: none;"),
        ("z", "z-index: 99; width: 8; line-color: orange;"),
        ("mapped-w", "width: mapData(w, 0, 10, 1, 12); line-color: mapData(w, 0, 10, green, purple);"),
    ]
    for name, decl in feats:
        x0, y = 0 + (row % 3) * 260, (row // 3) * 70
        a, b = f"{name}-s", f"{name}-t"
        n(a, x0, y)
        n(b, x0 + 160, y + 20)
        e(a, b, name, lbl=name, w=row % 11)
        css.append(f"edge.{name} {{ {decl} }}")
        row += 1
    # loops and parallel edges
    y = (row // 3 + 1) * 70
    n("loop", 0, y)
    e("loop", "loop", "loop")
    e("loop", "loop", "loop2")
    css.append("edge.loop { loop-direction: -45deg; loop-sweep: 30deg; line-color: #2ca02c; }")
    css.append("edge.loop2 { loop-direction: 90deg; line-color: #d62728; }")
    n("p1", 260, y)
    n("p2", 420, y)
    for j in range(4):
        e("p1", "p2", "par", w=j)
    css.append("edge.par { control-point-step-size: 20; target-arrow-shape: triangle; }")
    # compounds: nested, padding, shapes, labels, colors, member edges
    gy = y + 160
    for g in range(3):
        gid = f"g{g}"
        nodes.append({"data": {"id": gid, "label": f"Group {g}"}, "classes": f"grp grp{g}"})
        for m in range(5):
            n(f"{gid}m{m}", 600 * g + (m % 3) * 70, gy + (m // 3) * 70, parent=gid)
        for m in range(4):
            e(f"{gid}m{m}", f"{gid}m{m + 1}", "member")
    nodes.append({"data": {"id": "g0inner", "parent": "g0", "label": "inner"}, "classes": "grp inner"})
    for m in range(3):
        n(f"g0i{m}", m * 50, gy + 220, parent="g0inner")
    e("g0m0", "g1m0", "cross")
    e("g1", "g2", "between")
    css += [
        ":parent { background-opacity: 0.2; padding: 15; label: data(label); text-valign: top;"
        " border-width: 2; }",
        "node.grp0 { background-color: #1f77b4; shape: round-rectangle; border-style: dashed; }",
        "node.grp1 { background-color: #ff7f0e; shape: barrel; }",
        "node.grp2 { background-color: #2ca02c; border-color: #000; compound-sizing-wrt-labels: include; }",
        "node.inner { background-color: #d62728; padding: 5; }",
        "edge.cross { line-color: purple; width: 3; target-arrow-shape: triangle; }",
        "edge.between { line-color: gray; width: 6; line-style: dashed; }",
        "node:childless[id ^= 'g1'] { shape: hexagon; }",
    ]
    return {"elements": {"nodes": nodes, "edges": edges}, "style": "\n".join(css)}


def graphology():
    nodes, edges = [], []
    cols = ["#e41a1c", "#377eb8", "rgb(77,175,74)", "rgba(152,78,163,0.5)", "orange", "#ff7f00aa", "#a65628"]
    for i in range(100):
        a = {"x": (i % 10) * 10.0, "y": (i // 10) * 10.0, "label": f"node {i}"}
        if i % 9 != 0:
            a["color"] = cols[i % len(cols)]
        if i % 4 != 0:
            a["size"] = 2 + (i % 13)
        if i % 17 == 0:
            a["hidden"] = True
        if i % 11 == 0:
            a["forceLabel"] = True
        if i % 23 == 0:
            a["zIndex"] = 5
        if i % 25 == 1:
            a["label"] = None
        if i % 30 == 2:
            a["type"] = "image"
            a["image"] = SVG
        nodes.append({"key": f"n{i}", "attributes": a})
    k = 0
    for i in range(100):
        for d in (1, 10):
            j = i + d
            if j >= 100 or (d == 1 and j % 10 == 0):
                continue
            a = {}
            if k % 3:
                a["color"] = cols[k % len(cols)]
            if k % 4:
                a["size"] = 1 + k % 5
            if k % 7 == 0:
                a["label"] = f"e{k}"
            if k % 19 == 0:
                a["hidden"] = True
            if k % 5 == 0:
                a["type"] = ["line", "arrow", "curvedArrow", "curve"][k % 4]
            e = {"key": f"e{k}", "source": f"n{i}", "target": f"n{j}", "attributes": a}
            if k % 2:
                e["undirected"] = True
            edges.append(e)
            k += 1
    return {"attributes": {"name": "graphology synthetic"}, "options": {"type": "mixed", "multi": False,
                                                                         "allowSelfLoops": True},
            "nodes": nodes, "edges": edges}


def vis():
    shapes = ["ellipse", "circle", "database", "box", "text", "diamond", "dot", "star", "triangle",
              "triangleDown", "hexagon", "square", "image", "circularImage", "icon"]
    nodes, edges = [], []
    i = 0

    def node(**o):
        nonlocal i
        o.setdefault("id", i)
        o.setdefault("label", f"v{i}")
        o.setdefault("x", (i % 12) * 120)
        o.setdefault("y", (i // 12) * 120)
        nodes.append(o)
        i += 1

    for s in shapes:
        o = {"shape": s, "label": s}
        if s in ("image", "circularImage"):
            o["image"] = SVG
        if s == "icon":
            o["icon"] = {"face": "FontAwesome", "code": "", "size": 40, "color": "#f0a30a"}
        node(**o)
    for j, c in enumerate(["red", "#00ff00", "rgba(0,0,255,0.5)", "#97C2FC"]):
        node(color=c, shape="dot")
    node(color={"background": "yellow", "border": "black", "highlight": {"background": "red", "border": "blue"}},
         borderWidth=4)
    node(shape="box", borderWidth=3, shapeProperties={"borderDashes": [5, 5]})
    node(shape="box", shapeProperties={"borderRadius": 0})
    node(shape="dot", size=40)
    node(shape="square", size=8)
    node(opacity=0.3, shape="dot", color="black")
    node(hidden=True)
    node(font={"size": 24, "color": "#d62728", "face": "Georgia", "strokeWidth": 3, "strokeColor": "#ffffff"},
         label="big font")
    node(font={"size": 10, "color": "blue", "background": "yellow"}, label="font bg")
    node(font={"multi": "html", "bold": "16px arial black"}, label="<b>bold</b> and plain")
    node(label="multi\nline\nlabel", shape="box")
    node(shape="box", widthConstraint={"minimum": 120}, heightConstraint={"minimum": 50}, label="constrained")
    node(shape="dot", shadow=True, color="#2ca02c")
    node(shape="dot", title="tooltip only")
    node(shape="star", borderWidth=0, color={"background": "gold"})
    for j in range(24):
        node(group=f"g{j % 4}", value=j + 1)
    for j in range(8):
        node(group="defined", value=j * 3)
    for j in range(6):
        node(label=f"default {j}")
    n = i
    k = 0

    def edge(s, t, **o):
        nonlocal k
        o.setdefault("id", f"e{k}")
        edges.append({"from": s, "to": t, **o})
        k += 1

    arrow_types = ["arrow", "bar", "circle", "box", "crow", "curve", "inv_curve", "diamond", "triangle",
                   "inv_triangle", "vee", "image"]
    for j, t in enumerate(arrow_types):
        a = {"to": {"enabled": True, "type": t}}
        if t == "image":
            a["to"]["src"] = SVG
        edge(j, j + 1, arrows=a, label=t)
    edge(13, 14, arrows="to, from")
    edge(14, 15, arrows="middle")
    edge(15, 16, arrows={"to": {"enabled": True, "scaleFactor": 2}})
    edge(16, 17, arrows={"from": {"enabled": True, "scaleFactor": 0.5}})
    smooth = ["dynamic", "continuous", "discrete", "diagonalCross", "straightCross", "horizontal", "vertical",
              "curvedCW", "curvedCCW", "cubicBezier"]
    for j, s in enumerate(smooth):
        edge(20 + j, 32 + j, smooth={"enabled": True, "type": s, "roundness": 0.5})
    edge(30, 42, smooth=False)
    for j, c in enumerate(["red", "#00ff00", {"color": "blue", "opacity": 0.4}, {"inherit": "from"},
                           {"inherit": "to"}, {"inherit": "both"}, {"inherit": False}]):
        edge(40 + j, 50 + j, color=c, width=3)
    edge(47, 57, dashes=True, width=2)
    edge(48, 58, dashes=[2, 6], width=2)
    edge(49, 59, width=8)
    edge(50, 60, value=10)
    edge(51, 61, value=1)
    edge(52, 62, hidden=True)
    edge(53, 63, label="edge label", font={"size": 18, "color": "#c00", "align": "top"})
    edge(54, 64, label="horizontal", font={"align": "horizontal", "background": "white"})
    edge(55, 55, label="self loop", selfReference={"size": 20, "angle": 0.8})
    edge(56, 57)
    edge(56, 57, color="red")
    for j in range(n - 40, n - 1):
        edge(j, j + 1)
    options = {
        "nodes": {"shape": "dot", "color": {"background": "#cccccc", "border": "#333333"}, "borderWidth": 1,
                  "font": {"size": 12, "color": "#343434"}, "scaling": {"min": 8, "max": 30}},
        "edges": {"color": {"color": "#848484"}, "width": 1, "smooth": {"enabled": True, "type": "dynamic"},
                  "arrows": {"to": {"enabled": False}}, "scaling": {"min": 1, "max": 8}},
        "groups": {"defined": {"shape": "diamond", "color": {"background": "pink", "border": "purple"},
                               "borderWidth": 2},
                   "g0": {"color": "#ff0000"}},
        "physics": False,
    }
    return {"nodes": nodes, "edges": edges, "options": options}


if __name__ == "__main__":
    write("cyjs-synth-nodes", cyjs_nodes())
    write("cyjs-synth-edges", cyjs_edges())
    write("graphology-synth", graphology())
    write("vis-synth", vis())
