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
