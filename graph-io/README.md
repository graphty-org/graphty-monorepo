# @graphty/graph-io

[![CI](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/graphty-org/graphty-monorepo/badge.svg?branch=master)](https://coveralls.io/github/graphty-org/graphty-monorepo?branch=master)
[![npm version](https://img.shields.io/npm/v/@graphty/graph-io.svg)](https://www.npmjs.com/package/@graphty/graph-io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Importers and exporters for the [@graphty/graph-format](https://www.npmjs.com/package/@graphty/graph-format)
snapshot: GEXF, GraphML, GML, DOT (Graphviz), Pajek NET, CSV / TSV, JSON (NetworkX node-link, d3,
JSON Graph Format, Cytoscape, graphology, vis.js; NetworkX adjacency_data and tree_data and OBO
Graphs are read only), Neo4j (`neo4j-admin import` CSV), CX2 (the NDEx / Cytoscape exchange format;
its version 1, CX, is read only) and OBO, the ontology format of the Gene Ontology (read only).

Every importer streams its input into a `GraphSink` (a `GraphBuilder` or your own sink) one scalar at
a time and reports what it could not represent instead of dropping it; every exporter says what it
would lose before it writes a byte. The core format package stays zero-dependency; this package owns
the parsers and the io contract types.

## Installation

```bash
npm install @graphty/graph-io @graphty/graph-format
```

ESM only. Node >= 18.19.0 or any browser with ES2020 support. `@graphty/graph-format` is a peer
dependency so an application that installs several consumers gets one copy of the format.

## Quick start

`importGraph()` sniffs the format from the file name, the MIME type and the first bytes, creates a
builder, imports and freezes:

```ts
import { importGraph, exportGraphToString, ImportError } from "@graphty/graph-io";

const bytes = await fetch("/data/lesmiserables.gexf").then((r) => r.arrayBuffer());
try {
    const { snapshot, report, freeze, format } = await importGraph(new Uint8Array(bytes), {
        filename: "lesmiserables.gexf", // a hint; the content decides
        ids: "canonical", // "1" becomes the number 1, "01" stays a string (the default for text formats)
        weightDtype: "f64", // the default: 0.1 and 16777217 survive the round trip
        errorLimit: 100, // recoverable errors tolerated before ImportError
    });
    console.log(format, snapshot.nodeCount, snapshot.edgeCount, report.warningCount, freeze.compacted);
    for (const issue of report.issues) {
        console.log(issue.severity, issue.code, issue.line, issue.message);
    }
    const gml = await exportGraphToString(snapshot, "gml");
} catch (err) {
    if (err instanceof ImportError) {
        // the input could not be read at all, or the error limit was reached
        console.log(err.report.issues);
    }
}
```

A caller who owns a builder (an application that appends several files into one graph) uses an
importer directly through its subpath, so a CSV-only bundle never loads the XML formats:

```ts
import { GraphBuilder } from "@graphty/graph-format";
import { csvImporter, csvExporter } from "@graphty/graph-io/csv";

const builder = new GraphBuilder({ directed: true, weightDtype: "f64" });
const report = await csvImporter.import(file.stream(), builder, {
    delimiter: ",",
    nodes: nodeTableText, // an optional paired node table (Gephi's nodes.csv + edges.csv)
    onProgress: (done, total) => console.log(done, total),
    signal: controller.signal,
});
const snapshot = builder.freeze();

const notes = csvExporter.check(snapshot, { dialect: "gephi" }); // what export() would lose; [] when exact
for await (const chunk of csvExporter.export(snapshot, { dialect: "gephi" })) {
    writable.write(chunk); // Uint8Array chunks
}
```

Inputs may be a `string`, a `Uint8Array`, a `ReadableStream<Uint8Array>` (a `File.stream()`, a fetch
body) or an async iterable of text or byte chunks. Bytes are decoded by one shared layer, whatever
the format. The encoding is, in order: the `encoding` option (any WHATWG label, such as
`"windows-1252"` or `"utf-16le"`); a byte order mark (UTF-8, UTF-16LE, UTF-16BE); the encoding the
file declares (the XML prolog of GEXF and GraphML, DOT's `charset` attribute); else UTF-8. Decoding
is strict, never a silent U+FFFD. Undeclared bytes that are not UTF-8 are read as windows-1252 with
the warning `W_ENCODING_FALLBACK` (Excel, Pajek and older tools write it); invalid UTF-8 after valid
non-ASCII UTF-8, or binary data, is the `parse-error` `E_INVALID_UTF8`.

Some files hold several graphs: a DOT file with several `graph { }` blocks, a Pajek project (`.paj`)
with several networks, a GML file with several `graph [ ]` blocks, a JGF document with a `graphs`
array. `importGraph()` (and each importer's `import()`) reads the first and records the warning
`W_MULTIPLE_GRAPHS`, which says how many it skipped. `importAllGraphs()` (and `importer.importAll()`
where a format can hold several) returns every graph, each frozen on its own:

```ts
import { importAllGraphs } from "@graphty/graph-io";

for (const { snapshot, report } of await importAllGraphs(bytes, { filename: "project.paj" })) {
    console.log(snapshot.meta.name, snapshot.nodeCount, report.warningCount);
}
```

### Common import options

| Option                        | Default                                                               | Meaning                                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ids`                         | `"canonical"` (text formats), `"keep"` (JSON)                         | How an id cell becomes a `NodeId`: canonical integer text becomes a number, everything else stays a string; `"string"`, `"number"` and `"keep"` too.                        |
| `nodeIdFrom`                  | `"id"`                                                                | `"label"` or `"index"` for GML / Pajek / d3 files whose ids are ambiguous.                                                                                                  |
| `weightFrom`                  | `"weight"` (GML `"value"`)                                            | The attribute that becomes THE edge weight; `null` = unweighted.                                                                                                            |
| `weightDtype`                 | `"f64"`                                                               | Weight staging precision; `"f32"` is an explicit opt-in.                                                                                                                    |
| `onMixedDirection`            | `"expand"`                                                            | A file whose edges disagree on direction: expand into a directed graph with `graphty.directed` / `graphty.pair` columns, force `"directed"` / `"undirected"`, or `"error"`. |
| `defaultDirected`             | per format (GEXF / GML / JSON undirected, DOT / CSV / Pajek directed) | The direction assumed when the file says nothing.                                                                                                                           |
| `addMissingNodes`             | `true` (GEXF `false`)                                                 | Whether an edge may name a node the file never declared.                                                                                                                    |
| `duplicateEdges`, `selfLoops` | `"keep"`                                                              | Builder policies, applied at freeze.                                                                                                                                        |
| `long`                        | `"f64"`                                                               | How a declared 64-bit integer column is stored (`"string"` keeps every digit).                                                                                              |
| `restoreMangledIds`           | `true`                                                                | Restore ids an exporter rewrote under `sanitizeIds: "mangle"` from the `graphty:originalId` attribute.                                                                      |
| `hyperedges`                  | `"skip"`                                                              | GraphML / JGF hyperedges: `"error"`, `"skip"` with a report entry, `"star"` or `"clique"`.                                                                                  |
| `errorLimit`                  | `100`                                                                 | Recoverable errors tolerated before the importer throws `ImportError` with the partial report.                                                                              |
| `signal`, `onProgress`        |                                                                       | Cancellation (rejects with the signal's reason) and byte progress (`bytesTotal` known for in-memory input).                                                                 |
| `encoding`                    | detected                                                              | The encoding of byte input; overrides the byte order mark and the file's declaration. Ignored for text input.                                                               |

On a caller's builder the builder-policy options (`addMissingNodes`, `duplicateEdges`, `selfLoops`,
`weightDtype`) are read from the sink; an explicit request the sink does not honour is reported once
as a `W_SINK_OPTION` warning. `importGraph()` seeds its own builder from them.

Every attribute is stored as a column with one slot per node (or edge), so a file whose nodes each
carry a differently named attribute would need nodes x attributes memory: a few hundred kilobytes
could take gigabytes. `importGraph()` and `importAllGraphs()` therefore stop with an `ImportError`
(code `E_TOO_MANY_EMPTY_CELLS`) once the columns would hold more than `maxEmptyCells` slots without
a value (default 2^24, 16,777,216; `Infinity` turns the check off). A file where most elements have
most attributes is never stopped, however large. An importer used directly on a caller's builder
does not apply the limit.

### Common export options

`sanitizeIds: "error" | "mangle"` (default `"error"`: an exporter never silently renames a node;
`"mangle"` rewrites ids the format cannot hold and keeps the original in `graphty:originalId`) and
`onMixedDirection: "error" | "directed" | "undirected"` for formats without mixed-direction support.
`check(snapshot, options)` returns the `LossNote[]` that `export()` would incur; the shared codes
are in `LOSS` (for example `LOSS.MIXED_DIRECTION`, `LOSS.DTYPE`, `LOSS.LIST`, `LOSS.ID_MANGLED`),
the per-format ones in `<FORMAT>_LOSS`.

## Formats

Subpath, extensions, and what each exporter keeps as declared (its `capabilities` table; `check()`
reports every column or feature outside it):

| Format  | Subpath                     | Extensions                         | Mixed dir.  | Multi-edges | Edge ids    | Id charset    | Dtypes kept                            | Lists | json | Defaults | Hierarchy | Temporal       | Graph attrs | Positions | Viz |
| ------- | --------------------------- | ---------------------------------- | ----------- | ----------- | ----------- | ------------- | -------------------------------------- | ----- | ---- | -------- | --------- | -------------- | ----------- | --------- | --- |
| GEXF    | `@graphty/graph-io/gexf`    | `.gexf`                            | yes         | yes (1.3)   | optional    | any           | f32 f64 i32 bool dict string           | yes   | no   | yes      | yes       | dynamic-values | no          | yes       | yes |
| GraphML | `@graphty/graph-io/graphml` | `.graphml` `.xml`                  | yes         | yes         | optional    | NMTOKEN       | bool i32 f32 f64 string (long as text) | no    | no   | yes      | yes       | none           | yes         | no        | no  |
| GML     | `@graphty/graph-io/gml`     | `.gml`                             | no          | yes         | optional    | integer       | i32 f64 string dict json               | yes   | yes  | no       | no        | none           | yes         | yes       | no  |
| DOT     | `@graphty/graph-io/dot`     | `.dot` `.gv`                       | no          | yes         | optional    | any           | bool i32 f64 string                    | no    | no   | no       | yes       | none           | yes         | yes       | no  |
| Pajek   | `@graphty/graph-io/pajek`   | `.net` `.paj`                      | yes         | yes         | none        | dense 1-based | f64 i32 bool string                    | no    | no   | no       | no        | spells         | no          | yes       | no  |
| CSV     | `@graphty/graph-io/csv`     | `.csv` `.tsv` `.edges` `.edgelist` | yes         | yes         | optional    | any           | bool i32 f64 string dict               | no    | no   | no       | no        | none           | no          | no        | no  |
| JSON    | `@graphty/graph-io/json`    | `.json`                            | per dialect | yes         | per dialect | any           | f64 i32 bool string (no declarations)  | no    | yes  | no       | Cytoscape | none           | per dialect | Cytoscape | no  |
| Neo4j   | `@graphty/graph-io/neo4j`   | `.csv` `.tsv`                      | no          | yes         | none        | any           | f32 f64 i32 bool string                | yes   | no   | no       | no        | none           | no          | no        | no  |
| OBO     | `@graphty/graph-io/obo`     | `.obo`                             | read only   | -           | -           | -             | -                                      | -     | -    | -        | -         | -              | -           | -         | -   |
| CX2     | `@graphty/graph-io/cx2`     | `.cx2`                             | no          | yes         | required    | integer       | f64 i32 bool string                    | yes   | no   | yes      | no        | none           | yes         | yes       | no  |
| XGMML   | `@graphty/graph-io/xgmml`   | `.xgmml` `.xml`                    | yes         | yes         | optional    | any           | f64 i32 bool string (long as Long)     | yes   | no   | no       | yes       | none           | yes         | yes       | no  |
| Session | `@graphty/graph-io/cys`     | `.cys`                             | read only   | read only   | read only   | read only     | read only                              | -     | -    | -        | -         | -              | -           | -         | -   |

Every importer reads the whole corpus of research note 07 with the manifest counts and every
exporter round-trips it (import -> export -> import gives the same ids, topology, orientation,
weights and declared columns; the per-format caveats, such as Pajek's 0-based files or JSON's
untyped columns, are listed in the staging STATUS.md). `check()` predicts every difference the
format's own importer produces on re-import, including the importer's own rules, with one code per
concept across the formats (`W_ROLE_DROPPED` a role column written as a plain attribute,
`W_COLUMN_NAME_CHANGED` a role column read back under the importer's fixed name, `W_ROLE_ASSUMED` a
role-less column read back with a role, `W_WEIGHT_KEY_CLASH` a plain `weight` column read back as
THE weight, `W_ID_TEXT_TYPE` ids whose text reads back as the other type, `W_STORAGE_CLASS_CHANGED`
a string / dict column read back as the other, `W_INTEGRAL_F64_AS_I32`, `W_TEXT_INFERRED`,
`W_EMPTY_COLUMN_DROPPED`, `W_OPTIONS_GAINED`, `W_TEMPORAL_TEXT_DROPPED`, `W_MUTUAL_EXPANDED` /
`W_MUTUAL_AS_UNDIRECTED`, `E_XML_ILLEGAL_CHAR`, `E_ID_TEXT_COLLISION`). Every subpath exports its
`<FMT>_ISSUE` and `<FMT>_LOSS` tables; a key is the code without its `E_` / `W_` and format
prefixes. Under `onMixedDirection: "directed"` every exporter without mixed direction folds an
expanded pair back to one directed edge; `"undirected"` writes the whole graph undirected. Known
losses and format rules, in addition to the table:

- **GEXF**: 1.3 by default, 1.2 on request (`version: "1.2"`, no parallel edges, edge ids required).
  Dynamic attribute values become `temporal:<node|edge>:<name>` extension tables; `viz:color` is an
  f32 x4 rgba column in 0..1, `viz:position` an f32 x3 column; XML-derived column names (`label`,
  `parent`, `start`, ...) are reserved, a declared attribute with such a title is renamed
  `<title>#<id>`. Node ids that are non-integer numbers read back as text and string ids of integer
  text as numbers (`W_ID_TEXT_TYPE`; the importer reads ids by the canonical rule whatever `idtype`
  says, `ids: "string"` keeps the texts). A dict column without declared options gains one from
  its dictionary (`W_OPTIONS_GAINED`); text with a character XML 1.0 forbids is refused
  (`E_XML_ILLEGAL_CHAR`, `export()` throws).
- **GraphML**: parsed by the shared streaming XML tokenizer (no whole-document tree). `key for="all"`
  is declared in the node, edge and graph tables; a key's `name` / `type` are read when `attr.name`
  / `attr.type` are absent; yFiles trees are kept as `json` columns (structure preserved, not
  byte-exact), and a `y:ShapeNode` / `y:PolyLineEdge` in them is also read into `yfiles.*` columns
  (node `yfiles.position` with the position role, `yfiles.width`, `yfiles.height`, `yfiles.color`,
  `yfiles.borderColor`, `yfiles.borderWidth`, `yfiles.label` with the label role, `yfiles.shape`;
  edge `yfiles.color`, `yfiles.width`, `yfiles.directed` (the target arrow, not topology),
  `yfiles.targetArrow`, `yfiles.sourceArrow`), which the exporter never writes because the tree
  holds them (an edited value, such as a layout's new position, is reported by `check()` as
  `W_GRAPHML_YFILES_GRAPHICS_STALE` and lost); any other `json` column is written as JSON text and reads back as
  string (`W_JSON_UNSUPPORTED`). Ids outside NMTOKEN need `sanitizeIds: "mangle"` (restored on
  re-import). A label role column is written as the key titled `label` (the importer's label slot;
  `W_COLUMN_NAME_CHANGED` when it was named otherwise); edge ids and ports are the XML attributes
  (`id`, `sourceport`, `targetport`); a plain column titled like one of them reads back renamed
  `<name>#<key>`. A mutual pair is written as one undirected edge (`W_MUTUAL_AS_UNDIRECTED`).
  Lists, positions, viz and temporal columns are written as JSON text or reported.
- **GML**: NetworkX conventions (`_networkx_list_start`, `#` comments, `+INF` / `-INF` / `NAN`);
  `real` columns are written with a decimal point so the dtype survives; `graphics [ x y z ]` maps
  to the position role; records map to `json` and `check()` reports `W_GML_RECORD_NUMBER_TYPE` for
  numbers inside them (GML cannot keep int versus real inside a record). The spec's node ids are
  integers; a string id is imported under the `ids` rule with one `W_GML_STRING_ID` per file, and
  the exporter writes integers only (`sanitizeIds: "mangle"` renumbers and keeps the original in `graphty_originalId`); column names
  outside `[A-Za-z][0-9A-Za-z_]*` are refused or mangled (`sanitizeKeys`). A `directed` or
  `multigraph` flag written as a quoted integer (`directed "1"`) is read as that integer with a
  `W_GML_FLAG_VALUE` warning. The `directed` key's value as the file wrote it is kept in
  `meta.extra.gml.directed` (absent when the file has no `directed` key), so a reader can tell
  `directed 0` from a file that relies on the specification's default.
- **DOT**: a Graphviz-faithful parser (grammar violations are fatal, as in Graphviz); clusters are
  container nodes with the `parent` role; ports are kept; HTML strings keep their brackets; `pos`
  maps to the position role (and a trailing `!` to `pin`) unless `positions: false` keeps it as the
  text the file wrote, like any other attribute. Mixed direction is folded per `onMixedDirection`; a text with a
  backslash before a quote or a line break, or at its end, cannot be written (`E_DOT_TRAILING_BACKSLASH`: Graphviz's
  scanner consumes backslash pairs, so such a text has no quoted spelling).
- **Pajek**: `*Vertices N` bounds the id space (ids 1..N; a 0-based file is detected and reported;
  a count the sink cannot reserve is fatal); `*Arcs` / `*Edges` sections give per-section
  direction; time intervals map to the spells role; vertex / line parameters are plain columns read
  through the 5.1 text grammar (`2.0` stays f64, lexical forms of a string column are kept); a
  `.paj` project file's `*Partition` / `*Vector` objects become the node columns `partition` (i32)
  and `vector` (f64) (a second one `partition#2`, ...; their Pajek names in
  `meta.extra.pajek.objects`), and other project sections (`*Events`, ...) are skipped with a
  warning; a two-mode `*Vertices N N1` reads its `*Matrix` as N1 rows of N - N1 columns. Nodes are
  always written 1..N (`W_ID_RENUMBERED`: the id text is kept as the label of a node without a
  label value, a node with one loses its id; `W_PAJEK_LABEL_GAINED` when a line's parameters force
  a label); `sanitizeIds: "mangle"` also writes every renumbered vertex's original id as a
  `graphty_originalId` parameter, which the importer restores under `restoreMangledIds` (the
  default; `W_ID_TEXT_TYPE` when a string id of integer text reads back as a number); a `shape`
  column whose values are not all shape keywords is written as a parameter; labels holding a
  double quote or a line break cannot be written.
- **CSV**: header names resolve the endpoints (`source` / `target`, `from` / `to`, Gephi `Source` /
  `Target` / `Type` / `Id` / `Label` / `Weight`); a paired node table comes through the `nodes`
  option; the delimiter is sniffed (a consistency tie goes to the earlier of `,`, tab, `;`, `|`,
  space), or taken from Excel's `sep=;` first line. A space delimiter reads the whitespace dialect
  of SNAP / KONECT files: runs of spaces and tabs are one separator, indentation is ignored. Rows of
  empty unquoted cells (`,,,`) are blank lines. Leading `#` (SNAP) and `%` (KONECT) comment lines are
  skipped and read for the direction they declare (`# Directed graph`, `% sym` / `% asym`; the first
  declaration wins, and one that disagrees with an explicit `defaultDirected` or an earlier comment
  is reported, `W_CSV_COMMENT_DIRECTION`). Input that opens like XML / HTML, JSON, GML, DOT or Pajek
  is refused (`E_CSV_OTHER_FORMAT`), and NUL bytes in undeclared input fail as binary data
  (`E_INVALID_UTF8`). A header with one endpoint column fails (`E_CSV_NO_ENDPOINT_COLUMNS`) rather
  than becoming a node table. Silent guesses are reported once each: a quote inside an unquoted
  field, a byte order mark inside the text, an unquoted id with surrounding whitespace, two header
  columns naming one role, a `type` column of direction words outside the Gephi dialect, a header
  ending in a delimiter (rows without that empty cell are complete), a one-column table another
  delimiter would split, and a leading `#` line shaped like a record. A quoted empty
  cell is a set empty string, a bare one is unset; text after a closing quote is a fatal
  `E_CSV_QUOTE`. The Gephi dialect keeps per-row direction, the generic dialect drops it
  (`W_CSV_DIRECTION_DROPPED`). Untyped cells follow the 5.1 text grammar per column (`2.0` stays
  f64, `1e5` and `-0` keep their spelling in a string column). An edge table cannot carry an
  isolated node or the node order (`W_CSV_ISOLATED_NODES`, `W_CSV_NODE_ORDER`; write the node table).
  `table: "adjacency"` reads (and writes) an adjacency table: each row is a node followed by its
  neighbours, `neighbour:weight` giving the edge's weight when the text after the last colon is a
  number, and a row holding only its node adding an isolated node. It is never sniffed: nothing in
  its rows tells it from an edge list. The exported table keeps ids, the node order, isolated nodes,
  the edge order and explicit weights (a neighbour id holding a colon is written `id:` when it has no
  weight, and a cell holding a space, tab, `;` or `|` is quoted so the delimiter sniff still finds
  the comma); it holds no direction and no columns (`W_CSV_DIRECTION_DROPPED`, `W_CSV_EDGE_COLUMNS`).
  An empty adjacency table is the empty graph. Column options and `rowNumberIds` are refused with it
  (`E_UNSUPPORTED`). A node table without an id column is refused (`E_CSV_NO_ID_COLUMN`) unless
  `rowNumberIds: true`, which makes each data row's 0-based number its id, coerced by `ids` like any
  other id cell. The option applies to the node table only -- the `nodes` input when one is given,
  else the input itself -- and makes its first row a header even under `header: "auto"`.
- **JSON**: the dialect is sniffed from the document (`dialect` forces it); the importer records the
  shape under `meta.extra.json` so a re-export keeps it (a d3 document is written back bare, a
  graphology one with only the options it declared). JSON declares no types: the capability table
  lists the inferred dtypes only, and `check()` names every f32 / u32 / u8 / dict / list / vector
  column (they come back f64 / i32 / string / json), integral f64 columns (i32) and every role the
  dialect has no slot for. Edge ids exist in JGF, Cytoscape, graphology and vis only; positions in
  Cytoscape only. A repeated node id is merged with `W_DUPLICATE_NODE`, a repeated edge id skipped
  with `E_DUPLICATE_EDGE_ID`; an out-of-range d3 index link is `E_BAD_INDEX`. Non-finite numbers
  are written as `null` and reported. NetworkX `adjacency_data` (`nodes` plus an `adjacency` list
  per node; an undirected file lists each edge from both ends and it is read once) and `tree_data`
  (nested `id` / `children`, read as a directed tree) are read but not written: a re-export writes
  node-link. The bare `NaN`, `Infinity` and `-Infinity` that Python's json module writes are read as
  numbers (`W_JSON_NONSTANDARD_NUMBER`), and an integer literal beyond 2^53 keeps its exact digits as
  a string (`W_JSON_BIG_INTEGER`), so two large ids never round to one; the exporter writes an
  integral number that large in exponent form (`1e+20`) so it re-imports as a number. `nodesPath`
  and `edgesPath` point at node and edge arrays nested anywhere in the document as dotted key paths
  (`{ nodesPath: "data.nodes", edgesPath: "data.relationships" }`) for the node-link, d3, vis and
  graphology dialects; the object holding the nodes supplies the graph flags, and a path that names
  nothing is an `E_MISSING_SECTION` issue, not an abort. OBO Graphs (`dialect: "obographs"`, the
  JSON the Gene Ontology and the OBO Foundry publish: `graphs[]` of `sub` / `pred` / `obj` edges) is
  read only, into the same columns as the OBO importer: IRIs become the ids the `.obo` file writes
  (`GO:0008150`; `oboIds: "iri"` keeps them), a relation is named by its shorthand (`part_of`),
  PROPERTY nodes and the axiom arrays go to `meta.extra.obographs` (`typedefs: "nodes"` makes the
  properties nodes), and an edge endpoint missing from `nodes` becomes a placeholder node
  (`W_DANGLING_REFERENCE`). For a JGF or OBO Graphs `graphs` array, `graphIndex` / `graphName` (a
  graph's `id`, else its label) choose the graph and `listGraphs()` lists them. A document longer
  than one JavaScript string (about 512 MB, such as ncbitaxon.json) fails with `E_TOO_LARGE`.
- **OBO** (read only): OBO 1.0, 1.2 and 1.4 read as their union, streamed line by line. `[Term]`
  and `[Instance]` frames are nodes; `is_a`, `relationship` and `instance_of` clauses are directed
  edges, child to parent, with the relation in a `relation` column (role `kind`) and a trailing
  `{...}` qualifier block in `qualifiers`. `[Typedef]` frames go to `meta.extra.obo.typedefs`
  (`typedefs: "nodes"` makes them nodes with their `is_a` edges); the header goes to
  `meta.extra.obo.header`. Every other tag fills the column of its name (`name` with the label
  role, `namespace`, `def` and `def.xrefs`, `synonym` as `{ text, scope, type, xrefs }` records,
  `xref`, `alt_id`, `subset`, `is_obsolete`, `property_value`, `intersection_of`, ...); an unknown
  tag is kept in `obo.unrecognized`, qualifiers with no other home in `obo.qualifiers` (those of
  one xref of a `def` or `synonym` list under `def.xrefs` / `synonym.xrefs`), a frame of
  an unknown type in `meta.extra.obo.unknownFrames`. Frames that share an id are merged (lists
  take the union, a single value keeps the first). A target no frame declares becomes a placeholder node (`graphty.placeholder`; `addMissingNodes: false` drops
  the edge instead). Obsolete terms are kept (`obsolete: "drop"` leaves them and their edges out).
  Imports and the treat-xrefs macros are kept but not applied (`W_OBO_HEADER_NOT_APPLIED`). The
  `\W` escape is a space, as the OBO guides define it. There is no OBO exporter: write GraphML or
  the graph-format container instead.
- **Neo4j**: `neo4j-admin import` headers (`:ID`, `:LABEL`, `:START_ID`, `:END_ID`, `:TYPE`, typed
  properties, id spaces, arrays); one file may hold several sections; a `weight` property becomes
  THE weight; a quoted empty `:ID` is the id `""`. A node of an id space (`:ID(Product)`) is stored
  under the string id `Product:1`, with its id text in the `originalId` column and its space in
  `idSpace`, so the same id in two spaces stays two nodes; `:START_ID(Space)` / `:END_ID(Space)`
  resolve inside their space, and the exporter writes the id text back. Everything is directed (an undirected snapshot,
  or the folded pairs of a mixed one under `onMixedDirection: "directed"` / `"undirected"`, is
  written with a `W_NEO4J_UNDIRECTED_AS_DIRECTED` note); `.text` companions keep the source text of
  temporal values whose canonical form differs; a dict column reads back as string and a position
  or visual column as a plain property.
- **XGMML**: one reader for the 1.0 draft, the Cytoscape 2.x and 3.x exports and the Cytoscape 3
  session network files. Direction follows the DTD (root `directed`, default 0), then `cy:directed`
  per edge; ids stay strings (`"1"` and `"01"` are two nodes); atts are typed by `cy:type`, then
  `type` (the XGMML `integer` is `i32`, widening to `f64` with `W_WIDENED` because pre-3.3
  Cytoscape wrote Longs that way, while a value beyond i32 under `cy:type="Integer"` or in a
  session's `java.lang.Integer` column is `E_BAD_VALUE`; Long `f64` or a string under
  `long: "string"`, lists of their element type, record lists, lists of lists and RDF as `json`);
  groups become `parent` / `parents`, other node-nested graphs the `cytoscape.nestedNetwork`
  pointer; `graphics` x and y are the position, stored y-up (Cytoscape writes screen coordinates;
  the exporter flips y back), z the separate `z` column (`zAs: "position"` makes it a coordinate),
  every other graphics value a `json` column `graphics`. Cytoscape's `\n` / `\t` escapes, label
  aliases (`a (pp) b`) and the two writer bugs Cytoscape repairs (`repairBareAmpersands`,
  `pairSurrogateReferences`, both off by default) are options. A session network document lists
  its registered networks through `listGraphs()`; `graphIndex` / `graphName` choose one. Dangling
  endpoints are `E_UNKNOWN_NODE` unless `addMissingNodes: true`. The exporter writes the Cytoscape
  3 dialect (`type` plus `cy:type` on every att): f32, u8, u32 and dict are written as wider
  Cytoscape types, json as text, and graphty's visual roles are not translated into graphics.
- **Cytoscape sessions (`.cys`)**: read only (Cytoscape opens the XGMML graph-io writes). A
  session is a zip of every network of a Cytoscape desktop, read with no dependency (the central
  directory, zip64, data descriptors, stored and deflate entries inflated through
  `DecompressionStream`; encryption and other methods are refused by name). One snapshot per
  registered network: `import()` reads the first (`graphIndex` / `graphName` choose another,
  `listGraphs()` lists them with their counts), `importAll()` every one. 3.x: the network file's
  topology, the network's CyCSV tables as columns (shared columns joined in by `cytables.xml`,
  HIDDEN and app tables as hidden columns under their namespace), positions from its first view
  (y-up; further views as `position@2`, ...) and the view's per-element values as the `graphics`
  column; 2.x: one XGMML per network, with `cysession.xml`'s selection and hidden state as
  `cytoscape.selected` / `cytoscape.hidden`. Expanded groups become `parent` / `parents`, a
  collapsed group's members are listed in `meta.extra.cytoscape.groups`, nested-network pointers
  name their network in `cytoscape.nestedNetwork`. Styles are not applied (`W_STYLES_NOT_IMPORTED`,
  issue #706); apps, properties and images are skipped with `W_CYS_ENTRY_SKIPPED`. Text input is
  refused (`E_CYS_NOT_ZIP`: pass the bytes). `maxUncompressedBytes` (default 2 GiB) and a 1000:1
  ratio limit stop zip bombs (`E_TOO_LARGE`).

- **CX2**: the JSON exchange format of NDEx, Cytoscape 3.10+ and Cytoscape Web, read element by
  element so a document longer than one JavaScript string still loads. Every edge is directed;
  node ids are integers (an id beyond 2^53 keeps its digits as a string id, `W_PRECISION`; `"5"` and
  `5.0` read as 5, `W_ID_TEXT_TYPE`). Declared attributes become typed columns under their full
  names (the alias in `origin.id`, the default in `meta.default`); an undeclared attribute is typed
  from its values (`W_CX2_UNDECLARED_ATTRIBUTE`), a value of the wrong type is `E_BAD_VALUE` and its
  cell is unset. `name` is the label; `x` / `y` are the position, stored y-up (y negated, as for every
  Cytoscape-family format) and negated back on export; `z` is a stacking order in the `z` column
  (`zAs: "position"` puts it in the position). Per-element visual values (`nodeBypasses`,
  `edgeBypasses`) are one column per visual property (origin namespace `cx2.bypass`); style rules
  (`visualProperties`, `visualEditorProperties`) and opaque aspects are kept verbatim in
  `meta.extra.cx2.opaque` and written back, but not applied (`W_STYLES_NOT_IMPORTED`). A missing
  `status` is `E_CX2_NO_STATUS`, `success: false` is fatal (`E_STATUS_FAILED`), an edge to an unknown
  node is `E_UNKNOWN_NODE` (`addMissingNodes: true` creates it, as Cytoscape does). The exporter
  refuses non-integer node ids unless `sanitizeIds: "mangle"`, which keeps the original in a
  `graphty:originalId` attribute the importer turns back into the id; NaN and the infinities are
  written as null (`W_CX2_NONFINITE_AS_NULL`), nested values as JSON text (`W_CX2_JSON_AS_STRING`).

- **CX** (version 1, `@graphty/graph-io/cx`, `.cx`; read only -- CX2 is what NDEx and Cytoscape
  write today): aspect fragments in any order, read element by element. Ids follow the CX2 rule;
  `n` is the `name` label, `r` is `represents`, `i` is `interaction`; attributes are typed by their
  `d` with Cytoscape's value rule (`""` and `"null"` are unset, `"NaN"` is NaN in a double), several
  types for one name widen (`W_WIDENED`). A collection (several `cySubNetworks`) is one graph per
  subnetwork: `listGraphs()` lists them, `import()` reads the one `graphIndex` / `graphName` picks
  (the first by default, `W_MULTIPLE_GRAPHS`), `importAll()` reads them all; a subnetwork's own
  values (`s`) beat the shared ones, and nodes or edges no subnetwork holds are not read
  (`W_CX_ROOT_ONLY`). Positions come from the subnetwork's view (y negated to y-up,
  other views as `position@2`, ...); `cyGroups` give `parent` or `parents` (a group whose id is
  not a node gets one, `W_CX_GROUP_NODE_ADDED`); per-element `cyVisualProperties` of that view are
  one column per property (origin namespace `cx.bypass`) and style rules are kept in `meta.extra.cx`
  (`W_STYLES_NOT_IMPORTED`); citations and supports become the extension tables `cx:citations` /
  `cx:supports`. Old aspect names (`visualProperties`, `subNetworks`, ...) are read with
  `W_CX_OLD_ASPECT_NAME`; a CX2 document is refused naming the CX2 importer (`E_CX_NOT_CX`).

## Format detection

`sniff({ filename?, mimeType?, head? })` ranks the registered importers: a content match scores
at least 0.5 (`0.5 + 0.35 * content + 0.1 * extension + 0.05 * MIME`), a hint alone at most 0.4,
so the content always beats a misleading extension (a `.csv` with a neo4j-admin header is Neo4j, a
`.xml` is GEXF or GraphML by its root element). `sniffJsonDialectHead()` reports the JSON dialect a
head suggests. `importGraph()` reads at most `SNIFF_HEAD_BYTES` (8 KiB) of a stream before deciding
and replays them to the importer.

## The import report

Every import returns an `ImportReport` (design section 8.6):

```ts
interface ImportReport {
    format: string; // "gexf", ...
    counts: { nodes; edges; skippedNodes; skippedEdges; expandedMixed }; // edges counts both halves of an expanded edge
    issues: ImportIssue[]; // in order: { category, severity, code, message, line, element }
    errorCount: number; // issues with severity "error"; they count toward errorLimit
    warningCount: number;
    truncated: boolean; // the error limit was reached and the import aborted
    lossy: LossNote[]; // what the importer could not represent: { code, message, column, count }
    durationMs: number; // the parse phase; the freeze reports separately
}
```

Issue categories are `parse-error`, `missing-value`, `validation-error`, `unsupported`, `precision`,
`coercion` and `merged`. Codes are stable strings (`E_*` errors, `W_*` warnings) exported per format
(`GEXF_ISSUE`, `GRAPHML_ISSUE`, `GML_ISSUE`, `DOT_ISSUE`, `PAJEK_ISSUE`, `CSV_ISSUE`,
`JSON_ISSUE`, `NEO4J_ISSUE`) and shared across formats (`SINK_OPTION_CODE`, `ID_MERGED_CODE`,
`DIRECTION_REFUSED_CODE`, `DIRECTION_FORCED_CODE`, `RENAMED_CODE`, `PRECISION_CODE`,
`INVALID_UTF8_CODE`, `INVALID_ENCODING_CODE`, `ENCODING_FALLBACK_CODE`, `UNKNOWN_ENCODING_CODE`,
`PARSE_ERROR_CODE`). The builder throws on the first hard error; the importer
catches it per element, records an issue, skips the element and continues until `errorLimit`, then
throws `ImportError` (`code === "E_IMPORT"`) carrying the partial report. An input that cannot be
read at all (bytes invalid in the chosen encoding, malformed XML, no recognisable format) is an
`ImportError` at once.

## Writing a plugin

`GraphImporter` and `GraphExporter` (design section 12.4) are plain objects; the helpers every
built-in format is built on are exported for third-party plugins: `ImportReportBuilder` (issues,
error limit, `warnOnce`, `ImportError`), `textChunks` / `readText` / `LineReader` (streaming
input decoded by the shared encoding rules, with cancellation and progress), `tokenizeXml` / `XmlTokenizer` (the streaming XML tokenizer
behind GEXF and GraphML), `resolveImportOptions` / `resolveExportOptions` / `reportSinkOptions` /
`reportUnusedOptions`, `DirectionResolver` (the mixed-direction rules of section 8.4) and
`pairFolding` (its inverse for exporters), `IdCoercer`, `parseTextCell` and `TextCellWriter` (the
text grammar of section 5.1, per column, with the lexical forms kept), `declareResolved` (the 5.6
collision rule), `explicitWeights` (the weight role column's validity, section 3.7),
`checkCapabilities` (with `CheckExtras` for the roles a format has a slot for) / `sanitizeIds` /
`LOSS` / `xmlIllegalTextNotes`, the shared issue and loss codes of `codes.ts`, `formatDecimal` and
`encodeChunks` / `joinText`. Register a plugin with `registry.registerImporter()` /
`registerExporter()` or build a registry of your own with `new FormatRegistry()`. The `children`
CSR helper (`childrenCsr`) inverts a `parent` / `parents` containment column for nested writers.

## License

MIT
