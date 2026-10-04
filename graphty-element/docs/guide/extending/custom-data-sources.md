# Custom file formats

The element reads JSON, GraphML, GEXF, CSV, GML, DOT, Pajek, XGMML, CX, CX2, Cytoscape sessions
and OBO. A format it does not ship is a class extending `DataSource`, and registering it puts the
format everywhere the built-in ones are: in the catalogue an import dialog reads, in extension and content detection, and in every
call that names a format by string.

There are two ways to write one:

- **Extend `DataSource` yourself** (below).
- **Wrap a graph-io importer** with `DataSource.fromImporter` (see
  [Wrapping a graph-io importer](#wrapping-a-graph-io-importer)), when you already have one or
  would rather push into a builder than build records.

## The whole of it

```ts
import {
    type BaseDataSourceConfig,
    DataSource,
    type DataSourceChunk,
    type FormatDescriptor,
    GraphtyError,
} from "@graphty/graphty-element/extend";

/** What a host may pass this format beyond what `BaseDataSourceConfig` declares. */
interface RosterConfig extends BaseDataSourceConfig {
    scoreScale?: number;
}

/** What the catalogue publishes, and what an import dialog renders. */
const ROSTER_DESCRIPTOR: FormatDescriptor = {
    id: "roster",
    plainName: "Team Roster",
    extensions: [".roster"],
    mimeTypes: ["text/vnd.acme.roster"],
    canImport: true,
    canExport: false,
    options: [
        {
            name: "scoreScale",
            plainName: "Score multiplier",
            type: "number",
            default: 1,
            min: 0.1,
            max: 1000,
            description: "Multiplies every score in the file as it is read.",
        },
    ],
};

class RosterDataSource extends DataSource {
    /** The name a host asks for this format by, and the name the reader is filed under. */
    static override type = "roster";

    /** What the catalogue publishes about it. Registration refuses a reader without one. */
    static override descriptor: FormatDescriptor = ROSTER_DESCRIPTOR;

    /** Optional: recognise the format from its first bytes, for a file whose name says nothing. */
    static override detect = (sample: string): boolean => /^(roster|person|knows)\s/m.test(sample);

    readonly #config: RosterConfig;
    readonly #scoreScale: number;

    // Declare the config THIS format accepts. A subclass may narrow a constructor parameter, so
    // you never write `as` to read your own options.
    constructor(opts: RosterConfig) {
        super(opts.errorLimit ?? 100, opts.chunkSize ?? DataSource.DEFAULT_CHUNK_SIZE);
        this.#config = opts;

        // The element checks what the host passed against the options the descriptor DECLARED,
        // fills in the declared defaults, and refuses an unknown name or an out-of-range value.
        const resolved = this.resolveOptions(opts);
        this.#scoreScale = typeof resolved.scoreScale === "number" ? resolved.scoreScale : 1;
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.#config;
    }

    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        // Inherited: reads from `data` (text or bytes), a `File` or a `url`, with retries and a
        // timeout, and decodes bytes as UTF-8 unless a byte-order mark names another encoding.
        const text = await this.getContent();
        const nodes = [];
        const edges = [];

        for (const [index, raw] of text.split("\n").entries()) {
            const line = raw.trim();

            if (line === "" || line.startsWith("#")) {
                continue;
            }

            const [verb, first, second, third] = line.split(/\s+/);

            if (verb === "person") {
                nodes.push(DataSource.toRecord({ id: first, team: second, score: Number(third) * this.#scoreScale }));
            } else if (verb === "knows") {
                edges.push(DataSource.toRecord({ source: first, target: second }));
            } else {
                throw new GraphtyError({
                    code: "E_PARSE_FAILED",
                    message: `roster line ${index + 1} begins with "${verb}", which is not "person" or "knows"`,
                    source: "data",
                    details: { format: "roster", line: index + 1 },
                });
            }
        }

        // Tell the element what the FILE says about direction, before the first chunk. A source
        // that says nothing leaves the element's own configuration standing.
        this.declareDirection(false, "a roster links people both ways");

        // Inherited: splits the records into chunks the element ingests one at a time.
        for (const chunk of this.chunkData(nodes, edges)) {
            yield chunk;
        }
    }
}

DataSource.register(RosterDataSource);
```

That is a whole format. Fetching the bytes from a string, a `File` or a URL, three attempts with
exponential backoff, chunking, per-record validation, error aggregation, progress reporting and
the direction declaration are all inherited.

A reader that needs the bytes themselves -- a binary format, or one that reads an encoding
declaration -- calls `this.getBytes()` instead of `this.getContent()`, and gets a `Uint8Array`
with nothing decoded. A format whose file can hold several graphs declares
`static listGraphs(input)`, answering `[{ index, name, nodes, edges }, ...]` for the file's text or
bytes; it then reads the graph `this.graphChoice()` names (`{ graphIndex }`, `{ graphName }`, or
`{}` for the first), and `listGraphs` from `./catalog` lists a file's graphs through it.

**Name your endpoint keys `source` and `target`.** The element probes `source`/`target` first,
then `src`/`dst`, then `from`/`to`, so all three work -- but `source`/`target` is the spelling
every other door into the element publishes, it is what a consumer reading your records back
through `session.data.edge(id)` will see, and it is what the built-in formats now emit. A source
that emits anything else makes its records look unlike everybody else's for no gain.

## Wrapping a graph-io importer

A `GraphImporter` from `@graphty/graph-io` is an object whose `import(input, sink, options)`
pushes nodes and edges into a builder and returns a report. `DataSource.fromImporter(importer,
descriptor)` turns one into a reader class you register like any other:

```ts
import {
    DataSource,
    type FormatDescriptor,
    type GraphImporter,
    type ImporterReport,
    ImportError,
    type ImportIssue,
} from "@graphty/graphty-element/extend";

/** One line per shipment: `exporter<TAB>importer<TAB>value`. */
const tradeFlowsImporter: GraphImporter = {
    format: "trade-flows",
    extensions: [".trade"],
    mimeTypes: ["text/vnd.acme.trade-flows"],

    import(input, sink) {
        // Inline text arrives as it was given; a file or a URL arrives as its bytes.
        if (typeof input !== "string" && !(input instanceof Uint8Array)) {
            return Promise.reject(new TypeError("the trade-flows importer reads text or bytes"));
        }

        const text = typeof input === "string" ? input : new TextDecoder().decode(input);

        const issues: ImportIssue[] = [];
        const report = (): ImporterReport => ({
            format: "trade-flows",
            counts: { nodes: 0, edges: sink.edgeCount, skippedNodes: 0, skippedEdges: issues.length, expandedMixed: 0 },
            issues,
            errorCount: issues.length,
            warningCount: 0,
            truncated: false,
            lossy: [],
            durationMs: 0,
        });

        // A shipment goes one way: the file states that the graph is directed.
        sink.setDirected(true);
        for (const [index, line] of text.split("\n").entries()) {
            if (line.trim() === "") {
                continue;
            }

            const [from, to, value] = line.split("\t");
            if (!from || !to) {
                issues.push({
                    category: "missing-value",
                    severity: "error",
                    code: "E_TRADE_NO_COUNTRY",
                    message: `line ${index + 1} is missing a country`,
                    line: index + 1,
                    element: null,
                });
                continue;
            }

            // `weight` becomes the edge's weight; any other key stays an attribute of the record.
            sink.addEdgeRecord(from, to, { weight: Number(value) });
        }

        // Giving up on the whole file: reject with graph-io's ImportError, taken from ./extend.
        if (sink.edgeCount === 0) {
            return Promise.reject(new ImportError("no shipment could be read", report()));
        }

        return Promise.resolve(report());
    },
};

const TRADE_FLOWS: FormatDescriptor = {
    id: "trade-flows",
    plainName: "Trade Flows",
    extensions: [".trade"],
    mimeTypes: ["text/vnd.acme.trade-flows"],
    canImport: true,
    canExport: false,
    options: [],
};

DataSource.register(
    DataSource.fromImporter(tradeFlowsImporter, TRADE_FLOWS, {
        // The words shown beside the graph's direction.
        statedBy: () => "a trade-flows file (shipments go one way)",
    }),
);
```

What the class does around your importer:

- It reads the input the way every reader does -- inline `data`, a `File` or a `url` -- and hands
  your importer inline text as a string and everything else as a `Uint8Array` of the file's bytes,
  so your importer decides the encoding (graph-io's own importers read a byte-order mark and an
  encoding declaration). A binary format, such as a zip, arrives intact.
- When your importer has `listGraphs(input)`, the class has it too: `listGraphs` from `./catalog`
  lists a file's graphs through it, and the `graphIndex` / `graphName` load options reach your
  importer's `import` options. Without it, the format holds one graph and any other choice is
  refused with `E_OPTION_RANGE`.
- Every node and edge attribute you set becomes a key of the record, under the column's name; an
  edge's weight becomes `weight`. A node you add with `addNode` becomes a node record; one that an
  edge names without declaring it is created by the element, as for every format. A repeated node
  keeps its first declaration.
- The `error` issues in your report are aggregated like any reader's errors. Rejecting with
  `ImportError` refuses the whole file: the load fails with `E_PARSE_FAILED`, naming the format
  and the line of the last error, and the graph on screen stays as it was. Take `ImportError` from
  `./extend`, not from your own copy of graph-io: the element recognises it with `instanceof`,
  which fails across copies.
- The direction your importer set on the sink is declared as the file's only when `statedBy`
  returns words for it, which the element shows beside the graph's direction. Left out, or
  returning `null`, the file stated no direction and the element's own `data.directed` setting
  stands: a graph-io importer applies its own default to a silent file, and the element cannot
  tell that default from a statement.
- Your importer's `sniff`, if it has one, recognises the format from content: a file whose
  first bytes it rates at 0.5 or more is detected as yours, as the built-in sniffers are.
- The options your descriptor declares are checked against what a host passes and handed to your
  importer. `importOptions` fixes the rest (graph-io's `CommonImportOptions`, such as `ids`); a
  value the host passes wins over it, and a declared option's default fills only what
  `importOptions` leaves open.

Remote and streaming loaders -- a service query, a paged API, a database -- will get a contract of
their own, separate from file readers. It is not published yet.

## Using it

Every route a built-in format is reached by works the same way:

```ts
// By name, imperatively
await graph.addDataFromSource("roster", { data: text, scoreScale: 2 });

// From a file the user dropped, with the format named
await graph.loadFromFile(file, { format: "roster" });

// From a file whose name ends .roster -- detection finds it with no format argument
await graph.loadFromFile(file);

// From a URL
await graph.loadFromUrl("https://example.com/team.roster");
```

```html
<graphty-element data-source="roster" data="..."></graphty-element>
```

## Validating each record

Assign `nodeSchema` and `edgeSchema` and the element validates every record as it arrives, drops
the ones that fail, aggregates the failures and reports a summary through
`data-loading-error-summary` -- rather than letting one bad row take the file down.

```ts
import { z } from "zod";

class RosterDataSource extends DataSource {
    nodeSchema = z.object({ id: z.string(), team: z.string(), score: z.number() });
    edgeSchema = z.object({ source: z.string(), target: z.string() });
    // ...
}
```

## Detection

Registration publishes your descriptor and your optional `detect` to the detector, which is also
published so a drop target can ask what it is holding before it loads anything:

```ts
import { detectFormat, detectFormats } from "@graphty/graphty-element/catalog";

detectFormat({ filename: "team.roster" }); // "roster"
detectFormat({ sample: "roster directed\n..." }); // "roster"
detectFormats({ filename: "notes.xml" }); // every claimant, best first
```

The order is:

1. **Extension.** Every format whose descriptor claims the file's extension, the element's own
   first, then registrations in registration order.
2. **Disambiguation.** When more than one claims it, the claimants whose content check says yes
   come first -- the element's own formats in the order `@graphty/graph-io`'s sniffers rank them,
   then yours in registration order -- and the rest follow. This is how a third XML dialect is
   told apart from GraphML and GEXF.
3. **Content.** With no extension match, the element's own formats are ranked by
   `@graphty/graph-io`'s sniffers, then your `detect(sample)` is asked.

**Plugin detectors run strictly after every built-in detector**, so your format can only claim a
file the element could not already read. A detector that throws is caught and treated as "no".

## Seeding coordinates and weights

Two record conventions, both inherited:

- a `position` key on a node record -- `{ x, y, z }`, `[x, y]` or `[x, y, z]` -- seeds that node's
  coordinates, so a file that arrives arranged stays arranged with no placement code in the
  format;
- a `weight` key on an edge record is read through the configured weight path.

## How it is refused

| What is wrong                                                                                                                                     | Code                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| No `static type`, no `static descriptor`, a descriptor `id` that disagrees with `static type`, no extensions or media types, or `canExport: true` | `E_BAD_COMMAND`, `details.field` naming it                 |
| A format id the element itself ships                                                                                                              | `E_DUPLICATE_PLUGIN`                                       |
| A name nothing registered, or detection that matched nothing                                                                                      | `E_UNKNOWN_FORMAT`, with `details.available`               |
| An option the descriptor does not declare                                                                                                         | `E_UNKNOWN_OPTION`, with `details.candidates`              |
| An option value outside the declared range                                                                                                        | `E_OPTION_RANGE`                                           |
| A file that will not parse                                                                                                                        | `E_PARSE_FAILED`, with `details.format` and `details.line` |
| A source that will not fetch                                                                                                                      | `E_FETCH_FAILED`, with the url and the status              |

A coded failure reaches both routes unchanged: the promise `addDataFromSource` returns, and the
`data-loading-error` event.

```ts
import { isGraphtyError } from "@graphty/graphty-element/extend";

try {
    await graph.addDataFromSource("roster", { data: broken });
} catch (error) {
    if (isGraphtyError(error) && error.code === "E_PARSE_FAILED") {
        console.error(`line ${String(error.details.line)}`);
    }
}
```

## Writing the format

A writer is a graph-io exporter -- an object with `check`, `export` and `exportToString` -- and
the format's descriptor with `canExport: true`. Take the types from `./extend`, not from your own
copy of graph-io, so the snapshot you are handed is the type the element builds.

```ts
import { type GraphExporter, type GraphSnapshot, registerFormatWriter } from "@graphty/graphty-element/extend";

function write(snapshot: GraphSnapshot): string {
    const lines: string[] = [];
    for (let edge = 0; edge < snapshot.edgeCount; edge++) {
        lines.push(`${snapshot.ids.idOf(snapshot.edgeSource(edge))} ${snapshot.ids.idOf(snapshot.edgeTarget(edge))}`);
    }
    return lines.join("\n") + "\n";
}

const exporter: GraphExporter = {
    format: "edge-lines",
    // What the format can hold without loss.
    capabilities: {
        mixedDirection: false,
        multiEdges: true,
        selfLoops: true,
        edgeIds: "none",
        idCharset: "any",
        dtypes: [],
        components: false,
        lists: false,
        json: false,
        defaults: false,
        options: false,
        hierarchy: false,
        temporal: "none",
        graphAttributes: false,
        positions: false,
        viz: false,
    },
    check: (snapshot) =>
        snapshot.nodes.names().length === 0
            ? []
            : [
                  {
                      code: "W_EDGE_LINES_ATTRIBUTES",
                      message: "node attributes are not written",
                      column: null,
                      count: null,
                  },
              ],
    async *export(snapshot) {
        yield new TextEncoder().encode(write(snapshot));
    },
    exportToString: (snapshot) => Promise.resolve(write(snapshot)),
};

registerFormatWriter({
    descriptor: {
        id: "edge-lines",
        plainName: "Edge Lines",
        extensions: [".edges"],
        mimeTypes: ["text/plain"],
        canImport: false,
        canExport: true,
        options: [],
    },
    exporter,
});

const result = await element.exportGraph("edge-lines");
```

What the element does around it:

- The format appears in `session.catalog.formats()` with `canExport: true`. With a reader
  registered under the same id, the two are one entry with both flags true, and they must agree
  on `plainName`, `extensions` and `mimeTypes` or the second registration is refused
  (`E_BAD_COMMAND`, `details.field: "descriptor"`). A writer with no reader never takes part in
  detection.
- The snapshot you are handed carries the node and edge attributes, the current positions (the
  `position` role column), every published algorithm result as columns named
  `results.<runId>.<field>`, and the drawn colour, size, shape and edge width (`color`, `size`,
  `shape`, `thickness` role columns). Write what your format has a place for; report the rest from
  `check()` as loss notes, which `exportGraph` returns with the document. The element's own
  bookkeeping columns are never in it.
- `writerOptions` declares the options your writer takes, as `OptionDescriptor`s. An export that
  names any other option is refused with `E_UNKNOWN_OPTION`, exactly as for the built-in
  writers; graph-io's `sanitizeIds` and `onMixedDirection` are always accepted. The catalogue
  entry publishes the whole list as `writerOptions`, so a "Save as" dialog can offer them.
- A throw from your writer reaches the caller as a `GraphtyError`: `E_UNSUPPORTED` when it carries
  a string `code` (you refused this graph under these options), `E_INTERNAL` otherwise, with your
  error as `cause`.
- Registration refuses a built-in id (`E_DUPLICATE_PLUGIN`), a descriptor without
  `canExport: true`, an exporter without the three methods, and an exporter whose `format` is not
  the descriptor's id (`E_BAD_COMMAND`, `details.field` naming it).

## Deliberate limits

**A reader's descriptor says `canExport: false`.** Writing is registered separately, with
`registerFormatWriter` (below), which marks the catalogue entry writable. A reader descriptor that
claims `canExport: true` on its own is refused, so a "Save as" menu never offers a format nothing
writes.

**An import cannot be cancelled.** No built-in import can be either, so nothing is being withheld
-- but it is an absence worth knowing about rather than discovering.

**Progress is at parity and partly fictional.** Your format's per-chunk progress reaches the
consumer automatically under its own name with running node and edge counts, exactly like a
built-in's. The byte figure in that event is `chunks * 64 KiB` for every format alike, and a total
arrives only from a `File`'s size.

**Media types are advisory.** Nothing reads them at run time; detection looks at the name and the
content.
