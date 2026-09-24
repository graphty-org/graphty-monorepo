# Custom file formats

The element reads JSON, GraphML, GEXF, CSV, GML, DOT and Pajek. A format it does not ship is a
class extending `DataSource`, and registering it puts the format everywhere the built-in seven
are: in the catalogue an import dialog reads, in extension and content detection, and in every
call that names a format by string.

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
        // Inherited: reads from `data`, a `File` or a `url`, with retries and a timeout.
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

**Name your endpoint keys `source` and `target`.** The element probes `source`/`target` first,
then `src`/`dst`, then `from`/`to`, so all three work -- but `source`/`target` is the spelling
every other door into the element publishes, it is what a consumer reading your records back
through `session.data.edge(id)` will see, and it is what the built-in formats now emit. A source
that emits anything else makes its records look unlike everybody else's for no gain.

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

detectFormat({ filename: "team.roster" });          // "roster"
detectFormat({ sample: "roster directed\n..." });    // "roster"
detectFormats({ filename: "notes.xml" });            // every claimant, best first
```

The order is:

1. **Extension.** Every format whose descriptor claims the file's extension, the element's own
   first, then registrations in registration order.
2. **Disambiguation.** When more than one claims it, each claimant's `detect(sample)` is asked in
   that same order and the first `true` wins. This is how a third XML dialect is told apart from
   GraphML and GEXF.
3. **Content.** With no extension match, the element's own sniffers are asked in a fixed order,
   then yours.

**Plugin detectors run strictly after every built-in detector**, so your format can only claim a
file the element could not already read. A detector that throws is caught and treated as "no".

## Seeding coordinates and weights

Two record conventions, both inherited:

- a `position` key on a node record -- `{ x, y, z }`, `[x, y]` or `[x, y, z]` -- seeds that node's
  coordinates, so a file that arrives arranged stays arranged with no placement code in the
  format;
- a `weight` key on an edge record is read through the configured weight path.

## How it is refused

| What is wrong | Code |
| --- | --- |
| No `static type`, no `static descriptor`, a descriptor `id` that disagrees with `static type`, no extensions or media types, or `canExport: true` | `E_BAD_COMMAND`, `details.field` naming it |
| A format id the element itself ships | `E_DUPLICATE_PLUGIN` |
| A name nothing registered, or detection that matched nothing | `E_UNKNOWN_FORMAT`, with `details.available` |
| An option the descriptor does not declare | `E_UNKNOWN_OPTION`, with `details.candidates` |
| An option value outside the declared range | `E_OPTION_RANGE` |
| A file that will not parse | `E_PARSE_FAILED`, with `details.format` and `details.line` |
| A source that will not fetch | `E_FETCH_FAILED`, with the url and the status |

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

## Deliberate limits

**Reading only.** There is no writer seam to register into, so a descriptor claiming
`canExport: true` is refused rather than lying to a "Save as" menu. Writing is a follow-on, and
when it exists the same class will carry it.

**An import cannot be cancelled.** No built-in import can be either, so nothing is being withheld
-- but it is an absence worth knowing about rather than discovering.

**Progress is at parity and partly fictional.** Your format's per-chunk progress reaches the
consumer automatically under its own name with running node and edge counts, exactly like a
built-in's. The byte figure in that event is `chunks * 64 KiB` for every format alike, and a total
arrives only from a `File`'s size.

**Media types are advisory.** Nothing reads them at run time; detection looks at the name and the
content.
