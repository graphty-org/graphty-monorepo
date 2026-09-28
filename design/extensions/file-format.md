# File format extension point

Status: draft specification against graphty-element 2.6.1. Shared rules are in `README.md`.

Normative files: `file-format.d.ts` (shapes; its "Published" section is the reader, its "Proposed"
section the writer), `descriptors.schema.json#/$defs/FormatDescriptor`, and this document.

## 1. What a file format is

A file format extension teaches the element to read a graph file it does not ship a reader for --
CX2 for NDEx, SIF, a lab's own tab-separated format, a vendor export -- reached by exactly the
routes the built-in formats are: a string, a dropped `File`, a URL, a format named explicitly, a
format recognised from the file name or from its first bytes.

In graphty-element 2.6.1 the point is **read-only**. `DataSource.register` refuses a descriptor that
claims `canExport: true`, because there is no writer seam: a "Save as" menu built from the
catalogue would otherwise offer a format nothing can save. The owner's request names a reader AND
a writer; section 8 specifies the writer as a proposal, because where writers register has not been
decided (README open decision 1).

Grounding: owner's list of official points (2026-09-21); owner's statement on file handling
(2026-09-19): "loading data, which may be in many formats based on the pre-existing ecosystem of
graph formats"; owner's decision on export content (2026-09-28): "whatever the format supports";
`design/graphty-element/extension-points.md` section "File format" (kept for the reader);
graph-io's importer and exporter contract (`graph-io/src/types.ts`, `design/graph-format/graph-format-design.md`
section 12.4).

## 2. Data model

| Type | Kind | Defined in |
| --- | --- | --- |
| `FormatDescriptor` | implemented by extensions | `file-format.d.ts` |
| `DataSource` statics (`type`, `descriptor`, `detect`) and abstract members (`sourceFetchData`, `getConfig`) | implemented by extensions | `file-format.d.ts` |
| `DataSource` protected helpers (`getContent`, `resolveOptions`, `chunkData`, `declareDirection`, `errorAggregator`), `DataSource.toRecord(s)` | called by extensions | `file-format.d.ts` |
| `DataSourceChunk`, `AdHocData`, `BaseDataSourceConfig`, `DeclaredDirection`, `DetectionInput` | called by extensions | `file-format.d.ts` |

### 2.1 FormatDescriptor rules

| Member | Rule |
| --- | --- |
| `id` | Non-empty; MUST equal the class's `static type`; not in `KNOWN_FORMAT_IDS` |
| `plainName` | Non-empty |
| `extensions` | At least one; each MUST begin with `.`, MUST be lower case and MUST contain no further `.` (detection compares only the last segment of a file name, so `.nt.gz` could never match; refused with `E_BAD_COMMAND`, `field: "descriptor.extensions"`, until compound extensions land with open decision 20) **(not yet met:** 2.6.1 accepts `.nt.gz` silently**)** |
| `mimeTypes` | At least one; each a `type/subtype` media type. A format with no registered type (SIF, GMT) can only list a generic one; whether `mimeTypes` may be empty or entries marked generic is part of open decision 2 |
| `canImport` | MUST be `true` for a registered reader |
| `canExport` | MUST be `false` in 2.6.1 |
| `options` | The reader's options (README section 7); MAY be empty |

### 2.2 Records

A reader yields `DataSourceChunk`s of `AdHocData` records built with `DataSource.toRecord`:

1. A node record MUST carry `id` (string or number). Every other member is an attribute, EXCEPT the
   members the element reads with a meaning of its own (`DataSource.toRecord`):
   - `position` on a node record seeds its coordinates in file units, as `{ x, y, z }`, `[x, y]` or
     `[x, y, z]`, so a file that arrives laid out stays laid out. A reader whose format carries
     coordinates (CX2's cartesian layout, GraphML with positions) SHOULD emit them here, not as
     `x` and `y` attributes, which the element would treat as plain data and re-lay out;
   - the configured weight key on an edge record (`weight` unless `data.knownFields.edgeWeightPath`
     says otherwise; a `value` member is read as a legacy fallback) is the weight algorithms and
     styles read. A reader whose format has a strength or distance column SHOULD emit it there, and
     say in its documentation which it is;
   - the edge endpoint spellings below, and `id` on an edge.
   - every key beginning with `graphty.`, the prefix of the element's internal columns
     (`algorithm.md` section 3.1 item 6), so a file exported by another tool cannot re-import one
     of them with the element's meaning.
   These are the reserved record keys. A reader MUST NOT emit any of them with another meaning; an
   attribute of the source format that would compact to one of them (`dcterms:source`, a `from`
   column on a record that also has `source` and `target`) MUST be renamed by the reader, because
   the element reads the reserved meaning first.
2. An edge record MUST carry its endpoints as `source` and `target`. The element also accepts
   `src`/`dst` and `from`/`to`, in that order of preference, but a reader SHOULD emit
   `source`/`target`: that is what every built-in emits and what `session.data.edge(id)` returns.
3. An edge record MAY carry `id`, but **as built the element reads it only when the consumer
   has set `data.knownFields.edgeIdPath`** (default `null`, `src/config/DataConfig.ts`). With the
   default, a reader's `id` is an ordinary attribute and every edge is identified by its position
   among the edges of the same ordered pair (`ImportReport.edgeIdentity` counts both kinds). The
   setting is global, so it cannot differ between loads, and once set the element matches record
   ids across the whole graph and every load, without looking at endpoints, so two GraphML files
   that both number their edges `e0`, `e1`, ... collide (`DataManager.knownEdgeFor`). A position is
   not stable when an updated file lists a pair's edges in another order, so saved results,
   annotations and sets can point at a different edge after a reload. A reader whose format has a
   natural edge name SHOULD still emit it as `id` (SIF's `A (pp) B`), because open decision 19
   recommends that the reserved `id` identify the edge by default, scoped to its load; until then
   it takes effect only under `edgeIdPath: "id"`. Generated edge ids MUST be injective: a reader
   that builds an id from parts escapes the separator text in each part, or keeps the set of ids
   already emitted and takes the next free ordinal, so a node named `B #2` cannot reproduce the id
   of the second `A (pp) B` edge. Deterministic assignment is part of open decision 19.
4. An edge MAY reference a node the reader never yielded; the element creates that node, as it
   does for built-ins. `E_EDGE_ENDPOINTS_UNRESOLVED` is something else: the element raises it when
   no endpoint spelling (`source`/`target`, `src`/`dst`, `from`/`to`) answers in a batch of edge
   records. A reader that emits `source`/`target` never meets it.
5. Attribute values MUST be JSON-compatible (string, number, boolean, null, arrays and plain
   objects of those). A reader MUST NOT put functions, class instances or cyclic structures in a
   record.
6. A record has no way to say which attribute is the node's display label, what type an attribute
   is (a date, an integer, a list, a language-tagged literal), or what the graph-level metadata is
   (a prefix map, a named graph). Those are dropped or arrive as plain strings, and a writer cannot
   report a loss it never knew about. Time-structured values (GEXF spells, intervals) have no
   form at all: a reader MUST raise them as a per-record warning rather than drop them silently,
   until open decision 20 decides whether intervals are in scope. A `declareSchema(...)` helper is
   part of open decision 20.
7. **Attribute keys have no grammar.** The element resolves attribute paths by splitting on `.`
   (style bindings, legends, selectors, `"attribute"` options), so an attribute whose key contains
   a dot -- every RDF predicate IRI (`http://schema.org/name`), many CURIEs -- loads but can never
   be bound, selected or named by an option. Until open decision 29 settles an escaping rule, a
   reader SHOULD emit keys without `.` (for example a local name, `schema_name`) and document the
   mapping back to the source key.
8. **Within one load and across loads**, as built in 2.6.1 (`DataManager`):
   - node ids are compared by value AND type: the string `"1"` and the number `1` are two nodes;
   - a node id that arrives a second time -- in the same load or a later added load -- is
     IGNORED, attributes included: the first record wins and nothing reports the later one. (Open
     decision 19 must decide whether that stays; see there);
   - repeated edges follow the element's repeated-edge policy (`data.knownFields.repeatedEdges`,
     graph-format's `DuplicatePolicy`: `keep` by default, or `error`, `first`, `last`, `sum`,
     `min`, `max`). Under `keep`, every repeated record for an ordered pair becomes an edge of its
     own, and a reciprocal pair (A-B and B-A, which STRING emits for every interaction) is two
     edges even in an undirected load. `ImportReport.repeated` counts what the policy did. A
     reader MUST NOT merge repeats itself; the policy is the consumer's;
   - an edge naming a node no record declared creates that node (item 4);
   - the element applies the consumer's field mapping (`nodeIdPath`, `edgeSource`, `edgeTarget`,
     from the load options or `data.knownFields`) to the records of EVERY reader, built-in or
     plugin (`Graph.ts`, the load path). A plugin reader therefore emits its records in the
     source's own terms and leaves the mapping to the element; `resolveOptions` skipping those keys
     (section 6 item 2) is what lets it. **(not yet met)** `loadFromUrl` and `loadFromFile` put the
     mapping into the reader's options as `edgeSource` and `edgeTarget`, but
     `ELEMENT_OWNED_OPTIONS` (`DataSource.ts`) lists `edgeSrcIdPath` and `edgeDstIdPath` instead,
     so a conforming plugin reader's `resolveOptions` refuses `edgeSource` with
     `E_UNKNOWN_OPTION` whenever a consumer maps edges -- while a built-in, which skips
     `resolveOptions`, loads the same call. The fix adds `edgeSource` and `edgeTarget` to that set,
     and the parity suite loads a plugin format by URL and by `File` with an edge mapping;
   - ids are document-local in many formats (an RDF blank node `_:b0`, a GraphML id, an
     auto-numbered row) but the element matches them globally, so two files that both use `_:b0`
     for unrelated things merge them into one node under the default add. A reader SHOULD
     qualify such ids with something unique to the file until open decision 19 gives it a
     per-load token.
9. **Ids as the source spells them.** A reader SHOULD emit node ids and edge endpoints exactly as
   the source spells them, as strings, unless the format itself types them (GML integers) or the
   caller declares an id type. Leading zeros are significant in employee numbers, ZIP codes and
   many system keys, and because ids compare by value and type, a reader that emits `7157` as a
   number and another that emits `"7157"` make the same gene two nodes. **(not yet met)** The
   built-in CSV reader parses with `dynamicTyping: true`, so `00123` becomes the number 123, and
   it keeps node-list ids as numbers while turning edge-list endpoints into strings
   (`CSVDataSource.ts`), so a CSV node list and edge list of the same system do not even meet. The
   migration's CSV item, which requires every existing CSV test to pass unchanged, MUST NOT carry
   that coercion onto graph-io; the id type policy for loads and joins is open decision 19.

## 3. Registration

```ts
DataSource.register(RosterDataSource, options?: RegisterOptions): typeof RosterDataSource
```

Validation, each failure an `E_BAD_COMMAND` with `source: "registry"` and `details.field` naming
the static or member:

1. `static type` missing or empty -> `field: "type"`.
2. `static descriptor` missing or not an object -> `"descriptor"`.
3. `descriptor.id !== type` -> `"descriptor.id"`.
4. `descriptor.extensions` empty, or an entry not lower case or not beginning with `.` ->
   `"descriptor.extensions"`.
5. `descriptor.mimeTypes` empty -> `"descriptor.mimeTypes"`.
6. `descriptor.canExport === true` -> `"descriptor.canExport"` (until a writer seam exists).
7. `static detect` present and not a function -> `"detect"`.
8. A built-in id -> `E_DUPLICATE_PLUGIN`. Sameness for re-registration is decided by the class.

`register` files the class AND publishes the descriptor in one act. A descriptor without its reader
would be a catalogue entry a consumer can select and then be told does not exist; the element MUST
NOT offer a way to publish one without the other.

## 4. Detection

1. **By name.** A host that names the format (`{ format: "roster" }`) bypasses detection.
2. **By extension.** `detectFormats({ filename })` matches the file name's extension against every
   descriptor's `extensions`, built-ins first. Only descriptors that can READ take part (once
   writers exist, a writer-only descriptor claims nothing in detection; a "Save as" list shows
   only descriptors with `canExport: true`, section 8.3). **(not yet met)** For a URL,
   `loadFromUrl` takes the extension of the WHOLE URL, query string included:
   `https://x/data.json?v=2` matches nothing and `https://x/get?file=a.ttl` matches `.ttl`. The
   query and fragment MUST be stripped first.
3. **By content.** `detectFormats({ sample })` asks every built-in sniffer first, in the element's
   order, and only then each registered `detect`, in registration order.
4. **A registered sniffer can never take a file a built-in claims.** Content detection returns the
   built-in's id first however greedy the plugin's sniffer is. In practice this makes content
   detection unreachable for any tab- or space-separated plugin format: the built-in CSV sniffer
   (`graphty-element/src/catalog/detect.ts`) claims any line of the form word, separator, word, and
   `detectFormat({ sample })` then returns `csv`. Such a format is recognised by its extension or
   by name. Letting a specific sniffer outrank a generic one is open decision 2.
5. **Extension beats content.** When both a file name and a sample are given, the formats that
   claim the extension are the answer; the sample only reorders them (a claimant whose sniffer
   also accepts the sample comes first). Content is consulted on its own only when the extension
   is unknown or absent.
6. A `detect` that throws MUST be treated as returning `false`; the element MUST NOT fail the
   detection or the load because of it.
7. `detect` MUST be pure, synchronous and MUST NOT perform I/O. It SHOULD decide from the first
   line or first few hundred bytes: it runs on every file a reader drops. A throw is contained but
   time is not, so a catastrophically backtracking expression hangs every file drop. The element
   passes 2,048 characters from a file load, but the public `detectFormats({ sample })` passes any
   length. **(not yet met)** The element MUST truncate the sample to a documented maximum (4 KiB)
   before calling any registered `detect`, on every route.
8. `detect` receives text. A binary format cannot be sniffed by content in this version; it is
   recognised by extension or by name (open decision 20).
9. **Media types are declared but never consulted.** Every descriptor must list `mimeTypes`, but
   `DetectionInput` carries only a file name and a sample, so an HTTP `Content-Type` (`text/turtle`)
   and a dropped file's `File.type` are ignored. A URL with no known extension is therefore
   sniffed, and a generic built-in sniffer may claim it first (the CSV sniffer reads
   `@prefix foaf: <...> .` as space-separated words). Ranking a format whose `mimeTypes` match
   above content sniffing is part of open decision 2, with its matching rule: parameters stripped,
   compared case-insensitively, and a match on a GENERIC type (`text/plain`,
   `application/octet-stream`) never outranking a positive content sniff -- otherwise every `.txt`
   file and every `text/plain` response would go to whichever plugin claims `text/plain`, as the
   worked example must.
10. **A dialect of a built-in cannot win on the built-in's extension.** Among the formats that
    claim an extension, built-ins come first and the sample only reorders claimants whose sniffers
    accept it; the built-in JSON sniffer accepts any JSON, so a JSON-LD reader that also claims
    `.json` never reads a dropped `.json` file that is JSON-LD. The confidence model of open
    decision 2 is to apply among extension claimants too.

The graph-io importer contract uses a different model: `sniff(head: Uint8Array): number`, a
confidence from 0 to 1. After the migration the built-in sniffers delegate to graph-io, while
`detect(sample): boolean` remains the plugin contract. Whether plugin detection moves to the
confidence model is part of open decision 2.

## 5. What the built-in formats do, and parity

"Pinned by" names the `describe` block of
`graphty-element/test/browser/extensions/format-extension.test.ts` that holds the element to it.

| Capability | Route | Pinned by |
| --- | --- | --- |
| Loaded from a string | `graph.addDataFromSource("<id>", { data })` | "a third party's file format" |
| Loaded from a `File`, named or detected | `graph.loadFromFile(file, { format })`, `graph.loadFromFile(file)` | same |
| Loaded from a URL, with three attempts and exponential backoff | `graph.loadFromUrl(url)` | same. **(not yet met)** only when the format is named or recognised by extension: a URL whose extension is unknown is first fetched ONCE with a bare `fetch` for sniffing, with no retry, and a failure there is an uncoded `Error`, not `E_FETCH_FAILED` (`Graph.ts`, `loadFromUrl`) |
| Listed beside built-ins with its plain name | `session.catalog.formats()` | "...in the catalogue a picker is built from" |
| Found by the id a saved document records | catalogue lookup by id | "is found by the name a saved document records" |
| Found from a file name before the file is read | `detectFormats({ filename })` | "is found from a file name's extension..." |
| Recognised from content | `detectFormats({ sample })` | "...being recognised from a file" |
| Options published for an import dialog, defaulted and validated | `descriptor.options`, `resolveOptions` | "...being configured" |
| Coded failure for unreadable content and for an unreachable URL | `data-loading-error` event carrying `E_PARSE_FAILED` or `E_FETCH_FAILED` | "...failing" |
| Declaring what the file says about direction | `declareDirection` | "...declaring what its file says" |
| Per-record errors aggregated up to a limit | `errorAggregator`, `errorLimit` | inherited |
| Progress while loading | chunked ingestion | inherited |
| Added to the loaded graph by default, or replacing it with `{ replace: true }` | `addDataFromSource`, `loadFromFile`, `loadFromUrl` options | inherited |

Parity statements:

1. A registered reader MUST be reachable by every route in the table, with the same arguments a
   built-in takes.
2. **Cancellation is vacuous.** No load can be cancelled, built-in or plugin. When load
   cancellation is added it MUST reach every reader through the base class, preferably as an
   argument rather than an inherited member (README section 6.2 item 1); open decision 20.
3. **Errors: parity is inverted.** A registered reader reports `E_PARSE_FAILED` and
   `E_FETCH_FAILED`; the built-in readers still throw plain `Error`s. The built-ins are behind;
   the migration onto graph-io is expected to close this.
4. **Options: parity is inverted.** A registered reader's options are validated against its
   descriptor; the built-in readers skip `resolveOptions`.
5. **The per-record errors have no route to the consumer.** 2.6.1 publishes an `ImportReport` on
   `./session` for every load, built-in or plugin: the endpoint spelling used, node and edge
   counts after the load against the records handed over, rejected records, what the repeated-edge
   policy did, where weights came from, and how edges will be found again. It carries no
   per-record errors: a reader records those with `errorAggregator`, but nothing carries them to
   the consumer after a successful load, `DataLoadingError` has no severity (warning against
   blocking), and there is no preview. The skipped records therefore vanish. Extending the
   published `ImportReport` into a load report is open decision 19 (`LoadReport` in
   `file-format.d.ts` extends it; it is not a second shape); until it lands, a reader SHOULD NOT
   rely on per-record errors reaching anyone, and SHOULD fail the load (`E_PARSE_FAILED`) rather
   than silently skip data a reader would need to know about.
6. **What a load records.** A run records its key, version and options; a load records nothing a
   methods section can cite (format id, reader version, resolved options). A reader SHOULD declare
   `static version`, as an algorithm does, so that the load record of open decision 19 can carry
   it.

## 6. Options

1. A reader's options are its `descriptor.options`. The host passes them beside the base config:
   `addDataFromSource("roster", { data, scoreScale: 2 })`.
2. The reader MUST call `this.resolveOptions(opts)` in its constructor and MUST read option values
   only from its result. `resolveOptions` skips the keys the element itself puts in an options
   object unless the reader declares one -- as 2.6.1 builds the set, `data`, `file`, `url`,
   `chunkSize`, `errorLimit`, `filename`, `size`, `format`, `nodeIdPath`, `edgeSrcIdPath` and
   `edgeDstIdPath`; the load routes actually pass `edgeSource` and `edgeTarget`, which the set
   MUST also hold (section 2.2 item 8, not yet met) -- and validates
   everything else: an undeclared name is `E_UNKNOWN_OPTION` (with the nearest declared
   name in `details`), a bad value `E_OPTION_RANGE`.
3. A reader's constructor MAY narrow its parameter type to its own config interface (extending
   `BaseDataSourceConfig`), so reading its own options needs no cast.

## 7. Errors

| Code | When | `details` |
| --- | --- | --- |
| `E_BAD_COMMAND` | malformed registration | `kind: "format"`, `field` |
| `E_DUPLICATE_PLUGIN` | built-in id; different class under a taken id with `strict` | `kind`, `name`, `builtIn` |
| `E_UNKNOWN_FORMAT` | a load names a format nothing registered | `available`: every format and its directions |
| `E_UNKNOWN_OPTION`, `E_OPTION_RANGE` | host options fail validation | option name, nearest name |
| `E_PARSE_FAILED` | the content cannot be read | MUST carry `format`; SHOULD carry `line` (1-based) |
| `E_FETCH_FAILED` | the URL could not be fetched after the retries | `url` with its query string and user information removed, and the same redacted form in `message` **(not yet met:** 2.6.1 records the full URL in `details` and builds the message as "Failed to fetch from <url> ..." (`DataSource.ts`), so a token in a query string reaches every log destination whatever `details` holds; README section 9.2 item 7**)**, `attempts`; `recoverable: true` |
| `E_EDGE_ENDPOINTS_UNRESOLVED` | no endpoint spelling answers in a batch of edge records (section 2.2 item 4) | the keys the records carry |
| `E_EMPTY_LOAD` | the load produced no nodes | as built-ins |

1. A reader SHOULD throw `GraphtyError` with `source: "data"`. A non-`GraphtyError` thrown from
   `sourceFetchData` MUST be wrapped by the element as `E_PARSE_FAILED` with the original as
   `cause`. The parity suite pins only coded throws, so this is unverified for plugin readers and
   the suite needs a case for it.
2. A per-record problem that does not make the whole file unreadable SHOULD be recorded with
   `this.errorAggregator.addError(...)` and the record skipped. When `addError` returns `false` the
   limit is reached and the reader MUST stop by throwing `E_PARSE_FAILED`.
3. A failed load MUST reach the consumer through the `data-loading-error` event and the rejection
   of the load call, exactly as a built-in failure does. A load with `{ replace: true }` MUST leave
   the previous graph as it was. A default load ADDS to the graph, and 2.6.1 keeps (and paints)
   the rows that arrived before the failure, for built-ins and plugins alike -- including when the
   error limit of item 2 stops the reader part-way. Nothing marks those rows or says which load
   they came from, no report is produced for a failed load, and there is no way to remove them
   short of replacing everything: a 9-million-triple file that fails at triple 6 million leaves 6
   million triples silently merged into a graph built from other sources, and every later run
   computes over it. This is a DEFECT the parity rule does not excuse. Open decision 20
   recommends staged loads, committed only on success, so that a failed or cancelled load in any
   mode leaves the graph as it was. The parity suite does not pin any of this for plugin readers
   yet.

## 8. The writer (proposed; not built)

### 8.1 What an export contains -- decided

The owner decided on 2026-09-28 that an export contains "whatever the format supports". This
specification reads that as:

1. An export MUST carry everything the chosen format can represent: nodes, edges, their
   attributes, current positions, algorithm results (as node and edge attributes), and style
   information where the format has a place for it. "Algorithm results" means every field the
   result's descriptor declares, the element-derived ones included (`rank`, `percentile`,
   `groupSize`, as defined in `algorithm.md` section 2.2.3), so an exported ranking uses the
   element's tie rule and not the spreadsheet's.
2. Whatever the format cannot hold MUST be reported, as a `LossNote` per omission, before or with
   the export. An export MUST NOT silently drop anything.
3. The ELEMENT, not the writer, resolves style layers into concrete per-element values (colour,
   size, shape, thickness) and algorithm results into attribute columns, and hands the writer a
   `GraphSnapshot` whose role columns carry them. A writer therefore cannot disagree with the
   element about what a node looks like. This matches graph-io's `ExportCapabilities.viz` and
   `positions` flags.

Three consequences of item 3 conflict with items 1 and 2, and are open decision 24:

- A style MAPPING (a colour mapped from a column with a midpoint and a missing-value colour, a
  size mapped from a p-value) reaches the writer only as fixed per-element values. A format that
  can hold the mapping itself (CX2, XGMML) loses it, and today nothing raises a loss note for
  that. Whether "whatever the format supports" requires writing the mapping is a reading of the
  owner's decision that needs his confirmation.
- A writer never sees a run record, so an export into a format with graph-level attributes
  (GraphML, CX2) drops the method, parameters, seed and version behind the result columns it
  carries, without a loss note. The recommendation is that the element writes run records as graph
  attributes where the format has them, and raises a loss note otherwise.
- The names of exported result columns are not specified (`results.<runId>.value` carries dots
  and changes with the run id). A column name a third party reads back is a one-way door.
- **Results that are graph-level TABLES have no export route at all.** A pair-list's `pairs`, a
  temporal result's `steps`, `series` and `rates`, a category table's `categories` and a
  community's `sizes` are graph fields of type `table`; they are not node or edge attributes, so
  item 1 does not cover them, no writer receives them, and no loss note is defined for dropping
  them. A scored pair list for a Python pipeline, a metric time series for R, a cluster table or
  an enrichment table therefore cannot leave the element except by copying from the screen. The
  recommendation (open decision 24): an element-owned "export result table" operation that writes
  one run's table field as CSV or TSV, with the run record as a header block or a JSON sidecar,
  under the same escaping rules as item 4; and a writer that receives result tables beside the
  snapshot, raising `W_RESULT_TABLE_DROPPED` when its format has no place for one. The migration
  plan's `element-export-api` item builds its snapshot from "the data bags and current
  positions" only, so it carries neither results nor style; it must be widened to match item 1
  (README section 10).
- A vector field (an embedding, proposed in open decision 18) has no place in CSV, TSV or
  GraphML. The recommendation is that a writer without lists expands it into dimension-indexed
  columns (`<run>_<field>_0` .. `_<d-1>`) and raises a note only when a column limit is reached,
  because those are exactly the formats a feature pipeline reads.
- Carrying everything collides with operational security: an export for an outside partner must
  be able to hold only the attack path, with internal host names pseudonymised, and run
  provenance written into graph attributes reveals the hunt (the IOC values and target ids given
  as options). Whether a caller may export less, and whether provenance is written by default or
  only on request, are open decision 24; this document records the conflict with the owner's
  words rather than settling it.

Two further rules for any writer:

4. Every exported string -- values, attribute keys, node and edge ids, and exported column names
   -- MUST be escaped for the target syntax (XML and DOT quoting of keys and ids as well as values,
   CSV quoting). A CSV or TSV writer MUST, by default, neutralise a STRING cell, header cells
   included, that begins with `=`, `+`, `-`, `@`, tab or carriage return (a hostile GraphML key
   named `=HYPERLINK(...)` becomes a CSV header), because imported attribute values are untrusted and a spreadsheet executes
   a formula. It MUST NOT touch a value that is a finite number in the snapshot (a column of type
   `number` or `integer`): a negative fold change of `-2.31` is written as `-2.31`, or every
   down-regulated gene would be read back as text. The rule is per value type, the writer offers
   an option to switch neutralisation off for a pipeline that reads the file with a CSV parser,
   and the conformance kit checks that a numeric column with negative values round-trips byte for
   byte. **(not yet met)** graph-io's CSV writer, which the element's own export will use,
   neutralises nothing (README section 10 item 9).
5. Whether a caller may export a chosen subset (a selection, some columns, pseudonymised ids) and
   report each deliberate omission as a loss note is part of open decision 24, and needs the
   owner's confirmation as consistent with "whatever the format supports".
6. **An unmeasured value is absent.** An element the algorithm did not measure has no value
   (`algorithm.md` section 2.2 item 3) and no `rank` or `percentile`, and a writer MUST write that
   as the format's absent value -- no `<data>` element, an empty cell, JSON `null` -- never as a
   default or a sentinel, and MUST NOT declare a key default for a result column: a GraphML
   `<default>` of 0 would bring 30,000 isolated accounts back measured, low and ranked. A format
   that cannot express absence raises `W_UNMEASURED_AS_DEFAULT` (open decision 24). The kit exports
   a result with an unmeasured node and checks that it reads back absent.
7. **Element-internal columns are never exported.** The snapshot the element builds carries
   bookkeeping columns (`graphty.edgeId`, `graphty.nodeHash`, `graphty.edgeHash`,
   `graphty.edgeOrdinal`, `graphty.edgeAmong`, and before attachment `graphty.importPosition`);
   they are not data and are left out of every export. Pins (`graphty.pinned`) are reader state:
   whether they, and import positions, are exported as declared roles is part of open decision 24.
   The reserved `graphty.` record-key prefix (section 2.2 item 1) keeps a re-import from giving
   them the element's meaning. The migration's `element-export-api` item carries the same rule.

### 8.2 Where writers register -- NOT decided

This is README open decision 1. The three options, and what each means for a third party:

| | (A) Element wraps a graph-io exporter (recommended) | (B) graph-io registry directly | (C) Writer on the DataSource class |
| --- | --- | --- | --- |
| What the author writes | a graph-io `GraphExporter` plus a `FormatDescriptor` | a graph-io `GraphExporter` | a static writer method on the reader class |
| Registration | `registerFormatWriter({ descriptor, exporter })` on `./extend` | `FormatRegistry.registerExporter(exporter)` in graph-io | `DataSource.register` (unchanged) |
| In `session.catalog.formats()` with `canExport: true` | yes | only if the element polls graph-io | yes |
| Built-in ids reserved, `strict`, one warning | yes | no: graph-io replaces any name silently | yes |
| Options as `OptionDescriptor[]` | yes (`writerOptions`) | no: TypeScript generics only | yes |
| Failures as `GraphtyError` | yes, mapped by the element | no: graph-io `GraphFormatError` | yes |
| A writer without a reader | yes | yes | no |
| Consistent with the migration's direction (graph-io owns parsing and writing) | yes | yes | no |

Option B fails four parity clauses and makes the consumer wire graph-io to the element, which the
architectural principles forbid (a consumer must never write the integration). Option C ties a
writer to a class built around asynchronous record generation. Option A keeps the writing code in
graph-io's contract, where the built-in writers already live, and gives the third party the same
registration, catalogue, options and errors as every other point.

### 8.3 The writer contract under option A

These requirements apply only if option A is chosen.

1. `registerFormatWriter(registration, options?)` follows the shared policy (README section 4.2).
   Its id is `registration.descriptor.id`; sameness is decided by `registration.exporter`.
2. `registration.descriptor.canExport` MUST be `true`. If a reader for the same id is registered,
   the two descriptors MUST agree on `plainName`, `extensions` and `mimeTypes`, or the second
   registration is refused with `E_BAD_COMMAND`, `field: "descriptor"`; the catalogue publishes one
   entry with both flags true.
3. `registration.exporter.format` MUST equal the descriptor id.
   Detection and every load route consider only descriptors with `canImport: true`; a "Save as"
   list considers only descriptors with `canExport: true`. A writer registered under an id with no
   reader therefore never claims a file (two vendors' `.cx2` reader and writer cannot make a
   dropped `.cx2` fail with "no reader").
4. Before writing, the element MUST call `exporter.check(snapshot, options)` and MUST include every
   returned `LossNote` in the result. The exporter's `capabilities` MUST be truthful: a capability
   it claims and then drops is a conformance failure.
5. The element's export method (name and signature open: the migration plan's example is
   `exportGraph(format, options) -> Promise<{ text, lossNotes }>`) returns `ExportResult`. A single
   string cannot hold a multi-gigabyte export or a binary format, and graph-io's exporters already
   stream bytes, so `ExportResult` SHOULD carry bytes or a stream as well as text (open decision
   24).
6. A throw from the exporter MUST reach the consumer as a `GraphtyError`: `E_UNSUPPORTED` when the
   exporter refuses input it cannot represent under the chosen options (for example
   `onMixedDirection: "error"`), otherwise `E_INTERNAL` with `source: "data"`, the original as
   `cause`.
7. Loss-note codes are the exporter's; they SHOULD follow graph-io's `W_` prefix convention and
   MUST be stable across the exporter's minor versions.

### 8.4 The snapshot across the boundary

graph-format becomes a regular dependency of the element (owner decision, 2026-09-28), so a plugin
may have a different installed copy of graph-format than the one that built the snapshot.
`GraphSnapshot` is a class with a private member, which TypeScript compares by declaration, so a
writer MUST take the snapshot type from `./extend` (not its own graph-format), MUST read the
snapshot only through members published by the graph-format major the element depends on, and
MUST NOT use `instanceof` against graph-format classes (`algorithm.md` section 3.3).

Under option A this collides with "the writing code is graph-io's contract": graph-io's
`GraphExporter` is declared against graph-io's own graph-format import (`check(snapshot:
GraphSnapshot, ...)`, `graph-io/src/types.ts`), `./extend` re-exports no graph-io type, and
graph-io tests `instanceof GraphFormatError`, which fails across copies. An author who implements
`GraphExporter` from their own `@graphty/graph-io` gets their own graph-format's snapshot type. So
option A also requires `./extend` to re-export the writer vocabulary -- `GraphExporter`,
`ExportCapabilities`, `LossNote`, `CommonExportOptions` -- bound to the element's own graph-format
and graph-io, and a writer to take those types from `./extend`. That is part of open decision 1.

## 9. The reader after the migration

The migration (branch `feat/graph-format-migration`) rewrites the built-in readers as thin
`DataSource` subclasses over graph-io importers. From the consumer's side nothing changes: every
format is still a registered class in the catalogue. From an author's side there are then two
reader contracts in the monorepo: the element's `DataSource` (yield records) and graph-io's
`GraphImporter` (push into a builder, `sniff` by confidence).

This is README open decision 2. The recommendation is that `DataSource` remains the only contract
a third party registers, and that the element adds an adapter, `DataSource.fromImporter(importer,
descriptor)`, which returns a registrable class for an author who already has a graph-io importer.
Until that is decided, a third party writes a `DataSource` subclass as specified here.

## 10. Versioning and compatibility

- `FormatDescriptor` and the `DataSource` statics and abstract members are implemented by
  extensions (README section 6.2).
- When a writer seam lands, `canExport: true` stops being refused. A reader written for 2.6.1 is
  unaffected because it declares `false`. A plugin that ships a reader and a writer and declares
  `canExport: true` is refused OUTRIGHT by an element that predates writers, which loses the
  reader too; open decision 24 recommends that such an element publish `canExport: false` instead.
- The deprecated built-in ids `sif` and `cx2` are reserved until they are removed at a major
  release. They claim no extension, media type or content (they are listed only as unserved), so
  a `.sif` file reaches a registered SIF reader by extension. A third party MUST register under
  another id (for example `acme-cx2`), and a saved document naming `cx2` fails with the deprecation
  reason even when such a reader is installed; letting a reader answer a deprecated id is open
  decision 25.
- The record member names in section 2.2 are part of the contract, and so is the SET of reserved
  keys with their meanings. Records are written by extensions, so giving a new meaning to a key an
  existing reader may already emit (a reserved `time` or `label`) is a format-contract major, or it
  arrives only by opt-in -- a `declareSchema` declaration or a key under a reserved prefix no earlier
  reader can have emitted (README section 6.2 item 3; open decision 29).

## 11. Security

1. A reader runs with the page's privileges (README section 9.2).
2. A reader MUST fetch only the `url` it was given (through `getContent`, which applies the
   element's retry and timeout policy). It MUST NOT fetch any other resource -- a schema, a linked
   file, an enrichment service -- unless the format's specification requires it and the reader's
   documentation says so. A format that needs a service is a data source, not a file format; see
   `candidates.md`.
3. A reader MUST treat its input as untrusted: it MUST NOT evaluate content as code, MUST NOT build
   regular expressions from content, and SHOULD bound recursion and allocation by the input's size
   (an XML entity expansion, a deeply nested JSON document).
4. `detect` receives untrusted text and MUST NOT perform I/O.
5. **(not yet met)** `getContent` bounds only the time to receive response headers: the body of a
   URL (`response.text()`) and of a `File` (`file.text()`) is read with no size cap and no time
   limit, and the load cannot be cancelled, so a server that drip-feeds bytes or a multi-gigabyte
   file holds the load forever. Limits on bytes, body time, node and edge counts and nesting depth
   are element obligations every reader inherits, not something each reader re-implements; open
   decision 20.
6. A `url` passed to a load is fetched with no confirmation and no allowlist. An embedder-set
   origin allowlist checked by every element fetch is part of open decision 13.

## 12. Conformance checks

Run by `checkFormat(ReaderClass, { samples, invalidSamples })` in the proposed kit (README section
11.2). All run in Node except the last, which needs the browser configuration.

| Check | Passes when |
| --- | --- |
| registers | `DataSource.register` accepts the class and `registeredFormatDescriptors()` contains its descriptor |
| descriptor is valid | the descriptor validates against `#/$defs/FormatDescriptor` |
| id is not reserved | the id is not in `KNOWN_FORMAT_IDS` |
| extension detection | `detectFormat({ filename: "x" + ext })` returns the id for every declared extension no built-in also claims, and `detectFormats` includes it otherwise |
| content detection | for every sample marked `detectable`, `detectFormat({ sample })` RETURNS the id; a sample a built-in also claims is reported as "recognised by extension only" (a warning naming the built-in), not as a pass |
| does not steal built-in files | for each file in the kit's built-in corpus, `detect` either returns false or the built-in id ranks first |
| sniffer is safe | `detect` returns a boolean for empty, binary-looking and 4 KiB inputs and for the kit's backtracking-probe corpus; the time it took is reported as a measurement |
| makes no network request | with the network APIs of README section 9.4 item 2 trapped, loading a sample from `data` makes no call (mistake detection only) |
| reads the samples | each sample yields, after INGESTION (not records yielded: repeated node ids, repeated edges under the policy and created endpoints all change the counts, section 2.2 item 8), the expected node and edge counts; every node has `id`, every edge has `source` and `target`. The Node run needs the headless session of open decision 9 to run the element's ingestion; until then the Node check counts records and the browser check counts the graph |
| duplicates are the element's | a sample with a repeated node line and a repeated edge gives the counts section 2.2 item 8 predicts, and the reader merged nothing itself |
| document-local ids stay local | loading the same sample with document-local ids twice (added) gives disjoint nodes (fails until open decision 19 gives a per-load token, unless the reader qualifies its ids) |
| reserved keys are used as reserved | a sample with coordinates yields `position`, and one with a strength column yields the configured weight key (skipped when the format has neither) |
| edge ids are stable | the same sample with its edges in another order, loaded with `edgeIdPath: "id"`, gives every edge the same id (skipped when the format has no natural edge name) |
| generated ids are injective | a sample whose node names contain the reader's own separator and ordinal text yields no two edges with one id |
| ids keep their spelling | a sample with leading-zero and mixed-width ids (`00123`, `0123`, `123`) yields three distinct node ids, spelled as in the file |
| options default and validate | each declared option's default is applied when omitted; an undeclared name raises `E_UNKNOWN_OPTION`; a value outside `min`/`max`/`values` raises `E_OPTION_RANGE` |
| invalid input fails coded | each invalid sample fails with `E_PARSE_FAILED`, `details.format` equal to the id |
| records are JSON | every record survives `JSON.parse(JSON.stringify(record))` unchanged |
| loads through every route | the sample loads through a string, a `File` and a URL served by the kit, with equal counts (browser) |

A writer (when one exists) adds: "round trips" (every sample the reader reads, the writer writes and
the reader reads back with equal counts, ids and the attributes the capabilities claim), "loss
notes are truthful" (for a snapshot with a feature the capabilities deny, `check` returns a note),
"numbers survive" (a numeric column with negative values round-trips byte for byte through CSV
and TSV) and "writer-only claims nothing" (a writer registered without a reader is absent from
`detectFormats` for its extensions). When element-owned decompression lands (open decision 20),
the kit adds a bomb corpus: a small gzip that inflates past the byte limit, a nested zip and a
zip with several entries, each refused with a coded error.

## 13. Worked example

A reader for SIF (Simple Interaction Format, used by Cytoscape and the need in
`design/designloom/workflows/W20.yaml`), registered under a vendor id because `sif` is a reserved
built-in id until it is removed:

```ts
import { DataSource, GraphtyError, type BaseDataSourceConfig, type DataSourceChunk, type FormatDescriptor }
    from "@graphty/graphty-element/extend";

interface SifConfig extends BaseDataSourceConfig { directed?: boolean }

class SifDataSource extends DataSource {
    static override type = "acme-sif";
    static override descriptor: FormatDescriptor = {
        id: "acme-sif",
        plainName: "Simple Interaction Format",
        extensions: [".sif"],
        mimeTypes: ["text/plain"],                        // generic: SIF has no registered type (section 4 item 9)
        canImport: true,
        canExport: false,
        options: [{ name: "directed", plainName: "Directed interactions", type: "boolean", default: false }],
    };
    // "nodeA <relationship> nodeB [nodeC ...]", tab separated. Require it on several lines, and a
    // short relation token rather than a URL, so a GMT gene-set file ("NAME<tab>http://...<tab>GENE")
    // is not claimed.
    static override detect = (sample: string): boolean => {
        const lines = sample.split(/\r?\n/).filter((line) => line.trim() !== "").slice(0, 5);
        return lines.length >= 2 && lines.every((line) => /^[^\t]+\t[A-Za-z][\w-]{0,15}\t[^\t]+/.test(line));
    };

    readonly #config: SifConfig;
    readonly #directed: boolean;

    constructor(opts: SifConfig) {
        super(opts.errorLimit, opts.chunkSize);
        this.#config = opts;
        this.#directed = this.resolveOptions(opts).directed === true;
    }

    protected getConfig(): BaseDataSourceConfig { return this.#config; }

    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        const text = await this.getContent();
        const ids = new Set<string>();
        const edges = [];
        const emitted = new Set<string>();               // every edge id so far, so ids stay injective
        for (const [index, line] of text.split(/\r?\n/).entries()) {
            if (line.trim() === "") continue;
            const [source, relation, ...targets] = line.split(line.includes("\t") ? "\t" : /\s+/);
            if (relation === undefined) {
                ids.add(source);                         // a lone node
                continue;
            }
            if (targets.length === 0) {
                throw new GraphtyError({ code: "E_PARSE_FAILED", source: "data",
                    message: `line ${index + 1} names a relationship with no target`,
                    details: { format: "acme-sif", line: index + 1 } });
            }
            ids.add(source);
            for (const target of targets) {
                ids.add(target);
                // Cytoscape's own edge name, "A (pp) B"; a repeat takes the next FREE ordinal, so
                // a node named "B #2" cannot reproduce another edge's id (section 2.2 item 3). The
                // element reads it as the edge's identity only under edgeIdPath: "id".
                const name = `${source} (${relation}) ${target}`;
                let id = name;
                for (let n = 2; emitted.has(id); n++) id = `${name} #${n}`;
                emitted.add(id);
                edges.push(DataSource.toRecord({ id, source, target, relation }));
            }
        }
        this.declareDirection(this.#directed, "the directed option");
        yield* this.chunkData([...ids].map((id) => DataSource.toRecord({ id })), edges);
    }
}

DataSource.register(SifDataSource);
await graph.loadFromFile(droppedFile);            // recognised by ".sif"; by content alone, the CSV
                                                  // sniffer claims tab-separated text first (section 4)
```

## 14. Known gaps

- No writer seam; `canExport: true` is refused (section 8). No CX2 file can be produced, so the
  NDEx deliverable of `design/designloom/workflows/W25.yaml` is unmet, and that workflow's
  adoption note claiming CX2 export is wrong until open decision 1 is taken and a writer ships.
- Imports cannot be cancelled, for any reader; body size and time are unbounded (section 11).
- `getContent` returns one string: no binary format from a URL, no compressed file, no file larger
  than the engine's maximum string (open decision 20).
- Built-in readers throw uncoded errors and skip option validation (parity inverted).
- `detect` sees text only, and content detection cannot reach a tab-separated plugin format
  (section 4).
- Per-record errors, a preview and a load record have no route to the consumer (section 5).
- How a second load combines with the first beyond add or replace (id collisions, joining an
  attribute table by key, provenance per element) is unspecified (open decision 19).
- A reader takes one input; a job that needs two files (an enrichment table and a gene-set file)
  or a non-graph lookup table has no route in any point (open decision 22).
- Wrapping of uncoded throws and the outcome of a failed load are not pinned by the parity suite
  for plugin readers (section 7).
- A failed or error-limited added load leaves its rows merged, unmarked and unremovable
  (section 7 item 3).
- Graph-level result tables cannot be exported (section 8.1).
- A repeated node record is silently ignored, attributes included (section 2.2 item 8).
- Detection ignores media types, takes a URL's extension with its query string, and fetches an
  unknown URL once without retry (section 4).
- Attribute keys containing `.` load but cannot be bound (section 2.2 item 7).
- A plugin reader refuses an edge field mapping that a built-in accepts (`edgeSource`,
  `edgeTarget`; section 2.2 item 8).
- An edge record's `id` is read only under a global `edgeIdPath`, and then matched across every
  load (section 2.2 item 3).
- The built-in CSV reader turns `00123` into the number 123 and types node-list and edge-list ids
  differently (section 2.2 item 9).
- Multi-dot extensions register but never match (section 2.1); input is always decoded as UTF-8
  and missing-value tokens are not recognised (open decision 20).
- An unmeasured result value and the element's internal columns have export rules no writer
  implements yet (section 8.1 items 6 and 7).
- A reader cannot report progress in bytes or against a known total, so a large plugin format
  shows no progress until its first chunk (open decision 20).

## 15. Who this serves

| Need | Source | Served |
| --- | --- | --- |
| Import CSV, JSON, GraphML, GEXF, GML with detection | `design/designloom/workflows/W18.yaml`, `W01.yaml` | yes |
| A validation and quality report, a preview, field mapping for a plugin format | `design/designloom/workflows/W18.yaml` | not yet: open decision 19 |
| STRING and BioGRID edge-list FILES | `design/designloom/workflows/W20.yaml` | yes; compressed releases need open decision 20 |
| A STRING or BioGRID QUERY from a gene list | `design/designloom/workflows/W20.yaml`, `W08.yaml` | not yet: a service is a data source (open decision 15) |
| A gene list joined to an attribute table, with a match report | `design/designloom/workflows/W20.yaml` | not yet: open decision 19 |
| GMT gene sets and identifier lists | `design/designloom/workflows/W22.yaml` | partly: a GMT reader that yields a bipartite gene-set-to-gene graph conforms today; joining the enrichment table onto the gene-set nodes needs open decision 19, and an enrichment map needs the "apply as edges" operation (`candidates.md` section 18); a gene set as a run input is open decision 22 |
| GraphML and CX for collaborators, upload to NDEx, tables as CSV | `design/designloom/workflows/W25.yaml`, `W21.yaml`, `W23.yaml`, `W24.yaml` | not yet: no writer seam (open decision 1); upload is a data-source publish direction (open decision 15) |
| RDF and OWL files | `design/designloom/personas/knowledge-engineer.yaml` | partly: a reader loads them, but predicate IRIs cannot be bound (open decision 29), blank nodes merge across files (open decision 19), and types, languages, labels and prefixes need open decision 20 |
| Refreshing one of several integrated sources | `design/designloom/workflows/W13.yaml` | not yet: no load keeps its source, so none can be replaced alone (open decision 19) |
| Two conditions side by side (tumor and normal logFC) | `design/designloom/workflows/W24.yaml` | not yet: a second load of the same genes is ignored, and a join has no column-collision policy (open decision 19) |
| Scored pairs, clusters and enrichment tables as CSV | `design/designloom/workflows/W16.yaml`, `W21.yaml`, `W22.yaml`, `W23.yaml` | not yet: no table export (section 8.1; open decision 24) |
| Many source systems, SPARQL endpoints and databases | `design/designloom/workflows/W13.yaml` | not yet: open decisions 15 and 19 |
| Features exported to ML pipelines | `design/designloom/workflows/W16.yaml` | not yet: no writer seam; binary and streamed output need open decision 24 |
