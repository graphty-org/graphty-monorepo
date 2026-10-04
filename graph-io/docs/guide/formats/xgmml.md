# XGMML

[XGMML](https://manual.cytoscape.org/en/stable/Supported_Network_File_Formats.html) is the
XML network format of [Cytoscape](https://cytoscape.org/). graph-io reads the 1.0 draft, the
files Cytoscape 2 and 3 export, and the network files inside Cytoscape 3 session files.

## At a glance

<!-- generated:begin glance:xgmml -->

|                         |                                                     |
| ----------------------- | --------------------------------------------------- |
| Import from             | `@graphty/graph-io/xgmml`                           |
| Format name             | `xgmml`                                             |
| Extensions              | `.xgmml`, `.xml`                                    |
| MIME types              | `application/xgmml`, `text/xgmml`, `text/xgmml+xml` |
| Reads                   | yes                                                 |
| Writes                  | yes                                                 |
| Several graphs per file | yes (`importAllGraphs`)                             |
| Lists its graphs        | yes (`listGraphs`)                                  |

What a saved file can hold (the [capabilities](./index.md#what-the-capabilities-mean) explain each row):

| Capability                                      | Value                                            |
| ----------------------------------------------- | ------------------------------------------------ |
| [`mixedDirection`](./index.md#mixeddirection)   | yes                                              |
| [`multiEdges`](./index.md#multiedges)           | yes                                              |
| [`selfLoops`](./index.md#selfloops)             | yes                                              |
| [`edgeIds`](./index.md#edgeids)                 | optional                                         |
| [`idCharset`](./index.md#idcharset)             | any                                              |
| [`dtypes`](./index.md#dtypes)                   | string, dict, f64, f32, i32, u32, u8, bool, list |
| [`components`](./index.md#components)           | no                                               |
| [`lists`](./index.md#lists)                     | yes                                              |
| [`json`](./index.md#json)                       | no                                               |
| [`defaults`](./index.md#defaults)               | no                                               |
| [`options`](./index.md#options)                 | no                                               |
| [`hierarchy`](./index.md#hierarchy)             | yes                                              |
| [`temporal`](./index.md#temporal)               | none                                             |
| [`graphAttributes`](./index.md#graphattributes) | yes                                              |
| [`positions`](./index.md#positions)             | yes                                              |
| [`viz`](./index.md#viz)                         | no                                               |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/xgmml -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("cytoscape3-small.xgmml"), {
    filename: "cytoscape3-small.xgmml",
});
console.log(`${snapshot.nodeCount} nodes; node columns: ${snapshot.nodes.names().join(", ")}`);

console.log(checkExport(snapshot, "xgmml").map((n) => n.code));
await writeFile("network.xgmml", await exportGraphToBytes(snapshot, "xgmml"));
```

<!-- generated:end -->

<!-- generated:begin output:formats/xgmml -->

```text
3 nodes; node columns: graphics, label, position, z, name, score, degree
[]
```

<!-- generated:end -->

The node positions, the `graphics` values Cytoscape wrote, and every typed attribute come
back as columns.

## How graph-io reads it

- The direction follows the XGMML specification: the root element's `directed` (undirected when
  absent), then each edge's `cy:directed`. A file can mix directed and undirected edges.
- Ids are kept as written, so `"1"` and `"01"` are two nodes.
- Each `att` becomes a column typed by its `cy:type`, else its `type`: integers, 64-bit `Long`
  values (as 64-bit floats, or as text with `long: "string"`), floating-point numbers, booleans,
  text and lists. An XGMML `integer` holding a value too large for 32 bits widens the column with
  a warning (`W_WIDENED`), because Cytoscape before 3.3 wrote 64-bit values that way.
- Groups become a parent column. A node that points at another network gets that network's name in
  `cytoscape.nestedNetwork`.
- A node's `graphics` x and y are its position. Cytoscape's y axis points down; graph-io stores y
  pointing up, so it negates y when it reads and again when it writes. `z` goes to a separate `z`
  column (`zAs: "position"` makes it the third coordinate). Every other `graphics` value is kept in
  a JSON column `graphics`.
- Cytoscape's `\n` and `\t` escapes are decoded in Cytoscape files (`cytoscapeEscapes`), and an
  edge whose ends are missing is resolved from Cytoscape's `source (interaction) target` edge label
  (`labelAliases`).
- Two bugs of old Cytoscape writers can be repaired on request: bare `&` characters
  (`repairBareAmpersands`) and split surrogate character references (`pairSurrogateReferences`).
- An edge to a node the file does not declare is an error (`E_UNKNOWN_NODE`) unless you pass
  `addMissingNodes: true`.
- A session network file lists several networks; see
  [Files that hold several graphs](../loading.md#files-that-hold-several-graphs).

## What a saved file keeps and loses

graph-io writes the Cytoscape 3 dialect, which Cytoscape 3 opens with every attribute type
intact. It keeps mixed direction, parallel edges, edge ids, lists, nesting, graph attributes and
positions. What does not survive:

- Column types Cytoscape does not have: 32-bit floats, small and unsigned integers and dictionary
  columns are written as the nearest wider Cytoscape type, and JSON values as text.
- Styles. The `graphics` values an XGMML import kept are written back, but graph-io's color, size
  and shape columns are not turned into graphics.
- A number id reads back as text (`W_ID_TEXT_TYPE`), because XGMML ids are kept as written.

<!-- generated:begin reference:xgmml -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option                    | Type                     | Default                | Meaning                                                                                                                                                                                                                                     |
| ------------------------- | ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `labelAliases`            | `boolean`                | on for Cytoscape files | Find an edge end that is missing, or names no node, from Cytoscape's `"source (interaction) target"` edge label, and fill a missing interaction from it. The default is on for files that use Cytoscape's (`cy`) namespace, off for others. |
| `cytoscapeEscapes`        | `boolean`                | on for Cytoscape files | Decode Cytoscape's two-character `\n` and `\t` escapes in text values. The default is on for files that use Cytoscape's namespace, off for others.                                                                                          |
| `repairBareAmpersands`    | `boolean`                | `false`                | Read an `&` that is not followed by `;` within 7 characters as `&amp;`, with a warning for each, instead of failing on the invalid XML.                                                                                                     |
| `pairSurrogateReferences` | `boolean`                | `false`                | Join two character references that each hold half of a character (`&#xD83D;&#xDE00;`) into that character, with a warning for each pair, instead of failing.                                                                                |
| `zAs`                     | `"column" \| "position"` | `"column"`             | Where Cytoscape's `z` value (a drawing order, not a depth) goes: "column" keeps it as a node attribute named `z`; "position" makes it the third coordinate of the position.                                                                 |
| `graphIndex`              | `number`                 | `0`                    | The 0-based position of the graph to read from a file that holds several (`listGraphs()` gives each graph's `index`). A position past the last graph fails with E_GRAPH_NOT_FOUND.                                                          |
| `graphName`               | `string`                 |                        | The name of the graph to read from a file that holds several (`listGraphs()` gives each graph's `name`). A name no graph has fails with E_GRAPH_NOT_FOUND, and a name two graphs share with E_AMBIGUOUS_GRAPH_NAME.                         |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option             | Type      | Default | Meaning                                                                                                                                                              |
| ------------------ | --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cytoscapeEscapes` | `boolean` | `false` | Write line breaks and tabs in text values as Cytoscape's two-character `\n` and `\t`, as Cytoscape does, instead of the XML character references `&#10;` and `&#9;`. |

## Import issue codes

The codes this format's import report can hold, also exported as `XGMML_ISSUE` from `@graphty/graph-io/xgmml`.

| Code                           | Key                    | Severity | Meaning                                                                                                                                                                                                                                      |
| ------------------------------ | ---------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_XML_SYNTAX`                 | `XML_SYNTAX`           | error    | Fatal: the input is not well-formed XML.                                                                                                                                                                                                     |
| `E_INVALID_UTF8`               | `INVALID_UTF8`         | error    | Fatal: the input holds invalid UTF-8.                                                                                                                                                                                                        |
| `E_INVALID_ENCODING`           | `INVALID_ENCODING`     | error    | Fatal: bytes invalid in the encoding a BOM, a declaration or the option chose.                                                                                                                                                               |
| `W_ENCODING_FALLBACK`          | `ENCODING_FALLBACK`    | warning  | Undeclared non-UTF-8 bytes were read as windows-1252.                                                                                                                                                                                        |
| `W_UNKNOWN_ENCODING`           | `UNKNOWN_ENCODING`     | warning  | A declared encoding the platform cannot decode was ignored.                                                                                                                                                                                  |
| `E_NO_GRAPH`                   | `NO_GRAPH`             | error    | Fatal: the root element is not `<graph>` (an XHTML page embedding one, a GraphML file).                                                                                                                                                      |
| `E_XGMML_VIEW_DOCUMENT`        | `VIEW_DOCUMENT`        | error    | Fatal: a session view document (`cy:view="1"`): view SUIDs and no topology.                                                                                                                                                                  |
| `E_MISSING_ID`                 | `MISSING_ID`           | error    | A node with neither an id nor a label; it is skipped with its subtree.                                                                                                                                                                       |
| `W_XGMML_ID_FROM_LABEL`        | `ID_FROM_LABEL`        | warning  | A node without an id; its label is used as the id.                                                                                                                                                                                           |
| `W_XGMML_ID_AND_HREF`          | `ID_AND_HREF`          | warning  | A node or edge with both an id and an `xlink:href`; it is read as the reference.                                                                                                                                                             |
| `E_MISSING_ENDPOINT`           | `MISSING_ENDPOINT`     | error    | An edge without a source or a target that no label alias resolves.                                                                                                                                                                           |
| `E_UNKNOWN_NODE`               | `UNKNOWN_NODE`         | error    | An edge endpoint that names no node (addMissingNodes false); the edge is skipped.                                                                                                                                                            |
| `W_XGMML_LABEL_ALIAS`          | `LABEL_ALIAS`          | warning  | Endpoints resolved through Cytoscape's `"a (pp) b"` label aliases; interactions filled from labels.                                                                                                                                          |
| `W_DUPLICATE_NODE`             | `DUPLICATE_NODE`       | warning  | A node id declared twice; the declarations are merged.                                                                                                                                                                                       |
| `E_DUPLICATE_EDGE_ID`          | `DUPLICATE_EDGE_ID`    | error    | An edge id used twice; the second edge is skipped.                                                                                                                                                                                           |
| `W_XGMML_GROUP_DUPLICATE_EDGE` | `GROUP_DUPLICATE_EDGE` | warning  | A meta-edge the 2.x writer repeats inside a group; the copy is dropped.                                                                                                                                                                      |
| `W_XGMML_BAD_DIRECTED`         | `BAD_DIRECTED`         | warning  | A `directed` or `cy:directed` value other than 0 / 1.                                                                                                                                                                                        |
| `W_XGMML_DOCUMENT_VERSION`     | `DOCUMENT_VERSION`     | warning  | A `documentVersion` that does not parse; the dialect is chosen from the content.                                                                                                                                                             |
| `W_XGMML_NO_NAMESPACE`         | `NO_NAMESPACE`         | warning  | A root `<graph>` with neither the XGMML namespace nor an XGMML DOCTYPE.                                                                                                                                                                      |
| `W_XGMML_BAD_ATT`              | `BAD_ATT`              | warning  | A malformed `<att>`: a list with a value, a scalar with child atts, an att with no name.                                                                                                                                                     |
| `W_XGMML_AMPERSAND_REPAIRED`   | `AMPERSAND_REPAIRED`   | warning  | A bare `&` read as `&amp;` under repairBareAmpersands.                                                                                                                                                                                       |
| `W_XGMML_SURROGATE_PAIRED`     | `SURROGATE_PAIRED`     | warning  | Two surrogate character references joined under pairSurrogateReferences.                                                                                                                                                                     |
| `W_XGMML_EMPTY_LIST_TYPE`      | `EMPTY_LIST_TYPE`      | warning  | An empty list whose element type nothing states; a list of strings is assumed.                                                                                                                                                               |
| `W_XGMML_RECORD_LIST`          | `RECORD_LIST`          | warning  | A record list, a list of lists, a 2.x map or foreign XML in an att, kept as json.                                                                                                                                                            |
| `W_XGMML_CROSS_FILE_REFERENCE` | `CROSS_FILE_REFERENCE` | warning  | A pointer into another file (`file.xgmml#id`); kept as text.                                                                                                                                                                                 |
| `W_XGMML_EDGE_NESTED_GRAPH`    | `EDGE_NESTED_GRAPH`    | warning  | A graph nested in an edge's att; there is no model for it.                                                                                                                                                                                   |
| `W_XGMML_ROOT_ONLY_ELEMENTS`   | `ROOT_ONLY_ELEMENTS`   | warning  | Elements of a session network declared outside every registered subnetwork.                                                                                                                                                                  |
| `E_BAD_VALUE`                  | `BAD_VALUE`            | error    | A value that does not parse as its declared type; the cell is unset.                                                                                                                                                                         |
| `W_WIDENED`                    | `WIDENED`              | warning  | An attribute's type was widened because a later value did not fit: an integer above 2^31 in an integer column, or two declared types for one attribute.                                                                                      |
| `W_PRECISION`                  | `PRECISION`            | warning  | An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit.                                                                                                                                    |
| `W_DANGLING_REFERENCE`         | `DANGLING_REFERENCE`   | warning  | A reference (xlink:href, nested-network pointer) that names nothing.                                                                                                                                                                         |
| `W_DUPLICATE_ATTRIBUTE`        | `DUPLICATE_ATTRIBUTE`  | warning  | The same attribute twice on one element; the later value wins.                                                                                                                                                                               |
| `E_UNKNOWN_PARENT`             | `UNKNOWN_PARENT`       | error    | A group membership naming no node.                                                                                                                                                                                                           |
| `E_PARENT_CYCLE`               | `PARENT_CYCLE`         | error    | A group membership that would close a parent cycle; that link is dropped.                                                                                                                                                                    |
| `W_EQUATION_AS_TEXT`           | `EQUATION_AS_TEXT`     | warning  | A Cytoscape formula kept as its text.                                                                                                                                                                                                        |
| `W_UNKNOWN_ATTR_TYPE`          | `UNKNOWN_ATTR_TYPE`    | warning  | An att type XGMML and Cytoscape do not define; kept as text.                                                                                                                                                                                 |
| `W_UNKNOWN_ELEMENT`            | `UNKNOWN_ELEMENT`      | warning  | An element XGMML does not define at that place; skipped with its subtree.                                                                                                                                                                    |
| `W_STRAY_TEXT`                 | `STRAY_TEXT`           | warning  | Character data where XGMML allows only elements, or inside an att.                                                                                                                                                                           |
| `W_MULTIPLE_GRAPHS`            | `MULTIPLE_GRAPHS`      | warning  | The file holds several graphs and only one was read: the first, or the one `graphIndex` or `graphName` chose. `importAllGraphs()` reads every one.                                                                                           |
| `E_GRAPH_NOT_FOUND`            | `GRAPH_NOT_FOUND`      | error    | graphIndex / graphName names no network (fatal).                                                                                                                                                                                             |
| `E_AMBIGUOUS_GRAPH_NAME`       | `AMBIGUOUS_GRAPH_NAME` | error    | graphName names several networks (fatal).                                                                                                                                                                                                    |
| `W_COLUMN_RENAMED`             | `COLUMN_RENAMED`       | warning  | An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example a repeated column header.                                                                                                             |
| `W_ROLE_TAKEN`                 | `ROLE_TAKEN`           | warning  | You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.                                                                                                          |
| `W_ID_MERGED`                  | `ID_MERGED`            | warning  | Two id texts merged into one number under ids "number".                                                                                                                                                                                      |
| `W_OPTION_IGNORED`             | `OPTION_IGNORED`       | warning  | You set an option this format does not use; it had no effect. The message names the option.                                                                                                                                                  |
| `W_SINK_OPTION`                | `SINK_OPTION`          | warning  | You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.                                        |
| `W_DIRECTION_REFUSED`          | `DIRECTION_REFUSED`    | warning  | You read into a graph builder whose direction is already set, or which already holds edges, so the file is read with the builder's direction instead of its own.                                                                             |
| `W_DIRECTION_FORCED`           | `DIRECTION_FORCED`     | warning  | Edges forced to the policy's direction.                                                                                                                                                                                                      |
| `E_MIXED_DIRECTION`            | `MIXED_DIRECTION`      | error    | The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a format that holds one direction per file fails with E_DIRECTED. Pass "directed" or "undirected" to read or write it anyway. |

Like every format, it can also record the codes for unreadable input: [`E_EMPTY_INPUT`](../codes.md#E_EMPTY_INPUT), [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED).

## Loss codes

The codes `checkExport(snapshot, "xgmml", options)` can return before a save, also exported as `XGMML_LOSS` from `@graphty/graph-io/xgmml`. An `E_` code means the save throws unless you change the graph or the options. A save can also return the [shared loss codes](../codes.md#shared-loss-codes) that any format can.

| Code                             | Key                      | Severity            | Meaning                                                                                                                                                                      |
| -------------------------------- | ------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `W_XGMML_JSON_AS_STRING`         | `JSON_AS_STRING`         | warning             | A json or nested-list column written as a string att.                                                                                                                        |
| `W_XGMML_WIDENED_TYPE`           | `WIDENED_TYPE`           | warning             | An attribute type Cytoscape does not have is written as a wider one (a 32-bit float as Double, a large unsigned integer as Long, a byte as Integer, a dictionary as String). |
| `E_XML_ILLEGAL_CHAR`             | `XML_ILLEGAL_CHAR`       | error (save throws) | A text value holds a character XML 1.0 forbids (most control characters); the save fails with E_COLUMN_TYPE.                                                                 |
| `W_TEMPORAL_DROPPED`             | `TEMPORAL_DROPPED`       | warning             | A temporal column written as plain numbers.                                                                                                                                  |
| `W_TEMPORAL_TEXT_DROPPED`        | `TEMPORAL_TEXT_DROPPED`  | warning             | A temporal text companion written as a plain string att.                                                                                                                     |
| `W_ROLE_DROPPED`                 | `ROLE_DROPPED`           | warning             | An attribute with a role the format has no place for is written as a plain attribute; the role is lost.                                                                      |
| `W_PARENTS_DROPPED`              | `PARENTS_DROPPED`        | warning             | A parents column not written because the snapshot also has a parent column.                                                                                                  |
| `W_MUTUAL_EXPANDED`              | `MUTUAL_EXPANDED`        | warning             | A mutual pair written as two directed edges.                                                                                                                                 |
| `W_ID_TEXT_TYPE`                 | `ID_TEXT_TYPE`           | warning             | Node ids whose text reads back as the other type.                                                                                                                            |
| `W_XGMML_EDGE_ID_TEXT`           | `EDGE_ID_TEXT`           | warning             | An edge id column of another dtype written as text; it reads back as strings.                                                                                                |
| `W_XGMML_BACKSLASH_ESCAPE`       | `BACKSLASH_ESCAPE`       | warning             | Strings holding a literal backslash-n or backslash-t read back as newline / tab (Cytoscape's escapes).                                                                       |
| `W_XGMML_POSITION`               | `POSITION`               | warning             | A position that cannot be written as it is: another shape, a non-finite coordinate, a z read back in the z column.                                                           |
| `W_XGMML_PARENT_CYCLE`           | `PARENT_CYCLE`           | warning             | Nodes whose parent chain never reaches a root are written at the top level.                                                                                                  |
| `W_COLUMN_NAME_CHANGED`          | `COLUMN_NAME_CHANGED`    | warning             | An attribute with a role (the label, say) is written where the format keeps that role, and reads back under the name the format's importer gives it.                         |
| `W_ROLE_ASSUMED`                 | `ROLE_ASSUMED`           | warning             | An attribute without a role is written where the format keeps a role (a `name` column as the label, say), and reads back with that role.                                     |
| `W_WEIGHT_KEY_CLASH`             | `WEIGHT_KEY_CLASH`       | warning             | A plain `weight` edge column reads back as THE weight.                                                                                                                       |
| `W_STORAGE_CLASS_CHANGED`        | `STORAGE_CLASS_CHANGED`  | warning             | A text attribute reads back as a dictionary attribute, or the reverse, because the importer chooses by how often its values repeat. The values are the same.                 |
| `W_XGMML_INTERACTION_FROM_LABEL` | `INTERACTION_FROM_LABEL` | warning             | Edge labels shaped `a (i) b` read back with an `interaction` column (Cytoscape's label alias).                                                                               |

<!-- generated:end -->
