# GEXF

## At a glance

<!-- generated:begin glance:gexf -->

|                         |                                                       |
| ----------------------- | ----------------------------------------------------- |
| Import from             | `@graphty/graph-io/gexf`                              |
| Format name             | `gexf`                                                |
| Extensions              | `.gexf`                                               |
| MIME types              | `application/gexf+xml`, `application/xml`, `text/xml` |
| Reads                   | yes                                                   |
| Writes                  | yes                                                   |
| Several graphs per file | no                                                    |
| Lists its graphs        | no                                                    |

What a saved file can hold:

| Capability        | Value                             | Meaning                                                                         |
| ----------------- | --------------------------------- | ------------------------------------------------------------------------------- |
| `mixedDirection`  | yes                               | Directed and undirected edges in one file.                                      |
| `multiEdges`      | yes                               | Parallel edges.                                                                 |
| `selfLoops`       | yes                               | Self-loops.                                                                     |
| `edgeIds`         | optional                          | Whether edge ids are required (generated when absent), optional or unsupported. |
| `idCharset`       | any                               | Which node ids can be written unchanged.                                        |
| `dtypes`          | f32, f64, i32, bool, dict, string | The column dtypes the format keeps as declared.                                 |
| `components`      | no                                | Multi-component (stride) columns.                                               |
| `lists`           | yes                               | List columns.                                                                   |
| `json`            | no                                | Nested json columns.                                                            |
| `defaults`        | yes                               | Declared defaults.                                                              |
| `options`         | yes                               | Declared enumerations (GEXF options).                                           |
| `hierarchy`       | yes                               | Containment (parent / parents roles).                                           |
| `temporal`        | dynamic-values                    | Temporal support level.                                                         |
| `graphAttributes` | no                                | Graph-level attributes.                                                         |
| `positions`       | yes                               | The position role.                                                              |
| `viz`             | yes                               | The visual roles (color, size, shape, thickness).                               |

<!-- generated:end -->

## Loading

## Saving

## How graph-io reads it

## What a saved file keeps and loses

<!-- generated:begin reference:gexf -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option | Type      | Default | Meaning                                                                                                                                                                             |
| ------ | --------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `viz`  | `boolean` | `true`  | Whether the viz namespace elements (color, position, size, shape, thickness) are imported as role columns (default true); false ignores them and records one `unsupported` warning. |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option    | Type          | Default | Meaning                                              |
| --------- | ------------- | ------- | ---------------------------------------------------- |
| `version` | `GexfVersion` | `"1.3"` | The GEXF version to write: "1.3" (default) or "1.2". |

## Import issue codes

The codes this format's import report can hold, also exported as `GEXF_ISSUE` from `@graphty/graph-io/gexf`.

| Code                           | Key                     | Severity | Meaning                                                                                  |
| ------------------------------ | ----------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `E_XML_SYNTAX`                 | `XML_SYNTAX`            | error    | The XML is not well-formed (fatal).                                                      |
| `E_INVALID_UTF8`               | `INVALID_UTF8`          | error    | The input holds invalid UTF-8 (fatal).                                                   |
| `E_INVALID_ENCODING`           | `INVALID_ENCODING`      | error    | Invalid bytes in the encoding a BOM, a declaration or the encoding option chose (fatal). |
| `W_ENCODING_FALLBACK`          | `ENCODING_FALLBACK`     | warning  | Bytes that are not UTF-8 and declare no encoding were read as windows-1252.              |
| `W_UNKNOWN_ENCODING`           | `UNKNOWN_ENCODING`      | warning  | A declared encoding the platform cannot decode was ignored.                              |
| `E_NOT_GEXF`                   | `NOT_GEXF`              | error    | The root element is not `<gexf>` (fatal).                                                |
| `E_NO_GRAPH`                   | `NO_GRAPH`              | error    | The document has no `<graph>` (fatal).                                                   |
| `E_GEXF_MISSING_NODES`         | `MISSING_NODES`         | error    | `<edges>` without `<nodes>`.                                                             |
| `E_MISSING_ID`                 | `MISSING_ID`            | error    | A node without an id.                                                                    |
| `E_MISSING_ENDPOINT`           | `MISSING_ENDPOINT`      | error    | An edge without a source or target.                                                      |
| `E_GEXF_EDGE_TYPE`             | `EDGE_TYPE`             | error    | An edge `type` outside directed / undirected / mutual.                                   |
| `E_UNKNOWN_PARENT`             | `UNKNOWN_PARENT`        | error    | A `pid` / `<parent for>` naming an unknown node.                                         |
| `E_GEXF_ATTRIBUTES_CLASS`      | `ATTRIBUTES_CLASS`      | error    | An `<attributes class>` outside node / edge.                                             |
| `E_GEXF_ATTRIBUTE_ID`          | `ATTRIBUTE_ID`          | error    | An `<attribute>` without an id.                                                          |
| `W_GEXF_HEADER_VALUE`          | `HEADER_VALUE`          | warning  | A `<graph>` header attribute with an unknown value.                                      |
| `W_COUNT_HINT`                 | `COUNT_HINT`            | warning  | A `count` hint the sink cannot reserve (ignored).                                        |
| `W_DUPLICATE_NODE`             | `DUPLICATE_NODE`        | warning  | A node id declared twice.                                                                |
| `E_DUPLICATE_EDGE_ID`          | `DUPLICATE_EDGE_ID`     | error    | An edge id declared twice (the second edge is skipped).                                  |
| `W_DUPLICATE_ATTRIBUTE`        | `DUPLICATE_ATTRIBUTE`   | warning  | An attribute id declared twice in one class.                                             |
| `W_GEXF_ATTRIBUTE_TYPE`        | `ATTRIBUTE_TYPE`        | warning  | An attribute type the importer maps to string.                                           |
| `W_UNKNOWN_ATTR_TYPE`          | `UNKNOWN_ATTR_TYPE`     | warning  | A declared type the format does not define (kept as string).                             |
| `W_BAD_DEFAULT`                | `BAD_DEFAULT`           | warning  | A default that does not parse as the declared type.                                      |
| `W_BAD_OPTIONS`                | `BAD_OPTIONS`           | warning  | Options that do not parse as the declared type.                                          |
| `W_COLUMN_RENAMED`             | `COLUMN_RENAMED`        | warning  | A column renamed `<name>#<id>` because the name was taken.                               |
| `W_ROLE_TAKEN`                 | `ROLE_TAKEN`            | warning  | A column declared without its role because the table already holds it.                   |
| `W_GEXF_UNKNOWN_ATTRIBUTE`     | `UNKNOWN_ATTRIBUTE`     | warning  | An `<attvalue for>` naming an undeclared attribute.                                      |
| `W_GEXF_ATTVALUE_SHAPE`        | `ATTVALUE_SHAPE`        | warning  | An `<attvalue>` without a value.                                                         |
| `W_GEXF_TIMED_VALUE_ON_STATIC` | `TIMED_VALUE_ON_STATIC` | warning  | A timed value on an attribute of a static group.                                         |
| `W_PRECISION`                  | `PRECISION`             | warning  | A long value beyond 2^53 rounded.                                                        |
| `W_ID_MERGED`                  | `ID_MERGED`             | warning  | Two id texts merged into one number under ids "number".                                  |
| `W_GEXF_WEIGHT_IGNORED`        | `WEIGHT_IGNORED`        | warning  | The XML weight attribute ignored under weightFrom null.                                  |
| `W_GEXF_VIZ_SKIPPED`           | `VIZ_SKIPPED`           | warning  | viz elements skipped under viz: false.                                                   |
| `W_GEXF_VIZ_DYNAMIC_DROPPED`   | `VIZ_DYNAMIC_DROPPED`   | warning  | A 1.2 dynamic viz element whose bounds were dropped.                                     |
| `W_GEXF_SPELL_OPEN_DROPPED`    | `SPELL_OPEN_DROPPED`    | warning  | Deprecated and no longer recorded: open spells are kept in the spells.open column.       |
| `W_GEXF_VIZ_VALUE`             | `VIZ_VALUE`             | warning  | A viz value that could not be read.                                                      |
| `W_GEXF_OPEN_BOUND_CONFLICT`   | `OPEN_BOUND_CONFLICT`   | warning  | Both `start` and `startopen` (or `end` and `endopen`) on one element.                    |
| `W_UNKNOWN_ELEMENT`            | `UNKNOWN_ELEMENT`       | warning  | An element or attribute GEXF does not define was skipped.                                |
| `W_STRAY_TEXT`                 | `STRAY_TEXT`            | warning  | Text where GEXF allows only elements was ignored.                                        |
| `W_OPTION_IGNORED`             | `OPTION_IGNORED`        | warning  | A common option the importer has no use for was given.                                   |
| `W_SINK_OPTION`                | `SINK_OPTION`           | warning  | A builder-policy option the sink does not honour.                                        |
| `W_DIRECTION_REFUSED`          | `DIRECTION_REFUSED`     | warning  | The sink refused the file's direction.                                                   |
| `W_DIRECTION_FORCED`           | `DIRECTION_FORCED`      | warning  | Edges forced to the policy's direction.                                                  |
| `E_MIXED_DIRECTION`            | `MIXED_DIRECTION`       | error    | A mixed file under onMixedDirection "error" (fatal).                                     |

## Loss codes

The codes `check()` can return before a save, also exported as `GEXF_LOSS` from `@graphty/graph-io/gexf`. An `E_` code means the save throws unless you change the graph or the options.

| Code                      | Key                     | Severity            | Meaning                                                                                                                     |
| ------------------------- | ----------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `W_GEXF_KIND_DROPPED`     | `KIND_DROPPED`          | warning             | GEXF 1.2 has no parallel-edge `kind`; the kind column is dropped.                                                           |
| `W_TIMESTAMP_AS_INTERVAL` | `TIMESTAMP_AS_INTERVAL` | warning             | GEXF 1.2 has no timestamps; a timestamp becomes a closed interval [t, t].                                                   |
| `W_LIST_SEPARATOR`        | `LIST_SEPARATOR`        | warning             | GEXF 1.2 liststring items are separated by `\|`; an item containing one cannot be split back.                               |
| `W_ROLE_SHAPE`            | `ROLE_SHAPE`            | warning             | A role column of a shape GEXF cannot map (a string `start`, a 2-component color); written as a plain attribute.             |
| `W_TEMPORAL_TABLE_SHAPE`  | `TEMPORAL_TABLE_SHAPE`  | warning             | A temporal extension table without the element / start / end / value columns.                                               |
| `W_ATTRIBUTE_RENAMED`     | `ATTRIBUTE_RENAMED`     | warning             | An attribute whose title the importer would rename on re-import (a reserved name).                                          |
| `W_VALUE_UNWRITABLE`      | `VALUE_UNWRITABLE`      | warning             | A cell, default or option the declared type cannot express (skipped).                                                       |
| `W_DECLARED_TYPE`         | `DECLARED_TYPE`         | warning             | A declared type the target version lacks (1.2: date, dateTime, typed lists...); the canonical type is written.              |
| `W_ID_TEXT_TYPE`          | `ID_TEXT_TYPE`          | warning             | A node id whose text reads back as the other type under the canonical rule: a non-integer number, a string of integer text. |
| `W_GEXF_EDGE_ID_TEXT`     | `EDGE_ID_TEXT`          | warning             | A numeric edge id column: GEXF edge ids read back as strings.                                                               |
| `W_GEXF_VIZ_DTYPE`        | `VIZ_DTYPE`             | warning             | A viz role column (position, color, size, thickness) that is not f32; the importer reads viz values as f32.                 |
| `W_WEIGHT_KEY_CLASH`      | `WEIGHT_KEY_CLASH`      | warning             | A plain `weight` edge column reads back as THE weight (the importer's weightFrom default).                                  |
| `W_OPTIONS_GAINED`        | `OPTIONS_GAINED`        | warning             | A dict column without declared options gains one from its dictionary on re-import.                                          |
| `E_XML_ILLEGAL_CHAR`      | `XML_ILLEGAL_CHAR`      | error (save throws) | A string cell holding a character XML 1.0 forbids; export() throws E_COLUMN_TYPE.                                           |

<!-- generated:end -->
