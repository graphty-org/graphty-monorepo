# Style fidelity reference tools

The reference scenes come from these programs. They are invoked by `regenerate.sh` from a local tools
directory and never vendored into a package; only `references/dvipsnam.def` is a copied file. No
yFiles code is used anywhere: yEd files are read from their own stored geometry.

| Tool                                                                        | Version                                 | License                             | Used for                                                                            |
| --------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------- |
| @hpcc-js/wasm-graphviz                                                      | 1.29.2 (Graphviz 16.1.0)                | Apache-2.0 (Graphviz: EPL-1.0)      | `graphviz-json`: lays out and draws DOT, `-Tjson`                                   |
| Graphviz CLI (conda-forge)                                                  | 14.1.2                                  | EPL-1.0                             | `gml2gv`, `neato -n2` for the `gml2gv` and `graphviz-n2` routes                     |
| Gephi Toolkit                                                               | 0.11.3 (`gephi-toolkit-0.11.3-all.jar`) | CDDL-1.0 OR GPL-3.0                 | `gephi-noscale`: GEXF through Gephi's preview, run by `references/GephiExport.java` |
| Eclipse Temurin JDK                                                         | 17.0.20.1                               | GPL-2.0 with Classpath Exception    | runs Gephi and Cytoscape                                                            |
| Cytoscape desktop                                                           | 3.10.5, CyREST                          | LGPL-2.1                            | `cytoscape-desktop`, `cytoscape-gml`: resolved visual properties per node and edge  |
| Cytoscape.js                                                                | 3.34.3 (graph-io's devDependency)       | MIT                                 | `cyjs-computed`, `cyjs-hop`                                                         |
| Playwright Chromium                                                         | the workspace's Playwright              | Apache-2.0 (Chromium: BSD-3-Clause) | runs Cytoscape.js and draw.io headless                                              |
| draw.io (jgraph/drawio)                                                     | 32.4.1, `mxGraphMlCodec`                | Apache-2.0                          | `drawio`: yEd GraphML through draw.io's GraphML importer                            |
| graphology, graphology-gexf, sigma                                          | 0.26.0, 0.13.2, 4.0.1                   | MIT                                 | `sigma`: the file's own GEXF edge colors                                            |
| networkx                                                                    | 3.7                                     | BSD-3-Clause                        | `yed-file` for GML: `read_gml`                                                      |
| Python                                                                      | 3.12 standard library                   | PSF-2.0                             | `yed-file` for GraphML, `pajek-file`                                                |
| dvipsnam.def (LaTeX graphics bundle, `drivers.dtx`, the `dvipsnames` block) | 2026-05-29                              | LPPL-1.3c                           | dvips color names for Pajek, copied unmodified into `references/dvipsnam.def`       |

Not used: the draw.io desktop CLI (its virtual display launch was not permitted here) and Pajek
itself (needs Wine, which is not installed).
