# Graphs in and out

`cy.graphtyGenerate()` makes a seeded graph, `cy.graphtyDataset()` loads a sample network,
`cy.graphtyImport()` reads a file and `cy.graphtyExport()` writes one. Each returns a promise and
loads its code on the first call, so a page that never calls them never downloads it.

This example makes four planted groups of 25 nodes and colors each node by its group:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const palette = ["#e15759", "#4e79a7", "#59a14f", "#f28e2b"];
const cy = cytoscape({
    container: document.getElementById("cy"),
    style: [{ selector: "node", style: { "background-color": (n) => palette[n.data("community")] } }],
});

cy.graphtyGenerate("planted-partition", { groups: 4, groupSize: 25, pIn: 0.3, pOut: 0.01, seed: 7 })
    // Generated nodes all start at the origin, so lay them out.
    .then(() => cy.layout({ name: "graphty-forceatlas2" }).run());
```

The example uses `.then()` because a top-level `await` on these methods in your entry module, or
in a module it imports statically, never resolves after `vite build`. `await` inside a function,
Node and the Vite dev server are not affected.

## Generators

`cy.graphtyGenerate(name, options)` resolves to `{ elements, directed }`: the added collection and
whether the graph is directed. Common ones are `"erdos-renyi"` (`n`, `p`), `"barabasi-albert"`
(`n`, `m`), `"watts-strogatz"` (`n`, `k`, `beta`), `"planted-partition"`, `"grid"` (`rows`,
`cols`), `"random-tree"` (`n`), `"complete"` (`n`) and `"named"` (`name`, such as `"frucht"`).
The [generator reference](../reference/graphs#generators) lists all 59 with their options.
TypeScript checks the options per name, and an unknown name rejects with a `RangeError`.

- Random generators take `seed`, an integer that defaults to `0`. The same name, options and seed
  give the same graph on every platform, element ids included.
- Node ids are `"0"`, `"1"`, `"2"`, and so on; edge ids are `"e0"`, `"e1"`, `"e2"`.
- Ground truth the generator knows becomes a node data field: `community` for the block models and
  `"lfr"`, `side` for the bipartite generators, `layer` for the layered DAGs and flow networks.
- `weights` gives each edge a `data.weight`, for example `{ kind: "uniform", min: 1, max: 10 }`.
  The flow networks always write their capacities to `data.weight`.
- Nodes sit at the origin until you run a layout. The geometric generators and the lattices given
  `positions: true` place nodes about 1 unit apart: spread them with
  `cy.layout({ name: "preset", spacingFactor: 50 }).run()`.

## Sample datasets

`cy.graphtyDataset(name, options)` adds a real network and resolves to `{ elements, directed }`.
This example loads Zachary's karate club, finds communities with Louvain, and saves the result as
GEXF in Node:

```js
import { writeFile } from "node:fs/promises";
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);
const cy = cytoscape({ headless: true });

const { directed } = await cy.graphtyDataset("karate");
const communities = cy.elements().graphtyLouvain({ directed, field: "community" });
console.log(`${communities.length} communities, modularity ${communities.modularity.toFixed(3)}`);

const gexf = await cy.graphtyExport("gexf", { directed });
await writeFile("karate.gexf", gexf);
```

It prints `4 communities, modularity 0.419`, and `karate.gexf` holds each node's `club` and
`community`.

Node ids are the dataset's own (`"0"` to `"33"` for karate). Dataset edges have no ids, so
Cytoscape gives them random ones that change on every load. Match an edge across loads by its
`source()` and `target()`.

Twelve datasets ship inside the package, up to `openflights` (3,214 airports, 36,906 routes).
Node reads them from disk. A browser fetches each one on first use
from the same place as the package, so a page opened from `file://` cannot load them. Three larger
ones come from graphty.app: `road-ny` (264,346 nodes), `ogbn-arxiv` (169,343) and `com-dblp`
(317,080). Any other name is fetched from `<baseUrl>/<name>.gsnp.gz`, so a misspelled name
rejects with an HTTP 404.

The options are `baseUrl` (default `https://graphty.app/data/graph-samples/v1/`), `fetch`
(default: the global `fetch`) and `signal`, an `AbortSignal`: once it is aborted the call rejects
with an `AbortError` and adds nothing. The datasets are not under this package's MIT license; the
[dataset reference](../reference/graphs#datasets) gives each one's source and terms.

## Importing a file

`cy.graphtyImport(input, format, options)` adds the graph in a file and resolves to
`{ elements, directed, format, report }`. It reads `gexf`, `graphml`, `gml`, `dot`, `pajek`, `csv`,
`json`, `neo4j`, `cx2`, `cx` and `obo`, and under `"auto"` also XGMML, the format Cytoscape
desktop exports. `graphtyExport` writes the first nine. This example reads GraphML with a mistake
in it and prints the report's issues:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);
const cy = cytoscape({ headless: true });

const graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="d0" for="node" attr.name="name" attr.type="string"/>
  <graph edgedefault="directed">
    <node id="a"><data key="d0">Alice</data></node>
    <node id="b"><data key="d0">Bob</data></node>
    <node id="c"><data key="d0">Carol</data></node>
    <node id="b"><data key="d0">Bobby</data></node>
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

It prints `warning W_DUPLICATE_NODE on line 8: node "b" is declared twice; the declarations are
merged`, then `3 nodes, 2 edges, directed: true`. Node `b` ends up with `name: "Bobby"`.

The input is a string, a `Uint8Array`, or a `ReadableStream` such as `file.stream()` from a file
input. `format` defaults to `"auto"`, which detects the format from the content; the `filename`
option (`{ filename: file.name }`) decides only when the content matches no format. Under
`"auto"`, most text that is not a graph file resolves as CSV: `"hello world"` imports as an edge
from `hello` to `world` with no issues. Pass the format when you know it, and check
`report.errorCount` and `elements.length` before you trust a file a user picked.

The report has `issues` (each with `severity`, `code`, `message`, `line` and `element`),
`warningCount`, `errorCount`, `counts` of elements read and skipped, `truncated` and `lossy`. An
error in one element, such as an edge weight of `"heavy"`, skips that element and is reported, and
the import still resolves. One error more than `errorLimit` rejects the import, and so does input
that is malformed for the format you passed. Nothing is added then. The rejection is an
`ImportError` from @graphty/graph-io with `code` `"E_IMPORT"`. This package does not re-export the
class, so test `e.name === "ImportError"` and `e.code` rather than `instanceof`.

The other options come from @graphty/graph-io, and any graph-io import option not listed here,
such as `addMissingNodes` or `hyperedges`, is passed through as well:

| Option             | Default          | Meaning                                               |
| ------------------ | ---------------- | ----------------------------------------------------- |
| `weightFrom`       | `"weight"`       | Attribute that becomes `data.weight` (GML: `"value"`) |
| `encoding`         | BOM, file, UTF-8 | Encoding of byte input, such as `"windows-1252"`      |
| `defaultDirected`  | per format       | Direction of a file that declares none                |
| `onMixedDirection` | `"expand"`       | Or `"directed"`, `"undirected"`, `"error"`; see below |
| `errorLimit`       | `100`            | Element errors before the import rejects (`Infinity`) |
| `nodeIdFrom`       | `"id"`           | GML and Pajek: `"label"` makes the label the node id  |
| `duplicateEdges`   | `"keep"`         | What to do with a repeated edge                       |
| `selfLoops`        | `"keep"`         | `"drop"` or `"error"` to refuse loops                 |
| `graphIndex`       | `0`              | Which graph of a file that holds several              |
| `maxEmptyCells`    | `16777216`       | Empty attribute slots before rejecting (`Infinity`)   |
| `signal`           | none             | An `AbortSignal` that cancels the import              |
| `onProgress`       | none             | Called with the bytes read and the total, when known  |

When a file mixes directed and undirected edges, `"expand"` imports it as directed and turns each
undirected edge into two opposite edges, with nothing in the report. `maxEmptyCells` counts one
slot per node for every field, so 4,097 nodes that each have their own field name reject.

### How a file maps onto elements

- Node ids are the file's ids as strings.
- Every attribute becomes a data field of the same name, except `id`, `source`, `target` and
  `parent`, which Cytoscape reserves. Such an attribute arrives as `<name>#<its key in the file>`,
  or `<name>#2` when the format gives it none, with a `W_COLUMN_RENAMED` warning.
- The edge weight becomes `data.weight`, also when only some edges have one.
- Edge ids in the file become the edges' ids. An edge whose id is a node id gets an id from
  Cytoscape. An edge that repeats an earlier edge's id is skipped and reported as
  `E_DUPLICATE_EDGE_ID`.
- A compound parent (Cytoscape JSON `parent`, GraphML nested graphs, DOT clusters) becomes
  `data.parent`.
- Positions become node positions; nodes without one sit at the origin. A z coordinate is dropped,
  except in CX, CX2 and XGMML, where it arrives as `data.z`. CX and CX2 store y pointing up, so a
  network laid out in Cytoscape desktop or NDEx arrives upside down; a CX2 export flips y back.

## Direction and existing elements

A Cytoscape graph has no direction of its own. Every loading method returns `directed`: pass it to
the algorithms as their `directed` option, and to `graphtyExport` so the file says the same.

The loading methods add to whatever the core holds. If a new node id is already taken, nothing is
added and the promise rejects with a plain `Error` that has no `code`; its message starts
`graphty: the core already has an element with id` and names the id. Generated graphs always
number nodes from `"0"`, so clear the core with `cy.elements().remove()` before loading a second
one. A taken edge id is not an error: that edge gets a new id from Cytoscape.

## Exporting a file

`cy.graphtyExport(format, options)` resolves to the file's text. `eles.graphtyExport()` does the
same for a collection: its nodes, and those of its edges whose two ends are both in it. To export a
selection with the edges between its nodes, pass `nodes.union(nodes.connectedEdges())`.

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

| Option        | Type                           | Default       | Meaning                           |
| ------------- | ------------------------------ | ------------- | --------------------------------- |
| `directed`    | `boolean`                      | `false`       | Write a directed graph            |
| `onLoss`      | `(notes) => void`              | none          | Hears what the format cannot hold |
| `sanitizeIds` | `"mangle"` or `"error"`        | `"mangle"`    | Ids GML, CX2 or Pajek cannot hold |
| `dialect`     | `"cytoscape"` or `"node-link"` | `"cytoscape"` | JSON: Cytoscape or NetworkX shape |

Any other option is passed to @graphty/graph-io's exporter for that format.

The export writes every data field, each node's position and parent, and each edge's id, as far as
the format holds them. A numeric edge field `weight` becomes the file's edge weight, and a string
field `label` goes to the format's own label slot where it has one.

Hidden elements are written too. To leave them out, export `cy.elements(":visible")` from a core
created with `{ headless: true, styleEnabled: true }`: with `headless: true` alone the core ignores
`display: none` and `:visible` matches everything. Such a core keeps a timer running, so call
`cy.destroy()` when you are done, or Node does not exit.

Without `onLoss`, what a format cannot hold is dropped or converted silently. `onLoss` is called
once before writing, with one note per field and kind of loss, and not at all when nothing is
lost. Each note (TypeScript type `LossNote`) has `code` (such as `"W_POSITIONS_DROPPED"`),
`message`, `column` (the data field, when the loss concerns one) and `count`. Three codes describe
conversions that `graphtyImport` reverses under the default `sanitizeIds`: `W_ID_MANGLED` and
`W_ID_RENUMBERED` (the ids are restored) and `W_GML_JSON_ARRAY` (lists come back as lists).

### What a round trip keeps

This is what `graphtyImport` gives back after `graphtyExport` writes an undirected graph. Node ids,
`weight`, numbers and strings survive every format under the default `sanitizeIds`.

| Format              | Edge ids | Parents | Positions       | Lists | Direction |
| ------------------- | -------- | ------- | --------------- | ----- | --------- |
| `gexf`              | kept     | kept    | 32-bit          | text  | kept      |
| `graphml`           | kept     | kept    | lost            | text  | kept      |
| `gml`               | kept     | lost    | kept            | kept  | kept      |
| `dot`               | kept     | kept    | 32-bit          | lost  | kept      |
| `pajek`             | new      | lost    | 32-bit          | lost  | kept      |
| `csv`               | kept     | lost    | lost            | text  | kept      |
| `json`              | kept     | kept    | 32-bit          | kept  | directed  |
| `json`, `node-link` | `id#2`   | lost    | `data.position` | kept  | kept      |
| `neo4j`             | new      | lost    | `data.position` | text  | directed  |
| `cx2`               | new      | lost    | 32-bit          | text  | directed  |

- "32-bit": positions read back as 32-bit floats, so `0.1` returns as `0.10000000149011612`.
- "new": the edges get new ids, Cytoscape's or `"0"`, `"1"` from CX2.
- `id#2`: the edges get new ids from Cytoscape, and the original id arrives as `data["id#2"]`.
- "text": a list or object reads back as JSON text, such as `'["x","y"]'`.
- "directed": the format has no undirected form. Import Cytoscape JSON with
  `{ defaultDirected: false }` to read it as undirected; Neo4j and CX2 ignore that option.

GML writes booleans as `1` and `0`, which read back as numbers. CX2 writes a node's `label` to
its `name` attribute, which reads back as `data.name`. Pajek gives each node without a `label` one
equal to its id. A compound graph written as DOT reads back with `graphty.cluster: true` on each
parent.

CSV writes one table per file, the edge table by default, so a node without edges is lost. To keep
it, also write `table: "nodes"` and import both:
`await copy.graphtyImport(edgeTable, "csv", { nodes: nodeTable })`.

GML and CX2 take only integer node ids, and Pajek numbers its nodes 1 to N. Ids that are all plain
non-negative integers (`"0"`, `"17"`) go to GML and CX2 as they are. Otherwise the default
`sanitizeIds: "mangle"` numbers the nodes and keeps each original id in an attribute that
`graphtyImport` restores. With `"error"`, GML and CX2 reject with a `GraphFormatError` whose
`code` is `"E_INVALID_ID"`, but Pajek writes the file anyway: its ids read back as `"1"` to `"N"`,
with the old ids in `data.label`.

## Without a core method

`@graphty/cytoscape-extensions/samples` has `generateElements`, which is synchronous and throws
the `RangeError` at once, and `datasetElements`. `@graphty/cytoscape-extensions/io` has
`importElements(input, format, options)`. They return element definitions instead of adding them:
pass their `elements` array to `cy.add()`. The samples entry also exports `GENERATORS`, an object
keyed by generator name (`Object.keys(GENERATORS)` lists all 59), and `BUNDLED_DATASET_NAMES`, the
array of the 12 dataset names that ship with the package.

`exportElements(eles, format, options)` from `@graphty/cytoscape-extensions/io` resolves to the
file's text. `eles` must be a Cytoscape collection; an array of definitions rejects with a
`TypeError`. Without a core, make a headless one:

```js
import cytoscape from "cytoscape";
import { exportElements } from "@graphty/cytoscape-extensions/io";

const elements = [
    { data: { id: "a" }, position: { x: 0, y: 0 } },
    { data: { id: "b" }, position: { x: 100, y: 50 } },
    { data: { id: "ab", source: "a", target: "b" } },
];
const core = cytoscape({ headless: true, elements, layout: { name: "preset" } });
const gexf = await exportElements(core.elements(), "gexf");
```

Pass `layout: { name: "preset" }` whenever you give the `cytoscape()` constructor definitions that
carry positions. Without it the constructor runs a grid layout, which in a headless core moves
every node to `(0, 0)`.

## Try it

- [Generate demo](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-graphs--generate) and [Dataset demo](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-graphs--dataset)
- [Export and import demo](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-graphs--export-and-import)
- Galleries of every [generator](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--generators), [dataset](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--datasets) and [format](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--formats)

## Next

- [Load a GraphML file](./recipes/load-graphml-file): let a user pick a file, show it, and save it back.
- [Generators, datasets and formats](../reference/graphs): every option, size and license.
- [Algorithms](./algorithms): run algorithms on the graph you loaded.
