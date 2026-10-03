# Result values as table columns (decision item 5): persona review

Item 5 of element-api-decisions.md (lines 238-275) proposes `nodePage({ columns: Path[] })`
returning `page.columns: Record<Path, unknown[]>` aligned with `page.records`, and lets
`RecordSort.key` take a result path such as `"results.pagerank.value"`. Each persona below gets a
concrete task that needs it. Paths are relative to the worktree root; element paths are under
`graphty-element/src/`.

## Findings that cut across every persona

1. **Item 5 ignores the element's own rule for naming a result, and its example breaks it.**
   `ResultsApi` says "Nobody types a run id by hand: `path()` builds the string, and every encoding
   helper takes a run rather than a path" (session/results/types.ts:921-929). `RunRef = Run |
   RunResult | RunId` exists so callers pass whatever they hold (types.ts:896-904), and
   `session.results.path(run)` already defaults to the shape's primary field
   (session/results/ResultsApi.ts:225-246). Item 5 takes bare `Path` strings and its example
   hand-types `"results.pagerank.value"`. That literal is wrong in three ordinary cases:
   - The run id carries the scope, with the visibility filter frozen in
     (docs/guide/algorithms.md:234-240). PageRank run under a filter is a different id.
   - `as:` names a second parameter setting (algorithms.md:239-240), and "Betweenness, sampled
     500" is a different id from the exact run (tier1-design.md:634-636).
   - The primary field is `value` only for metrics. It is `group` for a community, `level`,
     `category`, `onPath`, `in` or `pairs` for the other shapes (session/results/types.ts:387-475).
   Fix: `columns: readonly (RunRef | { run: RunRef; field?: string })[]` and
   `sort: { run: RunRef; field?: string; descending?: boolean }`, keeping the raw path as the
   advanced form. With that, the simple example needs no internal concept:
   `nodePage({ columns: [run], sort: { run, descending: true }, limit: 10 })`.

2. **Item 5 does not say which result fields a node page can hold.** A run publishes node,
   edge and graph fields (`FieldDescriptor.kind`, catalog/types.ts:296-307). Item 5 never says what
   these return:
   - an edge field (an edge metric's `value`) asked for on `nodePage`
   - a node field asked for on `edgePage`. `EdgePageOptions` extends `RecordPageOptions`
     (session/types.ts:127-131), so edge pages gain `columns` without item 5 mentioning them.
   - a graph field such as `modularity`
   - a whole `pair-list`, whose only field is the graph-level `pairs`
   Whatever item 5 decides becomes published behavior. The options are an error, an empty column,
   or the same value repeated on every row. Fix: refuse a field of the wrong kind with a
   `GraphtyError` naming the kind, and say that edge pages take edge fields.

3. **Item 5 does not say whether a hyphenated run id needs quoting.** `path()` returns
   `results.shortest-path.onPath` unquoted (session/results/types.ts:62-64). `term()` quotes it,
   because the expression grammar reads the hyphen as subtraction (ResultsApi.ts:248-262; the doc
   at session/results/types.ts:934-946). `Path` is documented as "A JMESPath expression"
   (catalog/types.ts:68-69). Ten of the twenty-four catalog algorithms are hyphenated. If
   `columns` evaluates JMESPath, `path()` output breaks on those runs. If it matches literal
   paths, `term()` output finds nothing. Either way, a copied path is silently empty for one of
   the two helpers. Fix: take a `RunRef` (finding 1). Where a raw path is accepted, say it is
   `path()`'s spelling, never an expression, and refuse anything else.

4. **The columns carry only values, so the app has to put together each header and each cell's
   text.** The table design needs, for each result column, a header name, a type glyph, a profile
   tooltip ("77 values, 1 to 36"), and group names that match the legend (tier1-design.md:328-338).
   Item 5 returns `unknown[]` keyed by a path string. The app then has to:
   - match each path back to `session.results.roots[].fields[]` to find `plainName`, `type` and
     `kind`
   - turn a community's raw group id into the name the legend prints. `groupName(rank)` makes
     "Group 1" from the size order (session/results/types.ts:66-77), so a raw `group` cell reads
     `0` or `7` while the legend says "Group 1".
   That is the app computing over results, which CLAUDE.md forbids. Fix: return each column as
   `{ run, field, label, type, kind, values }`, and give a grouping field its group name as well
   as its id.

5. **`revision` covers runs, but the documentation does not say so.** The session's input tick
   advances when a run's result changes (GraphSession.ts:2192-2201) and when a run is removed
   (GraphSession.ts:2114-2117). So a page sorted by a result is re-ordered after a re-run. That
   much of the blind report's staleness finding is wrong. What is missing is the contract:
   - `RecordPage.revision` lists edits, undo, load, selection and sets, but not runs
     (session/types.ts:141-145).
   - `run:changed` also fires on `start` and `progress` (session/types.ts:704-705). A table that
     re-reads on every event re-reads during every progress tick.
   Fix: add "a run's result published, re-run or removed" to `revision`'s doc. Name the event a
   table listens to, and say to compare `revision` before re-reading.

## Persona tasks

### Marcus Webb, data scientist porting a metric (plugin-author-data-scientist.yaml)

**Task:** check that his registered "influence" plugin matches his Python numbers. He loads a CSV
that already has `influence_py`, runs the plugin, and shows the two side by side, sorted by the
largest gap.

- He needs `session.results.path` and the primary field `value` to find his own column. His plugin
  never named a field: the simple tier publishes `value`, `rank` and `percentile` for him
  (simple/defineAlgorithm.ts:192-203). The persona "reads Promise as a hint that something will go
  wrong" and copies examples. Item 5's literal path is the example he will copy.
- `influence_py` comes back in `page.records[i]` and his plugin's value in
  `page.columns[path][i]`. These are two shapes for one row. To compare them in a spreadsheet he
  has to zip parallel arrays, which the persona cannot do without help.
- He cannot sort by the gap. `Path` is documented as JMESPath, so he will try
  `"abs(results.x.value - influence_py)"`. Item 5 does not say whether that is refused or
  ignored. In the blind author's misuse file, an expression column compiled
  (review/blind-5.md, finding 5).
- **Fails the task.** The parity check is his first move with the plugin, and it needs the run
  id, the field name, array zipping and a guess about expressions.

### Tomasz Kowalczyk, researcher writing a one-off plugin (plugin-author-domain-researcher.yaml)

**Task:** in a single HTML file with no type checker, list the twenty proteins with the highest
essentiality score his plugin computes.

- He edits the example in place. Item 5's example keeps `"results.pagerank.value"`. If he
  changes `pagerank` to his plugin's key, he gets the right id only when no filter is on and he
  did not use `as:` (finding 1).
- When the path names nothing, item 5 does not say what happens. The likely result is an empty
  or absent column, sorted "missing last", which is a silently unsorted table with no error
  message. His persona reads only the first line of an error, and here there is no error at all.
- Item 5's example has no `limit`, so he gets the default 100 rows (session/data.ts:83) and has
  to discover `limit` from another page.
- **Fails silently** the first time a filter is on.

### Sofia Marquez, front-end developer (plugin-author-frontend-developer.yaml)

**Task:** put the element's node list into the product's virtualized data grid (TanStack Table),
with a "PageRank" column the user can sort, typed end to end.

- A grid wants row objects. Item 5 returns `records[]` plus a map of parallel `unknown[]`, so she
  writes a zip adapter. That adapter is the "wrap the element's API to paper over an awkward
  shape" pattern CLAUDE.md names.
- `unknown` cells need a type check per cell before formatting. Under the element's own
  `tsconfig.strict-consumer.json`, `page.columns[path][i]` fails with TS2532
  (review/blind-5.md, compile table). She reads the `.d.ts` first and sees `key: string | Path`,
  which is `string | string` (catalog/types.ts:69).
- The element already has a typed column, `RunResult.column(field): NumericColumnView`
  (session/results/types.ts:841-846). Item 5 adds a second "column" with a different shape and no
  types.
- She needs the event that should trigger a re-fetch (finding 5). `run:changed` with `progress`
  phases will thrash her grid unless she knows to compare `revision`.
- **Works, but with an adapter and casts** that a typed `{ label, type, values }` column would
  remove.

### Ines Duarte, graph library author (plugin-author-graph-library-author.yaml)

**Task:** publish a community-detection plugin for graphs of 1,000,000 nodes, and show its
communities in a table sorted so each community's members sit together, largest community first.

- Her result's primary field is `group`, not `value` (session/results/types.ts:408-411). Item 5's
  example teaches `.value`.
- Sorting by `group` orders by an arbitrary group id. The element names groups by size rank
  ("Group 1" is the largest; session/results/types.ts:66-77), and `groupSize` is published. But
  `RecordSort` takes one key (session/types.ts:102-110), so "largest community, then name"
  cannot be expressed. Sorting by `groupSize` alone interleaves communities of equal size.
- Cost: a sort reads one boxed `unknown` per row through `sortValue` and builds
  `values` and `positions` arrays of N entries (session/data.ts:603-608). The element already
  holds the field as a typed column (`NumericColumnView`). Item 5 does not say whether a result
  sort reads that column or re-reads each node's field object. At 1M rows that is the difference
  she will benchmark first.
- **Partly fails:** the table she wants needs a two-key or group-aware order that item 5 does not
  offer, and the cost of a result sort at 1M rows is not stated.

### Chris, ML engineer for recommendation systems (ml-engineer-recsys.yaml)

**Task:** run link prediction on a user-item graph and inspect the top candidate links in a
table. Then run edge betweenness and sort the interaction edges by it to find bridges.

- Link prediction is a `pair-list`: its only field is the graph-level `pairs`, with no node or
  edge fields (session/results/types.ts:470-478). A node or edge page has no row for a candidate
  pair, and item 5 does not say what asking for `results.<run>.pairs` returns (finding 2).
- Edge betweenness is an `edge-metric` whose `value` is an edge field. Item 5 is written only
  for `nodePage`, and `edgePage` inherits `columns` through `EdgePageOptions` without a word.
- **Fails the first task outright, and the second relies on behavior nobody specified.**

### Dr. Kim, knowledge graph engineer (knowledge-engineer.yaml)

**Task:** in a filtered view of one source system's entities, run Louvain and show each entity's
community as a column next to its imported `entityType`, so she can spot entities whose
community crosses type boundaries.

- The filter is part of the run id (algorithms.md:234-237), so the example's hand-built path
  misses her run.
- The community column shows raw ids (`0`, `7`). The legend and the result summary say
  "Group 1" (session/results/types.ts:66-77). A stakeholder reading both sees two names for
  one group, which is exactly the inconsistency she is paid to prevent.
- She writes Cypher and SPARQL, so a "JMESPath expression" `Path` invites a predicate like
  `results.louvain.group == entityType`. Item 5 does not say whether that is a column.
- **Fails**: the column cannot be found by the documented spelling under a filter, and when it
  is found it disagrees with the legend.

### Analyst Alex (analyst-alex.yaml), through the graphty app

**Task:** compare exact PageRank with sampled betweenness for the same nodes. Sort the table by
betweenness, filter to one region, re-run, and export the table to CSV for a report.

- The app's table needs header names, profile tooltips and the "Columns: 8 of 69" field list for
  result columns (tier1-design.md:328-331). Item 5 gives values only, so the app looks up names
  in `results.roots` (finding 4).
- The sampled run's id differs from the exact one ("Betweenness, sampled 500";
  tier1-design.md:634-636). Filtering and re-running creates a third id, because the filter is
  part of the id. If the app binds a column to a path string, the column goes empty, and the app
  is left deciding which run the column now means. That is graph state the element should own.
  Binding to a `RunRef` makes the question explicit.
- Export wants "each run's results as columns" with "column headers that carry each value's
  scope", still marked [element, to confirm] (tier1-design.md:776-781). Item 5 does not produce a
  scope-carrying label, so the table header and the export header will be worded by two
  different pieces of code.
- **Works for a single unfiltered run.** It fails as soon as Alex filters or compares two
  settings, which is what his persona does.

## Corrections to the blind author's report

- Finding 7 (stale order) does not happen at runtime. The tick advances when a result is
  published or a run is removed (GraphSession.ts:2114-2117, 2192-2201). The defect is the
  undocumented contract (finding 5 above), not wrong data.
