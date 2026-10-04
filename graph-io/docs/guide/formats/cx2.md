# CX2

[CX2](<https://cytoscape.org/cx/cx2/specification/cytoscape-exchange-format-specification-(version-2)/>)
is the JSON exchange format of [NDEx](https://www.ndexbio.org/), Cytoscape 3.10 and later, and
Cytoscape Web.

## At a glance

<!-- generated:begin glance:cx2 -->

|                         |                         |
| ----------------------- | ----------------------- |
| Import from             | `@graphty/graph-io/cx2` |
| Format name             | `cx2`                   |
| Extensions              | `.cx2`                  |
| MIME types              | `application/json`      |
| Reads                   | yes                     |
| Writes                  | yes                     |
| Several graphs per file | no                      |
| Lists its graphs        | no                      |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/cx2 -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot, report } = await importGraph(await readFile("got.cx2"), { filename: "got.cx2" });
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges, first id ${String(snapshot.ids.idOf(0))}`);
console.log(report.issues.map((i) => i.code));

// The ids were restored to the names, which CX2 cannot hold as ids, so saving needs "mangle" again
const options = { sanitizeIds: "mangle" } as const;
console.log(checkExport(snapshot, "cx2", options).map((n) => n.code));
await writeFile("got-copy.cx2", await exportGraphToBytes(snapshot, "cx2", options));
```

<!-- generated:end -->

<!-- generated:begin output:formats/cx2 -->

```text
107 nodes, 352 edges, first id Aemon
[]
[ 'W_ID_MANGLED' ]
```

<!-- generated:end -->

`got.cx2` was saved with `sanitizeIds: "mangle"`, so its node ids are numbers and graph-io reads
the character names back as the ids. Saving to CX2 again needs the same option.

A CX2 file from Cytoscape or NDEx usually has style rules. graph-io keeps them, and the file's
other aspects, in the snapshot's metadata and writes them back when you save as CX2, although it
does not apply them to the graph (`W_STYLES_NOT_IMPORTED`).

## How graph-io reads it

- The document is read element by element, so a file longer than the longest JavaScript string
  still loads.
- Every edge is directed: CX2 has no undirected edges.
- Node ids are integers. An id beyond 2^53 keeps its digits as text (`W_PRECISION`), and `"5"` or
  `5.0` read as 5 (`W_ID_TEXT_TYPE`).
- Edge ids go to the edge column `id`, which holds 64-bit floats like every CX2 number. A format
  that writes floating-point numbers with a decimal point, such as CSV, writes them `0.0`, `1.0`, ...
- Declared attributes (`attributeDeclarations`) become typed columns named by their full names, with
  their declared defaults. An undeclared attribute takes the type of its values
  (`W_CX2_UNDECLARED_ATTRIBUTE`). A value of the wrong type is an error, and that value is left
  out.
- `name` is the label.
- `x` and `y` are the position. Cytoscape's y axis points down; graph-io stores y pointing up, so it
  negates y when it reads and again when it writes. `z` is a stacking order and goes to the `z`
  column (`zAs: "position"` makes it the third coordinate).
- Per-node and per-edge visual values (`nodeBypasses`, `edgeBypasses`) become one column per visual
  property.
- A document without a `status` is an error (`E_CX2_NO_STATUS`), and one whose status says the
  export failed stops the import (`E_STATUS_FAILED`).
- An edge to an unknown node is an error (`E_UNKNOWN_NODE`); `addMissingNodes: true` creates the
  node instead, as Cytoscape does.

## What a saved file keeps and loses

What does not survive:

- Edge direction: the format has directed edges only. A fully undirected graph is written with
  every edge directed (`W_CX2_UNDIRECTED_AS_DIRECTED`) and reads back directed. A graph with both directed and undirected
  edges is refused (`E_MIXED_DIRECTION`) until you pass `onMixedDirection: "directed"` or
  `"undirected"`.
- Node ids that are not integers. They need `sanitizeIds: "mangle"`, which keeps the original in a
  `graphty:originalId` attribute that graph-io turns back into the id.
- `NaN` and the infinities are written as `null` (`W_CX2_NONFINITE_AS_NULL`), and JSON values as
  text (`W_CX2_JSON_AS_STRING`).
- Edge ids are generated when the graph has none (`W_EDGE_IDS_GENERATED`).
- Nesting and time columns.

<!-- generated:begin capabilities:cx2 -->

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
| [`defaults`](./index.md#defaults)               | yes                    |
| [`options`](./index.md#options)                 | no                     |
| [`hierarchy`](./index.md#hierarchy)             | no                     |
| [`temporal`](./index.md#temporal)               | none                   |
| [`graphAttributes`](./index.md#graphattributes) | yes                    |
| [`positions`](./index.md#positions)             | yes                    |
| [`viz`](./index.md#viz)                         | no                     |

<!-- generated:end -->

<!-- generated:begin reference:cx2 -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option               | Type                     | Default    |
| -------------------- | ------------------------ | ---------- |
| [`zAs`](#import-zas) | `"column" \| "position"` | `"column"` |

- <a id="import-zas"></a>`zAs`: Where Cytoscape's `z` value (a drawing order, not a depth) goes: "column" keeps it as a node attribute named `z`; "position" makes it the third coordinate of the position.

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

This format has no options of its own.

## Import issue codes

The codes this format's import report can hold. They are also exported as `CX2_ISSUE` from `@graphty/graph-io/cx2`, keyed by the code without its `E_` / `W_` and `CX2_` prefixes.

- `E_EMPTY_INPUT` (error): The input is empty. The import stops.
- `E_TOO_LARGE` (error): The input is larger than graph-io's size limit. The import stops.
- `E_INVALID_ID` (error): An id that is not an integer.
- `E_UNKNOWN_NODE` (error): An edge endpoint naming no node (addMissingNodes false, the default).
- `E_INVALID_WEIGHT` (error): A weight that is not a number.
- `E_DUPLICATE_EDGE_ID` (error): An edge id declared twice; the second edge is skipped.
- `E_SYNTAX` (error): The text is not valid JSON. The import stops.
- `E_INVALID_UTF8` (error): The input is not valid UTF-8. The import stops.
- `E_INVALID_ENCODING` (error): Some bytes are not valid in the encoding that was chosen (by a byte order mark or the `encoding` option). The import stops.
- `W_ENCODING_FALLBACK` (warning): Bytes that are not UTF-8 were read as windows-1252.
- `W_UNKNOWN_ENCODING` (warning): An encoding the platform cannot decode was ignored.
- `E_CX2_NO_DESCRIPTOR` (error): The document is not a JSON array, or its first element is not the CX2 descriptor with `CXVersion`. The import stops.
- `E_CX2_VERSION` (error): `CXVersion` names a version other than 2 ("1.x" means the file is CX1; read it as `cx`). The import stops.
- `W_CX2_MINOR_VERSION` (warning): CXVersion is a 2.x other than "2.0" (or not a string); the document is read.
- `E_CX2_NO_STATUS` (error): The document has no status block, or a malformed one.
- `E_STATUS_FAILED` (error): The program that wrote the file marked it as failed, so it is incomplete. The import stops.
- `W_STATUS_WARNING` (warning): The producer marked the document as successful with an error text.
- `W_CX2_UNDECLARED_FRAGMENTS` (warning): An aspect appears in several blocks although the descriptor does not declare fragments.
- `E_CX2_DECLARATION_CONFLICT` (error): An attribute declared twice with two different types; the first declaration wins.
- `W_CX2_UNDECLARED_ATTRIBUTE` (warning): An attribute value whose name no declaration covers; its column is inferred.
- `W_CX2_RESERVED_KEY` (warning): A node or edge attribute named `id`, which the specification reserves.
- `E_CX2_ALIAS_CONFLICT` (error): An alias that is another attribute's name or another attribute's alias; the alias is ignored.
- `W_CX2_NETWORK_DECLARATION` (warning): A network attribute declaration with an alias or a default, which CX2 forbids; both ignored.
- `W_CX2_EXTRA_ELEMENTS` (warning): An aspect that holds one element holds several; the first is read.
- `W_CX2_PARTIAL_LAYOUT` (warning): Some nodes have coordinates and others none, or a node has x without y.
- `W_CX2_ALIAS_BYPASSED` (warning): A full attribute name used where its alias is declared; read as the same attribute.
- `W_CX2_LEGACY_LAYOUT` (warning): A CX1 cartesianLayout aspect next to node coordinates; kept, not applied.
- `W_SINGLE_OBJECT_ASPECT` (warning): An aspect CX2 defines as an array of elements written as one object; read as one element.
- `W_MULTI_ASPECT_FRAGMENT` (warning): A member holding several aspects; each array-valued key is read as its own block.
- `W_JSON_NONSTANDARD_NUMBER` (warning): The bare tokens NaN / Infinity / -Infinity (Python's json writes them), read as numbers.
- `W_STYLES_NOT_IMPORTED` (warning): The file's style rules are not applied; they are kept so a CX2 export writes them back.
- `E_BAD_ASPECT_BLOCK` (error): A member of the file's top-level array that is not a block with one key (`{"nodes": [...]}`), or an element of a block that is not an object. It is skipped; the rest of the file is read.
- `W_ASPECT_ORDER` (warning): An aspect out of its place (after the post-metadata or the status, a third metaData, late declarations).
- `W_COUNT_MISMATCH` (warning): A metaData element count disagrees with what was read.
- `E_BAD_VALUE` (error): A value that does not match its declared type; the cell is unset.
- `W_BAD_DEFAULT` (warning): A declared default that does not match its type.
- `W_UNKNOWN_ATTR_TYPE` (warning): A declared type CX2 does not define; the column is inferred from the values.
- `W_DANGLING_REFERENCE` (warning): A bypass or a layout entry naming no node or edge.
- `W_DUPLICATE_ATTRIBUTE` (warning): The same attribute twice on one element (its alias and its full name).
- `E_MISSING_ID` (error): A node without an id.
- `E_MISSING_ENDPOINT` (error): An edge without s or t.
- `W_DUPLICATE_NODE` (warning): A node id declared twice; the second merges into the first.
- `W_ID_TEXT_TYPE` (warning): An id spelled as a string or a non-integer literal; read as the integer.
- `W_PRECISION` (warning): An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit.
- `W_ID_MERGED` (warning): Two id texts merged under `ids: "number"`.
- `W_UNKNOWN_ELEMENT` (warning): An element key CX2 does not define.
- `W_COLUMN_RENAMED` (warning): An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example two attributes declared with the same name.
- `W_ROLE_TAKEN` (warning): You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.
- `W_DIRECTION_REFUSED` (warning): You read into a graph builder whose direction is already set, or which already holds edges, so the file is read with the builder's direction instead of its own.
- `W_DIRECTION_FORCED` (warning): Edges of the other direction were read with the direction `onMixedDirection` chose.
- `W_OPTION_IGNORED` (warning): You set an option this format does not use; it had no effect. The message names the option.
- `W_SINK_OPTION` (warning): You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.

Like every format, it can also record the codes for unreadable input and for elements the graph refuses: [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED), [`E_DUPLICATE_EDGE`](../codes.md#E_DUPLICATE_EDGE), [`E_SELF_LOOP`](../codes.md#E_SELF_LOOP).

## Loss codes

The codes `checkExport(snapshot, "cx2", options)` can return before a save, also exported as `CX2_LOSS` from `@graphty/graph-io/cx2`. An `E_` code means the save throws unless you change the graph or the options.

- `W_CX2_UNDIRECTED_AS_DIRECTED` (warning): Every edge is written as directed, so an undirected graph, or the undirected edges of a mixed graph, read back as directed.
- `W_CX2_JSON_AS_STRING` (warning): A nested (json) column is written as a string attribute holding its JSON text.
- `W_CX2_NONFINITE_AS_NULL` (warning): NaN and the infinities cannot be written; they are written as null and read back unset.
- `W_MUTUAL_EXPANDED` (warning): A mutual pair is written as two directed edges without its mark.
- `W_WEIGHT_KEY_CLASH` (warning): An attribute without the weight role is named like the key weights are written under; it reads back as the edge weight, or is not written when the graph has weights of its own.
- `W_HIERARCHY_DROPPED` (warning): A parent / parents column: CX2 has no containment.
- `W_TEMPORAL_DROPPED` (warning): A start / end / timestamp column: CX2 has no time.
- `W_ROLE_DROPPED` (warning): An attribute with a role the format has no place for is written as a plain attribute; the role is lost.
- `W_DTYPE_UNSUPPORTED` (warning): An attribute type CX2 stores as another (a 32-bit float as double, an unsigned integer as long, a dictionary as string); it reads back with that type.
- `E_ID_CHARSET` (error, the save throws): Node ids the format cannot write, under `sanitizeIds: "error"`; the save fails with `E_INVALID_ID`. Pass `sanitizeIds: "mangle"` to rewrite them.
- `W_ID_MANGLED` (warning): Node ids that are not integers under sanitizeIds "mangle": renumbered, originals kept.
- `W_EDGE_IDS_GENERATED` (warning): Edges without a usable id get generated integer ids.

When the graph has something this format cannot hold, it can also return the [shared loss codes](../codes.md#shared-loss-codes): [`E_ID_TEXT_COLLISION`](../codes.md#E_ID_TEXT_COLLISION), [`E_MIXED_DIRECTION`](../codes.md#E_MIXED_DIRECTION), [`E_XML_ILLEGAL_CHAR`](../codes.md#E_XML_ILLEGAL_CHAR), [`W_COLUMN_DROPPED`](../codes.md#W_COLUMN_DROPPED), [`W_COLUMN_NAME_CHANGED`](../codes.md#W_COLUMN_NAME_CHANGED), [`W_COMPONENTS_FLATTENED`](../codes.md#W_COMPONENTS_FLATTENED), [`W_DEFAULT_DROPPED`](../codes.md#W_DEFAULT_DROPPED), [`W_DYNAMIC_VALUES_DROPPED`](../codes.md#W_DYNAMIC_VALUES_DROPPED), [`W_EDGE_IDS_DROPPED`](../codes.md#W_EDGE_IDS_DROPPED), [`W_EMPTY_COLUMN_DROPPED`](../codes.md#W_EMPTY_COLUMN_DROPPED), [`W_EXTENSION_TABLE_DROPPED`](../codes.md#W_EXTENSION_TABLE_DROPPED), [`W_GRAPH_ATTRIBUTES_DROPPED`](../codes.md#W_GRAPH_ATTRIBUTES_DROPPED), [`W_ID_RENUMBERED`](../codes.md#W_ID_RENUMBERED), [`W_ID_TEXT_TYPE`](../codes.md#W_ID_TEXT_TYPE), [`W_INTEGRAL_F64_AS_I32`](../codes.md#W_INTEGRAL_F64_AS_I32), [`W_JSON_UNSUPPORTED`](../codes.md#W_JSON_UNSUPPORTED), [`W_LIST_UNSUPPORTED`](../codes.md#W_LIST_UNSUPPORTED), [`W_MIXED_DIRECTION`](../codes.md#W_MIXED_DIRECTION), [`W_MULTI_EDGES`](../codes.md#W_MULTI_EDGES), [`W_MUTUAL_AS_UNDIRECTED`](../codes.md#W_MUTUAL_AS_UNDIRECTED), [`W_NONFINITE_AS_NULL`](../codes.md#W_NONFINITE_AS_NULL), [`W_OPEN_INTERVAL`](../codes.md#W_OPEN_INTERVAL), [`W_OPTIONS_DROPPED`](../codes.md#W_OPTIONS_DROPPED), [`W_OPTIONS_GAINED`](../codes.md#W_OPTIONS_GAINED), [`W_PARENTS_DROPPED`](../codes.md#W_PARENTS_DROPPED), [`W_POSITIONS_DROPPED`](../codes.md#W_POSITIONS_DROPPED), [`W_ROLE_ASSUMED`](../codes.md#W_ROLE_ASSUMED), [`W_SELF_LOOPS`](../codes.md#W_SELF_LOOPS), [`W_SPELLS_DROPPED`](../codes.md#W_SPELLS_DROPPED), [`W_STORAGE_CLASS_CHANGED`](../codes.md#W_STORAGE_CLASS_CHANGED), [`W_TEMPORAL_TEXT_DROPPED`](../codes.md#W_TEMPORAL_TEXT_DROPPED), [`W_TEXT_INFERRED`](../codes.md#W_TEXT_INFERRED), [`W_VIZ_DROPPED`](../codes.md#W_VIZ_DROPPED), [`W_WEIGHTS_DROPPED`](../codes.md#W_WEIGHTS_DROPPED).

<!-- generated:end -->
