# Graphs in and out

`cy.graphtyGenerate()` makes a seeded graph, `cy.graphtyDataset()` loads a sample network,
`cy.graphtyImport()` reads a file and `cy.graphtyExport()` writes one. Each returns a promise and
downloads its code on first use.

This example makes four groups of 25 nodes and colors each node by its group:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const palette = ["#e15759", "#4e79a7", "#59a14f", "#f28e2b"];
const cy = cytoscape({
    container: document.getElementById("cy"),
    style: [{ selector: "node", style: { "background-color": (n) => palette[n.data("community")] } }],
});

cy.graphtyGenerate("planted-partition", { groups: 4, groupSize: 25, pIn: 0.3, pOut: 0.01, seed: 7 }).then(() =>
    cy.layout({ name: "graphty-forceatlas2" }).run(),
);
```

`pIn` is the chance of an edge inside a group and `pOut` between groups. Each node's group number
is in `data("community")`.

## Generators

`cy.graphtyGenerate(name, options)` resolves to `{ elements, directed }`: the added collection and
whether the graph is directed. Examples: `"erdos-renyi"` (`n`, `p`), `"grid"` (`rows`, `cols`)
and `"named"` (`name`, such as `"frucht"`); the [generator reference](../reference/graphs#generators)
lists all 59. A misspelled name or option (`seeed`) rejects with a `RangeError` listing the valid ones.

- Random generators take `seed` (default `0`); the same seed gives the same graph everywhere.
  Node ids are `"0"`, `"1"`..., edge ids `"e0"`, `"e1"`...
- Ground truth becomes a node data field, such as `community` (from 0) for `planted-partition` and
  `lfr`, `side` (0 or 1) for `random-bipartite`, or `layer` for `random-dag`.
- `weights` gives each edge a `data.weight`, for example `{ kind: "uniform", min: 1, max: 10 }`.
  Flow networks write their capacities there.
- Nodes sit at the origin until you run a layout, except in the geometric generators and lattices
  given `positions: true`, which place them about 1 unit apart: spread them with
  `cy.layout({ name: "preset", spacingFactor: 50 }).run()`.

## Sample datasets

`cy.graphtyDataset(name, options)` adds a real network and resolves to `{ elements, directed }`.
`await cy.graphtyDataset("karate")` adds Zachary's karate club: 34 nodes, 78 undirected edges, and
each member's faction in `data("club")` (`"Mr. Hi"` for node `"0"`). Edges get random ids from
Cytoscape on every load; match them by `source()` and `target()`.

Sixteen datasets ship inside the package and load from where the page loaded it, so serve the page
over HTTP. `road-ny`, `ogbn-arxiv`, `go-basic`, `disease-ontology`, `bioplex3-hct116` and `com-dblp`
download from graphty.app. `yeast-perturbation`, `stelzl-interactome`,
`wikipathways-senescence-autophagy` and `bioplex3-hct116` are drawings: each node sits where
Cytoscape drew it. Each dataset has its own license, not this package's MIT; the
[dataset reference](../reference/graphs#datasets) lists them.

## Importing a file

`cy.graphtyImport(input, format, options)` adds the graph in a file and resolves to
`{ elements, directed, format, report }`. It reads `gexf`, `graphml`, `gml`, `dot`, `pajek`, `csv`,
`json`, `neo4j`, `xgmml`, `cx2`, `cx`, `obo` and `cys` (a Cytoscape desktop session, passed as
bytes); `graphtyExport` writes the first ten. This example reads GraphML with a duplicate node:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);
const cy = cytoscape({ headless: true });

const graphml = `<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <graph edgedefault="directed">
    <node id="a"/>
    <node id="b"/>
    <node id="c"/>
    <node id="b"/>
    <edge id="e1" source="a" target="b"/>
    <edge id="e2" source="b" target="c"/>
  </graph>
</graphml>`;

const { elements, directed, report } = await cy.graphtyImport(graphml, "graphml");
for (const issue of report.issues) {
    console.warn(`${issue.severity} ${issue.code} on line ${issue.line}: ${issue.message}`);
}
console.log(`${elements.nodes().length} nodes, ${elements.edges().length} edges, directed: ${directed}`);
```

It prints `warning W_DUPLICATE_NODE on line 6: node "b" is declared twice; the declarations are
merged`, then `3 nodes, 2 edges, directed: true`.

The input is a string, a `Uint8Array`, an `ArrayBuffer` (`await response.arrayBuffer()`) or a
`ReadableStream` (`file.stream()`). `format`
defaults to `"auto"`, which detects the format from the content; `filename` and `mimeType` only
break near ties. Most text reads as CSV with no warning: `"hello world"` imports as an edge from
`hello` to `world`. Pass the format when you know it, or check the returned `format`.

The report has `issues` (each with `severity`, `code`, `message`, `line` and `element`),
`warningCount` and `errorCount`. An error in one element, such as an edge weight of `"heavy"`,
skips that element. More than `errorLimit` errors, input malformed for the format you passed, or no
node read at all rejects with an error named `"ImportError"` (`code` `"E_IMPORT"`) whose `report`
holds the issues read so far, and adds nothing.

`report.lossy` lists what the importer read but could not keep, such as skipped hyperedges. A z
coordinate in GEXF, GML, DOT or Pajek is dropped with no entry.

Every format takes these options; the [format reference](../reference/graphs#file-formats) lists
each format's own:

| Option             | Default    | Meaning                                                      |
| ------------------ | ---------- | ------------------------------------------------------------ |
| `weightFrom`       | `"weight"` | Attribute that becomes `data.weight` (GML: `"value"`)        |
| `encoding`         | from file  | Forces the encoding of byte input, such as `"windows-1252"`  |
| `defaultDirected`  | per format | Direction of a file that declares none                       |
| `onMixedDirection` | `"expand"` | Or `"directed"`, `"undirected"`, `"error"`; see below        |
| `errorLimit`       | `100`      | Element errors before the import rejects                     |
| `nodeIdFrom`       | `"id"`     | GML and Pajek: `"label"` makes the label the node id         |
| `duplicateEdges`   | `"keep"`   | Or `"error"`, `"first"`, `"last"`, `"sum"`, `"min"`, `"max"` |
| `addMissingNodes`  | `true`     | Add nodes that only edges name (GEXF: `false`)               |
| `hyperedges`       | `"skip"`   | GraphML: or `"error"`, `"star"`, `"clique"`                  |
| `selfLoops`        | `"keep"`   | Or `"drop"`, `"error"`                                       |
| `graphIndex`       | `0`        | Which graph of a file holding several (or `graphName`)       |
| `signal`           | none       | An `AbortSignal` that cancels the import                     |
| `onProgress`       | none       | Called with the bytes read and the total, when known         |

`"expand"` reads a file mixing directed and undirected edges as directed, each undirected edge as
two.

### How a file maps onto elements

- Every attribute becomes a data field of the same name, except the reserved `id`, `source`,
  `target` and `parent`, which are renamed (such as `parent#2`) with a `W_COLUMN_RENAMED` warning.
- The edge weight becomes `data.weight`. Ids are the file's ids as strings. In GraphML, GEXF,
  XGMML, CX2, CSV and Cytoscape JSON, an edge repeating an earlier edge's id is skipped and
  reported as `E_DUPLICATE_EDGE_ID`. In GML and DOT the edge is kept, Cytoscape gives it a new id,
  and the report has a `W_EDGE_ID_DROPPED` warning. An edge id that is also a node id gets the same
  warning and a new id in every format.
- A compound parent (GraphML nested graph, DOT cluster) becomes `data.parent`.
- Positions become node positions; nodes without one sit at the origin. CX, CX2 and XGMML put a
  z coordinate in `data.z`. CX, CX2, XGMML and Cytoscape JSON keep Cytoscape's own coordinates, so
  a node sits where Cytoscape drew it. GEXF, GML, DOT and Pajek are y-up, so y is negated on import
  and on export.

## Direction and existing elements

A Cytoscape graph has no direction of its own, so every loading method returns `directed`: pass it
to the algorithms and `graphtyExport` as their `directed` option.

The loading methods add to whatever the core holds. A taken node id rejects with an `IdTakenError`
(`code` `"E_ID_TAKEN"`) and adds nothing; a taken edge id gets a new id from Cytoscape. Generated
graphs always number nodes from `"0"`, so call `cy.elements().remove()` before loading a second one.

## Exporting a file

`cy.graphtyExport(format, options)` resolves to the file's text. `eles.graphtyExport()` does the
same for a collection: its nodes, and those of its edges whose two ends are both in it. A node whose
parent is not in the collection is written without a parent, and `onLoss` does not report it.

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);
const cy = cytoscape({ headless: true });
const { directed } = await cy.graphtyDataset("les-miserables");

const graphml = await cy.graphtyExport("graphml", {
    directed,
    onLoss: (notes) => notes.forEach((n) => console.warn(n.code, n.column, n.message)),
});
```

Every format takes `directed` (default `false`), `onLoss` and `sanitizeIds` (default `"mangle"`),
explained below; the [format reference](../reference/graphs#file-formats) lists the rest.

The export writes every data field, position, parent and edge id the format can hold. A numeric
edge `weight` becomes the file's edge weight, and a string `label` goes to the format's label slot.
Hidden elements are written too; export `cy.elements(":visible")` to leave them out. Headless, that
needs `styleEnabled: true`, and such a core keeps a timer running: in Node, call `cy.destroy()` when
done or the process never exits.

Without `onLoss`, what a format cannot hold is dropped or converted silently. `onLoss` runs once
before writing, if anything is lost. Each note has `code` (such as `"W_POSITIONS_DROPPED"`),
`message`, `column` (a data field, `"position"`, `"id"` or `null`) and `count`. Import undoes these,
so ignore them: `W_ID_MANGLED`, `W_ID_RENUMBERED`, `W_GML_JSON_ARRAY`,
`W_GML_RECORD_NUMBER_TYPE`, `W_CSV_NODE_ORDER`, `W_INTEGRAL_F64_AS_I32`, and on CX2
`W_DTYPE_UNSUPPORTED` for `id`. `W_DOT_CLUSTER_MARKED` is not undone: a DOT parent reads back with
`data["graphty.cluster"]` set to `true`, and the import report has a `W_DOT_CLUSTER_NODE_MERGED`
warning.

### What a round trip keeps

Through `graphtyExport` and `graphtyImport`, an undirected graph keeps its node ids, edge `weight`
and number, string and boolean fields in every format, except that GML reads booleans back as `1`
and `0` and CSV without its node table loses node fields.

| Format    | Edge ids | Parents | Positions | Lists | Direction |
| --------- | -------- | ------- | --------- | ----- | --------- |
| `gexf`    | kept     | kept    | 32-bit    | text  | kept      |
| `graphml` | kept     | kept    | lost      | text  | kept      |
| `gml`     | kept     | lost    | kept      | kept  | kept      |
| `dot`     | kept     | kept    | 32-bit    | lost  | kept      |
| `pajek`   | new      | lost    | 32-bit    | lost  | kept      |
| `csv`     | kept     | lost    | lost      | text  | kept      |
| `json`    | kept     | kept    | 32-bit    | kept  | directed  |
| `neo4j`   | new      | lost    | `[x, -y]` | text  | directed  |
| `xgmml`   | kept     | kept    | 32-bit    | text  | kept      |
| `cx2`     | new      | lost    | 32-bit    | text  | directed  |

"32-bit" positions return `0.1` as `0.10000000149011612`. "new" edge ids come from Cytoscape (CX2:
`"0"`, `"1"`). With `[x, -y]` the node sits at the origin and the array is in `data.position`.
"text" lists read back as JSON text (`'["x","y"]'`). "directed" formats have no
undirected form; import Cytoscape JSON with `{ defaultDirected: false }` to read it as undirected.
CX2 writes a node's `label` to `name`, which reads back as `data.name`.

CSV writes one table per file; the default edge table loses node fields and nodes without edges.
Write the node table too with `cy.graphtyExport("csv", { table: "nodes" })`, then read both
with `graphtyImport(edgeTable, "csv", { nodes: nodeTable })`.

GML and CX2 take only integer node ids, and Pajek numbers its nodes 1 to N. The default
`sanitizeIds: "mangle"` keeps each other id in an attribute that `graphtyImport` restores; import
with `restoreMangledIds: false` to keep the numbers and get the old id in
`data.graphty_originalId`. With `"error"`, GML and CX2 reject, and Pajek ids read back as `"1"` to
`"N"`.

## Without a core method

`generateElements` (synchronous) and `datasetElements` from `@graphty/cytoscape-extensions/samples`,
and `importElements` from `@graphty/cytoscape-extensions/io`, return element definitions for
`cy.add()`. `exportElements(eles, format, options)` from the io entry takes a collection; to export
definitions, put them in a headless core with the `preset` layout, or Cytoscape's default grid
layout overwrites their positions:

```js
import cytoscape from "cytoscape";
import { exportElements } from "@graphty/cytoscape-extensions/io";
import { generateElements } from "@graphty/cytoscape-extensions/samples";

const { elements } = generateElements("grid", { rows: 2, cols: 2, positions: true });
const eles = cytoscape({ headless: true, elements, layout: { name: "preset" } }).elements();
const gexf = await exportElements(eles, "gexf");
```

## Next

- [Export and import demo](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-graphs--export-and-import): try every format in the browser.

- [Load a GraphML file](./recipes/load-graphml-file): let a user pick a file, show it, and save it back.
- [Generators, datasets and formats](../reference/graphs): every option, size and license, and the galleries.
