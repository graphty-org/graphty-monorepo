# Cytoscape session (.cys)

A Cytoscape session (`.cys`) is the file [Cytoscape Desktop](https://cytoscape.org/) saves: a zip
archive of every network open at the time, with their tables and views. It is the one binary
format graph-io reads and writes, so always give it bytes, never text.

## At a glance

<!-- generated:begin glance:cys -->

|                         |                         |
| ----------------------- | ----------------------- |
| Import from             | `@graphty/graph-io/cys` |
| Format name             | `cys`                   |
| Extensions              | `.cys`                  |
| MIME types              | `application/zip`       |
| Reads                   | yes                     |
| Writes                  | yes                     |
| Several graphs per file | yes (`importAllGraphs`) |
| Lists its graphs        | yes (`listGraphs`)      |

What a saved file can hold (the [capabilities](./index.md#what-the-capabilities-mean) explain each row):

| Capability                                      | Value                              |
| ----------------------------------------------- | ---------------------------------- |
| [`mixedDirection`](./index.md#mixeddirection)   | yes                                |
| [`multiEdges`](./index.md#multiedges)           | yes                                |
| [`selfLoops`](./index.md#selfloops)             | yes                                |
| [`edgeIds`](./index.md#edgeids)                 | required                           |
| [`idCharset`](./index.md#idcharset)             | integer                            |
| [`dtypes`](./index.md#dtypes)                   | string, dict, f64, i32, bool, list |
| [`components`](./index.md#components)           | no                                 |
| [`lists`](./index.md#lists)                     | yes                                |
| [`json`](./index.md#json)                       | no                                 |
| [`defaults`](./index.md#defaults)               | no                                 |
| [`options`](./index.md#options)                 | no                                 |
| [`hierarchy`](./index.md#hierarchy)             | no                                 |
| [`temporal`](./index.md#temporal)               | none                               |
| [`graphAttributes`](./index.md#graphattributes) | yes                                |
| [`positions`](./index.md#positions)             | yes                                |
| [`viz`](./index.md#viz)                         | no                                 |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/cys -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph, listGraphs } from "@graphty/graph-io";

// A session is a zip file: always pass bytes, never text
const session = await readFile("networks.cys");
for (const g of (await listGraphs(session, { filename: "networks.cys" })) ?? []) {
    console.log(`network ${g.index}: ${g.name}`);
}
const { snapshot } = await importGraph(session, { filename: "networks.cys", graphName: "Alpha" });
console.log(`Alpha: ${snapshot.nodeCount} nodes; node columns: ${snapshot.nodes.names().join(", ")}`);

// Write any graph as a session Cytoscape Desktop can open; session node ids are integers
const got = await importGraph(await readFile("got-network.graphml"), { filename: "got-network.graphml" });
const options = { sanitizeIds: "mangle" } as const;
console.log(checkExport(got.snapshot, "cys", options).map((n) => n.code));
await writeFile("got.cys", await exportGraphToBytes(got.snapshot, "cys", options));
```

<!-- generated:end -->

<!-- generated:begin output:formats/cys -->

```text
network 0: Beta
network 1: Alpha
Alpha: 4 nodes; node columns: graphics, name, position, z, selected, score, count, big, tags, flags, formula, note, shared name, species, count#SHARED_ATTRS, appScore, count#MYAPP, parent, xgmml.subgraph, position@2
[
  'W_COLUMN_NAME_CHANGED',
  'W_ID_MANGLED',
  'W_EDGE_IDS_GENERATED',
  'W_CYS_UNSET_AS_EMPTY_STRING',
  'W_STORAGE_CLASS_CHANGED'
]
```

<!-- generated:end -->

A session usually holds several networks. `listGraphs()` names them, and `graphName` or
`graphIndex` picks one; `importAllGraphs()` reads them all.

## How graph-io reads it

- The zip archive is read with no extra dependency. Encrypted archives and compression methods
  other than deflate are refused by name.
- Each network of the session is one graph. Without `graphIndex` or `graphName`, the first one is
  read.
- Cytoscape 3 sessions: the network's topology, its node, edge and network tables as columns
  (including shared columns and the hidden columns apps add), positions from its first view (y
  pointing up; further views as `position@2`, ...), and the view's per-element visual values in the
  `graphics` column. Cytoscape 2 sessions: one XGMML file per network, with the selection and hidden
  state in `cytoscape.selected` and `cytoscape.hidden`.
- A table's `name` column is the label, as Cytoscape shows it, and a network's `weight` edge column
  is the weight.
- Groups become a parent column; the members of a collapsed group are listed in
  `snapshot.meta.extra.cytoscape.groups`.
- Styles are not applied (`W_STYLES_NOT_IMPORTED`). Apps, properties and images in the archive are
  skipped with `W_CYS_ENTRY_SKIPPED`.
- Text input is refused (`E_CYS_NOT_ZIP`).
- To protect against zip bombs, an import stops (`E_TOO_LARGE`) once it would inflate more than
  `maxUncompressedBytes` (2 GiB by default) or an entry is compressed more than 1000 to 1.

## What a saved file keeps and loses

graph-io writes a session Cytoscape Desktop 3 opens, holding one network with its columns as
tables and the label as `name`. It writes a view only when the graph has positions: graph-io does
not compute a layout, so without positions you create the view in Cytoscape.

Opening a session in Cytoscape replaces everything open there. To add a network to an open
session, save [XGMML](./xgmml.md) or [CX2](./cx2.md) instead.

What does not survive:

- Cytoscape identifies every node by a SUID, a positive integer, and keeps the node's id as text in
  its `name` and `shared name` columns. So the node ids of a graph you save must be positive
  integers, which become the SUIDs. Other ids need `sanitizeIds: "mangle"`, which numbers the nodes
  and keeps the originals in a `graphty:originalId` column; graph-io restores them.
- graph-io reads a session's node ids from the `name` column, which is text, so number ids read
  back as text (`W_ID_TEXT_TYPE`).
- Cytoscape's tables have no empty text cell, so a text cell with no value reads back as `""`
  (`W_CYS_UNSET_AS_EMPTY_STRING`).
- List cells are joined with line breaks (`W_CYS_LIST_ITEMS`), JSON values are written as text
  (`W_CYS_JSON_AS_STRING`), and text starting with `=` is a formula to Cytoscape
  (`W_CYS_TEXT_AS_EQUATION`).
- A column named like one of Cytoscape's own (`SUID`, a `name` that is not text, or a name that
  differs from one only in case) is renamed `<name>#2` (`W_COLUMN_NAME_CHANGED`).
- Edge ids are generated when the graph has none (`W_EDGE_IDS_GENERATED`).
- Groups, styles and time columns are not written.
- The archive is stored without compression, so it is larger than the same session saved by
  Cytoscape.

<!-- generated:begin reference:cys -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).
A file can hold several graphs: pick one with the `graphIndex` or `graphName` option of [importGraph()](../options.md#importgraph-and-importallgraphs), as [Files that hold several graphs](../loading.md#files-that-hold-several-graphs) shows.

| Option                                                 | Type                     | Default      | Meaning                                                                                                                                                                     |
| ------------------------------------------------------ | ------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zAs`                                                  | `"column" \| "position"` | `"column"`   | Where Cytoscape's `z` value (a drawing order, not a depth) goes: "column" keeps it as a node attribute named `z`; "position" makes it the third coordinate of the position. |
| [`maxUncompressedBytes`](#import-maxuncompressedbytes) | `number`                 | `2147483648` | The most bytes one import may unpack from the session archive, in total (2 GiB).                                                                                            |

- <a id="import-maxuncompressedbytes"></a>`maxUncompressedBytes`: The most bytes one import may unpack from the session archive, in total (2 GiB). A file that would unpack to more, or one compressed more than 1000 to 1, fails with `E_TOO_LARGE`.

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

This format has no options of its own.

## Import issue codes

The codes this format's import report can hold. They are also exported as `CYS_ISSUE` from `@graphty/graph-io/cys`, keyed by the code without its `E_` / `W_` and `CYS_` prefixes.

- `E_EMPTY_INPUT` (error): The input is empty.
- `E_TOO_LARGE` (error): The archive inflates beyond maxUncompressedBytes, or an entry beyond the ratio limit.
- `W_ENCODING_FALLBACK` (warning): A session XML entry that is not UTF-8 and declares no encoding was read as windows-1252.
- `W_UNKNOWN_ENCODING` (warning): A session XML entry declares an encoding the platform cannot decode; read as UTF-8.
- `E_XML_SYNTAX` (error): The XML is not well-formed; the message says where. The import stops.
- `E_INVALID_UTF8` (error): The input is not valid UTF-8. The import stops.
- `E_INVALID_ENCODING` (error): Some bytes are not valid in the encoding that was chosen (by a byte order mark, the file's own declaration or the `encoding` option). The import stops.
- `E_NO_GRAPH` (error): The session holds no network.
- `E_XGMML_VIEW_DOCUMENT` (error): The file is a Cytoscape session view (`cy:view="1"`), which holds only view settings and no nodes or edges. The import stops.
- `E_MISSING_ID` (error): The element (node, attribute, key, ...) has no id where the format requires one.
- `W_XGMML_ID_FROM_LABEL` (warning): A node without an id; its label is used as the id.
- `W_XGMML_ID_AND_HREF` (warning): A node or edge with both an id and an `xlink:href`; it is read as the reference.
- `E_MISSING_ENDPOINT` (error): An edge has no source or no target.
- `W_XGMML_LABEL_ALIAS` (warning): Endpoints resolved through Cytoscape's `"a (pp) b"` label aliases; interactions filled from labels.
- `W_DUPLICATE_NODE` (warning): A node id declared twice; the second declaration merges into the first.
- `W_XGMML_GROUP_DUPLICATE_EDGE` (warning): A meta-edge the 2.x writer repeats inside a group; the copy is dropped.
- `W_XGMML_BAD_DIRECTED` (warning): A `directed` or `cy:directed` value other than 0 / 1.
- `W_XGMML_DOCUMENT_VERSION` (warning): A `documentVersion` that does not parse; the dialect is chosen from the content.
- `W_XGMML_NO_NAMESPACE` (warning): A root `<graph>` with neither the XGMML namespace nor an XGMML DOCTYPE.
- `W_XGMML_BAD_ATT` (warning): A malformed `<att>`: a list with a value, a scalar with child atts, an att with no name.
- `W_XGMML_AMPERSAND_REPAIRED` (warning): A bare `&` read as `&amp;` under repairBareAmpersands.
- `W_XGMML_SURROGATE_PAIRED` (warning): Two surrogate character references joined under pairSurrogateReferences.
- `W_XGMML_EMPTY_LIST_TYPE` (warning): An empty list whose element type nothing states; a list of strings is assumed.
- `W_XGMML_RECORD_LIST` (warning): A record list, a list of lists, a 2.x map or foreign XML in an att, kept as json.
- `W_XGMML_CROSS_FILE_REFERENCE` (warning): A pointer into another file (`file.xgmml#id`); kept as text.
- `W_XGMML_EDGE_NESTED_GRAPH` (warning): A graph nested in an edge's att; there is no model for it.
- `W_XGMML_ROOT_ONLY_ELEMENTS` (warning): Elements of a session network declared outside every registered subnetwork.
- `E_BAD_VALUE` (error): A value does not parse as its declared type; the cell is left unset.
- `W_WIDENED` (warning): An attribute's type was widened because a later value did not fit: an integer above 2^31 in an integer column, or two declared types for one attribute.
- `W_PRECISION` (warning): An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit.
- `W_DANGLING_REFERENCE` (warning): A view, table or network the session names but does not hold.
- `W_DUPLICATE_ATTRIBUTE` (warning): The same attribute twice on one element; one value is kept (the later, unless the format's specification says the first).
- `E_UNKNOWN_PARENT` (error): A `pid` / parent reference names a node the document never declares.
- `E_PARENT_CYCLE` (error): A containment link would close a parent cycle; that one link is dropped.
- `W_EQUATION_AS_TEXT` (warning): A formula (Cytoscape's `=ABS($x)`) is kept as its text; it is never evaluated.
- `W_UNKNOWN_ATTR_TYPE` (warning): The declared type is not one the format defines; the column is kept as string.
- `W_UNKNOWN_ELEMENT` (warning): An element the format does not define at that place was skipped.
- `W_STRAY_TEXT` (warning): Text where the format allows only elements was ignored.
- `W_MULTIPLE_GRAPHS` (warning): The file holds several graphs and only one was read: the first, or the one `graphIndex` or `graphName` chose. `importAllGraphs()` reads every one.
- `E_GRAPH_NOT_FOUND` (error): `graphIndex` or `graphName` matches no network in the session. The import stops.
- `E_AMBIGUOUS_GRAPH_NAME` (error): `graphName` matches several networks in the session. The import stops.
- `W_COLUMN_RENAMED` (warning): An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example a repeated column header.
- `W_ROLE_TAKEN` (warning): You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.
- `W_ID_MERGED` (warning): Two different id texts became the same number because `ids` is "number" ("042" and "42", say), so their nodes were merged.
- `W_OPTION_IGNORED` (warning): You set an option this format does not use; it had no effect. The message names the option.
- `W_SINK_OPTION` (warning): You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.
- `W_DIRECTION_REFUSED` (warning): You read into a graph builder that already holds edges (or whose direction is locked), and its direction differs from the file's, so the file is read with the builder's direction. A builder without edges takes the file's direction.
- `W_DIRECTION_FORCED` (warning): `onMixedDirection` ("directed" or "undirected") made edges take a direction the file did not give them. It can appear twice in one report: once for the direction the file declares and once for the edges that declared their own.
- `E_MIXED_DIRECTION` (error): The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a format that holds one direction per file fails with `E_DIRECTED`. Pass "directed" or "undirected" to read or write it anyway.
- `E_CYS_NOT_ZIP` (error): The input is not a zip archive (or is text).
- `E_CYS_CORRUPT` (error): The archive is damaged: no end record, offsets outside the file, a bad CRC, truncated data.
- `E_CYS_NOT_SESSION` (error): A zip without a session marker (`<x.y.z>.version` or `cysession.xml`).
- `E_CYS_UNSUPPORTED` (error): A zip feature the reader does not support: encryption, a compression method, split archives.
- `E_CYS_VERSION` (error): A session version graph-io cannot read: a major above 3, or the 2011 3.0 pre-release layout.
- `E_CYS_TABLE` (error): A table or a virtual column that cannot be read at all; it is skipped.
- `W_CYS_TABLE_ROW` (warning): Table rows with too few or too many cells, a repeated key, or a key matching no element.
- `W_CYS_COLLAPSED_GROUP` (warning): The members of a collapsed group are not in the network itself; they are listed in `snapshot.meta.extra`.
- `W_CYS_ENTRY_SKIPPED` (warning): Entries the importer does not read (apps, global tables, properties, images, thumbnails).
- `W_CYS_DUPLICATE_ENTRY` (warning): Two entries with one name; the first is read.
- `W_CYS_SESSION_RECORD` (warning): A cysession.xml network record without an id, or naming a file an earlier record names.
- `W_STYLES_NOT_IMPORTED` (warning): The session's styles are not applied.

Like every format, it can also record the codes for unreadable input and for elements the graph refuses: [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED), [`E_INVALID_ID`](../codes.md#E_INVALID_ID), [`E_UNKNOWN_NODE`](../codes.md#E_UNKNOWN_NODE), [`E_INVALID_WEIGHT`](../codes.md#E_INVALID_WEIGHT), [`E_DUPLICATE_EDGE`](../codes.md#E_DUPLICATE_EDGE), [`E_SELF_LOOP`](../codes.md#E_SELF_LOOP), [`E_DUPLICATE_EDGE_ID`](../codes.md#E_DUPLICATE_EDGE_ID).

## Loss codes

The codes `checkExport(snapshot, "cys", options)` can return before a save, also exported as `CYS_LOSS` from `@graphty/graph-io/cys`. An `E_` code means the save throws unless you change the graph or the options.

- `W_CYS_UNSET_AS_EMPTY_STRING` (warning): CyCSV has no unset text cell: an unset cell of a text column reads back as "".
- `W_CYS_LIST_ITEMS` (warning): List cells CyCSV cannot hold exactly: an unset or empty list of text reads back as [""], an empty list of numbers or booleans reads back unset, trailing empty text items vanish, and an item holding a newline splits in two.
- `W_CYS_TEXT_AS_EQUATION` (warning): A text cell starting with "=" is a formula to Cytoscape (an error cell there); graph-io reads it back as text.
- `W_CYS_JSON_AS_STRING` (warning): A nested (json) column is written as a text column holding its JSON text.
- `W_CYS_POSITION` (warning): A position that cannot be written as it is: another shape, a non-finite coordinate, a z read back in the z column.
- `W_COLUMN_NAME_CHANGED` (warning): An attribute with a role (the label, say) is written where the format keeps that role, and reads back under the name the format's importer gives it.
- `W_ROLE_ASSUMED` (warning): An attribute without a role is written where the format keeps a role (a `name` column as the label, say), and reads back with that role.
- `W_MUTUAL_EXPANDED` (warning): A mutual pair is written as two directed edges without its mark.
- `W_ID_TEXT_TYPE` (warning): Node ids that are numbers read back as their text.
- `E_ID_TEXT_COLLISION` (error, the save throws): Two node ids would be written as the same text (the number 5 and the text "5"); the save fails with `E_INVALID_ID`.
- `E_ID_CHARSET` (error, the save throws): Node ids the format cannot write, under `sanitizeIds: "error"`; the save fails with `E_INVALID_ID`. Pass `sanitizeIds: "mangle"` to rewrite them.
- `W_ID_MANGLED` (warning): Node ids that are not positive integers under sanitizeIds "mangle": renumbered, originals kept.
- `W_EDGE_IDS_GENERATED` (warning): Edges without a usable id get generated SUIDs.
- `W_DTYPE_UNSUPPORTED` (warning): An attribute type Cytoscape stores as a wider one (a 32-bit float as Double, a byte as Integer), or a label that is not text and is written as text; it reads back with the Cytoscape type.
- `W_EMPTY_COLUMN_DROPPED` (warning): A column whose every cell is unset (and which is not text) vanishes.
- `W_STORAGE_CLASS_CHANGED` (warning): A text attribute reads back as a dictionary attribute, or the reverse, because the importer chooses by how often its values repeat. The values are the same.
- `W_WEIGHT_KEY_CLASH` (warning): A plain `weight` edge column reads back as the edge weight.
- `W_HIERARCHY_DROPPED` (warning): A parent / parents column: groups are not written.
- `W_TEMPORAL_DROPPED` (warning): A start / end / timestamp column: sessions have no time.
- `W_ROLE_DROPPED` (warning): An attribute with a role the format has no place for is written as a plain attribute; the role is lost.
- `W_EXTENSION_TABLE_DROPPED` (warning): An extension table the session cannot carry.

When the graph has something this format cannot hold, it can also return the [shared loss codes](../codes.md#shared-loss-codes): [`E_MIXED_DIRECTION`](../codes.md#E_MIXED_DIRECTION), [`E_XML_ILLEGAL_CHAR`](../codes.md#E_XML_ILLEGAL_CHAR), [`W_COLUMN_DROPPED`](../codes.md#W_COLUMN_DROPPED), [`W_COMPONENTS_FLATTENED`](../codes.md#W_COMPONENTS_FLATTENED), [`W_DEFAULT_DROPPED`](../codes.md#W_DEFAULT_DROPPED), [`W_DYNAMIC_VALUES_DROPPED`](../codes.md#W_DYNAMIC_VALUES_DROPPED), [`W_EDGE_IDS_DROPPED`](../codes.md#W_EDGE_IDS_DROPPED), [`W_GRAPH_ATTRIBUTES_DROPPED`](../codes.md#W_GRAPH_ATTRIBUTES_DROPPED), [`W_ID_RENUMBERED`](../codes.md#W_ID_RENUMBERED), [`W_INTEGRAL_F64_AS_I32`](../codes.md#W_INTEGRAL_F64_AS_I32), [`W_JSON_UNSUPPORTED`](../codes.md#W_JSON_UNSUPPORTED), [`W_LIST_UNSUPPORTED`](../codes.md#W_LIST_UNSUPPORTED), [`W_MIXED_DIRECTION`](../codes.md#W_MIXED_DIRECTION), [`W_MULTI_EDGES`](../codes.md#W_MULTI_EDGES), [`W_MUTUAL_AS_UNDIRECTED`](../codes.md#W_MUTUAL_AS_UNDIRECTED), [`W_NONFINITE_AS_NULL`](../codes.md#W_NONFINITE_AS_NULL), [`W_OPEN_INTERVAL`](../codes.md#W_OPEN_INTERVAL), [`W_OPTIONS_DROPPED`](../codes.md#W_OPTIONS_DROPPED), [`W_OPTIONS_GAINED`](../codes.md#W_OPTIONS_GAINED), [`W_PARENTS_DROPPED`](../codes.md#W_PARENTS_DROPPED), [`W_POSITIONS_DROPPED`](../codes.md#W_POSITIONS_DROPPED), [`W_SELF_LOOPS`](../codes.md#W_SELF_LOOPS), [`W_SPELLS_DROPPED`](../codes.md#W_SPELLS_DROPPED), [`W_TEMPORAL_TEXT_DROPPED`](../codes.md#W_TEMPORAL_TEXT_DROPPED), [`W_TEXT_INFERRED`](../codes.md#W_TEXT_INFERRED), [`W_VIZ_DROPPED`](../codes.md#W_VIZ_DROPPED), [`W_WEIGHTS_DROPPED`](../codes.md#W_WEIGHTS_DROPPED).

<!-- generated:end -->
