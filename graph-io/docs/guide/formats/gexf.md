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

What a saved file can hold (the [capabilities](./index.md#what-the-capabilities-mean) explain each row):

| Capability                                      | Value                             |
| ----------------------------------------------- | --------------------------------- |
| [`mixedDirection`](./index.md#mixeddirection)   | yes                               |
| [`multiEdges`](./index.md#multiedges)           | yes                               |
| [`selfLoops`](./index.md#selfloops)             | yes                               |
| [`edgeIds`](./index.md#edgeids)                 | optional                          |
| [`idCharset`](./index.md#idcharset)             | any                               |
| [`dtypes`](./index.md#dtypes)                   | f32, f64, i32, bool, dict, string |
| [`components`](./index.md#components)           | no                                |
| [`lists`](./index.md#lists)                     | yes                               |
| [`json`](./index.md#json)                       | no                                |
| [`defaults`](./index.md#defaults)               | yes                               |
| [`options`](./index.md#options)                 | yes                               |
| [`hierarchy`](./index.md#hierarchy)             | yes                               |
| [`temporal`](./index.md#temporal)               | dynamic-values                    |
| [`graphAttributes`](./index.md#graphattributes) | no                                |
| [`positions`](./index.md#positions)             | yes                               |
| [`viz`](./index.md#viz)                         | yes                               |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/gexf -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got.gexf"), { filename: "got.gexf" });
console.log(`${snapshot.nodeCount} nodes; node columns: ${snapshot.nodes.names().join(", ")}`);

// GEXF 1.3 is written by default; ask for 1.2 when an older tool needs it
const options = { version: "1.2" } as const;
console.log(checkExport(snapshot, "gexf", options));
await writeFile("got-1.2.gexf", await exportGraphToBytes(snapshot, "gexf", options));
```

<!-- generated:end -->

<!-- generated:begin output:formats/gexf -->

```text
107 nodes; node columns: label
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

| Option | Type      | Default | Meaning                                                                                                                                                                                          |
| ------ | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `viz`  | `boolean` | `true`  | Whether to read the visual attributes of Gephi's viz namespace (color, position, size, shape, thickness) into node and edge attributes; false skips them, with one `W_GEXF_VIZ_SKIPPED` warning. |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option    | Type             | Default | Meaning                    |
| --------- | ---------------- | ------- | -------------------------- |
| `version` | `"1.2" \| "1.3"` | `"1.3"` | The GEXF version to write. |

## Import issue codes

The codes this format's import report can hold, also exported as `GEXF_ISSUE` from `@graphty/graph-io/gexf`.

| Code                           | Key                     | Severity | Meaning                                                                                                                                                                                                                                        |
| ------------------------------ | ----------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_XML_SYNTAX`                 | `XML_SYNTAX`            | error    | The XML is not well-formed. The import stops.                                                                                                                                                                                                  |
| `E_INVALID_UTF8`               | `INVALID_UTF8`          | error    | The input is not valid UTF-8. The import stops.                                                                                                                                                                                                |
| `E_INVALID_ENCODING`           | `INVALID_ENCODING`      | error    | Some bytes are not valid in the encoding that was chosen (by a byte order mark, the file's declaration or the `encoding` option). The import stops.                                                                                            |
| `W_ENCODING_FALLBACK`          | `ENCODING_FALLBACK`     | warning  | Bytes that are not UTF-8 and declare no encoding were read as windows-1252.                                                                                                                                                                    |
| `W_UNKNOWN_ENCODING`           | `UNKNOWN_ENCODING`      | warning  | A declared encoding the platform cannot decode was ignored.                                                                                                                                                                                    |
| `E_NOT_GEXF`                   | `NOT_GEXF`              | error    | The root element is not `<gexf>`. The import stops.                                                                                                                                                                                            |
| `E_NO_GRAPH`                   | `NO_GRAPH`              | error    | The document has no `<graph>`. The import stops.                                                                                                                                                                                               |
| `W_MULTIPLE_GRAPHS`            | `MULTIPLE_GRAPHS`       | warning  | The file holds several graphs and only one was read: the first, or the one `graphIndex` or `graphName` chose. `importAllGraphs()` reads every one.                                                                                             |
| `E_GEXF_MISSING_NODES`         | `MISSING_NODES`         | error    | `<edges>` without `<nodes>`.                                                                                                                                                                                                                   |
| `E_MISSING_ID`                 | `MISSING_ID`            | error    | A node without an id.                                                                                                                                                                                                                          |
| `E_MISSING_ENDPOINT`           | `MISSING_ENDPOINT`      | error    | An edge without a source or target.                                                                                                                                                                                                            |
| `E_UNKNOWN_NODE`               | `UNKNOWN_NODE`          | error    | An edge endpoint that names no declared node (addMissingNodes false, the GEXF default).                                                                                                                                                        |
| `E_GEXF_EDGE_TYPE`             | `EDGE_TYPE`             | error    | An edge `type` outside directed / undirected / mutual.                                                                                                                                                                                         |
| `E_UNKNOWN_PARENT`             | `UNKNOWN_PARENT`        | error    | A `pid` / `<parent for>` naming an unknown node, a `<parent>` without for, or the children of a skipped node.                                                                                                                                  |
| `E_PARENT_CYCLE`               | `PARENT_CYCLE`          | error    | A `pid` / nested containment that would close a parent cycle; that link is dropped.                                                                                                                                                            |
| `E_BAD_VALUE`                  | `BAD_VALUE`             | error    | An inverted interval (start after end) of an element, a spell or a value; it is not kept.                                                                                                                                                      |
| `E_GEXF_ATTRIBUTES_CLASS`      | `ATTRIBUTES_CLASS`      | error    | An `<attributes class>` outside node / edge.                                                                                                                                                                                                   |
| `E_GEXF_ATTRIBUTE_ID`          | `ATTRIBUTE_ID`          | error    | An `<attribute>` without an id.                                                                                                                                                                                                                |
| `W_GEXF_HEADER_VALUE`          | `HEADER_VALUE`          | warning  | A `<graph>` header attribute with an unknown value.                                                                                                                                                                                            |
| `W_COUNT_HINT`                 | `COUNT_HINT`            | warning  | A node or edge count the file announces is too large to reserve room for; it is ignored and the elements are read as they come.                                                                                                                |
| `W_COUNT_MISMATCH`             | `COUNT_MISMATCH`        | warning  | A `count` attribute disagrees with the number of nodes or edges actually in its section. The elements are read as they are.                                                                                                                    |
| `W_DUPLICATE_NODE`             | `DUPLICATE_NODE`        | warning  | A node id declared twice.                                                                                                                                                                                                                      |
| `E_DUPLICATE_EDGE_ID`          | `DUPLICATE_EDGE_ID`     | error    | An edge id declared twice (the second edge is skipped).                                                                                                                                                                                        |
| `W_DUPLICATE_ATTRIBUTE`        | `DUPLICATE_ATTRIBUTE`   | warning  | An attribute id declared twice in one class.                                                                                                                                                                                                   |
| `W_GEXF_ATTRIBUTE_TYPE`        | `ATTRIBUTE_TYPE`        | warning  | An attribute type the importer maps to string.                                                                                                                                                                                                 |
| `W_UNKNOWN_ATTR_TYPE`          | `UNKNOWN_ATTR_TYPE`     | warning  | A declared type the format does not define (kept as string).                                                                                                                                                                                   |
| `W_BAD_DEFAULT`                | `BAD_DEFAULT`           | warning  | A default that does not parse as the declared type.                                                                                                                                                                                            |
| `W_BAD_OPTIONS`                | `BAD_OPTIONS`           | warning  | Options that do not parse as the declared type.                                                                                                                                                                                                |
| `W_COLUMN_RENAMED`             | `COLUMN_RENAMED`        | warning  | An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example a repeated column header.                                                                                                               |
| `W_ROLE_TAKEN`                 | `ROLE_TAKEN`            | warning  | You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.                                                                                                            |
| `W_GEXF_UNKNOWN_ATTRIBUTE`     | `UNKNOWN_ATTRIBUTE`     | warning  | An `<attvalue for>` naming an undeclared attribute.                                                                                                                                                                                            |
| `W_GEXF_ATTVALUE_SHAPE`        | `ATTVALUE_SHAPE`        | warning  | An `<attvalue>` without a value.                                                                                                                                                                                                               |
| `W_GEXF_TIMED_VALUE_ON_STATIC` | `TIMED_VALUE_ON_STATIC` | warning  | A timed value on an attribute of a static group.                                                                                                                                                                                               |
| `W_PRECISION`                  | `PRECISION`             | warning  | An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit.                                                                                                                                      |
| `W_ID_MERGED`                  | `ID_MERGED`             | warning  | Two different id texts became the same number because `ids` is "number", so their nodes were merged.                                                                                                                                           |
| `W_GEXF_WEIGHT_IGNORED`        | `WEIGHT_IGNORED`        | warning  | The XML weight attribute ignored under weightFrom null.                                                                                                                                                                                        |
| `W_GEXF_VIZ_SKIPPED`           | `VIZ_SKIPPED`           | warning  | Viz elements skipped under viz: false.                                                                                                                                                                                                         |
| `W_GEXF_VIZ_DYNAMIC_DROPPED`   | `VIZ_DYNAMIC_DROPPED`   | warning  | A 1.2 dynamic viz element whose bounds were dropped.                                                                                                                                                                                           |
| `W_GEXF_SPELL_OPEN_DROPPED`    | `SPELL_OPEN_DROPPED`    | warning  | Deprecated and no longer recorded: open spells are kept in the spells.open column.                                                                                                                                                             |
| `W_GEXF_VIZ_VALUE`             | `VIZ_VALUE`             | warning  | A viz value that could not be read.                                                                                                                                                                                                            |
| `W_GEXF_OPEN_BOUND_CONFLICT`   | `OPEN_BOUND_CONFLICT`   | warning  | Both `start` and `startopen` (or `end` and `endopen`) on one element.                                                                                                                                                                          |
| `W_GEXF_TIMESTAMP_CONFLICT`    | `TIMESTAMP_CONFLICT`    | warning  | Both `timestamp` and `start` / `end` on one element or value.                                                                                                                                                                                  |
| `W_GEXF_VALUE_OUTSIDE_OPTIONS` | `VALUE_OUTSIDE_OPTIONS` | warning  | A value outside the declared `<options>` (kept).                                                                                                                                                                                               |
| `W_UNKNOWN_ELEMENT`            | `UNKNOWN_ELEMENT`       | warning  | An element GEXF does not define at that place was skipped.                                                                                                                                                                                     |
| `W_UNKNOWN_XML_ATTRIBUTE`      | `UNKNOWN_XML_ATTRIBUTE` | warning  | An XML attribute GEXF does not define on that element was ignored.                                                                                                                                                                             |
| `W_STRAY_TEXT`                 | `STRAY_TEXT`            | warning  | Text where GEXF allows only elements was ignored.                                                                                                                                                                                              |
| `W_OPTION_IGNORED`             | `OPTION_IGNORED`        | warning  | You set an option this format does not use; it had no effect. The message names the option.                                                                                                                                                    |
| `W_SINK_OPTION`                | `SINK_OPTION`           | warning  | You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.                                          |
| `W_DIRECTION_REFUSED`          | `DIRECTION_REFUSED`     | warning  | You read into a graph builder whose direction is already set, or which already holds edges, so the file is read with the builder's direction instead of its own.                                                                               |
| `W_DIRECTION_FORCED`           | `DIRECTION_FORCED`      | warning  | Edges of the other direction were read with the direction `onMixedDirection` chose.                                                                                                                                                            |
| `E_MIXED_DIRECTION`            | `MIXED_DIRECTION`       | error    | The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a format that holds one direction per file fails with `E_DIRECTED`. Pass "directed" or "undirected" to read or write it anyway. |

Like every format, it can also record the codes for unreadable input: [`E_EMPTY_INPUT`](../codes.md#E_EMPTY_INPUT), [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED).

## Loss codes

The codes `checkExport(snapshot, "gexf", options)` can return before a save, also exported as `GEXF_LOSS` from `@graphty/graph-io/gexf`. An `E_` code means the save throws unless you change the graph or the options. A save can also return the [shared loss codes](../codes.md#shared-loss-codes) that any format can.

| Code                      | Key                     | Severity            | Meaning                                                                                                                                                                                                                               |
| ------------------------- | ----------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `W_GEXF_KIND_DROPPED`     | `KIND_DROPPED`          | warning             | GEXF 1.2 has no parallel-edge `kind`; the kind column is dropped.                                                                                                                                                                     |
| `W_TIMESTAMP_AS_INTERVAL` | `TIMESTAMP_AS_INTERVAL` | warning             | GEXF 1.2 has no timestamps; a timestamp becomes a closed interval [t, t].                                                                                                                                                             |
| `W_LIST_SEPARATOR`        | `LIST_SEPARATOR`        | warning             | GEXF 1.2 liststring items are separated by `\|`; an item containing one cannot be split back.                                                                                                                                         |
| `W_ROLE_SHAPE`            | `ROLE_SHAPE`            | warning             | A role column of a shape GEXF cannot map (a string `start`, a 2-component color); written as a plain attribute.                                                                                                                       |
| `W_TEMPORAL_TABLE_SHAPE`  | `TEMPORAL_TABLE_SHAPE`  | warning             | A temporal extension table without the element / start / end / value columns.                                                                                                                                                         |
| `W_ATTRIBUTE_RENAMED`     | `ATTRIBUTE_RENAMED`     | warning             | An attribute's name is one GEXF reserves, so a GEXF import would give it another name.                                                                                                                                                |
| `W_VALUE_UNWRITABLE`      | `VALUE_UNWRITABLE`      | warning             | A cell, default or option the declared type cannot express (skipped).                                                                                                                                                                 |
| `W_DECLARED_TYPE`         | `DECLARED_TYPE`         | warning             | An attribute type that this GEXF version does not have (GEXF 1.2 has no date, dateTime or typed lists) is written as the nearest type it has.                                                                                         |
| `W_ID_TEXT_TYPE`          | `ID_TEXT_TYPE`          | warning             | A node id that reads back as a different type: a number that is not an integer comes back as text, and text that looks like an integer ("42") comes back as a number, unless you read the file with `ids: "string"` or `ids: "keep"`. |
| `W_GEXF_EDGE_ID_TEXT`     | `EDGE_ID_TEXT`          | warning             | A numeric edge id column: GEXF edge ids read back as strings.                                                                                                                                                                         |
| `W_GEXF_VIZ_DTYPE`        | `VIZ_DTYPE`             | warning             | A visual attribute (position, color, size, thickness) is stored at more precision than GEXF keeps; it reads back as a 32-bit float.                                                                                                   |
| `W_WEIGHT_KEY_CLASH`      | `WEIGHT_KEY_CLASH`      | warning             | An attribute named `weight` without the weight role reads back as the edge weight, because GEXF reads weights from `weight` by default.                                                                                               |
| `W_OPTIONS_GAINED`        | `OPTIONS_GAINED`        | warning             | A text attribute stored as a dictionary, without a declared list of allowed values, reads back with its distinct values as that list.                                                                                                 |
| `E_XML_ILLEGAL_CHAR`      | `XML_ILLEGAL_CHAR`      | error (save throws) | A text value holds a character XML 1.0 forbids (most control characters); the save fails with `E_COLUMN_TYPE`.                                                                                                                        |

<!-- generated:end -->
