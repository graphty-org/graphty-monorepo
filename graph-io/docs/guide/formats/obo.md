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
- An edge's relation comes from its `relation` column. An edge without one is written as `is_a`
  (`W_RELATION_ASSUMED`); the `relation` option chooses another value for all of them. Ontology
  tools read `is_a` as "is a subclass of". A graph from Cytoscape (CX, CX2, XGMML, a session) keeps
  the relation in an `interaction` column: rename it before saving with
  `snapshot.edges.rename("interaction", "relation")` (on a copy from `snapshot.withColumns()` when
  other code holds the snapshot). `checkExport()` then returns `W_ROLE_ASSUMED` for `relation`: the
  renamed column carries no mark that it holds relations, so graph-io takes it as the relation
  because of its name, writes each value as the line's relation, and reads it back as the relation
  column. Nothing is lost; the note tells you a column was used for its name. Spaces in a relation
  are written as `_` (`W_OBO_RELATION_RENAMED`).
- Every relation the file uses, other than the built-in `is_a`, gets a `[Typedef]` frame that
  declares it, so `relation: "interacts_with"` writes `relationship: interacts_with X` lines and a
  `[Typedef]` with `id: interacts_with`. A relation the graph's kept typedefs already declare keeps
  that frame, with its name and other tags.
- The `relation` column is marked as the edge kind. Formats with an edge kind keep it: GEXF 1.3
  writes it as each edge's `kind`, which reads back as a column named `kind` that an OBO save takes
  as the relation again. GEXF 1.2 has no edge kind; see [GEXF](./gexf.md#what-a-saved-file-keeps-and-loses).
- The ontology name in the header is the `ontology` option, else the name the graph was read with
  (see [Naming the graph](../reading.md#naming-the-graph)).
- Node columns outside the OBO vocabulary become `property_value` lines
  (`W_COLUMN_AS_PROPERTY_VALUE`), and edge columns become qualifiers
  (`W_OBO_EDGE_COLUMN_AS_QUALIFIER`).
- Every edge is directed (`W_OBO_UNDIRECTED_AS_DIRECTED`). Edges read back grouped by their source
  (`W_OBO_EDGE_ORDER`), and identical lines in one frame read back as one
  (`W_OBO_DUPLICATE_CLAUSE`).
- An OBO id cannot be empty or hold whitespace, a control character, `!`, `{` or `}`;
  `sanitizeIds: "mangle"` rewrites such ids and graph-io restores them.
- Edge ids, positions, visual columns and graph attributes are not written.

<!-- generated:begin capabilities:obo -->

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

<!-- generated:begin reference:obo -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option                         | Type                    | Default      |
| ------------------------------ | ----------------------- | ------------ |
| [`obsolete`](#import-obsolete) | `"keep" \| "drop"`      | `"keep"`     |
| [`typedefs`](#import-typedefs) | `"metadata" \| "nodes"` | `"metadata"` |

- <a id="import-obsolete"></a>`obsolete`: "keep" reads obsolete terms as nodes with `is_obsolete` set to true; "drop" leaves them and their edges out.
- <a id="import-typedefs"></a>`typedefs`: "metadata" keeps the `[Typedef]` frames (relation definitions) in `snapshot.meta.extra.obo.typedefs`; "nodes" makes them nodes too, with their `is_a` edges.

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option                         | Type     | Default                      |
| ------------------------------ | -------- | ---------------------------- |
| [`relation`](#export-relation) | `string` | `"is_a"`                     |
| [`ontology`](#export-ontology) | `string` | as read, else the graph name |

- <a id="export-relation"></a>`relation`: The relation written for an edge that has none of its own (no `relation` value): an OBO id such as `is_a` or `part_of`. Reasoners and ROBOT read `is_a` as subclassing.
- <a id="export-ontology"></a>`ontology`: The `ontology` id written in the header, such as `go` or `uberon`. It may hold letters, digits and `_ . - /`; any other character makes checkExport() and the save throw `E_UNSUPPORTED`. The default is the id an OBO import read, else the graph name with every other character replaced by `_`, else no `ontology` line.

## Import issue codes

The codes this format's import report can hold. They are also exported as `OBO_ISSUE` from `@graphty/graph-io/obo`, keyed by the code without its `E_` / `W_` and `OBO_` prefixes.

- `E_EMPTY_INPUT` (error): The input is empty or whitespace. The import stops.
- `E_INVALID_UTF8` (error): The input is not valid UTF-8. The import stops.
- `E_INVALID_ENCODING` (error): Some bytes are not valid in the encoding that was chosen (by a byte order mark or the `encoding` option). The import stops.
- `W_ENCODING_FALLBACK` (warning): Bytes that are not UTF-8 were read as windows-1252.
- `W_UNKNOWN_ENCODING` (warning): A declared encoding the platform cannot decode was ignored.
- `E_MISSING_ID` (error): A frame without an `id` clause; the frame is skipped.
- `E_BAD_VALUE` (error): A clause whose value cannot be read (a boolean other than true / false, a relationship with one or three values); the clause is skipped.
- `W_DUPLICATE_NODE` (warning): Two frames have the same id, so they were merged into one node.
- `W_DUPLICATE_ATTRIBUTE` (warning): A tag that may appear once per frame appears twice; the first value is kept.
- `W_UNKNOWN_ELEMENT` (warning): An unknown tag (kept in `obo.unrecognized`) or frame type (skipped), once per name.
- `W_DANGLING_REFERENCE` (warning): A target no frame declares: a placeholder node was made, or the edge dropped under addMissingNodes false.
- `W_OBO_SYNTAX` (warning): A line without a colon, an unterminated quote, a def without its xref list, a qualifier block that does not parse, an unescaped brace.
- `E_OBO_NOT_OBO` (error): Nothing in the input looks like OBO: there is no frame header and no header tag. It may be an HTML page, a JSON or GML file, or UTF-16 text without a byte order mark. The import stops.
- `W_OBO_FORMAT_VERSION` (warning): The header has no `format-version` (OBO 1.2 and 1.4 require one), or names a version other than 1.0, 1.2 or 1.4. The file is read accepting the tags of every version.
- `W_OBO_ID_NOT_FIRST` (warning): The frame's `id` is not its first clause; it is used anyway.
- `W_OBO_SYNONYM_SCOPE` (warning): A synonym without a scope in a file that does not say 1.2, or with a scope that is not one of the four.
- `W_OBO_UNDECLARED` (warning): A relation, subset or synonym type that nothing declares.
- `W_OBO_ID_KIND_CLASH` (warning): One id for a Term and a Typedef (or an Instance); the Term (the first node frame) is the node.
- `W_OBO_CARDINALITY` (warning): A frame has only one `intersection_of` or `union_of` clause, where OBO needs at least two.
- `W_OBO_OBSOLETION` (warning): An obsolete term with is_a / relationship, or replaced_by / consider on a term that is not obsolete.
- `W_OBO_DEPRECATED_TAG` (warning): An OBO 1.0 / 1.2 tag read as its 1.4 meaning (exact_synonym, xref_analog, use_term, typeref, version).
- `W_OBO_DEPRECATED_SYNTAX` (warning): A backslash line continuation (deprecated in 1.4).
- `W_OBO_HEADER_NOT_APPLIED` (warning): A header clause whose meaning graph-io does not apply (`import`, `id-mapping`, the `treat-xrefs` macros, `owl-axioms`); it is kept in `snapshot.meta.extra.obo.header`.
- `W_OBO_OBSOLETE_DROPPED` (warning): Obsolete terms and their edges left out under obsolete: "drop".
- `W_ID_MERGED` (warning): Two different id texts became the same number because `ids` is "number" (for example, "042" and "42"), so their nodes were merged.
- `W_COLUMN_RENAMED` (warning): An OBO attribute was renamed `<name>#obo` because another attribute already has its name.
- `W_ROLE_TAKEN` (warning): You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as a plain attribute.
- `W_OPTION_IGNORED` (warning): You set an option this format does not use; it had no effect. The message names the option.
- `W_SINK_OPTION` (warning): You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`, `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.

Like every format, it can also record the codes for unreadable input and for elements the graph refuses: [`E_TOO_LARGE`](../codes.md#E_TOO_LARGE), [`W_ENCODING_CONFLICT`](../codes.md#W_ENCODING_CONFLICT), [`W_CONTROL_CHARACTER`](../codes.md#W_CONTROL_CHARACTER), [`E_FOREIGN_FORMAT`](../codes.md#E_FOREIGN_FORMAT), [`W_ISSUES_SUPPRESSED`](../codes.md#W_ISSUES_SUPPRESSED), [`E_INVALID_ID`](../codes.md#E_INVALID_ID), [`E_UNKNOWN_NODE`](../codes.md#E_UNKNOWN_NODE), [`E_INVALID_WEIGHT`](../codes.md#E_INVALID_WEIGHT), [`E_DUPLICATE_EDGE`](../codes.md#E_DUPLICATE_EDGE), [`E_SELF_LOOP`](../codes.md#E_SELF_LOOP), [`E_DUPLICATE_EDGE_ID`](../codes.md#E_DUPLICATE_EDGE_ID).

## Loss codes

The codes `checkExport(snapshot, "obo", options)` can return before a save, also exported as `OBO_LOSS` from `@graphty/graph-io/obo`. An `E_` code means the save throws unless you change the graph or the options.

- `W_COLUMN_AS_PROPERTY_VALUE` (warning): A node column outside the OBO vocabulary (or one whose values a tag cannot carry exactly) reads back inside the `property_value` column.
- `W_OBO_EDGE_COLUMN_AS_QUALIFIER` (warning): An edge column (or the explicit weights) reads back inside the `qualifiers` column.
- `W_OBO_UNDIRECTED_AS_DIRECTED` (warning): Every edge is written from its source to its target, so an undirected graph reads back as directed.
- `W_OBO_DUPLICATE_CLAUSE` (warning): Two identical clauses on one frame (parallel edges with one relation and the same qualifiers, a repeated list item) read back as one.
- `W_RELATION_ASSUMED` (warning): An edge without a relation is written with the `relation` option (default `is_a`).
- `W_OBO_RELATION_RENAMED` (warning): A relation that is not an OBO id (empty, or holding a space, `!`, `{` or `}`) is written with `_` in place of those characters.
- `W_OBO_ONTOLOGY_NAME` (warning): The graph name is not an ontology id; the header `ontology` is written with `_` in place of the other characters.
- `W_TYPEDEF_NODES` (warning): `[Typedef]` frames read back as nodes only under the importer's `typedefs: "nodes"`; by default they are metadata.
- `W_OBO_EDGE_ORDER` (warning): Edges are written in the frame of their source node, so they read back grouped by source, in node order.
- `W_GRAPH_COLUMN_AS_METADATA` (warning): A graph attribute is written as a header `property_value` and reads back in `snapshot.meta.extra.obo.header`, not as a graph attribute.
- `W_OBO_LINE_END` (warning): A carriage return or form feed in a text cannot be written; it is written as a line feed.
- `W_NODE_ORDER` (warning): The nodes read back in a different order.
- `W_MUTUAL_EXPANDED` (warning): A mutual pair is written as two clauses without its mark.
- `W_MIXED_DIRECTION` (warning): The undirected edges of a mixed graph are written the way `onMixedDirection` chose ("directed" or "undirected").
- `E_MIXED_DIRECTION` (error, the save throws): The graph has both directed and undirected edges and `onMixedDirection` is "error". An import stops; a save to a format that holds one direction per file fails with `E_DIRECTED`. Pass "directed" or "undirected" to read or write it anyway.
- `W_EDGE_IDS_DROPPED` (warning): OBO has no edge ids.
- `W_POSITIONS_DROPPED` (warning): OBO has no positions.
- `W_HIERARCHY_DROPPED` (warning): OBO has no containment.
- `W_TEMPORAL_DROPPED` (warning): OBO has no time.
- `W_VIZ_DROPPED` (warning): OBO has no visual columns.
- `W_ROLE_DROPPED` (warning): An attribute with a role the format has no place for is written as a plain attribute; the role is lost.
- `W_ROLE_ASSUMED` (warning): An attribute without a role is written where the format keeps a role (for example, a `name` column as the label), and reads back with that role.
- `W_COLUMN_NAME_CHANGED` (warning): An attribute with a role (for example, the label) is written where the format keeps that role, and reads back under the name the format's importer gives it.
- `W_DTYPE_UNSUPPORTED` (warning): An OBO attribute stored as text where graph-io uses a dictionary (or the other way round); it reads back with graph-io's usual type. The values are the same.
- `W_EMPTY_COLUMN_DROPPED` (warning): A column without a value on any written element reads back absent.
- `W_DEFAULT_DROPPED` (warning): A declared default: OBO has none.
- `W_OPTIONS_DROPPED` (warning): Declared options: OBO has no enumerations.
- `W_EXTENSION_TABLE_DROPPED` (warning): An extension table OBO cannot carry.
- `E_ID_CHARSET` (error, the save throws): Node ids the format cannot write, under `sanitizeIds: "error"`; the save fails with `E_INVALID_ID`. Pass `sanitizeIds: "mangle"` to rewrite them.
- `W_ID_MANGLED` (warning): Node ids OBO cannot write as they are, under sanitizeIds "mangle": rewritten, the original kept.
- `W_ID_TEXT_TYPE` (warning): Numeric ids are written as text and read back as strings.
- `E_ID_TEXT_COLLISION` (error, the save throws): Two node ids would be written as the same text (the number 5 and the text "5"); the save fails with `E_INVALID_ID`.

When the graph has something this format cannot hold, it can also return the [shared loss codes](../codes.md#shared-loss-codes): [`E_XML_ILLEGAL_CHAR`](../codes.md#E_XML_ILLEGAL_CHAR), [`W_COLUMN_DROPPED`](../codes.md#W_COLUMN_DROPPED), [`W_COMPONENTS_FLATTENED`](../codes.md#W_COMPONENTS_FLATTENED), [`W_DYNAMIC_VALUES_DROPPED`](../codes.md#W_DYNAMIC_VALUES_DROPPED), [`W_EDGE_IDS_GENERATED`](../codes.md#W_EDGE_IDS_GENERATED), [`W_GRAPH_ATTRIBUTES_DROPPED`](../codes.md#W_GRAPH_ATTRIBUTES_DROPPED), [`W_ID_RENUMBERED`](../codes.md#W_ID_RENUMBERED), [`W_INTEGRAL_F64_AS_I32`](../codes.md#W_INTEGRAL_F64_AS_I32), [`W_JSON_UNSUPPORTED`](../codes.md#W_JSON_UNSUPPORTED), [`W_LIST_UNSUPPORTED`](../codes.md#W_LIST_UNSUPPORTED), [`W_MULTI_EDGES`](../codes.md#W_MULTI_EDGES), [`W_MUTUAL_AS_UNDIRECTED`](../codes.md#W_MUTUAL_AS_UNDIRECTED), [`W_NONFINITE_AS_NULL`](../codes.md#W_NONFINITE_AS_NULL), [`W_OPEN_INTERVAL`](../codes.md#W_OPEN_INTERVAL), [`W_OPTIONS_GAINED`](../codes.md#W_OPTIONS_GAINED), [`W_PARENTS_DROPPED`](../codes.md#W_PARENTS_DROPPED), [`W_SELF_LOOPS`](../codes.md#W_SELF_LOOPS), [`W_SPELLS_DROPPED`](../codes.md#W_SPELLS_DROPPED), [`W_STORAGE_CLASS_CHANGED`](../codes.md#W_STORAGE_CLASS_CHANGED), [`W_TEMPORAL_TEXT_DROPPED`](../codes.md#W_TEMPORAL_TEXT_DROPPED), [`W_TEXT_INFERRED`](../codes.md#W_TEXT_INFERRED), [`W_WEIGHTS_DROPPED`](../codes.md#W_WEIGHTS_DROPPED), [`W_WEIGHT_KEY_CLASH`](../codes.md#W_WEIGHT_KEY_CLASH).

<!-- generated:end -->
