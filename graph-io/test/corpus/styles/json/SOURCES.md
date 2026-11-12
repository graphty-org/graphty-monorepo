# JSON (Cytoscape.js, graphology, sigma.js, vis-network) style corpus

Real styled files whose stated license allows redistribution, and inputs generated for this project, read by
graph-io's style tests (`test/styles/harness.test.ts`). The license is the one the source states: the GitHub
repository's license, an NDEx network's `rights` property, or the project's own license text. A file over 256 KB
is stored gzip-compressed (`.gz`); the tests read it decompressed, under its name without `.gz`.
Files under `generated/` were written for this project by seeded scripts, MIT like the package.

| File | Source | License | What it is |
| --- | --- | --- | --- |
| `cydesktop-em-style.json` | https://github.com/cytoscape/cytoscape.js/blob/HEAD/debug/webgl/network-em-desktop-style.json | MIT (Cytoscape desktop style export) |  |
| `cydesktop-white-matter-style.json` | https://github.com/cytoscape/cytoscape.js/blob/HEAD/debug/webgl/network-white-matter-style.json | MIT |  |
| `cyjs-colajs-cy-style.json` | https://github.com/cytoscape/cytoscape.js/tree/HEAD/documentation/demos/colajs-graph | MIT |  |
| `cyjs-colajs-data.json` | https://github.com/cytoscape/cytoscape.js/tree/HEAD/documentation/demos/colajs-graph | MIT |  |
| `cyjs-cose-bilkent-compound.json` | https://github.com/cytoscape/cytoscape.js/blob/HEAD/documentation/demos/cose-bilkent-layout-compound/data.json | MIT |  |
| `cyjs-edge-arrows-cy-style.json` | https://github.com/cytoscape/cytoscape.js/tree/HEAD/documentation/demos/edge-arrows | MIT |  |
| `cyjs-edge-arrows-data.json` | https://github.com/cytoscape/cytoscape.js/tree/HEAD/documentation/demos/edge-arrows | MIT |  |
| `cyjs-enrichment-map.networks.json.gz` | https://github.com/cytoscape/cytoscape.js/blob/HEAD/documentation/demos/gpu/enrichment-map.networks.json | MIT |  |
| `cyjs-genemania-export.json` | https://github.com/cytoscape/cytoscape.js/tree/HEAD/documentation/demos/genemania-export | MIT |  |
| `cyjs-node-types-cy-style.json` | https://github.com/cytoscape/cytoscape.js/tree/HEAD/documentation/demos/node-types | MIT |  |
| `cyjs-node-types-data.json` | https://github.com/cytoscape/cytoscape.js/tree/HEAD/documentation/demos/node-types | MIT |  |
| `cyjs-tokyo-railways.cycss` | https://github.com/cytoscape/cytoscape.js/tree/HEAD/documentation/demos/tokyo-railways | MIT (cytoscape.js) |  |
| `cyjs-tokyo-railways.json.gz` | https://github.com/cytoscape/cytoscape.js/tree/HEAD/documentation/demos/tokyo-railways | MIT (cytoscape.js) |  |
| `generated/cytoscape-graphty-written.json` | Generated for this project by `test/formats/json/styles.test.ts` (`UPDATE_JSON_TAMPER=1`) | MIT (generated for this project) | Cytoscape.js: written by graph-io's JSON exporter with styles (the block tamper fixtures' base) |
| `generated/cytoscape-tamper-block-truncated.json` | Generated for this project by `test/formats/json/styles.test.ts` (`UPDATE_JSON_TAMPER=1`) | MIT (generated for this project) | Cytoscape.js: the written file with its graphty.styles block cut in half |
| `generated/cytoscape-tamper-native-edited.json` | Generated for this project by `test/formats/json/styles.test.ts` (`UPDATE_JSON_TAMPER=1`) | MIT (generated for this project) | Cytoscape.js: the written file with one node's fill changed in its native style key |
| `generated/cytoscape-tamper-node-added.json` | Generated for this project by `test/formats/json/styles.test.ts` (`UPDATE_JSON_TAMPER=1`) | MIT (generated for this project) | Cytoscape.js: the written file with one node added, so the block describes another graph |
| `generated/graphology-graphty-written.json` | Generated for this project by `test/formats/json/styles.test.ts` (`UPDATE_JSON_TAMPER=1`) | MIT (generated for this project) | graphology: written by graph-io's JSON exporter with styles (the block tamper fixtures' base) |
| `generated/graphology-tamper-block-truncated.json` | Generated for this project by `test/formats/json/styles.test.ts` (`UPDATE_JSON_TAMPER=1`) | MIT (generated for this project) | graphology: the written file with its graphty.styles block cut in half |
| `generated/graphology-tamper-native-edited.json` | Generated for this project by `test/formats/json/styles.test.ts` (`UPDATE_JSON_TAMPER=1`) | MIT (generated for this project) | graphology: the written file with one node's fill changed in its native style key |
| `generated/graphology-tamper-node-added.json` | Generated for this project by `test/formats/json/styles.test.ts` (`UPDATE_JSON_TAMPER=1`) | MIT (generated for this project) | graphology: the written file with one node added, so the block describes another graph |
| `graphology-arctic.json.gz` | https://github.com/graphology/graphology/blob/HEAD/src/communities-leiden/test/resources/arctic.json | MIT (graphology) |  |
| `graphology-eurosis.json.gz` | https://github.com/graphology/graphology/blob/HEAD/src/communities-louvain/test/datasets/eurosis.json | MIT (graphology) |  |
| `iVis-at-Bilkent_cytoscape.js-cosep__glycolysis.json` | https://raw.githubusercontent.com/iVis-at-Bilkent/cytoscape.js-cosep/b63d726360cfb011edd300fe86272dc128c9e6af/demo/samples/glycolysis.json | MIT | GitHub iVis-at-Bilkent/cytoscape.js-cosep demo/samples/glycolysis.json |
| `sciluna_cytoscape.js-sbgn-layout__9613829.json` | https://raw.githubusercontent.com/sciluna/cytoscape.js-sbgn-layout/5ac0d49f7d7e36841668303265dcf345a4752855/demo/examples/9613829.json | CC0-1.0 | GitHub sciluna/cytoscape.js-sbgn-layout demo/examples/9613829.json |
| `scsweb2020_graph-maker__aggregate-cy-graph.json.gz` | https://raw.githubusercontent.com/scsweb2020/graph-maker/f8a2396f9ca0385f5eec5b5777f1527537b4e31d/public/viz-prototypes/data/aggregate-cy-graph.json | MIT | GitHub scsweb2020/graph-maker public/viz-prototypes/data/aggregate-cy-graph.json |
| `sigma-website-airports.json.gz` | https://raw.githubusercontent.com/jacomyal/sigma.js/main/packages/website/public/data/airports.json | MIT (sigma.js) | sigma.js website demo data |
| `sigma-website-euroSIS.json.gz` | https://raw.githubusercontent.com/jacomyal/sigma.js/main/packages/website/public/data/euroSIS.json | MIT (sigma.js) | sigma.js website demo data |
| `sigma-website-wikipedia.json.gz` | https://raw.githubusercontent.com/jacomyal/sigma.js/main/packages/website/public/data/wikipedia.json | MIT (sigma.js) | sigma.js website demo data |
| `vis-dot-to-graph-softmaint.json` | https://github.com/visjs/vis-network/blob/HEAD/test/dot-parser/data/softmaint.dot-to-graph.json | Apache-2.0 / MIT |  |
| `vis-WorldCup2014.json.gz` | https://github.com/visjs/vis-network/blob/HEAD/examples/network/datasources/WorldCup2014.json | Apache-2.0 / MIT (vis-network) |  |

## Style fidelity fixtures

Files scored against the drawing of the program that wrote them (`graph-io/test/fidelity/corpus-samples.ts`, reference
scenes in `graph-io/test/fidelity/scenes/<sample id>/`). Generated files were written by the seeded scripts in
`graph-io/test/fidelity/generators/`, MIT like the package.

On 2026-10-16 the owner chose to commit every file of the style fidelity corpus regardless of its license, so some files below state no license, or one that does not allow redistribution; each row gives the license its source states, or "none stated".

| File | Source | License | What it is |
| --- | --- | --- | --- |
| `fidelity/cyjs-winecheese.json.gz` | https://github.com/cytoscape/wineandcheesemap (src/client/cy-conf/elements.js, style.js) | MIT | Wine and cheese map app: Cytoscape desktop positions, CSS-text stylesheet |
| `fidelity/cyjs-tokyo.json.gz` | https://github.com/cytoscape/cytoscape.js/tree/HEAD/documentation/demos/tokyo-railways | MIT | Cytoscape desktop export + .cycss text |
| `fidelity/cyjs-graphmaker.json` | https://raw.githubusercontent.com/scsweb2020/graph-maker/f8a2396f9ca0385f5eec5b5777f1527537b4e31d/public/viz-prototypes/data/aggregate-cy-graph.json | MIT | third-party app's saved cy.json(): classes, dashed edges, arrows, 'fn' sizes |
| `fidelity/cyjs-synth-nodes.json` | generated by generators/json_gen_synthetic.py (seeded) | MIT (generated) | every Cytoscape.js node feature: 31 shapes, borders, color syntaxes, opacity, 9 label positions, fonts, outline, text background, wrap, rotation, margins, visibility/display, z-index, image, gradients, pie, ghost, underlay, data()/mapData(), attribute selectors, bypass, em units, :selected |
| `fidelity/cyjs-synth-edges.json` | generated by generators/json_gen_synthetic.py (seeded) | MIT (generated) | every Cytoscape.js edge and compound feature as a CSS-text stylesheet: 9 curve styles with control/segment/taxi params, 11 arrow shapes per end, hollow/mid/scaled arrows, dash patterns, opacity vs line-opacity, gradient, labels (plain, autorotate+background, source/target labels, margin+outline), hidden/none, z-index, mapData width/color, loops, 4 parallel edges, nested compound parents (no parent positions) |
| `fidelity/cyjs-synth-edges-saved.json` | generated by generators/json_saved_parents.mjs from cyjs-synth-edges.json | MIT (generated) | cyjs-synth-edges with each compound parent's position as cy.json() saves it (Cytoscape.js's own drawn center) |
| `fidelity/sigma-lesmis.json` | https://github.com/jacomyal/sigma.js/blob/main/packages/website/src/examples/_data/data.json | MIT | graphology serialization with x, y, size, color, label (sigma.js examples) |
| `fidelity/graphology-synth.json` | generated by generators/json_gen_synthetic.py (seeded) | MIT (generated) | graphology/sigma keys: x, y, size, color (hex, rgb, rgba, names, #rrggbbaa), label (incl. null), hidden, forceLabel, zIndex, node type image; edges color, size, label, hidden, type line/arrow/curvedArrow/curve, mixed directed/undirected |
| `fidelity/vis-unix.json` | https://github.com/visjs/vis-network/blob/master/test/dot-parser/data/unix.dot-to-graph.json | Apache-2.0 / MIT | DOT unix gallery through vis-network's DOTToGraph |
| `fidelity/vis-siblings.json` | https://github.com/visjs/vis-network/blob/master/test/dot-parser/data/siblings.dot-to-graph.json | Apache-2.0 / MIT | DOT siblings through DOTToGraph: 200 nodes, fonts, colors, sizes as text |
| `fidelity/vis-transparency.json` | https://github.com/visjs/vis-network/blob/master/test/dot-parser/data/transparency.dot-to-graph.json | Apache-2.0 / MIT | DOT transparency through DOTToGraph: #rrggbbaa colors |
| `fidelity/vis-world.json` | https://github.com/visjs/vis-network/blob/master/test/dot-parser/data/world.dot-to-graph.json | Apache-2.0 / MIT | DOT world through DOTToGraph: few styles, mostly defaults |
| `fidelity/vis-lesmiserables.json` | https://github.com/visjs/vis-network/blob/master/examples/network/exampleApplications/lesMiserables.html | Apache-2.0 / MIT | vis example: groups with vis's default palette, dot shape; data and options as the page hands them to new vis.Network |
| `fidelity/vis-synth.json` | generated by generators/json_gen_synthetic.py (seeded) | MIT (generated) | vis-network keys: 15 shapes incl. image/circularImage/icon, color string/object, borderWidth, borderDashes, borderRadius, size, opacity, hidden, font size/face/color/stroke/background/multi, multi-line, width/heightConstraint, shadow, groups + options.groups, value + scaling, options.nodes/edges defaults; edges: 12 arrow types, to/from/middle, scaleFactor, 10 smooth types, color string/object/inherit from/to/both/false, opacity, dashes, width/value, hidden, labels with font align/background, self loop, parallel |
| `fidelity/cyjs-perf.json.gz` | https://github.com/cytoscape/cytoscape.js/tree/HEAD/documentation/demos/performance-tuning | MIT | 500 nodes, the demo's cytoscape.stylesheet() builder written as JSON; no labels, Cytoscape.js defaults |
| `fidelity/cyjs-sbgn-sciluna.json` | https://raw.githubusercontent.com/sciluna/cytoscape.js-sbgn-layout/5ac0d49f7d7e36841668303265dcf345a4752855/demo/examples/9613829.json | CC0-1.0 | SBGN cy.json() with sbgn-stylesheet (functions saved as 'fn') |
| `fidelity/gephi-worldcup.json.gz` | https://github.com/visjs/vis-network/blob/HEAD/examples/network/datasources/WorldCup2014.json | Apache-2.0 / MIT | Gephi JSON export (id/label/x/y/size/color), 736 nodes, 9228 colored edges |
| `fidelity/vis-nodelegend.json` | https://github.com/visjs/vis-network/blob/master/examples/network/exampleApplications/nodeLegend.html | Apache-2.0 / MIT | vis example: options.groups, value scaling, edge widths and labels (21 nodes); data and options as the page hands them to new vis.Network |
