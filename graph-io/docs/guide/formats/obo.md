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

What a saved file can hold:

| Capability        | Value | Meaning                                                                                                                            |
| ----------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `mixedDirection`  | no    | Directed and undirected edges in one file.                                                                                         |
| `multiEdges`      | yes   | Parallel edges.                                                                                                                    |
| `selfLoops`       | yes   | Self-loops.                                                                                                                        |
| `edgeIds`         | none  | Edge ids: "required" (generated when the graph has none), "optional", or "none" (not stored).                                      |
| `idCharset`       | any   | Which node ids are written unchanged: "any", "nmtoken" (XML name tokens), "integer", or "dense-1-based" (1 to N).                  |
| `dtypes`          |       | The column types the format keeps exactly.                                                                                         |
| `components`      | no    | Columns with several numbers per row, such as a position.                                                                          |
| `lists`           | no    | List columns.                                                                                                                      |
| `json`            | no    | Nested JSON values.                                                                                                                |
| `defaults`        | no    | Columns' declared default values.                                                                                                  |
| `options`         | no    | Declared lists of allowed values (GEXF options).                                                                                   |
| `hierarchy`       | no    | Nesting: nodes inside other nodes (parent columns).                                                                                |
| `temporal`        | none  | Time: "none", "intervals", "spells" (several intervals per element), or "dynamic-values" (attribute values that change over time). |
| `graphAttributes` | no    | Graph-level attributes.                                                                                                            |
| `positions`       | no    | Node positions.                                                                                                                    |
| `viz`             | no    | Visual columns: color, size, shape and thickness.                                                                                  |

<!-- generated:end -->

## Loading and saving

<!-- generated:begin example:formats/obo -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToString, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("basic.obo"), { filename: "basic.obo" });
for (let i = 0; i < snapshot.nodeCount; i++) {
    console.log(`${String(snapshot.ids.idOf(i))} ${String(snapshot.nodes.value("name", i))}`);
}
for (let e = 0; e < snapshot.edgeCount; e++) {
    const from = snapshot.ids.idOf(snapshot.edgeSource(e));
    const to = snapshot.ids.idOf(snapshot.edgeTarget(e));
    console.log(`${String(from)} ${String(snapshot.edges.value("relation", e))} ${String(to)}`);
}

// Write it back as OBO, or as OBO Graphs JSON
await writeFile("basic-copy.obo", await exportGraphToString(snapshot, "obo"));
await writeFile("basic.json", await exportGraphToString(snapshot, "json", { dialect: "obographs" }));
```

<!-- generated:end -->

<!-- generated:begin output:formats/obo -->

```text
UBERON:0002398 manus
UBERON:0002470 autopod region
UBERON:0002102 forelimb
UBERON:0002101 limb
UBERON:0002398 is_a UBERON:0002470
UBERON:0002398 part_of UBERON:0002102
UBERON:0002470 part_of UBERON:0002101
UBERON:0002102 is_a UBERON:0002101
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

| Option     | Type                    | Default      | Meaning                                                                                                                         |
| ---------- | ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `obsolete` | `"keep" \| "drop"`      | `"keep"`     | "keep" (default): obsolete terms are nodes with `is_obsolete` true; "drop": they and their edges are left out.                  |
| `typedefs` | `"metadata" \| "nodes"` | `"metadata"` | "metadata" (default): `[Typedef]` frames go to `meta.extra.obo.typedefs`; "nodes": they are nodes too, with their `is_a` edges. |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option     | Type     | Default | Meaning                                                                                                                                                                            |
| ---------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `relation` | `string` |         | The relation written for an edge that has none (no `relation` value): an OBO id such as `is_a` (the default) or `part_of`. Reasoners and ROBOT read `is_a` as subclassing.         |
| `ontology` | `string` |         | The header `ontology` id (`go`, `uberon`): default the id the file was read with, else the graph name with every character outside `A-Z a-z 0-9 _ . -` replaced by `_`, else none. |

## Import issue codes

The codes this format's import report can hold, also exported as `OBO_ISSUE` from `@graphty/graph-io/obo`.

| Code                       | Key                   | Severity | Meaning                                                                                                                                  |
| -------------------------- | --------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `E_EMPTY_INPUT`            | `EMPTY_INPUT`         | error    | The input is empty or whitespace (fatal).                                                                                                |
| `E_TOO_LARGE`              | `TOO_LARGE`           | error    | The input is longer than one JavaScript string, or holds a line that is (fatal).                                                         |
| `W_ENCODING_CONFLICT`      | `ENCODING_CONFLICT`   | warning  | A byte order mark, the encoding option and the declared encoding disagree.                                                               |
| `W_CONTROL_CHARACTER`      | `CONTROL_CHARACTER`   | warning  | A control character or a stray U+FEFF in the text, or an ignored trailing Ctrl-Z.                                                        |
| `E_FOREIGN_FORMAT`         | `FOREIGN_FORMAT`      | error    | The input is an HTML page, a PDF, compressed or archived data or an image (fatal).                                                       |
| `W_ISSUES_SUPPRESSED`      | `ISSUES_SUPPRESSED`   | warning  | Warnings of one code beyond the number a report keeps, counted in one warning.                                                           |
| `E_INVALID_UTF8`           | `INVALID_UTF8`        | error    | The input holds invalid UTF-8 (fatal).                                                                                                   |
| `E_INVALID_ENCODING`       | `INVALID_ENCODING`    | error    | Invalid bytes in the encoding a BOM or the encoding option chose (fatal).                                                                |
| `W_ENCODING_FALLBACK`      | `ENCODING_FALLBACK`   | warning  | Bytes that are not UTF-8 were read as windows-1252.                                                                                      |
| `W_UNKNOWN_ENCODING`       | `UNKNOWN_ENCODING`    | warning  | A declared encoding the platform cannot decode was ignored.                                                                              |
| `E_MISSING_ID`             | `MISSING_ID`          | error    | A frame without an `id` clause; the frame is skipped.                                                                                    |
| `E_BAD_VALUE`              | `BAD_VALUE`           | error    | A clause whose value cannot be read (a boolean other than true / false, a relationship with one or three values); the clause is skipped. |
| `W_DUPLICATE_NODE`         | `DUPLICATE_NODE`      | warning  | Two frames with one id were merged (spec 4.1.1).                                                                                         |
| `W_DUPLICATE_ATTRIBUTE`    | `DUPLICATE_ATTRIBUTE` | warning  | A single-valued tag given twice for one id (a cardinality violation); the first is kept.                                                 |
| `W_UNKNOWN_ELEMENT`        | `UNKNOWN_ELEMENT`     | warning  | An unknown tag (kept in `obo.unrecognized`) or frame type (skipped), once per name.                                                      |
| `W_DANGLING_REFERENCE`     | `DANGLING_REFERENCE`  | warning  | A target no frame declares: a placeholder node was made, or the edge dropped under addMissingNodes false.                                |
| `W_OBO_SYNTAX`             | `SYNTAX`              | warning  | A line without a colon, an unterminated quote, a def without its xref list, a qualifier block that does not parse, an unescaped brace.   |
| `E_OBO_NOT_OBO`            | `NOT_OBO`             | error    | Nothing in the input is OBO: no frame header and no valid header tag (fatal; an HTML page, a JSON or GML file, UTF-16 without a BOM).    |
| `W_OBO_FORMAT_VERSION`     | `FORMAT_VERSION`      | warning  | The header has no format-version (required by 1.2 and 1.4), or one that is not 1.0, 1.2 or 1.4; the file is read as the union.           |
| `W_OBO_ID_NOT_FIRST`       | `ID_NOT_FIRST`        | warning  | The frame's `id` is not its first clause; it is used anyway.                                                                             |
| `W_OBO_SYNONYM_SCOPE`      | `SYNONYM_SCOPE`       | warning  | A synonym without a scope in a file that does not say 1.2, or with a scope that is not one of the four.                                  |
| `W_OBO_UNDECLARED`         | `UNDECLARED`          | warning  | A relation, subset or synonym type that nothing declares.                                                                                |
| `W_OBO_ID_KIND_CLASH`      | `ID_KIND_CLASH`       | warning  | One id for a Term and a Typedef (or an Instance); the Term (the first node frame) is the node.                                           |
| `W_OBO_CARDINALITY`        | `CARDINALITY`         | warning  | Fewer than two `intersection_of` or `union_of` clauses on a frame.                                                                       |
| `W_OBO_OBSOLETION`         | `OBSOLETION`          | warning  | An obsolete term with is_a / relationship, or replaced_by / consider on a term that is not obsolete.                                     |
| `W_OBO_DEPRECATED_TAG`     | `DEPRECATED_TAG`      | warning  | An OBO 1.0 / 1.2 tag read as its 1.4 meaning (exact_synonym, xref_analog, use_term, typeref, version).                                   |
| `W_OBO_DEPRECATED_SYNTAX`  | `DEPRECATED_SYNTAX`   | warning  | A backslash line continuation (deprecated in 1.4).                                                                                       |
| `W_OBO_HEADER_NOT_APPLIED` | `HEADER_NOT_APPLIED`  | warning  | A header clause kept in `meta.extra.obo.header` whose meaning is not applied (import, id-mapping, the treat-xrefs macros, owl-axioms).   |
| `W_OBO_OBSOLETE_DROPPED`   | `OBSOLETE_DROPPED`    | warning  | Obsolete terms and their edges left out under obsolete: "drop".                                                                          |
| `W_ID_MERGED`              | `ID_MERGED`           | warning  | Two distinct id texts became one number under ids "number".                                                                              |
| `W_COLUMN_RENAMED`         | `COLUMN_RENAMED`      | warning  | A vocabulary column renamed `<name>#obo` because the sink already holds the name.                                                        |
| `W_ROLE_TAKEN`             | `ROLE_TAKEN`          | warning  | A vocabulary column declared without its role because the sink already holds it.                                                         |
| `W_OPTION_IGNORED`         | `OPTION_IGNORED`      | warning  | A common option the format has no use for (defaultDirected, weightFrom, nodeIdFrom, ...).                                                |
| `W_SINK_OPTION`            | `SINK_OPTION`         | warning  | A builder-policy option the caller passed that the caller's sink does not use.                                                           |

## Loss codes

The codes `check()` can return before a save, also exported as `OBO_LOSS` from `@graphty/graph-io/obo`. An `E_` code means the save throws unless you change the graph or the options.

| Code                             | Key                        | Severity            | Meaning                                                                                                                                  |
| -------------------------------- | -------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `W_COLUMN_AS_PROPERTY_VALUE`     | `COLUMN_AS_PROPERTY_VALUE` | warning             | A node column outside the OBO vocabulary (or one whose values a tag cannot carry exactly) reads back inside the `property_value` column. |
| `W_OBO_EDGE_COLUMN_AS_QUALIFIER` | `EDGE_COLUMN_AS_QUALIFIER` | warning             | An edge column (or the explicit weights) reads back inside the `qualifiers` column.                                                      |
| `W_OBO_UNDIRECTED_AS_DIRECTED`   | `UNDIRECTED_AS_DIRECTED`   | warning             | Every edge is written from its source to its target: an undirected snapshot reads back directed.                                         |
| `W_OBO_DUPLICATE_CLAUSE`         | `DUPLICATE_CLAUSE`         | warning             | Two identical clauses on one frame (parallel edges with one relation and the same qualifiers, a repeated list item) read back as one.    |
| `W_RELATION_ASSUMED`             | `RELATION_ASSUMED`         | warning             | An edge without a relation is written with the `relation` option (default `is_a`).                                                       |
| `W_OBO_RELATION_RENAMED`         | `RELATION_RENAMED`         | warning             | A relation that is not an OBO id (empty, or holding a space, `!`, `{` or `}`) is written with `_` in place of those characters.          |
| `W_OBO_ONTOLOGY_NAME`            | `ONTOLOGY_NAME`            | warning             | The graph name is not an ontology id; the header `ontology` is written with `_` in place of the other characters.                        |
| `W_TYPEDEF_NODES`                | `TYPEDEF_NODES`            | warning             | `[Typedef]` frames read back as nodes only under the importer's `typedefs: "nodes"`; by default they are metadata.                       |
| `W_OBO_EDGE_ORDER`               | `EDGE_ORDER`               | warning             | Edges are written on their source's frame, so a re-import lists them grouped by source, in node order.                                   |
| `W_GRAPH_COLUMN_AS_METADATA`     | `GRAPH_COLUMN_AS_METADATA` | warning             | A graph column is written as a header `property_value` and reads back in `meta.extra.obo.header`, not as a column.                       |
| `W_OBO_LINE_END`                 | `LINE_END`                 | warning             | A carriage return or form feed in a text cannot be written; it is written as a line feed.                                                |
| `W_NODE_ORDER`                   | `NODE_ORDER`               | warning             | Placeholder nodes read back after every written node, in the order the edges first name them.                                            |
| `W_MUTUAL_EXPANDED`              | `MUTUAL_EXPANDED`          | warning             | A mutual pair is written as two clauses without its mark.                                                                                |
| `W_MIXED_DIRECTION`              | `MIXED_DIRECTION`          | warning             | Undirected edges of a directed snapshot under onMixedDirection "directed" / "undirected".                                                |
| `E_MIXED_DIRECTION`              | `MIXED_DIRECTION_ERROR`    | error (save throws) | Undirected edges of a directed snapshot under onMixedDirection "error": export() throws E_DIRECTED.                                      |
| `W_EDGE_IDS_DROPPED`             | `EDGE_IDS_DROPPED`         | warning             | OBO has no edge ids.                                                                                                                     |
| `W_POSITIONS_DROPPED`            | `POSITIONS_DROPPED`        | warning             | OBO has no positions.                                                                                                                    |
| `W_HIERARCHY_DROPPED`            | `HIERARCHY_DROPPED`        | warning             | OBO has no containment.                                                                                                                  |
| `W_TEMPORAL_DROPPED`             | `TEMPORAL_DROPPED`         | warning             | OBO has no time.                                                                                                                         |
| `W_VIZ_DROPPED`                  | `VIZ_DROPPED`              | warning             | OBO has no visual columns.                                                                                                               |
| `W_ROLE_DROPPED`                 | `ROLE_DROPPED`             | warning             | A role column without an OBO slot is written as a property value or qualifier; the role is lost.                                         |
| `W_ROLE_ASSUMED`                 | `ROLE_ASSUMED`             | warning             | A role-less `name` (nodes) or `relation` (edges) column is written into that slot and reads back with the role.                          |
| `W_COLUMN_NAME_CHANGED`          | `COLUMN_NAME_CHANGED`      | warning             | The label column reads back as `name`, the edge kind column as `relation`.                                                               |
| `W_DTYPE_UNSUPPORTED`            | `DTYPE_UNSUPPORTED`        | warning             | A vocabulary column of the other text dtype (string for dict, dict for string) reads back as the vocabulary's.                           |
| `W_EMPTY_COLUMN_DROPPED`         | `EMPTY_COLUMN_DROPPED`     | warning             | A column without a value on any written element reads back absent.                                                                       |
| `W_DEFAULT_DROPPED`              | `DEFAULT_DROPPED`          | warning             | A declared default: OBO has none.                                                                                                        |
| `W_OPTIONS_DROPPED`              | `OPTIONS_DROPPED`          | warning             | Declared options: OBO has no enumerations.                                                                                               |
| `W_EXTENSION_TABLE_DROPPED`      | `EXTENSION_TABLE_DROPPED`  | warning             | An extension table OBO cannot carry.                                                                                                     |
| `E_ID_CHARSET`                   | `ID_CHARSET`               | error (save throws) | Node ids OBO cannot write as they are, under the default sanitizeIds "error": export() throws E_INVALID_ID.                              |
| `W_ID_MANGLED`                   | `ID_MANGLED`               | warning             | Node ids OBO cannot write as they are, under sanitizeIds "mangle": rewritten, the original kept.                                         |
| `W_ID_TEXT_TYPE`                 | `ID_TEXT_TYPE`             | warning             | Numeric ids are written as text and read back as strings.                                                                                |
| `E_ID_TEXT_COLLISION`            | `ID_TEXT_COLLISION`        | error (save throws) | Two ids have the same text (5 and "5"); export() throws E_INVALID_ID.                                                                    |

<!-- generated:end -->
