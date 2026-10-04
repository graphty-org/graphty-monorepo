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

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/xgmml -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("proteins.xgmml"), {
    filename: "proteins.xgmml",
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

<!-- generated:begin capabilities:xgmml -->

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

<!-- generated:begin reference:xgmml -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).
A file can hold several graphs: pick one with the `graphIndex` or `graphName` option of [importGraph()](../options.md#importgraph-and-importallgraphs), as [Files that hold several graphs](../loading.md#files-that-hold-several-graphs) shows.

| Option                                                       | Type                     | Default                |
| ------------------------------------------------------------ | ------------------------ | ---------------------- |
| [`labelAliases`](#import-labelaliases)                       | `boolean`                | on for Cytoscape files |
| [`cytoscapeEscapes`](#import-cytoscapeescapes)               | `boolean`                | on for Cytoscape files |
| [`repairBareAmpersands`](#import-repairbareampersands)       | `boolean`                | `false`                |
| [`pairSurrogateReferences`](#import-pairsurrogatereferences) | `boolean`                | `false`                |
| [`zAs`](#import-zas)                                         | `"column" \| "position"` | `"column"`             |

- <a id="import-labelaliases"></a>`labelAliases`: Find an edge end that is missing, or names no node, from Cytoscape's `"source (interaction) target"` edge label, and fill a missing interaction from it. The default is on for files that use Cytoscape's (`cy`) namespace, off for others.
- <a id="import-cytoscapeescapes"></a>`cytoscapeEscapes`: Decode Cytoscape's two-character `\n` and `\t` escapes in text values. The default is on for files that use Cytoscape's namespace, off for others.
- <a id="import-repairbareampersands"></a>`repairBareAmpersands`: Read an `&` that is not followed by `;` within 7 characters as `&amp;`, with a warning for each, instead of failing on the invalid XML.
- <a id="import-pairsurrogatereferences"></a>`pairSurrogateReferences`: Join two character references that each hold half of a character (`&#xD83D;&#xDE00;`) into that character, with a warning for each pair, instead of failing.
- <a id="import-zas"></a>`zAs`: Where Cytoscape's `z` value (a drawing order, not a depth) goes: "column" keeps it as a node attribute named `z`; "position" makes it the third coordinate of the position.

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option                                         | Type      | Default |
| ---------------------------------------------- | --------- | ------- |
| [`cytoscapeEscapes`](#export-cytoscapeescapes) | `boolean` | `false` |

- <a id="export-cytoscapeescapes"></a>`cytoscapeEscapes`: Write line breaks and tabs in text values as Cytoscape's two-character `\n` and `\t`, as Cytoscape does, instead of the XML character references `&#10;` and `&#9;`.

## Import issue codes

The codes this format's import report can hold. They are also exported as `XGMML_ISSUE` from `@graphty/graph-io/xgmml`, keyed by the code without its `E_` / `W_` and `XGMML_` prefixes.

- `E_EMPTY_INPUT` (error): The input is empty or whitespace only. The import stops.
- `W_ENCODING_CONFLICT` (warning): A declared encoding the byte order mark contradicts (the mark wins).
- `E_UNKNOWN_NODE` (error): An edge endpoint that names no node (addMissingNodes false); the edge is skipped.
- `E_DUPLICATE_EDGE_ID` (error): An edge id used twice; the second edge is skipped.
- `E_XML_SYNTAX` (error): The input is not well-formed XML. The import stops.
- `E_INVALID_UTF8` (error): The input is not valid UTF-8. The import stops.
- `E_INVALID_ENCODING` (error): Some bytes are not valid in the encoding that was chosen (by a byte order mark, the file's declaration or the `encoding` option). The import stops.
- `W_ENCODING_FALLBACK` (warning): Undeclared non-UTF-8 bytes were read as windows-1252.
- `W_UNKNOWN_ENCODING` (warning): A declared encoding the platform cannot decode was ignored.
- `E_NO_GRAPH` (error): The root element is not `<graph>` (it may be an XHTML page with a graph inside, or a GraphML file). The import stops.
- `E_XGMML_VIEW_DOCUMENT` (error): The file is a Cytoscape session view (`cy:view="1"`), which holds only view settings and no nodes or edges. The import stops.
- `E_MISSING_ID` (error): A node with neither an id nor a label; it is skipped with its subtree.
- `W_XGMML_ID_FROM_LABEL` (warning): A node without an id; its label is used as the id.
- `W_XGMML_ID_AND_HREF` (warning): A node or edge with both an id and an `xlink:href`; it is read as the reference.
- `E_MISSING_ENDPOINT` (error): An edge without a source or a target that no label alias resolves.
- `W_XGMML_LABEL_ALIAS` (warning): Endpoints resolved through Cytoscape's `"a (pp) b"` label aliases; interactions filled from labels.
- `W_DUPLICATE_NODE` (warning): A node id declared twice; the declarations are merged.
- `W_XGMML_GROUP_DUPLICATE_EDGE` (warning): Cytoscape 2.x writes each edge of a group a second time, inside the group. The repeats are dropped, so every edge is read once; nothing is lost.
- `W_XGMML_BAD_DIRECTED` (warning): A `directed` or `cy:directed` value other than 0 / 1.
- `W_XGMML_DOCUMENT_VERSION` (warning): A `documentVersion` that does not parse; the dialect is chosen from the content.
- `W_XGMML_NO_NAMESPACE` (warning): A root `<graph>` with neither the XGMML namespace nor an XGMML DOCTYPE.
- `W_XGMML_BAD_ATT` (warning): A malformed `<att>`: a list with a value, a scalar with child atts, an att with no name.
- `W_XGMML_AMPERSAND_REPAIRED` (warning): A bare `&` read as `&amp;` under repairBareAmpersands.
- `W_XGMML_SURROGATE_PAIRED` (warning): Two surrogate character references joined under pairSurrogateReferences.
- `W_XGMML_EMPTY_LIST_TYPE` (warning): An empty list whose element type nothing states; a list of strings is assumed.
- `W_XGMML_RECORD_LIST` (warning): An attribute holds a structure a single column cannot (a list of records, a list of lists, a Cytoscape 2.x map or XML from another tool). Its value is kept as a JSON value, which a save as XGMML writes back.
- `W_XGMML_CROSS_FILE_REFERENCE` (warning): A pointer into another file (`file.xgmml#id`); kept as text.
- `W_XGMML_EDGE_NESTED_GRAPH` (warning): A graph nested in an edge's att; there is no model for it.
- `W_XGMML_ROOT_ONLY_ELEMENTS` (warning): Some nodes or edges of a Cytoscape session belong to none of its networks (Cytoscape keeps group meta-edges and the members of collapsed groups this way). They are not read; the message counts them.
- `E_BAD_VALUE` (error): A value that does not parse as its declared type; the cell is unset.
- `W_WIDENED` (warning): An attribute's type was widened because a later value did not fit: an integer above 2^31 in an integer column, or two declared types for one attribute.
- `W_PRECISION` (warning): An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit.
- `W_DANGLING_REFERENCE` (warning): A reference (xlink:href, nested-network pointer) that names nothing.
- `W_DUPLICATE_ATTRIBUTE` (warning): The same attribute twice on one element; the later value wins.
- `E_UNKNOWN_PARENT` (error): A group membership naming no node.
- `E_PARENT_CYCLE` (error): A group membership that would close a parent cycle; that link is dropped.
- `W_EQUATION_AS_TEXT` (warning): A Cytoscape formula kept as its text.
- `W_UNKNOWN_ATTR_TYPE` (warning): An att type XGMML and Cytoscape do not define; kept as text.
- `W_UNKNOWN_ELEMENT` (warning): An element XGMML does not define at that place; skipped with its subtree.
- `W_STRAY_TEXT` (warning): Character data where XGMML allows only elements, or inside an att.
- `W_MULTIPLE_GRAPHS` (warning): The file holds several graphs and only the first was read. It is not added when `graphIndex` or `graphName` chose the graph. `importAllGraphs()` reads every one.
- `E_GRAPH_NOT_FOUND` (error): `graphIndex` or `graphName` matches no network in the session. The import stops.
- `E_AMBIGUOUS_GRAPH_NAME` (error): `graphName` matches several networks in the session. The import stops.
- `W_COLUMN_RENAMED` (warning): An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example two attributes declared with the same name.
- `W_ROLE_TAKEN` (warning): You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.
- `W_ID_MERGED` (warning): Two different id texts became the same number because `ids` is "number", so their nodes were merged.
- `W_OPTION_IGNORED` (warning): You set an option this format does not use; it had no effect. The message names the option.
- `W_SINK_OPTION` (warning): You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.
- `W_DIRECTION_REFUSED` (warning): You read into a graph builder whose direction is already set, or which already holds edges, so the file is read with the builder's direction instead of its own.
- `W_DIRECTION_FORCED` (warning): Edges of the other direction were read with the direction `onMixedDirection` chose.
- `E_MIXED_DIRECTION` (error): The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a format that holds one direction per file fails with `E_DIRECTED`. Pass "directed" or "undirected" to read or write it anyway.

Like every format, it can also record the codes for unreadable input and for elements the graph refuses: [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED), [`E_INVALID_ID`](../codes.md#E_INVALID_ID), [`E_INVALID_WEIGHT`](../codes.md#E_INVALID_WEIGHT), [`E_DUPLICATE_EDGE`](../codes.md#E_DUPLICATE_EDGE), [`E_SELF_LOOP`](../codes.md#E_SELF_LOOP).

## Loss codes

The codes `checkExport(snapshot, "xgmml", options)` can return before a save, also exported as `XGMML_LOSS` from `@graphty/graph-io/xgmml`. An `E_` code means the save throws unless you change the graph or the options.

- `W_XGMML_JSON_AS_STRING` (warning): A json or nested-list column written as a string att.
- `W_XGMML_WIDENED_TYPE` (warning): An attribute type Cytoscape does not have is written as a wider one (a 32-bit float as Double, a large unsigned integer as Long, a byte as Integer, a dictionary as String).
- `E_XML_ILLEGAL_CHAR` (error, the save throws): A text value holds a character XML 1.0 forbids (most control characters); the save fails with `E_COLUMN_TYPE`.
- `W_TEMPORAL_DROPPED` (warning): A temporal column written as plain numbers.
- `W_TEMPORAL_TEXT_DROPPED` (warning): A temporal text companion written as a plain string att.
- `W_ROLE_DROPPED` (warning): An attribute with a role the format has no place for is written as a plain attribute; the role is lost.
- `W_PARENTS_DROPPED` (warning): A `parents` attribute (several parents per node) is not written because the graph also has a `parent` attribute.
- `W_MUTUAL_EXPANDED` (warning): A mutual pair written as two directed edges.
- `W_ID_TEXT_TYPE` (warning): Node ids whose text reads back as the other type.
- `W_XGMML_EDGE_ID_TEXT` (warning): Edge ids that are not text are written as text and read back as text.
- `W_XGMML_BACKSLASH_ESCAPE` (warning): Strings holding a literal backslash-n or backslash-t read back as newline / tab (Cytoscape's escapes).
- `W_XGMML_POSITION` (warning): A position that cannot be written as it is: another shape, a non-finite coordinate, a z read back in the z column.
- `W_XGMML_PARENT_CYCLE` (warning): Nodes whose parent chain never reaches a root are written at the top level.
- `W_COLUMN_NAME_CHANGED` (warning): An attribute with a role (for example, the label) is written where the format keeps that role, and reads back under the name the format's importer gives it.
- `W_ROLE_ASSUMED` (warning): An attribute without a role is written where the format keeps a role (for example, a `name` column as the label), and reads back with that role.
- `W_WEIGHT_KEY_CLASH` (warning): An attribute named `weight` without the weight role reads back as the edge weight.
- `W_STORAGE_CLASS_CHANGED` (warning): A text attribute reads back as a dictionary attribute, or the reverse, because the importer chooses by how often its values repeat. The values are the same.
- `W_XGMML_INTERACTION_FROM_LABEL` (warning): Edge labels shaped `a (i) b` read back with an `interaction` column (Cytoscape's label alias).

When the graph has something this format cannot hold, it can also return the [shared loss codes](../codes.md#shared-loss-codes): [`E_ID_CHARSET`](../codes.md#E_ID_CHARSET), [`E_ID_TEXT_COLLISION`](../codes.md#E_ID_TEXT_COLLISION), [`E_MIXED_DIRECTION`](../codes.md#E_MIXED_DIRECTION), [`W_COLUMN_DROPPED`](../codes.md#W_COLUMN_DROPPED), [`W_COMPONENTS_FLATTENED`](../codes.md#W_COMPONENTS_FLATTENED), [`W_DEFAULT_DROPPED`](../codes.md#W_DEFAULT_DROPPED), [`W_DTYPE_UNSUPPORTED`](../codes.md#W_DTYPE_UNSUPPORTED), [`W_DYNAMIC_VALUES_DROPPED`](../codes.md#W_DYNAMIC_VALUES_DROPPED), [`W_EDGE_IDS_DROPPED`](../codes.md#W_EDGE_IDS_DROPPED), [`W_EDGE_IDS_GENERATED`](../codes.md#W_EDGE_IDS_GENERATED), [`W_EMPTY_COLUMN_DROPPED`](../codes.md#W_EMPTY_COLUMN_DROPPED), [`W_EXTENSION_TABLE_DROPPED`](../codes.md#W_EXTENSION_TABLE_DROPPED), [`W_GRAPH_ATTRIBUTES_DROPPED`](../codes.md#W_GRAPH_ATTRIBUTES_DROPPED), [`W_HIERARCHY_DROPPED`](../codes.md#W_HIERARCHY_DROPPED), [`W_ID_MANGLED`](../codes.md#W_ID_MANGLED), [`W_ID_RENUMBERED`](../codes.md#W_ID_RENUMBERED), [`W_INTEGRAL_F64_AS_I32`](../codes.md#W_INTEGRAL_F64_AS_I32), [`W_JSON_UNSUPPORTED`](../codes.md#W_JSON_UNSUPPORTED), [`W_LIST_UNSUPPORTED`](../codes.md#W_LIST_UNSUPPORTED), [`W_MIXED_DIRECTION`](../codes.md#W_MIXED_DIRECTION), [`W_MULTI_EDGES`](../codes.md#W_MULTI_EDGES), [`W_MUTUAL_AS_UNDIRECTED`](../codes.md#W_MUTUAL_AS_UNDIRECTED), [`W_NONFINITE_AS_NULL`](../codes.md#W_NONFINITE_AS_NULL), [`W_OPEN_INTERVAL`](../codes.md#W_OPEN_INTERVAL), [`W_OPTIONS_DROPPED`](../codes.md#W_OPTIONS_DROPPED), [`W_OPTIONS_GAINED`](../codes.md#W_OPTIONS_GAINED), [`W_POSITIONS_DROPPED`](../codes.md#W_POSITIONS_DROPPED), [`W_SELF_LOOPS`](../codes.md#W_SELF_LOOPS), [`W_SPELLS_DROPPED`](../codes.md#W_SPELLS_DROPPED), [`W_TEXT_INFERRED`](../codes.md#W_TEXT_INFERRED), [`W_VIZ_DROPPED`](../codes.md#W_VIZ_DROPPED), [`W_WEIGHTS_DROPPED`](../codes.md#W_WEIGHTS_DROPPED).

<!-- generated:end -->
