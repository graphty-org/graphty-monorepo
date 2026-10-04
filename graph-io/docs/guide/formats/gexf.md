# GEXF

[GEXF](https://gexf.net/) is the XML format of [Gephi](https://gephi.org/). Besides nodes, edges
and typed attributes, it can hold node colors, sizes and positions, nested nodes, and attributes
whose values change over time.

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

| Capability        | Value                             | Meaning                                                                                                                            |
| ----------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `mixedDirection`  | yes                               | Directed and undirected edges in one file.                                                                                         |
| `multiEdges`      | yes                               | Parallel edges.                                                                                                                    |
| `selfLoops`       | yes                               | Self-loops.                                                                                                                        |
| `edgeIds`         | optional                          | Edge ids: "required" (generated when the graph has none), "optional", or "none" (not stored).                                      |
| `idCharset`       | any                               | Which node ids are written unchanged: "any", "nmtoken" (XML name tokens), "integer", or "dense-1-based" (1 to N).                  |
| `dtypes`          | f32, f64, i32, bool, dict, string | The column types the format keeps exactly.                                                                                         |
| `components`      | no                                | Columns with several numbers per row, such as a position.                                                                          |
| `lists`           | yes                               | List columns.                                                                                                                      |
| `json`            | no                                | Nested JSON values.                                                                                                                |
| `defaults`        | yes                               | Columns' declared default values.                                                                                                  |
| `options`         | yes                               | Declared lists of allowed values (GEXF options).                                                                                   |
| `hierarchy`       | yes                               | Nesting: nodes inside other nodes (parent columns).                                                                                |
| `temporal`        | dynamic-values                    | Time: "none", "intervals", "spells" (several intervals per element), or "dynamic-values" (attribute values that change over time). |
| `graphAttributes` | no                                | Graph-level attributes.                                                                                                            |
| `positions`       | yes                               | Node positions.                                                                                                                    |
| `viz`             | yes                               | Visual columns: color, size, shape and thickness.                                                                                  |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/gexf -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("lesmiserables.gexf"), { filename: "lesmiserables.gexf" });
console.log(`${snapshot.nodeCount} nodes; node columns: ${snapshot.nodes.names().join(", ")}`);

// GEXF 1.3 is written by default; ask for 1.2 when an older tool needs it
const options = { version: "1.2" } as const;
console.log(checkExport(snapshot, "gexf", options));
await writeFile("lesmiserables-1.2.gexf", await exportGraphToBytes(snapshot, "gexf", options));
```

<!-- generated:end -->

<!-- generated:begin output:formats/gexf -->

```text
77 nodes; node columns: label
[]
```

<!-- generated:end -->

The file is GEXF 1.3 by default. `version: "1.2"` writes GEXF 1.2 for older tools; 1.2 has no
parallel edges and needs an id on every edge, and `checkExport()` says so when that matters.

## How graph-io reads it

- GEXF 1.1, 1.2 and 1.3 files are read. The file is streamed, so a large file is never held in
  memory as text.
- Each declared attribute (`<attribute>`) becomes a column of its declared type: `integer` and
  `long` become numbers, `float` and `double` floating-point numbers, `boolean` true or false, and
  `string` text. List types become list columns. A declared default and declared options are kept
  on the column.
- The `viz` elements become visual columns: `viz:color` a color column (red, green, blue and alpha,
  each from 0 to 1), `viz:position` a position column (x, y, z), and `viz:size`, `viz:shape` and
  `viz:thickness` size, shape and thickness columns. Pass `viz: false` to ignore them.
- `defaultedgetype` sets the direction; a file without it is undirected, as the GEXF specification
  says. An edge's own `type` (`directed`, `undirected` or `mutual`) overrides it, so one file can
  mix directed and undirected edges.
- The edge's `weight` is the edge weight.
- Nested `<nodes>`, `pid` and `<parents>` become a parent column: the node a node sits inside.
- Element lifetimes (`start`, `end`, `timestamp`, `<spells>`) become time columns, and attribute
  values that change over time are kept in a separate table per attribute
  (`snapshot.extensions`, named `temporal:node:<attribute>` and `temporal:edge:<attribute>`).
- Ids follow the `ids` option, whatever the file's `idtype` says (Gephi writes `idtype="string"`
  for every file): `"1"` becomes the number 1 and `"n1"` stays text.
- An edge to a node the file does not declare is an error (`E_UNKNOWN_NODE`) unless you pass
  `addMissingNodes: true`.
- An attribute titled like one of GEXF's own fields (`label`, `parent`, `start`, ...) is renamed
  `<title>#<attribute id>` so it does not collide with that field.

## What a saved file keeps and loses

GEXF keeps more of a graph than any other format: mixed direction, parallel edges, any node id,
typed and list columns, defaults, options, nesting, time, positions and visual attributes. What
does not survive:

- Graph-level attributes, which GEXF has no place for.
- The exact type of some ids. A node id that is a fractional number reads back as text, and a text
  id that looks like an integer (`"7"`) reads back as the number 7 (`W_ID_TEXT_TYPE`). Read with
  `ids: "string"` to keep every id as text.
- A text column with few distinct values gains a list of options on the way back
  (`W_OPTIONS_GAINED`).
- Text holding a character XML 1.0 forbids, such as most control characters, cannot be written at
  all; the export throws (`E_XML_ILLEGAL_CHAR`).
- GEXF 1.2 has no parallel edges.

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

| Code                           | Key                     | Severity | Meaning                                                                                                       |
| ------------------------------ | ----------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `E_EMPTY_INPUT`                | `EMPTY_INPUT`           | error    | The input holds no markup at all: empty, whitespace or a byte order mark only (fatal).                        |
| `E_TOO_LARGE`                  | `TOO_LARGE`             | error    | The input is longer than one JavaScript string, or holds a line that is (fatal).                              |
| `W_ENCODING_CONFLICT`          | `ENCODING_CONFLICT`     | warning  | A declared encoding the byte order mark contradicts (the mark wins).                                          |
| `W_CONTROL_CHARACTER`          | `CONTROL_CHARACTER`     | warning  | A control character or a stray U+FEFF in the text, or an ignored trailing Ctrl-Z.                             |
| `E_FOREIGN_FORMAT`             | `FOREIGN_FORMAT`        | error    | The input is an HTML page, a PDF, compressed or archived data or an image (fatal).                            |
| `W_ISSUES_SUPPRESSED`          | `ISSUES_SUPPRESSED`     | warning  | Warnings of one code beyond the number a report keeps, counted in one warning.                                |
| `E_XML_SYNTAX`                 | `XML_SYNTAX`            | error    | The XML is not well-formed (fatal).                                                                           |
| `E_INVALID_UTF8`               | `INVALID_UTF8`          | error    | The input holds invalid UTF-8 (fatal).                                                                        |
| `E_INVALID_ENCODING`           | `INVALID_ENCODING`      | error    | Invalid bytes in the encoding a BOM, a declaration or the encoding option chose (fatal).                      |
| `W_ENCODING_FALLBACK`          | `ENCODING_FALLBACK`     | warning  | Bytes that are not UTF-8 and declare no encoding were read as windows-1252.                                   |
| `W_UNKNOWN_ENCODING`           | `UNKNOWN_ENCODING`      | warning  | A declared encoding the platform cannot decode was ignored.                                                   |
| `E_NOT_GEXF`                   | `NOT_GEXF`              | error    | The root element is not `<gexf>` (fatal).                                                                     |
| `E_NO_GRAPH`                   | `NO_GRAPH`              | error    | The document has no `<graph>` (fatal).                                                                        |
| `W_MULTIPLE_GRAPHS`            | `MULTIPLE_GRAPHS`       | warning  | A second `<graph>`; its nodes and edges are merged into the first, its header is ignored.                     |
| `E_GEXF_MISSING_NODES`         | `MISSING_NODES`         | error    | `<edges>` without `<nodes>`.                                                                                  |
| `E_MISSING_ID`                 | `MISSING_ID`            | error    | A node without an id.                                                                                         |
| `E_MISSING_ENDPOINT`           | `MISSING_ENDPOINT`      | error    | An edge without a source or target.                                                                           |
| `E_UNKNOWN_NODE`               | `UNKNOWN_NODE`          | error    | An edge endpoint that names no declared node (addMissingNodes false, the GEXF default).                       |
| `E_GEXF_EDGE_TYPE`             | `EDGE_TYPE`             | error    | An edge `type` outside directed / undirected / mutual.                                                        |
| `E_UNKNOWN_PARENT`             | `UNKNOWN_PARENT`        | error    | A `pid` / `<parent for>` naming an unknown node, a `<parent>` without for, or the children of a skipped node. |
| `E_PARENT_CYCLE`               | `PARENT_CYCLE`          | error    | A `pid` / nested containment that would close a parent cycle; that link is dropped.                           |
| `E_BAD_VALUE`                  | `BAD_VALUE`             | error    | An inverted interval (start after end) of an element, a spell or a value; it is not kept.                     |
| `E_GEXF_ATTRIBUTES_CLASS`      | `ATTRIBUTES_CLASS`      | error    | An `<attributes class>` outside node / edge.                                                                  |
| `E_GEXF_ATTRIBUTE_ID`          | `ATTRIBUTE_ID`          | error    | An `<attribute>` without an id.                                                                               |
| `W_GEXF_HEADER_VALUE`          | `HEADER_VALUE`          | warning  | A `<graph>` header attribute with an unknown value.                                                           |
| `W_COUNT_HINT`                 | `COUNT_HINT`            | warning  | A `count` hint the sink cannot reserve (ignored).                                                             |
| `W_COUNT_MISMATCH`             | `COUNT_MISMATCH`        | warning  | A `count` hint that disagrees with the elements of its section.                                               |
| `W_DUPLICATE_NODE`             | `DUPLICATE_NODE`        | warning  | A node id declared twice.                                                                                     |
| `E_DUPLICATE_EDGE_ID`          | `DUPLICATE_EDGE_ID`     | error    | An edge id declared twice (the second edge is skipped).                                                       |
| `W_DUPLICATE_ATTRIBUTE`        | `DUPLICATE_ATTRIBUTE`   | warning  | An attribute id declared twice in one class.                                                                  |
| `W_GEXF_ATTRIBUTE_TYPE`        | `ATTRIBUTE_TYPE`        | warning  | An attribute type the importer maps to string.                                                                |
| `W_UNKNOWN_ATTR_TYPE`          | `UNKNOWN_ATTR_TYPE`     | warning  | A declared type the format does not define (kept as string).                                                  |
| `W_BAD_DEFAULT`                | `BAD_DEFAULT`           | warning  | A default that does not parse as the declared type.                                                           |
| `W_BAD_OPTIONS`                | `BAD_OPTIONS`           | warning  | Options that do not parse as the declared type.                                                               |
| `W_COLUMN_RENAMED`             | `COLUMN_RENAMED`        | warning  | A column renamed `<name>#<id>` because the name was taken.                                                    |
| `W_ROLE_TAKEN`                 | `ROLE_TAKEN`            | warning  | A column declared without its role because the table already holds it.                                        |
| `W_GEXF_UNKNOWN_ATTRIBUTE`     | `UNKNOWN_ATTRIBUTE`     | warning  | An `<attvalue for>` naming an undeclared attribute.                                                           |
| `W_GEXF_ATTVALUE_SHAPE`        | `ATTVALUE_SHAPE`        | warning  | An `<attvalue>` without a value.                                                                              |
| `W_GEXF_TIMED_VALUE_ON_STATIC` | `TIMED_VALUE_ON_STATIC` | warning  | A timed value on an attribute of a static group.                                                              |
| `W_PRECISION`                  | `PRECISION`             | warning  | A long value beyond 2^53 rounded.                                                                             |
| `W_ID_MERGED`                  | `ID_MERGED`             | warning  | Two id texts merged into one number under ids "number".                                                       |
| `W_GEXF_WEIGHT_IGNORED`        | `WEIGHT_IGNORED`        | warning  | The XML weight attribute ignored under weightFrom null.                                                       |
| `W_GEXF_VIZ_SKIPPED`           | `VIZ_SKIPPED`           | warning  | viz elements skipped under viz: false.                                                                        |
| `W_GEXF_VIZ_DYNAMIC_DROPPED`   | `VIZ_DYNAMIC_DROPPED`   | warning  | A 1.2 dynamic viz element whose bounds were dropped.                                                          |
| `W_GEXF_SPELL_OPEN_DROPPED`    | `SPELL_OPEN_DROPPED`    | warning  | Deprecated and no longer recorded: open spells are kept in the spells.open column.                            |
| `W_GEXF_VIZ_VALUE`             | `VIZ_VALUE`             | warning  | A viz value that could not be read.                                                                           |
| `W_GEXF_OPEN_BOUND_CONFLICT`   | `OPEN_BOUND_CONFLICT`   | warning  | Both `start` and `startopen` (or `end` and `endopen`) on one element.                                         |
| `W_GEXF_TIMESTAMP_CONFLICT`    | `TIMESTAMP_CONFLICT`    | warning  | Both `timestamp` and `start` / `end` on one element or value.                                                 |
| `W_GEXF_VALUE_OUTSIDE_OPTIONS` | `VALUE_OUTSIDE_OPTIONS` | warning  | A value outside the declared `<options>` (kept).                                                              |
| `W_UNKNOWN_ELEMENT`            | `UNKNOWN_ELEMENT`       | warning  | An element GEXF does not define at that place was skipped.                                                    |
| `W_UNKNOWN_XML_ATTRIBUTE`      | `UNKNOWN_XML_ATTRIBUTE` | warning  | An XML attribute GEXF does not define on that element was ignored.                                            |
| `W_STRAY_TEXT`                 | `STRAY_TEXT`            | warning  | Text where GEXF allows only elements was ignored.                                                             |
| `W_OPTION_IGNORED`             | `OPTION_IGNORED`        | warning  | A common option the importer has no use for was given.                                                        |
| `W_SINK_OPTION`                | `SINK_OPTION`           | warning  | A builder-policy option the sink does not honor.                                                              |
| `W_DIRECTION_REFUSED`          | `DIRECTION_REFUSED`     | warning  | The sink refused the file's direction.                                                                        |
| `W_DIRECTION_FORCED`           | `DIRECTION_FORCED`      | warning  | Edges forced to the policy's direction.                                                                       |
| `E_MIXED_DIRECTION`            | `MIXED_DIRECTION`       | error    | A mixed file under onMixedDirection "error" (fatal).                                                          |

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
