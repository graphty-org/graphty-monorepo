# The edge model and layout state in graphty-element 2.0

graphty-element is a web component that renders graphs. This document decides five changes to it
that cannot be designed apart, assigns every file they touch to one of three build lanes, and says
what a test must assert before each one counts as done.

The five:

1. How an edge record's endpoints are read, how an edge is identified afterwards, and what an
   unreadable file does instead of loading silently.
2. Whether two edges between the same pair of nodes can both exist, and what is reported when they
   do.
3. Whether removing a node removes the edges attached to it, and whether that can be undone.
4. How an edge weight reaches the two layouts that can read one.
5. Where a pinned node's pin lives, so that it survives a layout change.

They are one piece of work because they meet in one method. `DataManager.addEdges` reads the
endpoints, decides whether a repeat is a repeat, resolves the weight and hands the edge to the
store, in four consecutive statements. `Edge.id` is the key of the map the render edges live in,
and it is built out of the endpoints, so parallel edges cannot exist until identity changes, and
identity cannot change until the endpoint spelling is settled.

The breaking-change register for this release is `design/element-api/element-api-migration.md`.
Where this document contradicts a row in it, the contradiction is marked and the reason given.

The package has exactly one consumer today, the React application in `graphty/`, which resolves the
element through a workspace link. That is what makes this affordable: every caller of every surface
changed here is in this repository.

---

## 1. The edge record and edge identity

### 1.1 What is wrong now

The runtime reads an edge's endpoints from two configured paths whose defaults are `src` and `dst`
(`graphty-element/src/config/DataConfig.ts:30-31`). The element's own JSDoc, its getting-started
guide, its installation guide and its data-sources guide all tell a reader to write `source` and
`target`. The JSON importer accepts `source`, `src` or `from` during validation and then passes the
record through unchanged (`src/data/JsonDataSource.ts:237, :347-350`), so a file spelled the way the
guides teach passes validation, reaches the data manager, resolves `null` against both defaults and
produces a graph with nodes, no edges, and no error.

The failure is worse than "no edges". The first unresolvable record is filed under the pending key
`"null:null"`, and every record after it is dropped at `src/managers/DataManager.ts:681` as a
duplicate of that one. One edge is held forever and the rest vanish without even a pending entry.
Meanwhile `data-loading-complete` reports `edgesLoaded: 254` for a file that produced zero edges,
because that number counts records handed over (`DataManager.ts:888-891`), not edges accepted.

This has already cost a shipped bug. The application's node inspector reported "Expand 0 neighbors"
for every node of the Karate Club graph loaded from `karate.gml`, while the same node's result card
said 17 links.

The endpoint pair is also the edge's identity: `Edge.id` is `` `${srcNodeId}:${dstNodeId}` ``
(`src/Edge.ts:150`). That identity is ambiguous for any node id containing a colon -- an edge
`a:b -> c` and an edge `a -> b:c` collide -- and it cannot name two edges between the same pair at
all, which is why parallel edges are dropped.

The same pair convention is implemented independently in three more places: `edgeIdOf` in
`src/session/scope/ScopeApi.ts:150-152`, `edgeResultId` in `src/algorithms/results/types.ts:85-88`,
and inline in eight algorithm files. Two of the three carry a doc comment claiming to be the only
implementation.

### 1.2 Canonical output: `source` and `target`

Settled already by the register (section 4.3) and partly built: `EdgeRecord` is
`{ id, source, target, ...attributes }` (`src/session/types.ts:52-59`) and `session.data.edge(id)`
already returns that shape. Nothing here reopens it.

What is not built is everything around it.

### 1.3 Input resolution

**One implementation, one decision per load, reported.**

A new module `src/data/endpoints.ts` owns the whole of it:

```ts
export type EndpointSpelling = "source/target" | "src/dst" | "from/to" | "declared";

export interface ResolvedEndpoints {
    readonly source: string;          // the JMESPath expression actually used
    readonly target: string;
    readonly resolvedFrom: EndpointSpelling;
}

export function resolveEndpoints(
    records: readonly Record<string | number, unknown>[],
    declared: { source: string | null; target: string | null },
): ResolvedEndpoints;                 // throws E_EDGE_ENDPOINTS_UNRESOLVED
```

The rules:

- **A declared pair wins and is never probed against.** When `knownFields.edgeSrcIdPath` and
  `edgeDstIdPath` are non-null, or a caller passed `{source, target}` to `addEdges`, those
  expressions are used for every record and `resolvedFrom` is `"declared"`. A record that does not
  answer them is a rejected record, not a reason to try another spelling. A consumer who named the
  columns has settled the question.
- **Otherwise the probe order is `source`/`target`, then `src`/`dst`, then `from`/`to`.** The first
  pair for which some record in the batch yields a non-null value for BOTH halves wins.
- **The decision is per batch, not per record.** A file that spells one edge `source`/`target` and
  another `from`/`to` is a broken file, and resolving per record makes the answer unreportable and
  order-dependent. Once a pair is chosen it applies to every record in the batch; a record that does
  not answer it is rejected and counted.
- **A batch of edge records where no pair resolves throws.** `GraphtyError` with code
  `E_EDGE_ENDPOINTS_UNRESOLVED` (already declared at `src/errors/codes.ts:169-176`, thrown by
  nothing today), carrying `details.columns` -- the union of the top-level keys the records actually
  carry, capped at fifty names. A batch with zero edge records does not throw.
- **A chunked load probes once.** `addDataFromSource` resolves on the first chunk that carries edge
  records and passes the resolved pair explicitly to `addEdges` for every chunk after it, so one
  load has one answer.

The probe reads `source`/`target` before `src`/`dst` because that is what the ecosystem writes -- D3,
Cytoscape, NetworkX JSON, GEXF, GraphML and GML all use it, and none of them uses `src`/`dst`. The
`from`/`to` pair is third because vis.js uses it and because the element's own Storybook already sets
it by hand (`stories/Data.stories.ts:816-817`).

### 1.4 `edgeSrcIdPath` and `edgeDstIdPath` survive; their default becomes `null`

The register's section 4.4 migrates these to `ImportPlan.edgeSource` / `edgeTarget`. `ImportPlan`
does not exist anywhere in `src/`, and inventing it is a larger piece of work than this change.

So: the two keys keep their names and their place in `GraphKnownFields`, and their schema changes
from `z.string().default("src")` to `z.string().or(z.null()).default(null)`. `null` means "probe".

Three reasons this is right rather than merely cheap:

- `GraphKnownFields` is a `z.strictObject` (`src/config/DataConfig.ts:20`), so removing a key is a
  stored-template breaking change and a template written before the removal stops parsing. Changing
  a default is not: a stored template that explicitly carries `"src"` keeps parsing and keeps
  behaving exactly as it did.
- They are pinned as required element properties by
  `test/graphty-element/api-parity.test.ts:117-118`.
- When `ImportPlan` lands it can absorb them without a second break, because the element already
  treats them as the explicit-override path.

The element properties `edgeSrcIdPath` and `edgeDstIdPath` keep their names and their setters. Their
getter return type widens to `string | null`.

### 1.5 The importers stop translating

Seven registered formats (`src/data/index.ts:11-17`). All seven write `source` and `target` on the
records they hand over, and none of them writes `src` or `dst`:

| File | Today | After |
|---|---|---|
| `JsonDataSource.ts:237, :347-350` | validates three spellings, normalises none | unchanged: it still passes the record through, and resolution now reads all three |
| `GMLDataSource.ts:347-355` | builds `{src, dst, ...edge}` then deletes `source` and `target` | keeps `source` and `target`, deletes nothing |
| `GEXFDataSource.ts:389-406` | `{src, dst}` plus `edgeData.id = edgeObj["@_id"]` | `{source, target}`; the file's own edge id becomes `gexfId`, never `id` |
| `GraphMLDataSource.ts:289-301` | `{src, dst}` | `{source, target}` |
| `CSVDataSource.ts:239-286` | `{src, dst}` plus every other column | `{source, target}` plus every other column |
| `CSVDataSource.ts:691-696` | `{src, dst, ...row}` -- the spread restores `source`/`target` | `{source, target}` with the endpoint columns removed from the spread, like `createEdge` |
| `DOTDataSource.ts:106-110` | `{src, dst, ...attributes}` | `{source, target, ...attributes}` |
| `PajekDataSource.ts:345-356` | `{src, dst, directed}` | `{source, target, directed}` |

Two rules the table encodes:

- **No importer writes `id` on an edge record.** `id` on an edge means the element-assigned counter
  from section 1.6, and an importer that writes it wins the collision in any consumer that spreads
  the record after the id. That is live today: `graphty/src/components/Graphty.tsx:241-246` builds
  `{id, src, dst, ...edge.data}`, so a GEXF file's `@_id` replaces the element's id in every record
  the application reads. A format carrying its own edge identifier writes it under the format's own
  name -- `gexfId` -- where it is an ordinary attribute a consumer can read.
- The parsers' internal types (`DOTDataSource`'s `ParsedEdge` at `:13-14`, `PajekDataSource`'s at
  `:16-17`) are not public and do not change. Only the record handed to the element changes.

`CSVDataSource`'s `sourceColumn` / `targetColumn` options are renamed `edgeSource` / `edgeTarget`,
and the catalogue (`src/catalog/formats.ts:78-100`) publishes that one pair for all seven formats
instead of publishing `edgeSrcIdPath`/`edgeDstIdPath` for JSON, `sourceColumn`/`targetColumn` for
CSV and nothing for the other five. One fact, one name, everywhere it is advertised.

### 1.6 Edge identity: the element-assigned counter

**`Edge.id` becomes the element's stable per-edge counter, as a string.**

Half of this already exists. `GraphStore` declares an edge column `graphty.edgeId` with dtype `u32`,
role `"id"` and `unique: true` (`src/data/GraphStore.ts:146-151`), and `ingestEdge` stamps
`store.nextEdgeId()` into it on every edge (`src/data/ingest.ts:145-153`). The counter was
deliberately not wired to `Edge.id` -- the comment at `GraphStore.ts:46` records that. This change
is the wiring.

What changes:

- `ingestEdge` returns `{ index, edgeId }` instead of a bare index.
- `Edge`'s constructor takes the id. `Edge.id: string` is `String(edgeId)`.
- The doc comment at `src/Edge.ts:42-46`, which states that "`id` is unchanged and remains the
  `"src:dst"` pair string", is replaced by one describing the counter.
- An edge whose endpoint ids graph-format will not store (`ingestEdge` answers `INVALID_INDEX`)
  is **rejected**: it gets no store row, no counter, and no render object. Today it becomes a render
  object with `index === INVALID_INDEX`, which is how an edge ends up permanently visible and
  unfilterable (`src/managers/UpdateManager.ts:250-258` forces `!placed` edges visible). Rejecting
  it makes "every `Edge` has a store row and an id" an invariant everything downstream can rely on,
  and the rejection is counted and reported (section 6).

**Why a string and not `string | number`.** The counter is a number in the store; the u32 id column
hands a number back. An edge id crosses into a DOM `CustomEvent` detail, a persisted scope document,
a JMESPath selector string, and Map keys shared with structures keyed by node ids. A `string | number`
id means every one of those surfaces has to decide about coercion, and `"17" !== 17` as a Map key
fails as an empty selection with no error -- the same silent class this release exists to remove. One
type, one spelling.

**There is exactly one EdgeId type after this.** Today there are two on one published entry point:
`session.ts:237` exports `EdgeId = string` from `src/catalog/types.ts:50`, and `session.ts:65`
exports `EdgeRecord` whose `id: EdgeId` is graph-format's `string | number`
(`src/session/types.ts:16`). So `const id: EdgeId = record.id` is a type error today. The fix is one
line: `src/session/types.ts` imports `EdgeId` from `../catalog/types` instead of from
`@graphty/graph-format`. `src/catalog/types.ts` needs no edit -- it already says `string`.

**The conversion lives in one module,** `src/data/edgeIdentity.ts`:

```ts
export function edgeIdOf(counter: number): EdgeId;      // String(counter)
export function edgeCounterOf(id: EdgeId): number;      // the integer, or INVALID_INDEX
```

Everything that converts calls these. Nothing else stringifies or parses an edge id.

### 1.7 What the maps are keyed by afterwards

| Structure | Key today | Key after |
|---|---|---|
| `DataManager.edges` | `Edge.id`, the pair string | `Edge.id`, the counter string. Same shape, new key, and now collision-free |
| `DataManager.edgesByIndex` | the store's logical edge index | unchanged |
| `DataManager.edgeCache` (`EdgeMap`) | ordered endpoint pair -> one `Edge` | ordered endpoint pair -> `Edge[]` |
| `DataManager.pendingEdgeKeys` | the pair string | **deleted**; see below |
| `edgeSpaceOf` in `ScopeApi.ts` | the pair string, minted | the `graphty.edgeId` column, read |
| a run's per-edge result | `edgeResultId(src, dst)` | `edge.id` |

**`EdgeMap` becomes a multimap.** `src/Edge.ts:1392-1480` is a `Map<srcId, Map<dstId, Edge>>` whose
`set()` throws `new Error("Attempting to create duplicate Edge")` on a second edge for a pair. That
throw is what the drop guard at `DataManager.ts:681` exists to avoid hitting, so deleting the guard
without changing this class produces a thrown error in the middle of a data load rather than two
edges. The inner value becomes `Edge[]`:

- `get(src, dst): readonly Edge[]` -- empty array for none, never `undefined`.
- `first(src, dst): Edge | undefined` -- the single-answer question, for callers that have one.
- `set(src, dst, e)` appends and never throws.
- `delete(src, dst, e)` removes that specific edge and cleans up empty levels.
- `size` counts edges, not pairs.

`Edge` gains two derived, unstored members: `parallelRank` (its position in
`edgeCache.get(srcId, dstId)`) and `parallelCount` (that array's length). They are computed, not
maintained, so a removal cannot leave them stale. Nothing draws with them yet; they exist so that the
geometry work that eventually separates parallel edges has the numbers, and so a style layer can
already read them.

**`getEdgeBetween(src, dst): Edge | undefined` becomes `getEdgesBetween(src, dst): readonly Edge[]`.**
"The edge between a and b" stops being a single thing. The method has zero callers in the element, in
its tests and in the application -- it appears only in generated documentation -- so this release is
the free moment to fix its return type.

**The three pending-edge resolutions collapse to zero.** Today the same record is resolved against
the same two config paths in three places: `addEdges` (`DataManager.ts:669-679`),
`processPendingEdges` (`:473-477`) and `pendingEdgeKey` (`:270-274`). `PendingEdge` gains
`sourceId` and `targetId` -- the ids `addEdges` already resolved -- so `processPendingEdges` does no
JMESPath and no resolution at all, and `pendingEdgeKey` is deleted with the `pendingEdgeKeys` set it
served. A deferred edge can no longer resolve differently from an immediate one, because it is not
resolved twice.

**The session's edge identity stops being minted.** `edgeSpaceOf(snapshot)` in
`src/session/scope/ScopeApi.ts:179-209` builds its id map with `byId.set(idOf(edge), edge)` over a
computed pair string, so under parallel edges only the last of a repeated pair would be addressable.
After this change:

- `idOf(edgeIndex)` reads the `graphty.edgeId` column -- `snapshot.edges.byRole("id")`, the same
  column `snapshot.edgeIndexOf` resolves through -- and returns `edgeIdOf(value)`.
- `indexOf(id)` is `snapshot.edgeIndexOf(edgeCounterOf(id))`, which is a lazily built index
  graph-format already owns. The element's own hand-built map goes away.
- The private `edgeIdOf(source, target)` helper at `:150-152` is deleted.

Every session surface that names an edge changes its id spelling with it, and all of them at once:
`selection.apply({edges})` and `selection.edges`, `visibility.edges`, a `Scope`'s
`{match: "ids", edges: [...]}`, `styles.explain({edge})`, `run.edge(id)`, and the `edgeIdAt`
memoisation that joins a run's published edge ids to snapshot rows
(`src/session/styles/sources.ts:442-452`). They must move in one commit: if the algorithm side and
`sources.ts` diverge, every edge-valued style layer paints nothing and reports no error.

**`edgeResultId` is deleted.** `src/algorithms/results/types.ts:74-88` computes an edge id from two
node ids, which is not possible under a counter. No built-in algorithm calls it -- all eight inline
the template string instead -- so deleting it is a one-line removal plus eight rewrites.

The rewrite for each of the eight (`DijkstraAlgorithm`, `BellmanFordAlgorithm`, `PrimAlgorithm`,
`KruskalAlgorithm`, `MinCutAlgorithm`, `MaxFlowAlgorithm`, `BipartiteMatchingAlgorithm`, and
`src/algorithms/utils/graphUtils.ts`) is the same shape, and it is smaller than it looks, because
seven of them already iterate `dataManager.edges.values()` and have the `Edge` in hand:

- Keep the internal endpoint-pair keying that matches an `@graphty/algorithms` result back onto
  element edges. That is a lookup key, not an identity, and it lives in one shared internal helper,
  `edgePairKey(source, target)` in `src/algorithms/utils/graphUtils.ts`. It is not published from
  `./extend`, and its doc comment says why: it names a pair, not an edge.
- Publish `edge.id`. `{ id: key, values: {...} }` becomes `{ id: edge.id, values: {...} }`.

`MinCutAlgorithm.ts:243-249` and `PrimAlgorithm.ts:119-125` also translate between three endpoint
spellings in one function -- the algorithms package's `source`/`target` or `from`/`to`, and the
element's `srcId`/`dstId`. That translation is not removed here; see section 1.9.

### 1.8 What the attribute bag carries

`EdgeRecord` is built at `src/session/data.ts:115-128` by spreading the raw importer record and then
writing `id`, `source` and `target` over it. The raw record comes from
`Graph.ts:264-265`: `edgeAttributes: (index) => this.dataManager.edgesByIndex[index]?.data`.

Once the importers stop writing `src`/`dst`, the duplication is gone for every file the element
loads. It is not gone for a record a consumer pushed in spelled `src`/`dst`, which the permissive
resolution accepts.

So the endpoint keys are stripped at the one seam that builds the bag. `DataManager` records the
resolved endpoint expressions for the current dataset, and the `edgeAttributes` callback omits those
two keys when they are plain property names. `Edge.data` keeps the raw record unchanged -- it is the
raw record, and that is its contract for anyone reaching through `element.graph`. The session's view
of it is canonical.

One user-visible consequence with no code change anywhere in the application: the data table's Edges
tab derives its column headers from the keys each record carries, in first-mention order
(`graphty/src/components/shell/AppShell.tsx:388-399`). Its headers change from `src, dst` to
`source, target`, and on JSON files the duplicate `source`/`target` columns disappear.

### 1.9 What is deliberately not renamed

**`Edge.srcId` and `Edge.dstId` -- the render object's fields -- keep their names.**

Renaming them touches eleven layout engines, eight algorithm files, `LayoutEngine.ts:707-708`,
`graphUtils`, `communityUtils`, `SchemaExtractor` and the application's `GraphEdgeLike` -- and every
one of the eleven layout lines is a line the weighted-layout work in section 4 is also rewriting.

The argument for renaming them is that one translation stays alive. The argument against is that the
translation is now in exactly one direction and one place: the record's keys are canonical
(`source`/`target`), the render object's fields are internal (`srcId`/`dstId`), and nothing a
consumer reads carries the internal spelling. `Edge` is reachable only through `element.graph`, which
is the escape hatch this release is closing rather than polishing.

This is a scope decision, and it is made here so that neither build lane discovers it mid-flight.

**`edge-click` is deleted rather than emitted.** It is declared (`src/events.ts:281-290`), documented
(`docs/guide/events.md:23`) and emitted by nothing. The register (section 2.8) says
`graphty-edge-click` is emitted in 2.0. It is not, and the reason is concrete: edge meshes are
explicitly unpickable in three places (`src/Edge.ts:226, :367, :541` and
`src/meshes/PatternedLineMesh.ts:189`), so emitting it requires edge picking, which does not exist.
Its declared detail also carries a live `Edge` holding a Babylon mesh, which cannot be
structure-cloned and contradicts the ids-only rule the element states at `graphty-element.ts:179`.
A declared event that never fires is a documented lie; shipping the type without the emitter is what
created this one. The type, its union membership and its documentation row go, and the event returns
with a serialisable detail when edge picking lands.

---

## 2. Parallel edges and the repeat policy

### 2.1 What is wrong now

Two edges between the same ordered pair of nodes cannot both exist. Three separate mechanisms
enforce it:

- `DataManager.ts:681` drops a second record before it reaches the store, so the snapshot never sees
  it either.
- `DataManager.ts:492` drops it again in `processPendingEdges`, and not symmetrically: by the time
  that line runs the record was already ingested at `:690`, so it drops a render object for an edge
  the snapshot holds, leaving a store edge with no `Edge` and a permanently occupied `edgesByIndex`
  slot.
- `EdgeMap.set` throws on a duplicate pair (`src/Edge.ts:1424`), which is what the two drops exist to
  avoid.

The consequence is invisible. `GraphStatistics.repeatedEdgeCount` is implemented, correct, and
always zero, because the repeats are dropped before the store can count them
(`src/session/statistics.ts:129-150`). The application already renders a "parallel edges" row off
that statistic and suppresses it on zero (`AppShell.tsx:4050-4053`), so the row has never appeared.

One layer down, the store is already a multigraph: `GraphStore` constructs its builder without a
`duplicateEdges` option, so graph-format's default `"keep"` applies
(`src/data/GraphStore.ts:126`). Nothing below the element drops a parallel edge.

### 2.2 The policies

The vocabulary is graph-format's, unchanged: `keep`, `first`, `last`, `sum`, `min`, `max`, `error`
(`graph-format/src/types/columns.ts:103`). The register's section 3 row proposes
`keep-all`/`keep-first`/`sum-weights`/`drop` instead. Those four are a second spelling of a
vocabulary that already exists one package down, and inventing them here would be the element
translating between two names for one fact, which is the defect section 1 removes. The register's
row is superseded on wording, not on substance.

What each does to the second and later records for an ordered pair:

| Policy | Effect |
|---|---|
| `keep` | both edges exist, each with its own id, weight and attributes |
| `first` | the repeat is discarded; the edge already present is untouched |
| `last` | the repeat's weight and attributes replace the existing edge's |
| `sum`, `min`, `max` | one edge survives; its weight is the reduction over the group. Attributes are the survivor's |
| `error` | `GraphtyError` with `E_DUPLICATE_EDGE`, naming both records |

The policy is a new key on `GraphKnownFields`: `repeatedEdges`, defaulting to `"keep"`. It is also an
option on `addEdges` (section 2.5), so one call can differ from the configured default.

### 2.3 The policy is applied at ingest, not at freeze

graph-format can apply the same policies at freeze time, through the builder's `duplicateEdges`
option. That is the wrong place here, for a reason specific to this element: a merge policy
**rewrites the builder's edge set**, and the element holds a render `Edge` per builder edge index,
plus a stamped `graphty.edgeId` counter per edge. A renumbering behind the render objects' backs
would leave `Edge.index` pointing at another edge's row, and `Graph.ts:265` would then read another
edge's attributes -- silently.

So `GraphStore`'s builder keeps `duplicateEdges: "keep"`, and `DataManager.addEdges` applies the
policy before calling `ingestEdge`. It has everything it needs: `edgeCache.get(source, target)`
answers what is already present, `builder.edgeWeight(index)` and `builder.setEdgeWeight(index, w)`
exist (`graph-format/src/builder/graph-builder.ts:722, :735`), and both the store row and the render
object are reachable from the existing `Edge`.

### 2.4 The default is `keep`, and here is why

The cost is real either way, so the reason has to be written down.

Keeping parallel edges changes every edge count, every density, every degree and every cost estimate
on any multigraph, in the element and in the application at once. That is a registered breaking
change a consumer reads about, can measure against `statistics().repeatedEdgeCount`, and can turn off
with one word of configuration.

Dropping them is the loss that ships today, and it is undetectable. The number the element publishes
about the load -- `edgesLoaded` -- counts the records handed over, so it says the edges are there.
The number that would disagree, `repeatedEdgeCount`, is structurally pinned at zero by the drop
itself. A consumer cannot discover that their file had parallel edges, cannot count them, and cannot
get them back, because the data is gone before anything in the element could have counted it.

A multigraph is also a real thing that real files carry: a road network with two carriageways, a
ledger with repeated transactions, a citation graph with repeated citations. An element that cannot
hold one cannot say so either.

A change a consumer can see and reverse beats a loss they cannot detect. Default `keep`.

### 2.5 Re-adding the same data, which is the hazard `keep` creates

The drop guard was doing a second job nobody wrote down: making a re-add idempotent.

Two paths re-supply edges the graph already holds. The double-click expand handler fetches a node's
neighbourhood and calls `addNodes` then `addEdges` (`src/NodeBehavior.ts:582-585`), and the
`edge-data` property setter calls `addEdges` additively on every assignment
(`src/graphty-element.ts:466-472`). Under `keep`, an expand doubles every edge already present.

Two answers, both needed:

- **The property setter stops being additive.** The register already requires this: `element.data = {nodes, edges}` replaces. That removes the second path entirely.
- **`addEdges` takes the policy per call**, and the expand path passes `"first"`. Its signature
  becomes an options bag:

  ```ts
  addEdges(
      records: Record<string | number, unknown>[],
      options?: { source?: string; target?: string; repeated?: DuplicatePolicy },
  ): void
  ```

  replacing the positional `(edges, srcIdPath?, dstIdPath?)`. The expand path passes
  `{ repeated: "first" }` because "fetch the neighbourhood of this node" is a request that
  legitimately re-supplies known edges, and the element knows that about its own call site. The
  element's public `addEdge` / `addEdges` take the same bag; the positional path arguments are
  removed, which the register's section 4.4 already anticipates.

A consumer whose data carries genuine edge identifiers has a third answer available: set
`knownFields.edgeIdPath` (new, default `null`) to the record key that identifies an edge, and a
second record with the same value merges into the existing edge instead of creating one. With it
null -- the default -- there is no record identity and `keep` means keep.

### 2.6 What runs over a multigraph

`@graphty/algorithms` cannot represent one. With `allowParallelEdges: true` its `Graph.addEdge`
skips the duplicate throw but then stores into `adjacencyList.get(source).set(target, edge)`, a Map
keyed by target, while `edgeCount++` runs for every call
(`algorithms/src/core/graph.ts:112-145`). A second parallel edge silently replaces the first, its
weight is lost, and the graph handed to every algorithm is internally inconsistent: `edgeCount` says
two, the adjacency holds one. The comment at `src/algorithms/utils/snapshotGraph.ts:53-60` says this
permission is there so a multigraph "fails as a count, not as an exception". It does neither; it
fails as a wrong answer.

Fixing `@graphty/algorithms` is a change to a second published package and is not in scope here. So
**the element simplifies before it converts, and says so.**

In `toAlgorithmGraph` (`src/algorithms/utils/snapshotGraph.ts:36-43`): when
`snapshot.flags.multigraph` is set, the graph handed to the algorithm is
`snapshot.simplified({ weights: "sum" })` (`graph-format/src/types/snapshot.ts:688`). The
`allowParallelEdges: true` permission is removed, because it now permits something that cannot
happen and its comment is wrong.

`"sum"` and not `"first"`: a repeated edge between two nodes is more connection, not the same
connection, so summing is the reading that matches what a multigraph means, and `"first"` would
discard the repeats' weights without saying so.

The run's `Caveats` gain a note naming how many parallel edges merged, so the simplification appears
on the result card rather than only in this document.

A run's per-edge value is then published for **every** element edge in a merged group -- both
parallel members get the survivor's value -- and the caveat says that too. The alternative, painting
one of two coincident lines, is not something a reader could act on.

### 2.7 Drawing them

Two parallel edges render as two coincident lines, with coincident arrowheads and coincident pick
targets. `EdgeMesh.calculateControlPoints` (`src/meshes/EdgeMesh.ts:867-891`) offsets both bezier
control points along one fixed perpendicular and has no notion of rank.

Separating them visually is new geometry work and is **out of scope for this change**, recorded as a
known limitation. `Edge.parallelRank` and `Edge.parallelCount` (section 1.7) are the numbers that
work will need, and they exist as of this change.

---

## 3. Removing a node removes its edges

### 3.1 What is wrong now, and what is already right

`DataManager.removeNode` carries a twelve-line comment headed "TODO: Remove connected edges --
LEFT OPEN DELIBERATELY" (`src/managers/DataManager.ts:585-596`). The comment is accurate about what
it describes, but half the work it describes has since been done and the standing description no
longer matches the code.

Already correct: the **store** side cascades. `detachNodeFromStore` calls
`builder.removeNodeByIndex`, which tombstones the node and every live incident edge and returns
their indices (`graph-format/src/builder/graph-builder.ts:530-535`), and the element then clears
those rows out of `edgesByIndex` and drops matching pending entries. `snapshot.edgeCount` already
falls when a node is removed.

Still wrong: the **render, layout and selection** side. The `Edge` object survives with its meshes,
its entry in `edges` and `edgeCache`, and its place in the layout engine's own node and edge lists.
Three concrete symptoms:

- The edge keeps drawing, because the frame loop walks the **engine's** list, not the manager's
  (`src/managers/UpdateManager.ts:554-557` over `layoutEngine.edges`). Removing an edge from the
  manager's maps would change nothing here.
- The edge becomes permanently visible and unfilterable. `detachNodeFromStore` sets its index to
  `INVALID_INDEX`, and the per-frame mask application reads `const placed = index !== INVALID_INDEX`
  and forces `!placed` edges visible (`UpdateManager.ts:250-258`). An edge to a node that no longer
  exists cannot be filtered away.
- The removed `Node` stays reachable. `Edge.srcNode` and `Edge.dstNode` are hard references
  (`src/Edge.ts:51-52`), so `node.dispose()` frees the Babylon resources and not the JavaScript
  retention. On a large graph this is the removal leak that matters.

And the layout engines never remove anything at all. `LayoutEngine.removeNode` and `removeEdge` are
empty bodies on the base class (`src/layout/LayoutEngine.ts:250-259`) and no concrete engine
overrides either, so `layoutEngine.removeNode(node)` at `DataManager.ts:578` is a call into a no-op
and a removed node stays in the engine for the rest of the session. `LayoutManager` then re-seeds
every newly built engine from `dataManager.edges` (`:199-202`), so an orphan is re-added to each
engine in turn.

### 3.2 What lands

**The cascade.** `removeNode` removes every incident edge before it removes the node, through the
same teardown `removeEdge` performs: delete from `edges`, delete that specific edge from
`edgeCache`, clear `edgesByIndex`, tell the layout engine, dispose. `detachNodeFromStore` already
computes the incident set (the indices the builder hands back), so the cascade is that loop doing
the full teardown instead of only invalidating an index. The method is renamed
`removeNodeAndIncidentEdges` to say what it does.

**Engine removal becomes real.** Implemented once per class hierarchy:

- `SimpleLayoutEngine.removeNode(n)` / `removeEdge(e)` -- splice from `_nodes` / `_edges`, delete the
  node's entry from `positions`, set `stale = true`. That covers fourteen of the sixteen engines.
- `D3GraphLayoutEngine` -- delete from `nodeMapping` / `edgeMapping` and re-push the simulation's
  node and link arrays, the same work `refresh()` does. Without the re-push, d3 keeps simulating a
  link whose `source` and `target` objects reference disposed nodes.
- `NGraphLayoutEngine` -- `ngraph.removeLink(link)` / `ngraph.removeNode(id)` and delete from the
  mappings.

**The vestigial guards go.** `hasRemoveNode` and `hasRemoveEdge` (`DataManager.ts:22-30`) test
`"removeNode" in engine`, which is always true because the base class declares both on the
prototype. They read as "this engine supports removal" and guarantee nothing. Deleted; the methods
are called directly.

**The forced-visible branch goes with it.** Once no edge outlives its endpoint, `!placed` at
`UpdateManager.ts:250-258` stops meaning "an orphan" and means only "not yet frozen", which is a
transient state during a load. The branch keeps its fallback for that case and loses the comment
about orphans.

**Removal becomes observable.** There is no removal event of any kind today -- `src/events.ts` has
`data-added`, `node-add-before` and `edge-add-before` and nothing for removal -- so a consumer
watching the element sees counts change under it with no notification, and the application's status
bar and graph summary stay stale until the next load
(`AppShell.tsx:1558-1576`, wired at `:1675-1679`). Cascading incident edges makes that gap bigger.

So `Graph.removeNodes` emits one `graphty-elements-removed` per call, with
`detail: { nodes: NodeId[], edges: EdgeId[] }`.

**The selection is kept honest for edges.** `SelectionManager.onNodeRemoved` exists and has no edge
counterpart (`src/managers/SelectionManager.ts:206-215`). It gains `onEdgesRemoved(ids)`, called
from the cascade. The session's masks self-heal at the next compacting freeze
(`GraphSession.ts:1000-1003`, `VisibilityApi.ts:491-492`), but a removal that triggers no freeze
leaves them stale until something else does.

### 3.3 Reversibility does not land now

The register asks the removal to be undoable, through a `MutationReceipt.inverse`. That does not
land in this change, and the reason is not effort.

- There is no journal and no receipt type anywhere in `src/`; `src/session/runs/types.ts:29-32`
  states outright that the journal has not landed. An inverse needs somewhere to live.
- **An inverse cannot promise index stability, and a useful one has to.** Before the next freeze,
  re-adding an edge revives its tombstoned endpoint at its original index, so the inverse is nearly
  free (`graph-builder.ts:575-580`). After a compacting freeze the tombstones are gone and every node
  index, every edge index and every `graphty.edgeId` counter value is new
  (`DataManager.walkNodeRemap`, `walkEdgeRemap`). An undo that ran after a freeze would restore the
  content under different ids, and every style layer, saved scope, selection and persisted document
  naming the old ids would be pointing at nothing. Deciding what an inverse promises across that
  boundary is the design work, and it is larger than everything else in this document.
- The consumer that needs it has not shipped. The application's Delete/Backspace binding is
  `shipped: false` and its note asks for "undoable, with a toast carrying Undo"
  (`graphty/src/components/shell/bindings.ts:622-631`). Designing a receipt against a feature that
  does not exist is how a receipt ends up the wrong shape.

What lands instead so that the cascade is not a trap: the `graphty-elements-removed` event above. It
is the prerequisite for any undo -- it hands a consumer the exact list of what went -- and it closes
the "removal is invisible" gap on its own.

### 3.4 The application already cascades, and stops

`graphty/src/hooks/useGraphtyData.ts:52-57` filters the application's own React state:
`edges: prev.edges.filter((e) => e.source !== nodeId && e.target !== nodeId)`. The application never
calls the element's `removeNodes` at all -- it re-serialises its whole data set into the `node-data`
and `edge-data` attributes instead. So the element's cascade breaks nothing there today, and that
hook is exactly the workaround this change deletes.

---

## 4. Weighted layouts

### 4.1 What `@graphty/layout` actually accepts

This has to be stated precisely, because the register's row describes the fix incorrectly and a
builder following it would widen a tuple that is ignored.

```ts
// layout/src/types/graph.ts:5-13
export type Node = string | number;
export type Edge = [Node, Node];
export type Graph = {
    nodes: () => Node[];
    edges: () => Edge[];
    getEdgeData?: (source: Node, target: Node, attr: string) => number | undefined;
};
```

The edge tuple is two elements **by definition**. A third element would be ignored. The weight
channel is `getEdgeData`, a third member on the graph object, and that is the only one there is.
`_processParams` passes the graph object through untouched
(`layout/src/utils/params.ts:15-29`), so attaching the callback to the object literal the element
builds is sufficient.

Only two of the layout functions the element's sixteen engines call read it:

- `kamadaKawaiLayout(G, dist, pos, weight, scale, center, dim)` -- its `weight` parameter defaults to
  the string `"weight"` (`layout/src/layouts/force-directed/kamada-kawai.ts:23`). The solver reads
  `edgeWeight = G.getEdgeData(source, target, weight) || 1` and assigns it as a graph **distance**
  fed to Floyd-Warshall (`layout/src/algorithms/optimization/kamada-kawai-solver.ts:36-44`). A larger
  weight pushes two nodes further apart.
- `forceatlas2Layout(...)` -- its `weight` parameter defaults to `null`, and the consuming branch is
  `if (weight && !Array.isArray(graph) && graph.getEdgeData)`
  (`layout/src/layouts/force-directed/forceatlas2.ts:37, :158`). The weight becomes the adjacency
  matrix entry `A[i][j]`, an attraction **strength**. A larger weight pulls two nodes closer.

Spring, arf, spectral, bfs, bipartite, multipartite, circular, shell, spiral, planar and random have
no weight parameter at all.

Two consequences the design has to answer for. The element currently passes `undefined` for Kamada-
Kawai's weight name, so the layout's own default `"weight"` applies and Kamada-Kawai is **already
asking** for weights -- only the missing `getEdgeData` makes every edge come back as 1. And the same
element column drives the two engines in opposite directions.

### 4.2 How a weight is resolved

The element already resolves an authoritative weight per edge at ingest -- `resolveEdgeWeight` reads
`knownFields.edgeWeightPath` (default `"weight"`, with a documented fallback probe of the literal
`value` key) and `ingestEdge` hands the number to `builder.addEdge`
(`src/data/ingest.ts:106-131, :145-153`). The layout work does not invent a weight. It needs a path
back to that number.

It does not need a new accessor. `DataManager.getSnapshot()` is already public, and
`snapshot.edgeList()` yields `{src, dst, weights}` with `weights` indexed by logical edge index --
which is exactly `Edge.index`, and which `walkEdgeRemap` keeps correct across a compacting freeze.
`weights === null` means "every weight is 1", which is how graph-format stores an unweighted graph.

So a new protected helper on `LayoutEngine` reads it, reaching through `Edge.parentGraph` the same
way `positionsFor` already reaches through `Node.parentGraph`
(`src/layout/LayoutEngine.ts:402-423`):

```ts
protected pairWeights(edges: readonly Edge[]): Map<string, number> | null
```

It reads the snapshot **once per layout computation**, not per frame and not per edge, and returns
`null` when the graph is unweighted. What it returns is keyed by ordered endpoint pair, because that
is the question `getEdgeData` asks.

### 4.3 Parallel edges are summed into one pair weight

`getEdgeData(source, target, attr)` is asked by endpoint pair, and both layout functions write
`A[i][j] = w` and `distances[s][t] = w` last-wins. Under parallel edges, edge order would decide the
layout.

So `pairWeights` sums the weights of every edge sharing an ordered pair into one number, matching the
`simplified({weights: "sum"})` decision in section 2.6, so a graph's weights mean the same thing to a
layout and to an algorithm.

`attr` is ignored. The element already resolved which record key carries the weight, one layer up at
ingest, for every engine at once. A layout asking for a different attribute name would be a second
weight channel.

### 4.4 One convention: a larger weight is a stronger connection

Stated once, for the whole element, and inverted where a layout function disagrees.

Every other place in this package treats a weight as strength or magnitude: `statistics().weighted`,
the weighted centralities, `sum` as the merge reducer, and a style layer that thickens an edge by its
weight. Handing the raw column to Kamada-Kawai would make one layout in the catalogue mean the
opposite of everything else in the element, with nothing on screen to say so.

The two callbacks, exactly:

```
ForceAtlas2:    getEdgeData(s, t) -> w            // strength, as stored
Kamada-Kawai:   getEdgeData(s, t) -> 1 / max(w, EPSILON)   // distance, inverted
```

with `EPSILON = 1e-6`.

**An edge with no weight.** `resolveEdgeWeight` answers 1 for a record carrying none, so "no weight"
never reaches a layout. Every edge has a number.

**An edge with weight 0.** This is reachable -- a record can carry `weight: 0` -- and both layout
functions turn it into 1 through `getEdgeData(...) || 1`, which makes "no pull" mean "full pull", the
exact opposite of what the author wrote. The element clamps to `EPSILON` before the callback returns,
so 0 means "as close to nothing as the solver allows" in ForceAtlas2 and "as far apart as the solver
allows" in Kamada-Kawai -- the same reading of the same number. A clamp is logged once per layout run
with the count, not once per edge. Fixing `|| 1` inside `@graphty/layout` would be a change to a
second published package and is not done here.

### 4.5 Weights are on by default, but only on a graph that has them

The element attaches `getEdgeData` only when the graph's weights carry information. The predicate
already exists: `isWeighted(snapshot)` walks the weight column and answers true when any weight
differs from 1 (`src/session/statistics.ts:186-207`), and it is what
`statistics().weighted` publishes.

On an unweighted graph the callback is not attached, `pairWeights` returns `null`, and nothing moves
at all. So the visual change is confined to datasets carrying real weights, which makes the
re-baseline reviewable: a story that moved must be a story with weights.

For ForceAtlas2 the element must also pass a weight name, because that function's `weight` parameter
defaults to `null` and gates the whole branch on it being truthy. It passes `"weight"` whenever the
callback is attached.

**The two option names collapse into one.** `KamadaKawaiLayoutEngine`'s `weightProperty` and
`ForceAtlas2LayoutEngine`'s `weightPath` are removed. They named an attribute, which is
`knownFields.edgeWeightPath`'s job one layer up. In their place, both engines declare a single
boolean option `weighted`, default `true`, in both the zod config and the `defineOptions` schema --
so it reaches the catalogue through `engineOptions(zodOptionsSchema)`
(`src/catalog/layouts.ts:170`) and therefore the application's layout picker, for both engines, which
`weightPath` never did.

`weighted: false` is the opt-out for a reader who has weights and does not want them arranged by.

Today `weightProperty` is a published, reader-settable control that does nothing, and `weightPath` is
a control a reader cannot reach at all. Both defects go.

### 4.6 d3, ngraph and spring do not get weights in 2.0

d3-force-3d has a per-link `.strength()` the element hardcodes to `0.9`
(`src/layout/D3GraphLayoutEngine.ts:154-155`), and ngraph has `physicsSettings.springTransform`,
which the element sets not at all. Both could be driven.

Spring and Fruchterman-Reingold in `@graphty/layout` have no weight parameter at all, so "every force
layout honours weights" cannot be delivered without changing a second published package. Promising
two of four engines behind the one public `force` arrangement is worse than promising two engines by
name.

So: weights reach Kamada-Kawai and ForceAtlas2, and the `weighted` option appears in the catalogue
for those two and for no other layout. A picker that offers "use edge weights" on two arrangements
and not on the other fourteen already tells a reader which ones read weights. A
`LayoutDescriptor.honoursWeights` field would say it more directly, and is deferred because
`src/catalog/types.ts` is being changed by other work in this release; `LayoutEngine` gains a
`static honoursWeights` so the descriptor field has something to read when it lands.

One bug found while reading and fixed in passing: `NGraphLayoutEngine.ts:234` calls
`this.ngraph.addLink(e.srcId, e.dstId, { parentEdge: this })`, where `this` is the **engine**, not
the edge. Nothing reads it, which is why it survived; anything that starts carrying per-link data
lands in that slot. It becomes `{ parentEdge: e }`.

---

## 5. Pin state

### 5.1 What is wrong now

A pin lives inside whichever layout engine is current. `Node.pinnedIn` holds that engine, and
`isPinned()` answers by comparing it against the current one
(`src/Node.ts:1006-1008`). The field is never cleared; the comparison just stops matching when
`LayoutManager` builds a new engine, which it does on `setLayout`, on a 2D/3D view-mode switch
(`LayoutManager.ts:405`) and on a template layout apply (`:431`). All three lose every pin.

Two register rows about this are stale and would mislead a builder. `isPinned()` does not hard-return
`false` any more -- a real, engine-scoped pin is recorded and reported -- and the line numbers the
register cites for it and for `LayoutManager`'s engine construction are both wrong. What survives of
the defect is exactly the engine scoping.

Under the covers it is worse than "the pin is lost". `Node.unpin()` forwards to the **current**
engine, so a node pinned under one engine and unpinned after a layout change tells a different engine
to unpin a node it never pinned -- which under `NGraphLayoutEngine._getMappedNode` throws
"Internal error: Node not found" for a node that engine has not been told about.

And a pin means nothing at all for fourteen of the sixteen engines. `SimpleLayoutEngine.pin` and
`unpin` are empty (`src/layout/LayoutEngine.ts:742-754`), and `SimpleLayoutEngine.setNodePosition` is
a documented no-op (`:692-694`), so under any static layout a drag is never recorded and the next
`refresh()` recomputes the node back to where the layout wants it.

### 5.2 Where the field lives

**A `pinned` lane in `ElementPositions`** (`src/data/positions.ts`): one byte per node row, parallel
to the coordinates, grown by `grow()` and moved by `remap()` with them.

`Node.pinnedIn` is deleted. `Node.pin()`, `unpin()` and `isPinned()` read and write the lane through
the node's index. A node with `index === INVALID_INDEX` has no row and cannot be pinned; `pin()` on
one is a logged no-op.

Why this array and not a field on `Node` or a column on the store:

- It is where coordinates already live, and a pin is a statement about a coordinate. Keeping them in
  one object means one growth path, one remap path, one disposal, and no way for a pin to drift away
  from the position it pins.
- `ElementPositions.remap` already survives a compacting freeze and a renumbering
  (`src/data/positions.ts:235`), which is what "a pin survives a reload and a renumbering" needs.
- It is reachable from every layout engine through the seam they already use
  (`LayoutEngine.positionsFor`).

**Persistence** follows the coordinates exactly. `GraphStore.applyPositions` already attaches the
position array to every freshly frozen snapshot as a role-`position` node column
(`src/data/GraphStore.ts:369-374`). It attaches the pinned lane the same way, as a `graphty.pinned`
node column of dtype `u8`. One owner (the lane), one mirror (the column), a stated direction. So a pin
is in the snapshot, and anything that serialises a snapshot carries it. The register also asks for a
pin to be "carried in data export"; there is no export surface anywhere in the element
(`Graph.ts`, `graphty-element.ts` and `DataManager.ts` have no `exportGraph`, `exportData`, `toWire`
or `saveGraph`), so that half is deferred with the column already in place for it.

### 5.3 How each engine is kept in step

Two mechanisms, and the first is what makes a pin real for all sixteen engines.

**The position array refuses a pinned row.** Every engine publishes coordinates through one protected
method, `LayoutEngine.writeNodePosition` -- the default `publishPositions` (`:328-333`),
`SimpleLayoutEngine.publishRecord` (`:802-812`), `D3GraphLayoutEngine.publishPositions` and
`getNodePosition` (`:246-249, :306-313`), and `NGraphLayoutEngine.publishPositions` and
`getNodePosition` (`:202-205, :246-255`). It gains a fifth parameter:

```ts
protected writeNodePosition(
    n: Node, x: number, y: number, z: number,
    intent: "layout" | "placement" = "layout",
): boolean
```

With `intent === "layout"` it returns `false` without writing when the node's row is pinned. So a
pinned node stops moving under every one of the sixteen engines, including the fourteen whose `pin()`
is a no-op and whose `setNodePosition` is a no-op. That is the whole of the "pinning becomes
meaningful for a static layout" answer, in one guard, and the default keeps a third-party engine's
step loop correct without it knowing the parameter exists.

A **drag** is a deliberate placement, not a layout step: `NodeBehavior.onDragUpdate` and
`setPositionDirect` call `layoutEngine.setNodePosition`, whose implementations pass `"placement"` and
write straight through. A reader can drag a pinned node to a new place, and it stays there.

**The engines that hold their own pin are still told**, so the simulation stops spending force on the
node: ngraph's `pinNode` (`NGraphLayoutEngine.ts:322-334`), d3's `fx`/`fy`/`fz`
(`D3GraphLayoutEngine.ts:367-388`). Those copies are a projection of the element's bit, never a
second source of truth. `Node.pin()` keeps its existing order -- record first, then forward -- so an
engine that calls back into `isPinned()` during `pin()` sees the pin. A test pins that ordering.

### 5.4 What `setLayout` does

`LayoutManager._setLayoutInternal` is the single funnel for all three rebuild paths -- `setLayout`,
the 2D/3D switch and a template layout apply -- so one replay covers all three.

The replay runs **after `engine.addNodes(nodeArray)` and after `await engine.init()`, before the
pre-steps**, and it is two steps per pinned node:

1. `engine.setNodePosition(n, stored)` -- push the element's coordinate into the engine.
2. `engine.pin(n)`.

Both halves of the ordering are load-bearing. After `addNodes`, because
`NGraphLayoutEngine._getMappedNode` throws for a node the engine has not been told about. After
`init()` and place-before-pin, because `D3GraphLayoutEngine.pin` reads the node's **current**
simulated position into `fx`/`fy`/`fz` -- replaying a bare pin into a fresh engine would fix the node
at d3's arbitrary initial coordinates rather than where the reader put it.

`Node.unpin()` stops being able to throw: the element's bit is cleared first, and the forward to the
current engine is guarded, and under the replay the current engine has been told about every pin it
could be asked to release.

### 5.5 The behaviour change nobody opts into, and the door that makes it survivable

`pinOnDrag` defaults to `true` (`src/config/GraphBehavior.ts:8`). So the moment pins survive a layout
change, every node a reader has ever dragged stops moving on the next layout -- a reader who dragged
ten nodes and then changed arrangement used to get a clean re-layout and now gets ten fixed points.

The default **stays `true`**. A drag is a deliberate placement, and a layout change that silently
discards it is the behaviour the register calls a defect. But it is only defensible if a pin can be
released, and today the only door is `Node.pin()` / `unpin()`, reachable through `element.graph` --
the escape hatch this release is closing. The application has already designed the UI against a
capability that does not exist: `NodeInspector` has a `pinNode` action, a `pinnedToCanvas` prop and a
"Pinned" badge, and the action handler is `onAction: () => undefined`
(`graphty/src/components/shell/AppShell.tsx:4140`).

So this change adds the door to the element:

```ts
element.pin(ids: NodeId | readonly NodeId[]): void
element.unpin(ids: NodeId | readonly NodeId[]): void
get element.pinnedNodes(): ReadonlySet<NodeId>
```

It goes on the element rather than on the session because the session has no layout transport yet --
`src/session/types.ts:436` states that it is deliberately not there -- and adding a fifth place to
name layout state would contradict the register's "one setter" row. It moves to the session with the
rest of the layout transport.

The application's change is the one stub handler.

### 5.6 What the drag events carry

`NodeDragStartEvent` and `NodeDragEndEvent` (`src/events.ts:249-263`) each gain
`pinned: boolean`.

Drag-end needs no reordering: `NodeBehavior` pins at `:191` and emits at `:206`, so the field is
already correct where it is emitted. Drag-start reports the pin as it was when the drag began.

`NodeBehavior.ts:416-418` carries a deliberate invariant with a test behind it -- a click must not
pin. Nothing here widens how a pin is acquired, and that stays true.

---

## 6. The import report, and the two counts that disagreed

Three of the five changes owe a number to a consumer: which endpoint spelling was used, how many
repeats were seen and what happened to them, and how many edges the graph actually holds. There is
nowhere to put any of them. `emitGraphDataLoaded`'s payload is
`{chunksLoaded, dataSourceType}` (`src/managers/EventManager.ts:139-149`), and no `Inspection`,
`ImportPlan` or `ImportReport` type exists anywhere in `src/`.

So this change invents the minimum one, in `src/data/report.ts`:

```ts
export interface ImportReport {
    readonly format: string;
    readonly endpoints: {
        readonly resolvedFrom: EndpointSpelling;
        readonly source: string;
        readonly target: string;
    };
    readonly counts: {
        readonly nodes: number;         // nodes the graph holds after the load
        readonly edges: number;         // edges the graph holds after the load
        readonly edgeRecords: number;   // edge records handed over
        readonly rejected: number;      // records whose endpoint ids the store would not take
    };
    readonly repeated: {
        readonly seen: number;
        readonly kept: number;
        readonly dropped: number;
        readonly merged: number;
    };
    readonly policy: DuplicatePolicy;
    readonly weights: {
        readonly resolvedFrom: "path" | "legacy" | "none";
        readonly attribute: string | null;
    };
}
```

Delivered three ways:

- `data-loading-complete` gains `report`. Its existing `edgesLoaded` is **redefined** to be
  `report.counts.edges` -- the edges the graph holds -- and the old meaning moves to
  `report.counts.edgeRecords`. That is the fix for the element publishing two numbers about one load
  that differed by the entire file: today `edgesLoaded` says 254 for a `miserables.json` whose graph
  holds zero, while `getEdgeCount()` correctly says zero.
- `graphty-data-loaded` carries `report` in its detail, which is what the register's section 4.3
  requires when it says the resolved pair is reported on the load event.
- `session.data.lastImport(): ImportReport | null` -- a door a consumer can read at any time, because
  the two events are fire-and-forget and a late subscriber has no way to ask.

**`repeated` and `GraphStatistics.repeatedEdgeCount` are deliberately not the same number and are
deliberately named apart.** `statistics().repeatedEdgeCount` answers "how many repeats does this
graph contain" and is a property of the current snapshot. `report.repeated` answers "how many repeats
did this load contain, and what did the policy do with them". Two numbers that almost mean the same
thing is how they end up disagreeing; giving them different names and different nouns is how that is
avoided.

`Inspection` and `ImportPlan` do **not** land here. A consumer who must name the endpoint columns
uses `edgeSrcIdPath` / `edgeDstIdPath`, which survive (section 1.4). When `ImportPlan` lands it
absorbs both, plus `repeatedEdges` and `edgeWeightPath`, without another break.

---

## 7. The three build lanes and their file ownership

Three lanes run at once in one working tree. **No file appears in two lanes.** Where two lanes
genuinely need one file, the owner is named and the other lane's change is described as an exact
patch the owner applies, or as a report.

- **Lane A -- edge model.** Endpoint resolution, edge identity, parallel edges, incident-edge
  removal, the import report.
- **Lane B -- layout.** Edge weights reaching Kamada-Kawai and ForceAtlas2, pin state.
- **Lane C -- packaging.** The `./logging` subpath, the duplicated colour-vision exports,
  `connectedCallback` reading the query string, the inert `sideEffects` paths.

A fourth piece of work is finishing separately and owns `graphty-element/extend.ts`,
`graphty-element/catalog.ts`, `graphty-element/src/session/catalog.ts`,
`graphty-element/src/errors/codes.ts`, `graphty-element/src/catalog/types.ts` and
`graphty-element/test/packaging/`. **No lane here edits any of those six.** Where one is needed, the
lane reports.

### 7.1 Lane A -- edge model

New files:

- `graphty-element/src/data/endpoints.ts`
- `graphty-element/src/data/edgeIdentity.ts`
- `graphty-element/src/data/report.ts`

Changed:

- `graphty-element/src/managers/DataManager.ts` -- **the contested file, lane A owns it outright.**
  `addEdges`, `processPendingEdges`, `registerEdge`, `removeNode`, `detachNodeFromStore`,
  `removeEdge`, `getEdge`, `getEdgesBetween`, `addDataFromSource`, the deleted
  `pendingEdgeKey`/`pendingEdgeKeys`, the deleted `hasRemoveNode`/`hasRemoveEdge`.
- `graphty-element/src/Edge.ts` -- id, the `index` doc comment, `EdgeMap` as a multimap,
  `parallelRank`/`parallelCount`, the label fallback.
- `graphty-element/src/data/ingest.ts` -- `ingestEdge` returns `{index, edgeId}`. **`resolveEdgeWeight`
  in this file is not touched by any lane.**
- `graphty-element/src/config/DataConfig.ts` -- `edgeSrcIdPath`/`edgeDstIdPath` defaults to `null`,
  new `edgeIdPath` and `repeatedEdges`. **`edgeWeightPath` is not touched by any lane.**
- The seven importers: `src/data/JsonDataSource.ts`, `GMLDataSource.ts`, `GEXFDataSource.ts`,
  `GraphMLDataSource.ts`, `CSVDataSource.ts`, `DOTDataSource.ts`, `PajekDataSource.ts`.
- `graphty-element/src/catalog/formats.ts`
- `graphty-element/src/Graph.ts` -- the `edgeAttributes` seam, `removeNodes` emitting the removal
  event.
- `graphty-element/src/graphty-element.ts` -- `addEdge`/`addEdges` options bag, the
  `edgeSrcIdPath`/`edgeDstIdPath` accessors, the `edge-data` setter, `loadFromUrl`/`loadFromFile`
  options, the JSDoc that contradicts itself 150 lines apart, **and lane B's and lane C's hunks; see
  7.4.**
- `graphty-element/src/events.ts` -- the report on `DataLoadingCompleteEvent`, the removal event,
  `EdgeClickEvent` deleted, **and lane B's two `pinned` fields; see 7.4.**
- `graphty-element/src/managers/EventManager.ts`, `src/managers/UpdateManager.ts`,
  `src/managers/SelectionManager.ts`
- `graphty-element/src/session/data.ts`, `session/types.ts`, `session/GraphSession.ts`,
  `session/statistics.ts`, `session/scope/ScopeApi.ts`, `session/results/RunResult.ts`,
  `session/styles/sources.ts`, `session/visibility/VisibilityApi.ts`, `session/visibility/filter.ts`,
  `session/selection/SelectionApi.ts`
- `graphty-element/session.ts`
- `graphty-element/src/algorithms/results/types.ts`, `DijkstraAlgorithm.ts`,
  `BellmanFordAlgorithm.ts`, `PrimAlgorithm.ts`, `KruskalAlgorithm.ts`, `MinCutAlgorithm.ts`,
  `MaxFlowAlgorithm.ts`, `BipartiteMatchingAlgorithm.ts`, `utils/graphUtils.ts`,
  `utils/snapshotGraph.ts`
- `graphty-element/src/ai/commands/SchemaCommands.ts`, `src/ai/schema/SchemaExtractor.ts`
- `graphty-element/README.md`, `docs/guide/getting-started.md`, `docs/guide/data-sources.md`,
  `docs/guide/installation.md`, `docs/api/web-component.md`, `docs/guide/events.md`
- `graphty-element/stories/Data.stories.ts`
- Application: `graphty/src/components/Graphty.tsx`,
  `graphty/src/components/shell/analysis/graphShape.ts`,
  `graphty/src/components/shell/AppShell.tsx`, `graphty/src/data/sampleGraphs.ts`,
  `graphty/src/components/data-view/DataAccordion.stories.tsx`,
  `graphty/src/hooks/useGraphtyData.ts`
- Tests: `test/integration/Edge.integration.test.ts`, `test/styles.test.ts`,
  `test/graphty-element/api-parity.test.ts`, `test/session/data.test.ts`,
  `test/session/selection/SelectionApi.test.ts`, `test/session/scope/ScopeApi.test.ts`,
  `test/session/styles/sources.test.ts`, `test/browser/style-layers.test.ts`,
  `test/browser/extensions/algorithm-extension.test.ts`, `test/managers/DataManager.test.ts`,
  `test/data/data-manager-store.test.ts`, `test/helpers/corpus/corpus.test.ts` and the corpus
  manifests, plus the new tests in section 8.

Lane A **must not** edit: anything in lane B's or lane C's list, or the six files the
extension-points work owns.

Lane A **reports**, rather than editing:

- To the extension-points work: `src/catalog/types.ts` needs no change -- `EdgeId = string` already
  stands and is now the only edge id type. `src/errors/codes.ts` needs no change --
  `E_EDGE_ENDPOINTS_UNRESOLVED` is already declared and is now thrown. `extend.ts` needs no change --
  `edgeResultId` was never exported from it and is being deleted.
- To lane B: one line in `src/NodeBehavior.ts:582-585`, the expand path, which must become
  `dataManager.addEdges([...edges], { repeated: "first" })` once lane A's signature exists. This is
  the only ordering dependency between lanes A and B, and lane B applies it last.

### 7.2 Lane B -- layout

- `graphty-element/src/layout/LayoutEngine.ts` -- `pairWeights`, the `writeNodePosition` pin guard,
  `static honoursWeights`, and **`SimpleLayoutEngine.removeNode` / `removeEdge`, which lane A depends
  on and must not write.**
- `graphty-element/src/layout/KamadaKawaiLayoutEngine.ts`,
  `src/layout/ForceAtlas2LayoutEngine.ts` -- `getEdgeData`, the `weighted` option replacing
  `weightProperty` / `weightPath`.
- `graphty-element/src/layout/D3GraphLayoutEngine.ts`, `src/layout/NGraphLayoutEngine.ts` --
  removal hooks, pin projection, the `parentEdge` fix.
- The twelve remaining engine files in `src/layout/`, for the `[e.srcId, e.dstId]` line only if a
  signature change reaches them.
- `graphty-element/src/managers/LayoutManager.ts` -- the pin replay in `_setLayoutInternal`.
- `graphty-element/src/managers/GraphContext.ts`
- `graphty-element/src/data/positions.ts` -- the pinned lane.
- `graphty-element/src/data/GraphStore.ts` -- attaching the `graphty.pinned` column in
  `applyPositions`. **No other change to this file by any lane: `duplicateEdges` stays unset, and
  `nextEdgeId` is unchanged.**
- `graphty-element/src/Node.ts` -- `pin`, `unpin`, `isPinned`, the deleted `pinnedIn`.
- `graphty-element/src/NodeBehavior.ts` -- the pin on drag end, the `pinned` field on both drag
  emits, `setPositionDirect`, **and lane A's one-line expand-path argument, applied last.**
- `graphty-element/src/config/GraphBehavior.ts`
- `graphty-element/src/catalog/layouts.ts`
- `graphty-element/stories/Layout.stories.ts`
- Tests: `test/unit/node-index-pinned.test.ts` (the pin half; see 7.4),
  `test/catalog/optionsFromZod.test.ts`, `test/interactions/edge-cases/pin-on-drag.test.ts`,
  `test/browser/NodeBehavior-unified-drag.test.ts`,
  `test/browser/extensions/layout-extension.test.ts`,
  `test/integration/story-determinism.test.ts`, plus the new tests in section 8.

Lane B **must not** edit: `src/events.ts`, `src/graphty-element.ts`, `src/session/types.ts`,
`src/Graph.ts`, `src/managers/DataManager.ts`, `src/data/ingest.ts`, `src/config/DataConfig.ts`,
`src/Edge.ts`, `src/catalog/types.ts`, or anything else in lane A's or lane C's list.

Lane B **reports**, rather than editing:

- To lane A, before lane A's first commit: the exact shape of `element.pin`, `element.unpin` and
  `element.pinnedNodes`, and the two `pinned: boolean` fields on the drag events.
- To lane A: the one-line handler change in `graphty/src/components/shell/AppShell.tsx:4140`, so the
  inspector's Pin verb reaches `element.pin` / `element.unpin`.
- To the extension-points work: `LayoutDescriptor` should gain `honoursWeights: boolean` in
  `src/catalog/types.ts`, read from `LayoutEngine.honoursWeights`.

Lane B reads, and does not change, `src/session/statistics.ts`'s exported `isWeighted`, and
`DataManager.getSnapshot()`.

### 7.3 Lane C -- packaging

- `graphty-element/logging.ts` -- new.
- `graphty-element/index.ts` -- delete the 23-name logging block at `:223-256`, delete the
  seven-name colour-vision block at `:299-317`, update the header list at `:13-28`.
- `graphty-element/package.json` -- add `"./logging"` to `exports`; delete the three `./src/` paths
  from `sideEffects`.
- `graphty-element/vite.config.ts` -- `logging: "./logging.ts"` in `entries`, and the doc comment
  above it that counts the renderer-free entries.
- `graphty-element/tsconfig.build.json`, `graphty-element/typedoc.json`,
  `knip.config.ts` (repository root) -- the three entry-point lists no test covers.
- `graphty-element/src/logging/index.ts` -- export `lazy`, and delete the URL-parameter example
  block at `:26-42`.
- `graphty-element/src/logging/LazyEval.ts`, `src/logging/GraphtyLogger.ts`,
  `src/logging/sinks/RemoteSink.ts` -- the JSDoc import lines and URL examples.
- `graphty-element/stories/Logging.stories.ts`
- `graphty-element/CLAUDE.md`, `graphty-element/AGENTS.md` -- the entry-point tables and their counts.
- `graphty/vite.config.ts`, `graphty/tsconfig.json` -- the two comments that enumerate the entry
  files by name and go stale. The alias regexes resolve `./logging` with no code change.
- Tests: `test/logging/sink-extension.test.ts` and
  `test/browser/extensions/logging-extension.test.ts` (import lines),
  `test/documentation/jsdoc-coverage.test.ts` (point it at `schema.ts`).

**The `./logging` versus `./extend` overlap is resolved, not deferred.** `extend.ts:196-219` already
publishes fourteen names that `src/logging/index.ts` also has, and publishing one symbol from two
addresses is the duplication the colour-vision item exists to delete. The split:

- `./logging` publishes the whole of `src/logging/index.ts` -- 26 names, not the root barrel's 23,
  plus `lazy`. The three extra are `formatLogRecord`, `LogFormatOptions` and `LogSinkReference`, and
  `LogSinkReference` is the `{use, options}` type a stored configuration names a destination with,
  which is precisely what the placement decision says `./logging` exists for. `lazy` is added to
  `src/logging/index.ts` so that the example already written in `LazyEval.ts:9` --
  `import { lazy } from "graphty-element/logging"` -- becomes true.
- `./extend` keeps **only** the registry surface: `registerLogSink`,
  `registeredLogSinkDescriptors`, `clearRegisteredLogSinksForTesting`, `LogSinkRegistration`,
  `LogSinkDescriptor`, `LogSinkId`, `KNOWN_LOG_SINK_IDS`. The twelve names it duplicates from
  `src/logging/` are dropped. A sink author imports the types from `./logging` and the registration
  verb from `./extend`, which is the same shape as every other extension point.

`connectedCallback` stops reading `window.location.search`. `parseURLParams`
(`src/graphty-element.ts:258-275`), its call at `:232` and the now-dead import at `:15` are deleted.
That leaves `enableDetailedProfiling` with no URL route: the design's replacement,
`<graphty-element url-params="profiling logging">`, does not exist anywhere in `src/`. **Lane C ships
the deletion and does not build the attribute.** The property stays settable from script, and the
attribute is a separate, additive piece of work; building an opt-in mechanism as a side effect of
removing an opt-out is how a half-designed attribute becomes public API.

`sideEffects` becomes exactly the four `dist` entries it already has minus the three `./src/` paths:
`./dist/graphty.js`, `./dist/graphty.bundle.js`, `./dist/webgpu.js`, `./dist/chunks/*.js`. The
register's row for this proposes `./dist/io/*.js` and `./dist/compat.js`, neither of which the build
produces, and omits `./dist/chunks/*.js`, which it does produce and which is the only entry that
actually protects a consumer's tree-shaker. The register's row is superseded.

Lane C **must not** edit: `graphty-element/extend.ts`, `test/packaging/exports-map.test.ts`,
`test/packaging/node-safe-entries.test.ts`, `src/catalog/types.ts`, `catalog.ts`,
`src/session/catalog.ts`, `src/errors/codes.ts`, or anything in lane A's or lane B's list.

Lane C **reports**, rather than editing, to the extension-points work -- and these three are required
for the subpath to be done, so they are handed over as exact patches:

- `extend.ts:196-219`: drop the twelve duplicated logging names, keep the seven registry names.
- `test/packaging/exports-map.test.ts:34`: add `"logging"` to `MODULE_ENTRIES`. The test at `:171-178`
  asserts the vite `entries` key set equals it exactly, in both directions, so this and
  `vite.config.ts` cannot land in separate commits. `:50-58`, `:183` and `:186-191`: delete
  `REGISTRATION_MODULES` and replace the test that defends the three `./src/` `sideEffects` entries
  with one that proves the registrations survive the build -- grep `dist/graphty.js` for the
  `register(` calls that `src/data/index.ts`, `src/layout/index.ts` and `src/algorithms/index.ts`
  make.
- `test/packaging/node-safe-entries.test.ts:14` and `:140-150`: add `"logging.ts"` to
  `NODE_SAFE_ENTRIES` and `import("../../logging")` to the plain-Node import list. This passes:
  `src/logging/index.ts`'s transpiled import graph reaches exactly one bare specifier,
  `@graphty/remote-logger`, and no forbidden one.

If the extension-points work has already finished when lane C starts, lane C takes those three files
and applies the patches itself.

### 7.4 The files two lanes need, and who owns them

| File | Owner | What the other lane does |
|---|---|---|
| `src/events.ts` | **Lane A** | Lane B's two `pinned: boolean` fields on `NodeDragStartEvent` and `NodeDragEndEvent` are added by lane A in its first commit. They need no knowledge of lane B's implementation |
| `src/graphty-element.ts` | **Lane A** | Lane A adds `pin`, `unpin` and `pinnedNodes` in its first commit, forwarding to `Node.pin()` / `unpin()` / `isPinned()` -- which exist and compile **today** -- so there is no ordering hazard. Lane C hands lane A an exact patch for the `parseURLParams` deletion: remove `:258-275`, remove the call at `:232`, remove the import at `:15`. Lane C still owns the decision |
| `src/Graph.ts` | **Lane A** | Lane B needs nothing there; `element.pin` reaches nodes through `graph.getDataManager()` |
| `src/NodeBehavior.ts` | **Lane B** | Lane A's one-line expand-path change, applied by lane B after lane A's `addEdges` signature exists |
| `src/layout/LayoutEngine.ts` | **Lane B** | Lane A depends on `SimpleLayoutEngine.removeNode` / `removeEdge` and must not write them. Lane A's cascade is correct without them -- the render objects go -- but the engine keeps stepping ghosts until lane B lands. Both are in this release |
| `src/managers/LayoutManager.ts` | **Lane B** | Lane A's incident-edge removal changes nothing in the re-seed loop at `:199-202`; it changes what that loop finds |
| `src/data/GraphStore.ts` | **Lane B** | Lane A needs no change there; `nextEdgeId` and `edgeIdColumn` already exist |
| `src/data/ingest.ts` | **Lane A** | `resolveEdgeWeight` lives here and no lane changes it. Lane B reads the resolved weight out of the snapshot, not out of this function |
| `src/session/types.ts` | **Lane A** | Lane B has no session surface; the layout transport is deferred |
| `index.ts` | **Lane C** | **Neither lane A nor lane B edits it.** Any new public type is published from `./session`, which lane A owns |
| `test/unit/node-index-pinned.test.ts` | **Lane B** | It covers the pin lifecycle at `:198-284` **and** the `src:dst` edge id from `:284` on. Lane B keeps the file and rewrites the pin half; lane A's edge-id assertions **move out** into `test/unit/edge-identity.test.ts`, a new file lane A owns. That is a genuine split of one file's subject matter, and doing it as a move rather than an edit is what keeps the two lanes apart |
| `graphty/src/components/shell/AppShell.tsx` | **Lane A** | Lane B reports the one-line pin handler at `:4140` |

---

## 8. The tests

A test here is not "coverage". Each one is the assertion that would have caught the specific bug the
change exists to fix.

### 8.1 Endpoint resolution -- the three the register names

The register's section 4.5 is explicit, and it is explicit because the bug class was "passes on one
file, fails on another".

**Every one of these three must load through a real element, not through a `DataSource`.** That is
why the bug survived: `test/helpers/corpus/corpus.test.ts:94-103` sums
`chunk.nodes.length` and `chunk.edges.length` straight off the data source and asserts against a
manifest, so `d3-format.json`, `karate-d3.json`, `miserables.json`, `networkx-format.json` and
`sigma-format.json` all pass today while producing zero edges in a real element. The corpus test
stops at the parser boundary. These three do not.

1. **One fixture per registered format, asserting a non-zero edge count and the resolved spelling.**
   Seven formats: json, csv, graphml, gexf, gml, dot, pajek (`src/data/index.ts:11-17`). Each loads
   into an element and asserts `session.status.counts.edges` matches the manifest and
   `session.data.lastImport().endpoints.resolvedFrom` is the expected spelling. The JSON corpus
   already has a fixture for every accepted spelling: `source`/`target` (d3, karate-d3, miserables,
   networkx, sigma), `from`/`to` (visjs) and `source`/`target` under a data wrapper (cytoscape).

2. **A negative fixture whose endpoint columns are named `a` and `b`,** asserting
   `E_EDGE_ENDPOINTS_UNRESOLVED` and that `details.columns` names the columns the file does contain.
   It goes in `test/helpers/corpus/csv/` with a manifest entry -- `corpus.test.ts:115-133` fails any
   file no manifest lists -- and the manifest entry marks it as a file the count test must skip.

3. **Karate Club node 34 has 17 neighbours, loaded from `.gml` and from `.json`.** This is the
   assertion that would have caught the shipped bug, and it must run twice over the same graph in two
   spellings. `SessionDataApi` has no neighbours verb and deliberately none
   (`src/session/types.ts:280-284` says neighbour pages are asynchronous by construction), and the
   only neighbour walk in the repository is the application's -- the code the bug was found in. So
   this test counts by hand, over `session.data.edge(id)` for every edge id in
   `session.scope.edges()`, and asserts 17. Counting by hand is the point: it is the consumer's
   experience, reproduced.

Two more, because the resolution has rules the register does not name:

4. A batch mixing `source`/`target` and `from`/`to` resolves to `source`/`target` for the whole batch
   and counts the `from`/`to` records as rejected -- not resolved per record.
5. A declared `edgeSrcIdPath` that no record answers produces zero edges and a rejected count, and
   **does not** fall back to probing.

### 8.2 Edge identity

- `test/integration/Edge.integration.test.ts:249` asserts `edge.id === "src:dst"`. It is **replaced**
  by an assertion that the id is the counter: two edges added in order have ids `"0"` and `"1"`, and
  `session.data.edge("0").source` is the first edge's source.
- An id containing a colon no longer collides: a graph with nodes `"a"`, `"b"`, `"c"`, `"a:b"` and
  edges `a:b -> c` and `a -> b:c` holds two distinct edges with two distinct ids. Today they collide
  into one.
- **One id space, asserted across surfaces.** An edge selected through `selection.apply({edges:[id]})`
  is the edge `session.data.edge(id)` returns, is the edge `styles.explain({edge: id})` explains, and
  is the edge a run's `run.edge(id)` carries a value for. This is the join that silently paints
  nothing if the two sides diverge, and it is the only test that catches that.
- `test/session/scope/ScopeApi.test.ts:46, :559, :572` pin the pair convention and its orientation
  rule explicitly. Replaced: `edgeSpaceOf(snapshot).indexOf(id)` resolves the counter, and an id that
  names no edge answers `INVALID_INDEX`.
- `test/session/data.test.ts:48-58` proves the counter and the canonical output work end to end
  already. It gains the assertion it is missing: the returned record carries **no** `src` and no
  `dst` key.
- `test/browser/extensions/algorithm-extension.test.ts:534-547` writes a private copy of the pair
  convention with a comment saying the element does not publish it. Replaced by reading `edge.id`.
- `test/styles.test.ts:68-69` and `test/graphty-element/api-parity.test.ts:104-125` pin the two
  endpoint path defaults and the two element properties. Replaced: the defaults are `null`, the
  properties still exist.

### 8.3 Parallel edges

- **Two records for one ordered pair produce two edges under `keep`**, with different ids, both in
  `session.scope.edges()`, both in `dataManager.edges`, and `snapshot.edgeCount === 2`.
- **`statistics().repeatedEdgeCount` stops being zero.** `test/session/statistics.test.ts:118`
  already asserts "three parallel edges are two repeats" against a hand-built snapshot; the new test
  asserts the same number after loading a file through the element, which is the path that has always
  reported zero.
- **Each policy does what it says**, one case each: `first` keeps the first edge's weight, `last`
  takes the second's, `sum` adds them, `error` throws `E_DUPLICATE_EDGE`, `keep` makes two.
- **`report.repeated` counts what happened**: `seen`, `kept`, `dropped` and `merged` add up, and
  `report.counts.edges` equals the graph's edge count -- not the record count.
- **`EdgeMap` no longer throws.** `test/managers/DataManager.test.ts:270-286` ("should use edge cache
  for existing edges") asserts a re-added pair returns the same `Edge` instance, which pins the drop.
  Replaced: under `keep` it returns two instances; under `first` it returns the same one.
- **Re-adding is still idempotent where it has to be.** The expand path, called twice with the same
  edges, leaves the edge count unchanged.
- **A run over a multigraph is honest.** An algorithm run on a graph with parallel edges produces a
  caveat naming the merge and the count, and its per-edge values land on **every** member of a merged
  group.

### 8.4 Incident-edge removal

- `test/managers/DataManager.test.ts:237-254` is `it("should not remove edges when node is removed
  (current behavior)")` and asserts the edges are still there afterwards. **Replaced by its exact
  inverse**, never deleted: after removing a node, its incident edges are gone from
  `dataManager.edges`, gone from `edgeCache`, and `edges.size` has fallen by the incident degree.
- `test/data/data-manager-store.test.ts:196-215` asserts `dm.edges.size === 2` with the message "the
  render objects are untouched; this step changes no rendering". Replaced: the render objects go too.
- **No edge outlives its endpoint.** After a removal, no `Edge` in the layout engine's own edge list
  references the removed `Node`, and no `Edge` anywhere has `index === INVALID_INDEX`.
- **The engines really remove.** `test/browser/extensions/layout-extension.test.ts:248-251,
  :386-405` already drives a test engine that records the ids passed to `removeNode` and `removeEdge`.
  `await graph.removeNodes(["c"])` must now record `removeEdge` calls for every edge incident to `c`.
  Extended to the three real hierarchies: after a removal, `SimpleLayoutEngine.nodes` and `.edges` no
  longer contain them, d3's simulation has no link referencing them, and ngraph's graph has neither
  node nor link.
- **`elements-removed` fires once per `removeNodes` call**, with the node ids and every removed
  edge id, and the edge ids it names are ones `session.data.edge` answered for before the removal
  and answers `undefined` for after. The name is UNPREFIXED, not `graphty-elements-removed` as
  this bullet originally said: it is a graph event, and the element's graph-event forwarder
  dispatches `event.type` verbatim for all fifty-one of them. The four `graphty-node-*` events are
  prefixed because they come from a different observable whose detail has to be reduced from a
  live `Node` before it can leave the element.
- **A removed edge cannot be forced visible.** With a filter active, a removed node's edges are absent
  rather than visible -- the regression `UpdateManager.ts:250-258` produces today.

### 8.5 Weighted layouts

This is the change that moves every node in every weighted graph, so its tests have to be about
numbers, not about smoke.

- **The callback is attached only when the graph is weighted.** On a graph whose every weight is 1,
  `getEdgeData` is not supplied and the resulting positions are **bit-identical** to the positions the
  same seeded run produces today. That one assertion is what makes the Chromatic re-baseline
  reviewable: an unweighted story that moved is a bug.
- **Kamada-Kawai separates by weight, in the right direction.** Three nodes in a line, `a-b` weight 1
  and `b-c` weight 4: after the layout, `distance(b, c) > distance(a, b)`. Run it again with the
  weights swapped and the inequality flips. That asserts the inversion at
  `1 / max(w, EPSILON)` is present and the right way round -- the single most likely thing to be
  wrong, and invisible in a screenshot.
- **ForceAtlas2 attracts by weight, in the right direction.** The same three-node graph, same seed:
  the heavier edge's endpoints end up **closer**, not further. The two assertions together pin the
  stated convention, including the fact that the two engines read the same number oppositely.
- **A zero weight does not become a full-strength edge.** An edge with `weight: 0` produces the
  clamped extreme in both engines, and the clamp is reported once.
- **Parallel edges are summed, not last-wins.** Two parallel edges of weight 1 arrange the same as one
  edge of weight 2, and reversing the order they were added in changes nothing.
- **The option survives a rename.** `test/catalog/optionsFromZod.test.ts:131-135` asserts
  `weightProperty` is a string option, has no default and is advanced. **Replaced**, not loosened:
  `weighted` is a boolean option, defaults to `true`, and is published for both Kamada-Kawai and
  ForceAtlas2.
- `test/integration/story-determinism.test.ts:7, :19` holds `forceatlas2` to seeded determinism. Its
  expectations move with the weighted fixtures, and the test itself must still pass: the same seed
  and the same weights produce the same arrangement twice.

### 8.6 Pin state

- `test/unit/node-index-pinned.test.ts:224-246` is "releases the pin when `setLayout` replaces the
  engine that held it", and it asserts `isPinned() === false` after the swap, with a reasoned comment
  saying that is correct. **Replaced by its exact inverse**: the pin survives, `isPinned()` is still
  true, and the new engine was told about it.
- **All three rebuild paths**, not just `setLayout`: a 2D/3D view-mode switch
  (`LayoutManager.ts:405`) and a template layout apply (`:431`) each preserve the pin. The 2D/3D
  toggle is the one a reader hits most often and is not named anywhere in the register.
- **A pin is real under a static layout.** Under Kamada-Kawai -- one of the fourteen whose `pin()` is
  a no-op -- a pinned node's coordinates are unchanged after a `refresh()` that moves everything else.
  That is the assertion for the `writeNodePosition` guard, and it is the part of this change that has
  never worked for fourteen engines.
- **A drag still moves a pinned node.** Pin, then drag: the node ends up where the drag put it. That
  is the assertion that the `"placement"` intent bypasses the guard, and without it the guard would
  make pinned nodes undraggable.
- **The replay places before it pins.** After a `setLayout` onto d3, a pinned node's coordinates are
  the ones it had before the switch -- not d3's initial ones. This is the ordering that is easy to get
  wrong and produces a plausible-looking wrong picture.
- **Unpinning after a layout change does not throw.** Pin under ngraph, `setLayout` to something else,
  `unpin()`. Today this path throws "Internal error: Node not found".
- **A pin survives a compacting freeze and a renumbering.** Pin a node, remove a different node,
  force a freeze: the same node is still pinned and still at the same coordinates, with a new index.
- **The events carry it.** `graphty-node-drag-end`'s detail has `pinned: true` when `pinOnDrag` is on
  and `false` when it is off. `test/browser/NodeBehavior-unified-drag.test.ts:118, :137` already pins
  the wiring; this adds the field.
- **The door works.** `element.pin(id)` then `element.unpin(id)` round-trips, and
  `element.pinnedNodes` reports the set in between -- without reaching through `element.graph`.
- `test/browser/extensions/layout-extension.test.ts:351-358, :1047-1065` is the published contract a
  plugin engine author copies: a `RingLayout` implementing `pin`/`unpin` over a Set. It must still
  pass unchanged, because the projection contract does not change -- only who owns the truth.

### 8.7 Packaging

- `import("../../logging")` resolves in plain Node with no renderer in its import graph.
- `dist/logging.js` and `dist/logging.d.ts` are both produced, and `package.json`'s `./logging`
  `types` condition points at a file that exists. The `.d.ts` is the one the three uncovered entry
  lists (`tsconfig.build.json`, `typedoc.json`, `knip.config.ts`) fail late and confusingly on.
- The vite `entries` key set and `MODULE_ENTRIES` are equal, asserted in both directions, as they
  already are.
- The root barrel no longer exports any of the 23 logging names or any of the 7 colour-vision names,
  and `./schema` still exports all seven.
  `test/documentation/jsdoc-coverage.test.ts:70-89` reads `index.ts` and asserts all seven names are
  in it. **Replaced**, not deleted: it reads `schema.ts`, where the guarantee now lives.
- Mounting `<graphty-element>` on a page whose URL carries
  `?graphty-element-logging=true` leaves the logging configuration untouched. There is no test today
  that mounts the element and asserts URL-driven logging, which is exactly why the behaviour
  survived -- so this one has to be written, not replaced.
- The three built-in registration modules still register after a build with the three `./src/`
  `sideEffects` paths removed: `dist/graphty.js` contains the `register(` calls that
  `src/data/index.ts`, `src/layout/index.ts` and `src/algorithms/index.ts` make.

---

## 9. What moves visually

Gathered here because a Chromatic and Storybook re-baseline has to be reviewed by a person, and that
person needs to know what **should** have moved. Anything moving that is not on this list is a bug.

**Edges appear where there were none.** Every JSON file spelled `source`/`target`, `from`/`to`, or in
the cytoscape or sigma shapes goes from zero edges to its real count. That is `d3-format.json`,
`karate-d3.json`, `miserables.json`, `networkx-format.json`, `sigma-format.json` and
`visjs-format.json` in the corpus, and every story and screenshot built on them. A graph that was a
cloud of unconnected dots becomes a graph.

**Edge labels change, and most of them disappear.** `Edge.extractLabelText` falls back to `this.id`
when no label is configured (`src/Edge.ts:1227, :1251`), so an unlabelled edge currently reads
`"alice:bob"`. Under a counter that would read `"17"`, which is worse: it is an internal number with
no meaning to a reader. **The fallback is removed** -- an unlabelled edge draws no label. Every
edge-label story moves, and most of them lose text.

**Edge counts rise on any multigraph, everywhere at once.** `element.getEdgeCount()`,
`session.status.counts.edges`, `data.statistics().edgeCount`, the status bar, the graph summary, and
every number derived from them: density, mean degree, degree range, every cost estimate, the layout
recommendation and the run planning scope.

**A "parallel edges" row appears in the application's graph summary for the first time**, on datasets
that always had them, with no application change -- `AppShell.tsx:4050-4053` renders it off
`repeatedEdgeCount` and suppresses it on zero.

**Two parallel edges draw as two coincident lines**, with coincident arrowheads and a
non-deterministic click target. Recorded as a known limitation, not a regression to chase.

**Every Kamada-Kawai and ForceAtlas2 arrangement of a graph with real weights moves.** This is the
largest visual change in the release. Kamada-Kawai pushes heavily weighted pairs apart in terms of
graph distance and ForceAtlas2 pulls them together, and after the inversion both read the same number
the same way: heavier means more strongly connected. A graph whose weights are all 1 does not move at
all, by construction.

**Nothing moves under spring, arf, spectral, bfs, bipartite, multipartite, circular, shell, spiral,
planar, random, fixed, d3 or ngraph** -- as long as nothing is pinned and nothing has been removed.
If one of them moved without one of those two, the change reached further than it was meant to.

**With one correction found in the build, for removals.** `SimpleLayoutEngine.removeNode` now sets
`stale = true`, so the next refresh recomputes the whole arrangement. Under those fourteen static
layouts, deleting one node therefore re-seats every other node. That is the right behaviour -- a
circular layout over five nodes and a circular layout over four are different pictures -- but it is
not what the sentence above would lead a reviewer to expect, so a story that removes a node and
re-renders moves under all fourteen.

**Nodes stop returning to the layout's idea of where they belong.** After this, a dragged node stays
put through a `setLayout`, through a 2D/3D toggle and through a template apply. Because `pinOnDrag`
defaults to `true`, that happens to every node any reader has ever dragged, with nobody opting in.
For the fourteen static layouts it is a capability that never worked before, so a story that drags
and then re-layouts looks different in a way no previous baseline can be compared against.

**Removing a node removes its lines.** No line drawn to a disposed node's last position. No edge stuck
permanently visible because a filter cannot reach it. The per-frame cost after a removal drops,
because the layout engine stops stepping nodes and links that are no longer in the graph.

**The data table's Edges tab changes its column headers** from `src, dst` to `source, target`, with no
application code change, and on JSON files the duplicate `source`/`target` columns disappear.

**`data-loading-complete` stops disagreeing with the graph.** Its `edgesLoaded` becomes the number of
edges the graph holds. On `miserables.json` that is 254 next to a graph holding 254, where today it is
254 next to a graph holding zero.

**Nothing in the logging or packaging work moves anything visually.** The one consumer imports no
logging symbol and no colour-vision helper and never sets those URL parameters.
