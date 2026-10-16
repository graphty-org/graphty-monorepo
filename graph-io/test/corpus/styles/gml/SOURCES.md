# GML style corpus

Real styled files whose stated license allows redistribution, and inputs generated for this project, read by
graph-io's style tests (`test/styles/harness.test.ts`). The license is the one the source states: the GitHub
repository's license, an NDEx network's `rights` property, or the project's own license text. A file over 256 KB
is stored gzip-compressed (`.gz`); the tests read it decompressed, under its name without `.gz`.
Files under `generated/` were written for this project by seeded scripts, MIT like the package: the per-writer
inputs by `test/styles/generate-gml-corpus.py`, the `graphty-written` and `tamper-*` files by
`test/formats/gml/styles.test.ts` (`UPDATE_GML_TAMPER=1`).

| File                                    | Source                                                                                                                               | License                          | What it is                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | ----------------------------------------------------------------------------- |
| `di-unipi-socc_dgLBF__germany50.gml`    | https://github.com/di-unipi-socc/dgLBF/blob/HEAD/sim/data/gml/germany50.gml                                                          | MIT                              |                                                                               |
| `generated/cytoscape-interactions.gml`  | Generated for this project by a seeded script                                                                                        | MIT (generated for this project) | Cytoscape 2.x GML writer's shape: outline_width, numbered arrows              |
| `generated/gephi-unquoted-creator.gml`  | Generated for this project by a seeded script                                                                                        | MIT (generated for this project) | Gephi's GML export shape: `Creator Gephi` unquoted inside the graph           |
| `generated/graphics-mix.gml`            | Generated for this project by a seeded script                                                                                        | MIT (generated for this project) |                                                                               |
| `generated/graphty-written.gml`         | Written by graph-io's GML writer                                                                                                     | MIT (generated for this project) | `yed-labels-and-arrows.gml` written by graph-io with its styles               |
| `generated/igraph-flat-attributes.gml`  | Generated for this project by a seeded script                                                                                        | MIT (generated for this project) | igraph's write_graph_gml shape: a Creator line, flat attributes, no graphics  |
| `generated/networkx-graphics.gml`       | Generated for this project by a seeded script                                                                                        | MIT (generated for this project) | written by NetworkX 2.8 write_gml (no Creator line) from graphics dicts       |
| `generated/ogdf-escaped-labels.gml`     | Generated for this project by a seeded script                                                                                        | MIT (generated for this project) | OGDF writeGML shape: backslash-escaped quotes, line, lineWidth, stipple       |
| `generated/tamper-block-truncated.gml`  | Written by graph-io's GML writer, then edited                                                                                        | MIT (generated for this project) | `graphty-written.gml` with its graphty.styles block cut in half               |
| `generated/tamper-native-edited.gml`    | Written by graph-io's GML writer, then edited                                                                                        | MIT (generated for this project) | `graphty-written.gml` with one node's fill changed, as another program would  |
| `generated/tamper-node-added.gml`       | Written by graph-io's GML writer, then edited                                                                                        | MIT (generated for this project) | `graphty-written.gml` with one node added                                     |
| `generated/yed-labels-and-arrows.gml`   | Generated for this project by a seeded script                                                                                        | MIT (generated for this project) | yEd GML export shape: label colors and font styles, arrows by name, hasFill 0 |
| `ImperialCollegeLondon_pyrealm__pmodel.gml` | https://github.com/ImperialCollegeLondon/pyrealm/blob/1da6812e2b628227501723f0e64d2765d4f39f77/docs/source/users/pmodel/pmodel_details/pmodel.gml | MIT | The P Model's data flow from the pyrealm documentation, drawn in yEd 2.17 (`Creator "yFiles"`) with its flowchart palette: 36 nodes in two fills, 57 arrowed edges, 19 routed through smoothed bends |
| `spupyrev_bob__need4stacks261.gml`      | https://raw.githubusercontent.com/spupyrev/bob/62c77e5f064a0fabbd89c64979cc6ff49f35bc7c/graphs/need4stacks261.gml                    | MIT                              | GitHub spupyrev/bob graphs/need4stacks261.gml                                 |
| `TwelveYC_network-vi__metabolicpos.gml` | https://raw.githubusercontent.com/TwelveYC/network-vi/d7a36c21a09eb86276e316193405267e3a9cc78d/media/data/metabolic/metabolicpos.gml | MIT                              | GitHub TwelveYC/network-vi media/data/metabolic/metabolicpos.gml              |

## Style fidelity fixtures

Files scored against the drawing of the program that wrote them (`graph-io/test/fidelity/corpus-samples.ts`, reference
scenes in `graph-io/test/fidelity/scenes/<sample id>/`). Generated files were written by the seeded scripts in
`graph-io/test/fidelity/generators/`, MIT like the package.

On 2026-10-16 the owner chose to commit every file of the style fidelity corpus regardless of its license, so some files below state no license, or one that does not allow redistribution; each row gives the license its source states, or "none stated".

| File | Source | License | What it is |
| --- | --- | --- | --- |
| `fidelity/synthetic-coverage.gml` | generated by generators/gen-synthetic.py (seeded) | MIT (generated) | yEd GML |
| `fidelity/repro-groups-no-creator.gml` | generated by `graph-io/test/fidelity/generators/gen_repros.py` (seeded) | MIT (generated) | yEd-only keys (`LabelGraphics`, `isGroup`, `gid`) with no `Creator` line, nested groups (the structure of BioNetGen visualize output, no stated license) |
| `fidelity/bionetgen-ruleviz-pattern.gml` | https://github.com/ionif/fcer1-gamma-phosphorylation/blob/f0f1870f04556db13be37f4a396a601e3b92cdaa/BioNetFit_v1/Simulators/Validate/DAT_validate/visualize_ruleviz_pattern.gml | none stated (vendored BioNetGen, MIT upstream) | yEd GML |
| `fidelity/dunnart-autobahn.gml` | https://github.com/mjwybrow/dunnart/blob/af43b7c9acc16c83c72684959c9b643b84633b0f/examples/gml/autobahn.gml | none stated (NOASSERTION) | yEd GML |
| `fidelity/dunnart-planar-orthogonal.gml` | https://github.com/mjwybrow/dunnart/blob/af43b7c9acc16c83c72684959c9b643b84633b0f/examples/gml/interesting_planar_orthogonallayout.gml | none stated (NOASSERTION) | yEd GML |
| `fidelity/jgrapht-grid-territorio.gml` | https://github.com/pdlmachado/GraphTheory-JGraphT/blob/fd5500dc22a03d3de8c98b6a8485675ea4851eb6/src/main/java/graphs/grid-territorio.gml | none stated | yEd GML |
| `fidelity/visualgraph-tree30.gml` | https://github.com/f4b4/VisualGraph/blob/d07397c29844e8e27fae7292520a94422112543c/samples/tree-30.gml | none stated | yEd GML |
