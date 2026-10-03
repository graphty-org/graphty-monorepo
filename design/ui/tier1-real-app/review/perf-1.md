# Item 1 (load preview and column mapping): cost and buildability

Scope: what `session.data.preview()`, `import(..., { mapping })`, `"data:progress"` and the
`E_TOO_LARGE` details cost on graphty-element's real load path at the render ceiling (50,000 nodes,
100,000 edges) and for files past it, and whether each part can be built as written.

Measurements are Node 22 on this machine (i9-14900), through the element's own source classes and
a renderer-less session (`test/session/history/fixture-session.ts`). A Chromium tab on a laptop is
slower; treat the figures as a floor. Scripts: `tmp/api-review/perf-1/`.

## Measured

| What | Time | Longest frozen stretch | Heap |
| --- | --- | --- | --- |
| Parse one edge CSV at the ceiling (2.4 MB) | 170-180 ms | 163 ms | 45 MB |
| Parse node CSV + edge CSV at the ceiling | 260-280 ms | (one task) | 65 MB |
| Renderer-less import at 48,900 / 97,800 (what an honest `expected` costs) | 760 ms | 670 ms | 48 MB retained |
| Parse a 26 MB edge CSV (1M edges) | 1.4 s | 964 ms before the first chunk | 380 MB |
| Parse a 106 MB edge CSV (4M edges) | 5.3 s | (one task) | 860 MB |

The full load at the ceiling with the renderer is 8.0 s (`graphty-element/src/session/limits.ts`),
so the parse itself is small next to it. The problems are elsewhere.

## Blocking

1. **Naming the endpoint columns loads zero edges, and the load reports success.** A CSV import
   with `edgeSource: "from", edgeTarget: "to"` -- exactly what `mapping.source` / `mapping.target`
   must compile to -- gives nodes 3, edges 0, rejected 2, no error. The CSV source renames the
   columns to `source` / `target` (`data/CSVDataSource.ts`, `emit`), then the ingest re-reads the
   records with the caller's names as JMESPath (`session/project/ingest.ts:806-810`, `558-559`;
   `data/endpoints.ts:62` swallows the failure as null). A preview built on the same pipeline would
   show "0 edges" for every hand-mapped file. Probing works only when the header already says
   source/target, src/dst or from/to -- the one case that needs no mapping.
2. **A file past the ceiling never gets `E_TOO_LARGE`.** `DataSource.getData` does
   `validEdges.push(...chunk.edges)` (`data/DataSource.ts:578`) and `chunkData` puts every edge in
   the first chunk (`data/DataSource.ts:495-506`). Above about 125,000 edges (measured: 120,000 ok,
   125,000 throws) that is `RangeError: Maximum call stack size exceeded`, wrapped as a plain
   `Error("Failed to load data from source 'csv' after 0 chunks: ...")` (`ingest.ts` load catch).
   The Data page's too-large card and the proposed `details` are unreachable for the most common
   too-large file.
3. **The `E_TOO_LARGE` details change is breaking, and `found` is not knowable as built.** Today
   `details` is `{ limit: number, count, of, graph: { nodes, edges } }` (`ingest.ts:1028-1044`);
   the proposal's `limit: { nodes, edges }` changes a number to an object. The refusal fires at
   the chunk that crosses the line, so `count` is "held + one chunk" (51,000 for a file of any
   size), not the file's size. A true `found` means reading the whole file: 5.3 s and 860 MB for a
   106 MB CSV, while a ceiling graph already holds 2.7 GB of a 3.5 GB heap (`limits.ts`). That
   preview can kill the tab before it refuses.

## Major

4. **A renderer-less session refuses an edge list under the ceiling.** 49,100 nodes / 98,200
   edges: `E_TOO_LARGE`, "would take the graph to 50,100". 48,900 loads. Nodes the edges created
   are counted again when their own node records arrive. The cheapest honest `expected` runs on
   exactly this path (`headlessDataService`, `session/data.ts:873`), so preview and load would
   disagree near the ceiling. The renderer path was not measured.
5. **`"data:progress"` publishes a made-up number.** All seven sources read the whole file as one
   string (`DataSource.ts:431-446`; JSON `JSON.parse`; GraphML, GEXF, GML, DOT, Pajek via
   `getContent`) and parse it in one long task; the first progress event comes after the parse
   (162 ms at the ceiling, 964 ms at 1M edges, page frozen throughout). `bytesProcessed` is
   `chunks * 64 * 1024` (`managers/DataManager.ts:977`) while a chunk is 1,000 records; edges
   jump from 0 to all in chunk 1; the renderer-less `loadProgress` is a no-op. Real byte progress
   needs streamed reads (graph-io already takes a `ReadableStream`, `graph-io/src/types.ts:27`),
   which is the PR #770 work the plan says tier 1 does not need (`plan.md:147-151`).
6. **"rowCount null when only a prefix was read" has no implementation path.** No source reads a
   prefix; graph-io's CSV importer has no row limit (`graph-io/src/formats/csv/importer.ts:89-121`);
   JSON and the XML formats need the whole document, and GraphML lists every node before the
   first edge. Every `preview` is a full read and full parse.
7. **`expected` "as if loaded now" is a full dry-run load, and it does not know the mode.** Node
   count depends on endpoint-created nodes, the repeat policy and rejected ids, all decided inside
   the ingest against the store. Buildable by running the renderer-less ingest into a scratch
   store: 760 ms, 670 ms of it one task. `preview` takes no `mode`, so it cannot answer for "add".
8. **Every mapping edit repeats the whole read.** `preview` takes no mapping, so counts go stale
   after an edit; calling it again re-reads the `File` (`DataSource.ts:439`, no cache), re-parses
   and re-runs the dry run: about 1 s frozen per menu change at the ceiling. A URL is downloaded
   again each time, again by `import`, and once more when its name has no extension
   (`resolveImportSource`, `session/data.ts:1040`). The design's "Show the 32 unmatched rows shows
   all of them" and "each count filters the sample grid" (`tier1-design.md:373-377`) need rows
   past the 20-row sample; `LoadPreview` has no field for them, and returning all of them is
   unbounded (a wrong key column leaves 100,000 unmatched).
9. **Joining several sources is new code, not a mapping.** The CSV paired path takes exactly two
   inputs, joins on the node id only, and ignores `edgeSource` / `edgeTarget`
   (`CSVDataSource.ts`, `parsePairedFiles`). Door entries joined to people on `badge_id` and to
   buildings on `door_id` needs two node tables with different keys: a new source and a graph-io
   change.
10. **`weight: null` cannot mean "each edge counts 1".** `resolveEdgeWeight` falls back to a
    `value` column when the path is null (`ingest.ts:73-88`), and the weight path is config
    (`data.knownFields.edgeWeightPath`, `config/DataConfig.ts:74`), not a load option. Endpoint
    and id names are JMESPath, so a column named `badge id` resolves to nothing.
11. **Column `type` exists already and must come from every row.** `AttributeType` is published
    from `./catalog` with seven values (`catalog/types.ts:223`), classified by
    `describeAttributes`, O(n + m) over a snapshot (`session/attributes.ts:219`). Typing from the
    20-row sample is wrong (cells are typed one by one, so `n/a` at row 40,000 changes a column);
    `level` needs distinct counts, which is also a full scan.

## Minor

12. Paired-file and error-limit failures are plain `Error`s (`parsePairedFiles`, the CSV
    `addError`), so "a refusal is the element's existing typed error" does not hold for them.
13. `"data:progress"` breaks the document's own `namespace:changed` rule, and its
    `nodeRecords` / `edgeRecords` differ from `nodeRecordsLoaded` / `edgeRecordsLoaded` on the
    existing `DataLoadingProgressEvent` (`events.ts:247-262`).

## What makes item 1 buildable

- Fix findings 1, 2 and 4 in the element first; each is a defect today, mapping or not.
- Build `preview` as one renderer-less import into a scratch store, then `describeAttributes`
  over it, in chunks that yield to the event loop. That is one pipeline, so preview and load
  cannot disagree.
- Take alternative (a), the two-phase handle, or give `preview` a `mapping` and an element-side
  cache of the read bytes; a handle also gives the unmatched rows a `RecordPage`.
- Refuse an oversized file from a row count (a quote-aware newline scan of the bytes), before
  parsing; add `found` beside the existing `details` keys instead of replacing `limit`.
- Publish progress as record counts and a phase only, or make PR #770 a prerequisite and
  re-estimate.
