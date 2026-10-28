Fixtures for graph-io's file-positions tests (`../corpus.test.ts`, `../round-trip.test.ts`), and the samples
graphty-element's published "Data/File positions" stories load.

- `cluster-laid-out.gv`: `dot -Tdot ../../corpus/dot/cluster.gv` (Graphviz 2.43), laid out with `bb`
  on the root graph and on each cluster.
- `neato-input.gv`, `yed-groups.graphml`, `yfiles.gml`, `gephi.gml`: written by hand for these tests.

| File               | Source                                                                                                                                 | License                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `germany50.gml`    | https://github.com/di-unipi-socc/dgLBF/blob/HEAD/sim/data/gml/germany50.gml (SNDlib's germany50 network, written by its GML generator) | MIT (the repository's license)   |
| `pajek-shapes.net` | Written for this project: every Pajek shape keyword, size factors, label and line styles                                               | MIT (generated for this project) |
| `pyramid-3d.net`   | Written by hand for this project: a 3D drawing that is not mirror-symmetric                                                            | MIT (written for this project)   |
