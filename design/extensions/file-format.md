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
3. An edge record MAY carry `id`; when absent the element assigns one.
4. An edge MAY reference a node the reader never yielded; the element's handling of dangling
   endpoints (`E_EDGE_ENDPOINTS_UNRESOLVED`, or creating the node when the load asks for it) is the
   same as for built-ins.
5. Attribute values MUST be JSON-compatible (string, number, boolean, null, arrays and plain
   objects of those). A reader MUST NOT put functions, class instances or cyclic structures in a
   record.

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
   built-in's id first however greedy the plugin's sniffer is.
5. A `detect` that throws MUST be treated as returning `false`; the element MUST NOT fail the
   detection or the load because of it.
6. `detect` MUST be pure, synchronous and MUST NOT perform I/O. It SHOULD decide from the first
   line or first few hundred bytes and SHOULD return in well under a millisecond: it runs on every
   file a reader drops.
7. `detect` receives text. A binary format cannot be sniffed by content in this version; it is
   recognised by extension or by name.

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

Parity statements:

1. A registered reader MUST be reachable by every route in the table, with the same arguments a
   built-in takes.
2. **Cancellation is vacuous.** No load can be cancelled, built-in or plugin. When load
   cancellation is added it MUST be added to the base class so every reader gets it.
3. **Errors: parity is inverted.** A registered reader reports `E_PARSE_FAILED` and
   `E_FETCH_FAILED`; the built-in readers still throw plain `Error`s. The built-ins are behind;
   the migration onto graph-io is expected to close this.
4. **Options: parity is inverted.** A registered reader's options are validated against its
   descriptor; the built-in readers skip `resolveOptions`.

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
| `E_FETCH_FAILED` | the URL could not be fetched after the retries | `url`, `attempts`; `recoverable: true` |
| `E_EMPTY_LOAD` | the load produced no nodes | as built-ins |

1. A reader SHOULD throw `GraphtyError` with `source: "data"`. A non-`GraphtyError` thrown from
   `sourceFetchData` MUST be wrapped by the element as `E_PARSE_FAILED` with the original as
   `cause` **(not yet met: verify; the parity suite covers only coded throws)**.
2. A per-record problem that does not make the whole file unreadable SHOULD be recorded with
   `this.errorAggregator.addError(...)` and the record skipped. When `addError` returns `false` the
   limit is reached and the reader MUST stop by throwing `E_PARSE_FAILED`.
3. A failed load MUST reach the consumer through the `data-loading-error` event and the rejection
   of the load call, exactly as a built-in failure does, and SHOULD leave the previously loaded
   graph in place **(not yet met: verify for plugin readers)**.

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
   `GraphSnapshot` whose role columns carry them. A writer therefore never sees the style model,
   the layer stack or a run record, and cannot disagree with the element about what a node looks
   like. This matches graph-io's `ExportCapabilities.viz` and `positions` flags.

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
   `exportGraph(format, options) -> Promise<{ text, lossNotes }>`) returns `ExportResult`.
6. A throw from the exporter MUST reach the consumer as a `GraphtyError`: `E_UNSUPPORTED` when the
   exporter refuses input it cannot represent under the chosen options (for example
   `onMixedDirection: "error"`), otherwise `E_INTERNAL` with `source: "data"`, the original as
   `cause`.
7. Loss-note codes are the exporter's; they SHOULD follow graph-io's `W_` prefix convention and
   MUST be stable across the exporter's minor versions.

### 8.4 The snapshot across the boundary

graph-format becomes a regular dependency of the element (owner decision, 2026-09-28), so a plugin
may import its `GraphSnapshot` type from a different installed copy of graph-format than the one
that built the snapshot. A writer MUST read the snapshot only through members published by
graph-format 1.x and MUST NOT use `instanceof` against graph-format classes. graph-format's
snapshot is structural data (typed arrays and plain objects), so this is sufficient.

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
  unaffected because it declares `false`.
- The deprecated built-in ids `sif` and `cx2` are reserved until they are removed at a major
  release. After removal, a third party MAY register a reader under either id; until then it MUST
  use another id (for example `acme-cx2`), and a saved document naming `cx2` fails with the
  deprecation reason.
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

## 12. Conformance checks

Run by `checkFormat(ReaderClass, { samples, invalidSamples })` in the proposed kit (README section
11.2). All run in Node except the last, which needs the browser configuration.

| Check | Passes when |
| --- | --- |
| registers | `DataSource.register` accepts the class and `registeredFormatDescriptors()` contains its descriptor |
| descriptor is valid | the descriptor validates against `#/$defs/FormatDescriptor` |
| id is not reserved | the id is not in `KNOWN_FORMAT_IDS` |
| extension detection | `detectFormats({ filename: "x" + ext })` includes the id for every declared extension |
| content detection | for every sample marked `detectable`, `detectFormats({ sample })` includes the id |
| does not steal built-in files | for each file in the kit's built-in corpus, `detect` either returns false or the built-in id ranks first |
| sniffer is safe | `detect` returns a boolean for empty, binary-looking and 1 MB inputs, within 5 ms each |
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
await graph.loadFromFile(droppedFile);            // recognised by ".sif" or by content
```

## 14. Known gaps

- No writer seam; `canExport: true` is refused (section 8).
- Imports cannot be cancelled, for any reader.
- Built-in readers throw uncoded errors and skip option validation (parity inverted).
- `detect` sees text only; binary formats are recognised by extension or name.
- Wrapping of uncoded throws and keeping the previous graph on failure are not pinned by the parity
  suite (section 7).

## 15. Who this serves

| Need | Source |
| --- | --- |
| Import CSV, JSON, GraphML, GEXF, GML with detection and a match report | `design/designloom/workflows/W18.yaml`, `W01.yaml` |
| STRING and BioGRID edge lists, a gene list joined to an attribute table | `design/designloom/workflows/W20.yaml` |
| GMT gene sets and identifier lists | `design/designloom/workflows/W22.yaml` |
| GraphML and CX for collaborators, upload to NDEx, tables as CSV | `design/designloom/workflows/W25.yaml`, `W21.yaml`, `W23.yaml`, `W24.yaml` |
| Many source systems, RDF and OWL | `design/designloom/workflows/W13.yaml`, `design/designloom/personas/knowledge-engineer.yaml` |
| Features exported to ML pipelines | `design/designloom/workflows/W16.yaml` |
