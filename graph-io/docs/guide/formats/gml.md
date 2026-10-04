# GML

## At a glance

<!-- generated:begin glance:gml -->

|                         |                            |
| ----------------------- | -------------------------- |
| Import from             | `@graphty/graph-io/gml`    |
| Format name             | `gml`                      |
| Extensions              | `.gml`                     |
| MIME types              | `text/x-gml`, `text/plain` |
| Reads                   | yes                        |
| Writes                  | yes                        |
| Several graphs per file | yes (`importAllGraphs`)    |
| Lists its graphs        | no                         |

What a saved file can hold:

| Capability        | Value                        | Meaning                                                                         |
| ----------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| `mixedDirection`  | no                           | Directed and undirected edges in one file.                                      |
| `multiEdges`      | yes                          | Parallel edges.                                                                 |
| `selfLoops`       | yes                          | Self-loops.                                                                     |
| `edgeIds`         | optional                     | Whether edge ids are required (generated when absent), optional or unsupported. |
| `idCharset`       | integer                      | Which node ids can be written unchanged.                                        |
| `dtypes`          | i32, f64, string, dict, json | The column dtypes the format keeps as declared.                                 |
| `components`      | no                           | Multi-component (stride) columns.                                               |
| `lists`           | yes                          | List columns.                                                                   |
| `json`            | yes                          | Nested json columns.                                                            |
| `defaults`        | no                           | Declared defaults.                                                              |
| `options`         | no                           | Declared enumerations (GEXF options).                                           |
| `hierarchy`       | no                           | Containment (parent / parents roles).                                           |
| `temporal`        | none                         | Temporal support level.                                                         |
| `graphAttributes` | yes                          | Graph-level attributes.                                                         |
| `positions`       | yes                          | The position role.                                                              |
| `viz`             | no                           | The visual roles (color, size, shape, thickness).                               |

<!-- generated:end -->

## Loading

## Saving

## How graph-io reads it

## What a saved file keeps and loses

<!-- generated:begin reference:gml -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option         | Type      | Default | Meaning                                                                                                                                                            |
| -------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `positions`    | `boolean` | `true`  | Map a node's `graphics [ x y z ]` record to a `position` column with the position role (default true); false keeps the whole record in the `graphics` json column. |
| `dictionaries` | `boolean` | `true`  | Store a string column whose values repeat a lot (fewer distinct values than half the rows) as a dictionary column (default true).                                  |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option         | Type                  | Default   | Meaning                                                                                                                                                                                                                                                                                |
| -------------- | --------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `weightKey`    | `string`              |           | The edge key explicit weights are written under; by default the key the GML importer read them from (`meta.weightOrigin.id` when the snapshot came from GML), else `value`.                                                                                                            |
| `sanitizeKeys` | `"error" \| "mangle"` | `"error"` | "error" (default): a column name or record key that is not a GML key (`[A-Za-z][0-9A-Za-z_]*`) or collides with a structural key makes export() throw; "mangle": such keys are rewritten (`.` and other characters become `_`, collisions get a `_2` suffix) and check() reports them. |

## Import issue codes

The codes this format's import report can hold, also exported as `GML_ISSUE` from `@graphty/graph-io/gml`.

| Code                   | Key                 | Severity | Meaning                                                                                                                  |
| ---------------------- | ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `E_SYNTAX`             | `SYNTAX`            | error    | A grammar violation: an untokenisable bare token, an unclosed string or `[`, a stray `]`, a key without a value (fatal). |
| `E_INVALID_UTF8`       | `INVALID_UTF8`      | error    | The input holds invalid UTF-8 (fatal).                                                                                   |
| `E_INVALID_ENCODING`   | `INVALID_ENCODING`  | error    | Invalid bytes in the encoding a BOM, a declaration or the encoding option chose (fatal).                                 |
| `W_ENCODING_FALLBACK`  | `ENCODING_FALLBACK` | warning  | Bytes that are not UTF-8 and declare no encoding were read as windows-1252.                                              |
| `W_UNKNOWN_ENCODING`   | `UNKNOWN_ENCODING`  | warning  | A declared encoding the platform cannot decode was ignored.                                                              |
| `E_NO_GRAPH`           | `NO_GRAPH`          | error    | No `graph [` block (fatal).                                                                                              |
| `W_MULTIPLE_GRAPHS`    | `MULTIPLE_GRAPHS`   | warning  | More than one `graph` block (fatal).                                                                                     |
| `E_MISSING_ID`         | `MISSING_ID`        | error    | A node without an `id`.                                                                                                  |
| `E_GML_MISSING_LABEL`  | `MISSING_LABEL`     | error    | A node without a `label` under nodeIdFrom "label".                                                                       |
| `E_MISSING_ENDPOINT`   | `MISSING_ENDPOINT`  | error    | An edge without `source` or `target`.                                                                                    |
| `E_GML_ID_TYPE`        | `ID_TYPE`           | error    | A node id, source or target that is neither an integer nor a string.                                                     |
| `W_GML_STRING_ID`      | `STRING_ID`         | warning  | String node ids, sources or targets (outside the spec's integers), kept under the ids rule; warned once.                 |
| `W_DUPLICATE_NODE`     | `DUPLICATE_NODE`    | warning  | A node id declared twice (later keys overwrite).                                                                         |
| `E_GML_REPEATED_KEY`   | `REPEATED_KEY`      | error    | A structural key repeated in one element.                                                                                |
| `E_GML_ELEMENT_TYPE`   | `ELEMENT_TYPE`      | error    | A `node` / `edge` key whose value is not a record.                                                                       |
| `E_GML_FLAG_TYPE`      | `FLAG_TYPE`         | error    | A `directed` / `multigraph` flag that is not an integer.                                                                 |
| `W_GML_FLAG_VALUE`     | `FLAG_VALUE`        | warning  | A `directed` / `multigraph` flag outside 0 / 1, or repeated.                                                             |
| `W_GML_UNKNOWN_ENTITY` | `UNKNOWN_ENTITY`    | warning  | A named entity in a string that no table decodes; kept as written.                                                       |
| `W_PRECISION`          | `PRECISION`         | warning  | An integer beyond 2^53 rounded to f64.                                                                                   |
| `W_COLUMN_RENAMED`     | `COLUMN_RENAMED`    | warning  | A column renamed `<name>#<key>` because the sink held the name with another shape.                                       |
| `W_ROLE_TAKEN`         | `ROLE_TAKEN`        | warning  | A column declared without its role because the sink already holds it.                                                    |
| `W_ID_MERGED`          | `ID_MERGED`         | warning  | Two id texts merged into one number under ids "number".                                                                  |
| `W_OPTION_IGNORED`     | `OPTION_IGNORED`    | warning  | A common option the importer has no use for was given.                                                                   |
| `W_SINK_OPTION`        | `SINK_OPTION`       | warning  | A builder-policy option the sink does not honour.                                                                        |
| `W_DIRECTION_REFUSED`  | `DIRECTION_REFUSED` | warning  | The sink refused the file's direction.                                                                                   |
| `W_DIRECTION_FORCED`   | `DIRECTION_FORCED`  | warning  | Edges forced to the policy's direction.                                                                                  |
| `E_MIXED_DIRECTION`    | `MIXED_DIRECTION`   | error    | A mixed file under onMixedDirection "error" (fatal).                                                                     |
| `W_GML_ID_DROPPED`     | `ID_DROPPED`        | warning  | Under nodeIdFrom "label" / "index" the integer ids are not kept (a loss note).                                           |

## Loss codes

The codes `check()` can return before a save, also exported as `GML_LOSS` from `@graphty/graph-io/gml`. An `E_` code means the save throws unless you change the graph or the options.

| Code                        | Key                   | Severity            | Meaning                                                               |
| --------------------------- | --------------------- | ------------------- | --------------------------------------------------------------------- |
| `W_GML_RECORD_NUMBER_TYPE`  | `RECORD_NUMBER_TYPE`  | warning             | A json column holds numbers; GML records cannot keep int versus real. |
| `W_GML_RECORD_BOOLEAN`      | `RECORD_BOOLEAN`      | warning             | A json column holds booleans, written 1 / 0.                          |
| `W_GML_RECORD_NULL`         | `RECORD_NULL`         | warning             | A json column holds nulls, omitted.                                   |
| `E_GML_NESTED_ARRAY`        | `NESTED_ARRAY`        | error (save throws) | An array inside an array; export() throws.                            |
| `W_GML_JSON_ARRAY`          | `JSON_ARRAY`          | warning             | A json row that is an array, written as repeated keys.                |
| `E_GML_INVALID_KEY`         | `INVALID_KEY`         | error (save throws) | A column name or record key outside the GML key grammar.              |
| `E_GML_RESERVED_KEY`        | `RESERVED_KEY`        | error (save throws) | A column named like a structural key.                                 |
| `W_GML_KEY_MANGLED`         | `KEY_MANGLED`         | warning             | A key rewritten under sanitizeKeys "mangle".                          |
| `W_GML_POSITION_COMPONENTS` | `POSITION_COMPONENTS` | warning             | A position column with more than three components.                    |
| `W_GML_GRAPHICS_OVERRIDDEN` | `GRAPHICS_OVERRIDDEN` | warning             | A graphics record whose x / y / z the position column overrides.      |
| `E_GML_GRAPHICS_CONFLICT`   | `GRAPHICS_CONFLICT`   | error (save throws) | A graphics record that cannot hold the position.                      |

<!-- generated:end -->
