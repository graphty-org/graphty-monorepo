# CX

[CX](<https://cytoscape.org/cx/specification/cytoscape-exchange-format-specification-(version-1)/>)
is version 1 of the Cytoscape exchange format, still served by [NDEx](https://www.ndexbio.org/)
and read by Cytoscape. Prefer [CX2](./cx2.md) for NDEx and Cytoscape 3.10 and later; use CX for
tools that only read version 1.

## At a glance

<!-- generated:begin glance:cx -->

|                         |                         |
| ----------------------- | ----------------------- |
| Import from             | `@graphty/graph-io/cx`  |
| Format name             | `cx`                    |
| Extensions              | `.cx`                   |
| MIME types              | `application/json`      |
| Reads                   | yes                     |
| Writes                  | yes                     |
| Several graphs per file | yes (`importAllGraphs`) |
| Lists its graphs        | yes (`listGraphs`)      |

What a saved file can hold (the [capabilities](./index.md#what-the-capabilities-mean) explain each row):

| Capability                                      | Value                  |
| ----------------------------------------------- | ---------------------- |
| [`mixedDirection`](./index.md#mixeddirection)   | no                     |
| [`multiEdges`](./index.md#multiedges)           | yes                    |
| [`selfLoops`](./index.md#selfloops)             | yes                    |
| [`edgeIds`](./index.md#edgeids)                 | required               |
| [`idCharset`](./index.md#idcharset)             | integer                |
| [`dtypes`](./index.md#dtypes)                   | string, f64, i32, bool |
| [`components`](./index.md#components)           | no                     |
| [`lists`](./index.md#lists)                     | yes                    |
| [`json`](./index.md#json)                       | no                     |
| [`defaults`](./index.md#defaults)               | no                     |
| [`options`](./index.md#options)                 | no                     |
| [`hierarchy`](./index.md#hierarchy)             | yes                    |
| [`temporal`](./index.md#temporal)               | none                   |
| [`graphAttributes`](./index.md#graphattributes) | yes                    |
| [`positions`](./index.md#positions)             | yes                    |
| [`viz`](./index.md#viz)                         | no                     |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/cx -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got.cx"), { filename: "got.cx" });
console.log(`${snapshot.nodeCount} nodes; node columns: ${snapshot.nodes.names().join(", ")}`);

// CX node ids are integers, so a graph with text ids needs sanitizeIds: "mangle"
const got = await importGraph(await readFile("got-network.graphml"), { filename: "got-network.graphml" });
console.log(checkExport(got.snapshot, "cx").map((n) => n.code));
const options = { sanitizeIds: "mangle" } as const;
console.log(checkExport(got.snapshot, "cx", options).map((n) => n.code));
await writeFile("got-copy.cx", await exportGraphToBytes(got.snapshot, "cx", options));
```

<!-- generated:end -->

<!-- generated:begin output:formats/cx -->

```text
107 nodes; node columns: name
[
  'W_COLUMN_NAME_CHANGED',
  'W_CX_UNDIRECTED_AS_DIRECTED',
  'E_ID_CHARSET',
  'W_DTYPE_UNSUPPORTED'
]
[
  'W_COLUMN_NAME_CHANGED',
  'W_CX_UNDIRECTED_AS_DIRECTED',
  'W_ID_MANGLED',
  'W_DTYPE_UNSUPPORTED'
]
```

<!-- generated:end -->

CX node ids are integers, so the Game of Thrones graph, whose ids are names, is refused
(`E_ID_CHARSET`) until you pass `sanitizeIds: "mangle"`. graph-io writes the form NDEx and Cytoscape
both open: one network with at most one view.

## How graph-io reads it

- The document is read element by element, and its aspects can come in any order.
- Every edge is directed. Ids follow the same rule as CX2.
- `n` is the `name` label, `r` the `represents` column and `i` the `interaction` column.
- Attributes are typed by their `d`. As in Cytoscape, `""` and `"null"` mean no value and `"NaN"`
  is NaN in a double attribute. An attribute that appears with several types takes the widest one
  (`W_WIDENED`).
- A collection (several `cySubNetworks`) holds one graph per subnetwork. `listGraphs()` lists them
  and `graphIndex` / `graphName` choose one; see
  [Files that hold several graphs](../loading.md#files-that-hold-several-graphs). A subnetwork's own
  values beat the shared ones, and nodes or edges that no subnetwork holds are not read
  (`W_CX_ROOT_ONLY`).
- Positions come from the subnetwork's view, with y negated so it points up; other views become
  `position@2`, `position@3`, ... columns.
- `cyGroups` become a parent column. A group whose id is not a node gets a node
  (`W_CX_GROUP_NODE_ADDED`).
- Per-element visual properties become one column per property. Style rules are kept in the
  snapshot's metadata and written back, but not applied (`W_STYLES_NOT_IMPORTED`).
- Citations and supports become the tables `cx:citations` and `cx:supports` in
  `snapshot.extensions`.
- Older aspect names (`visualProperties`, `subNetworks`, ...) are read with a warning
  (`W_CX_OLD_ASPECT_NAME`). A CX2 document is refused with a pointer to the CX2 format
  (`E_CX_NOT_CX`).

## What a saved file keeps and loses

What does not survive:

- Edge direction: the format has directed edges only. A fully undirected graph is written with
  every edge directed (`W_CX_UNDIRECTED_AS_DIRECTED`) and reads back directed. A graph with both directed and undirected
  edges is refused (`E_MIXED_DIRECTION`) until you pass `onMixedDirection: "directed"` or
  `"undirected"`.
- Node ids that are not integers. They need `sanitizeIds: "mangle"`, which keeps the original in a
  `graphty:originalId` attribute that graph-io turns back into the id.
- JSON values are written as text (`W_CX_JSON_AS_STRING`).
- A NaN or infinite position, and a NaN weight, are not written (`W_NONFINITE_AS_NULL`). NaN and
  the infinities in double attributes survive.
- Edge ids are generated when the graph has none (`W_EDGE_IDS_GENERATED`).

A file read from CX gets its citations, supports, style rules and other aspects back.

<!-- generated:begin reference:cx -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option       | Type                     | Default    | Meaning                                                                                                                                                                                                                 |
| ------------ | ------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zAs`        | `"column" \| "position"` | `"column"` | Where Cytoscape's `z` value (a drawing order, not a depth) goes: "column" keeps it as a node attribute named `z`; "position" makes it the third coordinate of the position.                                             |
| `graphIndex` | `number`                 | `0`        | The 0-based position of the graph to read from a file that holds several (`listGraphs()` gives each graph's `index`). A position past the last graph fails with `E_GRAPH_NOT_FOUND`.                                    |
| `graphName`  | `string`                 |            | The name of the graph to read from a file that holds several (`listGraphs()` gives each graph's `name`). A name no graph has fails with `E_GRAPH_NOT_FOUND`, and a name two graphs share with `E_AMBIGUOUS_GRAPH_NAME`. |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

This format has no options of its own.

## Import issue codes

The codes this format's import report can hold, also exported as `CX_ISSUE` from `@graphty/graph-io/cx`.

| Code                        | Key                       | Severity | Meaning                                                                                                                                                                                               |
| --------------------------- | ------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_SYNTAX`                  | `SYNTAX`                  | error    | The text is not valid JSON. The import stops.                                                                                                                                                         |
| `E_INVALID_UTF8`            | `INVALID_UTF8`            | error    | The input is not valid UTF-8. The import stops.                                                                                                                                                       |
| `E_INVALID_ENCODING`        | `INVALID_ENCODING`        | error    | Some bytes are not valid in the encoding that was chosen (by a byte order mark or the `encoding` option). The import stops.                                                                           |
| `W_ENCODING_FALLBACK`       | `ENCODING_FALLBACK`       | warning  | Bytes that are not UTF-8 were read as windows-1252.                                                                                                                                                   |
| `W_UNKNOWN_ENCODING`        | `UNKNOWN_ENCODING`        | warning  | An encoding the platform cannot decode was ignored.                                                                                                                                                   |
| `E_CX_NOT_CX`               | `NOT_CX`                  | error    | The document is not a CX array, or it is CX2 (the message says so; read it as `cx2`). The import stops.                                                                                               |
| `W_CX_NUMBER_VERIFICATION`  | `NUMBER_VERIFICATION`     | warning  | NumberVerification holds another value than 2^48 - 1, or comes twice.                                                                                                                                 |
| `W_CX_OLD_ASPECT_NAME`      | `OLD_ASPECT_NAME`         | warning  | An old Cytoscape aspect name (visualProperties, subNetworks, ...) read under its cy name.                                                                                                             |
| `W_CX_GROUP_NODE_ADDED`     | `GROUP_NODE_ADDED`        | warning  | A cyGroups group whose id is not a node: the group node is added.                                                                                                                                     |
| `W_CX_ROOT_ONLY`            | `ROOT_ONLY`               | warning  | Nodes or edges of the root network that no subnetwork holds: Cytoscape shows them in no network; not read.                                                                                            |
| `E_STATUS_FAILED`           | `STATUS_FAILED`           | error    | The program that wrote the file marked it as failed, so it is incomplete. The import stops.                                                                                                           |
| `W_STATUS_WARNING`          | `STATUS_WARNING`          | warning  | The producer marked the document as successful with an error text.                                                                                                                                    |
| `E_BAD_ASPECT_BLOCK`        | `BAD_ASPECT_BLOCK`        | error    | A member of the array that is not a one-key aspect block, or an element that is not an object.                                                                                                        |
| `W_ASPECT_ORDER`            | `ASPECT_ORDER`            | warning  | An aspect after the post-metadata or after the status, a third metaData.                                                                                                                              |
| `W_COUNT_MISMATCH`          | `COUNT_MISMATCH`          | warning  | A metaData element count disagrees with what was read.                                                                                                                                                |
| `E_BAD_VALUE`               | `BAD_VALUE`               | error    | A value that does not parse as its data type; the cell is unset.                                                                                                                                      |
| `W_WIDENED`                 | `WIDENED`                 | warning  | An attribute's type was widened because a later value did not fit: an integer above 2^31 in an integer column, or two declared types for one attribute.                                               |
| `W_UNKNOWN_ATTR_TYPE`       | `UNKNOWN_ATTR_TYPE`       | warning  | A data type CX does not define; the value is kept as text.                                                                                                                                            |
| `W_DANGLING_REFERENCE`      | `DANGLING_REFERENCE`      | warning  | An attribute, layout, bypass, subnetwork member, view or provenance entry naming nothing.                                                                                                             |
| `W_DUPLICATE_ATTRIBUTE`     | `DUPLICATE_ATTRIBUTE`     | warning  | The same attribute twice on one element (or n and a different name attribute); the later wins.                                                                                                        |
| `E_UNKNOWN_PARENT`          | `UNKNOWN_PARENT`          | error    | A group member naming no node.                                                                                                                                                                        |
| `E_PARENT_CYCLE`            | `PARENT_CYCLE`            | error    | A group membership that would close a parent cycle; dropped.                                                                                                                                          |
| `W_STYLES_NOT_IMPORTED`     | `STYLES_NOT_IMPORTED`     | warning  | The style rules of cyVisualProperties are not applied; they are kept so a CX export writes them back.                                                                                                 |
| `E_MISSING_ID`              | `MISSING_ID`              | error    | A node without an                                                                                                                                                                                     |
| `E_MISSING_ENDPOINT`        | `MISSING_ENDPOINT`        | error    | An edge without s or t.                                                                                                                                                                               |
| `W_DUPLICATE_NODE`          | `DUPLICATE_NODE`          | warning  | A node id declared twice; the second merges into the first.                                                                                                                                           |
| `E_DUPLICATE_EDGE_ID`       | `DUPLICATE_EDGE_ID`       | error    | An edge id declared twice; the second edge is skipped.                                                                                                                                                |
| `E_INVALID_ID`              | `INVALID_ID`              | error    | An id that is not an integer.                                                                                                                                                                         |
| `W_UNKNOWN_ELEMENT`         | `UNKNOWN_ELEMENT`         | warning  | A node or edge key CX does not define, an aspect graph-io keeps for writing back, or a table CX does not define; it is skipped.                                                                       |
| `W_MULTI_ASPECT_FRAGMENT`   | `MULTI_ASPECT_FRAGMENT`   | warning  | A member holding several aspects; each array-valued key is read as its own fragment.                                                                                                                  |
| `W_SINGLE_OBJECT_ASPECT`    | `SINGLE_OBJECT_ASPECT`    | warning  | An aspect written as one object, not an array of elements; read as one element.                                                                                                                       |
| `W_JSON_NONSTANDARD_NUMBER` | `JSON_NONSTANDARD_NUMBER` | warning  | The bare tokens NaN / Infinity / -Infinity (Python's json writes them), read as numbers.                                                                                                              |
| `E_UNKNOWN_NODE`            | `UNKNOWN_NODE`            | error    | An edge endpoint naming no node of the graph (addMissingNodes false, the default).                                                                                                                    |
| `E_INVALID_WEIGHT`          | `INVALID_WEIGHT`          | error    | A weight that is not a number.                                                                                                                                                                        |
| `W_ID_TEXT_TYPE`            | `ID_TEXT_TYPE`            | warning  | An id spelled as a string or a non-integer literal; read as the integer.                                                                                                                              |
| `W_PRECISION`               | `PRECISION`               | warning  | An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit.                                                                                             |
| `W_ID_MERGED`               | `ID_MERGED`               | warning  | Two id texts merged under `ids: "number"`.                                                                                                                                                            |
| `W_MULTIPLE_GRAPHS`         | `MULTIPLE_GRAPHS`         | warning  | The file holds several graphs and only one was read: the first, or the one `graphIndex` or `graphName` chose. `importAllGraphs()` reads every one.                                                    |
| `E_GRAPH_NOT_FOUND`         | `GRAPH_NOT_FOUND`         | error    | `graphIndex` or `graphName` matches no subnetwork. The import stops.                                                                                                                                  |
| `E_AMBIGUOUS_GRAPH_NAME`    | `AMBIGUOUS_GRAPH_NAME`    | error    | `graphName` matches several subnetworks. The import stops.                                                                                                                                            |
| `E_NO_GRAPH`                | `NO_GRAPH`                | error    | The input holds no graph. The import stops.                                                                                                                                                           |
| `W_COLUMN_RENAMED`          | `COLUMN_RENAMED`          | warning  | An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example a repeated column header.                                                                      |
| `W_ROLE_TAKEN`              | `ROLE_TAKEN`              | warning  | You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.                                                                   |
| `W_DIRECTION_REFUSED`       | `DIRECTION_REFUSED`       | warning  | You read into a graph builder whose direction is already set, or which already holds edges, so the file is read with the builder's direction instead of its own.                                      |
| `W_DIRECTION_FORCED`        | `DIRECTION_FORCED`        | warning  | Edges of the other direction were read with the direction `onMixedDirection` chose.                                                                                                                   |
| `W_OPTION_IGNORED`          | `OPTION_IGNORED`          | warning  | You set an option this format does not use; it had no effect. The message names the option.                                                                                                           |
| `W_SINK_OPTION`             | `SINK_OPTION`             | warning  | You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies. |

Like every format, it can also record the codes for unreadable input: [`E_EMPTY_INPUT`](../codes.md#E_EMPTY_INPUT), [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED).

## Loss codes

The codes `checkExport(snapshot, "cx", options)` can return before a save, also exported as `CX_LOSS` from `@graphty/graph-io/cx`. An `E_` code means the save throws unless you change the graph or the options. A save can also return the [shared loss codes](../codes.md#shared-loss-codes) that any format can.

| Code                          | Key                       | Severity            | Meaning                                                                                                                                                                  |
| ----------------------------- | ------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `W_CX_UNDIRECTED_AS_DIRECTED` | `UNDIRECTED_AS_DIRECTED`  | warning             | Every edge is written as directed, so an undirected graph, or the undirected edges of a mixed graph, read back as directed.                                              |
| `W_CX_JSON_AS_STRING`         | `JSON_AS_STRING`          | warning             | A nested (json) column is written as a string attribute holding its JSON text.                                                                                           |
| `W_MUTUAL_EXPANDED`           | `MUTUAL_EXPANDED`         | warning             | A mutual pair is written as two directed edges without its mark.                                                                                                         |
| `W_WEIGHT_KEY_CLASH`          | `WEIGHT_KEY_CLASH`        | warning             | An attribute named `weight` without the weight role reads back as the edge weight, or is not written when the graph has weights of its own.                              |
| `W_TEMPORAL_DROPPED`          | `TEMPORAL_DROPPED`        | warning             | A start / end / timestamp column: CX has no time.                                                                                                                        |
| `W_ROLE_DROPPED`              | `ROLE_DROPPED`            | warning             | An attribute with a role the format has no place for is written as a plain attribute; the role is lost.                                                                  |
| `W_ROLE_ASSUMED`              | `ROLE_ASSUMED`            | warning             | An attribute without a role is written where the format keeps a role (a `name` column as the label, say), and reads back with that role.                                 |
| `W_DTYPE_UNSUPPORTED`         | `DTYPE_UNSUPPORTED`       | warning             | An attribute type CX stores as another (a 32-bit float as double, an unsigned integer as long, a byte as integer, a dictionary as string); it reads back with that type. |
| `W_COMPONENTS_FLATTENED`      | `COMPONENTS_FLATTENED`    | warning             | A multi-component column (a second view's `position@2`, a vector) is written as a list of doubles.                                                                       |
| `W_DEFAULT_DROPPED`           | `DEFAULT_DROPPED`         | warning             | A declared default: CX has none.                                                                                                                                         |
| `W_OPTIONS_DROPPED`           | `OPTIONS_DROPPED`         | warning             | Declared options: CX has no enumerations.                                                                                                                                |
| `E_ID_CHARSET`                | `ID_CHARSET`              | error (save throws) | Node ids the format cannot write, under `sanitizeIds: "error"`; the save fails with `E_INVALID_ID`. Pass `sanitizeIds: "mangle"` to rewrite them.                        |
| `W_ID_MANGLED`                | `ID_MANGLED`              | warning             | Node ids that are not integers under sanitizeIds "mangle": renumbered, originals kept.                                                                                   |
| `W_EDGE_IDS_GENERATED`        | `EDGE_IDS_GENERATED`      | warning             | Edges without a usable integer id get generated ids.                                                                                                                     |
| `W_COLUMN_NAME_CHANGED`       | `COLUMN_NAME_CHANGED`     | warning             | An attribute with a role (the label, say) is written where the format keeps that role, and reads back under the name the format's importer gives it.                     |
| `W_EXTENSION_TABLE_DROPPED`   | `EXTENSION_TABLE_DROPPED` | warning             | An extension table other than the `cx:citations` / `cx:supports` tables a CX import creates.                                                                             |
| `W_NONFINITE_AS_NULL`         | `NONFINITE_AS_NULL`       | warning             | A position, stacking order or weight that is NaN or infinite: CX spells no such number there.                                                                            |
| `W_VIZ_DROPPED`               | `VIZ_DROPPED`             | warning             | Visual columns (color, size, shape, thickness roles): CX keeps style as visual properties, not roles.                                                                    |

<!-- generated:end -->
