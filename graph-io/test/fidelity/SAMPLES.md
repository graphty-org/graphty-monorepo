# Style fidelity samples

One real styled file per format (two for Cytoscape.js JSON), each with reference scenes from the
program that wrote it or from an independent reading of it. `samples.ts` is the same list for the
tests. A scene is `scenes/<sample>/<route>.ref.json`; `regenerate.sh` rebuilds them, and `routes.ts`
holds each route's deficiency ledger (what it cannot carry, and why).

Where a route matches elements by something other than the file's own id, the comparer maps it:

- `cytoscape-desktop`, `cytoscape-gml`, `cyjs-hop`: the node `name` column. For XGMML and CX that is
  the file's own name; for GML it is the node's `label`. Edge ids are `<source>-><target>`, `#k` for
  the k-th parallel edge.
- `drawio`: the GraphML id draw.io keeps as `graphMlID`.
- `gephi-noscale`, `sigma`, `yed-file`, `pajek-file`, `graphviz-*`: the file's ids; edges without an
  id in the file are `<source>-><target>`.

| Sample                   | File (under `graph-io/test/`)                                           | License                        | Routes, best first                    |
| ------------------------ | ----------------------------------------------------------------------- | ------------------------------ | ------------------------------------- |
| `dot-profile`            | `corpus/styles/dot/graphviz-gallery-directed-profile.gv`                | EPL-2.0                        | `graphviz-json`                       |
| `gexf-miserables`        | `corpus/styles/gexf/gexfjs-miserables.gexf`                             | MIT                            | `gephi-noscale`, `sigma`              |
| `graphml-yed-voctomix`   | `corpus/styles/graphml/yed-shapenode/voc__voctomix__schema.graphml`     | MIT                            | `yed-file`, `drawio`                  |
| `gml-yed-need4stacks`    | `corpus/styles/gml/spupyrev_bob__need4stacks261.gml`                    | MIT                            | `yed-file`, `cytoscape-gml`, `gml2gv` |
| `pajek-b`                | `corpus/styles/pajek/graphstream_gs-core__B.net`                        | LGPL-3.0-or-later OR CECILL-C  | `pajek-file`, `graphviz-n2`           |
| `xgmml-basicdataviz`     | `corpus/styles/xgmml/BasicDataVizDemo.xgmml.gz`                         | CC0-1.0                        | `cytoscape-desktop`, `cyjs-hop`       |
| `cx-ndex-90f78bcd`       | `corpus/styles/cx/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx`         | CC-BY-4.0                      | `cytoscape-desktop`, `cyjs-hop`       |
| `cx2-ndex-90f78bcd`      | `corpus/styles/cx2/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx2`       | CC-BY-4.0                      | `cytoscape-desktop`, `cyjs-hop`       |
| `cys-annotation-example` | `corpus/styles/cys/cytoscape-tutorials-AnnotationExample.cys`           | CC0-1.0                        | `cytoscape-desktop`, `cyjs-hop`       |
| `cyjs-scsweb`            | `corpus/styles/json/scsweb2020_graph-maker__aggregate-cy-graph.json.gz` | MIT                            | `cyjs-computed`                       |
| `cyjs-handmade`          | `fidelity/samples/cyjs-handmade.json`                                   | MIT (written for this project) | `cyjs-computed`                       |

## What each sample's references can judge

**DOT, `dot-profile`.** Graphviz's own layout (the file stores no positions), so positions are judged
against Graphviz's drawing. 61 filled ellipses in 14 colors with labels inside, 85 colored edges with
arrowheads. Nothing on this sample is known lost.

**GEXF, `gexf-miserables`.** Gephi's preview with the file's own coordinates. Gephi draws every node
as a circle, ignores alpha, colors each edge from its endpoints (the file has no edge colors) and
curves edges by default, and its label overlap avoidance hides 5 labels. sigma's reader gives the
file's own edge colors: none, so sigma's default.

**yEd GraphML, `graphml-yed-voctomix`.** yEd stores the drawing it made, so the file is the
reference: 39 nodes, 4 group boxes, 48 edges with bends, dashes and arrows. draw.io's GraphML codec,
read independently, agrees with it on every node, edge and group of this file (position, size,
shape, fill, border, labels, edge ends and bends).

**yEd GML, `gml-yed-need4stacks`.** The file's own geometry through networkx: 261 ellipses in 4
fills and 2 sizes, 777 edges, 13 with bends. Cytoscape's GML reader agrees on every position, size,
fill and shape, and shows exactly its ledger's losses: border width 0 where yEd draws 1, implicit
edge width 2.0 where yEd draws 1. gml2gv mirrors y, grows nodes to fit labels, writes fills as
outlines and turns `directed 1` into arrowheads on every edge.

**Pajek, `pajek-b`.** The file's own keys: 111 vertices at stored coordinates in three shapes, size
factors, label sizes, border widths, 193 arcs. Pajek itself did not run (no Wine). 98 vertices use
Pajek color names with no published RGB (LightCyan, LightGreen, ...), so their fill is a gap; Pajek's
base vertex size, label offsets and default font size are viewer settings, so size is a ratio and
label position is a gap. `graphviz-n2` pins the same positions in Graphviz for geometry only.

**XGMML, CX, CX2, sessions.** Cytoscape desktop's resolved visual properties per node and edge.
CX and CX2 are the same network, and Cytoscape draws them identically. The session reference
carries its 6 annotations. CyREST reports no drawn edge path, so a desktop edge runs center to
center, clipped at each node's ellipse or box (within about 20 units of what Cytoscape.js draws).
`cyjs-hop` draws desktop's Cytoscape.js export with Cytoscape.js: it agrees with desktop on every
node of the XGMML and CX files, and on the session it shows its ledger's losses (every size a flat
50, font sizes not carried).

**Cytoscape.js, `cyjs-scsweb` and `cyjs-handmade`.** Cytoscape.js itself draws the document. The
scsweb file was saved from a running graph, so its node width, height and font size are the string
`"fn"` and Cytoscape.js falls back to its defaults; graphty-element sees the same input. The
hand-made document is the one the File Styles story uses; it stores no positions, so position is a
gap (Cytoscape.js lays it out on a grid). Edges with no `curve-style` are Cytoscape.js's default
haystack, drawn center to center.
