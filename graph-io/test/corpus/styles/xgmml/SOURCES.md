# XGMML style corpus

Real styled files whose stated license allows redistribution, and inputs generated for this project, read by
graph-io's style tests (`test/styles/harness.test.ts`). The license is the one the source states: the GitHub
repository's license, an NDEx network's `rights` property, or the project's own license text. A file over 256 KB
is stored gzip-compressed (`.gz`); the tests read it decompressed, under its name without `.gz`.
Files under `generated/` were written for this project by seeded scripts, MIT like the package.

| File | Source | License | What it is |
| --- | --- | --- | --- |
| `BasicDataVizDemo.xgmml.gz` | https://github.com/cytoscape/cytoscape-tutorials/blob/gh-pages/protocols/data/BasicDataVizDemo.xgmml | CC0-1.0 |  |
| `generated/graphics-mix.xgmml` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `parklab_NGSCheckMate__luad.out.xgmml` | https://raw.githubusercontent.com/parklab/NGSCheckMate/ef7a38c51dadbd4ef5b6b6db60775f239926f0a8/graph/luad.out.xgmml | MIT | GitHub parklab/NGSCheckMate graph/luad.out.xgmml |
| `sample_yeast_network.xgmml.gz` | https://github.com/cytoscape/cytoscape-automation/blob/master/for-scripters/Python/data/sample_yeast_network.xgmml | CC0-1.0 |  |
| `String_Network-breast_cancer.xgmml.gz` | https://github.com/cytoscape/cytoscape-tutorials/blob/gh-pages/protocols/data/String%20Network%20-%20breast%20cancer.xgmml | CC0-1.0 |  |
| `STRING-BreastCancer_expr.xgmml.gz` | https://github.com/cytoscape/cytoscape-tutorials/blob/gh-pages/protocols/data/STRING-BreastCancer_expr.xgmml | CC0-1.0 |  |
| `generated/graphty-written.xgmml.gz` | Written by graph-io from `parklab_NGSCheckMate__luad.out.xgmml` (in the XGMML corpus), then edited by the helpers in `test/styles/formats/cytoscape-xml.ts` | MIT (derived from an MIT file) | the network written by graph-io's XGMML writer with its styles, and its `graphty.styles` block |
| `generated/graphty-written-native-edit.xgmml.gz` | Written by graph-io from `parklab_NGSCheckMate__luad.out.xgmml` (in the XGMML corpus), then edited by the helpers in `test/styles/formats/cytoscape-xml.ts` | MIT (derived from an MIT file) | the same file with one node's fill changed in its `<graphics>`, as another program would edit it |
| `generated/graphty-written-block-truncated.xgmml.gz` | Written by graph-io from `parklab_NGSCheckMate__luad.out.xgmml` (in the XGMML corpus), then edited by the helpers in `test/styles/formats/cytoscape-xml.ts` | MIT (derived from an MIT file) | the same file with its `graphty.styles` block cut in half |
| `generated/graphty-written-block-other-graph.xgmml.gz` | Written by graph-io from `parklab_NGSCheckMate__luad.out.xgmml` (in the XGMML corpus), then edited by the helpers in `test/styles/formats/cytoscape-xml.ts` | MIT (derived from an MIT file) | the same file with a block that describes a graph of one node fewer |
