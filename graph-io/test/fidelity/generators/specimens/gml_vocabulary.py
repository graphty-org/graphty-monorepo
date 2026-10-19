#!/usr/bin/env python3
"""Writes gml-vocabulary.json: the GML style vocabulary the GML specimen sheets sweep (gml.py), deterministic.

    python3 gml_vocabulary.py            (writes gml-vocabulary.json beside this file)

GML has no style schema. Its vocabulary comes from four places, each recorded with its source:

- graphlet: Himsolt's GML draft (the Graphlet manual, "GML: Graph Modelling Language", 1996, appendix A) and the
  technical report "GML: A portable Graph File Format" name the graphics keys x, y, z, w, h, d, type, image,
  bitmap, Line / point, width, stipple and label; the draft says the graphics keys are "modelled after the graphics
  in Tk", so the Tk canvas item options GML writers use (fill, outline, arrow, smooth, the stipple bitmaps and Tk's
  color syntaxes) come from the Tk canvas manual.
- yed: yEd's GML extensions, which yEd documents nowhere. Their key names are read from the yEd-written GML files
  in graph-io/test/corpus (Creator "yFiles"); their values are yEd's realizer enumerations (ygraphics.xsd and what
  yEd writes), taken from yed-vocabulary.json (yed_vocabulary.py) when it is present and from the copy in
  gml-vocabulary.json otherwise.
- cytoscape2: Cytoscape 2.x wrote GML with numbered arrows (source_arrow / target_arrow 0..17); Cytoscape 3.10.5's
  own GML reader (io-impl-3.10.5.jar, GMLNetworkReader.legacyArrowShapes) is the authoritative table.
- cytoscape: what Cytoscape 2.x's GML writer wrote under Creator "Cytoscape" (graphics x, y, w, h, fill, type,
  outline, outline_width; edge width, fill, type, Line, source_arrow, target_arrow; see the Cytoscape-written file in
  graph-io/test/corpus), with Cytoscape 3.10.5's node shape names (CyREST GET
  /v1/styles/visualproperties/NODE_SHAPE/values) in both cases and Cytoscape 2.x's own shape names.
- ogdf: what OGDF (the Open Graph Drawing Framework, 2025.10) writes with GraphIO::writeGML: its GML keys
  (include/ogdf/fileformats/GML.h, enum Key) and the value names of its Shape, StrokeType, FillPattern and EdgeArrow
  enums (include/ogdf/basic/graphics.h), spelled as its writer spells them.
- gephi: what Gephi's GML exporter writes (Creator "Gephi" inside the graph; node label and graphics x, y, z, w, h,
  d, fill; edge id, label, value, directed and fill), read from the Gephi-written file in
  graph-io/test/corpus/styles/gml and from Gephi Toolkit 0.11.3's ExporterGML.
- reader: which keys each oracle program reads (Cytoscape 3.10.5's GML reader and Graphviz 14.1.2's gml2gv), from
  their own code, so a sheet's route can be chosen by what its reader draws.

A new yEd or Cytoscape release shows up as a new or missing specimen when this script is run again.
"""
import gzip
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
TEST = os.path.normpath(os.path.join(HERE, "../../.."))
OUT = os.path.join(HERE, "gml-vocabulary.json")

SOURCES = {
    "gmlDraft": "http://web.archive.org/web/20061209102127/http://www.infosun.fmi.uni-passau.de:80/Graphlet/download/misc/GML.ps.gz",
    "gmlReport": "http://web.archive.org/web/20190718030537/http://www.fim.uni-passau.de:80/fileadmin/files/lehrstuhl/brandenburg/projekte/gml/gml-technical-report.pdf",
    "tkCanvas": "https://www.tcl.tk/man/tcl8.6/TkCmd/canvas.htm",
    "tkColors": "https://www.tcl.tk/man/tcl8.6/TkLib/GetColor.htm",
    "tkBitmaps": "https://www.tcl.tk/man/tcl8.6/TkLib/GetBitmap.htm",
    "yedSchema": "https://www.yworks.com/xml/schema/graphml/1.1/ygraphics.xsd",
    "yedCorpus": "graph-io/test/corpus: GML files with Creator \"yFiles\"",
    "cytoscapeReader": "Cytoscape 3.10.5 io-impl-3.10.5.jar org.cytoscape.io.internal.read.gml.GMLNetworkReader",
    "gml2gv": "https://gitlab.com/graphviz/graphviz/-/blob/14.1.2/cmd/tools/gmlparse.y",
    "cytoscapeShapes": "Cytoscape 3.10.5 CyREST GET /v1/styles/visualproperties/NODE_SHAPE/values",
    "ogdf": "OGDF 2025.10 as shipped in https://pypi.org/project/ogdf-wheel/2025.10/: include/ogdf/basic/graphics.h "
            "(Shape, StrokeType, FillPattern, EdgeArrow), include/ogdf/fileformats/GML.h (Key), and what "
            "GraphIO::writeGML writes",
}

# ---- Himsolt's draft and Tk
GRAPHLET = {
    "node.graphics.type": {
        "source": "gmlDraft A.4: 'Values for type are arc, bitmap, image, line, oval, polygon, rectangle and text'",
        "values": ["arc", "bitmap", "image", "line", "oval", "polygon", "rectangle", "text"],
    },
    "node.graphics.w": {"source": "gmlDraft A.4", "values": ["number"]},
    "node.graphics.h": {"source": "gmlDraft A.4", "values": ["number"]},
    "node.graphics.x": {"source": "gmlDraft A.4", "values": ["number"]},
    "node.graphics.y": {"source": "gmlDraft A.4", "values": ["number"]},
    "node.graphics.image": {"source": "gmlDraft A.4: the name of an image file", "values": ["file"]},
    "node.graphics.bitmap": {"source": "gmlDraft A.4: the name of a bitmap file", "values": ["file"]},
    "node.graphics.fill": {
        "source": "tkCanvas -fill, color syntax tkColors",
        "values": ["#rgb", "#rrggbb", "#rrrgggbbb", "#rrrrggggbbbb", "name", "name-with-space", "name-uppercase"],
    },
    "node.graphics.outline": {"source": "tkCanvas -outline", "values": ["#rrggbb", "name"]},
    "node.graphics.width": {"source": "tkCanvas -width (the outline's width)", "values": ["number"]},
    "node.graphics.stipple": {
        "source": "gmlDraft A.4 stipple; Tk's built-in bitmaps (tkBitmaps)",
        "values": ["error", "gray75", "gray50", "gray25", "gray12", "hourglass", "info", "questhead", "question",
                   "warning"],
    },
    "node.label": {"source": "gmlDraft A.1: 'A graphical browser should use this attribute to annotate the object'",
                   "values": ["text", "entity", "char-ref", "long"]},
    "edge.label": {"source": "gmlDraft A.1", "values": ["text"]},
    "edge.graphics.Line.point": {"source": "gmlDraft A.4 (the points include the end points)",
                                 "values": ["straight", "one-bend", "two-bends", "loop", "parallel"]},
    "edge.graphics.width": {"source": "gmlDraft A.4: 'Sets the line width (in pixels)'", "values": ["number"]},
    "edge.graphics.fill": {"source": "tkCanvas line -fill", "values": ["#rrggbb", "name"]},
    "edge.graphics.stipple": {"source": "gmlDraft A.4 edge stipple; tkBitmaps", "values": ["gray50", "gray25"]},
    "edge.graphics.arrow": {"source": "tkCanvas line -arrow", "values": ["none", "first", "last", "both"]},
    "edge.graphics.smooth": {"source": "tkCanvas line -smooth", "values": ["0", "1"]},
}

# Tk options the draft does not name and no GML file in the corpus uses: listed, not swept.
TK_NOT_SWEPT = {
    "arrowshape": "Tk line option; no GML writer in the corpus writes it",
    "capstyle": "Tk line option; no GML writer in the corpus writes it",
    "joinstyle": "Tk line option; no GML writer in the corpus writes it",
    "splinesteps": "Tk line option; no GML writer in the corpus writes it",
    "dash": "Tk 8.3 option, later than the GML draft; no GML writer in the corpus writes it",
    "outlinestipple": "Tk option; no GML writer in the corpus writes it",
    "z": "the draft marks z 'Not yet implemented in Graphlet'; a 2D sheet cannot show it",
    "d": "the draft marks d 'Not yet implemented in Graphlet'; a 2D sheet cannot show it",
    "edgeAnchor": "the draft's node key 'how the edges are attached to the node' names no values; no GML writer in "
                  "the corpus writes it and no program here reads it",
}

# ---- yEd: the copy used when yed-vocabulary.json is absent (regenerated from it when present)
YED_FALLBACK = {
    "shapes": ["rectangle", "roundrectangle", "ellipse", "parallelogram", "hexagon", "octagon", "diamond", "triangle",
               "trapezoid", "trapezoid2", "rectangle3d", "fatarrow", "fatarrow2", "parallelogram2", "star5", "star6",
               "star8", "triangle2", "hexagon2", "octagon2"],
    "arrows": ["standard", "delta", "diamond", "white_diamond", "white_delta", "none", "plain", "concave", "convex",
               "circle", "dash", "transparent_circle", "skewed_dash", "t_shape", "cross", "crows_foot_many",
               "crows_foot_many_mandatory", "crows_foot_many_optional", "crows_foot_one", "crows_foot_one_mandatory",
               "crows_foot_one_optional", "crows_foot_optional", "short", "white_circle", "white_delta_bar"],
    "lineTypes": ["line", "dashed", "dotted", "dashed_dotted"],
    "nodeLabelPositions": {"internal": ["c", "t", "b", "l", "r", "tl", "tr", "bl", "br"], "sandwich": ["n", "s"],
                           "sides": ["n", "s", "e", "w"], "corners": ["nw", "ne", "sw", "se"],
                           "eight_pos": ["n", "ne", "e", "se", "s", "sw", "w", "nw"], "free": ["anywhere"]},
    "edgeLabelPositions": {"centered": ["center"], "two_pos": ["head", "tail"],
                           "three_center": ["scentr", "center", "tcentr"],
                           "six_pos": ["shead", "head", "thead", "stail", "tail", "ttail"],
                           "center_slider": ["center"], "side_slider": ["center"], "free": ["anywhere"]},
    "flowchart": [],
}
YED_STATIC = {
    # keys yEd writes that no yEd file in graph-io's corpus happens to use (seen in yEd-written GML elsewhere: arc
    # edges, label borders, hidden and underlined labels)
    "keysBeyondCorpus": ["edge.graphics.type", "edge.graphics.arcType", "edge.graphics.arcHeight",
                         "edge.graphics.arcRatio", "node.LabelGraphics.outline", "node.LabelGraphics.visible",
                         "node.LabelGraphics.underlinedText", "edge.LabelGraphics.fontStyle",
                         "edge.LabelGraphics.fill"],
    "fontStyles": ["plain", "bold", "italic", "bolditalic"],
    "alignments": ["left", "center", "right"],
    "autoSizePolicies": ["node_width", "node_height", "content", "none", "node_size"],
    "arcTypes": ["fixedHeight", "fixedRatio"],
}

# ---- Cytoscape 2.x numbered arrows, as Cytoscape 3.10.5's GML reader reads them (legacyArrowShapes)
CYTOSCAPE_ARROWS = {"0": "NONE", "1": "DELTA", "2": "DELTA", "3": "DELTA", "4": "ARROW", "5": "ARROW", "6": "ARROW",
                    "7": "DIAMOND", "8": "DIAMOND", "9": "DIAMOND", "10": "CIRCLE", "11": "CIRCLE", "12": "CIRCLE",
                    "13": "T", "14": "T", "15": "T", "16": "HALF_TOP", "17": "HALF_BOTTOM"}

# ---- Cytoscape's GML: what Cytoscape 2.x's writer wrote, with the shape names Cytoscape reads
CYTOSCAPE = {
    "shapes": ["ROUND_RECTANGLE", "HEXAGON", "PARALLELOGRAM", "OCTAGON", "TRIANGLE", "RECTANGLE", "VEE", "DIAMOND",
               "ELLIPSE"],
    "legacyShapes": ["rect", "round_rect", "rect_3d", "trapezoid", "trapezoid_2"],
    "nodeKeys": ["graphics.x", "graphics.y", "graphics.w", "graphics.h", "graphics.fill", "graphics.type",
                 "graphics.outline", "graphics.outline_width", "label"],
    "edgeKeys": ["graphics.width", "graphics.fill", "graphics.type", "graphics.source_arrow",
                 "graphics.target_arrow", "label"],
    "notSwept": {
        "graphics.Line": "Cytoscape 3.10.5's GML reader ignores it (layoutEdgeGraphicsLine is empty), so its drawing "
                         "cannot show bends; the GML draft sheets sweep Line",
        "lexicon names": "Cytoscape's GML reader resolves any other graphics key through its visual lexicon (vizmap "
                         "names such as nodeTransparency, and visual property ids), but no GML writer writes them",
    },
}

# ---- OGDF's GML, as GraphIO::writeGML writes it (2025.10)
OGDF = {
    "creator": "ogdf::GraphIO::writeGML",
    "shapes": ["Rect", "RoundedRect", "Ellipse", "Triangle", "Pentagon", "Hexagon", "Octagon", "Rhomb", "Trapeze",
               "Parallelogram", "InvTriangle", "InvTrapeze", "InvParallelogram", "Image"],
    "strokes": ["None", "Solid", "Dash", "Dot", "Dashdot", "Dashdotdot"],
    "patterns": ["None", "Solid", "Dense1", "Dense2", "Dense3", "Dense4", "Dense5", "Dense6", "Dense7", "Horizontal",
                 "Vertical", "Cross", "BackwardDiagonal", "ForwardDiagonal", "DiagonalCross"],
    "arrows": ["none", "last", "first", "both"],
    "nodeKeys": ["graphics.x", "graphics.y", "graphics.w", "graphics.h", "graphics.label.x", "graphics.label.y",
                 "graphics.fill", "graphics.fillbg", "graphics.outline", "graphics.pattern", "graphics.stipple",
                 "graphics.lineWidth", "graphics.type", "label"],
    "edgeKeys": ["graphics.arrow", "graphics.stipple", "graphics.lineWidth", "graphics.Line", "graphics.fill",
                 "label"],
    "clusterKeys": ["graphics.x", "graphics.y", "graphics.width", "graphics.height", "graphics.fill",
                    "graphics.fillbg", "graphics.pattern", "graphics.color", "graphics.lineWidth",
                    "graphics.stipple", "label", "vertex"],
    "notSwept": {
        "graphics.z": "OGDF writes z for 3D drawings; its SVG drawing is 2D",
        "color alpha": "GraphIO::writeGML writes colors as #RRGGBB, dropping alpha",
        "Image": "OGDF's GML keeps no image file (GML.h has no image key), so an Image node draws as its outline only",
    },
}

# ---- Gephi's GML, as its exporter writes it
GEPHI = {
    "source": "graph-io/test/corpus/styles/gml/TwelveYC_network-vi__metabolicpos.gml (Creator \"Gephi\"), and "
              "Gephi Toolkit 0.11.3's org.gephi.io.exporter.plugin.ExporterGML (printNode, printEdge; javap -c)",
    "nodeKeys": ["label", "graphics.x", "graphics.y", "graphics.z", "graphics.w", "graphics.h", "graphics.d",
                 "graphics.fill"],
    # printEdge: id, source, target, label, value (the weight), directed (an edge of a mixed graph only) and fill
    # (the edge's color, a key of the edge itself, not of a graphics record)
    "edgeKeys": ["id", "label", "value", "directed", "fill"],
}

# ---- what each oracle program's GML reader reads (from its code)
READERS = {
    "cytoscape-gml": {
        "source": "cytoscapeReader (layoutGraphics, getVisualProperties; key names resolved by VisualLexicon.lookup)",
        "node": ["label (the name and the drawn label)", "graphics.x", "graphics.y", "graphics.w", "graphics.h",
                 "graphics.type (a Cytoscape shape name, any case)", "graphics.fill", "graphics.outline",
                 "graphics.width", "graphics.outline_width"],
        "edge": ["graphics.fill", "graphics.width", "graphics.arrow (first / last / both / none)",
                 "graphics.sourceArrow / targetArrow (yEd names: none, delta, white_delta, diamond, white_diamond, "
                 "short, standard)", "graphics.source_arrow / target_arrow (Cytoscape 2.x numbers)"],
        "ignored": ["LabelGraphics", "graphics.Line (layoutEdgeGraphicsLine is empty)", "graphics.style",
                    "graphics.outlineStyle", "graphics.outlineWidth", "graphics.fill2", "graphics.hasFill",
                    "isGroup / gid", "edge label"],
    },
    "gml2gv": {
        "source": "gml2gv (gmlparse.y addNodeGraphics, addEdgeGraphics, addNodeLabelGraphics, addEdgeLabelGraphics)",
        "node": ["label", "graphics.x/y -> pos (y not flipped)", "graphics.w/h -> width/height (/72)",
                 "graphics.type -> shape", "graphics.fill -> color (the outline)", "graphics.outline -> pencolor",
                 "graphics.width / outlineWidth -> penwidth", "graphics.style / outlineStyle -> style",
                 "LabelGraphics.text -> label", "LabelGraphics.color -> fontcolor",
                 "LabelGraphics.fontSize -> fontsize", "LabelGraphics.fontName -> fontname"],
        "edge": ["label", "graphics.width -> penwidth", "graphics.style -> style", "graphics.fill -> color",
                 "graphics.Line -> pos", "LabelGraphics.text/color/fontSize/fontName", "LabelGraphics.x/y -> lp"],
        "syntax": "y, w and h must be reals and outlineWidth and fontSize integers, or gml2gv stops with a syntax "
                  "error; ids must be integers",
    },
    "ogdf": {
        "source": "OGDF 2025.10 GraphIO::readGML into ClusterGraphAttributes, drawn by GraphIO::drawSVG",
        "node": ["label", "graphics.x/y/w/h", "graphics.label.x/y (the label's offset)", "graphics.type (Shape)",
                 "graphics.fill", "graphics.fillbg", "graphics.pattern", "graphics.outline", "graphics.stipple",
                 "graphics.lineWidth"],
        "edge": ["label", "graphics.arrow", "graphics.stipple", "graphics.lineWidth", "graphics.fill",
                 "graphics.Line (the bends only, without the end points)"],
        "cluster": ["rootcluster / cluster / vertex", "label", "graphics.x/y/width/height", "graphics.fill",
                    "graphics.color", "graphics.lineWidth", "graphics.stipple", "graphics.pattern"],
    },
}

TOK = re.compile(r'"(?:[^"\\]|\\.)*"|\[|\]|[^\s\[\]"]+')


def parse(text):
    toks = TOK.findall(text)
    i = 0

    def lst():
        nonlocal i
        out = []
        while i < len(toks):
            t = toks[i]
            if t == "]":
                i += 1
                return out
            i += 1
            if i >= len(toks):
                break
            v = toks[i]
            i += 1
            out.append((t, lst() if v == "[" else v))
        return out

    return lst()


def yed_corpus_keys():
    """Every graphics / LabelGraphics key path in the yEd-written GML files of the corpus, with the files' count."""
    keys = {}
    files = 0
    for d, _, fs in sorted(os.walk(os.path.join(TEST, "corpus"))):
        for f in sorted(fs):
            if not (f.endswith(".gml") or f.endswith(".gml.gz")):
                continue
            p = os.path.join(d, f)
            raw = gzip.open(p).read() if p.endswith(".gz") else open(p, "rb").read()
            text = raw.decode("latin-1")
            if not re.search(r'Creator\s+"?(yFiles|yEd)', text):
                continue
            files += 1

            def walk(items, path):
                for k, v in items:
                    q = f"{path}.{k}" if path else k
                    q = re.sub(r"^graph\.(node|edge)", r"\1", q)
                    if isinstance(v, list):
                        walk(v, q)
                    elif re.search(r"\b(graphics|LabelGraphics)\b|^node\.(isGroup|gid)$", q):
                        keys[q] = keys.get(q, 0) + 1

            walk(parse(text), "")
    return files, dict(sorted(keys.items()))


def main():
    yv = os.path.join(HERE, "yed-vocabulary.json")
    old = json.load(open(OUT, encoding="ascii")) if os.path.exists(OUT) else None
    if os.path.exists(yv):
        y = json.load(open(yv, encoding="ascii"))["yed-graphml"]
        yed = {k: y[k] for k in ("shapes", "arrows", "lineTypes", "nodeLabelPositions", "edgeLabelPositions")}
        yed["flowchart"] = [c["id"] for c in y["genericConfigurations"] if c["id"].startswith("com.yworks.flowchart.")]
        yed["from"] = "yed-vocabulary.json"
    elif old is not None:
        yed = old["yed"]
    else:
        yed = {**YED_FALLBACK, "from": "the copy in gml_vocabulary.py"}
    yed.update(YED_STATIC)
    files, keys = yed_corpus_keys()
    yed["corpusKeys"] = {"files": files, "keys": keys}
    doc = {
        "about": "The GML style vocabulary the GML specimen sheets sweep, by source; written by gml_vocabulary.py. "
                 "gml.py fails when a value here is on no sheet and not listed as not swept.",
        "sources": SOURCES,
        "graphlet": GRAPHLET,
        "tkNotSwept": TK_NOT_SWEPT,
        "yed": yed,
        "cytoscape2Arrows": CYTOSCAPE_ARROWS,
        "cytoscape": CYTOSCAPE,
        "ogdf": OGDF,
        "gephi": GEPHI,
        "readers": READERS,
    }
    with open(OUT, "w", encoding="ascii") as f:
        json.dump(doc, f, indent=2, sort_keys=False)
        f.write("\n")
    print(f"gml-vocabulary.json: {files} yEd GML files, {len(keys)} key paths")


if __name__ == "__main__":
    main()
