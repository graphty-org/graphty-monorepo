# graph-io

graph-io reads and writes graph files. It turns a GraphML, GEXF, CSV or other graph file into a
[`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format) snapshot, and writes a
snapshot back out in any of the same formats. It runs in browsers and in Node, and streams large
files. Its one dependency, graph-format, is installed with it.

When a file holds something graph-io cannot represent, or a format cannot hold part of your graph,
graph-io tells you: an import returns a report that lists every skipped or changed element, and
`checkExport()` lists what a save would lose before you write a byte.

```bash
npm install @graphty/graph-io
```

Start with the [Quick start](./guide/quick-start.md).

## Formats

| Format                                      | What it is                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [JSON](./guide/formats/json.md)             | NetworkX, d3, JSON Graph Format, Cytoscape.js, graphology, vis.js and OBO Graphs documents |
| [GraphML](./guide/formats/graphml.md)       | The XML format of yEd, NetworkX, igraph and Gephi                                          |
| [GEXF](./guide/formats/gexf.md)             | Gephi's XML format, with visual attributes and dynamic graphs                              |
| [CSV and TSV](./guide/formats/csv.md)       | Edge lists, node tables and adjacency lists from spreadsheets and scripts                  |
| [GML](./guide/formats/gml.md)               | The Graph Modelling Language, as NetworkX and igraph write it                              |
| [DOT](./guide/formats/dot.md)               | Graphviz graphs                                                                            |
| [Pajek](./guide/formats/pajek.md)           | Pajek `.net` networks and `.paj` projects                                                  |
| [Neo4j CSV](./guide/formats/neo4j.md)       | The CSV files `neo4j-admin import` reads                                                   |
| [XGMML](./guide/formats/xgmml.md)           | Cytoscape's XML network format                                                             |
| [CX2](./guide/formats/cx2.md)               | The JSON exchange format of NDEx and Cytoscape 3.10 and later                              |
| [CX](./guide/formats/cx.md)                 | Version 1 of the same exchange format                                                      |
| [OBO](./guide/formats/obo.md)               | The ontology format of the Gene Ontology and the OBO Foundry                               |
| [Cytoscape session](./guide/formats/cys.md) | Cytoscape Desktop `.cys` files                                                             |

graph-io reads and writes all of them. [All formats](./guide/formats/index.md) compares what each
one keeps.

## Where to go next

- [Loading graphs](./guide/loading.md): every kind of input, format options, files with several
  graphs, cancelling, keeping a browser bundle small.
- [Reading the graph](./guide/reading.md): nodes, attributes, labels, edges, weights.
- [Saving graphs](./guide/saving.md): checking a save, streaming, downloads, ids a format cannot hold.
- [The import report and errors](./guide/report.md): what went wrong, and where.
- [Format detection](./guide/detection.md): how graph-io tells formats apart, and when to name one.
- [Options reference](./guide/options.md): every option, with its default.
- [Issue and loss codes](./guide/codes.md): every code an import or a save can report.
- [Writing a format plugin](./guide/extending/new-format.md): teach graph-io a format of your own.
- [Extending an existing format](./guide/extending/existing-format.md): change how a built-in
  format reads or writes.
- [API reference](https://graphty.app/docs/graph-io/api/generated/): every export, grouped by task.

If you display graphs with [graphty-element](https://graphty.app/docs/graphty-element/), you
already use graph-io: `element.loadFromUrl()` and `element.loadFromFile()` read files through it.
Use graph-io directly when you want the graph data yourself, for example to convert files, analyze a
graph, or draw it with your own renderer.
