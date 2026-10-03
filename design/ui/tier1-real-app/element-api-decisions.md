# graphty-element: the new public API the tier 1 app needs

The graphty app's tier 1 build (a first-time reader's whole path: open a file, read it, rank and
group, color and size, labels, find a node and its neighbors, export, save and reopen) needs eleven
additions to graphty-element. Every name and shape here becomes published API, so each is a
one-way door once it releases. This document puts all of them in front of the owner at once, so
they can be approved in one sitting and the element work can start in parallel.

Each item gives the problem, the recommended shape against graphty-element as it is on master
today, one or two alternatives with their cost, and exactly what is irreversible. Everything is
additive: each item releases as a minor version. The decision needed is "approve as recommended",
"take alternative X", or a change to a name.

| #   | Item                                                    | Issue   | Effort |
| --- | ------------------------------------------------------- | ------- | ------ |
| 1   | Load preview and column mapping                         | #781    | high   |
| 2   | Default binding by measurement level; one legend rollup | #782    | medium |
| 3   | Find without selecting                                  | #783    | medium |
| 4   | A node's neighbors with tie strength                    | #784    | low    |
| 5   | Result values as table columns                          | #785    | medium |
| 6   | What Analyze shows per algorithm                        | #786    | low    |
| 7   | Labels the overlap rule hid                             | #787    | low    |
| 8   | What a run's suggested style did                        | #788    | low    |
| 9   | Style channel sections and order                        | #789    | low    |
| 10  | The project file                                        | #301    | high   |
| 11  | Readable run names (already built)                      | PR #726 | done   |

Conventions every item follows, so they read as one API: reads are plain methods on the session
namespace that owns the data (`data`, `styles`, `runs`, `catalog`); changes are undoable steps;
pages reuse the existing `RecordPage` shape (`records`, `offset`, `total`, `revision`); events go
through the existing `session.on(event, handler)` with `namespace:changed` names.

---

## 1. Load preview and column mapping (#781)

**Problem.** `session.data.import()` commits at once, so the Data page cannot show "these rows are
nodes, this column is the key, this is the weight" before Load without the app sniffing the file
itself.

**Recommended.**

```ts
interface SessionDataApi {
    preview(source: DataSourceInput): Promise<LoadPreview>;
    import(source: DataSourceInput, options?: ImportOptions & { mapping?: ColumnMapping }): Promise<void>;
}
interface LoadPreview {
    readonly format: string; // the data source id that would read it
    readonly tables: readonly PreviewTable[];
    readonly mapping: ColumnMapping; // the element's guess; edit and pass back
    readonly expected: Pick<ImportReport, "counts" | "weights" | "endpoints">; // as if loaded now
}
interface PreviewTable {
    readonly name: string; // file name, or "nodes" / "edges" for one file
    readonly role: "nodes" | "edges";
    readonly rowCount: number | null; // null when only a prefix was read
    readonly columns: readonly { name: string; type: AttributeType; level: AttributeLevel }[];
    readonly sample: readonly Readonly<Record<string, unknown>>[]; // first 20 rows
}
interface ColumnMapping {
    readonly tables: readonly { name: string; role: "nodes" | "edges" }[];
    readonly id?: string;
    readonly source?: string;
    readonly target?: string;
    readonly weight?: string | null;
    readonly label?: string | null;
}
// SessionEventMap gains "data:progress": { format, bytesProcessed, totalBytes?, nodeRecords, edgeRecords }
// E_TOO_LARGE on a load carries details: { limit: { nodes, edges }, found: { nodes, edges } }
```

```ts
const p = await session.data.preview({ type: "csv", config: { nodeFile, edgeFile } });
const mapping = { ...p.mapping, weight: "shared chapters" };
await session.data.import({ type: "csv", config: { nodeFile, edgeFile } }, { mapping });
```

A refusal is the element's existing typed error (`E_UNKNOWN_FORMAT`, `E_PARSE_FAILED`, ...) thrown
from `preview`, so the Data page shows the same refusal a load would.

**Alternatives.** (a) A two-phase handle, `const load = await data.open(source); load.mapping =
...; await load.commit()`: holds parsed state between calls, so the element must define its
lifetime and cancellation; more API for the same result. (b) Preview reads only the header and no
sample: cheaper, but the reader cannot see whether the key column is right, which is what round 8
asked for.

**One-way door.** The names `preview`, `LoadPreview`, `ColumnMapping` and its keys, the
`"data:progress"` event name and payload, and the `E_TOO_LARGE` `details` keys. The sample size
(20) is not: document it as "a few rows".

---

## 2. Default binding from what a column measures; one legend rollup (#782)

**Problem.** A binding with no scale is linear for every column, so color by a group number draws
a ramp and a bound size defaults to 0 to 1; and the legend's category cap lives nowhere the app
and a later exported legend can share.

**Recommended.**

```ts
type AttributeLevel = "category" | "quantity" | "time" | "text" | "id";
interface AttributeDescriptor {
    level: AttributeLevel;
    levelSource: "inferred" | "declared";
}
interface SessionDataApi {
    declare(path: Path, declaration: { level: AttributeLevel }): Run<void>; // one undoable step
}
interface StylesApi {
    defaultBinding(path: Path, channel: Channel): DefaultBinding;
    legend(options?: { maxCategories?: number }): readonly LegendBlock[]; // default 12, as today
}
interface DefaultBinding {
    readonly scale: string;
    readonly range?: readonly [number, number];
    readonly palette?: PaletteId;
    readonly suitable: boolean;
    readonly reason?: string; // reason is a reader's sentence
}
interface LegendBlock {
    readonly other?: { readonly label: string; readonly count: number; readonly swatches: readonly LegendSwatch[] };
}
```

A binding written with no `scale` or `range` takes `defaultBinding(path, channel)`: one color per
category (ordinal palette, Other past the cap), linear or log for a quantity by its spread, and
2 to 12 px for `node.size`. Level is inferred from type and distinct values, and a declaration
always wins.

```ts
const d = session.styles.defaultBinding("results.louvain.group", "node.color");
if (d.suitable) session.styles.encode({ run: "louvain", field: "group", channel: "node.color" });
const [block] = session.styles.legend({ maxCategories: 8 });
```

**Alternatives.** (a) Leave defaults alone and make the app pass a scale: forbidden (the app would
decide how a column is drawn) and every consumer repeats it. (b) Put the level on the binding only,
not on the attribute: smaller, but the From data list could not disable an unsuitable attribute
before binding, and a level would not survive into the project file.

**One-way door.** The five level names, `levelSource`, `declare`, `defaultBinding` and its
`suitable`/`reason` keys, the `other` key on `LegendBlock`. Changing the default scale for a
binding with no scale is a visible change for existing consumers: it ships in a minor because
today's default is undocumented as behavior, and the changelog says so. The 2 to 12 px range is a
default, not API.

---

## 3. Find without selecting (#783)

**Problem.** The element's text search is reachable only through `selection.apply({ text })`,
which selects every hit, so a find box that lists hits as you type would have to search in the
app.

**Recommended.**

```ts
interface SessionDataApi {
    find(text: string, options?: { limit?: number; kinds?: readonly ("node" | "edge")[] }): FindResult;
}
interface FindResult {
    readonly elements: readonly {
        readonly kind: "node" | "edge";
        readonly id: NodeId | EdgeId;
        readonly label: string;
        readonly matched: { readonly path: Path; readonly value: unknown };
    }[];
    readonly values: readonly { readonly path: Path; readonly value: unknown; readonly count: number }[];
    readonly total: number; // elements matched before the limit
}
```

Ranking: exact label or id first, then prefix, then substring; a label matches as well as an id
(karate's ids are numbers). Synchronous, so it can run on every keystroke.

```ts
const hits = session.data.find("jav", { limit: 10 });
const pick = hits.elements[0];
session.selection.apply({ ids: [pick.id] });
```

**Alternatives.** (a) `selection.apply({ text }, { dryRun: true })` returning the would-be
selection: no new method, but returns ids without the matched attribute or the value rows, and
overloads a mutation as a read. (b) An async `find` returning a `Run`: needed only past about a
million elements, which is above the render ceiling.

**One-way door.** `find`, the result keys (`elements`, `values`, `matched`, `total`) and the
ranking order as documented behavior. A later `excludedBy` (a filter hides the hit) is additive.

---

## 4. A node's neighbors with tie strength (#784)

**Problem.** "Javert's 17 connections" needs each neighbor once with its summed tie; today the app
could only select neighbors or list incident edges and sum them itself, which is a neighbor lookup
the app may not do.

**Recommended.**

```ts
interface SessionDataApi {
    neighbors(id: NodeId, options?: NeighborOptions): RecordPage<Neighbor>;
}
interface NeighborOptions {
    readonly direction?: "out" | "in" | "both"; // default "both"
    readonly weight?: Path | false; // default: the import's weight column; false counts edges
    readonly sort?: "tie" | "label"; // default "tie", largest first
    readonly offset?: number;
    readonly limit?: number; // as RecordPageOptions
}
interface Neighbor {
    readonly node: NodeRecord;
    readonly edges: readonly EdgeId[];
    readonly tie: number;
}
```

Parallel edges sum into one tie; with no weight the tie is the edge count. `total` is the number of
distinct neighbors.

```ts
const page = session.data.neighbors("Javert", { limit: 20 });
for (const n of page.records) console.log(n.node.name, n.tie);
console.log(page.total);
```

**Alternatives.** (a) `edgePage({ touching, groupBy: "neighbor" })`: reuses one method but makes
edge pages return two record shapes. (b) Return all neighbors with no paging: simple, wrong for a
hub with thousands of neighbors.

**One-way door.** `neighbors`, `Neighbor` and its keys, the default direction "both" and the
default weight rule.

---

## 5. Result values as table columns (#785)

**Problem.** `data.nodePage({ sort })` sorts only by imported keys, so a table column for
PageRank, and sorting by it, would mean the app reading each run and sorting itself.

**Recommended.**

```ts
interface RecordPageOptions {
    readonly columns?: readonly Path[]; // result paths, "results.<run>.<field>"
}
interface RecordSort {
    readonly key: string | Path;
} // now also accepts a result path
interface RecordPage<TRecord> {
    readonly columns: Readonly<Record<Path, readonly unknown[]>>; // aligned with records; {} when none asked
}
```

Values come back beside the records, not merged into them, so a result path can never collide
with an imported attribute of the same spelling. Sorting follows `RecordSort`'s existing rules
(numbers before text, missing last).

```ts
const path = "results.pagerank.value";
const page = session.data.nodePage({ columns: [path], sort: { key: path, descending: true } });
page.records.forEach((r, i) => console.log(r.id, page.columns[path][i]));
```

**Alternatives.** (a) Merge result values into each record under the path as a key: one less
indirection, but a collision rule is needed and records stop meaning "what was imported". (b) A
separate `runs.get(id).page(field, ...)`: sorts one run's values but cannot mix several runs and
imported columns in one table.

**One-way door.** The `columns` option, the `columns` key on `RecordPage` (every existing page
gains it, as `{}`), and `RecordSort.key` accepting a result path.

---

## 6. What Analyze shows about each algorithm (#786)

**Problem.** The legend's method sentence ("darker = more central"), finding Betweenness by typing
"brokers", the popover's key options and its "Ranks nodes" / "Finds groups" headings all need words
the catalog does not hold, and the app may not keep a per-algorithm list.

**Recommended.**

```ts
interface FieldDescriptor {
    sentence?: string;
} // one plain line, fits any dataset
interface AlgorithmDescriptor {
    aliases: readonly string[]; // ["brokers", "bridges"]; [] when none
    categoryLabel: string; // "Ranks nodes", "Finds groups", ...
}
interface OptionDescriptor {
    essential?: boolean;
} // shown without "More options"
```

The sentence sits on each result field (a run with two fields has two sentences). Every built-in
gets a sentence for each node or edge field, aliases where readers used another word in the
studies, and `essential` on the options a reader changes (PageRank: weight, damping, direction).
`categoryLabel` is filled by `Algorithm.register` from the category for built-in categories; a
plugin with its own category supplies it.

```ts
const pr = session.catalog.algorithms().find((a) => a.key === "pagerank")!;
const shown = pr.options.filter((o) => o.essential);
legend.caption = pr.fields.find((f) => f.name === "value")?.sentence;
```

**Alternatives.** (a) `catalog.categories(): { id, label }[]` instead of `categoryLabel` on each
entry: one list instead of a repeated string, but a second call for a heading. (b) A full-text
`catalog.search(text)` instead of exposed aliases: hides the alias list, but the Analyze filter
would have to call it per keystroke and cannot say why a match matched.

**One-way door.** `sentence`, `aliases`, `essential`, `categoryLabel`, and the label words of the
built-in categories. The sentences' wording is content, not API: it can be edited in any release.

---

## 7. How many labels the overlap rule hid (#787)

**Problem.** "77 names, 64 hidden to avoid overlap" and a node's "label hidden" note need a count
and a list only the renderer knows; without it the label line cannot explain why Show labels shows
almost nothing.

**Recommended.**

```ts
interface Session {
    readonly labels: SessionLabels;
}
interface SessionLabels {
    report(): { readonly requested: number; readonly drawn: number; readonly hiddenByOverlap: number };
    hiddenIds(): readonly NodeId[];
    readonly overlap: "hide" | "show"; // a project setting, saved in the project file
    setOverlap(mode: "hide" | "show"): Run<void>; // one undoable step
}
// SessionEventMap gains "labels:changed": the new report
```

`requested` counts nodes whose label channel resolves to text; `drawn` the ones on screen after
the overlap rule. With overlap "show", `hiddenByOverlap` is 0. The read is per frame settle, not
per frame, so it does not cost the render loop.

```ts
const { requested, hiddenByOverlap } = session.labels.report();
session.on("labels:changed", (r) => update(r));
if (wantsAll) session.labels.setOverlap("show");
```

**Alternatives.** (a) Keep the switch in `layoutBehavior.labels.declutter` config and add only the
report: smaller, but the reader's choice would not undo or save with the project. (b) Count only,
no `hiddenIds()`: the node inspector could not say "this label is hidden".

**One-way door.** `session.labels`, the three report keys, `"hide" | "show"`, `"labels:changed"`.
Interacts with PR #676 (held, breaking, also touches label code): approve its fate first.

---

## 8. What a run's suggested style applied, held back or took over (#788)

**Problem.** When a reader runs Louvain after Betweenness, nothing says whether Louvain's colors
landed, were held back because another layer owns color, or took color over; round 8 found 12 of 12
never saw the communities.

**Recommended.**

```ts
interface Run<T> {
    readonly landing: Promise<RunLanding>;
} // settles after the style step
interface RunsApi {
    landing(runId: RunId): RunLanding | null;
} // null before the run finishes
interface RunLanding {
    readonly applied: readonly { readonly channel: Channel; readonly layerId: LayerId }[];
    readonly withheld: readonly { readonly channel: Channel; readonly byLayer: LayerId; readonly reason: string }[];
    readonly tookOver: readonly { readonly channel: Channel; readonly from: LayerId; readonly fromRun?: RunId }[];
}
```

`runs.start` already returns a `Run` that resolves with the result, so the landing is a second
promise on the handle rather than a change to what the run resolves with. The run's suggested
layers land on top of the stack (today's behavior, now documented).

```ts
const run = session.runs.start("louvain");
const { tookOver } = await run.landing;
notice(`Louvain now colors the drawing; ${tookOver[0]?.fromRun ?? "nothing"} moved below`);
```

**Alternatives.** (a) Make `runs.start` resolve with `{ result, landing }`: one promise, but breaks
every `await runs.start(...)` that reads a result: a major. (b) A `"run:landed"` event only: no
read after the fact, so an inspector opened later cannot show it.

**One-way door.** `landing` on `Run`, `runs.landing`, the three lists and their keys. `reason` is a
reader sentence, not an enum, so its wording is free.

---

## 9. Style channel sections and their order (#789)

**Problem.** The Style tab's fixed sections need to know which section each channel sits in and in
what order; `ChannelDescriptor.group` exists but its groups put size under Shape, where round 8
found 12 of 12 looked for size under Shape and missed it.

**Recommended.** Size becomes its own section beside Fill.

```ts
type ChannelSection =
    | "fill"
    | "size"
    | "shape"
    | "effects"
    | "label"
    | "tooltip" // node, in this order
    | "line"
    | "arrows"; // edge: line, arrows, label
interface ChannelDescriptor {
    readonly section: ChannelSection;
    readonly order: number; // within its section, ascending
}
```

`channelsFor(target)` returns channels already sorted by section order then `order`; the section
order is published as `CHANNEL_SECTIONS: Record<"node" | "edge", readonly ChannelSection[]>` from
`./schema` (Node-safe), so the app imports it instead of copying it. `group` stays as it is and is
marked deprecated, removed in the next grouped major.

```ts
import { CHANNEL_SECTIONS } from "@graphty/graphty-element/schema";
for (const s of CHANNEL_SECTIONS.node)
    renderSection(
        s,
        channelsFor("node").filter((c) => c.section === s),
    );
```

**Alternatives.** (a) Change `group`'s values in place (add "size", rename "color" to "fill"):
no second field, but it is a breaking change to a published union, so it waits for a major and
blocks tier 1. (b) Keep Size inside Shape (today's grouping): no API change for sections at all,
against the study finding.

**One-way door.** The section names and their order; `section`, `order`, `CHANNEL_SECTIONS`. A
union of section names is closed: adding a section later is a minor only if the docs say "treat an
unknown section as last", which the recommendation includes.

---

## 10. The project file: save and reopen a whole session (#301)

**Problem.** Only parts of a session serialize (styles, notes, camera presets), so "save the
project and reopen it" with data, results, styles, positions, labels and the selection cannot work,
and a project name and unsaved-changes state do not exist.

**Recommended.**

```ts
interface Session {
    readonly project: SessionProject;
}
interface SessionProject {
    save(options?: { app?: unknown }): Promise<Blob>; // application/vnd.graphty.project+json
    open(source: Blob | File | string | URL): Promise<OpenReport>; // a fresh history, not an undo step
    readonly name: string | null;
    rename(name: string): Run<void>;
    readonly dirty: boolean; // history moved past the saved version
    readonly app: unknown; // the slot from the opened file
}
interface OpenReport {
    readonly restored: readonly ProjectPart[];
    readonly missing: readonly { readonly part: ProjectPart; readonly reason: string }[];
}
type ProjectPart =
    | "data"
    | "results"
    | "styles"
    | "positions"
    | "layout"
    | "camera"
    | "selection"
    | "labels"
    | "sets"
    | "notes"
    | "views"
    | "visibility";
// SessionEventMap gains "project:changed": { name, dirty }
```

The file, version 1:

```jsonc
{
    "format": "graphty-project",
    "version": 1,
    "element": "3.6.0", // the writer, for diagnostics only
    "name": "Les Miserables",
    "data": {
        "nodes": [
            /* records */
        ],
        "edges": [
            /* records */
        ],
        "source": {
            /* data.source() */
        },
    },
    "results": {
        "<runId>": {
            "run": {
                /* algorithm, params, scope, seed, label */
            },
            "columns": {
                /* field: values by node order */
            },
        },
    },
    "styles": {
        /* styles.toDocument(), layers in order with visibility */
    },
    "positions": [
        /* x, y, z by node order */
    ],
    "layout": { "id": "...", "options": {} },
    "view": { "mode": "2d", "camera": {} },
    "selection": { "ids": [] },
    "labels": { "overlap": "hide" },
    "sets": {},
    "notes": {},
    "views": {},
    "visibility": {},
    "app": {
        /* stored untouched for the consumer */
    },
}
```

Results are stored as columns, so a reopen recomputes nothing. A reader of version N opens any
version up to N; a newer version is refused with `E_UNSUPPORTED` naming the version. Unknown
top-level keys are kept on save, so a newer writer's additions survive an older reader's round
trip. Suggested extension `.graphty`.

```ts
const blob = await session.project.save({ app: { inspectorTab: "values" } });
const report = await session.project.open(file);
if (report.missing.length) notify(report.missing.map((m) => m.reason).join(" "));
```

**Alternatives.** (a) A zip container with the data in graph-format's binary wire form and JSON for
the rest: about 3 to 5 times smaller for large graphs, but needs the byte-reading pipeline of
PR #770 (not merged, red build) and is not readable in a text editor; can be added later as
`version: 2` or a second `format` without breaking version 1. (b) Save only a reference to the
source file plus everything else: small, but a reopen breaks when the file moves, which is the
common case in a browser.

**One-way door.** The whole file layout: `format`, `version`, every top-level key and its meaning,
"results as columns by node order", the extension and media type, and the version rule (old files
open forever). Also `session.project`, `OpenReport`, the `ProjectPart` names and
`"project:changed"`. This is the largest decision in the document; the element's longest item
waits on it.

---

## 11. Readable run names (PR #726, already built)

**Problem.** A run started without a name got a hashed id (`degree_0bkzd1n0p2dnik`), which showed
in selectors, the legend and exported column headers.

**Built.** An algorithm may define `suggestedName(options): { id, label }`. A run with no `as:`
is named by this rule:

1. No suggestion: the id is the algorithm key with underscores (`degree`, `shortest_path`).
2. A suggested id that is free: the run gets it (`louvain_resolution_1_5`).
3. The same computation again (same algorithm, scope, sampling, exactness and suggested name):
   the existing run is reused and re-run in place.
4. A different computation under a taken name: `_2`, `_3`, ...
5. A name passed with `as:` always wins; an id never changes once given.

Built-ins name one setting, and only when it differs from its default: PageRank damping, Katz
alpha, Eigenvector and HITS direction, Louvain and Leiden resolution, Components strength,
Shortest path and link prediction method. So the everyday run is plainly `pagerank`, labeled
"Influence".

**One-way door.** The `suggestedName` hook and its `{ id, label }` return; the id alphabet
(lowercase, digits, underscore); and the built-in ids, since they become result paths in saved
styles and project files. Old hashed ids keep loading. Changing a named setting now starts a
separate run instead of re-running in place (documented in the PR).

---

## What approval unlocks

Items 4, 6, 7, 8 and 9 are small and start in parallel the day this is approved; items 2, 3 and 5
start the same day; items 1 and 10 are the long ones and set the date the Data page and Save and
reopen land. Each pull request adds its documentation page and a canonical example of about 15
lines written from the published docs alone.
