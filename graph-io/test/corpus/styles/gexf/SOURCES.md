# GEXF style corpus

Real styled files whose stated license allows redistribution, and inputs generated for this project, read by
graph-io's style tests (`test/styles/harness.test.ts`). The license is the one the source states: the GitHub
repository's license, an NDEx network's `rights` property, or the project's own license text. A file over 256 KB
is stored gzip-compressed (`.gz`); the tests read it decompressed, under its name without `.gz`.
Files under `generated/` were written for this project by seeded scripts, MIT like the package.

| File | Source | License | What it is |
| --- | --- | --- | --- |
| `cns-iu_cns-pubvis__wos-extract.isi_full-layout.gexf.gz` | https://raw.githubusercontent.com/cns-iu/cns-pubvis/784c1507c83cbca4e44e3d917f6348b562a9a670/example/wos-extract.isi_full-layout.gexf | MIT | GitHub cns-iu/cns-pubvis example/wos-extract.isi_full-layout.gexf |
| `generated/alpha-text.gexf` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/broken-viz.gexf` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/distinct-1000-keyed.gexf.gz` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/distinct-128-keyed.gexf.gz` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/distinct-2-keyed.gexf.gz` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/distinct-32-keyed.gexf.gz` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/distinct-5000-keyed.gexf.gz` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/distinct-64-keyed.gexf.gz` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/distinct-65-keyed.gexf.gz` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/distinct-8-keyed.gexf.gz` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/gexf10-edges-first.gexf` | Generated for this project by a seeded script | MIT (generated for this project) | GEXF 1.0 as Gephi 0.6 wrote it: `type="dir"` edges before their nodes, `<attvalue id>`, `pid="0"` |
| `generated/gexf13-hex-and-labels.gexf` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/graphty-written.gexf` | Generated for this project: `generated/random-all-60.gexf` written with its styles (`test/formats/gexf/styles.test.ts`, `UPDATE_GEXF_TAMPER=1`) | MIT (generated for this project) | the untouched file the block-tamper fixtures start from |
| `generated/joint-100-classes.gexf.gz` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/nonlinear-ramps.gexf` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/random-all-60.gexf` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/random-all-600.gexf` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/random-all-6000.gexf.gz` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/tamper-block-truncated.gexf` | Generated for this project: `graphty-written.gexf` with its `graphty.styles` block cut in half | MIT (generated for this project) | block-tamper fixture: the block is ignored (NOT_JSON) |
| `generated/tamper-native-edited.gexf` | Generated for this project: `graphty-written.gexf` with one node's `viz:color` changed | MIT (generated for this project) | block-tamper fixture: the edit comes back as one exception |
| `generated/tamper-node-added.gexf` | Generated for this project: `graphty-written.gexf` with one node added | MIT (generated for this project) | block-tamper fixture: the block is ignored (FINGERPRINT) |
| `gexfjs-celegans.gexf.gz` | https://raw.githubusercontent.com/raphv/gexf-js/master/celegans.gexf | MIT |  |
| `gexfjs-miserables.gexf` | https://raw.githubusercontent.com/raphv/gexf-js/master/miserables.gexf | MIT |  |
| `glxxyz_hskhsk.com__HSK1-3_chars_v09.gexf.gz` | https://raw.githubusercontent.com/glxxyz/hskhsk.com/8a6f229c699e2fd7ac8708156c55c3afb2be7e1f/hanzigraphs/gexf/HSK1-3_chars_v09.gexf | MIT | GitHub glxxyz/hskhsk.com hanzigraphs/gexf/HSK1-3_chars_v09.gexf |
| `graphology-basic.gexf` | https://github.com/graphology/graphology/blob/master/src/gexf/test/resources/basic.gexf | MIT | an undirected edge in a directed graph, beside a directed one between the same nodes |
| `graphology-missing_nodes.gexf` | https://github.com/graphology/graphology/blob/master/src/gexf/test/resources/missing_nodes.gexf | MIT | edges that name nodes the file never declares |
| `gsa-fpki-certs.gexf` | https://github.com/GSA/idmanagement.gov/blob/main/_implement/tools/fpki-certs.gexf | CC0 / public domain (US government) |  |
| `pygraphistry-sample-1.3-viz.gexf` | https://github.com/graphistry/pygraphistry/blob/master/graphistry/tests/data/gexf/sample-1.3-viz.gexf | BSD-3-Clause |  |
| `pygraphistry-sample.gexf` | https://github.com/graphistry/pygraphistry/blob/master/demos/demos_databases_apis/gexf/sample.gexf | BSD-3-Clause |  |
| `qvge-mine-airing.gexf` | https://github.com/ArsMasiuk/qvge/blob/master/examples/mine%20airing%20network%20graph%20-%20117%20branches.gexf | MIT |  |
| `rgexf-lesmiserables.gexf` | https://github.com/gvegayon/rgexf/blob/master/inst/gexf-graphs/lesmiserables.gexf | MIT |  |
| `sigma-arctic.gexf.gz` | https://raw.githubusercontent.com/jacomyal/sigma.js/v1.2.1/examples/data/arctic.gexf | MIT |  |
| `sigma-moroccan-ediaspora.gexf.gz` | https://raw.githubusercontent.com/jacomyal/sigma.js/v1.2.1/examples/data/moroccan-ediaspora.gexf | MIT |  |
| `sigma-standard_graph.gexf` | https://raw.githubusercontent.com/jacomyal/sigma.js/v1.2.1/examples/data/standard_graph.gexf | MIT |  |
| `sigma-website-diseasome.gexf.gz` | https://raw.githubusercontent.com/jacomyal/sigma.js/main/packages/website/public/data/diseasome.gexf | MIT (sigma.js) | sigma.js website demo data |

## Style fidelity fixtures

Files scored against the drawing of the program that wrote them (`graph-io/test/fidelity/corpus-samples.ts`, reference
scenes in `graph-io/test/fidelity/scenes/<sample id>/`). Generated files were written by the seeded scripts in
`graph-io/test/fidelity/generators/`, MIT like the package.

| File | Source | License | What it is |
| --- | --- | --- | --- |
| `fidelity/graphology-rio.gexf.gz` | https://raw.githubusercontent.com/graphology/graphology/master/src/gexf/test/resources/rio.gexf | MIT (graphology repository) | Rio+20 web link network exported from Gephi: 366 nodes colored by category, sized by in-degree, stored layout, directed |
| `fidelity/synth-nx-viz.gexf` | generated by generators/gen_gexf.py (seeded) | MIT (generated) | 96 nodes / 193 edges: every non-image shape, alpha, sizes, z, thickness, every edge shape, edge alpha, labels, weights, loops, parallel edges, unstyled elements |
| `fidelity/synth-13-hierarchy.gexf` | generated by generators/gen_gexf.py (seeded) | MIT (generated) | 60 nodes: hex colors, nested hierarchy and pid, image shapes (data: URI), directed and mutual edges in an undirected graph, edge kinds, labels |
