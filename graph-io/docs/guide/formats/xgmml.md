# XGMML

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

What a saved file can hold:

| Capability        | Value                                            | Meaning                                                                         |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `mixedDirection`  | yes                                              | Directed and undirected edges in one file.                                      |
| `multiEdges`      | yes                                              | Parallel edges.                                                                 |
| `selfLoops`       | yes                                              | Self-loops.                                                                     |
| `edgeIds`         | optional                                         | Whether edge ids are required (generated when absent), optional or unsupported. |
| `idCharset`       | any                                              | Which node ids can be written unchanged.                                        |
| `dtypes`          | string, dict, f64, f32, i32, u32, u8, bool, list | The column dtypes the format keeps as declared.                                 |
| `components`      | no                                               | Multi-component (stride) columns.                                               |
| `lists`           | yes                                              | List columns.                                                                   |
| `json`            | no                                               | Nested json columns.                                                            |
| `defaults`        | no                                               | Declared defaults.                                                              |
| `options`         | no                                               | Declared enumerations (GEXF options).                                           |
| `hierarchy`       | yes                                              | Containment (parent / parents roles).                                           |
| `temporal`        | none                                             | Temporal support level.                                                         |
| `graphAttributes` | yes                                              | Graph-level attributes.                                                         |
| `positions`       | yes                                              | The position role.                                                              |
| `viz`             | no                                               | The visual roles (color, size, shape, thickness).                               |

<!-- generated:end -->

## Loading

## Saving

## How graph-io reads it

## What a saved file keeps and loses

<!-- generated:begin reference:xgmml -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option                    | Type                     | Default | Meaning                                                                                                                                                                                                                                         |
| ------------------------- | ------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `labelAliases`            | `boolean`                |         | Resolve an edge endpoint that is missing or names no node through Cytoscape's `"source (interaction) target"` edge label, and fill a missing interaction from it. Default: on for files that use the Cytoscape (`cy`) namespace, off otherwise. |
| `cytoscapeEscapes`        | `boolean`                |         | Decode Cytoscape's two-character `\n` and `\t` escapes in string values. Default: on for files that use the Cytoscape namespace, off otherwise.                                                                                                 |
| `repairBareAmpersands`    | `boolean`                | `false` | Read an `&` not followed by `;` within 7 characters as `&amp;` (warned per occurrence). Default false.                                                                                                                                          |
| `pairSurrogateReferences` | `boolean`                | `false` | Join two surrogate character references into one character (warned per pair). Default false.                                                                                                                                                    |
| `zAs`                     | `"column" \| "position"` |         | Where Cytoscape's z (a stacking order) goes: the `z` column (default) or the position.                                                                                                                                                          |
| `graphIndex`              | `number`                 |         | The 0-based position of the graph, as `GraphListing.index` gives it.                                                                                                                                                                            |
| `graphName`               | `string`                 |         | The name of the graph, as `GraphListing.name` gives it; a name two graphs share is refused.                                                                                                                                                     |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option             | Type      | Default | Meaning                                                                                                                                                                              |
| ------------------ | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cytoscapeEscapes` | `boolean` |         | Write newline and tab in string values as Cytoscape's two-character `\n` and `\t` (what the Cytoscape writer does) instead of the character references `&#10;` and `&#9;` (default). |

## Import issue codes

The codes this format's import report can hold, also exported as `XGMML_ISSUE` from `@graphty/graph-io/xgmml`.

| Code                           | Key                    | Severity | Meaning                                                                                             |
| ------------------------------ | ---------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `E_EMPTY_INPUT`                | `EMPTY_INPUT`          | error    | Fatal: the input is empty or whitespace only.                                                       |
| `E_TOO_LARGE`                  | `TOO_LARGE`            | error    | The input is longer than one JavaScript string, or holds a line that is (fatal).                    |
| `W_ENCODING_CONFLICT`          | `ENCODING_CONFLICT`    | warning  | A declared encoding the byte order mark contradicts (the mark wins).                                |
| `W_CONTROL_CHARACTER`          | `CONTROL_CHARACTER`    | warning  | A control character or a stray U+FEFF in the text, or an ignored trailing Ctrl-Z.                   |
| `E_FOREIGN_FORMAT`             | `FOREIGN_FORMAT`       | error    | The input is an HTML page, a PDF, compressed or archived data or an image (fatal).                  |
| `W_ISSUES_SUPPRESSED`          | `ISSUES_SUPPRESSED`    | warning  | Warnings of one code beyond the number a report keeps, counted in one warning.                      |
| `E_XML_SYNTAX`                 | `XML_SYNTAX`           | error    | Fatal: the input is not well-formed XML.                                                            |
| `E_INVALID_UTF8`               | `INVALID_UTF8`         | error    | Fatal: the input holds invalid UTF-8.                                                               |
| `E_INVALID_ENCODING`           | `INVALID_ENCODING`     | error    | Fatal: bytes invalid in the encoding a BOM, a declaration or the option chose.                      |
| `W_ENCODING_FALLBACK`          | `ENCODING_FALLBACK`    | warning  | Undeclared non-UTF-8 bytes were read as windows-1252.                                               |
| `W_UNKNOWN_ENCODING`           | `UNKNOWN_ENCODING`     | warning  | A declared encoding the platform cannot decode was ignored.                                         |
| `E_NO_GRAPH`                   | `NO_GRAPH`             | error    | Fatal: the root element is not `<graph>` (an XHTML page embedding one, a GraphML file).             |
| `E_XGMML_VIEW_DOCUMENT`        | `VIEW_DOCUMENT`        | error    | Fatal: a session view document (`cy:view="1"`): view SUIDs and no topology.                         |
| `E_MISSING_ID`                 | `MISSING_ID`           | error    | A node with neither an id nor a label; it is skipped with its subtree.                              |
| `W_XGMML_ID_FROM_LABEL`        | `ID_FROM_LABEL`        | warning  | A node without an id; its label is used as the id.                                                  |
| `W_XGMML_ID_AND_HREF`          | `ID_AND_HREF`          | warning  | A node or edge with both an id and an `xlink:href`; it is read as the reference.                    |
| `E_MISSING_ENDPOINT`           | `MISSING_ENDPOINT`     | error    | An edge without a source or a target that no label alias resolves.                                  |
| `E_UNKNOWN_NODE`               | `UNKNOWN_NODE`         | error    | An edge endpoint that names no node (addMissingNodes false); the edge is skipped.                   |
| `W_XGMML_LABEL_ALIAS`          | `LABEL_ALIAS`          | warning  | Endpoints resolved through Cytoscape's `"a (pp) b"` label aliases; interactions filled from labels. |
| `W_DUPLICATE_NODE`             | `DUPLICATE_NODE`       | warning  | A node id declared twice; the declarations are merged.                                              |
| `E_DUPLICATE_EDGE_ID`          | `DUPLICATE_EDGE_ID`    | error    | An edge id used twice; the second edge is skipped.                                                  |
| `W_XGMML_GROUP_DUPLICATE_EDGE` | `GROUP_DUPLICATE_EDGE` | warning  | A meta-edge the 2.x writer repeats inside a group; the copy is dropped.                             |
| `W_XGMML_BAD_DIRECTED`         | `BAD_DIRECTED`         | warning  | A `directed` or `cy:directed` value other than 0 / 1.                                               |
| `W_XGMML_DOCUMENT_VERSION`     | `DOCUMENT_VERSION`     | warning  | A `documentVersion` that does not parse; the dialect is chosen from the content.                    |
| `W_XGMML_NO_NAMESPACE`         | `NO_NAMESPACE`         | warning  | A root `<graph>` with neither the XGMML namespace nor an XGMML DOCTYPE.                             |
| `W_XGMML_BAD_ATT`              | `BAD_ATT`              | warning  | A malformed `<att>`: a list with a value, a scalar with child atts, an att with no name.            |
| `W_XGMML_AMPERSAND_REPAIRED`   | `AMPERSAND_REPAIRED`   | warning  | A bare `&` read as `&amp;` under repairBareAmpersands.                                              |
| `W_XGMML_SURROGATE_PAIRED`     | `SURROGATE_PAIRED`     | warning  | Two surrogate character references joined under pairSurrogateReferences.                            |
| `W_XGMML_EMPTY_LIST_TYPE`      | `EMPTY_LIST_TYPE`      | warning  | An empty list whose element type nothing states; a list of strings is assumed.                      |
| `W_XGMML_RECORD_LIST`          | `RECORD_LIST`          | warning  | A record list, a list of lists, a 2.x map or foreign XML in an att, kept as json.                   |
| `W_XGMML_CROSS_FILE_REFERENCE` | `CROSS_FILE_REFERENCE` | warning  | A pointer into another file (`file.xgmml#id`); kept as text.                                        |
| `W_XGMML_EDGE_NESTED_GRAPH`    | `EDGE_NESTED_GRAPH`    | warning  | A graph nested in an edge's att; there is no model for it.                                          |
| `W_XGMML_ROOT_ONLY_ELEMENTS`   | `ROOT_ONLY_ELEMENTS`   | warning  | Elements of a session network declared outside every registered subnetwork.                         |
| `E_BAD_VALUE`                  | `BAD_VALUE`            | error    | A value that does not parse as its declared type; the cell is unset.                                |
| `W_WIDENED`                    | `WIDENED`              | warning  | A column widened because its values or declared types disagree.                                     |
| `W_PRECISION`                  | `PRECISION`            | warning  | A long or real beyond what a double holds exactly.                                                  |
| `W_DANGLING_REFERENCE`         | `DANGLING_REFERENCE`   | warning  | A reference (xlink:href, nested-network pointer) that names nothing.                                |
| `W_DUPLICATE_ATTRIBUTE`        | `DUPLICATE_ATTRIBUTE`  | warning  | The same attribute twice on one element; the later value wins.                                      |
| `E_UNKNOWN_PARENT`             | `UNKNOWN_PARENT`       | error    | A group membership naming no node.                                                                  |
| `E_PARENT_CYCLE`               | `PARENT_CYCLE`         | error    | A group membership that would close a parent cycle; that link is dropped.                           |
| `W_EQUATION_AS_TEXT`           | `EQUATION_AS_TEXT`     | warning  | A Cytoscape formula kept as its text.                                                               |
| `W_UNKNOWN_ATTR_TYPE`          | `UNKNOWN_ATTR_TYPE`    | warning  | An att type XGMML and Cytoscape do not define; kept as text.                                        |
| `W_UNKNOWN_ELEMENT`            | `UNKNOWN_ELEMENT`      | warning  | An element XGMML does not define at that place; skipped with its subtree.                           |
| `W_STRAY_TEXT`                 | `STRAY_TEXT`           | warning  | Character data where XGMML allows only elements, or inside an att.                                  |
| `W_MULTIPLE_GRAPHS`            | `MULTIPLE_GRAPHS`      | warning  | A session network document holds several registered networks; one was read.                         |
| `E_GRAPH_NOT_FOUND`            | `GRAPH_NOT_FOUND`      | error    | graphIndex / graphName names no network (fatal).                                                    |
| `E_AMBIGUOUS_GRAPH_NAME`       | `AMBIGUOUS_GRAPH_NAME` | error    | graphName names several networks (fatal).                                                           |
| `W_COLUMN_RENAMED`             | `COLUMN_RENAMED`       | warning  | A column renamed `<name>#<n>` because its name was taken.                                           |
| `W_ROLE_TAKEN`                 | `ROLE_TAKEN`           | warning  | A column declared without its role because the table already holds it.                              |
| `W_ID_MERGED`                  | `ID_MERGED`            | warning  | Two id texts merged into one number under ids "number".                                             |
| `W_OPTION_IGNORED`             | `OPTION_IGNORED`       | warning  | An option the format has no use for.                                                                |
| `W_SINK_OPTION`                | `SINK_OPTION`          | warning  | A builder-policy option the sink does not honour.                                                   |
| `W_DIRECTION_REFUSED`          | `DIRECTION_REFUSED`    | warning  | The sink refused the file's direction.                                                              |
| `W_DIRECTION_FORCED`           | `DIRECTION_FORCED`     | warning  | Edges forced to the policy's direction.                                                             |
| `E_MIXED_DIRECTION`            | `MIXED_DIRECTION`      | error    | A mixed file under onMixedDirection "error" (fatal).                                                |

## Loss codes

The codes `check()` can return before a save, also exported as `XGMML_LOSS` from `@graphty/graph-io/xgmml`. An `E_` code means the save throws unless you change the graph or the options.

| Code                             | Key                      | Severity            | Meaning                                                                                                            |
| -------------------------------- | ------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `W_XGMML_JSON_AS_STRING`         | `JSON_AS_STRING`         | warning             | A json or nested-list column written as a string att.                                                              |
| `W_XGMML_WIDENED_TYPE`           | `WIDENED_TYPE`           | warning             | A dtype written as a wider Cytoscape type (f32 as Double, u32 above i32 as Long, u8 as Integer, dict as String).   |
| `E_XML_ILLEGAL_CHAR`             | `XML_ILLEGAL_CHAR`       | error (save throws) | A string holding a character XML 1.0 cannot carry; export() throws.                                                |
| `W_TEMPORAL_DROPPED`             | `TEMPORAL_DROPPED`       | warning             | A temporal column written as plain numbers.                                                                        |
| `W_TEMPORAL_TEXT_DROPPED`        | `TEMPORAL_TEXT_DROPPED`  | warning             | A temporal text companion written as a plain string att.                                                           |
| `W_ROLE_DROPPED`                 | `ROLE_DROPPED`           | warning             | A role the format has no slot for, written as a plain att.                                                         |
| `W_PARENTS_DROPPED`              | `PARENTS_DROPPED`        | warning             | A parents column not written because the snapshot also has a parent column.                                        |
| `W_MUTUAL_EXPANDED`              | `MUTUAL_EXPANDED`        | warning             | A mutual pair written as two directed edges.                                                                       |
| `W_ID_TEXT_TYPE`                 | `ID_TEXT_TYPE`           | warning             | Node ids whose text reads back as the other type.                                                                  |
| `W_XGMML_EDGE_ID_TEXT`           | `EDGE_ID_TEXT`           | warning             | An edge id column of another dtype written as text; it reads back as strings.                                      |
| `W_XGMML_BACKSLASH_ESCAPE`       | `BACKSLASH_ESCAPE`       | warning             | Strings holding a literal backslash-n or backslash-t read back as newline / tab (Cytoscape's escapes).             |
| `W_XGMML_POSITION`               | `POSITION`               | warning             | A position that cannot be written as it is: another shape, a non-finite coordinate, a z read back in the z column. |
| `W_XGMML_PARENT_CYCLE`           | `PARENT_CYCLE`           | warning             | Nodes whose parent chain never reaches a root are written at the top level.                                        |
| `W_COLUMN_NAME_CHANGED`          | `COLUMN_NAME_CHANGED`    | warning             | A column named like a column the importer owns reads back renamed.                                                 |
| `W_ROLE_ASSUMED`                 | `ROLE_ASSUMED`           | warning             | A role-less column written into a slot reads back with the slot's role.                                            |
| `W_WEIGHT_KEY_CLASH`             | `WEIGHT_KEY_CLASH`       | warning             | A plain `weight` edge column reads back as THE weight.                                                             |
| `W_STORAGE_CLASS_CHANGED`        | `STORAGE_CLASS_CHANGED`  | warning             | A string / dict column that reads back as the other storage class.                                                 |
| `W_XGMML_INTERACTION_FROM_LABEL` | `INTERACTION_FROM_LABEL` | warning             | Edge labels shaped `a (i) b` read back with an `interaction` column (Cytoscape's label alias).                     |

<!-- generated:end -->
