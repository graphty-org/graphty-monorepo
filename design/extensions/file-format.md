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
| `extensions` | At least one; each MUST begin with `.` and MUST be lower case |
| `mimeTypes` | At least one; each a `type/subtype` media type |
| `canImport` | MUST be `true` for a registered reader |
| `canExport` | MUST be `false` in 2.6.1 |
| `options` | The reader's options (README section 7); MAY be empty |

### 2.2 Records

A reader yields `DataSourceChunk`s of `AdHocData` records built with `DataSource.toRecord`:

1. A node record MUST carry `id` (string or number). Every other member is an attribute.
2. An edge record MUST carry its endpoints as `source` and `target`. The element also accepts
   `src`/`dst` and `from`/`to`, in that order of preference, but a reader SHOULD emit
   `source`/`target`: that is what every built-in emits and what `session.data.edge(id)` returns.
3. An edge record MAY carry `id`; when absent the element assigns one. The specification does not
   yet promise that an assigned id is stable across reloads of an updated source, so saved results,
   annotations and sets that name an assigned edge id can point elsewhere after a reload. A reader
   whose format has natural edge ids SHOULD emit them. Deterministic assignment is part of open
   decision 19.
4. An edge MAY reference a node the reader never yielded; the element creates that node, as it
   does for built-ins. `E_EDGE_ENDPOINTS_UNRESOLVED` is something else: the element raises it when
   no endpoint spelling (`source`/`target`, `src`/`dst`, `from`/`to`) answers in a batch of edge
   records. A reader that emits `source`/`target` never meets it.
5. Attribute values MUST be JSON-compatible (string, number, boolean, null, arrays and plain
   objects of those). A reader MUST NOT put functions, class instances or cyclic structures in a
   record.
6. A record has no way to say which attribute is the node's display label, what type an attribute
   is (a date, an integer, a list), or what the graph-level metadata is (a prefix map, a named
   graph). Those are dropped or arrive as plain strings, and a writer cannot report a loss it never
   knew about. A `declareSchema(...)` helper is part of open decision 20.

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
   descriptor's `extensions`, built-ins first.
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
| Loaded from a URL, with three attempts and exponential backoff | `graph.loadFromUrl(url)` | same |
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
5. **The per-record errors have no route to the consumer.** A reader records per-record problems
   with `errorAggregator`, but the specification names no event, load result or report that
   carries them to the consumer after a successful load, `DataLoadingError` has no severity
   (warning against blocking), and there is no preview (the first records before a full load).
   The skipped records therefore vanish. The load report is open decision 19; until it lands, a
   reader SHOULD NOT rely on per-record errors reaching anyone, and SHOULD fail the load
   (`E_PARSE_FAILED`) rather than silently skip data a reader would need to know about.
6. **What a load records.** A run records its key, version and options; a load records nothing a
   methods section can cite (format id, reader version, resolved options). A reader SHOULD declare
   `static version`, as an algorithm does, so that the load record of open decision 19 can carry
   it.

## 6. Options

1. A reader's options are its `descriptor.options`. The host passes them beside the base config:
   `addDataFromSource("roster", { data, scoreScale: 2 })`.
2. The reader MUST call `this.resolveOptions(opts)` in its constructor and MUST read option values
   only from its result. `resolveOptions` skips the keys the element itself puts in an options
   object (`data`, `file`, `url`, `chunkSize`, `errorLimit`, `filename`, `size`, `format`,
   `nodeIdPath`, `edgeSrcIdPath`, `edgeDstIdPath`) unless the reader declares one, and validates
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
| `E_FETCH_FAILED` | the URL could not be fetched after the retries | `url` with its query string and user information removed **(not yet met:** 2.6.1 records the full URL, so a token in a query string reaches every log destination**)**, `attempts`; `recoverable: true` |
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
   the rows that arrived before the failure, for built-ins and plugins alike. The parity suite
   does not pin either for plugin readers yet.

## 8. The writer (proposed; not built)

### 8.1 What an export contains -- decided

The owner decided on 2026-09-28 that an export contains "whatever the format supports". This
specification reads that as:

1. An export MUST carry everything the chosen format can represent: nodes, edges, their
   attributes, current positions, algorithm results (as node and edge attributes), and style
   information where the format has a place for it.
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

Two further rules for any writer:

4. Every exported value MUST be escaped for the target syntax (XML, DOT and CSV quoting). A CSV or
   TSV writer MUST neutralise a leading `=`, `+`, `-`, `@`, tab or carriage return in a cell, by
   default, because imported attribute values are untrusted and a spreadsheet executes a formula.
5. Whether a caller may export a chosen subset (a selection, some columns, pseudonymised ids) and
   report each deliberate omission as a loss note is part of open decision 24, and needs the
   owner's confirmation as consistent with "whatever the format supports".

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
- The record member names in section 2.2 are part of the contract.

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
| makes no network request | with `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and `sendBeacon` trapped, loading a sample from `data` makes no call |
| reads the samples | each sample yields the expected node and edge counts, every node has `id`, every edge has `source` and `target` |
| options default and validate | each declared option's default is applied when omitted; an undeclared name raises `E_UNKNOWN_OPTION`; a value outside `min`/`max`/`values` raises `E_OPTION_RANGE` |
| invalid input fails coded | each invalid sample fails with `E_PARSE_FAILED`, `details.format` equal to the id |
| records are JSON | every record survives `JSON.parse(JSON.stringify(record))` unchanged |
| loads through every route | the sample loads through a string, a `File` and a URL served by the kit, with equal counts (browser) |

A writer (when one exists) adds: "round trips" (every sample the reader reads, the writer writes and
the reader reads back with equal counts, ids and the attributes the capabilities claim), and "loss
notes are truthful" (for a snapshot with a feature the capabilities deny, `check` returns a note).

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
        mimeTypes: ["text/plain"],
        canImport: true,
        canExport: false,
        options: [{ name: "directed", plainName: "Directed interactions", type: "boolean", default: false }],
    };
    // "nodeA <relationship> nodeB [nodeC ...]", tab or space separated
    static override detect = (sample: string): boolean => /^\S+\t\S+\t\S+/.test(sample);

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
                edges.push(DataSource.toRecord({ source, target, relation }));
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

## 15. Who this serves

| Need | Source | Served |
| --- | --- | --- |
| Import CSV, JSON, GraphML, GEXF, GML with detection | `design/designloom/workflows/W18.yaml`, `W01.yaml` | yes |
| A validation and quality report, a preview, field mapping for a plugin format | `design/designloom/workflows/W18.yaml` | not yet: open decision 19 |
| STRING and BioGRID edge-list FILES | `design/designloom/workflows/W20.yaml` | yes; compressed releases need open decision 20 |
| A STRING or BioGRID QUERY from a gene list | `design/designloom/workflows/W20.yaml`, `W08.yaml` | not yet: a service is a data source (open decision 15) |
| A gene list joined to an attribute table, with a match report | `design/designloom/workflows/W20.yaml` | not yet: open decision 19 |
| GMT gene sets and identifier lists | `design/designloom/workflows/W22.yaml` | not yet: not a graph; open decision 22 |
| GraphML and CX for collaborators, upload to NDEx, tables as CSV | `design/designloom/workflows/W25.yaml`, `W21.yaml`, `W23.yaml`, `W24.yaml` | not yet: no writer seam (open decision 1); upload is a data-source publish direction (open decision 15) |
| RDF and OWL files | `design/designloom/personas/knowledge-engineer.yaml` | reader yes; types, labels and prefixes need open decision 20 |
| Many source systems, SPARQL endpoints and databases | `design/designloom/workflows/W13.yaml` | not yet: open decisions 15 and 19 |
| Features exported to ML pipelines | `design/designloom/workflows/W16.yaml` | not yet: no writer seam; binary and streamed output need open decision 24 |
