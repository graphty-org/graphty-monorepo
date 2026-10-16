# Style fidelity generators

The seeded scripts that wrote the generated files of the style fidelity corpus (`../corpus-samples.ts`). Each writes
the same bytes for the same seed; the committed files and their reference scenes were made with them.

| Script                  | Writes                                                                                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `build-synthetic.mjs`   | `syn-mappings` and `syn-bypass` in a running Cytoscape 3.10.5 over CyREST, saved by Cytoscape as XGMML, CX, CX2 and a session                  |
| `gen_gexf.py`           | `gexf/fidelity/synth-nx-viz.gexf`, `gexf/fidelity/synth-13-hierarchy.gexf` (needs networkx)                                                    |
| `gen_pajek.py`          | `pajek/fidelity/synth-vertices.net`, `pajek/fidelity/synth-lines.net`                                                                          |
| `gen-synthetic.py`      | `graphml/fidelity/synthetic-nodes.graphml`, `graphml/fidelity/synthetic-edges.graphml`, `gml/fidelity/synthetic-coverage.gml` (needs networkx) |
| `dot_make_synthetic.py` | `dot/fidelity/synth-nodes.gv`, `dot/fidelity/synth-edges-clusters.gv`                                                                          |
| `json_gen_synthetic.py` | the `json/fidelity/*synth*.json` files                                                                                                         |
