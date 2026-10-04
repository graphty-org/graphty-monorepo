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
- The `viz` elements become color, position, size, shape and thickness columns; see
  [Visual attributes](#visual-attributes). Pass `viz: false` to ignore them.
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

## Visual attributes

With `viz` on (the default), Gephi's visual attributes become columns: `color` (red, green, blue
and alpha, each from 0 to 1), `position` (x, y and z), `size` and `shape` on nodes, and `color`,
`thickness` and `shape` on edges. Each has the role of the same name, so other formats that hold
colors or positions find it. A save writes these columns back as `viz` elements.

<!-- generated:begin example:formats/gexf-viz -->

```ts
import { importGraph } from "@graphty/graph-io";

// Gephi's visual attributes, in the viz namespace
const gexf = `<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
  <graph defaultedgetype="undirected">
    <nodes>
      <node id="a" label="A">
        <viz:color r="255" g="0" b="0" a="0.5"/><viz:position x="1" y="2" z="0"/><viz:size value="4"/>
      </node>
      <node id="b" label="B"/>
    </nodes>
    <edges><edge source="a" target="b"><viz:thickness value="3"/></edge></edges>
  </graph>
</gexf>`;

const { snapshot } = await importGraph(gexf, { format: "gexf" });
// the columns viz makes, with node a's (and edge 0's) value
for (const [what, table] of [
    ["node", snapshot.nodes],
    ["edge", snapshot.edges],
] as const) {
    for (const name of table.names()) {
        const value = table.value(name, 0);
        const shown = ArrayBuffer.isView(value) ? Array.from(value as Float32Array) : value;
        console.log(`${what} ${name}: ${JSON.stringify(shown)}`);
    }
}
```

<!-- generated:end -->

<!-- generated:begin output:formats/gexf-viz -->

```text
node label: "A"
node color: [1,0,0,0.5]
node position: [1,2,0]
node size: 4
edge thickness: 3
```

<!-- generated:end -->

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
- GEXF 1.2 has no parallel edges, and no edge kind. An edge column marked as the kind, such as the
  `relation` column of an OBO ontology, is written as each edge's `kind` in GEXF 1.3 and reads back
  as a column named `kind`. Under `version: "1.2"` it is dropped (`W_GEXF_KIND_DROPPED`). To keep
  it in a 1.2 file, make it a plain column first:

<!-- generated:begin example:formats/gexf-kind -->

```ts
import { readFile } from "node:fs/promises";

import { checkExport, exportGraphToString, importGraph } from "@graphty/graph-io";

// An OBO ontology: each edge's relation (is_a, part_of) is in the "relation" column, marked as the edge kind
const { snapshot } = await importGraph(await readFile("vehicles.obo"), { filename: "vehicles.obo" });

// GEXF 1.3 writes it as the edge kind, which reads back as a column named "kind"
const v13 = await importGraph(await exportGraphToString(snapshot, "gexf"), { format: "gexf" });
console.log(v13.snapshot.edges.names());

// GEXF 1.2 has no edge kind, so the column is dropped
console.log(checkExport(snapshot, "gexf", { version: "1.2" }).map((n) => n.code));

// To keep it in a 1.2 file, make it a plain column first, in a copy
const copy = snapshot.withColumns();
const relation = copy.edges.get("relation");
copy.edges.set(
    "relation",
    Array.from({ length: copy.edgeCount }, (_, e) => relation?.value(e)),
);
const v12 = await importGraph(await exportGraphToString(copy, "gexf", { version: "1.2" }), { format: "gexf" });
console.log(v12.snapshot.edges.names());
```

<!-- generated:end -->

<!-- generated:begin output:formats/gexf-kind -->

```text
[ 'kind' ]
[
  'W_EDGE_IDS_GENERATED',
  'W_COLUMN_NAME_CHANGED',
  'W_OPTIONS_GAINED',
  'W_GEXF_KIND_DROPPED'
]
[ 'relation', 'id' ]
```

<!-- generated:end -->

<!-- generated:begin capabilities:gexf -->

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

<!-- generated:begin reference:gexf -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option               | Type      | Default |
| -------------------- | --------- | ------- |
| [`viz`](#import-viz) | `boolean` | `true`  |

- <a id="import-viz"></a>`viz`: Whether to read the visual attributes of Gephi's viz namespace (color, position, size, shape, thickness) into node and edge attributes; false skips them, with one `W_GEXF_VIZ_SKIPPED` warning.

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option                       | Type             | Default |
| ---------------------------- | ---------------- | ------- |
| [`version`](#export-version) | `"1.2" \| "1.3"` | `"1.3"` |

- <a id="export-version"></a>`version`: The GEXF version to write.

## Import issue codes

The codes this format's import report can hold. They are also exported as `GEXF_ISSUE` from `@graphty/graph-io/gexf`, keyed by the code without its `E_` / `W_` and `GEXF_` prefixes.

- `E_EMPTY_INPUT` (error): The input holds no XML at all: it is empty, whitespace or a byte order mark only. The import stops.
- `W_ENCODING_CONFLICT` (warning): A declared encoding the byte order mark contradicts (the mark wins).
- `E_UNKNOWN_NODE` (error): An edge endpoint that names no declared node (addMissingNodes false, the GEXF default).
- `E_DUPLICATE_EDGE_ID` (error): An edge id declared twice (the second edge is skipped).
- `E_COLUMN_TYPE` (error): A value that does not parse as the type its attribute declares ("x" in an integer attribute). The value is left unset; the node or edge is kept.
- `E_XML_SYNTAX` (error): The XML is not well-formed. The import stops.
- `E_INVALID_UTF8` (error): The input is not valid UTF-8. The import stops.
- `E_INVALID_ENCODING` (error): Some bytes are not valid in the encoding that was chosen (by a byte order mark, the file's declaration or the `encoding` option). The import stops.
- `W_ENCODING_FALLBACK` (warning): Bytes that are not UTF-8 and declare no encoding were read as windows-1252.
- `W_UNKNOWN_ENCODING` (warning): A declared encoding the platform cannot decode was ignored.
- `E_NOT_GEXF` (error): The root element is not `<gexf>`. The import stops.
- `E_NO_GRAPH` (error): The document has no `<graph>`. The import stops.
- `W_MULTIPLE_GRAPHS` (warning): The file holds more than one `<graph>` element; their nodes and edges are merged into one graph. `importAllGraphs()` reads every one.
- `E_GEXF_MISSING_NODES` (error): `<edges>` without `<nodes>`.
- `E_MISSING_ID` (error): A node without an id.
- `E_MISSING_ENDPOINT` (error): An edge without a source or target.
- `E_GEXF_EDGE_TYPE` (error): An edge `type` outside directed / undirected / mutual.
- `E_UNKNOWN_PARENT` (error): A `pid` / `<parent for>` naming an unknown node, a `<parent>` without for, or the children of a skipped node.
- `E_PARENT_CYCLE` (error): A `pid` / nested containment that would close a parent cycle; that link is dropped.
- `E_BAD_VALUE` (error): An inverted interval (start after end) of an element, a spell or a value; it is not kept.
- `E_GEXF_ATTRIBUTES_CLASS` (error): An `<attributes class>` outside node / edge.
- `E_GEXF_ATTRIBUTE_ID` (error): An `<attribute>` without an id.
- `W_GEXF_HEADER_VALUE` (warning): A `<graph>` header attribute with an unknown value.
- `W_COUNT_HINT` (warning): A node or edge count the file announces is too large to reserve room for; it is ignored and the elements are read as they come.
- `W_COUNT_MISMATCH` (warning): A `count` attribute disagrees with the number of nodes or edges actually in its section. The elements are read as they are.
- `W_DUPLICATE_NODE` (warning): A node id declared twice.
- `W_DUPLICATE_ATTRIBUTE` (warning): An attribute id declared twice in one class.
- `W_GEXF_ATTRIBUTE_TYPE` (warning): An attribute type the importer maps to string.
- `W_UNKNOWN_ATTR_TYPE` (warning): A declared type the format does not define (kept as string).
- `W_BAD_DEFAULT` (warning): A default that does not parse as the declared type.
- `W_BAD_OPTIONS` (warning): Options that do not parse as the declared type.
- `W_COLUMN_RENAMED` (warning): An attribute was renamed `<name>#<suffix>` because another attribute already has its name, for example two attributes declared with the same name.
- `W_ROLE_TAKEN` (warning): You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.
- `W_GEXF_UNKNOWN_ATTRIBUTE` (warning): An `<attvalue for>` naming an undeclared attribute.
- `W_GEXF_ATTVALUE_SHAPE` (warning): An `<attvalue>` without a value.
- `W_GEXF_TIMED_VALUE_ON_STATIC` (warning): A timed value on an attribute of a static group.
- `W_PRECISION` (warning): An integer beyond 2^53 was stored as the nearest 64-bit float; pass `long: "string"` to keep every digit.
- `W_ID_MERGED` (warning): Two different id texts became the same number because `ids` is "number", so their nodes were merged.
- `W_GEXF_WEIGHT_IGNORED` (warning): The XML weight attribute ignored under weightFrom null.
- `W_GEXF_VIZ_SKIPPED` (warning): Viz elements skipped under viz: false.
- `W_GEXF_VIZ_DYNAMIC_DROPPED` (warning): A 1.2 dynamic viz element whose bounds were dropped.
- `W_GEXF_SPELL_OPEN_DROPPED` (warning): Deprecated and no longer recorded: open spells are kept in the spells.open column.
- `W_GEXF_VIZ_VALUE` (warning): A viz value that could not be read.
- `W_GEXF_OPEN_BOUND_CONFLICT` (warning): Both `start` and `startopen` (or `end` and `endopen`) on one element.
- `W_GEXF_TIMESTAMP_CONFLICT` (warning): Both `timestamp` and `start` / `end` on one element or value.
- `W_GEXF_VALUE_OUTSIDE_OPTIONS` (warning): A value outside the declared `<options>` (kept).
- `W_UNKNOWN_ELEMENT` (warning): An element GEXF does not define at that place was skipped.
- `W_UNKNOWN_XML_ATTRIBUTE` (warning): An XML attribute GEXF does not define on that element was ignored.
- `W_STRAY_TEXT` (warning): Text where GEXF allows only elements was ignored.
- `W_OPTION_IGNORED` (warning): You set an option this format does not use; it had no effect. The message names the option.
- `W_SINK_OPTION` (warning): You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.
- `W_DIRECTION_REFUSED` (warning): You read into a graph builder whose direction is already set, or which already holds edges, so the file is read with the builder's direction instead of its own.
- `W_DIRECTION_FORCED` (warning): Edges of the other direction were read with the direction `onMixedDirection` chose.
- `E_MIXED_DIRECTION` (error): The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a format that holds one direction per file fails with `E_DIRECTED`. Pass "directed" or "undirected" to read or write it anyway.

Like every format, it can also record the codes for unreadable input and for elements the graph refuses: [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED), [`E_INVALID_ID`](../codes.md#E_INVALID_ID), [`E_INVALID_WEIGHT`](../codes.md#E_INVALID_WEIGHT), [`E_DUPLICATE_EDGE`](../codes.md#E_DUPLICATE_EDGE), [`E_SELF_LOOP`](../codes.md#E_SELF_LOOP).

## Loss codes

The codes `checkExport(snapshot, "gexf", options)` can return before a save, also exported as `GEXF_LOSS` from `@graphty/graph-io/gexf`. An `E_` code means the save throws unless you change the graph or the options.

- `W_GEXF_KIND_DROPPED` (warning): GEXF 1.2 has no parallel-edge `kind`; the kind column is dropped.
- `W_TIMESTAMP_AS_INTERVAL` (warning): GEXF 1.2 has no timestamps; a timestamp becomes a closed interval [t, t].
- `W_LIST_SEPARATOR` (warning): GEXF 1.2 liststring items are separated by `|`; an item containing one cannot be split back.
- `W_ROLE_SHAPE` (warning): A role column of a shape GEXF cannot map (a string `start`, a 2-component color); written as a plain attribute.
- `W_TEMPORAL_TABLE_SHAPE` (warning): A temporal extension table without the element / start / end / value columns.
- `W_ATTRIBUTE_RENAMED` (warning): An attribute's name is one GEXF reserves, so a GEXF import would give it another name.
- `W_VALUE_UNWRITABLE` (warning): A cell, default or option the declared type cannot express (skipped).
- `W_DECLARED_TYPE` (warning): An attribute type that this GEXF version does not have (GEXF 1.2 has no date, dateTime or typed lists) is written as the nearest type it has.
- `W_ID_TEXT_TYPE` (warning): A node id that reads back as a different type: a number that is not an integer comes back as text, and text that looks like an integer ("42") comes back as a number, unless you read the file with `ids: "string"` or `ids: "keep"`.
- `W_GEXF_EDGE_ID_TEXT` (warning): A numeric edge id column: GEXF edge ids read back as strings.
- `W_GEXF_VIZ_DTYPE` (warning): A visual attribute (position, color, size, thickness) is stored at more precision than GEXF keeps; it reads back as a 32-bit float.
- `W_WEIGHT_KEY_CLASH` (warning): An attribute named `weight` without the weight role reads back as the edge weight, because GEXF reads weights from `weight` by default.
- `W_OPTIONS_GAINED` (warning): A text attribute stored as a dictionary, without a declared list of allowed values, reads back with its distinct values as that list.
- `E_XML_ILLEGAL_CHAR` (error, the save throws): A text value holds a character XML 1.0 forbids (most control characters); the save fails with `E_COLUMN_TYPE`.

When the graph has something this format cannot hold, it can also return the [shared loss codes](../codes.md#shared-loss-codes): [`E_ID_CHARSET`](../codes.md#E_ID_CHARSET), [`E_ID_TEXT_COLLISION`](../codes.md#E_ID_TEXT_COLLISION), [`E_MIXED_DIRECTION`](../codes.md#E_MIXED_DIRECTION), [`W_COLUMN_DROPPED`](../codes.md#W_COLUMN_DROPPED), [`W_COLUMN_NAME_CHANGED`](../codes.md#W_COLUMN_NAME_CHANGED), [`W_COMPONENTS_FLATTENED`](../codes.md#W_COMPONENTS_FLATTENED), [`W_DEFAULT_DROPPED`](../codes.md#W_DEFAULT_DROPPED), [`W_DTYPE_UNSUPPORTED`](../codes.md#W_DTYPE_UNSUPPORTED), [`W_DYNAMIC_VALUES_DROPPED`](../codes.md#W_DYNAMIC_VALUES_DROPPED), [`W_EDGE_IDS_DROPPED`](../codes.md#W_EDGE_IDS_DROPPED), [`W_EDGE_IDS_GENERATED`](../codes.md#W_EDGE_IDS_GENERATED), [`W_EMPTY_COLUMN_DROPPED`](../codes.md#W_EMPTY_COLUMN_DROPPED), [`W_EXTENSION_TABLE_DROPPED`](../codes.md#W_EXTENSION_TABLE_DROPPED), [`W_GRAPH_ATTRIBUTES_DROPPED`](../codes.md#W_GRAPH_ATTRIBUTES_DROPPED), [`W_HIERARCHY_DROPPED`](../codes.md#W_HIERARCHY_DROPPED), [`W_ID_MANGLED`](../codes.md#W_ID_MANGLED), [`W_ID_RENUMBERED`](../codes.md#W_ID_RENUMBERED), [`W_INTEGRAL_F64_AS_I32`](../codes.md#W_INTEGRAL_F64_AS_I32), [`W_JSON_UNSUPPORTED`](../codes.md#W_JSON_UNSUPPORTED), [`W_LIST_UNSUPPORTED`](../codes.md#W_LIST_UNSUPPORTED), [`W_MIXED_DIRECTION`](../codes.md#W_MIXED_DIRECTION), [`W_MULTI_EDGES`](../codes.md#W_MULTI_EDGES), [`W_MUTUAL_AS_UNDIRECTED`](../codes.md#W_MUTUAL_AS_UNDIRECTED), [`W_MUTUAL_EXPANDED`](../codes.md#W_MUTUAL_EXPANDED), [`W_NONFINITE_AS_NULL`](../codes.md#W_NONFINITE_AS_NULL), [`W_OPEN_INTERVAL`](../codes.md#W_OPEN_INTERVAL), [`W_OPTIONS_DROPPED`](../codes.md#W_OPTIONS_DROPPED), [`W_PARENTS_DROPPED`](../codes.md#W_PARENTS_DROPPED), [`W_POSITIONS_DROPPED`](../codes.md#W_POSITIONS_DROPPED), [`W_ROLE_ASSUMED`](../codes.md#W_ROLE_ASSUMED), [`W_ROLE_DROPPED`](../codes.md#W_ROLE_DROPPED), [`W_SELF_LOOPS`](../codes.md#W_SELF_LOOPS), [`W_SPELLS_DROPPED`](../codes.md#W_SPELLS_DROPPED), [`W_STORAGE_CLASS_CHANGED`](../codes.md#W_STORAGE_CLASS_CHANGED), [`W_TEMPORAL_DROPPED`](../codes.md#W_TEMPORAL_DROPPED), [`W_TEMPORAL_TEXT_DROPPED`](../codes.md#W_TEMPORAL_TEXT_DROPPED), [`W_TEXT_INFERRED`](../codes.md#W_TEXT_INFERRED), [`W_VIZ_DROPPED`](../codes.md#W_VIZ_DROPPED), [`W_WEIGHTS_DROPPED`](../codes.md#W_WEIGHTS_DROPPED).

<!-- generated:end -->
