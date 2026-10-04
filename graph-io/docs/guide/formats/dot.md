# DOT (Graphviz)

## At a glance

<!-- generated:begin glance:dot -->

|                         |                         |
| ----------------------- | ----------------------- |
| Import from             | `@graphty/graph-io/dot` |
| Format name             | `dot`                   |
| Extensions              | `.dot`, `.gv`           |
| MIME types              | `text/vnd.graphviz`     |
| Reads                   | yes                     |
| Writes                  | yes                     |
| Several graphs per file | yes (`importAllGraphs`) |
| Lists its graphs        | no                      |

What a saved file can hold:

| Capability        | Value                  | Meaning                                                                         |
| ----------------- | ---------------------- | ------------------------------------------------------------------------------- |
| `mixedDirection`  | no                     | Directed and undirected edges in one file.                                      |
| `multiEdges`      | yes                    | Parallel edges.                                                                 |
| `selfLoops`       | yes                    | Self-loops.                                                                     |
| `edgeIds`         | optional               | Whether edge ids are required (generated when absent), optional or unsupported. |
| `idCharset`       | any                    | Which node ids can be written unchanged.                                        |
| `dtypes`          | bool, i32, f64, string | The column dtypes the format keeps as declared.                                 |
| `components`      | no                     | Multi-component (stride) columns.                                               |
| `lists`           | no                     | List columns.                                                                   |
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

<!-- generated:begin reference:dot -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option                   | Type                                | Default      | Meaning                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------ | ----------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mismatchedEdgeOperator` | `"error" \| "operator" \| "header"` | `"operator"` | What an edge operator that contradicts the graph keyword means (`--` in a digraph, `->` in a graph; a syntax error for Graphviz): "operator" (default) reads the edge with the operator's direction and resolves it per onMixedDirection, with a warning; "header" reads it with the graph's direction, with a warning; "error" aborts the import as Graphviz does. |
| `positions`              | `boolean`                           | `true`       | Map a node's `pos` to a `pos` column with the position role and a trailing `!` to `pin` (default true); false keeps `pos` as the text the file wrote, like any other attribute.                                                                                                                                                                                     |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option   | Type      | Default | Meaning                                                                       |
| -------- | --------- | ------- | ----------------------------------------------------------------------------- |
| `indent` | `string`  |         | The indentation of one nesting level; four spaces by default.                 |
| `name`   | `string`  |         | The graph name to write; `meta.name` by default, null for an anonymous graph. |
| `strict` | `boolean` |         | Whether to write `strict`; by default when `meta.extra.dot.strict` is true.   |

## Import issue codes

The codes this format's import report can hold, also exported as `DOT_ISSUE` from `@graphty/graph-io/dot`.

| Code                                | Key                           | Severity | Meaning                                                                                                          |
| ----------------------------------- | ----------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `E_EMPTY_INPUT`                     | `EMPTY_INPUT`                 | error    | The input holds no graph at all (empty or only comments); fatal.                                                 |
| `E_TOO_LARGE`                       | `TOO_LARGE`                   | error    | The input is longer than one JavaScript string, or holds a line that is (fatal).                                 |
| `W_ENCODING_CONFLICT`               | `ENCODING_CONFLICT`           | warning  | A declared encoding the byte order mark contradicts (the mark wins).                                             |
| `W_CONTROL_CHARACTER`               | `CONTROL_CHARACTER`           | warning  | A control character or a stray U+FEFF in the text, or an ignored trailing Ctrl-Z.                                |
| `E_FOREIGN_FORMAT`                  | `FOREIGN_FORMAT`              | error    | The input is an HTML page, a PDF, compressed or archived data or an image (fatal).                               |
| `W_ISSUES_SUPPRESSED`               | `ISSUES_SUPPRESSED`           | warning  | Warnings of one code beyond the number a report keeps, counted in one warning.                                   |
| `E_SYNTAX`                          | `SYNTAX`                      | error    | A grammar violation; fatal.                                                                                      |
| `E_INVALID_UTF8`                    | `INVALID_UTF8`                | error    | The input holds invalid UTF-8 (fatal).                                                                           |
| `E_INVALID_ENCODING`                | `INVALID_ENCODING`            | error    | Invalid bytes in the encoding a BOM, a declaration or the encoding option chose (fatal).                         |
| `W_ENCODING_FALLBACK`               | `ENCODING_FALLBACK`           | warning  | Bytes that are not UTF-8 and declare no encoding were read as windows-1252.                                      |
| `W_UNKNOWN_ENCODING`                | `UNKNOWN_ENCODING`            | warning  | A declared encoding the platform cannot decode was ignored.                                                      |
| `E_DOT_NESTING`                     | `NESTING`                     | error    | Subgraphs or braces nested deeper than the parser's limit; fatal.                                                |
| `W_DOT_EDGE_OPERATOR`               | `EDGE_OPERATOR`               | warning  | An edge operator contradicting the graph keyword (warning under "operator" / "header").                          |
| `W_MULTIPLE_GRAPHS`                 | `MULTIPLE_GRAPHS`             | warning  | A second graph in the same input; only the first is read.                                                        |
| `W_DOT_NUMERAL_AMBIGUITY`           | `NUMERAL_AMBIGUITY`           | warning  | A badly delimited numeral (`1e3`) split into two tokens, as Graphviz does with a warning.                        |
| `W_DOT_SUBGRAPH_ATTRIBUTES_DROPPED` | `SUBGRAPH_ATTRIBUTES_DROPPED` | warning  | Attributes of a subgraph that is not a cluster (rank=same and the like) cannot be represented.                   |
| `W_DOT_NODE_PORT_DROPPED`           | `NODE_PORT_DROPPED`           | warning  | A port on a node statement has no meaning and was dropped.                                                       |
| `W_DOT_CLUSTER_NODE_MERGED`         | `CLUSTER_NODE_MERGED`         | warning  | A plain node and a cluster share a name and were merged into one container node.                                 |
| `W_DOT_CLUSTER_CONFLICT`            | `CLUSTER_CONFLICT`            | warning  | A node mentioned in two unrelated clusters keeps the first.                                                      |
| `W_DOT_BAD_POS`                     | `BAD_POS`                     | warning  | A node `pos` that is not a point, or one beyond the f32 range of the position column; the value was dropped.     |
| `W_DOT_POS_DIMS`                    | `POS_DIMS`                    | warning  | Node `pos` values mix two and three coordinates; the position column records the first's.                        |
| `W_PRECISION`                       | `PRECISION`                   | warning  | A `pos` coordinate the f32 position column cannot hold exactly (warned once).                                    |
| `W_DUPLICATE_ATTRIBUTE`             | `DUPLICATE_ATTRIBUTE`         | warning  | The same attribute twice in one statement's attribute lists; the last value stands, as in Graphviz.              |
| `W_DOT_COMPASS_POINT`               | `COMPASS_POINT`               | warning  | The second part of a port (`a:p:zz`) is not a compass point; kept as written, as Graphviz warns.                 |
| `W_DOT_LATE_CHARSET`                | `LATE_CHARSET`                | warning  | A `charset` attribute beyond the head the decoder reads it from; the input was decoded without it.               |
| `W_DOT_STRICT_MERGED`               | `STRICT_MERGED`               | warning  | A parallel edge merged into an earlier one under `strict`.                                                       |
| `W_DOT_KEY_MERGED`                  | `KEY_MERGED`                  | warning  | An edge merged into an earlier one with the same endpoints and `key`.                                            |
| `W_ROLE_TAKEN`                      | `ROLE_TAKEN`                  | warning  | A role (label, id, position, ...) was already taken in the caller's sink; the column was declared without it.    |
| `W_COLUMN_RENAMED`                  | `COLUMN_RENAMED`              | warning  | A column of another shape exists in the caller's sink under a name the importer declares; renamed `<name>#<id>`. |
| `W_OPTION_IGNORED`                  | `OPTION_IGNORED`              | warning  | A common option the format has no use for was given a non-default value.                                         |
| `W_ID_MERGED`                       | `ID_MERGED`                   | warning  | Two distinct id texts merged under ids: "number".                                                                |
| `W_SINK_OPTION`                     | `SINK_OPTION`                 | warning  | A builder-policy option the sink does not honour.                                                                |
| `W_DIRECTION_REFUSED`               | `DIRECTION_REFUSED`           | warning  | The sink refused the file's direction.                                                                           |
| `W_DIRECTION_FORCED`                | `DIRECTION_FORCED`            | warning  | Edges forced to the policy's direction.                                                                          |
| `E_MIXED_DIRECTION`                 | `MIXED_DIRECTION`             | error    | A mixed file under onMixedDirection "error" (fatal).                                                             |
| `W_WIDENING_UNSUPPORTED`            | `WIDENING_UNSUPPORTED`        | warning  | A text column the sink could not widen to the dtype its cells imply.                                             |

## Loss codes

The codes `check()` can return before a save, also exported as `DOT_LOSS` from `@graphty/graph-io/dot`. An `E_` code means the save throws unless you change the graph or the options.

| Code                       | Key                    | Severity            | Meaning                                                                                                                                        |
| -------------------------- | ---------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_DOT_TRAILING_BACKSLASH` | `TRAILING_BACKSLASH`   | error (save throws) | An id, name or text with a backslash before a quote or a line break, or at its end, cannot be written as a DOT quoted string; export() throws. |
| `W_DOT_NON_FINITE`         | `NON_FINITE`           | warning             | A non-finite f32 / f64 cell has no numeric DOT spelling and reads back as text.                                                                |
| `W_TEXT_INFERRED`          | `TEXT_INFERRED`        | warning             | Text cells that look like numbers or booleans read back as such (DOT attribute values are untyped).                                            |
| `W_DOT_ATTRIBUTE_CLASH`    | `ATTRIBUTE_CLASH`      | warning             | A plain column named like an attribute the exporter writes for a role (weight, key, pos) is not written.                                       |
| `W_MUTUAL_EXPANDED`        | `MUTUAL_EXPANDED`      | warning             | A mutual pair is written as two directed edges.                                                                                                |
| `W_PARENTS_DROPPED`        | `PARENTS_DROPPED`      | warning             | A parents (multi-parent) column cannot be written; DOT clusters nest.                                                                          |
| `W_DOT_POSITION_SHAPE`     | `POSITION_SHAPE`       | warning             | A position column that is not a node column of 2 or 3 components is not written.                                                               |
| `W_ID_TEXT_TYPE`           | `ID_TEXT_TYPE`         | warning             | An id whose text reads back as the other type under ids: "canonical" (1.5 as text, "1" as 1).                                                  |
| `W_EMPTY_COLUMN_DROPPED`   | `EMPTY_COLUMN_DROPPED` | warning             | A declared column whose every row is unset is not written (DOT writes cells, never declarations).                                              |
| `W_ROLE_ASSUMED`           | `ROLE_ASSUMED`         | warning             | A role-less column named `label` reads back with the label role.                                                                               |
| `W_DOT_CLUSTER_MARKED`     | `CLUSTER_MARKED`       | warning             | A parent that is a plain node is written as a node and a cluster of one name; it reads back marked as a cluster.                               |

<!-- generated:end -->
