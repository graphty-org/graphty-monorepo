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

What a saved file can hold:

| Capability        | Value                  | Meaning                                                                                                                            |
| ----------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `mixedDirection`  | no                     | Directed and undirected edges in one file.                                                                                         |
| `multiEdges`      | yes                    | Parallel edges.                                                                                                                    |
| `selfLoops`       | yes                    | Self-loops.                                                                                                                        |
| `edgeIds`         | required               | Edge ids: "required" (generated when the graph has none), "optional", or "none" (not stored).                                      |
| `idCharset`       | integer                | Which node ids are written unchanged: "any", "nmtoken" (XML name tokens), "integer", or "dense-1-based" (1 to N).                  |
| `dtypes`          | string, f64, i32, bool | The column types the format keeps exactly.                                                                                         |
| `components`      | no                     | Columns with several numbers per row, such as a position.                                                                          |
| `lists`           | yes                    | List columns.                                                                                                                      |
| `json`            | no                     | Nested JSON values.                                                                                                                |
| `defaults`        | yes                    | Columns' declared default values.                                                                                                  |
| `options`         | no                     | Declared lists of allowed values (GEXF options).                                                                                   |
| `hierarchy`       | no                     | Nesting: nodes inside other nodes (parent columns).                                                                                |
| `temporal`        | none                   | Time: "none", "intervals", "spells" (several intervals per element), or "dynamic-values" (attribute values that change over time). |
| `graphAttributes` | yes                    | Graph-level attributes.                                                                                                            |
| `positions`       | yes                    | Node positions.                                                                                                                    |
| `viz`             | no                     | Visual columns: color, size, shape and thickness.                                                                                  |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/cx2 -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot, report } = await importGraph(await readFile("glypican2.cx2"), { filename: "glypican2.cx2" });
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(report.issues.map((i) => i.code));

console.log(checkExport(snapshot, "cx2").map((n) => n.code));
await writeFile("glypican2-copy.cx2", await exportGraphToBytes(snapshot, "cx2"));
```

<!-- generated:end -->

<!-- generated:begin output:formats/cx2 -->

```text
2 nodes, 1 edges
[ 'W_STYLES_NOT_IMPORTED' ]
[]
```

<!-- generated:end -->

A CX2 file read by graph-io keeps its style rules and other aspects in the snapshot's
metadata, and writes them back when you save as CX2, even though graph-io does not apply them
(`W_STYLES_NOT_IMPORTED`).

## How graph-io reads it

- The document is read element by element, so a file longer than the longest JavaScript string
  still loads.
- Every edge is directed: CX2 has no undirected edges.
- Node ids are integers. An id beyond 2^53 keeps its digits as text (`W_PRECISION`), and `"5"` or
  `5.0` read as 5 (`W_ID_TEXT_TYPE`).
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

- Undirected edges: every edge is written directed (`W_CX2_UNDIRECTED_AS_DIRECTED`).
- Node ids that are not integers. They need `sanitizeIds: "mangle"`, which keeps the original in a
  `graphty:originalId` attribute that graph-io turns back into the id.
- `NaN` and the infinities are written as `null` (`W_CX2_NONFINITE_AS_NULL`), and JSON values as
  text (`W_CX2_JSON_AS_STRING`).
- Edge ids are generated when the graph has none (`W_EDGE_IDS_GENERATED`).
- Nesting and time columns.

<!-- generated:begin reference:cx2 -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option | Type                     | Default    | Meaning                                                                                                                                                                             |
| ------ | ------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zAs`  | `"column" \| "position"` | `"column"` | Where a node's `z` goes: "column" (default) keeps it in the f64 node column `z` (Cytoscape writes a stacking order there); "position" makes it the third component of the position. |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

No options of its own.

## Import issue codes

The codes this format's import report can hold, also exported as `CX2_ISSUE` from `@graphty/graph-io/cx2`.

| Code                         | Key                       | Severity | Meaning                                                                                                  |
| ---------------------------- | ------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `E_EMPTY_INPUT`              | `EMPTY_INPUT`             | error    | The input is empty (fatal).                                                                              |
| `E_TOO_LARGE`                | `TOO_LARGE`               | error    | The input is beyond a size limit (fatal).                                                                |
| `W_ENCODING_CONFLICT`        | `ENCODING_CONFLICT`       | warning  | A byte order mark, the encoding option and the declared encoding disagree.                               |
| `W_CONTROL_CHARACTER`        | `CONTROL_CHARACTER`       | warning  | A control character or a stray U+FEFF in the text, or an ignored trailing Ctrl-Z.                        |
| `E_FOREIGN_FORMAT`           | `FOREIGN_FORMAT`          | error    | The input is an HTML page, a PDF, compressed or archived data or an image (fatal).                       |
| `W_ISSUES_SUPPRESSED`        | `ISSUES_SUPPRESSED`       | warning  | Warnings of one code beyond the number a report keeps, counted in one warning.                           |
| `E_SYNTAX`                   | `SYNTAX`                  | error    | The text is not JSON (fatal).                                                                            |
| `E_INVALID_UTF8`             | `INVALID_UTF8`            | error    | Invalid UTF-8 (fatal).                                                                                   |
| `E_INVALID_ENCODING`         | `INVALID_ENCODING`        | error    | Invalid bytes in the encoding a BOM or the encoding option chose (fatal).                                |
| `W_ENCODING_FALLBACK`        | `ENCODING_FALLBACK`       | warning  | Bytes that are not UTF-8 were read as windows-1252.                                                      |
| `W_UNKNOWN_ENCODING`         | `UNKNOWN_ENCODING`        | warning  | An encoding the platform cannot decode was ignored.                                                      |
| `E_CX2_NO_DESCRIPTOR`        | `NO_DESCRIPTOR`           | error    | The document is not an array or does not start with a descriptor holding CXVersion (fatal).              |
| `E_CX2_VERSION`              | `VERSION`                 | error    | CXVersion names a major version other than 2 (fatal); "1.x" says the file is CX1.                        |
| `W_CX2_MINOR_VERSION`        | `MINOR_VERSION`           | warning  | CXVersion is a 2.x other than "2.0" (or not a string); the document is read.                             |
| `E_CX2_NO_STATUS`            | `NO_STATUS`               | error    | The document has no status block, or a malformed one.                                                    |
| `E_STATUS_FAILED`            | `STATUS_FAILED`           | error    | The producer marked the document as failed (fatal).                                                      |
| `W_STATUS_WARNING`           | `STATUS_WARNING`          | warning  | The producer marked the document as successful with an error text.                                       |
| `W_CX2_UNDECLARED_FRAGMENTS` | `UNDECLARED_FRAGMENTS`    | warning  | An aspect appears in several blocks although the descriptor does not declare fragments.                  |
| `E_CX2_DECLARATION_CONFLICT` | `DECLARATION_CONFLICT`    | error    | An attribute declared twice with two different types; the first declaration wins.                        |
| `W_CX2_UNDECLARED_ATTRIBUTE` | `UNDECLARED_ATTRIBUTE`    | warning  | An attribute value whose name no declaration covers; its column is inferred.                             |
| `W_CX2_RESERVED_KEY`         | `RESERVED_KEY`            | warning  | A node or edge attribute named `id`, which the specification reserves.                                   |
| `E_CX2_ALIAS_CONFLICT`       | `ALIAS_CONFLICT`          | error    | An alias that is another attribute's name or another attribute's alias; the alias is ignored.            |
| `W_CX2_NETWORK_DECLARATION`  | `NETWORK_DECLARATION`     | warning  | A network attribute declaration with an alias or a default, which CX2 forbids; both ignored.             |
| `W_CX2_EXTRA_ELEMENTS`       | `EXTRA_ELEMENTS`          | warning  | An aspect that holds one element holds several; the first is read.                                       |
| `W_CX2_PARTIAL_LAYOUT`       | `PARTIAL_LAYOUT`          | warning  | Some nodes have coordinates and others none, or a node has x without y.                                  |
| `W_CX2_ALIAS_BYPASSED`       | `ALIAS_BYPASSED`          | warning  | A full attribute name used where its alias is declared; read as the same attribute.                      |
| `W_CX2_LEGACY_LAYOUT`        | `LEGACY_LAYOUT`           | warning  | A CX1 cartesianLayout aspect next to node coordinates; kept, not applied.                                |
| `W_SINGLE_OBJECT_ASPECT`     | `SINGLE_OBJECT_ASPECT`    | warning  | An aspect CX2 defines as an array of elements written as one object; read as one element.                |
| `W_MULTI_ASPECT_FRAGMENT`    | `MULTI_ASPECT_FRAGMENT`   | warning  | A member holding several aspects; each array-valued key is read as its own block.                        |
| `W_JSON_NONSTANDARD_NUMBER`  | `JSON_NONSTANDARD_NUMBER` | warning  | The bare tokens NaN / Infinity / -Infinity (Python's json writes them), read as numbers.                 |
| `W_STYLES_NOT_IMPORTED`      | `STYLES_NOT_IMPORTED`     | warning  | The file's style rules are not applied; they are kept so a CX2 export writes them back.                  |
| `E_BAD_ASPECT_BLOCK`         | `BAD_ASPECT_BLOCK`        | error    | A member of the top-level array that is not a one-key aspect block, or an element that is not an object. |
| `W_ASPECT_ORDER`             | `ASPECT_ORDER`            | warning  | An aspect out of its place (after the post-metadata or the status, a third metaData, late declarations). |
| `W_COUNT_MISMATCH`           | `COUNT_MISMATCH`          | warning  | A metaData element count disagrees with what was read.                                                   |
| `E_BAD_VALUE`                | `BAD_VALUE`               | error    | A value that does not match its declared type; the cell is unset.                                        |
| `W_BAD_DEFAULT`              | `BAD_DEFAULT`             | warning  | A declared default that does not match its type.                                                         |
| `W_UNKNOWN_ATTR_TYPE`        | `UNKNOWN_ATTR_TYPE`       | warning  | A declared type CX2 does not define; the column is inferred from the values.                             |
| `W_DANGLING_REFERENCE`       | `DANGLING_REFERENCE`      | warning  | A bypass or a layout entry naming no node or edge.                                                       |
| `W_DUPLICATE_ATTRIBUTE`      | `DUPLICATE_ATTRIBUTE`     | warning  | The same attribute twice on one element (its alias and its full name).                                   |
| `E_MISSING_ID`               | `MISSING_ID`              | error    | A node without an id.                                                                                    |
| `E_MISSING_ENDPOINT`         | `MISSING_ENDPOINT`        | error    | An edge without s or t.                                                                                  |
| `W_DUPLICATE_NODE`           | `DUPLICATE_NODE`          | warning  | A node id declared twice; the second merges into the first.                                              |
| `E_DUPLICATE_EDGE_ID`        | `DUPLICATE_EDGE_ID`       | error    | An edge id declared twice; the second edge is skipped.                                                   |
| `E_INVALID_ID`               | `INVALID_ID`              | error    | An id that is not an integer.                                                                            |
| `E_UNKNOWN_NODE`             | `UNKNOWN_NODE`            | error    | An edge endpoint naming no node (addMissingNodes false, the default).                                    |
| `E_INVALID_WEIGHT`           | `INVALID_WEIGHT`          | error    | A weight that is not a number.                                                                           |
| `W_ID_TEXT_TYPE`             | `ID_TEXT_TYPE`            | warning  | An id spelled as a string or a non-integer literal; read as the integer.                                 |
| `W_PRECISION`                | `PRECISION`               | warning  | An integer beyond 2^53: an id kept as its digits, a value stored as the nearest f64.                     |
| `W_ID_MERGED`                | `ID_MERGED`               | warning  | Two id texts merged under `ids: "number"`.                                                               |
| `W_UNKNOWN_ELEMENT`          | `UNKNOWN_ELEMENT`         | warning  | An element key CX2 does not define.                                                                      |
| `W_COLUMN_RENAMED`           | `COLUMN_RENAMED`          | warning  | A column renamed because its name was taken.                                                             |
| `W_ROLE_TAKEN`               | `ROLE_TAKEN`              | warning  | A column that lost its role because another column holds it.                                             |
| `W_DIRECTION_REFUSED`        | `DIRECTION_REFUSED`       | warning  | The sink refused the direction.                                                                          |
| `W_DIRECTION_FORCED`         | `DIRECTION_FORCED`        | warning  | Edges forced to the policy's direction.                                                                  |
| `W_OPTION_IGNORED`           | `OPTION_IGNORED`          | warning  | A common option CX2 has no use for.                                                                      |
| `W_SINK_OPTION`              | `SINK_OPTION`             | warning  | A builder option the caller's sink does not honor.                                                       |

## Loss codes

The codes `check()` can return before a save, also exported as `CX2_LOSS` from `@graphty/graph-io/cx2`. An `E_` code means the save throws unless you change the graph or the options.

| Code                           | Key                      | Severity            | Meaning                                                                                                          |
| ------------------------------ | ------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `W_CX2_UNDIRECTED_AS_DIRECTED` | `UNDIRECTED_AS_DIRECTED` | warning             | Every edge is written directed: an undirected snapshot, or the undirected pairs of a mixed one.                  |
| `W_CX2_JSON_AS_STRING`         | `JSON_AS_STRING`         | warning             | A nested (json) column is written as a string attribute holding its JSON text.                                   |
| `W_CX2_NONFINITE_AS_NULL`      | `NONFINITE_AS_NULL`      | warning             | NaN and the infinities cannot be written; they are written as null and read back unset.                          |
| `W_MUTUAL_EXPANDED`            | `MUTUAL_EXPANDED`        | warning             | A mutual pair is written as two directed edges without its mark.                                                 |
| `W_WEIGHT_KEY_CLASH`           | `WEIGHT_KEY_CLASH`       | warning             | A plain edge column named like the weight key reads back as THE weight (or is skipped when weights are written). |
| `W_HIERARCHY_DROPPED`          | `HIERARCHY_DROPPED`      | warning             | A parent / parents column: CX2 has no containment.                                                               |
| `W_TEMPORAL_DROPPED`           | `TEMPORAL_DROPPED`       | warning             | A start / end / timestamp column: CX2 has no time.                                                               |
| `W_ROLE_DROPPED`               | `ROLE_DROPPED`           | warning             | A role column written as a plain attribute.                                                                      |
| `W_DTYPE_UNSUPPORTED`          | `DTYPE_UNSUPPORTED`      | warning             | A dtype CX2 declares as another (f32 as double, u32 as long, dict as string, ...).                               |
| `E_ID_CHARSET`                 | `ID_CHARSET`             | error (save throws) | Node ids that are not integers under the default sanitizeIds "error": export() throws E_INVALID_ID.              |
| `W_ID_MANGLED`                 | `ID_MANGLED`             | warning             | Node ids that are not integers under sanitizeIds "mangle": renumbered, originals kept.                           |
| `W_EDGE_IDS_GENERATED`         | `EDGE_IDS_GENERATED`     | warning             | Edges without a usable id get generated integer ids.                                                             |

<!-- generated:end -->
