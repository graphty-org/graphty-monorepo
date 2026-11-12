"""Writes the per-writer inputs of the GML style corpus (seeded), each in the shape its writer produces.

Run from anywhere: python3 graph-io/test/styles/generate-gml-corpus.py (needs networkx).
"""
import random, os
import networkx as nx

OUT = os.path.join(os.path.dirname(__file__), "../corpus/styles/gml/generated")
rng = random.Random(20261011)
KINDS = ["protein", "gene", "compound", "drug"]
COLORS = {"protein": "#ff9999", "gene": "#99ccff", "compound": "#ccffcc", "drug": "#ffcc66"}
SHAPES = {"protein": "ellipse", "gene": "rectangle", "compound": "diamond", "drug": "hexagon"}

def graph(n, m):
    nodes = [(i, KINDS[rng.randrange(4)]) for i in range(n)]
    edges = set()
    while len(edges) < m:
        a, b = rng.randrange(n), rng.randrange(n)
        if a != b:
            edges.add((a, b))
    return nodes, sorted(edges)

def write(name, text):
    with open(os.path.join(OUT, name), "w", newline="\n") as f:
        f.write(text)

# Cytoscape 2.x GMLWriter: tabs, Creator "Cytoscape", Version 1.0, negative root indexes, numbered arrows
nodes, edges = graph(30, 45)
L = ['Creator\t"Cytoscape"', "Version\t1.0", "graph\t[", '\tlabel\t""', "\tdirected\t1"]
for i, k in nodes:
    L += ["\tnode\t[", f"\t\troot_index\t{-(i+1)}", f"\t\tid\t{-(i+1)}", f'\t\tlabel\t"{k[0].upper()}{i}"', "\t\tgraphics\t[",
          f"\t\t\tx\t{rng.uniform(0, 900):.1f}", f"\t\t\ty\t{rng.uniform(0, 900):.1f}", "\t\t\tw\t35.0", "\t\t\th\t35.0",
          f'\t\t\tfill\t"{COLORS[k]}"', f'\t\t\ttype\t"{SHAPES[k]}"', '\t\t\toutline\t"#000000"', "\t\t\toutline_width\t1.0", "\t\t]",
          f'\t\tcanonicalName\t"{k}"', "\t]"]
for j, (a, b) in enumerate(edges):
    inter = "pp" if j % 3 else "pd"
    L += ["\tedge\t[", f"\t\troot_index\t{-(j+1)}", f"\t\ttarget\t{-(b+1)}", f"\t\tsource\t{-(a+1)}", f'\t\tlabel\t"{inter}"', "\t\tgraphics\t[",
          f"\t\t\twidth\t{1.0 if inter == 'pp' else 3.0}", '\t\t\ttype\t"line"', f'\t\t\tfill\t"{"#0000ff" if inter == "pp" else "#ff0000"}"',
          "\t\t\tLine\t[", "\t\t\t]", "\t\t\tsource_arrow\t0", f"\t\t\ttarget_arrow\t{3 if inter == 'pd' else 0}", "\t\t]", "\t]"]
L += ["]"]
write("cytoscape-interactions.gml", "\n".join(L) + "\n")

# Gephi's GML exporter: Creator unquoted inside the graph, x y z w h d fill per node; edges keep only their weight
# unless colored
nodes, edges = graph(40, 70)
L = ["graph", "[", "  Creator Gephi", "  directed 1"]
for i, k in nodes:
    size = {"protein": 10.0, "gene": 15.0, "compound": 20.0, "drug": 25.0}[k]
    L += ["  node", "  [", f"    id {i}", f'    label "{k}-{i}"', "    graphics", "    [", f"      x {rng.uniform(-500, 500):.4f}",
          f"      y {rng.uniform(-500, 500):.4f}", "      z 0.0", f"      w {size}", f"      h {size}", f"      d {size}",
          f'      fill "{COLORS[k]}"', "    ]", f'    kind "{k}"', "  ]"]
for j, (a, b) in enumerate(edges):
    L += ["  edge", "  [", f"    id {j}", f"    source {a}", f"    target {b}", f"    value {1 + j % 3}.0"]
    if j % 5 == 0:
        L += ["    graphics", "    [", '      fill "#808080"', "    ]"]
    L += ["  ]"]
L += ["]"]
write("gephi-unquoted-creator.gml", "\n".join(L) + "\n")

# OGDF's GraphAttributes::writeGML: no indentation, backslash-escaped quotes in strings, line / lineWidth / stipple
OGDF_TYPES = {"protein": "oval", "gene": "rect", "compound": "rhomb", "drug": "hexagon"}
nodes, edges = graph(25, 35)
L = ['Creator "ogdf::GraphAttributes::writeGML"', "directed 1", "graph ["]
for i, k in nodes:
    L += ["node [", f"id {i}", f'label "{k} \\"{i}\\""', "graphics [", f"x {rng.uniform(0, 600):.10f}", f"y {rng.uniform(0, 600):.10f}",
          "w 40.00000000", "h 20.00000000", f'fill "{COLORS[k]}"', '''line "#000000"''', 'pattern "1"', f"stipple {2 if k == 'drug' else 1}",
          "lineWidth 1.000000000", f'type "{OGDF_TYPES[k]}"', "width 1.0", "]", "]"]
for j, (a, b) in enumerate(edges):
    L += ["edge [", f"source {a}", f"target {b}", "graphics [", 'type "line"', f'arrow "{"last" if j % 2 else "none"}"',
          f"stipple {3 if j % 4 == 0 else 1}", f"lineWidth {2.0 if j % 4 == 0 else 1.0:.9f}", 'fill "#000000"', "]", "]"]
L += ["]"]
write("ogdf-escaped-labels.gml", "\n".join(L) + "\n")

# igraph's write_graph_gml: Creator line, flat attributes, no graphics (igraph draws with plot(), which reads none)
nodes, edges = graph(20, 25)
L = ['Creator "igraph version 0.10.4 Tue Mar 14 10:00:00 2023"', "Version 1", "graph", "[", "  directed 0"]
for i, k in nodes:
    L += ["  node", "  [", f"    id {i}", f'    name "{k}{i}"', f'    color "{COLORS[k]}"', "  ]"]
for a, b in edges:
    L += ["  edge", "  [", f"    source {a}", f"    target {b}", "  ]"]
L += ["]"]
write("igraph-flat-attributes.gml", "\n".join(L) + "\n")

# NetworkX write_gml (no Creator line): a graph whose nodes carry a graphics dict and a LabelGraphics dict
nodes, edges = graph(24, 30)
G = nx.Graph()
for i, k in nodes:
    G.add_node(f"n{i}", kind=k, graphics={"type": SHAPES[k], "fill": COLORS[k], "w": 30.0, "h": 30.0},
               LabelGraphics={"fontSize": 14 if k == "drug" else 10})
for j, (a, b) in enumerate(edges):
    G.add_edge(f"n{a}", f"n{b}", graphics={"fill": "#333333", "width": 1 + j % 2})
nx.write_gml(G, os.path.join(OUT, "networkx-graphics.gml"))

# yEd's GML export (yFiles for Java 2.x): tabs, LabelGraphics with color and fontStyle, edge labels, arrows by name
YED_TYPES = {"protein": "roundrectangle", "gene": "rectangle", "compound": "diamond", "drug": "hexagon"}
nodes, edges = graph(30, 40)
L = ['Creator\t"yFiles"', 'Version\t"2.17"', "graph", "[", "\thierarchic\t1", '\tlabel\t""', "\tdirected\t1"]
for i, k in nodes:
    L += ["\tnode", "\t[", f"\t\tid\t{i}", f'\t\tlabel\t"{k}{i}"', "\t\tgraphics", "\t\t[", f"\t\t\tx\t{rng.uniform(0, 800):.1f}",
          f"\t\t\ty\t{rng.uniform(0, 800):.1f}", "\t\t\tw\t60.0", "\t\t\th\t30.0", f'\t\t\ttype\t"{YED_TYPES[k]}"']
    if k == "compound":
        L += ["\t\t\thasFill\t0"]
    else:
        L += [f'\t\t\tfill\t"{COLORS[k].upper()}"']
    L += ['\t\t\toutline\t"#000000"']
    if k == "drug":
        L += ['\t\t\toutlineStyle\t"dashed"', "\t\t\toutlineWidth\t2"]
    L += ["\t\t]", "\t\tLabelGraphics", "\t\t[", f'\t\t\ttext\t"{k}{i}"', "\t\t\tfontSize\t12", '\t\t\tfontName\t"Dialog"']
    if k == "gene":
        L += ['\t\t\tfontStyle\t"bold"', '\t\t\tcolor\t"#0000FF"']
    L += ['\t\t\tanchor\t"c"', "\t\t]"]
    if i % 10 == 0:
        L += ["\t\tLabelGraphics", "\t\t[", '\t\t\ttext\t"note"', "\t\t\tfontSize\t10", '\t\t\tmodel\t"sides"', '\t\t\tanchor\t"n"', "\t\t]"]
    L += ["\t]"]
for j, (a, b) in enumerate(edges):
    L += ["\tedge", "\t[", f"\t\tsource\t{a}", f"\t\ttarget\t{b}", "\t\tgraphics", "\t\t[", f'\t\t\tfill\t"{"#FF0000" if j % 4 == 0 else "#000000"}"']
    if j % 4 == 0:
        L += ["\t\t\twidth\t3", '\t\t\tstyle\t"dashed"']
    L += ['\t\t\ttargetArrow\t"standard"']
    if j % 7 == 0:
        L += ['\t\t\tsourceArrow\t"white_diamond"', "\t\t\tsmoothBends\t1"]
    L += ["\t\t]"]
    if j % 4 == 0:
        L += ["\t\tLabelGraphics", "\t\t[", '\t\t\ttext\t"inhibits"', "\t\t\tfontSize\t12", '\t\t\tfontName\t"Dialog"', '\t\t\tmodel\t"six_pos"', '\t\t\tposition\t"tail"', "\t\t]"]
    L += ["\t]"]
L += ["]"]
write("yed-labels-and-arrows.gml", "\n".join(L) + "\n")
