# Item 1 review: load preview and column mapping (#781)

The recommendation under review is section 1 of `element-api-decisions.md`. It proposes
`session.data.preview(source)`, a `ColumnMapping` passed back to `session.data.import()`, a
`"data:progress"` session event and new `E_TOO_LARGE` details. The graphty app's Data page needs
the element to say, before anything loads, which rows are nodes, which column is the key, which is
the weight, and what the load would produce.

## Verdict: redesign the mapping and the preview; keep the goal

The element does need a way to look at a file before it loads. The proposed shape cannot ship:

- **The mapping cannot express a join, and cannot be widened into one later.** `id`, `source`,
  `target`, `weight` and `label` are single strings at the top level that name no table. The owner
  wants door entries joined to people and buildings on `badge_id` and `building_id`. Because
  `preview()` returns the mapping and `import()` takes it back, every later fix is a breaking
  reshape.
- **The simplest case does not compile.** `{ source: "from", target: "to", weight: "trips" }`
  fails with `TS2741: Property 'tables' is missing`. The blind author also needed two invented
  types (`AttributeType`, `AttributeLevel`) for the example to compile at all.
- **The `E_TOO_LARGE` change is breaking.** The element already throws
  `details: { limit, count, of, graph: { nodes, edges } }` (`graphty-element/src/session/project/ingest.ts:1041`),
  and the guide documents it (`graphty-element/docs/guide/data-sources.md:537-538`). The proposal
  turns `limit` from a number into an object and renames `count` to `found`.
- **A stateless `preview()` cannot serve the Data page.** It takes no mapping, so its counts go
  stale after the reader's first edit. Calling it again re-reads and re-parses the whole file, about
  1 s of frozen page per menu change at the render ceiling (`tmp/api-review/perf-1/dryrun2.ts`). A
  URL is downloaded again on each call, so the bytes the reader approved may not be the bytes that
  load. It has no way to return "all 32 unmatched rows" (`tier1-design.md:373-377`).
- **Naming endpoint columns is broken in the element today.** A CSV import with
  `edgeSource: "from", edgeTarget: "to"` (exactly what `mapping.source` / `mapping.target` would
  compile to) gives 3 nodes, 0 edges, 2 rejected records, and no error
  (`tmp/api-review/perf-1/e2e.ts`). The CSV source renames the columns to `source`/`target`, and
  then the ingest reads the caller's names again as JMESPath (`ingest.ts:806-810`, `558-559`;
  `data/endpoints.ts:62` swallows the miss).

## Revised shape

Everything below is exported from `@graphty/graphty-element/session`, including `AttributeType`,
which is re-exported from `./catalog` so a consumer imports from one entry point.

```ts
interface SessionDataApi {
    /**
     * Reads the source once and holds its rows, so the reader can look, change roles and see the
     * result before anything is added to the graph. Throws the element's existing typed errors
     * (E_UNKNOWN_FORMAT, E_PARSE_FAILED, E_FETCH_FAILED). A CSV past the render ceiling is
     * refused here with E_TOO_LARGE before it is parsed.
     */
    prepare(source: DataSourceInput, options?: { readonly signal?: AbortSignal }): Promise<LoadDraft>;
    /** Unchanged, plus the same choices a draft takes. Same as prepare, then load, then dispose. */
    import(source: DataSourceInput, options?: LoadChoices): Promise<void>;
}

/** A read source, held until load() or dispose(). Each method after either throws E_DISPOSED. */
interface LoadDraft {
    /** The data source that read it: the same value DataSourceInput.type takes. */
    readonly type: string;
    readonly tables: readonly DraftTable[];
    /** The element's guess, with every table and every endpoint written out in full. */
    readonly mapping: LoadMappingRead;
    /** What load(choices) would do to the graph as it is now. Re-runs on the held rows: no I/O. */
    report(choices?: LoadChoices): Promise<LoadReport>;
    /** The raw file rows, with their line numbers, a page at a time. */
    rows(table: string, options?: DraftRowOptions): Promise<RecordPage<DraftRow>>;
    /** Loads the held rows as one undoable step. Does not read the source again. */
    load(choices?: LoadChoices): Promise<void>;
    /** Releases the held rows. */
    dispose(): void;
}

interface DraftTable {
    /** Assigned by the element: "rows" for one tabular file; "nodes" and "edges" for paired files or a graph file. Never the file name. */
    readonly id: string;
    /** What to show the reader: the file name. */
    readonly name: string;
    readonly rowCount: number;
    /** True when the file format sets the roles (GraphML, GEXF, ...). A mapping for it is refused with E_BAD_COMMAND. */
    readonly fixed: boolean;
    readonly columns: readonly DraftColumn[];
}

/** The same fields data.attributes() reports after the load, computed over every row. */
interface DraftColumn extends Pick<AttributeDescriptor, "name" | "type" | "completeness" | "uniqueCount" | "sampleValues"> {
    readonly suggested?: ColumnRole;
}
type ColumnRole = "key" | "label" | "source" | "target" | "weight" | "time" | "edgeId";

interface DraftRow {
    readonly line: number;
    readonly values: Readonly<Record<string, unknown>>;
}
interface DraftRowOptions {
    readonly offset?: number;
    readonly limit?: number;
    readonly only?: "unmatched" | "rejected";
}

/**
 * Every value is a column name exactly as DraftColumn.name spells it: never a JMESPath
 * expression. Absent means "the element's guess"; null means "none". A name that is not a column
 * of that table is refused with E_BAD_COMMAND.
 */
interface TableMapping {
    readonly rowsAre?: "nodes" | "edges";
    readonly key?: string;
    readonly label?: string | null;
    readonly source?: string | Endpoint;
    readonly target?: string | Endpoint;
    /** null: every edge counts 1, and the legacy "value" column is not read either. */
    readonly weight?: string | null;
    readonly time?: string | null;
    readonly edgeId?: string | null;
}
interface Endpoint {
    readonly column: string;
}
/** A bare TableMapping applies to a source with one table; otherwise name each table by id. */
type LoadMapping = TableMapping | { readonly tables: Readonly<Record<string, TableMapping>> };

/** What the element hands back: always the tables form, rowsAre always set, endpoints always objects. */
interface TableMappingRead extends TableMapping {
    readonly rowsAre: "nodes" | "edges";
    readonly source?: Endpoint;
    readonly target?: Endpoint;
}
interface LoadMappingRead {
    readonly tables: Readonly<Record<string, TableMappingRead>>;
}

interface LoadChoices extends ImportOptions {
    readonly mapping?: LoadMapping;
    /** An edge naming a node no node table holds: "add" makes the node, "leave-out" drops the edge. Default "add", as today. */
    readonly unmatched?: "add" | "leave-out";
    /** Writes the existing data.directed config in the same step. */
    readonly directed?: boolean | "auto";
}

/** ImportReport plus two fields; data.lastImport() gains the same two, so before and after cannot drift. */
interface LoadReport extends ImportReport {
    readonly unmatched: { readonly rows: number; readonly values: number };
    /** The details E_TOO_LARGE would carry, unchanged; null when the load fits. */
    readonly tooLarge: TooLargeDetails | null;
}
/** The shape ingest.ts:1041 already throws, now named. */
interface TooLargeDetails {
    readonly limit: number;
    readonly count: number;
    readonly of: "nodes" | "edges";
    readonly graph: { readonly nodes: number; readonly edges: number };
}
```

**The canonical example** (16 lines). The reader picks a CSV, the page shows the first rows and
the counts, then loads it:

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const input = document.querySelector<HTMLInputElement>("#file")!;

input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    const draft = await element.session.data.prepare({ config: { file } });
    const report = await draft.report();
    console.table((await draft.rows(draft.tables[0].id, { limit: 20 })).records.map((r) => r.values));
    console.log(`${report.counts.nodes} nodes, ${report.counts.edges} edges, ${report.unmatched.rows} unmatched rows`);
    if (report.tooLarge) return draft.dispose();
    await draft.load();
});
```

**The easy path** needs no draft and names no internal concept:

```ts
await element.session.data.import({ config: { file } }, { mapping: { source: "from", target: "to", weight: "trips" } });
```

**The Data page**: two files, the reader changes the weight, sees fresh counts and every unmatched
row, then loads with unmatched edges left out:

```ts
const draft = await element.session.data.prepare({ type: "csv", config: { nodeFile, edgeFile } });
const edges = draft.tables.find((t) => draft.mapping.tables[t.id].rowsAre === "edges")!;
const mapping: LoadMapping = { tables: { ...draft.mapping.tables, [edges.id]: { ...draft.mapping.tables[edges.id], weight: "shared chapters" } } };
const report = await draft.report({ mapping, unmatched: "leave-out" });
const unmatched = await draft.rows(edges.id, { only: "unmatched", limit: Infinity });
await draft.load({ mapping, unmatched: "leave-out" });
```

All three examples, plus a negative case (`{ from: "a" }` must be rejected), compile with
`tsc --noEmit` in strict mode and `skipLibCheck: false`. They were compiled against the built
`graphty-element/dist` types plus a stub of the shape above. Scratch:
`tmp/api-review/item-1/` (`session-stub.d.ts`, `augment.d.ts`, `canonical.ts`, `simple.ts`,
`edit.ts`, `bad.ts`).

**How joins land later, additively.** The read shape already gives every table a mapping of its
own and every endpoint as an object. Tier 2 adds optional fields and nothing else:
`Endpoint.to` (a table id, or a node type already in the graph) and `Endpoint.on` (that table's
column, default its key); `TableMapping.type` (the node type name); `prepare` accepting an array of
sources. The owner's door entries then read
`entries: { rowsAre: "edges", source: { column: "badge_id", to: "people", on: "badge_id" }, target: { column: "building_id", to: "buildings", on: "bldg" } }`.
An attribute table needs no new role: it is a node table whose key matches nodes already loaded.
Adding optional fields to a returned interface and widening a parameter break no consumer.

## What changed and why

| Change | Why |
| --- | --- |
| Per-table mapping; endpoints read back as objects | Joins on any column become additive fields. The flat shape could only grow by a breaking reshape (personas, evolution, consistency lenses) |
| `tables` optional; a bare `TableMapping` applies to a one-table source | The 1-line hand-written mapping compiles. Easy things easy |
| Table ids assigned by the element, separate from `name` | File names collide (two `data.csv`), change month to month and are not chosen by the reader. The ids stay stable for the same source shape, so October's mapping applies to November's file |
| `preview()` replaced by `prepare()` returning a held draft | One read per load, not one per menu change. Fresh counts after each edit with no I/O. The bytes approved are the bytes loaded. Unmatched and rejected rows are paged in the existing `RecordPage` shape. The proposal rejected this as "more API", but each stateless workaround (re-read, token, cache) is the same API, only hidden |
| `report(choices)` takes the mapping, `mode`, `unmatched` and `directed` | Counts "as if loaded now" depend on all four. The proposal's counts were wrong for a merge and stale after an edit |
| `LoadReport` = `ImportReport` + `unmatched` + `tooLarge`; `lastImport()` gains the same | One report type before and after Load. The design says "the app counts nothing" (`tier1-design.md:372`) |
| Columns reuse `AttributeDescriptor` fields and the published `AttributeType` | A column reads the same before and after load. No guessed types. `level` dropped until item 2 settles it |
| Mapping values are literal column names, read as own properties | Today's JMESPath reading breaks on `shared chapters` (the proposal's own example throws), returns `Object` for a column named `constructor`, and fails silently (`tmp/api-review/security-1/probe.cjs`) |
| `weight: null` means unweighted, with no `value` fallback | Today a null weight path still reads `record.value` (`ingest.ts:73-88`) |
| `E_TOO_LARGE` details unchanged; preview reports them as data | The shipped shape stays. The page can show the too-large card and offer a smaller load instead of only catching a throw |
| `format` renamed `type`; `rowCount` never null | `type` passes straight back into `DataSourceInput`. No source can read a prefix (`perf-1.md`, finding 6), so a null count would never happen |
| `"data:progress"` dropped | The element already emits the `data-loading-progress` DOM event, which the app may read. Its `bytesProcessed` is made up today (`DataManager.ts:977`), and a third progress name helps nobody. Real progress waits on PR #770 |
| `fixed` on graph-file tables | Third-party and graph formats get a draft from the same chunk records every `DataSource` yields, with no private hook. Their roles are locked, as the design shows ("Set by the file") |

**Precedence, stated once in the guide:** the load's mapping beats the CSV source's `idColumn`,
`edgeSource` and `edgeTarget` (kept as deprecated aliases that translate into the mapping), which
beat `data.knownFields`, which supplies a role the mapping leaves absent. The load writes the roles
read after loading (`label`, `weight`, `time`) into `data.knownFields` in the same undoable step,
so config stays the one place later readers look. The effective `LoadMappingRead` is recorded on
`data.source()`, on `DataImportCommand` (`session/commands/data.ts:105-117`) and on `lastImport()`,
so undo, replay and item 10's project file repeat the load the reader confirmed.

## Rejected findings

- **"Express the mapping as source config plus `knownFields`, with no new vocabulary"**
  (consistency lens). `knownFields` holds one graph-wide path per fact (`config/DataConfig.ts:35-74`)
  and `edgeSource`/`idColumn` exist only on CSV. Neither can say which table's column joins to
  which, and the owner's join is the reason for this review. The concern behind it, two sources of
  truth, is met by the precedence rule and by writing post-load roles into `knownFields`.
- **"Name the keys `nodeId`, `edgeSource`, `edgeTarget`, `edgeWeight`, `nodeLabel`"** (personas
  lens). In a per-table mapping, the table's `rowsAre` already says node or edge, so a prefix adds
  length and no meaning. `key` is the design's own word for the role (`tier1-design.md:366`), and
  it avoids `id`, which the blind author read as an edge or row id.
- **"Preview reads only a bounded prefix"** (security lens). A prefix cannot give honest counts,
  uniqueness or unmatched rows, and no reader can stop at a prefix anyway (graph-io's CSV importer
  has no row limit; GraphML lists every node first). Kept instead: a CSV is refused before parsing
  by a quote-aware row count, and `prepare` takes an `AbortSignal`.
- **"Add a public `describe()` hook to `DataSource`"** (personas lens). The draft is built from the
  records every source already yields, so a plugin gets it with no new hook. Add one only when a
  plugin needs a richer answer.
- **"Take `DataSourceInput[]` now" and "decide the `{ sample: 'karate' }` union now"** (evolution
  lens). Widening a parameter is additive for callers. Neither needs to land with item 1.
- **"Rename the event `data:loading`"** (evolution lens). Moot: the event is dropped from this
  item.

## Prerequisites: element bugs to fix first (not API)

These are defects on master today, independent of the new API. Each makes the Data page lie.

1. Named endpoint columns load zero edges and report success (above, `tmp/api-review/perf-1/e2e.ts`).
2. Any source with more than about 125,000 edges throws an uncoded
   `RangeError: Maximum call stack size exceeded` from `validEdges.push(...chunk.edges)`
   (`data/DataSource.ts:578`) instead of `E_TOO_LARGE` (`tmp/api-review/perf-1/overflow.ts`).
3. A renderer-less session refuses 49,100 nodes / 98,200 edges, under the ceiling, because nodes
   created by edges are counted again when their node records arrive (`session/data.ts:873-900`,
   `tmp/api-review/perf-1/halfceiling.ts`). The draft's dry run takes this path, so its counts
   would disagree with the load.
4. Paired-file and too-many-errors failures in `CSVDataSource.ts` and `graph-io-import.ts:415` throw
   plain `Error` with no code.
5. The guide says a load adds to the graph unless `replace: true` (`data-sources.md:87-89`), while
   `ImportOptions.mode` defaults to `"replace"` (`session/types.ts:571`). Scope the sentence to
   `loadFromFile` and document `mode`.

## One-way doors

- The names `prepare`, `LoadDraft`, `DraftTable`, `DraftColumn`, `DraftRow`, `TableMapping`,
  `LoadMapping`, `LoadMappingRead`, `Endpoint`, `LoadChoices`, `LoadReport`, `TooLargeDetails`,
  and every key on them.
- The `ColumnRole` values, and `rowsAre` being exactly `"nodes" | "edges"`. A third value later
  breaks every exhaustive switch.
- The table id scheme: `"rows"`, `"nodes"`, `"edges"`. Saved mappings and project files depend on
  it.
- The rule that mapping values are literal column names, never expressions.
- The meaning of absent versus null in a mapping key.
- `LoadReport` extending `ImportReport`, so `lastImport()` gains `unmatched` and `tooLarge`.
- The `unmatched` default `"add"` (today's behavior). The design's Data page defaults the control
  to Leave out. That is the app passing `"leave-out"`, not the element's default.

Not one-way: the sample size the app asks for, the draft's memory policy, and the deprecation of
the CSV aliases.

## Confidence: medium

The shape compiles in strict mode with library checks on, covers every tier 1 Data page control
(roles, counts, unmatched rows with Add | Leave out, Direction, the too-large card), and its read
form leaves room for joins as optional fields. It is medium rather than high for three reasons:

- Nothing has been built. The draft's dry run is measured (760 ms at the ceiling), but it runs on a
  path with a known counting bug.
- The join fields are designed only on paper. The first multi-table source may show that `to`/`on`
  needs more, for example a composite key.
- No blind author has yet written against this revised shape from docs alone. That run is still
  required before it ships.

## Residual risks

- **Memory.** A draft holds the whole parsed source until `load()` or `dispose()`. An app that
  forgets `dispose()` on Cancel keeps the file's rows alive, as much as 860 MB for a 106 MB CSV
  (`perf-1.md`). The element should drop a draft on the next `prepare` or on any load, and say so.
- **Freezes stay.** Parsing is still one long main-thread task (162 ms at the ceiling, 964 ms at 1M
  edges) until PR #770 streams reads. A huge non-CSV file is parsed before it can be refused.
- **Writing `knownFields` on load** means a later merge load of a file with different column names
  rewrites the graph-wide label and weight paths. Per-type `knownFields` is a tier 2 question.
- **Saved sources.** `data.source()` keeps `nodeURL`/`edgeURL` and any URL query string, which can
  hold an access token, because it removes only `data` and `file` (`session/commands/data.ts:178-184`).
  The recorded mapping is plain column names and safe to replay, but item 10 must build the saved
  descriptor from an allow-list before it writes a project file.
