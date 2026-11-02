# Style fidelity samples

One real styled file per format (two for Cytoscape.js JSON), each with reference scenes from the
program that wrote it or from an independent reading of it. Each is a typical file of its format:
what people make and share in that tool, a readable network of tens to a few hundred nodes with
its own colors, sizes, labels and edge styles, not a test case or a stress graph. `samples.ts` is the same list for the
tests. A scene is `scenes/<sample>/<route>.ref.json`; `regenerate.sh` rebuilds them, and `routes.ts`
holds each route's deficiency ledger (what it cannot carry, and why). Beyond these, `corpus-samples.ts` lists the
style fidelity corpus, scored in bulk against per-property floors: each file's source and license is in the SOURCES.md
of its directory under `corpus/styles/`, and the seeded scripts that wrote its generated files are in `generators/`.

Beside these real files, every format has specimen sheets: small synthetic files that set one style setting per
element, drawn by the format's own program, so each setting is judged on its own (`specimens/README.md`). Their
oracles sit in `oracles/` with the samples' and are judged by the same oracle report.

A sample that names a picture by a URL on the internet is drawn without the network: graphty-element's fidelity
harness answers the URL from a copy in `pictures/` (`SAMPLE_PICTURES` in `graphty-element/vitest.config.ts`).
`pictures/cytoscape-logo.png` is the cytoscape.js logo (MIT), which the Cytoscape samples' custom graphics and image
annotations name. Any other request to the internet is refused, and the sample fails naming the URL: a picture a
sample starts to load is committed here (with its license) and mapped, or its node is recorded as a known failure.

Other samples name pictures on the internet that graphty never loads, so none is copied here:

- `cx-ddram`: `idekerlab.ucsd.edu/ddram/ddram_legend.png`, inside the network's HTML `description`, which is not
  drawn. The legend states no license of its own (the network is CC BY-NC-ND 4.0).
- `xgmml-networkportal-nsoxphos`: the `baliga.systemsbiology.net` cluster pictures, a plain `imgURL` column no style
  maps to a picture. They answer 404 today.
- `gexf-miserables`: two Wikimedia Commons illustrations (public domain), a plain `image` column no style maps.
- `gexf-specimen-images-charts`: `graphty.app/favicon.png`, an `image` shape's uri, drawn as the node's disc as
  Gephi draws it (no picture). It answers 404 today.

Where a route matches elements by something other than the file's own id, the comparer maps it:

- `cytoscape-desktop`, `cytoscape-gml`, `cyjs-hop`: the node `name` column. For XGMML and CX that is
  the file's own name; for GML it is the node's `label`. Edge ids are `<source>-><target>`, `#k` for
  the k-th parallel edge.
- `drawio`: the GraphML id draw.io keeps as `graphMlID`.
- `gephi-noscale`, `sigma`, `yed-file`, `pajek-file`, `graphviz-*`: the file's ids; edges without an
  id in the file are `<source>-><target>`.

| Sample                   | File (under `graph-io/test/`)                                            | License   | Routes, best first                    |
| ------------------------ | ------------------------------------------------------------------------ | --------- | ------------------------------------- |
| `dot-profile`            | `corpus/styles/dot/graphviz-gallery-directed-profile.gv`                 | EPL-2.0   | `graphviz-json`                       |
| `gexf-miserables`        | `corpus/styles/gexf/gexfjs-miserables.gexf`                              | MIT       | `gephi-noscale`, `sigma`              |
| `graphml-yed-voctomix`   | `corpus/styles/graphml/yed-shapenode/voc__voctomix__schema.graphml`      | MIT       | `yed-file`, `drawio`                  |
| `gml-yed-pmodel`         | `corpus/styles/gml/ImperialCollegeLondon_pyrealm__pmodel.gml`            | MIT       | `yed-file`, `cytoscape-gml`, `gml2gv` |
| `pajek-iliad`            | `corpus/styles/pajek/kjhealy_kjhnet__iliad_killedby.net`                 | MIT       | `pajek-file`                          |
| `xgmml-basicdataviz`     | `corpus/styles/xgmml/BasicDataVizDemo.xgmml.gz`                          | CC0-1.0   | `cytoscape-desktop`, `cyjs-hop`       |
| `cx-ndex-90f78bcd`       | `corpus/styles/cx/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx`          | CC-BY-4.0 | `cytoscape-desktop`, `cyjs-hop`       |
| `cx2-ndex-90f78bcd`      | `corpus/styles/cx2/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx2`        | CC-BY-4.0 | `cytoscape-desktop`, `cyjs-hop`       |
| `cys-annotation-example` | `corpus/styles/cys/cytoscape-tutorials-AnnotationExample.cys`            | CC0-1.0   | `cytoscape-desktop`, `cyjs-hop`       |
| `cyjs-genemania`         | `fidelity/samples/cyjs-genemania.json`                                   | MIT       | `cyjs-computed`                       |
| `cyjs-glycolysis`        | `corpus/styles/json/iVis-at-Bilkent_cytoscape.js-cosep__glycolysis.json` | MIT       | `cyjs-computed`                       |

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

**yEd GML, `gml-yed-pmodel`.** The P Model's data flow from the pyrealm documentation, drawn in yEd
2.17 with its flowchart palette. The file's own geometry through networkx: 34 data parallelograms
and 2 process boxes in two fills, with labels inside, 57 edges with arrowheads, 19 of them routed
through bends and drawn smooth, the rest straight. Cytoscape's GML reader agrees on every position,
size and fill, and shows its ledger's losses: every node a round rectangle (it ignores yEd's
flowchart shapes), the bends dropped, its own default border and edge widths. gml2gv mirrors y,
grows nodes to fit labels, writes fills as outlines and draws every edge with an arrowhead.

**Pajek, `pajek-iliad`.** Who killed whom in the Iliad (Rossman 2017, "Glory and Gore"), as shared
in Pajek's format: 311 named warriors, Greeks blue and Trojans red, 292 arcs from each slain warrior to the one who killed him.
Like most Pajek files people share, it stores no coordinates: Pajek lays the network out when it
draws, so position is a gap and only what the file states is judged (fills, labels, arrows). The
reference is the file's own keys; Pajek itself did not run (no Wine).

**XGMML, CX, CX2, sessions.** Cytoscape desktop's resolved visual properties per node and edge.
CX and CX2 are the same network, and Cytoscape draws them identically. The session reference
carries its 6 annotations. CyREST reports no drawn edge path, so a desktop edge runs center to
center, clipped at each node's ellipse or box (within about 20 units of what Cytoscape.js draws).
`cyjs-hop` draws desktop's Cytoscape.js export with Cytoscape.js: it agrees with desktop on every
node of the XGMML and CX files, and on the session it shows its ledger's losses (every size a flat
50, font sizes not carried).

**Cytoscape.js, `cyjs-genemania` and `cyjs-glycolysis`.** Cytoscape.js itself draws the document.
`cyjs-genemania` is the GeneMANIA demo of Cytoscape.js (`documentation/demos/genemania-export`,
MIT), written as one document: the demo's `data.json` elements at their stored positions with the
stylesheet its `code.js` builds, as JSON (its concentric layout left out). 31 genes sized by score,
the query genes darker, labels inside, 255 haystack edges colored by interaction type at a third
opacity, their width mapped from weight. `cyjs-glycolysis` is a saved `cy.json()` from the
cytoscape.js-cosep demo: 44 SBGN glyphs at stored positions, white boxes, rounded boxes and
ellipses by class, blue edges ending in triangles or circles.
