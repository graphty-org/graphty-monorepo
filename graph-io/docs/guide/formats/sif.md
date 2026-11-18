# SIF

SIF, the Simple Interaction Format, is the plain text network format of
[Cytoscape](https://cytoscape.org/) and of many pathway and protein interaction databases. Each line
is `source interaction target`, such as `YAL001C pp YBR236C`.

## At a glance

<!-- generated:begin glance:sif -->

|                         |                         |
| ----------------------- | ----------------------- |
| Import from             | `@graphty/graph-io/sif` |
| Format name             | `sif`                   |
| Extensions              | `.sif`                  |
| MIME types              | none                    |
| Reads                   | yes                     |
| Writes                  | yes                     |
| Several graphs per file | no                      |
| Lists its graphs        | no                      |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/sif -->

```ts
import { checkExport, exportGraphToString, importGraph } from "@graphty/graph-io";

// Two interactions, one with two targets, and a protein with no interactions
const text = "YAL001C\tpp\tYBR236C\nYBR236C\tpd\tYCR010W\tYDL159W\nYGL200C\n";
const { snapshot } = await importGraph(text, { filename: "network.sif" });
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
for (let e = 0; e < snapshot.edgeCount; e++) {
    const from = snapshot.ids.idOf(snapshot.edgeSource(e));
    const to = snapshot.ids.idOf(snapshot.edgeTarget(e));
    console.log(`${String(from)} ${String(snapshot.edges.value("interaction", e))} ${String(to)}`);
}

// Save it again: SIF keeps the nodes, the edges and their interactions, nothing else
console.log(checkExport(snapshot, "sif").length === 0 ? "nothing lost" : "something lost");
console.log(await exportGraphToString(snapshot, "sif"));
```

<!-- generated:end -->

<!-- generated:begin output:formats/sif -->

```text
5 nodes, 3 edges
YAL001C pp YBR236C
YBR236C pd YCR010W
YBR236C pd YDL159W
nothing lost
YAL001C	pp	YBR236C
YBR236C	pd	YCR010W
YBR236C	pd	YDL159W
YGL200C
```

<!-- generated:end -->

Every edge goes from the source to the target, and the `interaction` column holds its interaction
(`pp`, `pd`, ...). The column is the graph's edge kind, so formats with an edge kind keep it.

## How graph-io reads it

- A line `source interaction target1 target2 ...` is one edge to each target, all with the same
  interaction.
- A line with a single name is a node with no edges, so a network can list proteins that have no
  interactions.
- As in Cytoscape, a file that holds any tab separates its fields with tabs only, so names may
  contain spaces (`IRAK Complex`); a file without tabs separates them with spaces.
- Edges are directed, as Cytoscape reads them. Pass `defaultDirected: false` for an undirected graph.
- A line with a name and an interaction but no target keeps the node and adds no edge
  (`W_SIF_NO_TARGET`).

## What a saved file keeps and loses

graph-io writes one `source<TAB>interaction<TAB>target` line per edge, so names with spaces are kept.
A node with no edges gets a line of its own, as do the nodes needed to keep the node order.

- The interaction comes from the edge kind column (the `interaction` column of a file read as SIF,
  CX, CX2, XGMML or a Cytoscape session). An edge without one is written with the interaction `-`,
  as Cytoscape writes it (`W_SIF_INTERACTION_ADDED`).
- Every edge reads back directed (`W_SIF_UNDIRECTED_AS_DIRECTED`).
- Node and edge attributes, weights, edge ids and graph attributes are not written.
- A name or interaction that is empty, starts or ends with a space, or holds a tab or a line break
  cannot be written (`E_SIF_TEXT`).

<!-- generated:begin capabilities:sif -->

What a saved file can hold (the [capabilities](./index.md#what-the-capabilities-mean) explain each row):

| Capability                                      | Value |
| ----------------------------------------------- | ----- |
| [`mixedDirection`](./index.md#mixeddirection)   | no    |
| [`multiEdges`](./index.md#multiedges)           | yes   |
| [`selfLoops`](./index.md#selfloops)             | yes   |
| [`edgeIds`](./index.md#edgeids)                 | none  |
| [`idCharset`](./index.md#idcharset)             | any   |
| [`dtypes`](./index.md#dtypes)                   | dict  |
| [`components`](./index.md#components)           | no    |
| [`lists`](./index.md#lists)                     | no    |
| [`json`](./index.md#json)                       | no    |
| [`defaults`](./index.md#defaults)               | no    |
| [`options`](./index.md#options)                 | no    |
| [`hierarchy`](./index.md#hierarchy)             | no    |
| [`temporal`](./index.md#temporal)               | none  |
| [`graphAttributes`](./index.md#graphattributes) | no    |
| [`positions`](./index.md#positions)             | no    |
| [`viz`](./index.md#viz)                         | no    |
| [`styles`](./index.md#styles)                   | none  |

<!-- generated:end -->

## Styles

<!-- generated:begin styles:sif -->

|               |                                                                           |
| ------------- | ------------------------------------------------------------------------- |
| Reads styles  | no: the format has no styles                                              |
| Writes styles | no: every style is lost (`W_STYLE_NOT_WRITTEN`, `W_STYLE_RULES_NOT_KEPT`) |

<!-- generated:end -->

<!-- generated:begin reference:sif -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

This format has no options of its own.

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

This format has no options of its own.

## Import issue codes

The codes this format's import report can hold. They are also exported as `SIF_ISSUE` from `@graphty/graph-io/sif`, keyed by the code without its `E_` / `W_` and `SIF_` prefixes.

- `E_INVALID_UTF8` (error): The input is not valid UTF-8. The import stops.
- `E_INVALID_ENCODING` (error): Some bytes are not valid in the encoding that was chosen (by a byte order mark or the `encoding` option). The import stops.
- `W_ENCODING_FALLBACK` (warning): Bytes that are not UTF-8 and declare no encoding were read as windows-1252.
- `W_UNKNOWN_ENCODING` (warning): A declared encoding the platform cannot decode was ignored.
- `W_SIF_NO_TARGET` (warning): A line with a node and an interaction but no target: the node is kept and no edge is added.
- `W_COLUMN_RENAMED` (warning): You read into a graph builder that already has a column named `interaction` of another type, so it was renamed.
- `W_ROLE_TAKEN` (warning): You read into a graph builder that already has an edge kind column, so `interaction` is kept as a plain attribute.
- `W_OPTION_IGNORED` (warning): You set an option this format does not use; it had no effect. The message names the option.
- `W_SINK_OPTION` (warning): You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.

Like every format, it can also record the codes for unreadable input and for elements the graph refuses: [`E_EMPTY_INPUT`](../codes.md#E_EMPTY_INPUT), [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED), [`E_INVALID_ID`](../codes.md#E_INVALID_ID), [`E_UNKNOWN_NODE`](../codes.md#E_UNKNOWN_NODE), [`E_INVALID_WEIGHT`](../codes.md#E_INVALID_WEIGHT), [`E_DUPLICATE_EDGE`](../codes.md#E_DUPLICATE_EDGE), [`E_SELF_LOOP`](../codes.md#E_SELF_LOOP), [`E_DUPLICATE_EDGE_ID`](../codes.md#E_DUPLICATE_EDGE_ID).

## Loss codes

The codes `checkExport(snapshot, "sif", options)` can return before a save, also exported as `SIF_LOSS` from `@graphty/graph-io/sif`. An `E_` code means the save throws unless you change the graph or the options.

- `E_SIF_TEXT` (error, the save throws): A node id or an interaction is empty, starts or ends with whitespace, or holds a tab or a line break, which SIF cannot write; the save fails with `E_UNSUPPORTED`.
- `W_SIF_INTERACTION_ADDED` (warning): Edges without an interaction are written with the interaction `-`, which reads back as their kind.
- `W_SIF_UNDIRECTED_AS_DIRECTED` (warning): SIF has no undirected edges: the edges of an undirected graph, and the undirected edges of a mixed one, read back as directed.
- `W_MUTUAL_EXPANDED` (warning): A mutual pair is written as two edges without the mutual mark.
- `W_COLUMN_DROPPED` (warning): An attribute SIF does not write: every node attribute, and every edge attribute but the interaction.
- `W_COLUMN_NAME_CHANGED` (warning): The interaction column is named otherwise; it reads back as `interaction`.
- `W_STORAGE_CLASS_CHANGED` (warning): A text interaction column reads back as a dictionary column. The values are the same.

When the graph has something this format cannot hold, it can also return the [shared loss codes](../codes.md#shared-loss-codes): [`E_ID_CHARSET`](../codes.md#E_ID_CHARSET), [`E_ID_TEXT_COLLISION`](../codes.md#E_ID_TEXT_COLLISION), [`E_MIXED_DIRECTION`](../codes.md#E_MIXED_DIRECTION), [`E_XML_ILLEGAL_CHAR`](../codes.md#E_XML_ILLEGAL_CHAR), [`W_COMPONENTS_FLATTENED`](../codes.md#W_COMPONENTS_FLATTENED), [`W_DEFAULT_DROPPED`](../codes.md#W_DEFAULT_DROPPED), [`W_DTYPE_UNSUPPORTED`](../codes.md#W_DTYPE_UNSUPPORTED), [`W_DYNAMIC_VALUES_DROPPED`](../codes.md#W_DYNAMIC_VALUES_DROPPED), [`W_EDGE_IDS_DROPPED`](../codes.md#W_EDGE_IDS_DROPPED), [`W_EDGE_IDS_GENERATED`](../codes.md#W_EDGE_IDS_GENERATED), [`W_EMPTY_COLUMN_DROPPED`](../codes.md#W_EMPTY_COLUMN_DROPPED), [`W_EXTENSION_TABLE_DROPPED`](../codes.md#W_EXTENSION_TABLE_DROPPED), [`W_GRAPH_ATTRIBUTES_DROPPED`](../codes.md#W_GRAPH_ATTRIBUTES_DROPPED), [`W_HIERARCHY_DROPPED`](../codes.md#W_HIERARCHY_DROPPED), [`W_ID_MANGLED`](../codes.md#W_ID_MANGLED), [`W_ID_RENUMBERED`](../codes.md#W_ID_RENUMBERED), [`W_ID_TEXT_RENAMED`](../codes.md#W_ID_TEXT_RENAMED), [`W_ID_TEXT_TYPE`](../codes.md#W_ID_TEXT_TYPE), [`W_INTEGRAL_F64_AS_I32`](../codes.md#W_INTEGRAL_F64_AS_I32), [`W_JSON_UNSUPPORTED`](../codes.md#W_JSON_UNSUPPORTED), [`W_LIST_UNSUPPORTED`](../codes.md#W_LIST_UNSUPPORTED), [`W_MIXED_DIRECTION`](../codes.md#W_MIXED_DIRECTION), [`W_MULTI_EDGES`](../codes.md#W_MULTI_EDGES), [`W_MUTUAL_AS_UNDIRECTED`](../codes.md#W_MUTUAL_AS_UNDIRECTED), [`W_NONFINITE_AS_NULL`](../codes.md#W_NONFINITE_AS_NULL), [`W_OPEN_INTERVAL`](../codes.md#W_OPEN_INTERVAL), [`W_OPTIONS_DROPPED`](../codes.md#W_OPTIONS_DROPPED), [`W_OPTIONS_GAINED`](../codes.md#W_OPTIONS_GAINED), [`W_PARENTS_DROPPED`](../codes.md#W_PARENTS_DROPPED), [`W_POSITIONS_DROPPED`](../codes.md#W_POSITIONS_DROPPED), [`W_ROLE_ASSUMED`](../codes.md#W_ROLE_ASSUMED), [`W_ROLE_DROPPED`](../codes.md#W_ROLE_DROPPED), [`W_SELF_LOOPS`](../codes.md#W_SELF_LOOPS), [`W_SPELLS_DROPPED`](../codes.md#W_SPELLS_DROPPED), [`W_TEMPORAL_DROPPED`](../codes.md#W_TEMPORAL_DROPPED), [`W_TEMPORAL_TEXT_DROPPED`](../codes.md#W_TEMPORAL_TEXT_DROPPED), [`W_TEXT_INFERRED`](../codes.md#W_TEXT_INFERRED), [`W_VIZ_DROPPED`](../codes.md#W_VIZ_DROPPED), [`W_WEIGHTS_DROPPED`](../codes.md#W_WEIGHTS_DROPPED), [`W_WEIGHT_KEY_CLASH`](../codes.md#W_WEIGHT_KEY_CLASH).

<!-- generated:end -->
