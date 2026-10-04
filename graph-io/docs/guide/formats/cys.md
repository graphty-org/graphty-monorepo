# Cytoscape session (.cys)

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

What a saved file can hold:

| Capability        | Value                              | Meaning                                                                         |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| `mixedDirection`  | yes                                | Directed and undirected edges in one file.                                      |
| `multiEdges`      | yes                                | Parallel edges.                                                                 |
| `selfLoops`       | yes                                | Self-loops.                                                                     |
| `edgeIds`         | required                           | Whether edge ids are required (generated when absent), optional or unsupported. |
| `idCharset`       | integer                            | Which node ids can be written unchanged.                                        |
| `dtypes`          | string, dict, f64, i32, bool, list | The column dtypes the format keeps as declared.                                 |
| `components`      | no                                 | Multi-component (stride) columns.                                               |
| `lists`           | yes                                | List columns.                                                                   |
| `json`            | no                                 | Nested json columns.                                                            |
| `defaults`        | no                                 | Declared defaults.                                                              |
| `options`         | no                                 | Declared enumerations (GEXF options).                                           |
| `hierarchy`       | no                                 | Containment (parent / parents roles).                                           |
| `temporal`        | none                               | Temporal support level.                                                         |
| `graphAttributes` | yes                                | Graph-level attributes.                                                         |
| `positions`       | yes                                | The position role.                                                              |
| `viz`             | no                                 | The visual roles (color, size, shape, thickness).                               |

<!-- generated:end -->

## Loading

## Saving

## How graph-io reads it

## What a saved file keeps and loses

<!-- generated:begin reference:cys -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option                 | Type                     | Default | Meaning                                                                                                                                              |
| ---------------------- | ------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zAs`                  | `"column" \| "position"` |         | Where Cytoscape's z (a stacking order) goes: the `z` column (default) or the position.                                                               |
| `maxUncompressedBytes` | `number`                 | `2`     | The most bytes one import may inflate, in total (default 2 GiB); an entry beyond it, or one whose compression ratio is above 1000:1, is E_TOO_LARGE. |
| `graphIndex`           | `number`                 |         | The 0-based position of the graph, as `GraphListing.index` gives it.                                                                                 |
| `graphName`            | `string`                 |         | The name of the graph, as `GraphListing.name` gives it; a name two graphs share is refused.                                                          |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

No options of its own.

## Import issue codes

The codes this format's import report can hold, also exported as `CYS_ISSUE` from `@graphty/graph-io/cys`.

| Code                           | Key                          | Severity | Meaning                                                                                                                                         |
| ------------------------------ | ---------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_EMPTY_INPUT`                | `EMPTY_INPUT`                | error    | The input is empty.                                                                                                                             |
| `E_TOO_LARGE`                  | `TOO_LARGE`                  | error    | The archive inflates beyond maxUncompressedBytes, or an entry beyond the ratio limit.                                                           |
| `W_ENCODING_CONFLICT`          | `ENCODING_CONFLICT`          | warning  | A byte order mark, the encoding option and the declared encoding disagree.                                                                      |
| `W_CONTROL_CHARACTER`          | `CONTROL_CHARACTER`          | warning  | A control character or a stray U+FEFF in the text, or an ignored trailing Ctrl-Z.                                                               |
| `E_FOREIGN_FORMAT`             | `FOREIGN_FORMAT`             | error    | The input is an HTML page, a PDF, compressed or archived data or an image (fatal).                                                              |
| `W_ISSUES_SUPPRESSED`          | `ISSUES_SUPPRESSED`          | warning  | Warnings of one code beyond the number a report keeps, counted in one warning.                                                                  |
| `W_ENCODING_FALLBACK`          | `ENCODING_FALLBACK`          | warning  | A session XML entry that is not UTF-8 and declares no encoding was read as windows-1252.                                                        |
| `W_UNKNOWN_ENCODING`           | `UNKNOWN_ENCODING`           | warning  | A session XML entry declares an encoding the platform cannot decode; read as UTF-8.                                                             |
| `E_XML_SYNTAX`                 | `XML_SYNTAX`                 | error    | The XML is not well-formed (fatal; the message carries the detail and the line).                                                                |
| `E_INVALID_UTF8`               | `INVALID_UTF8`               | error    | An invalid UTF-8 sequence in the input (fatal).                                                                                                 |
| `E_INVALID_ENCODING`           | `INVALID_ENCODING`           | error    | Bytes that are not valid in the encoding a BOM, a declaration or the `encoding` option chose (fatal).                                           |
| `E_NO_GRAPH`                   | `NO_GRAPH`                   | error    | The session holds no network.                                                                                                                   |
| `E_XGMML_VIEW_DOCUMENT`        | `XGMML_VIEW_DOCUMENT`        | error    | Fatal: a session view document (`cy:view="1"`): view SUIDs and no topology.                                                                     |
| `E_MISSING_ID`                 | `MISSING_ID`                 | error    | The element (node, attribute, key, ...) has no id where the format requires one.                                                                |
| `W_XGMML_ID_FROM_LABEL`        | `XGMML_ID_FROM_LABEL`        | warning  | A node without an id; its label is used as the id.                                                                                              |
| `W_XGMML_ID_AND_HREF`          | `XGMML_ID_AND_HREF`          | warning  | A node or edge with both an id and an `xlink:href`; it is read as the reference.                                                                |
| `E_MISSING_ENDPOINT`           | `MISSING_ENDPOINT`           | error    | An edge has no source or no target.                                                                                                             |
| `E_UNKNOWN_NODE`               | `UNKNOWN_NODE`               | error    | An edge endpoint that names no declared node under `addMissingNodes: false`; the edge is skipped.                                               |
| `W_XGMML_LABEL_ALIAS`          | `XGMML_LABEL_ALIAS`          | warning  | Endpoints resolved through Cytoscape's `"a (pp) b"` label aliases; interactions filled from labels.                                             |
| `W_DUPLICATE_NODE`             | `DUPLICATE_NODE`             | warning  | A node id declared twice; the second declaration merges into the first.                                                                         |
| `E_DUPLICATE_EDGE_ID`          | `DUPLICATE_EDGE_ID`          | error    | A repeated edge id in a format whose edge ids are unique; the second edge is skipped.                                                           |
| `W_XGMML_GROUP_DUPLICATE_EDGE` | `XGMML_GROUP_DUPLICATE_EDGE` | warning  | A meta-edge the 2.x writer repeats inside a group; the copy is dropped.                                                                         |
| `W_XGMML_BAD_DIRECTED`         | `XGMML_BAD_DIRECTED`         | warning  | A `directed` or `cy:directed` value other than 0 / 1.                                                                                           |
| `W_XGMML_DOCUMENT_VERSION`     | `XGMML_DOCUMENT_VERSION`     | warning  | A `documentVersion` that does not parse; the dialect is chosen from the content.                                                                |
| `W_XGMML_NO_NAMESPACE`         | `XGMML_NO_NAMESPACE`         | warning  | A root `<graph>` with neither the XGMML namespace nor an XGMML DOCTYPE.                                                                         |
| `W_XGMML_BAD_ATT`              | `XGMML_BAD_ATT`              | warning  | A malformed `<att>`: a list with a value, a scalar with child atts, an att with no name.                                                        |
| `W_XGMML_AMPERSAND_REPAIRED`   | `XGMML_AMPERSAND_REPAIRED`   | warning  | A bare `&` read as `&amp;` under repairBareAmpersands.                                                                                          |
| `W_XGMML_SURROGATE_PAIRED`     | `XGMML_SURROGATE_PAIRED`     | warning  | Two surrogate character references joined under pairSurrogateReferences.                                                                        |
| `W_XGMML_EMPTY_LIST_TYPE`      | `XGMML_EMPTY_LIST_TYPE`      | warning  | An empty list whose element type nothing states; a list of strings is assumed.                                                                  |
| `W_XGMML_RECORD_LIST`          | `XGMML_RECORD_LIST`          | warning  | A record list, a list of lists, a 2.x map or foreign XML in an att, kept as json.                                                               |
| `W_XGMML_CROSS_FILE_REFERENCE` | `XGMML_CROSS_FILE_REFERENCE` | warning  | A pointer into another file (`file.xgmml#id`); kept as text.                                                                                    |
| `W_XGMML_EDGE_NESTED_GRAPH`    | `XGMML_EDGE_NESTED_GRAPH`    | warning  | A graph nested in an edge's att; there is no model for it.                                                                                      |
| `W_XGMML_ROOT_ONLY_ELEMENTS`   | `XGMML_ROOT_ONLY_ELEMENTS`   | warning  | Elements of a session network declared outside every registered subnetwork.                                                                     |
| `E_BAD_VALUE`                  | `BAD_VALUE`                  | error    | A value does not parse as its declared type; the cell is left unset.                                                                            |
| `W_WIDENED`                    | `WIDENED`                    | warning  | A column's dtype was widened because a later value did not fit: an i32 column meeting a value above 2^31, two declared types for one attribute. |
| `W_PRECISION`                  | `PRECISION`                  | warning  | A long value beyond 2^53 was stored as the nearest f64.                                                                                         |
| `W_DANGLING_REFERENCE`         | `DANGLING_REFERENCE`         | warning  | A view, table or network the session names but does not hold.                                                                                   |
| `W_DUPLICATE_ATTRIBUTE`        | `DUPLICATE_ATTRIBUTE`        | warning  | The same attribute twice on one element; one value is kept (the later, unless the format's specification says the first).                       |
| `E_UNKNOWN_PARENT`             | `UNKNOWN_PARENT`             | error    | A `pid` / parent reference names a node the document never declares.                                                                            |
| `E_PARENT_CYCLE`               | `PARENT_CYCLE`               | error    | A containment link would close a parent cycle; that one link is dropped.                                                                        |
| `W_EQUATION_AS_TEXT`           | `EQUATION_AS_TEXT`           | warning  | A formula (Cytoscape's `=ABS($x)`) is kept as its text; it is never evaluated.                                                                  |
| `W_UNKNOWN_ATTR_TYPE`          | `UNKNOWN_ATTR_TYPE`          | warning  | The declared type is not one the format defines; the column is kept as string.                                                                  |
| `W_UNKNOWN_ELEMENT`            | `UNKNOWN_ELEMENT`            | warning  | An element the format does not define at that place was skipped.                                                                                |
| `W_STRAY_TEXT`                 | `STRAY_TEXT`                 | warning  | Text where the format allows only elements was ignored.                                                                                         |
| `W_MULTIPLE_GRAPHS`            | `MULTIPLE_GRAPHS`            | warning  | The session holds several networks; one was read.                                                                                               |
| `E_GRAPH_NOT_FOUND`            | `GRAPH_NOT_FOUND`            | error    | graphIndex / graphName names no network (fatal).                                                                                                |
| `E_AMBIGUOUS_GRAPH_NAME`       | `AMBIGUOUS_GRAPH_NAME`       | error    | graphName names several networks (fatal).                                                                                                       |
| `W_COLUMN_RENAMED`             | `COLUMN_RENAMED`             | warning  | A column was renamed `<name>#<origin.id>` because the name was taken in the sink's table.                                                       |
| `W_ROLE_TAKEN`                 | `ROLE_TAKEN`                 | warning  | A column's role was dropped because another column of the table already holds it.                                                               |
| `W_ID_MERGED`                  | `ID_MERGED`                  | warning  | Two distinct id texts became one number under ids "number".                                                                                     |
| `W_OPTION_IGNORED`             | `OPTION_IGNORED`             | warning  | A common option the format has no use for (or cannot honour) was given a non-default value.                                                     |
| `W_SINK_OPTION`                | `SINK_OPTION`                | warning  | A builder-policy option the caller asked for that the sink does not honour.                                                                     |
| `W_DIRECTION_REFUSED`          | `DIRECTION_REFUSED`          | warning  | The sink refused the file's direction (locked or non-empty); the file is read as the sink's.                                                    |
| `W_DIRECTION_FORCED`           | `DIRECTION_FORCED`           | warning  | Edges of the other direction were forced to the policy's direction.                                                                             |
| `E_MIXED_DIRECTION`            | `MIXED_DIRECTION`            | error    | A mixed-direction file under onMixedDirection "error" (import), or a mixed snapshot under the same export policy.                               |
| `E_CYS_NOT_ZIP`                | `NOT_ZIP`                    | error    | The input is not a zip archive (or is text).                                                                                                    |
| `E_CYS_CORRUPT`                | `CORRUPT`                    | error    | The archive is damaged: no end record, offsets outside the file, a bad CRC, truncated data.                                                     |
| `E_CYS_NOT_SESSION`            | `NOT_SESSION`                | error    | A zip without a session marker (`<x.y.z>.version` or `cysession.xml`).                                                                          |
| `E_CYS_UNSUPPORTED`            | `UNSUPPORTED`                | error    | A zip feature the reader does not support: encryption, a compression method, split archives.                                                    |
| `E_CYS_VERSION`                | `VERSION`                    | error    | A session version graph-io cannot read: a major above 3, or the 2011 3.0 pre-release layout.                                                    |
| `E_CYS_TABLE`                  | `TABLE`                      | error    | A table or a virtual column that cannot be read at all; it is skipped.                                                                          |
| `W_CYS_TABLE_ROW`              | `TABLE_ROW`                  | warning  | Table rows with too few or too many cells, a repeated key, or a key matching no element.                                                        |
| `W_CYS_COLLAPSED_GROUP`        | `COLLAPSED_GROUP`            | warning  | A collapsed group's members are not in the network; they are recorded in meta.extra.                                                            |
| `W_CYS_ENTRY_SKIPPED`          | `ENTRY_SKIPPED`              | warning  | Entries the importer does not read (apps, global tables, properties, images, thumbnails).                                                       |
| `W_CYS_DUPLICATE_ENTRY`        | `DUPLICATE_ENTRY`            | warning  | Two entries with one name; the first is read.                                                                                                   |
| `W_CYS_SESSION_RECORD`         | `SESSION_RECORD`             | warning  | A cysession.xml network record without an id, or naming a file an earlier record names.                                                         |
| `W_STYLES_NOT_IMPORTED`        | `STYLES_NOT_IMPORTED`        | warning  | The session's styles are not applied (issue #706).                                                                                              |

## Loss codes

The codes `check()` can return before a save, also exported as `CYS_LOSS` from `@graphty/graph-io/cys`. An `E_` code means the save throws unless you change the graph or the options.

| Code                          | Key                       | Severity            | Meaning                                                                                                                                                                                                                        |
| ----------------------------- | ------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `W_CYS_UNSET_AS_EMPTY_STRING` | `UNSET_AS_EMPTY_STRING`   | warning             | CyCSV has no unset text cell: an unset cell of a text column reads back as "".                                                                                                                                                 |
| `W_CYS_LIST_ITEMS`            | `LIST_ITEMS`              | warning             | List cells CyCSV cannot hold exactly: an unset or empty list of text reads back as [""], an empty list of numbers or booleans reads back unset, trailing empty text items vanish, and an item holding a newline splits in two. |
| `W_CYS_TEXT_AS_EQUATION`      | `TEXT_AS_EQUATION`        | warning             | A text cell starting with "=" is a formula to Cytoscape (an error cell there); graph-io reads it back as text.                                                                                                                 |
| `W_CYS_JSON_AS_STRING`        | `JSON_AS_STRING`          | warning             | A nested (json) column is written as a text column holding its JSON text.                                                                                                                                                      |
| `W_CYS_POSITION`              | `POSITION`                | warning             | A position that cannot be written as it is: another shape, a non-finite coordinate, a z read back in the z column.                                                                                                             |
| `W_COLUMN_NAME_CHANGED`       | `COLUMN_NAME_CHANGED`     | warning             | A column written under another name: a Cytoscape column name, a name differing only in case, a name the importer owns.                                                                                                         |
| `W_ROLE_ASSUMED`              | `ROLE_ASSUMED`            | warning             | A role-less `name` column reads back as the label.                                                                                                                                                                             |
| `W_MUTUAL_EXPANDED`           | `MUTUAL_EXPANDED`         | warning             | A mutual pair is written as two directed edges without its mark.                                                                                                                                                               |
| `W_ID_TEXT_TYPE`              | `ID_TEXT_TYPE`            | warning             | Node ids that are numbers read back as their text.                                                                                                                                                                             |
| `E_ID_TEXT_COLLISION`         | `ID_TEXT_COLLISION`       | error (save throws) | Two node ids with one text (a number and a string): export() throws E_INVALID_ID.                                                                                                                                              |
| `E_ID_CHARSET`                | `ID_CHARSET`              | error (save throws) | Node ids that are not positive integers under the default sanitizeIds "error": export() throws E_INVALID_ID.                                                                                                                   |
| `W_ID_MANGLED`                | `ID_MANGLED`              | warning             | Node ids that are not positive integers under sanitizeIds "mangle": renumbered, originals kept.                                                                                                                                |
| `W_EDGE_IDS_GENERATED`        | `EDGE_IDS_GENERATED`      | warning             | Edges without a usable id get generated SUIDs.                                                                                                                                                                                 |
| `W_DTYPE_UNSUPPORTED`         | `DTYPE_UNSUPPORTED`       | warning             | A dtype written as a wider Cytoscape type (f32 as Double, u8 as Integer, ...), or a label written as text.                                                                                                                     |
| `W_EMPTY_COLUMN_DROPPED`      | `EMPTY_COLUMN_DROPPED`    | warning             | A column whose every cell is unset (and which is not text) vanishes.                                                                                                                                                           |
| `W_STORAGE_CLASS_CHANGED`     | `STORAGE_CLASS_CHANGED`   | warning             | A text column that reads back as the other storage class (string / dict).                                                                                                                                                      |
| `W_WEIGHT_KEY_CLASH`          | `WEIGHT_KEY_CLASH`        | warning             | A plain `weight` edge column reads back as the edge weight.                                                                                                                                                                    |
| `W_HIERARCHY_DROPPED`         | `HIERARCHY_DROPPED`       | warning             | A parent / parents column: groups are not written.                                                                                                                                                                             |
| `W_TEMPORAL_DROPPED`          | `TEMPORAL_DROPPED`        | warning             | A start / end / timestamp column: sessions have no time.                                                                                                                                                                       |
| `W_ROLE_DROPPED`              | `ROLE_DROPPED`            | warning             | A role column written as a plain column.                                                                                                                                                                                       |
| `W_EXTENSION_TABLE_DROPPED`   | `EXTENSION_TABLE_DROPPED` | warning             | An extension table the session cannot carry.                                                                                                                                                                                   |

<!-- generated:end -->
