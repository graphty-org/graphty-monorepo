# GraphML

[GraphML](http://graphml.graphdrawing.org/) is an XML format for graphs, written by yEd,
NetworkX, igraph, Gephi and many other tools.

## At a glance

<!-- generated:begin glance:graphml -->

|                         |                                                          |
| ----------------------- | -------------------------------------------------------- |
| Import from             | `@graphty/graph-io/graphml`                              |
| Format name             | `graphml`                                                |
| Extensions              | `.graphml`, `.xml`                                       |
| MIME types              | `application/graphml+xml`, `application/xml`, `text/xml` |
| Reads                   | yes                                                      |
| Writes                  | yes                                                      |
| Several graphs per file | no                                                       |
| Lists its graphs        | no                                                       |

What a saved file can hold (the [capabilities](./index.md#what-the-capabilities-mean) explain each row):

| Capability                                      | Value                       |
| ----------------------------------------------- | --------------------------- |
| [`mixedDirection`](./index.md#mixeddirection)   | yes                         |
| [`multiEdges`](./index.md#multiedges)           | yes                         |
| [`selfLoops`](./index.md#selfloops)             | yes                         |
| [`edgeIds`](./index.md#edgeids)                 | optional                    |
| [`idCharset`](./index.md#idcharset)             | nmtoken                     |
| [`dtypes`](./index.md#dtypes)                   | bool, i32, f32, f64, string |
| [`components`](./index.md#components)           | no                          |
| [`lists`](./index.md#lists)                     | no                          |
| [`json`](./index.md#json)                       | no                          |
| [`defaults`](./index.md#defaults)               | yes                         |
| [`options`](./index.md#options)                 | no                          |
| [`hierarchy`](./index.md#hierarchy)             | yes                         |
| [`temporal`](./index.md#temporal)               | none                        |
| [`graphAttributes`](./index.md#graphattributes) | yes                         |
| [`positions`](./index.md#positions)             | no                          |
| [`viz`](./index.md#viz)                         | no                          |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/graphml -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-network.graphml"), { filename: "got-network.graphml" });
console.log(`${snapshot.nodeCount} nodes; edge columns: ${snapshot.edges.names().join(", ")}`);

// Two node ids hold characters a GraphML id cannot; "mangle" rewrites them and keeps the originals
const options = { sanitizeIds: "mangle" } as const;
console.log(checkExport(snapshot, "graphml", options).map((n) => n.code));
await writeFile("got.graphml", await exportGraphToBytes(snapshot, "graphml", options));
```

<!-- generated:end -->

<!-- generated:begin output:formats/graphml -->

```text
107 nodes; edge columns: Edge Label, id
[ 'W_ID_MANGLED' ]
```

<!-- generated:end -->

GraphML ids cannot contain spaces. Two of this graph's ids do, so the example passes
`sanitizeIds: "mangle"`: the ids are rewritten in the file, the originals are stored next to them,
and graph-io puts them back when it reads the file.

## How graph-io reads it

- The file is streamed, so a large file is never held in memory as text.
- Each `<key>` becomes a column of its declared type (`boolean`, `int`, `long`, `float`, `double`,
  `string`), with its `<default>`. A key declared `for="all"` becomes a column of nodes, edges and
  the graph.
- `edgedefault` sets the direction, and an edge's own `directed` attribute overrides it, so one
  file can mix directed and undirected edges.
- The edge attribute named `weight` (or whatever `weightFrom` names) is the edge weight.
- A graph nested inside a node becomes a parent column: the nodes of the inner graph point at the
  node that holds it.
- `sourceport` and `targetport` on edges are kept. `<port>` declarations and `<locator>` elements
  are reported and left out.
- Hyperedges are left out with a warning by default; the `hyperedges` option can turn each one into
  a hub node or into edges between every pair of its ends.
- yEd graphics (keys with a `yfiles.type`) are kept as a JSON tree per node and edge, so a file
  written by yEd keeps its look when you save it as GraphML again. The common parts of yEd's node
  and edge graphics are also read into plain columns: `yfiles.position`, `yfiles.width`,
  `yfiles.height`, `yfiles.color`, `yfiles.borderColor`, `yfiles.borderWidth`, `yfiles.label`,
  `yfiles.shape`, and for edges `yfiles.color`, `yfiles.width`, `yfiles.targetArrow` and
  `yfiles.sourceArrow`. Pass `yfiles: "skip"` to ignore yEd graphics.
- Ids follow the `ids` option.

## What a saved file keeps and loses

GraphML keeps mixed direction, parallel edges, edge ids, typed columns with defaults, graph
attributes and nesting. What does not survive:

- Node ids must be valid XML name tokens: no spaces, quotes or most punctuation. Other ids need
  `sanitizeIds: "mangle"` (restored when graph-io reads the file). graph-io reads ids that break
  this rule, which some tools write, so a file it read without a complaint can still need
  `"mangle"` to be saved as GraphML again.
- Lists, positions, colors and other visual columns, and time columns have no GraphML type. They
  are written as JSON text or reported, and read back as text.
- A column that is neither a number, a boolean nor text is written as JSON text and reads back as
  text (`W_JSON_UNSUPPORTED`), except yEd graphics read from GraphML, which go back as yEd XML.
- yEd graphics are written as they were read. If you change a value that also has a plain column,
  such as a node's position after a layout, the change is not written back
  (`W_GRAPHML_YFILES_GRAPHICS_STALE`).
- A mutual pair of edges (a GEXF `mutual` edge, for example) becomes one undirected edge
  (`W_MUTUAL_AS_UNDIRECTED`).
- A label column is written as the key titled `label`, so a label column with another name reads
  back as `label` (`W_COLUMN_NAME_CHANGED`).

<!-- generated:begin reference:graphml -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option   | Type               | Default  | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------- | ------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yfiles` | `"skip" \| "json"` | `"json"` | How yEd graphics (keys with a `yfiles.type`) are read. "json" keeps each one as a JSON attribute named after the key (`d0`, say) that holds its XML as a tree, which the GraphML exporter writes back, and also reads the shapes it knows into plain columns beside it: `yfiles.position`, `yfiles.width`, `yfiles.height`, `yfiles.color`, `yfiles.borderColor`, `yfiles.borderWidth`, `yfiles.label` and `yfiles.shape` for nodes, and the line color, width and arrows for edges. The report's `lossy` list then holds `W_GRAPHML_YFILES_JSON`, because the XML comes back with the same structure but not byte for byte. "skip" leaves the graphics out, with a `W_GRAPHML_YFILES_SKIPPED` warning per key. |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option        | Type                         | Default | Meaning                                                                                                                                                                                                                                        |
| ------------- | ---------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pretty`      | `boolean`                    | `true`  | Indent nested elements; false writes one element per line without indentation.                                                                                                                                                                 |
| `edgedefault` | `"directed" \| "undirected"` | as read | The `edgedefault` of the graph element. The default is the one a GraphML import read, so a file with both directions reads back with the same edges marked, else the graph's direction (for a graph with both, the direction most edges have). |

## Import issue codes

The codes this format's import report can hold, also exported as `GRAPHML_ISSUE` from `@graphty/graph-io/graphml`.

| Code                               | Key                      | Severity | Meaning                                                                                                                                                                                                                                        |
| ---------------------------------- | ------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_XML_SYNTAX`                     | `XML_SYNTAX`             | error    | The input is not well-formed XML. The import stops.                                                                                                                                                                                            |
| `E_INVALID_UTF8`                   | `INVALID_UTF8`           | error    | The input is not valid UTF-8. The import stops.                                                                                                                                                                                                |
| `E_INVALID_ENCODING`               | `INVALID_ENCODING`       | error    | Some bytes are not valid in the encoding that was chosen (by a byte order mark, the file's declaration or the `encoding` option). The import stops.                                                                                            |
| `W_ENCODING_FALLBACK`              | `ENCODING_FALLBACK`      | warning  | Bytes that are not UTF-8 and declare no encoding were read as windows-1252.                                                                                                                                                                    |
| `W_UNKNOWN_ENCODING`               | `UNKNOWN_ENCODING`       | warning  | A declared encoding the platform cannot decode was ignored.                                                                                                                                                                                    |
| `E_NOT_GRAPHML`                    | `NOT_GRAPHML`            | error    | The root element is not `<graphml>`. The import stops.                                                                                                                                                                                         |
| `W_GRAPHML_NAMESPACE`              | `NAMESPACE`              | warning  | The `<graphml>` root is in a namespace other than GraphML's; it is read as GraphML.                                                                                                                                                            |
| `E_NO_GRAPH`                       | `NO_GRAPH`               | error    | The document has no `<graph>`. The import stops.                                                                                                                                                                                               |
| `E_GRAPHML_KEY_MISSING_ID`         | `KEY_MISSING_ID`         | error    | A `<key>` without an id.                                                                                                                                                                                                                       |
| `E_DUPLICATE_KEY`                  | `DUPLICATE_KEY`          | error    | Two `<key>` elements with the same id.                                                                                                                                                                                                         |
| `W_GRAPHML_KEY_DOMAIN_UNSUPPORTED` | `KEY_DOMAIN_UNSUPPORTED` | warning  | A key declared for hyperedges, ports or endpoints (never used).                                                                                                                                                                                |
| `E_MISSING_ID`                     | `MISSING_ID`             | error    | A `<node>` without an id.                                                                                                                                                                                                                      |
| `E_MISSING_ENDPOINT`               | `MISSING_ENDPOINT`       | error    | An `<edge>` without a source or a target.                                                                                                                                                                                                      |
| `E_UNKNOWN_NODE`                   | `UNKNOWN_NODE`           | error    | An edge endpoint that names no declared node under `addMissingNodes: false`; the edge is skipped.                                                                                                                                              |
| `W_GRAPHML_GRAPH_ENDPOINT`         | `GRAPH_ENDPOINT`         | warning  | An edge endpoint that names a nested `<graph>`, not a node; a node of that id is created.                                                                                                                                                      |
| `E_UNKNOWN_PARENT`                 | `UNKNOWN_PARENT`         | error    | The nodes of a nested graph whose container node was skipped lose their parent.                                                                                                                                                                |
| `W_DUPLICATE_ATTRIBUTE`            | `DUPLICATE_ATTRIBUTE`    | warning  | Two `<data>` of one key on one element, two `<default>` in one key, or two weight keys; one is kept.                                                                                                                                           |
| `E_GRAPHML_UNKNOWN_KEY`            | `UNKNOWN_KEY`            | error    | A `<data>` whose key was never declared.                                                                                                                                                                                                       |
| `W_GRAPHML_KEY_DECLARED_LATE`      | `KEY_DECLARED_LATE`      | warning  | A `<key>` declared after `<data>` that used it; those values were already reported and dropped.                                                                                                                                                |
| `W_GRAPHML_KEY_DOMAIN`             | `KEY_DOMAIN`             | warning  | A `<data>` whose key is declared for another domain.                                                                                                                                                                                           |
| `E_GRAPHML_DATA_MISSING_KEY`       | `DATA_MISSING_KEY`       | error    | A `<data>` without a key attribute.                                                                                                                                                                                                            |
| `E_GRAPHML_KEY_FOR_INVALID`        | `KEY_FOR_INVALID`        | error    | A `<key>` whose `for` is not a GraphML domain.                                                                                                                                                                                                 |
| `W_GRAPHML_NESTED_GRAPH_DATA`      | `NESTED_GRAPH_DATA`      | warning  | Data of a nested `<graph>`; only the top-level graph has attributes.                                                                                                                                                                           |
| `W_GRAPHML_HYPEREDGE_DATA_DROPPED` | `HYPEREDGE_DATA_DROPPED` | warning  | Data of a hyperedge expanded to a star or clique.                                                                                                                                                                                              |
| `E_GRAPHML_DATA_NESTED`            | `DATA_NESTED`            | error    | Nested elements in the `<data>` of a typed (non-yfiles) key.                                                                                                                                                                                   |
| `W_DUPLICATE_NODE`                 | `DUPLICATE_NODE`         | warning  | A `<node>` declared twice.                                                                                                                                                                                                                     |
| `E_DUPLICATE_EDGE_ID`              | `DUPLICATE_EDGE_ID`      | error    | An edge id already used by another edge.                                                                                                                                                                                                       |
| `E_GRAPHML_INVALID_DIRECTED`       | `INVALID_DIRECTED`       | error    | A `directed` attribute that is neither true nor false.                                                                                                                                                                                         |
| `E_GRAPHML_INVALID_EDGEDEFAULT`    | `INVALID_EDGEDEFAULT`    | error    | An `edgedefault` that is neither directed nor undirected.                                                                                                                                                                                      |
| `W_GRAPHML_EDGEDEFAULT_MISSING`    | `EDGEDEFAULT_MISSING`    | warning  | A `<graph>` without edgedefault; the `defaultDirected` option applies.                                                                                                                                                                         |
| `W_MULTIPLE_GRAPHS`                | `MULTIPLE_GRAPHS`        | warning  | The file holds several graphs and only one was read: the first, or the one `graphIndex` or `graphName` chose. `importAllGraphs()` reads every one.                                                                                             |
| `W_COUNT_HINT`                     | `COUNT_HINT`             | warning  | A node or edge count the file announces is too large to reserve room for; it is ignored and the elements are read as they come.                                                                                                                |
| `W_COUNT_MISMATCH`                 | `COUNT_MISMATCH`         | warning  | A `parse.nodes` or `parse.edges` count disagrees with what the graph holds. The elements are read as they are.                                                                                                                                 |
| `E_HYPEREDGE`                      | `HYPEREDGE`              | error    | A hyperedge under `hyperedges: "error"`.                                                                                                                                                                                                       |
| `W_GRAPHML_HYPEREDGE_SKIPPED`      | `HYPEREDGE_SKIPPED`      | warning  | Hyperedges skipped under `hyperedges: "skip"`.                                                                                                                                                                                                 |
| `E_GRAPHML_HYPEREDGE_ENDPOINT`     | `HYPEREDGE_ENDPOINT`     | error    | An endpoint of a hyperedge without a node, or with an unknown type.                                                                                                                                                                            |
| `W_GRAPHML_PORT_DECLARATION`       | `PORT_DECLARATION`       | warning  | `<port>` declarations (and their data) are not kept; sourceport / targetport edge attributes are.                                                                                                                                              |
| `W_DANGLING_REFERENCE`             | `DANGLING_REFERENCE`     | warning  | A `sourceport` / `targetport` naming a port its node does not declare (once, with the count).                                                                                                                                                  |
| `W_GRAPHML_EDGE_GRAPH_DROPPED`     | `EDGE_GRAPH_DROPPED`     | warning  | A `<graph>` inside an `<edge>` (legal GraphML): it and the nodes and edges it holds are dropped.                                                                                                                                               |
| `W_GRAPHML_HUB_ID_CLASH`           | `HUB_ID_CLASH`           | warning  | A `<node>` whose id is that of a hub `hyperedges: "star"` created; the node is merged into the hub.                                                                                                                                            |
| `W_GRAPHML_ORIGINAL_ID_IGNORED`    | `ORIGINAL_ID_IGNORED`    | warning  | A `graphty:originalId` value that is not text, or arrives after the node was added (after its nested graph).                                                                                                                                   |
| `W_GRAPHML_YFILES_VALUE`           | `YFILES_VALUE`           | warning  | A yFiles graphics value (a geometry coordinate, a width) that is not a number; it is not mapped.                                                                                                                                               |
| `W_GRAPHML_PARSE_HINT_IGNORED`     | `PARSE_HINT_IGNORED`     | warning  | A GraphML `parse.*` attribute (`parse.nodeids`, `parse.order`, ...) that graph-io does not act on; the file is read normally.                                                                                                                  |
| `W_UNKNOWN_XML_ATTRIBUTE`          | `UNKNOWN_XML_ATTRIBUTE`  | warning  | An XML attribute GraphML does not define (or the importer does not keep) on an element; it is not kept.                                                                                                                                        |
| `W_GRAPHML_LOCATOR_DROPPED`        | `LOCATOR_DROPPED`        | warning  | A `<locator>` element.                                                                                                                                                                                                                         |
| `W_GRAPHML_DESC_DROPPED`           | `DESC_DROPPED`           | warning  | A `<desc>` of a node, an edge or a hyperedge.                                                                                                                                                                                                  |
| `W_UNKNOWN_ELEMENT`                | `UNKNOWN_ELEMENT`        | warning  | An element the GraphML schema does not define at that place.                                                                                                                                                                                   |
| `W_STRAY_TEXT`                     | `STRAY_TEXT`             | warning  | Non-whitespace text where the schema allows only elements.                                                                                                                                                                                     |
| `W_ID_MERGED`                      | `ID_MERGED`              | warning  | Two distinct id texts merged into one number under `ids: "number"`.                                                                                                                                                                            |
| `W_OPTION_IGNORED`                 | `OPTION_IGNORED`         | warning  | You set an option this format does not use; it had no effect. The message names the option.                                                                                                                                                    |
| `W_GRAPHML_YFILES_SKIPPED`         | `YFILES_SKIPPED`         | warning  | A yFiles key under `yfiles: "skip"`.                                                                                                                                                                                                           |
| `W_COLUMN_RENAMED`                 | `COLUMN_RENAMED`         | warning  | An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example a repeated column header.                                                                                                               |
| `W_ROLE_TAKEN`                     | `ROLE_TAKEN`             | warning  | You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.                                                                                                            |
| `W_UNKNOWN_ATTR_TYPE`              | `UNKNOWN_ATTR_TYPE`      | warning  | A declared type the format does not define (kept as string).                                                                                                                                                                                   |
| `W_BAD_DEFAULT`                    | `BAD_DEFAULT`            | warning  | A default that does not parse as the declared type.                                                                                                                                                                                            |
| `W_PRECISION`                      | `PRECISION`              | warning  | An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit.                                                                                                                                      |
| `W_SINK_OPTION`                    | `SINK_OPTION`            | warning  | You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.                                          |
| `W_DIRECTION_REFUSED`              | `DIRECTION_REFUSED`      | warning  | You read into a graph builder whose direction is already set, or which already holds edges, so the file is read with the builder's direction instead of its own.                                                                               |
| `W_DIRECTION_FORCED`               | `DIRECTION_FORCED`       | warning  | Edges of the other direction were read with the direction `onMixedDirection` chose.                                                                                                                                                            |
| `E_MIXED_DIRECTION`                | `MIXED_DIRECTION`        | error    | The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a format that holds one direction per file fails with `E_DIRECTED`. Pass "directed" or "undirected" to read or write it anyway. |

Like every format, it can also record the codes for unreadable input: [`E_EMPTY_INPUT`](../codes.md#E_EMPTY_INPUT), [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED).

## Loss codes

The codes `checkExport(snapshot, "graphml", options)` can return before a save, also exported as `GRAPHML_LOSS` from `@graphty/graph-io/graphml`. An `E_` code means the save throws unless you change the graph or the options. A save can also return the [shared loss codes](../codes.md#shared-loss-codes) that any format can.

| Code                              | Key                     | Severity            | Meaning                                                                                                 |
| --------------------------------- | ----------------------- | ------------------- | ------------------------------------------------------------------------------------------------------- |
| `W_GRAPHML_YFILES_JSON`           | `YFILES_JSON`           | warning             | YFiles nested XML kept as a JSON tree: structure preserved, not byte-exact.                             |
| `W_MUTUAL_AS_UNDIRECTED`          | `MUTUAL_AS_UNDIRECTED`  | warning             | A mutual pair written as one undirected edge; the mark is lost.                                         |
| `W_PARENTS_DROPPED`               | `PARENTS_DROPPED`       | warning             | A `parents` (multi-parent) column cannot be written as nested graphs.                                   |
| `W_ROLE_DROPPED`                  | `ROLE_DROPPED`          | warning             | An attribute with a role the format has no place for is written as a plain attribute; the role is lost. |
| `W_GRAPHML_HIERARCHY_REORDERED`   | `HIERARCHY_REORDERED`   | warning             | Containment order differs from index order; node indices change after a round trip.                     |
| `W_GRAPHML_PARENT_CYCLE`          | `PARENT_CYCLE`          | warning             | Nodes whose parent chain never reaches a root are written at the top level.                             |
| `W_ID_TEXT_TYPE`                  | `ID_TEXT_TYPE`          | warning             | Node ids that read back as a different type, such as the text "7" as the number 7.                      |
| `W_GRAPHML_EDGE_ID_TEXT`          | `EDGE_ID_TEXT`          | warning             | A numeric edge id column reads back as string.                                                          |
| `W_GRAPHML_YFILES_GRAPHICS_STALE` | `YFILES_GRAPHICS_STALE` | warning             | A `yfiles.*` graphics column that no longer matches its yFiles tree: only the tree is written.          |
| `E_GRAPHML_YFILES_TREE`           | `YFILES_TREE`           | error (save throws) | A yEd graphics value that is not valid XML; the save fails with `E_COLUMN_TYPE`.                        |

<!-- generated:end -->
