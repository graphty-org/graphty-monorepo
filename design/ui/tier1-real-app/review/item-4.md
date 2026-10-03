# Item 4 review: a node's neighbors with their weights (#784)

The recommendation under review is section 4 of `element-api-decisions.md`. It proposes a
graphty-element method, `session.data.neighbors(id, options)`, that returns one row per distinct
neighbor of a node with the summed weight of the edges between them ("tie"), paged. The graphty
app's inspector needs it for "Javert's 17 connections", strongest first.

## Verdict: approve with changes

The element does need this read, and paging is right. But the shape as proposed would publish a
fourth neighbor walk with its own vocabulary, and it disagrees with what graphty-element already
ships in five places:

- It spells the two-way direction `"both"`. The element's published type is
  `SelectionDirection = "in" | "out" | "all"` (`catalog/types.ts:885`), used by the Neighborhood
  selection the same inspector pairs it with. The app would have to translate between them.
- Its `sort` is a bare string. Every other page takes `RecordSort { key, descending }`
  (`session/types.ts:102-111`), so the blind author's copy of the `nodePage` form failed with TS2322.
- Its `weight` is a free JMESPath `Path`. Runs already take `WeightMeaning | null`
  (`session/runs/types.ts:197-202`, `algorithms/input/ScopedInput.ts:64-78`) and throw when no
  edge carries the attribute. Here a typo compiles and silently returns edge counts.
- It adds a synchronous neighbor page to `SessionDataApi`, whose own doc says neighbor pages are
  asynchronous and not on this surface (`session/types.ts:374-378`). The item does not mention it.
- It carries no display name. The docs example's `n.node.name` works only for Les Miserables;
  item 3's revised result already returns a resolved `name`.

It also leaves the edge cases that become documented behavior unspecified, and it does not tell the
app what the number measured, so the app could not follow tier1-design's rule ("with no weight,
the list orders by name and shows no value", `tier1-design.md:741-745`) without deciding over graph
data itself.

## Revised shape

```ts
// Exported from "@graphty/graphty-element" and "@graphty/graphty-element/session".
interface SessionDataApi {
    /**
     * Each distinct neighbor of a node once, with the combined weight of the edges between them.
     * Synchronous: one walk of the node's adjacency rows (O(degree + k log k)), the sorted order
     * cached per revision for the last few calls. Throws GraphtyError E_OPTION_RANGE for an id
     * the graph does not hold.
     */
    neighbors(id: NodeId, options?: NeighborOptions): NeighborPage;
}

interface NeighborOptions {
    /** Which edges to follow. Default "all". On an undirected graph all three are the same. */
    readonly direction?: SelectionDirection;
    /**
     * The edge weight, as runs take it. Absent: the weight the graph was loaded with, read as a
     * strength. null: count edges. A "strength" sums its edges; a "distance" takes the smallest.
     * An edge with no number at the attribute weighs 1, as in a run. Throws E_OPTION_RANGE when
     * no edge carries the attribute.
     */
    readonly weight?: WeightMeaning | null;
    /** Which neighbors are listed. Default "graph": every neighbor in the data. */
    readonly scope?: ScopeInput;
    /**
     * Default: strongest first ("weight" descending for a strength, ascending for a distance)
     * when the page has a weight; "name" ascending when it does not. Equal rows keep graph order.
     */
    readonly sort?: NeighborSort;
    readonly offset?: number; // as RecordPageOptions, default 0
    readonly limit?: number;  // as RecordPageOptions, default 100
}

/** The RecordPage sort shape. Closed for now; node attribute and result keys can be added later. */
interface NeighborSort {
    readonly key: "weight" | "name";
    readonly descending?: boolean;
}

interface Neighbor {
    /** The neighbor's record. */
    readonly node: NodeRecord;
    /** The same name rule as find: the nodeLabelPath value, else String(id). Untrusted text. */
    readonly name: string;
    /** The combined weight; with no weight, the edge count. */
    readonly weight: number;
    /** How many edges join the two, each counted once. */
    readonly edgeCount: number;
    /** Present when the neighbor is in the data but a filter hides it. Open: more kinds later. */
    readonly excludedBy?: { readonly kind: "filter" };
}

/** RecordPage, plus what the number measured. */
interface NeighborPage extends RecordPage<Neighbor> {
    /** The weight actually used, or null when the rows count edges. The app labels with it. */
    readonly weight: WeightMeaning | null;
    /** How many of the walked edges had no number at the weight attribute and weighed 1. */
    readonly missing: number;
}
```

The rules the TSDoc must state:

- **What a neighbor is.** Exactly the nodes `selection.apply({ neighborsOf: [id], direction })`
  selects at depth 1, minus the node itself. A self-loop never makes a node its own neighbor. A
  conformance test compares the two on directed, undirected and multigraph fixtures, and both
  are built on one adjacency walk.
- **Edges.** Each edge counts once per neighbor, deduplicated by edge row. A->B and B->A under
  `"all"` give one neighbor with `edgeCount` 2. Parallel edges combine by the weight's meaning.
  To combine replicates differently, load with `data.repeatedEdges` (`config/DataConfig.ts:9-17`).
- **Which weight.** The default is the loaded weight column: the attribute
  `lastImport().weightsAttribute` names, legacy `value` included (`session/project/ingest.ts:73-88`).
  So the numbers equal what a strength run reads with the same `weight`. When the import resolved
  no weight, `page.weight` is null and the rows count edges.
- **What the page says.** `total` counts distinct neighbors, not edges. `revision` is the same
  revision `nodePage` returns.
- **Grouping.** Rows are grouped by node row index, never by an object keyed by id. Ids 1 and "1"
  stay apart, and an id of `__proto__` is an ordinary id. A test holds both.

### Canonical example (compiled)

15 lines. It was checked under `strict`, `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes` against the built types, with the stub above and the event-typing fix
below. The type check exits 0.

```ts
// Click a node, list its 10 strongest neighbors with their weights.
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const list = document.querySelector("#neighbors")!;

element.addEventListener("graphty-node-click", (e) => {
    const page = element.session.data.neighbors(e.detail.nodeId, { limit: 10 });
    list.replaceChildren(...page.records.map((n) => {
        const li = document.createElement("li");
        li.textContent = page.weight ? `${n.name}: ${n.weight}` : n.name;
        return li;
    }));
    list.setAttribute("aria-label", `${page.total} connections`);
});
```

`variants.ts` checks the probes that failed for the blind author:

- `sort: { key: "weight" }` (weakest first) compiles.
- `scope: "selection"` compiles.
- `weight: { attribute: "km", meaning: "distance" }` and `weight: null` compile.
- `direction: "both"` and `sort: "weight"` are compile errors, as intended.

Scratch is in `tmp/api-review/item-4/`: `stub.d.ts.part`, `patch.py`, `example.ts`, `variants.ts`,
`tsconfig.json` and `build.log`.

## What changed and why

1. **`direction` is `SelectionDirection`, default `"all"`.** This is the element's existing type and
   spelling. On an undirected graph `"in"` and `"out"` equal `"all"`, as the Neighborhood selection
   walk already treats them (`selection/targets.ts:482-501`). It does not throw: if neighbors threw
   where the selection does not, the pair would disagree.
2. **`weight` is `WeightMeaning | null`, the type runs take.** The attribute is a flat name read by
   the run's column reader, not a JMESPath expression. That removes the expression-injection path
   the security review measured (a column named `w || data.secret` read another column). An
   attribute nothing carries throws E_OPTION_RANGE, as `ScopedInput.ts:489-496` does. The meaning
   decides both the combine and the "strongest first" direction. Without it, summing kilometers
   and listing the largest first would rank the weakest tie first.
3. **The missing-weight rule is the run's (an edge with no number weighs 1), reported in
   `page.missing`.** The neighbor panel must give the same number as a strength run on the same
   data, which is the data scientist's "numerically identical" goal. The store and runs already
   weigh such an edge 1. Leaving it out instead, as the extension view's rule does
   (`simple/view.ts:17-18`), would make neighbors disagree with runs. `missing` keeps the fallback
   from being silent.
4. **The page says what it measured: `weight: WeightMeaning | null`.** The app labels the value
   with the attribute's name, and hides it when the weight is null, by reading this field. Without
   the field it would have to read `lastImport()` and decide for itself. The default sort follows
   tier1-design: strongest first with a weight, by name without one.
5. **`sort` takes the `RecordSort` shape, with a closed key set `"weight" | "name"`.** Closing the
   set avoids colliding with a node attribute that happens to be called `weight` or `name`. Adding
   attribute and result keys later (item 5) is a widening, so it is additive.
6. **`scope` added, default `"graph"`, and hidden neighbors are marked, not dropped.** This matches
   every other page and item 3's revised `excludedBy` rule. A filter is a view, not access control,
   so the inspector shows hidden neighbors marked.
7. **`tie` became `weight`; `edges: EdgeId[]` became `edgeCount`.** No guide or element type uses
   "tie". A per-neighbor id array has no bound: two nodes joined by 100,000 parallel edges, under
   the default `repeatedEdges: "keep"`, return all 100,000 ids on one click. Tier 1 needs only the
   count. `edgePage({ touching })` still pages the actual edge records.
8. **`name` added, by item 3's rule.** It is the `nodeLabelPath` value, else `String(id)`, read
   from the session's own config. `algorithms/results/labels.ts` reaches through `Graph`, so it is
   not usable from `./session`. Sorting by `"name"` sorts this string.
9. **Synchronous, with the cost designed in.**
   - The element enforces load ceilings of 50,000 nodes and 100,000 edges (`session/limits.ts:74-84`).
   - Reading the snapshot's adjacency rows costs 3.6-5.8 ms for a 40,000-degree hub, measured in
     `tmp/api-review/perf-4/bench.mjs`.
   - The implementation must not copy `edgePage({ touching })`, which scans every edge
     (`session/data.ts:563-564`).
   - The name sort reads a per-revision name rank (one collator pass per revision, shared with
     item 3's find index), not a 40,000-string collator sort (measured 60 ms) on every click.
   - The cache keeps the last few queries, not an unbounded map.
   - The doc at `session/types.ts:374-378` is corrected in the same change, which item 3's edit of
     that comment also touches.
10. **An unknown id throws.** An empty page would make a node removed by an undo look like an
    isolated node. The inspector compares `revision` to know when a held page is stale.
11. **Exports and the click event.**
    - `Neighbor`, `NeighborOptions`, `NeighborPage` and `NeighborSort` are exported from the root
      entry and from `/session`.
    - A separate element defect ships with this item: the `graphty-*` DOM events are not in
      `HTMLElementEventMap` (only the tag map is extended, `dist/src/graphty-element.d.ts:2188`),
      so `e.detail` is TS2339 and a consumer must guess the detail type. Add them, typed with the
      existing `NodeEventDetail` (`events.ts:455`). The canonical example depends on it.
12. **Effort re-rated from low to medium.** The work covers the reverse adjacency read, edge
    deduplication, the shared name rank, the bounded cache, the conformance test against the
    selection, and the event typing.

**Tier 1 design change.** The "17 connections" chip and the "Javert's 17 connections" title both
read `neighbors(id).total`. "Degree 17" stays the edge degree and is labeled as links. Today the
chip comes from degree, which counts parallel edges under the default `"keep"`. In an email graph
that reads 1,240 over a list of 38. The keyboard walk's "Valjean, 36 connections" announcement
(#794) reads the same `total`. This is a reversible studio decision.

## Findings rejected or deferred

- **"Too slow for the 1M-node and 5M-node persona graphs."** Rejected for this item. The element
  refuses a load past 50,000 nodes or 100,000 edges, so the worst case is bounded. A larger
  ceiling would need `neighborsAsync`, which is additive, and its name is reserved now.
- **"Adopt the extension view's missing-weight rule (leave out and count)."** Rejected, for reason 3
  above. The two existing element rules already disagree; that disagreement is filed as a residual
  risk, not settled by a third API.
- **"Throw for `in` or `out` on an undirected graph, as the extension view does."** Rejected, for
  reason 1 above.
- **"Add `aggregate`/`combine` (sum, max, min, mean, count) now."** Deferred. `repeatedEdges` at
  load already covers replicate edges, and the meaning picks sum or min. A later `simplify` option,
  reusing the run's vocabulary, is additive with today's defaults unchanged.
- **"Add `depth` now."** Deferred. tier1-design leaves the 1-to-3 hop choice to tier 2. See the
  one-way doors: `weight: number` has no meaning past one hop, so hops past 1 need either a
  separate method or a new rule.
- **"Add `edgeType` and per-table weights now."** Deferred. The element has one edge table today.
  An `edgeType` option is additive. The real risk, that a run and this page both weigh an edge from
  another table 1, is shared with runs and listed below.
- **"Take the node as `{ of: id }`, as `edgePage({ touching })` does."** Rejected. The node is
  required here, and a required argument reads best positional. A later common-neighbors form can
  widen the parameter to `NodeId | readonly NodeId[]` additively.
- **"Edge ids, and in and out counts, on each neighbor."** Deferred. They are additive fields,
  bounded or paged when added.
- **"Store weights in f32 show 0.10000000149011612."** Accepted as a companion fix, not a shape
  change. The element should stage weights as f64; graph-format supports it, and its importers
  already pass f64 (`graph-format/src/types/builder.ts:35`). This is an internal, reversible change
  that fixes runs too.
- **"Spelling: ten guide pages say neighbour."** Accepted as a docs fix in the same change.

## One-way doors

- The method name and its home: `session.data.neighbors(id, options)`, with the id positional.
- The field names `node`, `name`, `weight`, `edgeCount`, `excludedBy`, and the page fields `weight`
  and `missing`.
- `weight: number` with no undefined. This rules out a multi-hop row without a new rule.
- The defaults:
  - direction `"all"`
  - the loaded weight, read as a strength
  - scope `"graph"`
  - the meaning-dependent strongest-first sort, falling back to name
  - limit 100
- The semantics:
  - a missing weight weighs 1
  - distinct-neighbor `total`
  - self-loops excluded
  - reciprocal edges merged
  - equals the Neighborhood selection minus the seed
  - an unknown id throws
- That it is synchronous.

## Confidence: medium

**What supports it:**

- The shape and the 15-line example type-check against the real built types under the strictest
  flags. The probes that broke the original now compile or fail as intended.
- Every blocking finding has a direct answer in the shape.
- The cited source lines were spot-checked and hold: `catalog/types.ts:885`,
  `session/types.ts:102-133` and `374-378`, `runs/types.ts:197-202`, `ScopedInput.ts:64-78` and
  `489-496`, `ingest.ts:73-88`, `simple/view.ts:12-21`, `limits.ts:74-84`, `events.ts:455`.

**Why not high:**

- The shared name rank is designed but not timed.
- The weight story deliberately inherits the run's rules, including their defects (below).

## Residual risks

1. **An edited weight does not reach the store.** `update-rows` writes attributes only
   (`ingest.ts:280-285`), so after an edit the default weight is the loaded value while the table
   shows the new one. Runs have the same defect. File it as its own element bug. This item inherits
   the fix rather than reading records, which would break headless sessions, where attributes are
   empty (`session/types.ts:343-355`).
2. **Three weight rules exist in the element.**
   - The store and runs weigh a missing weight 1.
   - The extension view (`simple/view.ts`) leaves it out.
   - Once multi-table projects land (#781, #833), weighing another table's edge 1 under an
     explicit attribute mixes units.
   - Neighbors follows runs on purpose. Settling one rule, with `edgeType`, should happen once for
     runs, the extension view and this method together, before multi-table projects ship.
3. **The chip-count change is a design dependency.** If the app keeps reading degree for "N
   connections", the chip and the list disagree on every multigraph. Nothing in the API prevents
   that.
4. **The name falls back to the id.** On karate, or any file with no label path set, every row's
   name is its id until item 1's column mapping sets the Name role.
