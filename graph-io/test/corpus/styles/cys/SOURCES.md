# Cytoscape session (.cys) style corpus

Real styled files whose stated license allows redistribution, and inputs generated for this project, read by
graph-io's style tests (`test/styles/harness.test.ts`). The license is the one the source states: the GitHub
repository's license, an NDEx network's `rights` property, or the project's own license text. A file over 256 KB
is stored gzip-compressed (`.gz`); the tests read it decompressed, under its name without `.gz`.
Files under `generated/` were written for this project by seeded scripts, MIT like the package.

| File | Source | License | What it is |
| --- | --- | --- | --- |
| `BasicDataVizDemo.cys` | https://github.com/cytoscape/cytoscape-tutorials/blob/gh-pages/protocols/data/BasicDataVizDemo.cys | CC0-1.0 |  |
| `cytoscape-tutorials-AnnotationExample.cys` | https://raw.githubusercontent.com/cytoscape/cytoscape-tutorials/gh-pages/presentations/modules/advanced-visualization/AnnotationExample.cys | CC0-1.0 | Cytoscape session, GitHub cytoscape/cytoscape-tutorials presentations/modules/advanced-visualization/AnnotationExample.cys |
| `cytoscape-tutorials-layout-v1.cys` | https://raw.githubusercontent.com/cytoscape/cytoscape-tutorials/gh-pages/presentations/modules/network-visualization-light/layout-v1.cys | CC0-1.0 | Cytoscape session, GitHub cytoscape/cytoscape-tutorials presentations/modules/network-visualization-light/layout-v1.cys |
| `STELZL.cys` | https://github.com/cytoscape/cytoscape-tutorials/blob/gh-pages/protocols/data/STELZL.cys | CC0-1.0 |  |
| `generated/graphty-written.cys` | Written by graph-io from `parklab_NGSCheckMate__luad.out.xgmml` (in the XGMML corpus), then edited by the helpers in `test/styles/formats/cytoscape-xml.ts` | MIT (derived from an MIT file) | the network written by graph-io's session writer with its styles: a named style, view bypasses and the `graphty.styles` entry |
| `generated/graphty-written-native-edit.cys` | Written by graph-io from `parklab_NGSCheckMate__luad.out.xgmml` (in the XGMML corpus), then edited by the helpers in `test/styles/formats/cytoscape-xml.ts` | MIT (derived from an MIT file) | the same session with one node's fill locked (a bypass) in its view, as an edit in Cytoscape would |
| `generated/graphty-written-block-truncated.cys` | Written by graph-io from `parklab_NGSCheckMate__luad.out.xgmml` (in the XGMML corpus), then edited by the helpers in `test/styles/formats/cytoscape-xml.ts` | MIT (derived from an MIT file) | the same session with its `graphty.styles` entry cut in half |
| `generated/graphty-written-block-other-graph.cys` | Written by graph-io from `parklab_NGSCheckMate__luad.out.xgmml` (in the XGMML corpus), then edited by the helpers in `test/styles/formats/cytoscape-xml.ts` | MIT (derived from an MIT file) | the same session with a block that describes a graph of one node fewer |

## Style fidelity fixtures

Files scored against the drawing of the program that wrote them (`graph-io/test/fidelity/corpus-samples.ts`, reference
scenes in `graph-io/test/fidelity/scenes/<sample id>/`). Generated files were written by the seeded scripts in
`graph-io/test/fidelity/generators/`, MIT like the package.

| File | Source | License | What it is |
| --- | --- | --- | --- |
| `fidelity/import-and-save.cys` | Cytoscape 3.10.5 distribution, sampleData/sessions/Import & Save.cys | LGPL-2.1 (Cytoscape distribution) | two views: DrugBank carrier-target network (300 nodes) and a 30-node melanoma pathway; drug/target styles |
| `fidelity/galfiltered.cys` | Cytoscape 3.10.5 distribution, sampleData/galFiltered.cys | LGPL-2.1 (Cytoscape distribution) | yeast galactose network (Cytoscape sample session) |
| `fidelity/affinity-purification.cys` | Cytoscape 3.10.5 distribution, sampleData/sessions/Affinity Purification.cys | LGPL-2.1 (Cytoscape distribution) | AP-MS network with bait/prey styles |
| `fidelity/luad-vest-v2.cys` | https://github.com/cytoscape/cytoscape-impl/blob/develop/layout-cytoscape-impl/src/test/resources/circular-layout-tests/LUAD_vest_v2.cys | LGPL-2.1 | 2013 Cytoscape 3.0 session, 10 views (lung adenocarcinoma clusters, 163 nodes largest) |
| `fidelity/syn-mappings.cys` | built in Cytoscape 3.10.5 by generators/build-synthetic.mjs over CyREST, saved by Cytoscape | MIT (generated for this project) | 96 nodes/140 edges; every feature through the style: defaults, discrete/continuous/passthrough mappings over all 9 shapes, 8 border strokes, 16 line types, 22 arrow shapes, 7 label positions, 5 fonts, label rotation/width/background/opacity, z-order, tooltips, separate arrow colors, background |
| `fidelity/syn-bypass.cys` | built in Cytoscape 3.10.5 by generators/build-synthetic.mjs over CyREST, saved by Cytoscape | MIT (generated for this project) | 64 nodes/90 edges; every feature per element (bypasses): fills, shapes, w!=h sizes, borders, opacity, labels, rotation, z, hidden nodes/edges, pie/bar/ring charts, linear/radial gradients, image custom graphics, edge bends, curved=false, edge labels, 3 groups (1 collapsed), 6 annotations |

Cytoscape's `Yeast Perturbation.cys` sample session (Cytoscape 3.10.5 distribution, sampleData/sessions) is byte for byte
`fidelity/galfiltered.cys`, so it is committed once, as that file.

## Not committed

These licensed files are over 2 MB, so they are not committed; `graph-io/scripts/styles-corpus.mjs` reads them from a local
copy when one is present.

| File | Source | License | What it is |
| --- | --- | --- | --- |
| `GBM-TP-all.cys` | https://github.com/cytoscape/cytoscape-tutorials/blob/gh-pages/protocols/data/GBM-TP-all.cys | CC0-1.0 |  |
| `example_session.cys` | https://github.com/cytoscape/cytoscape-automation/blob/master/for-scripters/R/notebooks/bioc2018_Rcy3_intro/230_Isserlin_RCy3_intro/data/example_session.cys | CC0-1.0 |  |
| `cytoscape-tutorials-PSPG_Homework.cys` | https://raw.githubusercontent.com/cytoscape/cytoscape-tutorials/gh-pages/presentations/data/PSPG_Homework.cys | CC0-1.0 | Cytoscape session, GitHub cytoscape/cytoscape-tutorials presentations/data/PSPG_Homework.cys |
| `cytoscape-tutorials-cluster2-2.cys` | https://raw.githubusercontent.com/cytoscape/cytoscape-tutorials/gh-pages/protocols/scnetviz-single-cell-rnaseq-analysis/cluster2-2.png.cys | CC0-1.0 | Cytoscape session, GitHub cytoscape/cytoscape-tutorials protocols/scnetviz-single-cell-rnaseq-analysis/cluster2-2.png.cys |
| `cytoscape-automation-RCy3_demo_Session_file.cys` | https://raw.githubusercontent.com/cytoscape/cytoscape-automation/master/for-scripters/R/notebooks/bioc2018_Rcy3_intro/230_Isserlin_RCy3_intro/data/RCy3_demo_Session_file.cys | CC0-1.0 | Cytoscape session, GitHub cytoscape/cytoscape-automation for-scripters/R/notebooks/bioc2018_Rcy3_intro/230_Isserlin_RCy3_intro/data/RCy3_demo_Session_file.cys |
