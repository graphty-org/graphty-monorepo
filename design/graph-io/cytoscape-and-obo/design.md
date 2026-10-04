# graph-io: Cytoscape formats and OBO -- design

Status: proposed, 2026-10-02; revised the same day after review (see "Review changes" at the end)
and to match the owner's decisions on the one-way doors (the end of `one-way-doors.md`, same
folder), which override anything here that differs. Scope: five new readers in `@graphty/graph-io`
and what graphty-element needs to load them with no wiring:

- XGMML (`.xgmml`), the XML graph format Cytoscape writes;
- CX version 1 (`.cx`) and CX2 (`.cx2`), the JSON exchange formats of NDEx and Cytoscape;
- Cytoscape session files (`.cys`), a zip of XGMML, tables and styles;
- the OBO flat file format (`.obo`, the Gene Ontology's format), plus OBO Graphs JSON as a new
  dialect of the existing JSON reader.

Cytoscape style files (vizmap XML, and the 2.x `vizmap.props`) hold styles but no graph. Reading
them, and turning any file's style rules into graphty styling, is cross-format style import, which
is issue #706 and not part of this work (section 2).

graph-io already reads Cytoscape.js JSON (`.cyjs`) as the `cytoscape` dialect of its JSON reader.
One thing changes there: its positions are flipped to y-up at import, and the JSON exporter's
`cytoscape` dialect flips them back (section 1.0.2).

The research behind every decision is in this folder, one note per format. They hold the
sources, the feature inventories, the error tables and the candidate files, and this design
cites them by section rather than repeating them:

- `research-xgmml.md` (XGMML), `research-cx.md` (CX1), `research-cx2.md` (CX2),
  `research-session-and-style.md` (sessions and style files), `research-obo.md` (OBO and OBO
  Graphs JSON), `research-go-workflows.md` (how Gene Ontology users load the graph).

The package rules this design follows are in `graph-io/CLAUDE.md` (the importer and exporter
contract, "Adding a format", the conformance suite) and in
`design/graph-format/graph-format-design.md` sections 5 and 8 (columns, roles, metadata, the sink
contract, importer and exporter shape, the report).

---

## 0. Summary of the decisions

| Question                                                 | Decision                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New subpaths                                             | `@graphty/graph-io/xgmml`, `/cx`, `/cx2`, `/cys`, `/obo`, one per format. OBO Graphs JSON is read by `/json` (dialect `"obographs"`)                                                                                                                                                                                                                                                                                        |
| New format names (registry, sniffing, `GraphFormatName`) | `"xgmml"`, `"cx"`, `"cx2"`, `"cys"`, `"obo"`                                                                                                                                                                                                                                                                                                                                                                                |
| Exporters                                                | XGMML, CX2 and CX1 (section 1.2). `.cys` and OBO are read-only (sections 1.4, 1.5 say why)                                                                                                                                                                                                                                                                                                                                      |
| Visual information                                       | Style import is issue #706. Per-element visual values become plain columns, as the existing importers' GEXF viz values and GML graphics do: XGMML `graphics` as a `json` column, CX and CX2 bypasses as one column per visual property. Style rules (defaults, mappings, dependencies, visual property aspects) are not applied; each importer reports them with the loss code `W_STYLES_NOT_IMPORTED` (section 2)          |
| Several graphs in one file                               | `importAll()` returns one snapshot per network (`.cys`, CX1 collections, the XGMML session dialect, OBO Graphs `graphs[]`); `import()` reads one, chosen by `graphIndex` / `graphName`; a new optional importer method `listGraphs()` lists them cheaply so a picker can be shown first                                                                                                                                     |
| Zip                                                      | A dependency-free central-directory reader in `src/common/zip.ts`; deflate is inflated by wrapping each entry in a gzip member and using `DecompressionStream("gzip")`, which every supported runtime has (Node 18+), and which checks the CRC itself                                                                                                                                                                       |
| Direction                                                | XGMML follows its specification (root `directed`, default 0; `cy:directed` per edge), overruling Cytoscape. CX1 and CX2 are always directed. `.cys` per edge, default directed. OBO always directed, child to parent                                                                                                                                                                                                        |
| Dangling edge endpoints                                  | `addMissingNodes` defaults to false for XGMML, CX1, CX2 and `.cys` (Cytoscape and NDEx drop or reject such edges): `E_UNKNOWN_NODE`, edge skipped. Each of these importers enforces it against its own id set, because the registry seeds its builder with `addMissingNodes: true`. OBO defaults to true: the importer itself makes an undeclared target a placeholder node, which is how ontologies refer to their imports |
| Coordinates                                              | Cytoscape writes screen coordinates (y down). Every Cytoscape-family importer, including the existing `.cyjs` dialect, negates y at import, so positions are y-up like every other graph-io importer's, in an `f32 x3` `position` column with no mark; the XGMML, CX2 and `.cyjs` exporters negate y again. Cytoscape's `z` is a stacking order, so it goes to a separate `z` column, not into the position                 |
| Gene Ontology                                            | Terms are nodes, `is_a` and `relationship` clauses are edges with a `relation` column (role `kind`), Typedefs are metadata, obsolete terms are kept with an `is_obsolete` column, columns are named after the OBO tags                                                                                                                                                                                                      |
| Oracles                                                  | OBO: fastobo-py 0.14.1. CX1 and CX2: ndex2 3.12.0. XGMML and `.cys`: Cytoscape 3.10.5 through CyREST, run once offline and committed. Each disagreement with the specification is marked on the fixture                                                                                                                                                                                                                     |

---

## 1. The formats

### 1.0 Shared building blocks

These are new modules under `graph-io/src/common/`, each used by two or more of the new formats.
Each is the smallest thing the formats need; nothing here is speculative.

| Module                 | Used by                           | What it is                                                                                                                                                                                                                                                                                                                        |
| ---------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codes.ts` (additions) | all                               | The new shared issue codes of 1.0.1                                                                                                                                                                                                                                                                                               |
| `input.ts` (additions) | `.cys`                            | `readBytes(input)`: the whole input as one `Uint8Array` (string input is refused for binary formats); `decodeEntryName(bytes, utf8Flag)`: a zip entry name as text, so the package's rule that bytes are decoded only in `input.ts` holds for `zip.ts` too                                                                        |
| `zip.ts`               | `.cys`                            | The zip reader of section 3.3                                                                                                                                                                                                                                                                                                     |
| `json-elements.ts`     | CX1, CX2                          | The JSON reading the two CX formats share: the `rewriteNumbers` exact-integer scan moved out of the JSON importer (so ids above 2^53 keep their digits), and an element scanner that walks the top-level array and hands each aspect block's elements to the importer one at a time (section 1.2.5); also the CX id rule of 1.0.2 |
| `ontology.ts`          | OBO, the JSON `obographs` dialect | The OBO column vocabulary (names, dtypes) and the OBO PURL rule for turning IRIs into CURIEs, so the `.obo` and the `.json` of one ontology give the same columns                                                                                                                                                                 |

The XML formats (XGMML, the XGMML and XML files inside a `.cys`) use the existing
`common/xml.ts` tokenizer and `common/input.ts` decoder unchanged, so the XML hardening that GEXF
and GraphML already have (no entity expansion, no DTD fetching, strict UTF-8 with the declared
encoding) applies to them for free. CyCSV tables inside a `.cys` are read with the existing
`CsvRecordReader` (`src/formats/csv/records.ts`); its RFC 4180 rules (doubled quotes, no escape
character, newlines inside quotes) are exactly opencsv's as Cytoscape uses it.

#### 1.0.1 New shared issue codes

graph-io's rule: a condition that two or more formats share gets one unprefixed code in
`src/common/codes.ts`; a condition one format has gets an `E_<FMT>_` / `W_<FMT>_` code. These
conditions occur in two or more of the new formats.

| Code                    | Severity | Category         | Meaning                                                                                                                                                                                                                                                                                                 | Formats                                 |
| ----------------------- | -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `E_BAD_VALUE`           | error    | validation-error | A value does not parse as its declared type; the cell is left unset. Already the JSON importer's code for the same condition, so it moves to `codes.ts` with the same string                                                                                                                            | XGMML, CX1, CX2, `.cys`, OBO            |
| `W_WIDENED`             | warning  | coercion         | A column's dtype was widened by design 5.1 because a later value did not fit (an XGMML `integer` above 2^31, conflicting CX `d` types). Named in comments today (`codes.ts:3`, `types.ts:224`) but never defined; it is added in step 1 of section 7.1                                                  | XGMML, CX1, CX2, `.cys`                 |
| `W_DANGLING_REFERENCE`  | warning  | validation-error | A reference that is not a containment link (an attribute's element id, a layout entry, a bypass entry, a subnetwork member, a view's network, an OBO target under `addMissingNodes: false`) names nothing; reported once per kind with the count                                                        | XGMML, CX1, CX2, `.cys`, OBO, obographs |
| `W_DUPLICATE_ATTRIBUTE` | warning  | validation-error | The same attribute twice on one element; the later value wins (OBO: the first, per its spec). This is the condition GEXF reports today as `W_GEXF_DUPLICATE_ATTRIBUTE`; that code is promoted to the shared one and `GEXF_ISSUE.DUPLICATE_ATTRIBUTE` aliases it, which changes its string (section 7.2) | GEXF, XGMML, CX1, `.cys`, OBO           |
| `E_PARENT_CYCLE`        | error    | validation-error | A containment link would close a `parent` cycle; that one link is dropped                                                                                                                                                                                                                               | XGMML, CX1                              |
| `W_EQUATION_AS_TEXT`    | warning  | unsupported      | A Cytoscape formula (`=ABS($x)`) is kept as its text; it is never evaluated                                                                                                                                                                                                                             | XGMML, `.cys`                           |
| `W_STYLES_NOT_IMPORTED` | warning  | unsupported      | The loss code for style rules (section 2): the file's styles (defaults, mappings, dependencies, visual property aspects) are not applied to the snapshot. Recorded once per import; the message names what was not applied (for example "2 styles, 14 mappings") and points at issue #706               | CX1, CX2, `.cys`                        |
| `E_BAD_ASPECT_BLOCK`    | error    | parse-error      | An array member that is not a one-key object holding an array or an object; the block is skipped                                                                                                                                                                                                        | CX1, CX2                                |
| `W_ASPECT_ORDER`        | warning  | validation-error | An aspect after the post-metadata, a `status` that is not last, a third `metaData`, or a block that arrived before what it depends on and had to be buffered (1.2.5)                                                                                                                                    | CX1, CX2                                |
| `W_COUNT_MISMATCH`      | warning  | validation-error | A declared element count (`metaData.elementCount`) disagrees with what was read                                                                                                                                                                                                                         | CX1, CX2                                |
| `E_STATUS_FAILED`       | fatal    | validation-error | The producer wrote `status.success: false`: the document is known to be incomplete; the message carries the producer's text                                                                                                                                                                             | CX1, CX2                                |
| `W_STATUS_WARNING`      | warning  | validation-error | `status.success: true` with an `error` text (CX2 spec, 2023-10-31)                                                                                                                                                                                                                                      | CX1, CX2                                |

"fatal" means what it means for every importer: the issue is recorded and `ImportError`
(`E_IMPORT`) is thrown with the report.

Existing shared codes are reused wherever their meaning fits: `E_EMPTY_INPUT`, `E_SYNTAX`,
`E_XML_SYNTAX`, the encoding codes, `E_MISSING_ID`, `E_MISSING_ENDPOINT`, `W_DUPLICATE_NODE`,
`E_DUPLICATE_EDGE_ID`, `E_UNKNOWN_PARENT` (any group, nested-graph or `cyGroups` membership that
names no node, at either end, as GEXF and JSON already use it), `W_UNKNOWN_ELEMENT`,
`W_UNKNOWN_ATTR_TYPE`, `W_BAD_DEFAULT`, `W_PRECISION`, `W_ID_TEXT_TYPE`, `W_COLUMN_RENAMED`,
`W_ROLE_TAKEN`, `W_MULTIPLE_GRAPHS`, `E_NO_GRAPH`, `W_OPTION_IGNORED`, `W_SINK_OPTION`, the text
cell writer's `W_WIDENING_UNSUPPORTED`, and the builder's `E_UNKNOWN_NODE` and `E_INVALID_ID`.
`E_TOO_LARGE` (the zip limits of 3.3, or a JSON document longer than one JavaScript string while
the JSON importer still parses whole documents) is not a new code: graph-format already defines
that string for the same condition, and graph-io records it as a fatal issue with category
`unsupported`, under the name `TOO_LARGE` in `CYS_ISSUE`, `CX_ISSUE`, `CX2_ISSUE` and `JSON_ISSUE`.

**Widening on a caller's sink.** Widening a column after rows were written needs the sink's
optional widening call. The registry's builder has it. A caller's sink without it cannot widen:
`TextCellWriter` then records `W_WIDENING_UNSUPPORTED` once for the column, and every value that
does not fit the declared dtype is left unset and counted in that warning. For XGMML's `integer`
overflow this means a pre-3.3 Long value above 2^31 is unset on such a sink, never truncated.

Every subpath exports `<FMT>_ISSUE` (and `<FMT>_LOSS` where there is an exporter), keyed by the
code without its severity and format prefixes, and every code its importer records is a member,
as the package rule requires. The tables below list only the format-specific codes, grouped by
category; each table also aliases the shared codes its format can record.

#### 1.0.2 Rules every new importer follows

- Ids are kept as written. CX ids are integers, decided **per id** so a streaming reader never
  needs the rest of the file: a safe integer is a number, a larger one is its exact digit string
  (`GraphMeta.idType: "mixed"` once that happens, and `W_PRECISION` naming the first such id).
  Edges spell the same digits the same way, so their endpoints still match. A JSON string that
  spells a decimal integer (`"@id": "12"`) and an integral number written another way (`1e3`)
  are read as that integer, with `W_ID_TEXT_TYPE` once (Jackson, under the Java readers, coerces
  the same way), so `1` and `"1"` are one node; any other string or a fractional number is
  `E_INVALID_ID` and the element is skipped. The XML and text formats keep string ids (`ids`
  defaults to `"keep"`, so `"1"`, `"01"` and `" 1 "` stay three nodes, where Cytoscape's XGMML
  reader collapses them).
- **Dangling endpoints.** The registry seeds its builder with `addMissingNodes ?? true` before
  any importer runs (`registry.ts` `seededBuilder()`), so a format default of `false` is never
  seen by the builder. XGMML, CX1, CX2 and `.cys` therefore check every edge endpoint against
  their own id set (they hold edges until their nodes are known anyway), record `E_UNKNOWN_NODE`
  and skip the edge themselves when their resolved `addMissingNodes` is false, and call
  `reportSinkOptions(sink, options, report, true)`, as GraphML and GEXF do
  (`graphml/importer.ts`, `gexf/importer.ts`). OBO holds its edges to the end of the file and
  makes its placeholder nodes itself (section 4.2), so it never relies on the builder either.
  Each of the five gets a test that imports a file with a dangling endpoint through the default
  registry and through a caller's sink.
- Columns keep the source attribute's name, declared types map to dtypes by design 5.1 (Long is
  `f64`, or `string` under `long: "string"`; Integer is `i32`; Double `f64`; Boolean `bool`;
  String `string` or `dict`; a list type is `list` of its element dtype), `origin.type` keeps the
  declared type text so an exporter writes it back, and name collisions use the existing
  `declareResolved` rename rule (`<name>#<origin.id>`, `W_COLUMN_RENAMED`).
- A position is an `f32 x3` column with role `position` and
  `extra: { sourceDims: 2, units: "file" }` for every Cytoscape-family file: the same dtype as the
  `.cyjs`, DOT, Pajek and GEXF importers, which is what the element and the layouts read.
  Cytoscape's doubles lose digits beyond about seven significant figures, so the XGMML and CX2
  round trips compare positions at `f32` precision (a `NOTE_RELAX` entry, 6.1).
- **Positions are stored y-up.** Cytoscape and Cytoscape.js write screen coordinates, whose y grows
  downward; every other graph-io importer stores y growing upward, which is also what
  graphty-element and the layouts assume. So every Cytoscape-family importer (XGMML, CX1, CX2,
  `.cys`) stores `-y`, and so does the existing `.cyjs` dialect of the JSON importer, whose
  position values change sign with this work (a visible behavior change: `.cyjs` files stop
  rendering upside down). There is no mark on the column: a consumer never has to check one.
  The XGMML exporter, the CX2 exporter and the JSON exporter's `cytoscape` dialect write `-y`
  again, so a file read and written back has its original coordinates (at `f32` precision, as
  above). A y of 0 is stored as 0, never -0. `z` is never flipped. A second view's coordinates go
  into `position@<n>` columns (n = 2, 3, ...), flipped the same way, with `origin.id` the view id
  and no role (one column per role), so nothing is dropped.
- Cytoscape's `z` (`NODE_Z_LOCATION`, a stacking order: WikiPathways files carry values near 32768) is an `f64` node column `z` with `origin.namespace: "cytoscape"`. The option
  `zAs: "column" | "position"` (default `"column"`) puts it into the position instead, for a
  producer that means depth.
- Unknown aspects, app data and anything else without a snapshot slot is kept under the format's
  `meta.extra` key (`xgmml`, `cx`, `cx2`, `cytoscape`, `obo`, `obographs`) verbatim, so nothing is
  dropped and an exporter can write it back. Where something cannot be kept (a session's app
  folders, custom-graphics image bytes, equation results) one warning says what was skipped.
- The cancellation signal is checked every 64 elements, as the package rule requires.

### 1.1 XGMML (`@graphty/graph-io/xgmml`)

Exports: `xgmmlImporter`, `xgmmlExporter`, `XgmmlImportOptions`, `XgmmlExportOptions`,
`XGMML_ISSUE`, `XGMML_LOSS`. Format name `"xgmml"`, extensions `.xgmml` and `.xml` (never `.gr`,
which DIMACS owns), MIME types `application/xgmml`, `text/xgmml`, `text/xgmml+xml`.

**Exporter: yes.** XGMML is the file Cytoscape Desktop opens with every attribute type intact,
which neither GraphML nor GEXF gives a Cytoscape user, and the writer is small next to the
existing XML writers. It writes the Cytoscape 3.x dialect (`research-xgmml.md` 4.7), so Cytoscape
3.x reads it without loss.

**Reading.** One reader covers the five dialects of `research-xgmml.md` section 2: the 1.0 draft,
the Cytoscape 2.x export, the 3.x export, and the two session files. It is a single pass over the
shared XML tokenizer; forward references (`xlink:href`, an edge before its nodes) are held as id
lists and resolved when the outermost `</graph>` closes, as Cytoscape does.

| XGMML                                                                                                                                                                                                                                                              | Snapshot                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node/@id`                                                                                                                                                                                                                                                         | node id (string). Missing: the `label` is the id with `W_XGMML_ID_FROM_LABEL`; missing both: `E_MISSING_ID`, the node and its subtree skipped                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `node/@label` (else `@name`)                                                                                                                                                                                                                                       | `label` column, role `label`; `@name` beside a label is a `name` column                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `node/@weight`, other node XML attributes                                                                                                                                                                                                                          | string columns by the 5.1 text grammar, under the attribute's name                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `edge/@source`, `@target`                                                                                                                                                                                                                                          | endpoints. Unresolved at the end: `E_UNKNOWN_NODE` (edge skipped, enforced by the importer, 1.0.2) unless `addMissingNodes: true`. Missing: `E_MISSING_ENDPOINT`, unless the Cytoscape label-alias fallback (`"a (pp) b"`, `research-xgmml.md` 3.4) resolves it, which is on by default for files with the `cy` namespace (option `labelAliases`) and counted in `W_XGMML_LABEL_ALIAS`; the alias also fills the `interaction` cell when the edge has none, as Cytoscape does                                                                                                                                                                                                                 |
| `edge/@id`, `@label`                                                                                                                                                                                                                                               | `id` column (role `id`, unique) and `label` column. A repeated id is `E_DUPLICATE_EDGE_ID`, except in a 2.x document with groups, where the 2.x writer repeats meta-edges on purpose: dropped with `W_XGMML_GROUP_DUPLICATE_EDGE`                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `edge/@weight`                                                                                                                                                                                                                                                     | THE weight (role `weight`); `0` is a real weight                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| root `directed` (default `0` by the DTD), `edge/@cy:directed`                                                                                                                                                                                                      | header direction, then per-edge direction through `DirectionResolver`. `true`/`false`/`yes`/`no` accepted with `W_XGMML_BAD_DIRECTED`, anything else falls back to `defaultDirected` with the same warning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `att` with `type` / `cy:type` / `cy:elementType`                                                                                                                                                                                                                   | typed columns by the table of `research-xgmml.md` 4.3: `integer` is `i32` and widens to `f64` with `W_WIDENED` when a value overflows (pre-3.3 Cytoscape wrote Longs as `integer`); `cy:type="Long"` is the declared long rule; booleans accept `1/0/true/false/yes/no` in any case and anything else is `E_BAD_VALUE`; Java-only real forms (`1.0d`, hex floats) are `E_BAD_VALUE`; a real that overflows (`1e400`) is `Infinity` with `W_PRECISION`; a missing `value` is an unset cell. Malformed atts, each `W_XGMML_BAD_ATT` once per kind: a `list` att with a `value` (the value is ignored), a scalar att with child atts (the children are ignored), an att with no `name` (skipped) |
| 2.x `att type="map"`                                                                                                                                                                                                                                               | a `json` record column, under `W_XGMML_RECORD_LIST` like other records                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2.x `node.*` / `edge.*` atts (`node.fillColor`)                                                                                                                                                                                                                    | ordinary columns under their 2.x names, values as written, as Cytoscape 2.x also shows them in its table                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `att type="list"`                                                                                                                                                                                                                                                  | `list` column; element dtype from `cy:elementType`, else from the children; an empty untyped list makes a `list<string>` column with `W_XGMML_EMPTY_LIST_TYPE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| a list whose children have distinct names, a list of lists, foreign XML inside an `att` (RDF)                                                                                                                                                                      | `json` column (record, nested array, or the XML as a string) with `W_XGMML_RECORD_LIST` once                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `cy:hidden` `1`, `true` or `yes` (any case)                                                                                                                                                                                                                        | normal column with `extra.hidden: true`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `cy:equation="1"`                                                                                                                                                                                                                                                  | `string` column holding the formula, `W_EQUATION_AS_TEXT`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `\n` / `\t` two-character escapes in strings                                                                                                                                                                                                                       | decoded only in Cytoscape-dialect files (option `cytoscapeEscapes`, default on when the `cy` namespace is declared), since Cytoscape writes them; kept as written otherwise                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `*.SUID` atts                                                                                                                                                                                                                                                      | kept as typed, `extra.suidReference: true`; never remapped (SUIDs mean nothing outside the session that wrote them)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| graph-level `att`s                                                                                                                                                                                                                                                 | graph table columns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `networkMetadata` RDF                                                                                                                                                                                                                                              | `GraphMeta.name` (if the graph has no label), `description`, `created` (as text: Cytoscape writes no zone); the rest at `meta.extra.xgmml.rdf`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `documentVersion` / `cy:documentVersion`                                                                                                                                                                                                                           | `meta.sourceVersion`; an unparseable value is `W_XGMML_DOCUMENT_VERSION` and the dialect is chosen from the content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| node-nested `<att><graph>` that is a group: any graph in the 1.0 draft dialect (the draft defines it as the node's subgraph), a 2.x node with a `__groupState` att, a 3.x node with `__isGroup` true, and in a `.cys` a node the session's group bookkeeping lists | the node is the `parent` of every node declared in it (role `parent`, reusing the GraphML nested-graph path); a node also referenced from another group's graph by `xlink:href` gets the role `parents` list column. A membership that would close a cycle is dropped with `E_PARENT_CYCLE`; a member `xlink:href` naming no node is `E_UNKNOWN_PARENT`. The nested graph's own `att`s go on the parent node as a `json` column `xgmml.subgraph` (`{id, label, atts}`), so nothing is dropped                                                                                                                                                                                                 |
| every other node-nested `<att><graph>` (Cytoscape 3 writes a nested-network pointer in exactly this shape, `research-xgmml.md` 3.5, and pointers can form cycles, as in `subnetworks.cys`)                                                                         | not containment: the string node column `cytoscape.nestedNetwork` names the graph's `label` (else its id), as the `.cys` reader does; the nested graph's nodes and edges are read as ordinary elements of the document, as Cytoscape reads them                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| a nested graph under the root (a subnetwork)                                                                                                                                                                                                                       | in a generic document, flattened, with membership in a `list<string>` node column `xgmml.networks`; in the session-network dialect see below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `xlink:href` naming nothing, outside a group                                                                                                                                                                                                                       | `W_DANGLING_REFERENCE`; a cross-file `file.xgmml#id` reference is kept as text in `xgmml.networkPointer` with `W_XGMML_CROSS_FILE_REFERENCE` (the `.cys` reader resolves it)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| a nested graph inside an edge's `att`                                                                                                                                                                                                                              | skipped with `W_XGMML_EDGE_NESTED_GRAPH` (no model for it; Cytoscape ignores it silently)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `graphics` x, y, z (or a `<center>` child)                                                                                                                                                                                                                         | `position`, y flipped (section 1.0.2); z by dialect: a coordinate in the 1.0 draft dialect (`sourceDims: 3`), the `z` column in the Cytoscape dialects. In a session view file the `<att name="z">` inside `graphics` duplicates z; it is read as z                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| every other node and edge `graphics` attribute and nested graphics `att`, `lockedVisualProperties`, 2.x `cy:` graphics attributes, edge bends                                                                                                                      | a node or edge `json` column `graphics` (`origin.namespace: "xgmml"`) holding the element's graphics as a record of the names and values as written (nested `att`s and `lockedVisualProperties` included; x, y and z are not repeated), the same shape the GML importer gives GML's `graphics`. Values are never converted; there is no role                                                                                                                                                                                                                                                                                                                                                  |
| 2.x view atts (`backgroundColor`, `GRAPH_VIEW_*`, `NODE_SIZE_LOCKED`) and graph `<graphics>` (`NETWORK_*`)                                                                                                                                                         | graph columns: the atts by their names, the graph `<graphics>` as a graph `json` column `graphics`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

The session-network dialect (root `cy:registered="0"`, which is Cytoscape's internal root
network): `import()` returns the first registered subnetwork and warns `W_MULTIPLE_GRAPHS` with the
number of other registered ones; `importAll()` returns every registered subnetwork, each resolving
its `xlink:href` members against declarations anywhere in the file. Elements declared only at the
root (group meta-edges) belong to no visible network and are counted in
`W_XGMML_ROOT_ONLY_ELEMENTS`. A session view file (`cy:view="1"`) on its own is
`E_XGMML_VIEW_DOCUMENT`: its ids are view SUIDs and it has no topology. The `.cys` reader uses
the same module's internal view reader to get positions and `graphics` records keyed by
`cy:nodeId`.

XML-level options and repairs (both off by default, each repair warned per occurrence):
`repairBareAmpersands` (Cytoscape's 7-byte lookahead: an `&` not followed by `;` within 7 bytes is
read as `&amp;`, `W_XGMML_AMPERSAND_REPAIRED`) and `pairSurrogateReferences` (two surrogate
character references `&#xd83d;&#xde00;`, which the Cytoscape writer emits and XML 1.0 forbids,
are joined into one character, `W_XGMML_SURROGATE_PAIRED`; a lone surrogate stays fatal). Both
need hooks in `common/xml.ts`, which today has none; the hooks are options of the tokenizer, off
for GEXF and GraphML.

A root `graph` with no XGMML namespace and no DOCTYPE is read with `W_XGMML_NO_NAMESPACE`.
Unknown elements are skipped with their subtree (`W_UNKNOWN_ELEMENT` once per name). A
document whose root is not `graph` (an XHTML page embedding an `xgmml:graph`) is `E_NO_GRAPH`;
its fixture is marked `oracleDisagrees`, because Cytoscape finds the embedded graph. Cytoscape
descends into unknown wrappers instead; the fixture marks the difference.

**Options** (`XgmmlImportOptions`): `labelAliases`, `cytoscapeEscapes`, `repairBareAmpersands`,
`pairSurrogateReferences`, `zAs`, `graphIndex`, `graphName`, plus the common ones (format
defaults: `ids: "keep"`, `defaultDirected: false`, `addMissingNodes: false`, `weightFrom:
"weight"`).

**Sniffing.** 0.95 for a root `graph` element in the XGMML namespace or a DOCTYPE naming
`xgmml.dtd` (Cytoscape's own file filter tests the same two things); 0.5 for a root local name
`graph` without either. GraphML's and GEXF's roots are `graphml` and `gexf`, so the three never
compete on content. A `cy:view="1"` root still scores 0.95, so the failure says "session view
file" rather than "unknown format".

**XGMML_ISSUE (format-specific)**, by category:

- parse-error: `W_XGMML_BAD_ATT`, `W_XGMML_AMPERSAND_REPAIRED`, `W_XGMML_SURROGATE_PAIRED`;
- validation-error: `W_XGMML_ID_FROM_LABEL`, `W_XGMML_BAD_DIRECTED`, `W_XGMML_DOCUMENT_VERSION`,
  `W_XGMML_NO_NAMESPACE`, `E_XGMML_VIEW_DOCUMENT` (fatal);
- coercion: `W_XGMML_LABEL_ALIAS`, `W_XGMML_EMPTY_LIST_TYPE`, `W_XGMML_RECORD_LIST`;
- merged: `W_XGMML_GROUP_DUPLICATE_EDGE`;
- unsupported: `W_XGMML_CROSS_FILE_REFERENCE`, `W_XGMML_EDGE_NESTED_GRAPH`,
  `W_XGMML_ROOT_ONLY_ELEMENTS`.

**Exporter.** Writes `cy:documentVersion="3.0"`, the root `directed` from the header and
`cy:directed` on every edge (Cytoscape ignores the root attribute), `type` plus `cy:type` (and
`cy:elementType`) on every `att`, positions as `graphics x y z` with y negated back to screen
coordinates (1.0.2), a `graphics` json column that the XGMML importer wrote (`origin.namespace:
"xgmml"`) back as the element's graphics attributes and nested `att`s, `parent` as a node-nested
graph and further `parents` as `xlink:href` references, and newline and tab as character references
(`&#10;`) unless the option `cytoscapeEscapes: true` asks for Cytoscape's two-character form. Export
writes the graph's structure and its columns; it writes no styles (it has none to write).
Capabilities (all 16 fields of `ExportCapabilities`): `mixedDirection` true, `multiEdges` true,
`selfLoops` true, `edgeIds` "optional", `idCharset` "any", `dtypes` `string dict f64 f32 i32 u32
u8 bool list`, `components` false (the position is written through `positions`; any other stride
column is reported by the generic check), `lists` true, `json` false, `defaults` false, `options`
false, `hierarchy` true, `temporal` "none", `graphAttributes` true, `positions` true, `viz` false
(graphty's color, size and shape roles are not translated into Cytoscape graphics; the role notes
say so). **XGMML_LOSS**: `W_XGMML_JSON_AS_STRING` (json and nested list columns are written as
strings), `W_XGMML_WIDENED_TYPE` (`f32` as Double, `u32` above i32 as Long, `u8` as Integer, `dict`
as String), plus the shared `xmlIllegalTextNotes`, `W_TEMPORAL_DROPPED`,
`W_TEMPORAL_TEXT_DROPPED` and the role notes.

### 1.2 CX version 1 (`@graphty/graph-io/cx`)

Exports: `cxImporter`, `cxExporter`, `CxImportOptions`, `CxExportOptions`, `CX_ISSUE`, `CX_LOSS`,
`CX_CAPABILITIES`. Format name `"cx"`, extension `.cx`, MIME type `application/json` (NDEx serves it
so; there is no registered CX type).

**Exporter: yes** (reversing the first decision here, at the owner's request to finish the
exporters). It writes the NDEx form: one network, at most one view, no `cySubNetworks`, aspects in
the order Cytoscape and NDEx write them, values as JSON strings with `d` and a `cyTableColumn` entry
per column. Node ids follow the CX2 exporter's rule (shared in `common/cx-export.ts`, with
`sanitizeIds: "mangle"` keeping the original in `graphty:originalId`, which the CX importer now
restores under `restoreMangledIds`); `parent` / `parents` become `cyGroups` with computed internal
and external edge lists; the `cx.bypass` columns become per-element `cyVisualProperties`; the
provenance a CX import made (`cx:citations`, `cx:supports`, the link columns, `functionTerm`,
`reifiedEdge`) is written back; and the style rules and unknown aspects a CX import kept are
written back for its own subnetwork only (view references rewritten to 0), never the collection's
`cySubNetworks`, `cyNetworkRelations`, `cyViews` or `CX Element ID`. NaN and the infinities are
spelled in double attributes; a non-finite position or a NaN weight is not written
(`W_NONFINITE_AS_NULL`). The loss notes are `CX_LOSS`.

**Mapping** (`research-cx.md` section 6 is the full table; the decisions):

- Nodes: `@id` is the id; `n` is a `name` column with role `label`, `r` a `represents` column.
  A `name` node attribute is the same column as `n`; when they differ, the attribute wins with
  `W_DUPLICATE_ATTRIBUTE`.
- Edges: always directed (CX has no undirected edge); `defaultDirected` is reported
  `W_OPTION_IGNORED`. `@id` is the `id` column (role `id`), `i` an `interaction` column (string or
  `dict` by cardinality; no role, as in the JSON importer).
- `nodeAttributes` / `edgeAttributes` / `networkAttributes`: typed columns by the CX data-type
  table (`research-cx.md` 3.3), with Cytoscape's value rule: `""` and `"null"` (any case) are unset,
  `"NaN"` is NaN in a double column, any other value that does not parse is `E_BAD_VALUE`; native
  JSON numbers and booleans are accepted; `v: null` is an unset cell. A conflicting `d` for one
  name widens by 5.1 with `W_WIDENED`. `cyTableColumn` sets a column's type when it arrives before
  the column's first value (the order Cytoscape writes), and declares columns no element fills;
  arriving later, it is compared with the column, and a type that needs a wider dtype widens it
  with `W_WIDENED`. A `@context` network attribute (a JSON object written as a string) is an
  ordinary string column, as written; the `@context` aspect is the parsed form.
- Subnetwork scope `s`: a subnetwork's snapshot takes the values whose `s` is that subnetwork's
  id or absent, the scoped one winning when both exist (Cytoscape's local table over the shared
  one). In a one-subnetwork file this fills one column from both.
- Collections (several `cySubNetworks`): `importAll()` returns one snapshot per subnetwork in
  `cyNetworkRelations` order, which is what Cytoscape does; `import()` reads the one `graphIndex`
  or `graphName` picks (default the first) and warns `W_MULTIPLE_GRAPHS`. A subnetwork listing
  `"all"` takes every node or edge.
- Views: each subnetwork's view is the `cyNetworkRelations` entry `{p: <subnetwork>, c: <view>,
r: "view"}` (else the `cyViews` entry whose `s` is the subnetwork). A subnetwork takes its
  positions (y flipped, 1.0.2) from the `cartesianLayout` entries whose `view` is its view, its
  per-element visual values from the `cyVisualProperties` entries of that view, and gets no
  position column when it has no view.
  In a one-subnetwork file with no relations, the first view is its view. `10_networks_new.cx`
  (ten subnetworks, each with its own view) is the fixture. `z` goes to the `z` column.
- `cyGroups`: the group node is an ordinary node; members get `parent` (or `parents` when a node
  is in several groups), `collapsed` is a `bool` column on the group node, the internal and
  external edge lists go to `meta.extra.cx.groups`. A group whose id is not a node gets a node,
  with `W_CX_GROUP_NODE_ADDED`; a member naming no node is `E_UNKNOWN_PARENT`. A membership that
  would close a cycle is dropped with the shared `E_PARENT_CYCLE`.
- `cyVisualProperties` (and the old `visualProperties`), split by `properties_of`:
    - `nodes` and `edges` entries (per-element bypasses, `applies_to` an element id): one node or
      edge column per visual property id, named as written (`NODE_FILL_COLOR`),
      `origin.namespace: "cx.bypass"`, values as written (`string`, or `dict` by cardinality), unset for elements with
      no bypass for that property. A name taken by an attribute column is renamed by the
      `declareResolved` rule (`W_COLUMN_RENAMED`). An entry naming no element is
      `W_DANGLING_REFERENCE`;
    - `network` entries (the view's background, zoom and center): graph columns, one per property,
      the same way;
    - `nodes:default`, `edges:default`, their `mappings` and `dependencies`: style rules, not
      applied. They stay in `meta.extra.cx` verbatim with the other kept aspects, and the import
      records `W_STYLES_NOT_IMPORTED` once (section 2). Mapping definitions are not parsed.
- Provenance aspects: `citations` and `supports` become extension tables `cx:citations` and
  `cx:supports` (design 5.10); `nodeCitations` / `edgeCitations` / `nodeSupports` /
  `edgeSupports` become `list` columns `citations` / `supports` of the referenced ids;
  `functionTerms` a `json` node column `functionTerm`; `reifiedEdges` a `u32` node column
  `reifiedEdge` with `refersTo: "edge"`.
- `ndexStatus`, `provenanceHistory`, the `@context` aspect, `cyHiddenAttributes`,
  `cyNetworkRelations`, `cyViews`, `CX Element ID`, `numberVerification`, `metaData` and every
  unknown aspect: `meta.extra.cx` verbatim. Unknown aspects are legal and kept, so they raise no
  issue. An aspect whose value is one object instead of an array (the specification's own
  `ndexStatus` example) is read as a one-element array, with no issue.

**Errors** follow `research-cx.md` section 4, with these choices: a duplicate node id is
`W_DUPLICATE_NODE` (first wins, attributes merge); a duplicate edge id is `E_DUPLICATE_EDGE_ID`;
an edge endpoint naming no node is `E_UNKNOWN_NODE` (format default `addMissingNodes: false`; NDEx
rejects such files and Cytoscape crashes on them); an attribute, layout or group entry naming no
element is `W_DANGLING_REFERENCE` (a group member naming no node is `E_UNKNOWN_PARENT`); a missing `metaData` entry for a present aspect is not an issue
(the aspect is read); `numberVerification` other than 2^48 - 1 is `W_CX_NUMBER_VERIFICATION`; an
old aspect name is read under its new name with `W_CX_OLD_ASPECT_NAME`; a missing `status` is
legal in CX1 (no issue); CX2 content under a `.cx` name is fatal `E_CX_NOT_CX` naming CX2 (the
registry will normally have routed it to the CX2 importer already).

**Options** (`CxImportOptions`): `graphIndex`, `graphName`, `zAs`, plus the common ones (format
defaults `ids: "keep"`, `addMissingNodes: false`, `weightFrom: null`: CX has no weight
convention, and a plain `weight` attribute follows the shared rule).

**Sniffing.** 0.95 when the head is `[` then an object whose first key is `numberVerification` or
`metaData` (Cytoscape's file filter tests the same), 0.7 when the first key is another known CX1
aspect name.

The JSON importer's sniff answers 0.9 today for any CX1 or CX2 file, because a CX head contains
`"nodes"` and `"edges"`. It changes to the rule `sniffJsonDialect()` already applies: a top-level
array is a Cytoscape.js elements array only when its first object has a `data` key, so for a
top-level array whose first object has no `data` key the JSON sniff answers at most 0.3. That
covers CX1 (`{"numberVerification": [...]}`), CX2 (`{"CXVersion": "2.0", "hasFragments": false}`,
two keys) and keeps `[{"data": {...}}]`, a valid `.cyjs` elements array, at its current score (a
regression fixture pins it). With the change, a CX2 file named `.json` scores 0.3 plus the
extension bonus for JSON against 0.97 for CX2, so CX2 takes it.

**CX_ISSUE (format-specific)**, by category: validation-error `E_CX_NOT_CX` (fatal),
`W_CX_NUMBER_VERIFICATION`; coercion `W_CX_OLD_ASPECT_NAME`, `W_CX_GROUP_NODE_ADDED`.

#### 1.2.5 Reading large CX documents

NDEx hosts CX files of 1.5 GB and 5.8 GB, larger than the longest string V8 can hold (about
2^29 characters), so a reader that decodes the document to one string cannot read them. CX was
designed for streaming: the scanner in `json-elements.ts` reads `textChunks`, tracks only
string, escape and nesting state, slices each aspect element's text as soon as its closing brace
arrives and parses that one element with `JSON.parse` (after the exact-integer rewrite). It checks
`throwIfAborted` every 64 elements and calls `onProgress` with the bytes consumed. CX1 and CX2 both
read through it from the first release.

Nothing the reader decides needs the whole document (ids are typed per id, 1.0.2; a late
`cyTableColumn` widens instead of retyping), but both formats allow aspects in an order where a
value arrives before what it depends on. Those values are **buffered** as parsed elements until
the dependency arrives, or the document ends:

- CX1 `nodeAttributes`, `edgeAttributes` and `cartesianLayout` entries for an element not yet
  declared (an attribute aspect before `nodes`). At the end, entries whose element never came are
  `W_DANGLING_REFERENCE`.
- CX1 nodes, edges and scoped attributes of a collection, until `cySubNetworks` and
  `cyNetworkRelations` say which subnetwork and view they belong to. A file is treated as a
  collection when its pre-`metaData` gives `cySubNetworks` an `elementCount` above 1, or when it
  has no pre-`metaData` and has not yet shown its `cySubNetworks`.
- CX2 nodes and edges that arrive before `attributeDeclarations` (which section 1.3 accepts with
  `W_ASPECT_ORDER`), until the declarations type their values.
- Edges of both formats, as `(id, source, target)` triples plus their parsed attribute values,
  until their endpoints are known, as every graph-io importer that enforces `addMissingNodes`
  does.

So the memory bound is: the current element, plus the buffered elements above. In a file written
in the order the specifications recommend, which is the order every surveyed writer uses for a
single network, only the edge triples are buffered. A collection without pre-`metaData`, or a file
with every attribute aspect before `nodes`, buffers up to the parsed form of those aspects, and
`W_ASPECT_ORDER` says so once. An authored fixture puts `nodeAttributes` and `cartesianLayout`
before `nodes` (CX1) and `attributeDeclarations` after `nodes` (CX2), and another has an id above
2^53 after 1,000 safe ones.

The JSON importer (and with it the `obographs` dialect) keeps its whole-document parse and fails
with `E_TOO_LARGE` above the string limit. Moving it onto the same scanner is deferred: it is not
part of this work, because no Gene Ontology file needs it (section 7.1).

### 1.3 CX2 (`@graphty/graph-io/cx2`)

Exports: `cx2Importer`, `cx2Exporter`, `Cx2ImportOptions`, `Cx2ExportOptions`, `CX2_ISSUE`,
`CX2_LOSS`. Format name `"cx2"`, extension `.cx2` (never `.cx`), MIME type `application/json`.

**Exporter: yes.** CX2 is what NDEx and Cytoscape Web read and write today, graphty issue #307 asks
for an NDEx round trip with attribute types preserved.

**Mapping** (`research-cx2.md` section 5; the decisions):

- Topology as CX1: always directed, integer ids, `id` edge column, multigraph. No nested graphs:
  CX2 has none (Cytoscape flattens groups when it writes CX2), and `importAll()` is not
  implemented because a CX2 file is one network. HCX hierarchies (`HCX::members`) are ordinary
  `list` attributes: they point into another file.
- Declarations: each of the ten types to its dtype (1.0.2); the column name is the FULL name and
  `origin.id` the alias, so the exporter restores it; a declared default becomes `meta.default`
  with unset rows, so `value()` returns the default as the spec requires, and falsy defaults
  (`0`, `false`, `""`) apply (ndex2 ignores them; the expectation overrules it). A declaration
  with no `d` is String (the Java reader's rule). The Python spellings ndex2 writes (`str`, `int`,
  `bool`, `float`) are read as `string`, `integer`, `boolean`, `double`, with no issue. Nodes and
  edges that arrive before `attributeDeclarations` are buffered until it arrives (1.2.5), so
  out-of-order declarations still resolve (`W_ASPECT_ORDER`).
- Ids: the CX id rule of 1.0.2 (string ids that spell an integer, `1` and `"1"` as one node).
  A key on a node or edge other than `id`, `s`, `t`, `v`, `x`, `y`, `z` is kept nowhere and
  reported `W_UNKNOWN_ELEMENT` once per key name.
- `name` is the `label` role; `represents`, `alias`, `interaction` keep their names with no role.
- `x`, `y` on the node: position, y flipped (1.0.2); `z`: the `z` column. Partial layouts give
  unset rows with `W_CX2_PARTIAL_LAYOUT` once; `x` without `y` drops that node's coordinates under
  the same code. A CX1 `cartesianLayout` aspect inside a CX2 file is used when nodes carry no
  coordinates, else kept and warned (`W_CX2_LEGACY_LAYOUT`). A node's own `x` / `y` win over a
  `NODE_X_LOCATION` / `NODE_Y_LOCATION` bypass; the bypass stays in its column as written.
- `nodeBypasses`, `edgeBypasses`: one node or edge column per visual property id, named as written,
  `origin.namespace: "cx2.bypass"`, holding CX2's JSON values as written: a property whose values
  are all numbers is `f64`, all booleans `bool`, all strings `string` or `dict`, anything else
  (font and label-position objects, mixed types) `json`. A name taken by a declared attribute is
  renamed by the `declareResolved` rule. A bypass for an unknown id is `W_DANGLING_REFERENCE`.
- `visualProperties` (defaults and mappings) and `visualEditorProperties` (dependencies, in both
  the spec's flat form and the `{"properties": {...}}` wrapper every real writer uses): style
  rules, not applied. They are kept at `meta.extra.cx2.opaque` verbatim like the other opaque
  aspects below, and the import records `W_STYLES_NOT_IMPORTED` once (section 2).
- `networkAttributes`: graph table columns; `name` and `description` also fill `GraphMeta`.
- Opaque aspects (`cyTableColumn`, `cyHiddenAttributes`, `citations`, `filterWidgets`, ...):
  `meta.extra.cx2.opaque[<name>]` verbatim, no issue. `metaData` counts are checked
  (`W_COUNT_MISMATCH`); `status` drives `E_STATUS_FAILED`, `W_STATUS_WARNING` and
  `E_CX2_NO_STATUS`. A `status` block of the wrong shape (not one object with a boolean
  `success`) counts as missing: `E_CX2_NO_STATUS`, whose message says the block was malformed.

**Errors** follow `research-cx2.md` section 4 and its recommended column, with the shared codes
substituted: a value that does not match its declared type (a string in a double column, `3.7` in
an integer column, `"true"` in a boolean column) is `E_BAD_VALUE` for that cell, never a silent
truncation or `false`; a dangling edge endpoint is `E_UNKNOWN_NODE` (format default
`addMissingNodes: false`; `true` reproduces Cytoscape Desktop, which creates the node); a missing
`status` is `E_CX2_NO_STATUS` (error severity, data kept, because the JSON closed cleanly).

**Options** (`Cx2ImportOptions`): `zAs`, plus the common ones (defaults as CX1).

**Sniffing.** 0.97 when the first array member is an object with a `CXVersion` key in any key
order (`{"hasFragments":false,"CXVersion":"2.0"}` is the Java writer's order). CX1 never has that
key, and `[]` stays with the JSON importer.

**CX2_ISSUE (format-specific)**, by category:

- validation-error: `E_CX2_NO_DESCRIPTOR` (fatal), `E_CX2_VERSION` (fatal; a major other than 2; a
  `"1.x"` value says the file is CX1), `W_CX2_VERSION` (2.x with x > 0, read), `E_CX2_NO_STATUS`,
  `W_CX2_UNDECLARED_FRAGMENTS`, `E_CX2_DECLARATION_CONFLICT`, `W_CX2_UNDECLARED_ATTRIBUTE`,
  `W_CX2_RESERVED_KEY`, `E_CX2_ALIAS_CONFLICT`, `W_CX2_NETWORK_DECLARATION`,
  `W_CX2_EXTRA_ELEMENTS`;
- missing-value: `W_CX2_PARTIAL_LAYOUT`;
- coercion: `W_CX2_ALIAS_BYPASSED`;
- unsupported: `W_CX2_LEGACY_LAYOUT`.

**Exporter.** Writes the descriptor, pre-`metaData`, one `attributeDeclarations` block (aliases
from `origin.id`, defaults from `meta.default`), `networkAttributes`, `nodes` (with `x`/`y` from
the position, y negated back to screen coordinates, and `z` from the `z` column), `edges`, the
`cx2.bypass` columns back as `nodeBypasses` / `edgeBypasses`, the kept opaque aspects verbatim
(which returns a CX2 file's own `visualProperties` and `visualEditorProperties`), and `status`.
Per-element visual columns read from other formats (XGMML `graphics`, CX1 `cx.bypass`) are written
as ordinary attributes: turning Cytoscape's text value forms into CX2's JSON forms is style work,
issue #706. Capabilities (all 16 fields): `mixedDirection` false,
`multiEdges` true, `selfLoops` true, `edgeIds` "required" (generated when absent), `idCharset`
"integer", `dtypes` `string dict f64 f32 i32 u32 u8 bool list`, `components` false, `lists` true,
`json` false, `defaults` true, `options` false, `hierarchy` false, `temporal` "none",
`graphAttributes` true, `positions` true, `viz` false.

**Ids.** CX2 node ids are integers, so a graph read from OBO, GraphML or any string-id format
cannot be written under the default `sanitizeIds: "error"` (it throws `E_INVALID_ID`, as GML
does). Under `"mangle"` the exporter keeps every node id that is already a non-negative safe
integer, gives every other node the next unused integer in node order, and writes the original id
as a declared String node attribute `graphty:originalId` (the GML exporter's convention, through
`common/export.ts`). The CX2 importer, under `restoreMangledIds` (default true), turns that
attribute back into the node id and drops the column, so a round trip through CX2 keeps string
ids. The default stays `"error"` because the package rule is that an exporter never renames a node
unasked; graphty-element's CX2 writer descriptor sets `sanitizeIds: "mangle"` as its default
(section 5), so a user exporting an ontology to NDEx gets a file.
**CX2_LOSS**: `W_CX2_UNDIRECTED_AS_DIRECTED` (every edge is written directed; a mutual pair is the
shared `W_MUTUAL_EXPANDED`), `W_CX2_JSON_AS_STRING`, `W_CX2_NONFINITE_AS_NULL` (NaN and the
infinities cannot be written, as NDEx does), plus `E_INVALID_ID` for non-integer node ids under the default `sanitizeIds: "error"`,
the shared `W_HIERARCHY_DROPPED`, `W_TEMPORAL_DROPPED` and the role notes.

### 1.4 Cytoscape sessions (`@graphty/graph-io/cys`)

Exports: `cysImporter`, `CysImportOptions`, `CYS_ISSUE`. Format name `"cys"`, extension `.cys`,
MIME type `application/zip` (Cytoscape declares none). Read-only; section 3 has the design.

**Exporter: no.** A session is Cytoscape's private save file: writing one means synthesizing
SUIDs, root networks, table namespaces, view files and a zip writer, to produce a file whose only
reader is Cytoscape, which opens the CX2 and XGMML graph-io already writes. The cost is large and
the gain is none.

### 1.5 OBO (`@graphty/graph-io/obo`)

Exports: `oboImporter`, `OboImportOptions`, `OBO_ISSUE`. Format name `"obo"`, extension `.obo`,
MIME types `text/obo`, `application/obo` (neither is registered; both are seen). Section 4 has the
mapping.

**Exporter: no.** OBO's value is the published ontology itself, which users download from the
GO; writing an edited ontology back is an editor's job (Protege, ROBOT), and an OBO writer would
have to drop every column, position and edge attribute that has no OBO tag. Graphs read from OBO
export losslessly enough through GraphML or graph-format's own container.

**Sniffing.** After skipping a BOM, blank lines and `!` comment lines: 0.9 when the first
significant line is `format-version:` or a `[Term]`, `[Typedef]` or `[Instance]` header (a file
with no header at all starts this way), or when such a header follows `tag: value` lines; 0.4 for
a head of only `tag: value` lines.

### 1.6 OBO Graphs JSON (dialect `"obographs"` of `@graphty/graph-io/json`)

**It joins the JSON reader as a dialect**, not a format of its own: it is a JSON graph document of
nodes and edges like JGF, users meet it as `.json`, and the JSON importer already owns dialect
detection, `graphs[]` handling and `importAll()` over them. Mapping in section 4.6.

The one required change is in `sniffJsonDialect()` (`graph-io/src/formats/json/dialect.ts`),
which today answers `"jgf"` for any top-level `graphs` array, so every OBO Graphs file is
silently misread as JGF. A `graphs[]` document is `"obographs"` when its first graph has, anywhere
in its nodes or edges, an edge with `sub` (or the outdated `subj`) and `obj`, or a `pred` key, or a
node with `lbl`, a `meta` object, or a `type` of `CLASS` / `INDIVIDUAL` / `PROPERTY`; looking only at
the first node and first edge misses graphs with no edges (`obsoletion_example`) and graphs whose
first node has no `lbl` (`nucleus.json`). With `source` / `target` edges or a nodes object (and
none of those keys) it stays `"jgf"`. The head scan for truncated heads looks for the same keys. `"obographs"` is an import-only dialect
(added to `JSON_IMPORT_DIALECTS`, not to the exporter's `JSON_DIALECTS`).

Codes, added to `JSON_ISSUE`: `W_JSON_OBOGRAPHS_SUBJ` (the legacy `subj` key, read as `sub`); the
shared `W_DANGLING_REFERENCE` for an edge endpoint missing from `nodes` (a placeholder node is
made, as for OBO); `W_MULTIPLE_GRAPHS` as for JGF.

### 1.7 Registration

Each format is added the way `graph-io/CLAUDE.md` "Adding a format" says: `scripts/entries.js`,
the `package.json` export (types first), `createRegistry()` and `GRAPH_FORMATS`. Registry order
(the sniffing tie-break): `json, graphml, gexf, csv, gml, dot, pajek, neo4j, xgmml, cx2, cx, obo,
cys`. The new formats come after the existing ones so no existing file changes its answer; the
content scores above make each new format win its own files.

The `GraphImporter` contract gains one optional method (design section 12.4 is amended to match):

```ts
/** One graph of a file that can hold several. */
export interface GraphListing {
    /** The value graphIndex takes to read it. */
    readonly index: number;
    /** The value graphName takes to read it, or null when the graph has no name. */
    readonly name: string | null;
    /** Node and edge counts when the file states them cheaply, else null. */
    readonly nodes: number | null;
    readonly edges: number | null;
}
/** Optional on GraphImporter: list the graphs of an input without importing them. */
listGraphs?(input: ImportInput, options?: Opts & CommonImportOptions): Promise<readonly GraphListing[]>;
// FormatRegistry.listGraphs(input, options?): Promise<readonly GraphListing[] | null>
```

`cysImporter`, `cxImporter`, `xgmmlImporter` (the session-network dialect) and `jsonImporter`
(JGF and OBO Graphs `graphs[]`) implement it: every new format that can hold several graphs. The
registry adds `listGraphs(input, options)`, which sniffs and calls it, and returns `null` for an
importer without it, meaning "this format does not list its graphs; `import()` reads the first".
A fallback that answered one graph would be wrong for DOT and GML files that hold several; they
can implement the method later.

---

## 2. Visual information: style import is issue #706

Cytoscape files carry two kinds of visual information: per-element values (XGMML `graphics`, CX1
`cyVisualProperties` entries for one node or edge, CX2 `nodeBypasses` / `edgeBypasses`, a
session view's graphics) and style rules (defaults, passthrough, discrete and continuous mappings
from columns to visual properties, and dependencies: CX1 `cyVisualProperties` defaults and
mappings, CX2 `visualProperties` and `visualEditorProperties`, a session's `session_vizmap.xml` or
`session_vizmap.props`, and standalone vizmap style files).

graph-io has no style-import model for any format today: GEXF viz values, GML graphics, yEd
graphics and DOT attributes all land as plain columns, and nothing reads style rules. A model
built for Cytoscape alone would fix a contract the other formats would then have to fit, so style
import is its own cross-format piece of work, issue #706. This work adds no presentation record,
no `/vizmap` reader, no style parsing and no graphty-element style conversion. What each importer
does instead:

| Importer       | Per-element visual values                                                                                           | Style rules                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| XGMML          | node, edge and graph `json` column `graphics`, values as written (1.1)                                              | XGMML has none                                                                                  |
| CX1            | one column per visual property id from `nodes` / `edges` / `network` entries, `origin.namespace: "cx.bypass"` (1.2) | kept verbatim in `meta.extra.cx`, not applied; `W_STYLES_NOT_IMPORTED`                          |
| CX2            | one column per visual property id from `nodeBypasses` / `edgeBypasses`, `origin.namespace: "cx2.bypass"` (1.3)      | kept verbatim in `meta.extra.cx2.opaque`, not applied; `W_STYLES_NOT_IMPORTED`                  |
| `.cys`         | the view's `graphics` column, through the XGMML view reader (3.1)                                                   | `session_vizmap.xml` / `session_vizmap.props` not read; `W_STYLES_NOT_IMPORTED` names the entry |
| OBO, obographs | none                                                                                                                | none                                                                                            |

`W_STYLES_NOT_IMPORTED` is the loss code (1.0.1): a warning, category `unsupported`, recorded once
per import, whose message says what was not applied and names issue #706. The per-element columns
carry no roles: deciding that `NODE_FILL_COLOR` is a graphty node color means parsing Cytoscape's
value forms, which is style import too. The columns are ordinary data, so #706 can build on them
without changing what these importers write.

---

## 3. Sessions (`.cys`)

### 3.1 What the importer returns

A session holds several root networks ("collections"), each with registered subnetworks (what
Cytoscape's Network panel lists), tables per subnetwork, views and every style. The unit of
import is the **registered subnetwork**, one snapshot each:

- `importAll()` returns every registered subnetwork (3.x) or every network except `Network Root`
  (2.x), in `apps/org.cytoscape.swing-application/network_list.xml` order when the session has
  it, else in entry order.
- `import()` reads the one `graphIndex` (default 0) or `graphName` (the network's name; an
  ambiguous name is `E_CYS_AMBIGUOUS_NAME` listing the indexes) picks, and warns
  `W_MULTIPLE_GRAPHS` with the number not read.
- `listGraphs()` reads only the central directory, `network_list.xml` and the root `graph`
  elements of the network files, and returns each network's index, name and, for 3.x, node and
  edge counts from its subnetwork's member lists. This is what a picker shows before importing.

Each snapshot carries:

- topology from the network XGMML (shared nodes resolved through `xlink:href`, per-edge
  direction with the default `directed`);
- every column of its `LOCAL_ATTRS` table, joined with the `SHARED_ATTRS` columns the
  `cytables.xml` virtual columns name (a local column of the same name wins; the shared one is
  renamed by the 5.6 rule), and the `HIDDEN` and app-namespace tables as columns with
  `extra.hidden: true` and `origin.namespace` the table namespace, renamed `<name>#<namespace>` on
  a collision;
- the network row as graph columns, and `GraphMeta.name` from it;
- positions (y flipped) and the `graphics` column from the network's first view (further views
  as `position@<n>` columns, section 1.0.2); a network with no view gets no position column;
- `meta.extra.cytoscape`: the session version, the collection (root network) name, the parent
  network, the name of the style the view uses (as text), the group bookkeeping, the list of
  entries not read;
- one `W_STYLES_NOT_IMPORTED` for the session's styles, which are not read (section 2).

Groups: an expanded group's members get `parent` (or `parents`); a collapsed group's members are
not in the subnetwork (Cytoscape removes them; its own tests count 6 nodes for `groups.cys`
where the XGMML holds 8) and are recorded in `meta.extra.cytoscape.groups` with
`W_CYS_COLLAPSED_GROUP`. A nested-network pointer is a string node column
`cytoscape.nestedNetwork` naming the target network; pointers may form cycles, which is why they
are not containment. Equation cells keep their formula (`W_EQUATION_AS_TEXT`).

Cases the session files allow, and what each does:

- an edge of a subnetwork whose endpoint is not in that subnetwork: `E_UNKNOWN_NODE` in that
  subnetwork's snapshot, edge skipped (`addMissingNodes: true` adds the node instead);
- a view naming a network the session lacks: `W_DANGLING_REFERENCE`; the view is skipped;
- two CyCSV rows with the same key: the first wins, `W_CYS_TABLE_ROW`;
- a virtual column whose source table or column is missing, or whose sources form a cycle: the
  column is skipped with `E_CYS_TABLE`. LOCAL and SHARED columns with one name and different
  types are the case above: the local one keeps the name, the shared one is renamed;
- a `<major>.<minor>.<patch>.version` marker with a major above 3: `E_CYS_VERSION`, fatal, naming
  the version;
- 2.x selected and hidden state (from `cysession.xml`): `bool` node and edge columns
  `cytoscape.selected` and `cytoscape.hidden`, `origin.namespace: "cytoscape"`, unset meaning
  false. In 3.x, `selected` is an ordinary column of the default table and comes through as one.

Not imported, reported once by `W_CYS_ENTRY_SKIPPED` with the entry names: `apps/*`, global
tables, properties and bookmarks, the thumbnail, and custom-graphics image bytes (`graphics`
values naming an image are kept; the bytes are not). The style entries are reported by
`W_STYLES_NOT_IMPORTED` instead.

### 3.2 Reading order

3.x (`3.0.0.version` present): (1) the central directory, with the root folder stripped and
`__MACOSX/`, `.DS_Store` and directory entries ignored; (2) `network_list.xml` for the order;
(3) each `networks/*.xgmml` through the XGMML reader's session mode; (4) `tables/cytables.xml`;
(5) each `.cytable` for the networks being imported, with the CyCSV rules of
`research-session-and-style.md` 2.4 (schema 0 without a version line and schema 1; the empty
String cell is `""`, any other empty cell unset; list cells split on newlines; a cell that does
not parse is `E_BAD_VALUE`, where Cytoscape silently nulls it); (6) each view of those networks.
`session_vizmap.xml` is never inflated (section 2). Entries are inflated one at a time, only when
needed, so importing one network of a large session inflates only that network's files.

2.x (no marker, `cysession.xml` present): the network tree from `cysession.xml`, one full XGMML
per network (Cytoscape 2.x dialect, with attributes and graphics inline), selection and hidden
state from `cysession.xml`; `session_vizmap.props` is not read. The 2011 3.0 pre-release layout
(no marker, `cysession.xml` with `documentVersion="3.0"`) is `E_CYS_VERSION` naming it, as current
Cytoscape cannot read it either.

### 3.3 Zip reading with no dependency (`src/common/zip.ts`)

About 200 lines, following APPNOTE (https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT):

- **Buffer, then read the central directory.** Every Cytoscape-written entry uses a data
  descriptor and has zero sizes in its local header (21 of 21 surveyed sessions), so sizes come
  from the central directory and the whole file must be in memory. `readBytes()` collects the
  input; a string input is `E_CYS_NOT_ZIP`.
- Find the end-of-central-directory record in the last 65,557 bytes (a comment can be 65,535
  bytes); follow the zip64 locator and the `0x0001` extra field when present; reject offsets
  beyond the file (`E_CYS_CORRUPT`); tolerate data prepended before the archive by computing the
  shift from the directory's expected and actual positions.
- For an entry: read its local header for the true name and extra lengths (they can differ from
  the central directory's), then slice exactly `compressedSize` bytes.
- **Inflating without a dependency, on every supported runtime.** Method 8 (deflate) is inflated
  by wrapping the raw deflate bytes in a gzip member (a 10-byte header, the bytes, the CRC-32 and
  the size from the central directory, little endian) and passing it to
  `DecompressionStream("gzip")`. `"gzip"` exists in every runtime graph-io supports (Node 18,
  matching the package's `engines` floor of 18.19.0; Chrome 80, Firefox 113, Safari 16.4), where
  `"deflate-raw"` needs Node 20.12 / 21.2, so this avoids raising `engines`. The gzip decoder
  checks the CRC and the length, which catches corrupt data and gives exactly-sized input, so the
  platforms' different handling of bytes after the deflate stream never arises. Method 0
  (stored) is sliced and checked against a small CRC-32 table. A runtime without
  `DecompressionStream` gets `E_CYS_UNSUPPORTED` saying so.
- Refused with `E_CYS_UNSUPPORTED` naming the feature: encryption (flag bit 0, method 99), and
  any method other than 0 and 8 (deflate64, bzip2, LZMA, zstd appear in archives other tools
  re-zipped).
- Names: decoded by `decodeEntryName()` from `common/input.ts` (bytes are decoded only there):
  UTF-8 (flag bit 11, or valid UTF-8 without it), else windows-1252 (WHATWG has no CP437; session
  entry names are URL-encoded ASCII in practice), then URL-decoded per Cytoscape's `SessionUtil`.
  Names are matching keys only and are never used as paths.
- **Cancellation and progress.** One entry can be 2 GiB, so the inflate loop (per chunk read from
  the `DecompressionStream`) and the stored-entry CRC loop (per 1 MiB) call `throwIfAborted` and
  `onProgress` (bytes inflated so far against the central directory's total).
- **Bomb limits**: option `maxUncompressedBytes` (default 2 GiB in total) and a per-entry ratio
  limit of 1000:1 (real sessions reach 30:1), checked while inflating; exceeding either is
  `E_TOO_LARGE`.
- Duplicate entry names: the first wins with `W_CYS_DUPLICATE_ENTRY`.

**Options** (`CysImportOptions`): `graphIndex`, `graphName`, `zAs`, `maxUncompressedBytes`, plus
the common ones (format defaults: `ids: "keep"`, `addMissingNodes: false`, `weightFrom: null`).

**Sniffing.** 0.95 when the head starts with `PK\x03\x04` and the first local header's name
contains `CytoscapeSession` or ends in `.version` or `cysession.xml`; 0 for any other zip, so an
`.xlsx`, a `.docx` or a zipped GraphML gets "unknown format" rather than `E_CYS_NOT_SESSION`. A
file named `.cys` still reaches the importer through its extension.

**CYS_ISSUE (format-specific)**, by category:

- parse-error: `E_CYS_NOT_ZIP` (fatal), `E_CYS_CORRUPT` (fatal), `E_CYS_TABLE` (a table, or a
  virtual column, that cannot be read at all: unknown CyCSV version, unknown column class, missing
  or cyclic source; skipped), `W_CYS_TABLE_ROW` (a row with too few or too many cells, a repeated
  key, or a key matching no element);
- validation-error: `E_CYS_NOT_SESSION` (fatal), `E_CYS_AMBIGUOUS_NAME` (fatal);
- unsupported: `E_CYS_UNSUPPORTED` (fatal), `E_CYS_VERSION` (fatal), `W_CYS_COLLAPSED_GROUP`,
  `W_CYS_ENTRY_SKIPPED`;
- merged: `W_CYS_DUPLICATE_ENTRY`;
  plus `TOO_LARGE` (`E_TOO_LARGE`), the shared `W_STYLES_NOT_IMPORTED`, and the XGMML codes it
  relays from the files inside, with the entry name in the message.

---

## 4. OBO

### 4.1 Reading

A line reader over `LineReader` (`common/input.ts`), streaming: the frame being built is the only
buffered state, and edges are held as id triples until the end, because whether a target is
declared needs the whole id set. It accepts the union of OBO 1.0, 1.2 and 1.4 and never branches
on the declared `format-version` except to report it (`research-obo.md` 1 and 3: GO 2026-07-26
says 1.2 and uses 1.4 tags; 36 of 101 surveyed files declare no version). Lexical rules are those
of `research-obo.md` 4.1: the first unescaped colon separates tag and value, ` ! comment` is
stripped outside quotes, full-line `!` comments are ignored anywhere, a trailing `{...}` qualifier
block is recognized only when it closes at the end of the value, escapes as the guides define
them (`\W` is a space, an unknown `\x` is `x`), backslash-newline continuation accepted with
`W_OBO_DEPRECATED_SYNTAX`. `\W` as a space disagrees with fastobo (the oracle) and the 1.4 BNF,
which read the letter W; the fixtures that contain it are marked `oracleDisagrees`, because the
files' writers followed the guides. The 1.4 grammar counts form feed (U+000C) as a newline;
`LineReader` does not, so the OBO reader splits each line it receives on form feed itself.

### 4.2 Nodes, edges and columns

| OBO                                                                                                     | Snapshot                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[Term]` and `[Instance]` frames                                                                        | nodes; id as written (`GO:0008150` is a string; `ids: "keep"`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| a target named by `is_a` / `relationship` but never declared                                            | the importer itself (edges are held to the end of the file) makes a placeholder node with the `bool` column `graphty.placeholder` set, and records one `W_DANGLING_REFERENCE` with the count (the guide's recommended behavior; ontologies point into their imports this way). Under `addMissingNodes: false` the edge is dropped instead, under the same code. When the target is another term's `alt_id`, the placeholder is still made (it is what OWL and OBO Graphs produce: a deprecated stand-in node) and the warning names the term it is an alt_id of; resolving it onto the primary term is a graph edit left to the reader |
| `is_a: X`                                                                                               | edge frame -> X, `relation` = `is_a`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `relationship: R X`                                                                                     | edge frame -> X, `relation` = R                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `instance_of: X` (Instance)                                                                             | edge frame -> X, `relation` = `instance_of`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `relation`                                                                                              | edge `dict` column, role `kind`. Unlike CX's free-text `interaction`, OBO's relation is a declared vocabulary (Typedefs), which is exactly what the `kind` role names                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| edge qualifiers `{...}`                                                                                 | edge `json` column `qualifiers` (unset when absent)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| identical clauses on merged frames                                                                      | one edge (the 1.4 merge rule); the same relation with different qualifiers, and two relations between one pair, are parallel edges                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| merged frames (one id twice, `W_DUPLICATE_NODE`)                                                        | list-valued clauses (`xref`, `synonym`, `alt_id`, `subset`, `is_a`, `relationship`, ...) take the union, in file order, without repeats; a single-valued clause (`name`, `def`, `comment`, ...) keeps the first value, `W_DUPLICATE_ATTRIBUTE`                                                                                                                                                                                                                                                                                                                                                                                         |
| a second `id` clause in one frame                                                                       | the first `id` names the frame; the second is `W_DUPLICATE_ATTRIBUTE` and ignored                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| qualifiers `all_only`, `cardinality`, `minCardinality`, `maxCardinality`, `gci_relation` / `gci_filler` | still an edge, with the qualifier in `qualifiers`, since the clause is a relationship between the two terms; ROBOT and OBO Graphs make no ordinary edge of them (OBO Graphs puts `all_only` in `allValuesFromEdges`), so the manifest records the edge-count difference (`ro.obo`: 12 such self-loops) with `oracleDisagrees`                                                                                                                                                                                                                                                                                                          |
| frame type                                                                                              | `dict` column `type`: `Term`, `Instance`, or `Typedef` (under `typedefs: "nodes"`), matching OBO Graphs' `CLASS`, `INDIVIDUAL`, `PROPERTY` (4.6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `[Typedef]` frames                                                                                      | not nodes: `meta.extra.obo.typedefs` (id to name, xrefs, flags, `is_a` parents, chains). Option `typedefs: "nodes"` makes them nodes with their `is_a` sub-property edges, as OBO Graphs does                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `name`                                                                                                  | `name` column, role `label`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `namespace` (after `default-namespace`)                                                                 | `namespace` `dict` column. The GO's three namespaces (`biological_process`, `molecular_function`, `cellular_component`) are its values; the namespace is a column, not containment, because the GO's edges never cross namespaces in go-basic and do in go                                                                                                                                                                                                                                                                                                                                                                             |
| `def`                                                                                                   | `def` string and `def.xrefs` `list<string>`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `synonym` (and the 1.0 `exact_synonym` etc., mapped with `W_OBO_DEPRECATED_TAG`)                        | `synonym` `json` column: a list of `{ text, scope, type, xrefs }`. A list of records needs `json`; graph-format lists hold scalars                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `xref` (and `xref_analog`, `xref_unk`)                                                                  | `xref` `list<string>`; descriptions, when any xref has one, in a `json` column `xref.descriptions`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `alt_id`, `subset`, `replaced_by`, `consider`                                                           | `list<string>` columns of those names                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `is_obsolete`, `is_anonymous`, `builtin`                                                                | `bool` columns (unset = false)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `comment`, `created_by`                                                                                 | `string` columns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `creation_date`                                                                                         | `string`, as written, no role. The `timestamp` role is the GEXF dynamics role, which GEXF, GraphML and Neo4j export as time data and graphty-element would read as a time series; and files write several date forms (ISO 8601, `dd:MM:yyyy`, invalid months), which OBO Graphs also carries as text                                                                                                                                                                                                                                                                                                                                   |
| `intersection_of`, `union_of`, `equivalent_to`, `disjoint_from`                                         | `json` / `list<string>` columns under the tag names. Not edges: OBO Basic and OBO Graphs both make only `is_a` and `relationship` into edges                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `property_value`                                                                                        | `property_value` `json` column: a list of `{ relation, value, datatype }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| unknown tags                                                                                            | a `json` column `obo.unrecognized` (`{ tag: [values] }`), `W_UNKNOWN_ELEMENT` once per tag                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| header                                                                                                  | `GraphMeta.name` from `ontology`, `sourceFormat: "obo"`, `sourceVersion` from `format-version`, `created` from `date` when it parses as the header's own `dd:MM:yyyy HH:mm` form (not ISO 8601; an unparseable date stays only as text), `creator` from `saved-by`; everything else (data-version, subsetdefs, synonymtypedefs, idspaces, imports, remarks, treat-xrefs macros, owl-axioms, header property_values, unknown header tags) at `meta.extra.obo.header`                                                                                                                                                                    |

Column names are the OBO tag names, per the package rule that importer columns keep the source
attribute name, so a GO user finds `namespace`, `def` and `is_obsolete` under the names the GO
documentation uses.

Direction is always directed, child to parent (subject to object). `defaultDirected` is reported
`W_OPTION_IGNORED`. Self-loops and cycles (`has_part` in go) are kept; they are not errors.

**Obsolete terms are kept** (GO has 10,248 of 48,340), with `is_obsolete` true. Dropping them is
option `obsolete: "drop"` (obonet's default), which also drops their edges and says how many in
`W_OBO_OBSOLETE_DROPPED`. Hiding them in a view is the reader's choice, made in graphty-element or
the app, not a role graph-io assigns.

### 4.3 Errors

`research-obo.md` section 6 lists 42 cases; the behavior there is adopted, with these codes:

- fatal: `E_EMPTY_INPUT`, the encoding codes;
- error, element skipped: `E_MISSING_ID` (a frame without `id`), `E_BAD_VALUE` (a clause whose
  value cannot be read: a boolean other than `true` / `false`, a `relationship` with one or three
  values);
- warnings: `W_DUPLICATE_NODE` (frames merged), `W_DUPLICATE_ATTRIBUTE` (a cardinality
  violation, first kept), `W_UNKNOWN_ELEMENT` (unknown tag or frame type), `W_DANGLING_REFERENCE`,
  and the OBO-specific codes below.

**OBO_ISSUE (format-specific)**, by category:

- parse-error: `W_OBO_SYNTAX` (a line without a colon, an unterminated quote, a qualifier block
  that does not parse, an unescaped brace: the clause is kept as text where possible, else
  skipped);
- validation-error: `W_OBO_ID_NOT_FIRST` (the frame's `id` is not its first clause; it is used
  anyway), `W_OBO_SYNONYM_SCOPE` (missing in a file that does not say 1.2, or invalid),
  `W_OBO_UNDECLARED` (a relation, subset or synonym type with no declaration),
  `W_OBO_ID_KIND_CLASH` (one id for a Term and a Typedef; the Term is the node);
- coercion: `W_OBO_DEPRECATED_TAG`, `W_OBO_DEPRECATED_SYNTAX`;
- unsupported: `W_OBO_HEADER_NOT_APPLIED` (header clauses that are kept in
  `meta.extra.obo.header` but whose meaning is not applied, once per tag: `import` (never
  fetched), `id-mapping`, `default-relationship-id-prefix`, the `treat-xrefs-as-*` macros,
  which ROBOT does not expand into edges either);
- merged: `W_OBO_OBSOLETE_DROPPED`.

**Options** (`OboImportOptions`): `obsolete: "keep" | "drop"`, `typedefs: "metadata" | "nodes"`,
plus the common ones (format defaults `ids: "keep"`, `addMissingNodes: true`, `weightFrom:
null`). There is no separate option for undeclared targets: `addMissingNodes` is that switch.
The importer calls `reportSinkOptions(sink, options, report, true)`.

Not options, on purpose: filtering by relation or namespace, slims, and "ancestors of these
terms". The GO workflow research (`research-go-workflows.md`) shows these are how people look at
the GO, which makes them views over the loaded graph, the element's filters, not import
parameters; the whole GO is 48,340 nodes and reads in seconds.

### 4.4 Size

go-basic.obo (32 MB, 48,340 terms, 71,496 edges) and go.obo stream through the line reader;
chebi.obo (271 MB) and ncbitaxon.obo (688 MB) are bounded only by the snapshot's own size. They
are opt-in download tests (section 6), never vendored.

### 4.5 The Gene Ontology's editions

Nothing is special-cased: go-basic, go and the GO slims are ordinary OBO files. The edition shows
in the data (go's extra relations, `intersection_of` columns) and in `meta.extra.obo.header`
(`data-version: releases/2026-07-26`, the subsets). graph-samples ships go-basic (section 6.4).

### 4.6 OBO Graphs JSON mapping

| OBO Graphs                                                                                                 | Snapshot                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| each `graphs[i]`                                                                                           | one graph; `import()` reads `graphIndex` (the JSON importer's existing option) with `W_MULTIPLE_GRAPHS`, `importAll()` every one                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| node `id`                                                                                                  | node id. Option `oboIds`, `"curie"` (the default) or `"iri"`: IRIs under `http://purl.obolibrary.org/obo/` become CURIEs by the OBO 1.4 rule (`.../GO_0008150` is `GO:0008150`), and `.../obo/<ontology>#<local>` (how the OWL translation writes an unprefixed OBO id: subsets such as `go#goslim_pombe`, relations such as `go#regulates`) becomes `<local>`, so the `.obo` and the `.json` of one ontology give the same ids; any other IRI is kept. The choice is recorded at `meta.extra.obographs.ids` and is reversible                                                                                                                                                                                                                                                                                                          |
| node `lbl`                                                                                                 | `name` (role `label`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| node `type`                                                                                                | the `type` column of 4.2: `CLASS` is `Term`, `INDIVIDUAL` is `Instance`, `PROPERTY` is `Typedef`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| node `propertyType`                                                                                        | `dict` column `propertyType`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `PROPERTY` nodes and their `subPropertyOf`, `inverseOf` and `type` edges                                   | follow the `typedefs` option, as `[Typedef]` frames do: under the default `"metadata"` they are not nodes or edges but entries of `meta.extra.obographs.properties` (id to label, shorthand, meta); under `"nodes"` they are nodes and edges                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| node `meta`                                                                                                | the OBO column vocabulary of 4.2 (`ontology.ts`): `definition` to `def` and `def.xrefs`, `synonyms` to `synonym` (the `pred` `hasExactSynonym` to scope `EXACT`, etc.), `xrefs` to `xref`, `subsets` to `subset` (with the `#` rule above), `comments` to `comment`, `deprecated` to `is_obsolete`. `basicPropertyValues` are mapped by predicate back to the OBO tag they came from: `oboInOwl#hasOBONamespace` to `namespace`, `oboInOwl#hasAlternativeId` to `alt_id`, `oboInOwl#created_by` to `created_by`, `oboInOwl#creation_date` to `creation_date`, `IAO_0100001` (term replaced by) to `replaced_by`, `oboInOwl#consider` to `consider`, `oboInOwl#shorthand` (on PROPERTY nodes) to the relation's short name; every other predicate to `property_value`. The table lives in `ontology.ts` beside the OBO column vocabulary |
| edge `sub`, `pred`, `obj` (`subj` accepted)                                                                | edge sub -> obj, role `kind` on `relation`: `is_a` stays `is_a`; any other `pred` is the `oboInOwl#shorthand` of the PROPERTY node it names (`.../BFO_0000050` is `part_of`, as the `.obo` writes it), else the IRI compacted under `oboIds: "curie"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| edge `meta`                                                                                                | `json` column `meta`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| an endpoint missing from `nodes`                                                                           | a placeholder node (`graphty.placeholder`), `W_DANGLING_REFERENCE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `equivalentNodesSets`, `logicalDefinitionAxioms`, `domainRangeAxioms`, `propertyChainAxioms`, graph `meta` | `meta.extra.obographs` verbatim                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

A paired test reads `goslim_generic.obo` and `goslim_generic.json` and asserts the same columns
and the same values for every node and edge the two share (measured: `namespace` on 151 nodes,
`relation` `part_of` rather than the BFO IRI, subsets as `goslim_pombe`).

The alt_id stand-in nodes the OWL conversion creates (3,646 in go-basic.json) are ordinary nodes
there (they are in the file), deprecated, unlabeled; the two editions' node counts therefore
differ (52,048 against 48,340), and the conformance manifest records both.

---

## 5. graphty-element: loading the new formats with no wiring

Per the repository's principles, a consumer who installs `@graphty/graphty-element` must be able
to drop a `.cys` or a `.obo` on it and get the graph with its data and its saved drawing; nothing
about these formats may need app code. The file's look (its styles) waits for issue #706
(section 2). The work, all inside graphty-element:

1. **Format ids.** Add `"xgmml"`, `"cx"`, `"cys"` and `"obo"` to `KNOWN_FORMAT_IDS`
   (`src/catalog/types.ts`). `"cx2"` is already there, deprecated and unserved: its entry leaves
   `UNSERVED_FORMAT_IDS` (`src/catalog/formats.ts`), the deprecation comments beside the id list in
   `types.ts` are updated, and issue #307 is closed. OBO Graphs JSON needs no id: it is `"json"`,
   recognized by content.
2. **Descriptors** in `FORMAT_DESCRIPTORS` (`src/catalog/formats.ts`), each with the extensions and
   MIME types of section 1, `canImport: true`, `canExport` true for xgmml and cx2 only, and these
   reader options (which the app's Data page and Load dialog render from the descriptor with no
   app change):
    - xgmml: `labelAliases`, `repairBareAmpersands`, `zAs`;
    - cx: `graphName` ("Network"), `zAs`;
    - cx2: `zAs`;
    - cys: `graphName` ("Network"), `zAs`;
    - obo: `obsolete` ("Obsolete Terms": keep / drop), `typedefs` ("Relations": metadata / nodes),
      `addMissingNodes` ("Undeclared Terms": add placeholders / drop the edge);
    - json: `oboIds` ("Ontology Ids": curie / iri), shown for the obographs dialect;
    - writer options: xgmml `cytoscapeEscapes`; cx2 `sanitizeIds` with the default `"mangle"`
      (section 1.3).
3. **Detection** (`src/catalog/detect.ts`): `xgmmlImporter`, `cxImporter`, `cx2Importer`,
   `cysImporter` and `oboImporter` join `BUILT_IN_IMPORTERS`. `.xml` is now claimed by GraphML, GEXF and
   XGMML, and the existing claimant-disambiguation step already asks each one's sniffer. The
   `.cys` content check works on the text `sample` the detector receives, because the zip
   signature and the first entry name are ASCII and survive it.
4. **Bytes.** `DataSource.getContent()` returns a string through `file.text()` /
   `response.text()`, and `config.data` is a string; decoding a zip as UTF-8 corrupts it, so every
   `.cys` would fail with a CRC or inflate error. The element adds `getBytes(): Promise<Uint8Array>`
   beside `getContent()`, widens `config.data` to `string | Uint8Array | ArrayBuffer` (additive,
   but public: section 7.2), and the graph-io import path passes graph-io's `ImportInput`
   (`importRecords()` in `data/graph-io-import.ts` already takes it) with the bytes of a file or a
   response, so graph-io's own decoder, with its encoding detection, reads every format.
5. **Readers: no new data source classes.** Each new format is registered with the existing
   `DataSource.fromImporter(importer, descriptor)`, which is what
   `tools/check-data-source-migration.mjs` expects of a reader, plus the obographs case in
   `JsonDataSource`. Two things every format needs go into the shared graph-io import path, so
   every graph-io format gets them (the y axis needs nothing: graph-io stores Cytoscape positions
   y-up, section 1.0.2):
    - **saved positions**: when every declared node has a position and the consumer set no
      layout, the load uses the `fixed` layout, so a `.cys` keeps its saved drawing instead of
      getting a force layout over it. The `z` column goes into the node's data only, never into
      its position;
    - **per-edge direction**: each edge record carries its own `directed` field from the
      snapshot's per-edge direction (XGMML `cy:directed`, `.cys` edges, OBO's child-to-parent
      edges), and the arrow is drawn by a style layer that reads it, not by the scratch builder's
      single direction.
      Cytoscape's `name` / `shared name` and OBO's `name` carry the `label` role and become the node
      label as every other labelled column does.
6. **Choosing a network.** A catalog function `listGraphs(source)` (file, URL or data) returning
   graph-io's `GraphListing[]`, or `null` for a format that does not list its graphs, so a host can
   offer a picker before loading; the load option `graphName` / `graphIndex` then picks one.
   Default with no choice: the first network, with the load report saying how many were not
   loaded. It lives in the catalog entry point and stays free of Babylon.js, Lit and the DOM. The
   app renders the list and passes the choice: reading an element-exposed list and writing an
   element option, which the app is allowed to do.
7. **No style work.** The element does not convert a file's visual information into style
   layers and gets no `fileStyles` option; the per-element visual columns arrive as ordinary node
   and edge data. Loading a file's styles, and exporting the element's style layers as Cytoscape
   styles, is issue #706.
8. **Export writes structure, not the look.** The element's XGMML and CX2 export writes the
   graph's structure and attribute columns, never its style layers; the docs say so.
9. **Docs and stories.** The graphty-element docs page for loading data lists the new formats
   and their options; one Storybook story per format with a committed sample (the graph-samples
   datasets of section 6.4 for the Cytoscape formats, goslim_generic for OBO).

graphty app: nothing beyond rendering the network picker from `listGraphs()`. The Load dialog
and Data page already list `FORMAT_DESCRIPTORS` and render their options.

---

## 6. Conformance and samples

### 6.1 Harness changes (`graph-io/test/conformance/`)

- New manifest folders `fixtures/xgmml`, `fixtures/cx`, `fixtures/cx2`, `fixtures/cys`,
  `fixtures/obo`, and `fixtures/json/obographs` inside the JSON manifest.
- `Expected` gains `graphNames?: string[]`, checked through `listGraphs()`. A fixture that holds
  style rules lists `W_STYLES_NOT_IMPORTED` among its expected codes, and its per-element visual
  values are checked as ordinary columns.
- **Positions are expected y-up.** The oracles report Cytoscape's screen coordinates, so the
  Cytoscape, CX and CX2 oracle modules negate y when they write a manifest, and the existing
  `.cyjs` fixtures' expected positions change sign with the JSON importer's flip (1.0.2). The
  XGMML, CX2 and `.cyjs` round trips check that the written file holds the original y.
- `Fixture` gains `oracleDisagrees?: string`: what the oracle does instead and why the
  specification wins. It generalizes `networkxDisagrees`, which stays as it is for the existing
  fixtures. REPORT.md counts both.
- `CORPUS_FORMATS` (`test/helpers/corpus.ts`) gains `xgmml`, `cx`, `cx2`, `cys` and `obo`, for the
  malformed corpus.
- **A sniffing test.** `importOptions()` always passes `format`, so the conformance suite never
  exercises sniffing. A new test runs every new fixture through `rankFormats` with no format
  given, once with its real file name and once with none, and asserts the top answer is the
  fixture's format. It includes a CX2 file named `.json`, an OBO Graphs file named `.json`, a CX1
  file, a `[{"data": ...}]` Cytoscape.js elements array (which must stay JSON), a headerless OBO
  file starting with `[Term]`, and a non-session zip (which must rank no format).
- **The `addMissingNodes` default** (1.0.2): for XGMML, CX1, CX2, `.cys` and OBO, one test each
  imports a file with a dangling endpoint through the default registry and through a caller's
  sink, and asserts `E_UNKNOWN_NODE` (OBO: a placeholder node) on both.
- Fixture bytes are already read as bytes, so `.cys` needs nothing more.
- New oracle modules beside `tools/oracle.py`: `oracle_obo.py` (fastobo-py 0.14.1),
  `oracle_cx.py` and `oracle_cx2.py` (ndex2 3.12.0), and `oracle_cytoscape.py` (CyREST against
  Cytoscape 3.10.5, for xgmml and cys). The first three run on a developer machine with
  `pip`; the last needs Java 17 and an X display (section 6.3).
- Round trips: the generative layer's `TARGETS` gains the XGMML and CX2 exporters with their
  `NOTE_RELAX` entries (positions compared at `f32`, 1.0.2), and `tools/validate_exports.py` gains a CX2 structural check (Cytoscape
  Web's validator rules, re-expressed in Python, since there is no published CX2 schema).

### 6.2 The independent readers

| Format     | Oracle                                                                                                                                 | Second opinion for error cases                                                                                       | Marked where the spec wins                                                                                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OBO        | fastobo-py 0.14.1 (MIT), mapped to nodes and edges by `oracle_obo.py` (the prototype in `tmp/samples-obo/scripts/oracle_obo_proto.py`) | ROBOT 1.9.11 (owlapi's parser): acceptance and basic edge counts only                                                | fastobo rejects or panics: unknown tags, 1.2 synonyms without scope, unquoted qualifiers, comment lines, Instance relationships; those fixtures use `"oracle": "robot"` or `"spec"`                        |
| OBO Graphs | fastobo `load_graph` for counts; the obographs JSON Schema for shape                                                                   | ROBOT `convert` from the paired `.obo`                                                                               |                                                                                                                                                                                                            |
| CX1        | ndex2 3.12.0 NiceCX model (BSD-3), typed by the CX data-type table in `oracle_cx.py`                                                   | ndex-object-model `CxElementReader2` messages (Java, read from source)                                               | aspects without metadata, duplicate ids, dangling edges, collections, failed status (`research-cx.md` 7.3)                                                                                                 |
| CX2        | ndex2 3.12.0 `CX2Network.create_from_raw_cx2`                                                                                          | ndex-object-model `CXReader`; Cytoscape Web `validateCX2`                                                            | the nine cases of `research-cx2.md` section 7                                                                                                                                                              |
| XGMML      | Cytoscape 3.10.5 through CyREST                                                                                                        | a stdlib `xml.etree` cross-check that catches a broken Cytoscape run, never the sole source                          | the six known disagreements of `research-xgmml.md` section 6 (root `directed` ignored, numeric ids collapsed, whole-file aborts, no-namespace refused, unknown wrappers descended, dangling edges dropped) |
| `.cys`     | Cytoscape 3.10.5 through CyREST, keyed by `name` / `shared name` (Cytoscape renumbers SUIDs)                                           | the assertions of Cytoscape's own session integration tests, transcribed as facts (counts and names) for 11 sessions | per-cell parse failures (Cytoscape nulls them silently)                                                                                                                                                    |

### 6.3 Running the Cytoscape oracle

No Java or Xvfb is installed on the development machine, and `sudo` is not allowed. A portable JDK
17 needs no root (the OBO research already ran ROBOT on one in `tmp/samples-obo/tools/`), but
Cytoscape also needs an X display. So the oracle runs as a manually dispatched GitHub Actions
workflow, `conformance-cytoscape-oracle.yml`, on an Ubuntu runner (which has `xvfb-run`): it
installs Temurin 17, downloads `cytoscape-unix-3.10.5.tar.gz`, starts `xvfb-run -a cytoscape.sh
-R <port>`, runs `oracle.py xgmml cys`, and uploads the regenerated manifests as an
artifact, which a developer reviews and commits. Expectations are committed, so CI never needs
Java. Until the first run, `.cys` fixtures carry the transcribed integration-test facts with
`"oracle": "cytoscape-integration-tests"`, and XGMML fixtures carry hand-written
`"oracle": "spec"` expectations.

### 6.4 Which files go where

Licenses were read from each source's LICENSE file or the file's own rights statement, as the
research notes record. Every file below may be redistributed in a public repository under its
license. Files whose repository states no license (Cytoscape's `cytoscape/cx` and `cxio` test
files, informationsea's XGMML examples) are not copied; the authored sets reproduce their cases.
The `cytoscape-gui-distribution` session test files have no LICENSE file at the repository root
but carry the LGPL-2.1 header in the test tree that holds them, so they are treated as LGPL-2.1,
test-only (`research-session-and-style.md` section 9; the XGMML note had listed them as unclear). Each conformance file gets a `sources.md` entry (new sections 11 to 16: origin URL, pinned
commit or retrieval date, license and where it is stated, SHA-256), and an LGPL, GPL or
share-alike file is test-only (`test/` is not published).

**Conformance fixtures (`test/conformance/fixtures/<fmt>/`), well-formed and real:**

| Format         | Files (numbers refer to the research note's candidate table)                                                                                                                                                                                                                                                 | Licenses                                                                                                                                                                                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| xgmml          | `research-xgmml.md` 7 #1 to #11 (Cytoscape reader tests: simple, simple_3.3, listAtt, hiddenAtt, suid_metadata, bare_ampersands, empty, empty_DTD, INVALID, the 2.x groups, nested_groups_283, galFiltered), #12 (t3.cys network files), #13 yeast_perturbation, #14 EFI-EST SSN, #16 NGSCheckMate, #17 VPLG | LGPL-2.1, test-only (cytoscape-impl LICENSE); #13, #14, #16 MIT (repository LICENSE); #17 GPL-2.0-or-later, test-only                                                                                                                                                                                                                                                            |
| cx             | `research-cx.md` 8 #1 to #11, #13, #14, #16 to #19 (ndex2-client tests, cx2js examples, ndex-object-model tests, RCX's p53 file, the two CC0 NDEx networks) and #20 to #22                                                                                                                                   | BSD-3-Clause (ndex2-client, ndex-object-model LICENSE); MIT (cx2js, RCX LICENSE); CC0 (NDEx network `rights`); #20, #21 CC BY-SA 4.0 test-only; #22 CC BY 4.0 with attribution in sources.md                                                                                                                                                                                     |
| cx2            | `research-cx2.md` 6 #1 to #9 and #11 to #21                                                                                                                                                                                                                                                                  | BSD-3-Clause (ndex2-client, ndex-object-model); MIT (cytoscape-web LICENSE); CC0 / MIT / CC BY 4.0 per NDEx network `rights`                                                                                                                                                                                                                                                     |
| cys            | `research-session-and-style.md` 9 #1 to #15 and #16 to #19                                                                                                                                                                                                                                                   | #1 to #15 LGPL-2.1, test-only (cytoscape-impl LICENSE; the cytoscape-gui-distribution test tree's file headers); #16 to #19 CC0-1.0 (cytoscape-tutorials LICENSE)                                                                                                                                                                                                                |
| obo            | `research-obo.md` 10 #1 goslim_generic, #6 taxrank, #7 ro, #9 so, #10 eco, #11 mi, #12 fao, #14 the owlapi test files, #15 the obographs examples (.obo halves), #16 pronto's uo.obo, #17 obonet's brenda-subset, #18 the fastobo test files, #19 pato, #20 ms                                               | GO CC BY 4.0 (GO citation policy); taxrank, ro, eco, fao CC0 (in-file or OBO Foundry registry); so, mi, ms CC BY 4.0; pato CC BY 3.0; owlapi Apache-2.0 (its README offers LGPL-3 or Apache-2.0); obographs BSD-3-Clause (pom.xml); pronto MIT with uo CC BY 3.0; obonet BSD-2-Clause-Patent with BRENDA content of unstated terms, test-only; fastobo MIT with mslite CC BY 4.0 |
| json/obographs | `research-obo.md` 10 #2 goslim_generic.json, #8 ro.json, #15 the obographs examples (.json halves, abox.json), #16 pronto's older-shape obographs                                                                                                                                                            | as above                                                                                                                                                                                                                                                                                                                                                                         |

**Malformed files (`test/corpus/malformed/<fmt>/`)**, each with its expected `ImportError` or
issue code in the manifest: `research-xgmml.md` 7 #6 (bare ampersands, not well-formed) and the
generated XML cases below; `research-cx.md` 8 #15 (CX2 content under `.cx`) and #16 (not JSON);
`research-cx2.md` 6 #10 (Cytoscape Web's 11 invalid fixtures, MIT); `research-session-and-
style.md` 9 #12 (the 3.0 pre-release session, LGPL test-only); the obographs README-era `subj`
file.

**Generated by a script (`test/conformance/tools/make_<fmt>_fixtures.py`, committed with its
output, MIT as authored):**

- xgmml: the draft examples D.1 to D.4 re-authored from the specification's structure; the 39
  edge cases of `research-xgmml.md` 7 #22 (truncation, encodings, surrogate and control character
  references, billion laughs, an external SYSTEM entity, an unknown wrapper element, missing ids
  and endpoints, duplicates, dangling and cross-file references, overflow, `1e400`, bad booleans,
  `directed="true"`, record lists, lists of lists, RDF in a node, equations, literal `\n`,
  `<center>` and `<Line>` graphics, two `graphics`, XHTML embedding, a view root); plus 2.x
  `type="map"` atts, `cy:hidden="true"`, a list att with a `value`, a nested-network pointer cycle
  in a 3.x export, and a group membership cycle; session
  network and view equivalents of `subnetworks.cys` and `nestedGroups_expanded.cys`.
- cx: the groups set and the malformed set of `research-cx.md` 8 #24 and #25 (reproducing the
  cases of the unlicensed `cytoscape/cx` files without copying them); plus attribute and layout
  aspects before `nodes`, a collection without pre-`metaData`, an id above 2^53 after 1,000 safe
  ones, string and `1e3` ids, `v: null`, a single-object opaque aspect, and a bypass whose
  property name is also an attribute name.
- cx2: the 16 authored files of `research-cx2.md` 6.1; plus `attributeDeclarations` after
  `nodes`, Python type spellings, a declaration with no `d`, `1` and `"1"` as one id, an unknown
  element key, a malformed `status`, and the CX2 exporter's mangled-id round trip.
- cys: the container cases of `research-session-and-style.md` 9 (truncated, no EOCD, zip64,
  stored entry with a descriptor, trailing junk, CRC mismatch, encryption flag, deflate64,
  duplicate entry, no root folder, two root folders, `__MACOSX` noise, unknown CyCSV version, a
  table for a missing network, a dangling `xlink:href`, a ratio bomb), each built from the CC0
  `galFiltered.cys` (#17) so the generated files are CC0 too.
- obo: the 44 probes of `tmp/samples-obo/scripts/probe.py`, Instance frames (the guide's
  `john` / `heather` example), the 1.0 legacy tags, UTF-16 and Latin-1, truncated files.

**Too large to commit (opt-in download tests, pinned by URL and SHA-256, run under
`GRAPH_IO_LARGE_FIXTURES=1`):** `research-xgmml.md` #15 (25.8 MB EFI-EST), `research-cx.md` #12
hiview.cx (54 MB) and #23 Signor (40 MB), `research-cx2.md` #22 IntAct (6.5 MB) and #24 STRING
(90 MB), The_Yeast_Interactome.cys (24.8 MB, LGPL), go-basic.obo and go.obo, go-basic.json, and
chebi.obo / ncbitaxon.json as the size-limit tests. NDEx regenerates CX on request, so NDEx files
are pinned by checksum, never re-fetched blind.

**graph-samples datasets** (bundled under about 5,000 nodes, hosted above; names are new
`./datasets/<name>` subpaths):

| Name                                | Nodes / edges   | Source                                                                | License                                                                  | Hosting | Why                                                                              |
| ----------------------------------- | --------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------- | -------------------------------------------------------------------------------- |
| `yeast-perturbation`                | 331 / 362       | `galFiltered.cys`, cytoscape-tutorials                                | CC0-1.0 (repository LICENSE); data Ideker et al., Science 292:929 (2001) | bundled | Cytoscape's canonical demo network, with expression columns and its saved layout |
| `stelzl-interactome`                | 1,691 / 3,360   | `STELZ.cys`, cytoscape-tutorials                                      | CC0-1.0; data Stelzl et al., Cell 122:957 (2005)                         | bundled | a real human protein interaction network with 55 self-loops and a layout         |
| `wikipathways-senescence-autophagy` | 161 / 118       | NDEx 72288e93 (WP615), CX2                                            | CC0 (network `rights`, holder WikiPathways)                              | bundled | a drawn pathway: positions matter, z is a draw order                             |
| `go-slim-generic`                   | 140 / 64        | goslim_generic.obo                                                    | CC BY 4.0 (GO citation policy)                                           | bundled | the GO in miniature, all three namespaces                                        |
| `go-basic`                          | 48,340 / 71,496 | go-basic.obo, release 2026-07-26 (pinned at release.geneontology.org) | CC BY 4.0                                                                | hosted  | the Gene Ontology DAG, with `namespace` and `is_obsolete` columns                |
| `disease-ontology`                  | 14,854 / 17,479 | doid.obo                                                              | CC0-1.0 (in-file)                                                        | hosted  | a second large ontology, public domain                                           |
| `bioplex3-hct116`                   | 10,251 / 75,346 | NDEx e96d063d, CX2                                                    | CC0 (network `rights`)                                                   | hosted  | a large real interaction network with a full layout                              |

Their NOTICE entries carry the source, the citation and the license; CC BY entries carry the
attribution the license requires. The conversion scripts (`convert-datasets.mjs`,
`build-hosted.mjs`) read these files through graph-io's own importers from `graph-io/dist`,
the same way `build-hosted.mjs` already imports graph-format from its `dist`; this also runs the
new readers on real files on every hosted build. Not proposed: CC BY-SA and CC BY-NC networks
(share-alike and non-commercial terms do not fit graph-samples' rule), the MIT XGMML copy of the
yeast network (the CC0 session is the same data with a cleaner license), and the EFI-EST
similarity networks (useful as fixtures, weak as showcases).

---

## 7. Order of work, and the one-way doors

### 7.1 Order

Each step ends with lint, build, tests and the conformance report green, and is one pull request.

1. **Shared ground.** The new shared codes, including `W_WIDENED` (named in comments today but
   never defined), the loss code `W_STYLES_NOT_IMPORTED`, and the promotion of
   `W_GEXF_DUPLICATE_ATTRIBUTE` to `W_DUPLICATE_ATTRIBUTE`; `decodeEntryName` in `input.ts`; the
   optional `listGraphs()` on `GraphImporter` and the registry; the JSON sniff change of 1.2; the
   `.cyjs` y flip in the JSON importer and the flip back in the JSON exporter's `cytoscape`
   dialect, with the existing `.cyjs` fixtures' expected positions updated; the harness additions
   of 6.1.
2. **OBO and OBO Graphs.** `oboImporter`, `ontology.ts`, the `obographs` dialect and the
   `sniffJsonDialect` fix (which also fixes today's silent misreading), `oracle_obo.py`, the
   fixtures. First because it is independent of the Cytoscape work, its oracle runs locally today,
   and it unlocks the GO.
3. **CX2 importer and exporter** with `json-elements.ts` (streaming from the start) and
   `oracle_cx2.py`; closes issue #307.
4. **CX1 importer** on the same scanner, and `oracle_cx.py`.
5. **XGMML importer and exporter**, with the two tokenizer repair hooks in `common/xml.ts`.
6. **zip.ts and the `.cys` importer**, built on 5, with `listGraphs()`.
7. **The Cytoscape oracle workflow** of 6.3; replace the transcribed and hand-written
   expectations with its output, marking `oracleDisagrees` where the specification wins.
8. **graphty-element** (section 5). Items 1 to 5 can start once step 3 lands; item 4 (bytes) must
   land before `.cys` is registered; the network picker (item 6) follows step 6.
9. **graph-samples datasets** (section 6.4), after the importer each one needs.

Deferred, not part of this work: **streaming the JSON importer** onto `json-elements.ts`, which
would lift the `E_TOO_LARGE` limit for very large OBO Graphs files (chebi.json, ncbitaxon.json).
No Gene Ontology file needs it; until it lands those files fail with `E_TOO_LARGE`, and their
opt-in size tests (6.4) expect that. Also outside this work: style import for every format,
including Cytoscape style files and the per-element visual columns' roles (issue #706, section 2).

### 7.2 One-way doors (decided by the owner, 2026-10-02)

These are published contract: changing them after a release breaks consumers. The owner decided
each one on 2026-10-02 (the end of `one-way-doors.md`); this design follows those decisions.
Everything else in this design (column details, defaults, option defaults, which fixtures, the
oracle tooling, the order of work) is a two-way door and was decided here.

1. **Subpath names**: one per format, `@graphty/graph-io/xgmml`, `/cx`, `/cx2`, `/cys`, `/obo`.
2. **Format names** in the registry, `GraphFormatName` and `GRAPH_FORMATS`: `"xgmml"`, `"cx"`,
   `"cx2"`, `"cys"`, `"obo"`; and graphty-element's `KNOWN_FORMAT_IDS` gaining the four new ones and
   un-deprecating `"cx2"`. Adding union members can break a consumer's exhaustive `switch`; graph-io
   is 0.x and the element change is additive, so a minor release of each.
3. **The JSON dialect name** `"obographs"` and the change in what `sniffJsonDialect()` answers for
   such documents (today `"jgf"`).
4. **Returned types**: `GraphListing`; the optional method `GraphImporter.listGraphs` and
   `FormatRegistry.listGraphs` (returning `null` for a format that does not list), with the
   `graphName` / `graphIndex` options.
5. **The position convention**: Cytoscape-family positions, including the existing `.cyjs`
   dialect's, are stored y-up with no mark, and the exporters flip back. The `.cyjs` importer's
   position values change sign, a visible change for anyone who stored them.
6. **Issue code strings and table names**: the shared codes of 1.0.1, including the loss code
   `W_STYLES_NOT_IMPORTED` (moving `E_BAD_VALUE` into the shared table keeps its string; promoting
   `W_GEXF_DUPLICATE_ATTRIBUTE` changes the string GEXF reports to `W_DUPLICATE_ATTRIBUTE`, and
   `GEXF_ISSUE.DUPLICATE_ATTRIBUTE` aliases it), and `XGMML_ISSUE`, `XGMML_LOSS`, `CX_ISSUE`,
   `CX2_ISSUE`, `CX2_LOSS`, `CYS_ISSUE`, `OBO_ISSUE` with their codes.
7. **Column and metadata names a consumer reads**, keeping the source's names: the OBO tag-named
   columns and `type`, `relation` with role `kind`, `graphty.placeholder`,
   `cytoscape.nestedNetwork`, `cytoscape.selected`, `cytoscape.hidden`, `z`, `position@<n>`; the
   per-element visual columns (XGMML `graphics`, CX and CX2 property-id columns with
   `origin.namespace` `cx.bypass` / `cx2.bypass`); the `meta.extra` keys `xgmml`, `cx`, `cx2`,
   `cytoscape`, `obo`, `obographs`.
8. **Option names** on the new importers and exporters (`graphName`, `graphIndex`, `zAs`,
   `labelAliases`, `cytoscapeEscapes`, `repairBareAmpersands`, `pairSurrogateReferences`,
   `maxUncompressedBytes`, `obsolete`, `typedefs`, `oboIds`).
9. **graph-samples dataset names** (`./datasets/<name>` subpaths and the hosted URLs), naming the
   content: `yeast-perturbation`, `stelzl-interactome`, `wikipathways-senescence-autophagy`,
   `go-slim-generic`, `go-basic`, `disease-ontology`, `bioplex3-hct116`.
10. **graphty-element's public additions**: `config.data` widened to `string | Uint8Array |
ArrayBuffer`, `DataSource.getBytes()`, the catalog `listGraphs(source)`, and the `graphName` /
    `graphIndex` load options.

Decisions recorded as two-way doors, with the reason, so they are not reopened by accident:
XGMML direction follows the specification over Cytoscape (the DTD is explicit; Cytoscape 3 files
are unaffected because they put `cy:directed` on every edge); `addMissingNodes` defaults to false
for the Cytoscape formats and true for OBO (each matches its ecosystem; each importer enforces its
default itself); positions are `f32` like every other importer's; OBO Typedefs are
metadata and obsolete terms are kept (an option flips each); `oboIds` defaults to CURIEs (the
mapping is the OBO spec's and reversible); the gzip wrapping instead of `deflate-raw` (keeps
`engines` at Node 18.19); no CX1, `.cys` or OBO writer (each can be added later without
changing anything above).

---

## 8. References

Specifications and reference implementations, as cited in the research notes (each note has the
pinned commits):

- XGMML 1.0 draft (archived): https://web.archive.org/web/20051226113401/http://www.cs.rpi.edu/~puninj/XGMML/draft-xgmml-20001006.html
- Cytoscape XGMML reader and writer: https://github.com/cytoscape/cytoscape-impl/tree/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/read/xgmml
- CX data model (CX1): https://home.ndexbio.org/data-model/ and https://cytoscape.org/cx/specification/cytoscape-exchange-format-specification-(version-1)/
- CX2 specification: https://cytoscape.org/cx/cx2/specification/cytoscape-exchange-format-specification-(version-2)/ ; CX2 visual styles: https://cytoscape.org/cx/cx2/cx2-visual-styles/
- ndex2-client: https://github.com/ndexbio/ndex2-client ; ndex-object-model: https://github.com/ndexbio/ndex-object-model ; Cytoscape Web validator: https://github.com/cytoscape/cytoscape-web/tree/main/src/models/CxModel
- Cytoscape session reader: https://github.com/cytoscape/cytoscape-impl/blob/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/read/session/Cy3SessionReaderImpl.java ; style serializer: https://github.com/cytoscape/cytoscape-impl/blob/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/util/vizmap/VisualStyleSerializer.java
- Cytoscape visual lexicon: https://github.com/cytoscape/cytoscape-api/blob/develop/presentation-api/src/main/java/org/cytoscape/view/presentation/property/BasicVisualLexicon.java
- Cytoscape session integration tests: https://github.com/cytoscape/cytoscape-gui-distribution/tree/develop/integration-test/src/test/java/org/cytoscape/session
- ZIP APPNOTE: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT ; Compression Streams: https://github.com/whatwg/compression/blob/main/index.bs ; Node globals (DecompressionStream): https://nodejs.org/api/globals.html
- OBO 1.4 syntax and semantics: https://owlcollab.github.io/oboformat/doc/obo-syntax.html ; OBO 1.4 and 1.2 guides: https://owlcollab.github.io/oboformat/doc/GO.format.obo-1_4.html , https://owlcollab.github.io/oboformat/doc/GO.format.obo-1_2.html
- OBO Graphs schema: https://github.com/geneontology/obographs/blob/master/schema/obographs-schema.json
- fastobo-py: https://github.com/fastobo/fastobo-py ; ROBOT: https://github.com/ontodev/robot
- GO downloads and license: https://geneontology.org/docs/download-ontology/ , https://geneontology.org/docs/go-citation-policy/
- graphty issue #307 (CX2): https://github.com/graphty-org/graphty-monorepo/issues/307

---

## Review changes

Three reviews read the first version: the graph-io maintainer's, graphty-element's architect's,
and a format review that checked the design against the research notes and the sample files.

### Changed

**Missing endpoints.** The registry seeds its builder with `addMissingNodes: true` before any
importer runs, so the `false` default of XGMML, CX1, CX2 and `.cys` never reached it. Each of these
importers now checks endpoints against its own id set and calls `reportSinkOptions(..., true)`, as
GraphML and GEXF do, with a test per format through the default registry and a caller's sink
(1.0.2, 6.1). OBO's `dangling` option is gone: `addMissingNodes` already says it, and OBO makes its
placeholders itself (4.2).

**Sniffing.** The JSON sniff now caps at 0.3 any top-level array whose first object has no `data`
key, the rule `sniffJsonDialect()` already uses. That covers CX2's two-key descriptor (which the
"one-key object" rule missed, so a CX2 file named `.json` went to the JSON importer) and keeps
`[{"data": ...}]` Cytoscape.js arrays as JSON (1.2). A new test runs every new fixture through
`rankFormats` with no format, with and without its file name (6.1). The `.cys` sniff answers 0 for
a zip that is not a session (3.3). The OBO sniff skips a BOM and `!` comments and accepts files
with no header; the OBO Graphs dialect check looks at the whole first graph for `lbl`, `meta`,
`pred` or `sub`/`obj` (1.5, 1.6).

**Streaming CX.** Ids are typed per id (safe integers as numbers, larger ones as digit strings,
`idType: "mixed"`), so nothing waits for the whole file. Section 1.2.5 now names what is buffered:
attribute and layout values that arrive before their elements, a collection's elements until its
subnetworks and views are known, CX2 elements before their declarations, and edge triples; it
states the memory bound and adds out-of-order fixtures. A late `cyTableColumn` widens instead of
retyping.

**Codes.** `W_WIDENED` is defined (it existed only in comments), and the design says what a
caller's sink that cannot widen does. `W_GEXF_DUPLICATE_ATTRIBUTE` is promoted to the shared
`W_DUPLICATE_ATTRIBUTE` (a changed string, so it is listed as a one-way door). Memberships naming no
node use the existing `E_UNKNOWN_PARENT`; a new shared `E_PARENT_CYCLE` replaces `W_CX_GROUP_CYCLE`.
`E_TOO_LARGE` reuses graph-format's string. Every new code has its category. OBO's
`W_OBO_DATE_AS_TEXT` is gone, and `W_OBO_IMPORT_NOT_FOLLOWED` became `W_OBO_HEADER_NOT_APPLIED`,
which also covers `id-mapping`, `default-relationship-id-prefix` and the `treat-xrefs-*` macros.
XGMML gains `W_XGMML_BAD_ATT` for malformed atts.

**Positions.** One convention: `f32 x3` with role `position`, as every other importer writes,
stored y-up: Cytoscape-family importers, `.cyjs` included, flip y at import and the exporters flip
it back (the owner's decision on the one-way doors). `position@<n>` columns carry no role.
graphty-element uses the `fixed` layout when every node has a saved position (1.0.2, 5).

**OBO.** `creation_date` is a plain string with no role (the `timestamp` role would have made the
GO a time series). Merged frames take the union of list clauses; a second `id` clause, alt_id
targets, form feeds, the header date form, qualified relationships and a `type` column are
specified. The OBO Graphs mapping now maps `basicPropertyValues` back to their OBO tags, takes
`relation` from the property's shorthand, handles `obo/<ontology>#<id>` IRIs, applies `typedefs`
to PROPERTY nodes, and has a paired `.obo` / `.json` test (4.6).

**XGMML.** A node-nested graph is containment only for groups (the draft dialect, 2.x
`__groupState`, 3.x `__isGroup`); every other one is the `cytoscape.nestedNetwork` pointer, since
Cytoscape 3 writes pointers that way and they can form cycles. Also specified: `cy:hidden` spellings,
`type="map"`, 2.x `node.*` atts, the view-file `z` att, label aliases filling `interaction`, `1e400`,
and the XHTML-embedded case.

**CX1 and CX2.** Each subnetwork of a collection takes its view, positions, scoped attributes and
per-element visual values through `cyNetworkRelations`. Single-object
aspects, string and `1e3` ids, `v: null`, `@context`, untyped and Python-typed declarations,
unknown element keys, malformed `status` and the `x` versus `NODE_X_LOCATION` precedence are
specified. The CX2 exporter's `"mangle"` mode and its round trip through `restoreMangledIds` are
specified (1.3).

**Exporters.** The XGMML and CX2 capability lists state all 16 fields, `viz` and `components`
included.

**Zip.** Entry names are decoded by a helper in `common/input.ts`; the inflate and CRC loops check
cancellation and report progress.

**listGraphs.** XGMML and JSON implement it too, and the registry returns `null`, not a made-up
single graph, for a format without it.

**Sessions.** Behavior is stated for cross-subnetwork edges, dangling views, duplicate
table keys, broken virtual columns, a future `.version` major, networks without a view, and 2.x
selected and hidden state.

**graphty-element.** Section 5 drops the five data source classes in favor of
`DataSource.fromImporter`, adds `getBytes()` and byte-valued `config.data` (a public change, listed
in 7.2) so a `.cys` is not corrupted by text decoding, keeps per-edge direction, names the exact
`UNSERVED_FORMAT_IDS` and `BUILT_IN_IMPORTERS` edits, and says export writes structure, not the
look.

**Harness.** `CORPUS_FORMATS` gains the new
formats.

### Rejected, and why

- **`f64` positions.** Every existing importer writes `f32`, and that is what the element and the
  layouts read. Exact Cytoscape doubles matter only for a byte-exact round trip, so the round-trip
  check compares positions at `f32` instead.
- **Two passes over re-readable input for CX.** One pass with stated buffering covers one-shot
  streams too, needs one code path, and buffers nothing beyond edges for files in the recommended
  order.
- **Generated integer ids as the CX2 exporter's default.** graph-io's rule is that an exporter
  never renames a node unasked, and GML already follows it. The default stays `"error"`;
  graphty-element's CX2 writer defaults to `"mangle"`, which gives its users the file the review
  wanted.
- **A `resolveAltIds` option for OBO.** The placeholder is what OWL and OBO Graphs produce for an
  alt_id reference, so `.obo` and `.json` agree; the warning names the primary term. The option can
  be added when someone needs it.
- **Dropping `all_only`, cardinality and GCI relationships, as ROBOT does.** The clause still
  relates the two terms, and its qualifier is kept on the edge; the edge-count difference is
  recorded in the manifest.
- **Reading `\W` as the letter W, as fastobo does.** The files' writers followed the guides, which
  say space; those fixtures are marked `oracleDisagrees`.
