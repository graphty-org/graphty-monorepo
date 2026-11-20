# Multiple data sources at batched scale

What graphty-element on master needed so a graph built from several data sources can reach the
sizes the `"batched"` render path draws (100,000 nodes, 1,000,000 edges), and what the
multiple-data-sources experiment must still change before it leaves the experiment. The experiment
is `feat/element-sources-steps` and `feat/element-source-drafts` (tracking issue #8928); its design
is `multiple-data-sources-design.md` in this folder.

## What master changed (issue #9169)

Every load records what it supplied in the `provenance` graph value: per load, the node ids and
edge ids its rows named. At 1,000,000 edges that bookkeeping, not the graph, was the cost of a
second source:

- **The per-id index.** `provenanceIndex` built one list per node and per edge id, every time a
  provenance value was read, and a merging load read it only to look up nodes. At 100k/1M a second
  source of 1% spent about 0.55 s there and kept about 250 MB (a list per edge, cached on the
  value). Now each kind is built only when read, and every id one load supplied shares that load's
  one list.
- **The recount in `data.sources()`.** Each new snapshot (every edit) recounted what each load
  still holds by looking every supplied edge id up in the snapshot, which first builds the
  snapshot's edge-id index: about 0.5-0.8 s per call at 1M edges. Now the edge ids of each load are
  parsed to counters once per list and found by binary search in the snapshot's held counters,
  sorted once per snapshot from its id column: no hash lookup, and memory sized by the edges held,
  never by the highest id (a save file may name any edge id below 2^31).
- **Copies on each load.** `recordLoad` copied what a load supplied three times and built the
  index of every earlier load; it now joins only when the load continues an earlier one and looks
  up only the nodes it did not make.
- **The released builder after a second source.** Under `"batched"` the graph store lets its
  builder go after a load and rebuilds it on the next write. A merging load rebuilt it and then kept
  it for the rest of the session, a second copy of the whole graph. The store now lets it go again
  at the end of every load (edits still keep it, as before).

Measured with `graphty-element/test/session/multi-source-scale.bench.test.ts` (headless) and
`graphty-element/test/browser/multi-source-scale.bench.test.ts` (both render paths); the numbers
are in the pull request.

## What the experiment branches must change

Measured by the batched-renderer audit on `feat/element-source-drafts`: a source change at
100k/1M takes about 11 s and peaks at 3.85 GB, and a 1M-edge first load spends hours in one loop.

1. **The edge-grouping loop** (`commands/source-steps.ts`, `groups.set(k, [...old, each])`) copies
   the group on every edge, so it is quadratic in a repeated pair's size: 20,000 edges 1.0 s,
   40,000 6.8 s. Push into the group instead (40,000 edges: 7 ms).
2. **Rebuild from the first changed step**, as the design's section 8.11 says. Today every change
   builds the whole graph after the change, projects it, builds and projects the graph before the
   change again, and diffs the two: about 11 s and two whole builds alive at once. Keep the last
   build (keyed by the steps value) and rebuild only from the first step the change touches.
3. **Keep source copies and build output as columns.** `importColumnsAsSource` calls
   `columnMutations(columns, false)`, which builds a record object per row; pass the render path
   (`this.pages.batched?.() === true`), as master's `importColumns` does, and keep a source's rows
   as a `RowSource`/`rowsView` (`session/project/recordMap.ts`) rather than as record arrays.
4. **Count what history keeps.** The cached builds (`steps/project.ts`, a WeakMap held alive by
   the value ops), `SOURCE_COPIES_VALUE` and `SOURCE_EDGE_IDS_VALUE` are graph values, and a value
   op is charged 48 bytes in history (`graphOps.ts`, `GraphEntry.push`), so undo can hold gigabytes
   while counting nothing. Charge their real size (or keep them out of graph values), and stop
   copying the whole edge-id record on every change (`{ ...diff.kept, ...added }`: 1.16 s and
   48 MB at 1M edges).
5. **Write a replacing load as a replace.** With the experiment on, a replacing load is removes
   plus adds (`removeStrays`), so it never reaches the store's replace path, which sets the old
   graph aside without copying it and lets the builder go.
6. **Write a source change as a load.** The store lets its builder go again only at the end of a
   load (its `openLoad`/`closeLoad` bracket, which `ingest.ts` opens for every import). A steps
   change that writes through `service.apply` outside that bracket rebuilds the builder and keeps
   it: open the bracket around the change's writes, or route them through the import.
7. **Check the size ceiling before building.** An over-ceiling edge set today runs the build and
   the grouping loop before ingest refuses it with `E_TOO_LARGE`; check the combined counts first.
8. **Keep provenance arrays of unchanged sources.** The experiment writes the `provenance` value
   itself (`listed()`). Reuse the frozen node and edge lists of every source the change did not
   touch, so master's per-list caches (the counters `data.sources()` parses once per list) carry
   over instead of being rebuilt for the whole graph on every change.
9. **Give the references session the element's limits.** The scratch session that rereads a
   referenced source (`feat/source-copy-reference`, `GraphSession.ts`) uses the default limits, so
   on a batched element with raised limits a source over 100,000 nodes is unreadable and a save
   silently writes a full copy.
10. **Merge master** into `feat/element-source-drafts`: it predates the builder-release change and
    this one.
