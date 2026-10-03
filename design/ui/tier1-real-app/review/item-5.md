# Item 5 review: result values as table columns (#785)

The recommendation under review is section 5 of `element-api-decisions.md`. The graphty app's
node and edge tables need a column for an algorithm's result (PageRank, community, edge
betweenness) and need to sort by it, without the app reading runs and sorting on its own.
Section 5 proposes `nodePage({ columns: [path], sort: { key: path } })`, where `path` is a
hand-written `"results.<run>.<field>"` string, returning `page.columns[path]` as `unknown[]`.

## Verdict: redesign the addressing and the returned shape; keep the goal

The element should page and sort records by result values, and alternative (a), merging values
into records, stays rejected. What cannot ship:

- **The example names a run that never exists.** A run the caller did not name gets the id
  `<slug>_<digest>` (`graphty-element/src/session/runs/runId.ts:341`), so
  `"results.pagerank.value"` matches nothing. The element's own published rule is that nobody
  types a run id by hand and every run-reading API takes a run (`RunRef`), not a path
  (`graphty-element/src/session/results/types.ts:918-923`). The selection's `{ top }` target
  already takes `{ run: RunRef, field }` (`session/selection/targets.ts:130`). Section 5 is the
  one API that would break that rule.
- **The primary field is not always `value`.** It is `group` for a partition, `onPath` for a
  route, and so on. `results.path(run)` already picks it (`session/results/ResultsApi.ts:236-246`).
- **Raw paths bring quoting and expressions with them.** `Path` is documented as a JMESPath
  expression (`catalog/types.ts:68-69`), and ten of the twenty-four catalog algorithms are
  hyphenated, which the expression grammar reads as subtraction
  (`ResultsApi.ts:248-262`). Section 5 says neither whether a column may be an expression nor
  whether a hyphenated id must be quoted.
- **One sort key would mix three namespaces.** Today `RecordSort.key` is a bare attribute name
  read verbatim (`session/data.ts:649`). Section 5 adds `results.x.y` to the same string. An
  imported CSV column literally named `results.pagerank_<id>.value` is then the same string as
  a result path, so "can never collide" is false for sorting, and a crafted file can sort the
  table under the PageRank header with its own numbers.
- **The returned shape cannot grow.** `Record<Path, unknown[]>` is a bare array per key. A table
  header needs a label, a type and a pending state; a later rename (#829) and formatter need
  more. Turning the array into an object later breaks every consumer. Under the element's
  strict-consumer settings (`noUncheckedIndexedAccess`) section 5's own example fails with
  TS2532 on `page.columns[path][i]`.
- **Every existing page gains a required `columns: {}`**, which breaks any consumer code that
  builds a `RecordPage` literal (test doubles).

## Revised shape

Exported from `@graphty/graphty-element/session` beside `RecordSort`.

```ts
/** A run's result as a table column: the run, or the run and one of its fields. */
export type ResultColumn = RunRef | { readonly run: RunRef; readonly field?: string };

/** Sort by a run's result. The field is the shape's primary field when absent. */
export interface ResultSort {
    readonly run: RunRef;
    readonly field?: string;
    readonly descending?: boolean;
}

/** One cell. `undefined` when the run has no value for this element (outside its scope, say). */
export type ResultCell = number | string | boolean | undefined;

/** One requested column, in the order it was asked for. */
export interface PageColumn {
    readonly run: RunId;
    readonly field: string;
    /** `results.path(run, field)`: what a style or selector binds to from this header. */
    readonly path: Path;
    /** The header text, from the run's readable name; follows a rename. */
    readonly label: string;
    readonly type: "number" | "integer" | "boolean" | "string";
    /** The run is known but has no result yet (queued, re-running); every cell is undefined. */
    readonly pending: boolean;
    /** Aligned with `records`; a fresh frozen array, never a view of the run's storage. */
    readonly values: readonly ResultCell[];
}

interface RecordSort { readonly key: string; readonly descending?: boolean } // unchanged

interface RecordPageOptions {
    // ...offset, limit, scope unchanged
    readonly sort?: RecordSort | ResultSort;        // was RecordSort
    readonly columns?: readonly ResultColumn[];     // new; edgePage inherits it
}

interface RecordPage<TRecord> {
    // ...records, offset, total, revision unchanged
    /** Present exactly when `columns` was asked for. */
    readonly columns?: readonly PageColumn[];
}
```

Canonical example. It compiles under plain strict and under `noUncheckedIndexedAccess`
against graphty-element's built types with the shape above patched in
(`tmp/api-review/item-5/proj/example.ts`, `tsc.log`):

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const run = await element.run("pagerank");

const page = element.session.data.nodePage({ columns: [run], sort: { run, descending: true }, limit: 10 });
const [rank] = page.columns ?? [];

console.log(rank?.label);
page.records.forEach((node, i) => console.log(node.id, rank?.values[i]));
```

It names no run id, no field, no path and no `results` root. `variants.ts` in the same folder
also compiles: a non-primary field (`{ run: louvain, field: "groupSize" }`), two runs in one
table, edge betweenness on `edgePage`, today's `{ key: "weight" }` unchanged, and a saved bare
run id. Two misuses are now type errors (a column object with no run, a non-string field).

### Runtime rules the docs must state

- **Refusals.** An unknown run throws `E_UNKNOWN_RUN` with `details.known` and the nearest
  candidates, as the styles API already does (`session/styles/StylesApi.ts:990-1003`). An
  unknown field, a field of the wrong kind (an edge field on `nodePage`, a node field on
  `edgePage`), a graph-level field such as modularity, a `table`-typed field, and a pair-list
  result are refused with `E_BAD_COMMAND` naming the field and its kind. The error says where
  graph-level values and pair lists are read instead (`results.get(run)`). A bare string in
  `columns` is a run id, never a path or an expression; `"data.weight"` is refused at runtime.
  The types cannot catch that, because `RunId` is `string`.
- **Sort order.** A descending result sort lists measured elements in the order
  `RunResult.ranking(field)` gives, then unmeasured elements in graph order. Ties are split in
  graph order, so the first `limit` rows can cut through a tie group. That makes a table sort
  different from "top N", which `results.get(run).top()` and the `{ top }` selection answer by
  taking whole ties. The guide says so in one line, so a reader is not surprised when the
  top-10 rows and a top-10 style layer differ at a tie. A grouping field (`group`) sorts by
  group size rank, the same order the legend uses, not by raw group id.
- **Cost.** A result sort reads the run's typed column by dense index and allocates nothing
  per row. It must not go through `RunResult.node(id)`, which builds and freezes a record per
  call (`session/results/RunResult.ts:304-319`); measured, that is about 50% slower. Cost: one
  O(n log n) sort when the page revision changes, O(limit) per page after that.
- **Revision.** The `RecordPage.revision` doc gains "a run started, its result published or
  cleared, or the run removed". The code already does this (`session/GraphSession.ts:2113`,
  `2116`, `2193-2201`). The guide's re-read recipe (`docs/guide/javascript-api.md:171-178`)
  adds `run:changed` and says to compare `revision` before re-reading, because `run:changed`
  also fires on progress ticks.
- **Order cache.** Cap `SessionData.orders` with a small LRU (eight entries). Today it grows
  without bound within one revision (`session/data.ts:550-555`), and result columns multiply the
  distinct sort keys.

## What changed and why

| Section 5 | Revised | Why |
| --- | --- | --- |
| `columns: Path[]` | `columns: ResultColumn[]` (a `RunRef` or `{ run, field? }`) | Matches the element's rule and the `{ top }` target. Removes run-id guessing, field guessing, quoting and expressions. |
| `sort.key: string \| Path` | `sort: RecordSort \| ResultSort`; `RecordSort` untouched | Attributes and results never share one string, so there is no collision, no spoofing and no prefix sniffing. Existing sorts keep their meaning. |
| `columns: Record<Path, unknown[]>`, required | `columns?: PageColumn[]`, in request order, present only when asked | Header metadata included. Later additions (provenance, display text, group names, a formatter) are additive. No `__proto__` key hazard. No break for hand-built pages. |
| cells `unknown` | `number \| string \| boolean \| undefined` | Usable without a cast. Missing is defined. |
| unknown path: unspecified | `E_UNKNOWN_RUN` / `E_BAD_COMMAND` | A typo no longer gives a silently unsorted table. |
| example hard-codes a path, omits `limit` | example passes the run and `limit: 10` | It compiles and does what it says. |

## Findings rejected or deferred

- **"A result-sorted table goes stale with no signal"** (blind author, finding 7): rejected as
  a runtime claim. The page revision already advances when a result is published, re-run or
  removed (`GraphSession.ts:2193-2201`, `2116`), and the order cache clears on that
  (`data.ts:544-547`). The real defect is documentation, which the revised rules fix.
- **Run-id guide bug** (`algorithms.md` uses `(await element.run(..)).id`, but an awaited run
  is a `RunResult` with `runId`): real, but it is a guide bug, not part of item 5. The revised
  example never needs the id. File it separately.
- **Re-key the order cache on each sort's own inputs instead of the global tick**
  (performance lens): deferred. The cost today is 12-18 ms per re-sort at 50,000 nodes on this
  machine. It is internal and can change at any time without touching the API.
- **Multi-key sort** ("largest community, then name"): deferred. `sort` can later accept an
  array additively. The group-size-rank rule covers the tier 1 community table.
- **Provenance per column** (a result restored from a project file vs. computed here): the
  rule that a user-initiated `run()` never reuses a file-restored result belongs to item 10,
  and must be stated there. `PageColumn` can gain `origin` additively.
- **Persisting column references with derived run ids**: the element requires an `as` id
  before anything that names a run is persisted (`session/runs/types.ts:367-386`). That binds
  item 10 and the app's saved table state, not this read API.
- **Position of an element in a sorted order** ("Show in table"): deferred. An `around: id`
  option is additive. Name it now so the app does not ship a page-scanning workaround.
- **`null` vs. `undefined` cells, a cap on the number of columns**: rejected. Every column
  must name an existing run, which already bounds the count. One missing value is enough until
  the formatter needs more.
- **Item tables per run** (the refined design's item tab): out of scope. `ResultColumn`,
  `ResultSort` and `PageColumn` are exported standalone types so a future item page can reuse
  them.

## One-way doors

- `ResultColumn`, `ResultSort` and `PageColumn` as exported types, and their member names.
- `sort` widening to `RecordSort | ResultSort`. Code that reads `options.sort.key` from a
  caller-supplied options value must narrow first. That is a narrow type change, but it is
  public.
- `RecordPage.columns` as an optional array in request order.
- The documented sort order: ranking order, unmeasured last, ties split in graph order, and
  grouping fields sorted by size rank.
- `undefined` meaning "no value for this element".

## Confidence: medium-high

The addressing change is high confidence. It reuses `RunRef`, `results.path()` and the
`{ top }` target's shape, both examples compile under the strict-consumer flag, and every
fact above was read in the source. The remaining part is medium: `label`, `type` and `pending`
on `PageColumn` are designed from the tier 1 table's needs, not from a built table. The
group-size-rank sort rule assumes the legend's rank is cheap to read per run, which has not
been checked against the code.

## Residual risks

- **The plan's Export > Data still has no element owner.** It needs result columns in a CSV
  (`plan.md:412`). If the app builds that CSV by paging `nodePage`, it puts graph serialization
  in the app, and an export that spans a run finishing can repeat or skip rows. graphty-element
  should own a data export with result columns, decided before the app's export is built.
- **Group names.** Cells for a community column hold raw group ids, while the legend says
  "Group 1". Until `PageColumn` gains display names, the app either shows ids that disagree
  with the legend or computes names itself, which is forbidden.
- **A string in `columns` is not type-checked.** `RunId` is `string`, so `"data.weight"` fails
  only at runtime. The error must name the candidates, or the first newcomer who tries it is
  stuck.
- **Any run of any algorithm re-sorts a result-sorted table**, because the order cache keys on
  the session-wide tick. That is invisible at tier 1 sizes and may become noticeable at
  200,000 edges on a laptop.
