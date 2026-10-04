# CX

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

What a saved file can hold:

| Capability        | Value                  | Meaning                                                                         |
| ----------------- | ---------------------- | ------------------------------------------------------------------------------- |
| `mixedDirection`  | no                     | Directed and undirected edges in one file.                                      |
| `multiEdges`      | yes                    | Parallel edges.                                                                 |
| `selfLoops`       | yes                    | Self-loops.                                                                     |
| `edgeIds`         | required               | Whether edge ids are required (generated when absent), optional or unsupported. |
| `idCharset`       | integer                | Which node ids can be written unchanged.                                        |
| `dtypes`          | string, f64, i32, bool | The column dtypes the format keeps as declared.                                 |
| `components`      | no                     | Multi-component (stride) columns.                                               |
| `lists`           | yes                    | List columns.                                                                   |
| `json`            | no                     | Nested json columns.                                                            |
| `defaults`        | no                     | Declared defaults.                                                              |
| `options`         | no                     | Declared enumerations (GEXF options).                                           |
| `hierarchy`       | yes                    | Containment (parent / parents roles).                                           |
| `temporal`        | none                   | Temporal support level.                                                         |
| `graphAttributes` | yes                    | Graph-level attributes.                                                         |
| `positions`       | yes                    | The position role.                                                              |
| `viz`             | no                     | The visual roles (color, size, shape, thickness).                               |

<!-- generated:end -->

## Loading

## Saving

## How graph-io reads it

## What a saved file keeps and loses

<!-- generated:begin reference:cx -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option       | Type                     | Default    | Meaning                                                                                                                                                                             |
| ------------ | ------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zAs`        | `"column" \| "position"` | `"column"` | Where a node's `z` goes: "column" (default) keeps it in the f64 node column `z` (Cytoscape writes a stacking order there); "position" makes it the third component of the position. |
| `graphIndex` | `number`                 |            | The 0-based position of the graph, as `GraphListing.index` gives it.                                                                                                                |
| `graphName`  | `string`                 |            | The name of the graph, as `GraphListing.name` gives it; a name two graphs share is refused.                                                                                         |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

No options of its own.

## Import issue codes

The codes this format's import report can hold, also exported as `CX_ISSUE` from `@graphty/graph-io/cx`.

| Code                        | Key                       | Severity | Meaning                                                                                                                                             |
| --------------------------- | ------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_EMPTY_INPUT`             | `EMPTY_INPUT`             | error    | The input is empty (fatal).                                                                                                                         |
| `E_TOO_LARGE`               | `TOO_LARGE`               | error    | The input is beyond a size limit (fatal).                                                                                                           |
| `W_ENCODING_CONFLICT`       | `ENCODING_CONFLICT`       | warning  | A byte order mark, the encoding option and the declared encoding disagree.                                                                          |
| `W_CONTROL_CHARACTER`       | `CONTROL_CHARACTER`       | warning  | A control character or a stray U+FEFF in the text, or an ignored trailing Ctrl-Z.                                                                   |
| `E_FOREIGN_FORMAT`          | `FOREIGN_FORMAT`          | error    | The input is an HTML page, a PDF, compressed or archived data or an image (fatal).                                                                  |
| `W_ISSUES_SUPPRESSED`       | `ISSUES_SUPPRESSED`       | warning  | Warnings of one code beyond the number a report keeps, counted in one warning.                                                                      |
| `E_SYNTAX`                  | `SYNTAX`                  | error    | The text is not JSON (fatal).                                                                                                                       |
| `E_INVALID_UTF8`            | `INVALID_UTF8`            | error    | Invalid UTF-8 (fatal).                                                                                                                              |
| `E_INVALID_ENCODING`        | `INVALID_ENCODING`        | error    | Invalid bytes in the encoding a BOM or the encoding option chose (fatal).                                                                           |
| `W_ENCODING_FALLBACK`       | `ENCODING_FALLBACK`       | warning  | Bytes that are not UTF-8 were read as windows-1252.                                                                                                 |
| `W_UNKNOWN_ENCODING`        | `UNKNOWN_ENCODING`        | warning  | An encoding the platform cannot decode was ignored.                                                                                                 |
| `E_CX_NOT_CX`               | `NOT_CX`                  | error    | The document is not a CX array, or it is CX2 (fatal; the message names CX2).                                                                        |
| `W_CX_NUMBER_VERIFICATION`  | `NUMBER_VERIFICATION`     | warning  | numberVerification holds another value than 2^48 - 1, or comes twice.                                                                               |
| `W_CX_OLD_ASPECT_NAME`      | `OLD_ASPECT_NAME`         | warning  | An old Cytoscape aspect name (visualProperties, subNetworks, ...) read under its cy name.                                                           |
| `W_CX_GROUP_NODE_ADDED`     | `GROUP_NODE_ADDED`        | warning  | A cyGroups group whose id is not a node: the group node is added.                                                                                   |
| `W_CX_ROOT_ONLY`            | `ROOT_ONLY`               | warning  | Nodes or edges of the root network that no subnetwork holds: Cytoscape shows them in no network; not read.                                          |
| `E_STATUS_FAILED`           | `STATUS_FAILED`           | error    | The producer marked the document as failed (fatal).                                                                                                 |
| `W_STATUS_WARNING`          | `STATUS_WARNING`          | warning  | The producer marked the document as successful with an error text.                                                                                  |
| `E_BAD_ASPECT_BLOCK`        | `BAD_ASPECT_BLOCK`        | error    | A member of the array that is not a one-key aspect block, or an element that is not an object.                                                      |
| `W_ASPECT_ORDER`            | `ASPECT_ORDER`            | warning  | An aspect after the post-metadata or after the status, a third metaData.                                                                            |
| `W_COUNT_MISMATCH`          | `COUNT_MISMATCH`          | warning  | A metaData element count disagrees with what was read.                                                                                              |
| `E_BAD_VALUE`               | `BAD_VALUE`               | error    | A value that does not parse as its data type; the cell is unset.                                                                                    |
| `W_WIDENED`                 | `WIDENED`                 | warning  | One attribute name with several data types: the column takes the wider one.                                                                         |
| `W_UNKNOWN_ATTR_TYPE`       | `UNKNOWN_ATTR_TYPE`       | warning  | A data type CX does not define; the value is kept as text.                                                                                          |
| `W_DANGLING_REFERENCE`      | `DANGLING_REFERENCE`      | warning  | An attribute, layout, bypass, subnetwork member, view or provenance entry naming nothing.                                                           |
| `W_DUPLICATE_ATTRIBUTE`     | `DUPLICATE_ATTRIBUTE`     | warning  | The same attribute twice on one element (or n and a different name attribute); the later wins.                                                      |
| `E_UNKNOWN_PARENT`          | `UNKNOWN_PARENT`          | error    | A group member naming no node.                                                                                                                      |
| `E_PARENT_CYCLE`            | `PARENT_CYCLE`            | error    | A group membership that would close a parent cycle; dropped.                                                                                        |
| `W_STYLES_NOT_IMPORTED`     | `STYLES_NOT_IMPORTED`     | warning  | The style rules of cyVisualProperties are not applied (issue #706).                                                                                 |
| `E_MISSING_ID`              | `MISSING_ID`              | error    | A node without an                                                                                                                                   |
| `E_MISSING_ENDPOINT`        | `MISSING_ENDPOINT`        | error    | An edge without s or t.                                                                                                                             |
| `W_DUPLICATE_NODE`          | `DUPLICATE_NODE`          | warning  | A node id declared twice; the second merges into the first.                                                                                         |
| `E_DUPLICATE_EDGE_ID`       | `DUPLICATE_EDGE_ID`       | error    | An edge id declared twice; the second edge is skipped.                                                                                              |
| `E_INVALID_ID`              | `INVALID_ID`              | error    | An id that is not an integer.                                                                                                                       |
| `W_UNKNOWN_ELEMENT`         | `UNKNOWN_ELEMENT`         | warning  | A node or edge key CX does not define, an aspect whose name the importer's own meta.extra.cx entry holds, a cyTableColumn table CX does not define. |
| `W_MULTI_ASPECT_FRAGMENT`   | `MULTI_ASPECT_FRAGMENT`   | warning  | A member holding several aspects; each array-valued key is read as its own fragment.                                                                |
| `W_SINGLE_OBJECT_ASPECT`    | `SINGLE_OBJECT_ASPECT`    | warning  | An aspect written as one object, not an array of elements; read as one element.                                                                     |
| `W_JSON_NONSTANDARD_NUMBER` | `JSON_NONSTANDARD_NUMBER` | warning  | The bare tokens NaN / Infinity / -Infinity (Python's json writes them), read as numbers.                                                            |
| `E_UNKNOWN_NODE`            | `UNKNOWN_NODE`            | error    | An edge endpoint naming no node of the graph (addMissingNodes false, the default).                                                                  |
| `E_INVALID_WEIGHT`          | `INVALID_WEIGHT`          | error    | A weight that is not a number.                                                                                                                      |
| `W_ID_TEXT_TYPE`            | `ID_TEXT_TYPE`            | warning  | An id spelled as a string or a non-integer literal; read as the integer.                                                                            |
| `W_PRECISION`               | `PRECISION`               | warning  | An integer beyond 2^53: an id kept as its digits, a value stored as the nearest f64.                                                                |
| `W_ID_MERGED`               | `ID_MERGED`               | warning  | Two id texts merged under `ids: "number"`.                                                                                                          |
| `W_MULTIPLE_GRAPHS`         | `MULTIPLE_GRAPHS`         | warning  | A collection read by import(): the other subnetworks are skipped.                                                                                   |
| `E_GRAPH_NOT_FOUND`         | `GRAPH_NOT_FOUND`         | error    | graphIndex or graphName names no subnetwork (fatal).                                                                                                |
| `E_AMBIGUOUS_GRAPH_NAME`    | `AMBIGUOUS_GRAPH_NAME`    | error    | graphName names several subnetworks (fatal).                                                                                                        |
| `E_NO_GRAPH`                | `NO_GRAPH`                | error    | The input holds no graph (fatal).                                                                                                                   |
| `W_COLUMN_RENAMED`          | `COLUMN_RENAMED`          | warning  | A column renamed because its name was taken.                                                                                                        |
| `W_ROLE_TAKEN`              | `ROLE_TAKEN`              | warning  | A column that lost its role because another column holds it.                                                                                        |
| `W_DIRECTION_REFUSED`       | `DIRECTION_REFUSED`       | warning  | The sink refused the direction.                                                                                                                     |
| `W_DIRECTION_FORCED`        | `DIRECTION_FORCED`        | warning  | Edges forced to the policy's direction.                                                                                                             |
| `W_OPTION_IGNORED`          | `OPTION_IGNORED`          | warning  | A common option CX has no use for.                                                                                                                  |
| `W_SINK_OPTION`             | `SINK_OPTION`             | warning  | A builder option the caller's sink does not honour.                                                                                                 |

## Loss codes

The codes `check()` can return before a save, also exported as `CX_LOSS` from `@graphty/graph-io/cx`. An `E_` code means the save throws unless you change the graph or the options.

| Code                          | Key                       | Severity            | Meaning                                                                                                           |
| ----------------------------- | ------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `W_CX_UNDIRECTED_AS_DIRECTED` | `UNDIRECTED_AS_DIRECTED`  | warning             | Every edge is written directed: an undirected snapshot, or the undirected pairs of a mixed one.                   |
| `W_CX_JSON_AS_STRING`         | `JSON_AS_STRING`          | warning             | A nested (json) column is written as a string attribute holding its JSON text.                                    |
| `W_MUTUAL_EXPANDED`           | `MUTUAL_EXPANDED`         | warning             | A mutual pair is written as two directed edges without its mark.                                                  |
| `W_WEIGHT_KEY_CLASH`          | `WEIGHT_KEY_CLASH`        | warning             | A plain edge column named `weight` reads back as THE weight, or is not written.                                   |
| `W_TEMPORAL_DROPPED`          | `TEMPORAL_DROPPED`        | warning             | A start / end / timestamp column: CX has no time.                                                                 |
| `W_ROLE_DROPPED`              | `ROLE_DROPPED`            | warning             | A role column written as a plain attribute.                                                                       |
| `W_ROLE_ASSUMED`              | `ROLE_ASSUMED`            | warning             | A role-less column the importer reads back with a role (`name` as the label, a graph `name` as the graph's name). |
| `W_DTYPE_UNSUPPORTED`         | `DTYPE_UNSUPPORTED`       | warning             | A dtype CX declares as another (f32 as double, u32 as long, u8 as integer, dict as string, ...).                  |
| `W_COMPONENTS_FLATTENED`      | `COMPONENTS_FLATTENED`    | warning             | A multi-component column (a second view's `position@2`, a vector) is written as a list of doubles.                |
| `W_DEFAULT_DROPPED`           | `DEFAULT_DROPPED`         | warning             | A declared default: CX has none.                                                                                  |
| `W_OPTIONS_DROPPED`           | `OPTIONS_DROPPED`         | warning             | Declared options: CX has no enumerations.                                                                         |
| `E_ID_CHARSET`                | `ID_CHARSET`              | error (save throws) | Node ids that are not integers under the default sanitizeIds "error": export() throws E_INVALID_ID.               |
| `W_ID_MANGLED`                | `ID_MANGLED`              | warning             | Node ids that are not integers under sanitizeIds "mangle": renumbered, originals kept.                            |
| `W_EDGE_IDS_GENERATED`        | `EDGE_IDS_GENERATED`      | warning             | Edges without a usable integer id get generated ids.                                                              |
| `W_COLUMN_NAME_CHANGED`       | `COLUMN_NAME_CHANGED`     | warning             | A role column reads back under the importer's fixed name (the label as `name`, a parents list as `parent`).       |
| `W_EXTENSION_TABLE_DROPPED`   | `EXTENSION_TABLE_DROPPED` | warning             | An extension table other than the `cx:citations` / `cx:supports` tables a CX import creates.                      |
| `W_NONFINITE_AS_NULL`         | `NONFINITE_AS_NULL`       | warning             | A position, stacking order or weight that is NaN or infinite: CX spells no such number there.                     |
| `W_VIZ_DROPPED`               | `VIZ_DROPPED`             | warning             | Visual columns (color, size, shape, thickness roles): CX keeps style as visual properties, not roles.             |

<!-- generated:end -->
