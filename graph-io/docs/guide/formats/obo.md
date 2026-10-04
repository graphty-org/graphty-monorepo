# OBO

[OBO](https://owlcollab.github.io/oboformat/doc/obo-syntax.html) is the text format of the
[Gene Ontology](https://geneontology.org/) and the [OBO Foundry](https://obofoundry.org/)
ontologies. Each term is a node, and its `is_a` and `relationship` lines are edges to its parents.

## At a glance

<!-- generated:begin glance:obo -->

|                         |                               |
| ----------------------- | ----------------------------- |
| Import from             | `@graphty/graph-io/obo`       |
| Format name             | `obo`                         |
| Extensions              | `.obo`                        |
| MIME types              | `text/obo`, `application/obo` |
| Reads                   | yes                           |
| Writes                  | yes                           |
| Several graphs per file | no                            |
| Lists its graphs        | no                            |

What a saved file can hold (the [capabilities](./index.md#what-the-capabilities-mean) explain each row):

| Capability                                      | Value |
| ----------------------------------------------- | ----- |
| [`mixedDirection`](./index.md#mixeddirection)   | no    |
| [`multiEdges`](./index.md#multiedges)           | yes   |
| [`selfLoops`](./index.md#selfloops)             | yes   |
| [`edgeIds`](./index.md#edgeids)                 | none  |
| [`idCharset`](./index.md#idcharset)             | any   |
| [`dtypes`](./index.md#dtypes)                   | none  |
| [`components`](./index.md#components)           | no    |
| [`lists`](./index.md#lists)                     | no    |
| [`json`](./index.md#json)                       | no    |
| [`defaults`](./index.md#defaults)               | no    |
| [`options`](./index.md#options)                 | no    |
| [`hierarchy`](./index.md#hierarchy)             | no    |
| [`temporal`](./index.md#temporal)               | none  |
| [`graphAttributes`](./index.md#graphattributes) | no    |
| [`positions`](./index.md#positions)             | no    |
| [`viz`](./index.md#viz)                         | no    |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/obo -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToString, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("vehicles.obo"), { filename: "vehicles.obo" });
for (let i = 0; i < snapshot.nodeCount; i++) {
    console.log(`${String(snapshot.ids.idOf(i))} ${String(snapshot.nodes.value("name", i))}`);
}
for (let e = 0; e < snapshot.edgeCount; e++) {
    const from = snapshot.ids.idOf(snapshot.edgeSource(e));
    const to = snapshot.ids.idOf(snapshot.edgeTarget(e));
    console.log(`${String(from)} ${String(snapshot.edges.value("relation", e))} ${String(to)}`);
}

// Write it back as OBO, or as OBO Graphs JSON
await writeFile("vehicles-copy.obo", await exportGraphToString(snapshot, "obo"));
await writeFile("vehicles.json", await exportGraphToString(snapshot, "json", { dialect: "obographs" }));
```

<!-- generated:end -->

<!-- generated:begin output:formats/obo -->

```text
VEH:0000001 vehicle
VEH:0000002 road vehicle
VEH:0000003 car
VEH:0000004 wheel
VEH:0000002 is_a VEH:0000001
VEH:0000003 is_a VEH:0000002
VEH:0000004 part_of VEH:0000002
```

<!-- generated:end -->

Every edge points from a term to its parent, and the `relation` column says how they are
related. The same graph can be saved as OBO again or as [OBO Graphs JSON](./json.md#obo-graphs-obographs).

## How graph-io reads it

- OBO 1.0, 1.2 and 1.4 are read as one format: real files do not say which they follow. The file
  is streamed line by line.
- `[Term]` and `[Instance]` frames are nodes. `is_a`, `relationship` and `instance_of` lines are
  directed edges from the term to the target, with the relation (`is_a`, `part_of`, ...) in the
  `relation` column and a trailing `{...}` qualifier block in `qualifiers`.
- Every other tag fills the column of its name: `name` (the label), `namespace`, `def`, `synonym`,
  `xref`, `alt_id`, `subset`, `is_obsolete`, `property_value`, and so on. A tag graph-io does not
  know is kept in `obo.unrecognized`.
- `[Typedef]` frames (the relations) are kept in `snapshot.meta.extra.obo.typedefs`, and the header
  in `snapshot.meta.extra.obo.header`. `typedefs: "nodes"` makes typedefs nodes too.
- Frames that share an id are merged.
- A target that no frame declares, typically a term from an imported ontology, becomes a placeholder
  node (with the `graphty.placeholder` column set). `addMissingNodes: false` drops the edge instead.
- Obsolete terms are kept; `obsolete: "drop"` leaves them and their edges out.
- `import` and the treat-xrefs macros in the header are kept but not applied
  (`W_OBO_HEADER_NOT_APPLIED`).

## What a saved file keeps and loses

graph-io writes OBO 1.4. A file read from OBO writes back as the same graph: the header,
typedefs and unknown frames it kept are written back. For a graph from another format:

- Every node becomes a `[Term]` frame (or `[Instance]` / `[Typedef]` from a `type` column), and
  every edge a line in its source's frame.
- An edge without a relation is written as `is_a` (`W_RELATION_ASSUMED`); `relation` chooses
  another. Ontology tools read `is_a` as "is a subclass of".
- Node columns outside the OBO vocabulary become `property_value` lines
  (`W_COLUMN_AS_PROPERTY_VALUE`), and edge columns become qualifiers
  (`W_OBO_EDGE_COLUMN_AS_QUALIFIER`).
- Every edge is directed (`W_OBO_UNDIRECTED_AS_DIRECTED`). Edges read back grouped by their source
  (`W_OBO_EDGE_ORDER`), and identical lines in one frame read back as one
  (`W_OBO_DUPLICATE_CLAUSE`).
- An OBO id cannot be empty or hold whitespace, a control character, `!`, `{` or `}`;
  `sanitizeIds: "mangle"` rewrites such ids and graph-io restores them.
- Edge ids, positions, visual columns and graph attributes are not written.

<!-- generated:begin reference:obo -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option     | Type                    | Default      | Meaning                                                                                                                                                      |
| ---------- | ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `obsolete` | `"keep" \| "drop"`      | `"keep"`     | "keep" reads obsolete terms as nodes with `is_obsolete` set to true; "drop" leaves them and their edges out.                                                 |
| `typedefs` | `"metadata" \| "nodes"` | `"metadata"` | "metadata" keeps the `[Typedef]` frames (relation definitions) in `snapshot.meta.extra.obo.typedefs`; "nodes" makes them nodes too, with their `is_a` edges. |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option     | Type     | Default                      | Meaning                                                                                                                                                                                                                                                                                                                      |
| ---------- | -------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `relation` | `string` | `"is_a"`                     | The relation written for an edge that has none of its own (no `relation` value): an OBO id such as `is_a` or `part_of`. Reasoners and ROBOT read `is_a` as subclassing.                                                                                                                                                      |
| `ontology` | `string` | as read, else the graph name | The `ontology` id written in the header, such as `go` or `uberon`. It may hold letters, digits and `_ . - /`; any other character makes checkExport() and the save throw `E_UNSUPPORTED`. The default is the id an OBO import read, else the graph name with every other character replaced by `_`, else no `ontology` line. |

## Import issue codes

The codes this format's import report can hold, also exported as `OBO_ISSUE` from `@graphty/graph-io/obo`.

| Code                       | Key                   | Severity | Meaning                                                                                                                                                                                               |
| -------------------------- | --------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_INVALID_UTF8`           | `INVALID_UTF8`        | error    | The input is not valid UTF-8. The import stops.                                                                                                                                                       |
| `E_INVALID_ENCODING`       | `INVALID_ENCODING`    | error    | Some bytes are not valid in the encoding that was chosen (by a byte order mark or the `encoding` option). The import stops.                                                                           |
| `W_ENCODING_FALLBACK`      | `ENCODING_FALLBACK`   | warning  | Bytes that are not UTF-8 were read as windows-1252.                                                                                                                                                   |
| `W_UNKNOWN_ENCODING`       | `UNKNOWN_ENCODING`    | warning  | A declared encoding the platform cannot decode was ignored.                                                                                                                                           |
| `E_MISSING_ID`             | `MISSING_ID`          | error    | A frame without an `id` clause; the frame is skipped.                                                                                                                                                 |
| `E_BAD_VALUE`              | `BAD_VALUE`           | error    | A clause whose value cannot be read (a boolean other than true / false, a relationship with one or three values); the clause is skipped.                                                              |
| `W_DUPLICATE_NODE`         | `DUPLICATE_NODE`      | warning  | Two frames have the same id, so they were merged into one node.                                                                                                                                       |
| `W_DUPLICATE_ATTRIBUTE`    | `DUPLICATE_ATTRIBUTE` | warning  | A tag that may appear once per frame appears twice; the first value is kept.                                                                                                                          |
| `W_UNKNOWN_ELEMENT`        | `UNKNOWN_ELEMENT`     | warning  | An unknown tag (kept in `obo.unrecognized`) or frame type (skipped), once per name.                                                                                                                   |
| `W_DANGLING_REFERENCE`     | `DANGLING_REFERENCE`  | warning  | A target no frame declares: a placeholder node was made, or the edge dropped under addMissingNodes false.                                                                                             |
| `W_OBO_SYNTAX`             | `SYNTAX`              | warning  | A line without a colon, an unterminated quote, a def without its xref list, a qualifier block that does not parse, an unescaped brace.                                                                |
| `E_OBO_NOT_OBO`            | `NOT_OBO`             | error    | Nothing in the input looks like OBO: there is no frame header and no header tag. It may be an HTML page, a JSON or GML file, or UTF-16 text without a byte order mark. The import stops.              |
| `W_OBO_FORMAT_VERSION`     | `FORMAT_VERSION`      | warning  | The header has no `format-version` (OBO 1.2 and 1.4 require one), or names a version other than 1.0, 1.2 or 1.4. The file is read accepting the tags of every version.                                |
| `W_OBO_ID_NOT_FIRST`       | `ID_NOT_FIRST`        | warning  | The frame's `id` is not its first clause; it is used anyway.                                                                                                                                          |
| `W_OBO_SYNONYM_SCOPE`      | `SYNONYM_SCOPE`       | warning  | A synonym without a scope in a file that does not say 1.2, or with a scope that is not one of the four.                                                                                               |
| `W_OBO_UNDECLARED`         | `UNDECLARED`          | warning  | A relation, subset or synonym type that nothing declares.                                                                                                                                             |
| `W_OBO_ID_KIND_CLASH`      | `ID_KIND_CLASH`       | warning  | One id for a Term and a Typedef (or an Instance); the Term (the first node frame) is the node.                                                                                                        |
| `W_OBO_CARDINALITY`        | `CARDINALITY`         | warning  | A frame has only one `intersection_of` or `union_of` clause, where OBO needs at least two.                                                                                                            |
| `W_OBO_OBSOLETION`         | `OBSOLETION`          | warning  | An obsolete term with is_a / relationship, or replaced_by / consider on a term that is not obsolete.                                                                                                  |
| `W_OBO_DEPRECATED_TAG`     | `DEPRECATED_TAG`      | warning  | An OBO 1.0 / 1.2 tag read as its 1.4 meaning (exact_synonym, xref_analog, use_term, typeref, version).                                                                                                |
| `W_OBO_DEPRECATED_SYNTAX`  | `DEPRECATED_SYNTAX`   | warning  | A backslash line continuation (deprecated in 1.4).                                                                                                                                                    |
| `W_OBO_HEADER_NOT_APPLIED` | `HEADER_NOT_APPLIED`  | warning  | A header clause whose meaning graph-io does not apply (`import`, `id-mapping`, the `treat-xrefs` macros, `owl-axioms`); it is kept in `snapshot.meta.extra.obo.header`.                               |
| `W_OBO_OBSOLETE_DROPPED`   | `OBSOLETE_DROPPED`    | warning  | Obsolete terms and their edges left out under obsolete: "drop".                                                                                                                                       |
| `W_ID_MERGED`              | `ID_MERGED`           | warning  | Two different id texts became the same number because `ids` is "number" ("042" and "42", say), so their nodes were merged.                                                                            |
| `W_COLUMN_RENAMED`         | `COLUMN_RENAMED`      | warning  | An OBO attribute was renamed `<name>#obo` because another attribute already has its name.                                                                                                             |
| `W_ROLE_TAKEN`             | `ROLE_TAKEN`          | warning  | You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.                                                                   |
| `W_OPTION_IGNORED`         | `OPTION_IGNORED`      | warning  | You set an option this format does not use; it had no effect. The message names the option.                                                                                                           |
| `W_SINK_OPTION`            | `SINK_OPTION`         | warning  | You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies. |

Like every format, it can also record the codes for unreadable input: [`E_EMPTY_INPUT`](../codes.md#E_EMPTY_INPUT), [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED).

## Loss codes

The codes `checkExport(snapshot, "obo", options)` can return before a save, also exported as `OBO_LOSS` from `@graphty/graph-io/obo`. An `E_` code means the save throws unless you change the graph or the options. A save can also return the [shared loss codes](../codes.md#shared-loss-codes) that any format can.

| Code                             | Key                        | Severity            | Meaning                                                                                                                                                                                                                                        |
| -------------------------------- | -------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `W_COLUMN_AS_PROPERTY_VALUE`     | `COLUMN_AS_PROPERTY_VALUE` | warning             | A node column outside the OBO vocabulary (or one whose values a tag cannot carry exactly) reads back inside the `property_value` column.                                                                                                       |
| `W_OBO_EDGE_COLUMN_AS_QUALIFIER` | `EDGE_COLUMN_AS_QUALIFIER` | warning             | An edge column (or the explicit weights) reads back inside the `qualifiers` column.                                                                                                                                                            |
| `W_OBO_UNDIRECTED_AS_DIRECTED`   | `UNDIRECTED_AS_DIRECTED`   | warning             | Every edge is written from its source to its target, so an undirected graph reads back as directed.                                                                                                                                            |
| `W_OBO_DUPLICATE_CLAUSE`         | `DUPLICATE_CLAUSE`         | warning             | Two identical clauses on one frame (parallel edges with one relation and the same qualifiers, a repeated list item) read back as one.                                                                                                          |
| `W_RELATION_ASSUMED`             | `RELATION_ASSUMED`         | warning             | An edge without a relation is written with the `relation` option (default `is_a`).                                                                                                                                                             |
| `W_OBO_RELATION_RENAMED`         | `RELATION_RENAMED`         | warning             | A relation that is not an OBO id (empty, or holding a space, `!`, `{` or `}`) is written with `_` in place of those characters.                                                                                                                |
| `W_OBO_ONTOLOGY_NAME`            | `ONTOLOGY_NAME`            | warning             | The graph name is not an ontology id; the header `ontology` is written with `_` in place of the other characters.                                                                                                                              |
| `W_TYPEDEF_NODES`                | `TYPEDEF_NODES`            | warning             | `[Typedef]` frames read back as nodes only under the importer's `typedefs: "nodes"`; by default they are metadata.                                                                                                                             |
| `W_OBO_EDGE_ORDER`               | `EDGE_ORDER`               | warning             | Edges are written in the frame of their source node, so they read back grouped by source, in node order.                                                                                                                                       |
| `W_GRAPH_COLUMN_AS_METADATA`     | `GRAPH_COLUMN_AS_METADATA` | warning             | A graph attribute is written as a header `property_value` and reads back in `snapshot.meta.extra.obo.header`, not as a graph attribute.                                                                                                        |
| `W_OBO_LINE_END`                 | `LINE_END`                 | warning             | A carriage return or form feed in a text cannot be written; it is written as a line feed.                                                                                                                                                      |
| `W_NODE_ORDER`                   | `NODE_ORDER`               | warning             | The nodes read back in a different order.                                                                                                                                                                                                      |
| `W_MUTUAL_EXPANDED`              | `MUTUAL_EXPANDED`          | warning             | A mutual pair is written as two clauses without its mark.                                                                                                                                                                                      |
| `W_MIXED_DIRECTION`              | `MIXED_DIRECTION`          | warning             | The undirected edges of a mixed graph are written the way `onMixedDirection` chose ("directed" or "undirected").                                                                                                                               |
| `E_MIXED_DIRECTION`              | `MIXED_DIRECTION_ERROR`    | error (save throws) | The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a format that holds one direction per file fails with `E_DIRECTED`. Pass "directed" or "undirected" to read or write it anyway. |
| `W_EDGE_IDS_DROPPED`             | `EDGE_IDS_DROPPED`         | warning             | OBO has no edge ids.                                                                                                                                                                                                                           |
| `W_POSITIONS_DROPPED`            | `POSITIONS_DROPPED`        | warning             | OBO has no positions.                                                                                                                                                                                                                          |
| `W_HIERARCHY_DROPPED`            | `HIERARCHY_DROPPED`        | warning             | OBO has no containment.                                                                                                                                                                                                                        |
| `W_TEMPORAL_DROPPED`             | `TEMPORAL_DROPPED`         | warning             | OBO has no time.                                                                                                                                                                                                                               |
| `W_VIZ_DROPPED`                  | `VIZ_DROPPED`              | warning             | OBO has no visual columns.                                                                                                                                                                                                                     |
| `W_ROLE_DROPPED`                 | `ROLE_DROPPED`             | warning             | An attribute with a role the format has no place for is written as a plain attribute; the role is lost.                                                                                                                                        |
| `W_ROLE_ASSUMED`                 | `ROLE_ASSUMED`             | warning             | An attribute without a role is written where the format keeps a role (a `name` column as the label, say), and reads back with that role.                                                                                                       |
| `W_COLUMN_NAME_CHANGED`          | `COLUMN_NAME_CHANGED`      | warning             | An attribute with a role (the label, say) is written where the format keeps that role, and reads back under the name the format's importer gives it.                                                                                           |
| `W_DTYPE_UNSUPPORTED`            | `DTYPE_UNSUPPORTED`        | warning             | An OBO attribute stored as text where graph-io uses a dictionary (or the other way round); it reads back with graph-io's usual type. The values are the same.                                                                                  |
| `W_EMPTY_COLUMN_DROPPED`         | `EMPTY_COLUMN_DROPPED`     | warning             | A column without a value on any written element reads back absent.                                                                                                                                                                             |
| `W_DEFAULT_DROPPED`              | `DEFAULT_DROPPED`          | warning             | A declared default: OBO has none.                                                                                                                                                                                                              |
| `W_OPTIONS_DROPPED`              | `OPTIONS_DROPPED`          | warning             | Declared options: OBO has no enumerations.                                                                                                                                                                                                     |
| `W_EXTENSION_TABLE_DROPPED`      | `EXTENSION_TABLE_DROPPED`  | warning             | An extension table OBO cannot carry.                                                                                                                                                                                                           |
| `E_ID_CHARSET`                   | `ID_CHARSET`               | error (save throws) | Node ids the format cannot write, under `sanitizeIds: "error"`; the save fails with `E_INVALID_ID`. Pass `sanitizeIds: "mangle"` to rewrite them.                                                                                              |
| `W_ID_MANGLED`                   | `ID_MANGLED`               | warning             | Node ids OBO cannot write as they are, under sanitizeIds "mangle": rewritten, the original kept.                                                                                                                                               |
| `W_ID_TEXT_TYPE`                 | `ID_TEXT_TYPE`             | warning             | Numeric ids are written as text and read back as strings.                                                                                                                                                                                      |
| `E_ID_TEXT_COLLISION`            | `ID_TEXT_COLLISION`        | error (save throws) | Two node ids would be written as the same text (the number 5 and the text "5"); the save fails with `E_INVALID_ID`.                                                                                                                            |

<!-- generated:end -->
