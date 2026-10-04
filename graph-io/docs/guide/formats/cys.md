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
| Writes                  | no (read only)          |
| Several graphs per file | yes (`importAllGraphs`) |
| Lists its graphs        | yes (`listGraphs`)      |

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

## Import issue codes

The codes this format's import report can hold, also exported as `CYS_ISSUE` from `@graphty/graph-io/cys`.

| Code                           | Key                          | Severity | Meaning                                                                                                                                         |
| ------------------------------ | ---------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_XML_SYNTAX`                 | `XML_SYNTAX`                 | error    | The XML is not well-formed (fatal; the message carries the detail and the line).                                                                |
| `E_EMPTY_INPUT`                | `EMPTY_INPUT`                | error    | The input is empty.                                                                                                                             |
| `E_INVALID_UTF8`               | `INVALID_UTF8`               | error    | An invalid UTF-8 sequence in the input (fatal).                                                                                                 |
| `E_INVALID_ENCODING`           | `INVALID_ENCODING`           | error    | Bytes that are not valid in the encoding a BOM, a declaration or the `encoding` option chose (fatal).                                           |
| `W_ENCODING_FALLBACK`          | `ENCODING_FALLBACK`          | warning  | Bytes that are not valid UTF-8 (and declare no other encoding) were read as windows-1252.                                                       |
| `W_UNKNOWN_ENCODING`           | `UNKNOWN_ENCODING`           | warning  | The file declares an encoding the platform's TextDecoder does not know; the declaration is ignored.                                             |
| `E_NO_GRAPH`                   | `NO_GRAPH`                   | error    | The session holds no network.                                                                                                                   |
| `E_XGMML_VIEW_DOCUMENT`        | `XGMML_VIEW_DOCUMENT`        | error    | Fatal: a session view document (`cy:view="1"`): view SUIDs and no topology.                                                                     |
| `E_MISSING_ID`                 | `MISSING_ID`                 | error    | The element (node, attribute, key, ...) has no id where the format requires one.                                                                |
| `W_XGMML_ID_FROM_LABEL`        | `XGMML_ID_FROM_LABEL`        | warning  | A node without an id; its label is used as the id.                                                                                              |
| `E_MISSING_ENDPOINT`           | `MISSING_ENDPOINT`           | error    | An edge has no source or no target.                                                                                                             |
| `E_UNKNOWN_NODE`               | `UNKNOWN_NODE`               | error    | A line endpoint outside the declared vertex range (the core's code, forwarded).                                                                 |
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
| `E_TOO_LARGE`                  | `TOO_LARGE`                  | error    | The archive inflates beyond maxUncompressedBytes, or an entry beyond the ratio limit.                                                           |
| `W_STYLES_NOT_IMPORTED`        | `STYLES_NOT_IMPORTED`        | warning  | The session's styles are not applied (issue #706).                                                                                              |

<!-- generated:end -->
